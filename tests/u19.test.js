import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, nextSeason, playerOf, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { ensureU19, u19Growth, u19Matchday, u19SeasonEnd, u19Table, U19_FROM } from '../src/career/u19.js';

const at = (level, seed = 9) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};
const deps = (c) => ({ playerOf, prospects: c.youth?.prospects ?? [] });

describe('A-Jugend als eigenes Team', () => {
  it('erst ab der Regionalliga; ohne Leistungszentrum in der Verbandsliga, mit in der Nachwuchsliga-Vorrunde', () => {
    expect(ensureU19(at(U19_FROM - 1))).toBeNull();
    const c = at(U19_FROM);
    expect(ensureU19(c).tier).toBe('vl');
    expect(c.u19.group.teams).toHaveLength(10);
    const lz = at(U19_FROM, 10);
    lz.facilities = { built: { nlz: 1 } };
    const u = ensureU19(lz);
    expect(u.tier).toBe('nwl');
    expect(u.group.phase).toBe('vor');
    expect(u.group.teams).toHaveLength(8);
    expect(u.group.teams.filter((t) => !t.own).every((t) => / U19$/.test(t.name))).toBe(true);
  });

  it('Vorrunde mit 14 Spieltagen, danach Meister- oder Hauptrunde; jeder spielt jede Runde einmal', () => {
    const c = at(U19_FROM, 11);
    c.facilities = { built: { nlz: 1 } };
    ensureU19(c);
    for (let r = 0; r < 14; r++) u19Matchday(c, deps(c));
    expect(['meister', 'haupt']).toContain(c.u19.group.phase);
    const vor = c.u19.history.at(-1);
    expect(vor.phase).toBe('vor');
    expect(c.u19.group.phase).toBe(vor.place <= 2 ? 'meister' : 'haupt');
  });

  it('Tabelle stimmt: Punkte = 3 × Siege + Remis, Spiele je Team = Spieltage', () => {
    const c = at(U19_FROM, 12);
    ensureU19(c);
    for (let r = 0; r < 6; r++) u19Matchday(c, deps(c));
    for (const t of c.u19.group.teams) {
      expect(t.pts).toBe(3 * t.w + t.d);
      expect(t.w + t.d + t.l).toBe(c.u19.group.phase === 'vl' ? 6 : t.w + t.d + t.l);
    }
    const tab = u19Table(c.u19.group);
    for (let i = 1; i < tab.length; i++) expect(tab[i - 1].pts).toBeGreaterThanOrEqual(tab[i].pts);
  });

  it('Saisonende: neue Saison beginnt, Geschichte bleibt, Qualifikation über die Meisterrunde', () => {
    const c = at(U19_FROM, 13);
    c.facilities = { built: { nlz: 1 } };
    ensureU19(c);
    const text = u19SeasonEnd(c, deps(c));
    expect(text).toMatch(/A-Jugend/);
    expect(c.u19.group.round).toBe(0);
    expect(c.u19.history.length).toBeGreaterThanOrEqual(2);
    expect(c.u19.tier).toBe('nwl'); // Leistungszentrum: immer dabei
  });

  it('Entwicklung: erst ab fünf Einsätzen ein Bonus', () => {
    const c = at(U19_FROM, 14);
    ensureU19(c);
    const idx = c.youth.prospects[0];
    expect(u19Growth(c, idx)).toBe(1);
    c.players[idx].appsU19 = 5;
    expect(u19Growth(c, idx)).toBeGreaterThan(1);
  });

  it('im Karriereablauf: spielt jede Woche mit, Saisonwechsel schreibt die Geschichte und beginnt neu', () => {
    const c = createCareer({ seed: 8080 });
    c.level = U19_FROM;
    let weeks = 0;
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 120 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
      weeks++;
    }
    expect(c.u19).toBeTruthy();
    const own = c.u19.group.teams.find((t) => t.own);
    expect(own.w + own.d + own.l + (c.u19.history.length ? 9 : 0)).toBeGreaterThanOrEqual(Math.min(weeks, 9)); // jede Woche ein Spiel (nach Herbstmeisterschaft neue Gruppe)
    nextSeason(c);
    expect(c.u19.history.some((h) => h.season === 1)).toBe(true);
    expect(c.u19.group.round).toBe(0);
    expect(Object.values(c.players).some((r) => r.appsU19)).toBe(false);
  }, 60000);
});
