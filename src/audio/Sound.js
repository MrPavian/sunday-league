// Klang komplett synthetisch (WebAudio) – keine Audiodateien nötig.
// Ballkontakte, Trillerpfeife, Pfosten, Jubel, Autoalarm und je Platz eine
// eigene Geräuschkulisse (Verkehr, Vögel, Hunde, Kirchenglocke).

const STORAGE_KEY = 'sunday-league:muted';
const VOLUME_KEY = 'sunday-league:volume';

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8; // 0…1, Regler in den Einstellungen
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === '1';
      const v = Number(localStorage.getItem(VOLUME_KEY));
      if (localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
    } catch {
      // Ohne Speicher bleibt der Ton an.
    }
    this.venue = null;
    this.ambienceTimer = 0;
    // Browser erlauben Ton erst nach einer Nutzeraktion.
    const unlock = () => this.start();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.gain();
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this.makeNoise();
    if (this.venue) this.setVenue(this.venue, true);
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    } catch {
      // egal
    }
    if (this.master) this.master.gain.value = this.gain();
    return this.muted;
  }

  gain() {
    return this.muted ? 0 : 0.75 * this.volume;
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // egal
    }
    if (this.master) this.master.gain.value = this.gain();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- Bausteine -----------------------------------------------------------

  out(pan = 0) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.master);
    return p;
  }

  env(node, t0, attack, peak, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    node.connect(g);
    return g;
  }

  tone(type, f0, f1, dur, peak, dest, t0 = this.ctx.currentTime) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    this.env(o, t0, 0.005, peak, dur).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  noise(filterType, freq, q, dur, peak, dest, t0 = this.ctx.currentTime, attack = 0.005) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    this.env(f, t0, attack, peak, dur).connect(dest);
    src.start(t0, Math.random());
    src.stop(t0 + attack + dur + 0.05);
    return f;
  }

  // --- Effekte ---------------------------------------------------------------

  kick(power = 0.5, pan = 0) {
    const d = this.out(pan);
    this.tone('sine', 110 + power * 40, 45, 0.12, 0.35 + power * 0.5, d);
    this.noise('bandpass', 900, 1.2, 0.05, 0.2 + power * 0.3, d);
  }

  touch(pan = 0) {
    const d = this.out(pan);
    this.tone('sine', 95, 60, 0.07, 0.12, d);
  }

  header(pan = 0) {
    const d = this.out(pan);
    this.tone('sine', 180, 90, 0.09, 0.3, d);
    this.noise('bandpass', 1400, 2, 0.04, 0.12, d);
  }

  whistle(kind = 'short') {
    const d = this.out(0);
    const blow = (t0, dur) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 2900;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 38; // Trillerkugel
      const depth = this.ctx.createGain();
      depth.gain.value = 90;
      lfo.connect(depth).connect(o.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.setValueAtTime(0.18, t0 + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(d);
      o.start(t0);
      lfo.start(t0);
      o.stop(t0 + dur + 0.05);
      lfo.stop(t0 + dur + 0.05);
    };
    const t = this.ctx.currentTime;
    if (kind === 'short') blow(t, 0.25);
    else if (kind === 'sharp') {
      blow(t, 0.12);
      blow(t + 0.16, 0.35);
    } else if (kind === 'long') {
      blow(t, 0.35);
      blow(t + 0.45, 0.9);
    } else if (kind === 'final') {
      blow(t, 0.3);
      blow(t + 0.4, 0.3);
      blow(t + 0.8, 1.1);
    }
  }

  post(pan = 0) {
    const d = this.out(pan);
    this.tone('sine', 520, 510, 0.7, 0.3, d);
    this.tone('sine', 1370, 1360, 0.5, 0.15, d);
    this.tone('triangle', 2210, 2200, 0.3, 0.06, d);
  }

  save(pan = 0) {
    const d = this.out(pan);
    this.tone('sine', 80, 50, 0.15, 0.5, d);
    this.noise('lowpass', 600, 0.7, 0.12, 0.25, d);
  }

  scrape(hard, pan = 0) {
    const d = this.out(pan);
    this.noise(hard ? 'highpass' : 'bandpass', hard ? 2500 : 700, 0.8, 0.35, hard ? 0.18 : 0.12, d, undefined, 0.03);
  }

  whoosh(pan = 0) {
    const d = this.out(pan);
    const f = this.noise('bandpass', 500, 3, 0.2, 0.15, d, undefined, 0.05);
    f.frequency.exponentialRampToValueAtTime(2500, this.ctx.currentTime + 0.25);
  }

  // Ein paar Leute am Rand – kein Stadion, eher ein kollektives "JAAA!".
  cheer(size = 1) {
    const d = this.out(0);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3 + size * 2; i++) {
      this.noise('bandpass', 700 + Math.random() * 900, 4, 1.2 + Math.random() * 0.6, 0.06 * size, d, t + Math.random() * 0.15, 0.15);
    }
    this.tone('sawtooth', 220, 330, 0.5, 0.04, d, t + 0.05);
  }

  groan() {
    const d = this.out(0);
    this.tone('sawtooth', 200, 120, 0.8, 0.05, d);
  }

  // Meckern: unverständliches Gebrummel.
  grumble(pan = 0) {
    const d = this.out(pan);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.tone('sawtooth', 140 + Math.random() * 80, 110 + Math.random() * 40, 0.12, 0.05, d, t + i * 0.13);
  }

  carAlarm(pan = 0) {
    const d = this.out(pan);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) this.tone('square', i % 2 ? 1000 : 780, i % 2 ? 1000 : 780, 0.14, 0.05, d, t + i * 0.16);
  }

  bark(pan = 0) {
    const d = this.out(pan);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      this.tone('sawtooth', 420, 180, 0.12, 0.06, d, t + i * 0.22);
      this.noise('bandpass', 900, 2, 0.08, 0.05, d, t + i * 0.22);
    }
  }

  thunder() {
    const d = this.out(Math.random() - 0.5);
    const t = this.ctx.currentTime;
    this.noise('lowpass', 900, 0.5, 0.25, 0.3, d, t);
    this.noise('lowpass', 160, 0.7, 2.6, 0.35, d, t + 0.15, 0.3);
  }

  siren() {
    const d = this.out(-0.7);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.tone('triangle', i % 2 ? 590 : 440, i % 2 ? 590 : 440, 0.4, 0.04, d, t + i * 0.42);
  }

  hiss() {
    this.noise('highpass', 3500, 0.7, 3, 0.05, this.out(0), undefined, 0.3);
  }

  bird(pan = 0) {
    const d = this.out(pan);
    const t = this.ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 3000 + Math.random() * 1500;
    for (let i = 0; i < n; i++) this.tone('sine', base, base * (1.2 + Math.random() * 0.3), 0.07, 0.03, d, t + i * 0.11);
  }

  bell() {
    const d = this.out(-0.6);
    for (const [f, a] of [[392, 0.05], [784, 0.025], [1175, 0.012]]) this.tone('sine', f, f, 3, a, d);
  }

  carPassing() {
    const d = this.out(Math.random() * 2 - 1);
    const f = this.noise('lowpass', 250, 0.7, 2.5, 0.08, d, undefined, 1.2);
    f.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 1.2);
  }

  // --- Kulisse ----------------------------------------------------------------

  setVenue(id, force = false) {
    if (this.venue === id && !force) return;
    this.venue = id;
    if (!this.ctx) return;
    this.bed?.stop();
    // Grundrauschen: Wind bzw. Stadt.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = id === 'park' ? 900 : 280;
    const g = this.ctx.createGain();
    g.gain.value = id === 'hinterhof' ? 0.025 : 0.035;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.bed = src;
  }

  update(dt) {
    if (!this.ctx || this.muted) return;
    this.ambienceTimer -= dt;
    if (this.ambienceTimer > 0) return;
    this.ambienceTimer = 1.5 + Math.random() * 3;
    const r = Math.random();
    const pan = Math.random() * 2 - 1;
    if (this.venue === 'park') {
      if (r < 0.7) this.bird(pan);
      else if (r < 0.8) this.bark(pan);
    } else if (this.venue === 'parkplatz') {
      if (r < 0.35) this.carPassing();
    } else if (this.venue === 'hinterhof') {
      if (r < 0.25) this.bird(pan);
    } else if (this.venue === 'ascheplatz') {
      if (r < 0.03) this.bell();
      else if (r < 0.2) this.bird(pan);
    }
  }

  // --- Spielereignisse ----------------------------------------------------------

  handle(match, cameraX) {
    if (!this.ctx) return;
    const pan = (match.ball.pos.x - cameraX) / 14;
    const hard = match.pitch.surface.hard;
    for (const e of match.events) {
      switch (e.type) {
        case 'shot':
          this.kick(e.power, pan);
          break;
        case 'pass':
          this.kick(e.lofted ? 0.5 : 0.3, pan);
          break;
        case 'touch':
          this.touch(pan);
          break;
        case 'header':
          this.header(pan);
          break;
        case 'save':
        case 'catch':
          this.save(pan);
          break;
        case 'post':
        case 'bar':
          this.post(pan);
          break;
        case 'goal':
          if (e.team === match.humanTeam || match.humanTeam === null) this.cheer(e.ownGoal ? 1 : 2);
          else this.groan();
          break;
        case 'foul':
          this.whistle('sharp');
          break;
        case 'setpiece':
          if (e.kind === 'kickoff') this.whistle('short');
          break;
        case 'incident':
          if (e.stage !== 'start') break;
          if (e.kind === 'hund') this.bark(pan);
          else if (e.kind === 'polizei') this.siren();
          else if (e.kind === 'sprenger') this.hiss();
          else if (e.kind === 'ersatzschiri' || e.kind === 'zaun') this.grumble(pan);
          break;
        case 'bark':
          this.bark(pan);
          break;
        case 'alarm':
          this.carAlarm(pan);
          break;
        case 'lightning':
          this.thunder();
          break;
        case 'halftime':
          this.whistle('long');
          break;
        case 'end':
          this.whistle('final');
          break;
        case 'slide':
          this.scrape(hard, pan);
          break;
        case 'whiff':
          this.whoosh(pan);
          break;
        case 'card':
          this.whistle('sharp');
          break;
        case 'no_call':
        case 'complain':
          this.grumble(pan);
          break;
        case 'car':
          this.carAlarm(pan);
          break;
      }
    }
  }
}
