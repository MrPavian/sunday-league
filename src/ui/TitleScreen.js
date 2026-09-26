import { tr } from '../core/i18n.js';
import { crestSVG } from './logo.js';

// Startbild: Sonntagmorgen auf dem Dorfplatz, als Pixelbild von Hand gezeichnet
// (prozedural, 384 × 216). Wolken ziehen, das Flutlicht flackert, die Fahne weht.
// Keine Spieler – nur das Ballnetz liegt schon bereit. Irgendeine Taste oder ein
// Klick – und es geht ins Menü.
const W = 384;
const H = 216;
const HORIZON = 118;
const BOARD_Y = 128;
const PITCH_Y = 137;

// 4 × 4 Bayer-Matrix für weiche Verläufe ohne Farbrauschen.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const mix = (a, b, t) => {
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

// Sprites: jedes Zeichen eine Farbe aus der Palette, '.' bleibt frei.
const PAL = { h: 0x3a2618, s: 0xe6b894, S: 0xc79270, r: 0xc8352f, R: 0x9a2622, w: 0xf2efe6, k: 0x1a1a1a, g: 0xc8352f, y: 0xe0b020, Y: 0xb08818, n: 0x1d2b44, b: 0x6b4f2a, B: 0x4a3222, e: 0x1a1716, t: 0x8a9096 };
const FAN = ['.hh.', 'hssh', '.ss.', 'bbbb', 'bbbb', 'bbbb', '.BB.'];
const DOG = ['......bb', '.....bbb', 'bbbbbbb.', 'bbbbbbb.', 'b.b..b.b'];

function sprite(ctx, rows, x, y, scale = 1, pal = PAL) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = hex(pal[ch] ?? 0xff00ff);
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  });
}

function dither(ctx, x, y, w, h, a, b, t0, t1, vertical = true) {
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const t = t0 + (t1 - t0) * ((vertical ? yy : xx) / Math.max(1, (vertical ? h : w) - 1));
      ctx.fillStyle = hex(t > BAYER[((y + yy) % 4) * 4 + ((x + xx) % 4)] ? b : a);
      ctx.fillRect(x + xx, y + yy, 1, 1);
    }
}

