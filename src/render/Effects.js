import * as THREE from 'three';

// Kleine Partikeleffekte: Staub, Grasfetzen, Spritzwasser. Alles in einem Pool
// und einem einzigen Draw Call. Farben und Verhalten hängen vom Untergrund ab.
const MAX = 300;

const SURFACE_FX = {
  asphalt: { colors: [0x8a8a86, 0x9c9a94, 0x74736f], size: 4, life: 0.45, lift: 1.2, drag: 3.5 },
  concrete: { colors: [0x9a9890, 0xb0ada4, 0x807e78], size: 4, life: 0.45, lift: 1.2, drag: 3.5 },
  ash: { colors: [0xe8b898, 0xdca47e, 0xf2cdb0, 0xcf906c], size: 6, life: 1.2, lift: 2.2, drag: 2.4, gravity: 1.2 },
  grass: { colors: [0x4f8a3c, 0x62a04a, 0x3d6e30, 0x6b5238], size: 4, life: 0.55, lift: 2.4, drag: 2.5, gravity: 7 },
  parkGrass: { colors: [0x5a8f40, 0x6ea04c, 0x46742f, 0x6b5238], size: 4, life: 0.55, lift: 2.4, drag: 2.5, gravity: 7 },
  hall: { colors: [0xe6dcc8, 0xf4efe4], size: 2, life: 0.25, lift: 0.6, drag: 5 },
  artificial: { colors: [0x1c1c1c, 0x2c2c2c, 0x48a040], size: 3, life: 0.5, lift: 2, drag: 3, gravity: 7 },
};
const WATER = { colors: [0xcfe4f2, 0xe8f2fa, 0xa8c4d8], size: 3, life: 0.4, lift: 2.2, drag: 2.5, gravity: 9 };

export class Effects {
  constructor(root, match) {
    this.fx = SURFACE_FX[match.pitch.surface?.id] ?? SURFACE_FX.grass;
    this.wet = match.weather === 'rain';
    this.p = Array.from({ length: MAX }, () => ({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, max: 1 }));
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3).fill(-10);
    this.col = new Float32Array(MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    // Punkte in Pixelgröße – die Kamera ist orthografisch.
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: this.fx.size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    root.add(this.points);
    this.tmp = new THREE.Color();
    this.lastBallVy = 0;
    this.sprintTimer = 0;
  }

  emit(x, y, z, count, { spread = 1, up = 1, kind = this.fx, dir = null } = {}) {
    for (let i = 0; i < count; i++) {
      const idx = this.next;
      const q = this.p[idx];
      this.next = (idx + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random()) * spread;
      q.x = x + (Math.random() - 0.5) * 0.3;
      q.y = y + Math.random() * 0.1;
      q.z = z + (Math.random() - 0.5) * 0.3;
      q.vx = Math.cos(a) * sp + (dir ? dir.x * spread * 1.5 : 0);
      q.vz = Math.sin(a) * sp + (dir ? dir.z * spread * 1.5 : 0);
      q.vy = (0.3 + Math.random()) * kind.lift * up;
      q.g = kind.gravity ?? 2.5;
      q.drag = kind.drag;
      q.max = kind.life * (0.6 + Math.random() * 0.8);
      q.life = q.max;
      this.tmp.setHex(kind.colors[(Math.random() * kind.colors.length) | 0]);
      this.col.set([this.tmp.r, this.tmp.g, this.tmp.b], idx * 3);
    }
  }

  // Einmalige Anlässe aus den Spielereignissen.
  handle(match) {
    const find = (id) => match.players.find((p) => p.id === id);
    for (const e of match.events) {
      const p = e.playerId && find(e.playerId);
      if (e.type === 'slide' && p) this.emit(p.pos.x, 0.05, p.pos.z, 18, { spread: 1.3, dir: p.facing });
      else if ((e.type === 'shot' || (e.type === 'pass' && e.lofted)) && p) this.emit(match.ball.pos.x, 0.05, match.ball.pos.z, e.type === 'shot' ? 8 : 4, { spread: 0.8, dir: { x: -p.facing.x * 0.3, z: -p.facing.z * 0.3 } });
      else if ((e.type === 'tackle' || e.type === 'poke_won') && p) this.emit(match.ball.pos.x, 0.05, match.ball.pos.z, 6, { spread: 1 });
      else if (e.type === 'foul' && e.victimId) {
        const v = find(e.victimId);
        if (v) this.emit(v.pos.x, 0.05, v.pos.z, 14, { spread: 1.4 });
      } else if (e.type === 'scrape' && p) this.emit(p.pos.x, 0.05, p.pos.z, 18, { spread: 1.6, up: 1.3 });
      if (this.wet && (e.type === 'slide' || e.type === 'foul') && p) this.emit(p.pos.x, 0.05, p.pos.z, 10, { spread: 1.6, up: 1.4, kind: WATER });
    }
  }

  update(match, dt) {
    // Laufende Quellen: Grätsche zieht eine Spur, Sprint auf Asche staubt, Ball-Aufsetzer.
    this.sprintTimer -= dt;
    const dusty = this.fx === SURFACE_FX.ash || this.wet;
    for (const p of match.players) {
      if (p.state === 'tackle' && Math.random() < dt * 70) this.emit(p.pos.x, 0.04, p.pos.z, 1, { spread: 0.5, dir: { x: -p.facing.x * 0.3, z: -p.facing.z * 0.3 } });
      else if (dusty && this.sprintTimer <= 0 && Math.hypot(p.vel.x, p.vel.z) > 6.2 && Math.random() < 0.35) this.emit(p.pos.x - p.facing.x * 0.3, 0.03, p.pos.z - p.facing.z * 0.3, 1, { spread: 0.4, up: 0.6, kind: this.wet ? WATER : this.fx });
    }
    if (this.sprintTimer <= 0) this.sprintTimer = 0.08;
    const b = match.ball;
    if (this.lastBallVy < -3 && b.vel.y >= 0 && b.pos.y < 0.2) this.emit(b.pos.x, 0.03, b.pos.z, this.wet ? 8 : 5, { spread: 0.7, up: 0.8, kind: this.wet ? WATER : this.fx });
    this.lastBallVy = b.vel.y;

    for (let i = 0; i < MAX; i++) {
      const q = this.p[i];
      if (q.life <= 0) {
        if (this.pos[i * 3 + 1] !== -10) this.pos[i * 3 + 1] = -10;
        continue;
      }
      q.life -= dt;
      const k = Math.exp(-q.drag * dt);
      q.vx *= k;
      q.vz *= k;
      q.vy -= q.g * dt;
      q.x += q.vx * dt;
      q.y = Math.max(0.02, q.y + q.vy * dt);
      q.z += q.vz * dt;
      this.pos[i * 3] = q.x;
      this.pos[i * 3 + 1] = q.life > 0 ? q.y : -10;
      this.pos[i * 3 + 2] = q.z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
