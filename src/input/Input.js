// Tastatur + Gamepad → Intent. Bildschirm-oben entspricht -z in der Welt.
const KEYS = {
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

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.padPrev = [];
    target.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
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

    this.pressed.clear();
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    return { move: { x, z }, sprint, shootHeld, pass, loft, hold, tackle, poke, switchPlayer, sub, tempo, restart, menu, mute, fx, help };
  }
}