function drawSky(ctx) {
  // Von oben nach unten: Himmelblau → Morgenrot am Horizont.
  const stops = [
    [0, 0x4f7fbf],
    [45, 0x7aa6d6],
    [85, 0xc9c6c0],
    [HORIZON, 0xf2c08a],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, c0] = stops[i];
    const [y1, c1] = stops[i + 1];
    for (let y = y0; y < y1; y++) {
      const f = (y - y0) / (y1 - y0);
      for (let x = 0; x < W; x++) {
        ctx.fillStyle = hex(f > BAYER[(y % 4) * 4 + (x % 4)] ? c1 : c0);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Sonne mit Hof.
  const sx = 312;
  const sy = 84;
  for (let y = -24; y <= 24; y++)
    for (let x = -24; x <= 24; x++) {
      const d = Math.hypot(x, y);
      if (d > 24) continue;
      const glow = 1 - d / 24;
      if (d <= 9) ctx.fillStyle = '#fff4c8';
      else if (glow * 0.9 > BAYER[((sy + y) & 3) * 4 + ((sx + x) & 3)] + 0.35) ctx.fillStyle = '#f8dca0';
      else continue;
      ctx.fillRect(sx + x, sy + y, 1, 1);
    }
}

// Wolken: weiche Pixelhaufen, die langsam ziehen.
function drawClouds(ctx, t) {
  const r = rng(7);
  for (let i = 0; i < 7; i++) {
    const cx = ((r() * (W + 120) + t * (3 + i * 0.6)) % (W + 120)) - 60;
    const cy = 14 + r() * 50;
    const puffs = 4 + Math.floor(r() * 4);
    for (let p = 0; p < puffs; p++) {
      const px = cx + (p - puffs / 2) * 9 + r() * 4;
      const py = cy + r() * 5 - (p % 2) * 3;
      const rad = 6 + r() * 6;
      for (let y = -rad; y <= rad; y++)
        for (let x = -rad * 1.4; x <= rad * 1.4; x++) {
          const d = Math.hypot(x / 1.4, y) / rad;
          if (d > 1) continue;
          const X = Math.round(px + x);
          const Y = Math.round(py + y);
          if (X < 0 || X >= W || Y < 0) continue;
          ctx.fillStyle = y > rad * 0.35 ? '#dfe4ea' : '#f8f6f0';
          if (d > 0.8 && BAYER[(Y & 3) * 4 + (X & 3)] < 0.5) continue;
          ctx.fillRect(X, Y, 1, 1);
        }
    }
  }
}

function drawVillage(ctx) {
  const r = rng(21);
  // Ferne Hügel.
  ctx.fillStyle = '#8fa39a';
  for (let x = 0; x < W; x++) {
    const h = 8 + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.051 + 1) * 3;
    ctx.fillRect(x, HORIZON - h, 1, h + 10);
  }
  // Baumreihe.
  for (let x = 0; x < W; x += 3) {
    const h = 6 + r() * 7;
    ctx.fillStyle = r() < 0.5 ? '#3f6b3a' : '#35593a';
    ctx.fillRect(x, HORIZON - h + 4, 4, h);
  }
  // Häuser mit Satteldach.
  let x = 150;
  while (x < 290) {
    const w = 14 + Math.floor(r() * 10);
    const h = 8 + Math.floor(r() * 6);
    const base = HORIZON + 6;
    ctx.fillStyle = r() < 0.5 ? '#e9dcc4' : '#d8c8a8';
    ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = r() < 0.6 ? '#b4583c' : '#7a4a3a';
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) ctx.fillRect(x - 1 + i, base - h - i, w + 2 - i * 2, 1);
    ctx.fillStyle = '#4a5a6a';
    for (let wx = x + 2; wx < x + w - 2; wx += 4) ctx.fillRect(wx, base - h + 3, 2, 2);
    x += w + 2 + Math.floor(r() * 6);
  }
  // Kirchturm mit Uhr.
  const cx = 214;
  ctx.fillStyle = '#e4d6bc';
  ctx.fillRect(cx, HORIZON - 34, 12, 40);
  ctx.fillStyle = '#5a6a60';
  for (let i = 0; i < 16; i++) ctx.fillRect(cx + 6 - Math.ceil(i * 0.4), HORIZON - 50 + i, Math.ceil(i * 0.8) || 1, 1);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(cx + 5, HORIZON - 54, 2, 4);
  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(cx + 3, HORIZON - 28, 6, 6);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx + 6, HORIZON - 27, 1, 3);
  ctx.fillRect(cx + 6, HORIZON - 25, 2, 1);
}

function drawClubhouse(ctx) {
  // Vereinsheim links: Klinker, Flachdach, Fenster mit Licht, Schild.
  const x = 10;
  const y = 92;
  const w = 104;
  const h = 40;
  ctx.fillStyle = '#9a4a34';
  ctx.fillRect(x, y, w, h);
  for (let yy = 0; yy < h; yy += 3) {
    ctx.fillStyle = '#86402e';
    ctx.fillRect(x, y + yy, w, 1);
    for (let xx = (yy / 3) % 2 ? 2 : 5; xx < w; xx += 7) ctx.fillRect(x + xx, y + yy, 1, 3);
  }
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x - 3, y - 4, w + 6, 4);
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(x - 3, y - 4, w + 6, 1);
  for (let i = 0; i < 4; i++) {
    const wx = x + 8 + i * 24;
    ctx.fillStyle = '#e8e0cc';
    ctx.fillRect(wx - 1, y + 13, 16, 12);
    ctx.fillStyle = i === 1 ? '#f8d890' : '#6f8faf';
    ctx.fillRect(wx, y + 14, 14, 10);
    ctx.fillStyle = '#e8e0cc';
    ctx.fillRect(wx + 7, y + 14, 1, 10);
  }
  // Schild über der Tür.
  ctx.fillStyle = '#2e6b3a';
  ctx.fillRect(x + 20, y + 3, 64, 8);
  ctx.fillStyle = '#f2efe6';
  ctx.font = '7px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('VEREINSHEIM', x + 26, y + 3);
  // Fahnenmast mit Vereinsfahne.
  ctx.fillStyle = '#c8c8c0';
  ctx.fillRect(x + w + 6, y - 30, 1, 70);
}

