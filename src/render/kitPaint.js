// Trikotstoff als winziger Pixel-Atlas (64 × 16): vorne | hinten | Seite links |
// Seite rechts. Die Spielfigur mappt ihre Quader auf diese Felder, das Vereinsheim
// zeigt dieselbe Vorderseite als Vorschau. Dazu Sponsor-Brustfeld und Dreck.
import { GLYPHS, logoFor, wordBars } from './sponsorLogos.js';

export const REGION = { front: 0, back: 16, left: 32, right: 48 };

const css = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const luminance = (hex) => (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;

// Jedes Muster sagt pro Pixel: Hauptfarbe (false) oder zweite Farbe (true).
// face: 'front' | 'back' | 'left' | 'right'; x läuft aus Sicht des Betrachters.
const PATTERNS = {
  uni: () => false,
  streifen: (x) => Math.floor(x / 4) % 2 === 1,
  nadel: (x) => x % 4 === 1,
  ringel: (x, y) => Math.floor(y / 4) % 2 === 1,
  brustring: (x, y) => y >= 5 && y <= 9,
  haelften: (x, y, face) => (face === 'left' ? false : face === 'right' ? true : face === 'front' ? x >= 8 : x < 8),
  schaerpe: (x, y, face) => (face === 'front' ? Math.abs(x - y) <= 2 : face === 'back' ? Math.abs(15 - x - y) <= 2 : false),
  karo: (x, y) => (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 1,
  chevron: (x, y, face) => (face === 'front' || face === 'back') && Math.abs(y - (2 + Math.abs(x - 7.5) * 0.8)) <= 1.2,
  seiten: (x, y, face) => face === 'left' || face === 'right' || x <= 1 || x >= 14,
  schulter: (x, y) => y <= 3,
  // Dazu: Diagonalstreifen, breite Querstreifen, Farbverlauf (4×4-Raster, oben Hauptfarbe, unten zweite), Ärmelfeld.
  diagonal: (x, y, face) => Math.floor(((face === 'back' ? 15 - x : x) + y) / 4) % 2 === 1,
  breit: (x, y) => Math.floor(y / 6) % 2 === 1,
  verlauf: (x, y) => BAYER[(y & 3) * 4 + (x & 3)] < (y * 16) / 15,
  aermel: (x, y, face) => face === 'left' || face === 'right' || (y <= 5 && (x <= 2 || x >= 13)),
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const PATTERN_IDS = Object.keys(PATTERNS);
// Muster, bei denen der Ärmel schon in der Zweitfarbe steckt.
export const SECOND_SLEEVE = ['seiten', 'schulter', 'aermel'];
export const sleeveColor = (kit) => (SECOND_SLEEVE.includes(kit.pattern) || kit.sleeves === 'second') && kit.second != null ? kit.second : kit.shirt;

// Kragenarten als Pixel im Atlas (Vorderseite oben, hinten schmaler Streifen) – keine Zusatzfläche.
// standard: nur der Kragenquader der Figur. Farbe: Kontrast zum Hemd, damit er sich abhebt.
export const COLLARS = {
  standard: { front: [], back: [] },
  rund: { front: [[5, 0, 6, 1], [5, 1, 1, 1], [10, 1, 1, 1]], back: [[5, 0, 6, 1]] },
  v: { front: [[4, 0, 1, 1], [5, 1, 1, 1], [6, 2, 1, 1], [7, 3, 2, 1], [9, 2, 1, 1], [10, 1, 1, 1], [11, 0, 1, 1]], back: [[5, 0, 6, 1]] },
  polo: { front: [[4, 0, 3, 2], [9, 0, 3, 2], [7, 0, 2, 1], [7, 1, 2, 4]], back: [[4, 0, 8, 1]] },
};
const collarInk = (kit) => (kit.collarColor != null ? kit.collarColor : luminance(kit.shirt) > 0.55 ? 0x1c1c1c : 0xf4f1e8);

export function sponsorPlate(kit, sponsor) {
  const c = sponsor.color ?? 0xf2efe6;
  // Hebt sich die Sponsorfarbe nicht vom Trikot ab, kommt sie auf ein helles/dunkles Feld.
  const diff = Math.abs(luminance(c) - luminance(kit.shirt));
  const plate = diff < 0.25 ? (luminance(kit.shirt) > 0.5 ? 0x1c1c1c : 0xf2efe6) : null;
  const ink = plate == null ? c : luminance(c) - luminance(plate) > 0.3 || luminance(plate) - luminance(c) > 0.3 ? c : luminance(plate) > 0.5 ? 0x1c1c1c : 0xf2efe6;
  return { plate, ink };
}

const close = (a, b) => Math.abs(luminance(a) - luminance(b)) < 0.25;
const contrast = (bg) => (luminance(bg) > 0.5 ? 0x1c1c1c : 0xf2efe6);

// Sponsor auf der Brust (Feld x 3–12, y 6–9): Branchenzeichen plus Schriftmarke, je Sponsor anders
// angeordnet (sponsorLogos.js). bg: Trikotfarbe unter dem Brustfeld.
function paintSponsor(ctx, ox, kit, sponsor, bg) {
  const logo = logoFor(sponsor);
  const glyph = GLYPHS[logo.glyph] ?? GLYPHS.schild;
  const gw = glyph[0].length;
  const gh = glyph.length;
  const brand = sponsor.color ?? 0xf2efe6;
  let layout = logo.layout;
  // Band und Fleck brauchen eine Markenfarbe, die sich vom Trikot abhebt – sonst klassisch mit Feld.
  if ((layout === 'band' || layout === 'rund') && close(brand, bg)) layout = 'links';
  const dot = (x, y, c) => {
    ctx.fillStyle = css(c);
    ctx.fillRect(ox + x, y, 1, 1);
  };
  const drawGlyph = (x0, y0, ink, accent) => glyph.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && dot(x0 + x, y0 + y, ch === 'o' ? accent : ink)));
  const drawBars = (x0, y0, width, rows, ink) =>
    wordBars(sponsor.name, width, rows).forEach((bar, r) => {
      for (let x = 0; x < bar.len; x++) if (!bar.gaps.includes(x)) dot(x0 + x, y0 + r * (rows === 1 ? 0 : 2), ink);
      if (bar.tall) dot(x0, y0 + r * (rows === 1 ? 0 : 2) - 1, ink); // großer Anfangsbuchstabe
    });
  const top = 6 + Math.floor((4 - gh) / 2);
  if (layout === 'band') {
    // Farbiges Band über die Brust, Zeichen und Marke in der Akzentfarbe ausgespart.
    ctx.fillStyle = css(brand);
    ctx.fillRect(ox + 3, 6, 10, 4);
    const ink = close(logo.accent, brand) ? contrast(brand) : logo.accent;
    drawGlyph(4, top, ink, close(bg, brand) ? contrast(brand) : bg);
    drawBars(5 + gw, 7, 12 - (5 + gw), 2, ink);
    return;
  }
  if (layout === 'rund') {
    // Runder Fleck in Markenfarbe mit Zeichen, daneben die Marke in Markenfarbe.
    ctx.fillStyle = css(brand);
    ctx.fillRect(ox + 4, 6, gw + 2, 4);
    for (const [x, y] of [[4, 6], [5 + gw, 6], [4, 9], [5 + gw, 9]]) dot(x, y, bg); // Ecken abrunden
    drawGlyph(5, top, close(logo.accent, brand) ? contrast(brand) : logo.accent, contrast(brand));
    drawBars(7 + gw, 7, 12 - (7 + gw) + 1, 2, close(brand, bg) ? contrast(bg) : brand);
    return;
  }
  const { plate, ink } = sponsorPlate(kit, sponsor);
  const field = plate ?? bg;
  if (plate != null) {
    ctx.fillStyle = css(plate);
    ctx.fillRect(ox + 3, 6, 10, 4);
  }
  const accent = close(logo.accent, field) ? ink : logo.accent;
  if (layout === 'mitte') {
    // Zeichen in der Mitte, die Marke als Flügel links und rechts.
    const gx = 8 - Math.ceil(gw / 2);
    drawGlyph(gx, top, ink, accent);
    const wing = Math.max(1, gx - 4);
    for (let x = 0; x < wing; x++) {
      dot(gx - 2 - x, 8, ink);
      dot(gx + gw + 1 + x, 8, ink);
    }
    return;
  }
  if (layout === 'schrift') {
    // Nur Schriftzug: zwei Zeilen, darunter ein Schwung in der Akzentfarbe.
    drawBars(4, 7, 8, 2, ink);
    for (let x = 0; x < 8; x++) dot(4 + x, x < 2 || x > 5 ? 9 : 8, accent);
    return;
  }
  // links: Zeichen links, Marke rechts daneben.
  drawGlyph(3, top, ink, accent);
  drawBars(4 + gw, 7, 12 - (4 + gw) + 1, 2, ink);
}

// Ärmelsponsor: ein 8 × 8 Feld im Atlas (Zelle SLEEVE_CELL), auf den Ärmel der Figur gemappt. Markenfarbe mit
// Rand in Gegenfarbe und dem Schriftzug als Balken – keine neue Textur, kein zusätzlicher Draw Call.
export const SLEEVE_CELL = [72, 8];
export function paintSleeve(ctx, sponsor, sleeve) {
  const [x0, y0] = SLEEVE_CELL;
  const brand = sponsor.color ?? 0xf2efe6;
  // Hebt sich die Markenfarbe nicht vom Ärmel ab, kommt sie auf ein helles/dunkles Feld.
  const field = Math.abs(luminance(brand) - luminance(sleeve)) < 0.25 ? (luminance(sleeve) > 0.5 ? 0x1c1c1c : 0xf2efe6) : brand;
  const ink = Math.abs(luminance(field) - luminance(brand)) > 0.3 ? brand : contrast(field);
  const edge = contrast(field);
  ctx.fillStyle = css(edge);
  ctx.fillRect(x0, y0, 8, 8);
  ctx.fillStyle = css(field);
  ctx.fillRect(x0 + 1, y0 + 1, 6, 6);
  ctx.fillStyle = css(ink === field ? edge : ink);
  wordBars(sponsor.name, 4, 2).forEach((bar, r) => {
    for (let x = 0; x < bar.len; x++) if (!bar.gaps.includes(x)) ctx.fillRect(x0 + 2 + x, y0 + 2 + r * 2, 1, 1);
  });
}

// Malt den ganzen Atlas. dirt: 0–1, splats: feste Klecks-Positionen je Spieler.
const FOLDS = {
  front: [[0, 3, 1, 4], [15, 3, 1, 4], [3, 11, 1, 2], [4, 13, 2, 1], [12, 11, 1, 2], [10, 13, 2, 1], [0, 15, 16, 1]],
  back: [[0, 3, 1, 4], [15, 3, 1, 4], [6, 12, 1, 2], [9, 12, 1, 2], [0, 15, 16, 1]],
  left: [[0, 2, 16, 1], [5, 9, 1, 3], [10, 10, 1, 3], [0, 15, 16, 1]],
  right: [[0, 2, 16, 1], [5, 10, 1, 3], [10, 9, 1, 3], [0, 15, 16, 1]],
};

export function paintKit(ctx, kit, { sponsor = null, dirt = 0, splats = null, dirtColor = 0x5b4a2e, wet = 0, x0 = 0, faces = ['front', 'back', 'left', 'right'] } = {}) {
  const fn = PATTERNS[kit.pattern] ?? PATTERNS.uni;
  const a = css(kit.shirt);
  const b = css(kit.second ?? kit.shirt);
  faces.forEach((face, fi) => {
    const ox = x0 + fi * 16;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = fn(x, y, face) ? b : a;
        ctx.fillRect(ox + x, y, 1, 1);
      }
    // Falten: unter den Armen, an der Taille und ein Zug schräg zur Hüfte – leicht dunkler, damit der
    // Stoff nicht wie eine glatte Fläche wirkt.
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.14;
    for (const [x, y, w, h] of FOLDS[face] ?? []) ctx.fillRect(ox + x, y, w, h);
    ctx.globalAlpha = 1;
    const collar = COLLARS[kit.collar]?.[face];
    if (collar?.length) {
      ctx.fillStyle = css(collarInk(kit));
      for (const [x, y, w, h] of collar) ctx.fillRect(ox + x, y, w, h);
    }
    if (face === 'front' && sponsor) paintSponsor(ctx, ox, kit, sponsor, fn(8, 8, face) ? kit.second ?? kit.shirt : kit.shirt);
  });
  if (wet > 0) paintWet(ctx, wet, x0, faces);
  if (dirt > 0 && splats) {
    const n = Math.floor(splats.length * Math.min(1, dirt));
    ctx.fillStyle = css(dirtColor);
    for (let i = 0; i < n; i++) {
      const s = splats[i];
      const fi = faces.indexOf(s.face);
      if (fi < 0) continue;
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(x0 + fi * 16 + s.x, s.y, s.w, s.h);
    }
    ctx.globalAlpha = 1;
  }
}

