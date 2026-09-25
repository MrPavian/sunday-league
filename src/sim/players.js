import { clamp, len } from '../core/math.js';

// Spielrichtung: Team 0 spielt in der 1. Halbzeit Richtung +x, nach dem
// Seitenwechsel andersherum.
export const attackDir = (m, team) => (team === 0 ? 1 : -1) * (m.sidesSwapped ? -1 : 1);

// Welches Team greift auf die Torseite side (+1/-1) an?
export const teamAttacking = (m, side) => (attackDir(m, 0) === side ? 0 : 1);

export const getPlayer = (m, id) => (id == null ? null : m.players.find((p) => p.id === id));

export const ownGoalX = (m, team) => -attackDir(m, team) * m.pitch.halfLength;

export function setControlled(m, id) {
  const old = getPlayer(m, m.controlledId);
  if (old) {
    old.charging = false;
    old.charge = 0;
  }
  m.controlledId = id;
  m.pendingSwitch = null;
}

// Nach Platzverweis: nächsten Feldspieler des Teams übernehmen.
export function switchToNearestOnTeam(m, team) {
  let best = null;
  let bestD = Infinity;
  for (const p of m.players) {
    if (p.team !== team || p.role === 'gk') continue;
    const d = Math.hypot(p.pos.x - m.ball.pos.x, p.pos.z - m.ball.pos.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  m.controlledId = best?.id ?? null;
}

export function distToSegment(q, a, b) {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const l2 = abx * abx + abz * abz || 1;
  const t = clamp(((q.x - a.x) * abx + (q.z - a.z) * abz) / l2, 0, 1);
  return len(q.x - (a.x + abx * t), q.z - (a.z + abz * t));
}

export function clampToPitch(pitch, x, z, margin = 0.5) {
  return {
    x: clamp(x, -pitch.halfLength + margin, pitch.halfLength - margin),
    z: clamp(z, -pitch.halfWidth + margin, pitch.halfWidth - margin),
  };
}
