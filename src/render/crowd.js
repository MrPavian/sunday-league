// Zuschauer 2.0: eine günstige, lebendige Menge statt einzelner Spielerfiguren.
//
// Jeder Zuschauer ist eine Instanz: Körper (Beine, Rumpf, Schal, Kopf, Haare, Mütze)
// in einem InstancedMesh, beide Arme in einem zweiten. Ein gemeinsames Toon-Material,
// ein Atlas von 32 × 32 Pixeln: Je Zuschauer ein 4 × 4-Feld mit seinen Farben (Haut,
// Haare, Oberteil, Hose, Schal, Mütze …). Sitzen und Stehen stecken in derselben
// Geometrie – der Vertex-Shader blendet die passenden Beine ein. Damit kostet die ganze
// Crowd 2 Draw Calls plus 1 für den Schatten, egal wie viele Leute da stehen.
//
// Bewegung: Die Pose entsteht auf der CPU in 10–12 Takten pro Sekunde und nur für die
// gerade aktiven Zuschauer (Budget je Qualitätsstufe); alle anderen stehen still. Auf
// Spielereignisse (Tor, Schuss, Parade, Foul, Karte, Abpfiff) reagiert die Menge
// zeitversetzt und je nach Anhängerschaft.
import * as THREE from 'three';
import { generatePlayer } from '../sim/generator.js';
import { createRng } from '../core/rng.js';
import { pixelTexture, toon } from './materials.js';
import { currentQuality } from './quality.js';

const ATLAS = 32;
const CELL = 4;
const PER_ROW = ATLAS / CELL; // 8 × 8 = 64 Zuschauer-Paletten
export const MAX_TILES = PER_ROW * PER_ROW;
// Farbfeld eines Zuschauers (x, y im 4 × 4-Feld).
const TEX = { skin: [0, 0], hair: [1, 0], top: [2, 0], trim: [3, 0], bottom: [0, 1], shoes: [1, 1], scarf: [2, 1], hat: [3, 1], eye: [0, 2] };
const SIT_DROP = 0.42; // so viel tiefer sitzt der Oberkörper

const TOPS = [0x5a6b7d, 0x8c3b3b, 0x3f5e45, 0xc9b27a, 0x2f2f3a, 0x9a6b4f, 0x6b4f8c, 0xd8d0c0, 0x2c4f7a, 0x7a7f86, 0xb5562e, 0x4a4a4a];
const WARM_TOPS = [0xe8e4d8, 0xd9c35a, 0x7fb0d8, 0xe07a5a, 0x9ac27a, 0xf2f2f2];
const BOTTOMS = [0x3b4d6b, 0x2a2a2a, 0x5a5048, 0x6b6b6b, 0x3a4a3a];
const HATS = [0x2a2a2a, 0x8c3b3b, 0x2c4f7a, 0x5a5a5a, 0xc9b27a];

// Zuschauer-Platz: ein unsichtbarer Platzhalter, den buildCrowd einsammelt.
// Verbraucht die Zufallszahlen wie früher – der Rest des Spielorts bleibt unverändert.
export function spectatorSlot(rng, { x, z, y = 0, facing = 0, sitting = false } = {}) {
  const person = generatePlayer(rng, { role: 'fan' });
  const top = rng.pick(TOPS);
  const bottom = rng.pick(BOTTOMS);
  rng.pick(BOTTOMS); // früher: Stutzenfarbe
  const g = new THREE.Group();
  // Sitzend: y ist die Sitzfläche, die Oberschenkel liegen darauf.
  g.userData.crowdSlot = { x, y: sitting ? y - 0.38 : y, z, facing, sitting, look: person.look, top, bottom };
  return g;
}

