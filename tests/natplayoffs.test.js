// Play-offs der Qualifikation (natplayoffs.js): Formate der Weltmeisterschaft 2026 (Europa, interkontinental) und der
// Europameisterschaft 2028 (mit reservierten Gastgeberplätzen), Hin- und Rückspiel, Ablauf in den Länderspielfenstern.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { makeField, nextOwnMatch, prepareNatMatch, qualiSetup, quickOwnMatch } from '../src/career/nationalteams.js';
import { qualiTables } from '../src/career/natquali.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';
import { NATIONS } from '../src/data/nations.js';
import { advancePlayoffs, INTER, interDraw, playoffDraw, playoffWinners, schedulePlayoffs } from '../src/career/natplayoffs.js';

// 12 Gruppen zu 4: Gruppe i, Platz p → `g${i}p${p}`; je Spiel abgestuft, damit die Rangliste eindeutig ist.
const tables = () => Array.from({ length: 12 }, (_, i) => [0, 1, 2, 3].map((p) => ({ nid: `g${i}p${p}`, p: 6, pts: 18 - p * 4 - (i % 4), gf: 10 - p - i * 0.01, ga: 5 })));
const setup = (places, reserved = [], reservedSlots = 0) => ({ places, reserved, reservedSlots, str: {} });
const c = { seed: 7 };

