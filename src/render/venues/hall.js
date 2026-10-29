import * as THREE from 'three';
import { tr } from '../../core/i18n.js';
import { emissiveToon, toon } from '../materials.js';
import { addLights, box, ground, makeBench, makeGoalFrame } from '../props.js';
import { GEO } from '../../sim/shelter.js';
import { endWallX } from '../../sim/players.js';
import { crowdRow, makeSpectator } from '../spectators.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vertexToon } from '../materials.js';
import { makeHallTexture, makeSignTextureWide } from '../textures.js';

// Rot-weiße Handballtore (props.js makeGoalFrame, bands): Rot ist eine Spielwahl, die Regel verlangt nur zwei Kontrastfarben.
const HALL_GOAL_RED = 0xc8352f;

// Fangnetz als halbdurchsichtige Fläche mit Maschen (statt Einzelstäben, die von oben wie eine Leiter wirkten – vom Nutzer
// gemeldet). Maschenweite 20 cm: Spielwert (das Tornetz darf laut IHF höchstens 10 × 10 cm haben, fürs Fangnetz gibt es keine
// Vorgabe; feiner flimmert es aus der Kameraentfernung). Eine Textur, ein Material für alle Netzflächen.
const NET_MESH = 0.2;
let netMat = null;
function catchNetMaterial() {
  if (netMat) return netMat;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(60, 74, 68, 0.08)';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(48, 58, 54, 0.85)';
  ctx.fillRect(0, 0, 32, 3);
  ctx.fillRect(0, 0, 3, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  netMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  return netMat;
}
// Netzfläche als Viereck (Ecken unten links, unten rechts, oben rechts, oben links); w und h: Maße in Metern für die Maschen.
function netQuad(corners, w, h) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, w / NET_MESH, 0, w / NET_MESH, h / NET_MESH, 0, h / NET_MESH], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, catchNetMaterial());
  mesh.renderOrder = 1;
  return mesh;
}

