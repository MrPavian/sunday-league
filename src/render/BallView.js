import * as THREE from 'three';
import { BALL_RADIUS } from '../sim/ball.js';
import { BALL_VISUAL_RADIUS, createBallModel, rollBall } from './BallModel.js';
import { keepAlpha } from './materials.js';
import { currentQuality } from './quality.js';

// Ball 2.0 – Darstellung des Balls. Die Simulation wird nur gelesen (Position, Geschwindigkeit,
// Ereignisse); Flugbahn, Tempo und Aufsetzer bleiben genau, wie sie sind.
//
//   Spielereignis (shot, pass, header, save, post, bar, goal) + Ballbewegung
//     → Ball: Drehung (Tempo gedeckelt, Drall in der Luft), kurzes Stauchen beim Aufsetzer
//     → Schatten: Kontaktfleck direkt darunter (höher = größer und lichter, gerastert)
//     → Akzente: kurzer Pixel-Schweif nur bei harten Schüssen/Paraden, Aufprall-Pixel,
//       Netz beult sich beim Tor aus, bei Tor und hartem Pfostentreffer zuckt das Bild 1 Pixel
//
// Aufprall-Pixel laufen über den gemeinsamen Effekt-Pool (Effects.js), der Schweif ist ein
// einziger Punkte-Draw-Call, das Netz ein eigener Mesh je Tor (nur ab Stufe mit netFx).

const TRAIL_SPEED = 17; // m/s: erst harte Schüsse bekommen einen Schweif
const SQUASH_TIME = 0.08;
const KICK_BLEND = 0.09; // s, bis der sichtbare Ball wieder genau auf der Bahn der Simulation liegt
const NET = { k: 140, damp: 9, kick: 3.2 }; // Feder: nach hinten, kurz zurück, Ruhe

export class BallView {
  // root: Szene der MatchView; scene: ganze Szene (dort liegen die Tornetze des Spielorts).
  constructor(root, scene, effects) {
    const q = currentQuality();
    this.q = q;
    this.effects = effects;
    this.group = new THREE.Group();
    this.mesh = createBallModel();
    this.group.add(this.mesh);
    this.group.userData.ball = true;
    root.add(this.group);
    this.squash = 0;
    this.lastVy = 0;
    this.lastSpeed = 0;
    this.accent = 0; // Schweif auch unter der Tempogrenze (Parade, Pfosten)
    this.shakeT = 0;
    this.shakeSign = 1;
    this.stats = { trail: 0, net: 0, shadow: 0, height: 0, impacts: 0 };
    // Kontakt-Versatz: Die Simulation schießt aus bis zu 0,75–1 m Abstand. Fürs Auge startet
    // der Ball am Fuß (bzw. Kopf) und holt seine echte Bahn in KICK_BLEND Sekunden ein.
    this.off = { x: 0, y: 0, z: 0, t: 1 };
    // In der Hand des Torwarts (Fangen, Wurf, Abschlag): MatchView meldet je Bild die Handposition, der
    // Ball folgt ihr und löst sich weich, wenn keine Meldung mehr kommt (carryW 0…1).
    this.carry = { x: 0, y: 0, z: 0, on: false };
    this.carryW = 0;

    // Schweif: wenige Punkte hinter dem Ball, vorne 3 Pixel, hinten 1 – in Ballfarbe, halbtransparent.
    this.trailN = q.ballTrail ?? 0;
    if (this.trailN) {
      const g = new THREE.BufferGeometry();
      this.trailPos = new Float32Array(this.trailN * 3).fill(-50);
      g.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
      const sizes = new Float32Array(this.trailN);
      for (let i = 0; i < this.trailN; i++) sizes[i] = Math.max(1, Math.round(3 - (i * 2.5) / this.trailN));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      const mat = keepAlpha(new THREE.PointsMaterial({ color: 0xf2f2ea, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false }));
      mat.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSize;').replace('gl_PointSize = size;', 'gl_PointSize = aSize;');
      };
      mat.customProgramCacheKey = () => 'ball-trail';
      this.trail = new THREE.Points(g, mat);
      this.trail.frustumCulled = false;
      this.trail.visible = false;
      this.trail.userData.ball = true;
      root.add(this.trail);
    }

