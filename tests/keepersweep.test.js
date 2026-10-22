import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { inHandZone, keeperBox } from '../src/sim/actions.js';

// Torwart auf dem Großfeld (ROADMAP 11.10): kommt bei gegnerischen Angriffen vor die Linie (Winkel verkürzen), bleibt aber im
// Strafraum der Simulation; auf den kleineren Plätzen bleibt es bei der Linie (Messung: scripts/bigpitch-audit.mjs).
function keeperDepths(pitchId, seeds, duration) {
  const out = [];
  for (const seed of seeds) {
    const pitch = PITCHES[pitchId];
    const m = createMatch({ seed, pitch, human: false, duration, aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
      if (m.phase !== 'play') continue;
      for (const k of m.players) {
        if (k.role !== 'gk' || k.state !== 'normal') continue;
        const goalX = -attackDir(m, k.team) * pitch.halfLength;
        const opp = m.ball.lastTouch != null && m.players.find((p) => p.id === m.ball.lastTouch)?.team !== k.team;
        if (opp && Math.abs(m.ball.pos.x - goalX) < 30) out.push(Math.abs(k.pos.x - goalX));
      }
    }
  }
  return out;
}
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];

describe('keeper sweep (Großfeld)', () => {
  it('hands count in the whole simulated box on the big pitch only', () => {
    const big = PITCHES.grossfeld;
    const goalX = -big.halfLength;
    const box = keeperBox(big);
    expect(inHandZone(big, { x: goalX + box.depth - 0.5, z: 0 }, goalX)).toBe(true);
    expect(inHandZone(big, { x: goalX + box.depth + 1, z: 0 }, goalX)).toBe(false);
    const small = PITCHES.rasenplatz;
    expect(inHandZone(small, { x: -small.halfLength + 3, z: 0 }, -small.halfLength)).toBe(false);
  });

  it('comes off the line during attacks, but not beyond the box; small pitches keep him on the line', () => {
    const big = keeperDepths('grossfeld', [11, 12, 13], 240);
    expect(big.length).toBeGreaterThan(1000);
    expect(q(big, 0.9)).toBeGreaterThan(1.5); // vorher p90 = 0,8 m (Messung)
    expect(Math.max(...big)).toBeLessThan(keeperBox(PITCHES.grossfeld).depth + 0.5);
    const small = keeperDepths('rasenplatz', [11, 12, 13], 150);
    expect(q(small, 0.9)).toBeLessThan(1.2);
  }, 240_000);
});
