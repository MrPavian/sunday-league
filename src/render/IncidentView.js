import * as THREE from 'three';
import { len } from '../core/math.js';
import { toon } from './materials.js';
import { animatePlayer, createPlayerModel } from './PlayerModel.js';

const RAIN_DROPS = 700;

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

    const pos = new Float32Array(RAIN_DROPS * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaac4dd, transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.drops = Array.from({ length: RAIN_DROPS }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, z: ((i * 104729) % 1000) / 1000, y: ((i * 1301) % 1000) / 100 }));
    root.add(this.rain);

    // Schneeflocken und Herbstlaub: langsam fallende Punkte.
    this.flakes = Array.from({ length: 500 }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, z: ((i * 3571) % 1000) / 1000, y: ((i * 911) % 1000) / 100, p: (i % 17) / 17 }));
    const mk = (color, size) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.flakes.length * 3), 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
      pts.frustumCulled = false;
      pts.visible = false;
      root.add(pts);
      return pts;
    };
    this.snow = mk(0xffffff, 3);
    this.leaves = mk(0xd9822b, 4);

    // Vier Sprenger am Rand, jeder mit einer sich drehenden Wasserfontäne.
    this.sprinklers = new THREE.Group();
    this.sprinklers.visible = false;
    this.jets = [];
    const water = new THREE.PointsMaterial({ color: 0xcfe8ff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85 });
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

  sync(match, dt) {
    this.time += dt;
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
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y -= dt * 14;
      if (d.y < 0) d.y += 10;
      const x = (d.x * 2 - 1) * ax + d.y * 0.15;
      const z = (d.z * 2 - 1) * az;
      a.setXYZ(i * 2, x, d.y, z);
      a.setXYZ(i * 2 + 1, x + 0.05, d.y + 0.45, z);
    }
    a.needsUpdate = true;
  }

  // Fallende Punkte: Schnee rieselt senkrecht, Laub trudelt seitlich.
  syncFlakes(pts, on, dt, fall, sway) {
    pts.visible = on;
    if (!on) return;
    const a = pts.geometry.attributes.position;
    const { x: ax, z: az } = this.area;
    const n = pts === this.leaves ? 220 : this.flakes.length;
    for (let i = 0; i < this.flakes.length; i++) {
      const d = this.flakes[i];
      if (i >= n) {
        a.setXYZ(i, 0, -50, 0);
        continue;
      }
      d.y -= dt * fall * (0.6 + d.p);
      if (d.y < 0) d.y += pts === this.leaves ? 7 : 10;
      const x = (d.x * 2 - 1) * ax + Math.sin(this.time * (0.8 + d.p) + i) * sway;
      a.setXYZ(i, x, d.y, (d.z * 2 - 1) * az + Math.cos(this.time * 0.7 + i) * sway * 0.5);
    }
    a.needsUpdate = true;
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
