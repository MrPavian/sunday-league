// Die Stammkneipe als 3D-Raum (ROADMAP 11.12, vom Nutzer gewünscht 2026-10-28): Theke mit dem Wirt, Stammtisch mit Opa Heinz
// und ein paar Spielern, zwei am Dartboard, Wimpel und Schals in den Vereinsfarben, Meisterwimpel aus der Vereinsgeschichte.
// Nur Darstellung: Die Funktionen der Kneipe bleiben in career/pub.js; angetippt wird über HTML-Knöpfe, die über den Figuren
// liegen (anchors, ui/clubhouse/pub.js). Gerendert vom selben PixelRenderer wie der Platz, solange der Kneipen-Reiter offen ist
// (main.js) – kein zweiter WebGL-Kontext.
import * as THREE from 'three';
import { createRng } from '../../core/rng.js';
import { box, cylinder } from '../props.js';
import { emissiveToon, toon } from '../materials.js';
import { mergeStatic } from '../merge.js';
import { animatePlayer, createPlayerModel, disposeKit } from '../PlayerModel.js';
import { arm, leg } from '../player/poses.js';

// Raum (Meter): Rückwand bei z = -3,4, Theke links, Stammtisch rechts, Dartboard an der rechten Wand.
const ROOM = { w: 11, d: 7.2, h: 3.2 };
const BACK = -ROOM.d / 2 + 0.1;
const DART_ANCHOR = new THREE.Vector3(ROOM.w / 2 - 0.3, 2.15, 1.4);
const ROOM_HALF = 6.0; // halbe Bildbreite für den ganzen Raum (m)
const ZOOM_HALF = 3.1; // hochkant: gut halbe Raumbreite, Figuren etwa doppelt so groß
const NARROW = 1.6; // Bühnen schmaler als 1,6 : 1 gelten als hochkant
// Lässige Kleidung für die Gäste (Jeans, Pulli) – Farben wie die Zuschauer, keine Vereinstrikots.
const TOPS = [0x5a6e8c, 0x8c3b3b, 0x3f6b4a, 0xc9b27a, 0x2f2f36, 0x7a5a8c, 0xb0b4ba, 0x9c6a3a];
const JEANS = [0x34425a, 0x2a3346, 0x4a4f5a];
const KALLE = { skin: 0xe6b894, hair: 0x3a2a1c, halbglatze: true, beard: true, beardStyle: 'moustache', belly: 0.25, paunch: 1, height: 1.0 };
const HEINZ = { skin: 0xf1d0b5, hair: 0xd8d8d8, bald: true, beard: false, belly: 0.2, paunch: 0.6, height: 0.96, specs: true };

const hexToRgb = (n) => `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;

// Wimpelkette: kleine Dreiecke abwechselnd in den Vereinsfarben, an einer Schnur quer durch den Raum.
function pennants(group, colors, y, z, x0, x1) {
  const n = Math.round((x1 - x0) / 0.45);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.32, 0], 3));
  geo.setIndex([0, 2, 1]);
  geo.computeVertexNormals();
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    const sag = 0.18 * Math.sin((Math.PI * (i + 0.5)) / n);
    const m = new THREE.Mesh(geo, toon(colors[i % colors.length]));
    m.material.side = THREE.DoubleSide;
    m.position.set(x, y - sag, z);
    group.add(m);
  }
  group.add(box(x1 - x0, 0.02, 0.02, 0x2a2a2a, (x0 + x1) / 2, y - 0.09, z));
}

// Fanschal an der Wand: Streifen in den Vereinsfarben, Fransen unten.
function scarf(group, colors, x, y, z, rot = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) g.add(box(0.22, 0.13, 0.03, colors[i % colors.length], 0, -i * 0.13, 0));
  g.position.set(x, y, z);
  g.rotation.z = rot;
  group.add(g);
}

// Kleines Schild aus einer Leinwand (Vereinsname über der Theke, Meisterwimpel mit Jahr).
function sign(text, { w = 2.4, h = 0.42, bg = '#1f3a2a', fg = '#f2e6c8', px = 22 } = {}) {
  if (typeof document === 'undefined') return new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.font = `bold ${px}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(0xffffff, { map: tex }));
}

