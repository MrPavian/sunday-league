import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setOrder } from '../src/sim/plan.js';
import { benchAdvice, outAdvice } from '../src/sim/subadvice.js';
import { createCareer, humanClub, prepareMatch, currentFixtures, setClubPlan } from '../src/career/career.js';

const fresh = () => {
  const m = createMatch({ seed: 4, pitch: PITCHES.rasenplatz, human: false });
  for (const b of m.bench[0]) Object.assign(b, { late: false, rating: 60, stamina: 1, _profiles: [], attrs: { ...b.attrs, pace: 0.5, shooting: 0.5, tackling: 0.5, stamina: 0.5, passing: 0.5, technique: 0.5 } });
  return m;
};

describe('substitution advice', () => {
  it('against a high line with balls in behind, the quick one fits better than the equally good slow one', () => {
    const m = fresh();
    const [a, b] = m.bench[0].filter((p) => p.position !== 'def' && p.position !== 'gk').concat(m.bench[0]).slice(0, 2);
    a.attrs.pace = 0.9;
    b.attrs.pace = 0.3;
    setOrder(m, 0, 'route', 'tiefe');
    const ranked = benchAdvice(m, 0).map((x) => x.player);
    expect(ranked.indexOf(a)).toBeLessThan(ranked.indexOf(b));
    expect(benchAdvice(m, 0).find((x) => x.player === a).reasons.join(' ')).toMatch(/schnell|quick/);
  });

  it('a goal down late on, the finisher comes first', () => {
    const m = fresh();
    const [a, b] = m.bench[0].filter((p) => p.position !== 'gk');
    a.position = b.position = 'mid';
    a.attrs.shooting = 0.85;
    b.attrs.shooting = 0.3;
    m.time = m.duration * 0.8;
    m.score = [0, 1];
    const ranked = benchAdvice(m, 0).map((x) => x.player);
    expect(ranked.indexOf(a)).toBeLessThan(ranked.indexOf(b));
  });

  it('suggests taking off the exhausted or the knocked one – rarely the keeper', () => {
    const m = fresh();
    const ours = m.players.filter((p) => p.team === 0);
    ours.forEach((p) => (p.stamina = 0.8));
    const tired = ours.find((p) => p.role === 'mid');
    tired.stamina = 0.2;
    const gk = ours.find((p) => p.role === 'gk');
    gk.stamina = 0.1;
    const advice = outAdvice(m, 0);
    expect(advice[0].player).toBe(tired);
    expect(advice.at(-1).player).toBe(gk);
    expect(advice[0].reasons.join(' ')).toMatch(/platt|exhausted/);
  });
});

describe('game plan before the match', () => {
  it('the plan from the clubhouse is what the team kicks off with', () => {
    const c = createCareer({ seed: 77 });
    setClubPlan(c, 'press', 'hoch');
    setClubPlan(c, 'side', 'left');
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    const { match } = prepareMatch(c, f, { human: true });
    const t = match.teams.findIndex((x) => x.name === humanClub(c).name);
    expect(match.orders[t]).toEqual({ press: 'hoch', side: 'left' });
    expect(match.decisions.every((d) => d.by === 'plan' && d.t === 0)).toBe(true);
    setClubPlan(c, 'side', null);
    expect(humanClub(c).tactic.orders).toEqual({ press: 'hoch' });
  });
});
