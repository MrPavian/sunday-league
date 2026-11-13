// Gesten bei Standards (render/reactions.js setPieceGestures): Arm hoch vor der Ecke, Mitspieler winken beim Einwurf.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setPieceGestures, SP_GESTURE } from '../src/render/reactions.js';

describe('Gesten bei Standards', () => {
  it('ohne Standard oder nach der Ausführung: nichts', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.rasenplatz, human: false });
    m.setPiece = null;
    expect(setPieceGestures(m).size).toBe(0);
    m.setPiece = { type: 'corner', team: 0, takerId: m.players[1].id, time: m.time - 1, taken: true };
    expect(setPieceGestures(m).size).toBe(0);
  });

  it('Ecke: nur der Schütze – in der letzten Sekunde der Pause und kurz in den Anlauf hinein', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.rasenplatz, human: false });
    const taker = m.players.find((p) => p.team === 0 && p.role !== 'gk');
    m.setPiece = { type: 'corner', team: 0, takerId: taker.id, time: m.time, taken: false };
    m.phase = 'setpiece';
    m.phaseTimer = SP_GESTURE.cornerLead + 0.1;
    expect(setPieceGestures(m).size).toBe(0); // der Ball wird noch hingelegt
    m.phaseTimer = SP_GESTURE.cornerLead - 0.1;
    expect([...setPieceGestures(m)]).toEqual([[taker.id, 'eckeArm']]);
    m.phase = 'play';
    expect(setPieceGestures(m).size).toBe(1); // Anlauf
    m.setPiece.time = m.time - SP_GESTURE.cornerAfter - 0.1;
    expect(setPieceGestures(m).size).toBe(0);
  });

  it('Einwurf im echten Spiel: höchstens zwei stehende Mitspieler in der Nähe winken, nie der Werfer oder ein Gegner', () => {
    let seen = 0;
    for (const seed of [1, 2, 3]) {
      const m = createMatch({ seed, pitch: PITCHES.sportplatz, human: false });
      for (let i = 0; i < 60 * 60 * 6 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, 1 / 60);
        const sp = m.setPiece;
        if (!sp || sp.taken || sp.type !== 'throwin') continue;
        const g = setPieceGestures(m);
        expect(g.size).toBeLessThanOrEqual(SP_GESTURE.callers);
        for (const [id, name] of g) {
          const p = m.players.find((x) => x.id === id);
          expect(name).toBe('call');
          expect(p.team).toBe(sp.team);
          expect(id).not.toBe(sp.takerId);
          expect(Math.hypot(p.pos.x - m.ball.pos.x, p.pos.z - m.ball.pos.z)).toBeLessThanOrEqual(SP_GESTURE.callDist);
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  }, 120000);
});
