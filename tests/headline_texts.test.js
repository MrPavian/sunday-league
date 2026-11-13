// Schlagzeilen im Kreisblatt (sim/stats.js headline): mehrere Fassungen je Lage, ohne den Spielzufall.
import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { headline } from '../src/sim/stats.js';

const fake = (seed, score) => {
  const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false });
  m.score = score;
  return m;
};

describe('Schlagzeilen mit Abwechslung', () => {
  it('Remis, knapper und hoher Sieg: je mehrere Fassungen, alle mit Ergebnis oder Vereinsnamen', () => {
    for (const score of [[0, 0], [2, 2], [5, 0]]) {
      const seen = new Set();
      for (let seed = 1; seed <= 30; seed++) {
        const m = fake(seed, score);
        const h = headline(m, {});
        expect(h.length).toBeGreaterThan(10);
        expect(h.includes(m.teams[0].name) || h.includes(m.teams[1].name)).toBe(true);
        seen.add(h);
      }
      expect(seen.size, `Fassungen bei ${score.join(':')}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('gleiches Spiel, gleiche Schlagzeile', () => {
    expect(headline(fake(4, [1, 1]), {})).toBe(headline(fake(4, [1, 1]), {}));
  });
});
