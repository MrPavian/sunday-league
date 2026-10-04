// Trikotmuster, Kragen, Ärmelfarbe, Wappenband, Meistersterne, neue Motive – und alte Spielstände.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { humanClub, importCareer, KIT_COLLARS, KIT_PATTERNS, KIT_SLEEVES, updateClub } from '../src/career/career.js';
import { COLLARS, PATTERN_IDS, paintKit, sleeveColor } from '../src/render/kitPaint.js';
import { CREST_BAND_TEXTS, CREST_SYMBOLS, crestExtras, crestOf, crestSVG, defaultCrest } from '../src/ui/crest.js';

// Canvas-Ersatz: merkt sich die Farbe jedes Pixels (4 Seiten à 16 × 16).
function canvas() {
  const px = Array.from({ length: 16 }, () => Array(64).fill(null));
  return {
    px,
    ctx: {
      fillStyle: '#000000',
      globalAlpha: 1,
      save() {},
      restore() {},
      fillRect(x, y, w, h) {
        if (this.globalAlpha < 1) return; // Falten/Dreck zählen nicht
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (px[j]?.[i] !== undefined) px[j][i] = this.fillStyle;
      },
    },
  };
}
const KIT = { shirt: 0x2e6b3a, shorts: 0xf2efe6, socks: 0x2e6b3a, second: 0xe0b020 };