function drawFlag(ctx, t) {
  const x = 121;
  const y = 63;
  for (let c = 0; c < 16; c++) {
    const wave = Math.round(Math.sin(t * 4 + c * 0.6) * 1.5 * (c / 16));
    ctx.fillStyle = c < 5 ? '#f2efe6' : '#2e6b3a';
    ctx.fillRect(x + c, y + wave, 1, 10);
    ctx.fillStyle = '#e0b020';
    if (c > 7 && c < 12) ctx.fillRect(x + c, y + wave + 3, 1, 4);
  }
}

function drawFloodlights(ctx, t) {
  for (const [x, top] of [
    [138, 30],
    [352, 22],
  ]) {
    ctx.fillStyle = '#6a6e70';
    ctx.fillRect(x, top, 2, BOARD_Y - top);
    ctx.fillStyle = '#50545a';
    ctx.fillRect(x - 7, top - 8, 16, 9);
    const on = Math.sin(t * 13 + x) > -0.95; // eine Lampe flackert, wie immer
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = on || i !== 2 ? '#fff6d0' : '#8a8a80';
      ctx.fillRect(x - 6 + i * 4, top - 7, 3, 3);
      ctx.fillRect(x - 6 + i * 4, top - 3, 3, 2);
    }
  }
}

function drawBoards(ctx) {
  // Werbebande mit Sponsoren aus dem Ort.
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
  let x = 0;
  let i = 0;
  while (x < W) {
    const w = 40 + Math.floor(r() * 12);
    const [bg, fg] = colors[i++ % colors.length];
    ctx.fillStyle = hex(bg);
    ctx.fillRect(x, BOARD_Y, w - 1, 9);
    ctx.fillStyle = hex(mix(bg, 0x000000, 0.35));
    ctx.fillRect(x, BOARD_Y + 8, w - 1, 1);
    ctx.fillStyle = hex(fg);
    // Blocksatz statt Schrift: sieht aus der Ferne wie Werbung aus.
    let lx = x + 4;
    while (lx < x + w - 6) {
      const lw = 2 + Math.floor(r() * 4);
      ctx.fillRect(lx, BOARD_Y + 3, lw, 3);
      lx += lw + 1 + (r() < 0.25 ? 2 : 0);
    }
    x += w;
  }
}

function drawFans(ctx) {
  const r = rng(11);
  for (let x = 128; x < 300; x += 7 + Math.floor(r() * 6)) {
    const pal = { ...PAL, b: [0xc8352f, 0x2f6fb5, 0x3a3a3a, 0x6b4f2a, 0x5a8f40, 0xe0b020][Math.floor(r() * 6)], h: [0x3a2618, 0x8a8a8a, 0x1a1a1a, 0xb08850][Math.floor(r() * 4)], s: [0xf1d0b5, 0xd29f7a, 0x8d5a3b][Math.floor(r() * 3)] };
    sprite(ctx, FAN, x, BOARD_Y - 7, 1, pal);
    if (r() < 0.2) {
      ctx.fillStyle = '#c8352f'; // Schirm
      ctx.fillRect(x - 2, BOARD_Y - 11, 8, 2);
      ctx.fillRect(x + 1, BOARD_Y - 9, 1, 3);
    }
  }
  sprite(ctx, DOG, 300, BOARD_Y - 5, 1);
}

const GOAL_LINE = 150;
const VP = { x: 336, y: HORIZON - 30 }; // Fluchtpunkt: Blick längs übers Feld aufs Tor

// Punkt auf einer Linie, die vom Fluchtpunkt aus nach vorne läuft: x auf der Torlinie → x bei Höhe y.
const toward = (xGoal, y) => VP.x + ((xGoal - VP.x) * (y - VP.y)) / (GOAL_LINE - VP.y);

