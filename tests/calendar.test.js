import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { dateLabel, matchDate } from '../src/career/calendar.js';
import { monthOf } from '../src/career/weather.js';
import { yearOf } from '../src/career/sagas.js';

// Kalender: jedes Datum aus vorhandenen Spieldaten abgeleitet (Saisonjahr + Monat des Spieltags).
describe('Vereinskalender', () => {
  for (const leagueSize of [6, 8]) {
    it(`Liga mit ${leagueSize} Teams: Sonntage, aufsteigend, nie doppelt, Monat wie beim Wetter`, () => {
      const c = createCareer({ seed: 3, leagueSize });
      const dates = c.fixtures.map((_, r) => matchDate(c, r));
      const stamps = dates.map((d) => Date.UTC(d.year, d.month - 1, d.day));
      dates.forEach((d, r) => {
        expect(new Date(stamps[r]).getUTCDay()).toBe(0); // Sonntag
        expect(d.month).toBe(monthOf(c, r));
        expect(d.year).toBe(yearOf(c) + (d.month <= 7 ? 1 : 0));
      });
      for (let r = 1; r < stamps.length; r++) expect(stamps[r]).toBeGreaterThan(stamps[r - 1]);
      expect(new Set(stamps).size).toBe(stamps.length);
    });
  }

  it('Saison 1 beginnt im August 2026 und endet im Mai 2027', () => {
    const c = createCareer({ seed: 3 });
    const first = matchDate(c, 0);
    const last = matchDate(c, c.fixtures.length - 1);
    expect([first.year, first.month]).toEqual([2026, 8]);
    expect([last.year, last.month]).toEqual([2027, 5]);
    expect(dateLabel(first)).toMatch(/^So\., \d+\. Aug\.$/);
  });
});
