import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, nextSeason, seasonOver } from '../src/career/career.js';
import { startTournament } from '../src/career/tournament.js';

describe('league size', () => {
  it('eight teams play fourteen matchdays', () => {
    const c = createCareer({ seed: 8181, leagueSize: 8 });
    expect(c.clubs).toHaveLength(8);
    expect(c.fixtures).toHaveLength(14);
    for (const round of c.fixtures) expect(round).toHaveLength(4);
  });

  it('a change applies from next season: the extra clubs join or withdraw', () => {
    const c = createCareer({ seed: 8182 });
    c.nextLeagueSize = 8;
    expect(c.clubs).toHaveLength(6); // laufende Saison bleibt
    while (!seasonOver(c)) finishRound(c);
    nextSeason(c);
    expect(c.leagueSize).toBe(8);
    expect(c.clubs).toHaveLength(8);
    expect(c.fixtures).toHaveLength(14);
    for (const cl of c.clubs) for (const idx of cl.squad) expect(c.players[idx]).toBeTruthy();
    c.nextLeagueSize = 6;
    while (!seasonOver(c)) finishRound(c);
    nextSeason(c);
    expect(c.clubs).toHaveLength(6);
    expect(c.fixtures).toHaveLength(10);
  });

  it('the cup is filled up to eight teams – no guests needed with eight league clubs', () => {
    const big = startTournament(createCareer({ seed: 8183, leagueSize: 8 }));
    expect(big.guests).toHaveLength(0);
    expect(big.groups.flat()).toHaveLength(8);
    const small = startTournament(createCareer({ seed: 8184 }));
    expect(small.guests).toHaveLength(2);
    expect(small.groups.flat()).toHaveLength(8);
  });
});
