import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver, simulateSync } from '../src/career/career.js';
import { advanceCup, cupOf, currentCupMatches, groupTable, humanCupMatch, prepareCupMatch, recordCupResult, skipTournament, startTournament, winterCupDue, winterRound } from '../src/career/tournament.js';

const endSeason = (c) => {
  while (!seasonOver(c)) finishRound(c);
};

describe('Stadtmeisterschaft', () => {
  it('eight clubs, two groups, semis and a final – someone lifts the cup', () => {
    const c = createCareer({ seed: 91 });
    endSeason(c);
    const t = startTournament(c);
    expect(t.groups.flat()).toHaveLength(8);
    expect(t.groups[0]).toContain(humanClub(c).id);
    expect(humanCupMatch(c)).toBeTruthy();
    let guard = 0;
    while (cupOf(c).stage !== 'done' && guard++ < 10) {
      for (const m of currentCupMatches(c)) {
        const prepared = prepareCupMatch(c, m, { duration: 30 });
        simulateSync(prepared);
        recordCupResult(c, m, prepared);
      }
      advanceCup(c);
    }
    expect(t.stage).toBe('done');
    expect(t.winner).toBeTruthy();
    const final = t.matches.find((m) => m.stage === 'F');
    expect(final.result.home !== final.result.away || final.pens).toBeTruthy();
    expect(groupTable(c, 0).reduce((s, r) => s + r.p, 0)).toBe(12);
    // Gäste verlassen den Spielstand wieder, die Saison geht weiter.
    for (const g of t.guests) for (const idx of g.squad) expect(c.players[idx]).toBeUndefined();
    nextSeason(c);
    expect(c.week).toBeTruthy();
  }, 60000);

  it('can be skipped', () => {
    const c = createCareer({ seed: 92 });
    endSeason(c);
    skipTournament(c);
    expect(cupOf(c).stage).toBe('done');
    expect(humanCupMatch(c)).toBeNull();
  });

  it('the indoor cup takes place in the winter break, in the sports hall', () => {
    const c = createCareer({ seed: 93 });
    while (c.round < winterRound(c)) finishRound(c);
    expect(winterCupDue(c)).toBe(true);
    const t = startTournament(c, 'halle');
    expect(winterCupDue(c)).toBe(false);
    const m = humanCupMatch(c, 'halle');
    expect(prepareCupMatch(c, m, { duration: 10 }).pitch.id).toBe('halle');
    let guard = 0;
    while (cupOf(c, 'halle').stage !== 'done' && guard++ < 10) {
      for (const x of currentCupMatches(c, 'halle')) {
        const prepared = prepareCupMatch(c, x, { duration: 20 });
        simulateSync(prepared);
        recordCupResult(c, x, prepared);
      }
      advanceCup(c, 'halle');
    }
    expect(t.winner).toBeTruthy();
    expect(cupOf(c, 'stadt')).toBeNull(); // Sommerturnier ist unabhängig
  }, 60000);

  it('old saves keep their summer cup', () => {
    const c = createCareer({ seed: 94 });
    c.tournament = { season: c.season, stage: 'done', matches: [], guests: [], groups: [[], []], log: [] };
    expect(cupOf(c, 'stadt').stage).toBe('done');
    expect(c.tournament).toBeUndefined();
  });
});
