import { describe, expect, it } from 'vitest';
import { CameraRig } from '../src/render/CameraRig.js';

// Kamera-Vorausschau (Großfeld, ROADMAP 11.10): Der Ball liegt hinter der Bildmitte, der Platz voraus ist größer.
const settle = (rig, x, ahead, lead, vx = 0) => {
  for (let i = 0; i < 600; i++) rig.follow(x, 0, 1 / 60, { x: 60, z: 4 }, ahead, lead, vx);
};
describe('CameraRig lead', () => {
  it('without lead the camera centres on the ball; with lead it looks ahead in the attacking direction', () => {
    const a = new CameraRig({ viewHeight: 16 });
    a.resize(640, 360);
    settle(a, 0, 1, 0);
    expect(a.target.x).toBeCloseTo(0, 1);
    const b = new CameraRig({ viewHeight: 16 });
    b.resize(640, 360);
    settle(b, 0, 1, 0.4);
    expect(b.target.x).toBeCloseTo(0.4 * b.camera.right, 1);
    settle(b, 0, -1, 0.4);
    expect(b.target.x).toBeCloseTo(-0.4 * b.camera.right, 1);
  });
  it('keeps the last direction when none is given and never leaves the bounds', () => {
    const r = new CameraRig({ viewHeight: 16 });
    r.resize(640, 360);
    settle(r, 0, 1, 0.4);
    const x = r.target.x;
    settle(r, 0, 0, 0.4);
    expect(r.target.x).toBeCloseTo(x, 3);
    settle(r, 59, 1, 0.4, 20);
    expect(r.target.x).toBeLessThanOrEqual(60 - r.camera.right + 1e-6);
  });
});
