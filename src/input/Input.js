// Tastatur + Gamepad → Intent. Bildschirm-oben entspricht -z in der Welt.
import { tr } from '../core/i18n.js';

const DEFAULT_KEYS = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  shoot: ['KeyW', 'Space'],
  pass: ['KeyS'],
  loft: ['KeyE'], // hoher Ball / Flanke
  hold: ['KeyA'], // mit Ball abschirmen, ohne Ball Gegner festhalten
  tackle: ['KeyD'], // Grätsche
  poke: ['KeyY', 'KeyZ'], // Zweikampf im Stehen – Y auf QWERTZ ist physisch KeyZ
  switchPlayer: ['KeyQ'],
  sub: ['KeyX'],
  tempo: ['KeyC'],
  mute: ['KeyN'],
  fx: ['KeyG'],
  restart: ['Enter'],
  menu: ['Escape', 'KeyM'],
  help: ['KeyH'],
};

// Frei belegbar sind die Tasten fürs Spielen; Menü-, Hilfe- und Sondertasten bleiben fest.
export const REBINDABLE = ['up', 'down', 'left', 'right', 'sprint', 'shoot', 'pass', 'loft', 'hold', 'tackle', 'poke', 'switchPlayer', 'sub'];
export const ACTION_LABELS = tr(
  { up: 'Hoch', down: 'Runter', left: 'Links', right: 'Rechts', sprint: 'Sprinten', shoot: 'Schuss', pass: 'Pass', loft: 'Hoher Ball', hold: 'Halten', tackle: 'Grätsche', poke: 'Stochern', switchPlayer: 'Spieler wechseln', sub: 'Auswechseln' },
  { up: 'Up', down: 'Down', left: 'Left', right: 'Right', sprint: 'Sprint', shoot: 'Shoot', pass: 'Pass', loft: 'Lofted ball', hold: 'Hold', tackle: 'Slide tackle', poke: 'Poke', switchPlayer: 'Switch player', sub: 'Substitute' },
);
const BIND_KEY = 'sunday-league:keys';

function loadBindings() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(BIND_KEY) ?? 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch {
    // kaputter Eintrag – Standard nehmen
  }
  return {};
}

// Aktuelle Belegung: gespeicherte Änderungen über den Standard gelegt.
const KEYS = { ...DEFAULT_KEYS };
for (const [action, codes] of Object.entries(loadBindings())) if (REBINDABLE.includes(action) && Array.isArray(codes) && codes.length) KEYS[action] = codes;

export const bindingOf = (action) => KEYS[action];

// Neue Taste für eine Aktion. Liegt sie schon auf einer anderen Aktion, tauschen
// beide – so bleibt nichts unbelegt.
export function setBinding(action, code) {
  if (!REBINDABLE.includes(action)) return;
  const old = KEYS[action];
  for (const other of REBINDABLE) {
    if (other !== action && KEYS[other].includes(code)) KEYS[other] = KEYS[other].map((c) => (c === code ? old[0] : c));
  }
  KEYS[action] = [code];
  saveBindings();
}

export function resetBindings() {
  for (const a of REBINDABLE) KEYS[a] = DEFAULT_KEYS[a];
  try {
    globalThis.localStorage?.removeItem(BIND_KEY);
  } catch {
    // egal
  }
}

function saveBindings() {
  const changed = Object.fromEntries(REBINDABLE.filter((a) => KEYS[a].join() !== DEFAULT_KEYS[a].join()).map((a) => [a, KEYS[a]]));
  try {
    globalThis.localStorage?.setItem(BIND_KEY, JSON.stringify(changed));
  } catch {
    // dann gilt die Belegung nur bis zum Neuladen
  }
}

// Anzeigename einer Taste („KeyW" → „W", „ArrowUp" → „↑").
export function keyName(code) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', Space: tr('Leertaste', 'Space'), ControlLeft: 'Strg', ControlRight: 'Strg', AltLeft: 'Alt', Enter: 'Enter', Tab: 'Tab', Backspace: '⌫' };
  return names[code] ?? code.replace(/^Numpad/, 'Num ');
}

// Anzeige für die Hilfe: erste belegte Taste; für Y/Z je nach Sprache die passende.
export function keyLabel(action) {
  const codes = KEYS[action];
  if (action === 'poke' && codes.join() === DEFAULT_KEYS.poke.join()) return tr('Y', 'Z');
  return keyName(codes[0]);
}

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.padPrev = [];
    // Knöpfe auf dem Bildschirm (Handy, Trainer-Modus) schieben hier ihre Befehle rein.
    this.virtual = new Set();
    this.shouts = [];
    target.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  // Zuruf oder Befehl vom Bildschirm-Knopf für den nächsten Schritt vormerken.
  tap(action) {
    this.virtual.add(action);
  }

  shoutNow(id) {
    this.shouts.push(id);
  }

  held(action) {
    return KEYS[action].some((k) => this.down.has(k));
  }

  wasPressed(action) {
    return KEYS[action].some((k) => this.pressed.has(k));
  }

  // Liefert den Intent für einen Simulationsschritt; Tastendruck-Flanken
  // werden dabei verbraucht.
  poll() {
    let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    let z = (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
    let sprint = this.held('sprint');
    let shootHeld = this.held('shoot');
    let pass = this.wasPressed('pass');
    let loft = this.wasPressed('loft');
    let hold = this.held('hold');
    let tackle = this.wasPressed('tackle');
    let poke = this.wasPressed('poke');
    const tempo = this.wasPressed('tempo');
    let switchPlayer = this.wasPressed('switchPlayer');
    let sub = this.wasPressed('sub');
    const mute = this.wasPressed('mute');
    const fx = this.wasPressed('fx');
    const restart = this.wasPressed('restart');
    const menu = this.wasPressed('menu');
    const help = this.wasPressed('help');

    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const [ax, ay] = pad.axes;
      if (Math.hypot(ax, ay) > 0.2) {
        x = ax;
        z = ay;
      }
      const b = (i) => !!pad.buttons[i]?.pressed;
      const edge = (i) => b(i) && !this.padPrev[i];
      shootHeld ||= b(2); // X
      pass ||= edge(0); // A
      loft ||= edge(1); // B
      tackle ||= edge(3); // Y
      hold ||= b(6); // LT
      poke ||= edge(11); // R3
      switchPlayer ||= edge(4); // LB
      sub ||= edge(8); // Back/Select
      sprint ||= b(5) || b(7); // RB / RT
      this.padPrev = pad.buttons.map((btn) => btn.pressed);
    }

    // Zifferntasten 1–7: Zurufe im Trainer-Modus.
    for (const code of this.pressed) if (/^Digit[1-7]$/.test(code)) this.shouts.push(Number(code.slice(5)));
    const v = this.virtual;
    sub ||= v.has('sub');
    const vt = v.has('tempo');
    const vr = v.has('restart');
    const vm = v.has('menu');
    const vh = v.has('help');
    v.clear();
    const shout = this.shouts.shift() ?? null;
    this.pressed.clear();
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    return { move: { x, z }, sprint, shootHeld, pass, loft, hold, tackle, poke, switchPlayer, sub, tempo: tempo || vt, restart: restart || vr, menu: menu || vm, mute, fx, help: help || vh, shout };
  }
}
