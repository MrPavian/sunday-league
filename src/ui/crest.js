// Vereinswappen: Form, Teilung oder Muster (auch 2- und 3-farbig), Zierrand/Ring, Symbol oder Figur,
// fünf frei wählbare Farben (Feld, zweite, dritte, Symbol, Rand) und
// auf Wunsch ein Schriftband mit dem Kürzel. Alles als SVG-Text, damit es im
// Vereinsheim, auf der Anzeigetafel und in der Tabelle gleich aussieht.
import { tr } from '../core/i18n.js';
import { BITMAPS_MORE, SYMBOL_GROUPS, SYMBOL_NAMES } from './crestSymbols.js';

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
  halbrund: 'M4 4 H60 V38 A28 28 0 0 1 32 70 A28 28 0 0 1 4 38 Z',
  tafel: 'M8 4 H56 Q60 4 60 8 V64 Q60 68 56 68 H8 Q4 68 4 64 V8 Q4 4 8 4 Z',
  bogen: 'M4 70 V30 C4 14 16 4 32 4 C48 4 60 14 60 30 V70 Z',
  zinnen: 'M4 4 H14 V12 H24 V4 H40 V12 H50 V4 H60 V38 C60 54 46 64 32 70 C18 64 4 54 4 38 Z',
  tropfen: 'M32 2 C40 20 60 28 60 46 C60 60 48 70 32 70 C16 70 4 60 4 46 C4 28 24 20 32 2 Z',
};
// Nur diese Formen/Teilungen/Motive wählt defaultCrest – so bleiben die Standardwappen der Vereine stabil.
const OLD_SHAPES = ['schild', 'spitz', 'rund', 'oval', 'raute', 'eckig', 'wimpel', 'banner', 'sechseck', 'franz'];
export const CREST_SHAPES = tr(
  { schild: 'Schild', spitz: 'Spitzschild', rund: 'Rund', oval: 'Oval', raute: 'Raute', eckig: 'Achteck', wimpel: 'Wimpel', banner: 'Banner', sechseck: 'Sechseck', franz: 'Geschwungen', halbrund: 'Halbrund', tafel: 'Tafel', bogen: 'Rundbogen', zinnen: 'Zinnen', tropfen: 'Tropfen' },
  { schild: 'Shield', spitz: 'Pointed', rund: 'Round', oval: 'Oval', raute: 'Diamond', eckig: 'Octagon', wimpel: 'Pennant', banner: 'Banner', sechseck: 'Hexagon', franz: 'Swept', halbrund: 'Half-round', tafel: 'Plaque', bogen: 'Arch', zinnen: 'Castle top', tropfen: 'Drop' },
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

// Muster mit zweiter (S) und dritter Farbe (T): Funktionen liefern Flächen; ohne eigenes fill gilt die zweite Farbe.
const rects = (list, fill = '') => list.map(([x, y, w, h]) => `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}"${fill}/>`).join('');
// Streifenfolge Feld, zweite, dritte, ...: n Streifen; cols = 2 oder 3 Farben im Wechsel.
function bands(dir, n, cols, S, T) {
  let out = '';
  for (let i = 1; i < n; i++) {
    const m = i % cols;
    if (!m) continue;
    const r = dir === 'v' ? [(i * 64) / n, 0, 64 / n, 72] : [0, (i * 72) / n, 64, 72 / n];
    out += rects([r], m === 2 ? ` fill="${T}"` : '');
  }
  return out;
}
// Schrägstreifen: waagerechte Streifen um die Mitte gedreht (Clip des Schildes schneidet zu).
function diagonal(angle, cols, w, S, T) {
  let out = '';
  for (let k = -7; k <= 7; k++) {
    const m = ((k % cols) + cols) % cols;
    if (!m) continue;
    out += `<rect x="-60" y="${36 + k * w}" width="184" height="${w}"${m === 2 ? ` fill="${T}"` : ''}/>`;
  }
  return `<g transform="rotate(${angle} 32 36)">${out}</g>`;
}
const diamond = (x, y) => `M${x - 8} ${y} L${x} ${y - 9} L${x + 8} ${y} L${x} ${y + 9} Z`;
function rays(cols, T) {
  const poly = (a0, a1, fill) => `<path d="M32 36 L${(32 + Math.cos(a0) * 120).toFixed(1)} ${(36 + Math.sin(a0) * 120).toFixed(1)} L${(32 + Math.cos(a1) * 120).toFixed(1)} ${(36 + Math.sin(a1) * 120).toFixed(1)} Z"${fill}/>`;
  let out = '';
  const n = cols === 3 ? 18 : 16;
  for (let k = 0; k < n; k++) {
    const m = k % cols;
    if (m) out += poly(((k - 0.5) * 2 * Math.PI) / n, ((k + 0.5) * 2 * Math.PI) / n, m === 2 ? ` fill="${T}"` : '');
  }
  return out;
}
const P = (d, fill = '') => `<path d="${d}"${fill}/>`;
const NEW_DIVISIONS = {
  // zwei Farben
  waag2: () => bands('h', 6, 2),
  diag2: () => diagonal(45, 2, 9),
  diagl2: () => diagonal(-45, 2, 9),
  schrbalken: () => P('M-10 0 L10 0 L74 72 L54 72 Z'),
  schrbalkenl: () => P('M74 0 L54 0 L-10 72 L10 72 Z'),
  doppelbalken: () => rects([[0, 14, 64, 10], [0, 48, 64, 10]]),
  doppelpfahl: () => rects([[12, 0, 10, 72], [42, 0, 10, 72]]),
  andreas: () => P('M-6 0 L8 0 L70 72 L56 72 Z') + P('M70 0 L56 0 L-6 72 L8 72 Z'),
  skandi: () => rects([[14, 0, 14, 72], [0, 28, 64, 14]]),
  sparren2: () => P('M0 36 L32 12 L64 36 V48 L32 24 L0 48 Z') + P('M0 62 L32 38 L64 62 V74 L32 50 L0 74 Z'),
  sparrenv: () => P('M0 22 L32 48 L64 22 V6 L32 32 L0 6 Z'),
  rauten: () => Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => ((r + c) % 2 ? '' : P(diamond(c * 16, r * 18)))).join('')).join(''),
  strahlen: () => rays(2),
  spitze: () => P('M8 0 H56 L32 58 Z'),
  wellen: () => P('M0 30 Q8 22 16 30 T32 30 T48 30 T64 30 V46 Q56 38 48 46 T32 46 T16 46 T0 46 Z'),
  // drei Farben
  senkr3: (S, T) => bands('v', 6, 3, S, T),
  waag3: (S, T) => bands('h', 6, 3, S, T),
  diag3: (S, T) => diagonal(45, 3, 8, S, T),
  diagl3: (S, T) => diagonal(-45, 3, 8, S, T),
  trikv: (S, T) => rects([[64 / 3, 0, 64 / 3, 72]]) + rects([[128 / 3, 0, 64 / 3, 72]], ` fill="${T}"`),
  trikh: (S, T) => rects([[0, 24, 64, 24]]) + rects([[0, 48, 64, 24]], ` fill="${T}"`),
  geviert3: (S, T) => rects([[32, 0, 32, 36], [0, 36, 32, 36]]) + rects([[32, 36, 32, 36]], ` fill="${T}"`),
  balken3: (S, T) => rects([[0, 22, 64, 4], [0, 46, 64, 4]], ` fill="${T}"`) + rects([[0, 26, 64, 20]]),
  pfahl3: (S, T) => rects([[16, 0, 4, 72], [44, 0, 4, 72]], ` fill="${T}"`) + rects([[20, 0, 24, 72]]),
  schrbalken3: (S, T) => P('M-14 0 L2 0 L66 72 L46 72 Z', ` fill="${T}"`) + P('M18 0 L34 0 L98 72 L78 72 Z', ` fill="${T}"`) + P('M2 0 L18 0 L82 72 L66 72 Z'),
  skandi3: (S, T) => rects([[12, 0, 18, 72], [0, 26, 64, 18]]) + rects([[18, 0, 6, 72], [0, 32, 64, 6]], ` fill="${T}"`),
  kreuz3: (S, T) => rects([[24, 0, 16, 72], [0, 26, 64, 16]]) + rects([[29, 0, 6, 72], [0, 31, 64, 6]], ` fill="${T}"`),
  sparren3: (S, T) => P('M0 54 L32 28 L64 54 V68 L32 42 L0 68 Z') + P('M0 38 L32 12 L64 38 V46 L32 20 L0 46 Z', ` fill="${T}"`),
  strahlen3: (S, T) => rays(3, T),
};
const DIVISION_ORDER = [
  ['keine', 'gespalten', 'geteilt', 'schraeg', 'geviert', 'schach', 'rauten'],
  ['streifen', 'waag2', 'diag2', 'diagl2', 'strahlen', 'wellen'],
  ['senkr3', 'waag3', 'diag3', 'diagl3', 'trikv', 'trikh', 'strahlen3', 'geviert3'],
  ['balken', 'pfahl', 'doppelbalken', 'doppelpfahl', 'schrbalken', 'schrbalkenl', 'balken3', 'pfahl3', 'schrbalken3'],
  ['kreuz', 'skandi', 'andreas', 'kreuz3', 'skandi3'],
  ['sparren', 'sparren2', 'sparren3', 'sparrenv', 'spitze'],
];
export const CREST_DIVISION_GROUPS = [
  tr('Teilungen', 'Divisions'),
  tr('Streifen, zweifarbig', 'Stripes, two colours'),
  tr('Streifen, dreifarbig', 'Stripes, three colours'),
  tr('Balken und Pfähle', 'Bars and pales'),
  tr('Kreuze', 'Crosses'),
  tr('Sparren und Spitzen', 'Chevrons and piles'),
].map((label, i) => ({ label, ids: DIVISION_ORDER[i] }));
// Muster, die die dritte Farbe brauchen (für den Hinweis im Editor).
export const THIRD_COLOR_DIVISIONS = new Set(['senkr3', 'waag3', 'diag3', 'diagl3', 'trikv', 'trikh', 'geviert3', 'balken3', 'pfahl3', 'schrbalken3', 'skandi3', 'kreuz3', 'sparren3', 'strahlen3']);

