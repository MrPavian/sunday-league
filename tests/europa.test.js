import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { midweekGap, pokalDue, pokalEligible, humanTie, preparePokalMatch, POKALE } from '../src/career/pokal.js';
import { EURO_KINDS, EURO_NAMES, EURO_PRIZES, euroOf, euroSeasonEnd, euroSlots, euroTable, playSlot, startEuro } from '../src/career/europa.js';
import { EURO_POOL } from '../src/career/europadata.js';

const me = (c) => humanClub(c).id;
const play = (c, mine = 2, theirs = 0) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me(c) ? { home: mine, away: theirs } : f.away === me(c) ? { home: theirs, away: mine } : { home: 1, away: 1 };
    finishRound(c);
  }
};
const qualified = (seed, kind = 'eu1') => {
  const c = createCareer({ seed });
  c.level = 12;
  c.euroQual = { season: c.season, kind, domestic: { eu1: [], eu2: [], eu3: [] } };
  return c;
};
const strong = (c) => {
  for (const i of humanClub(c).squad) c.players[i].delta = Object.fromEntries(['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'].map((k) => [k, 3]));
};

describe('Europapokal', () => {
  it('drei erfundene Wettbewerbe mit den Prämien aus dem UEFA-Rundschreiben 32/2025', () => {
    expect(EURO_KINDS).toEqual(['eu1', 'eu2', 'eu3']);
    for (const k of EURO_KINDS) {
      expect(POKALE[k].name).toBe(EURO_NAMES[k]);
      expect(EURO_NAMES[k]).not.toMatch(/Champions|Europa League|Conference|UEFA/);
    }
    expect(EURO_PRIZES.eu1).toMatchObject({ start: 18620000, win: 2100000, draw: 700000, r16: 11000000, qf: 12500000, sf: 15000000, f: 18500000, winner: 6500000 });
    expect(EURO_PRIZES.eu2).toMatchObject({ start: 4310000, win: 450000, draw: 150000, winner: 6000000 });
    expect(EURO_PRIZES.eu3).toMatchObject({ start: 3170000, win: 400000, draw: 133000, winner: 3000000 });
    expect(new Set(EURO_POOL.map((x) => x.id)).size).toBe(EURO_POOL.length);
  });

  it('17 Termine: dienstags und donnerstags, nie in der Winterpause, Endspiel am Donnerstag der letzten Woche', () => {
    const slots = euroSlots(10);
    expect(slots).toHaveLength(17);
    expect(slots[0]).toMatchObject({ week: 0, day: 'thu', stage: 'lp', md: 0 });
    expect(slots.some((s) => s.week === 5)).toBe(false);
    expect(slots.at(-1)).toMatchObject({ week: 9, day: 'thu', stage: 'f' });
    const perWeek = {};
    for (const s of slots) perWeek[s.week] = (perWeek[s.week] ?? 0) + 1;
    expect(Math.max(...Object.values(perWeek))).toBe(2);
    expect(slots.filter((s) => s.stage === 'lp')).toHaveLength(8);
    expect(midweekGap('eu1', 'eu1', 'tue', 'thu')).toBe(46);
    expect(midweekGap('eu1', 'bund', 'thu')).toBeCloseTo(40.5, 6);
  });

  it('Ligaphase: 36 Vereine, je 8 Gegner – aus jedem Topf zwei (einmal heim, einmal auswärts), nie dasselbe Land, kein Gegner doppelt', () => {
    for (const [seed, kind] of [[1, 'eu1'], [2, 'eu2'], [3, 'eu3'], [4, 'eu1']]) {
      const c = qualified(seed, kind);
      const cup = startEuro(c);
      expect(cup.field).toHaveLength(36);
      const pot = Object.fromEntries(cup.field.map((f) => [f.id, f.pot]));
      const land = Object.fromEntries(cup.field.map((f) => [f.id, f.country]));
      const seen = Object.fromEntries(cup.field.map((f) => [f.id, { h: [0, 0, 0, 0], a: [0, 0, 0, 0], opp: new Set() }]));
      for (const day of cup.lp.days) {
        expect(day).toHaveLength(18);
        expect(new Set(day.flatMap((g) => [g.home, g.away])).size).toBe(36);
        for (const g of day) {
          expect(land[g.home]).not.toBe(land[g.away]);
          expect(seen[g.home].opp.has(g.away)).toBe(false);
          seen[g.home].opp.add(g.away);
          seen[g.away].opp.add(g.home);
          seen[g.home].h[pot[g.away]]++;
          seen[g.away].a[pot[g.home]]++;
        }
      }
      for (const s of Object.values(seen)) {
        expect(s.h).toEqual([1, 1, 1, 1]);
        expect(s.a).toEqual([1, 1, 1, 1]);
      }
      // Eigene Spiele: alle acht als Termine angelegt, Gegner mit echtem Kader.
      expect(cup.ties).toHaveLength(8);
      expect(cup.guests.every((g) => g.squad.length >= 18)).toBe(true);
    }
  });

  it('Startgeld sofort, Prämien nur für den eigenen Verein; ausgeschieden wird der Rest gleich ausgespielt', () => {
    const c = qualified(21, 'eu2');
    const cash = c.cash;
    const cup = startEuro(c);
    expect(c.cash - cash).toBe(EURO_PRIZES.eu2.start);
    while (!cup.done) playSlot(c, cup, cup.cursor);
    expect(cup.winner).toBeTruthy();
    expect(c.cash - cash).toBe(cup.earned);
    const ledger = c.ledger.filter((l) => String(l.text).startsWith(EURO_NAMES.eu2)).reduce((s, l) => s + l.amount, 0);
    expect(ledger).toBe(cup.earned);
    // Tabelle: 8 Spiele für jeden, Punkte = 3 × Siege + Remis.
    for (const r of euroTable(c, cup)) {
      expect(r.p).toBe(8);
      expect(r.pts).toBe(3 * r.w + r.d);
    }
    // Gäste verlassen den Spielstand wieder.
    expect(cup.guests.every((g) => g.squad.every((i) => !c.players[i]))).toBe(true);
  });

  it('K.-o.-Runden: Play-offs 9–24, Achtelfinale mit den besten acht, Hin- und Rückspiel, Endspiel neutral', () => {
    const c = qualified(31, 'eu1');
    strong(c);
    const cup = startEuro(c);
    while (!cup.done) playSlot(c, cup, cup.cursor);
    expect(cup.ko.po).toHaveLength(8);
    expect(cup.ko.r16).toHaveLength(8);
    expect(cup.ko.qf).toHaveLength(4);
    expect(cup.ko.sf).toHaveLength(2);
    expect(cup.ko.f).toHaveLength(1);
    const pos = (id) => cup.final.indexOf(id) + 1;
    for (const t of cup.ko.po) {
      expect(pos(t.a)).toBeGreaterThanOrEqual(9);
      expect(pos(t.a)).toBeLessThanOrEqual(16);
      expect(pos(t.b)).toBeGreaterThanOrEqual(17);
      expect(pos(t.b)).toBeLessThanOrEqual(24);
      expect(t.legs[0].home).toBe(t.b); // Hinspiel beim Ungesetzten
      expect(t.legs[1].home).toBe(t.a); // Rückspiel beim Gesetzten
    }
    expect(cup.ko.r16.map((t) => pos(t.a)).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(cup.ko.f[0].legs).toHaveLength(1);
    // Der starke eigene Verein kommt weit; jede seiner Runden hat Hin- und Rückspiel als eigene Termine.
    expect(pos(me(c))).toBeLessThanOrEqual(8);
    const ko = cup.ties.filter((t) => t.stage !== 'lp');
    expect(ko.length).toBeGreaterThanOrEqual(2);
    for (const st of ['r16', 'qf', 'sf']) {
      const legs = ko.filter((t) => t.stage === st);
      if (legs.length) expect(legs.map((t) => t.leg)).toEqual([0, 1]);
    }
    expect(['win', 'f', 'sf', 'qf', 'r16']).toContain(cup.reached ?? 'win');
  });

  it('Rückspiel: das Hinspiel zählt im Spiel mit (Gesamtergebnis), danach Verlängerung und Elfmeterschießen', () => {
    const c = qualified(31, 'eu1');
    strong(c);
    const cup = startEuro(c);
    while (!cup.done && !cup.ties.some((t) => t.stage === 'r16' && t.leg === 1 && t.slot === cup.cursor)) playSlot(c, cup, cup.cursor);
    const tie = cup.ties.find((t) => t.slot === cup.cursor);
    const first = cup.ties.find((t) => t.stage === tie.stage && t.leg === 0);
    c.round = cup.slots[cup.cursor].week;
    const p = preparePokalMatch(c, 'eu1', tie, { duration: 60 });
    expect(p.match.knockout).toBe(true);
    // Team 0 = Heimmannschaft des Rückspiels (ohne menschliche Steuerung); ihre Hinspieltore sind die Auswärtstore des Hinspiels.
    expect(p.match.aggregate).toEqual([first.result.away, first.result.home]);
    expect(p.match.midweek).toBe(true);
  });

  it('Startplätze aus der 1. Liga: Platz 1–2 oberster, 3 zweiter, 4 dritter Wettbewerb; Platz 5 nichts', () => {
    const c = createCareer({ seed: 41 });
    c.level = 12;
    const rows = [...c.clubs].map((club) => ({ club }));
    const order = (humanPos) => {
      const others = rows.filter((r) => !r.club.human);
      const out = [...others];
      out.splice(humanPos - 1, 0, rows.find((r) => r.club.human));
      return out;
    };
    for (const [pos, kind] of [[1, 'eu1'], [2, 'eu1'], [3, 'eu2'], [4, 'eu3'], [5, null]]) {
      euroSeasonEnd(c, { pos, level: 12, rows: order(pos) });
      expect(c.euroQual?.kind ?? null).toBe(kind);
      if (kind) {
        expect(c.euroQual.season).toBe(c.season + 1);
        expect(Object.values(c.euroQual.domestic).flat()).toHaveLength(3);
      }
    }
    euroSeasonEnd(c, { pos: 1, level: 11, rows: order(1) });
    expect(c.euroQual).toBeUndefined(); // nur aus der 1. Liga
  });

  it('im Karriereablauf: Meister der 1. Liga spielt in der nächsten Saison mit, das erste Spiel am Donnerstag der ersten Woche; kein Landespokal für Profis', () => {
    const c = createCareer({ seed: 11 });
    c.level = 12;
    play(c);
    nextSeason(c);
    expect(c.euroQual).toMatchObject({ season: c.season, kind: 'eu1' });
    const cup = euroOf(c);
    expect(cup).toBeTruthy();
    expect(c.cash).toBeGreaterThan(0);
    expect(pokalDue(c)).toBe('eu1');
    expect(humanTie(c, 'eu1').day).toBe('thu');
    expect(pokalEligible(c, 'land')).toBe(false);
    expect(pokalEligible({ ...c, level: 10 }, 'land')).toBe(true);
    // Ohne eigene Spiele: die Termine werden zu Wochenbeginn ohne uns gewertet; am Saisonende ist alles gespielt.
    play(c);
    expect(euroOf(c).ties.filter((t) => t.stage === 'lp').every((t) => t.result)).toBe(true);
    nextSeason(c);
    expect(c.euroHistory.at(-1)).toMatchObject({ season: c.season - 1, kind: 'eu1' });
    expect(c.achievements.europa).toBeTruthy();
  }, 60000);
});
