import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, migrateCareer, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { TIP_IDS } from '../src/career/tips.js';

describe('beginner tips', () => {
  it('explain each system once, at most one per week, starting with a welcome', () => {
    const c = createCareer({ seed: 5150 });
    expect(c.week.chat[0].tip).toBe('welcome');
    const shown = [];
    while (!seasonOver(c)) {
      const tips = c.week.chat.filter((m) => m.tip);
      expect(tips.length).toBeLessThanOrEqual(1);
      shown.push(...tips.map((m) => m.tip));
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 240 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    nextSeason(c);
    shown.push(...c.week.chat.filter((m) => m.tip).map((m) => m.tip));
    expect(new Set(shown).size).toBe(shown.length);
    expect(shown.length).toBeGreaterThanOrEqual(5);
  }, 60000);

  it('can be switched off and are skipped for careers already under way', () => {
    const c = createCareer({ seed: 5151 });
    c.tipsOff = true;
    finishRound(c);
    expect(c.week.chat.some((m) => m.tip)).toBe(false);
    const old = createCareer({ seed: 5152 });
    delete old.tipsSeen;
    old.season = 3;
    migrateCareer(old);
    expect(Object.keys(old.tipsSeen)).toEqual(TIP_IDS);
  });
});
