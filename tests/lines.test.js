// Mannschaftsteile (Gameplay 2.0, Punkt 25): Die Abwehrkette hält mit Abseits (Großfeld) eine gemeinsame Linie.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { LINES } from '../src/sim/ai.js';

const DT = 1 / 60;

// Mittlerer Abstand zwischen vorderstem und hinterstem Verteidiger der Mannschaft ohne Ball (Ball nicht vor dem eigenen Tor).
function spread(venue, seeds, on) {
  LINES.on = on;
  let sum = 0;
  let n = 0;
  const out = [];
  try {
    for (const seed of seeds) {
      const pitch = PITCHES[venue];
      const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
      let k = 0;
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
        if (m.phase !== 'play' || m.lastTouchTeam == null || k++ % 30) continue;
        const def = 1 - m.lastTouchTeam;
        const s = attackDir(m, def);
        const xs = m.players.filter((p) => p.team === def && p.role === 'def').map((p) => p.pos.x * s);
        if (xs.length < 2 || m.ball.pos.x * s < -pitch.halfLength * 0.45) continue;
        sum += Math.max(...xs) - Math.min(...xs);
        n++;
      }
      out.push([...m.score]);
    }
  } finally {
    LINES.on = true;
  }
  return { spread: sum / n, scores: out };
}

describe('Abwehrkette auf einer Linie', () => {
  it('Großfeld: Die Verteidiger stehen enger auf einer Höhe als ohne gemeinsame Linie', () => {
    const on = spread('grossfeld', [901, 902, 903], true);
    const off = spread('grossfeld', [901, 902, 903], false);
    expect(on.spread).toBeLessThan(off.spread * 0.92); // gemessen 4,7 gegen 6,0 m (40 Spiele)
  }, 300000);

  it('ohne Abseits (kleinere Plätze) ändert sich nichts', () => {
    const on = spread('sportplatz', [905], true);
    const off = spread('sportplatz', [905], false);
    expect(on.scores).toEqual(off.scores);
    expect(on.spread).toBeCloseTo(off.spread, 6);
  }, 120000);
});