function drawPitch(ctx) {
  // Mähstreifen parallel zur Torlinie, nach vorne immer breiter.
  const r = rng(3);
  for (let y = PITCH_Y; y < H; y++) {
    const depth = (y - PITCH_Y) / (H - PITCH_Y);
    const stripe = Math.floor(260 / (y - VP.y)) & 1;
    for (let x = 0; x < W; x++) {
      let c = stripe ? 0x5e9f41 : 0x528f37;
      c = mix(c, 0x9fb870, (1 - depth) * 0.25); // Dunst in der Ferne
      const n = r();
      if (n < 0.06) c = mix(c, 0x3d6e2c, 0.6);
      else if (n > 0.97) c = mix(c, 0x9fd070, 0.4);
      ctx.fillStyle = hex(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Abgenutzter Torraum vor dem Tor.
  for (let i = 0; i < 320; i++) {
    const y = GOAL_LINE + r() * 10;
    const x = 336 + (r() - 0.5) * (50 + (y - GOAL_LINE) * 4);
    ctx.fillStyle = r() < 0.5 ? '#8a7048' : '#6f5a3a';
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
  }
  // Kreidelinien – alle auf denselben Fluchtpunkt ausgerichtet.
  ctx.fillStyle = '#f2efe6';
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  };
  const depthLine = (xg, y1) => line(xg, GOAL_LINE, toward(xg, y1), y1);
  ctx.fillRect(0, GOAL_LINE, W, 1); // Torlinie
  // Torraum.
  depthLine(296, 159);
  depthLine(378, 159);
  line(toward(296, 159), 159, toward(378, 159), 159);
  // Strafraum.
  depthLine(246, 182);
  depthLine(428, 182);
  line(toward(246, 182), 182, W, 182);
  // Elfmeterpunkt und Teilkreis.
  ctx.fillRect(335, 172, 3, 2);
  for (let a = 0; a < Math.PI; a += 0.01) {
    const x = 336 + Math.cos(a) * 46;
    const y = 174 + Math.sin(a) * 14;
    if (y > 183) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // Seitenlinie links mit Eckfahne.
  depthLine(40, H);
  ctx.fillStyle = '#e8e2d0';
  ctx.fillRect(40, GOAL_LINE - 14, 1, 14);
  ctx.fillStyle = '#e0b020';
  ctx.fillRect(41, GOAL_LINE - 14, 5, 4);
}

function drawGoal(ctx) {
  // Tor mit Netz rechts, leicht perspektivisch.
  const x0 = 300;
  const x1 = 372;
  const base = 150;
  const top = 112;
  ctx.fillStyle = 'rgba(230, 230, 225, 0.55)';
  for (let x = x0 + 4; x < x1 + 8; x += 4) for (let y = top + 3; y < base; y++) ctx.fillRect(x, y, 1, 1);
  for (let y = top + 3; y < base; y += 4) ctx.fillRect(x0 + 3, y, x1 - x0 + 4, 1);
  ctx.fillStyle = '#f8f8f4';
  ctx.fillRect(x0, top, 3, base - top);
  ctx.fillRect(x1, top, 3, base - top);
  ctx.fillRect(x0, top, x1 - x0 + 3, 3);
  ctx.fillStyle = '#c8c8c0';
  ctx.fillRect(x0 + 2, top + 3, 1, base - top - 3);
  ctx.fillRect(x1 + 2, top + 3, 1, base - top - 3);
}

function drawBall(ctx, x, y) {
  // 6 × 6 Pixelball mit schwarzen Flecken und Schatten.
  ctx.fillStyle = 'rgba(20, 40, 20, 0.35)';
  ctx.fillRect(x - 1, y + 5, 8, 2);
  ctx.fillStyle = '#f8f8f4';
  ctx.fillRect(x + 1, y, 4, 6);
  ctx.fillRect(x, y + 1, 6, 4);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 2, y + 2, 2, 2);
  ctx.fillRect(x, y + 1, 1, 1);
  ctx.fillRect(x + 5, y + 4, 1, 1);
  ctx.fillStyle = '#c8c8c0';
  ctx.fillRect(x + 1, y + 5, 4, 1);
}

function drawCone(ctx, x, y) {
  ctx.fillStyle = 'rgba(20, 40, 20, 0.35)';
  ctx.fillRect(x - 1, y + 5, 8, 1);
  ctx.fillStyle = '#e8742a';
  ctx.fillRect(x + 2, y, 2, 2);
  ctx.fillRect(x + 1, y + 2, 4, 2);
  ctx.fillRect(x, y + 4, 6, 2);
  ctx.fillStyle = '#f2efe6';
  ctx.fillRect(x + 1, y + 3, 4, 1);
}

function drawStill(ctx) {
  // Ballnetz: ein Haufen Bälle im Netz, Kordel zum Zuziehen, daneben ein paar lose Bälle.
  const bx = 150;
  const by = 176;
  const balls = [
    [0, 10], [7, 11], [14, 10], [21, 11], [4, 5], [11, 5], [18, 6], [8, 0], [15, 1],
  ];
  ctx.fillStyle = 'rgba(20, 40, 20, 0.35)';
  ctx.fillRect(bx - 2, by + 16, 34, 3);
  for (const [dx, dy] of balls) drawBall(ctx, bx + dx, by + dy);
  // Maschen über den Bällen.
  ctx.fillStyle = 'rgba(30, 30, 30, 0.55)';
  for (let y = by - 1; y < by + 17; y++)
    for (let x = bx - 1; x < bx + 29; x++) {
      const inside = balls.some(([dx, dy]) => x >= bx + dx - 1 && x <= bx + dx + 6 && y >= by + dy - 1 && y <= by + dy + 6);
      if (inside && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0)) ctx.fillRect(x, y, 1, 1);
    }
  // Zugekordelter Hals mit Schlaufe.
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(bx + 11, by - 3, 4, 3);
  ctx.fillStyle = '#e0b020';
  ctx.fillRect(bx + 15, by - 3, 6, 1);
  ctx.fillRect(bx + 20, by - 2, 1, 3);
  ctx.fillRect(bx + 17, by, 4, 1);
  // Lose Bälle und Hütchen fürs Aufwärmen.
  drawBall(ctx, 196, 190);
  drawBall(ctx, 118, 199);
  drawBall(ctx, 262, 164);
  for (const [x, y] of [[214, 166], [236, 174], [258, 184], [280, 196]]) drawCone(ctx, x, y);
  // Kasten Bier am Spielfeldrand – für danach.
  ctx.fillStyle = '#c8962a';
  ctx.fillRect(12, 190, 26, 14);
  ctx.fillStyle = '#9a7020';
  ctx.fillRect(12, 196, 26, 2);
  ctx.fillStyle = '#4a3a1a';
  for (let i = 0; i < 5; i++) ctx.fillRect(14 + i * 5, 186, 3, 4);
  ctx.fillStyle = '#d8d0b0';
  for (let i = 0; i < 5; i++) ctx.fillRect(14 + i * 5, 185, 3, 1);
  // Sporttasche.
  ctx.fillStyle = '#1d2b44';
  ctx.fillRect(44, 194, 30, 11);
  ctx.fillStyle = '#f2efe6';
  ctx.fillRect(44, 198, 30, 1);
  ctx.fillStyle = '#10182a';
  ctx.fillRect(52, 190, 14, 4);
}

export class TitleScreen {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <canvas width="${W}" height="${H}"></canvas>
      <div class="title-logo">
        ${crestSVG(96)}
        <h1>Sunday League</h1>
        <p class="sub"></p>
        <p class="title-press"></p>
      </div>
      <p class="title-hint">${tr('Für PC mit Tastatur · <kbd>H</kbd> Hilfe · <kbd>O</kbd> Einstellungen · Spielstand bleibt in diesem Browser', 'For PC with keyboard · <kbd>H</kbd> help · <kbd>O</kbd> settings · your save stays in this browser')}</p>
      <p class="title-foot">© Sunday League · ${tr('Alle Rechte vorbehalten', 'All rights reserved')}</p>`;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
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

  // Unbewegtes wird einmal vorgezeichnet; pro Bild nur Wolken, Licht, Fahne und Ball.
  layer(paint) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    paint(c.getContext('2d'));
    return c;
  }

  draw(t) {
    const ctx = this.ctx;
    this.sky ??= this.layer(drawSky);
    this.ground ??= this.layer((g) => {
      drawVillage(g);
      drawClubhouse(g);
      drawFans(g);
      drawBoards(g);
      drawPitch(g);
      drawGoal(g);
      drawStill(g);
    });
    ctx.drawImage(this.sky, 0, 0);
    drawClouds(ctx, t);
    ctx.drawImage(this.ground, 0, 0);
    drawFloodlights(ctx, t);
    drawFlag(ctx, t);
  }
}
