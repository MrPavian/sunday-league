// Turniere im Kalender (vom Nutzer gewünscht, 2026-10-21): Hallenturnier in einer eigenen Winterpause ohne Ligaspiel,
// Aufstellung fürs Turnier getrennt von der Liga und zwischen den Spielen änderbar (Rotation).
import { describe, expect, it } from 'vitest';
import { createCareer, currentLineup, finishRound, finishWinterBreak, humanClub, humanFixture, lineupOf, matchFormat, runningCup, seasonOver, setLineupSlot, simulateSync, winterRound } from '../src/career/career.js';
import { advanceCup, cupOf, currentCupMatches, humanCupMatch, prepareCupMatch, recordCupResult, skipTournament, startTournament, winterCupDue } from '../src/career/tournament.js';

const toWinter = (seed) => {
  const c = createCareer({ seed });
  while (c.round < winterRound(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 0 };
    finishRound(c);
  }
  return c;
};

describe('Winterpause', () => {
  it('eigene Woche ohne Ligaspiel: Hallenturnier fällig, „Weiter“ führt in die Woche des Spieltags', () => {
    const c = toWinter(93);
    expect(c.week.breakWeek).toBe('winter');
    expect(winterCupDue(c)).toBe(true);
    const round = c.round;
    const f = humanFixture(c);
    expect(f.result).toBeFalsy(); // der Spieltag nach der Pause ist noch nicht gespielt
    skipTournament(c, 'halle');
    finishWinterBreak(c);
    expect(c.week.breakWeek).toBeUndefined();
    expect(c.round).toBe(round); // kein Spieltag übersprungen
    expect(c.flags.winterBreak).toBe(c.season);
    expect(winterCupDue(c)).toBe(false);
    expect(humanFixture(c)).toBe(f);
  });

  it('Sperren werden in der Pause nicht abgesessen, Verletzungen heilen weiter', () => {
    const c = toWinter(95);
    const [a, b] = humanClub(c).squad.filter((i) => i !== c.coach?.idx);
    c.players[a].ban = { games: 1, reason: 'rot' };
    c.players[b].injuryWeeks = 2;
    finishWinterBreak(c);
    expect(c.players[a].ban?.games).toBe(1);
    expect(c.players[b].injuryWeeks).toBe(1);
  });

  it('ohne „Weiter“ per finishRound: die Pause zählt nicht als Spieltag', () => {
    const c = toWinter(96);
    const round = c.round;
    finishRound(c);
    expect(c.round).toBe(round);
    expect(c.week.breakWeek).toBeUndefined();
  });
});

describe('Rotation im Turnier', () => {
  it('eigene Turnier-Aufstellung (5 gegen 5), die Liga-Aufstellung bleibt; zwischen den Spielen änderbar', () => {
    const c = toWinter(97);
    startTournament(c, 'halle');
    expect(runningCup(c)).toBe('halle');
    expect(matchFormat(c)).toBe(5);
    const { lineup } = currentLineup(c);
    expect(lineup).toHaveLength(5);
    const squad = humanClub(c).squad.filter((i) => c.week.availability[i] === 'yes' && !lineup.includes(i));
    const sub = squad[0];
    setLineupSlot(c, 2, sub);
    expect(lineupOf(c)[2]).toBe(sub);
    expect(c.week.lineup).toBeNull(); // Liga-Aufstellung unberührt
    const m = humanCupMatch(c, 'halle');
    const prepared = prepareCupMatch(c, m, { duration: 10 });
    const mine = prepared.match.teams.find((t) => t.name === humanClub(c).name);
    // Wer gewählt ist, steht im Kader des Spiels (sofern er an diesem Tag nicht kurzfristig fehlt).
    const absent = prepared.match.players.every((p) => p.poolIndex !== sub) && prepared.match.bench.flat().every((p) => p.poolIndex !== sub);
    if (!absent) expect(prepared.match.players.some((p) => p.poolIndex === sub)).toBe(true);
    expect(mine).toBeTruthy();
    // Turnier zu Ende: wieder die Liga-Aufstellung, Format der Liga.
    let guard = 0;
    while (cupOf(c, 'halle').stage !== 'done' && guard++ < 10) {
      for (const x of currentCupMatches(c, 'halle')) {
        const p = prepareCupMatch(c, x, { duration: 10 });
        simulateSync(p);
        recordCupResult(c, x, p);
      }
      advanceCup(c, 'halle');
    }
    expect(runningCup(c)).toBeNull();
    expect(lineupOf(c)).toBe(c.week.lineup); // wieder die Liga-Aufstellung (Freizeitliga spielt auch 5 gegen 5)
  }, 60000);

  it('Stadtmeisterschaft nach der Saison: Turnierwoche für die Aufstellung', () => {
    const c = createCareer({ seed: 98 });
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 0 };
      finishRound(c);
    }
    if (c.week?.relegation) return; // Relegation geht vor
    expect(c.week).toBeNull();
    startTournament(c, 'stadt');
    expect(c.week?.cupWeek).toBe(true);
    expect(currentLineup(c).lineup).toHaveLength(5);
  });
});