function room(root, club, titles) {
  const { w, d, h } = ROOM;
  const colors = [club.kit.shirt, club.kit.second ?? 0xf2efe6];
  root.add(box(w, 0.1, d, 0x6b4a2e, 0, -0.05, 0)); // Dielenboden
  for (let i = -5; i <= 5; i++) root.add(box(0.02, 0.012, d, 0x5a3d25, i, 0.002, 0));
  root.add(box(w, h, 0.12, 0xc9b48a, 0, h / 2, -d / 2)); // Rückwand
  root.add(box(w, 1.1, 0.14, 0x7a5533, 0, 0.55, -d / 2 + 0.02)); // Holzvertäfelung
  root.add(box(0.12, h, d, 0xbfa77c, -w / 2, h / 2, 0)); // linke Wand
  root.add(box(0.12, h, d, 0xbfa77c, w / 2, h / 2, 0)); // rechte Wand
  root.add(box(0.14, 1.1, d, 0x7a5533, -w / 2 + 0.02, 0.55, 0), box(0.14, 1.1, d, 0x7a5533, w / 2 - 0.02, 0.55, 0));
  // Theke links mit Zapfhahn, Regal und Flaschen.
  root.add(box(3.6, 1.05, 0.7, 0x5e3f24, -3.4, 0.525, -1.9), box(3.8, 0.08, 0.85, 0x3e2a18, -3.4, 1.09, -1.9));
  root.add(box(0.08, 0.35, 0.08, 0xc0c4c8, -3.0, 1.3, -1.95), box(0.08, 0.35, 0.08, 0xc0c4c8, -3.3, 1.3, -1.95));
  root.add(box(0.16, 0.07, 0.07, 0xe6b422, -3.0, 1.47, -1.95), box(0.16, 0.07, 0.07, 0x1d2b44, -3.3, 1.47, -1.95));
  root.add(box(3.6, 0.05, 0.3, 0x5e3f24, -3.4, 1.7, BACK + 0.15), box(3.6, 0.05, 0.3, 0x5e3f24, -3.4, 2.15, BACK + 0.15));
  const rng = createRng(7);
  const bottle = [0x2e6b3a, 0x6b3a2e, 0xd8c08a, 0x3a4a6b];
  for (let i = 0; i < 14; i++) {
    const shelf = i % 2 ? 1.73 : 2.18;
    root.add(cylinder(0.05, 0.3, rng.pick(bottle), -5 + i * 0.24, shelf + 0.15, BACK + 0.15, 6));
  }
  // Barhocker vor der Theke.
  for (const x of [-4.2, -2.6]) root.add(cylinder(0.2, 0.06, 0x8c2f2f, x, 0.78, -1.15, 8), cylinder(0.04, 0.76, 0x2a2a2a, x, 0.38, -1.15, 6));
  // Stammtisch rechts mit Schild „Stammtisch“ und Bierdeckeln.
  root.add(box(1.8, 0.07, 1.1, 0x6b4a2e, 1.6, 0.76, -0.4));
  for (const [x, z] of [[0.8, -0.85], [2.4, -0.85], [0.8, 0.05], [2.4, 0.05]]) root.add(box(0.07, 0.74, 0.07, 0x4a321e, x, 0.37, z));
  root.add(box(0.1, 0.012, 0.1, 0xf2efe6, 1.2, 0.8, -0.3), box(0.1, 0.012, 0.1, 0xf2efe6, 2.0, 0.8, -0.5));
  const stamm = sign('STAMMTISCH', { w: 0.7, h: 0.16, bg: '#3e2a18', px: 26 });
  stamm.position.set(1.6, 0.98, -0.45);
  root.add(stamm, box(0.03, 0.18, 0.03, 0x3e2a18, 1.6, 0.86, -0.45));
  // Stühle (Sitzhöhe 0,46).
  for (const [x, z, r] of [[1.0, -1.25, 0], [2.2, -1.25, 0], [3.0, -0.4, -Math.PI / 2], [0.2, -0.4, Math.PI / 2]]) {
    const ch = new THREE.Group();
    ch.add(box(0.42, 0.05, 0.42, 0x5e3f24, 0, 0.44, 0), box(0.42, 0.5, 0.05, 0x5e3f24, 0, 0.7, -0.19));
    for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) ch.add(box(0.04, 0.44, 0.04, 0x4a321e, a, 0.22, b));
    ch.position.set(x, 0, z);
    ch.rotation.y = r;
    root.add(ch);
  }
  // Dartboard an der rechten Wand, Abwurflinie auf dem Boden.
  root.add(cylinder(0.24, 0.04, 0x1c1c1c, w / 2 - 0.1, 1.73, 1.4, 16), cylinder(0.17, 0.045, 0xc8352f, w / 2 - 0.1, 1.73, 1.4, 16), cylinder(0.07, 0.05, 0x2e8b57, w / 2 - 0.1, 1.73, 1.4, 12));
  for (const o of root.children.slice(-3)) o.rotation.z = Math.PI / 2;
  root.add(box(0.05, 0.01, 0.6, 0xf2efe6, w / 2 - 2.4, 0.006, 1.4));
  // Lampen über Theke und Stammtisch.
  for (const x of [-3.4, 1.6]) root.add(box(0.03, 0.6, 0.03, 0x2a2a2a, x, h - 0.3, -0.6), new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), emissiveToon(0xffe2a0, 0xffe2a0, 1.1)).translateX(x).translateY(h - 0.65).translateZ(-0.6));
  // Vereinsfarben: Wimpelkette, Schals, Name über der Theke, Meisterwimpel.
  pennants(root, colors, h - 0.15, -1.2, -w / 2 + 0.3, w / 2 - 0.3);
  scarf(root, colors, 0.2, 2.6, BACK + 0.1, 0.15);
  scarf(root, colors, -0.3, 2.6, BACK + 0.1, -0.1);
  const name = sign(club.name.toUpperCase(), { w: 3.4, h: 0.42, bg: hexToRgb(club.kit.shirt), fg: '#f2efe6', px: 20 });
  name.position.set(-3.4, 2.65, BACK + 0.1);
  root.add(name);
  titles.slice(-6).forEach((year, i) => {
    const t = sign(`MEISTER ${year}`, { w: 0.62, h: 0.2, bg: '#c9a227', fg: '#1c1c1c', px: 22 });
    t.position.set(1.4 + (i % 3) * 0.75, 2.6 - Math.floor(i / 3) * 0.3, BACK + 0.1);
    root.add(t);
  });
  // Fenster in der Rückwand (Abendlicht) und die Tür rechts.
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.05), emissiveToon(0x30405a, 0x5a6e9c, 0.6)).translateX(3.4).translateY(2.0).translateZ(BACK + 0.06));
  root.add(box(0.9, 2.1, 0.06, 0x4a321e, 4.6, 1.05, BACK + 0.08));
}

