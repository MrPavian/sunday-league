import * as THREE from 'three';
import { pixelTexture, toon, vertexToon } from './materials.js';
import { makeSplats, paintKit, REGION } from './kitPaint.js';

// Spieler 2.0: eine Low-Poly-Figur aus wenigen, leicht verjüngten Körperteilen –
// Hüfte, Torso, Kopf, zweiteilige Arme und Beine mit Knie und Ellbogen, Schuhe mit
// Ferse und Spitze. Alles steckt in EINEM SkinnedMesh mit 14 Knochen und starren
// Gewichten (jede Ecke gehört genau einem Knochen – kein Verformen, Pixel-Look bleibt).
// Farben kommen aus den Ecken, Trikot, Rückennummer und Gesicht aus einem kleinen
// Team-Atlas: Spieler eines Teams teilen sich Textur und Material (1 Draw Call je
// Spieler statt vorher etwa sieben), Dreck bleibt trotzdem pro Spieler.

export const BONES = ['root', 'hips', 'spine', 'head', 'upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'upperLegL', 'lowerLegL', 'footL', 'upperLegR', 'lowerLegR', 'footR'];
const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = { hips: 'root', spine: 'hips', head: 'spine', upperArmL: 'spine', lowerArmL: 'upperArmL', upperArmR: 'spine', lowerArmR: 'upperArmR', upperLegL: 'hips', lowerLegL: 'upperLegL', footL: 'lowerLegL', upperLegR: 'hips', lowerLegR: 'upperLegR', footR: 'lowerLegR' };

// --- Team-Atlas -------------------------------------------------------------------
// Je Spieler eine Kachel 128 × 16: Trikot (64 × 16: vorn | hinten | links | rechts,
// siehe kitPaint.js), sechs Gesichter à 8 × 8 und drei Hilfspixel (weiß, Beinfarbe mit
// Dreck, Pflaster). Mehrere Kacheln untereinander ergeben den Atlas eines Teams.
const TILE_W = 128;
const TILE_H = 16;
const FACE_X = 64;
const FACE = 8;
const UTIL_X = 120; // weiß | Bein (Dreck) | Pflaster
export const FACES = ['neutral', 'happy', 'angry', 'pain', 'sad', 'effort', 'surprised'];
// Pixelgesichter 8 × 8 aus wenigen Bausteinen je Spieler (fest aus dem Aussehen): Augen,
// Brauen, Nase, Mund, Bart – kombiniert mit dem Ausdruck. Bei ~30 px/m ist ein Gesicht etwa
// 8 Pixel breit, jedes Feld also ungefähr ein Bildschirmpixel. Zeilen: 1–2 Brauen, 3 Augen,
// 4 Nase, 5–6 Mund, 5–7 Kinn/Bart. Codes: e Auge, k Schlitzauge, b Braue, n Nase, m Mund,
// o offener Mund, s Stoppeln, h Bart (Haarfarbe).
export const FACE_PARTS = { eyes: ['dot', 'tall', 'narrow'], brows: ['thin', 'thick', 'mono', 'light'], nose: ['none', 'dot', 'long'], mouth: ['small', 'wide', 'thin'], beard: ['none', 'stubble', 'short', 'full', 'moustache'] };
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
  // Nase: ein Pixel dunklere Haut (lang: zwei).
  if (f.nose !== 'none' && f.beard !== 'moustache') put(4, 4, 'n');
  if (f.nose === 'long') put(4, 3, 'n');
  // Augen je Ausdruck; Grundform aus dem Baustein.
  const eye = (x) => {
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
  if (expr === 'angry') brow([[1, 1], [2, 2], [6, 1], [5, 2], ...(thick ? [[3, 2], [4, 2]] : [])]);
  else if (expr === 'sad' || expr === 'pain') brow([[1, 2], [2, 1], [6, 2], [5, 1]]);
  else if (expr === 'surprised') brow([[1, 0], [2, 0], [5, 0], [6, 0]]);
  else if (expr === 'effort') brow([[1, 2], [2, 2], [5, 2], [6, 2], ...(thick ? [[3, 2], [4, 2]] : [])]);
  else if (f.brows === 'mono') brow([[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]]);
  else brow(thick ? [[1, 1], [2, 1], [5, 1], [6, 1]] : [[2, 1], [5, 1]]);
  // Mund je Ausdruck; neutrale Form aus dem Baustein.
  const w = f.mouth === 'wide' ? [2, 5] : [3, 4];
  if (expr === 'happy') {
    put(w[0] - (w[0] === 3 ? 1 : 0), 5, 'm');
    put(w[1] + (w[1] === 4 ? 1 : 0), 5, 'm');
    for (let x = 3; x <= 4; x++) put(x, 6, 'm');
  } else if (expr === 'angry') for (let x = 2; x <= 5; x++) put(x, 5, 'o');
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
  const light = luminance(look.hair ?? 0) > 0.45;
  return { eyes: pick(FACE_PARTS.eyes, 21), brows: light && !look.bald ? 'light' : pick(['thin', 'thick', 'thin', 'mono', 'thick'], 23), nose: pick(FACE_PARTS.nose, 25), mouth: pick(FACE_PARTS.mouth, 27), beard };
}
// Rückennummer: Ziffern 3 × 5, doppelt groß gemalt (6 × 10 Texel) – so bleibt sie bei
// kleiner Figur als Nummer erkennbar.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
// Kantenkennung für den Post-Shader (Alphakanal): Heim, Gast, neutral (Schiri).
export const EDGE_CODE = { home: 0.25, away: 0.5, neutral: 0.7 };

const css = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const luminance = (hex) => (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;
const mixHex = (a, b, t) => {
  const c = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const x = c(a);
  const y = c(b);
  return x.reduce((acc, v, i) => (acc << 8) | Math.round(v + (y[i] - v) * t), 0);
};

export class KitAtlas {
  // capacity: wie viele Spieler (Kacheln); edge: Kantenkennung (siehe EDGE_CODE).
  constructor(kit, { sponsor = null, capacity = 1, edge = null } = {}) {
    this.kit = kit;
    this.sponsor = sponsor;
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
function paintTile(t) {
  const { atlas, tile } = t;
  const ctx = atlas.ctx;
  const y0 = tile * TILE_H;
  ctx.save();
  ctx.translate(0, y0);
  paintKit(ctx, atlas.kit, { sponsor: atlas.sponsor, dirt: t.dirt, splats: t.splats, dirtColor: t.dirtColor });
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
  const pal = { e: 0x1a1716, k: mixHex(t.skin, 0x1a1716, 0.55), b: t.brow, n: mixHex(t.skin, 0x000000, 0.22), m: t.mouth, o: mixHex(t.skin, 0x2a0e0a, 0.8), s: mixHex(t.skin, t.hairColor, 0.4), h: t.hairColor };
  FACES.forEach((id, fi) => {
    const art = t.faceArt[id];
    for (let y = 0; y < FACE; y++)
      for (let x = 0; x < FACE; x++) {
        const ch = art[y][x];
        ctx.fillStyle = css(pal[ch] ?? t.skin);
        ctx.fillRect(FACE_X + fi * FACE + x, y, 1, 1);
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

// --- Geometrie --------------------------------------------------------------------
// Aussehen, das nicht im Spielstand steht (Frisur, Bartform, Körperbau), leitet sich
// deterministisch aus dem Rest ab – der Spielerpool bleibt unverändert.
function lookHash(look) {
  let h = (look.skin ?? 0) ^ ((look.hair ?? 0) << 3) ^ Math.round((look.height ?? 1) * 1000) * 2654435761;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}

// Verjüngter Quader: Breite/Tiefe oben und unten getrennt (Low-Poly-Prisma).
// Nicht indiziert, Flächenfolge wie BoxGeometry: +x, -x, +y, -y, +z, -z (je 6 Ecken).
function prism(wTop, wBot, h, dTop, dBot, { front = 0 } = {}) {
  const g = new THREE.BoxGeometry(1, h, 1).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    const x = p.getX(i) * (top ? wTop : wBot);
    let z = p.getZ(i) * (top ? dTop : dBot);
    if (!top && z > 0) z += front; // Bauch: vorne unten mehr
    p.setXYZ(i, x, p.getY(i), z);
  }
  g.computeVertexNormals();
  return g;
}

// Ein Körperteil sammeln: Geometrie (im Knochen-Raum), Farbe, UV-Art.
class Builder {
  constructor() {
    this.parts = [];
  }

  add(bone, geo, color, { at = [0, 0, 0], uv = 'white', rot = null } = {}) {
    if (rot) geo.rotateX(rot);
    geo.translate(...at);
    this.parts.push({ bone, geo, color, uv });
    return this.parts.length - 1;
  }

  box(bone, w, h, d, color, at, opts = {}) {
    return this.add(bone, new THREE.BoxGeometry(w, h, d).toNonIndexed(), color, { ...opts, at });
  }
}

// UVs auf den Trikot-Atlas: jede Seite bekommt ihr Feld (oben/unten die Schulterpartie).
function kitUV(g, atlas, tile) {
  const uv = g.attributes.uv;
  const faces = [[REGION.right, 0, 1], [REGION.left, 0, 1], [REGION.left, 0.75, 1], [REGION.left, 0, 0.25], [REGION.front, 0, 1], [REGION.back, 0, 1]];
  const vTop = 1 - (tile * TILE_H) / atlas.canvas.height;
  const vSpan = TILE_H / atlas.canvas.height;
  for (let i = 0; i < uv.count; i++) {
    const [rx, v0, v1] = faces[Math.floor(i / 6)];
    const u = (rx + 0.02 + uv.getX(i) * 15.96) / TILE_W;
    const v = vTop - vSpan + (v0 + uv.getY(i) * (v1 - v0)) * vSpan;
    uv.setXY(i, u, v);
  }
}

// Kopf-Vorderseite auf ein Gesicht mappen (Ecken 24–29 = +z-Fläche). corners: je Ecke
// 0/1 für links/rechts und unten/oben (aus der Box-UV beim Bau, fest gespeichert).
function faceUV(uv, start, corners, atlas, tile, face) {
  const fi = FACES.indexOf(face);
  const x0 = (FACE_X + fi * FACE) / TILE_W;
  const x1 = (FACE_X + (fi + 1) * FACE) / TILE_W;
  const vTop = 1 - (tile * TILE_H) / atlas.canvas.height;
  const v1 = vTop - FACE / atlas.canvas.height;
  for (let i = 0; i < 6; i++) uv.setXY(start + i, corners[i * 2] ? x1 : x0, corners[i * 2 + 1] ? vTop : v1);
}

// Low-Poly-Fußballer. Bauch, Glatze, Bart und Größe kommen aus dem generierten
// Aussehen; Frisur, Schulterbreite, Beinlänge und Kopfgröße leiten sich daraus ab.
// atlas: gemeinsamer Team-Atlas (sonst bekommt die Figur einen eigenen).
// edge: Kantenkennung für den Post-Shader (nur Spieler und Schiri).
export function createPlayerModel(look, kit, { number = null, keeper = false, sponsor = null, textured = true, atlas = null, edge = null } = {}) {
  const hash = lookHash(look);
  const belly = look.belly ?? 0;
  const vary = (shift, step) => 1 + (((hash >>> shift) % 5) - 2) * step;
  const shoulderK = vary(6, 0.025);
  const legK = vary(9, 0.02);
  const headK = vary(12, 0.025);
  const useAtlas = textured && typeof document !== 'undefined';
  const own = useAtlas && !atlas;
  if (own) atlas = new KitAtlas(kit, { sponsor, capacity: 1, edge });
  const tile = useAtlas ? atlas.allocate() : 0;

  const skin = look.skin;
  const hair = look.hair;
  const shirt = ['seiten', 'schulter'].includes(kit.pattern) && kit.second != null ? kit.second : kit.shirt;
  const accent = luminance(kit.shirt) > 0.55 ? 0x1c1c1c : 0xf4f1e8;
  const glove = 0xeeeeea;
  const shoe = 0x1f1f1f;

  // Maße (Meter, vor dem Größenfaktor): Kopf ~12 % größer als früher, Beine etwas kürzer.
  const thigh = 0.37 * legK;
  const shin = 0.37 * legK;
  const ankle = 0.075;
  const hipY = ankle + shin + thigh;
  const torsoH = 0.5;
  const shoulderX = (0.26 + belly * 0.05) * shoulderK;
  // Kopfform (fest je Spieler): rund, schmal, breit, länglich – nur leicht verschieden.
  const HEADS = [[0.29, 0.29, 0.88], [0.27, 0.31, 0.86], [0.31, 0.28, 0.93], [0.28, 0.32, 0.8]];
  const [hwK, hhK, jaw] = HEADS[(hash >>> 15) % 4];
  const headW = hwK * headK;
  const headH = hhK * headK;
  const rest = {
    hips: [0, hipY, 0],
    spine: [0, 0.09, 0],
    head: [0, torsoH + 0.05, 0],
    upperArmL: [-shoulderX, torsoH - 0.06, 0],
    upperArmR: [shoulderX, torsoH - 0.06, 0],
    lowerArmL: [0, -0.27, 0],
    lowerArmR: [0, -0.27, 0],
    upperLegL: [-0.105, 0, 0],
    upperLegR: [0.105, 0, 0],
    lowerLegL: [0, -thigh, 0],
    lowerLegR: [0, -thigh, 0],
    footL: [0, -shin, 0],
    footR: [0, -shin, 0],
  };

  const b = new Builder();
  // Beine: Hosenbein, Oberschenkel, Knie, Stutzen mit Ring, Schuh mit Ferse und Spitze.
  for (const s of ['L', 'R']) {
    b.add(`upperLeg${s}`, prism(0.19, 0.18, 0.2, 0.21, 0.2), kit.shorts, { at: [0, -0.09, 0], uv: 'leg' });
    b.add(`upperLeg${s}`, prism(0.145, 0.13, thigh - 0.17, 0.16, 0.145), skin, { at: [0, -0.19 - (thigh - 0.17) / 2 + 0.01, 0], uv: 'leg' });
    b.box(`lowerLeg${s}`, 0.135, 0.08, 0.15, skin, [0, -0.025, 0.006], { uv: 'leg' });
    b.add(`lowerLeg${s}`, prism(0.145, 0.12, shin - 0.06, 0.16, 0.13), kit.socks, { at: [0, -0.06 - (shin - 0.06) / 2, 0], uv: 'leg' });
    b.box(`lowerLeg${s}`, 0.15, 0.035, 0.166, accent, [0, -0.1, 0]);
    b.box(`foot${s}`, 0.14, 0.09, 0.15, shoe, [0, -ankle + 0.045, -0.01]);
    b.add(`foot${s}`, prism(0.11, 0.135, 0.06, 0.12, 0.16), shoe, { at: [0, -ankle + 0.03, 0.13] }); // Spitze etwas länger (Profil)
  }
  // Pflaster auf dem rechten Schienbein (Farbe kommt aus dem Atlas).
  b.box('lowerLegR', 0.1, 0.07, 0.02, 0xffffff, [0, -0.16, 0.074], { uv: 'plaster' });

  // Hüfte (Hose) und verjüngter Torso: Schultern breiter als Taille.
  b.add('hips', prism(0.36 + belly * 0.1, 0.38 + belly * 0.08, 0.17, 0.25 + belly * 0.07, 0.24 + belly * 0.05), kit.shorts, { at: [0, 0.02, 0], uv: 'leg' });
  const torsoTop = (0.45 + belly * 0.05) * shoulderK;
  const torsoBot = 0.37 + belly * 0.13;
  // Brust oben etwas tiefer als früher: kräftigeres Seitenprofil.
  b.add('spine', prism(torsoTop, torsoBot, torsoH, 0.285 + belly * 0.04, 0.24 + belly * 0.1, { front: belly * 0.07 }), useAtlas ? 0xffffff : kit.shirt, { at: [0, torsoH / 2, 0.005], uv: 'kit' });
  b.box('spine', 0.18, 0.035, 0.17, accent, [0, torsoH, 0]); // Kragen
  b.box('spine', 0.055, 0.06, 0.02, accent, [-0.1, torsoH - 0.14, 0.13 + belly * 0.02]); // Wappen
  b.box('spine', 0.1, 0.08, 0.1, skin, [0, torsoH + 0.03, 0]); // Hals

  // Arme: Ärmel über der Schulter, Oberarm, Ellbogen, Unterarm, Hand.
  for (const s of ['L', 'R']) {
    const out = s === 'L' ? -0.01 : 0.01;
    b.add(`upperArm${s}`, prism(0.16, 0.14, 0.17, 0.17, 0.15), shirt, { at: [out, -0.06, 0] });
    b.add(`upperArm${s}`, prism(0.115, 0.11, 0.12, 0.12, 0.115), keeper ? shirt : skin, { at: [out, -0.205, 0] });
    b.add(`lowerArm${s}`, prism(0.11, 0.095, 0.2, 0.11, 0.1), keeper ? shirt : skin, { at: [out, -0.1, 0] });
    b.box(`lowerArm${s}`, 0.1, 0.09, 0.115, keeper ? glove : skin, [out, -0.24, 0.005]);
  }

  // Kopf: oben breiter als am Kinn (Kieferform je Spieler), vorne das Pixelgesicht, Ohren
  // seitlich, kleine Nase (gibt dem Seitenprofil eine Kontur).
  b.add('head', prism(headW, headW * jaw, headH, headW, headW * (jaw + 0.02)), skin, { at: [0, headH / 2, 0.005], uv: 'head' });
  for (const s of [-1, 1]) b.box('head', 0.03, 0.07, 0.06, skin, [s * (headW / 2 + 0.01), headH * 0.48, 0]);
  b.box('head', 0.035, 0.045, 0.035, mixHex(skin, 0x000000, 0.08), [0, headH * 0.4, headW / 2 + 0.02]);
  if (!useAtlas) for (const s of [-1, 1]) b.box('head', 0.045, 0.05, 0.02, 0x1a1716, [s * 0.06, headH * 0.55, headW / 2 + 0.005]);

  // Frisuren (fest je Spieler): kurz, Seitenscheitel, stachelig, lang, Locken, Irokese, kurzgeschoren.
  // Silhouette vor Details: unregelmäßiger Haaransatz, Asymmetrie, Spitzen, Volumen.
  // Sehr dunkles Haar wird leicht angehoben, damit es im Schatten keine schwarze Masse wird.
  const hw = headW / 2;
  const top = headH;
  const hairC = luminance(hair) < 0.12 ? mixHex(hair, 0x4a4038, 0.3) : hair;
  const hairD = mixHex(hairC, 0x000000, 0.18); // Seiten und Nacken etwas dunkler
  const styleRoll = (hash >>> 3) % 20;
  const style = styleRoll < 5 ? 'short' : styleRoll < 9 ? 'sidepart' : styleRoll < 12 ? 'spiky' : styleRoll < 15 ? 'long' : styleRoll < 18 ? 'curly' : styleRoll < 19 ? 'mohawk' : 'buzz';
  const cap = (grow, h, y) => b.add('head', prism(headW + grow, headW + grow + 0.005, h, headW + grow, headW + grow + 0.005), hairC, { at: [0, y, 0] });
  const back = (h, y) => b.box('head', headW + 0.015, h, 0.055, hairD, [0, y, -hw]);
  const hairStyle = look.bald ? 'bald' : style;
  if (hairStyle === 'short') {
    cap(0.018, 0.06, top + 0.01);
    back(0.14, top - 0.08);
    for (const s of [-1, 1]) b.box('head', 0.075, 0.04, 0.03, hairC, [s * (hw - 0.045), top - 0.02, hw + 0.004]); // Haaransatz mit Kerbe
  } else if (hairStyle === 'sidepart') {
    cap(0.018, 0.06, top + 0.01);
    back(0.15, top - 0.085);
    b.box('head', headW * 0.62, 0.06, headW + 0.03, hairC, [hw * 0.36, top + 0.05, 0]); // Volumen auf einer Seite
    b.box('head', headW * 0.58, 0.05, 0.04, hairC, [-hw * 0.3, top - 0.025, hw + 0.006]); // Pony zur anderen Seite gekämmt
    b.box('head', 0.035, 0.12, headW * 0.6, hairD, [hw + 0.012, top - 0.06, -0.03]);
  } else if (hairStyle === 'spiky') {
    cap(0.012, 0.045, top + 0.005);
    back(0.12, top - 0.07);
    for (const [x, z, h, t] of [[-0.075, 0.05, 0.1, 0.3], [0.07, 0.04, 0.11, 0.25], [0, -0.02, 0.13, -0.1], [-0.05, -0.08, 0.09, -0.35], [0.06, -0.07, 0.1, -0.3]])
      b.add('head', prism(0.012, 0.085, h, 0.012, 0.085), hairC, { at: [x, top + 0.02 + h / 2, z], rot: t });
  } else if (hairStyle === 'long') {
    cap(0.02, 0.07, top + 0.012);
    b.box('head', headW + 0.03, 0.34, 0.07, hairD, [0, top - 0.19, -hw - 0.008]); // über den Nacken
    for (const s of [-1, 1]) b.box('head', 0.05, 0.25, headW * 0.78, hairC, [s * (hw + 0.015), top - 0.12, -0.02]); // über die Ohren
    b.box('head', headW * 0.9, 0.05, 0.04, hairC, [0, top - 0.03, hw + 0.006]);
  } else if (hairStyle === 'curly') {
    cap(0.04, 0.09, top + 0.025);
    back(0.16, top - 0.09);
    // Locken: unregelmäßige Beulen statt glatter Haube
    for (const [x, y, z, k] of [[-0.1, 0.06, 0.06, 0.1], [0.09, 0.07, 0.05, 0.11], [0, 0.1, 0, 0.12], [-0.08, 0.05, -0.1, 0.1], [0.1, 0.04, -0.08, 0.1], [0.02, 0.07, 0.1, 0.09], [-0.15, -0.03, 0, 0.08], [0.15, -0.02, -0.02, 0.08]])
      b.box('head', k, k * 0.8, k, hairC, [x, top + y - 0.02, z]);
  } else if (hairStyle === 'mohawk') {
    b.box('head', 0.08, 0.1, headW, hairC, [0, top + 0.04, 0]);
    b.box('head', headW + 0.01, 0.05, 0.05, hairD, [0, top - 0.12, -hw]);
  } else if (hairStyle === 'buzz') {
    // Kurzgeschoren: dünne Kappe, halb Haar, halb Haut – der Kopf bleibt als Form sichtbar.
    const buzz = mixHex(hairC, skin, 0.35);
    b.add('head', prism(headW + 0.008, headW + 0.01, 0.03, headW + 0.008, headW + 0.01), buzz, { at: [0, top + 0.0, 0] });
    b.box('head', headW + 0.008, 0.1, 0.03, buzz, [0, top - 0.06, -hw - 0.002]);
  } else if (hash % 2) {
    for (const s of [-1, 1]) b.box('head', 0.025, 0.06, headW * 0.5, hairD, [s * (hw + 0.005), top * 0.62, -0.07]); // Haarkranz
    b.box('head', headW + 0.01, 0.06, 0.04, hairD, [0, top * 0.62, -hw]);
  }
  // Bart: gemalt im Gesicht (Atlas); nur der Vollbart bekommt etwas Volumen am Kinn.
  const features = faceFeatures(hash, look);
  if (features.beard === 'full') b.box('head', headW * 0.8, 0.075, 0.05, hairC, [0, headH * 0.1, hw - 0.005]);
  if (!useAtlas && look.beard) b.box('head', headW * 0.8, 0.1, 0.07, hair, [0, headH * 0.14, hw - 0.015]);

  // Knochen in Ruhelage (Weltlage je Knochen = Summe der Versätze).
  const bones = {};
  const world = {};
  for (const n of BONES) {
    const bone = new THREE.Bone();
    bone.name = n;
    bones[n] = bone;
    const p = rest[n] ?? [0, 0, 0];
    bone.position.set(...p);
    if (PARENT[n]) bones[PARENT[n]].add(bone);
    const pw = PARENT[n] ? world[PARENT[n]] : [0, 0, 0];
    world[n] = [pw[0] + p[0], pw[1] + p[1], pw[2] + p[2]];
  }

  // Alles zu einer Geometrie: Position, Normale, Farbe, UV, Knochen (starr).
  let count = 0;
  for (const part of b.parts) count += part.geo.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const si = new Uint16Array(count * 4);
  const sw = new Float32Array(count * 4);
  const c = new THREE.Color();
  const texel = (x) => (useAtlas ? atlas.uv(tile, x, 0) : [0, 0]);
  let o = 0;
  let faceStart = -1;
  let faceCorners = null;
  b.parts.forEach((part) => {
    const g = part.geo;
    const w = world[part.bone];
    g.translate(w[0], w[1], w[2]);
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    // Texturierte Stellen tragen ihre Farbe in der Textur – Ecke weiß.
    const white = useAtlas && (part.uv === 'kit' || part.uv === 'plaster');
    c.setHex(white ? 0xffffff : part.color);
    for (let i = 0; i < n; i++) {
      col.set([c.r, c.g, c.b], (o + i) * 3);
      si[(o + i) * 4] = B[part.bone];
      sw[(o + i) * 4] = 1;
    }
    if (useAtlas) {
      if (part.uv === 'kit') {
        kitUV(g, atlas, tile);
        uvs.set(g.attributes.uv.array, o * 2);
      } else {
        const t = texel(UTIL_X + (part.uv === 'leg' ? 1 : part.uv === 'plaster' ? 2 : 0));
        for (let i = 0; i < n; i++) uvs.set(t, (o + i) * 2);
        if (part.uv === 'head') {
          // Vorderseite: Gesicht (Farbe aus der Textur, Ecke weiß).
          faceStart = o + 24;
          for (let i = 24; i < 30; i++) col.set([1, 1, 1], (o + i) * 3);
          faceCorners = Array.from(g.attributes.uv.array.subarray(48, 60), (v) => (v > 0.5 ? 1 : 0));
        }
      }
    }
    g.dispose();
    o += n;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));

  const material = useAtlas ? atlas.material : vertexToon();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.castShadow = true;
  mesh.frustumCulled = false; // Posen (Hechtsprung, Grätsche) reichen über die Ruhelage hinaus
  mesh.add(bones.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(BONES.map((n) => bones[n])));

  const group = new THREE.Group();
  group.add(mesh);
  group.scale.setScalar(look.height ?? 1);

  const model = {
    group,
    mesh,
    bones,
    rest,
    body: bones.hips,
    legs: [bones.upperLegL, bones.upperLegR],
    arms: [bones.upperArmL, bones.upperArmR],
    plaster: { visible: false },
    cloth: null,
    face: 'neutral',
    hairStyle,
    features,
    faceStart,
    faceCorners,
    phase: (hash % 628) / 100,
    idle: (hash % 97) / 10,
    lift: 0,
  };
  if (useAtlas) {
    model.cloth = {
      atlas,
      tile,
      number,
      accent,
      skin,
      brow: look.bald ? mixHex(skin, 0x000000, 0.45) : hairC,
      hairColor: hairC,
      mouth: mixHex(skin, 0x4a1c18, 0.55),
      faceArt: Object.fromEntries(FACES.map((id) => [id, faceArt(id, features)])),
      splats: makeSplats(),
      shown: 0,
      dirt: 0,
      dirtColor: 0x5b4a2e,
      plaster: false,
    };
    paintTile(model.cloth);
    faceUV(geo.attributes.uv, faceStart, model.faceCorners, atlas, tile, 'neutral');
  }
  return model;
}

// Gesicht wechseln: nur sechs UV-Paare der Kopf-Vorderseite.
export function setFace(model, face) {
  if (model.face === face || !model.cloth || model.faceStart < 0) return;
  model.face = face;
  const uv = model.mesh.geometry.attributes.uv;
  faceUV(uv, model.faceStart, model.faceCorners, model.cloth.atlas, model.cloth.tile, face);
  uv.clearUpdateRanges();
  uv.addUpdateRange(model.faceStart * 2, 12);
  uv.needsUpdate = true;
}

// Dreck aufs Trikot: dirt 0–1. Neu gemalt wird nur, wenn ein Klecks dazukommt.
export function setKitDirt(model, dirt, color) {
  const c = model.cloth;
  if (!c) return;
  const shown = Math.floor(c.splats.length * Math.min(1, dirt));
  if (shown === c.shown) return;
  c.shown = shown;
  c.dirt = dirt;
  c.dirtColor = color;
  paintTile(c);
}

export function disposeKit(model) {
  model.cloth?.atlas.release();
  model.mesh?.geometry.dispose();
  // Skelett: three legt je SkinnedMesh eine Knochen-Textur auf der GPU an – ohne dispose bliebe
  // sie nach jedem Spiel liegen (≈ 1 Textur je Spieler und Spielansicht).
  model.mesh?.skeleton?.dispose();
}

// --- Animation ----------------------------------------------------------------------
// Prozedural, ohne Zuteilungen pro Bild. Der Laufzyklus wird bewusst auf acht Posen
// je Schritt-Paar gerastert (bei Laufen etwa 10–15 Posen pro Sekunde) – das wirkt
// wie gezeichnete Pixel-Animation; Position und Blickrichtung bleiben fließend.
const TAU = Math.PI * 2;
const STEP = TAU / 8;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function resetPose(m) {
  const bn = m.bones;
  for (const n of BONES) bn[n].rotation.set(0, 0, 0);
  const r = m.rest.hips;
  bn.hips.position.set(r[0], r[1], r[2]);
}

// Bein: Oberschenkel (vorne = negativ), Knie (beugen = positiv), Fuß.
function leg(bn, s, thigh, knee, foot) {
  bn[`upperLeg${s}`].rotation.x = thigh;
  bn[`lowerLeg${s}`].rotation.x = knee;
  bn[`foot${s}`].rotation.x = foot;
}
// Arm: Schulter vor/zurück (vorne = negativ), seitlich (außen: L negativ, R positiv), Ellbogen (beugen = negativ).
function arm(bn, s, fwd, out, elbow) {
  const up = bn[`upperArm${s}`];
  up.rotation.x = fwd;
  up.rotation.z = s === 'L' ? -out : out;
  bn[`lowerArm${s}`].rotation.x = elbow;
}

// Laufen: Kontakt → Abfedern → Durchschwingen → Abdruck, Arme gegengleich und leicht
// verzögert, Hüfte kippt und dreht mit, Schultern drehen dagegen, Kopf bleibt ruhig.
function locomotion(m, speed, dt) {
  const bn = m.bones;
  const s = clamp01(speed / 7.5); // 0 Stand … 1 Sprint
  const move = smooth(0.15, 1.4, speed); // Übergang aus dem Stand
  m.phase += dt * (2.4 + speed * 1.3);
  m.idle += dt;
  const ph = Math.round(m.phase / STEP) * STEP;
  const cp = Math.cos(ph);
  const sp = Math.sin(ph);
  const at = (0.28 + 0.5 * s) * move;
  const ak = (0.35 + 1.05 * s) * move;
  for (const [side, p] of [['L', ph], ['R', ph + Math.PI]]) {
    const thigh = -at * Math.cos(p);
    const sw = Math.sin(p - Math.PI); // > 0: Schwungbein
    const knee = sw > 0 ? 0.08 + ak * sw : 0.08 + 0.18 * s * move * Math.sin(p);
    const foot = sw > 0 ? 0.25 * s * move : -(thigh + knee) * 0.8;
    leg(bn, side, thigh, knee, foot);
  }
  // Arme: Gegenbewegung zum Bein, beim Sprint weiter und stärker angewinkelt.
  const lag = 0.35;
  const aa = (0.18 + 0.7 * s) * move;
  const elbow = -(0.25 + 1.05 * s) * move - 0.12;
  arm(bn, 'L', aa * Math.cos(ph - lag), 0.1 + 0.04 * s, elbow);
  arm(bn, 'R', -aa * Math.cos(ph - lag), 0.1 + 0.04 * s, elbow);
  // Hüfte: federt zweimal je Schrittpaar, kippt zum Standbein, dreht mit dem Bein.
  const bob = (0.012 + 0.04 * s) * move;
  bn.hips.position.y += -bob * (0.5 + 0.5 * Math.cos(2 * ph - 0.6));
  bn.hips.rotation.z = 0.045 * s * move * sp;
  bn.hips.rotation.y = 0.14 * s * move * cp;
  bn.spine.rotation.y = -0.22 * s * move * cp;
  bn.spine.rotation.z = -0.03 * s * move * sp;
  bn.spine.rotation.x = 0.04 + 0.2 * s * move;
  bn.head.rotation.x = -bn.spine.rotation.x * 0.7;
  bn.head.rotation.y = -bn.spine.rotation.y * 0.5 - bn.hips.rotation.y * 0.5;
  // Stand: atmen, Gewicht verlagern, Arme locker.
  const still = 1 - move;
  if (still > 0) {
    const t = m.idle;
    bn.spine.rotation.x += still * 0.02 * Math.sin(t * 2.1);
    bn.hips.rotation.z += still * 0.02 * Math.sin(t * 0.8);
    bn.spine.rotation.z -= still * 0.015 * Math.sin(t * 0.8);
    for (const side of ['L', 'R']) bn[`lowerLeg${side}`].rotation.x += still * 0.06;
    bn.upperArmL.rotation.z -= still * 0.06;
    bn.upperArmR.rotation.z += still * 0.06;
  }
  return s;
}

// Schuss und Pass: Ausholen → Kontakt → Durchziehen → zurück. power 1 Schuss, ~0,55 Pass.
function kickPose(bn, t, power) {
  const P = power;
  let thigh;
  let knee;
  let twist;
  let lean;
  if (t < 0.35) {
    const u = t / 0.35;
    thigh = 0.95 * P * u;
    knee = 1.35 * P * u;
    twist = 0.32 * P * u;
    lean = -0.06 * u;
  } else if (t < 0.5) {
    const u = (t - 0.35) / 0.15;
    thigh = lerp(0.95 * P, -0.55 * P, u);
    knee = lerp(1.35 * P, 0.12, u);
    twist = lerp(0.32 * P, 0, u);
    lean = lerp(-0.06, 0.12 * P, u);
  } else if (t < 0.8) {
    const u = (t - 0.5) / 0.3;
    thigh = lerp(-0.55 * P, -1.25 * P, u);
    knee = lerp(0.12, 0.06, u);
    twist = lerp(0, -0.22 * P, u);
    lean = lerp(0.12 * P, 0.2 * P, u);
  } else {
    const u = (t - 0.8) / 0.2;
    thigh = lerp(-1.25 * P, -0.2, u);
    knee = lerp(0.06, 0.3, u);
    twist = lerp(-0.22 * P, 0, u);
    lean = lerp(0.2 * P, 0.08, u);
  }
  leg(bn, 'R', thigh, knee, t < 0.5 ? 0.35 : 0.2);
  leg(bn, 'L', -0.12, 0.28, -0.1); // Standbein leicht gebeugt
  bn.spine.rotation.y = twist;
  bn.spine.rotation.x = lean;
  bn.hips.rotation.y = -twist * 0.5;
  // Arme gleichen aus: der gegenüberliegende nach vorn-außen, der andere zurück.
  arm(bn, 'L', -0.45 * P, 0.55 * P, -0.5);
  arm(bn, 'R', 0.35 * P, 0.35 * P, -0.4);
  bn.head.rotation.x = 0.18; // Blick auf den Ball
}

// Tricks am Ball (t 0 → 1): Übersteiger, Hackentrick, Jay-Jay-Lupfer, Zidane-Drehung.
// side: zu welcher Seite angetäuscht wird (+1 rechts). Gibt nichts zurück, setzt nur Knochen.
function trickPose(bn, kind, t, side) {
  const R = side > 0 ? 'R' : 'L';
  const Lg = side > 0 ? 'L' : 'R';
  const out = side > 0 ? 1 : -1; // Abspreizen nach außen (R positiv, L negativ)
  if (kind === 'uebersteiger') {
    // Bein kreist außen über den Ball, Oberkörper täuscht mit – dann Abdruck zur anderen Seite.
    if (t < 0.6) {
      const a = Math.sin((t / 0.6) * Math.PI);
      leg(bn, R, -0.7 * a, 0.75 * a, 0.2);
      bn[`upperLeg${R}`].rotation.z = 0.85 * a * out;
      leg(bn, Lg, 0.05, 0.45, -0.1);
      bn.spine.rotation.z = -0.4 * a * out;
      bn.hips.rotation.z = 0.12 * a * out;
      bn.hips.position.y -= 0.08 * a;
    } else {
      const a = Math.sin(((t - 0.6) / 0.4) * Math.PI);
      leg(bn, Lg, -0.45 * a, 0.5 * a, 0.2);
      leg(bn, R, 0.35 * a, 0.3, 0);
      bn.spine.rotation.z = 0.22 * a * out;
    }
    arm(bn, 'L', -0.2, 0.7, -0.5);
    arm(bn, 'R', -0.2, 0.7, -0.5);
    bn.head.rotation.x = 0.25;
  } else if (kind === 'hacke') {
    // Hinter dem Standbein vorbei mit der Hacke gespitzelt.
    const a = t < 0.45 ? t / 0.45 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    const snap = t > 0.45 && t < 0.65 ? 1 : 0;
    leg(bn, R, 0.55 + 0.35 * a, 0.9 * a + 0.5 * snap, 0.4);
    bn[`upperLeg${R}`].rotation.z = -0.3 * a * out; // kreuzt hinter dem Standbein
    leg(bn, Lg, -0.1, 0.3, -0.1);
    bn.spine.rotation.x = 0.18 * a;
    bn.head.rotation.x = 0.3;
    arm(bn, 'L', 0.2, 0.5, -0.4);
    arm(bn, 'R', 0.2, 0.5, -0.4);
  } else if (kind === 'jayjay') {
    // Ball hinten mit der Ferse hochgelupft, kleiner Hüpfer, Arme zur Balance.
    const a = Math.sin(t * Math.PI);
    bn.hips.position.y += 0.18 * a;
    leg(bn, R, 0.45 + 0.5 * a, 0.7 + 1.3 * a, 0.6);
    leg(bn, Lg, -0.25 * a, 0.35 * a, 0.2);
    bn.spine.rotation.x = 0.25 * a;
    bn.head.rotation.x = 0.1 - 0.3 * a; // schaut dem Ball nach
    arm(bn, 'L', -0.3, 0.9 * a, -0.4);
    arm(bn, 'R', -0.3, 0.9 * a, -0.4);
  } else if (kind === 'zidane') {
    // Roulette: Fuß auf dem Ball, einmal um die eigene Achse, Arme weit.
    const e = t * t * (3 - 2 * t);
    bn.root.rotation.y = -out * TAU * e;
    const a = Math.sin(t * Math.PI);
    leg(bn, R, -0.3 * a, 0.5 * a, 0.3);
    leg(bn, Lg, 0.2 * a, 0.4 * a, 0);
    bn.hips.position.y -= 0.04 * a;
    arm(bn, 'L', -0.1, 0.9 * a, -0.3);
    arm(bn, 'R', -0.1, 0.9 * a, -0.3);
    bn.head.rotation.x = 0.3;
  }
}

// Fallrückzieher / Seitfallzieher (t 0 → 1, dann liegt er): abheben, Scherenschlag, Landung.
function acroPose(bn, kind, t, hipY) {
  const lift = t < 0.55 ? Math.sin((t / 0.55) * Math.PI * 0.5) : 1 - smooth(0.55, 0.8, t);
  const lie = smooth(0.55, 0.8, t);
  bn.hips.position.y = hipY + 0.5 * lift * (1 - lie) - (hipY - 0.24) * lie;
  // Schere: erst holt das Schwungbein Schwung, dann schnellt das Schussbein über Kopf.
  const snap = smooth(0.22, 0.4, t);
  const relax = smooth(0.6, 0.9, t);
  const kick = lerp(lerp(-0.9, -2.5, snap), -0.9, relax);
  const swing = lerp(lerp(-2.1, -0.3, snap), -0.5, relax);
  if (kind === 'fallrueck') {
    bn.hips.rotation.set(-1.65 * smooth(0, 0.35, t), 0, 0); // auf den Rücken
    leg(bn, 'R', kick, lerp(0.5, 0.05, snap) + 0.4 * relax, 0.3);
    leg(bn, 'L', swing, 0.6, 0.3);
    bn.spine.rotation.set(-0.15 * lie, 0, 0);
    bn.head.rotation.x = 0.55 * (1 - lie); // Kinn zur Brust, Blick auf den Ball
    arm(bn, 'L', 0.9, 1.1, -0.2); // Arme fangen den Fall ab
    arm(bn, 'R', 0.9, 1.1, -0.2);
  } else {
    bn.hips.rotation.set(-0.35 * smooth(0, 0.35, t), 0, 1.35 * smooth(0, 0.35, t)); // seitlich in die Luft
    leg(bn, 'L', lerp(-0.4, -1.7, snap) * (1 - relax) - 0.3 * relax, 0.3, 0.3);
    leg(bn, 'R', lerp(-1.4, -0.2, snap), 0.5, 0.3);
    bn.spine.rotation.set(0, 0, 0.15);
    bn.head.rotation.z = -0.4;
    arm(bn, 'L', -0.5, 1.2, -0.3);
    arm(bn, 'R', 0.6, 0.4, -0.8); // stützt sich ab
  }
}

// Zusätzlich zur Simulation (nur Darstellung, von MatchView abgeleitet):
// headPrep 0…1 – Kopfball kommt gleich (Anlauf, Absprung, Kopf zurück), headJump 0…1 – wie
// hoch nach dem Kontakt gesprungen wird, hit { t 0…1, side } – kurzer Kontakt/Rempler,
// duck 0…1 – Torwart duckt sich weg, face – Ausdruck für einen Moment (z. B. überrascht),
// kickPrep 0…1 – Schuss/Pass ist geplant: ausholen (die Simulation führt ihn als „pending“),
// trick/trickT/trickSide – Trick am Ball, acro/acroT – Fall-/Seitfallzieher, fooled 0…1 –
// ausgetrickst, steht kurz auf dem falschen Fuß.
export function animatePlayer(model, { speed, dt, kickAnim, headAnim, holding, state, injured, dive, celebrate, sad, kick = 'shot', headPrep = 0, headJump = 1, hit = null, duck = 0, face: faceHint = null, kickPrep = 0, trick = null, trickT = 0, trickSide = 1, acro = null, acroT = 0, fooled = 0 }) {
  const bn = model.bones;
  resetPose(model);
  const s = locomotion(model, speed, dt);
  const hipY = model.rest.hips[1];
  let face = s > 0.85 ? 'effort' : 'neutral';

  // Mit Schürfwunde humpelt man ein bisschen.
  const hurt = !!injured;
  if (hurt) {
    bn.hips.rotation.z += Math.sin(model.phase) * 0.07 * s;
    face = 'pain';
  }
  if (model.cloth && hurt !== model.cloth.plaster) {
    model.cloth.plaster = hurt;
    paintTile(model.cloth);
  }
  model.plaster.visible = hurt;

  if (kickAnim > 0) {
    kickPose(bn, 1 - kickAnim / 0.3, kick === 'pass' ? 0.55 : 1);
    face = 'effort';
  } else if (kickPrep > 0) {
    // Ausholen, solange der Schuss/Pass geplant ist (vor dem Abflug des Balls).
    kickPose(bn, 0.35 * Math.min(1, kickPrep), kick === 'pass' ? 0.55 : 1);
    face = 'effort';
  }
  if (holding === 'chest') {
    arm(bn, 'L', -1.05, -0.28, -1.25);
    arm(bn, 'R', -1.05, -0.28, -1.25);
  } else if (holding === 'overhead') {
    arm(bn, 'L', -2.85, 0.12, -0.75); // Einwurf
    arm(bn, 'R', -2.85, 0.12, -0.75);
  }
  if (headAnim > 0 || headPrep > 0) {
    // Kopfball: vorbereiten (abspringen, Oberkörper und Kopf zurück) → nach vorn schnappen →
    // KONTAKT bei t = 0,5 (höchster Punkt, Kopf schnellt vor) → landen. Vor dem Kontakt
    // treibt headPrep die Bewegung (MatchView sieht den Ball kommen), danach der Kopfball
    // der Simulation (headAnim 0,3 → 0).
    const t = headAnim > 0 ? 0.5 + 0.5 * (1 - headAnim / 0.3) : 0.5 * Math.min(1, headPrep);
    const jump = headAnim > 0 ? headJump : 1;
    bn.hips.position.y += Math.sin(t * Math.PI) * 0.32 * jump;
    const snap = t < 0.38 ? -(t / 0.38) : t < 0.55 ? lerp(-1, 1, (t - 0.38) / 0.17) : lerp(1, 0.2, (t - 0.55) / 0.45);
    bn.spine.rotation.x = 0.35 * snap;
    bn.head.rotation.x = 0.4 * snap;
    arm(bn, 'L', -0.7, 0.55, -0.6);
    arm(bn, 'R', -0.7, 0.55, -0.6);
    leg(bn, 'L', -0.35, 0.8, 0.3);
    leg(bn, 'R', 0.1, 0.9, 0.3);
    face = 'effort';
  }

  if (trick && state === 'normal' && kickAnim <= 0) {
    trickPose(bn, trick, trickT, trickSide);
    face = 'effort';
  }
  // Ausgetrickst: Gewicht auf der falschen Seite, Oberkörper hängt hinterher.
  if (fooled > 0 && state === 'normal') {
    const k = Math.sin(Math.min(1, fooled) * Math.PI);
    bn.spine.rotation.z += 0.5 * k;
    bn.spine.rotation.x -= 0.2 * k;
    bn.hips.rotation.z -= 0.22 * k;
    bn.hips.position.x -= 0.1 * k;
    leg(bn, 'L', -0.2 * k, 0.5 * k, 0.1);
    bn.upperLegL.rotation.z = -0.45 * k; // Bein rutscht zur falschen Seite weg
    bn.upperArmL.rotation.z -= 1.0 * k;
    bn.upperArmR.rotation.z += 0.6 * k;
    face = 'surprised';
  }

  // Kontakt (Rempler, Zweikampf, Ball an den Körper): kurz zurückweichen, Schulter dreht weg,
  // Kopf ruckt, Arme gehen auseinander – dann erholt er sich (Sinusbogen über ~0,35 s).
  if (hit && state === 'normal' && !dive) {
    const k = Math.sin(Math.min(1, hit.t) * Math.PI);
    bn.spine.rotation.x -= 0.28 * k;
    bn.spine.rotation.y += 0.32 * k * hit.side;
    bn.hips.rotation.y -= 0.12 * k * hit.side;
    bn.head.rotation.x -= 0.18 * k;
    bn.head.rotation.z += 0.14 * k * hit.side;
    bn.upperArmL.rotation.z -= 0.45 * k;
    bn.upperArmR.rotation.z += 0.45 * k;
    bn.hips.position.y -= 0.03 * k;
    face = 'pain';
  }
  // Torwart duckt sich weg: Kopf runter, Oberkörper vor, Knie beugen, Unterarme schützen den Kopf.
  if (duck > 0 && state === 'normal' && !dive && !holding) {
    const k = Math.sin(Math.min(1, duck) * Math.PI);
    bn.hips.position.y -= 0.16 * k;
    leg(bn, 'L', -0.55 * k, 1.0 * k, 0.2 * k);
    leg(bn, 'R', -0.55 * k, 1.0 * k, 0.2 * k);
    bn.spine.rotation.x += 0.6 * k;
    bn.head.rotation.x += 0.45 * k;
    arm(bn, 'L', -2.3 * k, 0.55 * k, -1.9 * k);
    arm(bn, 'R', -2.3 * k, 0.55 * k, -1.9 * k);
    face = 'surprised';
  }

  // Grätsche: Füße voran, führendes Bein gestreckt, das andere angewinkelt, eine Hand stützt.
  if (state === 'tackle') {
    bn.hips.position.y = 0.3;
    bn.hips.rotation.x = -1.1;
    bn.hips.rotation.y = 0;
    bn.spine.rotation.set(0.45, 0, 0);
    leg(bn, 'L', -0.45, 0.02, 0.3);
    leg(bn, 'R', 0.15, 1.45, 0.2);
    arm(bn, 'R', 0.7, 0.35, -0.2);
    arm(bn, 'L', -0.4, 1.1, -0.5);
    bn.head.rotation.x = 0.35;
    face = 'effort';
  } else if (state === 'complain') {
    // Meckern: Arme hoch, fuchteln.
    model.phase += dt * 4;
    const w = Math.sin(model.phase * 3) * 0.4;
    arm(bn, 'L', -2.3 + w, 0.3, -0.4);
    arm(bn, 'R', -2.3 - w, 0.3, -0.4);
    bn.head.rotation.x = -0.15;
    face = 'angry';
  } else if (state === 'down') {
    // Gefoult: bäuchlings hin.
    bn.hips.position.y = 0.2;
    bn.hips.rotation.set(1.45, 0, 0);
    bn.spine.rotation.set(0.05, 0, 0.05);
    leg(bn, 'L', 0.05, 0.35, 0.4);
    leg(bn, 'R', 0.1, 0.1, 0.4);
    arm(bn, 'L', -2.5, 0.35, -0.35);
    arm(bn, 'R', -2.2, 0.5, -0.6);
    bn.head.rotation.x = -0.45;
    face = 'pain';
  }
  if (state === 'acro' || (acro && acroT < 1)) {
    acroPose(bn, acro ?? 'fallrueck', acroT, hipY);
    face = 'effort';
  }
  // Hechtsprung des Torwarts: seitlich flach in die Ecke, Arme lang, Beine hinterher.
  if (dive) {
    const k = Math.sin(Math.min(1, (0.5 - dive.t) / 0.2) * Math.PI * 0.5);
    bn.hips.rotation.set(0, 0, dive.side * 1.35 * k);
    bn.hips.position.x = -dive.side * 0.55 * k;
    bn.hips.position.y = hipY + 0.25 * k;
    bn.spine.rotation.set(0, 0, dive.side * 0.12 * k);
    arm(bn, 'L', -2.95, 0.2, -0.1);
    arm(bn, 'R', -2.95, 0.2, -0.1);
    const low = dive.side > 0 ? 'L' : 'R';
    leg(bn, low, -0.2 * k, 0.7 * k, 0.3);
    leg(bn, low === 'L' ? 'R' : 'L', 0.1, 0.15, 0.3);
    face = 'effort';
  }

  // Torjubel – jeder hat seinen eigenen.
  if (celebrate) {
    const t = model.phase;
    face = 'happy';
    bn.head.rotation.x = -0.25;
    if (celebrate === 'flugzeug') {
      arm(bn, 'L', 0, 1.45, 0);
      arm(bn, 'R', 0, 1.45, 0);
      bn.spine.rotation.z = Math.sin(t * 0.8) * 0.25;
      bn.spine.rotation.x = 0.1;
    } else if (celebrate === 'faust') {
      arm(bn, 'R', -2.6 + Math.sin(t * 3) * 0.3, 0.15, -0.6);
      arm(bn, 'L', -0.2, 0.3, -1.2);
      bn.hips.position.y += Math.abs(Math.sin(t * 3)) * 0.06;
    } else if (celebrate === 'tanz') {
      arm(bn, 'L', -2.4 + Math.sin(t * 4) * 0.7, 0.35, -0.3);
      arm(bn, 'R', -2.4 - Math.sin(t * 4) * 0.7, 0.35, -0.3);
      bn.hips.position.y += Math.abs(Math.sin(t * 4)) * 0.12;
      bn.spine.rotation.x = -0.12;
    } else if (celebrate === 'rutscher' && speed > 1.5) {
      // Knierutscher: auf die Knie, Unterschenkel flach nach hinten, Oberkörper zurück.
      bn.hips.position.y = 0.46;
      bn.hips.rotation.set(0, 0, 0);
      leg(bn, 'L', -0.05, 1.5, 0.6);
      leg(bn, 'R', -0.05, 1.5, 0.6);
      bn.spine.rotation.set(-0.35, 0, 0);
      bn.head.rotation.x = -0.35;
      arm(bn, 'L', -2.8, 0.3, -0.2);
      arm(bn, 'R', -2.8, 0.3, -0.2);
    } else if (celebrate === 'rutscher') {
      arm(bn, 'L', -2.8, 0.3, -0.2);
      arm(bn, 'R', -2.8, 0.3, -0.2);
    }
  } else if (sad) {
    // Gegentor: Kopf runter, Schultern hängen, Hände in die Hüften.
    bn.spine.rotation.x = 0.16;
    bn.head.rotation.x = 0.4;
    arm(bn, 'L', 0.1, 0.55, -1.5);
    arm(bn, 'R', 0.1, 0.55, -1.5);
    face = 'sad';
  }
  // Wie hoch der Körper über dem Boden ist (für den Kontaktschatten).
  model.lift = Math.max(0, bn.hips.position.y - hipY);
  model.grounded = state === 'tackle' || state === 'down' || state === 'acro' || !!dive;
  if (faceHint && !celebrate && face !== 'pain') face = faceHint;
  setFace(model, face);
}

// Ruhige Pose für Zuschauer (stehen oder sitzen) – ohne Laufzyklus.
export function posePlayer(model, { sitting = false } = {}) {
  resetPose(model);
  const bn = model.bones;
  if (sitting) {
    bn.hips.position.y -= 0.4;
    leg(bn, 'L', -1.45, 1.45, 0);
    leg(bn, 'R', -1.45, 1.45, 0);
  }
  // Hände in die Hüften oder verschränkt – Zuschauer stehen nur rum.
  arm(bn, 'L', -0.2, 0.25, -1.0);
  arm(bn, 'R', -0.2, 0.25, -1.0);
}
