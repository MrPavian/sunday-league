// Matchplan der CPU vor dem Spiel (AFS Phase 8, docs/ADVANCED-FOOTBALL-SYSTEM-08-MATCHPLAN.md).
// Nutzerentscheide 2026-11-27:
//   - Der CPU-Trainer setzt gegen die Handschrift des Gegners das gemessene Gegenmittel (career/patterns.js counter) – nur, wenn es
//     nicht gegen seine Philosophie geht (intel/philosophy.js avoid). Keine Vorschläge aus den eigenen Befunden (Phase 7).
//   - Fairness (E5): Gegen den Menschen sieht er nur, womit der Mensch im letzten Spiel aufgelaufen ist (career.seenPlan) – so wie
//     der Mensch die Handschrift der CPU im Scouting sieht. Wer seinen Plan wechselt, ist ihm einen Schritt voraus.
//   - Keine Notiz nach dem Spiel: Ein einzelnes Spiel belegt keine Wirkung.
// Ob er es tut, entscheidet seine Reaktionsfreude (sim/aicoach.js PERSONAS react) – gegen den Menschen mal dem Faktor der
// Schwierigkeit wie im Spiel (aicoach.js DIFFICULTY: leicht 0,5, hart 1,35; E7). Kein Zufallsstrom: stabiler Hash aus Spielstand,
// Saison, Spieltag und Verein, damit das Spiel selbst gleich bleibt.
import { PATTERNS, patternOf } from '../career/patterns.js';
import { coachOf } from '../career/opponents.js';
import { DIFFICULTY as COACH_DIFF, PERSONAS } from '../sim/aicoach.js';
import { difficultyOf } from '../career/difficulty.js';
import { philosophyOf } from './philosophy.js';

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491); // wie career.js

// Schalter der Schicht: aus = jede Woche die feste Handschrift wie vor Phase 8.
export const PLAN = { on: true };
const DIFF_KEY = { leicht: 'easy', normal: 'normal', hart: 'hard' };

// Handschrift, die man am Gegner erkennt: CPU – seine feste (patterns.js); Mensch – die erste Handschrift, deren Befehle alle im
// Plan seines letzten Spiels standen.
export function seenPattern(career, club) {
  if (!club) return null;
  if (!club.human) return patternOf(club);
  const seen = career.seenPlan ?? {};
  return Object.keys(PATTERNS).find((k) => Object.entries(PATTERNS[k].orders).every(([g, v]) => seen[g] === v)) ?? null;
}

// Plan des CPU-Vereins club gegen opp: { group, value, vs } oder null.
export function matchPlan(career, club, opp) {
  if (!PLAN.on || !club || club.human || !opp) return null;
  const vs = seenPattern(career, opp);
  const counter = PATTERNS[vs]?.counter;
  if (!counter) return null;
  const type = coachOf(club).type;
  if (philosophyOf(type).avoid.includes(`${counter.group}:${counter.value}`)) return null;
  const skill = opp.human ? COACH_DIFF[DIFF_KEY[difficultyOf(career)]] ?? 1 : 1;
  const chance = Math.min(0.95, (PERSONAS[type] ?? PERSONAS.normal).react * skill);
  const u = hashSeed(career.seed ?? 0, career.season ?? 0, career.round ?? 0, ...[...club.id].map((ch) => ch.charCodeAt(0)), 8) / 4294967296;
  return u < chance ? { group: counter.group, value: counter.value, vs } : null;
}
