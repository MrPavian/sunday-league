import * as THREE from 'three';
import { tr } from '../../core/i18n.js';
import { emissiveToon, toon } from '../materials.js';
import { addLights, box, ground, makeBench, makeGoalFrame } from '../props.js';
import { GEO } from '../../sim/shelter.js';
import { crowdRow, makeSpectator } from '../spectators.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vertexToon } from '../materials.js';
import { makeHallTexture, makeSignTextureWide } from '../textures.js';

// Sporthalle der Kanalschule: Parkett mit bunten Linien, weiße Bande, Handballtore,
// Sprossenwand, Tribüne mit Klappbänken – und es riecht nach Hallenschuh.
export function buildHall(root, pitch, rng, scene) {
  root.add(addLights(scene, { span: 26 }));
  const { halfLength: hl, halfWidth: hw, wallX, goalHalfWidth: gw, goalHeight: gh } = pitch;
  const W = 48;
  const D = 30;
  root.add(ground(W, D, toon(0xffffff, { map: makeHallTexture(rng, { width: W, depth: D, pitch }) })));

  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s, pitch.goalDepth);
    goal.position.x = s * hl;
    root.add(goal);
  }

  // Weiße Bande rund ums Feld, mit Werbung vom Sponsor.
  const bande = 0xf2efe6;
  root.add(box(wallX * 2, 0.9, 0.12, bande, 0, 0.45, -hw - 0.1));
  // Vorn mit Tür (GEO.hall, shelter.js): Schiri, Ordner und Platzverweise gehen durch die Lücke, nicht durch die Bande.
  // Die Lücke ist in der Kulisse leer; die Tür selbst (buildBoardDoor, unten) baut die IncidentView als eigenes bewegtes Mesh,
  // damit mergeStatic sie nicht einbackt. Der Ball prallt an der Bandenlinie auch an der Tür ab (ball.js: zMax gilt überall).
  const door = GEO.hall;
  const left = door.doorX - door.doorW / 2 + wallX;
  const right = wallX - (door.doorX + door.doorW / 2);
  root.add(box(left, 0.9, 0.12, bande, -wallX + left / 2, 0.45, hw + 0.1));
  root.add(box(right, 0.9, 0.12, bande, wallX - right / 2, 0.45, hw + 0.1));
  for (const s of [-1, 1]) root.add(box(0.12, 0.9, hw * 2 + 0.3, bande, s * wallX, 0.45, 0));
  for (const [x, text] of [[-10, 'SPORTHAUS KANAL'], [0, pitch.sponsorAds?.bande ? pitch.sponsorAds.bande.name.toUpperCase() : tr('BÄCKEREI KRUME', 'CRUMBS BAKERY')], [10, 'HALLENCUP']]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.6), toon(0xffffff, { map: makeSignTextureWide(text, { bg: '#1f3a6b' }) }));
    sign.position.set(x, 0.5, -hw - 0.17);
    root.add(sign);
  }

  // Fangnetze hinter den Toren (pitch.catchNet, gleiche Maße und Neigung wie in der Simulation, catchNetX): von der Bande bis zur
  // Netzhöhe, Tor plus Rand breit, oben zum Feld geneigt (von der Kamera aus sähe ein senkrechtes Netz nur wie eine Linie aus).
  // Nur Einzelboxen in Farben, die die Halle schon nutzt – mergeStatic backt sie in vorhandene Draw Calls.
  if (pitch.catchNet) {
    const { height: nh, margin, boardHeight: bh, lean } = pitch.catchNet;
    const nz = gw + margin;
    const netCol = 0x5a7a6a;
    const rise = nh - bh;
    const slant = Math.atan(lean);
    const len = rise * Math.hypot(1, lean);
    for (const s of [-1, 1]) {
      const xAt = (y) => s * (wallX - 0.06 - lean * (y - bh));
      const tilt = (m) => ((m.rotation.z = s * slant), m);
      for (let z = -nz; z <= nz + 0.01; z += 0.4) root.add(tilt(box(0.04, len, 0.04, netCol, xAt((nh + bh) / 2), (nh + bh) / 2, z)));
      for (let y = bh + 0.4; y < nh; y += 0.4) root.add(box(0.05, 0.05, nz * 2, netCol, xAt(y), y, 0));
      root.add(box(0.08, 0.08, nz * 2 + 0.1, bande, xAt(nh), nh, 0)); // Oberseil
      for (const z of [-nz - 0.05, nz + 0.05]) root.add(tilt(box(0.1, len, 0.1, bande, xAt((nh + bh) / 2), (nh + bh) / 2, z))); // Pfosten
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
