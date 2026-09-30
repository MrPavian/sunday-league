// Kombinationen im Angriff: Abschluss aus guter Lage, Doppelpass, Ball behaupten und
// prallen lassen (mit Lauf in die Tiefe), Rückpass von der Grundlinie in den Rückraum.
//
// Ablauf eines Doppelpasses: A spielt B an und sprintet sofort an seinem Gegenspieler
// vorbei in den freien Raum (m.combo). B spielt direkt in den Lauf zurück, wenn der Weg
// frei ist – sonst verfällt die Kombination nach kurzer Zeit.
import { clamp, dist2d, norm } from '../core/math.js';
import { hasProfile } from './profiles.js';
import { attackDir, clampToPitch, distToSegment, getPlayer } from './players.js';
import { adherence, styleOf } from './plan.js';

const COMBO_TIME = 2.6; // s, so lange gilt ein Laufweg nach dem Abspiel
const RETURN_WAIT = 1.1; // s, so lange wartet die Wand auf eine freie Bahn zurück

// Lust aufs Kombinieren (Stil, Befehl), gewichtet mit der Umsetzung des Spielers.
export const comboK = (m, p) => 1 + (styleOf(m, p.team).combo - 1) * adherence(m, p);

const opponents = (m, team) => m.players.filter((o) => o.team !== team && o.role !== 'gk' && o.state === 'normal');
// Liegt ein Gegner in der Bahn? Wer direkt am Ballführer klebt, ist Druck, keine Bahn.
const laneFree = (m, p, to, width) => !opponents(m, p.team).some((o) => dist2d(o.pos, p.pos) > 1.1 && distToSegment(o.pos, p.pos, to) < width);

// Vorderster Punkt, bis zu dem ein Laufweg gehen darf (nicht in den Torwartraum).
const runLimit = (m, depth) => m.pitch.halfLength - depth - 1;

// Aussichtsreiche Lage: nah am Tor, zentral, freie Schussbahn. Seitlich zum Tor geht es
// noch (Schuss aus der Drehung), mit dem Rücken nicht.
export function shotOn(m, p, oppGoal, minFacing = -0.3) {
  const { pitch } = m;
  const s = attackDir(m, p.team);
  if (p.pos.x * s <= 0.3) return false;
  const d = dist2d(p.pos, oppGoal);
  if (d > Math.min(12, pitch.halfLength * 0.55) || Math.abs(p.pos.z) > pitch.goalHalfWidth * 2 + 1) return false;
  const tg = norm(oppGoal.x - p.pos.x, oppGoal.z - p.pos.z);
  if (p.facing.x * tg.x + p.facing.z * tg.z < minFacing) return false;
  return !opponents(m, p.team).some((o) => distToSegment(o.pos, p.pos, oppGoal) < 0.9);
}

// Rücken zum Tor, Gegenspieler dicht dahinter (zwischen ihm und dem Tor).
export function backToGoal(m, p, toG) {
  if (p.facing.x * toG.x + p.facing.z * toG.z > -0.1) return false;
  return opponents(m, p.team).some((o) => dist2d(o.pos, p.pos) < 1.8 && (o.pos.x - p.pos.x) * toG.x + (o.pos.z - p.pos.z) * toG.z > 0.2);
}

