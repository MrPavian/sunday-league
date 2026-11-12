// Schwierigkeitsgrad (career/difficulty.js): Vorstand, Sponsorengeld, Familie.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { DIFFICULTY, difficultyOf, familyLoad, FAMILY_LOAD_FROM, setDifficulty } from '../src/career/difficulty.js';
import { weight, PRESSURE } from '../src/career/pressure.js';
import { paySponsors } from '../src/career/sponsors.js';
import { weeklyPersonal } from '../src/career/personal.js';
import { privat, PRIVAT_EVENTS } from '../src/career/privat.js';

const coach = (extra = {}) => ({ first: 'Erika', last: 'Test', style: 'spielmacher', mode: 'coachOnly', relation: 'verheiratet', children: [], ...extra });
const make = (id) => {
  const c = createCareer({ seed: 5, coach: coach() });
  if (id) setDifficulty(c, id);
  return c;
};

describe('Schwierigkeitsgrad', () => {
  it('ohne Angabe „normal“; unbekannte Werte werden nicht angenommen', () => {
    const c = createCareer({ seed: 5 });
    expect(difficultyOf(c)).toBe('normal');
    expect(setDifficulty(c, 'unmöglich')).toBe(false);
    expect(setDifficulty(c, 'normal')).toBe(false);
    expect(setDifficulty(c, 'hart')).toBe(true);
    expect(difficultyOf(c)).toBe('hart');
    c.difficulty = 'kaputt';
    expect(difficultyOf(c)).toBe('normal');
  });

  it('Vorstand: Gewicht des Drucks je Stufe', () => {
    for (const id of ['leicht', 'normal', 'hart']) {
      const c = make(id);
      c.level = 9;
      expect(weight(c)).toBeCloseTo(PRESSURE[9] * DIFFICULTY[id].board, 10);
    }
    expect(DIFFICULTY.leicht.board).toBeLessThan(1);
    expect(DIFFICULTY.hart.board).toBeGreaterThan(1);
    expect(DIFFICULTY.normal).toMatchObject({ board: 1, sponsor: 1 });
  });

  it('Sponsorengeld: mehr bei „entspannt“, weniger bei „hart“', () => {
    const paid = (id) => {
      const c = make(id);
      c.sponsors = [{ id: 'test', name: 'Testfirma', slot: 'brust', weekly: 100, rel: 60, left: 1, term: 1 }];
      const cash = c.cash;
      paySponsors(c);
      return c.cash - cash;
    };
    expect(paid('normal')).toBe(100);
    expect(paid('leicht')).toBe(115);
    expect(paid('hart')).toBe(85);
  });

  it('Familie: Zusatzlast erst ab der Regionalliga und nach Stufe; Krise kommt früher', () => {
    const week = (id, level, round = 0) => {
      const c = make(id);
      c.level = level;
      c.round = round;
      c.coach.patience = 50;
      weeklyPersonal(c);
      return c.coach.patience;
    };
    expect(week('hart', FAMILY_LOAD_FROM - 1)).toBe(week('leicht', FAMILY_LOAD_FROM - 1));
    const base = week('leicht', FAMILY_LOAD_FROM);
    expect(week('normal', FAMILY_LOAD_FROM)).toBe(base - 1); // ½ Punkt je Woche = ein Punkt in jeder zweiten
    expect(week('normal', FAMILY_LOAD_FROM, 1)).toBe(week('leicht', FAMILY_LOAD_FROM, 1));
    expect(week('hart', FAMILY_LOAD_FROM, 1)).toBe(week('leicht', FAMILY_LOAD_FROM, 1) - 1);
    expect(week('hart', FAMILY_LOAD_FROM)).toBe(base - 1);
    expect(familyLoad(make('leicht'))).toBe(0);
    const crisis = (id, patience) => {
      const c = make(id);
      privat(c);
      c.coach.patience = patience;
      return PRIVAT_EVENTS.priv_krise.needs(c) !== null;
    };
    expect(crisis('leicht', 40)).toBe(false);
    expect(crisis('normal', 40)).toBe(true);
    expect(crisis('normal', 50)).toBe(false);
    expect(crisis('hart', 55)).toBe(true);
  });
});
