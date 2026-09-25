import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { BALL_RADIUS, createBall, stepBall } from '../src/sim/ball.js';
import { PARKING_LOT, PITCHES } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';
import { createMatch, getPlayer, startTackle, stepMatch } from '../src/sim/match.js';
import { createPlayerPool } from '../src/sim/generator.js';
import { gradePlayers, headline } from '../src/sim/stats.js';
import { keeperZone } from '../src/sim/ai.js';

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

  it('D slides on every surface, Y pokes; A shields the ball or holds an opponent', () => {
    const m = createMatch({ seed: 4, kickoff: false });
    stepMatch(m, { move: { x: 0, z: 0 }, tackle: true }, DT);
    expect(getPlayer(m, m.controlledId).state).toBe('tackle'); // auch auf Asphalt – mit Risiko

    const g = createMatch({ seed: 4, kickoff: false });
    stepMatch(g, { move: { x: 0, z: 0 }, poke: true }, DT);
    expect(getPlayer(g, g.controlledId).state).toBe('poke');

    // Abschirmen: am Ball wird man langsamer, ist aber schwerer zu stellen.
    const s = createMatch({ seed: 5, kickoff: false });
    const me = getPlayer(s, s.controlledId);
    Object.assign(s.ball.pos, { x: me.pos.x + 0.4, y: 0.11, z: me.pos.z });
    s.ball.lastTouch = me.id;
    stepMatch(s, { move: { x: 1, z: 0 }, hold: true }, DT);
    expect(me.shielding).toBe(true);

    // Festhalten: der Gegner wird gebremst.
    const h = createMatch({ seed: 6, kickoff: false });
    const p = getPlayer(h, h.controlledId);
    const opp = h.players.find((o) => o.team === 1 && o.role !== 'gk');
    Object.assign(opp.pos, { x: p.pos.x + 0.6, z: p.pos.z });
    Object.assign(h.ball.pos, { x: p.pos.x - 8, z: p.pos.z });
    stepMatch(h, { move: { x: 0, z: 0 }, hold: true }, DT);
    expect(p.holdingId).toBe(opp.id);
    expect(opp.heldUntil).toBeGreaterThan(h.time);
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
    expect(m.players.length + m.sentOff.length).toBe(pitch.format * 2); // Platzverweise zählen mit
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

describe('professions fit the age', () => {
  it('no teenage early retirees or 12th-semester students', async () => {
    const { createPlayerPool } = await import('../src/sim/generator.js');
    const pool = createPlayerPool({ seed: 1921, size: 25000 });
    for (const p of pool.everyone()) {
      if (p.profession === 'Frührentner') expect(p.age).toBeGreaterThanOrEqual(38);
      if (p.profession === 'Student (12. Semester)') expect(p.age).toBeGreaterThanOrEqual(23);
      if (p.age <= 18) expect(/Schüler|Azubi|FSJ/.test(p.profession)).toBe(true);
    }
  });
});

describe('keeper safe zone and ball control', () => {
  const near = (m, gk) => Math.min(...m.players.filter((o) => o.team !== gk.team).map((o) => Math.hypot(o.pos.x - gk.pos.x, o.pos.z - gk.pos.z)));

  it('goal kick: every opponent starts outside the keeper zone', () => {
    const pitch = PITCHES.rasenplatz;
    const m = createMatch({ seed: 4, pitch, kickoff: false, human: false });
    const gk = m.players.find((p) => p.team === 1 && p.role === 'gk');
    m.players.filter((p) => p.team === 0).forEach((p, i) => Object.assign(p.pos, { x: pitch.halfLength - 4, z: -2 + i }));
    m.lastTouchTeam = 0;
    m.ball.lastTouch = '0-4';
    Object.assign(m.ball.pos, { x: pitch.halfLength - 0.05, z: pitch.goalHalfWidth + 2 });
    Object.assign(m.ball.vel, { x: 6, y: 0, z: 0 });
    for (let i = 0; i < 10 && m.phase === 'play'; i++) stepMatch(m, undefined, DT);
    expect(m.setPiece).toMatchObject({ type: 'goalkick', team: 1 });
    expect(near(m, gk)).toBeGreaterThanOrEqual(keeperZone(pitch) - 0.01);
  });

  it('after a catch nobody camps in front of the keeper, and he waits for space', () => {
    const m = createMatch({ seed: 4, pitch: PARKING_LOT, kickoff: false, human: false });
    const gk = m.players.find((p) => p.team === 1 && p.role === 'gk');
    // Alle Gegner drängen sich direkt vor dem Keeper, der den Ball gerade gefangen hat.
    m.players.filter((p) => p.team === 0).forEach((p, i) => Object.assign(p.pos, { x: gk.pos.x - 1.2, z: -1 + i * 0.5 }));
    Object.assign(m.ball, { holder: gk.id, lastTouch: gk.id });
    m.lastTouchTeam = 1;
    let released = null;
    for (let i = 0; i < 60 * 3.5 && released === null; i++) {
      stepMatch(m, undefined, DT);
      if (m.ball.holder !== gk.id) released = near(m, gk);
      m.events.length = 0;
    }
    expect(released).toBeGreaterThan(keeperZone(PARKING_LOT) * 0.5);
  });

  it('the ball sticks to the foot of a dribbling player, even through a turn', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, kickoff: false });
    const me = getPlayer(m, m.controlledId);
    for (const p of m.players) if (p !== me) Object.assign(p.pos, { x: -24, z: 12 });
    Object.assign(me.pos, { x: -15, z: 0 });
    Object.assign(m.ball.pos, { x: -14.5, z: 0 });
    m.ball.lastTouch = me.id;
    let maxGap = 0;
    for (let i = 0; i < 240; i++) {
      const move = i < 120 ? { x: 1, z: 0 } : { x: 0.3, z: 1 };
      stepMatch(m, { move, sprint: i > 60, shootHeld: false, pass: false, loft: false, hold: false, tackle: false, poke: false, switchPlayer: false, sub: false }, DT);
      if (i > 30) maxGap = Math.max(maxGap, Math.hypot(m.ball.pos.x - me.pos.x, m.ball.pos.z - me.pos.z));
      m.events.length = 0;
    }
    expect(m.ball.lastTouch).toBe(me.id);
    expect(maxGap).toBeLessThan(1.1);
  });
});

