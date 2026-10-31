// Werte über 1 (docs/KONZEPT-SPIELERSTAERKE.md 12, Weg A, vom Nutzer gewählt 2026-10-31): Höhere Ligen bekommen Technikwerte über 1.
// Jede Formel rechnet bis 1 genau wie bisher (Werte lagen immer bei höchstens 0,98 – Golden bleibt gleich). Darüber wird ein Spieler
// weiter besser, mit abnehmendem Ertrag statt gegen eine feste Grenze:
//  - Zweikampf (Angreifer gegen Verteidiger): der Teil bis 1 wie bisher, der Teil über 1 als Unterschied beider (contest).
//  - Fehler (Streuung, Fehlgriff, Bedenkzeit, Fehlerwahrscheinlichkeit): über 1 schrumpft er auf FLOOR seines Werts bei 1 zu (errScale).
//  - Fähigkeit ohne Gegenspieler (Reichweite, Schussweite, Haltezeit): über 1 weich (soft), Steigung 1 am Übergang.
// SOFT und FLOOR sind Spielwerte, an der Engine gemessen (scripts/strength-steepness.mjs mit BASE/CAP, Konzept 12.1).
export const SKILL = { soft: 0.3, floor: 0.25 };

export const cap1 = (x) => (x > 1 ? 1 : x);
export const over = (x) => (x > 1 ? x - 1 : 0);
export const soft = (x) => (x <= 1 ? x : 1 + SKILL.soft * (1 - Math.exp(-(x - 1) / SKILL.soft)));
export const errScale = (x) => (x <= 1 ? 1 : SKILL.floor + (1 - SKILL.floor) * Math.exp(-(x - 1) / SKILL.soft));
// Erfolgswahrscheinlichkeit p (bei Wert x): über 1 schrumpft die Fehlerchance 1 − p wie ein Fehler.
export const sure = (p, x) => (x <= 1 ? p : 1 - (1 - p) * errScale(x));
// Zweiseitig: Vorsprung d (über 1, z. B. Torwart gegen Schütze) verschiebt p; d > 0 senkt die Fehlerchance, d < 0 die Erfolgschance.
export const tilt = (p, d) => (d >= 0 ? 1 - (1 - p) * errScale(1 + d) : p * errScale(1 - d));
// Unterschied zweier Werte oberhalb von 1, gewichtet mit k (für Zweikampf-Formeln: Teil bis 1 bleibt wie bisher).
export const contest = (a, b, k) => k * (over(a) - over(b));
