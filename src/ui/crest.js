// Vereinswappen: Form, Teilung, Symbol oder Figur, vier frei wählbare Farben und
// auf Wunsch ein Schriftband mit dem Kürzel. Alles als SVG-Text, damit es im
// Vereinsheim, auf der Anzeigetafel und in der Tabelle gleich aussieht.
import { tr } from '../core/i18n.js';

const css = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

// Formen im Raster 64 × 72.
const SHAPES = {
  schild: 'M4 4 H60 V36 C60 54 46 64 32 70 C18 64 4 54 4 36 Z',
  spitz: 'M4 4 H60 V40 L32 70 L4 40 Z',
  rund: 'M32 6 A30 30 0 1 1 31.9 6 Z',
  oval: 'M32 3 C50 3 60 18 60 37 C60 56 50 70 32 70 C14 70 4 56 4 37 C4 18 14 3 32 3 Z',
  raute: 'M32 2 L62 37 L32 71 L2 37 Z',
  eckig: 'M14 4 H50 L60 14 V58 L50 68 H14 L4 58 V14 Z',
  wimpel: 'M4 6 H60 L32 70 Z',
  banner: 'M6 4 H58 V70 L32 56 L6 70 Z',
  sechseck: 'M32 2 L61 19 V53 L32 70 L3 53 V19 Z',
  franz: 'M4 4 C20 10 44 10 60 4 V44 C60 58 46 66 32 70 C18 66 4 58 4 44 Z',
};
export const CREST_SHAPES = tr(
  { schild: 'Schild', spitz: 'Spitzschild', rund: 'Rund', oval: 'Oval', raute: 'Raute', eckig: 'Achteck', wimpel: 'Wimpel', banner: 'Banner', sechseck: 'Sechseck', franz: 'Geschwungen' },
  { schild: 'Shield', spitz: 'Pointed', rund: 'Round', oval: 'Oval', raute: 'Diamond', eckig: 'Octagon', wimpel: 'Pennant', banner: 'Banner', sechseck: 'Hexagon', franz: 'Swept' },
);

// Teilungen: Flächen in der zweiten Farbe.
const DIVISIONS = {
  keine: '',
  gespalten: '<rect x="32" y="0" width="32" height="72"/>',
  geteilt: '<rect x="0" y="36" width="64" height="36"/>',
  schraeg: '<path d="M0 0 L64 72 H0 Z"/>',
  geviert: '<rect x="32" y="0" width="32" height="36"/><rect x="0" y="36" width="32" height="36"/>',
  balken: '<rect x="0" y="26" width="64" height="20"/>',
  pfahl: '<rect x="22" y="0" width="20" height="72"/>',
  sparren: '<path d="M0 50 L32 24 L64 50 V66 L32 40 L0 66 Z"/>',
  streifen: '<rect x="8" y="0" width="8" height="72"/><rect x="24" y="0" width="8" height="72"/><rect x="40" y="0" width="8" height="72"/><rect x="56" y="0" width="8" height="72"/>',
  kreuz: '<rect x="26" y="0" width="12" height="72"/><rect x="0" y="28" width="64" height="12"/>',
  schach: Array.from({ length: 6 }, (_, r) => Array.from({ length: 5 }, (_, c) => ((r + c) % 2 ? `<rect x="${c * 13}" y="${r * 12}" width="13" height="12"/>` : '')).join('')).join(''),
};
export const CREST_DIVISIONS = tr(
  { keine: 'Einfarbig', gespalten: 'Gespalten', geteilt: 'Geteilt', schraeg: 'Schräg', geviert: 'Geviert', balken: 'Balken', pfahl: 'Pfahl', sparren: 'Sparren', streifen: 'Streifen', kreuz: 'Kreuz', schach: 'Schach' },
  { keine: 'Plain', gespalten: 'Per pale', geteilt: 'Per fess', schraeg: 'Per bend', geviert: 'Quartered', balken: 'Fess', pfahl: 'Pale', sparren: 'Chevron', streifen: 'Stripes', kreuz: 'Cross', schach: 'Chequy' },
);

