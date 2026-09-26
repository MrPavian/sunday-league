// Trikotstoff als winziger Pixel-Atlas (64 × 16): vorne | hinten | Seite links |
// Seite rechts. Die Spielfigur mappt ihre Quader auf diese Felder, das Vereinsheim
// zeigt dieselbe Vorderseite als Vorschau. Dazu Sponsor-Brustfeld und Dreck.
export const ATLAS_W = 64;
export const ATLAS_H = 16;
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
export const PATTERN_IDS = Object.keys(PATTERNS);

// Kleine Pixel-„Schrift" für das Brustfeld: aus jedem Buchstaben wird ein
// Säulenmuster. Lesbar ist das auf dem Platz nicht – aber es sieht aus wie ein Logo.
function wordmark(name) {
  const letters = String(name ?? '').replace(/[^A-Za-zÄÖÜäöüß]/g, '').slice(0, 5);
  return [...letters].map((ch) => ch.charCodeAt(0));
}

export function sponsorPlate(kit, sponsor) {
  const c = sponsor.color ?? 0xf2efe6;
  // Hebt sich die Sponsorfarbe nicht vom Trikot ab, kommt sie auf ein helles/dunkles Feld.
  const diff = Math.abs(luminance(c) - luminance(kit.shirt));
  const plate = diff < 0.25 ? (luminance(kit.shirt) > 0.5 ? 0x1c1c1c : 0xf2efe6) : null;
  const ink = plate == null ? c : luminance(c) - luminance(plate) > 0.3 || luminance(plate) - luminance(c) > 0.3 ? c : luminance(plate) > 0.5 ? 0x1c1c1c : 0xf2efe6;
  return { plate, ink };
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
    if (face === 'front' && sponsor) {
      const { plate, ink } = sponsorPlate(kit, sponsor);
      if (plate != null) {
        ctx.fillStyle = css(plate);
        ctx.fillRect(ox + 3, 6, 10, 4);
      }
      ctx.fillStyle = css(ink);
      const codes = wordmark(sponsor.name);
      const w = Math.min(8, codes.length * 2);
      const start = ox + 8 - Math.ceil(w / 2);
      codes.forEach((code, i) => {
        if (i * 2 >= w) return;
        const tall = code % 3 === 0;
        ctx.fillRect(start + i * 2, tall ? 6 : 7, 1, tall ? 3 : 2);
      });
      ctx.fillRect(start, 9, w - 1, 1);
    }
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
