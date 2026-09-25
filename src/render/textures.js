import { pixelTexture } from './materials.js';

// Asphalt mit Flicken, Rissen, Ölflecken, Parkbuchten und einer
// Kreide-Mittellinie, die Kinder draufgemalt haben.
export function makeAsphaltTexture(rng, { width, depth, texelsPerMeter = 12 }) {
  const W = Math.round(width * texelsPerMeter);
  const H = Math.round(depth * texelsPerMeter);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const toPx = (x) => Math.round((x + width / 2) * texelsPerMeter);
  const toPy = (z) => Math.round((z + depth / 2) * texelsPerMeter);

  for (let i = 0; i < W * H; i++) {
    const n = (rng.next() - 0.5) * 14;
    data[i * 4] = 78 + n;
    data[i * 4 + 1] = 80 + n;
    data[i * 4 + 2] = 84 + n;
    data[i * 4 + 3] = 255;
  }
  const put = (px, py, r, g, b, a = 1) => {
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    const i = (py * W + px) * 4;
    data[i] = data[i] * (1 - a) + r * a;
    data[i + 1] = data[i + 1] * (1 - a) + g * a;
    data[i + 2] = data[i + 2] * (1 - a) + b * a;
  };

  // Ausgebesserte Flicken (dunkler, rechteckig)
  for (let k = 0; k < 14; k++) {
    const px = rng.int(0, W - 40);
    const py = rng.int(0, H - 30);
    const w = rng.int(12, 40);
    const h = rng.int(8, 28);
    for (let y = py; y < py + h; y++) for (let x = px; x < px + w; x++) put(x, y, 58, 60, 64, 0.8);
  }
  // Ölflecken
  for (let k = 0; k < 18; k++) {
    const cx = rng.int(0, W);
    const cy = rng.int(0, H);
    const r = rng.int(3, 9);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && rng.next() > 0.2) put(cx + x, cy + y, 50, 50, 56, 0.6);
  }
  // Risse (Random Walk)
  for (let k = 0; k < 26; k++) {
    let x = rng.int(0, W);
    let y = rng.int(0, H);
    let dir = rng.next() * Math.PI * 2;
    const steps = rng.int(20, 90);
    for (let s = 0; s < steps; s++) {
      put(Math.round(x), Math.round(y), 40, 41, 44, 0.9);
      dir += (rng.next() - 0.5) * 0.9;
      x += Math.cos(dir);
      y += Math.sin(dir);
    }
  }
  // Parkbuchten an beiden Längsseiten
  const line = (x0, z0, x1, z1, r, g, b, a, wobble = 0) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) * texelsPerMeter));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ox = wobble ? (rng.next() - 0.5) * wobble : 0;
      const px = toPx(x0 + (x1 - x0) * t + ox);
      const py = toPy(z0 + (z1 - z0) * t + ox);
      put(px, py, r, g, b, a);
      put(px + 1, py, r, g, b, a);
      put(px, py + 1, r, g, b, a);
    }
  };
  for (const side of [-1, 1]) {
    for (let x = -19.2; x <= 19.2; x += 3.2) line(x, side * 11.3, x, side * 16, 206, 204, 190, 0.85);
    line(-19.2, side * 11.3, 19.2, side * 11.3, 206, 204, 190, 0.35);
  }
  // Kreide: Mittellinie, Mittelkreis, Torlinien
  line(0, -10, 0, 10, 235, 235, 240, 0.7, 0.08);
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = Math.cos(a) * 3;
    const z = Math.sin(a) * 3;
    line(x, z, x, z, 235, 235, 240, 0.7, 0.1);
  }
  for (const s of [-1, 1]) line(s * 18, -1.6, s * 18, 1.6, 235, 235, 240, 0.6, 0.06);

  ctx.putImageData(img, 0, 0);
  return pixelTexture(canvas);
}

export function makeSignTexture(text, { bg = '#1f5e3a', fg = '#f4e9c8' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 20);
  ctx.fillStyle = fg;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 11);
  return pixelTexture(canvas);
}

export function makeShutterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 32; y++) {
    ctx.fillStyle = y % 3 === 0 ? '#6f757a' : '#9aa0a4';
    ctx.fillRect(0, y, 32, 1);
  }
  return pixelTexture(canvas);
}

