// Schwierigkeitsgrad (ROADMAP 11.18 Punkt 5, 2026-11-12). Drei Stufen, gewählt beim Anlegen des Trainers und jederzeit unter
// Verein → Du umstellbar. Alle Werte sind Spielwerte.
//  - Vorstand: Faktor auf das Gewicht des Erfolgsdrucks der Liga (pressure.js weight) – „entspannt" verzeiht mehr, „hart" weniger.
//  - Geld: Faktor auf das wöchentliche Sponsorengeld (sponsors.js paySponsors).
//  - Familie (Nutzerentscheid 2026-11-12: „ein Mittelding, je nach Schwierigkeitsgrad schwieriger"): Gemessen fiel die Geduld der
//    Familie nie unter 65, die Beziehungskrise (unter 35) kam nie vor (scripts/balance-audit.mjs). Jetzt: Ab der Regionalliga
//    zehrt der Profi-Alltag jede Woche zusätzlich an der Geduld, und die Krise kommt früher.
//    entspannt = Stand von vorher (Krise unter 35, keine Zusatzlast) · normal = Mitte (unter 45, ½ Punkt je Woche) ·
//    hart = unter 60, 1 Punkt je Woche.
import { tr } from '../core/i18n.js';

export const FAMILY_LOAD_FROM = 9; // Regionalliga
export const DIFFICULTY = {
  leicht: { board: 0.7, sponsor: 1.15, familyCrisis: 35, familyLoad: 0 },
  normal: { board: 1, sponsor: 1, familyCrisis: 45, familyLoad: 0.5 },
  hart: { board: 1.3, sponsor: 0.85, familyCrisis: 60, familyLoad: 1 },
};
export const DIFFICULTIES = Object.keys(DIFFICULTY);
// Spielstände von vor dieser Einstellung spielen auf „normal".
export const difficultyOf = (c) => (DIFFICULTY[c?.difficulty] ? c.difficulty : 'normal');
export const diff = (c) => DIFFICULTY[difficultyOf(c)];
export function setDifficulty(c, id) {
  if (!DIFFICULTY[id] || difficultyOf(c) === id) return false;
  c.difficulty = id;
  return true;
}
// Punkte Geduld je Woche. Die Geduld zählt in ganzen Punkten (personal.js rundet), deshalb fällt ein halber Punkt als ein
// ganzer in jeder zweiten Woche an.
export function familyLoad(c) {
  if ((c.level ?? 1) < FAMILY_LOAD_FROM) return 0;
  const l = diff(c).familyLoad;
  return Math.floor(l) + (l % 1 && (c.round ?? 0) % 2 === 0 ? 1 : 0);
}
export const difficultyName = (id) => ({ leicht: tr('Entspannt', 'Relaxed'), normal: tr('Normal', 'Normal'), hart: tr('Hart', 'Hard') })[id];
export const difficultyDesc = (id) =>
  ({
    leicht: tr('Der Vorstand verzeiht mehr, Sponsoren zahlen etwas mehr, zu Hause ist man geduldiger.', 'The board forgives more, sponsors pay a little more, and they are more patient at home.'),
    normal: tr('So ist das Spiel gedacht.', 'The game as intended.'),
    hart: tr('Der Vorstand wird schneller ungeduldig, Sponsoren zahlen weniger, und im Profifußball leidet die Familie spürbar.', 'The board loses patience sooner, sponsors pay less, and in professional football the family visibly suffers.'),
  })[id];
