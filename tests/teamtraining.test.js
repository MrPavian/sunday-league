// Trainingsplan (src/career/teamtraining.js): Standard ändert nichts, mehr Tage mehr Entwicklung, Schwerpunkt verteilt um,
// Kosten je Woche über der Norm.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, currentFixtures, humanClub, nextSeason } from '../src/career/career.js';
import { focusWeight, FOCUS, normDays, plan, setPlan, trainingGrowth } from '../src/career/teamtraining.js';

const ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping', 'strength'];
const season = (setup) => {
  const c = createCareer({ seed: 21 });
  setup?.(c);
  c.round = c.fixtures.length;
  nextSeason(c);
  return c;
};
const sumDelta = (c, keys = ATTRS) => humanClub(c).squad.reduce((s, i) => s + keys.reduce((t, k) => t + (c.players[i]?.delta?.[k] ?? 0), 0), 0);

describe('Trainingsplan', () => {
  it('ohne eigenen Plan: Liga-Norm, ausgewogen, Faktor 1 – nichts ändert sich', () => {
    const c = createCareer({ seed: 21 });
    expect(plan(c)).toEqual({ days: normDays(c), focus: 'ausgewogen', keeper: false });
    expect(trainingGrowth(c)).toBe(1);
    for (const k of ATTRS) expect(focusWeight(c, k, 'mid')).toBe(1);
  });

  it('Schwerpunkt verteilt nur um: Mittel über alle Werte bleibt 1', () => {
    const c = createCareer({ seed: 21 });
    for (const id of Object.keys(FOCUS)) {
      setPlan(c, { focus: id });
      const mean = ATTRS.reduce((s, k) => s + focusWeight(c, k, 'mid'), 0) / ATTRS.length;
      expect(mean).toBeCloseTo(1, 10);
    }
    setPlan(c, { focus: 'kondition' });
    expect(focusWeight(c, 'stamina', 'mid')).toBeGreaterThan(focusWeight(c, 'passing', 'mid'));
  });

  it('mehr Tage: mehr Zuwachs in der Saison; Kondition: mehr Ausdauer als Passen', () => {
    const base = season();
    const more = season((c) => setPlan(c, { days: 4 }));
    expect(sumDelta(more)).toBeGreaterThan(sumDelta(base));
    const fit = season((c) => setPlan(c, { focus: 'kondition' }));
    expect(sumDelta(fit, ['stamina']) - sumDelta(base, ['stamina'])).toBeGreaterThan(sumDelta(fit, ['passing']) - sumDelta(base, ['passing']));
  });

  it('Tage über der Norm kosten jede Woche Familie und Kraft', () => {
    const run = (days) => {
      const c = createCareer({ seed: 21 });
      if (days) setPlan(c, { days });
      const before = { ...c.coach };
      for (const f of currentFixtures(c)) f.result = { home: 1, away: 1 };
      finishRound(c);
      return { patience: c.coach.patience - before.patience, energy: c.coach.energy - before.energy };
    };
    const norm = run(null);
    const hard = run(5);
    expect(hard.patience).toBeLessThan(norm.patience);
    expect(hard.energy).toBeLessThan(norm.energy);
  });
});
