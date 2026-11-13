// Trainer-Rivale (career/coachrival.js): entsteht aus Niederlagen, führt Bilanz, folgt in eine neue Liga, zwei Ereignisse.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { rolledEventIds } from '../src/career/events.js';
import { board } from '../src/career/pressure.js';
import * as cr from '../src/career/coachrival.js';

const me = (c) => humanClub(c).id;
// Spielt eine Runde: eigenes Ergebnis [für, gegen], alle anderen 1:1. Gibt den Gegner zurück.
function play(c, gf, ga) {
  let opp = null;
  for (const f of c.fixtures[c.round]) {
    const own = f.home === me(c) || f.away === me(c);
    if (!own) f.result = { home: 1, away: 1 };
    else {
      opp = f.home === me(c) ? f.away : f.home;
      f.result = f.home === me(c) ? { home: gf, away: ga } : { home: ga, away: gf };
    }
  }
  finishRound(c);
  return opp;
}
// Nächstes eigenes Spiel so drehen, dass es gegen `id` geht.
function faceNext(c, id) {
  const f = c.fixtures[c.round].find((x) => x.home === me(c) || x.away === me(c));
  if (f.home === me(c)) f.away = id; else f.home = id;
}

describe('Trainer-Rivale', () => {
  it('entsteht nicht aus einer knappen Niederlage, aber aus einer deutlichen – mit Namen und Meldung', () => {
    const c = createCareer({ seed: 9 });
    play(c, 0, 1);
    expect(cr.nemesis(c)).toBe(null);
    play(c, 2, 2);
    expect(cr.nemesis(c)).toBe(null);
    const opp = play(c, 0, 3);
    const n = cr.nemesis(c);
    expect(n.club).toBe(opp);
    expect(n.name.split(' ').length).toBeGreaterThanOrEqual(2);
    expect([n.w, n.d, n.l]).toEqual([0, 0, 1]);
    expect(c.pendingNews.some((t) => t.includes(n.name))).toBe(true);
  });

  it('entsteht auch, wenn derselbe Verein in einer Saison zweimal knapp gewinnt', () => {
    const c = createCareer({ seed: 9 });
    const opp = play(c, 0, 1);
    expect(cr.nemesis(c)).toBe(null);
    faceNext(c, opp);
    play(c, 1, 2);
    expect(cr.nemesis(c)?.club).toBe(opp);
  });

  it('führt Bilanz: Sieg hebt die Stimmung, Niederlage drückt sie; kein zweiter Rivale', () => {
    const c = createCareer({ seed: 9 });
    const opp = play(c, 0, 3);
    faceNext(c, opp);
    expect(cr.facesNemesis(c)).toBe(true);
    const m0 = c.mood;
    play(c, 2, 0);
    expect(c.mood).toBeGreaterThan(m0);
    expect([c.nemesis.w, c.nemesis.d, c.nemesis.l]).toEqual([1, 0, 1]);
    const other = play(c, 0, 4);
    expect(other).not.toBe(opp);
    expect(c.nemesis.club).toBe(opp);
  });

  it('folgt in eine neue Liga: irgendwann übernimmt er einen Verein dort', () => {
    const c = createCareer({ seed: 9 });
    play(c, 0, 3);
    const name = c.nemesis.name;
    c.nemesis.club = 'weg'; // nicht mehr in dieser Liga
    let seasons = 0;
    while (!cr.nemesisHere(c) && seasons < 12) {
      c.season++;
      seasons++;
      cr.nextSeason(c);
    }
    expect(cr.nemesisHere(c)).toBe(true);
    expect(c.nemesis.name).toBe(name);
    expect(c.clubs.find((x) => x.id === c.nemesis.club).human).toBeFalsy();
    expect(c.pendingNews.some((t) => t.includes(name) && t.includes(c.nemesis.clubName))).toBe(true);
  });

  it('Ereignisse: Stichelei nur vor dem Duell, Handschlag nur direkt danach und nur einmal', () => {
    for (const id of Object.keys(cr.NEMESIS_EVENTS)) expect(rolledEventIds()).toContain(id);
    const c = createCareer({ seed: 9 });
    expect(cr.NEMESIS_EVENTS.tr_stichelei.needs(c)).toBe(null);
    const opp = play(c, 0, 3);
    expect(cr.NEMESIS_EVENTS.tr_handschlag.needs(c)).toBe(null); // beim Entstehen noch kein Handschlag
    expect(cr.NEMESIS_EVENTS.tr_stichelei.needs(c)).toBe(null); // nächster Gegner ist ein anderer
    faceNext(c, opp);
    const s = cr.NEMESIS_EVENTS.tr_stichelei;
    const ctx = s.needs(c);
    expect(s.text(c, ctx)).toContain(c.nemesis.name);
    board(c).trust = 50;
    s.options[2].effect(c, ctx, createRng(1));
    expect(board(c).trust).toBe(51);
    play(c, 1, 0);
    const h = cr.NEMESIS_EVENTS.tr_handschlag;
    const hctx = h.needs(c);
    expect(hctx.result).toBe(1);
    expect(h.text(c, hctx)).toContain('1:0');
    for (const o of h.options) expect(typeof o.effect({ ...c, nemesis: structuredClone(c.nemesis), board: { trust: 50 } }, hctx, createRng(1))).toBe('string');
    h.options[0].effect(c, hctx, createRng(1));
    expect(h.needs(c)).toBe(null);
  });
});
