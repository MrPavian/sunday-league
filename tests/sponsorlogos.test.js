// Sponsor auf der Trikotbrust: eigenes Branchenzeichen und Schriftmarke je Sponsor, immer sichtbar.
import { describe, expect, it } from 'vitest';
import { SPONSORS } from '../src/career/sponsors.js';
import { paintKit } from '../src/render/kitPaint.js';
import { GLYPHS, LOGOS, wordBars } from '../src/render/sponsorLogos.js';

// Canvas-Ersatz: merkt sich die Farbe jedes Pixels.
function canvas() {
  const px = Array.from({ length: 16 }, () => Array(64).fill(null));
  const ctx = {
    fillStyle: '#000000',
    globalAlpha: 1,
    fillRect(x, y, w, h) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (px[j]?.[i] !== undefined) px[j][i] = this.fillStyle;
    },
  };
  return { ctx, px };
}
const chest = (px) => px.slice(5, 11).map((r) => r.slice(2, 14).join(',')).join('|');
const lum = (css) => { const n = parseInt(css.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const SHIRTS = [0xf2efe6, 0x1c1c1c, 0xc0392b, 0x2f6fb5, 0x2e7d3a, 0xe0b020];

describe('Sponsor-Logos', () => {
  it('jeder der 60 Sponsoren hat ein eigenes Logo mit gültigem Zeichen (höchstens 5 × 4)', () => {
    for (const s of SPONSORS) {
      const logo = LOGOS[s.id];
      expect(logo, s.id).toBeTruthy();
      const g = GLYPHS[logo.glyph];
      expect(g, `${s.id}: ${logo.glyph}`).toBeTruthy();
      expect(g.length).toBeLessThanOrEqual(4);
      for (const row of g) expect(row.length).toBe(g[0].length);
      expect(g[0].length).toBeLessThanOrEqual(5);
    }
  });

  it('auf demselben Trikot sehen fast alle Sponsoren verschieden aus (nicht nur Anfangsbuchstaben)', () => {
    for (const shirt of [0xf2efe6, 0x1c1c1c]) {
      const looks = new Set(SPONSORS.map((s) => {
        const { ctx, px } = canvas();
        paintKit(ctx, { shirt, shorts: shirt, socks: shirt, pattern: 'uni' }, { sponsor: s, faces: ['front'] });
        return chest(px);
      }));
      expect(looks.size).toBeGreaterThanOrEqual(58);
    }
  });

  it('das Logo hebt sich immer vom Trikot ab – auch wenn Trikot und Markenfarbe gleich sind', () => {
    for (const s of SPONSORS) for (const shirt of [...SHIRTS, s.color]) {
      const { ctx, px } = canvas();
      paintKit(ctx, { shirt, shorts: shirt, socks: shirt, pattern: 'uni' }, { sponsor: s, faces: ['front'] });
      const base = lum(`#${shirt.toString(16).padStart(6, '0')}`);
      const strong = px.slice(5, 11).flatMap((r) => r.slice(2, 14)).filter((c) => c && Math.abs(lum(c) - base) > 0.25).length;
      expect(strong, `${s.id} auf ${shirt.toString(16)}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('Schriftmarke folgt den Wörtern: zwei Wörter → zwei Zeilen, Bindestrich → Lücke', () => {
    expect(wordBars('Döner Sultan', 6)).toHaveLength(2);
    expect(wordBars('Metzgerei Wurst-Wolf', 6, 1)[0].gaps.length).toBeGreaterThan(0);
    expect(wordBars('Kiosk Kalle', 6)[0].tall).toBe(1);
  });
});
