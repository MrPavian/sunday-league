// Positionsfremd: Wer nicht auf seiner Position spielt, spielt schlechter.
// Reine, deterministische Rechnung (keine Zufallszahlen) – die Sim bleibt reproduzierbar.
//
// Positionsdaten im Code: Spieler haben position (gk | def | mid | fwd), jeder Platz in der
// Formation hat eine Rolle derselben Art (formation.js). Daraus ergibt sich die Stufe:
//   own    – eigene Position, kein Abzug
//   near   – Nachbar (def↔mid, mid↔fwd): kleiner Abzug
//   far    – weit weg (def↔fwd): deutlicher Abzug
//   gkIn   – Feldspieler im Tor: sehr schwach (Torwartwert halbiert)
//   gkOut  – Torwart im Feld: schwach
// Grenze der Genauigkeit: Außen/Zentrum (Flügel gegen Stürmer) unterscheidet die Formation
// nicht, daher gibt es dafür keine eigene Stufe.
//
// Tuning (ein Wert pro Stufe, multipliziert die Fertigkeiten; Tempo und Ausdauer sind körperlich
// und bleiben unberührt). Gemessen mit scripts/position-audit.mjs, siehe tests/position.test.js.
import { tr } from '../core/i18n.js';
import { ratePlayer } from './generator.js';

export const SKILLS = ['technique', 'passing', 'shooting', 'tackling', 'heading'];
export const OOP_SKILL_MUL = { own: 1, near: 0.92, far: 0.72, gkIn: 0.85, gkOut: 0.82 };
// Torwartwert eines Feldspielers im Tor (Parade, Fangen, Reichweite).
export const OOP_KEEPING_MUL = { gkIn: 0.5 };

// Gewöhnung: Je Spiel auf derselben fremden Position schrumpft der Abzug linear.
// Nach ADAPT_MATCHES Spielen ist die Gewöhnung voll; ein Rest (1 − ADAPT_RELIEF) bleibt für immer,
// ein Verteidiger wird nie ganz zum Stürmer.
export const ADAPT_MATCHES = 12;
export const ADAPT_RELIEF = 0.85;
// Murren nur, solange die Gewöhnung unter dieser Schwelle liegt.
export const GRUMBLE_FAM = 0.5;

const NEIGHBOUR = { def: ['mid'], mid: ['def', 'fwd'], fwd: ['mid'] };

export function posGrade(position, role) {
  if (!role || !position || position === role) return 'own';
  if (position === 'fan') return role === 'gk' ? 'gkIn' : 'far';
  if (role === 'gk') return 'gkIn';
  if (position === 'gk') return 'gkOut';
  return NEIGHBOUR[position]?.includes(role) ? 'near' : 'far';
}

// 0 … 1: wie sehr hat sich einer an die Position gewöhnt (n = Spiele dort)?
export const familiarity = (n) => Math.max(0, Math.min(1, (n ?? 0) / ADAPT_MATCHES));

// Faktoren nach Gewöhnung: der Abzug (1 − mul) schrumpft um fam · ADAPT_RELIEF.
export function oopFactors(grade, fam = 0) {
  const keep = 1 - fam * ADAPT_RELIEF;
  const skill = 1 - (1 - OOP_SKILL_MUL[grade]) * keep;
  const keeping = 1 - (1 - (OOP_KEEPING_MUL[grade] ?? 1)) * keep;
  return { skill, keeping };
}

export function oopAttrs(attrs, grade, fam = 0) {
  if (grade === 'own') return attrs;
  const f = oopFactors(grade, fam);
  const out = { ...attrs };
  for (const k of SKILLS) if (out[k] != null) out[k] = Math.max(0.05, out[k] * f.skill);
  if (out.keeping != null) out.keeping = Math.max(0.03, out.keeping * f.keeping);
  return out;
}

// Stärke auf dem Platz mit Abzug (für Aufstellung und Anzeige). fam: Gewöhnung 0 … 1.
export function slotRating(p, role, fam = 0) {
  const grade = posGrade(p.position, role);
  return ratePlayer({ ...p, position: role, attrs: oopAttrs(p.attrs, grade, fam) });
}

// Anzeige: { grade, fam, from, to } oder null, wenn er auf seiner Position steht.
// from = Stärke auf der eigenen Position, to = Stärke auf diesem Platz.
export function oopInfo(p, role, fam = 0) {
  const grade = posGrade(p.position, role);
  if (grade === 'own') return null;
  return { grade, fam, from: ratePlayer(p), to: slotRating(p, role, fam) };
}

// Spielfigur (Entity): Werte passend zur aktuellen Rolle setzen. Idempotent und umkehrbar –
// die Originalwerte bleiben in baseAttrs, attrs wird ersetzt, nie verändert (geteilte Objekte).
// p.posFam = { rolle: Gewöhnung } kommt aus der Karriere; ohne Angabe 0.
export function applyPositionMalus(p) {
  p.baseAttrs ??= p.attrs;
  const grade = posGrade(p.position, p.role);
  const fam = p.posFam?.[p.role] ?? 0;
  p.attrs = grade === 'own' ? p.baseAttrs : oopAttrs(p.baseAttrs, grade, fam);
  p.oop = grade === 'own' ? null : { grade, fam, from: ratePlayer({ ...p, attrs: p.baseAttrs, position: p.position }), to: ratePlayer({ ...p, position: p.role }) };
  return p.oop;
}

// Hinweistext für Aufstellung und Wechseltafel: "positionsfremd 62 → 51 · Gewöhnung 25 %".
export function oopText(info) {
  if (!info) return '';
  const pct = Math.round(info.fam * 100);
  return tr(`positionsfremd ${info.from} → ${info.to}`, `out of position ${info.from} → ${info.to}`) + (info.grade === 'near' && pct === 0 ? '' : ` · ${tr('Gewöhnung', 'adapted')} ${pct} %`);
}

// Wen vom Kader auf eine Rolle stellen? Dieselbe Position zuerst (frischester); gibt es keinen, der mit der
// besten Stärke auf dem Platz (mit Abzug und Gewöhnung p.posFam) gewichtet mit der Frische.
export function bestForRole(cands, role) {
  const same = cands.filter((b) => b.position === role);
  if (same.length) return same.reduce((a, b) => (b.stamina > a.stamina ? b : a));
  const score = (b) => slotRating(b, role, b.posFam?.[role] ?? 0) * (0.6 + 0.4 * (b.stamina ?? 1));
  return cands.reduce((a, b) => (score(b) > score(a) ? b : a), cands[0]);
}
