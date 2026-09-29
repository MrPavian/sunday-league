// Bausteine der Vereinswelt (UI 3.0, Phase 1): Spielerkarte mit Rückseite, Handy mit Hand,
// Zettel, Stempel. Liefern HTML-Strings wie ds.js; Styles in src/world.css.
// Die Grafik (Hand, Kartenrücken) ist eine austauschbare Schicht – die Bedienung hängt nicht daran.
import { tr } from '../core/i18n.js';
import { esc } from './ds.js';

const hex = (n) => (typeof n === 'number' ? `#${n.toString(16).padStart(6, '0')}` : n);

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

// Hand in drei Teilen: Handfläche (hinter dem Handy), Daumen links und Fingerspitzen rechts (davor).
const PALM = [
  '......kkkkkkk...',
  '....kksssssssk..',
  '...kssssssssssk.',
  '..ksssssssssssk.',
  '.kssssssssssssk.',
  '.ksssssssssssSk.',
  'kssssssssssSSk..',
  'ksssssssssSSk...',
  'kSssssssSSSk....',
  '.kSSsSSSSSk.....',
  '..kSSSSSSk......',
  '...ksssssk......',
  '...ksssssk......',
  '...kSssssk......',
];
const THUMB = ['..kkkk..', '.kssssk.', 'kssssssk', 'ksssssSk', 'ksssssSk', 'kssssSSk', '.kssssSk', '.ksssSSk', '.kssssSk', '..ksssSk', '..kssssk', '..ksssSk', '..kssssk', '...kkkk.'];
// Vier Finger, die um die rechte Kante greifen – aneinander, damit sie als Hand lesen.
const FINGERS = ['kkkk..', 'sssskk', 'SsssSk', 'kkkkk.', 'sssskk', 'SsssSk', 'kkkkk.', 'sssskk', 'SsssSk', 'kkkkk.', 'sssskk', 'SsssSk', 'kkkk..'];

export function handLayers(skin = 0xe0ac80) {
  const pal = { k: '#000', s: hex(skin), S: shade(skin) };
  return {
    back: pixelSVG(PALM, pal, 'm-hand-back'),
    front: `${pixelSVG(THUMB, pal, 'm-hand-front m-thumb')}${pixelSVG(FINGERS, pal, 'm-hand-front m-fingers')}`,
  };
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
export function playerCard({ id, name, pos, rating, kit = 0x2f6f3a, art = '', badge = '', attrs = [], extra = '', flipped = false, w }) {
  return `<div class="m-card${flipped ? ' flipped' : ''}" data-card="${esc(id)}" style="--kit:${hex(kit)}${w ? `;--card-w:${w}px` : ''}">
    <div class="m-card-inner">
      <div class="m-face front" aria-hidden="${flipped}">
        <div class="m-card-top"><span class="rating">${esc(rating)}</span><span>${badge}</span></div>
        <div class="m-card-art">${art}</div>
        <div class="m-card-name">${esc(name)}</div>
        <div class="m-card-pos">${esc(pos)}</div>
      </div>
      <div class="m-face back" aria-hidden="${!flipped}">
        <div class="m-card-sheet"><p class="t-cap" style="margin:0 0 6px">${esc(name)}</p>
          <ul class="m-attrs">${attrs.map(([label, v]) => `<li><span>${esc(label)}</span><b>${esc(v)}</b></li>`).join('')}</ul>${extra}</div>
      </div>
    </div>
    <button class="ui-btn ghost icon m-flip-btn" data-flip="${esc(id)}" aria-pressed="${flipped}" aria-label="${tr('Karte umdrehen', 'Flip card')}">⟲</button>
  </div>`;
}

// Umdrehen: Klick auf [data-flip] oder waagrecht über die Karte wischen. Einmal am Container binden.
export function bindFlips(root, onFlip) {
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
    start = card && e.pointerType !== 'mouse' ? { card, x: e.clientX, y: e.clientY } : null;
  });
  root.addEventListener('pointerup', (e) => {
    if (!start) return;
    const { card, x, y } = start;
    start = null;
    if (Math.abs(e.clientX - x) > 50 && Math.abs(e.clientX - x) > Math.abs(e.clientY - y) * 1.5) flip(card);
  });
  return flip;
}

// Kleinteile
export const note = (html, { color = '', tilt = -1.2, pin = false, tape = false } = {}) =>
  `<div class="m-note${color ? ` ${color}` : ''}${pin ? ' m-pin' : ''}${tape ? ' m-tape' : ''}" style="--tilt:${tilt}deg">${html}</div>`;
export const stamp = (text, { ok = false, tilt = -8 } = {}) => `<span class="m-stamp${ok ? ' ok' : ''}" style="--tilt:${tilt}deg">${esc(text)}</span>`;
export const magnet = (text, color) => `<span class="m-magnet" style="--c:${hex(color)}">${esc(text)}</span>`;
