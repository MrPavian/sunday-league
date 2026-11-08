import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver, winterRound } from '../src/career/career.js';
import { makeField, nextOwnMatch, prepareNatMatch, qualifiedFrom, quickOwnMatch } from '../src/career/nationalteams.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';
import { hostsOf, planQuali, qualiTable, roundRobin, windowRounds, WINDOWS } from '../src/career/natquali.js';

const play = (c, until = () => false) => {
  while (!seasonOver(c) && !until(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
    finishRound(c);
  }
};
const toSeason = (c, s) => {
  while ((c.season ?? 1) < s) {
    play(c);
    nextSeason(c);
  }
};
const strong = (c, idx) => {
  c.players[idx].delta = Object.fromEntries(['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'].map((k) => [k, 3]));
};

describe('Qualifikation in Länderspielfenstern (Variante 2)', () => {
  it('drei Fenster wie im Kalender 2026–2030 (Sep./Okt. 4, Nov. 2, März 2), zwischen Spieltagen, nie in der Winterpause', () => {
    expect(WINDOWS.map((w) => w.days)).toEqual([4, 2, 2]);
    for (const size of [4, 6, 8]) {
      const c = createCareer({ seed: 3, leagueSize: size });
      const w = windowRounds(c);
      expect(w.reduce((s, x) => s + x.days, 0)).toBe(8);
      const rounds = w.map((x) => x.round);
      expect([...rounds].sort((a, b) => a - b)).toEqual(rounds);
      expect(new Set(rounds).size).toBe(rounds.length);
      for (const r of rounds) {
        expect(r).toBeGreaterThan(0);
        expect(r).not.toBe(winterRound(c));
        expect(r).toBeLessThan(c.fixtures.length);
      }
    }
  });

  it('Spielplan: Hin- und Rückspiel, jeder einmal je Spieltag', () => {
    for (const ids of [['a', 'b', 'c', 'd'], ['a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e']]) {
      const days = roundRobin(ids);
      const pairs = {};
      for (const day of days) {
        const seen = new Set(day.flat());
        expect(seen.size).toBe(day.length * 2);
        for (const [h, a] of day) pairs[`${h}-${a}`] = (pairs[`${h}-${a}`] ?? 0) + 1;
      }
      for (const h of ids) for (const a of ids) if (h !== a) expect(pairs[`${h}-${a}`]).toBe(1);
    }
  });

  it('Gastgeber: Weltmeisterschaft 2030 alle sechs automatisch, Europameisterschaft 2028 mit zwei reservierten Plätzen', () => {
    expect(hostsOf('wm', 2030).auto).toEqual(['esp', 'por', 'mar', 'arg', 'uru', 'par']);
    expect(hostsOf('em', 2028)).toMatchObject({ auto: [], slots: 2 });
    expect(hostsOf('wm', 2042).auto).toEqual([]); // unbekannt: nichts erfunden
    const c = createCareer({ seed: 5 });
    const { field } = makeField(c, 'wm', 2030);
    for (const nid of hostsOf('wm', 2030).auto) expect(field).toContain(nid);
    expect(field).toHaveLength(48);
    // Reservierte Plätze: Gastgeber, die es nicht geschafft haben, rücken für die letzten Plätze nach (höchstens zwei).
    const tables = [[{ nid: 'a', p: 2, pts: 6, gf: 4, ga: 0 }, { nid: 'h1', p: 2, pts: 0, gf: 0, ga: 4 }], [{ nid: 'b', p: 2, pts: 6, gf: 4, ga: 0 }, { nid: 'h2', p: 2, pts: 0, gf: 0, ga: 3 }], [{ nid: 'd', p: 2, pts: 6, gf: 2, ga: 0 }, { nid: 'h3', p: 2, pts: 0, gf: 0, ga: 2 }]];
    expect(qualifiedFrom(tables, 3, ['h1', 'h2', 'h3'], 2)).toEqual(['a', 'h1', 'h2']);
    expect(qualifiedFrom(tables, 3, ['a', 'h1'], 2)).toEqual(['a', 'b', 'h1']); // wer es geschafft hat, braucht keinen
  });

  it('Saisonplan: alle Spiele in Fenstern, Wintermeisterschaft nur vor der Winterpause; das Turnierfeld kommt aus den gespielten Tabellen', () => {
    const c = createCareer({ seed: 11 });
    toSeason(c, 2); // 2027/28: Europameisterschaft 2028 und Afrikameisterschaft (Dezember 2027)
    const q = c.natQuali;
    expect(q.comps.map((x) => x.key)).toEqual(expect.arrayContaining(['em-2028-uefa', 'afr-2027-caf']));
    const before = q.windows[0].days + q.windows[1].days;
    for (const m of q.comps.find((x) => x.id === 'afr').matches) expect(m.day).toBeLessThan(before);
    play(c, (x) => x.round > q.windows.at(-1).round);
    const em = q.comps.find((x) => x.key === 'em-2028-uefa');
    expect(em.matches.every((m) => m.result)).toBe(true);
    const tables = em.groups.map((_, g) => qualiTable(em, g));
    const { field, quali } = makeField(c, 'em', 2028);
    expect(field).toHaveLength(24);
    for (const [g, tb] of tables.entries()) expect(field).toContain(tb[0].nid); // Gruppensieger sind dabei
    expect(quali.uefa.map((g) => g.map((r) => r.nid))).toEqual(tables.map((tb) => tb.map((r) => r.nid)));
  }, 60000);

  it('eigene Spieler: nominiert, Spiel als Karte (ansehen oder Ergebnis), etwas müde, kleiner Marktwert-Schub am Saisonende', () => {
    const c = createCareer({ seed: 11 });
    toSeason(c, 2);
    c.level = 12;
    c.pro = true;
    const idx = humanClub(c).squad[3];
    strong(c, idx);
    (c.natLock ??= {})[idx] = 'ger';
    const w0 = c.natQuali.windows[0].round;
    play(c, (x) => x.round === w0);
    const next = nextOwnMatch(c);
    expect(next?.t.isQuali).toBe(true);
    expect([next.m.home, next.m.away]).toContain('ger');
    const prepared = prepareNatMatch(c, next, { duration: 60 });
    expect(prepared.nat.key).toBe('em-2028-uefa');
    expect(prepared.match.knockout).toBe(false);
    expect(c.players[idx].fitness ?? 1).toBeLessThan(1);
    expect(c.week.chat.some((m) => /Länderspielpause|International break/.test(m.text))).toBe(true);
    // Karte im Vereinsheim: Wettbewerb, Land, Gruppentabelle und die drei Knöpfe.
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = c;
    const html = house.hub();
    expect(html).toContain('data-testid="quali-card"');
    expect(html).toMatch(/Qualifikation zur Europameisterschaft 2028/);
    expect(html).toContain('data-testid="quali-watch"');
    expect(html).toContain('nat-table');
    while (nextOwnMatch(c)?.t.isQuali) quickOwnMatch(c);
    expect(house.hub()).toMatch(/Alle Spiele dieser Länderspielpause sind gespielt/);
    const comp = c.natQuali.comps.find((x) => x.key === 'em-2028-uefa');
    const apps = comp.stats[idx].apps;
    expect(apps).toBeGreaterThan(0);
    const caps = c.players[idx].natCaps ?? 0;
    play(c);
    nextSeason(c); // Turnier im Sommer dazu; die Länderspiele der Qualifikation zählen mit
    expect(c.players[idx].natCaps).toBeGreaterThanOrEqual(caps + apps);
    expect(c.players[idx].natBoost?.v).toBeGreaterThan(0);
  }, 60000);

  it('alter Spielstand mitten in der Saison: keine Fenster, das Turnier spielt die Qualifikation wie bisher beim Start', () => {
    const c = createCareer({ seed: 11 });
    toSeason(c, 2);
    play(c, (x) => x.round > x.natQuali.windows[0].round);
    delete c.natQuali; // Stand vor dieser Lieferung
    play(c, (x) => x.round === x.fixtures.length - 1);
    expect(c.natQuali).toBeUndefined();
    const { field } = makeField(c, 'em', 2028);
    expect(field).toHaveLength(24);
    expect(planQuali(c).comps.length).toBeGreaterThan(0); // neue Saison plant wieder
  }, 60000);
});
