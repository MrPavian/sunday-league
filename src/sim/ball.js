export const BALL_RADIUS = 0.11;
const G = 9.81;

export function createBall() {
  return {
    pos: { x: 0, y: BALL_RADIUS, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    holder: null,
    lastTouch: null,
  };
}

export function ballSpeed(ball) {
  const v = ball.vel;
  return Math.hypot(v.x, v.y, v.z);
}

// Integrates one step. Returns { team } when the ball crosses a goal line
// between the posts (team = scoring side), otherwise null.
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

  let goal = null;
  const hl = pitch.halfLength;
  const inMouth = Math.abs(pos.z) < pitch.goalHalfWidth && pos.y < pitch.goalHeight;
  if (inMouth && prevX < hl && pos.x >= hl) goal = { team: 0 };
  if (inMouth && prevX > -hl && pos.x <= -hl) goal = { team: 1 };

  const zMax = pitch.halfWidth - BALL_RADIUS;
  if (Math.abs(pos.z) > zMax) {
    pos.z = Math.sign(pos.z) * zMax;
    vel.z = -vel.z * 0.5;
  }
  const xMax = pitch.wallX - BALL_RADIUS;
  if (Math.abs(pos.x) > xMax) {
    pos.x = Math.sign(pos.x) * xMax;
    vel.x = -vel.x * 0.5;
  }
  return goal;
}
