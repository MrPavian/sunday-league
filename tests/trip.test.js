import { describe, expect, it } from 'vitest';
import { createCareer, nextSeason } from '../src/career/career.js';
import { bookTrip, DESTINATIONS, tripChoose, tripStage, tripState } from '../src/career/trip.js';

describe('season trip', () => {
  it('three stages with decisions, then a verdict in the chronicle', () => {
    for (const dest of Object.keys(DESTINATIONS)) {
      const c = createCareer({ seed: 40 + dest.length });
      c.cash = 1000;
      expect(bookTrip(c, dest)).toBe(true);
      expect(c.cash).toBe(1000 - DESTINATIONS[dest].cost);
      c.round = c.fixtures.length;
      for (let i = 0; i < 3; i++) {
        expect(tripStage(c).n).toBe(i + 1);
        expect(typeof tripChoose(c, 0)).toBe('string');
      }
      expect(tripStage(c)).toBe(null);
      expect(tripState(c).verdict).toBeTruthy();
      expect(c.saga.chronicle.at(-1).text).toContain(DESTINATIONS[dest].name);
      nextSeason(c);
      expect(c.tripBooked).toBe(false);
    }
  });

  it('outcomes vary between careers', () => {
    const texts = new Set();
    for (let seed = 1; seed < 25; seed++) {
      const c = createCareer({ seed });
      c.cash = 1000;
      bookTrip(c, 'mallorca');
      texts.add(tripChoose(c, 0));
    }
    expect(texts.size).toBeGreaterThanOrEqual(3);
  });
});
