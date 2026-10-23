// Wappen-Editor: neue Formen, Muster (2-/3-farbig), Zierrat, Motive, Gründungsjahr – und alte Wappen unverändert.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clampFounded, createCareer, foundedRange, humanClub, updateCrest } from '../src/career/career.js';
import { CREST_DIVISIONS, CREST_DIVISION_GROUPS, CREST_OVERLAYS, CREST_SHAPES, CREST_SYMBOLS, CREST_SYMBOL_GROUPS, THIRD_COLOR_DIVISIONS, crestExtras, crestOf, crestSVG, defaultCrest, normalizeCrest } from '../src/ui/crest.js';
import { fingerprint, oldCombos } from './crestCombos.js';

const COLORS = { field: 0x2e6b3a, second: 0xf2efe6, third: 0xe0b020, border: 0x1c1c1c, symbol: 0xe0b020 };
// Gültiges SVG: ausgewogene Tags, keine NaN/undefined, Farben als #rrggbb.
const valid = (svg) => {
  expect(svg.startsWith('<svg ') && svg.endsWith('</svg>')).toBe(true);
  expect(svg).not.toMatch(/NaN|undefined|null|\[object/);
  for (const m of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) expect(m[1] === 'none' || m[1].startsWith('url(') || /^#[0-9a-f]{6}$/.test(m[1]) || m[1] === '#1c1c1c').toBe(true);
  const opens = (svg.match(/<(g|defs|clipPath|svg|text)[ >]/g) ?? []).length;
  const closes = (svg.match(/<\/(g|defs|clipPath|svg|text)>/g) ?? []).length;
  expect(opens).toBe(closes);
};

describe('Wappen: alte Wappen bleiben unverändert', () => {
  it('jede alte Kombination ergibt exakt dasselbe SVG wie vor der Erweiterung', () => {
    const base = JSON.parse(readFileSync(new URL('./fixtures/crest-baseline.json', import.meta.url), 'utf8'));
    const now = oldCombos(defaultCrest);
    expect(Object.keys(now).length).toBe(Object.keys(base).length);
    for (const [k, [c, o]] of Object.entries(now)) expect(fingerprint(crestSVG(c, o)), k).toBe(base[k]);
  });

  it('Standardwappen bleiben stabil und nutzen nur alte Formen/Teilungen', () => {
    const shapes = new Set();
    for (let i = 0; i < 200; i++) {
      const c = defaultCrest({ id: `club${i}`, kit: { shirt: i * 99991 } });
      shapes.add(c.shape);
      expect(['schild', 'spitz', 'rund', 'oval', 'raute', 'eckig', 'wimpel', 'banner', 'sechseck', 'franz']).toContain(c.shape);
      expect(c.overlay).toBe('keine');
    }
    expect(shapes.size).toBe(10);
  });

  it('altes gespeichertes Wappen (ohne dritte Farbe/Zierrat) lädt und wird ergänzt', () => {
    const old = { shape: 'rund', division: 'balken', symbol: 'stern', colors: { field: 0xc8352f, second: 0xf2efe6, border: 0x1c1c1c, symbol: 0xe0b020 }, band: true, bandText: 'both', stars: true };
    const n = normalizeCrest(old);
    expect(n.colors.third).toBeTypeOf('number');
    expect(n.overlay).toBe('keine');
    expect(crestOf({ crest: old })).toEqual(n);
    valid(crestSVG(old, { short: 'ALT', year: 1950 }));
  });
});

describe('Wappen: neue Möglichkeiten', () => {
  it('Formen, Muster, Zierrat und Motive sind benannt (DE/EN-Tabellen vollständig) und gruppiert', () => {
    expect(Object.keys(CREST_SHAPES).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(CREST_DIVISIONS).length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(CREST_SYMBOLS).length).toBeGreaterThanOrEqual(75);
    const grouped = CREST_DIVISION_GROUPS.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped.every((id) => CREST_DIVISIONS[id])).toBe(true);
    expect(Object.keys(CREST_DIVISIONS).filter((id) => !grouped.includes(id))).toEqual([]);
    const syms = CREST_SYMBOL_GROUPS.flatMap((g) => g.ids);
    expect(new Set(syms).size).toBe(syms.length);
    expect(Object.keys(CREST_SYMBOLS).filter((id) => id !== 'keins' && !syms.includes(id))).toEqual([]);
    expect(syms.every((id) => CREST_SYMBOLS[id])).toBe(true);
    expect([...THIRD_COLOR_DIVISIONS].every((id) => CREST_DIVISIONS[id])).toBe(true);
  });

  it('jede Form × jedes Muster × jeder Zierrat ergibt gültiges SVG, Muster sehen verschieden aus', () => {
    const seen = new Map();
    for (const shape of Object.keys(CREST_SHAPES)) {
      for (const division of Object.keys(CREST_DIVISIONS)) {
        for (const overlay of Object.keys(CREST_OVERLAYS)) {
          const svg = crestSVG({ shape, division, overlay, symbol: 'ball', colors: COLORS, band: overlay === 'fuss', bandText: 'both' }, { short: 'FCT', year: 1999, stars: 2 });
          valid(svg);
          if (shape === 'schild' && overlay === 'keine') seen.set(division, fingerprint(svg));
        }
      }
    }
    expect(new Set(seen.values()).size).toBe(seen.size);
  });

  it('jedes Motiv ergibt gültiges SVG mit Pixelflächen', () => {
    for (const symbol of Object.keys(CREST_SYMBOLS)) {
      const svg = crestSVG({ shape: 'schild', division: 'keine', symbol, colors: COLORS }, {});
      valid(svg);
      if (symbol !== 'keins') expect(svg, symbol).toContain('shape-rendering="crispEdges"><rect');
    }
  });

  it('dreifarbige Muster zeigen die dritte Farbe, zweifarbige nicht', () => {
    const third = '#abcdef';
    const colors = { ...COLORS, third: 0xabcdef };
    for (const division of Object.keys(CREST_DIVISIONS)) {
      const svg = crestSVG({ shape: 'schild', division, symbol: 'keins', colors }, {});
      expect(svg.includes(third), division).toBe(THIRD_COLOR_DIVISIONS.has(division));
    }
    for (const overlay of Object.keys(CREST_OVERLAYS)) expect(crestSVG({ shape: 'schild', division: 'keine', overlay, symbol: 'keins', colors: { ...COLORS, third: 0xabcdef } }, {}).includes(third), overlay).toBe(overlay !== 'keine');
  });

  it('Streifen: sechs Streifen, Farbwechsel stimmt', () => {
    const count = (division) => (crestSVG({ shape: 'schild', division, symbol: 'keins', colors: { ...COLORS, third: 0xabcdef } }, {}).match(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+"( fill="#abcdef")?\/>/g) ?? []).length;
    expect(count('senkr3')).toBe(4); // Streifen 1, 2, 4, 5 (0 und 3 sind Feld)
    expect(count('waag3')).toBe(4);
    expect(count('waag2')).toBe(3);
  });
});

describe('Gründungsjahr', () => {
  it('Wertebereich 1880 bis Spieljahr, Klemmen, Speichern über updateCrest', () => {
    const c = createCareer({ seed: 3 });
    const [lo, hi] = foundedRange(c);
    expect(lo).toBe(1880);
    expect(hi).toBe(2026);
    expect(clampFounded(c, 1700)).toBe(1880);
    expect(clampFounded(c, 2999)).toBe(2026);
    expect(clampFounded(c, 'abc')).toBe(c.founded ?? 2004);
    expect(clampFounded(c, '1953')).toBe(1953);
    c.season = 5;
    expect(foundedRange(c)[1]).toBe(2030);
    updateCrest(c, crestOf(humanClub(c)), 1921);
    expect(c.founded).toBe(1921);
    expect(crestExtras(c).year).toBe(1921);
    updateCrest(c, crestOf(humanClub(c)));
    expect(c.founded).toBe(1921);
  });

  it('altes Spielstand-Wappen ohne Jahr: Standard 2004; Jahr steht im Band', () => {
    expect(crestExtras({}).year).toBe(2004);
    expect(crestExtras({ founded: 1931 }).year).toBe(1931);
    const svg = crestSVG({ shape: 'schild', band: true, bandText: 'year' }, { year: 1931 });
    expect(svg).toContain('>1931</text>');
  });
});
