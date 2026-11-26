// Philosophien je Trainertyp (AFS Phase 6, docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md Abschnitt 6): eine kleine Tabelle,
// die dieselben Befunde (intel/core.js) zu verschiedenen Entscheidungen macht.
//   like / avoid: wie im Spiel (sim/aicoach.js PERSONAS), dazu gemiedene Grundstile
//   weights:      was den Trainer zuerst stört – Faktor auf die Wirkung gegen diesen Befund
// Alles hier ist bewusst gesetzt (Charakter, Spielwert), kein Messwert. Die Wirkungen selbst bleiben gemessen (core.js EFFECTS).
// Kaderwünsche (Abschnitt 6) folgen mit der Kaderpassung (Phase 8), weil es dafür noch keine Spielerbefunde gibt.
import { PERSONAS } from '../sim/aicoach.js';

const EXTRA = {
  grossmaul: { avoid: ['style:mauern'], weights: { xg: 1.5, tilt: 1.5 } }, // will immer mehr nach vorn
  oldschool: { avoid: ['style:offensiv'], weights: { xgA: 1.5, packing: 1.5 } }, // erst hinten dicht, dann lang
  stratege: { avoid: [], weights: {} }, // nimmt, was am meisten bringt
  kumpeltyp: { avoid: [], weights: {} }, // lässt machen
  ballbesitz: { avoid: ['style:mauern'], weights: { passPct: 2 } }, // der Ball soll laufen, lange Bälle stören
};
export const PHILOSOPHY_TYPES = Object.keys(EXTRA);

// Philosophie eines Trainertyps (null-Typ: neutral).
export function philosophyOf(type) {
  const p = PERSONAS[type];
  const x = EXTRA[type];
  if (!p || !x) return { like: [], avoid: [], weights: {}, src: 'SET' };
  return { like: [...p.like], avoid: [...p.avoid, ...x.avoid], weights: { ...x.weights }, src: 'SET' };
}
