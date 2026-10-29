// Stadionausbau ab der Landesliga (2500 Plätze, Mindestgröße der Regionalliga West/Bayern) und Schiri-Spesen nach der
// Spesentabelle des Verbands Westfalen 2025/26 (finances.js REF_FEE).
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { buildBlock, capacity, facilities } from '../src/career/facilities.js';
import { refFee } from '../src/career/finances.js';

describe('Stadionausbau', () => {
  it('erst ab Stufe 6 und nach dem Tribünendach; dann Platz für 2500', () => {
    const c = createCareer({ seed: 3 });
    c.platz = { land: 'eigen' };
    const f = facilities(c);
    f.built = { grill: 1, tribuene: 1, sitzplaetze: 1, tribdach: 1 };
    c.level = 5;
    expect(buildBlock(c, 'stadion')).toBe('level');
    c.level = 6;
    expect(['land', null]).toContain(buildBlock(c, 'stadion'));
    delete f.built.tribdach;
    expect(buildBlock(c, 'stadion')).toBe('needs');
    expect(capacity(c)).toBe(800);
    f.built.tribdach = 1;
    f.built.stadion = 2;
    expect(capacity(c)).toBe(2500);
  });
});

describe('Schiri-Spesen', () => {
  it('nach der Westfalen-Tabelle: Kreisliga 27, Bezirksliga 35, ab Landesliga mit zwei Assistenten', () => {
    expect([2, 3, 4].map(refFee)).toEqual([27, 27, 27]);
    expect(refFee(5)).toBe(35);
    expect(refFee(6)).toBe(45 + 2 * 35);
    expect(refFee(7)).toBe(50 + 2 * 40);
    expect(refFee(8)).toBe(75 + 2 * 50);
    expect(refFee(11)).toBe(refFee(8));
  });
});
