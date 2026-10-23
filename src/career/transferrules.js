// Transfermarkt, Teil 1: die Regeln – Wechselfristen, Freigabe, Wartefrist, Ausbildungsentschädigung, Handgeld.
// Reine Funktionen ohne Spielstand-Änderung (transfers.js wendet sie an).
//
// Quellen (Recherche Okt. 2026):
//  - Wechselperioden für Amateure: Periode I 1. Juli bis 31. August, Periode II 1. bis 31. Januar. Sofortige Spielerlaubnis
//    ohne Wartefrist nur mit (1) Abmeldung beim alten Verein bis 30. Juni (Periode II: bis 31. Dezember), (2) Antrag auf
//    Spielerlaubnis bis Periodenende, (3) Freigabe/Zustimmung des alten Vereins, die dieser binnen 14 Tagen erteilen muss;
//    fehlt eine Voraussetzung, wird eine Wartezeit verhängt. Fußball-Verband Mittelrhein, „Leitfaden Wechselperiode I
//    (Amateure)“ nach den Spielordnungen von WDFV und DFB (fvm.de, 2024-10-01); Winter: FVM-Kreis Rhein-Erft, „Das ist beim
//    Vereinswechsel im Winter zu beachten“ (rhein-erft.fvm.de, 2019).
//  - Wartefrist ohne Freigabe: Pflichtspiele frühestens nach sechs Monaten (§ 22 Nr. 9 SpO/WDFV, Stand 2026). Hier: 6 von
//    10 Spielmonaten (August bis Mai) = 60 % der Spieltage einer Saison (waitGames).
//  - Ausbildungsentschädigung: Beträge des Hessischen Fußball-Verbands, „Entschädigungsbeträge für Amateurspieler gem. § 94
//    Spielordnung“ (Stand 22.05.2024): Kreisliga A–D 250 €, Kreisoberliga 500 € Grundbetrag; Wechsel nach oben = Betrag der
//    aufnehmenden Klasse, nach unten = Mittel beider Klassen, gleiche Klasse = Grundbetrag; +50 % bei Spielern unter 21, die die
//    letzten drei Jahre beim abgebenden Verein gespielt haben, −50 % bei weniger als 18 Monaten Spielrecht beim abgebenden
//    Verein. Im Sommer sind die Beträge festgeschrieben, im Winter frei verhandelbar (FVM-Artikel oben). Andere Landesverbände
//    weichen leicht ab. NICHT übernommen: der Zuschlag von +50 % für aufnehmende Vereine ohne Jugend (die CPU-Vereine haben
//    keine Jugendabteilung im Spiel) und die Kombinationsspalten – hier werden die Prozentpunkte einfach addiert.
//  - Handgeld/Aufwandsentschädigung: Amateur bleibt, wer neben belegten Auslagen höchstens 249,99 € im Monat pauschal bekommt
//    (DFB-Spielordnung § 8, siehe AMATEUR_MAX_MONTH in leagueevents.js). Die Stufen unten liegen alle darunter.
//
// Spielwerte (keine Realwerte, so gekennzeichnet): Zuordnung der Spielligen zu den Hessen-Klassen (1 = Freizeitliga ohne
// Verband = keine Entschädigung; 2–4 = Kreisliga-Stufe; 5 Bezirksliga = Kreisoberliga-Stufe), Handgeld-Stufen, Anfragen je
// Periode, Wichtigkeit des Spielers für die Freigabe.
import { tr } from '../core/i18n.js';

export const windowLabel = (kind) => (kind === 'summer' ? tr('Sommer (Wechselperiode I)', 'summer (transfer period I)') : tr('Winter (Wechselperiode II)', 'winter (transfer period II)'));

// Auf den Spielkalender: Sommer = erste Woche der Saison (August, „bis 31. August“), Winter = erste Woche nach der
// Winterpause (Spielwerte-Abbildung des Januar auf die Saisonmitte; die Pause liegt davor, siehe weather.js monthOf).
export function windowAt(c, round = c.round) {
  const n = c.fixtures?.length ?? 0;
  if (!n) return null;
  if (round === 0) return 'summer';
  if (round === Math.floor(n / 2)) return 'winter';
  return null;
}
// Nächste Frist ab dieser Woche: { kind, round, weeks } oder null (Saisonende; dann folgt der Sommer der nächsten Saison).
export function nextWindow(c) {
  const n = c.fixtures?.length ?? 0;
  const half = Math.floor(n / 2);
  if (c.round < half) return { kind: 'winter', round: half, weeks: half - c.round };
  return { kind: 'summer', round: 0, weeks: n - c.round };
}
export const windowKey = (c, kind = windowAt(c)) => `${c.season}:${kind}`;