// Gemeinsamer Pixel-Maler für Bodentexturen (Weltkoordinaten → Texel).
function painter(rng, { width, depth, texelsPerMeter = 12, base, noise = 14 }) {
  const W = Math.round(width * texelsPerMeter);
  const H = Math.round(depth * texelsPerMeter);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let i = 0; i < W * H; i++) {
    const n = (rng.next() - 0.5) * noise;
    data[i * 4] = base[0] + n;
    data[i * 4 + 1] = base[1] + n;
    data[i * 4 + 2] = base[2] + n;
    data[i * 4 + 3] = 255;
  }
  const px = (x) => Math.round((x + width / 2) * texelsPerMeter);
  const py = (z) => Math.round((z + depth / 2) * texelsPerMeter);
  const put = (x, y, [r, g, b], a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    data[i] = data[i] * (1 - a) + r * a;
    data[i + 1] = data[i + 1] * (1 - a) + g * a;
    data[i + 2] = data[i + 2] * (1 - a) + b * a;
  };
  const blob = (x, z, radius, color, a = 0.6, density = 0.8) => {
    const r = Math.round(radius * texelsPerMeter);
    const cx = px(x);
    const cy = py(z);
    for (let y = -r; y <= r; y++)
      for (let xx = -r; xx <= r; xx++) if (xx * xx + y * y <= r * r && rng.next() < density) put(cx + xx, cy + y, color, a);
  };
  const line = (x0, z0, x1, z1, color, a = 0.85, wobble = 0, thick = 2) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) * texelsPerMeter));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const o = wobble ? (rng.next() - 0.5) * wobble : 0;
      const X = px(x0 + (x1 - x0) * t + o);
      const Y = py(z0 + (z1 - z0) * t + o);
      if (rng.next() < 0.08) continue; // abgenutzt
      for (let dy = 0; dy < thick; dy++) for (let dx = 0; dx < thick; dx++) put(X + dx, Y + dy, color, a);
    }
  };
  const circle = (x, z, r, color, a, from = 0, to = Math.PI * 2) => {
    const steps = Math.ceil(r * (to - from) * texelsPerMeter);
    for (let s = 0; s <= steps; s++) {
      const ang = from + ((to - from) * s) / steps;
      line(x + Math.cos(ang) * r, z + Math.sin(ang) * r, x + Math.cos(ang) * r, z + Math.sin(ang) * r, color, a);
    }
  };
  const finish = () => {
    ctx.putImageData(img, 0, 0);
    return pixelTexture(canvas);
  };
  return { put, blob, line, circle, finish, W, H, px, py };
}

// Betonplatten im Hinterhof: Fugen, Unkraut, Kreide-Hüpfkästchen.
export function makeConcreteTexture(rng, { width, depth }) {
  const p = painter(rng, { width, depth, base: [128, 126, 120], noise: 12 });
  const slab = 1.5;
  for (let x = -width / 2; x <= width / 2; x += slab) p.line(x, -depth / 2, x, depth / 2, [92, 90, 86], 0.8, 0, 1);
  for (let z = -depth / 2; z <= depth / 2; z += slab) p.line(-width / 2, z, width / 2, z, [92, 90, 86], 0.8, 0, 1);
  for (let k = 0; k < 40; k++) {
    // Unkraut in den Fugen
    const x = Math.round(rng.range(-width / 2, width / 2) / slab) * slab;
    const z = rng.range(-depth / 2, depth / 2);
    p.blob(x, z, 0.12, [86, 120, 62], 0.9, 0.7);
  }
  for (let k = 0; k < 10; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), rng.range(0.3, 0.8), [104, 102, 98], 0.5);
  // Hüpfkästchen am Rand
  const hx = -5;
  const hz = 5.2;
  for (let i = 0; i < 6; i++) {
    const x = hx + i * 0.6;
    p.line(x, hz, x + 0.6, hz, [236, 230, 240], 0.7);
    p.line(x, hz + 0.6, x + 0.6, hz + 0.6, [236, 230, 240], 0.7);
    p.line(x, hz, x, hz + 0.6, [236, 230, 240], 0.7);
  }
  p.line(hx + 3.6, hz, hx + 3.6, hz + 0.6, [236, 230, 240], 0.7);
  p.line(-0.05, -6, -0.05, 6, [240, 236, 200], 0.55, 0.06);
  return p.finish();
}