// Sporthalle der Kanalschule: Parkett mit bunten Linien, weiße Bande, Handballtore,
// Sprossenwand, Tribüne mit Klappbänken – und es riecht nach Hallenschuh.
export function buildHall(root, pitch, rng, scene) {
  root.add(addLights(scene, { span: 26 }));
  const { halfLength: hl, halfWidth: hw, wallX, goalHalfWidth: gw, goalHeight: gh } = pitch;
  const W = 48;
  const D = 30;
  root.add(ground(W, D, toon(0xffffff, { map: makeHallTexture(rng, { width: W, depth: D, pitch }) })));

  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s, pitch.goalDepth, { bands: HALL_GOAL_RED });
    goal.position.x = s * hl;
    root.add(goal);
  }

  // Weiße Bande rund ums Feld, mit Werbung vom Sponsor. An den Stirnseiten steht sie neben dem Tor bündig mit den Pfosten
  // (auf der Torlinie, ex); das Tor sitzt in einer Nische bis wallX (pitch.goalNiche, endWallX – dieselben Maße wie Ball und Spieler).
  const bande = 0xf2efe6;
  const ex = endWallX(pitch, hw);
  root.add(box(ex * 2 + 0.12, 0.9, 0.12, bande, 0, 0.45, -hw - 0.1));
  // Vorn mit Tür (GEO.hall, shelter.js): Schiri, Ordner und Platzverweise gehen durch die Lücke, nicht durch die Bande.
  // Die Lücke ist in der Kulisse leer; die Tür selbst (buildBoardDoor, unten) baut die IncidentView als eigenes bewegtes Mesh,
  // damit mergeStatic sie nicht einbackt. Der Ball prallt an der Bandenlinie auch an der Tür ab (ball.js: zMax gilt überall).
  const door = GEO.hall;
  const left = door.doorX - door.doorW / 2 + ex + 0.06;
  const right = ex + 0.06 - (door.doorX + door.doorW / 2);
  root.add(box(left, 0.9, 0.12, bande, -ex - 0.06 + left / 2, 0.45, hw + 0.1));
  root.add(box(right, 0.9, 0.12, bande, ex + 0.06 - right / 2, 0.45, hw + 0.1));
  const side = hw + 0.15 - gw; // Stirnbande neben dem Tor: vom Pfosten bis zur Ecke
  for (const s of [-1, 1]) {
    for (const sz of [-1, 1]) root.add(box(0.12, 0.9, side, bande, s * ex, 0.45, sz * (gw + side / 2)));
    // Tornische: Rückwand hinter dem Netz und die Seitenwände an den Pfosten.
    root.add(box(0.12, 0.9, gw * 2 + 0.12, bande, s * wallX, 0.45, 0));
    for (const sz of [-1, 1]) root.add(box(Math.abs(wallX - ex) + 0.12, 0.9, 0.12, bande, s * (ex + wallX) / 2, 0.45, sz * (gw + 0.06)));
  }
  for (const [x, text] of [[-10, 'SPORTHAUS KANAL'], [0, pitch.sponsorAds?.bande ? pitch.sponsorAds.bande.name.toUpperCase() : tr('BÄCKEREI KRUME', 'CRUMBS BAKERY')], [10, 'HALLENCUP']]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.6), toon(0xffffff, { map: makeSignTextureWide(text, { bg: '#1f3a6b' }) }));
    sign.position.set(x, 0.5, -hw - 0.17);
    root.add(sign);
  }

  // Fangnetze hinter den Toren (pitch.catchNet, gleiche Maße und Neigung wie in der Simulation, catchNetX): von der Bande bis zur
  // Netzhöhe, Tor plus Rand breit, oben zum Feld geneigt. Netzflächen halbdurchsichtig (netQuad), das Oberseil in der Farbe der
  // Hallenwand (0x5a7a6a), damit mergeStatic es in vorhandene Draw Calls backt. Keine Pfosten: Das Netz hängt wie in echten Hallen am
  // Seil unter der Decke (ein schräger Pfosten lief im Hochformat quer über die Spieler vorm Tor).
  if (pitch.catchNet) {
    const { height: nh, margin, boardHeight: bh, lean } = pitch.catchNet;
    const nz = gw + margin;
    const rope = 0x5a7a6a;
    const rise = nh - bh;
    const len = rise * Math.hypot(1, lean);
    for (const s of [-1, 1]) {
      // Wie catchNetX: über dem Tor auf der Nischen-Rückwand (wallX), daneben auf der Stirnbande (ex).
      const xAt = (base, y) => s * (base - 0.06 - lean * (y - bh));
      const panel = (z0, z1, base) => {
        root.add(netQuad([[xAt(base, bh), bh, z0], [xAt(base, bh), bh, z1], [xAt(base, nh), nh, z1], [xAt(base, nh), nh, z0]], z1 - z0, len));
        root.add(box(0.06, 0.06, z1 - z0 + 0.06, rope, xAt(base, nh), nh, (z0 + z1) / 2)); // Oberseil
      };
      const inner = endWallX(pitch, 0);
      panel(-gw, gw, inner);
      for (const sz of [-1, 1]) {
        panel(sz > 0 ? gw : -nz, sz > 0 ? nz : -gw, ex);
        // Seitenstück an der Nischenkante: schließt die Lücke zwischen den beiden Netzebenen.
        const z = sz * gw;
        const gap = Math.abs(xAt(inner, bh) - xAt(ex, bh));
        root.add(netQuad([[xAt(ex, bh), bh, z], [xAt(inner, bh), bh, z], [xAt(inner, nh), nh, z], [xAt(ex, nh), nh, z]], gap, len));
        root.add(box(gap, 0.06, 0.06, rope, (xAt(inner, nh) + xAt(ex, nh)) / 2, nh, z));
      }
    }
  }

  // Hallenwände: unten Prallschutz, oben hell, dazu die Sprossenwand.
  root.add(box(W, 2.4, 0.3, 0x5a7a6a, 0, 1.2, -hw - 4.5), box(W, 6, 0.3, 0xd8d4c8, 0, 5.4, -hw - 4.5));
  for (let x = -20; x <= -8; x += 1.2) root.add(box(0.1, 2.6, 0.1, 0xc09060, x, 1.3, -hw - 4.2));
  for (let y = 0.3; y <= 2.6; y += 0.3) root.add(box(12.2, 0.05, 0.05, 0xc09060, -14, y, -hw - 4.15));
  for (const s of [-1, 1]) root.add(box(0.3, 8, D, 0xd8d4c8, s * (W / 2), 4, 0));
  // Deckenlichter
  for (let x = -18; x <= 18; x += 6) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5), emissiveToon(0xfff8e0, 0xfff8e0, 1.2));
    lamp.position.set(x, 8.2, -2);
    root.add(lamp);
  }

  // Tribüne mit Klappbänken hinter der hinteren Bande.
  for (let r = 0; r < 3; r++) root.add(box(30, 0.35, 0.8, 0x6b6b6b, 4, 0.35 + r * 0.45, -hw - 1.4 - r * 0.85));
  for (let i = 0; i < 12; i++) {
    const r = i % 3;
    root.add(makeSpectator(rng, { x: -8 + (i * 7) % 24 + rng.range(-0.5, 0.5), z: -hw - 1.4 - r * 0.85, y: 0.525 + r * 0.45, facing: 0, sitting: true }));
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.9), toon(0xffffff, { map: makeSignTextureWide('HALLEN-STADTMEISTERSCHAFT', { bg: '#6b2a2a' }) }));
  banner.position.set(6, 4.2, -hw - 4.3);
  root.add(banner);

  // Auswechselbänke vorne.
  for (const x of [-5, 5]) root.add(makeBench(x, hw + 1.1, Math.PI));

  // Volle Klappbänke beim Hallenturnier (sichtbar je nach Besucherzahl).
  for (let r = 0; r < 3; r++) for (const o of crowdRow(501 + r, { x0: -10.4, x1: 18.4, z: -hw - 1.4 - r * 0.85, y: 0.525 + r * 0.45, n: 16, sitting: true, jitter: 0.2 })) root.add(o);
  return { viewHeight: 12, bounds: { x: hl + 4, z: 2.5 } };
}