// Zierrat über dem Muster in der dritten Farbe: Rand, Ring, Haupt, Fuß.
const OVERLAYS = {
  keine: () => '',
  rand: (path, T) => `<path d="${path}" fill="none" stroke="${T}" stroke-width="16"/>`,
  rand2: (path, T) => `<path d="${path}" fill="none" stroke="${T}" stroke-width="9"/>`,
  ring: (path, T) => `<circle cx="32" cy="35" r="26" fill="none" stroke="${T}" stroke-width="4"/>`,
  ring2: (path, T) => `<circle cx="32" cy="35" r="27" fill="none" stroke="${T}" stroke-width="4"/><circle cx="32" cy="35" r="20" fill="none" stroke="${T}" stroke-width="3"/>`,
  haupt: (path, T) => `<rect x="0" y="0" width="64" height="15" fill="${T}"/>`,
  fuss: (path, T) => `<rect x="0" y="58" width="64" height="14" fill="${T}"/>`,
};
export const CREST_OVERLAYS = tr(
  { keine: 'Ohne', rand: 'Breiter Rand', rand2: 'Schmaler Rand', ring: 'Ring', ring2: 'Doppelring', haupt: 'Schildhaupt', fuss: 'Schildfuß' },
  { keine: 'None', rand: 'Wide border', rand2: 'Thin border', ring: 'Ring', ring2: 'Double ring', haupt: 'Chief', fuss: 'Base' },
);