describe('Play-offs der Qualifikation', () => {
  it('Weltmeisterschaft, Europa: 12 Sieger direkt, 16 Teams in 4 Pfaden (12 Zweite + 4 beste Dritte), Topf 1 gegen 4, 2 gegen 3', () => {
    const tb = tables();
    const d = playoffDraw(c, 'wm', 2030, 'uefa', tb, setup(16));
    expect(d.direct).toHaveLength(12);
    expect(d.direct.every((nid) => nid.endsWith('p0'))).toBe(true);
    expect(d.paths).toHaveLength(4);
    const teams = d.paths.flatMap((p) => p.semis.flat());
    expect(new Set(teams).size).toBe(16);
    expect(teams.filter((nid) => nid.endsWith('p1'))).toHaveLength(12);
    expect(teams.filter((nid) => nid.endsWith('p2'))).toHaveLength(4);
    // Topf 4 (die vier Dritten) spielt auswärts beim Topf 1.
    for (const p of d.paths) {
      expect(p.legs).toBe(1);
      expect(p.semis[0][1].endsWith('p2')).toBe(true);
    }
  });

  it('Europameisterschaft 2028: reservierte Gastgeberplätze bestimmen das Format (2, 3 oder 4 Plätze)', () => {
    const tb = tables();
    // Beide Gastgeber direkt (Gruppensieger): kein Gastgeberplatz gebraucht → 8 Teams, 4 Duelle mit Hin- und Rückspiel.
    let d = playoffDraw(c, 'em', 2028, 'uefa', tb, setup(24, ['g0p0', 'g1p0'], 2));
    expect(d.direct).toHaveLength(20);
    expect(d.paths).toHaveLength(4);
    expect(d.paths.every((p) => p.legs === 2)).toBe(true);
    // Ein Gastgeber nur Dritter: ein Gastgeberplatz → 12 Teams, 3 Pfade.
    d = playoffDraw(c, 'em', 2028, 'uefa', tb, setup(24, ['g0p0', 'g5p2'], 2));
    expect(d.direct).toContain('g5p2');
    expect(d.paths).toHaveLength(3);
    expect(d.paths.every((p) => p.legs === 1 && p.semis.length === 2)).toBe(true);
    // Zwei Gastgeber nur Dritte: beide Plätze → 8 Teams, 2 Pfade; der Bestplatzierte zuerst.
    d = playoffDraw(c, 'em', 2028, 'uefa', tb, setup(24, ['g7p3', 'g5p2', 'g6p2'], 2));
    expect(d.direct).toEqual(expect.arrayContaining(['g5p2', 'g6p2']));
    expect(d.direct).not.toContain('g7p3');
    expect(d.paths).toHaveLength(2);
    // Ohne Play-off-Regel (Afrika): null, dann gilt die Rangliste.
    expect(playoffDraw(c, 'afr', 2027, 'caf', tb, setup(24))).toBeNull();
  });

  it('Hin- und Rückspiel: Gesamtergebnis zählt, bei Gleichstand Elfmeterschießen; Einzelspiele: Finale nach den Halbfinals', () => {
    const comp = { key: 'x', year: 2028, str: { a: 70, b: 60, c: 65, d: 55 }, own: {}, stats: {}, matches: [], log: [] };
    schedulePlayoffs(comp, { direct: [], paths: [{ semis: [['a', 'b']], legs: 2 }, { semis: [['c', 'd']], legs: 2 }] }, [6, 7]);
    const [l1a, l2a, l1b, l2b] = comp.matches;
    expect([l1a.home, l2a.home]).toEqual(['b', 'a']); // Gesetzte im Rückspiel zu Hause
    l1a.result = { home: 2, away: 0 };
    l2a.result = { home: 3, away: 0 }; // a gewinnt 3:2 insgesamt
    l1b.result = { home: 1, away: 1 };
    l2b.result = { home: 0, away: 0 }; // 1:1 → Elfmeterschießen
    expect(playoffWinners(comp)).toBeNull();
    advancePlayoffs(c, comp);
    expect(l2b.pens).toBeTruthy();
    const w = playoffWinners(comp);
    expect(w[0]).toBe('a');
    expect(w[1]).toBe(l2b.pens.home > l2b.pens.away ? 'c' : 'd');

    const one = { key: 'y', year: 2030, str: {}, own: {}, stats: {}, matches: [], log: [] };
    schedulePlayoffs(one, { direct: ['z'], paths: [{ semis: [['a', 'd'], ['b', 'c']], legs: 1 }] }, [6, 7]);
    one.matches[0].result = { home: 1, away: 0 };
    expect(advancePlayoffs(c, one)).toBe(false); // zweites Halbfinale offen
    one.matches[1].result = { home: 1, away: 1 };
    one.matches[1].pens = { home: 3, away: 4 };
    expect(advancePlayoffs(c, one)).toBe(true);
    const f = one.matches.find((m) => m.step === 'p2');
    expect(new Set([f.home, f.away])).toEqual(new Set(['a', 'c']));
    expect(f.day).toBe(7);
  });

  it('interkontinental: 6 Teams aus 5 Verbänden, die zwei Stärksten gesetzt im Finale', () => {
    const teams = ['irq', 'cod', 'bol', 'ncl', 'jam', 'sur'].filter((nid) => NATIONS[nid]);
    const d = interDraw(c, 'wm', 2030, teams);
    if (d.paths.length) {
      expect(d.paths).toHaveLength(INTER.wm.places);
      const seeds = d.paths.map((p) => p.seed);
      const others = teams.filter((nid) => !seeds.includes(nid));
      for (const s of seeds) for (const o of others) expect(d.str[s]).toBeGreaterThanOrEqual(d.str[o]);
      expect(d.paths.flatMap((p) => p.semis.flat()).sort()).toEqual([...others].sort());
    }
    expect(Object.values(INTER.wm.from).reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('in der Saison: Play-offs an den letzten zwei Terminen (März), das Feld aus Direkten und Pfadsiegern', () => {
    const cc = createCareer({ seed: 9 });
    while ((cc.season ?? 1) < 4) {
      while (!seasonOver(cc)) {
        for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
        finishRound(cc);
      }
      nextSeason(cc);
    }
    while (!seasonOver(cc)) {
      for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
      finishRound(cc);
    }
    const q = cc.natQuali;
    const uefa = q.comps.find((x) => x.key === 'wm-2030-uefa');
    const inter = q.comps.find((x) => x.key === 'wm-2030-inter');
    expect(uefa.po.paths).toHaveLength(2); // 2030: Spanien und Portugal Gastgeber → 14 Plätze, 12 direkt, 2 über Play-offs
    const last = Math.max(...uefa.matches.filter((m) => m.g >= 0).map((m) => m.day));
    for (const m of uefa.matches.filter((x) => x.g === -1)) {
      expect(m.result).toBeTruthy();
      expect(m.day).toBeGreaterThan(last);
    }
    expect(uefa.matches.filter((m) => m.step === 'p2')).toHaveLength(2);
    expect(inter.po.paths).toHaveLength(2);
    const won = playoffWinners(inter);
    expect(won).toHaveLength(2);
    const { field } = makeField(cc, 'wm', 2030);
    expect(field).toHaveLength(48);
    for (const nid of [...uefa.po.direct, ...playoffWinners(uefa), ...won]) expect(field).toContain(nid);
  });

  it('eigener Spieler im Play-off: Halbfinale als Karte (K.-o., im Stadion mit Verlängerung), danach das Finale', () => {
    const cc = createCareer({ seed: 9 });
    const run = (until = () => false) => {
      while (!seasonOver(cc) && !until(cc)) {
        for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
        finishRound(cc);
      }
    };
    while ((cc.season ?? 1) < 4) {
      run();
      nextSeason(cc);
    }
    cc.level = 12;
    cc.pro = true;
    const last = cc.natQuali.windows.at(-1).round;
    run((x) => x.round === last - 1);
    const draw = playoffDraw(cc, 'wm', 2030, 'uefa', qualiTables(cc, 'wm', 2030, 'uefa'), qualiSetup(cc, 'wm', 2030, 'uefa'));
    const nid = draw.paths[0].semis[0][0];
    const idx = humanClub(cc).squad[3];
    cc.players[idx].delta = Object.fromEntries(['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'].map((k) => [k, 3]));
    (cc.natLock ??= {})[idx] = nid;
    run((x) => x.round === last);
    const next = nextOwnMatch(cc);
    expect(next?.m.step).toBe('p1');
    expect(prepareNatMatch(cc, next, { duration: 60 }).match.knockout).toBe(true);
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = cc;
    expect(house.hub()).toMatch(/Play-off-Halbfinale/);
    quickOwnMatch(cc);
    const comp = cc.natQuali.comps.find((x) => x.key === 'wm-2030-uefa');
    const final = comp.matches.find((m) => m.step === 'p2' && m.path === 0);
    expect(final).toBeTruthy(); // Finale steht, sobald beide Halbfinals gespielt sind
    while (nextOwnMatch(cc)?.t.isQuali) quickOwnMatch(cc);
    expect(final.result).toBeTruthy();
    expect(house.hub()).toMatch(/Alle Spiele dieser Länderspielpause sind gespielt/);
  }, 60000);
});
