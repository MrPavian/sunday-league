import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { makeOffers, slotsFor, SPONSORS, sponsorsFor } from '../src/career/sponsors.js';

describe('mehr Sponsoren', () => {
  it('72 Sponsoren, jede ID einmal, jeder mit Name, Spruch, Eigenart und Chef', () => {
    expect(SPONSORS.length).toBe(72);
    expect(new Set(SPONSORS.map((s) => s.id)).size).toBe(SPONSORS.length);
    expect(new Set(SPONSORS.map((s) => s.name)).size).toBe(SPONSORS.length);
    for (const s of SPONSORS) expect(s.name && s.line && s.trait && s.boss).toBeTruthy();
  });

  it('große Firmen aus der Region fragen erst in höheren Ligen an', () => {
    const big = new Set(SPONSORS.filter((s) => s.from).map((s) => s.id));
    expect(big.size).toBe(20);
    expect(sponsorsFor(1).some((s) => big.has(s.id))).toBe(false);
    expect(sponsorsFor(5).length).toBe(66);
    expect(sponsorsFor(6).length).toBe(69);
    expect(sponsorsFor(7).length).toBe(72);
    expect(sponsorsFor(4).some((s) => (s.from ?? 1) >= 5)).toBe(false);
    for (let seed = 1; seed <= 30; seed++) {
      const c = createCareer({ seed });
      makeOffers(c, 1);
      expect(c.offers.some((o) => big.has(o.id))).toBe(false);
    }
  });

  it('mehr Werbeplätze weiter oben; ab Bezirksliga steht eine größere Firma auf der Brust', () => {
    expect(slotsFor(4)).toEqual(['trikot', 'aermel', 'bande', 'ball']);
    expect(slotsFor(5)).toContain('ruecken');
    expect(slotsFor(5)).not.toContain('hose');
    expect(slotsFor(7)).toContain('hose');
    for (let seed = 1; seed <= 20; seed++) {
      const c = createCareer({ seed });
      c.level = 6;
      makeOffers(c, 6);
      for (const slot of slotsFor(6)) expect(c.offers.some((o) => o.slot === slot), `${seed} ${slot}`).toBe(true);
      for (const o of c.offers.filter((x) => x.slot === 'trikot')) expect(o.from ?? 1, `${seed} ${o.id}`).toBeGreaterThanOrEqual(3);
    }
  });
});
