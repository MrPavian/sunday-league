// Gegner-Scouting vor dem Spiel (opponentscout.js, ROADMAP 11.17 Punkt 8).
import { describe, expect, it } from 'vitest';
import { clubById, createCareer, humanFixture, playerOf } from '../src/career/career.js';
import { formOf, reportLevel, scoutReport } from '../src/career/opponentscout.js';
import { watchClub } from '../src/career/scouting.js';

const setup = (seed = 3) => {
  const c = createCareer({ seed });
  c.week ??= {};
  c.week.actions = 3;
  const f = humanFixture(c);
  const opp = clubById(c, f.home === 'human' || clubById(c, f.home).human ? f.away : f.home);
  return { c, opp };
};

describe('Gegner-Scouting', () => {
  it('eigene Liga: grob bekannt – Stil und ein Name, Stärke als Spanne um die echte Zahl', () => {
    const { c, opp } = setup();
    const r = scoutReport(c, opp);
    expect(r.level).toBe(1);
    expect(r.style).toBeTruthy();
    expect(r.system).toBe(null);
    expect(r.strengths).toHaveLength(1);
    expect(r.weakness).toBe(null);
    expect(r.danger.name).toBeTruthy();
    expect(r.strength.exact).toBe(false);
    const top = [...opp.squad].map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11);
    const real = top.reduce((s, v) => s + v, 0) / top.length;
    expect(r.strength.lo).toBeLessThanOrEqual(real);
    expect(r.strength.hi).toBeGreaterThanOrEqual(real);
  });

  it('unbekannter Gegner: nur Form und Tabelle', () => {
    const c2 = createCareer({ seed: 3 });
    const outsider = { id: 'aussen', name: 'Fremde', squad: [] };
    expect(reportLevel(c2, outsider)).toBe(0);
    const empty = scoutReport(c2, outsider);
    expect([empty.style, empty.danger, empty.strengths.length]).toEqual([null, null, 0]);
  });

  it('Spiel anschauen und ein Tipp vom Wirt machen den Bericht genauer', () => {
    const { c, opp } = setup();
    expect(reportLevel(c, opp)).toBe(1);
    expect(watchClub(c, opp)).toBeTruthy();
    const after = scoutReport(c, opp);
    expect(after.level).toBeGreaterThanOrEqual(2);
    expect(after.system).toBeTruthy();
    expect(after.strengths).toHaveLength(2);
    expect(after.weakness).toBeTruthy();
    expect(after.strength.hi - after.strength.lo).toBeLessThan(2 * 7 + 1);
    c.week.pub = { intel: { club: opp.id, mods: {} } };
    expect(reportLevel(c, opp)).toBe(Math.min(3, after.level + 1));
  });

  it('Form: die letzten fünf aus Sicht des Vereins', () => {
    const { c, opp } = setup();
    c.fixtures = [[{ home: opp.id, away: 'x', result: { home: 2, away: 0 } }], [{ home: 'y', away: opp.id, result: { home: 1, away: 1 } }], [{ home: 'z', away: opp.id, result: { home: 3, away: 1 } }]];
    expect(formOf(c, opp.id)).toEqual(['w', 'd', 'l']);
  });
});
