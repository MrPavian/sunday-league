import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver, simulateSync } from '../src/career/career.js';
import { matchDate } from '../src/career/calendar.js';
import { abandonSummerCup, advanceCup, CUPS, cupOf, currentCupMatches, groupTable, hostCost, humanCupMatch, prepareCupMatch, recordCupResult, startSummerCup, startTournament, summerCupDue, summerCupRunning, summerOffer } from '../src/career/tournament.js';

function play(c, kind = 'sommer', duration = 24) {
  let guard = 0;
  while (cupOf(c, kind).stage !== 'done' && guard++ < 10) {
    for (const m of currentCupMatches(c, kind)) {
      const prepared = prepareCupMatch(c, m, { duration });
      simulateSync(prepared);
      recordCupResult(c, m, prepared);
    }
    advanceCup(c, kind);
  }
  return cupOf(c, kind);
}

describe('Sommerturnier', () => {
  it('structure for 4, 6 and 8 teams: groups, knockout, one winner', () => {
    const expected = { 4: { groups: [4], group: 6, sf: 0 }, 6: { groups: [3, 3], group: 6, sf: 2 }, 8: { groups: [4, 4], group: 12, sf: 2 } };
    for (const size of [4, 6, 8]) {
      const c = createCareer({ seed: 700 + size });
      c.cash = 500;
      const t = startSummerCup(c, 'host', size);
      expect(t.size).toBe(size);
      expect(t.groups.map((g) => g.length)).toEqual(expected[size].groups);
      expect(t.groups[0]).toContain(humanClub(c).id);
      expect(new Set(t.groups.flat()).size).toBe(size);
      expect(t.matches.filter((m) => m.stage === 'A' || m.stage === 'B')).toHaveLength(expected[size].group);
      play(c);
      expect(t.matches.filter((m) => m.stage === 'SF')).toHaveLength(expected[size].sf);
      expect(t.matches.filter((m) => m.stage === 'F')).toHaveLength(1);
      expect(t.winner).toBeTruthy();
      expect(t.stage).toBe('done');
      for (const g of t.guests) for (const idx of g.squad) expect(c.players[idx]).toBeUndefined(); // Gäste gehen wieder
    }
  }, 120000);

  it('knockout draws go to penalties and always have a winner', () => {
    const c = createCareer({ seed: 710 });
    c.cash = 500;
    startSummerCup(c, 'host', 8);
    const t = play(c, 'sommer', 8); // so kurz, dass viele 0:0 enden
    const ko = t.matches.filter((m) => m.stage === 'SF' || m.stage === 'F');
    expect(ko).toHaveLength(3);
    for (const m of ko) {
      if (m.result.home === m.result.away) expect(m.pens.home).not.toBe(m.pens.away);
      else expect(m.pens).toBeUndefined();
    }
    expect(ko.some((m) => m.pens)).toBe(true);
  }, 60000);

  it('group table tie-break: points, goal difference, goals, head-to-head, then a fixed draw', () => {
    const c = createCareer({ seed: 711 });
    const t = startSummerCup(c, 'host', 4);
    const [A, B, C, D] = t.groups[0];
    // Ergebnis zweier Teams festlegen (gleich, wer Heimrecht hat): goals = [Tore von x, Tore von y].
    const set = (x, y, goals) => {
      const m = t.matches.find((q) => (q.home === x && q.away === y) || (q.home === y && q.away === x));
      m.result = m.home === x ? { home: goals[0], away: goals[1] } : { home: goals[1], away: goals[0] };
    };
    const reset = () => t.matches.forEach((m) => (m.result = { home: 0, away: 0 }));
    // A schlägt B (1:0), C schlägt A (1:0), B schlägt D (1:0), sonst 0:0: A und B haben 4 Punkte, 1:1 Tore.
    reset();
    set(A, B, [1, 0]);
    set(C, A, [1, 0]);
    set(B, D, [1, 0]);
    const rows = groupTable(c, 0, 'sommer');
    const [ra, rb] = [rows.find((r) => r.id === A), rows.find((r) => r.id === B)];
    expect([ra.pts, ra.gf - ra.ga, ra.gf]).toEqual([rb.pts, rb.gf - rb.ga, rb.gf]);
    expect(rows.findIndex((r) => r.id === A)).toBeLessThan(rows.findIndex((r) => r.id === B)); // A gewann das direkte Duell
    // Umgekehrt: Wer das Duell gewinnt, steht vorn.
    reset();
    set(B, A, [1, 0]);
    set(C, B, [1, 0]);
    set(A, D, [1, 0]);
    const rows2 = groupTable(c, 0, 'sommer');
    expect(rows2.findIndex((r) => r.id === B)).toBeLessThan(rows2.findIndex((r) => r.id === A));
    // Alles 0:0: die Reihenfolge ist trotzdem festgelegt und wiederholbar (Los).
    reset();
    const o1 = groupTable(c, 0, 'sommer').map((r) => r.id);
    expect(groupTable(c, 0, 'sommer').map((r) => r.id)).toEqual(o1);
    expect(new Set(o1).size).toBe(4);
    // Tordifferenz schlägt direkten Vergleich: D gewinnt hoch gegen C, verliert knapp gegen A.
    reset();
    set(D, C, [3, 0]);
    expect(groupTable(c, 0, 'sommer')[0].id).toBe(D);
  });

  it('hosting costs money up front, brings bar and entry fees, pays no prize to itself', () => {
    const c = createCareer({ seed: 712 });
    const cash0 = c.cash;
    const t = startSummerCup(c, 'host', 6);
    expect(t.host).toBe(true);
    expect(cash0 - c.cash).toBe(hostCost(c, 6));
    play(c);
    expect(t.theke).toBeGreaterThan(0);
    expect(t.fees).toBeGreaterThan(0);
    expect(c.ledger.some((l) => /Theke beim Sommerturnier|Bar at the summer/.test(l.text))).toBe(true);
    expect(c.ledger.some((l) => /Preisgeld|Prize money/.test(l.text))).toBe(false);
    expect(c.cash).toBeCloseTo(cash0 - hostCost(c, 6) + t.theke + t.fees, 2);
  }, 60000);

  it('hosting needs the cash; the invitation does not', () => {
    const c = createCareer({ seed: 713 });
    c.cash = 20;
    expect(summerOffer(c).canHost).toBe(false);
    expect(startSummerCup(c, 'host', 6)).toBeNull();
    expect(cupOf(c, 'sommer')).toBeNull();
    const t = startSummerCup(c, 'invite');
    expect(t.host).toBe(false);
    expect(c.cash).toBe(20);
    expect(t.place).toMatch(/Sportplatz/);
  });

  it('invitation pays prize money by result; trophy and newspaper line on a win', () => {
    let won = null;
    let lost = null;
    for (let seed = 720; seed < 790 && !(won && lost); seed++) {
      const c = createCareer({ seed });
      const cash0 = c.cash;
      startSummerCup(c, 'invite');
      const t = play(c, 'sommer', 60);
      const me = humanClub(c).id;
      const gained = c.cash - cash0;
      if (t.winner === me) won ??= { c, gained, t };
      else if (!t.matches.some((m) => m.stage === 'F' && (m.home === me || m.away === me))) lost ??= { c, gained };
    }
    if (won) {
      expect(won.gained).toBe(CUPS.sommer.prizes.winner);
      expect(won.c.trophies.at(-1).name).toContain(CUPS.sommer.name);
    }
    if (lost) expect(lost.gained).toBeLessThanOrEqual(CUPS.sommer.prizes.semi);
    expect(won || lost).toBeTruthy();
  }, 240000);

  it('is played with short matches', () => {
    const c = createCareer({ seed: 714 });
    startSummerCup(c, 'host', 4);
    const m = humanCupMatch(c, 'sommer');
    const sommer = prepareCupMatch(c, m, {});
    const c2 = createCareer({ seed: 714 });
    startTournament(c2, 'stadt');
    const stadt = prepareCupMatch(c2, humanCupMatch(c2, 'stadt'), {});
    expect(sommer.match.duration).toBeLessThan(stadt.match.duration);
    expect(sommer.pitch.id).toBe(humanClub(c).venue);
  });

  it('calendar: due before the first matchday only; league schedule untouched; a started cup ends with the first matchday', () => {
    const c = createCareer({ seed: 715 });
    const fixtures = JSON.stringify(c.fixtures);
    const dates = c.fixtures.map((_, i) => matchDate(c, i));
    expect(summerCupDue(c)).toBe(true);
    startSummerCup(c, 'invite');
    expect(summerCupDue(c)).toBe(false);
    expect(summerCupRunning(c)).toBe(true);
    expect(JSON.stringify(c.fixtures)).toBe(fixtures);
    expect(c.fixtures.map((_, i) => matchDate(c, i))).toEqual(dates);
    expect(c.round).toBe(0);
    finishRound(c); // ohne das Turnier zu Ende zu spielen
    expect(summerCupRunning(c)).toBe(false);
    expect(cupOf(c, 'sommer').skipped).toBe(true);
    expect(summerCupDue(c)).toBe(false);
    for (const g of cupOf(c, 'sommer').guests) for (const idx of g.squad) expect(c.players[idx]).toBeUndefined();
    abandonSummerCup(c); // zweimal ist harmlos
    const d = createCareer({ seed: 716 });
    finishRound(d);
    expect(summerCupDue(d)).toBe(false);
  });

  it('works next to the other cups and the season change', () => {
    const c = createCareer({ seed: 717 });
    startSummerCup(c, 'host', 4);
    play(c);
    while (!seasonOver(c)) finishRound(c);
    startTournament(c, 'stadt');
    expect(cupOf(c, 'stadt')).toBeTruthy();
    expect(cupOf(c, 'sommer')).toBeTruthy();
    nextSeason(c);
    expect(cupOf(c, 'sommer')).toBeNull(); // neue Saison, neues Turnier
    expect(summerCupDue(c)).toBe(true);
  }, 120000);

  it('save and load keep a running tournament; old saves without cups load', () => {
    const c = createCareer({ seed: 718 });
    startSummerCup(c, 'host', 6);
    const m = humanCupMatch(c, 'sommer');
    const p = prepareCupMatch(c, m, { duration: 20 });
    simulateSync(p);
    recordCupResult(c, m, p);
    const loaded = migrateCareer(JSON.parse(JSON.stringify(c)));
    expect(cupOf(loaded, 'sommer').size).toBe(6);
    expect(cupOf(loaded, 'sommer').matches.filter((x) => x.result)).toHaveLength(1);
    expect(groupTable(loaded, 0, 'sommer')).toHaveLength(3);
    expect(summerCupRunning(loaded)).toBe(true);
    const old = createCareer({ seed: 719 });
    delete old.cups;
    expect(() => migrateCareer(JSON.parse(JSON.stringify(old)))).not.toThrow();
    expect(summerCupDue(migrateCareer(JSON.parse(JSON.stringify(old))))).toBe(true);
  }, 60000);
});
