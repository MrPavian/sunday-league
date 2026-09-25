// „Halten": mit Ball schirmt der Spieler ab (Körper zwischen Gegner und Ball),
// ohne Ball hält er den nächsten Gegner am Trikot fest. Das bremst den Gegner –
// und ist ein Foul, wenn es jemand sieht.
import { dist2d, norm } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { judgeFoul, refereeSees } from './referee.js';
import { startSetPiece } from './setpieces.js';

const SHIELD_REACH = 1.3;
const GRAB_REACH = 1.0;

export function applyHold(m, p, active, dt) {
  const { ball } = m;
  p.shielding = false;
  if (!active) {
    p.holdingId = null;
    p.holdTime = 0;
    return false;
  }
  if (!ball.holder && dist2d(p.pos, ball.pos) < SHIELD_REACH && ball.lastTouch === p.id) {
    p.shielding = true;
    p.holdingId = null;
    p.holdTime = 0;
    return false;
  }
  // Nächsten Gegner in Griffweite festhalten.
  let target = p.holdingId != null ? m.players.find((o) => o.id === p.holdingId) : null;
  if (!target || dist2d(target.pos, p.pos) > GRAB_REACH * 1.3) {
    target = null;
    let best = GRAB_REACH;
    for (const o of m.players) {
      if (o.team === p.team || o.role === 'gk' || o.state !== 'normal') continue;
      const d = dist2d(o.pos, p.pos);
      if (d < best) {
        best = d;
        target = o;
      }
    }
  }
  if (!target) {
    p.holdingId = null;
    p.holdTime = 0;
    return false;
  }
  if (p.holdingId !== target.id) {
    p.holdTime = 0;
    m.events.push({ type: 'grab', playerId: p.id, victimId: target.id });
  }
  p.holdingId = target.id;
  p.holdTime += dt;
  target.heldUntil = m.time + 0.12;
  p.facing = norm(target.pos.x - p.pos.x, target.pos.z - p.pos.z);

  // Je länger, desto auffälliger. Ohne Schiri beschwert sich der Gehaltene selbst.
  if (p.holdTime < 0.4) return false;
  const perSecond = m.referee ? 0.9 : 0.55;
  if (!m.rng.chance(perSecond * dt)) return false;
  if (!refereeSees(m, target.pos)) {
    m.events.push({ type: 'no_call', playerId: p.id, victimId: target.id });
    p.holdTime = 0;
    return false;
  }
  m.events.push({ type: 'foul', playerId: p.id, victimId: target.id, kind: 'hold' });
  judgeFoul(m, p, hasTrait(p, 'meckerer') ? 0.3 : 0.2);
  p.holdingId = null;
  p.holdTime = 0;
  startSetPiece(m, { type: 'freekick', team: target.team, spot: { x: target.pos.x, z: target.pos.z }, takerId: target.id });
  return true;
}
