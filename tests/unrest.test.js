import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { weeklyMood } from '../src/career/events.js';
import { CONTAGION, grumblers, pressure, UNREST_EVENTS, UNREST_MIN, unrestStage, weeklyUnrest } from '../src/career/unrest.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };
const last = { ...yes, next: () => 0.999 };

function grumpyTeam(n, seed = 5) {
  const c = createCareer({ seed });
  const club = humanClub(c);
  const out = club.squad.filter((i) => i !== c.coach?.idx);
  out.forEach((i, k) => (c.players[i].grumpy = k < n ? 3 : 0));
  c.mood = -0.2;
  c.round = 3;
  return c;
}
const step = (c) => (c.round += 1);

describe('Unruhe im Team', () => {
  it('ab zwei Grummlern (mieser Stimmung zählt mit) bilden sich Grüppchen; bei guter Stimmung oder einem Grummler nicht', () => {
    const one = grumpyTeam(1);
    one.mood = -0.1;
    expect(pressure(one)).toBe(1);
    expect(UNREST_EVENTS.grueppchen.needs(one, yes)).toBeNull();
    expect(pressure(grumpyTeam(1))).toBe(2); // Stimmung −0,2 zählt einen Punkt
    const happy = grumpyTeam(4);
    happy.mood = 0.5;
    expect(UNREST_EVENTS.grueppchen.needs(happy, yes)).toBeNull();
    expect(UNREST_EVENTS.grueppchen.needs(grumpyTeam(UNREST_MIN[0]), yes)).toEqual({});
  });

  it('wer den Mannschaftsrat abblockt, vergiftet das Klima: die Stimmung sinkt jede Woche, bis sich alle beruhigt haben', () => {
    const c = grumpyTeam(5);
    UNREST_EVENTS.grueppchen.options[2].effect(c, {}, yes);
    step(c);
    UNREST_EVENTS.mannschaftsrat.options[2].effect(c, {}, yes);
    expect(unrestStage(c)).toBe(2);
    expect(Object.keys(UNREST_EVENTS)).toEqual(['grueppchen', 'mannschaftsrat']); // kein Mannschaftsstreik (Nutzerklarstellung)
    const before = c.mood;
    weeklyMood(c);
    expect(c.mood).toBeLessThan(before * 0.88 + 0.06); // abgeklungen und dazu −0,02
  });

  it('Zugeständnisse beim Mannschaftsrat beruhigen alle', () => {
    const c = grumpyTeam(5);
    UNREST_EVENTS.grueppchen.options[2].effect(c, {}, yes);
    step(c);
    UNREST_EVENTS.mannschaftsrat.options[0].effect(c, {}, yes);
    expect(unrestStage(c)).toBe(0);
    expect(grumblers(c)).toEqual([]);
  });

  it('flaut ab, wenn kaum noch jemand sauer ist', () => {
    const c = grumpyTeam(4);
    UNREST_EVENTS.grueppchen.options[0].effect(c, {}, last); // Ausgang „Grüppchen bleiben“
    expect(unrestStage(c)).toBe(1);
    for (const i of humanClub(c).squad) if (c.players[i]) c.players[i].grumpy = 0;
    weeklyMood(c);
    expect(unrestStage(c)).toBe(0);
  });

  it('Ansteckung: wer richtig sauer ist, zieht bei mieser Stimmung manchmal andere mit, bei guter nie', () => {
    expect(CONTAGION).toBe(0.25);
    let spread = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const c = grumpyTeam(1, seed);
      weeklyUnrest(c);
      if (grumblers(c).length > 1) spread++;
    }
    expect(spread).toBeGreaterThan(3);
    expect(spread).toBeLessThan(20);
    const good = grumpyTeam(1);
    good.mood = 0.3;
    weeklyUnrest(good);
    expect(grumblers(good).length).toBe(1);
  });
});