export const CREST_DIVISIONS = tr(
  { keine: 'Einfarbig', gespalten: 'Gespalten', geteilt: 'Geteilt', schraeg: 'Schräg', geviert: 'Geviert', balken: 'Balken', pfahl: 'Pfahl', sparren: 'Sparren', streifen: 'Streifen', kreuz: 'Kreuz', schach: 'Schach', waag2: 'Waagerecht', diag2: 'Schräg', diagl2: 'Schräg links', schrbalken: 'Schrägbalken', schrbalkenl: 'Schrägbalken links', doppelbalken: 'Doppelbalken', doppelpfahl: 'Doppelpfahl', andreas: 'Schrägkreuz', skandi: 'Nordkreuz', sparren2: 'Doppelsparren', sparrenv: 'Sturzsparren', rauten: 'Rauten', strahlen: 'Strahlen', spitze: 'Spitze', wellen: 'Wellenbalken', senkr3: 'Senkrecht', waag3: 'Waagerecht', diag3: 'Schräg', diagl3: 'Schräg links', trikv: 'Trikolore senkrecht', trikh: 'Trikolore waagerecht', geviert3: 'Geviert', balken3: 'Balken mit Saum', pfahl3: 'Pfahl mit Saum', schrbalken3: 'Schrägbalken mit Saum', skandi3: 'Nordkreuz mit Saum', kreuz3: 'Kreuz mit Saum', sparren3: 'Doppelsparren', strahlen3: 'Strahlen' },
  { keine: 'Plain', gespalten: 'Per pale', geteilt: 'Per fess', schraeg: 'Per bend', geviert: 'Quartered', balken: 'Fess', pfahl: 'Pale', sparren: 'Chevron', streifen: 'Stripes', kreuz: 'Cross', schach: 'Chequy', waag2: 'Horizontal', diag2: 'Diagonal', diagl2: 'Diagonal left', schrbalken: 'Bend', schrbalkenl: 'Bend left', doppelbalken: 'Two bars', doppelpfahl: 'Two pales', andreas: 'Saltire', skandi: 'Nordic cross', sparren2: 'Two chevrons', sparrenv: 'Inverted chevron', rauten: 'Lozenges', strahlen: 'Rays', spitze: 'Pile', wellen: 'Wavy bar', senkr3: 'Vertical', waag3: 'Horizontal', diag3: 'Diagonal', diagl3: 'Diagonal left', trikv: 'Tricolour vertical', trikh: 'Tricolour horizontal', geviert3: 'Quartered', balken3: 'Fess, edged', pfahl3: 'Pale, edged', schrbalken3: 'Bend, edged', skandi3: 'Nordic, edged', kreuz3: 'Cross, edged', sparren3: 'Two chevrons', strahlen3: 'Rays' },
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
const BITMAPS = { ...BITMAPS_BASE, ...BITMAPS_EXTRA, ...BITMAPS_MORE };
const CREST_SYMBOLS_OLD = tr(
  { ball: 'Ball', stern: 'Stern', krone: 'Krone', anker: 'Anker', herz: 'Herz', blitz: 'Blitz', schluessel: 'Schlüssel', klee: 'Kleeblatt', haemmer: 'Hämmer', rad: 'Rad', krug: 'Bierkrug', brezel: 'Brezel', turm: 'Turm', baum: 'Tanne', welle: 'Wellen', pferd: 'Pferd', adler: 'Adler', loewe: 'Löwe', fuchs: 'Fuchs', kuh: 'Kuh', hahn: 'Hahn', fisch: 'Fisch', eule: 'Eule', baer: 'Bär', spaten: 'Spaten', traktor: 'Traktor', windrad: 'Windrad', kirche: 'Kirche', burg: 'Burg', aehre: 'Ähre', glocke: 'Glocke', hufeisen: 'Hufeisen', keins: 'Nichts' },
  { ball: 'Ball', stern: 'Star', krone: 'Crown', anker: 'Anchor', herz: 'Heart', blitz: 'Lightning', schluessel: 'Key', klee: 'Clover', haemmer: 'Hammers', rad: 'Wheel', krug: 'Beer mug', brezel: 'Pretzel', turm: 'Tower', baum: 'Fir tree', welle: 'Waves', pferd: 'Horse', adler: 'Eagle', loewe: 'Lion', fuchs: 'Fox', kuh: 'Cow', hahn: 'Rooster', fisch: 'Fish', eule: 'Owl', baer: 'Bear', spaten: 'Spade', traktor: 'Tractor', windrad: 'Wind turbine', kirche: 'Church', burg: 'Castle', aehre: 'Wheat ear', glocke: 'Bell', hufeisen: 'Horseshoe', keins: 'None' },
);
export const CREST_SYMBOLS = { ...Object.fromEntries(Object.entries(CREST_SYMBOLS_OLD).filter(([id]) => id !== 'keins')), ...SYMBOL_NAMES, keins: CREST_SYMBOLS_OLD.keins };
export const CREST_SYMBOL_GROUPS = SYMBOL_GROUPS;
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
const BAND_AT = { schild: [50, 38], banner: [42, 46], sechseck: [48, 46], spitz: [40, 32], raute: [40, 32], wimpel: [26, 26], rund: [48, 40], oval: [48, 42], franz: [48, 44], halbrund: [48, 42], tafel: [50, 48], bogen: [50, 46], zinnen: [48, 40], tropfen: [50, 40] };
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
  return `<svg class="crest-svg" width="${size}" height="${Math.round((size * h) / 64)}" viewBox="0 ${top} 64 ${h}" role="img" aria-label="${label.replace(/"/g, '')}"><defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs>${starSvg}<g clip-path="url(#${id})"><rect width="64" height="72" fill="${css(c.colors.field)}"/><g fill="${css(c.colors.second)}">${DIVISIONS[c.division] ?? NEW_DIVISIONS[c.division]?.(css(c.colors.second), css(c.colors.third)) ?? ''}</g>${c.overlay && OVERLAYS[c.overlay] ? OVERLAYS[c.overlay](path, css(c.colors.third)) : ''}<g shape-rendering="crispEdges">${symbol}</g>${band}</g><path d="${path}" fill="none" stroke="${css(c.colors.border)}" stroke-width="4" stroke-linejoin="round"/></svg>`;
}

export function normalizeCrest(crest) {
  const d = defaultCrest({ id: 'x', kit: { shirt: 0x2e6b3a, shorts: 0xf2efe6 } });
  return { ...d, ...(crest ?? {}), colors: { ...d.colors, ...(crest?.colors ?? {}) } };
}

// Wappen für Vereine ohne eigenes: fest aus Kennung und Trikotfarben.
export function defaultCrest(club) {
  let h = 17;
  for (const ch of String(club.id ?? club.name ?? '')) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const shapes = OLD_SHAPES;
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
    colors: { field, second: second === field ? (light(field) ? 0x1c1c1c : 0xf2efe6) : second, third: [0xe0b020, 0xf2efe6, 0x1c1c1c].find((n) => n !== field && n !== second) ?? 0xc8352f, border: 0x1c1c1c, symbol: light(field) && light(second) ? 0x1c1c1c : 0xe0b020 },
    band: (h >>> 12) % 3 === 0,
    bandText: 'short',
    stars: true,
    overlay: 'keine',
  };
}

export const crestOf = (club) => (club?.crest ? normalizeCrest(club.crest) : defaultCrest(club ?? {}));
