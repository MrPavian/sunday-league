// AFS Phase 1: erweiterte Spieldaten (src/sim/analytics.js) – liest nur, stimmt mit den bestehenden Mitschriften überein.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createChanceLog, feedChances } from '../src/sim/chances.js';
import { AN, FIELDS, KEYS, fieldTilt, matchSummary } from '../src/sim/analytics.js';

function play(seed, venue, { chances = false } = {}) {
  const pitch = PITCHES[venue];
  const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  const cl = chances ? createChanceLog(m) : null;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    if (cl) feedChances(cl, m, m.events, 0);
    m.events.length = 0;
  }
  return { m, cl };
}

describe('Spieldaten (AFS Phase 1)', () => {
  it('ändert das Spiel nicht: gleicher Seed, gleiches Spiel mit und ohne Mitschrift', () => {
    const a = play(7401, 'rasenplatz');
    AN.on = false;
    try {
      const b = play(7401, 'rasenplatz');
      expect(b.m.an).toBeUndefined();
      expect(a.m.score).toEqual(b.m.score);
      expect(a.m.ball.pos).toEqual(b.m.ball.pos);
      expect(a.m.stats.teams).toEqual(b.m.stats.teams);
    } finally {
      AN.on = true;
    }
  }, 120000);

  it('stimmt mit Spielprotokoll und Ticker überein; Zweikämpfe und Duelle gehen auf', () => {
    for (const [seed, venue] of [[7402, 'rasenplatz'], [7403, 'grossfeld'], [7404, 'hinterhof']]) {
      const { m, cl } = play(seed, venue, { chances: true });
      const T = m.an.teams;
      expect(T[0].pass + T[1].pass).toBe(m.log.passes.length);
      expect(T[0].passOk + T[1].passOk).toBe(m.log.passes.filter((p) => p.done).length);
      expect(T[0].xg + T[1].xg).toBeCloseTo(cl.xg[0] + cl.xg[1], 6);
      expect(T[0].shots + T[1].shots).toBe(cl.shots.length);
      // Jeder Zweikampf hat einen Gewinner und einen Verlierer aus verschiedenen Mannschaften.
      expect(T[0].duelWon).toBe(T[1].duelLost);
      expect(T[1].duelWon).toBe(T[0].duelLost);
      expect(T[0].aerialWon).toBe(T[1].aerialLost);
      for (const t of T) {
        expect(t.passOk).toBeLessThanOrEqual(t.pass);
        expect(t.pressPassOk).toBeLessThanOrEqual(t.pressPass);
        expect(t.lines).toBeLessThanOrEqual(t.passOk * 3);
        expect(t.xa).toBeLessThanOrEqual(t.xg + 1e-9);
      }
      // Spieler ergeben zusammen die Mannschaft.
      for (const k of KEYS) {
        const sum = Object.values(m.an.players).reduce((s, r) => s + r[k], 0);
        expect(sum).toBeCloseTo(T[0][k] + T[1][k], 6);
      }
      const third = T[0].third.concat(T[1].third).reduce((a, b) => a + b, 0);
      expect(third).toBeLessThanOrEqual(m.time + 1e-6);
      expect(third).toBeGreaterThan(m.time * 0.5);
    }
  }, 300000);

  it('Zusammenfassung: klein, jede Kennzahl hat eine Herkunft, Field Tilt ergänzt sich zu 1', () => {
    const { m } = play(7405, 'grossfeld');
    const s = matchSummary(m);
    expect(JSON.stringify(s).length).toBeLessThan(2500);
    expect(s.keys).toEqual(KEYS);
    for (const k of KEYS) expect(['MEASURED', 'DERIVED', 'MODELED']).toContain(FIELDS[k].src);
    for (const r of Object.values(s.players)) expect(r.length).toBe(KEYS.length);
    expect(fieldTilt(s, 0) + fieldTilt(s, 1)).toBeCloseTo(1, 9);
  }, 120000);
});
