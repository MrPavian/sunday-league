// Trainerteam ab der Regionalliga (ROADMAP 11.17 Punkt 5): Torwarttrainer, Athletiktrainer und Physiotherapeut mit Gehalt
// und Wirkung. Jede Saison melden sich je Aufgabe zwei Leute – ein günstigerer und ein erfahrener. Das Gehalt richtet sich
// nach Liga und Erfahrung und wird jede Woche gezahlt; reicht die Kasse nicht, geht die Person. Unter der Regionalliga
// gibt es kein bezahltes Trainerteam (dort helfen Co-Trainer und Ehrenamt, staff.js).
//
// Gehälter (Monat, brutto):
//  - Regionalliga: 603 € = Minijob-Verdienstgrenze 2026 (Deutsche Rentenversicherung,
//    https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/260223-minijob-midijob-verdienstgrenzen-steigen.html).
//    Annahme: In der Regionalliga arbeitet das Trainerteam meist nebenberuflich; der Erfahrenste bekommt die volle Grenze, wer
//    weniger Erfahrung hat, arbeitet weniger Stunden (× (0,4 + 0,6 × Qualität), Spielwert).
//  - 3. Liga: Athletiktrainer Median 36 400 € im Jahr = 3033 € im Monat (StepStone-Gehaltsreport,
//    https://www.stepstone.de/gehalt/Athletiktrainer-in.html); Physiotherapeut Median 3452 € im Monat (Entgeltatlas der Bundesagentur für Arbeit, Stichtag 31.12.2025, Vollzeit,
//    zitiert bei medi-karriere.de, https://www.medi-karriere.de/magazin/therapie-berufe-gehaelter/). Für Torwarttrainer
//    fanden sich keine belastbaren Zahlen – HERGELEITET wie der Athletiktrainer.
//  - 2. und 1. Liga: Spielwerte (× 2 bzw. × 3,5 auf die 3. Liga); Vereine legen diese Gehälter nicht offen.
//  - Erfahrung: Gehalt × (0,7 + 0,6 × Qualität) – Spielwert.
// Wirkung (Spielwerte, in der Größenordnung des Vereinsgeländes: voll besetzt etwa 10–20 %):
//  - Torwarttrainer: Torhüter entwickeln sich bis zu 20 % schneller.
//  - Athletiktrainer: bis zu 10 % weniger Verletzungen, schneller wieder fit.
//  - Physiotherapeut: Verletzte bis zu 15 % schneller zurück.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { personName } from '../data/origins.js';
import { book } from './finances.js';

export const TEAM_FROM = 9; // ab der Regionalliga
export const TEAM_ROLES = {
  torwart: { name: tr('Torwarttrainer', 'Goalkeeper coach'), effect: tr('Torhüter entwickeln sich schneller (bis +20 %).', 'Goalkeepers develop faster (up to +20 %).') },
  athletik: { name: tr('Athletiktrainer', 'Fitness coach'), effect: tr('Weniger Verletzungen (bis −10 %), schneller wieder fit.', 'Fewer injuries (up to −10 %), back to fitness sooner.') },
  physio: { name: tr('Physiotherapeut', 'Physiotherapist'), effect: tr('Verletzte sind schneller zurück (bis −15 % Ausfallzeit).', 'Injured players return sooner (up to −15 % time out).') },
};
export const TEAM_ROLE_IDS = Object.keys(TEAM_ROLES);

const BASE = { torwart: 3033, athletik: 3033, physio: 3452 }; // 3. Liga, € im Monat (siehe oben)
const LEVEL_MUL = { 11: 2, 12: 3.5 }; // Spielwerte
export const MINIJOB = 603;

// Monatsgehalt für diese Aufgabe in dieser Liga bei dieser Erfahrung (auf 10 € gerundet).
export function teamSalary(level, role, quality) {
  if (level <= 9) return Math.min(MINIJOB, Math.round(MINIJOB * (0.4 + 0.6 * quality))); // Minijob: nie über der Grenze, Günstigere mit weniger Stunden
  const base = BASE[role] * (LEVEL_MUL[Math.min(12, level)] ?? 1);
  return Math.round((base * (0.7 + 0.6 * quality)) / 10) * 10;
}
export const weeklyPay = (monthly) => Math.round((monthly * 12) / 52);

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x3c6ef372);
export const teamOf = (c) => (c.coachTeam ??= {});
export const teamOpen = (c) => (c.level ?? 1) >= TEAM_FROM;

// Bewerber dieser Saison: je Aufgabe ein günstigerer und ein erfahrener.
export function teamCandidates(c, role) {
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, TEAM_ROLE_IDS.indexOf(role), 77));
  return [
    [0.4, 0.65],
    [0.7, 1],
  ].map(([lo, hi], i) => {
    const age = Math.round(rng.range(i ? 38 : 27, i ? 58 : 40));
    const quality = Math.round(rng.range(lo, hi) * 100) / 100;
    return { id: i, name: personName(rng, age), age, quality, salary: teamSalary(c.level ?? 1, role, quality) };
  });
}

export function hireTeam(c, role, id) {
  if (!teamOpen(c) || !TEAM_ROLES[role]) return false;
  const cand = teamCandidates(c, role).find((x) => x.id === Number(id));
  if (!cand || (c.cash ?? 0) < cand.salary) return false;
  teamOf(c)[role] = { name: cand.name, age: cand.age, quality: cand.quality, since: c.season ?? 1 };
  return true;
}

export function releaseTeam(c, role) {
  if (!teamOf(c)[role]) return false;
  teamOf(c)[role] = null;
  return true;
}

const q = (c, role) => (teamOpen(c) ? (c.coachTeam?.[role]?.quality ?? 0) : 0);
// Wirkungen (von career.js, injuries.js und fitness.js abgefragt). Ohne Trainerteam alles 1 bzw. 0.
export const keeperGrowthMul = (c) => 1 + 0.2 * q(c, 'torwart');
export const teamInjuryChanceMul = (c) => 1 - 0.1 * q(c, 'athletik');
export const teamRecoveryBonus = (c) => 0.02 * q(c, 'athletik');
export const teamInjuryWeeksMul = (c) => 1 - 0.15 * q(c, 'physio');

// Gehalt der Woche für die aktuelle Liga.
export const currentSalary = (c, role) => {
  const h = c.coachTeam?.[role];
  return h ? teamSalary(c.level ?? 1, role, h.quality) : 0;
};

// Jede Woche: Gehälter zahlen. Unter der Regionalliga oder bei leerer Kasse geht das Trainerteam.
export function weeklyTeam(c) {
  const notes = [];
  for (const role of TEAM_ROLE_IDS) {
    const h = c.coachTeam?.[role];
    if (!h) continue;
    const label = TEAM_ROLES[role].name;
    if (!teamOpen(c)) {
      c.coachTeam[role] = null;
      notes.push(tr(`Abstieg: ${h.name} (${label}) sucht sich einen Verein in der Regionalliga.`, `Relegation: ${h.name} (${label}) looks for a club in the Regionalliga.`));
      continue;
    }
    const pay = weeklyPay(currentSalary(c, role));
    if ((c.cash ?? 0) < pay) {
      c.coachTeam[role] = null;
      notes.push(tr(`Die Kasse ist leer: ${h.name} bekommt kein Gehalt mehr und hört als ${label} auf.`, `The kitty is empty: ${h.name} is no longer paid and quits as ${label}.`));
      continue;
    }
    book(c, tr(`Gehalt ${label} (${h.name})`, `Wage ${label} (${h.name})`), -pay);
  }
  return notes;
}
