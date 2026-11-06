// Spielerverträge in den Profiligen (Konzept Profiligen 3, Nutzerentscheid 2026-11-05 „alles auf einmal“, nur neue Karrieren):
// Ab der Regionalliga (Stufe 9) sind die Spieler Vertragsspieler mit Monatsgehalt und Laufzeit. Statt Aufwandsentschädigung zahlt
// der Verein jede Woche die Gehälter; läuft ein Vertrag aus und wird nicht verlängert, geht der Spieler ablösefrei. Wer einen
// Spieler mit Vertrag holt oder abgibt, zahlt bzw. bekommt eine Ablöse statt der Ausbildungsentschädigung der Amateure.
// In der Oberliga und darunter ruhen die Verträge (nach einem Abstieg gilt wieder die Aufwandsentschädigung).
//
// Quellen und Herleitung (docs/KONZEPT-PROFILIGEN.md):
//  - Regionalliga Ø 1000 € im Monat, Spitzenspieler bis 6500 € (MDR-Recherche, zitiert bei kuechenfibel.de – Sekundärquelle).
//  - 3. Liga: Personalaufwand Spielbetrieb Ø 5,467 Mio. € je Klub (DFB-Saisonreport 3. Liga 2023/24). ÷ 12 Monate ÷ 30 Köpfe
//    (26 Spieler, 4 Trainer – Annahme) ≈ 15 200 €, gerundet 15 000 € im Monat (HERGELEITET).
//  - Spannweite: Spitze 6,5 × Schnitt (Regionalliga, oben) bei einer Liga Stärkeabstand (15 Punkte, Konzept Spielerstärke 10) –
//    dieselbe Steigung für die 3. Liga (HERGELEITET).
//  - Jahresbeträge je Spieltag: geteilt durch die echte Zahl der Spieltage (Regionalliga 34, 3. Liga 38), damit Gehälter,
//    Eintritt und Fernsehgeld im Spiel im selben Verhältnis stehen wie in echt (HERGELEITET).
//  - Laufzeiten, Ablöse und Verlängerung sind Spielwerte.
import { natBoostMul } from './natboost.js';
import { tr } from '../core/i18n.js';
import { PRO_TARGET } from '../sim/niveau.js';
import { humanClub, MIN_SQUAD, playerOf, releasePlayer, takenIndices } from './career.js';
import { LEAGUES } from './clubs.js';
import { isCoach } from './personal.js';
import { book } from './finances.js';
import { chronicle } from './sagas.js';

// 2. und 1. Liga (seit 2026-11-05) HERGELEITET: Personalaufwand Spielbetrieb je Klub (DFL-Wirtschaftsreport 2025, Saison 2023/24:
// 296,9 bzw. 1722,0 Mio. € für 18 Klubs) ÷ 12 Monate ÷ 30 Spieler im Kader ≈ 46 000 € bzw. 265 000 € im Monat.
export const CONTRACT = {
  from: 9, // ab der Regionalliga
  mean: { 9: 1000, 10: 15000, 11: 46000, 12: 265000 }, // € im Monat (2./1. Liga hergeleitet, siehe oben)
  spread: 6.5, // Spitzengehalt / Schnitt bei einer Liga Stärkeabstand
  span: 15, // Stärkepunkte je Liga
  min: 0.25, // Untergrenze (× Schnitt)
  rounds: { 9: 34, 10: 38, 11: 34, 12: 34 }, // echte Spieltage je Saison
  years: [1, 3], // Laufzeit bei Vertragsabschluss
  raise: 1.1, // Verlängerung: 10 % Aufschlag auf die Forderung
  fee: 0.5, // Ablöse = Jahresgehalt × Restlaufzeit × 0,5
  release: 0.5, // vorzeitige Auflösung: die Hälfte der restlichen Gehälter
};

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x1b873593);
export const isPro = (c, level = c?.level ?? 1) => !!c?.pro && level >= CONTRACT.from;
const lvlOf = (level) => Math.max(CONTRACT.from, Math.min(12, level));

