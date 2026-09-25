// Tastatur + Gamepad → Intent. Bildschirm-oben entspricht -z in der Welt.
const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  shoot: ['Space', 'KeyK'],
  pass: ['KeyJ', 'KeyE'],
  tackle: ['KeyL', 'ControlLeft'],
  switchPlayer: ['KeyQ'],
  restart: ['Enter'],
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
    let tackle = this.wasPressed('tackle');
    let switchPlayer = this.wasPressed('switchPlayer');
    const restart = this.wasPressed('restart');
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
      shootHeld ||= b(2) || b(1); // X / B
      pass ||= edge(0); // A
      tackle ||= edge(3); // Y
      switchPlayer ||= edge(4); // LB
      sprint ||= b(5) || b(7); // RB / RT
      this.padPrev = pad.buttons.map((btn) => btn.pressed);
    }

    this.pressed.clear();
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    return { move: { x, z }, sprint, shootHeld, pass, tackle, switchPlayer, restart, help };
  }
}
