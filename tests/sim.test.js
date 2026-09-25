import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { BALL_RADIUS, createBall, stepBall } from '../src/sim/ball.js';
import { PARKING_LOT, PITCHES } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';
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
    expect(goal).toEqual({ type: 'goal', team: 0 });
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
      const m = createMatch({ seed });
      for (let i = 0; i < 60 * 1200 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
      }
      expect(m.phase).toBe('ended');
      total += m.score[0] + m.score[1];
    }
    expect(total).toBeGreaterThan(0);
  });
});

describe('tackles', () => {
  const setup = (surface = 'grass') => {
    const m = createMatch({ seed: 11, pitch: { ...PARKING_LOT, surface: SURFACES[surface] }, kickoff: false });
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
    expect(m.phase).toBe('setpiece');
    expect(m.setPiece.type).toBe('freekick');
    expect(m.ball.lastTouch).toBe(victim.id);
    for (const p of m.players) {
      if (p.team !== victim.team) expect(Math.hypot(p.pos.x - m.ball.pos.x, p.pos.z - m.ball.pos.z)).toBeGreaterThanOrEqual(3.49);
    }
  });

  it('barely slides on asphalt, so the same tackle falls short', () => {
    const { m, tackler } = setup('asphalt');
    Object.assign(m.ball.pos, { x: 12, z: 8 });
    const startX = tackler.pos.x;
    startTackle(m, tackler);
    const seen = runUntil(m, 'foul');
    expect(seen).not.toContain('foul');
    expect(tackler.pos.x - startX).toBeLessThan(1.2);
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

describe('surfaces', () => {
  const onSurface = (id) => ({ ...PARKING_LOT, surface: SURFACES[id] });
  const drain = (m, seconds, seen = []) => {
    for (let i = 0; i < seconds * 60; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events.map((e) => e.type));
      m.events.length = 0;
    }
    return seen;
  };

  it('on asphalt the tackle button pokes instead of sliding, sprint forces the slide', () => {
    const m = createMatch({ seed: 4, kickoff: false });
    const human = getPlayer(m, m.controlledId);
    stepMatch(m, { move: { x: 0, z: 0 }, tackle: true }, DT);
    expect(human.state).toBe('poke');

    const g = createMatch({ seed: 4, pitch: onSurface('grass'), kickoff: false });
    stepMatch(g, { move: { x: 0, z: 0 }, tackle: true }, DT);
    expect(getPlayer(g, g.controlledId).state).toBe('tackle');

    const f = createMatch({ seed: 4, kickoff: false });
    stepMatch(f, { move: { x: 1, z: 0 }, sprint: true, tackle: true }, DT);
    expect(getPlayer(f, f.controlledId).state).toBe('tackle');
  });

  it('sliding on asphalt scrapes knees, sliding on grass does not', () => {
    const scrapes = (id) => {
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const m = createMatch({ seed, pitch: onSurface(id), kickoff: false });
        const p = getPlayer(m, '0-1');
        p.traits = [];
        Object.assign(m.ball.pos, { x: 12, z: 8 });
        startTackle(m, p);
        drain(m, 1.2);
        if (p.injury) n++;
      }
      return n;
    };
    expect(scrapes('asphalt')).toBeGreaterThan(8);
    expect(scrapes('grass')).toBe(0);
  });

  it('the AI rarely slides on hard ground', () => {
    const slides = (id) => {
      let n = 0;
      for (const seed of [1, 2, 3]) n += drain(createMatch({ seed, pitch: onSurface(id) }), 300).filter((t) => t === 'slide').length;
      return n;
    };
    expect(slides('asphalt') * 3).toBeLessThan(slides('grass'));
  });
});

describe('rules & set pieces', () => {
  const lines = { ...PARKING_LOT, boundary: 'lines', carRule: false };
  const stepN = (m, n, seen = []) => {
    for (let i = 0; i < n; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events);
      m.events.length = 0;
    }
    return seen;
  };
  const kick = (m, playerId, action, pos, vel) => {
    Object.assign(m.ball.pos, pos);
    Object.assign(m.ball.vel, vel);
    m.ball.lastTouch = playerId;
    m.ball.lastAction = action;
    m.lastTouchTeam = getPlayer(m, playerId).team;
    for (const p of m.players) p.kickCooldown = p.catchCooldown = 5; // niemand fängt den Ball ab
  };

  it('the team that conceded kicks off', () => {
    const m = createMatch({ seed: 2, kickoff: false, human: false });
    kick(m, '0-4', 'shoot', { x: 17, y: 0.5, z: 0 }, { x: 15, y: 0, z: 0 });
    const seen = stepN(m, 60 * 4);
    expect(seen.some((e) => e.type === 'goal' && e.team === 0)).toBe(true);
    expect(m.setPiece).toMatchObject({ type: 'kickoff', team: 1 });
  });

  it('a hard shot against a parked car hands the ball to the other team', () => {
    const m = createMatch({ seed: 2, kickoff: false, human: false });
    kick(m, '0-3', 'shoot', { x: 0, y: 0.5, z: 9 }, { x: 0, y: 0, z: 14 });
    const seen = stepN(m, 30);
    expect(seen.map((e) => e.type)).toContain('car');
    expect(m.setPiece).toMatchObject({ type: 'freekick', team: 1 });
  });

  it('side line: throw-in for the other team, taken from the hands', () => {
    const m = createMatch({ seed: 2, pitch: lines, kickoff: false, human: false });
    kick(m, '1-2', 'pass', { x: 3, y: 0.11, z: 10 }, { x: 0, y: 0, z: 8 });
    stepN(m, 30);
    expect(m.setPiece).toMatchObject({ type: 'throwin', team: 0 });
    const taker = getPlayer(m, m.setPiece.takerId);
    expect(m.ball.holder).toBe(taker.id);
    expect(Math.abs(taker.pos.z)).toBeCloseTo(lines.halfWidth);
    const seen = stepN(m, 60 * 3);
    expect(seen.some((e) => e.type === 'pass' && e.playerId === taker.id)).toBe(true);
  });

  it('end line: corner if the defenders touched it last, goal kick otherwise', () => {
    const corner = createMatch({ seed: 2, pitch: lines, kickoff: false, human: false });
    kick(corner, '1-1', 'dribble', { x: 17, y: 0.11, z: 5 }, { x: 8, y: 0, z: 0 });
    stepN(corner, 30);
    expect(corner.setPiece).toMatchObject({ type: 'corner', team: 0 });

    const goalKick = createMatch({ seed: 2, pitch: lines, kickoff: false, human: false });
    kick(goalKick, '0-4', 'shoot', { x: 17, y: 0.11, z: 5 }, { x: 8, y: 0, z: 0 });
    stepN(goalKick, 30);
    expect(goalKick.setPiece).toMatchObject({ type: 'goalkick', team: 1 });
    expect(getPlayer(goalKick, goalKick.ball.holder).role).toBe('gk');
  });

  it('frame goals: off the top of the bar goes over, not in', () => {
    const framed = { ...PARKING_LOT, goalType: 'frame' };
    const m = createMatch({ seed: 2, pitch: framed, kickoff: false, human: false });
    kick(m, '0-4', 'shoot', { x: 16, y: framed.goalHeight + 0.12, z: 0 }, { x: 12, y: 0.2, z: 0 });
    const seen = stepN(m, 20);
    expect(seen.map((e) => e.type)).toContain('bar');
    expect(seen.map((e) => e.type)).not.toContain('goal');
  });
});

describe('venues', () => {
  it.each(Object.entries(PITCHES))('%s: a full AI match runs, stays in bounds and sees goals', (id, pitch) => {
    const m = createMatch({ seed: 5, pitch, human: false });
    let goals = 0;
    for (let i = 0; i < 60 * 1200 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      goals += m.events.filter((e) => e.type === 'goal').length;
      m.events.length = 0;
      if (i % 600 === 0) {
        for (const p of m.players) {
          expect(Math.abs(p.pos.x)).toBeLessThanOrEqual(pitch.wallX);
          expect(Number.isFinite(p.pos.z)).toBe(true);
        }
        expect(Math.abs(m.ball.pos.x)).toBeLessThanOrEqual(pitch.wallX);
      }
    }
    expect(m.phase).toBe('ended');
    expect(goals).toBeGreaterThan(0);
    expect(m.players.length).toBe(pitch.format * 2);
  });
});
