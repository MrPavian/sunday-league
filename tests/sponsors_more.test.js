import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { makeOffers, SPONSORS, sponsorsFor } from '../src/career/sponsors.js';

describe('mehr Sponsoren', () => {
  it('60 Sponsoren, jede ID einmal, jeder mit Name, Spruch, Eigenart und Chef', () => {
    expect(SPONSORS.length).toBe(60);
    expect(new Set(SPONSORS.map((s) => s.id)).size).toBe(SPONSORS.length);
    expect(new Set(SPONSORS.map((s) => s.name)).size).toBe(SPONSORS.length);
    for (const s of SPONSORS) expect(s.name && s.line && s.trait && s.boss).toBeTruthy();
  });

  it('große Firmen aus der Region fragen erst in höheren Ligen an', () => {
    const big = new Set(SPONSORS.filter((s) => s.from).map((s) => s.id));
    expect(big.size).toBe(8);
    expect(sponsorsFor(1).some((s) => big.has(s.id))).toBe(false);
    expect(sponsorsFor(5).length).toBe(60);
    for (let seed = 1; seed <= 30; seed++) {
      const c = createCareer({ seed });
      makeOffers(c, 1);
      expect(c.offers.some((o) => big.has(o.id))).toBe(false);
    }
  });
});
