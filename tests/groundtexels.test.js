// Bodentextur: so fein wie die Bildschirmpixel der niedrigsten Stufe (nie feiner – sonst flimmert der Boden
// beim Kameraschwenk, weil ohne Mipmaps pixelgenau abgetastet wird), nie gröber als vorher (12 Texel/m) und
// höchstens GROUND_TEXELS_MAX Texel groß.
import { describe, expect, it } from 'vitest';
import { cameraViewHeight, LADDER, QUALITY, setCurrentQuality } from '../src/render/quality.js';
import { GROUND_TEXELS_MAX, groundTexels } from '../src/render/textures.js';
import { PITCHES } from '../src/sim/pitch.js';

const GROUNDS = [
  ['rasenplatz', 15, (p) => [2 * p.halfLength + 20, 2 * p.halfWidth + 16]],
  ['sportplatz', 15, (p) => [2 * p.halfLength + 20, 2 * p.halfWidth + 16]],
  ['grossfeld', 15, (p) => [2 * p.halfLength + 20, 2 * p.halfWidth + 16]],
  ['ascheplatz', 13, () => [56, 40]],
];

describe('Texeldichte des Bodens', () => {
  for (const platform of ['pc', 'android']) {
    it(`${platform}: zwischen 12 Texel/m und den Bildschirmpixeln der niedrigsten Stufe, im Speicherbudget`, () => {
      const lowest = Math.min(...LADDER[platform].map((id) => QUALITY[id].internalHeight));
      for (const id of LADDER[platform]) {
        setCurrentQuality(id);
        for (const [venue, vh, size] of GROUNDS) {
          const [w, d] = size(PITCHES[venue]);
          const t = groundTexels(w, d, vh);
          expect(t, venue).toBeGreaterThanOrEqual(12);
          expect(t, venue).toBeLessThanOrEqual(Math.max(12, lowest / cameraViewHeight(vh)));
          expect(w * t * d * t, venue).toBeLessThanOrEqual(GROUND_TEXELS_MAX);
        }
      }
      setCurrentQuality('PC_HIGH');
    });
  }
  it('7er-Rasen auf dem PC deutlich feiner als vorher', () => {
    setCurrentQuality('PC_HIGH');
    expect(groundTexels(72, 50, 15)).toBeGreaterThanOrEqual(17);
  });
});
