import * as THREE from 'three';
import { keepAlpha } from './materials.js';
import { currentQuality } from './quality.js';

// Kleine Partikeleffekte: Staub, Grasfetzen, Spritzwasser. Alles in einem Pool
// und einem einzigen Draw Call. Farben und Verhalten hängen vom Untergrund ab.
// Die Poolgröße kommt aus der Qualitätsstufe (quality.js).

const SURFACE_FX = {
  asphalt: { colors: [0x8a8a86, 0x9c9a94, 0x74736f], size: 4, life: 0.45, lift: 1.2, drag: 3.5 },
  concrete: { colors: [0x9a9890, 0xb0ada4, 0x807e78], size: 4, life: 0.45, lift: 1.2, drag: 3.5 },
  ash: { colors: [0xe8b898, 0xdca47e, 0xf2cdb0, 0xcf906c], size: 6, life: 1.2, lift: 2.2, drag: 2.4, gravity: 1.2 },
  grass: { colors: [0x4f8a3c, 0x62a04a, 0x3d6e30, 0x6b5238], size: 4, life: 0.55, lift: 2.4, drag: 2.5, gravity: 7 },
  parkGrass: { colors: [0x5a8f40, 0x6ea04c, 0x46742f, 0x6b5238], size: 4, life: 0.55, lift: 2.4, drag: 2.5, gravity: 7 },
  hall: { colors: [0xe6dcc8, 0xf4efe4], size: 2, life: 0.25, lift: 0.6, drag: 5 },
  artificial: { colors: [0x1c1c1c, 0x2c2c2c, 0x48a040], size: 3, life: 0.5, lift: 2, drag: 3, gravity: 7 },
};
const WATER = { colors: [0xcfe4f2, 0xe8f2fa, 0xa8c4d8, 0xffffff], // weiß dazu: auf nassem, dunklem Boden besser zu sehen
  size: 3, life: 0.4, lift: 2.2, drag: 2.5, gravity: 9 };
// Pulverschnee, den Schritte und Schüsse aufwirbeln.
const SNOW = { colors: [0xf4f7fb, 0xe2e8f0, 0xffffff], size: 3, life: 0.55, lift: 1.5, drag: 3.2, gravity: 4 };
// Ball 2.0: kurze helle Aufprall-Pixel (Kopfball, Parade, Pfosten) und Netz-Pixel beim Tor;
// harter Aufsetzer auf Asphalt/Beton: ein paar graue Körner.
const IMPACT = { colors: [0xffffff, 0xf2f2e8, 0xe0e4ea], size: 3, life: 0.2, lift: 0.6, drag: 7, gravity: 1 };
const NETFX = { colors: [0xe8e8e0, 0xd8d8d0, 0xffffff], size: 3, life: 0.35, lift: 1, drag: 4, gravity: 3 };
const HARD = new Set(['asphalt', 'concrete']);

// Wetter 2.0: Spritzer entstehen nur an Kontakten, die das Spiel ohnehin liefert (Sprint,
// Richtungswechsel, Schuss/Pass, Grätsche, Hechtsprung, Ball-Aufsetzer) – 2 bis 6 Partikel,
// in einer Pfütze etwas mehr. Menge: Nässe × Qualitätsstufe × Profil des Spielorts.
export const SPLASH_MAX = 6;

export class Effects {
  // weather: WeatherFx (weather.js) – liefert Nässe, Schnee und Pfützen; ohne: trocken.
  constructor(root, match, weather = null) {
    const MAX = (this.max = currentQuality().particles);
    this.fx = SURFACE_FX[match.pitch.surface?.id] ?? SURFACE_FX.grass;
    this.weather = weather;
    this.p = Array.from({ length: MAX }, () => ({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, max: 1 }));
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3).fill(-10);
    this.col = new Float32Array(MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    // Punkte in Pixelgröße – die Kamera ist orthografisch.
    this.points = new THREE.Points(geo, keepAlpha(new THREE.PointsMaterial({ size: this.fx.size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false })));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    root.add(this.points);
    this.tmp = new THREE.Color();
    this.lastBallVy = 0;
    this.sprintTimer = 0;
    this.facing = new Map(); // Spieler-Id → letzte Blickrichtung (Richtungswechsel)
    this.surfaceId = match.pitch.surface?.id ?? 'grass';
    this.impactQ = currentQuality().impacts ?? 1;
    this.ballFx = new Uint8Array(MAX); // 1 = Partikel stammt von einem Ball-Akzent (Debug-Anzeige)
  }

