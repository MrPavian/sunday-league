export const BALL_RADIUS = 0.11;
const G = 9.81;
const POST_RADIUS = 0.06;

export function createBall() {
  return {
    pos: { x: 0, y: BALL_RADIUS, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    holder: null,
    lastTouch: null,
    lastAction: null, // shoot | pass | header | dribble | tackle | save – für Torarten & Autoregel
  };
}

export function ballSpeed(ball) {
  const v = ball.vel;
  return Math.hypot(v.x, v.y, v.z);
}

// Integrates one step. Returns an event or null:
//   { type: 'goal', team }            – team = scoring side
//   { type: 'out', line: 'side'|'end', x, z }
//   { type: 'car', x, z }             – hart gegen ein parkendes Auto
//   { type: 'post' } / { type: 'bar' }
export function stepBall(ball, pitch, dt) {
  if (ball.holder) return null;
  const { pos, vel } = ball;
  const { surface } = pitch;
  const prevX = pos.x;

  vel.y -= G * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;

  if (pos.y <= BALL_RADIUS) {
    pos.y = BALL_RADIUS;
    if (vel.y < -1.0) {
      vel.y = -vel.y * surface.bounce;
      vel.x *= 0.88;
      vel.z *= 0.88;
    } else {
      vel.y = 0;
    }
  }

  const onGround = pos.y <= BALL_RADIUS + 1e-4 && vel.y === 0;
  const h = Math.hypot(vel.x, vel.z);
  if (h > 0) {
    let next;
    if (onGround) {
      next = Math.max(0, h * Math.exp(-surface.rollFriction * dt) - surface.rollDecel * dt);
    } else {
      next = h * (1 - 0.04 * dt);
    }
    if (next < 0.05) next = 0;
    const k = next / h;
    vel.x *= k;
    vel.z *= k;
  }

  let event = pitch.goalType === 'frame' ? collideFrame(ball, pitch, prevX) : null;

  const hl = pitch.halfLength;
  const inMouth = Math.abs(pos.z) < pitch.goalHalfWidth && pos.y < pitch.goalHeight;
  if (inMouth && prevX < hl && pos.x >= hl) event = { type: 'goal', team: 0 };
  if (inMouth && prevX > -hl && pos.x <= -hl) event = { type: 'goal', team: 1 };

  const lines = pitch.boundary === 'lines';
  if (lines && (!event || event.type !== 'goal')) {
    if (Math.abs(pos.z) > pitch.halfWidth + BALL_RADIUS) event = { type: 'out', line: 'side', x: pos.x, z: pos.z };
    else if (Math.abs(pos.x) > hl + BALL_RADIUS && Math.abs(pos.z) >= pitch.goalHalfWidth - 0.01)
      event = { type: 'out', line: 'end', x: pos.x, z: pos.z };
    else if (Math.abs(pos.x) > hl + BALL_RADIUS && pos.y >= pitch.goalHeight)
      event = { type: 'out', line: 'end', x: pos.x, z: pos.z };
  }

  // Begrenzung: bei 'walls' die Autos/Wände, bei 'lines' der Zaun ums Feld.
  const zMax = (lines ? (pitch.fenceZ ?? pitch.halfWidth + 3) : pitch.halfWidth) - BALL_RADIUS;
  if (Math.abs(pos.z) > zMax) {
    const impact = Math.abs(vel.z);
    pos.z = Math.sign(pos.z) * zMax;
    vel.z = -vel.z * 0.5;
    // Nur richtige Schüsse/Pässe zählen, nicht das Dribbeln an der Stoßstange.
    if (!event && pitch.carRule && ((ball.lastAction === 'shoot' && impact > 6) || impact > 13)) event = { type: 'car', x: pos.x, z: pos.z };
  }
  const xMax = pitch.wallX - BALL_RADIUS;
  if (Math.abs(pos.x) > xMax) {
    pos.x = Math.sign(pos.x) * xMax;
    vel.x = -vel.x * 0.5;
  }
  return event;
}

// Pfosten (senkrechte Zylinder) und Latte (waagerechter Zylinder). Die
// Abprallrichtung kommt von der Seite, aus der der Ball kam – sonst tunnelt
// ein schneller Ball durch die Latte ins Tor.
function collideFrame(ball, pitch, prevX) {
  const { pos, vel } = ball;
  const hl = pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  const r = BALL_RADIUS + POST_RADIUS;
  for (const sx of [-1, 1]) {
    const px = sx * hl;
    if (Math.abs(pos.x - px) > 1) continue;
    if (pos.y < pitch.goalHeight + r) {
      for (const sz of [-1, 1]) {
        const dx = sideOf(pos.x - px, prevX - px);
        const dz = pos.z - sz * gw;
        const d = Math.hypot(dx, dz);
        if (d < r && d > 1e-6) {
          const nx = dx / d;
          const nz = dz / d;
          const vn = vel.x * nx + vel.z * nz;
          if (vn < 0) {
            vel.x -= 1.6 * vn * nx;
            vel.z -= 1.6 * vn * nz;
          }
          pos.x = px + nx * r;
          pos.z = sz * gw + nz * r;
          return { type: 'post' };
        }
      }
    }
    if (Math.abs(pos.z) < gw) {
      const dx = sideOf(pos.x - px, prevX - px);
      const dy = pos.y - pitch.goalHeight;
      const d = Math.hypot(dx, dy);
      if (d < r && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        const vn = vel.x * nx + vel.y * ny;
        if (vn < 0) {
          vel.x -= 1.6 * vn * nx;
          vel.y -= 1.6 * vn * ny;
        }
        pos.x = px + nx * r;
        pos.y = pitch.goalHeight + ny * r;
        return { type: 'bar' };
      }
    }
  }
  return null;
}

const sideOf = (dx, prevDx) => (Math.sign(dx) !== Math.sign(prevDx) && prevDx !== 0 ? -dx || Math.sign(prevDx) * 1e-3 : dx);
