import { describe, expect, it } from 'vitest';
import { buildLineup, createCareer, finishRound, humanClub, playerOf, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { adjustFitness, backFromInjury, FIT_LOW, fitnessCap, fitnessOf, weeklyFitness } from '../src/career/fitness.js';
import { humanCupMatch, prepareCupMatch, recordCupResult, startTournament } from '../src/career/tournament.js';
import { createRng } from '../src/core/rng.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const humanFix = (c) => c.fixtures[c.round].find((f) => f.home === humanClub(c).id || f.away === humanClub(c).id);

describe('Fitness', () => {
  it('fehlt der Wert (alter Spielstand), gilt 100 %; Grenzen 50–100 %', () => {
    const c = createCareer({ seed: 4 });
    const idx = humanClub(c).squad[0];
    expect(fitnessOf(c, idx)).toBe(1);
    adjustFitness(c, idx, -0.9);
    expect(fitnessOf(c, idx)).toBe(0.5);
    adjustFitness(c, idx, 2);
    expect(fitnessOf(c, idx)).toBe(1);
  });

  it('erholt sich über die Woche; Ältere langsamer; Schichtarbeit und Alter setzen eine Decke', () => {
    const c = createCareer({ seed: 4 });
    const sq = humanClub(c).squad;
    const young = sq.find((i) => playerOf(c, i).age < 30 && fitnessCap(playerOf(c, i)) === 1);
    const old = sq.find((i) => playerOf(c, i).age >= 33);
    for (const i of [young, old].filter((x) => x != null)) c.players[i].fitness = 0.6;
    weeklyFitness(c, playerOf, sq);
    expect(fitnessOf(c, young)).toBeCloseTo(0.72, 5);
    if (old != null) expect(fitnessOf(c, old)).toBeLessThan(fitnessOf(c, young));
    for (let w = 0; w < 6; w++) weeklyFitness(c, playerOf, sq);
    expect(fitnessOf(c, young)).toBe(1);
    expect(c.players[young].fitness).toBeUndefined(); // topfit = kein gespeicherter Wert
    expect(fitnessCap({ profession: 'Schichtarbeiter', age: 25 })).toBe(1);
    expect(fitnessCap({ profession: 'Lehrer', age: 40 })).toBeCloseTo(0.92, 5);
  });

  it('Schichtarbeiter im eigenen Kader haben manche Wochen Nachtschicht (höchstens 86 %), aber nicht immer', () => {
    const c = createCareer({ seed: 4 });
    const club = humanClub(c);
    const idx = club.squad[2];
    playerOf(c, idx).profession = 'Schichtarbeiter';
    let night = 0;
    for (let w = 0; w < 10; w++) {
      c.round = w;
      weeklyFitness(c, playerOf, club.squad);
      if (fitnessOf(c, idx) <= 0.86) night++;
    }
    expect(night).toBeGreaterThanOrEqual(2);
    expect(night).toBeLessThanOrEqual(4);
  });

  it('zurück aus der Verletzung: je länger raus, desto weniger fit', () => {
    const c = createCareer({ seed: 4 });
    const [a, b] = humanClub(c).squad;
    backFromInjury(c, a, 1);
    backFromInjury(c, b, 5);
    expect(fitnessOf(c, a)).toBeCloseTo(0.74, 5);
    expect(fitnessOf(c, b)).toBeCloseTo(0.6, 5);
    // Über finishRound: Verletzung läuft aus → Fitness sinkt.
    const idx = humanClub(c).squad[2];
    Object.assign(c.players[idx], { injuryWeeks: 1, injury: { type: 'baender', label: 'x', weeks: 3 } });
    finishRound(c);
    expect(c.players[idx].injuryWeeks).toBe(0);
    expect(fitnessOf(c, idx)).toBeCloseTo(0.66, 5);
  });

  it('im Spiel: Fitness ist die Startausdauer, Bank und Pause füllen nur bis zur Fitness auf', () => {
    const c = createCareer({ seed: 4 });
    const f = humanFix(c);
    const club = humanClub(c);
    const lineup = buildLineup(c, club, 5, c.week.availability, createRng(1)).lineup;
    const starter = lineup.find((i) => i != null && c.players[i]);
    c.players[starter].fitness = 0.75;
    const prepared = prepareMatch(c, f, { duration: 60 });
    const p = prepared.match.players.find((q) => q.poolIndex === starter);
    expect(p.fitness).toBe(0.75);
    expect(p.stamina).toBe(0.75);
    const others = prepared.match.players.filter((q) => q.poolIndex !== starter && q.fitness == null);
    expect(others.every((q) => q.stamina === 1)).toBe(true);
    // Bis zur Pause spielen: Erholung in der Pause nie über 75 %.
    const m = prepared.match;
    while (m.phase !== 'halftime' && m.phase !== 'ended') stepMatch(m, undefined, 1 / 60);
    for (let i = 0; i < 600 && m.phase === 'halftime'; i++) stepMatch(m, undefined, 1 / 60);
    const after = m.players.find((q) => q.poolIndex === starter) ?? m.bench.flat().find((q) => q.poolIndex === starter);
    expect(after.stamina).toBeLessThanOrEqual(0.75 + 1e-9);
  });

  it('ohne Karriere (Freundschaftsspiel) ändert sich nichts: alle starten mit voller Ausdauer', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.parkplatz, human: false });
    expect(m.players.every((p) => p.stamina === 1 && p.fitness == null)).toBe(true);
  });

  it('nach dem Spiel etwas weniger im Tank – in der Liga bis Sonntag wieder weg, im Turnier nicht', () => {
    const c = createCareer({ seed: 4 });
    const f = humanFix(c);
    const prepared = prepareMatch(c, f, { duration: 60 });
    simulateSync(prepared);
    recordResult(c, f, prepared);
    const played = prepared.match.players.filter((p) => humanClub(c).squad.includes(p.poolIndex)).map((p) => p.poolIndex);
    expect(played.some((i) => fitnessOf(c, i) < 1)).toBe(true);
    expect(played.every((i) => fitnessOf(c, i) >= 0.94)).toBe(true);
    // Turnierspiel (ohne Woche dazwischen) kostet mehr als ein Ligaspiel.
    const leagueDrop = Math.max(...played.map((i) => 1 - fitnessOf(c, i)));
    const c2 = createCareer({ seed: 4 });
    startTournament(c2, 'stadt');
    const cm = humanCupMatch(c2, 'stadt');
    const cp = prepareCupMatch(c2, cm, { duration: 60 });
    simulateSync(cp);
    recordCupResult(c2, cm, cp);
    const cupPlayed = cp.match.players.filter((p) => humanClub(c2).squad.includes(p.poolIndex)).map((p) => p.poolIndex);
    expect(Math.max(...cupPlayed.map((i) => 1 - fitnessOf(c2, i)))).toBeGreaterThan(leagueDrop * 1.4);
  });

  it('automatische Aufstellung: bei fast gleicher Stärke bleibt der Unfitte draußen', () => {
    // Ersten Verein suchen, in dem ein Starter und ein Bankspieler derselben Position fast gleich stark sind.
    let c, club, pick, base, pair;
    const rating = (idx) => playerOf(c, idx).rating;
    for (let seed = 11; seed < 40 && !pair; seed++) {
      c = createCareer({ seed });
      club = humanClub(c);
      const availability = Object.fromEntries(club.squad.map((idx) => [idx, 'yes']));
      pick = () => buildLineup(c, club, 5, availability, createRng(1)).lineup;
      base = pick();
      for (const s of base) for (const b of club.squad) if (!pair && !base.includes(b) && playerOf(c, b).position === playerOf(c, s).position && playerOf(c, s).position !== 'gk' && Math.abs(rating(s) - rating(b)) <= 3) pair = { s, b };
    }
    expect(pair).toBeTruthy();
    const { s } = pair;
    c.players[s].fitness = 0.6;
    const after = pick();
    expect(after).not.toContain(s);
    expect(after.filter((x) => x != null)).toHaveLength(5);
    c.players[s].fitness = 1;
    expect(pick()).toEqual(base);
    expect(FIT_LOW).toBe(0.7);
  });
});
