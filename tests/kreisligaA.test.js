import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, currentLineup, finishRound, humanClub, humanFixture, leagueOf, matchFormat, maxSquad, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { PITCHES } from '../src/sim/pitch.js';
import { systemsFor } from '../src/sim/tactics.js';
import { OPS_COST } from '../src/career/finances.js';

// Saison so beenden, dass wir Erster werden.
function winSeason(c) {
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) {
      const h = c.clubs.find((cl) => cl.id === f.home);
      const a = c.clubs.find((cl) => cl.id === f.away);
      f.result = h.human ? { home: 3, away: 0 } : a.human ? { home: 0, away: 3 } : { home: 1, away: 1 };
    }
    finishRound(c);
  }
}

describe('Kreisliga A: 9 gegen 9', () => {
  it('das 9er-Feld hat DFB-Maße (70 × 50 m, Tore 5 × 2 m) und vier Systeme', () => {
    const p = PITCHES.sportplatz;
    expect([p.halfLength * 2, p.halfWidth * 2, p.goalHalfWidth * 2, p.goalHeight]).toEqual([70, 50, 5, 2]);
    expect(p.format).toBe(9);
    const systems = systemsFor(9);
    expect(Object.keys(systems)).toHaveLength(4);
    for (const s of Object.values(systems)) {
      expect(s.formation).toHaveLength(9);
      expect(s.formation.filter((e) => e.role === 'gk')).toHaveLength(1);
    }
  });

  it('der Meister der Kreisklasse B steigt auf: 9er-Format, eigener Platz, größerer Kader', () => {
    const c = createCareer({ seed: 77 });
    c.level = 3; // als Kreisklasse B werten
    winSeason(c);
    const res = nextSeason(c);
    expect(res.promoted).toBe(true);
    expect(leagueOf(c).level).toBe(4);
    expect(c.league).toBe('Kreisliga A Kanalbezirk');
    expect(humanClub(c).venue).toBe('sportplatz');
    expect(maxSquad(c)).toBe(18);
    expect(matchFormat(c)).toBe(9);
    for (const club of c.clubs.filter((x) => !x.human)) expect(club.squad.length).toBeGreaterThanOrEqual(15);
    expect(currentLineup(c).formation).toHaveLength(9);
  });

  it('ein Kreisliga-A-Spiel läuft als 9 gegen 9 durch und wird gewertet', () => {
    const c = createCareer({ seed: 78 });
    c.level = 3;
    winSeason(c);
    nextSeason(c);
    expect(leagueOf(c).level).toBe(4);
    const f = humanFixture(c);
    const prepared = prepareMatch(c, f, { duration: 60 });
    expect(prepared.match.players.filter((p) => p.team === 0)).toHaveLength(9);
    simulateSync(prepared);
    recordResult(c, f, prepared);
    expect(f.result).toBeTruthy();
  });

  it('höhere Liga, höhere Kosten', () => {
    expect(OPS_COST[4]).toBeGreaterThan(OPS_COST[3]);
  });
});
