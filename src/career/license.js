// Zulassung und Aufstiegsverzicht (Konzept Profiligen 4, Nutzerentscheid 2026-11-05, nur neue Karrieren).
//  - Zulassung: Wer in die Regionalliga oder 3. Liga aufsteigen will, braucht Stadion, Flutlicht und einen Finanznachweis.
//    Fehlt etwas, steigt der Verein nicht auf, auch wenn er sportlich durch ist.
//    Regionalliga: 2500 Plätze (WDFV-Zulassungsrichtlinien, facilities.js „stadion“), Flutlicht mit mindestens 400 Lux
//    (BFV, Zulassungsvoraussetzungen Regionalliga Bayern 2025/26 – im Spiel das Flutlicht des Platzes). 3. Liga: 5001 Plätze
//    mit 2000 Sitzplätzen und Flutlicht mit 800 Lux (DFB, Zulassungsverfahren 3. Liga) – facilities.js „drittliga“, „flutlicht800“.
//    Finanznachweis: Rücklage für vier Wochen Spielbetrieb der neuen Liga (OPS_COST, Spielwert) – die DFB-Regel (1 Mio. €
//    Liquiditätsreserve, wenn das Personal 80 % der Erträge frisst) ist im Spiel so vereinfacht.
//  - Verzicht: Der eigene Verein kann jederzeit auf einen Aufstieg verzichten (aus Geldgründen, wie FC Hennef 05 als
//    Mittelrheinliga-Meister 2023, de.wikipedia „Fußball-Regionalliga West 2023/24“). CPU-Vereine verzichten auch – unten öfter
//    als oben (Nutzerentscheid; Anteile Spielwerte). Verzichtet der Meister der eigenen Liga, steigt der Zweite direkt auf.
//  - 2. Liga (seit 2026-11-05): 15 000 Plätze, davon 3000 überdachte Sitzplätze, und Rasenheizung (Landeshauptstadt Stuttgart,
//    Gemeinderatsdrucksache 2008 zum Waldau-Stadion: „Eine Rasenheizung ist Voraussetzung für die Zulassung zum Spielbetrieb in der
//    2. Bundesliga“; „Fassungsvermögen von 15.000 Zuschauern, davon mindestens 3.000 überdachte Sitzplätze“) – im Spiel die Arena
//    (rundum überdacht) und facilities.js „rasenheizung“. Flutlicht 1200 Lux (StadiumDB 2024 zum Stadion eines Aufsteigers: 1200 Lux
//    „meets the standards for the second division“).
//  - 1. Liga: mindestens 8000 Sitzplätze bei 15 000 Plätzen (Sky Sport, DFL zu Holstein Kiel) und Flutlicht mit 1800 Lux
//    (StadiumDB 2024) – facilities.js „sitzplatz8000“, „flutlicht1800“; Rasenheizung wie in der 2. Liga.
//  - Ganz oben (1. Liga) gibt es keinen Aufstieg mehr.
import { tr } from '../core/i18n.js';
import { maxLevel } from './clubs.js';
import { hasFacility } from './facilities.js';
import { OPS_COST } from './finances.js';

