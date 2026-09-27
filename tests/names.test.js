import { describe, expect, it } from 'vitest';
import { ORIGINS, firstNameFor, personName } from '../src/data/origins.js';
import { createRng } from '../src/core/rng.js';

const split = (name) => {
  const parts = name.split(' ');
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

describe('coherent names', () => {
  const rng = createRng(77);
  const sample = (age, n = 800) => Array.from({ length: n }, () => split(personName(rng, age)));

  it('Turkish surnames come with Turkish first names (almost always)', () => {
    const tr = sample(30, 3000).filter((p) => ORIGINS.tr.last.includes(p.last));
    const turkishFirst = tr.filter((p) => ORIGINS.tr.first.includes(p.first)).length;
    expect(tr.length).toBeGreaterThan(100);
    expect(turkishFirst / tr.length).toBeGreaterThan(0.9);
  });

  it('German first names follow the generation: no 45-year-old Finn, no 19-year-old Detlef', () => {
    const old = sample(45).filter((p) => ORIGINS.de.last.includes(p.last)).map((p) => p.first);
    const young = sample(19).filter((p) => ORIGINS.de.last.includes(p.last)).map((p) => p.first);
    for (const n of ['Finn', 'Leon', 'Noah', 'Elias']) expect(old).not.toContain(n);
    for (const n of ['Detlef', 'Torsten', 'Jürgen', 'Klaus']) expect(young).not.toContain(n);
  });

  it('no constructed double names, and mostly German names overall', () => {
    const all = sample(30, 2000);
    expect(all.some((p) => p.first.includes('-'))).toBe(false);
    const german = all.filter((p) => ORIGINS.de.last.includes(p.last)).length / all.length;
    expect(german).toBeGreaterThan(0.55);
    expect(german).toBeLessThan(0.8);
  });

  it('a son gets a first name matching the family name', () => {
    const r = createRng(5);
    const kids = Array.from({ length: 200 }, () => firstNameFor('Yılmaz', r, 16));
    expect(kids.filter((f) => ORIGINS.tr.first.includes(f)).length).toBeGreaterThan(180);
  });
});
