// Beispielwappen für den Vergleich alter und neuer Darstellung (Hilfsdatei für tests/crest.test.js).
import { createHash } from 'node:crypto';

const COLORS = { field: 0x2e6b3a, second: 0xf2efe6, border: 0x1c1c1c, symbol: 0xe0b020 };
const OLD_SHAPES = ['schild', 'spitz', 'rund', 'oval', 'raute', 'eckig', 'wimpel', 'banner', 'sechseck', 'franz'];
const OLD_DIVISIONS = ['keine', 'gespalten', 'geteilt', 'schraeg', 'geviert', 'balken', 'pfahl', 'sparren', 'streifen', 'kreuz', 'schach'];
const OLD_SYMBOLS = ['ball', 'stern', 'krone', 'anker', 'herz', 'blitz', 'schluessel', 'klee', 'haemmer', 'rad', 'krug', 'brezel', 'turm', 'baum', 'welle', 'pferd', 'adler', 'loewe', 'fuchs', 'kuh', 'hahn', 'fisch', 'eule', 'baer', 'spaten', 'traktor', 'windrad', 'kirche', 'burg', 'aehre', 'glocke', 'hufeisen', 'keins'];

// Alle Kombinationen, die es vor der Erweiterung gab (jede Form × Teilung, jedes Symbol × Band-Art, Standardwappen).
export function oldCombos(defaultCrest) {
  const out = {};
  for (const shape of OLD_SHAPES) for (const division of OLD_DIVISIONS) out[`${shape}/${division}`] = [{ shape, division, symbol: 'ball', colors: COLORS, band: false, bandText: 'short', stars: true }, {}];
  for (const symbol of OLD_SYMBOLS) for (const bandText of ['short', 'year', 'both']) out[`sym ${symbol}/${bandText}`] = [{ shape: 'schild', division: 'sparren', symbol, colors: COLORS, band: true, bandText, stars: true }, { short: 'SVS', year: 1987, stars: 3 }];
  for (const shape of OLD_SHAPES) out[`band ${shape}`] = [{ shape, division: 'geviert', symbol: 'stern', colors: COLORS, band: true, bandText: 'both' }, { short: 'FCT', year: 2004 }];
  for (let i = 0; i < 80; i++) out[`std ${i}`] = [defaultCrest({ id: `verein${i}`, kit: { shirt: (i * 2654435) & 0xffffff, shorts: 0xf2efe6 } }), { short: 'ABC', year: 2010 }];
  return out;
}

// Kennungen im SVG (fortlaufende Nummer) herausrechnen, dann Prüfsumme.
export const fingerprint = (svg) => createHash('sha1').update(svg.replace(/cr\d+/g, 'cr#')).digest('hex').slice(0, 16);
