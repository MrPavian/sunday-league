import { tr } from '../core/i18n.js';
import { crestSVG } from './logo.js';

// Startbild: Sonntagmorgen auf dem Dorfplatz, als Pixelbild von Hand gezeichnet (prozedural).
// Blick längs über den Platz aufs Tor; links das Vereinsheim, rechts die kleine Tribüne, dahinter das Dorf mit Kirche,
// die Sonne steht noch tief. Keine Spieler – nur der Platzwart zieht die Linien nach, das Ballnetz liegt bereit.
//
// Schärfe (2026-11-06, „hochwertigeres Startbild“): Das Bild wird in ganzzahligen Vielfachen hochskaliert (jedes Bildpixel
// gleich groß) – die Leinwand richtet sich nach dem Fenster, die Szene ist um die Mitte herum aufgebaut und zeigt auf breiten
// Fenstern einfach mehr. Oben in der Mitte bleibt Platz fürs Logo (bis ≈ 45 % der Höhe).
// Gezeichnet wird in einen Pixelpuffer (schnell, deckende Farben); bewegt sind nur Wolken, Vögel, Fahne, Flutlicht, Rauch und
// der Platzwart.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a, b, t) => {
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

// Pixelpuffer: deckende Farben 0xRRGGBB, set/rect/blend, am Ende in eine Leinwand.
class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.img = new ImageData(w, h);
    this.d = new Uint32Array(this.img.data.buffer);
  }
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = 0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    const v = this.d[y * this.w + x];
    return ((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255);
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x] >>> 24;
  }
  rect(x, y, w, h, c) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.set(xx, yy, c);
  }
  blend(x, y, c, t) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.set(x, y, this.alpha(x, y) ? mix(this.get(x, y), c, t) : c);
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    cv.getContext('2d').putImageData(this.img, 0, 0);
    return cv;
  }
}

// Kleine Pixelschrift (3 × 5) fürs Vereinsheim-Schild.
const GLYPH = {
  V: ['101', '101', '101', '101', '010'],
  E: ['111', '100', '110', '100', '111'],
  R: ['110', '101', '110', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  N: ['101', '111', '111', '111', '101'],
  S: ['011', '100', '010', '001', '110'],
  H: ['101', '101', '111', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
};
function text(px, s, x, y, c) {
  for (const ch of s) {
    const g = GLYPH[ch];
    if (g) g.forEach((row, r) => [...row].forEach((b, i) => b === '1' && px.set(x + i, y + r, c)));
    x += 4;
  }
}

// --- Aufteilung ---------------------------------------------------------------------------------------------------------
// W, H: Bildpixel. cx: Mitte. HZ: Fuß des Dorfs (Horizont), BOARD: Oberkante der Bande, GL: Torlinie.
// Perspektive: Blick längs übers Feld, Kamera etwa 7 m hoch; Linien quer zum Blick bleiben waagerecht.
function layout(W, H) {
  const portrait = H > W * 1.2;
  const HZ = Math.round(H * (portrait ? 0.57 : 0.6));
  const BOARD = HZ + 5;
  const GL = BOARD + 14;
  const VP = { x: Math.round(W / 2 + (portrait ? 0.08 : 0.18) * W), y: GL - 58 };
  const Z0 = 40; // Entfernung der Torlinie (m)
  const HCAM = 6.8; // Kamerahöhe (m)
  const scaleAt = (v) => Z0 / (Z0 - v); // v: Meter von der Torlinie zum Betrachter
  const P = (u, v) => {
    const s = scaleAt(v);
    return { x: VP.x + (u * (GL - VP.y) * s) / HCAM, y: VP.y + (GL - VP.y) * s, s };
  };
  const vAtY = (y) => Z0 * (1 - (GL - VP.y) / (y - VP.y));
  return { W, H, cx: Math.round(W / 2), portrait, HZ, BOARD, GL, VP, P, vAtY, ppm: (GL - VP.y) / HCAM };
}

// --- Himmel ---------------------------------------------------------------------------------------------------------------
const SKY = [0x3d6db0, 0x4b7cbd, 0x5c8cc7, 0x739ed0, 0x8db0d6, 0xaec2d6, 0xd2cfc6, 0xead0aa, 0xf4c991];
function skyColor(L, x, y) {
  const f = Math.max(0, Math.min(0.999, y / L.HZ)) ** 1.15 * (SKY.length - 1);
  const i = Math.floor(f);
  const frac = f - i;
  // Breite Bänder, nur am Übergang ein schmaler, gerasterter Saum (kein Farbrauschen über die ganze Fläche).
  const t = frac < 0.7 ? 0 : (frac - 0.7) / 0.3;
  return t > bayer(x, y) ? SKY[i + 1] : SKY[i];
}
function sun(L) {
  return { x: Math.round(L.cx + (L.portrait ? -0.2 : 0.06) * L.W), y: L.HZ - 13, r: 8 };
}
function drawSky(px, L) {
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) px.set(x, y, skyColor(L, x, y));
  // Sonne knapp über dem Dorf: Scheibe, heller Rand, zwei gestufte Lichthöfe.
  const s = sun(L);
  for (let y = -s.r * 4; y <= s.r * 4; y++)
    for (let x = -s.r * 4; x <= s.r * 4; x++) {
      const d = Math.hypot(x, y);
      const X = s.x + x;
      const Y = s.y + y;
      if (d <= s.r - 1) px.set(X, Y, 0xfff8e2);
      else if (d <= s.r) px.set(X, Y, 0xffeec0);
      else if (d <= s.r * 2) px.blend(X, Y, 0xffe6b0, d <= s.r * 1.5 ? 0.42 : 0.24);
      else if (d <= s.r * 4) px.blend(X, Y, 0xffdca0, 0.1 * (1 - (d - s.r * 2) / (s.r * 2)) + (bayer(X, Y) < 0.25 ? 0.04 : 0));
    }
}

// Wolken: Haufen aus Ellipsen, oben Licht, unten Schatten – je Wolke einmal gezeichnet, dann nur verschoben.
function makeCloud(seed, size) {
  const r = rng(seed);
  const n = 4 + Math.floor(r() * 4);
  const puffs = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    const rad = size * (0.55 + r() * 0.6) * (i === 0 || i === n - 1 ? 0.7 : 1);
    puffs.push({ x, y: -rad * 0.55 - r() * size * 0.25, rx: rad * 1.25, ry: rad });
    x += rad * (0.9 + r() * 0.5);
  }
  const w = Math.ceil(x + size * 2.5);
  const h = Math.ceil(size * 3);
  const px = new Pix(w, h);
  const base = h - 2;
  const inside = (X, Y) => puffs.some((p) => ((X - p.x - size) / p.rx) ** 2 + ((Y - base - p.y) / p.ry) ** 2 <= 1) && Y <= base;
  for (let Y = 0; Y < h; Y++)
    for (let X = 0; X < w; X++) {
      if (!inside(X, Y)) continue;
      const lightEdge = !inside(X - 1, Y - 2); // oben links: Sonne
      const below = base - Y;
      let c = 0xf6f2ea;
      if (lightEdge) c = 0xffffff;
      else if (below < 2) c = 0xc7cad3;
      else if (below < 4 || !inside(X + 2, Y + 2)) c = 0xdedde0;
      px.set(X, Y, c);
    }
  return px.canvas();
}

