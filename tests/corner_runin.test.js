// Einlaufen bei Ecken (sim/ai.js CORNER_RUN, setpieces.js lineUpCorner): Die Angreifer warten vor ihrer Zone und laufen mit der
// Ausführung ein; die Deckung steht schon in der Zone.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { cornerSpots, cornerStart, CORNER_RUN } from '../src/sim/ai.js';
import { dist2d } from '../src/core/math.js';

describe('Einlaufen bei Ecken', () => {
  it('Startpunkt liegt CORNER_RUN.back Meter weiter vom Tor weg als die Zone', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.grossfeld, human: false });
    for (const sp of cornerSpots(m, 0)) {
      const st = cornerStart(m, 0, sp);
      expect(Math.abs(st.x)).toBeLessThan(Math.abs(sp.x));
      expect(Math.abs(sp.x) - Math.abs(st.x)).toBeGreaterThanOrEqual(CORNER_RUN.back - 1e-9);
    }
  });

  it('im Spiel: vor der Ausführung stehen die Angreifer vor der Zone, kurz nach dem Schuss sind sie näher dran', () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const m = createMatch({ seed, pitch: PITCHES.grossfeld, human: false });
      let before = null;
      while (m.phase !== 'ended' && checked < 6) {
        stepMatch(m, undefined, 1 / 60);
        const sp = m.setPiece;
        if (!sp || sp.type !== 'corner') continue;
        if (!sp.taken && m.phase === 'setpiece' && !before) {
          const zones = cornerSpots(m, sp.team);
          before = { sp, zones, d: (ps) => ps.map((p) => Math.min(...zones.map((z) => dist2d(p.pos, z)))) };
          before.att = m.players.filter((p) => p.team === sp.team && p.role !== 'gk' && p.id !== sp.takerId && Math.min(...zones.map((z) => dist2d(p.pos, z))) < 6);
          before.start = before.d(before.att);
        }
        if (before && before.sp === sp && sp.taken && m.time - sp.takenAt > 0.5) {
          if (before.att.length) {
            const now = before.d(before.att);
            const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
            expect(mean(before.start)).toBeGreaterThan(1.5); // gewartet wird vor der Zone
            expect(mean(now)).toBeLessThan(mean(before.start)); // und dann eingelaufen
            checked++;
          }
          before = null;
        }
        if (before && before.sp !== sp) before = null;
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, 120000);
});
