// Rückblick zum Abschied (ROADMAP 11.18 Punkt 10): Die Ära merkt sich Aufstiege, Abstiege und die beste Platzierung.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { eraSummary, legacy, stepDown, succeed, successionCandidates } from '../src/career/legacy.js';

const coach = (age, children = []) => ({ first: 'Uwe', last: 'Brandt', age, relation: 'verheiratet', profession: 'Elektriker', style: 'libero', children });

describe('Abschied mit Rückblick', () => {
  it('fasst Aufstiege, Abstiege und beste Platzierung zusammen; leer, wenn nichts da ist', () => {
    expect(eraSummary({})).toBe('');
    expect(eraSummary({ ups: 1 })).toBe('1 Aufstieg');
    expect(eraSummary({ ups: 2, downs: 1, best: 2 })).toBe('2 Aufstiege, 1 Abstieg, beste Platzierung: Platz 2');
  });

  it('die Ära des abtretenden Trainers bekommt den Rückblick aus seiner Amtszeit', () => {
    const c = createCareer({ seed: 7, coach: coach(50, [{ name: 'Lena', age: 24, sex: 'w' }]) });
    c.history = [
      { season: 1, pos: 4, promoted: false, relegated: false },
      { season: 2, pos: 1, promoted: true, relegated: false },
      { season: 3, pos: 8, promoted: false, relegated: true },
    ];
    c.season = 3;
    c.round = c.fixtures.length;
    stepDown(c);
    succeed(c, successionCandidates(c).find((x) => x.child === 'Lena'));
    const era = legacy(c).eras.at(-1);
    expect(era).toMatchObject({ ups: 1, downs: 1, best: 1, titles: 1 });
    expect(eraSummary(era)).toContain('1 Aufstieg');
  });
});
