// AFS Phase 1: Saisonsummen der Spieldaten im Spielstand (src/career/seasonstats.js).
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, humanClub, loadCareer, nextSeason, prepareMatch, recordResult, saveCareer, seasonOver, simulateSync } from '../src/career/career.js';
import { KEYS } from '../src/sim/analytics.js';
import { seasonRow } from '../src/career/seasonstats.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

describe('Saisonsummen (AFS Phase 1)', () => {
  it('addiert Ligaspiele je Spieler und Verein, schreibt sie zum Saisonende in die Chronik und beginnt neu', () => {
    const c = createCareer({ seed: 7 });
    const human = humanClub(c);
    let played = 0;
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 40 });
        simulateSync(p);
        recordResult(c, f, p);
        if (f.home === human.id || f.away === human.id) played++;
      }
      finishRound(c);
    }
    const own = c.an.clubs[human.id];
    expect(own.n).toBe(played);
    expect(own.s).toHaveLength(KEYS.length);
    for (const v of own.s) expect(Number.isInteger(v)).toBe(true);
    expect(Object.keys(c.an.clubs)).toHaveLength(c.clubs.length);
    // Die eigenen Spieler zusammen ergeben höchstens die Vereinssumme (Aushilfen haben keinen Eintrag).
    const players = human.squad.map((idx) => c.players[idx].an).filter(Boolean);
    expect(players.length).toBeGreaterThan(3);
    const pass = KEYS.indexOf('pass');
    expect(players.reduce((s, r) => s + r[pass], 0)).toBeLessThanOrEqual(own.s[pass]);
    expect(seasonRow(own.s).xg).toBeCloseTo(own.s[KEYS.indexOf('xg')] / 100, 9);
    // Speichern und Laden verlieren nichts.
    const storage = memoryStorage();
    expect(saveCareer(c, storage)).toBe(true);
    expect(loadCareer(storage)).toEqual(c);

    const season = c.season;
    const withData = human.squad.filter((idx) => c.players[idx].an);
    nextSeason(c);
    expect(c.an.history.at(-1)).toMatchObject({ season, n: played });
    expect(c.an.clubs).toEqual({});
    for (const rec of Object.values(c.players)) expect(rec.an).toBeUndefined();
    for (const idx of withData) {
      const rec = c.players[idx];
      if (!rec) continue; // Karriereende
      expect(rec.seasons.at(-1).season).toBe(season);
      expect(rec.seasons.at(-1).an).toHaveLength(KEYS.length);
    }
  }, 300000);
});
