// KI: Wer läuft an, wer sichert ab, wer deckt, wer läuft sich frei.
import { clamp, dist2d, len, norm } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { ballSpeed } from './ball.js';
import { attackDir, clampToPitch, distToSegment, getPlayer } from './players.js';

// Einmal pro Schritt: Rollen für beide Teams verteilen.
//   chaser – geht auf den Ball
//   cover  – sichert zwischen Ball und eigenem Tor ab
//   mark   – deckt einen Gegenspieler (torseitig)
//   support – läuft sich frei (bei eigenem Ballbesitz)
export function updateTactics(m, dt) {
  const { ball, pitch } = m;
  const target = { x: ball.pos.x + ball.vel.x * 0.3, z: ball.pos.z + ball.vel.z * 0.3 };
  const human = getPlayer(m, m.controlledId);
  const holder = ball.holder && getPlayer(m, ball.holder);
  const possession = holder ? holder.team : m.lastTouchTeam;
  m.tactics = {};

  for (let team = 0; team < 2; team++) {
    const s = attackDir(m, team);
    const ownGoal = { x: -s * pitch.halfLength, z: 0 };
    const pool = m.players
      .filter((p) => p.team === team && p.role !== 'gk' && p.id !== m.controlledId)
      .sort((a, b) => dist2d(a.pos, target) - dist2d(b.pos, target));

    let chaser = pool[0] ?? null;
    // Im eigenen Team läuft die KI nur an, wenn der gesteuerte Spieler weit weg ist.
    if (human && team === m.humanTeam && chaser && !(dist2d(chaser.pos, target) < dist2d(human.pos, target) - 6)) chaser = null;
    if (holder && holder.team === team) chaser = null;
    m.chasers[team] = chaser?.id ?? null;
    const rest = pool.filter((p) => p !== chaser);

    if (possession !== null && possession !== team) {
      const cover = rest.shift();
      if (cover) {
        const dir = norm(ownGoal.x - ball.pos.x, ownGoal.z - ball.pos.z);
        const d = Math.min(3.5, dist2d(ball.pos, ownGoal) * 0.5);
        m.tactics[cover.id] = { type: 'cover', ...clampToPitch(pitch, ball.pos.x + dir.x * d, ball.pos.z + dir.z * d) };
      }
      const carrier = ball.lastTouch;
      const opponents = m.players.filter((o) => o.team !== team && o.role !== 'gk' && o.id !== carrier);
      const taken = new Set();
      for (const p of rest) {
        let best = null;
        let bestD = Infinity;
        for (const o of opponents) {
          if (taken.has(o.id)) continue;
          const d = dist2d(o.pos, p.pos);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        if (!best) continue;
        taken.add(best.id);
        const dir = norm(ownGoal.x - best.pos.x, ownGoal.z - best.pos.z);
        m.tactics[p.id] = { type: 'mark', ...clampToPitch(pitch, best.pos.x + dir.x * 1.5, best.pos.z + dir.z * 1.5) };
      }
    } else {
      for (const p of rest) m.tactics[p.id] = { type: 'support', ...supportSpot(m, p, dt) };
    }
  }
}

// Freilaufen: Kandidaten rund um die Grundposition bewerten – Abstand zu
// Gegnern, freie Passlinie vom Ball, Richtung Tor. Alle ~0.7 s neu überlegt.
function supportSpot(m, p, dt) {
  const { ball, pitch, rng } = m;
  p.supportTimer = (p.supportTimer ?? 0) - dt;
  if (p.supportSpot && p.supportTimer > 0) return p.supportSpot;

  const s = attackDir(m, p.team);
  // Mit Auslinien nicht direkt an der Linie anbieten.
  const margin = pitch.boundary === 'lines' ? 2.5 : 1.2;
  const base = clampToPitch(pitch, p.home.x * 0.5 + ball.pos.x * 0.7 + s * 2.5, p.home.z + ball.pos.z * 0.3, margin);
  const offsets = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [2.5, 2.5], [2.5, -2.5], [-2.5, 2.5], [-2.5, -2.5]];
  let best = base;
  let bestScore = -Infinity;
  for (const [ox, oz] of offsets) {
    const c = clampToPitch(pitch, base.x + ox, base.z + oz, margin);
    let score = s * c.x * 0.05 - len(c.x - base.x, c.z - base.z) * 0.15;
    for (const o of m.players) {
      if (o.team === p.team) continue;
      const d = dist2d(o.pos, c);
      if (d < 4) score -= 4 - d;
      if (distToSegment(o.pos, ball.pos, c) < 1.2) score -= 1.5;
    }
    for (const t of m.players) {
      if (t.team === p.team && t !== p && dist2d(t.pos, c) < 3) score -= 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  p.supportSpot = best;
  p.supportTimer = 0.6 + rng.next() * 0.3;
  return best;
}

export function outfieldIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const oppGoal = { x: s * pitch.halfLength, z: 0 };

  if (ball.holder === p.id) {
    // Einwurf: kurz orientieren, dann werfen.
    p.holdTimer += dt;
    if (p.holdTimer > 0.8 && !p.pending) p.pending = { type: 'pass', ttl: 0.5, cone: -0.6 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  if (m.chasers[p.team] === p.id) {
    const toGoal = norm(oppGoal.x - ball.pos.x, oppGoal.z - ball.pos.z);
    const rx = p.pos.x - ball.pos.x;
    const rz = p.pos.z - ball.pos.z;
    let ax = ball.pos.x - toGoal.x * 0.35;
    let az = ball.pos.z - toGoal.z * 0.35;
    // Steht der Spieler vor dem Ball, läuft er außen herum.
    if (rx * toGoal.x + rz * toGoal.z > 0.2) {
      const side = rx * -toGoal.z + rz * toGoal.x >= 0 ? 1 : -1;
      ax = ball.pos.x - toGoal.x * 0.9 - toGoal.z * side * 0.9;
      az = ball.pos.z - toGoal.z * 0.9 + toGoal.x * side * 0.9;
    }
    const dBall = dist2d(p.pos, ball.pos);
    if (p.setPieceAction === 'cross' && dBall < 1.3) {
      p.setPieceAction = null;
      p.pending = { type: 'pass', lofted: 'cross', cone: -0.8, ttl: 0.4 };
    }
    const tackle = chooseTackle(m, p, dBall);
    if (tackle) return { tackle };
    p.dribbleDir = norm(oppGoal.x - p.pos.x, p.aimZ - p.pos.z);
    if (dBall < 1.3 && p.decideTimer <= 0 && !p.pending && !ball.holder) {
      // Amateure brauchen einen Moment, bis sie sich entscheiden.
      p.decideTimer = 0.25 + (1 - p.attrs.technique) * 0.35 + m.rng.next() * 0.2;
      aiDecide(m, p, oppGoal);
    }
    return { move: norm(ax - p.pos.x, az - p.pos.z), sprint: dBall > 3 && p.stamina > 0.3 };
  }

  p.dribbleDir = null;
  const t = m.tactics[p.id] ?? clampToPitch(pitch, p.home.x * 0.5 + ball.pos.x * 0.7, p.home.z + ball.pos.z * 0.3, 1.2);
  const dx = t.x - p.pos.x;
  const dz = t.z - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.4) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const urgent = t.type === 'cover' || t.type === 'mark';
  const k = urgent ? Math.min(1, d / 2) : Math.min(1, d / 3) * 0.75;
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > (urgent ? 5 : 9) && p.stamina > 0.35 };
}

function aiDecide(m, p, oppGoal) {
  const { rng, pitch } = m;
  const dGoal = dist2d(p.pos, oppGoal);
  const toG = norm(oppGoal.x - p.pos.x, oppGoal.z - p.pos.z);
  const facingDot = p.facing.x * toG.x + p.facing.z * toG.z;
  p.aimZ = rng.range(-2.5, 2.5);

  const range = 10 + p.attrs.shooting * 5 + (hasTrait(p, 'hammer') ? 4 : 0);
  if (dGoal < range && facingDot > 0.2) {
    const gw = pitch.goalHalfWidth;
    p.pending = {
      type: 'shoot',
      power: clamp(0.3 + dGoal / 20, 0.35, 0.95),
      target: { x: oppGoal.x, z: rng.range(-gw * 0.8, gw * 0.8) },
      ttl: 0.3,
    };
    return;
  }
  // Außen an der Grundlinie: Flanke in die Mitte.
  const wide = Math.abs(p.pos.z) > pitch.halfWidth * 0.55 && Math.abs(p.pos.x - oppGoal.x) < pitch.halfLength * 0.4;
  if (wide && rng.chance(0.5)) {
    p.pending = { type: 'pass', lofted: 'cross', cone: -0.3, ttl: 0.3 };
    return;
  }
  const underPressure = m.players.some((o) => {
    if (o.team === p.team) return false;
    const dx = o.pos.x - p.pos.x;
    const dz = o.pos.z - p.pos.z;
    const d = len(dx, dz);
    return d < 2.2 && (dx * toG.x + dz * toG.z) / (d || 1) > 0.2;
  });
  if ((underPressure && rng.chance(0.45 + 0.4 * p.attrs.passing)) || rng.chance(0.03)) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2 };
  }
}

