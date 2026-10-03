// Sponsor-Logos für die Trikotbrust: ein winziges Pixel-Zeichen je Branche (höchstens 5 × 4) plus eine
// stilisierte Schriftmarke. Die Marke bildet die Wörter des Namens nach (Wortlängen, Großbuchstaben,
// Bindestriche), nicht die ersten Buchstaben. x = Markenfarbe, o = Akzentfarbe, . = frei.
// Auf 16 × 16 Pixeln pro Trikotseite liest man keinen Namen – aber man erkennt Brezel, Auto oder Bierglas.

export const GLYPHS = {
  brezel: ['x.x.x', 'xxxxx', '.x.x.', 'xx.xx'],
  brot: ['.xxx.', 'xoxox', 'xxxxx'],
  lenkrad: ['.xxx.', 'x.o.x', 'xxxxx', '.x.x.'],
  spiess: ['..o..', '.xxx.', '.xxx.', '..o..'],
  auto: ['.xxx.', 'xxxxx', '.o.o.'],
  kreuz: ['.x.', 'xxx', '.x.'],
  schere: ['x...x', '.x.x.', '..x..', 'oo.oo'],
  dach: ['..x..', '.x.x.', 'x...x', '.ooo.'],
  flasche: ['.o.', '.x.', 'xxx', 'xxx'],
  pizza: ['xxxxx', '.xox.', '..x..'],
  tropfen: ['.x.', 'xxx', 'xox', '.x.'],
  hantel: ['o...o', 'oxxxo', 'o...o'],
  kerze: ['.o.', '.x.', '.x.', 'xxx'],
  blitz: ['..xx', '.xx.', 'xxxx', '.x..'],
  wurst: ['.xxx.', 'xxxxx', 'o...o'],
  schild: ['xxxxx', 'xoxox', '.xxx.', '..x..'],
  welle: ['x...x', '.x.x.', 'x.x.x', '.o.o.'],
  zange: ['x.x', 'x.x', '.x.', 'oxo'],
  baum: ['.xxx.', 'xxxxx', '.xxx.', '..o..'],
  kacheln: ['xx.xx', 'xx.xx', '.....', 'xx.xx'],
  brille: ['oo.oo', 'x.x.x', 'oo.oo'],
  eis: ['.xx.', 'xxxx', '.oo.', '..o.'],
  handy: ['xxx', 'xox', 'xxx', 'x.x'],
  blatt: ['..xx', '.xxx', 'xxx.', 'o...'],
  taxi: ['.oo.', 'xxxx', 'xxxx', '.x.x'],
  herz: ['x.x', 'xxx', '.x.'],
  ziegel: ['xx.xx', '.xx.x', 'xx.xx'],
  kuh: ['o...o', 'xxxxx', 'x.x.x'],
  nadel: ['x....', '.x...', '..xo.', '...oo'],
  flugzeug: ['..x..', 'xxxxx', '..x..', '.ooo.'],
  sonne: ['o.o.o', '.xxx.', 'oxxxo', '.xxx.'],
  zahn: ['xxxxx', 'xxxxx', 'x.x.x'],
  schluessel: ['oo...', 'oxxxx', '...x.'],
  rad: ['xx.xx', 'x.o.x', 'xx.xx'],
  kiste: ['xxxxx', 'xoxox', 'xxxxx'],
  sofa: ['x...x', 'xxxxx', 'xooox', 'x...x'],
  pfote: ['x.x.x', '.....', '.xxx.', '.xxx.'],
  monitor: ['xxxxx', 'xooox', 'xxxxx', '..x..'],
  loeffel: ['.xx.', '.xx.', '..o.', '..o.'],
  faden: ['o...', '.x..', '..x.', 'xxxx'],
  paragraf: ['.xx', 'x..', '.xx', '..x'],
  blume: ['.o.', 'oxo', '.o.', '.x.'],
  loewe: ['oxxxo', 'xx.xx', 'oxxxo'],
  pinsel: ['...xx', '..xx.', '.o...', 'o....'],
  laster: ['xxx..', 'xxxxx', '.o.o.'],
  besen: ['..x..', '..x..', '.ooo.', 'ooooo'],
  biene: ['.o.o.', 'xxxxx', 'oxoxo', '.xxx.'],
  kegel: ['.x.x.', '.x.x.', 'xx.xx', '.ooo.'],
  turm: ['x.x.x', 'xxxxx', 'xxoxx', 'xxxxx'],
  muenze: ['.xxx.', 'xxoxx', '.xxx.'],
  glas: ['ooooo', 'xxxxx', 'xxxxx', '.xxx.'],
  hammer: ['xxx..', 'xxx..', '.o...', '.o...'],
  strasse: ['x.o.x', 'x...x', 'x.o.x'],
  traktor: ['xxx..', 'xxxxx', 'oo.o.', 'oo...'],
  scheck: ['xxxxx', 'x.o.x', 'xxxxx'],
};

