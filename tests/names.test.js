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

describe('looks match the names', async () => {
  const { createPlayerPool } = await import('../src/sim/generator.js');
  const { SKIN_TONES, HAIR_COLORS } = await import('../src/data/names.js');
  const pool = createPlayerPool({ seed: 1921, size: 3000, edition: 4 });
  const all = pool.everyone();
  const last = (p) => p.name.split(' ').slice(1).join(' ');
  const dark = (p) => SKIN_TONES.indexOf(p.look.skin) >= 4;

  it('skin tone follows the origin – as a tendency, not a rule', () => {
    const de = all.filter((p) => ORIGINS.de.last.includes(last(p)));
    const wa = all.filter((p) => ORIGINS.wa.last.includes(last(p)));
    const deDark = de.filter(dark).length / de.length;
    expect(deDark).toBeGreaterThan(0.01); // es gibt sie weiterhin
    expect(deDark).toBeLessThan(0.15);
    if (wa.length >= 10) expect(wa.filter(dark).length / wa.length).toBeGreaterThan(0.6);
  });

  it('grey hair only from about 40', () => {
    const grey = HAIR_COLORS[5];
    expect(all.filter((p) => p.age < 40 && p.look.hair === grey)).toHaveLength(0);
    const old = all.filter((p) => p.age >= 48);
    if (old.length >= 20) expect(old.filter((p) => p.look.hair === grey).length).toBeGreaterThan(0);
  });
});
