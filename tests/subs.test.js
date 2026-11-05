import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { AMATEUR_SUBS, FREE_SUBS, LIMITED_SUBS, planSub, planSubs, PRO_SUBS, processSubs, subRuleFor, subsLeft, usableBench, windowsLeft } from '../src/sim/squad.js';

const fresh = (seed = 1) => createMatch({ seed, pitch: PITCHES.rasenplatz, human: true });

describe('substitution rules', () => {
  // Recherche 2026-11-05: Herren-Amateure fünf Wechsel (SFV, wfv), Profiligen fünf Wechsel in drei Gelegenheiten plus Halbzeit.
  it('by league: rolling in the recreational league and friendlies, five from the district league up, three windows in the pro leagues', () => {
    expect(subRuleFor('liga', 1)).toBe(FREE_SUBS);
    expect(subRuleFor('liga')).toBe(FREE_SUBS);
    expect(subRuleFor('liga', 2)).toBe(AMATEUR_SUBS);
    expect(subRuleFor('liga', 8)).toBe(AMATEUR_SUBS);
    expect(AMATEUR_SUBS.limit).toBe(5);
    expect(subRuleFor('liga', 9)).toBe(PRO_SUBS);
    expect(PRO_SUBS).toMatchObject({ limit: 5, windows: 3 });
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

  // Kein Rückwechsel, auch nicht in der Freizeitliga (vom Nutzer festgelegt, 2026-10-23).
  it('unlimited subs in the recreational league, but once off stays off', () => {
    const m = fresh(2);
    expect(m.subRule.limit).toBe(Infinity);
    const out = m.players.find((p) => p.team === 0 && p.role === 'fwd');
    const inn = usableBench(m, 0)[0];
    planSub(m, 0, out.id, inn.id);
    processSubs(m);
    expect(out.usedUp).toBe(true);
    expect(usableBench(m, 0)).not.toContain(out);
    expect(planSub(m, 0, inn.id, out.id)).toBe(false);
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

  it('several subs at once: all at the next stoppage, counting as one window', () => {
    const m = fresh(4);
    m.subRule = PRO_SUBS;
    m.bench[0].forEach((b) => (b.late = false));
    const outs = m.players.filter((p) => p.team === 0 && p.role !== 'gk').slice(0, 3);
    const ins = usableBench(m, 0).slice(0, 3);
    expect(ins.length).toBe(3);
    expect(planSubs(m, 0, outs.map((o, i) => ({ outId: o.id, inId: ins[i].id })))).toBe(true);
    processSubs(m);
    for (const i of ins) expect(m.players).toContain(i);
    expect(m.subsUsed[0]).toBe(3);
    expect(windowsLeft(m, 0)).toBe(2);
  });

  it('pro leagues: after three windows no more subs – except at half-time', () => {
    const m = fresh(5);
    m.subRule = PRO_SUBS;
    while (m.bench[0].length < 7) m.bench[0].push({ ...m.bench[0][0], id: `0-extra${m.bench[0].length}` });
    m.bench[0].forEach((b) => (b.late = false));
    for (let k = 0; k < 3; k++) {
      const out = m.players.find((p) => p.team === 0 && p.role !== 'gk' && !p.usedUp);
      planSub(m, 0, out.id, usableBench(m, 0)[0].id);
      processSubs(m);
    }
    expect(windowsLeft(m, 0)).toBe(0);
    const out = m.players.find((p) => p.team === 0 && p.role !== 'gk');
    planSub(m, 0, out.id, usableBench(m, 0)[0].id);
    processSubs(m);
    expect(m.subsUsed[0]).toBe(3); // keine Gelegenheit mehr
    m.phase = 'halftime';
    planSub(m, 0, out.id, usableBench(m, 0)[0].id);
    processSubs(m);
    expect(m.subsUsed[0]).toBe(4); // Halbzeit zählt nicht
  });
});
