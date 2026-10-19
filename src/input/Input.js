// Tastatur (und Bildschirm-Knöpfe) → Intent. Reines Managerspiel: Es gibt keine Spielersteuerung mehr,
// nur Trainer-Kürzel (Zurufe 1–4, Wechseltafel) sowie Tempo-, Ton-, Effekt-, Hilfe- und Menütaste.
// Die Felder für Laufen/Schuss/Pass bleiben als neutrale Werte im Intent, damit die Simulation
// (stepMatch) unverändert dasselbe Eingabeformat bekommt.

const KEYS = {
  sub: ['KeyX'], // Wechseltafel
  tempo: ['KeyC'],
  mute: ['KeyN'],
  fx: ['KeyG'],
  restart: ['Enter'],
  menu: ['Escape', 'KeyM'],
  help: ['KeyH'],
};

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export const isTyping = (el) => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.padPrev = [];
    // Knöpfe auf dem Bildschirm (Handy) schieben hier ihre Befehle rein.
    this.virtual = new Set();
    this.shouts = [];
    target.addEventListener('keydown', (e) => {
      // In Eingabefeldern (Vereinsname, Spielername …) gehören Leertaste und Pfeile dem Text, nicht dem Spiel.
      if (isTyping(e.target)) return;
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

  wasPressed(action) {
    return KEYS[action].some((k) => this.pressed.has(k));
  }

  // Liefert den Intent für einen Simulationsschritt; Tastendruck-Flanken werden dabei verbraucht.
  poll() {
    let sub = this.wasPressed('sub');
    const tempo = this.wasPressed('tempo');
    const mute = this.wasPressed('mute');
    const fx = this.wasPressed('fx');
    const restart = this.wasPressed('restart');
    const menu = this.wasPressed('menu');
    const help = this.wasPressed('help');

    // Gamepad: nur die Wechseltafel (Back/Select) bleibt als Trainer-Kürzel.
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      sub ||= !!pad.buttons[8]?.pressed && !this.padPrev[8];
      this.padPrev = pad.buttons.map((btn) => btn.pressed);
    }

    // Zifferntasten 1–4: Zurufe im Trainer-Modus.
    for (const code of this.pressed) if (/^Digit[1-4]$/.test(code)) this.shouts.push(Number(code.slice(5)));
    const v = this.virtual;
    sub ||= v.has('sub');
    const vt = v.has('tempo');
    const vr = v.has('restart');
    const vm = v.has('menu');
    const vh = v.has('help');
    const vmu = v.has('mute');
    v.clear();
    const shout = this.shouts.shift() ?? null;
    this.pressed.clear();
    return {
      move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, loft: false, hold: false, tackle: false, poke: false, trick: false, switchPlayer: false,
      sub, tempo: tempo || vt, restart: restart || vr, menu: menu || vm, mute: mute || vmu, fx, help: help || vh, shout,
    };
  }
}