// Symbole und Figuren als 12 × 12 Pixel: # Symbolfarbe, + Randfarbe (Details).
const BITMAPS_BASE = {
  ball: ['....####....', '..########..', '.####++####.', '.###++++###.', '##+##++##+##', '#+++####+++#', '#++######++#', '##+######+##', '.###+##+###.', '.##++##++##.', '..###++###..', '....####....'],
  stern: ['.....##.....', '.....##.....', '....####....', '....####....', '############', '.##########.', '..########..', '...######...', '...######...', '..###..###..', '..##....##..', '.#........#.'],
  krone: ['............', '#....##....#', '##..####..##', '###.####.###', '############', '############', '#+##+##+##+#', '############', '############', '............', '############', '############'],
  anker: ['.....##.....', '....#..#....', '.....##.....', '..########..', '.....##.....', '.....##.....', '.....##.....', '#....##....#', '##...##...##', '.##..##..##.', '..########..', '....####....'],
  herz: ['............', '.###....###.', '#####..#####', '############', '############', '############', '.##########.', '..########..', '...######...', '....####....', '.....##.....', '............'],
  blitz: ['......####..', '.....####...', '....####....', '...####.....', '..#######...', '.#######....', '....####....', '...####.....', '..####......', '..###.......', '.##.........', '.#..........'],
  schluessel: ['...####.....', '..##..##....', '..##..##....', '...####.....', '....##......', '....##......', '....####....', '....##......', '....###.....', '....##......', '....####....', '............'],
  klee: ['....####....', '...######...', '...######...', '.##.####.##.', '############', '############', '.##########.', '..###..###..', '.....##.....', '.....##.....', '......##....', '.......#....'],
  haemmer: ['####....####', '####....####', '.###....###.', '...##..##...', '....####....', '.....##.....', '....####....', '...##..##...', '..##....##..', '.##......##.', '##........##', '#..........#'],
  rad: ['....####....', '..##.##.##..', '.#...##...#.', '.##..##..##.', '#..#.##.#..#', '#...####...#', '#...####...#', '#..#.##.#..#', '.##..##..##.', '.#...##...#.', '..##.##.##..', '....####....'],
  krug: ['.#########..', '##+#+#+##...', '##########..', '.########.##', '.########..#', '.########..#', '.########..#', '.########.##', '.#########..', '.########...', '.########...', '..######....'],
  brezel: ['..###..###..', '.#...##...#.', '#....##....#', '#...#..#...#', '#..#....#..#', '.##......##.', '..#......#..', '..##....##..', '...##..##...', '....####....', '...##..##...', '..##....##..'],
  turm: ['##.##..##.##', '############', '.##########.', '.####++####.', '.###++++###.', '.##########.', '.##########.', '.####++####.', '.###++++###.', '.###++++###.', '.###++++###.', '############'],
  baum: ['.....##.....', '....####....', '...######...', '..########..', '....####....', '...######...', '..########..', '.##########.', '############', '.....##.....', '.....##.....', '....####....'],
  welle: ['............', '............', '.##....##...', '#..#..#..#..', '....##....##', '............', '.##....##...', '#..#..#..#..', '....##....##', '............', '.##....##...', '#..#..#..#..'],
  pferd: ['......##....', '.....####...', '....######..', '...#######..', '..####+####.', '.#########..', '##########..', '####..####..', '.##...####..', '......####..', '.....#####..', '....######..'],
  adler: ['.....##.....', '....####....', '#...#+##...#', '##..####..##', '###.####.###', '############', '.##########.', '..########..', '....####....', '...######...', '..##.##.##..', '.#...##...#.'],
  loewe: ['..#.####.#..', '.##########.', '############', '##+##..##+##', '###.####.###', '####.##.####', '############', '##.##++##.##', '.##.####.##.', '..########..', '...######...', '....####....'],
  fuchs: ['#..........#', '##........##', '###......###', '####....####', '############', '##+######+##', '############', '.##########.', '..########..', '...######...', '....#++#....', '.....##.....'],
  kuh: ['##........##', '.#.######.#.', '..########..', '.##+####+##.', '############', '.##########.', '..########..', '..##++++##..', '..#+#++#+#..', '..########..', '...######...', '............'],
  hahn: ['...##.......', '..####......', '..#+##......', '.####.......', '..###....#..', '..####..###.', '.#######.##.', '############', '.##########.', '..########..', '....#..#....', '...##..##...'],
  fisch: ['............', '............', '....####....', '..########.#', '.#+########.', '############', '############', '.##########.', '..########.#', '....####....', '............', '............'],
  eule: ['.#........#.', '.##########.', '##++####++##', '#+##+##+##+#', '##++####++##', '.####++####.', '.##########.', '.###+##+###.', '.##########.', '..########..', '..##....##..', '.##......##.'],
  baer: ['##........##', '###.####.###', '############', '############', '##+######+##', '############', '####++++####', '.###++++###.', '..##+##+##..', '...######...', '............', '............'],
};

