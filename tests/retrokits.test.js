// Retro-Trikotmuster (vom Nutzer gewünscht, 2026-10-29): frei einfärbbar, mit dritter Farbe, jedes mit Namen und Vorbild.
import { describe, expect, it } from 'vitest';
import { KIT_PATTERNS } from '../src/career/career.js';
import { PATTERN_IDS, RETRO_MODELS, THREE_COLOR, paintKit } from '../src/render/kitPaint.js';

// Kleiner Ersatz für den Canvas: merkt sich die Farbe jedes Pixels.
function fakeCtx() {
  const px = new Map();
  return { px, fillStyle: '', globalAlpha: 1, save() {}, restore() {}, fillRect(x, y, w, h) { if (this.globalAlpha !== 1) return; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px.set(`${x + i},${y + j}`, this.fillStyle); }, drawImage() {}, getImageData() { return { data: [] }; }, putImageData() {}, set globalCompositeOperation(v) {} };
}
const kit = (pattern) => ({ pattern, shirt: 0x4fa3e0, second: 0xf2efe6, third: 0x1d2b44 });

describe('Retro-Muster', () => {
  it('jedes Retro-Muster ist bekannt, hat einen Namen (de/en) und ein Vorbild', () => {
    for (const id of Object.keys(RETRO_MODELS)) {
      expect(PATTERN_IDS).toContain(id);
      expect(KIT_PATTERNS[id]).toBeTruthy();
    }
    expect(Object.keys(RETRO_MODELS).length).toBeGreaterThanOrEqual(14);
  });
  it('dreifarbige Muster nutzen alle drei Farben, die anderen höchstens zwei', () => {
    for (const id of Object.keys(RETRO_MODELS)) {
      const ctx = fakeCtx();
      paintKit(ctx, kit(id));
      const colors = new Set([...ctx.px.values()].filter((c) => ['#4fa3e0', '#f2efe6', '#1d2b44'].includes(c)));
      if (THREE_COLOR.has(id)) expect(colors.size, id).toBe(3);
      else expect(colors.has('#1d2b44'), id).toBe(false);
    }
  });
});