// Bandentür: ein Mesh (Eckenfarben, ein Draw Call) aus Türblatt in Bandenfarbe, drei Scharnieren und einem Griff.
// Der Drehpunkt (Gruppe) sitzt am Scharnier links (x = doorX - doorW / 2) in der Bandenlinie; sie schwingt nach außen (+z, weg vom Feld),
// damit sie nie ins Spielfeld ragt. setOpen(0…1) dreht bis rund 100°.
const DOOR_ANGLE = 1.75;
export function buildBoardDoor(pitch) {
  const g = GEO.hall;
  const w = g.doorW - 0.03; // kleine Fuge zur Bande
  const hinge = 0x6b6b6b;
  const parts = [];
  const add = (bw, bh, bd, color, x, y, z) => {
    const geo = new THREE.BoxGeometry(bw, bh, bd).toNonIndexed();
    geo.translate(x, y, z);
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    parts.push(geo);
  };
  add(w, 0.9, 0.12, 0xf2efe6, 0.015 + w / 2, 0.45, 0); // Türblatt
  add(w - 0.16, 0.05, 0.125, 0xd9d4c4, 0.015 + w / 2, 0.45, 0); // abgesetzter Querstreifen als Fuge/Füllung
  for (const y of [0.12, 0.45, 0.78]) add(0.07, 0.1, 0.16, hinge, 0.04, y, 0); // Scharniere
  add(0.18, 0.06, 0.18, hinge, 0.015 + w - 0.16, 0.5, 0); // Griff
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), vertexToon());
  for (const geo of parts) geo.dispose();
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.keep = true;
  const pivot = new THREE.Group();
  pivot.position.set(g.doorX - g.doorW / 2, 0, pitch.halfWidth + 0.1);
  pivot.add(mesh);
  return {
    group: pivot,
    setOpen(k) {
      pivot.rotation.y = -DOOR_ANGLE * Math.max(0, Math.min(1, k)); // minus: das freie Ende schwingt nach +z
    },
  };
}