  // Aufprall-Pixel am Ball (n bei voller Qualität). net: Netz-Pixel statt heller Funken.
  ballImpact(x, y, z, n, spread = 1, net = false) {
    const count = Math.max(1, Math.round(n * this.impactQ));
    const first = this.next;
    this.emit(x, y - 0.05, z, count, spread, 1, net ? NETFX : IMPACT);
    for (let i = 0; i < count; i++) this.ballFx[(first + i) % this.max] = 1;
  }

  // Ball trifft den Boden (Aufsetzer, Schuss aus dem Stand): je nach Untergrund und Wetter,
  // Stärke 0…1 aus dem Balltempo. Rasen kaum, Asche staubt, Asphalt harte Körner, nass spritzt,
  // Schnee stäubt, Halle fast nichts. Gibt die Zahl der Partikel zurück.
  groundKick(x, z, strength) {
    if (strength < 0.15) return 0;
    if (this.splash(x, z, Math.round(2 + 4 * strength), 0.6 + 0.4 * strength, 0.8)) return 1;
    const id = this.surfaceId;
    let n = 0;
    let kind = this.fx;
    if (id === 'ash') n = Math.round(1 + 5 * strength);
    else if (HARD.has(id)) {
      n = strength > 0.45 ? 2 + Math.round(2 * strength) : 0;
      kind = this.fx;
    } else if (id === 'hall') n = strength > 0.6 ? 1 : 0;
    else n = strength > 0.55 ? Math.round(1 + 2 * strength) : 0; // Rasen: nur kräftig ein paar Halme
    n = Math.round(n * this.impactQ);
    if (n > 0) this.emit(x, 0.03, z, n, 0.5 + 0.5 * strength, 0.6 + 0.6 * strength, kind);
    return n;
  }

  get wet() {
    return (this.weather?.state.wet ?? 0) > 0.35;
  }

  emit(x, y, z, count, spread = 1, up = 1, kind = this.fx, dx = 0, dz = 0) {
    for (let i = 0; i < count; i++) {
      const idx = this.next;
      this.ballFx[idx] = 0;
      const q = this.p[idx];
      this.next = (idx + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random()) * spread;
      q.x = x + (Math.random() - 0.5) * 0.3;
      q.y = y + Math.random() * 0.1;
      q.z = z + (Math.random() - 0.5) * 0.3;
      q.vx = Math.cos(a) * sp + dx * spread * 1.5;
      q.vz = Math.sin(a) * sp + dz * spread * 1.5;
      q.vy = (0.3 + Math.random()) * kind.lift * up;
      q.g = kind.gravity ?? 2.5;
      q.drag = kind.drag;
      q.max = kind.life * (0.6 + Math.random() * 0.8);
      q.life = q.max;
      this.tmp.setHex(kind.colors[(Math.random() * kind.colors.length) | 0]);
      this.col[idx * 3] = this.tmp.r;
      this.col[idx * 3 + 1] = this.tmp.g;
      this.col[idx * 3 + 2] = this.tmp.b;
    }
  }

  // Bodenkontakt auf nassem oder verschneitem Boden: Spritzwasser bzw. Schneestaub.
  // n = Partikel bei voller Nässe (2…6). Gibt zurück, ob etwas gespritzt hat.
  splash(x, z, n, spread = 0.8, up = 1, dx = 0, dz = 0) {
    const w = this.weather;
    if (!w) return false;
    const s = w.state;
    const snow = s.snow > 0.4;
    if (!snow && s.wet <= 0.35) return false;
    const puddle = !snow && w.inPuddle(x, z);
    const k = (snow ? s.snow : Math.min(1, s.wet)) * s.splash * (puddle ? 1.7 : 1);
    const count = Math.min(puddle ? SPLASH_MAX + 4 : SPLASH_MAX, Math.round(n * k));
    if (count < 1) return false;
    this.emit(x, 0.04, z, count, spread * (puddle ? 1.3 : 1), up * (puddle ? 1.4 : 1), snow ? SNOW : WATER, dx, dz);
    w.countSplash();
    return true;
  }

