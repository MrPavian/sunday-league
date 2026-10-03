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
};

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

// Malt den ganzen Atlas. dirt: 0–1, splats: feste Klecks-Positionen je Spieler.
export function paintKit(ctx, kit, { sponsor = null, dirt = 0, splats = null, dirtColor = 0x5b4a2e, x0 = 0, faces = ['front', 'back', 'left', 'right'] } = {}) {
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
    if (face === 'front' && sponsor) paintSponsor(ctx, ox, kit, sponsor, fn(8, 8, face) ? kit.second ?? kit.shirt : kit.shirt);
  });
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