// Wartefrist ohne Freigabe in Spieltagen (6 von 10 Spielmonaten).
export const waitGames = (c) => Math.max(1, Math.round((c.fixtures?.length ?? 10) * 0.6));

// Ausbildungsentschädigung: Grundbetrag je Spielliga (Spielwert-Zuordnung, siehe oben).
export const FEE_BASE = { 1: 0, 2: 250, 3: 250, 4: 250, 5: 500 };
export function trainingFee(fromLevel, toLevel, { age = 30, seasonsAtClub = 0, recent = false } = {}) {
  if (fromLevel <= 1 || toLevel <= 1) return 0; // Freizeitliga: kein Verbandsspielbetrieb, kein Pass, keine Entschädigung
  const a = FEE_BASE[fromLevel] ?? 250;
  const b = FEE_BASE[toLevel] ?? 250;
  const base = toLevel >= fromLevel ? b : Math.round((a + b) / 2);
  let pct = 0;
  if (age < 21 && seasonsAtClub >= 3) pct += 50;
  if (recent) pct -= 50;
  return Math.round((base * (100 + pct)) / 100);
}
// Winter: frei verhandelbar – wichtige Spieler kosten mehr (importance 0–1, Spielwert).
export const winterFee = (base, importance) => Math.round(base * (1 + 0.5 * importance));

// Handgeld (einmalig) – alle Stufen unter der Amateurgrenze, Spielwerte.
export const HANDGELD_STEPS = [0, 40, 80, 150];
export const handgeldOk = (v) => HANDGELD_STEPS.includes(v); // die Stufen liegen unter AMATEUR_MAX_MONTH (leagueevents.js, per Test geprüft)
// Extra an den abgebenden Verein (nur im Winter erlaubt, Spielwerte) und was es der Freigabe bringt.
export const EXTRA_STEPS = [0, 100, 250];
export const EXTRA_BONUS = { 0: 0, 100: 0.1, 250: 0.2 };

export const MAX_REQUESTS = 3; // Freigabe-Anfragen je Periode (Spielwert)

// Wichtigkeit eines Spielers in seinem Kader: 1 = bester, 0 = schwächster (nach Stärke), Torwart-Sonderfall.
export function importanceIn(squad, idx, ratingOf, positionOf) {
  if (squad.length < 2) return 1;
  const sorted = [...squad].sort((a, b) => ratingOf(b) - ratingOf(a));
  const rank = sorted.indexOf(idx);
  let imp = 1 - rank / (squad.length - 1);
  // Einziger Torwart (bei zwei: der bessere) ist unverzichtbar.
  if (positionOf(idx) === 'gk') {
    const keepers = squad.filter((x) => positionOf(x) === 'gk');
    if (keepers.length <= 1) imp = 1;
    else if (ratingOf(idx) >= Math.max(...keepers.map(ratingOf))) imp = Math.max(imp, 0.9);
  }
  return Math.max(0, Math.min(1, imp));
}
export const importanceLabel = (imp) => (imp >= 0.85 ? tr('Leistungsträger', 'key player') : imp >= 0.45 ? tr('Stammspieler', 'regular') : tr('Ersatz', 'back-up'));

// Chance auf Freigabe (0–1). Spielwerte: wichtige Spieler gibt keiner gern her, der Derby-Rivale schon gar nicht, ein gutes
// Verhältnis (rel −3…+3) hilft; Extra-Geld nur im Winter.
export function releaseChance({ importance, derby = false, rel = 0, kind = 'summer', extra = 0 }) {
  let p = 0.92 - 0.6 * importance - (derby ? 0.25 : 0) + rel * 0.06;
  if (kind === 'winter') p += EXTRA_BONUS[extra] ?? 0;
  return Math.max(0.03, Math.min(0.95, p));
}