// Dazu: Dorf und Acker – passend zu Amateurvereinen.
const BITMAPS_EXTRA = {
  spaten: ['...######...', '...#....#...', '...######...', '.....##.....', '.....##.....', '.....##.....', '.....##.....', '...######...', '..########..', '..########..', '...######...', '....####....'],
  traktor: ['.........#..', '.####....#..', '.#..#....#..', '.#..######..', '.##########.', '.##########.', '.++++..####.', '++++++.####.', '++##++...++.', '++##++..+##+', '++++++..+##+', '.++++....++.'],
  windrad: ['.....##.....', '.....##.....', '.....##.....', '.....##.....', '....#++#....', '..##.##.##..', '.##..##..##.', '##...##...##', '.....##.....', '.....##.....', '....####....', '...######...'],
  kirche: ['.....##.....', '....####....', '.....##.....', '....####....', '...######...', '...##++##...', '...##++##...', '...######...', '############', '###++##++###', '###++##++###', '###+####+###'],
  burg: ['#.#.#..#.#.#', '############', '.####..####.', '.##+#..#+##.', '.####..####.', '############', '.##########.', '.##########.', '.####++####.', '.###++++###.', '.###++++###.', '############'],
  aehre: ['.....##.....', '.#...##...#.', '.##..##..##.', '..##.##.##..', '.#...##...#.', '.##..##..##.', '..##.##.##..', '.....##.....', '.....##.....', '.....##.....', '....####....', '...##..##...'],
  glocke: ['.....##.....', '...######...', '..########..', '..########..', '..########..', '.##########.', '.##########.', '.##########.', '############', '############', '.....++.....', '.....++.....'],
  hufeisen: ['............', '###......###', '##+#....#+##', '###......###', '##+#....#+##', '###......###', '##+#....#+##', '###......###', '.###....###.', '.####..####.', '..########..', '...######...'],
};
const BITMAPS = { ...BITMAPS_BASE, ...BITMAPS_EXTRA };
export const CREST_SYMBOLS = tr(
  { ball: 'Ball', stern: 'Stern', krone: 'Krone', anker: 'Anker', herz: 'Herz', blitz: 'Blitz', schluessel: 'Schlüssel', klee: 'Kleeblatt', haemmer: 'Hämmer', rad: 'Rad', krug: 'Bierkrug', brezel: 'Brezel', turm: 'Turm', baum: 'Tanne', welle: 'Wellen', pferd: 'Pferd', adler: 'Adler', loewe: 'Löwe', fuchs: 'Fuchs', kuh: 'Kuh', hahn: 'Hahn', fisch: 'Fisch', eule: 'Eule', baer: 'Bär', spaten: 'Spaten', traktor: 'Traktor', windrad: 'Windrad', kirche: 'Kirche', burg: 'Burg', aehre: 'Ähre', glocke: 'Glocke', hufeisen: 'Hufeisen', keins: 'Nichts' },
  { ball: 'Ball', stern: 'Star', krone: 'Crown', anker: 'Anchor', herz: 'Heart', blitz: 'Lightning', schluessel: 'Key', klee: 'Clover', haemmer: 'Hammers', rad: 'Wheel', krug: 'Beer mug', brezel: 'Pretzel', turm: 'Tower', baum: 'Fir tree', welle: 'Waves', pferd: 'Horse', adler: 'Eagle', loewe: 'Lion', fuchs: 'Fox', kuh: 'Cow', hahn: 'Rooster', fisch: 'Fish', eule: 'Owl', baer: 'Bear', spaten: 'Spade', traktor: 'Tractor', windrad: 'Wind turbine', kirche: 'Church', burg: 'Castle', aehre: 'Wheat ear', glocke: 'Bell', hufeisen: 'Horseshoe', keins: 'None' },
);
export const FIGURES = new Set(['pferd', 'adler', 'loewe', 'fuchs', 'kuh', 'hahn', 'fisch', 'eule', 'baer']);