describe('Trikotmuster', () => {
  it('die neuen Muster sind benannt (DE/EN) und male alle vier Seiten ohne Lücke', () => {
    for (const id of ['diagonal', 'breit', 'verlauf', 'aermel']) {
      expect(PATTERN_IDS).toContain(id);
      expect(KIT_PATTERNS[id]).toBeTruthy();
    }
    for (const id of PATTERN_IDS) {
      const { ctx, px } = canvas();
      expect(() => paintKit(ctx, { ...KIT, pattern: id })).not.toThrow();
      expect(px.flat().every((c) => /^#[0-9a-f]{6}$/.test(c)), id).toBe(true);
      if (id !== 'uni') expect(new Set(px.flat()).size, id).toBe(2); // beide Farben tauchen auf
    }
  });

  it('Farbverlauf: oben Hauptfarbe, unten zweite Farbe', () => {
    const { ctx, px } = canvas();
    paintKit(ctx, { ...KIT, pattern: 'verlauf' }, { faces: ['front'] });
    const second = px.map((r) => r.slice(0, 16).filter((c) => c === '#e0b020').length);
    expect(second[0]).toBe(0);
    expect(second[15]).toBe(16);
    expect(second[8]).toBeGreaterThan(second[4]);
  });

  it('Kragen: Pixel nur oben im Atlas, Standard malt nichts, alle Arten verschieden', () => {
    const base = canvas();
    paintKit(base.ctx, { ...KIT, pattern: 'uni' });
    const looks = new Set();
    for (const id of Object.keys(KIT_COLLARS)) {
      const { ctx, px } = canvas();
      paintKit(ctx, { ...KIT, pattern: 'uni', collar: id });
      const diff = px.flatMap((r, y) => r.map((c, x) => (c !== base.px[y][x] ? [x, y] : null)).filter(Boolean));
      if (id === 'standard') expect(diff).toHaveLength(0);
      else expect(diff.length).toBeGreaterThan(3);
      for (const [x, y] of diff) {
        expect(y).toBeLessThanOrEqual(4);
        expect(x < 16 || (x >= 16 && x < 32)).toBe(true); // nur vorne und hinten
      }
      looks.add(JSON.stringify(diff));
    }
    expect(looks.size).toBe(Object.keys(COLLARS).length);
  });

  it('Ärmelfarbe: Option „2. Farbe“ und Ärmelfeld nehmen die Zweitfarbe, sonst Hauptfarbe', () => {
    expect(Object.keys(KIT_SLEEVES)).toEqual(['main', 'second']);
    expect(sleeveColor({ ...KIT, pattern: 'uni' })).toBe(KIT.shirt);
    expect(sleeveColor({ ...KIT, pattern: 'uni', sleeves: 'second' })).toBe(KIT.second);
    expect(sleeveColor({ ...KIT, pattern: 'aermel' })).toBe(KIT.second);
    expect(sleeveColor({ shirt: KIT.shirt, pattern: 'uni', sleeves: 'second' })).toBe(KIT.shirt);
  });
});

describe('Wappen', () => {
  const crest = { ...defaultCrest({ id: 'kanal' }), band: true };

  it('acht neue Motive, alle zeichnen und sind benannt; Standardwappen bleiben stabil', () => {
    const neu = ['spaten', 'traktor', 'windrad', 'kirche', 'burg', 'aehre', 'glocke', 'hufeisen'];
    for (const s of neu) {
      expect(CREST_SYMBOLS[s]).toBeTruthy();
      expect(crestSVG({ ...crest, symbol: s }, { short: 'SVS' })).toContain('<rect x=');
    }
    expect(neu.includes(defaultCrest({ id: 'kanal' }).symbol)).toBe(false);
    for (const id of ['a', 'b', 'c', 'kiosk', 'kanal', 'x1']) expect(neu).not.toContain(defaultCrest({ id }).symbol);
  });

  it('Schriftband zeigt Kürzel, Jahr oder beides', () => {
    expect(Object.keys(CREST_BAND_TEXTS)).toEqual(['short', 'year', 'both']);
    const svg = (bandText) => crestSVG({ ...crest, bandText }, { short: 'SVS', year: 2004 });
    expect(svg('short')).toContain('>SVS<');
    expect(svg('year')).toContain('>2004<');
    expect(svg('both')).toContain('>SVS 04<');
    expect(crestSVG({ ...crest, band: false }, { short: 'SVS' })).not.toContain('<text');
  });

  it('Meistersterne: aus Titeln der Karriere, höchstens fünf, abschaltbar', () => {
    const career = { history: [{ pos: 1 }, { pos: 3 }, { pos: 1 }], founded: 1998 };
    expect(crestExtras(career)).toEqual({ stars: 2, year: 1998 });
    expect(crestExtras({ history: Array(9).fill({ pos: 1 }) }).stars).toBe(5);
    expect(crestExtras({}).stars).toBe(0);
    const count = (svg) => (svg.match(/<path d="M[\d.]+ -?[\d.]+ L/g) ?? []).length;
    expect(count(crestSVG(crest, { stars: 2 }))).toBe(2);
    expect(count(crestSVG(crest, { stars: 0 }))).toBe(0);
    expect(count(crestSVG({ ...crest, stars: false }, { stars: 3 }))).toBe(0);
    expect(count(crestSVG(crest, { stars: 9 }))).toBe(5);
  });
});

describe('alter Spielstand', () => {
  const c = importCareer(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8'));

  it('lädt, Wappen und Trikot aller Vereine zeichnen ohne Fehler', () => {
    expect(c).toBeTruthy();
    for (const club of c.clubs) {
      expect(() => crestSVG(crestOf(club), { short: club.short, ...crestExtras(c) })).not.toThrow();
      const { ctx, px } = canvas();
      expect(() => paintKit(ctx, club.kit)).not.toThrow();
      expect(px.flat().every(Boolean)).toBe(true);
    }
    const me = humanClub(c);
    expect(me.kit.collar).toBeUndefined();
    expect(sleeveColor(me.kit)).toBe(me.kit.shirt);
  });

  it('neue Felder lassen sich setzen und werden gespeichert', () => {
    const me = humanClub(c);
    expect(updateClub(c, { kit: { collar: 'v', sleeves: 'second', pattern: 'diagonal', second: 0xe0b020 } }, { free: true })).toBe(true);
    expect(me.kit).toMatchObject({ collar: 'v', sleeves: 'second', pattern: 'diagonal' });
  });
});