// Monatsgehalt, das ein Spieler in dieser Liga verlangt (auf 50 € gerundet).
export function salaryDemand(c, idx, level = c.level ?? 1) {
  const l = lvlOf(level);
  const mean = CONTRACT.mean[l];
  const rating = playerOf(c, idx).rating;
  const f = Math.max(CONTRACT.min, Math.min(CONTRACT.spread, CONTRACT.spread ** ((rating - PRO_TARGET[l]) / CONTRACT.span)));
  return Math.max(50, Math.round((mean * f * natBoostMul(c, idx)) / 50) * 50); // Turnier-Schub (natboost.js)
}
// Monatsgehalt in Kosten je Spieltag.
export const perRound = (monthly, level) => Math.round((monthly * 12) / CONTRACT.rounds[lvlOf(level)]);

export const contractOf = (c, idx) => c.players?.[idx]?.contract ?? null;
export const yearsLeft = (c, idx) => {
  const k = contractOf(c, idx);
  return k ? Math.max(0, k.until - (c.season ?? 1) + 1) : 0;
};
// Laufzeit bei Abschluss: Junge länger, Ältere kürzer (Spielwert).
const termFor = (c, idx) => {
  const age = playerOf(c, idx).age;
  return age <= 23 ? 3 : age <= 29 ? 2 : 1;
};

export function sign(c, idx, years = termFor(c, idx), salary = salaryDemand(c, idx)) {
  const rec = c.players[idx];
  if (!rec) return null;
  rec.contract = { salary, until: (c.season ?? 1) + years - 1, since: c.season ?? 1 };
  return rec.contract;
}

// Alle eigenen Spieler ohne Vertrag bekommen einen (Aufstieg in die Regionalliga, Neuzugänge).
export function ensureContracts(c) {
  if (!isPro(c)) return [];
  const out = [];
  for (const idx of humanClub(c).squad) {
    if (isCoach(c, idx) || !c.players[idx] || contractOf(c, idx)) continue;
    out.push({ idx, contract: sign(c, idx) });
  }
  return out;
}

export function payroll(c) {
  if (!isPro(c)) return { monthly: 0, round: 0, n: 0 };
  let monthly = 0;
  let n = 0;
  for (const idx of humanClub(c).squad) {
    const k = contractOf(c, idx);
    if (!k || isCoach(c, idx)) continue;
    monthly += k.salary;
    n++;
  }
  return { monthly, round: perRound(monthly, c.level), n };
}

// Verlängern: neue Laufzeit, Forderung mit Aufschlag. Wer sauer ist, verlängert nicht.
export function extendOffer(c, idx) {
  const k = contractOf(c, idx);
  if (!k) return null;
  return { salary: Math.round((salaryDemand(c, idx) * CONTRACT.raise) / 50) * 50, refuses: (c.players[idx]?.grumpy ?? 0) > 0 };
}
export function extend(c, idx, years) {
  const o = extendOffer(c, idx);
  if (!o || o.refuses || !(years >= 1 && years <= 3)) return false;
  const k = contractOf(c, idx);
  k.salary = o.salary;
  k.until = (c.season ?? 1) + years;
  return true;
}

// Ablöse für einen Spieler mit Vertrag (eigener: echte Restlaufzeit; fremder: 1–3 Jahre, fest je Spieler und Saison).
export function transferFee(c, idx, fromLevel) {
  const own = humanClub(c).squad.includes(idx);
  const left = own ? Math.max(1, yearsLeft(c, idx)) : 1 + (hash(c.seed ?? 0, c.season ?? 1, idx, 811) % 3);
  return Math.round((salaryDemand(c, idx, fromLevel) * 12 * left * CONTRACT.fee) / 100) * 100;
}
// Vorzeitige Auflösung: die Hälfte der restlichen Gehälter (Restmonate bis Saisonende plus volle Jahre danach).
export function releaseCost(c, idx) {
  const k = contractOf(c, idx);
  if (!k || !isPro(c)) return 0;
  const months = Math.max(0, k.until - (c.season ?? 1)) * 12 + 6;
  return Math.round((k.salary * months * CONTRACT.release) / 100) * 100;
}
export function releaseWithPay(c, idx) {
  const cost = releaseCost(c, idx);
  if (!releasePlayer(c, idx)) return false;
  if (cost) book(c, tr(`Abfindung (Vertragsauflösung ${playerOf(c, idx).name})`, `Severance (contract ended early, ${playerOf(c, idx).name})`), -cost);
  return true;
}