// --- Hintergrund: Hügel, Wald, Dorf, Kirche ---------------------------------------------------------------------------------
function drawHills(px, L) {
  for (let x = 0; x < L.W; x++) {
    const far = Math.round(16 + Math.sin(x * 0.017) * 6 + Math.sin(x * 0.043 + 1) * 3);
    for (let y = L.HZ - far; y < L.HZ; y++) px.set(x, y, mix(0x9db1b2, skyColor(L, x, y), 0.25));
    const near = Math.round(9 + Math.sin(x * 0.029 + 2) * 4 + Math.sin(x * 0.07) * 2);
    for (let y = L.HZ - near; y < L.HZ; y++) px.set(x, y, 0x7f9a86);
  }
}
function crown(px, cx, cy, r, base) {
  const dark = mix(base, 0x10241a, 0.35);
  const light = mix(base, 0xb8d07a, 0.35);
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y * 1.1);
      if (d > r) continue;
      const lit = x + y < -r * 0.5 && d > r * 0.45;
      const sh = x + y > r * 0.6;
      px.set(cx + x, cy + y, lit ? light : sh ? dark : base);
    }
}
function drawForest(px, L) {
  const r = rng(41);
  for (let x = -4; x < L.W + 4; x += 3 + Math.floor(r() * 3)) {
    const rad = 3 + Math.floor(r() * 4);
    crown(px, x, L.HZ - rad + 1 - Math.floor(r() * 3), rad, r() < 0.5 ? 0x3e6a42 : 0x4a7646);
  }
  // Pappeln einzeln, hoch und schmal.
  for (const fx of [-0.44, -0.12, 0.47]) {
    const x = Math.round(L.cx + fx * L.W);
    for (let y = 0; y < 22; y++) {
      const w = Math.round(Math.sin((y / 22) * Math.PI) * 3.2);
      for (let i = -w; i <= w; i++) px.set(x + i, L.HZ - 2 - y, i < 0 ? 0x4f7a49 : 0x355c3a);
    }
  }
}
function house(px, x, base, w, h, wall, roof, r) {
  const shade = mix(wall, 0x3a2a20, 0.22);
  px.rect(x, base - h, w, h, wall);
  px.rect(x + w - 2, base - h, 2, h, shade);
  // Satteldach mit Ziegelreihen und Schornstein.
  const rh = Math.ceil(w / 2) + 1;
  for (let i = 0; i < rh; i++) {
    const c = i % 2 ? roof : mix(roof, 0x000000, 0.18);
    px.rect(x - 1 + i, base - h - i, w + 2 - i * 2, 1, c);
  }
  if (r() < 0.7) px.rect(x + Math.floor(w * 0.7), base - h - rh + 2, 2, 4, 0x7a4a3a);
  for (let wx = x + 2; wx < x + w - 3; wx += 4) {
    px.rect(wx, base - h + 3, 2, 3, r() < 0.15 ? 0xf3d27e : 0x45566a);
    px.set(wx, base - h + 6, 0xf2efe6);
    px.set(wx + 1, base - h + 6, 0xf2efe6);
  }
}
function drawVillage(px, L) {
  const r = rng(21);
  const base = L.HZ + 1;
  const walls = [0xece0c8, 0xe2d2b2, 0xf1e9d8, 0xd9c7a6, 0xe8d6c0];
  const roofs = [0xb4583c, 0x9a4a36, 0x7a4a3a, 0xa86444];
  let x = Math.round(L.cx - 0.2 * L.W);
  const end = Math.round(L.cx + 0.4 * L.W);
  while (x < end) {
    const w = 11 + Math.floor(r() * 9);
    const h = 7 + Math.floor(r() * 5);
    house(px, x, base, w, h, walls[Math.floor(r() * walls.length)], roofs[Math.floor(r() * roofs.length)], r);
    x += w + 2 + Math.floor(r() * 5);
  }
  // Kirche rechts außen (außerhalb des Logos): Schiff, Turm mit Uhr und Schallluken, Spitzhelm mit Kreuz.
  const kx = Math.round(L.cx + (L.portrait ? 0.3 : 0.31) * L.W);
  px.rect(kx - 18, base - 13, 20, 13, 0xe6dac2);
  px.rect(kx - 18, base - 13, 20, 1, 0xcfc2a8);
  for (let i = 0; i < 8; i++) px.rect(kx - 19 + i, base - 14 - i, 22 - i * 2, 1, i % 2 ? 0x8a3e2e : 0x7a3428);
  const tw = 10;
  const th = Math.min(40, Math.round(L.HZ - L.H * 0.47));
  px.rect(kx, base - th, tw, th, 0xeee3cc);
  px.rect(kx + tw - 2, base - th, 2, th, 0xd2c5aa);
  px.rect(kx + 3, base - th + 4, 4, 4, 0xf8f6f0); // Ziffernblatt
  px.rect(kx + 4, base - th + 5, 1, 2, 0x1a1a1a);
  px.set(kx + 5, base - th + 6, 0x1a1a1a);
  px.rect(kx + 3, base - th + 10, 1, 4, 0x4a3a2a);
  px.rect(kx + 6, base - th + 10, 1, 4, 0x4a3a2a);
  for (let i = 0; i < 14; i++) {
    const w = Math.max(1, Math.round((i / 14) * (tw + 2)));
    px.rect(kx + tw / 2 - w / 2, base - th - 14 + i, w, 1, i % 3 ? 0x587266 : 0x4a6458);
  }
  px.rect(kx + tw / 2 - 0.5, base - th - 19, 1, 5, 0xd4af37);
  px.rect(kx + tw / 2 - 1.5, base - th - 18, 3, 1, 0xd4af37);
}

