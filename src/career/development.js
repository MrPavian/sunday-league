// Entwicklung der eigenen Spieler je Saison (developPlayers in career.js): jeder Spieler hat einen verborgenen
// Entwicklungstyp, die Liga begrenzt, wie viel überhaupt geht, und ein Tapetenwechsel kann den Knoten platzen lassen.
//
// Quellen:
//  - Leistungshöhepunkt nach Position: Stürmer etwa 25, Verteidiger etwa 27, Mittelfeld dazwischen (Dendir 2016,
//    Journal of Sports Analytics, https://journals.sagepub.com/doi/full/10.3233/JSA-160021); Torhüter und Innenverteidiger
//    später, bis etwa 31 (Frontiers in Psychology 2019, https://www.frontiersin.org/articles/10.3389/fpsyg.2019.00076/full).
//  - Trainingsumfang steigt mit der Liga: Erfahrungsberichte nennen z. B. dreimal pro Woche in der Landesliga
//    (https://www.rheinpfalz.de/lokal/pirmasens_artikel,-interessante-landesliga-_arid,178439.html); eine feste Zahl je
//    Kreisliga-Stufe gibt es nicht. LEAGUE_GROWTH ist deshalb ein Spielwert.
// Alle Anteile, Kurven und Sprünge sind Spielwerte, eingemessen auf die Zielwerte des Nutzers (2026-10-23): 16- bis
// 20-Jährige legen in 8 Saisons im Schnitt etwa +8 (Freizeitliga) bzw. +14 (Bezirksliga) zu, 5–10 % schaffen einen
// Durchbruch (mindestens 7 über dem Ligaschnitt), 10–15 % bleiben bei 0 bis +3 hängen.
// Gemessen (scripts/development-check.mjs 150, 200 Spieler je Liga): Freizeitliga Ø +8,0, 7 % Durchbruch, 12 % hängen;
// Bezirksliga Ø +13,5, 10 % Durchbruch, 11 % hängen. Vorher (ohne Typen und Liga): Ø +25 in jeder Liga.

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x6a09e667);
const unit = (...parts) => hash(...parts) / 4294967296;

// Höhepunkt (Alter) je Position, siehe oben.
export const PEAK_AGE = { fwd: 25, mid: 26, def: 27, gk: 30 };
// Wie viel Entwicklung die Liga hergibt (Trainingsumfang, Mitspieler), Stufe 1 (Freizeitliga) bis 5 (Bezirksliga).
export const LEAGUE_GROWTH = [0.57, 0.65, 0.75, 0.87, 1];
// Anteile der Entwicklungstypen.
export const DEV_TYPES = [
  ['normal', 0.38],
  ['frueh', 0.15], // Frühentwickler: früh oben, dann Plateau, baut eher früh ab
  ['spaet', 0.15], // Spätentwickler: legt erst kurz vor dem Höhepunkt richtig zu, hält länger
  ['konstant', 0.12], // kleine, gleichmäßige Schritte bis über den Höhepunkt hinaus
  ['durchbruch', 0.07], // eine Saison mit großem Sprung – früh, mittendrin oder spät
  ['stagniert', 0.13], // hört früh auf, besser zu werden, und baut früher ab
];
const SCALE = 0.8; // Gesamtfaktor der Kurven (eingemessen)
const JUMP = 13; // Sprung beim Durchbruch in Stärkepunkten (Bezirksliga), in tieferen Ligen etwas kleiner (Liga-Faktor ^ JUMP_DAMP)
const JUMP_DAMP = 0.3; // Ausreißer nach oben gibt es auch unten: der Sprung schrumpft weniger als die normale Entwicklung
const KNOT_CHANCE = 0.15; // so oft platzt nach einem Tapetenwechsel der Knoten
const KNOT_JUMP = 0.75; // Anteil von JUMP, wenn der Knoten platzt

