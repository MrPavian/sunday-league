import { describe, expect, it } from 'vitest';
import { createCareer, getPool, migrateCareer, setNameEdition, teamForMatch } from '../src/career/career.js';
import { FIRST_NAMES, LAST_NAMES, NAME_EDITIONS } from '../src/data/names.js';
import { SPONSORS, sponsorColor } from '../src/career/sponsors.js';
import { crestOf, crestSVG, CREST_SYMBOLS, defaultCrest } from '../src/ui/crest.js';
import { createRng } from '../src/core/rng.js';

describe('names, sponsors, kits and crests', () => {
  it('new careers use the extended names, old saves keep their players', () => {
    expect(FIRST_NAMES.length).toBeGreaterThan(100);
    expect(LAST_NAMES.length).toBeGreaterThan(100);
    const c = createCareer({ seed: 5 });
    expect(c.names).toBe(2);
    const idx = c.clubs[0].squad[0];
    const modern = getPool().get(idx).name;
    // Alter Spielstand ohne Namensauflage → erste Auflage, derselbe Spieler heißt wie früher.
    const old = structuredClone(c);
    delete old.names;
    migrateCareer(old);
    const legacy = getPool().get(idx);
    const [first, last] = legacy.name.split(' ');
    expect(NAME_EDITIONS[1].first).toContain(first);
    expect(NAME_EDITIONS[1].last).toContain(last);
    setNameEdition(2);
    expect(getPool().get(idx).name).toBe(modern);
  });

  it('every sponsor has a unique id and a brand colour; clubs show a shirt sponsor', () => {
    expect(SPONSORS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(SPONSORS.map((s) => s.id)).size).toBe(SPONSORS.length);
    for (const s of SPONSORS) expect(typeof sponsorColor(s)).toBe('number');
    expect(typeof sponsorColor({ name: 'Unbekannt GmbH' })).toBe('number');
    const c = createCareer({ seed: 9 });
    const others = c.clubs.filter((x) => !x.human).map((club) => teamForMatch(c, club, 5, Object.fromEntries(club.squad.map((i) => [i, 'yes'])), createRng(1)));
    expect(others.some((t) => t.sponsor?.name)).toBe(true);
    for (const t of others) expect(t.crest?.shape).toBeTruthy();
  });

  it('old saves get the new kit patterns for the other clubs', () => {
    const c = createCareer({ seed: 11 });
    const club = c.clubs.find((x) => !x.human);
    club.kit = { shirt: club.kit.shirt, shorts: club.kit.shorts, socks: club.kit.socks }; // Stand von früher
    migrateCareer(c);
    expect(club.kit.pattern).toBeTruthy();
  });

  it('crests are stable per club and render every symbol', () => {
    const a = defaultCrest({ id: 'kanal', kit: { shirt: 0x2f6fb5 } });
    expect(defaultCrest({ id: 'kanal', kit: { shirt: 0x2f6fb5 } })).toEqual(a);
    for (const symbol of Object.keys(CREST_SYMBOLS)) {
      const svg = crestSVG({ ...a, symbol }, { short: 'SVS' });
      expect(svg.startsWith('<svg')).toBe(true);
      if (symbol !== 'keins') expect(svg).toContain('<rect x=');
    }
    expect(crestOf({ crest: { shape: 'rund' } }).shape).toBe('rund');
  });
});
