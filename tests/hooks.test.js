// Einhängepunkte für Funktionsmodule (src/career/hooks.js): jeder Lebenszyklus-Schritt ruft sie genau einmal auf.
import { afterEach, describe, expect, it } from 'vitest';
import { createCareer, finishRound, migrateCareer, nextSeason, startWeek } from '../src/career/career.js';
import { FEATURES } from '../src/career/hooks.js';

describe('career hooks', () => {
  afterEach(() => FEATURES.splice(0));

  it('create, migrate, startWeek, finishRound und nextSeason rufen den Hook genau einmal', () => {
    const calls = [];
    const probe = Object.fromEntries(['create', 'migrate', 'startWeek', 'finishRound', 'nextSeason'].map((n) => [n, (c, extra) => calls.push([n, !!c, extra])]));
    FEATURES.push(probe);
    const c = createCareer({ seed: 3 });
    expect(calls.map((x) => x[0])).toEqual(['startWeek', 'create']); // createCareer startet die erste Woche selbst
    calls.length = 0;
    migrateCareer(c);
    startWeek(c);
    finishRound(c);
    const summary = nextSeason(c);
    expect(calls.filter((x) => x[0] !== 'startWeek').map((x) => x[0])).toEqual(['migrate', 'finishRound', 'nextSeason']);
    expect(calls.find((x) => x[0] === 'nextSeason')[2]).toBe(summary);
    expect(calls.every((x) => x[1])).toBe(true);
  });

  it('ohne eingetragene Module ändert sich nichts', () => {
    const a = createCareer({ seed: 5 });
    FEATURES.push({});
    const b = createCareer({ seed: 5 });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});