export const CREST_COLORS = [0xf2efe6, 0x1c1c1c, 0xc8352f, 0x8c2f2f, 0xe8742a, 0xe0b020, 0xd4af37, 0x2e6b3a, 0x5cc46a, 0x2f6fb5, 0x1d2b44, 0x4fa3e0, 0x6b4f8c, 0x9a6b4f, 0x8a9096];

function symbolRects(id, color, detail, { x = 14, y = 16, cell = 3 } = {}) {
  const bmp = BITMAPS[id];
  if (!bmp) return '';
  let out = '';
  bmp.forEach((row, r) => {
    // Waagerechte Läufe zusammenfassen – weniger Rechtecke, gleiche Optik.
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === '.') {
        c++;
        continue;
      }
      let n = 1;
      while (c + n < row.length && row[c + n] === ch) n++;
      out += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${n * cell}" height="${cell}" fill="${css(ch === '#' ? color : detail)}"/>`;
      c += n;
    }
  });
  return out;
}

let uid = 0;
// Schriftband je Form: [Oberkante, größte Textbreite]. Spitze Formen: Band höher, Text schmaler.
const BAND_AT = { schild: [50, 38], banner: [42, 46], sechseck: [48, 46], spitz: [40, 32], raute: [40, 32], wimpel: [26, 26], rund: [48, 40], oval: [48, 42], franz: [48, 44] };
export const CREST_BAND_TEXTS = tr({ short: 'Kürzel', year: 'Jahr', both: 'Beides' }, { short: 'Short name', year: 'Year', both: 'Both' });
export const MAX_STARS = 5;

// Meistersterne und Gründungsjahr der Karriere: Titel = Platz 1 in der Saisonhistorie.
export const crestExtras = (career) => ({ stars: Math.min(MAX_STARS, (career?.history ?? []).filter((h) => h.pos === 1).length), year: career?.founded ?? 2004 });

// Fünfzackstern im 6er-Raster, Mitte bei cx.
const starPath = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (-90 + i * 36) * (Math.PI / 180);
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
};