// Die KI geht in den Zweikampf, wenn ein Gegner den Ball am Fuß hat. Auf
// hartem Boden stochert sie – gegrätscht wird dort nur von Hitzköpfen.
function chooseTackle(m, p, dBall) {
  const { ball, rng } = m;
  const surface = m.pitch.surface;
  if (p.decideTimer > 0 || dBall < 0.6 || dBall > 2.2 || ball.holder) return null;
  const opp = ball.lastTouch && getPlayer(m, ball.lastTouch);
  if (!opp || opp.team === p.team || opp.role === 'gk' || dist2d(opp.pos, ball.pos) > 1.2) return null;
  const tb = norm(ball.pos.x - p.pos.x, ball.pos.z - p.pos.z);
  if (tb.x * p.facing.x + tb.z * p.facing.z < 0.8) return null;
  p.decideTimer = 0.8;

  const tough = hasTrait(p, 'hart_im_nehmen');
  const slideChance = surface.hard ? (p.injury ? 0 : tough ? 0.25 : 0.04) : 0.08 + 0.18 * p.attrs.tackling;
  if (dBall > 0.9 && rng.chance(slideChance)) return 'slide';
  if (dBall < 1.4 && rng.chance(0.3 + 0.35 * p.attrs.tackling)) return 'poke';
  return null;
}

