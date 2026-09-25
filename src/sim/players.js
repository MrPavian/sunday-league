import { clamp, len } from '../core/math.js';

export const attackDir = (team) => (team === 0 ? 1 : -1);

export const getPlayer = (m, id) => (id == null ? null : m.players.find((p) => p.id === id));

export const ownGoalX = (m, team) => -attackDir(team) * m.pitch.halfLength;

export function setControlled(m, id) {
  const old = getPlayer(m, m.controlledId);
  if (old) {
    old.charging = false;
    old.charge = 0;
  }
  m.controlledId = id;
  m.pendingSwitch = null;
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