// Weitere Plätze auf einer Tribüne oder am Zaun – mit eigenem Zufall, damit der
// Spielort sonst genauso aussieht wie vorher.
export function crowdRow(seed, { x0, x1, z, y = 0, n, sitting = false, facing = 0, jitter = 0.25, dz = 0 }) {
  const rng = createRng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n + rng.range(-jitter, jitter);
    out.push(spectatorSlot(rng, { x, z: z + rng.range(-dz, dz), y, facing: facing + rng.range(-0.25, 0.25), sitting }));
  }
  return out;
}

const hash = (a, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 0x7f4a7c15, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// --- Geometrie ------------------------------------------------------------------------
// Teile: part 0 = immer, 1 = nur stehend, 2 = nur sitzend. UV zeigt auf ein Texel des
// ersten Farbfelds; der Shader verschiebt je Instanz auf ihr eigenes Feld.
function texUV(name) {
  const [cx, cy] = TEX[name];
  return [(cx + 0.5) / ATLAS, 1 - (cy + 0.5) / ATLAS];
}
function assemble(parts) {
  const pos = [];
  const nor = [];
  const uv = [];
  const part = [];
  for (const [w, h, d, x, y, z, tex, p = 0, taper = 1] of parts) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (taper !== 1) {
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) if (a.getY(i) < 0) a.setX(i, a.getX(i) * taper);
      g.computeVertexNormals();
    }
    g.translate(x, y, z);
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    const t = texUV(tex);
    for (let i = 0; i < g.attributes.position.count; i++) {
      uv.push(...t);
      part.push(p);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  return geo;
}

// Körper: Füße bei y = 0, Blick nach +z. Maße wie ein Spieler von der Stange – bewusst schlicht.
function bodyGeometry() {
  return assemble([
    // stehend: Beine und Schuhe
    [0.13, 0.78, 0.14, -0.08, 0.45, 0, 'bottom', 1], [0.13, 0.78, 0.14, 0.08, 0.45, 0, 'bottom', 1],
    [0.14, 0.07, 0.2, -0.08, 0.035, 0.03, 'shoes', 1], [0.14, 0.07, 0.2, 0.08, 0.035, 0.03, 'shoes', 1],
    // sitzend: Oberschenkel nach vorn, Unterschenkel runter
    [0.13, 0.14, 0.44, -0.08, 0.45, 0.17, 'bottom', 2], [0.13, 0.14, 0.44, 0.08, 0.45, 0.17, 'bottom', 2],
    [0.12, 0.42, 0.13, -0.08, 0.23, 0.36, 'bottom', 2], [0.12, 0.42, 0.13, 0.08, 0.23, 0.36, 'bottom', 2],
    [0.13, 0.07, 0.19, -0.08, 0.035, 0.4, 'shoes', 2], [0.13, 0.07, 0.19, 0.08, 0.035, 0.4, 'shoes', 2],
    // immer: Hüfte, Rumpf (oben breiter), Reißverschluss/Kapuzenkante, Schal, Kopf, Haare, Mütze, Augen
    [0.32, 0.14, 0.2, 0, 0.86, 0, 'bottom'],
    [0.44, 0.52, 0.25, 0, 1.18, 0, 'top', 0, 0.84],
    [0.05, 0.4, 0.02, 0, 1.16, 0.13, 'trim'],
    [0.28, 0.08, 0.27, 0, 1.45, 0, 'scarf'],
    [0.24, 0.26, 0.24, 0, 1.62, 0, 'skin'],
    [0.26, 0.07, 0.26, 0, 1.765, 0, 'hair'], [0.26, 0.14, 0.05, 0, 1.68, -0.115, 'hair'],
    [0.27, 0.07, 0.27, 0, 1.815, -0.005, 'hat'],
    [0.04, 0.04, 0.01, -0.055, 1.64, 0.121, 'eye'], [0.04, 0.04, 0.01, 0.055, 1.64, 0.121, 'eye'],
  ]);
}
// Arm: Drehpunkt an der Schulter, hängt nach unten.
function armGeometry() {
  return assemble([[0.11, 0.46, 0.12, 0, -0.22, 0, 'top'], [0.09, 0.09, 0.1, 0, -0.49, 0, 'skin']]);
}

// Ein Material für alles: Toon mit Atlas; der Shader verschiebt die UV je Instanz und
// blendet stehende/sitzende Beine ein. Dieselbe Änderung am Tiefenmaterial (Schatten).
function patch(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aPart;\nattribute vec2 iTile;\nattribute float iSit;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float keep = aPart < 0.5 ? 1.0 : (aPart < 1.5 ? 1.0 - iSit : iSit);
      transformed *= keep;
      if (aPart < 0.5) transformed.y -= ${SIT_DROP.toFixed(2)} * iSit;`)
    .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv += iTile;\n#endif');
}

// --- Aufbau ---------------------------------------------------------------------------
// Sammelt alle Platzhalter unter root ein und baut daraus die Menge.
export function buildCrowd(root, venueId = '') {
  const slots = [];
  root.traverse((o) => o.userData.crowdSlot && slots.push(o));
  for (const o of slots) o.parent.remove(o);
  const seed = [...venueId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  // Wer einem früheren Platz zu nahe kommt, fällt weg (Tribünenreihen über alten Plätzen).
  const kept = [];
  for (const o of slots) {
    const s = o.userData.crowdSlot;
    if (kept.some((k) => Math.hypot(k.x - s.x, k.z - s.z) < 0.5 && Math.abs(k.y - s.y) < 0.3)) continue;
    kept.push(s);
  }
  return new Crowd(root, kept.slice(0, MAX_TILES).map((s, i) => ({ ...s, i, seed })), venueId);
}

const TYPE = { idle: 0, clap: 1, cheer: 2, wave: 3, lean: 4, point: 5, head: 6, look: 7 };

export class Crowd {
  constructor(root, slots, venueId) {
    this.venueId = venueId;
    this.indoor = venueId === 'halle';
    // Reihenfolge nach festem Zufallsrang: Bei wenig Publikum bleiben die ersten stehen.
    this.slots = slots.map((s) => ({ ...s, rank: hash(s.seed, s.i) })).sort((a, b) => a.rank - b.rank);
    const n = this.slots.length;
    this.n = n;
    this.stats = { people: n, shown: 0, active: 0, calls: n ? 2 : 0 };
    if (!n) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = ATLAS;
    this.ctx = this.canvas.getContext('2d');
    this.texture = pixelTexture(this.canvas);
    this.material = toon(0xffffff, { map: this.texture });
    this.material.onBeforeCompile = patch;
    this.material.customProgramCacheKey = () => 'crowd';
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = patch;
    depth.customProgramCacheKey = () => 'crowd-depth';

    const body = bodyGeometry();
    const arm = armGeometry();
    this.tile = new Float32Array(n * 2);
    this.armTile = new Float32Array(n * 4);
    this.sit = new Float32Array(n);
    this.armSit = new Float32Array(n * 2); // bleibt 0: Arme senkt die CPU beim Sitzen ab
    body.setAttribute('iTile', new THREE.InstancedBufferAttribute(this.tile, 2));
    body.setAttribute('iSit', new THREE.InstancedBufferAttribute(this.sit, 1));
    arm.setAttribute('iTile', new THREE.InstancedBufferAttribute(this.armTile, 2));
    arm.setAttribute('iSit', new THREE.InstancedBufferAttribute(this.armSit, 1));
    this.body = new THREE.InstancedMesh(body, this.material, n);
    this.arms = new THREE.InstancedMesh(arm, this.material, n * 2);
    this.body.castShadow = true;
    this.body.customDepthMaterial = depth;
    this.arms.castShadow = false; // Schatten der Arme sähe man nicht – spart einen Durchgang
    for (const m of [this.body, this.arms]) {
      m.frustumCulled = false;
      m.userData.crowd = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(m);
    }
    this.body.userData.people = n;
    this.arms.userData.people = 0;

    // Zustand je Zuschauer (Typed Arrays, keine Objekte pro Bild).
    this.type = new Uint8Array(n);
    this.until = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.fan = new Int8Array(n); // 0 Heim, 1 Gast, -1 neutral
    this.scale = new Float32Array(n);
    this.dirty = new Uint8Array(n);
    this.active = new Uint8Array(n);
    this.slots.forEach((s, i) => {
      const r = hash(s.seed, s.i + 101);
      // Anhänger: links eher Heim, rechts gemischt – eine grobe Fankurve, kein Stadion.
      const home = s.x < 0 ? 0.7 : 0.45;
      this.fan[i] = r < home ? 0 : r < home + 0.3 ? 1 : -1;
      this.phase[i] = hash(s.seed, s.i + 7) * 6.28;
      this.speed[i] = 0.8 + hash(s.seed, s.i + 13) * 0.5;
      this.scale[i] = s.look?.height ?? 1;
      this.sit[i] = s.sitting ? 1 : 0;
      const t = i % MAX_TILES;
      const tx = ((t % PER_ROW) * CELL) / ATLAS;
      const ty = -(Math.floor(t / PER_ROW) * CELL) / ATLAS;
      this.tile.set([tx, ty], i * 2);
      this.armTile.set([tx, ty, tx, ty], i * 4);
      this.dirty[i] = 1;
    });
    this.time = 0;
    this.acc = 0;
    this.m = new THREE.Matrix4();
    this.m2 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.paint({ home: 0xc0392b, away: 0x2c4f8a, weather: null });
    this.setShown(n);
    for (let i = 0; i < n; i++) this.pose(i);
    this.commit();
  }

  // Farben malen: Haut/Haare aus dem Generator, Kleidung nach Wetter, Schal/Mütze nach Verein.
  paint({ home, away, weather }) {
    const ctx = this.ctx;
    const cold = !this.indoor && (weather === 'snow' || weather === 'frost' || weather === 'rain' || weather === 'fog');
    const hot = !this.indoor && weather === 'hitze';
    this.slots.forEach((s, i) => {
      if (i >= MAX_TILES) return;
      const r = (k) => hash(s.seed, s.i * 17 + k);
      const ox = (i % PER_ROW) * CELL;
      const oy = Math.floor(i / PER_ROW) * CELL;
      const look = s.look ?? {};
      const hair = look.bald ? look.skin : look.hair;
      const top = hot ? WARM_TOPS[Math.floor(r(1) * WARM_TOPS.length)] : s.top;
      const fan = this.fan[i];
      const club = fan === 0 ? home : fan === 1 ? away : null;
      // Schal nur bei Fans (und nicht bei Hitze), sonst verschwindet er im Oberteil.
      const scarf = club != null && !hot && r(2) < 0.7 ? club : top;
      const hatOn = cold ? r(3) < 0.55 : !this.indoor && r(3) < 0.12;
      const hat = hatOn ? (club != null && r(4) < 0.4 ? club : HATS[Math.floor(r(5) * HATS.length)]) : hair;
      const trim = cold && r(6) < 0.5 ? 0x1c1c1c : top; // Jacke mit Reißverschluss
      const put = ([x, y], hex) => {
        ctx.fillStyle = `#${hex.toString(16).padStart(6, '0')}`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      };
      put(TEX.skin, look.skin ?? 0xe0b090);
      put(TEX.hair, hair ?? 0x3a2a1a);
      put(TEX.top, top);
      put(TEX.trim, trim);
      put(TEX.bottom, s.bottom);
      put(TEX.shoes, 0x2a2a2a);
      put(TEX.scarf, scarf);
      put(TEX.hat, hat ?? 0x3a2a1a);
      put(TEX.eye, 0x1a1716);
    });
    this.texture.needsUpdate = true;
  }

  // Spielbeginn: Besucherzahl, Vereinsfarben, Wetter. Nur Darstellung.
  setMatch(match) {
    if (!this.n) return;
    this.match = match;
    this.home = match.homeTeam ?? 0;
    this.paint({ home: match.teams[this.home].kit.shirt, away: match.teams[1 - this.home].kit.shirt, weather: match.weather ?? ((match.pitch?.heat ?? 1) > 1 ? 'hitze' : null) });
    const q = currentQuality();
    this.budget = q.crowdActive ?? 0.3;
    this.hz = q.crowdHz ?? 12;
    this.setShown(Math.round(Math.min(this.n, Math.max(2, match.crowd ?? this.n)) * (q.spectators ?? 1)));
    this.type.fill(TYPE.idle);
    this.until.fill(0);
    this.delay.fill(0);
    this.dirty.fill(1);
  }

  setShown(k) {
    this.shown = Math.max(0, Math.min(this.n, k));
    this.body.count = this.shown;
    this.arms.count = this.shown * 2;
    this.stats.shown = this.shown;
  }

  // Reaktion für einen Anteil der Zuschauer, zeitversetzt von der Mitte nach außen.
  react(filter, type, share, dur) {
    for (let i = 0; i < this.shown; i++) {
      if (!filter(i) || hash(this.slots[i].seed, i + this.time * 997) > share) continue;
      this.type[i] = type;
      this.delay[i] = Math.abs(this.slots[i].x) * 0.035 + hash(i, this.time * 31) * 0.25; // Welle, leicht chaotisch
      this.until[i] = this.time + this.delay[i] + dur * (0.7 + hash(i, 5) * 0.6);
      this.phase[i] = hash(i, 9) * 6.28;
    }
  }

  handleEvents(match) {
    if (!this.n) return;
    for (const e of match.events) {
      if (e.type === 'goal') {
        const scorer = e.ownGoal ? 1 - e.team : e.team;
        const side = scorer === this.home ? 0 : 1;
        this.react((i) => this.fan[i] === side, TYPE.cheer, 0.95, 4);
        this.react((i) => this.fan[i] === -1, TYPE.clap, 0.6, 3);
        this.react((i) => this.fan[i] === 1 - side, TYPE.head, 0.45, 2.5);
      } else if (e.type === 'shot') {
        this.react(() => true, TYPE.lean, 0.35, 1.2);
      } else if (e.type === 'post' || e.type === 'bar') {
        this.react(() => true, TYPE.head, 0.5, 1.6);
      } else if (e.type === 'save') {
        this.react(() => true, TYPE.clap, 0.3, 1.8);
      } else if (e.type === 'foul' || e.type === 'card') {
        this.react(() => true, TYPE.point, 0.18, 1.5);
      } else if (e.type === 'end') {
        const [a, b] = match.score;
        const win = a === b ? -1 : (a > b ? 0 : 1) === this.home ? 0 : 1;
        if (win < 0) this.react(() => true, TYPE.clap, 0.5, 4);
        else {
          this.react((i) => this.fan[i] === win, TYPE.cheer, 0.85, 5);
          this.react((i) => this.fan[i] !== win, TYPE.clap, 0.25, 3);
        }
      }
    }
  }

  // Im Takt von 10–12 Hz: Umgebungsbewegung verteilen und die aktiven Posen setzen.
  update(dt) {
    if (!this.n) return;
    this.time += dt;
    this.acc += dt;
    const step = 1 / (this.hz ?? 12);
    if (this.acc < step) return;
    this.acc = 0;
    const t = this.time;
    // Umgebung: ab und zu klatscht jemand, winkt, lehnt sich vor oder schaut sich um –
    // nie mehr als das Budget gleichzeitig.
    let busy = 0;
    for (let i = 0; i < this.shown; i++) if (this.until[i] > t) busy++;
    const cap = Math.floor(this.shown * (this.budget ?? 0.3));
    for (let k = 0; k < 2 && busy < cap; k++) {
      const i = Math.floor(hash(Math.floor(t * 3), k * 7919) * this.shown);
      if (this.until[i] > t) continue;
      const r = hash(i, Math.floor(t));
      this.type[i] = r < 0.35 ? TYPE.look : r < 0.6 ? TYPE.clap : r < 0.8 ? TYPE.lean : TYPE.wave;
      this.delay[i] = 0;
      this.until[i] = t + 1.2 + r * 2.5;
      busy++;
    }
    let active = 0;
    for (let i = 0; i < this.shown; i++) {
      const on = this.until[i] > t;
      if (!on && !this.dirty[i]) continue; // Stillstehende nicht anfassen
      if (!on && this.type[i] !== TYPE.idle) this.type[i] = TYPE.idle;
      this.pose(i);
      this.dirty[i] = on ? 1 : 0; // nach dem Ende einmal in die Ruhepose
      if (on) active++;
    }
    this.stats.active = active;
    this.commit();
  }

  commit() {
    this.body.instanceMatrix.needsUpdate = true;
    this.arms.instanceMatrix.needsUpdate = true;
    this.body.geometry.attributes.iSit.needsUpdate = true;
  }

  // Pose eines Zuschauers aus Typ und Zeit: Körpermatrix plus zwei Arme.
  pose(i) {
    const s = this.slots[i];
    const t = this.time - this.delay[i];
    const running = this.until[i] > this.time && t > 0;
    const type = running ? this.type[i] : TYPE.idle;
    const w = (t * this.speed[i] + this.phase[i]);
    let bob = 0;
    let lean = 0;
    let turn = 0;
    // Arme: vor (negativ) / seitlich (außen positiv)
    let lx = 0.05;
    let lz = 0.03;
    let rx = 0.05;
    let rz = 0.03;
    let sit = s.sitting ? 1 : 0;
    if (type === TYPE.clap) {
      const c = Math.abs(Math.sin(w * 7));
      lx = rx = -1.15;
      lz = rz = -0.15 + 0.4 * c;
    } else if (type === TYPE.cheer) {
      sit = 0; // Sitzende springen beim Tor auf
      bob = 0.07 * Math.abs(Math.sin(w * 6));
      lx = rx = -2.75 + 0.2 * Math.sin(w * 6);
      lz = rz = 0.35;
      lean = -0.08;
    } else if (type === TYPE.wave) {
      rx = -2.6;
      rz = 0.35 + 0.35 * Math.sin(w * 5);
    } else if (type === TYPE.lean) {
      lean = 0.2;
      lx = rx = -0.35;
    } else if (type === TYPE.point) {
      rx = -1.5;
      rz = 0.1;
      lean = 0.08;
    } else if (type === TYPE.head) {
      lx = rx = -2.4;
      lz = rz = 0.75;
      lean = 0.05;
    } else if (type === TYPE.look) {
      turn = 0.35 * Math.sin(w * 0.8);
    }
    // Ruhe: kaum sichtbares Atmen/Wippen (nur solange jemand aktiv ist, sonst still).
    if (running) bob += 0.012 * Math.sin(w * 2.2);
    const drop = sit ? SIT_DROP : 0;
    const sc = this.scale[i];
    this.sit[i] = sit;
    // Körper
    this.e.set(lean, s.facing + turn, 0, 'YXZ');
    this.q.setFromEuler(this.e);
    this.v.set(s.x, s.y + bob, s.z);
    this.s.set(sc, sc, sc);
    this.m.compose(this.v, this.q, this.s);
    this.body.setMatrixAt(i, this.m);
    // Arme an der Schulter (Körpermatrix × Schulter × Armdrehung)
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1;
      this.e.set(k ? rx : lx, 0, side * (k ? rz : lz), 'XYZ');
      this.q.setFromEuler(this.e);
      this.v.set(side * 0.245, 1.4 - drop, 0);
      this.s.set(1, 1, 1);
      this.m2.compose(this.v, this.q, this.s).premultiply(this.m);
      this.arms.setMatrixAt(i * 2 + k, this.m2);
    }
  }
}
