import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { BALL_RADIUS, createBall, stepBall } from '../src/sim/ball.js';
import { PARKING_LOT, PITCHES } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';
import { createMatch, getPlayer, startTackle, stepMatch } from '../src/sim/match.js';
import { createPlayerPool } from '../src/sim/generator.js';
import { gradePlayers, headline } from '../src/sim/stats.js';

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
    expect(goal).toEqual({ type: 'goal', side: 1 });
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
      for (const seed of [1, 2, 3, 4, 5, 6]) n += drain(createMatch({ seed, pitch: onSurface(id), human: false }), 300).filter((t) => t === 'slide').length;
      return n;
    };
    expect(slides('asphalt') * 2.5).toBeLessThan(slides('grass'));
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

describe('player pool', () => {
  const pool = createPlayerPool({ seed: 1921, size: 25000 });

  it('is deterministic: the same number is always the same player', () => {
    const again = createPlayerPool({ seed: 1921, size: 25000 });
    for (const i of [0, 42, 1234, 24999]) expect(again.get(i)).toEqual(pool.get(i));
  });

  it('has the right rarity: many OK players, very few ex-pros', () => {
    const c = pool.countByTier();
    expect(c.ok).toBeGreaterThan(c.gut);
    expect(c.gut).toBeGreaterThan(c.stark);
    expect(c.stark).toBeGreaterThan(c.dorfstar);
    expect(c.dorfstar).toBeGreaterThan(c.superstar);
    expect(c.superstar).toBeGreaterThan(50);
    expect(c.legende).toBeGreaterThanOrEqual(1);
    expect(c.legende).toBeLessThan(40);
  });

  it('gets stronger with every tier, ex-pros on top', () => {
    const avg = (tier) => {
      const ps = pool.byTier(tier);
      return ps.reduce((s, p) => s + p.rating, 0) / ps.length;
    };
    const order = ['ok', 'gut', 'stark', 'dorfstar', 'superstar', 'legende'].map(avg);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it('ex-pros and superstars come with a backstory, ex-pros with the trait', () => {
    for (const p of pool.byTier('legende')) {
      expect(p.traits).toContain('ex_profi');
      expect(p.backstory.length).toBeGreaterThan(40);
      expect(p.title).toBeTruthy();
    }
    for (const p of pool.byTier('superstar')) expect(p.backstory).toBeTruthy();
    expect(pool.byTier('ok').some((p) => p.traits.includes('ex_profi'))).toBe(false);
  });

  it('an ex-pro can play in a match', () => {
    const legend = pool.byTier('legende').find((p) => p.position !== 'gk');
    const m = createMatch({ seed: 3, human: false });
    Object.assign(m.players[4], { ...legend, id: m.players[4].id, role: m.players[4].role, team: 0 });
    for (let i = 0; i < 60 * 30; i++) {
      stepMatch(m, undefined, DT);
      m.events.length = 0;
    }
    expect(Number.isFinite(m.ball.pos.x)).toBe(true);
  });
});

describe('backstories', () => {
  it('career years fit the age', () => {
    const pool = createPlayerPool({ seed: 7, size: 25000 });
    for (const p of [...pool.byTier('superstar'), ...pool.byTier('legende')]) {
      const years = Number(/(\d+) Jahre/.exec(p.backstory)?.[1] ?? 0);
      expect(years).toBeLessThanOrEqual(p.age - 18);
    }
  });
});

describe('match flow', () => {
  const full = (seed, opts = {}) => {
    const m = createMatch({ seed, human: false, ...opts });
    const seen = [];
    for (let i = 0; i < 60 * 1200 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events);
      m.events.length = 0;
    }
    return { m, seen };
  };

  it('has a half time with a change of ends and a kickoff for the other team', () => {
    const m = createMatch({ seed: 4, human: false });
    const gk0 = () => m.players.find((p) => p.team === 0 && p.role === 'gk');
    expect(gk0().home.x).toBeLessThan(0);
    const seen = [];
    for (let i = 0; i < 60 * 400 && m.half === 1; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events);
      m.events.length = 0;
    }
    expect(seen.map((e) => e.type)).toContain('halftime');
    for (let i = 0; i < 60 * 4 && m.phase === 'halftime'; i++) stepMatch(m, undefined, DT);
    expect(m.sidesSwapped).toBe(true);
    expect(gk0().home.x).toBeGreaterThan(0);
    expect(m.setPiece).toMatchObject({ type: 'kickoff', team: 1 });
  });

  it('after the change of ends goals still count for the right team', () => {
    const m = createMatch({ seed: 4, human: false, kickoff: false });
    m.sidesSwapped = true; // Team 0 greift jetzt Richtung -x an
    Object.assign(m.ball.pos, { x: -17, y: 0.5, z: 0 });
    Object.assign(m.ball.vel, { x: -15, y: 0, z: 0 });
    m.ball.lastTouch = '0-4';
    m.lastTouchTeam = 0;
    for (const p of m.players) p.kickCooldown = p.catchCooldown = 5;
    for (let i = 0; i < 30; i++) stepMatch(m, undefined, DT);
    expect(m.score).toEqual([1, 0]);
  });

  it('the AI substitutes tired players at stoppages, subs can come back', () => {
    const { m, seen } = full(6);
    const subs = seen.filter((e) => e.type === 'sub');
    expect(subs.length).toBeGreaterThan(0);
    expect(m.players.length).toBe(10);
    expect(m.bench[0].length + m.bench[1].length).toBe(6);
    const ids = new Set([...m.players, ...m.bench[0], ...m.bench[1]].map((p) => p.id));
    expect(ids.size).toBe(16);
  });

  it('the human asks for a sub and it happens at the next stoppage', () => {
    const m = createMatch({ seed: 6, kickoff: false });
    stepMatch(m, { move: { x: 0, z: 0 }, sub: true }, DT);
    expect(m.subRequests[0]).toBe(true);
    Object.assign(m.ball.pos, { x: 0, y: 0.5, z: 9 });
    Object.assign(m.ball.vel, { x: 0, y: 0, z: 14 });
    m.ball.lastTouch = '1-3';
    m.ball.lastAction = 'shoot';
    m.lastTouchTeam = 1;
    for (const p of m.players) p.kickCooldown = 5;
    const seen = [];
    for (let i = 0; i < 30; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events);
      m.events.length = 0;
    }
    expect(seen.some((e) => e.type === 'sub' && e.team === 0)).toBe(true);
  });

  it('keeps stats, grades everyone who played and writes a headline', () => {
    const { m } = full(8);
    const grades = gradePlayers(m);
    const graded = Object.values(grades);
    expect(graded.length).toBeGreaterThanOrEqual(10);
    for (const g of graded) {
      expect(g).toBeGreaterThanOrEqual(1);
      expect(g).toBeLessThanOrEqual(6);
    }
    const goalsInStats = Object.values(m.stats.players).reduce((s, p) => s + p.goals + p.ownGoals, 0);
    expect(goalsInStats).toBe(m.score[0] + m.score[1]);
    expect(m.stats.teams[0].possession + m.stats.teams[1].possession).toBeGreaterThan(400);
    expect(headline(m, grades).length).toBeGreaterThan(10);
  });
});