// --- Vereinsheim, Fahne, Flutlicht, Tribüne ---------------------------------------------------------------------------------
function clubhouse(L) {
  const w = Math.max(74, Math.round(0.27 * L.W));
  const x = Math.round(L.cx - 0.47 * L.W);
  return { x: L.portrait ? 2 : x, y: L.BOARD - 27, w, h: 27 };
}
function drawClubhouse(px, L) {
  const { x, y, w, h } = clubhouse(L);
  // Klinker mit versetzten Fugen, rechte Seite im Schatten.
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const row = Math.floor(yy / 3);
      const joint = yy % 3 === 2 || (xx + (row % 2 ? 3 : 0)) % 7 === 0;
      let c = joint ? 0x7d3c2c : (xx * 7 + row * 13) % 11 === 0 ? 0xa45640 : 0x96492f;
      if (xx > w - 4) c = mix(c, 0x2a1810, 0.25);
      px.set(x + xx, y + yy, c);
    }
  // Flachdach mit Blechkante und Überstand.
  px.rect(x - 3, y - 4, w + 6, 4, 0x45484c);
  px.rect(x - 3, y - 4, w + 6, 1, 0x6c7076);
  px.rect(x - 3, y, w + 6, 1, 0x2a2c30);
  // Schild.
  const sw = 47;
  const sx = x + Math.round((w - sw) / 2);
  px.rect(sx - 1, y + 2, sw + 2, 9, 0x101010);
  px.rect(sx, y + 3, sw, 7, 0x245e36);
  text(px, 'VEREINSHEIM', sx + 2, y + 4, 0xf2efe6);
  // Fenster mit weißem Rahmen, eins mit Licht und Gardine; Tür mit Vordach.
  const n = Math.max(3, Math.floor((w - 20) / 17));
  for (let i = 0; i < n; i++) {
    const wx = x + 5 + i * 17;
    if (wx + 12 > x + w - 4) break;
    px.rect(wx - 1, y + 13, 14, 10, 0xeae2cf);
    const lit = i === 1;
    px.rect(wx, y + 14, 12, 8, lit ? 0xf6d58e : 0x5d7c9c);
    if (!lit) px.rect(wx, y + 14, 5, 2, 0x8fb0cc); // Spiegelung
    else px.rect(wx, y + 14, 12, 2, 0xe8c070);
    px.rect(wx + 6, y + 14, 1, 8, 0xeae2cf);
    px.rect(wx - 2, y + 23, 16, 1, 0xbfb6a2); // Fensterbank
  }
  const dx = x + w - 13;
  px.rect(dx, y + 12, 8, h - 12, 0x3d2a1e);
  px.rect(dx + 1, y + 13, 6, h - 14, 0x5a3e2a);
  px.set(dx + 5, y + 19, 0xd4af37);
  px.rect(dx - 2, y + 10, 12, 2, 0x45484c);
  // Bierbank davor.
  px.rect(x + 6, L.BOARD - 4, 18, 1, 0x8a6a3a);
  px.rect(x + 7, L.BOARD - 3, 1, 3, 0x5a4024);
  px.rect(x + 22, L.BOARD - 3, 1, 3, 0x5a4024);
  // Grill mit Kohle (der Rauch zieht im Bild).
  px.rect(x + w + 4, L.BOARD - 6, 6, 3, 0x2a2a2a);
  px.rect(x + w + 5, L.BOARD - 6, 4, 1, 0xd8642a);
  px.rect(x + w + 5, L.BOARD - 3, 1, 3, 0x2a2a2a);
  px.rect(x + w + 8, L.BOARD - 3, 1, 3, 0x2a2a2a);
}
function flagPos(L) {
  const c = clubhouse(L);
  return { x: c.x + c.w + 14, top: L.BOARD - 44 };
}
function drawFlagpole(px, L) {
  const f = flagPos(L);
  px.rect(f.x, f.top, 1, L.BOARD - f.top, 0xd8d8d0);
  px.set(f.x, f.top - 1, 0xd4af37);
}
function mastXs(L) {
  return L.portrait ? [Math.round(L.cx - 0.36 * L.W), Math.round(L.cx + 0.42 * L.W)] : [Math.round(L.cx - 0.31 * L.W), Math.round(L.cx + 0.43 * L.W)];
}
const mastTop = (L) => Math.round(L.portrait ? L.H * 0.41 : L.H * 0.12);
function drawMasts(px, L) {
  for (const x of mastXs(L)) {
    const top = mastTop(L);
    // Gittermast, unten breiter.
    for (let y = top; y < L.BOARD; y++) {
      const w = 2 + Math.floor(((y - top) / (L.BOARD - top)) * 2);
      px.rect(x - (w >> 1), y, w, 1, 0x6a6e72);
      if ((y - top) % 4 === 0) px.rect(x - (w >> 1), y, w, 1, 0x4e5256);
    }
    px.rect(x - 9, top - 9, 19, 10, 0x3a3e44);
    px.rect(x - 9, top, 19, 1, 0x26292d);
  }
}
function drawLamps(ctx, L, t) {
  mastXs(L).forEach((x, m) => {
    const top = mastTop(L);
    for (let i = 0; i < 8; i++) {
      const on = !(m === 1 && i === 5 && Math.sin(t * 13) < -0.85); // eine Lampe flackert, wie immer
      ctx.fillStyle = on ? (i % 2 ? '#fff2c2' : '#fff9e0') : '#7d7d74';
      ctx.fillRect(x - 8 + (i % 4) * 5, top - 8 + Math.floor(i / 4) * 4, 3, 3);
    }
  });
}
// Links der Mitte, zwischen Fahnenmast und Tor (im Hochformat ist dafür kein Platz).
function stand(L) {
  if (L.portrait) return null;
  return { x: Math.round(L.cx - 0.14 * L.W), w: Math.round(Math.max(56, 0.17 * L.W)) };
}
function drawStand(px, L, r) {
  if (!stand(L)) return;
  const { x, w } = stand(L);
  const base = L.BOARD;
  // Drei Stufen Beton, Dach auf Stützen.
  for (let s = 0; s < 3; s++) {
    const y = base - 4 - s * 5;
    px.rect(x + s * 2, y, w - s * 4, 5, s % 2 ? 0xb8b4aa : 0xa8a49a);
    px.rect(x + s * 2, y, w - s * 4, 1, 0xd0ccc2);
  }
  const roofY = base - 25;
  px.rect(x - 2, roofY, w + 4, 3, 0x2f5e8a);
  px.rect(x - 2, roofY + 3, w + 4, 1, 0x1d3c5a);
  for (const sx of [x, x + Math.round(w / 2), x + w - 1]) px.rect(sx, roofY + 4, 1, 21, 0x5a5e62);
  // Zuschauer: früh dran, nicht viele.
  for (let s = 0; s < 3; s++)
    for (let i = x + 4 + s * 2; i < x + w - 4 - s * 2; i += 4 + Math.floor(r() * 5)) if (r() < 0.55) fan(px, i, base - 10 - s * 5, r);
}
const SKIN = [0xf1d0b5, 0xd9a882, 0xa7704c, 0x7a4e32];
const HAIR = [0x3a2618, 0x8a8a8a, 0x1a1a1a, 0xb08850, 0xd8c8a0];
const SHIRT = [0xc8352f, 0x2f6fb5, 0x3a3a3a, 0x6b4f2a, 0x5a8f40, 0xe0b020, 0x245e36, 0xf2efe6];
function fan(px, x, y, r, tall = 6) {
  const shirt = SHIRT[Math.floor(r() * SHIRT.length)];
  px.rect(x, y, 3, 1, HAIR[Math.floor(r() * HAIR.length)]);
  px.rect(x, y + 1, 3, 2, SKIN[Math.floor(r() * SKIN.length)]);
  px.rect(x - (r() < 0.5 ? 1 : 0), y + 3, 4, tall - 3, shirt);
  px.rect(x + 2, y + 3, 1, tall - 3, mix(shirt, 0, 0.25));
  if (r() < 0.25) px.rect(x - 1, y + 3, 5, 1, r() < 0.5 ? 0xc8352f : 0x245e36); // Schal
}
function drawBoards(px, L) {
  const colors = [
    [0xe0a020, 0x1c1c1c],
    [0x2e7d3a, 0xf2efe6],
    [0xc98a3a, 0xf2efe6],
    [0x1d4f9c, 0xf2efe6],
    [0xd8322a, 0xf2efe6],
    [0x3a3a44, 0xe0b020],
    [0xf2efe6, 0xc8352f],
    [0x2f6fb5, 0xf2efe6],
  ];
  const r = rng(5);
  let x = -Math.floor(r() * 20);
  let i = 0;
  const y = L.BOARD;
  while (x < L.W) {
    const w = 34 + Math.floor(r() * 16);
    const [bg, fg] = colors[i++ % colors.length];
    px.rect(x, y, w - 1, 8, bg);
    px.rect(x, y, w - 1, 1, mix(bg, 0xffffff, 0.3));
    px.rect(x, y + 7, w - 1, 1, mix(bg, 0x000000, 0.4));
    px.rect(x + w - 1, y, 1, 8, 0x1a1a1a);
    // Blocksatz statt Schrift: liest sich aus der Ferne wie Werbung.
    let lx = x + 4;
    while (lx < x + w - 7) {
      const lw = 2 + Math.floor(r() * 4);
      px.rect(lx, y + 2, lw, 1, fg);
      px.rect(lx, y + 3, lw, 2, fg);
      lx += lw + 1 + (r() < 0.3 ? 2 : 0);
    }
    x += w;
  }
}
function drawRailFans(px, L, r) {
  // Ein paar Zuschauer am Geländer links und rechts der Tribüne, ein Hund.
  const ch = clubhouse(L);
  const st = stand(L) ?? { x: ch.x + ch.w + 24, w: 0 };
  const spots = [];
  for (let x = ch.x + ch.w + 20; x < st.x - 6; x += 6 + Math.floor(r() * 9)) spots.push(x);
  for (let x = st.x + st.w + 6; x < L.W - 4; x += 7 + Math.floor(r() * 12)) spots.push(x);
  for (const x of spots) if (r() < 0.6) fan(px, x, L.BOARD - 9, r, 8);
  const dx = Math.round(L.cx + 0.37 * L.W);
  const DOG = ['......bb', '.....bbb', 'bbbbbbb.', 'bbbbbbb.', 'b.b..b.b'];
  DOG.forEach((row, yy) => [...row].forEach((c, xx) => c === 'b' && px.set(dx + xx, L.BOARD - 5 + yy, yy === 2 && xx < 3 ? 0x5a3e24 : 0x7a5630)));
}

