import * as THREE from 'three';
import { pixelTexture, toon } from '../materials.js';
import { paintKit, paintSleeve, REGION, sleeveColor } from '../kitPaint.js';

// --- Team-Atlas -------------------------------------------------------------------
// Je Spieler eine Kachel 128 × 16: Trikot (64 × 16: vorn | hinten | links | rechts,
// siehe kitPaint.js), acht Gesichter à 8 × 8 (sieben oben, das achte darunter) und drei Hilfspixel (weiß, Beinfarbe mit
// Dreck, Pflaster). Mehrere Kacheln untereinander ergeben den Atlas eines Teams.
export const TILE_W = 128;
export const TILE_H = 16;
export const FACE_X = 64;
export const FACE = 8;
export const UTIL_X = 120; // weiß | Bein (Dreck) | Pflaster
export const FACES = ['neutral', 'happy', 'angry', 'pain', 'sad', 'effort', 'surprised', 'exhausted'];
// Zelle eines Gesichts in der Kachel (x, y): die ersten sieben oben, der Rest eine Reihe tiefer.
export const faceCell = (fi) => [FACE_X + (fi % 7) * FACE, Math.floor(fi / 7) * FACE];
// Pixelgesichter 8 × 8 aus wenigen Bausteinen je Spieler (fest aus dem Aussehen): Augen,
// Brauen, Nase, Mund, Bart – kombiniert mit dem Ausdruck. Bei ~30 px/m ist ein Gesicht etwa
// 8 Pixel breit, jedes Feld also ungefähr ein Bildschirmpixel. Zeilen: 1–2 Brauen, 3 Augen,
// 4 Nase, 5–6 Mund, 5–7 Kinn/Bart. Codes: e Auge, k Schlitzauge, b Braue, n Nase, m Mund,
// o offener Mund, t Zähne, s Stoppeln, h Bart (Haarfarbe).
export const FACE_PARTS = { eyes: ['dot', 'tall', 'narrow'], brows: ['thin', 'thick', 'mono', 'light'], nose: ['none', 'dot', 'long'], mouth: ['small', 'wide', 'thin'], beard: ['none', 'stubble', 'short', 'full', 'moustache', 'goatee', 'sideburns', 'handlebar'] };
export function faceArt(expr, f) {
  const g = Array.from({ length: 8 }, () => Array(8).fill('.'));
  const put = (x, y, c) => {
    if (x >= 0 && x < 8 && y >= 0 && y < 8) g[y][x] = c;
  };
  // Bart zuerst – Mund und Nase liegen darüber.
  if (f.beard === 'stubble') for (const [x, y] of [[1, 5], [6, 5], [2, 6], [5, 6], [1, 6], [6, 6], [3, 7], [4, 7], [2, 7], [5, 7]]) put(x, y, (x + y) % 2 ? 's' : '.');
  if (f.beard === 'short') {
    for (let x = 1; x < 7; x++) put(x, 7, 'h');
    for (const x of [1, 6]) put(x, 6, 'h');
  }
  if (f.beard === 'full') {
    for (let x = 0; x < 8; x++) put(x, 7, 'h');
    for (let x = 1; x < 7; x++) put(x, 6, 'h');
    for (const x of [0, 1, 6, 7]) put(x, 5, 'h');
    for (const x of [0, 7]) put(x, 4, 'h');
  }
  if (f.beard === 'moustache') for (let x = 2; x < 6; x++) put(x, 4, 'h');
  if (f.beard === 'goatee') {
    // Ziegenbart: nur am Kinn, mit schmalem Streifen unter dem Mund.
    for (let x = 2; x < 6; x++) put(x, 7, 'h');
    for (const x of [3, 4]) put(x, 6, 'h');
  }
  if (f.beard === 'sideburns') for (const x of [0, 7]) for (let y = 2; y < 6; y++) put(x, y, 'h'); // Koteletten bis zum Mundwinkel
  if (f.beard === 'handlebar') {
    // Schnauzer breit: über die ganze Oberlippe, Enden hängen herab.
    for (let x = 1; x < 7; x++) put(x, 4, 'h');
    for (const x of [1, 6]) put(x, 5, 'h');
  }
  // Nase: ein Pixel dunklere Haut (lang: zwei).
  if (f.nose !== 'none' && f.beard !== 'moustache' && f.beard !== 'handlebar') put(4, 4, 'n');
  if (f.nose === 'long') put(4, 3, 'n');
  // Augen je Ausdruck; Grundform aus dem Baustein.
  const eye = (x) => {
    if (expr === 'exhausted') return put(x, 3, 'k'), put(x, 4, 'n'); // halb zu, Ringe darunter
    if (expr === 'pain') return put(x, 3, 'k'), put(x + (x < 4 ? -1 : 1), 3, 'k');
    if (expr === 'surprised' || f.eyes === 'tall') return put(x, 3, 'e'), put(x, 2, expr === 'surprised' ? 'e' : g[2][x]);
    if (f.eyes === 'narrow') return put(x, 3, 'e'), put(x + (x < 4 ? -1 : 1), 3, 'k');
    put(x, 3, 'e');
  };
  eye(2);
  eye(5);
  // Brauen: Form je Ausdruck, Dicke aus dem Baustein.
  const thick = f.brows === 'thick' || f.brows === 'mono';
  const brow = (pts) => {
    if (f.brows === 'light' && expr === 'neutral') return;
    for (const [x, y] of pts) put(x, y, 'b');
  };
  if (expr === 'angry') brow([[1, 1], [2, 2], [3, 2], [6, 1], [5, 2], [4, 2], [1, 2], [6, 2]]);
  else if (expr === 'exhausted') brow([[1, 1], [2, 2], [6, 1], [5, 2]]);
  else if (expr === 'sad' || expr === 'pain') brow([[1, 2], [2, 1], [6, 2], [5, 1]]);
  else if (expr === 'surprised') brow([[1, 0], [2, 0], [5, 0], [6, 0]]);
  else if (expr === 'effort') brow([[1, 2], [2, 2], [5, 2], [6, 2], ...(thick ? [[3, 2], [4, 2]] : [])]);
  else if (f.brows === 'mono') brow([[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]]);
  else brow(thick ? [[1, 1], [2, 1], [5, 1], [6, 1]] : [[2, 1], [5, 1]]);
  // Mund je Ausdruck; neutrale Form aus dem Baustein.
  const w = f.mouth === 'wide' ? [2, 5] : [3, 4];
  if (expr === 'happy') {
    // Jubel: weit offener Mund mit Zähnen oben, Mundwinkel hoch.
    for (const x of [1, 6]) put(x, 4, 'm');
    for (let x = 2; x <= 5; x++) put(x, 5, 't');
    for (let x = 2; x <= 5; x++) put(x, 6, 'o');
  } else if (expr === 'exhausted') {
    // Hechelnd: Mund offen, Unterkiefer hängt.
    for (let x = 2; x <= 5; x++) put(x, 5, 'o');
    for (let x = 3; x <= 4; x++) put(x, 6, 'o');
  } else if (expr === 'angry') {
    // Zähne zusammengebissen, Mundwinkel nach unten.
    for (let x = 2; x <= 5; x++) put(x, 5, 't');
    for (const x of [1, 6]) put(x, 5, 'o');
    for (const x of [2, 5]) put(x, 6, 'o');
  }
  else if (expr === 'pain') {
    for (let x = 2; x <= 5; x++) put(x, 5, 'o');
    put(2, 6, 'm');
    put(5, 6, 'm');
  } else if (expr === 'sad') {
    for (let x = 3; x <= 4; x++) put(x, 5, 'm');
    put(2, 6, 'm');
    put(5, 6, 'm');
  } else if (expr === 'surprised') for (const [x, y] of [[3, 5], [4, 5], [3, 6], [4, 6]]) put(x, y, 'o');
  else if (expr === 'effort') for (let x = 2; x <= 5; x++) put(x, 5, f.mouth === 'thin' ? 'm' : 'o');
  else for (let x = w[0]; x <= w[1]; x++) put(x, 5, f.mouth === 'thin' ? 'n' : 'm');
  return g.map((row) => row.join(''));
}
// Bausteine je Spieler, fest aus dem Aussehen (Hash) – nie zufällig pro Bild.
export function faceFeatures(hash, look) {
  const pick = (arr, shift) => arr[(hash >>> shift) % arr.length];
  let beard = 'none';
  if (look.beard) beard = ['full', 'short', 'moustache', 'full', 'short'][(hash >>> 19) % 5];
  else if ((hash >>> 19) % 5 === 0) beard = 'stubble';
  // Neue Bärte nur aus eigenem Würfel (Salz), damit alle übrigen Spieler wie bisher aussehen:
  // 30 % der Bartträger (≈ 9 % aller) bekommen Ziegenbart oder breiten Schnauzer, 6 % der
  // Glattrasierten Koteletten (≈ 3 %).
  if (look.beard && roll(hash, 11, 100) < 30) beard = ['goatee', 'handlebar'][roll(hash, 12, 2)];
  else if (beard === 'none' && roll(hash, 13, 100) < 6) beard = 'sideburns';
  if (look.beardStyle) beard = look.beardStyle; // feste Figuren (Tim „Der Tiger“): Bartform vorgegeben
  const light = luminance(look.hair ?? 0) > 0.45;
  return { eyes: pick(FACE_PARTS.eyes, 21), brows: light && !look.bald ? 'light' : pick(['thin', 'thick', 'thin', 'mono', 'thick'], 23), nose: pick(FACE_PARTS.nose, 25), mouth: pick(FACE_PARTS.mouth, 27), beard };
}
// Rückennummer: Ziffern 3 × 5, doppelt groß gemalt (6 × 10 Texel) – so bleibt sie bei
// kleiner Figur als Nummer erkennbar.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
// Kantenkennung für den Post-Shader (Alphakanal): Heim, Gast, neutral (Schiri).
export const EDGE_CODE = { home: 0.25, away: 0.5, neutral: 0.7 };