export function keeperIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const goalX = -s * pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  p.dribbleDir = { x: s, z: 0 };

  if (ball.holder === p.id) {
    p.holdTimer += dt;
    p.facing = { x: s, z: 0 };
    // Abschlag weit nach vorne – kurze Würfe werden vorm eigenen Tor abgefangen.
    if (p.holdTimer > 1.2 && !p.pending) p.pending = { type: 'pass', ttl: 0.5, cone: -0.2, lofted: true, minDist: 9 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  let tx = goalX + s * 0.8;
  let tz = clamp(ball.pos.z * 0.4, -gw - 0.2, gw + 0.2);
  if (ball.vel.x * -s > 2) {
    const t = (tx - ball.pos.x) / ball.vel.x;
    if (t > 0 && t < 2) tz = clamp(ball.pos.z + ball.vel.z * t, -gw - 0.6, gw + 0.6);
  }
  // Freie Bälle im Fünfer holt er sich.
  const dMe = dist2d(p.pos, ball.pos);
  const beaten = m.players.some((o) => o.team !== p.team && dist2d(o.pos, ball.pos) < dMe - 0.5);
  if (!ball.holder && !beaten && Math.abs(ball.pos.x - goalX) < 5 && Math.abs(ball.pos.z) < 5 && ballSpeed(ball) < 6) {
    tx = ball.pos.x;
    tz = ball.pos.z;
  }
  const dx = tx - p.pos.x;
  const dz = tz - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.15) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const k = Math.min(1, d / 1.5);
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > 2 };
}
