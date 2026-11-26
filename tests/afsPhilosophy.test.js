// AFS Phase 6: Philosophien je Trainertyp und fünfter Typ „Ballbesitz“ (src/intel/philosophy.js, career/opponents.js COACH5).
import { afterEach, describe, expect, it } from 'vitest';
import { COACH5, coachOf } from '../src/career/opponents.js';
import { PATTERNS, patternOf } from '../src/career/patterns.js';
import { coachApplicants } from '../src/career/president.js';
import { rank } from '../src/intel/core.js';
import { philosophyOf, PHILOSOPHY_TYPES } from '../src/intel/philosophy.js';

const ids = Array.from({ length: 2000 }, (_, i) => `verein-${i}`);
afterEach(() => {
  COACH5.on = true;
});

describe('Philosophien (AFS Phase 6)', () => {
  it('Ballbesitz kommt nur aus bisherigen Kumpeltypen, etwa die Hälfte; alle anderen bleiben', () => {
    COACH5.on = false;
    const before = ids.map((id) => coachOf({ id }));
    COACH5.on = true;
    const after = ids.map((id) => coachOf({ id }));
    expect(before.some((c) => c.type === 'ballbesitz')).toBe(false);
    let kumpel = 0, moved = 0;
    after.forEach((c, i) => {
      expect(c.name).toBe(before[i].name);
      if (before[i].type === 'kumpeltyp') {
        kumpel++;
        if (c.type === 'ballbesitz') moved++;
        else expect(c.type).toBe('kumpeltyp');
      } else expect(c.type).toBe(before[i].type);
    });
    expect(moved / kumpel).toBeGreaterThan(0.4);
    expect(moved / kumpel).toBeLessThan(0.6);
  });

  it('Ballbesitz-Handschrift: Ball halten, kein ungemessenes Gegenmittel', () => {
    const id = ids.find((x) => coachOf({ id: x }).type === 'ballbesitz');
    expect(patternOf({ id })).toBe('ballbesitz');
    expect(PATTERNS.ballbesitz.orders).toEqual({ build: 'halten' });
    expect(PATTERNS.ballbesitz.counter).toBeNull();
  });

  it('gleiche Befunde, verschiedene Entscheidungen je Typ', () => {
    const p = (metric) => ({ kind: 'problem', metric, type: `${metric}:low` });
    const findings = [p('packing'), p('passPct')];
    const first = Object.fromEntries(PHILOSOPHY_TYPES.map((t) => [t, rank(findings, { philosophy: philosophyOf(t) })[0]?.key]));
    expect(first).toEqual({ grossmaul: 'build:direkt', oldschool: 'build:direkt', stratege: 'style:mauern', kumpeltyp: 'style:mauern', ballbesitz: 'route:mitte' });
    expect(philosophyOf('unbekannt')).toEqual({ like: [], avoid: [], weights: {}, src: 'SET' });
  });

  it('Präsidium: Bewerber mit Kurzpass ist ein Ballbesitz-Trainer, sonst bleibt alles gleich', () => {
    let found = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const c = { seed, season: 1, level: 3, round: 0 };
      COACH5.on = false;
      const off = coachApplicants(c);
      COACH5.on = true;
      const on = coachApplicants(c);
      on.forEach((a, i) => {
        const { persona, ...rest } = a;
        const { persona: was, ...restOff } = off[i];
        expect(rest).toEqual(restOff);
        if (a.style === 'kurzpass' && a.arch !== 'routinier') {
          expect(persona).toBe('ballbesitz');
          found++;
        } else expect(persona).toBe(was);
      });
    }
    expect(found).toBeGreaterThan(0);
  });
});
