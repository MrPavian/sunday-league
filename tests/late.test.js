// Schlussphase (Gameplay 2.0, Punkt 28): In der letzten Minute geht der Torwart bei einer Ecke mit nach vorn – nur bei einem Tor
// Rückstand – und läuft danach zurück.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { LATE } from '../src/sim/plan.js';
import { attackDir } from '../src/sim/players.js';
import { startSetPiece } from '../src/sim/setpieces.js';

const DT = 1 / 60;

function corner(score, share, seed = 7) {
  const pitch = PITCHES.grossfeld;
  const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  m.score = score;
  m.time = m.duration * share;
  const s = attackDir(m, 0);
  startSetPiece(m, { type: 'corner', team: 0, spot: { x: s * pitch.halfLength, z: pitch.halfWidth } });
  const gk = m.players.find((p) => p.team === 0 && p.role === 'gk');
  return { m, gk, s, up: m.events.some((e) => e.type === 'keeper_up') };
}

describe('Torwart geht bei der letzten Ecke mit', () => {
  it('ein Tor hinten, letzte Minute: im gegnerischen Strafraum, danach zurück', () => {
    const { m, gk, s, up } = corner([0, 1], 0.99);
    expect(up).toBe(true);
    expect(gk.pos.x * s).toBeGreaterThan(m.pitch.halfLength * 0.6);
    let back = false;
    for (let i = 0; i < 60 * 30 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      m.events.length = 0;
      if (gk.pos.x * s < 0) {
        back = true;
        break;
      }
    }
    // Entweder er ist zurück in der eigenen Hälfte, oder das Spiel ist vorbei (letzte Minute).
    expect(back || m.phase === 'ended').toBe(true);
  });

  it('nicht bei Gleichstand, nicht bei zwei Toren Rückstand, nicht früher, nicht abgeschaltet', () => {
    expect(corner([1, 1], 0.99).up).toBe(false);
    expect(corner([0, 2], 0.99).up).toBe(false);
    expect(corner([0, 1], 0.9).up).toBe(false);
    LATE.on = false;
    try {
      expect(corner([0, 1], 0.99).up).toBe(false);
    } finally {
      LATE.on = true;
    }
  });
});
