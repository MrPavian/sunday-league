import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { chanceStats, missedChances, BIG_CHANCE_DIST } from '../src/sim/report.js';

function play(seed, pitch = 'ascheplatz') {
  const m = createMatch({ seed, pitch: PITCHES[pitch], human: false, aiCoach: false, duration: 120 });
  const goals = [0, 0];
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) if (e.type === 'goal' && !e.ownGoal) goals[e.team]++;
    m.events.length = 0;
  }
  return { m, goals };
}

describe('Nachanalyse: Chancen aus dem Protokoll', () => {
  it('jeder Schuss hat einen Ausgang; Tore, Schüsse aufs Tor und Paraden passen zusammen', () => {
    for (const seed of [3, 8, 21]) {
      const { m, goals } = play(seed);
      for (const s of m.log.shots) expect([null, 'goal', 'save', 'block', 'woodwork', 'miss']).toContain(s.outcome);
      for (const t of [0, 1]) {
        const c = chanceStats(m, t);
        expect(c.shots).toBe(m.stats.teams[t].shots);
        const scored = m.log.shots.filter((s) => s.team === t && s.outcome === 'goal').length;
        expect(scored).toBeLessThanOrEqual(goals[t]); // Abpraller ohne Schuss (Kopfball, Abstauber) fehlen
        expect(c.onTarget).toBeGreaterThanOrEqual(scored);
        expect(c.saves).toBe(m.log.shots.filter((s) => s.team !== t && s.outcome === 'save').length);
        expect(c.big).toBe(m.log.shots.filter((s) => s.team === t && s.dist <= BIG_CHANCE_DIST).length);
      }
    }
  }, 60000);

  it('vergebene Chancen: nur echte Abschlüsse ohne Tor, mit Distanz und Ausgang aus dem Spiel', () => {
    const { m } = play(5);
    for (const t of [0, 1]) {
      const list = missedChances(m, t);
      expect(list.length).toBeLessThanOrEqual(3);
      for (const c of list) {
        expect(c.team).toBe(t);
        expect(c.text).toMatch(/→/);
        expect(c.text).toMatch(/\d+ m/);
      }
    }
  }, 60000);
});
