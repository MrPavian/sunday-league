// Bausteine der Vereinswelt (UI 3.0, Phase 1): Spielerkarte mit Rückseite, Handy mit Hand,
// Zettel, Stempel. Liefern HTML-Strings wie ds.js; Styles in src/world.css.
// Die Grafik (Hand, Kartenrücken) ist eine austauschbare Schicht – die Bedienung hängt nicht daran.
import { tr } from '../core/i18n.js';
import { esc } from './ds.js';

const hex = (n) => (typeof n === 'number' ? `#${n.toString(16).padStart(6, '0')}` : n);
// Helle Vereinsfarbe (Weiß, Gelb …)? Dann dunkle Schrift auf der Karte – sonst weiß auf weiß.
export function isLight(color) {
  const n = parseInt(hex(color).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

// Pixelbild aus Zeichenkarte: jede Zeile ein String, jedes Zeichen ein Pixel (Palette → Farbe).
export function pixelSVG(rows, palette, cls = '') {
  const w = Math.max(...rows.map((r) => r.length));
  const rects = rows
    .flatMap((row, y) => [...row].map((ch, x) => (palette[ch] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[ch]}"/>` : '')))
    .join('');
  return `<svg class="${cls}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// Hauttöne kommen aus dem Aussehen des Trainers (Zahl wie in SKIN_TONES) – dunklere Schattierung abgeleitet.
function shade(color, f = 0.78) {
  const n = parseInt(hex(color).slice(1), 16);
  const c = (s) => Math.round(((n >> s) & 255) * f);
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
}

// Hand (rechte Hand hält das Handy hochkant, wie auf einem Produktfoto): Die Teile sind als
// einfache Formen anatomisch platziert und werden auf ein Pixelraster gerechnet – so haben alle
// Teile dieselbe Pixelgröße, Kontur und Schattierung. Koordinaten: Handy-Breite = 100, Unterkante
// des Handys bei y = 0, y wächst nach unten (negativ = auf dem Handy).
//   Daumen: rechts am Rand, Kuppe leicht auf dem Rahmen. Finger: umgreifen die linke Kante, man
//   sieht vier Kuppen. Handfläche hinter der unteren Hälfte, Ballen rechts unten, Handgelenk geht
//   schräg nach rechts unten aus dem Bild.
const HAND_FRAME = { x0: -26, y0: -110, w: 180, h: 170, px: 2.4 };
// cap: Kapsel von a nach b, Radius läuft von ra nach rb (verjüngt). g: Gruppe – Kontur nur an
// Gruppengrenzen, Schatten über die ganze Gruppe. front: liegt vor dem Handy.
const cap = (ax, ay, bx, by, ra, rb = ra, o = {}) => ({ kind: 'cap', ax, ay, bx, by, ra, rb, ...o });
const ell = (cx, cy, rx, ry, o = {}) => ({ kind: 'ell', cx, cy, rx, ry, ...o });
const HAND_PARTS = [
  // Vor dem Handy: Daumen (rechts, zwei Glieder, verjüngt) und vier Fingerkuppen (links).
  cap(110, -34, 106, -66, 12, 9.6, { g: 'thumb', front: true }),
  cap(106, -66, 100.5, -90, 9.6, 7.2, { g: 'thumb', front: true }),
  cap(-15, -72, -1, -69, 6.6, 6, { g: 'f1', front: true }),
  cap(-16, -58, -1, -56, 6.8, 6.2, { g: 'f2', front: true }),
  cap(-15, -44, -1, -43, 6.5, 5.9, { g: 'f3', front: true }),
  cap(-13, -31, -1.5, -31, 5.6, 5, { g: 'f4', front: true }),
  // Hinter dem Handy: Handfläche mit Ballen, Daumenballen, Fingerwurzeln, Handgelenk.
  ell(104, -28, 16, 27, { g: 'hand' }),
  ell(66, -18, 38, 32, { g: 'hand' }),
  ell(-9, -52, 9, 25, { g: 'hand' }),
  cap(90, 14, 156, 74, 22, 20, { g: 'hand' }),
];
const THUMB_NAIL = ell(100.5, -88, 3.8, 5.2);

function inside(sh, x, y) {
  if (sh.kind === 'ell') return ((x - sh.cx) / sh.rx) ** 2 + ((y - sh.cy) / sh.ry) ** 2 <= 1;
  const dx = sh.bx - sh.ax;
  const dy = sh.by - sh.ay;
  const t = Math.max(0, Math.min(1, ((x - sh.ax) * dx + (y - sh.ay) * dy) / (dx * dx + dy * dy)));
  const r = sh.ra + (sh.rb - sh.ra) * t;
  return (x - sh.ax - t * dx) ** 2 + (y - sh.ay - t * dy) ** 2 <= r * r;
}

// Ein Raster für die ganze Hand: Zelle gehört zum ersten Teil, das sie trifft (Reihenfolge =
// Vorrang). Kontur, wo der Nachbar leer ist oder zu einer anderen Gruppe gehört (Fingerzwischen-
// räume, Daumen gegen Ballen); Schatten unten rechts, Glanz oben links – bezogen auf die Gruppe,
// damit Formen weich ineinander übergehen. Ergebnis: zwei Zeichenkarten (hinten/vorn).
function rasterHand() {
  const { x0, y0, w, h, px } = HAND_FRAME;
  const cols = Math.round(w / px);
  const rows = Math.round(h / px);
  const at = (c, r) => [x0 + (c + 0.5) * px, y0 + (r + 0.5) * px];
  const partAt = (x, y) => HAND_PARTS.findIndex((sh) => inside(sh, x, y));
  const groupAt = (x, y) => HAND_PARTS[partAt(x, y)]?.g ?? null;
  const owner = [];
  for (let r = 0; r < rows; r++) {
    owner.push([]);
    for (let c = 0; c < cols; c++) owner[r].push(partAt(...at(c, r)));
  }
  const g = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols || owner[r][c] < 0 ? null : HAND_PARTS[owner[r][c]].g);
  const back = [];
  const front = [];
  for (let r = 0; r < rows; r++) {
    let b = '';
    let f = '';
    for (let c = 0; c < cols; c++) {
      const o = owner[r][c];
      let ch = '.';
      if (o >= 0) {
        const grp = HAND_PARTS[o].g;
        const [x, y] = at(c, r);
        if ([g(c - 1, r), g(c + 1, r), g(c, r - 1), g(c, r + 1)].some((n) => n !== grp)) ch = 'k';
        else if (grp === 'thumb' && inside(THUMB_NAIL, x, y)) ch = inside(THUMB_NAIL, x + px, y + px) && inside(THUMB_NAIL, x - px, y - px) ? 'n' : 'N';
        else if (groupAt(x + px * 2.2, y + px * 1.6) !== grp) ch = 'S';
        else if (groupAt(x - px * 1.6, y - px * 1.6) !== grp) ch = 'h';
        else ch = 's';
      }
      const isFront = o >= 0 && HAND_PARTS[o].front;
      b += isFront ? '.' : ch;
      f += isFront ? ch : '.';
    }
    back.push(b);
    front.push(f);
  }
  return { back, front };
}

// Pixelreihen → SVG mit zusammengefassten waagrechten Läufen (weniger Knoten als ein Rechteck je Pixel).
function runsSVG(rows, palette, cls) {
  const out = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let n = 1;
      while (row[x + n] === ch) n++;
      if (palette[ch]) out.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${palette[ch]}"/>`);
      x += n;
    }
  });
  return out.join('');
}

