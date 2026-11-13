// Pressekonferenz ab der Regionalliga (career/presse.js): Spitzenspiel mit Ansage und Nachfrage, Siegesserie, Personalfrage.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, table } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { board } from '../src/career/pressure.js';
import { PRESS_EVENTS, PRESS_FROM, recentResults } from '../src/career/presse.js';
import { rolledEventIds } from '../src/career/events.js';

const me = (c) => humanClub(c).id;
// Spielt Runden: Die eigene Mannschaft bekommt die Ergebnisse aus `mine` (1 Sieg, 0 Remis, −1 Niederlage), alle anderen 1:1.
function play(c, mine) {
  for (const r of mine) {
    for (const f of c.fixtures[c.round]) {
      const own = f.home === me(c) || f.away === me(c);
      const res = !own ? [1, 1] : r === 1 ? [2, 0] : r === 0 ? [1, 1] : [0, 2];
      f.result = !own || f.home === me(c) ? { home: res[0], away: res[1] } : { home: res[1], away: res[0] };
    }
    finishRound(c);
  }
}
const pro = (seed = 5) => {
  const c = createCareer({ seed });
  c.level = PRESS_FROM;
  return c;
};
const run = (id, c, option, seed = 1) => {
  const ev = PRESS_EVENTS[id];
  const ctx = ev.needs(c, createRng(seed));
  expect(ctx, `${id} nicht möglich`).not.toBe(null);
  expect(ev.text(c, ctx).length).toBeGreaterThan(20);
  return { ctx, text: ev.options[option].effect(c, ctx, createRng(seed)) };
};

describe('Pressekonferenz', () => {
  it('ist im Wochen-Zufall eingetragen und kommt erst ab der Regionalliga', () => {
    for (const id of Object.keys(PRESS_EVENTS)) expect(rolledEventIds()).toContain(id);
    const low = createCareer({ seed: 5 });
    play(low, [1, 1, 1, 1]);
    expect(PRESS_EVENTS.pk_serie.needs(low)).toBe(null);
    expect(PRESS_EVENTS.pk_spitzenspiel.needs(low)).toBe(null);
  });

  it('letzte Ergebnisse, jüngstes zuerst', () => {
    const c = pro();
    play(c, [1, 0, -1, 1]);
    expect(recentResults(c, 3)).toEqual([1, -1, 0]);
  });

  it('Siegesserie: ab drei Siegen, einmal je Saison; „von Spiel zu Spiel“ bringt Rückhalt', () => {
    const c = pro();
    play(c, [1, 1]);
    expect(PRESS_EVENTS.pk_serie.needs(c)).toBe(null);
    play(c, [1]);
    board(c).trust = 50;
    const { ctx } = run('pk_serie', c, 1);
    expect(ctx.n).toBe(3);
    expect(board(c).trust).toBe(51);
    c.eventLog.push({ id: 'pk_serie', season: c.season, round: c.round });
    expect(PRESS_EVENTS.pk_serie.needs(c)).toBe(null);
  });

  it('Spitzenspiel: große Ansage wird eine Woche später nachgefragt – Sieg lohnt sich, Niederlage kostet', () => {
    for (const [result, sign] of [[1, 1], [-1, -1]]) {
      const c = pro(7);
      play(c, [1, 1, 1]);
      // Gegner des nächsten Spiels künstlich nach oben setzen: Er hat alle Spiele gewonnen.
      const f = humanFixture(c);
      const opp = f.home === me(c) ? f.away : f.home;
      for (const round of c.fixtures.slice(0, c.round)) for (const g of round) if (g.home === opp && g.away !== me(c)) g.result = { home: 3, away: 0 }; else if (g.away === opp && g.home !== me(c)) g.result = { home: 0, away: 3 };
      expect(table(c).findIndex((r) => r.club.id === opp) + 1).toBeLessThanOrEqual(4);
      const mood0 = c.mood ?? 0;
      run('pk_spitzenspiel', c, 0);
      expect(c.mood).toBeGreaterThan(mood0);
      expect(c.flags.pkBoast).toBeTruthy();
      expect(PRESS_EVENTS.pk_spitzenspiel.needs(c)).toBe(null); // nicht zweimal
      expect(PRESS_EVENTS.pk_nachfrage.needs(c)).toBe(null); // erst nach dem Spiel
      play(c, [result]);
      board(c).trust = 50;
      const { ctx } = run('pk_nachfrage', c, 0);
      expect(ctx.result).toBe(result);
      expect(Math.sign(board(c).trust - 50)).toBe(sign);
      expect(c.flags.pkBoast).toBeUndefined();
      expect(PRESS_EVENTS.pk_nachfrage.needs(c)).toBe(null);
    }
  });

  it('Personalfrage: nur mit einem Unzufriedenen; sich vor ihn stellen nimmt den Groll', () => {
    const c = pro();
    play(c, [0, 0, 0, 0]);
    expect(PRESS_EVENTS.pk_personal.needs(c, createRng(1))).toBe(null);
    const idx = humanClub(c).squad.find((i) => i !== c.coach?.idx);
    c.players[idx].grumpy = 2;
    const { ctx } = run('pk_personal', c, 0);
    expect(ctx.s).toBe(idx);
    expect(c.players[idx].grumpy).toBe(0);
  });
});
