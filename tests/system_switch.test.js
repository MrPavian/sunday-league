// Systemwechsel im laufenden Spiel (vom Nutzer gewünscht, 2026-10-22): plan.js setSystem.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setSystem } from '../src/sim/plan.js';
import { systemFormation, systemsFor } from '../src/sim/tactics.js';
import { dist2d } from '../src/core/math.js';

const run = (m, s) => { for (let i = 0; i < s * 60 && m.phase !== 'ended'; i++) stepMatch(m, undefined, 1 / 60); };
const roles = (list) => list.map((x) => x.role).sort().join(',');

describe('Systemwechsel im Spiel', () => {
  for (const id of ['rasenplatz', 'grossfeld']) {
    it(`${id}: jeder Feldspieler bekommt einen Platz der neuen Formation, der Torwart bleibt im Tor`, () => {
      const m = createMatch({ seed: 4, pitch: PITCHES[id], human: false });
      run(m, 20);
      const from = m.plan[0].system;
      const to = Object.keys(systemsFor(PITCHES[id].format)).find((k) => k !== from);
      const gk = m.players.find((p) => p.team === 0 && p.role === 'gk');
      expect(setSystem(m, 0, to)).toBe(true);
      expect(m.plan[0].system).toBe(to);
      const mine = m.players.filter((p) => p.team === 0);
      expect(roles(mine)).toBe(roles(systemFormation(PITCHES[id].format, to)));
      expect(gk.role).toBe('gk');
      const spots = mine.map((p) => `${p.formationEntry.x},${p.formationEntry.z}`);
      expect(new Set(spots).size).toBe(mine.length); // keine zwei auf demselben Platz
      expect(m.decisions.at(-1)).toMatchObject({ team: 0, group: 'system', value: to, before: from });
    });
  }

  it('gleiches oder unbekanntes System: nichts passiert', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.rasenplatz, human: false });
    expect(setSystem(m, 0, m.plan[0].system)).toBe(false);
    expect(setSystem(m, 0, 'gibtsnicht')).toBe(false);
  });

  it('die Spieler laufen ihre neuen Positionen an (Vergleich mit demselben Spiel ohne Wechsel)', () => {
    const make = () => {
      const m = createMatch({ seed: 6, pitch: PITCHES.grossfeld, human: false });
      run(m, 15);
      return m;
    };
    const a = make();
    const b = make();
    const to = Object.keys(systemsFor(11)).find((k) => k !== a.plan[0].system);
    setSystem(a, 0, to);
    const homes = new Map(a.players.filter((p) => p.team === 0).map((p) => [p.id, { ...p.home }]));
    run(a, 5);
    run(b, 5);
    const gap = (m) => {
      const mine = m.players.filter((p) => p.team === 0 && p.role !== 'gk' && homes.has(p.id));
      return mine.reduce((s, p) => s + dist2d(p.pos, homes.get(p.id)), 0) / mine.length;
    };
    expect(gap(a)).toBeLessThan(gap(b)); // näher an den neuen Grundpositionen als ohne Umstellung
    while (a.phase !== 'ended') stepMatch(a, undefined, 1 / 60);
    expect(a.score.every(Number.isFinite)).toBe(true); // läuft ohne Fehler zu Ende
  }, 120000); // ein ganzes Großfeldspiel: allein rund 59 s gemessen (2026-10-29), im vollen Lauf mit allen Workern länger

  it('nach einem Platzverweis: weniger Spieler als Plätze, jeder bekommt trotzdem einen', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.rasenplatz, human: false });
    run(m, 10);
    const out = m.players.find((p) => p.team === 0 && p.role === 'mid');
    m.players.splice(m.players.indexOf(out), 1);
    const to = Object.keys(systemsFor(7)).find((k) => k !== m.plan[0].system);
    expect(setSystem(m, 0, to)).toBe(true);
    const mine = m.players.filter((p) => p.team === 0);
    expect(new Set(mine.map((p) => `${p.formationEntry.x},${p.formationEntry.z}`)).size).toBe(mine.length);
    for (const p of mine) expect(Number.isFinite(p.home.x) && Number.isFinite(p.home.z)).toBe(true);
  });
});
