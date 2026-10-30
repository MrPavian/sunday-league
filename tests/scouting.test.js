// Scouting (src/career/scouting.js): Stärke fremder Spieler als Spanne, die mit Kenntnis enger wird; eigene genau; Gegner nach dem
// Spiel „gesehen“; Spiel anschauen und Bolzplatz kosten eine Aktion und gehen einmal je Woche.
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, humanClub, playerOf } from '../src/career/career.js';
import { bolzplatz, canBolz, estimate, knowledge, observe, SPREAD, watchClub } from '../src/career/scouting.js';
import { ensureNeighbors, tstate } from '../src/career/transfers.js';

describe('Scouting', () => {
  it('eigene Spieler genau, eigene Liga gesehen, Nachbarliga unbekannt; die echte Zahl liegt immer in der Spanne', () => {
    const c = createCareer({ seed: 11 });
    const me = humanClub(c);
    expect(estimate(c, me.squad[0]).exact).toBe(true);
    const rival = c.clubs.find((x) => !x.human).squad[0];
    expect(knowledge(c, rival)).toBe(1);
    ensureNeighbors(c);
    const far = tstate(c).neighbors[0].squad[0];
    expect(knowledge(c, far)).toBe(0);
    for (const idx of [rival, far]) {
      for (let lv = 0; lv <= 3; lv++) {
        c.scouting = { known: { [idx]: lv }, watched: {} };
        const e = estimate(c, idx);
        const r = playerOf(c, idx).rating;
        expect(e.hi - e.lo).toBe(2 * SPREAD[Math.max(lv, knowledge(c, idx))]);
        expect(r).toBeGreaterThanOrEqual(e.lo);
        expect(r).toBeLessThanOrEqual(e.hi);
        expect(e.traits).toBe(Math.max(lv, knowledge(c, idx)) >= 2);
      }
    }
  });

  it('Spiel anschauen: eine Aktion, einmal je Woche und Verein, alle Spieler genauer', () => {
    const c = createCareer({ seed: 11 });
    const club = c.clubs.find((x) => !x.human);
    const before = c.week.actions;
    expect(watchClub(c, club)).toBeTruthy();
    expect(c.week.actions).toBe(before - 1);
    expect(club.squad.every((i) => knowledge(c, i) >= 2)).toBe(true);
    expect(club.squad.some((i) => knowledge(c, i) === 3)).toBe(true);
    expect(watchClub(c, club)).toBeNull();
  });

  it('Bolzplatz: zwei Vereinslose auf der Gerüchteküche, schon gesehen; einmal je Woche', () => {
    const c = createCareer({ seed: 11 });
    const n = c.week.rumors.length;
    expect(canBolz(c)).toBe(true);
    expect(bolzplatz(c)).toBeTruthy();
    const added = c.week.rumors.slice(n);
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((r) => knowledge(c, r.idx) >= 1)).toBe(true);
    expect(canBolz(c)).toBe(false);
  });

  it('nach dem Spiel kennt man die Gegner (höchstens „gesehen“), Kenntnis steigt nie über 3', () => {
    const c = createCareer({ seed: 11 });
    const me = humanClub(c);
    const f = currentFixtures(c).find((x) => x.home === me.id || x.away === me.id);
    for (const x of currentFixtures(c)) x.result = { home: 1, away: 0 };
    finishRound(c);
    const opp = c.clubs.find((x) => x.id === (f.home === me.id ? f.away : f.home));
    expect(opp.squad.every((i) => knowledge(c, i) >= 1)).toBe(true);
    const idx = opp.squad[0];
    for (let i = 0; i < 6; i++) observe(c, idx, 2);
    expect(knowledge(c, idx)).toBe(3);
  });
});
