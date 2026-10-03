// Kreis- und Bezirkspokal: K.-o. unter der Woche, Heimrecht für den Klassentieferen.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, seasonOver, simulateSync, takenIndices } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { LEAGUE_EVENTS } from '../src/career/leagueevents.js';
import { humanTie, pokalDue, pokalEligible, pokalOf, pokalRounds, preparePokalMatch, quickTie, recordPokalResult, roundTies, startPokal, teamStrength, tieWinner } from '../src/career/pokal.js';

const at = (level, seed = 5) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};

describe('Pokale', () => {
  it('Kreispokal ab Stufe 2; Bezirkspokal in der Bezirksliga oder als Kreispokalsieger ab Kreisliga A', () => {
    expect(pokalEligible(at(1), 'kreis')).toBe(false);
    for (const l of [2, 3, 4, 5]) expect(pokalEligible(at(l), 'kreis')).toBe(true);
    expect(pokalEligible(at(4), 'bezirk')).toBe(false);
    expect(pokalEligible(at(5), 'bezirk')).toBe(true);
    const q = at(4);
    q.pokalQual = q.season;
    expect(pokalEligible(q, 'bezirk')).toBe(true);
    const low = at(3);
    low.pokalQual = low.season;
    expect(pokalEligible(low, 'bezirk')).toBe(false);
  });

  it('16 bzw. 8 Vereine, jeder einmal; Heimrecht hat nie der Höherklassige', () => {
    for (const level of [2, 3, 4, 5]) {
      const c = at(level, 10 + level);
      for (const kind of level === 5 ? ['kreis', 'bezirk'] : ['kreis']) {
        const cup = startPokal(c, kind);
        const ids = cup.ties.flatMap((t) => [t.home, t.away]);
        expect(new Set(ids).size).toBe(kind === 'kreis' ? 16 : 8);
        expect(ids).toContain(humanClub(c).id);
        for (const t of cup.ties) expect(cup.levels[t.home]).toBeLessThanOrEqual(cup.levels[t.away]);
      }
    }
  });

  it('Runden: nicht in der ersten Woche, nicht in der Winterpause, zwei Pokale nie in derselben Woche', () => {
    for (const size of [6, 8]) {
      const c = createCareer({ seed: 3, leagueSize: size });
      c.level = 5;
      const n = c.fixtures.length;
      const k = pokalRounds(c, 'kreis');
      const b = pokalRounds(c, 'bezirk');
      expect(k).toHaveLength(4);
      expect(b).toHaveLength(3);
      for (const r of [...k, ...b]) {
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThan(n);
        expect(r).not.toBe(Math.floor(n / 2));
      }
      expect(new Set([...k, ...b]).size).toBe(7);
      expect([...k].sort((x, y) => x - y)).toEqual(k);
    }
  });

  it('eine Saison: Pokalspiel genau in seinen Wochen, am Ende ein Sieger, Gäste wieder weg', () => {
    const c = at(3, 21);
    finishRound(c); // Saisonstart: Anmeldung
    const cup = pokalOf(c, 'kreis');
    expect(cup).toBeTruthy();
    const guests = cup.guests.flatMap((g) => g.squad);
    const taken = takenIndices(c);
    for (const idx of guests) expect(taken.has(idx)).toBe(true);
    let played = 0;
    while (!seasonOver(c)) {
      const k = pokalDue(c);
      if (k) {
        expect(cup.rounds[cup.round]).toBe(c.round);
        const p = preparePokalMatch(c, k, humanTie(c, k));
        expect(p.match.knockout).toBe(true);
        simulateSync(p);
        recordPokalResult(c, p);
        played++;
      }
      finishRound(c);
    }
    expect(cup.done).toBe(true);
    expect(played).toBeGreaterThan(0);
    expect(cup.ties.filter((t) => t.round === cup.ties.at(-1).round)).toHaveLength(1); // ein Finale
    for (const t of cup.ties) expect(t.result).toBeTruthy();
    const me = humanClub(c).id;
    expect(cup.out || cup.winner === me).toBe(true);
    if (cup.winner === me) expect(c.trophies.some((t) => t.name.includes('Kreispokal'))).toBe(true);
    for (const idx of guests) if (!c.clubs.some((x) => x.squad.includes(idx))) expect(c.players[idx]).toBeUndefined();
  });

  it('wer sein Spiel nicht spielt, ist nach der Woche trotzdem weiter oder raus (kein Hängenbleiben)', () => {
    const c = at(2, 8);
    finishRound(c);
    const cup = pokalOf(c, 'kreis');
    for (let i = 0; i < 30 && !seasonOver(c); i++) finishRound(c);
    expect(cup.done).toBe(true);
    expect(cup.ties.every((t) => t.result)).toBe(true);
  });

  it('alter Spielstand mitten in der Saison: erst nächste Saison dabei', () => {
    const c = at(3, 4);
    c.round = 7;
    finishRound(c);
    expect(pokalOf(c, 'kreis')).toBeNull();
  });

  it('Heimrecht verkaufen tauscht wirklich Heim und Auswärts', () => {
    const c = at(2, 31);
    const cup = startPokal(c, 'kreis');
    const me = humanClub(c).id;
    const tie = roundTies(cup).find((t) => t.home === me || t.away === me);
    const opp = tie.home === me ? tie.away : tie.home;
    Object.assign(tie, { home: me, away: opp });
    cup.levels[opp] = 4;
    c.round = cup.rounds[0];
    const ev = LEAGUE_EVENTS.pokal_los;
    const ctx = ev.needs(c);
    expect(ctx).toBeTruthy();
    const rng = createRng(1);
    const res = ev.options[1].effect(c, ctx, rng);
    expect(typeof res).toBe('string');
    expect(tie.home).toBe(opp);
    expect(ev.needs(c)).toBeNull(); // nur einmal angeboten
  });

  it('schnelles Ergebnis: wie in der Engine gewinnt der deutlich Stärkere meistens', () => {
    // Engine (scripts/pokal-calibrate.mjs, 120 Spiele): Stärkere gewinnen bei Unterschied > 5 zu 78–80 %.
    const rng = createRng(3);
    let strongWins = 0;
    let strongGames = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const c = at(2 + (seed % 4), seed);
      const cup = startPokal(c, 'kreis');
      for (const tie of cup.ties) {
        const d = teamStrength(c, cup, tie.home, tie) - teamStrength(c, cup, tie.away, tie);
        if (Math.abs(d) <= 5) continue;
        for (let k = 0; k < 20; k++) {
          const t = { ...tie, result: null, pens: null };
          quickTie(c, cup, t, rng);
          strongGames++;
          if (tieWinner(t) === (d > 0 ? t.home : t.away)) strongWins++;
        }
      }
    }
    expect(strongGames).toBeGreaterThan(200);
    expect(strongWins / strongGames).toBeGreaterThan(0.65); // Modell gemessen ~0,7–0,8
  });
});
