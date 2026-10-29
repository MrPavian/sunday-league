// Frauenteam (src/career/women.js): Kader aus der Gründung, eigene Liga parallel zu den Herren, Auf- und Abstieg,
// Jugendspielerinnen rücken auf, Speichern/Laden, ohne Frauenteam kein Zustand.
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { addFromYouth, SQUAD, TEAMS, teamStrength, women, womenTable, WOMEN_LEAGUES } from '../src/career/women.js';

const clone = (c) => migrateCareer(JSON.parse(JSON.stringify(c)));
// Herren-Ergebnisse vorgeben: die Frauen hängen nur am Spieltagszähler.
function playSeason(c) {
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) f.result = { home: 1, away: 1 };
    finishRound(c);
    c = clone(c);
  }
  return c;
}
const withWomen = (seed = 5, extra = {}) => {
  const c = createCareer({ seed });
  c.saga.frauen = { founded: 0, captain: 'Lena Kaya', strength: 0.35, seasons: [], ...extra };
  return clone(c);
};

describe('Frauenteam', () => {
  it('ohne Gründung gibt es keinen Zustand', () => {
    const c = playSeason(createCareer({ seed: 5 }));
    expect(c.women).toBeUndefined();
  });

  it('Gründung: 16 Spielerinnen mit Torhüterinnen, Kapitänin aus der Gründung, Trainerin', () => {
    const c = withWomen();
    const w = women(c);
    expect(w.squad).toHaveLength(SQUAD);
    expect(w.squad.filter((p) => p.pos === 'gk')).toHaveLength(2);
    expect(w.squad.some((p) => p.name === 'Lena Kaya')).toBe(true);
    expect(w.coach.name).toBeTruthy();
    expect(new Set(w.squad.map((p) => p.id)).size).toBe(SQUAD);
  });

  it('eine Saison: alle Spieltage gespielt, Tabelle stimmt, Platz in Chronik und Geschichte', () => {
    const c = playSeason(withWomen());
    const w = women(c);
    expect(w.league.played).toBe(2 * (TEAMS - 1));
    const rows = womenTable(c);
    expect(rows).toHaveLength(TEAMS);
    expect(rows.every((r) => r.played === 2 * (TEAMS - 1))).toBe(true);
    expect(rows.reduce((s, r) => s + r.gf, 0)).toBe(rows.reduce((s, r) => s + r.ga, 0));
    expect(w.history).toHaveLength(1);
    expect(c.saga.frauen.seasons).toHaveLength(1);
    expect(w.history[0].pos).toBe(rows.findIndex((r) => r.own) + 1);
    expect(w.squad.reduce((s, p) => s + p.goals, 0)).toBe(rows.find((r) => r.own).gf);
  });

  it('Spieltage laufen parallel zu den Herren, nicht alle auf einmal', () => {
    let c = withWomen();
    for (let i = 0; i < 3; i++) {
      for (const f of currentFixtures(c)) f.result = { home: 0, away: 0 };
      finishRound(c);
      c = clone(c);
    }
    const l = women(c).league;
    expect(l.played).toBe(Math.floor((3 * l.days.length) / c.fixtures.length));
  });

  it('Meister steigt auf, Letzter steigt ab, nicht unter die Kreisliga', () => {
    const strong = playSeason(withWomen(5, { strength: 2.5 }));
    expect(women(strong).history[0].pos).toBe(1);
    expect(women(strong).level).toBe(1);
    const weak = playSeason(withWomen(5, { strength: -2 }));
    expect(women(weak).history[0].pos).toBe(TEAMS);
    expect(women(weak).level).toBe(0);
  });

  it('Saisonwechsel: Kader wieder voll, neue Liga in der neuen Saison, alles deterministisch', () => {
    const run = () => {
      let c = playSeason(withWomen(9));
      nextSeason(c);
      c = clone(c);
      return c;
    };
    const a = run();
    const b = run();
    expect(women(a).squad.length).toBeGreaterThanOrEqual(SQUAD);
    expect(women(a).squad.filter((p) => p.pos === 'gk').length).toBeGreaterThanOrEqual(2);
    expect(women(a).league.season).toBe(a.season);
    expect(women(a).league.played).toBe(0);
    expect(JSON.stringify(women(a))).toBe(JSON.stringify(women(b)));
  });

  it('Jugendspielerin rückt mit 16 als echte Spielerin auf', () => {
    const c = withWomen();
    const before = women(c).squad.length;
    const p = addFromYouth(c, { name: 'Mia Becker', talent: 0.7, age: 16 });
    expect(women(c).squad).toHaveLength(before + 1);
    expect(p.fromYouth).toBe(true);
    expect(p.name).toBe('Mia Becker');
    expect(p.rating).toBeLessThan(WOMEN_LEAGUES[0].mean + 2);
    expect(teamStrength(women(c))).toBeGreaterThan(30);
  });

  it('Heimspiele kosten Schiri-Spesen der Frauen-Kreisliga', () => {
    const c = playSeason(withWomen());
    const fees = c.ledger.filter((e) => /Schiri Frauen|Referee \(women/.test(e.text));
    expect(fees.length).toBeGreaterThan(0);
    expect(fees.every((e) => e.amount === -WOMEN_LEAGUES[0].ref)).toBe(true);
  });
});
