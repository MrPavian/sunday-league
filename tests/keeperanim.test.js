// Hechtsprung in Phasen: Abdruck, Flugbogen (flach/hoch), Landung, Aufstehen – ohne Sprünge im Bild.
import { describe, expect, it } from 'vitest';
import { animatePlayer, createPlayerModel } from '../src/render/PlayerModel.js';

const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: false };
const kit = { shirt: 0x2a8a3a, shorts: 0x1c1c1c, socks: 0x2a8a3a, pattern: 'uni' };
const DT = 1 / 60;
const pose = (m, dive) => {
  animatePlayer(m, { speed: 0, dt: DT, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', dive });
  const b = m.bones;
  return { y: b.hips.position.y, x: b.hips.position.x, roll: b.hips.rotation.z, armL: b.upperArmL.rotation.x, armR: b.upperArmR.rotation.x, elbowL: b.lowerArmL.rotation.x, kneeL: b.lowerLegL.rotation.x, kneeR: b.lowerLegR.rotation.x };
};
// Ganzer Ablauf in Bildern: Sprung (0.5 s) und Aufstehen (0.4 s).
function sequence(opts) {
  const m = createPlayerModel(look, kit, { keeper: true });
  const frames = [];
  for (let t = 0.5; t > 0; t -= DT) frames.push(pose(m, { t, side: 1, ...opts }));
  for (let r = 0; r <= 1; r += DT / 0.4) frames.push(pose(m, { t: 0, side: 1, ...opts, rec: Math.min(1, r) }));
  return { m, frames };
}

describe('Torwart-Hechtsprung', () => {
  it('fliegt im Bogen: in der Luft höher als beim Abdruck und bei der Landung', () => {
    const { frames } = sequence({ high: 0 });
    const n = Math.round(0.5 / DT);
    const peak = Math.max(...frames.slice(0, n).map((f) => f.y));
    expect(peak).toBeGreaterThan(frames[Math.round(n * 0.15)].y + 0.1); // gemessen: 0,84 gegen 0,70 in der Hocke
    expect(peak).toBeGreaterThan(frames[n - 1].y + 0.4); // Landung liegt bei 0,32
  });

  it('hoher Ball: höherer Bogen und Arme weiter über dem Kopf', () => {
    const lo = sequence({ high: 0 }).frames;
    const hi = sequence({ high: 1 }).frames;
    const n = Math.round(0.5 / DT);
    expect(Math.max(...hi.slice(0, n).map((f) => f.y))).toBeGreaterThan(Math.max(...lo.slice(0, n).map((f) => f.y)) + 0.15);
    const mid = Math.round(n * 0.45);
    expect(hi[mid].armL).toBeLessThan(lo[mid].armL - 0.4);
  });

  it('gefangener Ball wandert bei der Landung an die Brust', () => {
    const n = Math.round(0.5 / DT);
    const caught = sequence({ high: 0, caught: true }).frames[n - 1];
    const free = sequence({ high: 0, caught: false }).frames[n - 1];
    expect(caught.armL).toBeCloseTo(-1.05, 1);
    expect(caught.elbowL).toBeCloseTo(-1.25, 1);
    expect(free.armL).toBeLessThan(-2);
  });

  it('steht danach auf und endet aufrecht', () => {
    const { m, frames } = sequence({ high: 0.5 });
    const last = frames[frames.length - 1];
    expect(last.y).toBeCloseTo(m.rest.hips[1], 2);
    expect(Math.abs(last.roll)).toBeLessThan(0.01);
    expect(m.grounded).toBe(false);
  });

  it('kein Ruck zwischen zwei Bildern (Abdruck → Flug → Landung → Aufstehen)', () => {
    for (const opts of [{ high: 0 }, { high: 1 }, { high: 0.5, caught: true }]) {
      const { frames } = sequence(opts);
      let worst = 0;
      for (let i = 1; i < frames.length; i++) for (const k of Object.keys(frames[i])) worst = Math.max(worst, Math.abs(frames[i][k] - frames[i - 1][k]));
      expect(worst).toBeLessThan(0.4); // gemessen höchstens 0,33 rad; vorher kippte er am Ende in einem Bild 1,35 rad zurück
    }
  });
});

describe('Posen bei Vorfällen', () => {
  const at = (opts, frames = 10) => {
    const m = createPlayerModel(look, kit);
    for (let i = 0; i < frames; i++) animatePlayer(m, { speed: 6, dt: DT, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', ...opts });
    return m.bones;
  };
  it('Gewitter: beim Rennen die Hände über dem Kopf', () => {
    const b = at({ cover: 1 });
    expect(b.upperArmL.rotation.x).toBeLessThan(-2.3);
    expect(b.upperArmR.rotation.x).toBeLessThan(-2.3);
    expect(b.lowerArmL.rotation.x).toBeLessThan(-1.5);
  });
  it('Polizei: Zeigefinger hoch, Arme verschränkt; Taube: scheuchen mit beiden Armen', () => {
    expect(at({ speed: 0, gesture: 'finger' }).upperArmR.rotation.x).toBeLessThan(-1.5);
    const crossed = at({ speed: 0, gesture: 'arme' });
    expect(crossed.lowerArmL.rotation.x).toBeLessThan(-1.8);
    expect(crossed.lowerArmR.rotation.x).toBeLessThan(-1.8);
    // Scheuchen bewegt die Arme hin und her (Periode 2π/11 s ≈ 34 Bilder: Bild 9 oben, Bild 26 unten).
    const a = at({ speed: 0, gesture: 'scheuchen' }, 9).upperArmL.rotation.x;
    const b = at({ speed: 0, gesture: 'scheuchen' }, 26).upperArmL.rotation.x;
    expect(Math.abs(a - b)).toBeGreaterThan(0.2);
  });
});