export const css = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
export const luminance = (hex) => (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;
// Grünlich/gelblich (Rasenfarben): Signalgelb würde darin verschwinden.
export const greenish = (c) => ((c >> 8) & 255) > ((c >> 16) & 255) * 0.9 && ((c >> 8) & 255) > (c & 255) * 1.2 && luminance(c) > 0.3;
export const mixHex = (a, b, t) => {
  const c = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const x = c(a);
  const y = c(b);
  return x.reduce((acc, v, i) => (acc << 8) | Math.round(v + (y[i] - v) * t), 0);
};

export class KitAtlas {
  // capacity: wie viele Spieler (Kacheln); edge: Kantenkennung (siehe EDGE_CODE).
  constructor(kit, { sponsor = null, sleeve = null, capacity = 1, edge = null } = {}) {
    this.kit = kit;
    this.sponsor = sponsor;
    this.sleeve = sleeve; // Ärmelsponsor (nur der eigene Verein)
    this.capacity = capacity;
    this.used = 0;
    this.refs = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = TILE_W;
    this.canvas.height = TILE_H * capacity;
    this.ctx = this.canvas.getContext('2d');
    this.texture = pixelTexture(this.canvas);
    this.material = toon(0xffffff, { map: this.texture });
    this.material.vertexColors = true;
    if (edge) {
      // Ohne Mischen schreibt das Material seine Deckkraft in den Alphakanal – der
      // Post-Shader erkennt daran Figuren (stärkere Außenkante in Teamfarbe).
      this.material.blending = THREE.NoBlending;
      this.material.opacity = EDGE_CODE[edge];
    }
  }

  allocate() {
    if (this.used >= this.capacity) throw new Error('KitAtlas voll');
    this.refs++;
    return this.used++;
  }

  release() {
    if (--this.refs > 0) return;
    this.texture.dispose();
    this.material.dispose();
  }

  // Texel-Mitte → UV (Canvas oben = v 1).
  uv(tile, x, y) {
    return [(x + 0.5) / TILE_W, 1 - (tile * TILE_H + y + 0.5) / this.canvas.height];
  }
}

// Kachel eines Spielers malen: Trikot (mit Dreck), Nummer, Gesichter, Hilfspixel.
export function paintTile(t) {
  const { atlas, tile } = t;
  const ctx = atlas.ctx;
  const y0 = tile * TILE_H;
  ctx.save();
  ctx.translate(0, y0);
  paintKit(ctx, atlas.kit, { sponsor: atlas.sponsor, dirt: t.dirt, splats: t.splats, dirtColor: t.dirtColor, wet: t.wet });
  if (atlas.sleeve) paintSleeve(ctx, atlas.sleeve, sleeveColor(atlas.kit));
  if (t.number != null) {
    // Erst ein Pixel Rand in Gegenfarbe, dann die Ziffern – lesbar auch auf Ringeln.
    const digits = String(t.number).slice(0, 2).split('').map(Number);
    const w = digits.length * 6 + (digits.length - 1) * 2;
    const x0 = REGION.back + Math.round((16 - w) / 2);
    for (const [color, grow] of [[luminance(t.accent) > 0.5 ? 0x1c1c1c : 0xf4f1e8, 1], [t.accent, 0]]) {
      ctx.fillStyle = css(color);
      let x = x0;
      for (const dg of digits) {
        const bits = DIGITS[dg];
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (bits[r * 3 + c] === '1') ctx.fillRect(x + c * 2 - grow, 3 + r * 2 - grow, 2 + grow * 2, 2 + grow * 2);
        x += 8;
      }
    }
  }
  const pal = { e: 0x1a1716, k: mixHex(t.skin, 0x1a1716, 0.55), b: t.brow, n: mixHex(t.skin, 0x000000, 0.22), m: t.mouth, o: mixHex(t.skin, 0x2a0e0a, 0.8), t: 0xf2eee2, s: mixHex(t.skin, t.hairColor, 0.4), h: t.hairColor };
  // Gleichfarbige Läufe einer Zeile als ein Rechteck – pixelgleich, aber weit weniger Canvas-Aufrufe.
  const fill = {};
  const style = (ch) => (fill[ch] ??= css(pal[ch] ?? t.skin));
  FACES.forEach((id, fi) => {
    const art = t.faceArt[id];
    const [fx, fy] = faceCell(fi);
    for (let y = 0; y < FACE; y++) {
      const row = art[y];
      for (let x = 0; x < FACE; ) {
        const ch = row[x];
        let end = x + 1;
        while (end < FACE && row[end] === ch) end++;
        ctx.fillStyle = style(ch);
        ctx.fillRect(fx + x, fy + y, end - x, 1);
        x = end;
      }
    }
  });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(UTIL_X, 0, 1, 1);
  ctx.fillStyle = css(mixHex(0xffffff, t.dirtColor, Math.min(0.45, t.dirt * 0.5)));
  ctx.fillRect(UTIL_X + 1, 0, 1, 1);
  // Pflaster: unsichtbar (Hautfarbe) oder weiß.
  ctx.fillStyle = css(t.plaster ? 0xf4efe4 : t.skin);
  ctx.fillRect(UTIL_X + 2, 0, 1, 1);
  ctx.restore();
  atlas.texture.needsUpdate = true;
}

// --- Aussehen-Hash ----------------------------------------------------------------
// Aussehen, das nicht im Spielstand steht (Frisur, Bartform, Körperbau), leitet sich
// deterministisch aus dem Rest ab – der Spielerpool bleibt unverändert.
// Eigener Würfel je Merkmal: gleicher Hash + Salz → fester Wert, unabhängig von den alten Bits.
export function roll(hash, salt, n) {
  let x = Math.imul(hash ^ Math.imul(salt, 0x9e3779b9), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) % n;
}
export function lookHash(look) {
  let h = (look.skin ?? 0) ^ ((look.hair ?? 0) << 3) ^ Math.round((look.height ?? 1) * 1000) * 2654435761;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}