// Nasser Stoff (wet 0–1): Multiplizieren macht Farbe dunkler und satter, dazu zeichnen sich Falten
// und die Stellen, wo der Stoff klebt (Schultern, Brust, Saum), kräftiger ab. Nur Pixel im Atlas.
const CLING = { front: [[0, 0, 16, 2], [2, 5, 3, 2], [11, 8, 3, 2], [1, 12, 14, 1]], back: [[0, 0, 16, 2], [3, 6, 4, 2], [9, 9, 4, 2], [1, 12, 14, 1]], left: [[0, 0, 16, 2], [3, 6, 2, 4], [1, 12, 14, 1]], right: [[0, 0, 16, 2], [11, 6, 2, 4], [1, 12, 14, 1]] };
function paintWet(ctx, wet, x0, names) {
  const count = names.length;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(1, wet);
  ctx.fillStyle = '#b0b5c2'; // grau-feucht; mit #9096a8 wurde der weiße Sponsorfleck blaugrau
  ctx.fillRect(x0, 0, count * 16, 16);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  for (let fi = 0; fi < count; fi++) {
    const ox = x0 + fi * 16;
    ctx.globalAlpha = 0.2 * wet;
    for (const [x, y, w, h] of FOLDS[names[fi]] ?? []) ctx.fillRect(ox + x, y, w, h);
    ctx.globalAlpha = 0.14 * wet;
    for (const [x, y, w, h] of CLING[names[fi]] ?? []) ctx.fillRect(ox + x, y, w, h);
  }
  ctx.restore();
}

// Klecks-Positionen: vor allem unten und an den Seiten, dort, wo man beim Grätschen aufschlägt.
export function makeSplats(count = 70) {
  const faces = ['front', 'back', 'left', 'right'];
  return Array.from({ length: count }, (_, i) => {
    const low = Math.random() < 0.7;
    return {
      face: i % 5 === 0 ? 'back' : faces[Math.floor(Math.random() * 4)],
      x: Math.floor(Math.random() * 15),
      y: low ? 9 + Math.floor(Math.random() * 7) : Math.floor(Math.random() * 12),
      w: 1 + Math.floor(Math.random() * 3),
      h: 1 + Math.floor(Math.random() * 3),
      alpha: 0.55 + Math.random() * 0.45,
    };
  });
}

// Vorschau fürs Vereinsheim: Vorderseite als Bild-URL.
export function kitPreviewURL(kit, sponsor = null) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  paintKit(canvas.getContext('2d'), kit, { sponsor, faces: ['front'] });
  return canvas.toDataURL();
}
