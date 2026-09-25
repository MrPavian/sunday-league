import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { DERBY_EVENTS, derbyRivalId, isDerbyFixture } from '../src/career/derby.js';

describe('derby', () => {
  it('every league has a real rival; derby week always brings its event and a heated match', () => {
    const c = createCareer({ seed: 101 });
    expect(derbyRivalId(c)).toBe('kanal');
    let guard = 0;
    while (!isDerbyFixture(c, humanFixture(c)) && guard++ < 12) finishRound(c);
    expect(isDerbyFixture(c, humanFixture(c))).toBe(true);
    expect(c.week.event?.id).toBe('derby_woche');
    const prepared = prepareMatch(c, humanFixture(c), { duration: 20 });
    expect(prepared.match.derby).toBe(true);
    simulateSync(prepared);
    recordResult(c, humanFixture(c), prepared);
    const d = c.derbyRecord;
    expect(d.w + d.d + d.l).toBe(1);
  });

  it('all derby options resolve with varying outcomes', () => {
    for (let choice = 0; choice < DERBY_EVENTS.derby_woche.options.length; choice++) {
      const texts = new Set();
      for (let r = 0; r < 12; r++) {
        const c = createCareer({ seed: 102 });
        c.round = r % 10;
        c.week.event = { id: 'derby_woche', ctx: {}, text: 'x', options: DERBY_EVENTS.derby_woche.options.map((o) => o.label), choice: null, result: null };
        texts.add(resolveEvent(c, choice));
      }
      expect(texts.size).toBeGreaterThanOrEqual(2);
    }
    expect(humanClub(createCareer({ seed: 1 })).id).toBeTruthy();
  });
});
