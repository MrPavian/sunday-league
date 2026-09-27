import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub } from '../src/career/career.js';
import { CLUBLIFE_EVENTS, clubLife, clubLifeWeek } from '../src/career/clublife.js';
import { resolveEvent } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';

function prepared(seed) {
  const c = createCareer({ seed });
  c.round = 5;
  c.facilities = { built: { grill: 1, flutlicht: 1, tribuene: 1 }, building: null };
  c.staff.wirt = { idx: humanClub(c).squad[1], name: 'Wirt Willi' };
  const l = clubLife(c);
  l.neighbors = -2;
  l.treasurer = { idx: humanClub(c).squad[2], honest: false, since: 1 };
  l.missing = 20;
  c.alumni.push({ idx: 4242, name: 'Alter Hase', age: 38, apps: 90, goals: 12, season: 0, role: 'Platzwart' });
  c.sponsors = [{ id: 'x', name: 'Bäckerei', rel: 70 }];
  return c;
}

describe('club life', () => {
  it('every club-life event resolves with every option and shows its effects', () => {
    for (const [id, def] of Object.entries(CLUBLIFE_EVENTS)) {
      for (let choice = 0; choice < def.options.length; choice++) {
        for (const seed of [1, 2, 3]) {
          const c = prepared(900 + seed * 10 + choice);
          if (id === 'mitgliederversammlung') c.round = 2;
          if (id === 'weihnachtsfeier') c.round = Math.floor(c.fixtures.length / 2);
          if (id === 'trainingslager') c.round = 0;
          const ctx = def.needs(c, createRng(choice + 2));
          expect(ctx, id).toBeTruthy();
          c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
          expect(typeof resolveEvent(c, choice), `${id}/${choice}`).toBe('string');
          expect(def.needs(c, createRng(1)), `${id} once`).toBeFalsy();
        }
      }
    }
  });

  it('fee decisions and supporters show up in the weekly accounts', () => {
    const c = createCareer({ seed: 950 });
    const l = clubLife(c);
    l.fee = 1;
    l.supporters = 5;
    const cash = c.cash;
    const mood = c.mood;
    finishRound(c);
    const squad = humanClub(c).squad.length;
    expect(c.cash).toBeGreaterThanOrEqual(cash + squad * 4 + 5 - 1);
    expect(c.mood).toBeLessThan(mood + 0.2);
  });

  it('a dishonest treasurer quietly takes money until the audit', () => {
    const c = createCareer({ seed: 951 });
    const idx = humanClub(c).squad[1];
    clubLife(c).treasurer = { idx, honest: false, since: 1 };
    for (let r = 0; r < 6; r++) {
      c.round = r;
      clubLifeWeek(c);
    }
    expect(clubLife(c).missing).toBeGreaterThan(0);
  });
});

describe('notice board', () => {
  it('often has a small club-life topic next to the main decision, resolvable on its own', async () => {
    const { resolveEvent } = await import('../src/career/events.js');
    const c = createCareer({ seed: 960, leagueSize: 8 });
    let seen = 0;
    let resolved = 0;
    for (let r = 0; r < 12; r++) {
      const n = c.week?.notice;
      if (n) {
        seen++;
        expect(n.id).not.toBe(c.week.event?.id);
        if (r % 2 && typeof resolveEvent(c, 0, 'notice') === 'string') resolved++;
      }
      finishRound(c);
    }
    expect(seen).toBeGreaterThanOrEqual(3);
    expect(resolved).toBeGreaterThan(0);
    // Unbeantwortet? Dann nimmt sich die Gruppe am Spieltag die letzte Option.
    expect(c.eventLog).toBeTruthy();
  });
});