    // Tornetze des Spielorts (props.js makeGoalFrame, nur wenn netFx an ist).
    this.nets = [];
    scene.traverse((o) => {
      if (o.userData.net) this.nets.push({ mesh: o, x: 0, v: 0, ...o.userData.net });
    });
  }

  get material() {
    return this.mesh.material;
  }

  // Einmalige Akzente zu den Ereignissen dieses Schritts.
  handle(match) {
    const b = match.ball;
    const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
    const fx = this.effects;
    for (const e of match.events) {
      if ((e.type === 'shot' || e.type === 'pass' || e.type === 'header') && e.playerId) this.contact(match, e);
      if (e.type === 'header') {
        fx.ballImpact(b.pos.x, b.pos.y, b.pos.z, 3, 0.8);
        this.stats.impacts++;
      } else if (e.type === 'save') {
        fx.ballImpact(b.pos.x, b.pos.y, b.pos.z, 4, 1);
        this.accent = 0.15;
        this.stats.impacts++;
      } else if (e.type === 'post' || e.type === 'bar') {
        fx.ballImpact(b.pos.x, b.pos.y, b.pos.z, 5, 1.2);
        this.accent = 0.12;
        if (speed > 14) this.shake(0.1);
        this.stats.impacts++;
      } else if (e.type === 'goal') {
        this.goal(b);
      }
    }
  }

  // Sichtbaren Kontaktpunkt merken: Fuß ≈ 0,42 m vor der Hüfte in Schussrichtung, Kopf in Kopfhöhe.
  contact(match, e) {
    const p = match.players.find((q) => q.id === e.playerId);
    if (!p) return;
    const b = match.ball.pos;
    const head = e.type === 'header';
    const k = p.look?.height ?? 1;
    const fx = p.pos.x + p.facing.x * (head ? 0.18 : 0.42);
    const fz = p.pos.z + p.facing.z * (head ? 0.18 : 0.42);
    const fy = head ? 1.62 * k : BALL_RADIUS;
    const dx = fx - b.x;
    const dz = fz - b.z;
    if (dx * dx + dz * dz > 1.7) return; // weit weg (z. B. Abstoß aus der Hand): kein Versatz
    this.off.x = dx;
    this.off.y = head ? fy - b.y : 0;
    this.off.z = dz;
    this.off.t = 0;
  }

  // Tor: das Netz beult sich dort aus, wo der Ball einschlägt, ein paar Netz-Pixel fliegen,
  // das Bild zuckt einmal um ein Pixel. Jubel der Spieler und Zuschauer kommen aus Phase 3/4.
  goal(b) {
    const side = Math.sign(b.pos.x) || 1;
    const net = this.nets.find((n) => n.sign === side);
    if (net) {
      net.v += NET.kick * (this.q.netFx ?? 0) * Math.min(1.3, 0.5 + Math.hypot(b.vel.x, b.vel.z) / 20);
      net.mesh.material.userData.hit.value.set(b.pos.y, b.pos.z);
    }
    this.effects.ballImpact(b.pos.x, b.pos.y, b.pos.z, 6, 1.1, true);
    this.shake(0.14);
    this.stats.impacts++;
  }

  shake(t) {
    if (this.q.shake) this.shakeT = Math.max(this.shakeT, t);
  }

  // Versatz der Kamera in Pixeln (−1, 0, 1) – main.js verschiebt die Kamera um so viele
  // interne Pixel, nur fürs Bild, die Spielkamera selbst bleibt unverändert.
  shakeOffset(dt) {
    if (this.shakeT <= 0) return 0;
    this.shakeT -= dt;
    this.shakeSign = -this.shakeSign;
    return this.shakeT > 0 ? this.shakeSign : 0;
  }

  // Ball für dieses Bild in die Hand legen (Weltposition der Ballmitte).
  holdAt(x, y, z) {
    const c = this.carry;
    c.x = x;
    c.y = y;
    c.z = z;
    c.on = true;
  }

  // Jedes Bild: Ball an die Simulationsposition, Drehung, Stauchen, Schweif, Netze.
  // blob(x, z, scale, density) setzt den Kontaktschatten (MatchView, gleicher Draw Call wie die Spieler).
  sync(match, dt, blob) {
    const b = match.ball;
    const g = this.group;
    g.visible = !match.ballHidden;
    const h = Math.max(0, b.pos.y - BALL_RADIUS); // Höhe über dem Boden
    const air = h > 0.08;
    // Aufsetzer: fällt schnell, steigt wieder – kurz 1–2 Pixel stauchen, keine Cartoon-Verformung.
    if (this.lastVy < -3 && b.vel.y >= 0 && h < 0.1) this.squash = SQUASH_TIME * Math.min(1, -this.lastVy / 8);
    this.lastVy = b.vel.y;
    let sy = 1;
    if (this.squash > 0) {
      // erst zeigen, dann abklingen: das erste Bild nach dem Aufsetzer ist das gestauchteste
      sy = 1 - 0.16 * (this.squash / SQUASH_TIME);
      this.squash = Math.max(0, this.squash - dt);
    }
    g.scale.set(1 + (1 - sy) * 0.5, sy, 1 + (1 - sy) * 0.5);
    const o = this.off;
    let w = 0;
    if (o.t < KICK_BLEND) {
      o.t += dt;
      w = Math.max(0, 1 - o.t / KICK_BLEND);
      w *= w;
    }
    let bx = b.pos.x + o.x * w;
    let bz = b.pos.z + o.z * w;
    let by = b.pos.y + o.y * w;
    const c = this.carry;
    this.carryW += ((c.on ? 1 : 0) - this.carryW) * Math.min(1, dt * (c.on ? 40 : 14));
    if (this.carryW > 0.002) {
      bx += (c.x - bx) * this.carryW;
      by += (c.y - by) * this.carryW;
      bz += (c.z - bz) * this.carryW;
    }
    c.on = false;
    g.position.set(bx, by - BALL_RADIUS + BALL_VISUAL_RADIUS * sy, bz);
    rollBall(this.mesh, b.vel, dt, air);

    // Kontaktschatten: am Boden klein und satt, je höher desto größer und lichter (gerastert).
    const k = Math.min(1, h / 3);
    const density = g.visible ? 1 - 0.65 * k : 0;
    blob(bx, bz, 0.42 + 0.4 * k, density);
    this.stats.shadow = density;
    this.stats.height = h;

    this.syncTrail(b, dt);
    this.syncNets(dt);
  }

  syncTrail(b, dt) {
    if (!this.trail) return;
    this.accent = Math.max(0, this.accent - dt);
    const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
    const on = (speed > TRAIL_SPEED || (this.accent > 0 && speed > 6)) && this.group.visible;
    this.trail.visible = on;
    this.stats.trail = on ? this.trailN : 0;
    if (!on) return;
    // Gerade Spur entgegen der Flugrichtung, Punktabstand ≈ ein Ballradius.
    const ix = -b.vel.x / speed;
    const iy = -b.vel.y / speed;
    const iz = -b.vel.z / speed;
    const y = b.pos.y - BALL_RADIUS + BALL_VISUAL_RADIUS;
    for (let i = 0; i < this.trailN; i++) {
      const d = 0.22 + i * 0.17;
      this.trailPos[i * 3] = b.pos.x + ix * d;
      this.trailPos[i * 3 + 1] = y + iy * d;
      this.trailPos[i * 3 + 2] = b.pos.z + iz * d;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  syncNets(dt) {
    let max = 0;
    for (const n of this.nets) {
      if (n.x === 0 && n.v === 0) continue;
      // gedämpfte Feder, feste Schrittweite gegen Ausreißer bei langen Bildern
      const step = Math.min(dt, 1 / 30);
      n.v += (-NET.k * n.x - NET.damp * n.v) * step;
      n.x += n.v * step;
      if (Math.abs(n.x) < 0.002 && Math.abs(n.v) < 0.02) n.x = n.v = 0;
      n.mesh.material.userData.amount.value = n.x;
      max = Math.max(max, Math.abs(n.x));
    }
    this.stats.net = max;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.trail) {
      this.trail.geometry.dispose();
      this.trail.material.dispose();
    }
    for (const n of this.nets) n.mesh.material.userData.amount.value = 0;
  }
}
