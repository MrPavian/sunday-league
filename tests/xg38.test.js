// Liveticker mit Bild (Gameplay 2.0, Punkt 38): xG-Modell, Szenen, Druck-Leiste – liest nur, ändert das Spiel nicht. (tests/chances.test.js ist die Nachanalyse aus report.js.)
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { createChanceLog, feedChances, pressureOf, shotXg, XG } from '../src/sim/chances.js';

const DT = 1 / 60;
const live = (seed = 3, venue = 'rasenplatz') => {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  return m;
};
// Alle anderen weit weg stellen; nur der Torwart steht auf der Linie.
function clear(m, p, gkZ = 0) {
  const s = attackDir(m, p.team);
  for (const q of m.players) if (q !== p) q.pos = { x: -s * m.pitch.halfLength * 0.8, z: q.team === p.team ? 3 : -3 };
  const gk = m.players.find((q) => q.team !== p.team && q.role === 'gk');
  gk.pos = { x: s * (m.pitch.halfLength - 0.5), z: gkZ };
  return { s, gk };
}

describe('Chancenqualität (xG)', () => {
  it('nah und frei ist mehr wert als weit; Verteidiger in der Bahn und Kopfball drücken; Elfmeter fest', () => {
    const m = live();
    const p = m.players.find((q) => q.team === 0 && q.role !== 'gk');
    const { s } = clear(m, p);
    p.pos = { x: s * (m.pitch.halfLength - 6), z: 0 };
    const near = shotXg(m, p);
    p.pos = { x: s * (m.pitch.halfLength - 25), z: 0 };
    const far = shotXg(m, p);
    expect(near).toBeGreaterThan(far * 1.5);
    p.pos = { x: s * (m.pitch.halfLength - 6), z: 0 };
    const d = m.players.find((q) => q.team === 1 && q.role !== 'gk');
    d.pos = { x: s * (m.pitch.halfLength - 3), z: 0 };
    expect(shotXg(m, p)).toBeLessThan(near);
    d.pos = { x: -s * 30, z: 0 };
    expect(shotXg(m, p, { head: true })).toBeLessThan(near);
    expect(shotXg(m, p, { penalty: true })).toBe(XG.penalty);
    for (const v of [near, far]) expect(v).toBeGreaterThan(0), expect(v).toBeLessThan(1);
  });

  it('Torwart weit neben der Schussbahn: mehr xG', () => {
    const m = live(4);
    const p = m.players.find((q) => q.team === 0 && q.role !== 'gk');
    const { s, gk } = clear(m, p);
    p.pos = { x: s * (m.pitch.halfLength - 8), z: 0 };
    const inLine = shotXg(m, p);
    gk.pos = { x: s * (m.pitch.halfLength - 0.5), z: 4 };
    expect(shotXg(m, p)).toBeGreaterThan(inLine);
  });
});

describe('Ticker-Mitschrift', () => {
  const play = (seed, venue, withLog) => {
    const pitch = PITCHES[venue];
    const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    const log = withLog ? createChanceLog(m) : null;
    let goals = 0;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, DT);
      if (log) feedChances(log, m, m.events, 0);
      for (const e of m.events) if (e.type === 'goal' && !e.ownGoal && m.phase !== 'shootout') goals++;
      m.events.length = 0;
    }
    return { m, log, goals };
  };

  it('ändert das Spiel nicht: gleicher Seed, gleiches Ergebnis mit und ohne Mitschrift', () => {
    const a = play(7101, 'parkplatz', true);
    const b = play(7101, 'parkplatz', false);
    expect(a.m.score).toEqual(b.m.score);
    expect(a.m.ball.pos).toEqual(b.m.ball.pos);
  }, 120000);

  it('jedes Tor aus einem Abschluss hat ein Bild; Druck liegt zwischen 0 und 1; xG passt grob zu den Toren', () => {
    let xg = 0, goals = 0;
    for (const seed of [7201, 7202, 7203, 7204, 7205, 7206]) {
      const { log, goals: g } = play(seed, 'rasenplatz', true);
      xg += log.xg[0] + log.xg[1];
      goals += g;
      const sceneGoals = log.scenes.filter((s) => s.result === 'goal').length;
      expect(sceneGoals).toBeLessThanOrEqual(g);
      expect(sceneGoals).toBeGreaterThanOrEqual(g - 2); // Tore ohne eigenen Abschluss (Abpraller, Ablenkung) haben kein Bild
      for (const s of log.scenes) {
        expect(s.xg >= XG.scene || s.result === 'goal').toBe(true);
        expect(s.players.length).toBeGreaterThan(4);
      }
      const press = pressureOf(log);
      expect(press.filter(Boolean).length).toBe(XG.segments);
      for (const v of press) for (const x of v) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThanOrEqual(1);
    }
    expect(xg / goals).toBeGreaterThan(0.6);
    expect(xg / goals).toBeLessThan(1.6);
  }, 400000);

  it('abgeschaltet: keine Mitschrift', () => {
    XG.on = false;
    try {
      const { log } = play(7301, 'hinterhof', true);
      expect(log.shots.length).toBe(0);
      expect(log.xg).toEqual([0, 0]);
    } finally {
      XG.on = true;
    }
  }, 120000);
});
