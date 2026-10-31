// Werte über 1 (docs/KONZEPT-SPIELERSTAERKE.md 12, Weg A, vom Nutzer gewählt 2026-10-31): Höhere Ligen bekommen Technikwerte über 1.
// Jede Formel rechnet bis 1 genau wie bisher (Werte lagen immer bei höchstens 0,98 – Golden bleibt gleich). Darüber wird ein Spieler
// weiter besser, mit abnehmendem Ertrag statt gegen eine feste Grenze:
//  - Zweikampf (Angreifer gegen Verteidiger): der Teil bis 1 wie bisher, der Teil über 1 als Unterschied beider (contest).
//  - Fehler (Streuung, Fehlgriff, Bedenkzeit, Fehlerwahrscheinlichkeit): über 1 schrumpft er auf FLOOR seines Werts bei 1 zu (errScale).
//  - Fähigkeit ohne Gegenspieler (Reichweite, Schussweite, Haltezeit): über 1 weich (soft), Steigung 1 am Übergang.
// SOFT und FLOOR sind Spielwerte, an der Engine gemessen (scripts/strength-steepness.mjs mit BASE/CAP, Konzept 12.1).
export const SKILL = { soft: 0.3, floor: 0.25 };

// Obergrenze je Wert (Konzept 12.2 Schritt 2): Im Stärkemodell 2 (neue Karrieren ab 2026-10-31) dürfen die Technikwerte über 1;
// Tempo, Ausdauer und Körper bleiben bei 0,98 (die Laufgeschwindigkeit bleibt in echten m/s). Modell 1 (alte Spielstände): alles 0,98.
export const PHYS_ATTRS = new Set(['pace', 'stamina', 'strength']);
export const TECH_MAX = 3;
export const attrMax = (k, model = 1) => (model >= 2 && !PHYS_ATTRS.has(k) ? TECH_MAX : 0.98);

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

// Fehler gegen den Gegner (Nutzerentscheid 2026-10-31, Konzept 12.4): Wie sauber ein Spieler passt, annimmt, schießt, köpft oder
// grätscht, hängt vom Niveau der Gegner ab. Der eigene Wert wird um das Niveau der gegnerischen Mannschaft im passenden Wert
// verschoben, gemessen am Durchschnitt heutiger Hobbyteams (REF, Feldspieler, 400 erzeugte Kader). So wirkt ein Unterschied auf
// jedem Niveau gleich stark; PRESS.w < 1 lässt Profis gegen Profis trotzdem etwas sauberer spielen (Spielwert).
export const VS = { technique: 'tackling', passing: 'tackling', shooting: 'tackling', tackling: 'technique', heading: 'heading' };
export const REF = { tackling: 0.42, technique: 0.45, heading: 0.44 };
export const PRESS = { w: 0.8 };
function teamLevel(m, team, attr) {
  const key = `${team}:${attr}:${Math.floor(m.time ?? 0)}`; // je Spielsekunde neu (Wechsel, Platzverweise)
  const c = (m._lvl ??= {});
  if (c[key] != null) return c[key];
  let s = 0;
  let n = 0;
  for (const q of m.players) if (q.team === team && q.role !== 'gk' && q.attrs[attr] != null) (s += q.attrs[attr]), n++;
  for (const k of Object.keys(c)) if (k.startsWith(`${team}:${attr}:`)) delete c[k];
  return (c[key] = n ? s / n : REF[attr]);
}
export function vs(m, p, attr) {
  const o = VS[attr];
  const v = p.attrs[attr];
  if (!o || !m?.players) return v;
  return v - PRESS.w * (teamLevel(m, 1 - p.team, o) - REF[o]);
}