  // Einmalige Anlässe aus den Spielereignissen.
  handle(match) {
    const find = (id) => match.players.find((p) => p.id === id);
    // Nasse Asche staubt nicht mehr, sie klebt.
    const dust = !(this.fx === SURFACE_FX.ash && this.wet);
    const b = match.ball.pos;
    for (const e of match.events) {
      const p = e.playerId && find(e.playerId);
      if (e.type === 'slide' && p) {
        if (dust) this.emit(p.pos.x, 0.05, p.pos.z, 18, 1.3, 1, this.fx, p.facing.x, p.facing.z);
        this.splash(p.pos.x, p.pos.z, 6, 1.4, 1.3, p.facing.x * 0.6, p.facing.z * 0.6);
      } else if (e.type === 'shot' && p) {
        // Schuss: Stärke aus der Schusskraft der Simulation – leichter Schuss fast nichts.
        this.groundKick(b.x, b.z, Math.min(1, e.power ?? 0.6));
      } else if (e.type === 'pass' && p) {
        // Pässe: kein großer Effekt – nur trockene Asche staubt beim hohen Ball ein wenig,
        // auf nassem Boden spritzt es leicht.
        if (e.lofted && dust && this.fx === SURFACE_FX.ash) this.emit(b.x, 0.05, b.z, 2, 0.5, 0.8, this.fx, -p.facing.x * 0.3, -p.facing.z * 0.3);
        this.splash(b.x, b.z, 2, 0.6, 0.8, -p.facing.x * 0.3, -p.facing.z * 0.3);
      } else if (e.type === 'touch' && p && dust && this.fx === SURFACE_FX.ash && Math.hypot(p.vel.x, p.vel.z) > 6) {
        this.emit(b.x, 0.03, b.z, 1, 0.4, 0.6); // Ballkontakt im Sprint auf trockener Asche
      } else if ((e.type === 'tackle' || e.type === 'poke_won') && p) {
        this.emit(b.x, 0.05, b.z, 6, 1);
        this.splash(b.x, b.z, 3, 0.9);
      } else if (e.type === 'foul' && e.victimId) {
        const v = find(e.victimId);
        if (v) {
          if (dust) this.emit(v.pos.x, 0.05, v.pos.z, 14, 1.4);
          this.splash(v.pos.x, v.pos.z, 6, 1.5, 1.3);
        }
      } else if (e.type === 'scrape' && p) this.emit(p.pos.x, 0.05, p.pos.z, 18, 1.6, 1.3);
    }
  }

  update(match, dt) {
    // Laufende Quellen: Grätsche zieht eine Spur, Sprint auf Asche staubt, auf nassem Boden
    // spritzt es beim Sprint und beim scharfen Richtungswechsel, der Ball beim Aufsetzen.
    this.sprintTimer -= dt;
    const wet = this.wet;
    const snow = (this.weather?.state.snow ?? 0) > 0.4;
    const dusty = this.fx === SURFACE_FX.ash && !wet && !snow;
    for (const p of match.players) {
      const speed = Math.hypot(p.vel.x, p.vel.z);
      let f = this.facing.get(p.id);
      if (!f) this.facing.set(p.id, (f = { x: p.facing.x, z: p.facing.z }));
      const turn = f.x * p.facing.x + f.z * p.facing.z < 0.5 && speed > 3.5;
      f.x = p.facing.x;
      f.z = p.facing.z;
      if (p.state === 'tackle' && Math.random() < dt * 70) this.emit(p.pos.x, 0.04, p.pos.z, 1, 0.5, 1, this.fx, -p.facing.x * 0.3, -p.facing.z * 0.3);
      else if (turn && (wet || snow)) this.splash(p.pos.x, p.pos.z, 3, 0.7, 0.9, -p.facing.x * 0.4, -p.facing.z * 0.4);
      else if (this.sprintTimer <= 0 && speed > 6.2 && Math.random() < 0.35) {
        const x = p.pos.x - p.facing.x * 0.3;
        const z = p.pos.z - p.facing.z * 0.3;
        if (wet || snow) this.splash(x, z, 2, 0.4, 0.7);
        else if (dusty) this.emit(x, 0.03, z, 1, 0.4, 0.6);
      }
    }
    if (this.sprintTimer <= 0) this.sprintTimer = 0.08;
    // Ball-Aufsetzer: aus der Ballbewegung der Simulation (fällt schnell, steigt wieder).
    const b = match.ball;
    if (this.lastBallVy < -3 && b.vel.y >= 0 && b.pos.y < 0.2) this.groundKick(b.pos.x, b.pos.z, Math.min(1, -this.lastBallVy / 9));
    this.lastBallVy = b.vel.y;

    for (let i = 0; i < this.max; i++) {
      const q = this.p[i];
      if (q.life <= 0) {
        if (this.pos[i * 3 + 1] !== -10) this.pos[i * 3 + 1] = -10;
        this.ballFx[i] = 0;
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
