// Musik (ROADMAP Phase 7 „Musik", 2026-11-09): komplett synthetisch wie der übrige Klang, eigene Komposition, keine Dateien.
//  - Vereinsheim-Thema: ruhige Schleife (16 Takte, 84 Schläge je Minute) – weiche Flächen, Bass, gezupftes Arpeggio und eine
//    kleine Melodie aus der Pentatonik, fest ausgewürfelt (gleiche Musik bei jedem Start).
//  - Einlaufmusik: kurze Fanfare vor dem Anpfiff, wenn der Platz eine Lautsprecheranlage hat (Stadionsprecher, announcer.js).
// Leise unter allem anderen (Anteil 0,35 der Lautstärke), in den Einstellungen abschaltbar. Im Spiel schweigt das Thema.
import { createRng } from '../core/rng.js';

const KEY = 'sunday-league:music';
export function musicOn() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}
export function setMusicOn(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // egal
  }
}

const BPM = 84;
const BEAT = 60 / BPM;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Akkorde (MIDI-Grundtöne + Intervalle) je Takt: F – Dm – B – C, dann F – Am – B – C (zweimal = 16 Takte).
const CHORDS = [
  [53, [0, 4, 7, 11]],
  [50, [0, 3, 7, 10]],
  [46, [0, 4, 7, 11]],
  [48, [0, 4, 7, 10]],
  [53, [0, 4, 7, 11]],
  [45, [0, 3, 7, 10]],
  [46, [0, 4, 7, 11]],
  [48, [0, 4, 7]],
];
const PENTA = [65, 67, 69, 72, 74, 77, 79]; // F-Dur-Pentatonik

function melody() {
  const rng = createRng(1982);
  const bars = [];
  for (let b = 0; b < 16; b++) {
    const notes = [];
    let beat = 0;
    while (beat < 4) {
      const len = rng.pick([0.5, 1, 1, 1.5, 2]);
      if (rng.chance(0.75)) notes.push({ beat, len: Math.min(len, 4 - beat), n: PENTA[rng.int(0, PENTA.length - 1)] });
      beat += len;
    }
    bars.push(notes);
  }
  return bars;
}

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.on = musicOn();
    this.want = null; // 'theme' | null
    this.timer = null;
    this.melody = melody();
  }

  get ctx() {
    return this.sound.ctx;
  }

  ensureBus() {
    if (this.bus || !this.ctx) return;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.35;
    this.bus.connect(this.sound.master);
  }

  setOn(on) {
    this.on = on;
    setMusicOn(on);
    if (!on) this.stopTheme();
    else if (this.want) this.theme();
  }

  // Vereinsheim-Thema starten (oder merken, bis der Ton freigegeben ist).
  theme() {
    this.want = 'theme';
    if (!this.on || !this.ctx || this.timer) return;
    this.ensureBus();
    this.bar = 0;
    this.next = this.ctx.currentTime + 0.2;
    this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.5);
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stopTheme() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus && this.ctx) this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); // sanft aus
  }

  leave() {
    this.want = null;
    this.stopTheme();
  }

  // Takte einplanen, solange sie in den nächsten 0,6 s beginnen.
  schedule() {
    if (!this.ctx || this.sound.silent()) return;
    while (this.next < this.ctx.currentTime + 0.6) {
      this.playBar(this.bar, this.next);
      this.bar = (this.bar + 1) % 16;
      this.next += 4 * BEAT;
    }
  }

  voice(type, freq, t, dur, peak, attack = 0.02) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    o.connect(f).connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  playBar(bar, t) {
    const [root, iv] = CHORDS[bar % CHORDS.length];
    const len = 4 * BEAT;
    for (const i of iv) this.voice('triangle', midi(root + 12 + i), t, len * 0.98, 0.022, 0.4); // Fläche
    this.voice('sine', midi(root - 12), t, BEAT * 1.8, 0.09); // Bass
    this.voice('sine', midi(root - 12 + 7), t + 2 * BEAT, BEAT * 1.6, 0.07);
    // Arpeggio in Achteln.
    for (let k = 0; k < 8; k++) this.voice('triangle', midi(root + 24 + iv[k % iv.length]), t + k * BEAT * 0.5, BEAT * 0.45, 0.018, 0.005);
    if (bar >= 4) for (const n of this.melody[bar]) this.voice('square', midi(n.n), t + n.beat * BEAT, n.len * BEAT * 0.9, 0.02, 0.01);
  }

  // Einlaufmusik: kurze Fanfare (Bläser aus Sägezahn), eigene Tonfolge.
  walkout() {
    if (!this.on || !this.ctx || this.sound.silent()) return;
    this.ensureBus();
    this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus.gain.setValueAtTime(0.35, this.ctx.currentTime);
    const t = this.ctx.currentTime + 0.1;
    const seq = [[65, 0, 0.5], [69, 0.5, 0.5], [72, 1, 0.5], [77, 1.5, 1.2], [76, 3, 0.4], [77, 3.5, 0.4], [79, 4, 0.5], [81, 4.5, 1.6]];
    for (const [n, b, l] of seq) {
      this.voice('sawtooth', midi(n), t + b * 0.32, l * 0.32 + 0.2, 0.05, 0.02);
      this.voice('sawtooth', midi(n - 12), t + b * 0.32, l * 0.32 + 0.2, 0.03, 0.02);
    }
    for (const [r, b] of [[53, 0], [58, 1.5], [60, 3], [53, 4.5]]) this.voice('triangle', midi(r - 12), t + b * 0.32, 0.6, 0.08);
  }
}
