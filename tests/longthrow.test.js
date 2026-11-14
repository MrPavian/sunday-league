// Weiter Einwurf in den Strafraum (sim/ai.js LONG_THROW): nur 9er-Feld und Großfeld, nah an der Grundlinie, kräftiger Werfer;
// Angreifer laufen ein, die Abwehr deckt die Zonen. Gemessen mit scripts/longthrow-check.mjs (200 Spiele).
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { startSetPiece } from '../src/sim/setpieces.js';
import { LONG_THROW, longThrowPlan, longThrowSpots, longThrowTarget } from '../src/sim/ai.js';
import { attackDir } from '../src/sim/players.js';
import { dist2d } from '../src/core/math.js';

const setup = (venue, strength, xFromLine = 8, seed = 4) => {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false });
  const s = attackDir(m, 0);
  // Wie im Spiel: Bei einem Einwurf nah an der gegnerischen Grundlinie steht die eigene Mannschaft schon im letzten Drittel.
  m.players.filter((p) => p.team === 0 && p.role !== 'gk').forEach((p, i) => (p.pos.x = s * (m.pitch.halfLength - 12 - (i % 4) * 3)));
  startSetPiece(m, { type: 'throwin', team: 0, spot: { x: s * (m.pitch.halfLength - xFromLine), z: m.pitch.halfWidth } });
  const taker = m.players.find((p) => p.id === m.setPiece.takerId);
  taker.attrs.strength = strength;
  return { m, taker };
};

describe('Weiter Einwurf', () => {
  it('nicht auf dem 7er-Feld, nicht für schwache Werfer, nicht weit weg vom Tor', () => {
    expect(longThrowTarget(setup('rasenplatz', 0.9).m, setup('rasenplatz', 0.9).taker)).toBe(null);
    const weak = setup('sportplatz', LONG_THROW.strength - 0.05);
    expect(longThrowTarget(weak.m, weak.taker)).toBe(null);
    const far = setup('sportplatz', 0.9, 40);
    expect(longThrowTarget(far.m, far.taker)).toBe(null);
  });

  it('kräftiger Werfer nah am Tor: Ziel im Strafraum in Reichweite', () => {
    const { m, taker } = setup('sportplatz', 0.8);
    const spot = longThrowTarget(m, taker);
    expect(spot).not.toBe(null);
    expect(Math.abs(spot.z)).toBeLessThan(m.pitch.halfWidth * 0.5);
    expect(dist2d(m.ball.pos, spot)).toBeLessThanOrEqual(LONG_THROW.reach + LONG_THROW.reachK * 0.8);
  });

  it('der Plan wird einmal gefasst; danach laufen Angreifer in die Zonen und die Abwehr deckt sie', () => {
    let plans = 0;
    for (const seed of [4, 5, 6, 7, 8, 9, 10, 11]) {
      const { m } = setup('sportplatz', 0.8, 8, seed);
      const plan = longThrowPlan(m, m.setPiece);
      expect(longThrowPlan(m, m.setPiece)).toBe(plan); // einmal entschieden
      if (!plan) continue;
      plans++;
      // bis kurz vor dem Wurf (höchstens 5 s)
      for (let i = 0; i < 300 && !m.setPiece.taken && !m.players.find((p) => p.id === m.setPiece.takerId)?.pending; i++) stepMatch(m, undefined, 1 / 60);
      const spots = longThrowSpots(m, 0, plan);
      const near = (team) => spots.filter((z) => m.players.some((p) => p.team === team && p.role !== 'gk' && dist2d(p.pos, z) < 4)).length;
      expect(near(0)).toBeGreaterThanOrEqual(1);
      expect(near(1)).toBeGreaterThanOrEqual(1);
    }
    expect(plans).toBeGreaterThan(0);
  });

  it('im Spiel: weite Einwürfe kommen vor und werden als solche gemeldet', () => {
    let n = 0;
    for (let i = 0; i < 10 && n === 0; i++) {
      const m = createMatch({ seed: 3000 + i, pitch: PITCHES.sportplatz, human: false });
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        n += m.events.filter((e) => e.type === 'pass' && e.longThrow).length;
        m.events.length = 0;
      }
    }
    expect(n).toBeGreaterThan(0);
  }, 120000);
});