function tint(color, f) {
  const n = parseInt(hex(color).slice(1), 16);
  const c = (s) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * f);
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
}

const handCache = new Map();
export function handLayers(skin = 0xe0ac80) {
  if (handCache.has(skin)) return handCache.get(skin);
  const pal = { k: '#1a1410', s: hex(skin), S: shade(skin), h: tint(skin, 0.22), n: tint(skin, 0.55), N: shade(skin, 0.9) };
  const { w, h, px } = HAND_FRAME;
  const vb = `viewBox="0 0 ${Math.round(w / px)} ${Math.round(h / px)}"`;
  const svg = (cls, body) => `<svg class="${cls}" ${vb} shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
  const { back, front } = rasterHand();
  const layers = {
    back: svg('m-hand-layer m-hand-back', runsSVG(back, pal)),
    front: svg('m-hand-layer m-hand-front m-thumb m-fingers', runsSVG(front, pal)),
  };
  handCache.set(skin, layers);
  return layers;
}

// Handy mit Hand. screen: HTML des Displays (Chat, Sperrbildschirm …) – echtes, bedienbares HTML.
// lit: Display leuchtet (neue Nachricht), buzz: einmal kurz vibrieren (nur bei Ereignis).
export function phone(screen, { skin, lit = false, buzz = false, rise = false, label = tr('Handy', 'Phone') } = {}) {
  const hand = handLayers(skin);
  return `<div class="m-phone-wrap${rise ? ' rise' : ''}" role="group" aria-label="${esc(label)}">
    ${hand.back}
    <div class="m-phone${lit ? ' lit' : ''}${buzz ? ' buzz' : ''}"><div class="m-screen">${screen}</div></div>
    ${hand.front}
  </div>`;
}

// Sperrbildschirm: Uhrzeit (aus dem Spiel, z. B. „Sa 18:40"), Benachrichtigungen, Knopf zum Öffnen.
export function lockScreen({ time = '', notes = [], openAction = 'phone-open' }) {
  return `<div class="statusbar"><span>${esc(time.split(' ')[0] ?? '')}</span><span>▮▮▮ ▰</span></div>
    <div class="lock-time">${esc(time.split(' ')[1] ?? time)}</div>
    ${notes.map((n) => `<div class="notif"><b>${esc(n.app ?? 'Chat')} · ${esc(n.from)}</b>${esc(n.text)}</div>`).join('')}
    <button class="ui-btn primary" style="margin:auto 12px 14px" data-action="${esc(openAction)}">${tr('Öffnen', 'Open')}</button>`;
}

// Spielerkarte: Vorderseite (Stärke, Name, Position) und Rückseite (Werte). Umdrehen per Knopf
// (data-flip) oder waagrechtem Wischen (bindFlips). Beide Seiten stehen im DOM – Screenreader
// lesen die aktive Seite, die andere ist aria-hidden.
// open: { action, value, label } – unsichtbare Fläche über der Karte (Antippen = Karte ziehen/öffnen).
export function playerCard({ id, name, pos, rating, kit = 0x2f6f3a, art = '', badge = '', attrs = [], extra = '', flipped = false, w, open = null, sub = '' }) {
  return `<div class="m-card${flipped ? ' flipped' : ''}${isLight(kit) ? ' light-kit' : ''}" data-card="${esc(id)}" style="--kit:${hex(kit)}${w ? `;--card-w:${w}px` : ''}">
    <div class="m-card-inner">
      <div class="m-face front" aria-hidden="${flipped}">
        <div class="m-card-top"><span class="rating">${esc(rating)}</span><span>${badge}</span></div>
        <div class="m-card-art">${art}</div>
        <div class="m-card-name">${esc(name)}</div>
        <div class="m-card-pos">${esc(pos)}</div>${sub ? `<div class="m-card-sub">${sub}</div>` : ''}
      </div>
      <div class="m-face back" aria-hidden="${!flipped}">
        <div class="m-card-sheet"><p class="t-cap" style="margin:0 0 6px">${esc(name)}</p>
          <ul class="m-attrs">${attrs.map(([label, v]) => `<li><span>${esc(label)}</span><b>${esc(v)}</b></li>`).join('')}</ul>${extra}</div>
      </div>
    </div>
    ${open ? `<button class="m-card-open" data-action="${esc(open.action)}" data-value="${esc(open.value)}" aria-label="${esc(open.label)}"></button>` : ''}
    <button class="ui-btn ghost icon m-flip-btn" data-flip="${esc(id)}" aria-pressed="${flipped}" aria-label="${tr('Karte umdrehen', 'Flip card')}">⟲</button>
  </div>`;
}

// Umdrehen: Klick auf [data-flip] oder waagrecht über die Karte wischen. Einmal am Container binden.
// scope: nur Karten innerhalb dieses Selektors lassen sich per Wischen drehen (Knopf geht immer).
export function bindFlips(root, onFlip, { scope = null } = {}) {
  const flip = (card) => {
    const on = !card.classList.contains('flipped');
    card.classList.toggle('flipped', on);
    card.querySelector('.m-face.front')?.setAttribute('aria-hidden', String(on));
    card.querySelector('.m-face.back')?.setAttribute('aria-hidden', String(!on));
    card.querySelector('[data-flip]')?.setAttribute('aria-pressed', String(on));
    onFlip?.(card.dataset.card, on);
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-flip]');
    if (b) flip(b.closest('.m-card'));
  });
  let start = null;
  root.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.m-card');
    start = card && e.pointerType !== 'mouse' && (!scope || card.closest(scope)) ? { card, x: e.clientX, y: e.clientY } : null;
  });
  root.addEventListener('pointerup', (e) => {
    if (!start) return;
    const { card, x, y } = start;
    start = null;
    if (Math.abs(e.clientX - x) > 50 && Math.abs(e.clientX - x) > Math.abs(e.clientY - y) * 1.5) {
      flip(card);
      e.preventDefault();
      root.dataset.swiped = String(performance.now()); // der folgende Klick soll die Karte nicht öffnen
    }
  });
  return flip;
}

// Kleinteile
export const note = (html, { color = '', tilt = -1.2, pin = false, tape = false } = {}) =>
  `<div class="m-note${color ? ` ${color}` : ''}${pin ? ' m-pin' : ''}${tape ? ' m-tape' : ''}" style="--tilt:${tilt}deg">${html}</div>`;
export const stamp = (text, { ok = false, tilt = -8 } = {}) => `<span class="m-stamp${ok ? ' ok' : ''}" style="--tilt:${tilt}deg">${esc(text)}</span>`;
export const magnet = (text, color) => `<span class="m-magnet" style="--c:${hex(color)}">${esc(text)}</span>`;

// Trainerkarte (UI 3.0, Phase 4): ein Befehlspaket als Karte auf dem Tisch. Die ganze Karte ist
// der Knopf (Tippen = ausspielen). lines: was die Karte wirklich verstellt (Befehls-Beschriftungen
// aus commands.js). played: nur beim eben ausgespielten Exemplar – einmal kurz anheben.
export function trainerCard({ action, value, title, lines = [], active = false, played = false, kbd = '', hint = '' }) {
  return `<button class="m-tcard${active ? ' active' : ''}${played ? ' m-play' : ''}" data-action="${esc(action)}" data-value="${esc(value)}" aria-pressed="${active}"${hint ? ` title="${esc(hint)}"` : ''}>
    <span class="m-tcard-title">${kbd ? `<kbd>${esc(kbd)}</kbd>` : ''}${esc(title)}</span>
    <span class="m-tcard-lines">${lines.map((l) => `<i>${esc(l)}</i>`).join('')}</span>
    <span class="m-tcard-foot">${active ? stamp(tr('Aktiv', 'Active'), { ok: true, tilt: -6 }) : `<span class="m-tcard-go">${tr('Aktivieren', 'Activate')}</span>`}</span>
  </button>`;
}
