// Auf- und Abstieg der CPU-Vereine (ROADMAP 11.10): jede Liga mit eigener Vereinsliste, am Saisonende steigt der beste
// CPU-Verein auf und der schlechteste der Liga darüber ab (pyramid.js).
import { describe, expect, it } from 'vitest';
import { createCareer, getPool, humanClub, nextSeason, seasonOver, finishRound, table } from '../src/career/career.js';
import { ensureLeagues, membersOf, simTable, venueFor } from '../src/career/pyramid.js';
import { LEAGUES, MAX_LEVEL } from '../src/career/clubs.js';
import { PITCHES } from '../src/sim/pitch.js';

const playSeason = (c, score = (f) => ({ home: 1, away: 0 })) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= score(f);
    finishRound(c);
  }
};
const allIds = (c) => Object.values(ensureLeagues(c)).flat().map((d) => d.id).sort();

describe('Ligenpyramide', () => {
  it('nach der Saison: je Liga fünf Vereine, keiner verschwindet oder doppelt; Auf- und Absteiger an allen Grenzen', () => {
    const c = createCareer({ seed: 31 });
    const before = Object.fromEntries(Object.entries(ensureLeagues(c)).map(([l, d]) => [l, d.map((x) => x.id)]));
    const ids0 = allIds(c);
    const lower = simTable(c, 3, getPool()); // Stufe 3 ohne eigenen Verein: der Erste steigt auf
    playSeason(c);
    nextSeason(c);
    const after = ensureLeagues(c);
    for (let l = 1; l <= MAX_LEVEL; l++) expect(after[l]).toHaveLength(5);
    expect(allIds(c)).toEqual(ids0);
    expect(after[4].some((d) => d.id === lower[0])).toBe(true);
    let changed = 0;
    for (let l = 1; l <= MAX_LEVEL; l++) changed += after[l].filter((d) => !before[l].includes(d.id)).length;
    expect(changed).toBe(2 * (MAX_LEVEL - 1)); // an jeder Grenze ein Auf- und ein Absteiger
  });

  it('eigene Liga: der beste CPU-Verein steigt auf, ein Absteiger von oben kommt mit Kader dazu', () => {
    const c = createCareer({ seed: 33 });
    const me = humanClub(c).id;
    playSeason(c, (f) => (f.home === me ? { home: 0, away: 1 } : f.away === me ? { home: 1, away: 0 } : { home: 2, away: 0 }));
    expect(c.level).toBe(1);
    const best = table(c).find((r) => !r.club.human).club.id;
    const down = [...ensureLeagues(c)[2]].map((d) => d.id);
    nextSeason(c);
    expect(c.level).toBe(1); // Letzter in der untersten Liga: kein Abstieg
    const ids = c.clubs.map((x) => x.id);
    expect(ids).not.toContain(best);
    expect(membersOf(c, 2).some((d) => d.id === best)).toBe(true);
    expect(ids.some((id) => down.includes(id))).toBe(true); // einer von oben ist dazugekommen
    for (const x of c.clubs) expect(x.squad.length).toBeGreaterThan(0);
    for (const x of c.clubs.filter((y) => !y.human)) expect(PITCHES[x.venue].format).toBeLessThanOrEqual(5);
  });

  it('Platz passt zur Liga: Aufsteiger vom Kleinfeld spielen auf dem Platz der neuen Liga', () => {
    expect(venueFor('park', 2)).toBe(LEAGUES[2].humanVenue);
    expect(venueFor('rasenplatz', 2)).toBe('rasenplatz');
    expect(PITCHES[venueFor('rasenplatz', 1)].format).toBeLessThanOrEqual(5);
  });

  it('Stärke zählt: über 40 Spielzeiten bleibt die oberste Liga die stärkste', async () => {
    const { defStrength, cpuMoves } = await import('../src/career/pyramid.js');
    const c = createCareer({ seed: 5 });
    const pool = getPool();
    ensureLeagues(c);
    for (let s = 1; s <= 40; s++) {
      c.season = s;
      cpuMoves(c, simTable(c, c.level, pool), pool);
    }
    const avg = (l) => ensureLeagues(c)[l].reduce((x, d) => x + defStrength(d, pool, l), 0) / 5;
    expect(avg(5)).toBeGreaterThan(avg(4));
    expect(avg(5)).toBeGreaterThan(avg(1) + 8);
  }, 60000);
});
