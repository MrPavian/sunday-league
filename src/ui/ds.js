// Designsystem (UI 2.0): kleine Bausteine als HTML-Strings, dazu Bottom Sheet und Vibration.
// Die Bildschirme rendern weiter mit Template-Strings – das hier sorgt nur dafür, dass alle
// dieselben Klassen, Größen und Zustände benutzen (Styles in src/ds.css).
import { tr } from '../core/i18n.js';

// Farbzahl 0xRRGGBB → „#rrggbb".
export const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// attrs: { action, value, … } → data-action="…" data-value="…"; andere Schlüssel als echte Attribute.
function attrs(a = {}) {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (k === 'action' || k === 'value' ? `data-${k}="${esc(v)}"` : v === true ? k : `${k}="${esc(v)}"`))
    .join(' ');
}

// Knopf. kind: primary | secondary | ghost | danger | toggle | icon (auch kombiniert: 'primary big').
export function button(label, { kind = '', pressed, badge, ...rest } = {}) {
  const cls = ['ui-btn', ...kind.split(' ').filter(Boolean)].join(' ');
  const aria = pressed === undefined ? '' : ` aria-pressed="${pressed ? 'true' : 'false'}"`;
  return `<button class="${cls}"${aria} ${attrs(rest)}>${label}${badge ? `<span class="ui-badge">${esc(badge)}</span>` : ''}</button>`;
}

// Tabs: items [[id, label, badge?]], aktiv = id. Jeder Tab ist ein Knopf mit data-action.
export function tabs(items, active, action = 'tab') {
  return `<div class="ui-tabs" role="tablist">${items
    .map(([id, label, badge]) => `<button role="tab" aria-selected="${id === active}" data-action="${esc(action)}" data-value="${esc(id)}">${label}${badge ? ` <span class="ui-badge">${esc(badge)}</span>` : ''}</button>`)
    .join('')}</div>`;
}

// Segment-Regler für diskrete Stufen (keine erfundenen Zwischenwerte).
// options [[value, label]], current = value oder null. ends: Beschriftung links/rechts (optional).
export function segmented(group, options, current, { action = 'seg', ends } = {}) {
  const label = ends ? `<div class="ui-seg-label"><span>${ends[0]}</span><span>${ends[1]}</span></div>` : '';
  return `${label}<div class="ui-seg" role="group">${options
    .map(([value, text]) => `<button aria-pressed="${value === current}" data-action="${esc(action)}" data-group="${esc(group)}" data-value="${esc(value)}">${text}</button>`)
    .join('')}</div>`;
}

export const chip = (label, { color, plain = false } = {}) => `<span class="ui-chip${plain ? ' plain' : ''}"${color ? ` style="--c:${esc(color)}"` : ''}>${label}</span>`;

// Kennzahl groß mit Beschriftung.
export const stat = (value, label) => `<div class="ui-stat"><b>${value}</b><span>${label}</span></div>`;

// Vergleichszeile a : Beschriftung : b. tap → Knopf mit data-action (für Details).
export function versus(a, label, b, tapAction) {
  const inner = `<b>${a}</b><span>${label}</span><b>${b}</b>`;
  return tapAction ? `<button class="ui-vs ui-btn ghost block" ${attrs(tapAction)}>${inner}</button>` : `<div class="ui-vs">${inner}</div>`;
}

// Balken mit Zahl daneben (0–1).
export const meter = (v, text, color) => `<div class="ui-meter"><i style="--v:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%${color ? `;--c:${color}` : ''}"></i><span>${text}</span></div>`;

// ---------- Vibration ----------
// Ganz dezent (kurze Impulse) und abschaltbar (Einstellungen → Vibration). Wo das Gerät oder
// der Browser nicht vibrieren kann, passiert einfach nichts.
const HAPTIC_KEY = 'sunday-league:haptics';
export const HAPTICS = { tap: 8, select: 12, message: [14, 60, 14], confirm: 18 };