// --- Platz -------------------------------------------------------------------------------------------------------------------
function drawPitch(px, L) {
  const r = rng(3);
  // Rasen hinter der Torlinie (bis zur Bande) und davor: Mähstreifen alle 5 m quer zum Blick, nach vorn breiter.
  for (let y = L.BOARD + 8; y < L.H; y++) {
    const v = y >= L.GL ? L.vAtY(y) : -1;
    const stripe = v < 0 ? 0 : Math.floor(v / 5.5) & 1;
    const haze = Math.max(0, 1 - (y - L.BOARD) / (L.H - L.BOARD)) * 0.22;
    for (let x = 0; x < L.W; x++) {
      let c = stripe ? 0x5c9d40 : 0x4f8d36;
      c = mix(c, 0xa3bf78, haze);
      // Grashalme: kleine, feste Muster statt Rauschen.
      const n = (x * 73856093) ^ (y * 19349663);
      const k = ((n >>> 7) & 63) / 63;
      if (k < 0.07) c = mix(c, 0x356b27, 0.55);
      else if (k > 0.95) c = mix(c, 0xa8dc78, 0.35);
      px.set(x, y, c);
    }
  }
  // Morgensonne: Schatten der Bande als dunkler Streifen.
  for (let x = 0; x < L.W; x++) for (let y = L.BOARD + 8; y < L.BOARD + 10; y++) px.set(x, y, mix(px.get(x, y), 0x1d3a18, 0.35));
  // Abgespielter Torraum: brauner Sand vor dem Tor (in Weltkoordinaten gestreut).
  for (let i = 0; i < 1800; i++) {
    const u = (r() - 0.5) * 7 * (1 + r());
    const v = r() ** 1.6 * 7;
    if (Math.abs(u) > 6 * (1 - v / 9) + 1) continue;
    const p = L.P(u, v);
    px.set(p.x, p.y, r() < 0.5 ? 0x8f7550 : 0x76603e);
  }
  // Kreidelinien – alle aus dem gleichen Blickpunkt projiziert.
  const chalk = 0xf2efe6;
  const seg = (u0, v0, u1, v1) => {
    const n = 400;
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const v = v0 + ((v1 - v0) * i) / n;
      const p = L.P(u, v);
      if (p.y < L.GL - 0.5 || p.y >= L.H) continue;
      const w = Math.max(1, Math.round(p.s * 0.9));
      px.rect(Math.round(p.x - (w - 1) / 2), Math.round(p.y), w, 1, chalk);
    }
  };
  for (let x = 0; x < L.W; x++) px.set(x, L.GL, chalk); // Torlinie
  seg(-9.16, 0, -9.16, 5.5);
  seg(9.16, 0, 9.16, 5.5);
  seg(-9.16, 5.5, 9.16, 5.5);
  seg(-20.16, 0, -20.16, 16.5);
  seg(20.16, 0, 20.16, 16.5);
  seg(-20.16, 16.5, 20.16, 16.5);
  seg(-34, 0, -34, 30); // Seitenlinie links
  // Elfmeterpunkt und Teilkreis.
  const spot = L.P(0, 11);
  px.rect(spot.x - 1, spot.y, 3, 1, chalk);
  for (let a = 0; a <= 1; a += 0.002) {
    const ang = Math.PI * (0.205 + a * 0.59);
    const u = Math.cos(ang) * 9.15;
    const v = 11 + Math.sin(ang) * 9.15;
    if (v < 16.5) continue;
    const p = L.P(u, v);
    px.rect(p.x, p.y, Math.max(1, Math.round(p.s * 0.9)), 1, chalk);
  }
  // Eckfahne links (wenn im Bild).
  const corner = L.P(-34, 0);
  if (corner.x > 2) {
    px.rect(corner.x, corner.y - 13, 1, 13, 0xe8e2d0);
    px.rect(corner.x + 1, corner.y - 13, 5, 4, 0xe0b020);
    px.rect(corner.x + 1, corner.y - 11, 5, 1, 0xc8352f);
  }
}
function drawGoal(px, L) {
  // Tor 7,32 × 2,44 m, Netz 2 m tief nach hinten oben; Pfosten weiß mit Schattenkante.
  const ppm = L.ppm;
  const l = L.P(-3.66, 0);
  const rgt = L.P(3.66, 0);
  const hgt = Math.round(2.44 * ppm);
  const back = Math.round(1.6 * ppm * 0.5);
  const top = l.y - hgt;
  // Netz (hinten etwas höher, weil von oben gesehen): Maschen als Raster.
  for (let y = top - back + 2; y < l.y; y++)
    for (let x = Math.round(l.x) - 1; x <= Math.round(rgt.x) + 1; x++) {
      const inBack = y < top + 2;
      if ((x + y) % 3 === 0 || (x - y + 999) % 3 === 0) px.blend(x, y, 0xeeeeea, inBack ? 0.55 : 0.4);
    }
  for (let x = Math.round(l.x); x <= Math.round(rgt.x); x++) px.set(x, top - back + 2, 0xd6d6d0);
  // Seitennetze schräg nach hinten.
  for (let i = 0; i < back; i++) {
    px.set(Math.round(l.x) - 1 + 0, top - i, 0xd6d6d0);
    px.set(Math.round(rgt.x) + 1, top - i, 0xd6d6d0);
  }
  // Pfosten und Latte.
  px.rect(l.x - 1, top, 3, hgt + 1, 0xfafaf6);
  px.rect(rgt.x - 1, top, 3, hgt + 1, 0xfafaf6);
  px.rect(l.x - 1, top, rgt.x - l.x + 3, 3, 0xfafaf6);
  px.rect(l.x + 1, top + 3, 1, hgt - 2, 0xc8c8c0);
  px.rect(rgt.x + 1, top + 3, 1, hgt - 2, 0xc8c8c0);
  px.rect(l.x + 2, top + 3, rgt.x - l.x - 1, 1, 0xc8c8c0);
  // Schatten des Tors auf dem Rasen (Sonne von vorn links).
  for (let x = Math.round(l.x); x <= Math.round(rgt.x) + 3; x++) px.blend(x, l.y + 1, 0x1d3a18, 0.35);
}

