import * as THREE from 'three';
import { REGION } from '../kitPaint.js';
import { FACE, faceCell, FACES, TILE_H, TILE_W } from './atlas.js';

// Quader wie `new BoxGeometry(w, h, d).toNonIndexed()`, aber aus einer einmal gebauten Einheitsbox
// skaliert (±0,5 · Maß = ±Maß/2, bitgleich) – spart je Körperteil den kompletten Box-Aufbau.
let unitBox = null;
export function boxGeometry(w, h, d) {
  unitBox ??= new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const src = unitBox.attributes.position.array;
  const pos = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    pos[i] = src[i] * w;
    pos[i + 1] = src[i + 1] * h;
    pos[i + 2] = src[i + 2] * d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(unitBox.attributes.normal.array.slice(), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(unitBox.attributes.uv.array.slice(), 2));
  return g;
}

// Verjüngter Quader: Breite/Tiefe oben und unten getrennt (Low-Poly-Prisma).
// Nicht indiziert, Flächenfolge wie BoxGeometry: +x, -x, +y, -y, +z, -z (je 6 Ecken).
export function prism(wTop, wBot, h, dTop, dBot, { front = 0 } = {}) {
  const g = boxGeometry(1, h, 1);
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
export class Builder {
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
    return this.add(bone, boxGeometry(w, h, d), color, { ...opts, at });
  }
}

// UVs auf den Trikot-Atlas: jede Seite bekommt ihr Feld (oben/unten die Schulterpartie).
export function kitUV(g, atlas, tile) {
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
export function faceUV(uv, start, corners, atlas, tile, face) {
  const fi = FACES.indexOf(face);
  const [fx, fy] = faceCell(fi);
  const x0 = fx / TILE_W;
  const x1 = (fx + FACE) / TILE_W;
  const vTop = 1 - (tile * TILE_H + fy) / atlas.canvas.height;
  const v1 = vTop - FACE / atlas.canvas.height;
  for (let i = 0; i < 6; i++) uv.setXY(start + i, corners[i * 2] ? x1 : x0, corners[i * 2 + 1] ? vTop : v1);
}
