import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setOrder } from '../src/sim/plan.js';
import { createLog } from '../src/sim/matchlog.js';
import { postMatch } from '../src/sim/report.js';
import { decisiveMoment, evaluateDecision, ordersAt, traceGoals } from '../src/sim/trace.js';

const play = (seed, orders = [], pitch = PITCHES.ascheplatz) => {
  const m = createMatch({ seed, pitch, human: false, aiCoach: false });
  for (const o of orders) setOrder(m, 0, ...o.split(':'));
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  return m;
};

describe('causal trace', () => {
  it('every goal gets a readable chain that ends with the goal', () => {
    let goals = 0;
    for (const seed of [1, 2, 3]) {
      const m = play(seed);
      const traces = traceGoals(m);
      expect(traces).toHaveLength(m.stats.goals.length);
      for (const t of traces) {
        expect(t.steps.length).toBeGreaterThanOrEqual(2);
        expect(t.steps.at(-1)).toMatch(/Tor|Goal/);
      }
      goals += traces.length;
    }
    expect(goals).toBeGreaterThan(0);
  }, 90_000);

  it('links goals to the coach decision that shaped them', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.ascheplatz, human: false });
    m.log = createLog();
    const scorer = m.players.find((p) => p.team === 0 && p.role === 'fwd');
    m.decisions = [{ t: 30, half: 1, team: 0, group: 'side', value: 'left', before: null, by: 'card' }];
    m.log.poss.push({ team: 0, start: 50, end: 56, how: 'tackle', startThird: 'mid', startLane: 'left', passes: 2, maxAdv: 0.9, entryLane: 'left', box: true, shots: 1, goal: true, half: 1 });
    m.log.passes.push({ t: 53, team: 0, kicker: m.players.find((p) => p.team === 0 && p.role === 'mid').id, targetId: scorer.id, through: true, done: true, third: 'mid', lane: 'left' });
    const [t] = traceGoals({ ...m, stats: { goals: [{ team: 0, time: 55, scorerId: scorer.id, assistId: null, via: 'shoot' }] } });
    expect(t.causes.map((c) => `${c.group}:${c.value}`)).toContain('side:left');
    expect(t.steps.join(' ')).toMatch(/links/);
    expect(t.steps.join(' ')).toMatch(/Tiefe/);
    expect(t.through).toBe(true);
  });

  it('knows which orders applied when', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.parkplatz, human: false });
    m.time = 10;
    setOrder(m, 0, 'press', 'hoch');
    m.time = 50;
    setOrder(m, 0, 'press', 'tief');
    m.time = 70;
    setOrder(m, 0, 'press', null);
    expect(ordersAt(m, 0, 5)).toEqual({});
    expect(ordersAt(m, 0, 20).press.value).toBe('hoch');
    expect(ordersAt(m, 0, 60).press.value).toBe('tief');
    expect(ordersAt(m, 0, 80).press).toBeUndefined();
  });

  it('a decision after which the danger against us drops is rated positive – and becomes the decisive moment', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.ascheplatz, human: false });
    m.log = createLog();
    m.time = 240;
    const P = (team, start, box) => ({ team, start, box, shots: box ? 1 : 0, goal: false, half: 1 });
    for (let t = 60; t < 120; t += 8) m.log.poss.push(P(1, t, true)); // vorher: Gegner ständig gefährlich
    for (let t = 120; t < 180; t += 8) m.log.poss.push(P(1, t, false)); // nachher: kaum noch
    m.decisions = [{ t: 120, half: 1, team: 0, group: 'press', value: 'tief', before: null, by: 'card' }];
    const r = evaluateDecision(m, m.decisions[0]);
    expect(r.swing).toBeGreaterThan(0);
    const d = decisiveMoment(m, 0);
    expect(d.positive).toBe(true);
    expect(d.text).toMatch(/seltener|less often/);
    m.decisions = [];
    expect(decisiveMoment(m, 0)).toBe(null);
  });

  it('the post-match review is sentences, not a rating', () => {
    const m = play(11);
    const pm = postMatch(m, 0, traceGoals(m));
    for (const s of [...pm.good, ...pm.bad, ...pm.lessons]) {
      expect(typeof s).toBe('string');
      expect(s).not.toMatch(/\d+\/10/);
    }
    expect(pm.good.length + pm.bad.length).toBeGreaterThan(0);
  }, 60_000);
});