// --- Vordergrund ---------------------------------------------------------------------------------------------------------------
function ball(px, x, y, big) {
  x = Math.round(x);
  y = Math.round(y);
  const s = big ? 6 : 4;
  for (let i = -1; i < s + 2; i++) px.blend(x + i, y + s - 1, 0x1d3a18, 0.4);
  if (big) {
    px.rect(x + 1, y, 4, 6, 0xf8f8f4);
    px.rect(x, y + 1, 6, 4, 0xf8f8f4);
    px.rect(x + 2, y + 2, 2, 2, 0x1a1a1a);
    px.set(x, y + 1, 0x1a1a1a);
    px.set(x + 5, y + 4, 0x1a1a1a);
    px.set(x + 4, y, 0x1a1a1a);
    px.rect(x + 1, y + 5, 4, 1, 0xc4c4bc);
    px.set(x + 1, y + 1, 0xffffff);
  } else {
    px.rect(x + 1, y, 2, 4, 0xf8f8f4);
    px.rect(x, y + 1, 4, 2, 0xf8f8f4);
    px.set(x + 1, y + 1, 0x1a1a1a);
    px.rect(x + 1, y + 3, 2, 1, 0xc4c4bc);
  }
}
function cone(px, x, y, big) {
  x = Math.round(x);
  y = Math.round(y);
  const h = big ? 7 : 5;
  for (let i = 0; i < h; i++) {
    const w = 1 + Math.round((i / (h - 1)) * (big ? 5 : 3));
    px.rect(x - (w >> 1), y + i, w, 1, i === h - 3 ? 0xf2efe6 : i > h * 0.5 ? 0xd8621f : 0xee7a30);
  }
  px.rect(x - (big ? 4 : 3), y + h, big ? 9 : 7, 1, 0x2a4a20);
}
function drawProps(px, L) {
  // Ballnetz: ein Haufen Bälle im Netz, Kordel, daneben ein paar lose Bälle.
  // Am unteren Bildrand verankert (auf flachen Fenstern sonst abgeschnitten, im Hochformat sonst viel leerer Rasen).
  const bag = L.P(L.portrait ? -2.2 : -9, Math.min(26, L.vAtY(L.H - (L.portrait ? 64 : 34))));
  const bx = Math.round(bag.x);
  const by = Math.round(bag.y);
  const balls = [[0, 10], [6, 11], [12, 10], [18, 11], [3, 5], [9, 5], [15, 6], [6, 0], [12, 1]];
  for (let i = -3; i < 28; i++) px.blend(bx + i, by + 17, 0x1d3a18, 0.45);
  for (const [dx, dy] of balls) ball(px, bx + dx, by + dy, true);
  for (let y = by - 1; y < by + 17; y++)
    for (let x = bx - 1; x < bx + 25; x++) {
      const inside = balls.some(([dx, dy]) => x >= bx + dx - 1 && x <= bx + dx + 6 && y >= by + dy - 1 && y <= by + dy + 6);
      if (inside && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0)) px.blend(x, y, 0x1e1e1e, 0.6);
    }
  px.rect(bx + 9, by - 3, 4, 3, 0x2a2a2a);
  px.rect(bx + 13, by - 3, 6, 1, 0xe0b020);
  px.rect(bx + 18, by - 2, 1, 3, 0xe0b020);
  // Lose Bälle und eine Hütchenreihe (Slalom).
  for (const [u, v] of [[-3, 9], [2.5, 17], [-14, 23]]) {
    const p = L.P(u, v);
    if (p.y < L.H - 6) ball(px, p.x, p.y, p.s > 1.6);
  }
  for (let i = 0; i < 6; i++) {
    const p = L.P(5 + i * 1.6, 8 + i * 2.6);
    if (p.y < L.H - 8 && p.x < L.W - 3) cone(px, p.x, p.y, p.s > 1.5);
  }
  // Kasten Bier und Sporttasche vorne links – für danach.
  const kx = 6;
  const ky = L.H - 24;
  px.rect(kx, ky, 26, 13, 0xc8962a);
  px.rect(kx, ky, 26, 1, 0xe2b448);
  px.rect(kx, ky + 5, 26, 2, 0x9a7020);
  px.rect(kx + 25, ky, 1, 13, 0x8a601a);
  for (let i = 0; i < 5; i++) {
    px.rect(kx + 2 + i * 5, ky - 5, 3, 5, 0x4a3414);
    px.rect(kx + 3 + i * 5, ky - 7, 1, 2, 0x4a3414);
    px.rect(kx + 3 + i * 5, ky - 8, 1, 1, 0xd8c070);
    px.set(kx + 2 + i * 5, ky - 4, 0x7a5a2a);
  }
  for (let i = -2; i < 30; i++) px.blend(kx + i, ky + 13, 0x1d3a18, 0.45);
  const tx = kx + 34;
  const ty = L.H - 20;
  px.rect(tx, ty, 30, 10, 0x1d2b44);
  px.rect(tx, ty, 30, 1, 0x34466a);
  px.rect(tx, ty + 4, 30, 1, 0xf2efe6);
  px.rect(tx + 8, ty - 4, 14, 1, 0x10182a);
  px.rect(tx + 8, ty - 4, 1, 4, 0x10182a);
  px.rect(tx + 21, ty - 4, 1, 4, 0x10182a);
  px.rect(tx + 3, ty + 6, 6, 2, 0xe0b020);
  for (let i = -2; i < 33; i++) px.blend(tx + i, ty + 10, 0x1d3a18, 0.45);
  // Trinkflaschen.
  for (let i = 0; i < 3; i++) {
    px.rect(tx + 36 + i * 4, ty + 1, 2, 8, i === 1 ? 0x2f6fb5 : 0xd8322a);
    px.set(tx + 36 + i * 4, ty, 0xf2efe6);
  }
}