export function hapticsOn() {
  try {
    return localStorage.getItem(HAPTIC_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setHaptics(on) {
  try {
    localStorage.setItem(HAPTIC_KEY, on ? '1' : '0');
  } catch {
    // egal
  }
}

export function haptic(kind = 'tap', nav = globalThis.navigator) {
  if (!hapticsOn() || typeof nav?.vibrate !== 'function') return false;
  const pattern = HAPTICS[kind] ?? HAPTICS.tap;
  try {
    return nav.vibrate(pattern) !== false;
  } catch {
    return false;
  }
}

// ---------- Bottom Sheet ----------
// Eine Instanz je Blatt. Öffnen/Schließen per Klasse (CSS-Übergang), Schließen über
// Hintergrund, Esc, Griff nach unten ziehen oder data-action="sheet-close".
// Kein eigener Animations-Loop: die Bewegung macht CSS, JS hört nur auf Ereignisse.
export class Sheet {
  constructor({ id, onClose } = {}) {
    this.onClose = onClose;
    this.scrim = Object.assign(document.createElement('div'), { className: 'ui-scrim', hidden: true });
    this.el = Object.assign(document.createElement('section'), { className: 'ui-sheet', hidden: true });
    if (id) this.el.id = id;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    document.body.append(this.scrim, this.el);
    this.scrim.addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => e.target.closest('[data-action="sheet-close"]') && this.close());
    // Capture-Phase: Esc schließt nur das Blatt und erreicht die Spieltasten nicht (dort ist Esc „Menü").
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.isOpen && e.code === 'Escape') {
          e.stopImmediatePropagation();
          e.preventDefault();
          this.close();
        }
      },
      true,
    );
    this.bindDrag();
  }

  get isOpen() {
    return !this.el.hidden && this.el.classList.contains('open');
  }

  // html: { title, body, footer } – Strings. Titel ist Pflicht (Barrierefreiheit).
  open({ title, body = '', footer = '' }) {
    this.el.innerHTML = `<div class="grip" aria-hidden="true"></div>
      <header><h3 class="t-h3">${title}</h3>${button('✕', { kind: 'ghost icon', action: 'sheet-close', 'aria-label': tr('Schließen', 'Close') })}</header>
      <div class="body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}`;
    this.el.setAttribute('aria-label', String(title).replace(/<[^>]+>/g, ''));
    this.scrim.hidden = false;
    this.el.hidden = false;
    // Erst im nächsten Bild die Klasse setzen, sonst springt der Übergang.
    requestAnimationFrame(() => {
      this.scrim.classList.add('open');
      this.el.classList.add('open');
    });
    this.el.querySelector('.body button, footer button, header button')?.focus({ preventScroll: true });
  }

  // Inhalt neu setzen, ohne zu schließen (z. B. nach einer Auswahl).
  update(body) {
    const b = this.el.querySelector('.body');
    if (b) b.innerHTML = body;
  }

  close() {
    if (this.el.hidden) return;
    this.el.classList.remove('open');
    this.scrim.classList.remove('open');
    const done = () => {
      this.el.hidden = true;
      this.scrim.hidden = true;
    };
    // Ohne Übergang (reduzierte Bewegung) sofort, sonst nach dem Übergang.
    const d = parseFloat(getComputedStyle(this.el).transitionDuration) || 0;
    if (d < 0.02) done();
    else setTimeout(done, d * 1000 + 20);
    this.onClose?.();
  }

  // Am Griff nach unten ziehen schließt (ab 80 px).
  bindDrag() {
    let y0 = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.grip')) return;
      y0 = e.clientY;
      this.el.setPointerCapture?.(e.pointerId);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (y0 === null) return;
      const dy = Math.max(0, e.clientY - y0);
      this.el.style.transform = `translate(-50%, ${dy}px)`;
    });
    const end = (e) => {
      if (y0 === null) return;
      const dy = e.clientY - y0;
      y0 = null;
      this.el.style.transform = '';
      if (dy > 80) this.close();
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }
}

// ---------- Pixel-Icons (9 × 9, harte Kanten, Farbe = Textfarbe) ----------
const ICONS = {
  home: ['....#....', '...###...', '..#####..', '.#######.', '#########', '.##...##.', '.##.#.##.', '.##.#.##.', '.#######.'],
  team: ['.##...##.', '####.####', '#########', '.#######.', '..#####..', '..#####..', '..#####..', '..#####..', '..#####..'],
  season: ['#.#####.#', '#.#####.#', '.#######.', '..#####..', '...###...', '....#....', '....#....', '..#####..', '..#####..'],
  club: ['#........', '#######..', '#######..', '#######..', '#........', '#........', '#........', '#........', '###......'],
  pub: ['.#####...', '#######..', '.#####.#.', '.#####..#', '.#####..#', '.#####..#', '.#####.#.', '.#####...', '.#####...'],
  phone: ['..#####..', '..#...#..', '..#...#..', '..#...#..', '..#...#..', '..#...#..', '..#####..', '..##.##..', '..#####..'],
  gear: ['....#....', '.#.###.#.', '..#####..', '.##...##.', '###...###', '.##...##.', '..#####..', '.#.###.#.', '....#....'],
  exit: ['######...', '#....#...', '#....#.#.', '#.#..####', '#....#.#.', '#....#...', '#....#...', '#....#...', '######...'],
};
export const ICON_NAMES = Object.keys(ICONS);

export function icon(name, size = 24) {
  const rows = ICONS[name];
  if (!rows) return '';
  const rects = rows.flatMap((row, y) => [...row].map((ch, x) => (ch === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
  return `<svg class="ui-icon" viewBox="0 0 9 9" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}
