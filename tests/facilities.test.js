import { describe, expect, it } from 'vitest';
import { createCareer, finishRound } from '../src/career/career.js';
import { absenceMul, build, canBuild, facilities, hasFacility, recruitBonus } from '../src/career/facilities.js';

describe('clubhouse upgrades', () => {
  it('builds over weeks, costs money and upkeep, then has an effect', () => {
    const c = createCareer({ seed: 21 });
    c.cash = 1000;
    expect(canBuild(c, 'tribuene')).toBe(false); // erst Grill & Theke
    expect(build(c, 'duschen')).toBeTruthy();
    expect(c.cash).toBe(820);
    expect(build(c, 'grill')).toBe(null); // eine Baustelle zur Zeit
    finishRound(c);
    finishRound(c);
    expect(hasFacility(c, 'duschen')).toBe(true);
    expect(recruitBonus(c)).toBe(0.03);
    expect(absenceMul(c)).toBeLessThan(1);
    expect(c.ledger.some((e) => e.text.startsWith('Nebenkosten'))).toBe(true);
  });

  it('a work party is cheaper but anything can happen', () => {
    const texts = new Set();
    for (let seed = 1; seed < 30; seed++) {
      const c = createCareer({ seed });
      c.cash = 500;
      texts.add(build(c, 'kabine', 'einsatz'));
      expect(c.cash).toBeLessThanOrEqual(500 - 175 + 40);
      expect(facilities(c).building.weeks).toBeGreaterThanOrEqual(1);
    }
    expect(texts.size).toBeGreaterThanOrEqual(4);
  });
});