// --- Bewegtes ------------------------------------------------------------------------------------------------------------------
function drawFlag(ctx, L, t) {
  const f = flagPos(L);
  for (let c = 0; c < 18; c++) {
    const wave = Math.round(Math.sin(t * 4 - c * 0.55) * 1.6 * (c / 18));
    for (let y = 0; y < 11; y++) {
      const band = y < 3 || y > 7 ? '#245e36' : '#f2efe6';
      ctx.fillStyle = c > 7 && c < 12 && y > 3 && y < 7 ? '#e0b020' : band;
      if (Math.sin(t * 4 - c * 0.55) > 0.6 && y === 0) ctx.fillStyle = '#2f7444';
      ctx.fillRect(f.x + 1 + c, f.top + y + wave, 1, 1);
    }
  }
}
function drawSmoke(ctx, L, t) {
  const c = clubhouse(L);
  const x0 = c.x + c.w + 7;
  for (let i = 0; i < 6; i++) {
    const age = (t * 0.6 + i / 6) % 1;
    const x = Math.round(x0 + Math.sin(t * 1.3 + i) * 1.5 + age * 9);
    const y = Math.round(L.BOARD - 8 - age * 22);
    ctx.fillStyle = age < 0.5 ? 'rgba(230,226,220,0.55)' : 'rgba(230,226,220,0.3)';
    ctx.fillRect(x, y, age > 0.4 ? 2 : 1, age > 0.4 ? 2 : 1);
  }
}
function drawBirds(ctx, L, t) {
  ctx.fillStyle = '#2a3440';
  for (let i = 0; i < 4; i++) {
    const x = Math.round(((t * (9 + i) + i * 97) % (L.W + 60)) - 30);
    const y = Math.round(L.H * 0.3 + i * 5 + Math.sin(t * 0.8 + i) * 3);
    const up = Math.sin(t * 9 + i * 2) > 0;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x - 1, y + (up ? -1 : 0), 1, 1);
    ctx.fillRect(x + 1, y + (up ? -1 : 0), 1, 1);
    ctx.fillRect(x - 2, y + (up ? -1 : 1), 1, 1);
    ctx.fillRect(x + 2, y + (up ? -1 : 1), 1, 1);
  }
}
// Platzwart: geht mit dem Kreidewagen langsam an der Strafraumlinie entlang (und zurück).
function drawGroundsman(ctx, L, t) {
  const phase = (t / 28) % 2;
  const dir = phase < 1 ? 1 : -1;
  const f = phase < 1 ? phase : 2 - phase;
  const u = -18 + f * 36;
  const p = L.P(u, 16.5);
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const step = Math.floor(t * 4) % 2;
  const fill = (c, dx, dy, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx * dir - (dir < 0 ? w - 1 : 0), y + dy, w, h);
  };
  // Kreidewagen vor ihm.
  fill('#c8352f', 4, -4, 5, 3);
  fill('#2a2a2a', 4, -1, 1, 1);
  fill('#2a2a2a', 8, -1, 1, 1);
  fill('#6a6a6a', 2, -5, 3, 1);
  // Er: Kappe, Gesicht, grüne Jacke, Hose, Schritt.
  fill('#245e36', 0, -13, 3, 1);
  fill('#e6b894', 0, -12, 3, 2);
  fill('#3d6b45', -1, -10, 4, 5);
  fill('#e6b894', 2, -7, 1, 1);
  fill('#2a2e38', step ? -1 : 0, -5, 1, 4);
  fill('#2a2e38', step ? 2 : 1, -5, 1, 4);
  fill('#1a1a1a', -1, -1, 4, 1);
  ctx.fillStyle = 'rgba(29,58,24,0.4)';
  ctx.fillRect(x - 3, y, 8, 1);
}