// Eine Figur: Spieler-Modell in Alltagskleidung; pose: sitzen, Theke, Darts, Wirt.
function figure(look, rng, { kit = null, can = true } = {}) {
  const k = kit ?? { shirt: rng.pick(TOPS), shorts: rng.pick(JEANS), socks: 0x222222, trousers: true };
  const m = createPlayerModel({ ...look, can }, k, { edge: 'neutral', textured: false });
  m.mesh.castShadow = false;
  return m;
}

// Wer in der Kneipe sitzt: cast = [{ id, look, name }], höchstens sechs Spieler (die ersten zwei am Dartboard).
export class PubView {
  constructor({ club, wirt = null, cast = [], titles = [], seed = 1 }) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1410);
    const hemi = new THREE.HemisphereLight(0xffe7c2, 0x3a2a1c, 1.5);
    const lamp = new THREE.DirectionalLight(0xffe0b0, 1.6);
    lamp.position.set(-2, 8, 6);
    this.scene.add(hemi, lamp);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    room(this.root, club, titles);
    mergeStatic(this.root);
    const rng = createRng(seed);
    this.actors = [];
    this.t = 0;
    this.darts = [];
    const add = (id, model, pos, yaw, opts = {}) => {
      model.group.position.set(pos[0], pos[1] ?? 0, pos[2]);
      model.group.rotation.y = yaw;
      this.root.add(model.group);
      const a = { id, model, anchor: new THREE.Vector3(pos[0], (pos[1] ?? 0) + (opts.sitting ? 1.45 : 1.95), pos[2]), phase: rng.range(0, 6), ...opts };
      this.actors.push(a);
      return a;
    };
    add('wirt', figure(wirt?.look ?? KALLE, rng, { kit: { shirt: 0xf2efe6, shorts: 0x2a2a2a, socks: 0x222222, trousers: true }, can: false }), [-3.4, 0, -2.6], 0, { role: 'wirt', bar: true });
    add('heinz', figure(HEINZ, rng), [3.0, 0, -0.4], -Math.PI / 2, { role: 'heinz', sitting: true });
    const seats = [
      { pos: [1.0, 0, -1.25], yaw: 0, sitting: true },
      { pos: [2.2, 0, -1.25], yaw: 0, sitting: true },
      { pos: [0.2, 0, -0.4], yaw: Math.PI / 2, sitting: true },
      { pos: [-4.2, 0, -1.0], yaw: Math.PI, bar: true },
      { pos: [-2.6, 0, -1.0], yaw: Math.PI, bar: true },
    ];
    const dartSpots = [{ pos: [ROOM.w / 2 - 2.4, 0, 1.4], yaw: Math.PI / 2, dart: true }, { pos: [ROOM.w / 2 - 3.0, 0, 2.2], yaw: Math.PI / 2 + 0.5, dart: false, watch: true }];
    cast.slice(0, 7).forEach((p, i) => {
      const spot = i < 2 ? dartSpots[i] : seats[i - 2];
      if (!spot) return;
      add(`p${p.id}`, figure(p.look, rng), spot.pos, spot.yaw, { role: 'player', idx: p.id, sitting: !!spot.sitting, bar: !!spot.bar, thrower: !!spot.dart, watch: !!spot.watch });
    });
    this.dartGeo = new THREE.BoxGeometry(0.02, 0.02, 0.16);
    this.dartMat = toon(0xc8352f);
    this.camera = new THREE.OrthographicCamera(-6, 6, 3.6, -3.6, 0.1, 60);
    // Flach von vorn wie aus der Tür: Rückwand mit Theke, Regal, Wimpeln und Schals ist im Bild, der Boden nur vorn.
    this.camera.position.set(0, 4.6, 10);
    this.camera.lookAt(0, 1.35, -1.0);
    this.tmp = new THREE.Vector3();
    this.anim = { speed: 0, dt: 0, gesture: null, face: null, state: 'normal' };
  }

  // Bild an den HTML-Bereich anpassen (wie CameraRig.frameWindow). Breite Bühne: der ganze Raum (Theke bis Dartscheibe); ist sie
  // sehr flach (Handy quer), wird oben und unten beschnitten. Schmale Bühne (Handy hochkant, vom Nutzer gewünscht 2026-10-30): näher
  // ran, gut halbe Raumbreite, seitlich wischen (drag) oder die Kamera fährt zur gewählten Person (focus).
  frameRect(rect, screenW, screenH) {
    const key = `${rect.x | 0},${rect.y | 0},${rect.width | 0},${rect.height | 0},${screenW},${screenH}`;
    if (key === this.framed) return;
    this.framed = key;
    const aspect = rect.width / rect.height;
    this.halfW = aspect < NARROW ? ZOOM_HALF : ROOM_HALF;
    this.maxPan = Math.max(0, ROOM_HALF - this.halfW);
    this.stageW = rect.width;
    const hh = Math.max(1.3, this.halfW / aspect);
    Object.assign(this.camera, { left: -hh * aspect, right: hh * aspect, top: hh, bottom: -hh });
    this.camera.setViewOffset(rect.width, rect.height, -rect.x, -rect.y, screenW, screenH);
    this.camera.updateProjectionMatrix();
    // Beim ersten Einpassen zur gewählten Person, danach bleibt der Schwenk (Drehen, Größe ändern).
    const first = this.focusId && !this.placed ? this.anchorOf(this.focusId) : null;
    this.placed = true;
    this.setPan(first ? first.x : this.panTo ?? 0, true);
  }

  get zoomed() {
    return (this.maxPan ?? 0) > 0;
  }

  // Seitlich schwenken (Meter); jump = sofort statt weich.
  setPan(x, jump = false) {
    this.panTo = Math.max(-(this.maxPan ?? 0), Math.min(this.maxPan ?? 0, x));
    if (jump) this.panX = this.panTo;
    this.camera.position.x = this.panX ?? 0;
    this.camera.updateMatrixWorld(); // sonst erst beim Rendern – die Marker brauchen sie schon vorher
  }

  // Wischen: Fingerweg in Pixeln der Bühne → Schwenk in Metern (der Raum folgt dem Finger).
  drag(dxPx) {
    if (!this.zoomed || !this.stageW) return;
    this.setPan(this.panTo - (dxPx * 2 * this.halfW) / this.stageW, true);
  }

  // Zur Person (oder Dartscheibe) schwenken.
  focus(id) {
    this.focusId = id;
    const at = this.anchorOf(id);
    if (at) this.setPan(at.x);
  }

  // Wohin der Knopf einer Figur (oder der Dartscheibe) gehört (Bildschirm-Pixel); null = nicht im Raum.
  anchorOf(id) {
    if (id === 'dart') return DART_ANCHOR;
    return this.actors.find((a) => a.id === id)?.anchor ?? null;
  }

  screenOf(id, screenW, screenH) {
    const at = this.anchorOf(id);
    if (!at) return null;
    this.tmp.copy(at).project(this.camera);
    return { x: ((this.tmp.x + 1) / 2) * screenW, y: ((1 - this.tmp.y) / 2) * screenH };
  }

  // Wer gerade etwas sagt (Sprechblase, main.js): reihum alle 4 s ein anderer, nie der Dartwerfer.
  talker() {
    const talk = this.actors.filter((a) => !a.thrower);
    return talk.length ? talk[Math.floor(this.t / 4) % talk.length].id : null;
  }

  // Leben im Raum: trinken, reden, Darts werfen (Pfeile bleiben stecken, nach drei holt er sie).
  update(dt) {
    this.t += dt;
    if (this.panTo != null && Math.abs(this.panTo - (this.panX ?? 0)) > 0.002) {
      this.panX = (this.panX ?? 0) + (this.panTo - (this.panX ?? 0)) * (1 - Math.exp(-dt * 7));
      this.setPan(this.panTo);
    }
    for (const a of this.actors) {
      const g = (this.t + a.phase) % 9;
      this.anim.dt = dt;
      this.anim.gesture = null;
      if (a.role === 'wirt') this.anim.gesture = g < 4 ? 'dose' : null; // poliert ein Glas
      else if (a.thrower) this.anim.gesture = null;
      else if (g < 2.5) this.anim.gesture = 'bier';
      else if (g > 5 && g < 7 && !a.watch) this.anim.gesture = a.role === 'heinz' ? 'zeigen' : 'haende';
      animatePlayer(a.model, this.anim);
      if (a.sitting) {
        a.model.bones.hips.position.y -= 0.4; // wie die sitzenden Zuschauer (posePlayer sitting)
        leg(a.model.bones, 'L', -1.45, 1.45, 0);
        leg(a.model.bones, 'R', -1.45, 1.45, 0);
      }
      if (a.thrower) this.throwDart(a, dt);
    }
    for (const d of this.darts) {
      if (d.t >= 1) continue;
      d.t = Math.min(1, d.t + dt / 0.28);
      d.mesh.position.lerpVectors(d.from, d.to, d.t);
      d.mesh.position.y += Math.sin(d.t * Math.PI) * 0.12;
    }
  }

  throwDart(a, dt) {
    const cycle = (this.t + a.phase) % 2.6;
    const bn = a.model.bones;
    // Ausholen, Wurf (Unterarm schnellt nach vorn), Nachschwingen.
    const wind = cycle < 0.5 ? cycle / 0.5 : cycle < 0.62 ? 1 - (cycle - 0.5) / 0.12 : 0;
    arm(bn, 'R', -1.5 - 0.2 * wind, 0.1, -1.4 * wind - 0.15);
    if (cycle >= 0.62 && a.lastThrow !== Math.floor((this.t + a.phase) / 2.6)) {
      a.lastThrow = Math.floor((this.t + a.phase) / 2.6);
      if (this.darts.length >= 3) {
        for (const d of this.darts) this.root.remove(d.mesh);
        this.darts = [];
      }
      const mesh = new THREE.Mesh(this.dartGeo, this.dartMat);
      mesh.rotation.y = Math.PI / 2;
      const from = new THREE.Vector3(a.model.group.position.x + 0.3, 1.7, a.model.group.position.z - 0.2);
      const to = new THREE.Vector3(ROOM.w / 2 - 0.2, 1.73 + (this.darts.length - 1) * 0.06, 1.4 + (this.darts.length - 1) * 0.07);
      mesh.position.copy(from);
      this.root.add(mesh);
      this.darts.push({ mesh, from, to, t: 0 });
    }
    void dt;
  }

  dispose() {
    for (const a of this.actors) disposeKit(a.model);
    this.scene.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
  }
}
