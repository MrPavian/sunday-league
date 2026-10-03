import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

// Kleine Plätze: Die Schussreichweite schrumpft mit der Feldlänge (ai.js, aiDecide). Vorher kamen im
// Park 59 % der Schüsse aus mehr als 35 % der Feldlänge (gemessen über 16 Spiele), danach rund 30 %.
const farShare = (id, seeds) => {
  let far = 0;
  let all = 0;
  for (const seed of seeds) {
    const m = createMatch({ seed: seed * 7 + id.length, pitch: PITCHES[id], human: false, duration: 240 });
    while (m.phase !== 'ended') { stepMatch(m, undefined, 1 / 60); m.events.length = 0; }
    for (const s of m.log.shots) {
      all++;
      if (s.dist > 0.35 * 2 * m.pitch.halfLength) far++;
    }
  }
  return far / Math.max(1, all);
};

describe('Schussauswahl auf kleinen Plätzen', () => {
  it('im Park wird nicht mehr überwiegend aus der Distanz geschossen', () => {
    expect(farShare('park', [1, 2, 3, 4, 5, 6, 7, 8])).toBeLessThan(0.45);
  }, 60000);
});
