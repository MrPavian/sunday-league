import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { BALL_RADIUS, createBall, stepBall } from '../src/sim/ball.js';
import { PARKING_LOT } from '../src/sim/pitch.js';
import { createMatch, getPlayer, startTackle, stepMatch } from '../src/sim/match.js';

const DT = 1 / 60;

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
});

describe('ball', () => {
  it('rolls out and comes to rest on asphalt', () => {
    const ball = createBall();
    ball.vel.x = 8;
    for (let i = 0; i < 60 * 20; i++) stepBall(ball, PARKING_LOT, DT);
    expect(ball.vel.x).toBe(0);
    expect(ball.pos.y).toBeCloseTo(BALL_RADIUS);
    expect(ball.pos.x).toBeGreaterThan(5);
    expect(ball.pos.x).toBeLessThan(PARKING_LOT.halfLength);
  });

  it('detects a goal between the jackets', () => {
    const ball = createBall();
    ball.pos.x = 15;
    ball.vel.x = 15;
    let goal = null;
    for (let i = 0; i < 60 && !goal; i++) goal = stepBall(ball, PARKING_LOT, DT);
    expect(goal).toEqual({ team: 0 });
  });

  it('bounces off the parked cars instead of scoring wide', () => {
    const ball = createBall();
    ball.pos.x = -15;
    ball.pos.z = 5;
    ball.vel.x = -15;
    let goal = null;
    for (let i = 0; i < 120; i++) goal = stepBall(ball, PARKING_LOT, DT) ?? goal;
    expect(goal).toBeNull();
    expect(ball.pos.x).toBeGreaterThan(-PARKING_LOT.wallX);
  });
});

describe('match', () => {
  const run = (seed, seconds) => {
    const m = createMatch({ seed });
    for (let i = 0; i < seconds * 60; i++) {
      stepMatch(m, undefined, DT);
      m.events.length = 0;
    }
    return m;
  };

  it('is deterministic for the same seed', () => {
    const a = run(7, 90);
    const b = run(7, 90);
    expect(a.ball.pos).toEqual(b.ball.pos);
    expect(a.score).toEqual(b.score);
  });

  it('keeps everyone on the parking lot and the AI actually plays', () => {
    const m = run(3, 180);
    for (const p of m.players) {
      expect(Math.abs(p.pos.x)).toBeLessThanOrEqual(PARKING_LOT.wallX);
      expect(Math.abs(p.pos.z)).toBeLessThanOrEqual(PARKING_LOT.halfWidth);
      expect(p.stamina).toBeGreaterThanOrEqual(0);
    }
    expect(Math.abs(m.ball.pos.x) + Math.abs(m.ball.pos.z)).toBeGreaterThan(0);
  });

  it('produces goals over a full AI-only match', () => {
    let total = 0;
    for (const seed of [1, 2, 3]) {
      const m = run(seed, 700);
      expect(m.phase).toBe('ended');
      total += m.score[0] + m.score[1];
    }
    expect(total).toBeGreaterThan(0);
  });
});

describe('tackles', () => {
  const setup = () => {
    const m = createMatch({ seed: 11 });
    const tackler = getPlayer(m, '0-1');
    const victim = getPlayer(m, '1-1');
    Object.assign(tackler.pos, { x: -1, z: 0 });
    tackler.facing = { x: 1, z: 0 };
    tackler.attrs.tackling = 1;
    Object.assign(victim.pos, { x: 0.3, z: 0 });
    victim.facing = { x: -1, z: 0 };
    return { m, tackler, victim };
  };
  const runUntil = (m, type) => {
    const seen = [];
    for (let i = 0; i < 60 && !seen.includes(type); i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events.map((e) => e.type));
      m.events.length = 0;
    }
    return seen;
  };

  it('takes the man without the ball: foul and free kick for the victim', () => {
    const { m, tackler, victim } = setup();
    Object.assign(m.ball.pos, { x: 12, z: 8 });
    startTackle(m, tackler);
    const seen = runUntil(m, 'foul');
    expect(seen).toContain('foul');
    expect(m.phase).toBe('freekick');
    expect(m.ball.lastTouch).toBe(victim.id);
    for (const p of m.players) {
      if (p.team !== victim.team) expect(Math.hypot(p.pos.x - m.ball.pos.x, p.pos.z - m.ball.pos.z)).toBeGreaterThanOrEqual(3.49);
    }
  });

  it('plays the ball first: clean tackle, no free kick', () => {
    const { m, tackler } = setup();
    Object.assign(m.ball.pos, { x: -0.4, z: 0 });
    startTackle(m, tackler);
    const seen = runUntil(m, 'tackle');
    for (let i = 0; i < 30; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events.map((e) => e.type));
      m.events.length = 0;
    }
    expect(seen).toContain('tackle');
    expect(seen).not.toContain('foul');
    expect(m.phase).toBe('play');
  });
});