describe('referee', () => {
  it('only exists where there is one, and follows the ball', () => {
    expect(createMatch({ seed: 1, human: false }).referee).toBeNull();
    const m = createMatch({ seed: 1, human: false, pitch: PITCHES.rasenplatz });
    expect(m.referee.name).toBeTruthy();
    for (let i = 0; i < 60 * 20; i++) stepMatch(m, undefined, DT);
    expect(Math.hypot(m.referee.pos.x - m.ball.pos.x, m.referee.pos.z - m.ball.pos.z)).toBeLessThan(25);
  });

  it('a second yellow sends a player off and the team plays short', () => {
    const m = createMatch({ seed: 2, human: true, pitch: PITCHES.rasenplatz, kickoff: false });
    const p = m.players.find((q) => q.id === m.controlledId);
    p.yellow = 1;
    m.referee.trait = 'pingelig';
    m.rng.chance = () => true; // Schiri sieht alles und zückt sofort
    const victim = m.players.find((q) => q.team === 1 && q.role !== 'gk');
    Object.assign(p.pos, { x: 0, z: 0 });
    Object.assign(victim.pos, { x: 0.4, z: 0 });
    p.facing = { x: 1, z: 0 };
    victim.facing = { x: 1, z: 0 };
    Object.assign(m.ball.pos, { x: 10, z: 8 });
    m.referee.pos = { x: 1, z: -2 };
    const seen = [];
    stepMatch(m, { move: { x: 0, z: 0 }, tackle: true, sprint: true }, DT);
    for (let i = 0; i < 40; i++) {
      stepMatch(m, undefined, DT);
      seen.push(...m.events);
      m.events.length = 0;
    }
    expect(seen.some((e) => e.type === 'card' && e.color === 'yellowred' && e.playerId === p.id)).toBe(true);
    expect(m.players.filter((q) => q.team === 0)).toHaveLength(6);
    expect(m.players.some((q) => q.id === p.id)).toBe(false);
    expect(m.controlledId).not.toBe(p.id);
  });
});
