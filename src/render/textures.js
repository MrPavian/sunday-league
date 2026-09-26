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
  // Großflächige Farbverläufe: glattes Rauschen auf einem groben Gitter (scale in m).
  const tint = (scale, colorA, colorB, strength = 0.5) => {
    const gw = Math.ceil(width / scale) + 2;
    const gh = Math.ceil(depth / scale) + 2;
    const grid = Array.from({ length: gw * gh }, () => rng.next());
    const g = (i, j) => grid[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)];
    const smooth = (t) => t * t * (3 - 2 * t);
    const per = scale * texelsPerMeter;
    for (let y = 0; y < H; y++) {
      const fy = y / per;
      const j = Math.floor(fy);
      const ty = smooth(fy - j);
      for (let x = 0; x < W; x++) {
        const fx = x / per;
        const i = Math.floor(fx);
        const tx = smooth(fx - i);
        const v = (g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - ty) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * ty;
        const c = colorA.map((a, k) => a + (colorB[k] - a) * v);
        put(x, y, c, strength);
      }
    }
  };
  // Einzelne Pixel: Gänseblümchen, Steinchen.
  const speckle = (count, colors, area = null) => {
    for (let k = 0; k < count; k++) {
      const x = area ? px(rng.range(area[0], area[1])) : rng.int(0, W - 1);
      const y = area ? py(rng.range(area[2], area[3])) : rng.int(0, H - 1);
      put(x, y, colors[k % colors.length], 1);
    }
  };
  // Grasbüschel: kurze senkrechte Striche in dunklerem Grün.
  const tufts = (count, color, a = 0.7) => {
    for (let k = 0; k < count; k++) {
      const x = rng.int(0, W - 1);
      const y = rng.int(1, H - 1);
      put(x, y, color, a);
      put(x, y - 1, color, a * 0.8);
      if (rng.next() < 0.5) put(x + 1, y, color, a * 0.6);
    }
  };
  const finish = () => {
    ctx.putImageData(img, 0, 0);
    return pixelTexture(canvas);
  };
  return { put, blob, line, circle, tint, speckle, tufts, finish, W, H, px, py };
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

// Parkwiese: ungleichmäßiges Grün, Klee, Gänseblümchen, kahle Stellen vor den
// "Toren", Maulwurfshügel und ein Trampelpfad.
export function makeParkGrassTexture(rng, { width, depth, goalX }) {
  const p = painter(rng, { width, depth, base: [92, 128, 64], noise: 20 });
  p.tint(7, [80, 118, 56], [112, 148, 74], 0.65);
  p.tint(2.2, [86, 124, 60], [104, 140, 70], 0.3);
  for (let k = 0; k < 70; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), rng.range(0.4, 1.8), rng.pick([[104, 142, 70], [74, 110, 52], [118, 144, 76]]), 0.45, 0.6);
  for (let k = 0; k < 18; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), rng.range(0.3, 0.7), [66, 104, 58], 0.6, 0.85); // Klee
  p.tufts(1400, [62, 96, 44], 0.55);
  // Kahle Stellen vor den Rucksack-Toren und am Anstoß.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 9; k++) p.blob(s * (goalX - 0.8) + rng.range(-1.2, 1.2), rng.range(-1.8, 1.8), rng.range(0.4, 1.1), [132, 108, 74], 0.75, 0.75);
    p.blob(s * (goalX - 0.6), 0, 0.9, [120, 96, 64], 0.8, 0.85);
    p.speckle(40, [[150, 128, 96]], [s * goalX - 2, s * goalX + 2, -2, 2]);
  }
  p.blob(0, 0, 0.9, [120, 112, 70], 0.55, 0.7);
  for (let k = 0; k < 8; k++) p.blob(rng.range(-width / 3, width / 3), rng.range(-depth / 3, depth / 3), 0.2, [96, 72, 50], 1, 1); // Maulwurf
  // Gänseblümchen und Löwenzahn.
  p.speckle(520, [[246, 244, 236], [246, 244, 236], [238, 236, 226], [244, 206, 52]]);
  // Trampelpfad hinten
  for (let x = -width / 2; x < width / 2; x += 0.3) p.blob(x, -depth / 2 + 3 + Math.sin(x * 0.2) * 1.2, 0.7, [170, 150, 110], 0.9, 0.9);
  return p.finish();
}