// crest: { shape, division, symbol, colors: { field, second, border, symbol }, band, bandText, stars }
// stars: Zahl der Meistersterne (über dem Wappen), year: Gründungsjahr fürs Band.
export function crestSVG(crest, { size = 48, label = '', short = '', stars = 0, year = null } = {}) {
  const c = normalizeCrest(crest);
  const id = `cr${++uid}`;
  const path = SHAPES[c.shape] ?? SHAPES.schild;
  const word = String(short).slice(0, 4).replace(/[<&>"]/g, '');
  const yr = year ? String(year) : '';
  const text = c.bandText === 'year' && yr ? yr : c.bandText === 'both' && yr && word ? `${word} ${yr.slice(-2)}` : word || yr;
  const hasBand = c.band && text;
  // textLength nur, wenn der Text nicht ins Band passt – sonst verzerrt das Stauchen die schmalen
  // Ziffern. Schrift: Pixelify auch für Ziffern – die Trikot-Ziffern (SL Ziffern) sind bei 10 px
  // unleserlich (eine „4“ sah aus wie „d“).
  const [by, bw] = BAND_AT[c.shape] ?? [50, 46];
  const band = hasBand ? `<rect x="0" y="${by}" width="64" height="11" fill="${css(c.colors.border)}"/><text x="32" y="${by + 9}" text-anchor="middle" font-family="'Pixelify Sans', monospace" font-size="10" font-weight="700" ${text.length * 6.5 > bw ? `textLength="${bw}" lengthAdjust="spacingAndGlyphs"` : ''} fill="${css(c.colors.field)}">${text}</text>` : '';
  const symY = hasBand ? Math.max(4, Math.min(12, by - 36)) : 17;
  const symbol = c.symbol && c.symbol !== 'keins' ? symbolRects(c.symbol, c.colors.symbol, c.colors.border, { y: symY }) : '';
  const n = c.stars ? Math.min(MAX_STARS, Math.max(0, stars | 0)) : 0;
  const top = n ? -11 : 0;
  const starSvg = n ? `<g fill="${css(0xe0b020)}" stroke="#1c1c1c" stroke-width="1" stroke-linejoin="round">${Array.from({ length: n }, (_, i) => `<path d="${starPath(32 + (i - (n - 1) / 2) * 11, -5, 5)}"/>`).join('')}</g>` : '';
  const h = 72 - top;
  return `<svg class="crest-svg" width="${size}" height="${Math.round((size * h) / 64)}" viewBox="0 ${top} 64 ${h}" role="img" aria-label="${label.replace(/"/g, '')}"><defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs>${starSvg}<g clip-path="url(#${id})"><rect width="64" height="72" fill="${css(c.colors.field)}"/><g fill="${css(c.colors.second)}">${DIVISIONS[c.division] ?? ''}</g><g shape-rendering="crispEdges">${symbol}</g>${band}</g><path d="${path}" fill="none" stroke="${css(c.colors.border)}" stroke-width="4" stroke-linejoin="round"/></svg>`;
}

export function normalizeCrest(crest) {
  const d = defaultCrest({ id: 'x', kit: { shirt: 0x2e6b3a, shorts: 0xf2efe6 } });
  return { ...d, ...(crest ?? {}), colors: { ...d.colors, ...(crest?.colors ?? {}) } };
}

// Wappen für Vereine ohne eigenes: fest aus Kennung und Trikotfarben.
export function defaultCrest(club) {
  let h = 17;
  for (const ch of String(club.id ?? club.name ?? '')) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const shapes = Object.keys(SHAPES);
  const divisions = ['keine', 'gespalten', 'geteilt', 'schraeg', 'balken', 'pfahl', 'sparren', 'geviert'];
  const symbols = Object.keys(BITMAPS_BASE); // nur die alten: Standardwappen bleiben stabil
  const kit = club.kit ?? {};
  const field = kit.shirt ?? 0x2e6b3a;
  const second = kit.second ?? kit.shorts ?? 0xf2efe6;
  const light = (n) => 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
  return {
    shape: shapes[h % shapes.length],
    division: divisions[(h >>> 4) % divisions.length],
    symbol: symbols[(h >>> 8) % symbols.length],
    colors: { field, second: second === field ? (light(field) ? 0x1c1c1c : 0xf2efe6) : second, border: 0x1c1c1c, symbol: light(field) && light(second) ? 0x1c1c1c : 0xe0b020 },
    band: (h >>> 12) % 3 === 0,
    bandText: 'short',
    stars: true,
  };
}

export const crestOf = (club) => (club?.crest ? normalizeCrest(club.crest) : defaultCrest(club ?? {}));
