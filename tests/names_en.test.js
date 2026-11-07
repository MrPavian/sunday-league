// Englische Karriere: englische Spieler-, Personen- und Vereinsnamen (Namensauflage 5). Die Sprache
// wird vor dem Laden der Module gesetzt (viele Tabellen entstehen beim Import).
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

let career, names, origins, en, en10, createRng;
beforeAll(async () => {
  career = await import('../src/career/career.js');
  names = await import('../src/data/names.js');
  origins = await import('../src/data/origins.js');
  en = await import('../src/data/origins_en.js');
  en10 = await import('../src/data/origins_en10.js');
  ({ createRng } = await import('../src/core/rng.js'));
});

const UMLAUT = /[äöüßÄÖÜ]/;

describe('English names', () => {
  it('a new English career uses edition 10 (edition 5 with more names): English names for players and clubs', () => {
    const c = career.createCareer({ seed: 5 });
    expect(c.names).toBe(names.NAME_EDITION_EN);
    const players = c.clubs.flatMap((cl) => cl.squad).map((i) => career.playerOf(c, i).name);
    const gbLast = new Set(en10.ORIGINS_EN_10.gb.last);
    const share = players.filter((n) => gbLast.has(n.split(' ').slice(1).join(' '))).length / players.length;
    expect(share).toBeGreaterThan(0.5); // gemischt wie in England, aber überwiegend britische Nachnamen
    expect(players.filter((n) => UMLAUT.test(n))).toEqual([]);
    for (const cl of c.clubs) expect(cl.name, cl.name).not.toMatch(/^(SV|TuS|FC Kiosk|DJK|SpVgg|VfL|TSV)\b/);
    expect(c.clubs.find((x) => x.human).name).toBe('Sunday Shots FC');
  });

  it('referees, coaches and other people get English names in an English career', () => {
    career.createCareer({ seed: 6 });
    const rng = createRng(3);
    const people = Array.from({ length: 200 }, () => origins.personName(rng, 40));
    const gbLast = new Set(en10.ORIGINS_EN_10.gb.last);
    expect(people.filter((n) => gbLast.has(n.split(' ').slice(1).join(' '))).length).toBeGreaterThan(120);
  });

  it('an old German career keeps its German names in the English UI', () => {
    const c = career.createCareer({ seed: 7 });
    const de = structuredClone(c);
    de.names = 4; // alte deutsche Auflage
    career.migrateCareer(de);
    const deLast = new Set(origins.ORIGINS.de.last);
    const players = de.clubs.flatMap((cl) => cl.squad).map((i) => career.playerOf(de, i).name);
    expect(players.filter((n) => deLast.has(n.split(' ').slice(1).join(' '))).length / players.length).toBeGreaterThan(0.5);
    expect(origins.nameLocale()).toBe('de'); // Schiri & Co. passend zur Karriere
  });

  it('new German careers use edition 9 (names fit the origin, more origins and names: tests/names_origin.test.js); edition 6 has more names, edition 4 keeps its smaller pool', () => {
    expect(names.nameEditionFor('de')).toBe(9);
    const fresh = career.createCareer({ seed: 7 });
    fresh.names = 6;
    career.migrateCareer(fresh);
    const pool = new Set(origins.DE_LAST_MORE);
    const lastOf = (c) => c.clubs.flatMap((cl) => cl.squad).map((i) => career.playerOf(c, i).name.split(' ').slice(1).join(' '));
    const l6 = lastOf(fresh);
    expect(l6.filter((n) => pool.has(n)).length / l6.length).toBeGreaterThan(0.5);
    const old = structuredClone(fresh);
    old.names = 4;
    career.migrateCareer(old);
    const old4 = new Set(origins.ORIGINS.de.last);
    expect(new Set(l6.filter((n) => pool.has(n) && !old4.has(n))).size).toBeGreaterThanOrEqual(5); // neue Namen tauchen auf (gemessen: 10 verschiedene bei Seed 7)
    expect(lastOf(old).some((n) => pool.has(n) && !old4.has(n))).toBe(false);
  });

  it('origins follow the 2021 census weights (sum ≈ 96 %, British largest)', () => {
    const w = Object.values(en.ORIGINS_EN).map((o) => o.w);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(0.961, 3);
    expect(en.ORIGINS_EN.gb.w).toBe(Math.max(...w));
  });

  it('edition 10 extends edition 5: every old name stays, old English saves keep edition 5', () => {
    expect(names.NAME_EDITION_EN).toBe(10);
    expect(names.nameLocaleOf(5)).toBe('en');
    expect(names.nameLocaleOf(10)).toBe('en10');
    for (const [id, o] of Object.entries(en.ORIGINS_EN)) {
      const grown = en10.ORIGINS_EN_10[id];
      expect(grown.w).toBe(o.w);
      for (const n of o.last) expect(grown.last).toContain(n);
    }
    expect(en10.ORIGINS_EN_10.gb.last.length).toBeGreaterThan(en.ORIGINS_EN.gb.last.length + 80);
    const old = career.createCareer({ seed: 8 });
    old.names = 5;
    career.migrateCareer(old);
    const players = old.clubs.flatMap((cl) => cl.squad).map((i) => career.playerOf(old, i).name);
    const gb5 = new Set(en.ORIGINS_EN.gb.last);
    expect(players.filter((n) => gb5.has(n.split(' ').slice(1).join(' '))).length / players.length).toBeGreaterThan(0.5);
    expect(origins.nameLocale()).toBe('en');
  });
});
