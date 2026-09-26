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
const BITMAPS = {
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
export const CREST_SYMBOLS = tr(
  { ball: 'Ball', stern: 'Stern', krone: 'Krone', anker: 'Anker', herz: 'Herz', blitz: 'Blitz', schluessel: 'Schlüssel', klee: 'Kleeblatt', haemmer: 'Hämmer', rad: 'Rad', krug: 'Bierkrug', brezel: 'Brezel', turm: 'Turm', baum: 'Tanne', welle: 'Wellen', pferd: 'Pferd', adler: 'Adler', loewe: 'Löwe', fuchs: 'Fuchs', kuh: 'Kuh', hahn: 'Hahn', fisch: 'Fisch', eule: 'Eule', baer: 'Bär', keins: 'Nichts' },
  { ball: 'Ball', stern: 'Star', krone: 'Crown', anker: 'Anchor', herz: 'Heart', blitz: 'Lightning', schluessel: 'Key', klee: 'Clover', haemmer: 'Hammers', rad: 'Wheel', krug: 'Beer mug', brezel: 'Pretzel', turm: 'Tower', baum: 'Fir tree', welle: 'Waves', pferd: 'Horse', adler: 'Eagle', loewe: 'Lion', fuchs: 'Fox', kuh: 'Cow', hahn: 'Rooster', fisch: 'Fish', eule: 'Owl', baer: 'Bear', keins: 'None' },
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
// crest: { shape, division, symbol, colors: { field, second, border, symbol }, band }
export function crestSVG(crest, { size = 48, label = '', short = '' } = {}) {
  const c = normalizeCrest(crest);
  const id = `cr${++uid}`;
  const path = SHAPES[c.shape] ?? SHAPES.schild;
  const band = c.band && short ? `<rect x="0" y="50" width="64" height="11" fill="${css(c.colors.border)}"/><text x="32" y="59" text-anchor="middle" font-family="'Pixelify Sans', monospace" font-size="10" font-weight="700" fill="${css(c.colors.field)}">${String(short).slice(0, 4).replace(/[<&>"]/g, '')}</text>` : '';
  const symY = c.band && short ? 12 : 17;
  const symbol = c.symbol && c.symbol !== 'keins' ? symbolRects(c.symbol, c.colors.symbol, c.colors.border, { y: symY }) : '';
  return `<svg class="crest-svg" width="${size}" height="${Math.round((size * 72) / 64)}" viewBox="0 0 64 72" role="img" aria-label="${label.replace(/"/g, '')}"><defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="64" height="72" fill="${css(c.colors.field)}"/><g fill="${css(c.colors.second)}">${DIVISIONS[c.division] ?? ''}</g><g shape-rendering="crispEdges">${symbol}</g>${band}</g><path d="${path}" fill="none" stroke="${css(c.colors.border)}" stroke-width="4" stroke-linejoin="round"/></svg>`;
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
  const symbols = Object.keys(BITMAPS);
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
  };
}

export const crestOf = (club) => (club?.crest ? normalizeCrest(club.crest) : defaultCrest(club ?? {}));