// Anteil der CPU-Meister, die auf den Aufstieg aus Stufe l verzichten (Spielwerte, unten öfter).
export const WAIVE_SHARE = [0, 0.2, 0.18, 0.16, 0.14, 0.12, 0.1, 0.08, 0.08, 0.06, 0.04, 0.02];
export const RESERVE_WEEKS = 4;

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x85ebca6b);
const strHash = (s) => [...String(s)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

// Verzichtet dieser CPU-Verein auf den Aufstieg aus Stufe `level`? Fest je Karriere, Saison und Verein.
export function cpuWaives(c, level, clubId) {
  if (!c?.pro) return false;
  return hash(c.seed ?? 0, c.season ?? 1, level, strHash(clubId), 4401) / 4294967296 < (WAIVE_SHARE[level] ?? 0);
}

// Verzichtet der CPU-Meister der eigenen Liga (rows = Tabelle)? Dann steigt der Zweite direkt auf.
export function championWaives(c, rows, level = c.level ?? 1) {
  const champ = rows?.[0]?.club;
  return !!champ && !champ.human && level < maxLevel(c) && cpuWaives(c, level, champ.id);
}

// Was die Zulassung für Stufe `target` verlangt – Liste mit erfüllt/nicht erfüllt.
export function licenseNeeds(c, target) {
  if (!c?.pro || target < 9) return [];
  const reserve = RESERVE_WEEKS * (OPS_COST[target] ?? 0);
  const items = target >= 12
    ? [
        { id: 'stadion', label: tr('Stadion mit 15 000 Plätzen, davon 8000 Sitzplätze (Sitzplatzausbau)', 'Stadium with 15,000 places incl. 8,000 seats (seating expansion)'), ok: hasFacility(c, 'sitzplatz8000') },
        { id: 'rasen', label: tr('Rasenheizung', 'Undersoil heating'), ok: hasFacility(c, 'rasenheizung') },
        { id: 'flutlicht', label: tr('Flutlicht mit 1800 Lux', 'Floodlights of 1,800 lux'), ok: hasFacility(c, 'flutlicht1800') },
      ]
    : target >= 11
    ? [
        { id: 'stadion', label: tr('Stadion mit 15 000 Plätzen, 3000 überdachte Sitzplätze (Arena)', 'Stadium with 15,000 places, 3,000 covered seats (arena)'), ok: hasFacility(c, 'arena') },
        { id: 'rasen', label: tr('Rasenheizung', 'Undersoil heating'), ok: hasFacility(c, 'rasenheizung') },
        { id: 'flutlicht', label: tr('Flutlicht mit 1200 Lux', 'Floodlights of 1,200 lux'), ok: hasFacility(c, 'flutlicht1200') },
      ]
    : target >= 10
    ? [
        { id: 'stadion', label: tr('Stadion mit 5001 Plätzen, 2000 Sitzplätze (Drittliga-Stadion)', 'Stadium with 5,001 places, 2,000 seats (third-division stadium)'), ok: hasFacility(c, 'drittliga') || hasFacility(c, 'arena') },
        { id: 'flutlicht', label: tr('Flutlicht mit 800 Lux', 'Floodlights of 800 lux'), ok: hasFacility(c, 'flutlicht800') },
      ]
    : [
        { id: 'stadion', label: tr('Stadion mit 2500 Plätzen (Stadionausbau)', 'Stadium with 2,500 places (stadium upgrade)'), ok: ['stadion', 'drittliga', 'arena'].some((id) => hasFacility(c, id)) },
        { id: 'flutlicht', label: tr('Flutlicht', 'Floodlights'), ok: hasFacility(c, 'flutlicht') },
      ];
  items.push({ id: 'geld', label: tr(`Finanznachweis: ${reserve.toLocaleString('de-DE')} € Rücklage`, `Proof of funds: €${reserve.toLocaleString('en-GB')} in reserve`), ok: (c.cash ?? 0) >= reserve });
  return items;
}
export const licensed = (c, target) => licenseNeeds(c, target).every((x) => x.ok);

// Saisonende: Darf der eigene Verein rauf? reason: 'top' (1. Liga, ganz oben), 'license', 'waived' (selbst verzichtet).
export function promotionBlock(c, level = c.level ?? 1) {
  if (!c?.pro) return null;
  if (level >= maxLevel(c)) return 'top';
  if (c.flags?.waiveUp === c.season) return 'waived';
  if (!licensed(c, level + 1)) return 'license';
  return null;
}

export function setWaive(c, on) {
  c.flags ??= {};
  c.flags.waiveUp = on ? c.season : null;
}

export function blockText(c, reason, level = c.level ?? 1) {
  if (reason === 'top') return tr('Höher geht es nicht: Meister der höchsten Liga des Landes.', 'It does not get any higher: champions of the top league in the country.');
  if (reason === 'waived') return tr('Der Verein verzichtet auf den Aufstieg – das Geld reicht nicht für die Liga darüber.', 'The club waives promotion – the money is not enough for the league above.');
  if (reason === 'license') {
    const miss = licenseNeeds(c, level + 1).filter((x) => !x.ok).map((x) => x.label).join(', ');
    return tr(`Keine Zulassung für die Liga darüber – es fehlt: ${miss}. Der Verein bleibt, wo er ist.`, `No licence for the league above – missing: ${miss}. The club stays where it is.`);
  }
  return '';
}
