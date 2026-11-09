// Qualifikation über zwei Saisons (natquali.js TWO_SEASON): Europa wie die EM-Qualifikation 2028 – März der Saison davor, Juni
// nach der Saison, Herbst und Play-offs in der Saison des Turniers.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { makeField } from '../src/career/nationalteams.js';
import { qualiTable } from '../src/career/natquali.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

const run = (cc, until = () => false) => {
  while (!seasonOver(cc) && !until(cc)) {
    for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
    finishRound(cc);
  }
};

describe('Qualifikation über zwei Saisons', () => {
  it('EM 2028: März 2027 (ohne Viertelfinalisten der Nationenliga), Juni beim Saisonende, Herbst und Play-offs 2027/28', () => {
    const cc = createCareer({ seed: 9 });
    run(cc, (x) => !!x.natQuali);
    const em = cc.natQuali.comps.find((x) => x.key === 'em-2028-uefa');
    expect(em?.early).toBe(true);
    expect(em.matches.every((m) => m.day == null && !m.result)).toBe(true); // vor dem März keine Termine
    run(cc);
    const nl = cc.natQuali.comps.find((x) => x.nl);
    const qf = new Set(nl.po.paths.filter((p) => p.kind === 'qf').flatMap((p) => p.semis.flat()));
    em.groups.forEach((g, gi) => {
      const march = em.matches.filter((m) => m.g === gi && (m.slot === 'M1' || m.slot === 'M2'));
      if (g.some((nid) => qf.has(nid))) expect(march, `Gruppe ${gi}`).toHaveLength(0);
      else {
        expect(march.length).toBeGreaterThan(0);
        for (const m of march) expect(m.result).toBeTruthy();
      }
    });
    const marchResult = em.matches.find((m) => m.slot === 'M1');
    const kept = marchResult && { ...marchResult.result };
    nextSeason(cc);
    run(cc, (x) => x.natQuali?.season === 2);
    const em2 = cc.natQuali.comps.find((x) => x.key === 'em-2028-uefa');
    expect(em2.early).toBeUndefined();
    for (const m of em2.matches.filter((x) => ['J1', 'J2'].includes(x.slot))) expect(m.result).toBeTruthy(); // Juni gerechnet
    const gDays = new Set(em2.matches.filter((m) => !m.result).map((m) => m.day));
    for (const d of gDays) expect(d).toBeLessThan(em2.poDays[0]);
    if (kept) expect(em2.matches.find((m) => m.slot === 'M1').result).toEqual(kept);
    run(cc);
    expect(em2.matches.filter((m) => m.g >= 0).every((m) => m.result)).toBe(true);
    expect(em2.po.paths.length).toBeGreaterThan(0);
    expect(makeField(cc, 'em', 2028).field).toHaveLength(24);
    // Andere Verbände: weiter in einer Saison (Afrika 2027 wurde nie über zwei Saisons geplant).
    expect(Object.keys(cc.natQualiCarry ?? {})).toHaveLength(0);
  }, 90000);

  it('eigener Spieler: im März der Saison davor steht das Qualifikationsspiel als Karte im Vereinsheim', () => {
    const cc = createCareer({ seed: 9 });
    cc.level = 12;
    cc.pro = true;
    run(cc, (x) => !!x.natQuali);
    const marchRound = cc.natQuali.windows.at(-1).round;
    run(cc, (x) => x.round === marchRound - 1);
    const nl = cc.natQuali.comps.find((x) => x.nl);
    const em = cc.natQuali.comps.find((x) => x.key === 'em-2028-uefa');
    // Land einer Gruppe ohne Viertelfinalisten der Nationenliga (Erste und Zweite der Liga A) – diese Gruppen spielen im März.
    const qf = new Set(nl.groups.flatMap((_, gi) => (nl.leagueOf[gi] === 0 ? qualiTable(nl, gi).slice(0, 2).map((r) => r.nid) : [])));
    const g = em.groups.find((ids) => ids.every((nid) => !qf.has(nid)));
    const nid = g[0];
    const idx = humanClub(cc).squad[3];
    cc.players[idx].delta = Object.fromEntries(['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'].map((k) => [k, 3]));
    (cc.natLock ??= {})[idx] = nid;
    run(cc, (x) => x.natQuali.open != null && x.round === marchRound);
    const marchGames = em.matches.filter((m) => (m.slot === 'M1' || m.slot === 'M2') && (m.home === nid || m.away === nid));
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = cc;
    expect(marchGames.length).toBeGreaterThan(0);
    expect(house.hub()).toMatch(/Qualifikation zur Europameisterschaft 2028/);
  }, 90000);
});