// Ascheplatz: rotbraun, gesprenkelt, Pfützen, verwaschene Kreidelinien.
export function makeAshTexture(rng, { width, depth, pitch }) {
  const p = painter(rng, { width, depth, base: [150, 82, 58], noise: 26 });
  p.tint(6, [138, 74, 52], [162, 92, 64], 0.5);
  // Rechenspuren vom Platzwart: feine, leicht geschwungene Bahnen.
  for (let z = -depth / 2; z < depth / 2; z += 0.5) {
    const drift = rng.range(-0.3, 0.3);
    p.line(-width / 2, z, width / 2, z + drift, [164, 96, 70], 0.18, 0.05, 1);
  }
  for (let k = 0; k < 900; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), 0.05, rng.pick([[176, 104, 76], [120, 64, 46], [96, 88, 84]]), 0.9, 1);
  // Pfützen: dunkel, mit hellem Rand aus ausgewaschenem Sand.
  for (let k = 0; k < 7; k++) {
    const x = rng.range(-pitch.halfLength, pitch.halfLength);
    const z = rng.range(-pitch.halfWidth, pitch.halfWidth);
    const r = rng.range(0.35, 0.8);
    p.blob(x, z, r + 0.15, [170, 104, 78], 0.35, 0.7);
    p.blob(x, z, r, [112, 66, 52], 0.5, 0.9);
    p.blob(x - r * 0.3, z - r * 0.3, r * 0.3, [140, 118, 116], 0.3, 0.7); // Himmel spiegelt
  }
  drawPitchLines(p, pitch, [124, 70, 52]);
  for (const s of [-1, 1]) p.blob(s * (pitch.halfLength - 1), 0, 1.8, [118, 64, 48], 0.35, 0.8); // feuchter Torraum
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
  p.tint(9, [72, 120, 56], [90, 140, 66], 0.45);
  for (let x = -width / 2; x < width / 2; x += 3) {
    if (Math.round((x + width / 2) / 3) % 2) continue;
    for (let z = -depth / 2; z < depth / 2; z += 0.25) p.line(x, z, x + 3, z, [88, 142, 68], 0.55, 0, 3);
  }
  p.tufts(900, [62, 104, 48], 0.4);
  // Abgenutzt vor den Toren, am Elfmeterpunkt und am Anstoßpunkt.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 9; k++) p.blob(s * (pitch.halfLength - 1.2) + rng.range(-1.4, 1.4), rng.range(-2, 2), rng.range(0.4, 1.1), [118, 104, 66], 0.6, 0.72);
    p.blob(s * (pitch.halfLength - 0.7), 0, 0.8, [128, 108, 70], 0.7, 0.85);
    p.speckle(30, [[140, 120, 84]], [s * pitch.halfLength - 2.5, s * pitch.halfLength + 0.5, -2, 2]);
  }
  p.blob(0, 0, 0.8, [100, 110, 62], 0.5, 0.7);
  // Trampelpfad des Linienrichters an der Seitenlinie.
  for (let x = -pitch.halfLength; x < pitch.halfLength; x += 0.4) p.blob(x, pitch.halfWidth + 0.8, 0.35, [104, 118, 66], 0.4, 0.6);
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

// Hallenboden: helles Parkett in Bahnen, bunte Linien für Handball, Basketball, Volleyball.
export function makeHallTexture(rng, { width, depth, pitch }) {
  const p = painter(rng, { width, depth, base: [206, 164, 108], noise: 10 });
  for (let z = -depth / 2; z < depth / 2; z += 0.8) p.line(-width / 2, z, width / 2, z, [188, 146, 92], 0.5, 0, 2);
  for (let k = 0; k < 40; k++) p.blob(rng.range(-width / 2, width / 2), rng.range(-depth / 2, depth / 2), rng.range(0.3, 0.8), [196, 150, 96], 0.35, 0.6);
  const { halfLength: hl, halfWidth: hw } = pitch;
  const blue = [40, 90, 170];
  const yellow = [230, 190, 40];
  const red = [190, 50, 40];
  for (const [z0, z1] of [[-hw, -hw], [hw, hw]]) p.line(-hl, z0, hl, z1, blue, 0.9, 0.03, 3);
  for (const s of [-1, 1]) {
    p.line(s * hl, -hw, s * hl, hw, blue, 0.9, 0.03, 3);
    // Torraum: Halbkreis wie beim Handball
    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.08) {
      const x0 = s * hl - s * Math.cos(a) * 6;
      const z0 = Math.sin(a) * 6;
      const x1 = s * hl - s * Math.cos(a + 0.08) * 6;
      const z1 = Math.sin(a + 0.08) * 6;
      p.line(x0, z0, x1, z1, blue, 0.9, 0.03, 3);
    }
    p.line(s * (hl - 9), -hw, s * (hl - 9), hw, yellow, 0.6, 0.02, 2);
  }
  p.line(0, -hw, 0, hw, blue, 0.9, 0.03, 3);
  p.circle(0, 0, 3, red, 0.8);
  return p.finish();
}