// Ablage: kurz zurück oder quer zu einem freien Mitspieler, der aufs Tor schauen kann.
export function layoffMate(m, p) {
  const s = attackDir(m, p.team);
  let best = null;
  let bestScore = -Infinity;
  for (const t of m.players) {
    if (t.team !== p.team || t === p || t.role === 'gk' || t.state !== 'normal') continue;
    const rel = (t.pos.x - p.pos.x) * s;
    const d = dist2d(t.pos, p.pos);
    if (rel > 0.5 || rel < -9 || d < 2.5 || d > 10) continue;
    if (opponents(m, p.team).some((o) => dist2d(o.pos, t.pos) < 1.8)) continue;
    if (!laneFree(m, p, t.pos, 1)) continue;
    const score = -Math.abs(d - 5) * 0.15 - Math.abs(t.pos.z) * 0.05 + (t.role === 'mid' ? 0.2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

// Rückpass von der Grundlinie: flach zurück an den Elfmeterpunkt statt hoch ins Getümmel.
export function cutbackMate(m, p, oppGoal) {
  const { pitch } = m;
  const s = attackDir(m, p.team);
  if (Math.abs(p.pos.x - oppGoal.x) > Math.max(4, pitch.halfLength * 0.2)) return null;
  let best = null;
  let bestD = Infinity;
  for (const t of m.players) {
    if (t.team !== p.team || t === p || t.role === 'gk' || t.state !== 'normal') continue;
    const dG = dist2d(t.pos, oppGoal);
    if (dG < 4 || dG > Math.min(11, pitch.halfLength * 0.5) || Math.abs(t.pos.z) > pitch.goalHalfWidth * 1.8) continue;
    if ((t.pos.x - p.pos.x) * s > 0) continue;
    if (opponents(m, p.team).some((o) => dist2d(o.pos, t.pos) < 1.6)) continue;
    if (!laneFree(m, p, t.pos, 0.9)) continue;
    if (dG < bestD) {
      bestD = dG;
      best = t;
    }
  }
  return best;
}

// Nach jedem Abspiel: Startet der Passgeber einen Lauf (Doppelpass bzw. nach der Ablage)?
export function considerCombo(m, keeperDepth) {
  const P = m.pass;
  if (m.combo && (m.time - m.combo.time > COMBO_TIME || m.lastTouchTeam !== m.combo.team)) m.combo = null;
  if (!P || P === m.comboPass) return;
  m.comboPass = P;
  // Der Rückpass selbst startet keinen neuen Lauf.
  if (m.combo && P.kicker === m.combo.wall) return;
  const a = getPlayer(m, P.kicker);
  const b = getPlayer(m, P.targetId);
  if (!a || !b || a.role === 'gk' || b.role === 'gk' || P.through || m.time - (m.setPiece?.time ?? -9) < 2) return;
  const { pitch, rng } = m;
  const s = attackDir(m, a.team);
  const limit = runLimit(m, keeperDepth);
  const layoff = m.layoffBy?.id === a.id && m.time - m.layoffBy.time < 0.6;
  if (layoff) {
    // Ablegen und abdrehen: am Gegenspieler vorbei in die Tiefe.
    const opp = opponents(m, a.team).reduce((q, o) => (!q || dist2d(o.pos, a.pos) < dist2d(q.pos, a.pos) ? o : q), null);
    const side = opp ? (opp.pos.z > a.pos.z ? -1 : 1) : a.pos.z > 0 ? -1 : 1;
    const x = Math.min(a.pos.x * s + 5, limit);
    if (x - a.pos.x * s < 2) return;
    m.combo = { kind: 'layoff', runner: a.id, wall: b.id, team: a.team, time: m.time, spot: clampToPitch(pitch, x * s, a.pos.z + side * 2, 1.2) };
    return;
  }
  // Doppelpass: kurzer Pass, ein Gegner vor dem Passgeber, dahinter Platz.
  // Wer kombinieren soll, sucht den Doppelpass auch über etwas mehr Abstand und wenn der
  // Gegner noch weiter weg steht.
  const eager = styleOf(m, a.team).combo > 1.2;
  const d = dist2d(a.pos, b.pos);
  if (d < 3 || d > (eager ? 13 : 11) || a.pos.x * s < -pitch.halfLength * 0.1 || a.stamina < 0.3) return;
  const beat = opponents(m, a.team).some((o) => {
    const rel = (o.pos.x - a.pos.x) * s;
    return rel > 0 && rel < (eager ? 8 : 5) && Math.abs(o.pos.z - a.pos.z) < (eager ? 4.5 : 3);
  });
  if (!beat) return;
  const x = Math.min(a.pos.x * s + 7, limit);
  if (x - a.pos.x * s < 2.5) return;
  const z = clamp(a.pos.z + (b.pos.z - a.pos.z) * 0.25, -pitch.halfWidth * 0.85, pitch.halfWidth * 0.85);
  const k = hasProfile(a, 'solist') ? 0.5 : hasProfile(a, 'teamplayer') ? 1.3 : 1;
  // Befehl „Kombinieren“ bzw. Kurzpassspiel: öfter – so weit der Spieler es umsetzt.
  if (!rng.chance(clamp((0.2 + 0.35 * a.attrs.passing) * k * comboK(m, a), 0, 0.9))) return;
  m.combo = { kind: 'onetwo', runner: a.id, wall: b.id, team: a.team, time: m.time, spot: clampToPitch(pitch, x * s, z, 1.2) };
}

// Die Wand: direkt in den Lauf zurück, wenn die Bahn frei ist. 'wait' = Ball kurz
// behaupten, bis der Läufer so weit ist.
export function comboReturn(m, p) {
  const c = m.combo;
  if (!c || c.wall !== p.id || c.returned) return null;
  const r = getPlayer(m, c.runner);
  if (!r || r.state !== 'normal' || r.id === m.controlledId) return null;
  const s = attackDir(m, p.team);
  const fresh = m.time - c.time < RETURN_WAIT + 0.5;
  // In den Lauf spielen: ein Stück vor den Läufer Richtung Zielpunkt.
  const to = norm(c.spot.x - r.pos.x, c.spot.z - r.pos.z);
  const ahead = Math.min(2.5, dist2d(r.pos, c.spot) + 1);
  const point = clampToPitch(m.pitch, r.pos.x + to.x * ahead + r.vel.x * 0.2, r.pos.z + to.z * ahead + r.vel.z * 0.2, 1.2);
  // Der Rückpass geht nach vorn in den Raum – nicht zurück zum Läufer, der noch hinten ist.
  if ((point.x - p.pos.x) * s < 1.5 || dist2d(point, p.pos) < 2 || !laneFree(m, p, point, 1.1)) {
    if (fresh) return 'wait';
    m.combo = null;
    return null;
  }
  c.returned = true;
  m.events.push({ type: 'combo', kind: c.kind, playerId: r.id, wallId: p.id });
  return { type: 'pass', through: point, targetId: r.id, ttl: 0.3, cone: -1, combo: c.kind };
}

// Laufweg des Kombinationspartners (in updateTactics eingesetzt).
export function comboRun(m, team) {
  const c = m.combo;
  if (!c || c.team !== team || c.returned) return null;
  if (c.runner === m.controlledId) return null;
  return c;
}
