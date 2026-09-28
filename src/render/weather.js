import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { MOODS, moodOf, VENUES } from './lighting.js';
import { toon } from './materials.js';
import { currentQuality } from './quality.js';

// Wetter 2.0 – nur Darstellung, das Spiel wird ausschließlich gelesen:
//
//   Wetterlage (match.weather, pitch.heat/wind, Gewitter, Sprenger)
//     → Umgebungszustand (state: Nässe, Regen, Schnee, Frost, Nebel, Hitze, Wind)
//     → Bodenreaktion (Post-Shader im PixelRenderer: Untergrund-Profil unten, Pfützen, Spuren)
//     → Partikel und Effekte (IncidentView: Regen/Schnee/Laub, Effects: Spritzer)
//     → Atmosphäre (Post-Shader: Nebel, Hitzeflimmern)
//
// Der Zustand wird mit 10 Hz nachgeführt (Aufbau und Abbau der Nässe, Pfützengröße,
// Spuren); gezeichnet wird jedes Bild. Pro Bild und Takt wird nichts neu angelegt.

// Wie ein Untergrund auf Wetter reagiert (Post-Shader):
// wetDark – so viel dunkler wird er nass, wetSat – so viel satter,
// glint/streak – Anteil und Länge (m) der Pixel-Glanzstreifen, spots – feuchte Flecken,
// sky – Himmelsanteil im nassen Boden (stilisierte Spiegelung),
// snow – wie viel Schnee liegen bleibt, snowShade – Farbe des Schnees im Schatten,
// print – Farbe der Spuren (nass bzw. im Schnee festgetreten).
export const GROUND = {
  grass: { wetDark: 0.2, wetSat: 1.28, glint: 0.014, streak: 0.22, spots: 0, sky: 0.04, snow: 0.88, snowShade: [0.62, 0.68, 0.8], print: 0x2e4426 },
  ash: { wetDark: 0.3, wetSat: 1.1, glint: 0, streak: 0.2, spots: 0.5, sky: 0, snow: 1.15, snowShade: [0.64, 0.64, 0.68], print: 0x5a3020 },
  asphalt: { wetDark: 0.3, wetSat: 1.05, glint: 0.045, streak: 0.6, spots: 0, sky: 0.16, snow: 0.5, snowShade: [0.58, 0.62, 0.72], print: 0x2a2a2c },
  concrete: { wetDark: 0.26, wetSat: 1.05, glint: 0.03, streak: 0.42, spots: 0.18, sky: 0.1, snow: 0.6, snowShade: [0.6, 0.63, 0.72], print: 0x4a4946 },
  wood: { wetDark: 0.1, wetSat: 1.08, glint: 0.008, streak: 0.3, spots: 0, sky: 0, snow: 0, snowShade: [0.6, 0.6, 0.6], print: 0x8a6a40 },
};
const SNOW_PRINT = 0x7c8899; // festgetretener Schnee: grau-bläulich, dunkler als die Decke

// Aufbau/Abbau je Sekunde (Anteil von 0…1).
const RATE = { wetUp: 1 / 25, wetDown: 1 / 90, snowUp: 1 / 60, snowDown: 1 / 120, fast: 1 / 3 };
const HZ = 10;
const PRINT_LIFE = { wet: 4.5, snow: 9 };
const LEAF_PALETTE = [0xd9822b, 0xc2562a, 0xe8b33a, 0x8a5a2a, 0xb8702a];