export class TitleScreen {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <canvas></canvas>
      <div class="title-logo">
        ${crestSVG(96)}
        <h1>Sunday League</h1>
        <p class="sub"></p>
        <p class="title-press"></p>
      </div>
      <p class="title-hint">${tr('Du bist der Trainer · <kbd>O</kbd> Einstellungen · Spielstand bleibt in diesem Browser', 'You are the manager · <kbd>O</kbd> settings · your save stays in this browser')}</p>
      <p class="title-foot">© Sunday League · ${tr('Alle Rechte vorbehalten', 'All rights reserved')}</p>`;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = null;
  }

  // Bildgröße: ganzzahliger Faktor k (mindestens 2), so dass die Szene ≈ 180–260 Bildpixel hoch (quer) bzw. ≈ 170–200 breit (hoch) ist.
  fit() {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const portrait = vh > vw * 1.2;
    const k = Math.max(2, portrait ? Math.floor(vw / 170) : Math.round(vh / 230));
    const W = Math.ceil(vw / k);
    const H = Math.ceil(vh / k);
    const key = `${W}x${H}x${k}`;
    if (key === this.size) return;
    this.size = key;
    this.canvas.width = W;
    this.canvas.height = H;
    Object.assign(this.canvas.style, { width: `${W * k}px`, height: `${H * k}px` });
    this.ctx.imageSmoothingEnabled = false;
    this.L = layout(W, H);
    this.build();
  }

  build() {
    const L = this.L;
    const sky = new Pix(L.W, L.H);
    drawSky(sky, L);
    this.sky = sky.canvas();
    this.clouds = [0, 1, 2, 3, 4, 5].map((i) => ({ img: makeCloud(11 + i * 7, 6 + (i % 3) * 2), y: Math.round(L.H * (0.06 + ((i * 0.37) % 1) * 0.3)), speed: 1.2 + (i % 3) * 0.7, off: i * 91 }));
    const g = new Pix(L.W, L.H);
    const r = rng(9);
    drawHills(g, L);
    drawForest(g, L);
    drawVillage(g, L);
    drawMasts(g, L);
    drawStand(g, L, r);
    drawClubhouse(g, L);
    drawFlagpole(g, L);
    drawRailFans(g, L, r);
    drawBoards(g, L);
    drawPitch(g, L);
    drawGoal(g, L);
    drawProps(g, L);
    this.ground = g.canvas();
  }

  show(onDone) {
    this.root.querySelector('.sub').textContent = tr('Kreisklasse-Fußball mit Vollamateuren', 'Grassroots football with real amateurs');
    this.root.querySelector('.title-press').textContent = tr('Beliebige Taste oder Klick', 'Press any key or click');
    this.root.hidden = false;
    this.done = false;
    const start = performance.now();
    const loop = (now) => {
      if (this.done) return;
      this.draw((now - start) / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    const finish = (e) => {
      // Die Taste, die das Bild schließt, soll nicht gleich im Menü landen.
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      if (this.done) return;
      this.done = true;
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', finish, true);
      this.root.removeEventListener('pointerdown', finish);
      this.root.classList.add('leaving');
      setTimeout(() => {
        this.root.hidden = true;
        this.root.classList.remove('leaving');
      }, 350);
      onDone?.();
    };
    // Kurz warten, damit ein noch gedrückter Finger das Bild nicht sofort schließt.
    setTimeout(() => {
      window.addEventListener('keydown', finish, true);
      this.root.addEventListener('pointerdown', finish);
    }, 250);
  }

  draw(t) {
    this.fit();
    const ctx = this.ctx;
    const L = this.L;
    ctx.drawImage(this.sky, 0, 0);
    for (const c of this.clouds) {
      const span = L.W + c.img.width;
      const x = Math.round(((c.off + t * c.speed) % span) - c.img.width);
      ctx.drawImage(c.img, x, c.y);
    }
    drawBirds(ctx, L, t);
    ctx.drawImage(this.ground, 0, 0);
    drawLamps(ctx, L, t);
    drawFlag(ctx, L, t);
    drawSmoke(ctx, L, t);
    drawGroundsman(ctx, L, t);
  }
}
