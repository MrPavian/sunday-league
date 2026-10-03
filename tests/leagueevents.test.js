import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { resolveEvent, rollWeekEvent } from '../src/career/events.js';
import { AMATEUR_MAX_MONTH, LEAGUE_EVENTS } from '../src/career/leagueevents.js';

const rng = { next: () => 0.3, pick: (l) => l[0], chance: () => true, int: (a) => a, range: (a) => a };

describe('Ereignisse der höheren Ligen', () => {
  it('unten gibt es sie nicht, ab ihrer Liga schon – jede Wahl löst mit Text auf', () => {
    for (const [id, def] of Object.entries(LEAGUE_EVENTS)) {
      const low = createCareer({ seed: 3 });
      expect(def.needs(low, rng), id).toBeNull();
      for (let choice = 0; choice < def.options.length; choice++) {
        const c = createCareer({ seed: 3 });
        c.level = 5;
        c.round = 4;
        const ctx = def.needs(c, rng);
        expect(ctx, id).toBeTruthy();
        c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
        const res = resolveEvent(c, choice);
        expect(typeof res).toBe('string');
        expect(res.length).toBeGreaterThan(5);
      }
    }
  });

  it('Amateur-Grenze laut DFB-Spielordnung § 8', () => {
    expect(AMATEUR_MAX_MONTH).toBe(249.99);
  });

  it('in der Bezirksliga kommen sie im normalen Wochenlauf vor', () => {
    let hits = 0;
    let rolled = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const c = createCareer({ seed });
      c.level = 5;
      for (let r = 1; r <= 10; r++) {
        c.round = r;
        c.week.event = null;
        const e = rollWeekEvent(c);
        if (!e) continue;
        rolled++;
        if (LEAGUE_EVENTS[e.id]) hits++;
      }
    }
    expect(rolled).toBeGreaterThan(50);
    expect(hits / rolled).toBeGreaterThan(0.05); // gemessen: 36 von 260 (14 %)
  });
});