const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const approach = (v, target, up, down, dt) => (v < target ? Math.min(target, v + up * dt) : Math.max(target, v - down * dt));
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Pfützen: deterministisch aus Spielort + Wetter. Bevorzugt dort, wo auf Amateurplätzen
// das Wasser steht – im Torraum, am Mittelkreis, an der Seitenlinie.
export function puddleLayout(venueId, weatherId, pitch, count) {
  const rng = createRng(hashStr(`${venueId}|${weatherId ?? 'none'}`));
  const hl = pitch.halfLength ?? 20;
  const hw = pitch.halfWidth ?? 12;
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 12; tries++) {
    const zone = rng.next();
    let x;
    let z;
    if (zone < 0.45) {
      x = (rng.chance(0.5) ? 1 : -1) * (hl - rng.range(1.2, 5.5));
      z = rng.range(-3.5, 3.5);
    } else if (zone < 0.7) {
      x = rng.range(-3.5, 3.5);
      z = rng.range(-hw * 0.6, hw * 0.6);
    } else {
      x = rng.range(-hl * 0.9, hl * 0.9);
      z = (rng.chance(0.5) ? 1 : -1) * (hw - rng.range(0.4, 2.2));
    }
    const sx = rng.range(0.9, 2.1);
    const sz = sx * rng.range(0.5, 0.9);
    const rot = rng.range(0, Math.PI);
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < (p.sx + sx) * 0.85)) continue;
    out.push({ x, z, sx, sz, rot });
  }
  return out;
}

// Pfützen-Geometrie: flache, unregelmäßige Scheibe (Radius ≈ 1) mit Randring (aRim 0…1).
function puddleGeometry() {
  const seg = 18;
  const pos = [0, 0, 0];
  const rim = [0];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    // weich unregelmäßiger Rand (zwei überlagerte Wellen statt Zufall: jede Pfütze gleich gebaut,
    // Vielfalt kommt aus Drehung und Streckung je Instanz)
    const r = 1 + 0.12 * Math.sin(a * 3 + 0.6) + 0.07 * Math.sin(a * 5 + 2.1);
    pos.push(Math.cos(a) * r * 0.88, 0, Math.sin(a) * r * 0.88, Math.cos(a) * r, 0, Math.sin(a) * r);
    rim.push(0.88, 1);
  }
  const idx = [];
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    const a = 1 + i * 2;
    const b = 1 + j * 2;
    idx.push(0, b, a, a, b, b + 1, a, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aRim', new THREE.Float32BufferAttribute(rim, 1));
  g.setIndex(idx);
  return g;
}

// Kennung im Alphakanal: 0,94 = Boden-Decal/Zuschauer – keine Schneedecke, keine Glanzpunkte
// darüber (siehe PixelRenderer). Ohne Mischen schreibt das Material seine Deckkraft dorthin.
export const DECAL_CODE = 0.94;
function markDecal(mat) {
  mat.blending = THREE.NoBlending;
  mat.opacity = DECAL_CODE;
  return mat;
}

