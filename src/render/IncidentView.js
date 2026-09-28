import * as THREE from 'three';
import { len } from '../core/math.js';
import { keepAlpha, toon } from './materials.js';
import { currentQuality } from './quality.js';
import { animatePlayer, createPlayerModel } from './PlayerModel.js';

// Volle Wetterdichte; die Qualitätsstufe (quality.js: weather) nimmt davon einen Anteil.
const RAIN_DROPS = 700;
const FLAKES = 500;
const LEAVES = 220;

// Kleiner Pixelhund: Rumpf, Kopf mit Schlappohren, vier Beine, Wedelschwanz.
function createDog() {
  const fur = toon(0x8a5a32);
  const dark = toon(0x3b2616);
  const group = new THREE.Group();
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  box(0.22, 0.2, 0.55, fur, 0, 0.32, 0);
  const head = box(0.2, 0.2, 0.22, fur, 0, 0.46, 0.34);
  box(0.12, 0.08, 0.1, dark, 0, 0.42, 0.48);
  box(0.04, 0.12, 0.06, dark, -0.1, 0.46, 0.3);
  box(0.04, 0.12, 0.06, dark, 0.1, 0.46, 0.3);
  const legs = [];
  for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.24, z);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), fur);
    leg.position.y = -0.12;
    pivot.add(leg);
    group.add(pivot);
    legs.push(pivot);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.4, -0.27);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), dark);
  t.position.z = -0.1;
  t.rotation.x = 0.6;
  tail.add(t);
  group.add(tail);
  return { group, legs, tail, head };
}

// Hund, Besucher (Polizei, Autobesitzer), Regen und Rasensprenger.
export class IncidentView {
  constructor(root, match) {
    this.root = root;
    this.time = 0;
    this.visitors = new Map();
    this.dog = null;
    const { pitch } = match;
    this.area = { x: pitch.halfLength + 6, z: pitch.halfWidth + 6 };

    const share = currentQuality().weather;
    const drops = Math.round(RAIN_DROPS * share);
    this.leafCount = Math.round(LEAVES * share);
    // Regen in drei Tiefenebenen: vorne (zur Kamera, +z) längere, hellere Striche, hinten
    // kürzere, blassere. Am Boden wird jeder Tropfen kurz zum waagrechten Spritzer.
    const pos = new Float32Array(drops * 6);
    const col = new Float32Array(drops * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // depthWrite aus: Wetterpartikel sollen keine Silhouetten-Kanten bekommen (dunkle Ränder).
    this.rain = new THREE.LineSegments(geo, keepAlpha(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false })));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.drops = Array.from({ length: drops }, (_, i) => {
      const layer = i % 3; // 0 vorne, 1 Mitte, 2 hinten
      const zr = ((i * 104729) % 1000) / 1000;
      return { x: ((i * 7919) % 1000) / 1000, z: layer === 0 ? 0.55 + zr * 0.45 : layer === 2 ? zr * 0.5 : zr, y: ((i * 1301) % 1000) / 100, len: [0.5, 0.38, 0.26][layer] };
    });
    const shade = [[0.72, 0.8, 0.9], [0.62, 0.71, 0.82], [0.52, 0.6, 0.7]];
    this.drops.forEach((_, i) => {
      const c = shade[i % 3];
      col.set(c, i * 6);
      col.set(c, i * 6 + 3);
    });
    root.add(this.rain);

