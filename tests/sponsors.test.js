import { describe, expect, it } from 'vitest';
import { createCareer, nextSeason } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { acceptSponsor, adjustRel, negotiate, paySponsors, relLabel, SPONSOR_EVENTS, sponsorResult } from '../src/career/sponsors.js';

describe('sponsors', () => {
  it('negotiating changes the deal or loses the offer, but only once', () => {
    const results = new Set();
    for (let seed = 1; seed < 40; seed++) {
      const c = createCareer({ seed });
      const before = { ...c.offers[0] };
      const n = c.offers.length;
      negotiate(c, 0);
      if (c.offers.length < n) results.add('weg');
      else if (c.offers[0].weekly > before.weekly) results.add('mehr');
      else if (c.offers[0].bonus > before.bonus) results.add('bonus');
      else results.add('gleich');
      if (c.offers.length === n) expect(negotiate(c, 0)).toBe(null);
    }
    expect(results.size).toBeGreaterThanOrEqual(3);
  });

  it('results move the relationship; an angry sponsor pays late and finally quits', () => {
    const c = createCareer({ seed: 3 });
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    sponsorResult(c, 3, 0);
    expect(s.rel).toBeGreaterThan(50);
    expect(relLabel(90)).toBe('begeistert');
    adjustRel(s, -100);
    paySponsors(c);
    expect(c.sponsors).toHaveLength(0);
    expect(c.week.chat.at(-1).text).toContain('kündigt');
  });

  it('happy sponsors renew with a raise next season', () => {
    const c = createCareer({ seed: 4 });
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.rel = 90;
    s.goal = { type: 'wins', n: 0, text: 'egal' };
    c.round = c.fixtures.length;
    nextSeason(c);
    const renewal = c.offers.find((o) => o.id === s.id);
    expect(renewal.renew).toBe(true);
    expect(renewal.weekly).toBeGreaterThanOrEqual(s.weekly);
    expect(acceptSponsor(c, c.offers.indexOf(renewal))).toBe(true);
    expect(c.sponsors[0].seasons).toBe(1);
  });

  it('every sponsor event resolves for every option', () => {
    for (const [id, ev] of Object.entries(SPONSOR_EVENTS)) {
      for (let o = 0; o < ev.options.length; o++) {
        for (let seed = 1; seed < 6; seed++) {
          const c = createCareer({ seed: seed * 11 + o });
          acceptSponsor(c, 0);
          c.sponsors[0].trait = 'ehrgeizig';
          c.round = 4;
          const ctx = ev.needs(c, { pick: (a) => a[0], int: (a) => a, chance: () => true, next: () => 0.5 });
          expect(ctx, id).toBeTruthy();
          c.week.event = { id, ctx, text: ev.text(c, ctx), options: ev.options.map((x) => x.label), choice: null, result: null };
          expect(typeof resolveEvent(c, o)).toBe('string');
        }
      }
    }
  });
});
