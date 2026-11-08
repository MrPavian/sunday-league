// Nationenliga (natleague.js): Ligen, Gruppen und Termine, Viertelfinale und Play-off A/B im März, Endrunde, Auf- und Abstieg und
// die Gruppensieger als Teilnehmer der Play-offs in der Qualifikation der Saison danach.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { qualiSetup } from '../src/career/nationalteams.js';
import { NATIONS } from '../src/data/nations.js';
import { nlPlayoffPool } from '../src/career/natleague.js';
import { playoffDraw } from '../src/career/natplayoffs.js';
import { qualiTable, qualiTables } from '../src/career/natquali.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

const UEFA = Object.keys(NATIONS).filter((nid) => NATIONS[nid].conf === 'uefa');
const run = (cc, until = () => false) => {
  while (!seasonOver(cc) && !until(cc)) {
    for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
    finishRound(cc);
  }
};

describe('Nationenliga', () => {
  it('Saison 2026/27: drei Ligen (16, 12, Rest), Gruppen mit Hin- und Rückspiel, Viertelfinale und Play-off A/B im März', () => {
    const cc = createCareer({ seed: 9 });
    run(cc, (x) => !!x.natQuali);
    const nl = cc.natQuali.comps.find((x) => x.key === 'nl-2026');
    expect(nl).toBeTruthy();
    expect(nl.leagues.map((l) => l.length)).toEqual([16, 12, UEFA.length - 28]);
    expect(new Set(nl.leagues.flat()).size).toBe(UEFA.length);
    for (const [g, ids] of nl.groups.entries()) {
      const per = nl.leagueOf[g] === 0 ? 6 : 4; // Vierergruppen 6 Spiele, Dreiergruppen 4
      for (const nid of ids) expect(nl.matches.filter((m) => m.g === g && (m.home === nid || m.away === nid))).toHaveLength(per);
      for (const m of nl.matches.filter((x) => x.g === g)) expect(m.day).toBeLessThan(nl.poDays[0]);
    }
    run(cc);
    expect(nl.po.paths.filter((p) => p.kind === 'qf')).toHaveLength(4);
    expect(nl.po.paths.filter((p) => p.kind === 'ab')).toHaveLength(4);
    for (const [path, p] of nl.po.paths.entries()) {
      const legs = nl.matches.filter((m) => m.path === path);
      expect(legs.map((m) => m.day)).toEqual(nl.poDays);
      expect(legs[1].home).toBe(p.semis[0][0]); // Gruppensieger bzw. Team der Liga A im Rückspiel zu Hause
      expect(legs.every((m) => m.result)).toBe(true);
    }
    // Viertelfinale: Sieger gegen Zweiten einer anderen Gruppe.
    for (const p of nl.po.paths.filter((x) => x.kind === 'qf')) {
      const [a, b] = p.semis[0];
      expect(nl.groups.some((g) => g.includes(a) && g.includes(b))).toBe(false);
    }
  }, 60000);

  it('Saisonende: Endrunde, Auf- und Abstieg, Gesamtrangliste; die Gruppensieger gehen in die Play-offs der Europameisterschaft 2028', () => {
    const cc = createCareer({ seed: 9 });
    run(cc);
    const nl = cc.natQuali.comps.find((x) => x.key === 'nl-2026');
    nextSeason(cc);
    run(cc, (x) => x.natQuali?.season === 2);
    const last = cc.natLeague.last;
    expect(last.edition).toBe(2026);
    expect(last.champion).toBeTruthy();
    expect(nl.matches.filter((m) => m.step === 'sf')).toHaveLength(2);
    expect(nl.matches.find((m) => m.step === 'f').result).toBeTruthy();
    expect(cc.natLeague.leagues.map((l) => l.length)).toEqual(nl.leagues.map((l) => l.length));
    expect(last.ranking).toHaveLength(UEFA.length);
    expect(last.winners).toHaveLength(11);
    // Gruppenletzte der Liga A steigen ab, Gruppensieger der Liga B auf.
    for (let g = 0; g < nl.groups.length; g++) if (nl.leagueOf[g] === 0) expect(cc.natLeague.leagues[1]).toContain(qualiTable(nl, g).at(-1).nid);
    const winnersB = last.winners.filter((nid) => nl.leagues[1].includes(nid));
    for (const nid of winnersB) expect(cc.natLeague.leagues[0]).toContain(nid);
    // Play-offs der Europameisterschaft 2028: übrige Zweite und die Nationenliga statt der Gruppendritten.
    run(cc, (x) => x.round === cc.natQuali.windows.at(-1).round - 1);
    const tables = qualiTables(cc, 'em', 2028, 'uefa');
    const setup = qualiSetup(cc, 'em', 2028, 'uefa');
    const draw = playoffDraw(cc, 'em', 2028, 'uefa', tables, setup);
    const seconds = tables.map((tb) => tb[1].nid);
    const pool = nlPlayoffPool(cc, 2028, [...draw.direct, ...seconds]);
    expect(pool).toBeTruthy();
    const teams = draw.paths.flatMap((p) => p.semis.flat());
    const fromNl = teams.filter((nid) => !seconds.includes(nid));
    expect([...fromNl].sort()).toEqual(pool.slice(0, fromNl.length).sort());
    expect(fromNl.some((nid) => tables.some((tb) => tb[2].nid === nid && !pool.includes(nid)))).toBe(false);
  }, 90000);

  it('eigener Spieler: Karte mit Liga und Gruppe in der Länderspielpause', () => {
    const cc = createCareer({ seed: 9 });
    cc.level = 12;
    cc.pro = true;
    run(cc, (x) => !!x.natQuali);
    const nl = cc.natQuali.comps.find((x) => x.key === 'nl-2026');
    const nid = nl.leagues[0][0];
    const idx = humanClub(cc).squad[3];
    cc.players[idx].delta = Object.fromEntries(['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'].map((k) => [k, 3]));
    (cc.natLock ??= {})[idx] = nid;
    run(cc, (x) => x.natQuali.open != null);
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = cc;
    const html = house.hub();
    expect(html).toMatch(/Nationenliga 2026\/27/);
    expect(html).toMatch(/Liga A, Gruppe \d/);
    expect(html).toMatch(/1\. Spieltag/);
    // Abstellungsgebühr des Europäischen Verbands: 3659 € je abgestelltem Spieler und Spiel.
    const fee = cc.ledger.find((e) => /Abstellungsgebühren/.test(e.text));
    expect(fee).toBeTruthy();
    expect(fee.amount % 3659).toBe(0);
    expect(fee.amount).toBeGreaterThanOrEqual(3659 * 2);
  }, 60000);
});