// --- Hooks ------------------------------------------------------------------------------------------------------------
export function startWeek(c) {
  const signed = ensureContracts(c);
  const eur = (v) => v.toLocaleString('de-DE');
  if (signed.length > 2) {
    const sum = signed.reduce((s, x) => s + x.contract.salary, 0);
    c.week?.chat.push({ from: null, text: tr(`Verträge: ${signed.length} Spieler unterschreiben ihren ersten Vertrag, zusammen ${eur(sum)} € im Monat. Laufzeiten und Gehälter stehen in den Spielerprofilen.`, `Contracts: ${signed.length} players sign their first contract, €${eur(sum)} a month in total. Terms and wages are in the player profiles.`), time: 'Mo 10:00' });
  } else for (const { idx, contract } of signed) {
    c.week?.chat.push({ from: null, text: tr(`Vertrag: ${playerOf(c, idx).name} unterschreibt bis Saison ${contract.until} – ${eur(contract.salary)} € im Monat.`, `Contract: ${playerOf(c, idx).name} signs until season ${contract.until} – €${eur(contract.salary)} a month.`), time: 'Mo 10:00' });
  }
}

// Saisonwechsel: abgelaufene Verträge – der Spieler geht ablösefrei. Profi-Niveaus (career.proNiv) von Spielern, die nirgends
// mehr im Spielstand stehen, werden vergessen, damit die Liste nicht wächst.
export function nextSeason(c) {
  if (c.proNiv) {
    const keep = takenIndices(c);
    for (const k of Object.keys(c.proNiv)) if (!keep.has(Number(k))) delete c.proNiv[k];
  }
  if (!isPro(c)) return;
  // Mindestkader (Spielwert: Spielerzahl der Liga plus drei Wechsel): Laufen mehr Verträge aus, als der Kader verkraftet, verlängert
  // der Verein die Besten automatisch um ein Jahr zu ihrer Forderung – sonst stünde nach einer Saison ohne Verlängerungen keine
  // Mannschaft mehr auf dem Platz (gefunden im Langzeitlauf 2026-11-06: Kader 7 → 1 → 0).
  const club = humanClub(c);
  const due = club.squad.filter((idx) => contractOf(c, idx) && !isCoach(c, idx) && contractOf(c, idx).until < (c.season ?? 1)).sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating);
  const minKeep = Math.max(MIN_SQUAD, (LEAGUES[Math.min(12, c.level ?? 1)]?.format ?? 5) + 3);
  let keep = Math.max(0, minKeep - (club.squad.length - due.length));
  const kept = [];
  for (const idx of due) {
    if (keep > 0) {
      keep--;
      kept.push(playerOf(c, idx).name);
      sign(c, idx, 1);
      continue;
    }
    const name = playerOf(c, idx).name;
    if (releasePlayer(c, idx, { force: true })) {
      c.week?.chat.splice(1, 0, { from: null, text: tr(`Vertrag ausgelaufen: ${name} geht ablösefrei.`, `Contract expired: ${name} leaves on a free.`), time: 'Mo 09:00' });
      chronicle(c, tr(`${name} geht nach Vertragsende ablösefrei.`, `${name} leaves on a free at the end of his contract.`));
    }
  }
  if (kept.length) c.week?.chat.splice(1, 0, { from: null, text: tr(`Notverlängerung um ein Jahr, damit eine Mannschaft steht: ${kept.join(', ')}. Hol Verstärkung – und verlängere rechtzeitig selbst.`, `Emergency one-year extension so there is a team at all: ${kept.join(', ')}. Sign reinforcements – and extend in time yourself.`), time: 'Mo 09:00' });
}

// Hinweis in den letzten drei Spieltagen: Wessen Vertrag ausläuft?
export const expiring = (c) => (isPro(c) ? humanClub(c).squad.filter((idx) => !isCoach(c, idx) && contractOf(c, idx)?.until === (c.season ?? 1)) : []);
export function finishRound(c) {
  if (!isPro(c) || c.round !== Math.max(1, (c.fixtures?.length ?? 0) - 3)) return;
  const list = expiring(c);
  if (!list.length) return;
  const names = list.map((idx) => playerOf(c, idx).name).join(', ');
  c.week?.chat.push({ from: null, text: tr(`Verträge laufen aus: ${names}. Wer nicht verlängert (Spielerprofil), geht im Sommer ablösefrei.`, `Contracts expiring: ${names}. Anyone not extended (player profile) leaves on a free in the summer.`), time: 'Mo 08:30' });
}
