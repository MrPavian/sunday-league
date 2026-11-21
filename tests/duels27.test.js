// Neue Bewegungen (Gameplay 2.0, Punkt 27): Ballannahme mit Brust/Oberschenkel, Mauer springt, Schuh binden.
import { describe, expect, it } from 'vitest';
import { animatePlayer, createPlayerModel } from '../src/render/PlayerModel.js';
import { setPieceGestures, SP_GESTURE } from '../src/render/reactions.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: true };
const kit = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b, pattern: 'uni' };
const base = { dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', speed: 0 };

describe('Neue Bewegungen', () => {
  const pose = (o, frames = 1) => {
    const m = createPlayerModel(look, kit);
    const rest = createPlayerModel(look, kit);
    animatePlayer(rest, base);
    for (let k = 0; k < frames; k++) animatePlayer(m, { ...base, ...o });
    for (const b of Object.values(m.bones)) for (const v of [b.rotation.x, b.rotation.y, b.rotation.z, b.position.y]) expect(Number.isFinite(v)).toBe(true);
    return { m: m.bones, r: rest.bones };
  };

  it('Brust: Oberkörper zurück, Arme seitlich; Oberschenkel: Knie hoch', () => {
    const c = pose({ ctrl: { kind: 'brust', t: 0.4 } });
    expect(c.m.spine.rotation.x).toBeLessThan(c.r.spine.rotation.x - 0.2);
    const t = pose({ ctrl: { kind: 'schenkel', t: 0.4, side: 1 } });
    expect(t.m.upperLegR.rotation.x).toBeLessThan(-0.9);
  });

  it('Mauer springt hoch und dreht sich weg; Schuh binden geht in die Knie', () => {
    const w = pose({ wallJump: 0.4 });
    expect(w.m.hips.position.y).toBeGreaterThan(w.r.hips.position.y + 0.15);
    expect(w.m.hips.rotation.y).toBeGreaterThan(0.5);
    const s = pose({ gesture: 'schuh' }, 60);
    expect(s.m.hips.position.y).toBeLessThan(s.r.hips.position.y - 0.3);
  });

  it('Schuh binden: nur bei Freistoß/Abstoß in der Pause, fest je Standard, einer weit weg vom Ball', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.grossfeld, human: false, aiCoach: false });
    while (m.phase !== 'play') stepMatch(m, undefined, 1 / 60);
    let shown = 0;
    for (let t = 0; t < 40; t++) {
      m.setPiece = { type: 'freekick', team: 0, takerId: m.players[3].id, time: t * 7.3, taken: false };
      m.phase = 'setpiece';
      const g = setPieceGestures(m);
      expect(setPieceGestures(m)).toEqual(g);
      for (const [id, name] of g) {
        expect(name).toBe('schuh');
        const p = m.players.find((q) => q.id === id);
        expect(Math.hypot(p.pos.x - m.ball.pos.x, p.pos.z - m.ball.pos.z)).toBeGreaterThan(SP_GESTURE.shoeDist);
        shown++;
      }
    }
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(25);
  });
});
