import { describe, expect, it } from 'vitest';
import { Input } from '../src/input/Input.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { enableManager } from '../src/sim/coach.js';

// Reines Managerspiel: Die Eingabe kennt nur noch Trainer-Tasten, die Spielersteuerung ist weg.
function fakeInput() {
  const handlers = {};
  const target = { addEventListener: (type, fn) => (handlers[type] = fn) };
  const input = new Input(target);
  const press = (code) => handlers.keydown({ code, target: {}, preventDefault() {} });
  return { input, press };
}

describe('Input im Managerspiel', () => {
  it('Spieltasten bleiben ohne Wirkung (neutrale Steuerfelder)', () => {
    const { input, press } = fakeInput();
    for (const code of ['ArrowRight', 'ArrowUp', 'Space', 'KeyW', 'KeyS', 'KeyE', 'KeyA', 'KeyD', 'KeyY', 'KeyR', 'KeyQ', 'ShiftLeft']) press(code);
    const i = input.poll();
    expect(i.move).toEqual({ x: 0, z: 0 });
    for (const k of ['sprint', 'shootHeld', 'pass', 'loft', 'hold', 'tackle', 'poke', 'trick', 'switchPlayer', 'sub']) expect(i[k]).toBe(false);
    expect(i.shout).toBe(null);
  });

  it('Trainer-Tasten wirken: 1–4 Zurufe, X Wechsel, C Tempo, N Ton, G Effekte, H Hilfe, Enter, Esc', () => {
    const { input, press } = fakeInput();
    press('Digit2');
    press('KeyX');
    press('KeyC');
    press('KeyN');
    press('KeyG');
    press('KeyH');
    press('Enter');
    press('Escape');
    const i = input.poll();
    expect(i).toMatchObject({ shout: 2, sub: true, tempo: true, mute: true, fx: true, help: true, restart: true, menu: true });
    expect(input.poll()).toMatchObject({ shout: null, sub: false, tempo: false }); // Flanken sind verbraucht
  });

  it('Bildschirm-Knöpfe (Handy) laufen über tap()', () => {
    const { input } = fakeInput();
    input.tap('sub');
    input.tap('tempo');
    expect(input.poll()).toMatchObject({ sub: true, tempo: true });
  });
});

describe('Spiele ohne Spielersteuerung', () => {
  it('Trainer-Modus mit Eingabe aus Input: KI spielt beide Teams, Elfmeterschießen läuft von selbst durch', () => {
    const { input } = fakeInput();
    let shootouts = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const m = enableManager(createMatch({ seed, pitch: PITCHES.halle, human: true, duration: 4, aiCoach: false }));
      m.knockout = true; // bei Remis Elfmeterschießen (wie Pokal/Relegation)
      let guard = 0;
      while (m.phase !== 'ended' && guard++ < 60 * 400) {
        stepMatch(m, input.poll(), 1 / 60);
        m.events.length = 0;
        expect(m.controlledId).toBe(null);
      }
      expect(m.phase).toBe('ended');
      if (m.shootout) {
        shootouts++;
        expect(m.shootout.done).toBe(true);
      }
    }
    expect(shootouts).toBeGreaterThan(0); // mindestens eine der Partien endete remis
  });
});
