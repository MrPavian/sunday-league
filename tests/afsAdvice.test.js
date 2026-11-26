// AFS Phase 12: Manager-Beratung – Drosselung, eine Handlung, kein Stilvorschlag, Nachfassen (src/intel/advice.js).
import { describe, expect, it } from 'vitest';
import { KEYS } from '../src/sim/analytics.js';
import { ADVICE, adviceTaken, applyAdvice, followUp, opponentHint, weekAdvice } from '../src/intel/advice.js';

// Vereinszeile wie seasonstats.js (xG in Hundertsteln), n Spiele mit diesen Mittelwerten je Spiel.
const club = (n, { pass = 50, passOk = 32, packing = 40, xg = 1.2, xgA = 1.2, att = 300, attA = 300 } = {}) => ({
  n,
  s: KEYS.map((k) => ({ pass, passOk, packing, xg: Math.round(xg * 100) }[k] ?? 0) * n),
  third: [0, 0, att * n],
  attA: attA * n,
  xgA: Math.round(xgA * 100) * n,
});
const league = (clubs, round = 6) => ({
  season: 1,
  round,
  an: { v: 1, keys: KEYS, clubs, history: [] },
  clubs: Object.keys(clubs).map((id) => ({ id, human: id === 'a', tactic: id === 'a' ? { style: 'ausgewogen', systems: {}, orders: {} } : undefined })),
});
// Weitere Spiele mit anderen Mittelwerten an die Vereinszeile anhängen.
const play = (c, n, vals) => {
  const add = club(n, vals);
  c.n += n;
  c.s = c.s.map((x, i) => x + add.s[i]);
  c.third = c.third.map((x, i) => x + add.third[i]);
  c.attA += add.attA;
  c.xgA += add.xgA;
};

describe('Manager-Beratung (AFS Phase 12)', () => {
  it('gibt einen Hinweis mit Beleg und genau einer Handlung – nie einen Stilwechsel', () => {
    const c = league({ a: club(6, { packing: 20 }), b: club(6), c: club(6), d: club(6) });
    const h = weekAdvice(c, 'an');
    expect(h.type).toBe('packing:low');
    expect(h.evidence.n).toBe(6);
    expect(h.action).toEqual({ key: 'build:direkt', group: 'build', value: 'direkt' }); // Kern hätte style:mauern vorn
    expect(weekAdvice(c, 'an')).toBe(h); // gleiche Woche, gleicher Hinweis
  });

  it('Schalter aus: kein Hinweis, nichts gespeichert', () => {
    const c = league({ a: club(6, { packing: 20 }), b: club(6), c: club(6), d: club(6) });
    expect(weekAdvice(c, 'aus')).toBeNull();
    expect(opponentHint(c, 'a', 'aus')).toBeNull();
    expect(c.advice).toBeUndefined();
  });

  it('erst ab 5 Spielen, nicht für einen schon aktiven Befehl', () => {
    expect(weekAdvice(league({ a: club(ADVICE.minN - 1, { packing: 20 }), b: club(4), c: club(4), d: club(4) }), 'an')).toBeNull();
    const c = league({ a: club(6, { packing: 20 }), b: club(6), c: club(6), d: club(6) });
    c.clubs[0].tactic.orders.build = 'direkt';
    expect(weekAdvice(c, 'an')).toBeNull();
  });

  it('drosselt: derselbe Befund frühestens nach 4 Wochen, „selten“ höchstens alle 2 Wochen', () => {
    const vals = { a: { passOk: 20, packing: 12 } };
    const mk = (round) => league({ a: club(8, vals.a), b: club(8), c: club(8), d: club(8) }, round);
    for (const mode of ['an', 'selten']) {
      const c = mk(8);
      expect(weekAdvice(c, mode).type).toBe('packing:low');
      c.round = 9;
      if (mode === 'an') expect(weekAdvice(c, mode)).toMatchObject({ type: 'passPct:low', action: { key: 'route:mitte' } });
      else expect(weekAdvice(c, mode)).toBeNull();
      c.round = 10;
      if (mode === 'selten') expect(weekAdvice(c, mode).type).toBe('passPct:low');
      c.round = 8 + ADVICE.repeatWeeks;
      expect(weekAdvice(c, mode).type).toBe('packing:low');
    }
  });

  it('fasst nach 3 Spielen nach: geholfen, wenn der Wert seither besser ist, sonst noch nicht', () => {
    for (const [after, result] of [[30, 'better'], [16, 'notyet']]) {
      const c = league({ a: club(6, { packing: 20 }), b: club(6), c: club(6), d: club(6) });
      const h = weekAdvice(c, 'an');
      applyAdvice(c, h);
      expect(c.clubs[0].tactic.orders.build).toBe('direkt');
      expect(adviceTaken(c, h)).toBe(true);
      play(c.an.clubs.a, 2, { packing: after });
      c.round = 8;
      expect(followUp(c, 'an')).toBeNull();
      play(c.an.clubs.a, 1, { packing: after });
      c.round = 9;
      const fu = followUp(c, 'an');
      expect(fu).toMatchObject({ result, games: 3, metric: 'packing' });
      expect(fu.after).toBeCloseTo(after / 32, 9);
      expect(followUp(c, 'an')).toBe(fu);
      c.round = 10;
      expect(followUp(c, 'an')).toBeNull(); // nur in der Woche, in der es feststeht
    }
  });

  it('vor dem Spiel: stärkster Befund des Gegners, nur ab 5 Spielen', () => {
    const c = league({ a: club(6), b: club(6, { att: 150, attA: 450 }), c: club(6), d: club(6) });
    expect(opponentHint(c, 'b', 'an')).toMatchObject({ type: 'tilt:low', club: 'b' });
    expect(opponentHint(league({ a: club(4), b: club(4, { att: 150, attA: 450 }), c: club(4) }), 'b', 'an')).toBeNull();
  });
});
