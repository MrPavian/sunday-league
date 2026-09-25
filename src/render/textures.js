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
