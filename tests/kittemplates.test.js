// Vorlagen aus den Trikotbögen des Nutzers (2026-11-08): einfärbbar, nach Farbzahl (1–4) und Retro gruppiert, mit vierter Farbe.
import { describe, expect, it } from 'vitest';
import { KIT_COLORS, KIT_PATTERNS } from '../src/career/career.js';
import { FOUR_COLOR, PATTERN_IDS, patternColors, patternFn, paintKit, RETRO_IDS, RETRO_MODELS } from '../src/render/kitPaint.js';

const NEW = ['rahmen', 'feinringel', 'blockkaro', 'dreiringel', 'viertel3', 'schaerpe3', 'vwinkel3', 'vierband', 'wuerfel', 'saegewinkel4', 'saege', 'saege3', 'saegepasse', 'saegepinsel', 'zickzackringel', 'harlekin', 'harlekin3', 'pinsel', 'stern', 'tonzickzack', 'tonraute', 'tonsaege', 'tonstern',
  // nach der Trikotgeschichte (2026-11-08)
  'schulternaht', 'schulterdreieck', 'raglan', 'passeband', 'seitenbalken', 'westennaht', 'ringelpasse', 'bogenseiten', 'schulterbalken', 'pinselschulter', 'winkelbalken', 'verlaufsringel', 'punktverlauf', 'faechersaum', 'schulterband', 'tonquadrate', 'tonscherben'];
const COLORS = { shirt: 0x2f6fb5, second: 0xf2efe6, third: 0xc8352f, fourth: 0xe0b020 };
const HEX = ['#2f6fb5', '#f2efe6', '#c8352f', '#e0b020'];
function used(pattern) {
  const seen = new Set();
  const ctx = { globalAlpha: 1, fillStyle: '', fillRect() { if (this.globalAlpha === 1) seen.add(this.fillStyle); } };
  paintKit(ctx, { pattern, ...COLORS, collar: 'standard' });
  return seen;
}

describe('Trikotvorlagen aus den Bögen', () => {
  it('jede neue Vorlage ist benannt (de/en) und gehört genau einer Gruppe an', () => {
    for (const id of NEW) {
      expect(PATTERN_IDS, id).toContain(id);
      expect(KIT_PATTERNS[id], id).toBeTruthy();
    }
    const groups = { 1: 0, 2: 0, 3: 0, 4: 0, retro: 0 };
    for (const id of PATTERN_IDS) groups[RETRO_IDS.has(id) ? 'retro' : patternColors(id)]++;
    expect(groups[4]).toBeGreaterThanOrEqual(3);
    for (const k of [1, 2, 3]) expect(groups[k]).toBeGreaterThanOrEqual(6);
    for (const id of Object.keys(RETRO_MODELS)) expect(RETRO_IDS.has(id), id).toBe(true);
  });

  it('frei einfärbbar: jede Vorlage malt genau so viele Farben, wie sie verspricht (Ton in Ton: nur Hauptfarbe)', () => {
    for (const id of NEW) {
      const seen = used(id);
      const n = patternColors(id);
      for (let k = 0; k < 4; k++) expect(seen.has(HEX[k]), `${id} Farbe ${k + 1}`).toBe(k < n);
    }
  });

  it('vierte Farbe: ohne eigene vierte Farbe fällt sie auf die dritte zurück', () => {
    for (const id of FOUR_COLOR) {
      const seen = new Set();
      const ctx = { globalAlpha: 1, fillStyle: '', fillRect() { if (this.globalAlpha === 1) seen.add(this.fillStyle); } };
      paintKit(ctx, { pattern: id, shirt: COLORS.shirt, second: COLORS.second, third: COLORS.third });
      expect(seen.has('#e0b020'), id).toBe(false);
      expect(seen.has('#c8352f'), id).toBe(true);
    }
  });

  it('spiegelgleich, wo das Vorbild es ist (Nutzer: „Achte auf Symmetrie“, dann „wenn das Original keine Symmetrie hat, dann ohne“)', () => {
    // Wie im Original ungleich: geteilte und schräge Muster, Allover-Drucke, Pinsel, Winkelbalken 2014/15, Ton-Quadrate, Ton-Scherben, Würfelraster.
    const ASYM = new Set(['haelften', 'schaerpe', 'diagonal', 'blitz', 'krakel', 'regenbogen', 'tondiagonal', 'quadranten', 'trikolore', 'blockkaro', 'viertel3', 'schaerpe3', 'zickzack', 'welle', 'keile', 'linien', 'konfetti', 'pinsel', 'saegepinsel', 'wuerfel', 'pinselschulter', 'winkelbalken', 'tonquadrate', 'tonscherben']);
    const SIDES = new Set(['saege3', 'saegewinkel4']); // Form spiegelgleich, links und rechts eigene Farbe
    const norm = (v) => (v === true ? 1 : v === false ? 0 : v);
    for (const id of PATTERN_IDS) {
      if (ASYM.has(id)) continue;
      const f = patternFn(id);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 8; x++) {
          const a = norm(f(x, y, 'front'));
          const b = norm(f(15 - x, y, 'front'));
          if (SIDES.has(id)) expect(!!a, `${id} ${x},${y}`).toBe(!!b);
          else expect(a, `${id} ${x},${y}`).toBe(b);
        }
    }
  });

  it('Farbauswahl mit Neonfarben, ohne doppelte Farben', () => {
    expect(KIT_COLORS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(KIT_COLORS).size).toBe(KIT_COLORS.length);
    for (const neon of [0xd8ff2a, 0x39ff6a, 0xff7a1a, 0xff3fa4, 0x2ee6ff]) expect(KIT_COLORS).toContain(neon);
  });
});