describe('live ticker', () => {
  it('comments every goal and does not change the result', async () => {
    const { createCommentator } = await import('../src/sim/commentary.js');
    const plain = createMatch({ seed: 9, pitch: PITCHES.park, human: false, incidents: true });
    while (plain.phase !== 'ended') {
      stepMatch(plain, undefined, DT);
      plain.events.length = 0;
    }
    const m = createMatch({ seed: 9, pitch: PITCHES.park, human: false, incidents: true });
    const c = createCommentator(m, 3);
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, DT);
      c.feed(m.events);
      m.events.length = 0;
    }
    expect(m.score).toEqual(plain.score);
    expect(c.lines.filter((l) => l.kind === 'goal').length).toBe(m.score[0] + m.score[1]);
    expect(c.lines[0].kind).toBe('whistle');
    expect(c.lines.at(-1).text).toMatch(/Abpfiff/);
    expect(c.lines.every((l) => l.minute >= 1 && l.minute <= 90 && l.text.length > 5)).toBe(true);
  });
});

describe('feel: parries, corners, set pieces', () => {
  const NONE = { move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, loft: false, hold: false, tackle: false, poke: false, switchPlayer: false, sub: false };

  it('a parry goes out low and wide, not up over the keeper', () => {
    let parries = 0;
    let maxY = 0;
    for (const seed of [1, 2, 3]) {
      const m = createMatch({ seed, pitch: PARKING_LOT, human: false });
      let watch = 0;
      for (let i = 0; i < 60 * 600 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        if (m.events.some((e) => e.type === 'save')) {
          parries++;
          watch = 30;
        }
        if (watch-- > 0 && !m.ball.holder) maxY = Math.max(maxY, m.ball.pos.y);
        m.events.length = 0;
      }
    }
    expect(parries).toBeGreaterThan(5);
    expect(maxY).toBeLessThan(1.9);
  });

  it('nobody gets stuck in the corners of a walled pitch', () => {
    const pitch = PITCHES.hinterhof;
    const inCorner = (p) => Math.abs(p.x) > pitch.halfLength - 2.5 && Math.abs(p.z) > pitch.halfWidth - 2.5;
    let longest = 0;
    for (const seed of [1, 2, 3]) {
      const m = createMatch({ seed, pitch, human: false });
      let run = 0;
      for (let i = 0; i < 60 * 600 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
        run = m.phase === 'play' && inCorner(m.ball.pos) ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
    }
    expect(longest / 60).toBeLessThan(8);
  });

  it('pressing pass during the set-piece pause is not swallowed', () => {
    const m = createMatch({ seed: 5, pitch: PARKING_LOT });
    expect(m.phase).toBe('setpiece');
    const taker = getPlayer(m, m.setPiece.takerId);
    expect(taker.id).toBe(m.controlledId);
    let passed = false;
    for (let i = 0; i < 60 && !passed; i++) {
      stepMatch(m, i === 1 ? { ...NONE, pass: true } : NONE, DT);
      passed = m.events.some((e) => e.type === 'pass' && e.playerId === taker.id);
      m.events.length = 0;
    }
    expect(passed).toBe(true);
  });
});

describe('passing and shooting', () => {
  it('the receiver runs to meet the pass', () => {
    let reached = 0;
    let passes = 0;
    for (const seed of [1, 2, 3]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false });
      let open = null;
      for (let i = 0; i < 60 * 300 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        for (const e of m.events) {
          const p = e.playerId && getPlayer(m, e.playerId);
          if (e.type === 'pass' && p && p.role !== 'gk' && e.targetId) {
            open = { target: e.targetId, t: m.time };
            passes++;
          } else if (open && e.type === 'touch' && m.time - open.t > 0.1) {
            if (e.playerId === open.target) reached++;
            open = null;
          }
        }
        m.events.length = 0;
      }
    }
    expect(passes).toBeGreaterThan(50);
    expect(reached / passes).toBeGreaterThan(0.4);
  });

  it('the keeper needs a moment to react to a shot', () => {
    const m = createMatch({ seed: 2, pitch: PARKING_LOT, human: false, kickoff: false });
    const gk = m.players.find((p) => p.team === 1 && p.role === 'gk');
    for (const p of m.players) if (p !== gk) Object.assign(p.pos, { x: -15, z: 8 });
    const z0 = gk.pos.z;
    Object.assign(m.ball.pos, { x: 8, y: 0.3, z: 0 });
    Object.assign(m.ball.vel, { x: 18, y: 0.5, z: 1.4 });
    m.ball.lastAction = 'shoot';
    m.shotTime = m.time;
    stepMatch(m, undefined, DT);
    stepMatch(m, undefined, DT);
    expect(Math.abs(gk.pos.z - z0)).toBeLessThan(0.15);
  });
});