// Welches Zeichen, welche Anordnung, welche Akzentfarbe – je Sponsor (IDs aus career/sponsors.js).
// Anordnung: links (Zeichen links, Schrift rechts), mitte (Zeichen mittig, Schrift als Flügel),
// band (farbiges Band mit ausgespartem Zeichen), rund (Zeichen auf eigenem Fleck), schrift (nur Marke).
export const LOGOS = {
  krume: { glyph: 'brezel', layout: 'links', accent: 0x8a5a2a },
  vollgas: { glyph: 'lenkrad', layout: 'band', accent: 0xf2efe6 },
  sultan: { glyph: 'spiess', layout: 'mitte', accent: 0xc0392b },
  brenner: { glyph: 'auto', layout: 'band', accent: 0xbfc3c8 },
  physio: { glyph: 'kreuz', layout: 'rund', accent: 0xf2efe6 },
  schnittig: { glyph: 'schere', layout: 'links', accent: 0x1c1c1c },
  kowalski: { glyph: 'dach', layout: 'links', accent: 0x5a5f6a },
  hoffmann: { glyph: 'flasche', layout: 'mitte', accent: 0xe0b020 },
  enzo: { glyph: 'pizza', layout: 'links', accent: 0xc0392b },
  blum: { glyph: 'tropfen', layout: 'rund', accent: 0xf2efe6 },
  muckibude: { glyph: 'hantel', layout: 'mitte', accent: 0xbfc3c8 },
  kalle: { glyph: 'kiste', layout: 'schrift', accent: 0xf2efe6 },
  ruhe: { glyph: 'kerze', layout: 'mitte', accent: 0xe0b020 },
  funke: { glyph: 'blitz', layout: 'band', accent: 0x1c1c1c },
  wolf: { glyph: 'wurst', layout: 'links', accent: 0xf2efe6 },
  klein: { glyph: 'schild', layout: 'rund', accent: 0xe0b020 },
  blitzblank: { glyph: 'welle', layout: 'band', accent: 0xf2efe6 },
  schrauber: { glyph: 'zange', layout: 'links', accent: 0xe0b020 },
  lindenwirt: { glyph: 'baum', layout: 'mitte', accent: 0x8a5a2a },
  fliesen: { glyph: 'kacheln', layout: 'links', accent: 0xf2efe6 },
  optik: { glyph: 'brille', layout: 'mitte', accent: 0xbfc3c8 },
  eisdiele: { glyph: 'eis', layout: 'links', accent: 0xc9a227 },
  handy: { glyph: 'handy', layout: 'links', accent: 0x8ad0e8 },
  gruenzeug: { glyph: 'blatt', layout: 'links', accent: 0x8a5a2a },
  taxi: { glyph: 'taxi', layout: 'band', accent: 0x1c1c1c },
  nagelstudio: { glyph: 'herz', layout: 'rund', accent: 0xf2efe6 },
  baustoffe: { glyph: 'ziegel', layout: 'links', accent: 0xf2efe6 },
  hofladen: { glyph: 'kuh', layout: 'mitte', accent: 0x1c1c1c },
  tattoo: { glyph: 'nadel', layout: 'links', accent: 0xc0392b },
  reisebuero: { glyph: 'flugzeug', layout: 'band', accent: 0xf2efe6 },
  imbiss: { glyph: 'wurst', layout: 'mitte', accent: 0xc0392b },
  solar: { glyph: 'sonne', layout: 'links', accent: 0xf0c020 },
  zahnarzt: { glyph: 'zahn', layout: 'rund', accent: 0xf2efe6 },
  schluessel: { glyph: 'schluessel', layout: 'links', accent: 0xe0b020 },
  fahrrad: { glyph: 'rad', layout: 'mitte', accent: 0x1c1c1c },
  bestpreis: { glyph: 'kiste', layout: 'band', accent: 0xf2efe6 },
  moebel: { glyph: 'sofa', layout: 'links', accent: 0xc98a3a },
  hundesalon: { glyph: 'pfote', layout: 'mitte', accent: 0x3b2616 },
  computer: { glyph: 'monitor', layout: 'links', accent: 0x4fa3e0 },
  kuechen: { glyph: 'loeffel', layout: 'links', accent: 0x8a5a2a },
  schneiderei: { glyph: 'faden', layout: 'links', accent: 0xc0392b },
  steuer: { glyph: 'paragraf', layout: 'rund', accent: 0xf2efe6 },
  blumen: { glyph: 'blume', layout: 'mitte', accent: 0xf0c020 },
  apotheke: { glyph: 'kreuz', layout: 'band', accent: 0xf2efe6 },
  tierarzt: { glyph: 'pfote', layout: 'rund', accent: 0xf2efe6 },
  reinigung: { glyph: 'welle', layout: 'links', accent: 0xf2efe6 },
  maler: { glyph: 'pinsel', layout: 'links', accent: 0x8a5a2a },
  sonnenstudio: { glyph: 'sonne', layout: 'mitte', accent: 0xf0c020 },
  umzug: { glyph: 'laster', layout: 'band', accent: 0xf2efe6 },
  schornstein: { glyph: 'besen', layout: 'mitte', accent: 0xc9a227 },
  imker: { glyph: 'biene', layout: 'mitte', accent: 0x1c1c1c },
  bowling: { glyph: 'kegel', layout: 'links', accent: 0xf2efe6 },
  stadtwerke: { glyph: 'turm', layout: 'band', accent: 0xf0c020 },
  bezirksbank: { glyph: 'muenze', layout: 'band', accent: 0xf2efe6 },
  brauerei: { glyph: 'glas', layout: 'mitte', accent: 0xf2efe6 },
  spedition: { glyph: 'laster', layout: 'links', accent: 0xe0b020 },
  baumarkt: { glyph: 'hammer', layout: 'band', accent: 0x1c1c1c },
  autobahn: { glyph: 'strasse', layout: 'band', accent: 0xf2efe6 },
  klinik: { glyph: 'kreuz', layout: 'mitte', accent: 0xc0392b },
  landmaschinen: { glyph: 'traktor', layout: 'links', accent: 0x1c1c1c },
};

