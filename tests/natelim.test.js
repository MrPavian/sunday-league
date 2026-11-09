// Eigene Ausscheidungen der Verbände für die interkontinentalen Play-offs (natelim.js), wie in der Qualifikation zur WM 2026.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, nextSeason, seasonOver } from '../src/career/career.js';
import { confElim } from '../src/career/natelim.js';
import { makeField } from '../src/career/nationalteams.js';
import { rankAll } from '../src/career/natplayoffs.js';

// G Gruppen zu n: Gruppe i, Platz p → `g${i}p${p}`, je Spiel abgestuft (eindeutige Rangliste).
const tables = (G, n) => Array.from({ length: G }, (_, i) => Array.from({ length: n }, (_, p) => ({ nid: `g${i}p${p}`, p: 6, pts: 18 - p * 4 - (i % 4) * 0.5, gf: 10 - p - i * 0.01, ga: 5 })));
const str = (tb) => Object.fromEntries(tb.flat().map((r, k) => [r.nid, 190 - k * 0.3]));
const c = { seed: 7 };

describe('Ausscheidungen für die interkontinentalen Play-offs', () => {
  it('Asien: sechs direkt, vierte Runde (zwei Dreiergruppen) um zwei Plätze, Zweite in Hin- und Rückspiel um den Play-off-Platz', () => {
    const tb = tables(4, 7);
    const order = rankAll(tb);
    const e = confElim(c, 'wm', 2030, 'afc', tb, { places: 8, str: str(tb) });
    expect(e.qualified).toHaveLength(8);
    expect(e.qualified.slice(0, 6)).toEqual(order.slice(0, 6));
    const fourth = order.slice(6, 12);
    for (const nid of e.qualified.slice(6)) expect(fourth).toContain(nid);
    expect(e.entrants).toHaveLength(1);
    expect(fourth).toContain(e.entrants[0]);
    expect(e.qualified).not.toContain(e.entrants[0]);
    expect(confElim(c, 'wm', 2030, 'afc', tb, { places: 8, str: str(tb) })).toEqual(e); // feste Zufallszahlen
  });

  it('Afrika: neun Gruppensieger direkt, die vier besten Zweiten spielen Halbfinale und Finale', () => {
    const tb = tables(9, 6);
    const e = confElim(c, 'wm', 2030, 'caf', tb, { places: 9, str: str(tb) });
    expect(e.qualified).toHaveLength(9);
    expect(e.qualified.every((nid) => nid.endsWith('p0'))).toBe(true);
    const best4 = tb.map((t) => t[1]).sort((x, y) => y.pts - x.pts || y.gf - x.gf).slice(0, 4).map((r) => r.nid);
    expect(best4).toContain(e.entrants[0]);
  });

  it('Ozeanien: Halbfinale und Finale der vier Besten – der Sieger fährt hin, der Verlierer des Finals in die Play-offs', () => {
    const tb = tables(1, 8);
    const e = confElim(c, 'wm', 2030, 'ofc', tb, { places: 1, str: str(tb) });
    const top4 = rankAll(tb).slice(0, 4);
    expect(top4).toContain(e.qualified[0]);
    expect(top4).toContain(e.entrants[0]);
    expect(e.entrants[0]).not.toBe(e.qualified[0]);
    expect(confElim(c, 'em', 2028, 'uefa', tb, { places: 1, str: str(tb) })).toBeNull(); // ohne eigene Ausscheidung
  });

  it('in der Saison: die Play-offs der WM 2030 bekommen die Teilnehmer aus den Ausscheidungen, das Feld bleibt bei 48', () => {
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
    const inter = cc.natQuali.comps.find((x) => x.key === 'wm-2030-inter');
    const teams = inter.po.paths.flatMap((p) => [...p.semis.flat(), p.seed].filter(Boolean));
    expect(teams).toHaveLength(6);
    const { field, quali } = makeField(cc, 'wm', 2030);
    expect(field).toHaveLength(48);
    expect(new Set(field).size).toBe(48);
    // Afrika schickt einen Gruppenzweiten (Sieger der Zweiten-Runde), Nord-/Mittelamerika die zwei besten Zweiten.
    const second = (conf) => quali[conf].map((tb) => tb[1]?.nid);
    expect(teams.filter((nid) => second('caf').includes(nid))).toHaveLength(1);
    // Nord-/Mittelamerika: drei Gruppen; 2030 ohne Gastgeber aus dem Verband sechs feste Plätze, die nächsten zwei in die Play-offs.
    expect(quali.concacaf).toHaveLength(3);
    const conc = quali.concacaf.flat().filter((r) => teams.includes(r.nid));
    expect(conc).toHaveLength(2);
    expect(quali.concacaf.flat().filter((r) => r.q && !teams.includes(r.nid))).toHaveLength(6);
  }, 90000);
});
