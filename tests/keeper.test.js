import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { HAND_ZONE, inHandZone } from '../src/sim/actions.js';

// Hände nur im Torraum (1 m vor der Linie): Im laufenden Spiel nimmt der Keeper den Ball nie
// weiter draußen in die Hand – draußen spielt er mit dem Fuß.
describe('keeper hand zone', () => {
  it('the zone is 1 m deep and 1 m wider than the goal on each side', () => {
    const pitch = PITCHES.ascheplatz;
    const goalX = -pitch.halfLength;
    expect(HAND_ZONE.depth).toBe(1);
    expect(inHandZone(pitch, { x: goalX + 0.9, z: 0 }, goalX)).toBe(true);
    expect(inHandZone(pitch, { x: goalX + 1.3, z: 0 }, goalX)).toBe(false);
    expect(inHandZone(pitch, { x: goalX + 0.5, z: pitch.goalHalfWidth + 0.9 }, goalX)).toBe(true);
    expect(inHandZone(pitch, { x: goalX + 0.5, z: pitch.goalHalfWidth + 1.3 }, goalX)).toBe(false);
  });

  it('never picks the ball up outside the zone during play – and still makes saves', () => {
    let catches = 0;
    let saves = 0;
    let feet = 0;
    for (const id of Object.keys(PITCHES)) {
      for (const seed of [11, 12]) {
        const m = createMatch({ seed, pitch: PITCHES[id], human: false, duration: 150, aiCoach: false });
        let prev = null;
        let prevPhase = m.phase;
        while (m.phase !== 'ended') {
          stepMatch(m, undefined, 1 / 60);
          const h = m.ball.holder;
          if (h && h !== prev && m.phase === 'play' && prevPhase === 'play') {
            const p = m.players.find((x) => x.id === h);
            if (p.role === 'gk') {
              const goalX = -attackDir(m, p.team) * m.pitch.halfLength;
              expect(Math.abs(m.ball.pos.x - goalX)).toBeLessThanOrEqual(HAND_ZONE.depth + 0.25);
              catches++;
            }
          }
          for (const e of m.events) {
            if (e.type === 'save' || e.type === 'catch') saves++;
            if (e.type === 'touch' && m.players.find((x) => x.id === e.playerId)?.role === 'gk') feet++;
          }
          m.events.length = 0;
          prev = h;
          prevPhase = m.phase;
        }
      }
    }
    expect(catches).toBeGreaterThan(10); // er fängt weiterhin – nur eben im Torraum
    expect(saves).toBeGreaterThan(40);
    expect(feet).toBeGreaterThan(10); // und spielt draußen mit dem Fuß
  }, 120_000);
});
