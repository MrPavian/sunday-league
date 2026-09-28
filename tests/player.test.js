import { describe, expect, it } from 'vitest';
import { animatePlayer, BONES, createPlayerModel, FACES, posePlayer } from '../src/render/PlayerModel.js';

const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: true };
const kit = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b, pattern: 'uni' };
const base = { dt: 1 / 60, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };

describe('Spieler 2.0', () => {
  it('ist ein SkinnedMesh mit 14 Knochen und starren Gewichten', () => {
    const m = createPlayerModel(look, kit, { number: 7 });
    expect(m.mesh.isSkinnedMesh).toBe(true);
    expect(m.mesh.skeleton.bones.length).toBe(BONES.length);
    const si = m.mesh.geometry.attributes.skinIndex;
    const sw = m.mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) {
      expect(si.getX(i)).toBeLessThan(BONES.length);
      expect(sw.getX(i)).toBe(1);
      expect(sw.getY(i) + sw.getZ(i) + sw.getW(i)).toBe(0);
    }
    // Low-Poly: wenige Dreiecke je Figur.
    expect(si.count / 3).toBeLessThan(900);
  });

  it('sieht immer gleich aus (deterministisch, kein Zufall)', () => {
    const a = createPlayerModel(look, kit);
    const b = createPlayerModel(look, kit);
    expect(Array.from(a.mesh.geometry.attributes.position.array)).toEqual(Array.from(b.mesh.geometry.attributes.position.array));
    expect(a.phase).toBe(b.phase);
  });

  it('Füße stehen auf dem Boden, Kopf oben', () => {
    const m = createPlayerModel({ ...look, height: 1 }, kit);
    const p = m.mesh.geometry.attributes.position;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < p.count; i++) {
      min = Math.min(min, p.getY(i));
      max = Math.max(max, p.getY(i));
    }
    expect(min).toBeCloseTo(0, 2);
    expect(max).toBeGreaterThan(1.7);
    expect(max).toBeLessThan(1.95);
  });

  it('alle Posen ergeben endliche Winkel, ohne Gameplay-Daten zu ändern', () => {
    const m = createPlayerModel(look, kit, { keeper: true });
    const poses = [
      { speed: 0 }, { speed: 2 }, { speed: 5 }, { speed: 9 },
      { speed: 1, kickAnim: 0.2 }, { speed: 1, kickAnim: 0.1, kick: 'pass' }, { speed: 0, headAnim: 0.15 },
      { speed: 3, state: 'tackle' }, { speed: 0, state: 'down' }, { speed: 0, state: 'complain' },
      { speed: 0, dive: { t: 0.3, side: -1 } }, { speed: 0, holding: 'chest' }, { speed: 0, holding: 'overhead' },
      { speed: 0, celebrate: 'flugzeug' }, { speed: 0, celebrate: 'faust' }, { speed: 0, celebrate: 'tanz' }, { speed: 3, celebrate: 'rutscher' },
      { speed: 0, sad: true }, { speed: 4, injured: true },
    ];
    for (const o of poses) {
      const input = { ...base, ...o };
      const copy = JSON.stringify(input);
      for (let k = 0; k < 20; k++) animatePlayer(m, input);
      expect(JSON.stringify(input)).toBe(copy);
      for (const n of BONES) {
        const b = m.bones[n];
        for (const v of [b.rotation.x, b.rotation.y, b.rotation.z, b.position.x, b.position.y, b.position.z]) expect(Number.isFinite(v), `${n} ${JSON.stringify(o)}`).toBe(true);
      }
      expect(FACES).toContain(m.face);
    }
  });

  it('Zuschauer-Pose: sitzen senkt die Hüfte', () => {
    const m = createPlayerModel(look, kit);
    posePlayer(m, { sitting: true });
    expect(m.bones.hips.position.y).toBeLessThan(m.rest.hips[1]);
  });
});
