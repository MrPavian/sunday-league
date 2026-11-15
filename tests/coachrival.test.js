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
    expect([c.coachRival.w, c.coachRival.d, c.coachRival.l]).toEqual([1, 0, 1]);
    const other = play(c, 0, 4);
    expect(other).not.toBe(opp);
    expect(c.coachRival.club).toBe(opp);
  });

  it('folgt in eine neue Liga: irgendwann übernimmt er einen Verein dort', () => {
    const c = createCareer({ seed: 9 });
    play(c, 0, 3);
    const name = c.coachRival.name;
    c.coachRival.club = 'weg'; // nicht mehr in dieser Liga
    let seasons = 0;
    while (!cr.nemesisHere(c) && seasons < 12) {
      c.season++;
      seasons++;
      cr.nextSeason(c);
    }
    expect(cr.nemesisHere(c)).toBe(true);
    expect(c.coachRival.name).toBe(name);
    expect(c.clubs.find((x) => x.id === c.coachRival.club).human).toBeFalsy();
    expect(c.pendingNews.some((t) => t.includes(name) && t.includes(c.coachRival.clubName))).toBe(true);
  });

  it('lässt die Angstgegner (c.nemesis, memory.js) in Ruhe', () => {
    const c = createCareer({ seed: 9 });
    c.nemesis = { 5: 3 };
    play(c, 0, 3);
    expect(cr.nemesis(c)).not.toBe(null);
    expect(c.nemesis).toEqual({ 5: 3 });
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
    expect(s.text(c, ctx)).toContain(c.coachRival.name);
    board(c).trust = 50;
    s.options[2].effect(c, ctx, createRng(1));
    expect(board(c).trust).toBe(51);
    play(c, 1, 0);
    const h = cr.NEMESIS_EVENTS.tr_handschlag;
    const hctx = h.needs(c);
    expect(hctx.result).toBe(1);
    expect(h.text(c, hctx)).toContain('1:0');
    for (const o of h.options) expect(typeof o.effect({ ...c, coachRival: structuredClone(c.coachRival), board: { trust: 50 } }, hctx, createRng(1))).toBe('string');
    h.options[0].effect(c, hctx, createRng(1));
    expect(h.needs(c)).toBe(null);
  });
});

describe('Gesicht des Trainer-Rivalen', () => {
  const { rivalLook } = cr;
  it('fest aus dem Namen, mit Haut- und Haarfarbe; ohne Rivalen keins', () => {
    const a = rivalLook({ name: 'Ralf Brenner' });
    expect(a).toEqual(rivalLook({ name: 'Ralf Brenner' }));
    expect(typeof a.skin).toBe('number');
    expect(typeof a.hair).toBe('number');
    const looks = new Set(['Ralf Brenner', 'Jens Wolter', 'Kai Lührs', 'Uwe Pohl', 'Timo Rist', 'Sven Kraus'].map((n) => JSON.stringify(rivalLook({ name: n }))));
    expect(looks.size).toBeGreaterThan(2);
    expect(rivalLook(null)).toBe(null);
  });
});

describe('Rivalität: Hitze im Spiel, Abwerben, Lehrgang (2026-11-15)', () => {
  const { NEMESIS, NEMESIS_EVENTS, hotDuel } = cr;
  const withRival = (heat) => {
    const c = createCareer({ seed: 9 });
    const me = humanClub(c).id;
    const f = c.fixtures[c.round].find((x) => x.home === me || x.away === me);
    const opp = c.clubs.find((x) => x.id === (f.home === me ? f.away : f.home));
    c.coachRival = { name: 'Ralf Brenner', club: opp.id, clubName: opp.name, since: 1, w: 0, d: 0, l: 1, heat, notes: [] };
    return c;
  };
  it('ab der Hitzegrenze ist das Duell hitzig wie ein Derby, darunter nicht', () => {
    expect(hotDuel(withRival(NEMESIS.hot - 1))).toBe(false);
    expect(hotDuel(withRival(NEMESIS.hot))).toBe(true);
  });
  it('Abwerben erst ab der Hitze dafür; jede Antwort läuft und heizt an', () => {
    expect(NEMESIS_EVENTS.tr_abwerben.needs(withRival(NEMESIS.poachHeat - 1), createRng(1))).toBe(null);
    for (let i = 0; i < 3; i++) {
      const c = withRival(NEMESIS.poachHeat);
      const ctx = NEMESIS_EVENTS.tr_abwerben.needs(c, createRng(1));
      expect(ctx).not.toBe(null);
      expect(NEMESIS_EVENTS.tr_abwerben.options[i].effect(c, ctx, createRng(i + 2)).length).toBeGreaterThan(20);
      expect(c.coachRival.heat).toBeGreaterThan(NEMESIS.poachHeat);
    }
  });
  it('Lehrgang: jede Antwort läuft', () => {
    for (let i = 0; i < 2; i++) {
      const c = withRival(2);
      c.round = 5;
      const ctx = NEMESIS_EVENTS.tr_lehrgang.needs(c, createRng(1));
      expect(ctx).not.toBe(null);
      expect(NEMESIS_EVENTS.tr_lehrgang.options[i].effect(c, ctx, createRng(3)).length).toBeGreaterThan(20);
    }
  });
});