// Parkwiese: ungleichmäßiges Grün, kahle Stellen vor den "Toren", Maulwurfshügel.
export function makeParkGrassTexture(rng, { width, depth, goalX }) {
  const p = painter(rng, { width, depth, base: [92, 128, 64], noise: 22 });
  for (let k = 0; k < 60; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), rng.range(0.5, 2.2), rng.pick([[104, 142, 70], [80, 114, 56], [112, 138, 72]]), 0.5, 0.6);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) p.blob(s * goalX + rng.range(-0.8, 0.8), rng.range(-1.5, 1.5), rng.range(0.4, 0.9), [128, 104, 72], 0.8, 0.8);
  }
  for (let k = 0; k < 8; k++) p.blob(rng.range(-width / 3, width / 3), rng.range(-depth / 3, depth / 3), 0.2, [96, 72, 50], 1, 1);
  // Trampelpfad hinten
  for (let x = -width / 2; x < width / 2; x += 0.3) p.blob(x, -depth / 2 + 3 + Math.sin(x * 0.2) * 1.2, 0.7, [170, 150, 110], 0.9, 0.9);
  return p.finish();
}

// Ascheplatz: rotbraun, gesprenkelt, Pfützen, verwaschene Kreidelinien.
export function makeAshTexture(rng, { width, depth, pitch }) {
  const p = painter(rng, { width, depth, base: [150, 82, 58], noise: 26 });
  for (let k = 0; k < 900; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), 0.05, rng.pick([[176, 104, 76], [120, 64, 46], [96, 88, 84]]), 0.9, 1);
  for (let k = 0; k < 7; k++) p.blob(rng.range(-pitch.halfLength, pitch.halfLength), rng.range(-pitch.halfWidth, pitch.halfWidth), rng.range(0.5, 1.2), [96, 58, 46], 0.7, 0.95);
  drawPitchLines(p, pitch, [124, 70, 52]);
  return p.finish();
}

// Kreidelinien eines Kleinfelds; worn = Farbe für den ausgetretenen Torraum.
function drawPitchLines(p, pitch, worn) {
  const chalk = [236, 232, 222];
  const { halfLength: hl, halfWidth: hw } = pitch;
  const box = Math.min(8, pitch.goalHalfWidth * 2.4 + 2);
  const depth = Math.min(8, hl * 0.3);
  p.line(-hl, -hw, hl, -hw, chalk, 0.8, 0.03, 3);
  p.line(-hl, hw, hl, hw, chalk, 0.8, 0.03, 3);
  p.line(-hl, -hw, -hl, hw, chalk, 0.8, 0.03, 3);
  p.line(hl, -hw, hl, hw, chalk, 0.8, 0.03, 3);
  p.line(0, -hw, 0, hw, chalk, 0.75, 0.03, 3);
  p.circle(0, 0, Math.min(5, hw * 0.3), chalk, 0.75);
  for (const s of [-1, 1]) {
    const x = s * hl;
    p.line(x, -box, x - s * depth, -box, chalk, 0.75, 0.03, 3);
    p.line(x, box, x - s * depth, box, chalk, 0.75, 0.03, 3);
    p.line(x - s * depth, -box, x - s * depth, box, chalk, 0.75, 0.03, 3);
    p.blob(x - s * (depth + 1), 0, 0.12, chalk, 0.9, 1);
    if (worn) p.blob(x - s * 0.8, 0, 1.4, worn, 0.5, 0.7);
  }
}

// Gepflegter Rasen mit Mähstreifen – der erste "richtige" Platz.
export function makeLawnTexture(rng, { width, depth, pitch }) {
  const p = painter(rng, { width, depth, base: [78, 128, 60], noise: 14 });
  for (let x = -width / 2; x < width / 2; x += 3) {
    if (Math.round((x + width / 2) / 3) % 2) continue;
    for (let z = -depth / 2; z < depth / 2; z += 0.25) p.line(x, z, x + 3, z, [88, 142, 68], 0.55, 0, 3);
  }
  // Abgenutzt vor den Toren und am Anstoßpunkt.
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) p.blob(s * (pitch.halfLength - 1) + rng.range(-1, 1), rng.range(-1.5, 1.5), rng.range(0.5, 1), [112, 102, 66], 0.55, 0.7);
  p.blob(0, 0, 0.8, [100, 110, 62], 0.5, 0.7);
  drawPitchLines(p, pitch, null);
  return p.finish();
}

export function makeSignTextureWide(text, { bg = '#1f5e3a', fg = '#f4e9c8', width = 192 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, 20);
  ctx.fillStyle = fg;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, 11);
  return pixelTexture(canvas);
}
