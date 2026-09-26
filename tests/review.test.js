import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { seasonReview } from '../src/career/review.js';

describe('season special', () => {
  it('sums up the season and lands in the archive at the season change', () => {
    const c = createCareer({ seed: 8080 });
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 240 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    const r = seasonReview(c);
    expect(r.headline.length).toBeGreaterThan(5);
    expect(r.pos).toBeGreaterThanOrEqual(1);
    const labels = r.items.map((i) => i.label);
    expect(labels).toContain('Torjäger');
    expect(labels.some((l) => l === 'Höchster Sieg' || l === 'Bitterste Pleite')).toBe(true);
    nextSeason(c);
    expect(c.reviews).toHaveLength(1);
    expect(c.reviews[0]).toMatchObject({ season: 1, headline: r.headline, pos: r.pos });
  }, 60000);
});
