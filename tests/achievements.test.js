import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { ACHIEVEMENTS, achievementList, careerAchievements, matchAchievements, seasonAchievements } from '../src/career/achievements.js';

// Minimales Spiel für die Prüfungen: Team 0 ist immer die eigene Mannschaft.
const fakeMatch = ({ score = [0, 0], players = [], goals = [], teams = [{}, {}], surface = 'grass' } = {}) => ({
  score,
  players: players.map((p, i) => ({ id: `p${i}`, team: 0, position: 'mid', ...p })),
  stats: { players: Object.fromEntries(players.map((p, i) => [`p${i}`, p.st ?? {}])), teams, goals },
  pitch: { surface: { id: surface } },
});

describe('Erfolge', () => {
  it('jeder Erfolg hat Namen und Text in beiden Sprachen und eine eindeutige id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name().length).toBeGreaterThan(2);
      expect(a.text().length).toBeGreaterThan(5);
    }
  });

  it('Spielerfolge: Dreierpack, Comeback, Luftloch-König, Asche, Auto – jeder nur einmal', () => {
    const c = createCareer({ seed: 4711 });
    const m = fakeMatch({
      score: [3, 2],
      players: [{ st: { goals: 3, whiffs: 3 } }, { position: 'gk', st: {} }, { injury: { type: 'scrape', severity: 3 }, st: {} }],
      goals: [{ team: 1 }, { team: 1 }, { team: 0 }, { team: 0 }, { team: 0 }],
      teams: [{ cars: 5 }, {}],
      surface: 'ash',
    });
    const got = matchAchievements(c, m);
    expect(got).toEqual(expect.arrayContaining(['ersterSieg', 'dreierpack', 'comeback', 'luftloch', 'asche', 'auto']));
    expect(got).not.toContain('zuNull');
    expect(got).not.toContain('keeperTor');
    expect(c.pendingNews.filter((t) => t.startsWith('Erfolg freigeschaltet')).length).toBe(got.length);
    expect(matchAchievements(c, m)).toEqual([]); // schon freigeschaltet
  });

  it('kein Comeback ohne zwei Tore Rückstand, Asche nur auf Asche', () => {
    const c = createCareer({ seed: 4712 });
    const got = matchAchievements(c, fakeMatch({ score: [2, 1], players: [{ injury: { type: 'scrape', severity: 3 }, st: {} }], goals: [{ team: 1 }, { team: 0 }, { team: 0 }], surface: 'grass' }));
    expect(got).not.toContain('comeback');
    expect(got).not.toContain('asche');
  });

  it('Saisonerfolge: Meister, Aufstieg, Ungeschlagen, Rote Laterne', () => {
    const c = createCareer({ seed: 4713 });
    expect(seasonAchievements(c, { pos: 1, size: 6, own: { w: 8, d: 2, l: 0 }, promoted: true })).toEqual(['meister', 'aufstieg', 'ungeschlagen']);
    expect(seasonAchievements(c, { pos: 6, size: 6, own: { w: 0, d: 1, l: 9 }, promoted: false })).toEqual(['laterne']);
  });

  it('alte Spielstände bekommen Meister und Aufstieg still nachgetragen', () => {
    const c = createCareer({ seed: 4714 });
    c.history = [{ season: 1, pos: 1, promoted: true }];
    c.pendingNews = [];
    careerAchievements(c);
    expect(c.achievements.meister).toBeTruthy();
    expect(c.achievements.aufstieg).toBeTruthy();
    expect(c.pendingNews).toEqual([]);
    const list = achievementList(c);
    expect(list.count).toBe(2);
    expect(list.list.slice(0, 2).every((a) => a.got)).toBe(true);
  });

  it('eine echte Saison schaltet Erfolge frei und ändert keine Ergebnisse', () => {
    const c = createCareer({ seed: 8080 });
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 240 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    nextSeason(c);
    expect(c.achievementsSeeded).toBe(true);
    expect(Object.keys(c.achievements).length).toBeGreaterThan(0);
    for (const a of Object.values(c.achievements)) expect(a.season).toBeGreaterThanOrEqual(1);
  }, 60000);
});