describe('defending', () => {
  it('the defence stays behind the ball while the own team attacks', () => {
    let samples = 0;
    let behind = 0;
    for (const seed of [1, 2]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false });
      for (let i = 0; i < 60 * 300 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
        const team = m.lastTouchTeam;
        if (m.phase !== 'play' || team === null || i % 20) continue;
        const s = team === 0 ? (m.sidesSwapped ? -1 : 1) : m.sidesSwapped ? 1 : -1;
        for (const p of m.players) {
          if (p.team !== team || p.role !== 'def' || !m.tactics[p.id] || m.tactics[p.id].type !== 'support') continue;
          samples++;
          if ((m.ball.pos.x - p.pos.x) * s > 0) behind++;
        }
      }
    }
    expect(samples).toBeGreaterThan(50);
    expect(behind / samples).toBeGreaterThan(0.65); // vorher 0,56 – beim Zurücklaufen hinken sie etwas hinterher
  });
});

describe('difficulty and auto-switch', () => {
  it('difficulty only changes the opponent of the human', async () => {
    const { aiSkill } = await import('../src/sim/ai.js');
    const m = createMatch({ seed: 1, pitch: PARKING_LOT });
    const mine = m.players.find((p) => p.team === 0);
    const theirs = m.players.find((p) => p.team === 1);
    m.difficulty = 'hard';
    expect(aiSkill(m, theirs)).toBeGreaterThan(1);
    expect(aiSkill(m, mine)).toBe(1);
    m.difficulty = 'easy';
    expect(aiSkill(m, theirs)).toBeLessThan(1);
    const sim = createMatch({ seed: 1, pitch: PARKING_LOT, human: false });
    sim.difficulty = 'hard';
    expect(aiSkill(sim, sim.players[5])).toBe(1); // Simulationen bleiben neutral
  });

  it('auto-switch hands control to the team-mate near the ball when defending', () => {
    const m = createMatch({ seed: 3, pitch: PARKING_LOT, kickoff: false });
    m.autoSwitchDefense = true;
    const me = getPlayer(m, m.controlledId);
    const mate = m.players.find((p) => p.team === 0 && p.role !== 'gk' && p !== me);
    const opp = m.players.find((p) => p.team === 1 && p.role !== 'gk');
    Object.assign(me.pos, { x: 14, z: 8 });
    Object.assign(opp.pos, { x: -6, z: 0 });
    Object.assign(mate.pos, { x: -7.5, z: 0.5 });
    Object.assign(m.ball.pos, { x: -6.4, z: 0 });
    m.ball.lastTouch = opp.id;
    m.lastTouchTeam = 1;
    stepMatch(m, undefined, DT);
    expect(m.controlledId).not.toBe(me.id);
  });
});

describe('penalty shootout', () => {
  const NONE = { move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, loft: false, hold: false, tackle: false, poke: false, switchPlayer: false, sub: false };
  it('a drawn knockout match the human plays ends in a decided shootout', async () => {
    const { shootoutScore } = await import('../src/sim/shootout.js');
    for (const seed of [1, 2, 3]) {
      const m = createMatch({ seed, pitch: PITCHES.halle, duration: 3 });
      m.knockout = true;
      let steps = 0;
      while (m.phase !== 'ended' && steps++ < 60 * 300) {
        if (m.phase !== 'shootout') m.score[1] = m.score[0];
        const so = m.shootout;
        const aiming = so?.state === 'aim' && so.team === m.humanTeam;
        stepMatch(m, aiming ? { ...NONE, shootHeld: so.timer < 0.6, move: { x: 0, z: so.timer < 0.3 ? 1 : 0 } } : NONE, DT);
        m.events.length = 0;
      }
      expect(m.phase).toBe('ended');
      expect(m.shootout.done).toBe(true);
      const [a, b] = shootoutScore(m.shootout);
      expect(a).not.toBe(b);
      expect(m.shootout.kicks[0].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('simulated matches never go to an interactive shootout', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.halle, human: false, duration: 3 });
    m.knockout = true;
    for (let i = 0; i < 60 * 10 && m.phase !== 'ended'; i++) {
      m.score = [0, 0];
      stepMatch(m, undefined, DT);
      m.events.length = 0;
    }
    expect(m.shootout).toBeUndefined();
    expect(m.phase).toBe('ended');
  });
});