// Verborgener Typ eines Spielers in dieser Karriere (fest, ohne die Zufallsströme der Karriere zu berühren).
export function devProfile(career, idx, position = 'mid') {
  const rec = career.players[idx];
  let u = unit(career.seed ?? 0, idx, 4242);
  let type = DEV_TYPES[DEV_TYPES.length - 1][0];
  for (const [t, w] of DEV_TYPES) {
    if ((u -= w) < 0) {
      type = t;
      break;
    }
  }
  if (rec?.devType) type = rec.devType; // nach einem geplatzten Knoten
  const peak = PEAK_AGE[position] ?? 26;
  const v = unit(career.seed ?? 0, idx, 4243);
  // Durchbruch: früh (18–20), mittendrin (21–24) oder spät (25–28); Stillstand ab 18–21.
  const breakAge = v < 0.3 ? 18 + Math.floor(v / 0.1) : v < 0.75 ? 21 + Math.floor((v - 0.3) / 0.1125) : 25 + Math.floor((v - 0.75) / 0.0625);
  const stopAge = 18 + Math.floor(v * 4);
  // Wann der körperliche Abbau einsetzt (Basis 31, siehe developPlayers), je Typ und Position früher oder später.
  const declineShift = (type === 'frueh' || type === 'stagniert' ? -2 : type === 'spaet' ? 2 : type === 'konstant' ? 1 : 0) + (position === 'gk' ? 3 : 0);
  return { type, peak, breakAge: Math.min(breakAge, 28), stopAge, declineShift };
}

// Zuwachs in Stärkepunkten für diese Saison (vor Spielpraxis, Trainer und Ausstattung), ohne Abbau.
export function seasonCurve(prof, age) {
  const y = prof.peak - age; // Jahre bis zum Höhepunkt
  switch (prof.type) {
    case 'frueh':
      return y >= 6 ? 4.2 : y >= 4 ? 1.4 : 0;
    case 'spaet':
      return y >= 6 ? 0.8 : y >= -2 ? 2.3 : 0;
    case 'konstant':
      return y >= -3 ? 1.2 : 0;
    case 'durchbruch':
      return y >= 0 ? 0.7 : 0;
    case 'stagniert':
      return age < prof.stopAge ? 1.2 : 0;
    default:
      return y >= 6 ? 2.8 : y >= 3 ? 1.8 : y >= 0 ? 0.9 : 0;
  }
}

export const leagueGrowth = (career) => LEAGUE_GROWTH[Math.max(1, Math.min(LEAGUE_GROWTH.length, career.level ?? 1)) - 1];

// Tapetenwechsel seit der letzten Vorbereitung: neu im Verein, neuer Trainer oder neue Spielidee.
export function environmentChanged(career, idx, club) {
  const rec = career.players[idx];
  const flags = career.flags ?? {};
  if (rec && rec.devSeen == null) return true;
  if (flags.devCoach != null && flags.devCoach !== coachKey(career)) return true;
  if (flags.devStyle != null && flags.devStyle !== (club.tactic?.style ?? 'ausgewogen')) return true;
  return false;
}
const coachKey = (career) => (career.hired ? `h${career.hired.id}` : `c${career.coach?.idx ?? '-'}`);

// Nach der Vorbereitung: aktuellen Trainer und Stil merken (für den nächsten Vergleich).
export function rememberEnvironment(career, club) {
  career.flags ??= {};
  career.flags.devCoach = coachKey(career);
  career.flags.devStyle = club.tactic?.style ?? 'ausgewogen';
}

// Saisonzuwachs eines Spielers in Stärkepunkten (ohne körperlichen Abbau) und was dabei passiert ist.
// mul: Spielpraxis × Trainer × Ausstattung (aus developPlayers).
export function seasonGain(career, idx, p, mul, changed) {
  const prof = devProfile(career, idx, p.position);
  const lk = leagueGrowth(career);
  let gain = seasonCurve(prof, p.age) * lk * SCALE * mul;
  let event = null;
  if (prof.type === 'durchbruch' && p.age === prof.breakAge) {
    gain += JUMP * lk ** JUMP_DAMP * Math.min(1.2, mul);
    event = 'durchbruch';
  } else if (changed && prof.type !== 'durchbruch' && p.age <= prof.peak + 1 && unit(career.seed ?? 0, idx, career.season ?? 1, 4244) < KNOT_CHANCE) {
    // Neue Mannschaft, neuer Trainer, andere Taktik: Der Knoten platzt – und wer feststeckte, entwickelt sich wieder normal.
    gain += JUMP * KNOT_JUMP * lk ** JUMP_DAMP * Math.min(1.2, mul);
    event = 'knoten';
    if (prof.type === 'stagniert') career.players[idx].devType = 'normal';
  } else if (prof.type === 'stagniert' && p.age === prof.stopAge) event = 'stillstand';
  return { gain, event, prof };
}