// Schriftmarke aus dem Namen: jedes Wort ein Strich, so lang wie das Wort (gestaucht), ein großer
// Anfangsbuchstabe ragt eine Zeile hoch, ein Bindestrich wird zur Lücke. Für eine oder zwei Zeilen.
export function wordBars(name, width, rows = 2) {
  const words = String(name ?? '').replace(/^The\s+/i, '').split(/[\s&]+/).filter(Boolean);
  const total = words.reduce((s, w) => s + w.length, 0) || 1;
  const lines = rows === 1 || words.length === 1 ? [words] : [words.slice(0, Math.ceil(words.length / 2)), words.slice(Math.ceil(words.length / 2))];
  return lines.map((ws) => {
    const n = ws.reduce((s, w) => s + w.length, 0);
    const len = Math.max(2, Math.min(width, Math.round((width * n) / Math.max(n, total / lines.length))));
    // Bindestrich oder Wortgrenze → eine Pixel-Lücke an der passenden Stelle.
    const gaps = [];
    let at = 0;
    for (const w of ws) {
      for (const part of w.split('-').slice(0, -1)) gaps.push(Math.round(((at + part.length) / n) * len));
      at += w.length;
      if (at < n) gaps.push(Math.round((at / n) * len));
    }
    const tall = /^[A-ZÄÖÜ]/.test(ws[0] ?? '') ? 1 : 0;
    return { len, gaps: [...new Set(gaps)].filter((g) => g > 0 && g < len - 1), tall };
  });
}

// Fallback für Namen ohne eigenes Logo: Zeichen aus dem Namen ableiten (stabil), Anordnung links.
const KEYWORDS = [
  [/bäck|bake|brot|krume/i, 'brezel'], [/auto|motor|kfz|garage/i, 'auto'], [/döner|kebab|imbiss|grill/i, 'spiess'],
  [/bier|brau|getränk|drink/i, 'glas'], [/pizza/i, 'pizza'], [/apothek|physio|klinik|arzt|pharm/i, 'kreuz'],
];
export function logoFor(sponsor) {
  if (!sponsor) return null;
  const own = sponsor.id && LOGOS[sponsor.id];
  if (own) return own;
  const hit = KEYWORDS.find(([re]) => re.test(sponsor.name ?? ''));
  return { glyph: hit ? hit[1] : 'schild', layout: 'links', accent: 0xf2efe6 };
}
