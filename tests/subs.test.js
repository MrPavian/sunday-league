import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { FREE_SUBS, LIMITED_SUBS, planSub, processSubs, subRuleFor, subsLeft, usableBench } from '../src/sim/squad.js';

const fresh = (seed = 1) => createMatch({ seed, pitch: PITCHES.rasenplatz, human: true });

describe('substitution rules', () => {
  it('by league: rolling in the recreational league and friendlies, limited from the district league up', () => {
    expect(subRuleFor('liga', 1)).toBe(FREE_SUBS);
    expect(subRuleFor('liga')).toBe(FREE_SUBS);
    expect(subRuleFor('liga', 2)).toBe(LIMITED_SUBS);
    expect(subRuleFor('frei', 3)).toBe(FREE_SUBS);
    expect(subRuleFor('begrenzt', 1)).toBe(LIMITED_SUBS);
  });

  it('a planned sub swaps exactly those two at the next stoppage', () => {
    const m = fresh();
    const out = m.players.find((p) => p.team === 0 && p.role === 'mid');
    const inn = usableBench(m, 0).at(-1);
    expect(planSub(m, 0, out.id, inn.id)).toBe(true);
    processSubs(m);
    expect(m.players).toContain(inn);
    expect(m.bench[0]).toContain(out);
    expect(inn.role).toBe('mid');
  });

  it('rolling subs let a player come back on', () => {
    const m = fresh(2);
    const out = m.players.find((p) => p.team === 0 && p.role === 'fwd');
    const inn = usableBench(m, 0)[0];
    planSub(m, 0, out.id, inn.id);
    processSubs(m);
    expect(usableBench(m, 0)).toContain(out);
    expect(planSub(m, 0, inn.id, out.id)).toBe(true);
  });

  it('limited subs: once off stays off, and after four it is over', () => {
    const m = fresh(3);
    m.subRule = LIMITED_SUBS;
    while (m.bench[0].length < 6) m.bench[0].push({ ...m.bench[0][0], id: `0-extra${m.bench[0].length}` });
    m.bench[0].forEach((b) => (b.late = false));
    const first = m.players.find((p) => p.team === 0 && p.role !== 'gk');
    planSub(m, 0, first.id, usableBench(m, 0)[0].id);
    processSubs(m);
    expect(first.usedUp).toBe(true);
    expect(usableBench(m, 0)).not.toContain(first);
    while (subsLeft(m, 0) > 0 && usableBench(m, 0).length) {
      const out = m.players.find((p) => p.team === 0 && p.role !== 'gk');
      planSub(m, 0, out.id, usableBench(m, 0)[0].id);
      processSubs(m);
    }
    expect(m.subsUsed[0]).toBe(4);
    expect(subsLeft(m, 0)).toBe(0);
    const out = m.players.find((p) => p.team === 0 && p.role !== 'gk');
    expect(usableBench(m, 0).length).toBeGreaterThan(0);
    expect(planSub(m, 0, out.id, usableBench(m, 0)[0].id)).toBe(false);
  });
});