// Pfützen-Material: dunkles Toon-Wasser mit Himmelsanteil, heller Reflexstreifen,
// klarer Rand und bei Regen gelegentliche Pixel-Ringe. Schatten fallen weiter darauf.
function puddleMaterial(uniforms) {
  const mat = markDecal(toon(0xffffff).clone());
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRim;\nvarying float vRim;\nvarying vec2 vLocal;\nvarying float vSeed;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRim = aRim;\nvLocal = position.xz;\nvSeed = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].z * 0.311) * 17.0;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uWater;\nuniform vec3 uGlint;\nuniform vec3 uRim;\nuniform float uTime;\nuniform float uRain;\nvarying float vRim;\nvarying vec2 vLocal;\nvarying float vSeed;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
        vec3 wcol = uWater;
        float rim = step(0.94, vRim);
        // Himmelsreflex: kurzer heller Streifen, zur fernen Seite hin etwas heller.
        vec2 dir = vec2(0.6, 0.8);
        float along = dot(vLocal, vec2(-dir.y, dir.x));
        float band = step(abs(dot(vLocal, dir) + 0.25), 0.07) * step(abs(along), 0.4);
        wcol = mix(wcol, uGlint, band * (1.0 - rim) * 0.5);
        wcol = mix(wcol, uGlint, step(0.35, -vLocal.y) * 0.12 * (1.0 - rim));
        // Regenringe: drei versetzte Takte, kleine Ringe an wechselnden Stellen.
        for (int k = 0; k < 3; k++) {
          float cyc = uTime * (0.9 + float(k) * 0.23) + vSeed + float(k) * 0.37;
          float id = floor(cyc);
          float f = fract(cyc);
          vec2 c = (vec2(fract(sin(id * 12.9898 + vSeed + float(k)) * 43758.55), fract(sin(id * 78.233 + vSeed * 1.7) * 24634.63)) - 0.5) * 1.1;
          float ring = step(abs(length(vLocal - c) - f * 0.28), 0.035) * step(f, 0.6) * uRain;
          wcol = mix(wcol, uGlint, ring * 0.45 * (1.0 - rim));
        }
        diffuseColor.rgb = mix(wcol, uRim, rim);`,
      );
  };
  mat.customProgramCacheKey = () => 'puddle';
  return mat;
}

// Boden-Decals in einem Draw Call: Spuren (Ringpuffer, lösen sich gerastert auf) und
// liegendes Herbstlaub (fest). Form prozedural im Shader, Farbe je Instanz.
function decalMaterial(uniforms) {
  const mat = markDecal(toon(0xffffff).clone());
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aDecal;\nvarying vec2 vDUv;\nvarying vec2 vDecal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDUv = uv;\nvDecal = aDecal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uLife;\nvarying vec2 vDUv;\nvarying vec2 vDecal;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
        vec2 q = floor(vDUv * 8.0) / 8.0 + 0.0625 - 0.5;
        float inside;
        if (vDecal.x < 0.5) {
          // Schuhabdruck: Sohle und Absatz
          vec2 e = q * vec2(2.6, 1.15);
          inside = step(length(e), 0.5) * (1.0 - step(abs(q.y + 0.08), 0.05));
        } else {
          // Blatt: Raute mit Stiel
          inside = step(abs(q.x) * 1.7 + abs(q.y) * 1.1, 0.5) + step(abs(q.x), 0.05) * step(0.3, q.y);
        }
        if (inside < 0.5) discard;
        if (vDecal.y >= 0.0) {
          float age = (uTime - vDecal.y) / uLife;
          vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
          float b = (cell.x * 2.0 + cell.y * 3.0 - cell.x * cell.y * 4.0 + 0.5) / 4.0;
          if (age > 1.0 || age * 1.6 - 0.6 > b) discard;
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'decal';
  return mat;
}

export class WeatherFx {
  // root: Szene der MatchView (wird mit dem Spiel entsorgt). Spielort-Id = pitch.id.
  constructor(root, match) {
    const q = currentQuality();
    this.q = q;
    this.pitch = match.pitch;
    this.venueId = match.pitch.id ?? 'parkplatz';
    const v = VENUES[this.venueId] ?? VENUES.parkplatz;
    this.venue = v;
    this.indoor = !!v.indoor;
    this.profile = v.weather ?? { puddles: 0, splash: 0, snow: 0, footprints: false };
    this.ground = GROUND[v.surface] ?? GROUND.grass;
    this.groundId = v.surface ?? 'grass';
    const h = hashStr(`${this.venueId}|${match.seed ?? 0}`);
    this.windSign = h & 1 ? 1 : -1;
    // Umgebungszustand – von PixelRenderer, Effects und IncidentView gelesen.
    this.state = { weather: match.weather ?? null, wet: 0, wetTarget: 0, rain: 0, snow: 0, frost: 0, fog: 0, heat: 0, leaves: 0, windX: 0, windZ: 0, time: 0, ground: this.ground, groundId: this.groundId, indoor: this.indoor, splash: (q.splash ?? 1) * (this.profile.splash ?? 1) };
    this.stats = { puddles: 0, puddleMax: 0, footprints: 0, footprintMax: 0, leaves: 0, splashes: 0, splashRate: 0, heatHaze: 0 };
    this.tick = 1;
    this.shared = { uTime: { value: 0 }, uRain: { value: 0 }, uWater: { value: new THREE.Color(0x3a4656) }, uGlint: { value: new THREE.Color(0xc8d6e6) }, uRim: { value: new THREE.Color(0x2a2c2a) }, uLife: { value: PRINT_LIFE.wet } };
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this.update(match, 0, true);
    this.buildPuddles(root, match);
    this.buildDecals(root, match);
    this.puddleLevel = -1;
    this.syncPuddles();
  }

  // Zielwerte aus der aktuellen Wetterlage (ändert sich z. B. beim Gewitter mitten im Spiel).
  targets(match) {
    const w = match.weather ?? null;
    const out = this._t ?? (this._t = { wet: 0, rain: 0, snow: 0, frost: 0, fog: 0, heat: 0, leaves: 0, wind: 0 });
    if (this.indoor) {
      out.wet = out.rain = out.snow = out.frost = out.fog = out.heat = out.leaves = out.wind = 0;
      return out;
    }
    const storm = match.incident?.type === 'gewitter';
    out.rain = w === 'rain' ? (storm ? 1 : 0.8) : 0;
    const mood = MOODS[moodOf(match)] ?? MOODS.CLEAR;
    out.wet = Math.min(1, (mood.wetness ?? 0) * (this.venue.wet ?? 0) * (storm ? 1.15 : 1));
    if (match.sprinklers) out.wet = Math.max(out.wet, 0.7 * (this.venue.wet ?? 0));
    out.snow = w === 'snow' ? 1 : 0;
    out.frost = w === 'frost' ? 1 : 0;
    out.fog = w === 'fog' ? 1 : 0;
    out.heat = (this.pitch.heat ?? 1) > 1 ? 1 : 0;
    out.leaves = w === 'leaves' ? 1 : 0;
    out.wind = this.pitch.wind?.x ?? 0;
    return out;
  }

  // dt in Sekunden. Zustand mit 10 Hz, die Zeit (Ripples, Auflösen der Spuren) jedes Bild.
  update(match, dt, init = false) {
    const s = this.state;
    s.time += dt;
    this.shared.uTime.value = s.time;
    this.tick += dt;
    this.stats.splashRate += ((this.frameSplashes ?? 0) / Math.max(dt, 1e-3) - this.stats.splashRate) * Math.min(1, dt * 2);
    this.frameSplashes = 0;
    if (!init && this.tick < 1 / HZ) return;
    const step = init ? 0 : this.tick;
    this.tick = 0;
    const t = this.targets(match);
    s.weather = match.weather ?? null;
    if (init) {
      Object.assign(s, { wet: t.wet, rain: t.rain, snow: t.snow, frost: t.frost, fog: t.fog, heat: t.heat, leaves: t.leaves });
    } else {
      s.wet = approach(s.wet, t.wet, RATE.wetUp * (0.5 + t.rain), RATE.wetDown, step);
      s.snow = approach(s.snow, t.snow, RATE.snowUp, RATE.snowDown, step);
      s.rain = approach(s.rain, t.rain, RATE.fast, RATE.fast, step);
      s.frost = approach(s.frost, t.frost, RATE.fast, RATE.fast, step);
      s.fog = approach(s.fog, t.fog, RATE.fast, RATE.fast, step);
      s.heat = approach(s.heat, t.heat, RATE.fast, RATE.fast, step);
      s.leaves = t.leaves;
    }
    s.wetTarget = t.wet;
    // Wind: Sturmböen aus dem Spiel, sonst ein leichter Grundwind je Spiel; sanfte Böen.
    const base = t.wind || (s.rain || s.snow || s.leaves ? 0.8 * this.windSign : 0.3 * this.windSign);
    const gust = 1 + 0.3 * Math.sin(s.time * 0.4) * Math.sin(s.time * 1.3 + 0.7);
    s.windX = base * gust;
    s.windZ = Math.abs(base) * 0.25 * gust;
    this.stats.heatHaze = s.heat * (this.q.heatHaze ?? 0);
    if (init) return;
    this.syncPuddles();
    this.stepPrints(match, step);
  }

  buildPuddles(root, match) {
    const n = this.indoor ? 0 : Math.round((this.q.puddles ?? 0) * (this.profile.puddles ?? 0));
    this.stats.puddleMax = n;
    this.puddles = puddleLayout(this.venueId, match.weather, this.pitch, n);
    if (!this.puddles.length) return;
    this.puddleMesh = new THREE.InstancedMesh(puddleGeometry(), puddleMaterial(this.shared), this.puddles.length);
    this.puddleMesh.receiveShadow = true;
    this.puddleMesh.frustumCulled = false;
    this.puddleMesh.userData.weather = 'puddles';
    root.add(this.puddleMesh);
  }

  // Pfützen wachsen mit der Nässe (erst auf richtig nassem Boden), schrumpfen beim Abtrocknen.
  syncPuddles() {
    const s = this.state;
    const level = smooth(0.45, 0.95, s.wet);
    this.shared.uRain.value = s.rain > 0.05 ? 1 : 0;
    if (!this.puddleMesh || Math.abs(level - this.puddleLevel) < 0.01) return;
    this.puddleLevel = level;
    const m = this._m;
    this.puddles.forEach((p, i) => {
      this._e.set(0, p.rot, 0);
      this._q.setFromEuler(this._e);
      this._s.set(p.sx * level, 1, p.sz * level);
      this._p.set(p.x, 0.005, p.z);
      m.compose(this._p, this._q, this._s);
      this.puddleMesh.setMatrixAt(i, m);
    });
    this.puddleMesh.instanceMatrix.needsUpdate = true;
    this.puddleMesh.visible = level > 0.02;
    this.stats.puddles = level > 0.02 ? this.puddles.length : 0;
  }

  // Liegt (x, z) in einer Pfütze? Für größere Spritzer.
  inPuddle(x, z) {
    if (!this.puddleMesh?.visible) return false;
    const k = this.puddleLevel;
    for (const p of this.puddles) {
      const dx = x - p.x;
      const dz = z - p.z;
      const r = Math.max(p.sx, p.sz) * k * 0.9;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  buildDecals(root, match) {
    const prints = this.indoor ? 0 : this.q.footprints ?? 0;
    const leaves = match.weather === 'leaves' && !this.indoor ? Math.round(90 * (this.q.weather ?? 1)) : 0;
    this.printMax = prints;
    this.stats.footprintMax = prints;
    this.stats.leaves = leaves;
    if (!prints && !leaves) return;
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const total = prints + leaves;
    this.decalAttr = new THREE.InstancedBufferAttribute(new Float32Array(total * 2), 2);
    geo.setAttribute('aDecal', this.decalAttr);
    this.decals = new THREE.InstancedMesh(geo, decalMaterial(this.shared), total);
    this.decals.receiveShadow = true;
    this.decals.frustumCulled = false;
    this.decals.userData.weather = 'decals';
    const m = this._m;
    m.makeScale(0, 0, 0);
    for (let i = 0; i < prints; i++) {
      this.decals.setMatrixAt(i, m);
      this.decalAttr.setXY(i, 0, -1e6); // längst aufgelöst
      this.decals.setColorAt(i, this._c.setHex(this.ground.print));
    }
    // Liegendes Laub: fest, deterministisch je Spielort.
    const rng = createRng(hashStr(`${this.venueId}|laub`));
    const hl = (this.pitch.halfLength ?? 20) + 3;
    const hw = (this.pitch.halfWidth ?? 12) + 2;
    for (let i = 0; i < leaves; i++) {
      const edge = rng.chance(0.6);
      const x = rng.range(-hl, hl);
      const z = edge ? (rng.chance(0.5) ? 1 : -1) * rng.range(hw - 3, hw) : rng.range(-hw, hw);
      this._e.set(0, rng.range(0, Math.PI * 2), 0);
      this._q.setFromEuler(this._e);
      const size = rng.range(0.18, 0.28);
      m.compose(this._p.set(x, 0.007, z), this._q, this._s.set(size, 1, size * 1.2));
      this.decals.setMatrixAt(prints + i, m);
      this.decalAttr.setXY(prints + i, 1, -1); // fest
      this.decals.setColorAt(prints + i, this._c.setHex(rng.pick(LEAF_PALETTE)));
    }
    this.decals.instanceMatrix.needsUpdate = true;
    this.decals.instanceColor.needsUpdate = true;
    this.decalAttr.needsUpdate = true;
    this.decals.visible = leaves > 0;
    root.add(this.decals);
    this.printNext = 0;
    this.printTokens = 0;
    this.printState = new Map(); // Spieler-Id → { acc, side }
  }

  // Spuren im Schnee oder auf sehr nassem Rasen/Asche: je Schrittpaar ein Abdruck,
  // höchstens so viele pro Sekunde, wie der Ringpuffer in ihrer Lebensdauer fasst.
  printsActive() {
    const s = this.state;
    return !!this.printMax && (s.snow > 0.3 || (s.wet > 0.6 && this.profile.footprints));
  }

  stepPrints(match, dt) {
    const s = this.state;
    if (!this.printMax) return;
    const snow = s.snow > 0.3;
    const life = snow ? PRINT_LIFE.snow : PRINT_LIFE.wet;
    this.shared.uLife.value = life;
    let live = 0;
    for (let i = 0; i < this.printMax; i++) if (s.time - this.decalAttr.getY(i) < life) live++;
    this.stats.footprints = live;
    // Ohne lebende Spur und ohne Laub kein Draw Call.
    this.decals.visible = live > 0 || this.stats.leaves > 0 || this.printsActive();
    if (!this.printsActive()) return;
    this.printTokens = Math.min(4, this.printTokens + (dt * this.printMax) / life);
    const color = snow ? SNOW_PRINT : this.ground.print;
    let changed = false;
    for (const p of match.players) {
      const speed = Math.hypot(p.vel.x, p.vel.z);
      let st = this.printState.get(p.id);
      if (!st) this.printState.set(p.id, (st = { acc: 0, side: 1 }));
      if (speed < 2.2 || p.diveAnim > 0) continue;
      st.acc += speed * dt;
      if (st.acc < 1.5 || this.printTokens < 1) continue;
      st.acc = 0;
      st.side = -st.side;
      this.printTokens -= 1;
      const f = p.facing;
      const i = this.printNext;
      this.printNext = (i + 1) % this.printMax;
      this._e.set(0, Math.atan2(f.x, f.z), 0);
      this._q.setFromEuler(this._e);
      this._p.set(p.pos.x - f.z * 0.11 * st.side - f.x * 0.1, 0.008, p.pos.z + f.x * 0.11 * st.side - f.z * 0.1);
      this._m.compose(this._p, this._q, this._s.set(0.2, 1, 0.34));
      this.decals.setMatrixAt(i, this._m);
      this.decals.setColorAt(i, this._c.setHex(color));
      this.decalAttr.setXY(i, 0, s.time);
      changed = true;
    }
    if (!changed) return;
    this.decals.instanceMatrix.needsUpdate = true;
    this.decals.instanceColor.needsUpdate = true;
    this.decalAttr.needsUpdate = true;
  }

  // Himmel und Licht aus dem Lichtpaket (lighting.js): Wasserfarbe der Pfützen.
  setLighting(L) {
    const sky = this._c.setHex(L.sky ?? 0x8c97a3);
    const night = !!L.flood;
    this.shared.uWater.value.setRGB(0.1, 0.12, 0.17).lerp(sky, night ? 0.15 : 0.32);
    this.shared.uGlint.value.copy(sky).lerp(this._c.setRGB(1, 1, 1), 0.35);
    if (night) this.shared.uGlint.value.setRGB(1.0, 0.96, 0.86);
    this.shared.uRim.value.setHex(this.groundId === 'ash' ? 0x4a2c1c : this.groundId === 'grass' ? 0x2c3e22 : 0x3a3a3c);
  }

  // Effects meldet jeden Spritzer (für die Debug-Anzeige).
  countSplash() {
    this.stats.splashes++;
    this.frameSplashes = (this.frameSplashes ?? 0) + 1;
  }

  dispose() {
    for (const o of [this.puddleMesh, this.decals]) {
      if (!o) continue;
      o.geometry.dispose();
      o.material.dispose();
      o.dispose?.();
    }
  }
}