    // Schneeflocken und Herbstlaub: fallende Punkte, vorne größer (aSize), Laub bunt und
    // taumelnd (die Größe wechselt, als drehe sich das Blatt).
    this.flakes = Array.from({ length: Math.round(FLAKES * share) }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, z: ((i * 3571) % 1000) / 1000, y: ((i * 911) % 1000) / 100, p: (i % 17) / 17 }));
    const mk = (size, colors) => {
      const n = this.flakes.length;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const sizes = new Float32Array(n);
      this.flakes.forEach((f, i) => (sizes[i] = f.z > 0.6 ? 1.5 : f.z < 0.3 ? 1 : 1.25));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      const c = new Float32Array(n * 3);
      const tmp = new THREE.Color();
      for (let i = 0; i < n; i++) c.set(tmp.setHex(colors[i % colors.length]).toArray(), i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const mat = keepAlpha(new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSize;').replace('gl_PointSize = size;', 'gl_PointSize = floor(size * aSize + 0.5);');
      };
      mat.customProgramCacheKey = () => 'flake';
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false;
      pts.visible = false;
      root.add(pts);
      return pts;
    };
    this.snow = mk(2, [0xffffff, 0xf2f6fc, 0xe6eef8]);
    this.leaves = mk(3, [0xd9822b, 0xc2562a, 0xe8b33a, 0x9a5f2a, 0xcf6f24]);
    this.wind = { x: 0, z: 0 };

    // Vier Sprenger am Rand, jeder mit einer sich drehenden Wasserfontäne.
    this.sprinklers = new THREE.Group();
    this.sprinklers.visible = false;
    this.jets = [];
    const water = keepAlpha(new THREE.PointsMaterial({ color: 0xcfe8ff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
    for (const [sx, sz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
      const pts = new THREE.Points(g, water);
      pts.position.set(sx * pitch.halfLength, 0, sz * pitch.halfWidth);
      pts.frustumCulled = false;
      this.sprinklers.add(pts);
      this.jets.push(pts);
    }
    root.add(this.sprinklers);
  }

  // env: Umgebungszustand aus weather.js (Wind, Regenstärke); ohne: windstill.
  sync(match, dt, env = null) {
    this.time += dt;
    this.wind.x = env?.windX ?? 0;
    this.wind.z = env?.windZ ?? 0;
    this.rainRate = env ? Math.max(0.5, env.rain) : 0.8;
    this.syncDog(match.dog, dt);
    this.syncVisitors(match.visitors ?? [], dt);
    this.syncRain(match.weather === 'rain', dt);
    this.syncFlakes(this.snow, match.weather === 'snow', dt, 1.1, 0.4);
    this.syncFlakes(this.leaves, match.weather === 'leaves', dt, 0.8, 1.2);
    this.syncSprinklers(!!match.sprinklers);
  }

  syncDog(dog, dt) {
    if (!dog) {
      if (this.dog) this.dog.group.visible = false;
      return;
    }
    this.dog ??= createDog();
    if (!this.dog.group.parent) this.root.add(this.dog.group);
    const d = this.dog;
    d.group.visible = true;
    d.group.position.set(dog.pos.x, 0, dog.pos.z);
    d.group.rotation.y = Math.atan2(dog.facing.x, dog.facing.z);
    const run = this.time * 18;
    d.legs.forEach((leg, i) => (leg.rotation.x = Math.sin(run + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.8 : 0)) * 0.7));
    d.tail.rotation.y = Math.sin(this.time * 22) * 0.6;
    d.head.position.y = 0.46 + Math.abs(Math.sin(run)) * 0.02;
  }

  syncVisitors(list, dt) {
    const seen = new Set();
    for (const v of list) {
      seen.add(v.id);
      let model = this.visitors.get(v.id);
      if (!model) {
        model = createPlayerModel(v.look, v.kit);
        this.visitors.set(v.id, model);
        this.root.add(model.group);
      }
      model.group.visible = true;
      model.group.position.set(v.pos.x, 0, v.pos.z);
      if (v.facing) model.group.rotation.y = Math.atan2(v.facing.x, v.facing.z);
      animatePlayer(model, { speed: v.vel ? len(v.vel.x, v.vel.z) : 0, dt, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' });
    }
    for (const [id, model] of this.visitors) if (!seen.has(id)) model.group.visible = false;
  }

  syncRain(on, dt) {
    this.rain.visible = on;
    if (!on) return;
    const a = this.rain.geometry.attributes.position;
    const { x: ax, z: az } = this.area;
    // Leichte Schräge durch den Wind (↓ bis ↘), nie waagrecht.
    const slant = Math.max(-0.35, Math.min(0.35, 0.1 * Math.sign(this.wind.x || 1) + this.wind.x * 0.07));
    const fall = 14 * (0.85 + 0.2 * this.rainRate);
    // Bei schwachem Regen fällt nur ein Teil der Tropfen (Gewitter: alle).
    const active = Math.round(this.drops.length * (0.55 + 0.45 * this.rainRate));
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      if (i >= active) {
        a.setXYZ(i * 2, 0, -50, 0);
        a.setXYZ(i * 2 + 1, 0, -50, 0);
        continue;
      }
      d.y -= dt * fall;
      if (d.y < -0.7) d.y += 10.7;
      const x = (d.x * 2 - 1) * ax + Math.max(0, d.y) * slant;
      const z = (d.z * 2 - 1) * az;
      if (d.y < 0) {
        // Aufprall: ein paar Pixel breiter Spritzer am Boden, der kurz aufgeht.
        const w = 0.05 + (-d.y / 0.7) * 0.1;
        a.setXYZ(i * 2, x - w, 0.03, z);
        a.setXYZ(i * 2 + 1, x + w, 0.03 + w * 0.3, z);
      } else {
        a.setXYZ(i * 2, x, d.y, z);
        a.setXYZ(i * 2 + 1, x + slant * d.len, d.y + d.len, z);
      }
    }
    a.needsUpdate = true;
  }

  // Fallende Punkte: Schnee rieselt und treibt mit dem Wind, Laub trudelt stärker.
  syncFlakes(pts, on, dt, fall, sway) {
    pts.visible = on;
    if (!on) return;
    const leaves = pts === this.leaves;
    const a = pts.geometry.attributes.position;
    const size = pts.geometry.attributes.aSize;
    const { x: ax, z: az } = this.area;
    const n = leaves ? Math.min(this.leafCount, this.flakes.length) : this.flakes.length;
    const drift = this.wind.x * (leaves ? 0.9 : 0.35);
    for (let i = 0; i < this.flakes.length; i++) {
      const d = this.flakes[i];
      if (i >= n) {
        a.setXYZ(i, 0, -50, 0);
        continue;
      }
      d.y -= dt * fall * (0.6 + d.p);
      if (d.y < 0) d.y += leaves ? 7 : 10;
      d.x += (drift * dt) / (2 * ax);
      d.x -= Math.floor(d.x); // am Rand wieder herein
      const x = (d.x * 2 - 1) * ax + Math.sin(this.time * (0.8 + d.p) + i) * sway;
      a.setXYZ(i, x, d.y, (d.z * 2 - 1) * az + Math.cos(this.time * 0.7 + i) * sway * 0.5);
      if (leaves) size.setX(i, (d.z > 0.6 ? 1.35 : 1) * (Math.abs(Math.sin(this.time * (2 + d.p * 3) + i)) < 0.3 ? 0.67 : 1));
    }
    a.needsUpdate = true;
    if (leaves) size.needsUpdate = true;
  }

  syncSprinklers(on) {
    this.sprinklers.visible = on;
    if (!on) return;
    this.jets.forEach((jet, j) => {
      const a = jet.geometry.attributes.position;
      const angle = this.time * 1.6 + j * 1.7;
      for (let i = 0; i < 90; i++) {
        const t = ((i / 90 + this.time * 0.9) % 1) * 1.2;
        const spread = (i % 5) * 0.08;
        const r = t * 7;
        a.setXYZ(i, Math.cos(angle + spread) * r, 0.3 + t * 3.2 - t * t * 2.6, Math.sin(angle + spread) * r);
      }
      a.needsUpdate = true;
    });
  }
}
