import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, ground, makeBench, makeGoalFrame } from '../props.js';
import { makeSpectator } from '../spectators.js';
import { makeHallTexture, makeSignTextureWide } from '../textures.js';

// Sporthalle der Kanalschule: Parkett mit bunten Linien, weiße Bande, Handballtore,
// Sprossenwand, Tribüne mit Klappbänken – und es riecht nach Hallenschuh.
export function buildHall(root, pitch, rng, scene) {
  root.add(addLights(scene, { sky: 0xdfe6ea, sun: 0xfff6e8, sunIntensity: 1.8, sunPos: [0, 24, 6], hemi: 2.1, span: 26 }));
  const { halfLength: hl, halfWidth: hw, wallX, goalHalfWidth: gw, goalHeight: gh } = pitch;
  const W = 48;
  const D = 30;
  root.add(ground(W, D, toon(0xffffff, { map: makeHallTexture(rng, { width: W, depth: D, pitch }) })));

  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s, 1.0);
    goal.position.x = s * hl;
    root.add(goal);
  }

  // Weiße Bande rund ums Feld, mit Werbung vom Sponsor.
  const bande = 0xf2efe6;
  root.add(box(wallX * 2, 0.9, 0.12, bande, 0, 0.45, -hw - 0.1));
  root.add(box(wallX * 2, 0.9, 0.12, bande, 0, 0.45, hw + 0.1));
  for (const s of [-1, 1]) root.add(box(0.12, 0.9, hw * 2 + 0.3, bande, s * wallX, 0.45, 0));
  for (const [x, text] of [[-10, 'SPORTHAUS KANAL'], [0, 'BÄCKEREI KRUME'], [10, 'HALLENCUP']]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.6), toon(0xffffff, { map: makeSignTextureWide(text, { bg: '#1f3a6b' }) }));
    sign.position.set(x, 0.5, -hw - 0.17);
    root.add(sign);
  }

  // Hallenwände: unten Prallschutz, oben hell, dazu die Sprossenwand.
  root.add(box(W, 2.4, 0.3, 0x5a7a6a, 0, 1.2, -hw - 4.5), box(W, 6, 0.3, 0xd8d4c8, 0, 5.4, -hw - 4.5));
  for (let x = -20; x <= -8; x += 1.2) root.add(box(0.1, 2.6, 0.1, 0xc09060, x, 1.3, -hw - 4.2));
  for (let y = 0.3; y <= 2.6; y += 0.3) root.add(box(12.2, 0.05, 0.05, 0xc09060, -14, y, -hw - 4.15));
  for (const s of [-1, 1]) root.add(box(0.3, 8, D, 0xd8d4c8, s * (W / 2), 4, 0));
  // Deckenlichter
  for (let x = -18; x <= 18; x += 6) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff8e0 }));
    lamp.position.set(x, 8.2, -2);
    root.add(lamp);
  }

  // Tribüne mit Klappbänken hinter der hinteren Bande.
  for (let r = 0; r < 3; r++) root.add(box(30, 0.35, 0.8, 0x6b6b6b, 4, 0.35 + r * 0.45, -hw - 1.4 - r * 0.85));
  for (let i = 0; i < 12; i++) {
    const r = i % 3;
    root.add(makeSpectator(rng, { x: -8 + (i * 7) % 24 + rng.range(-0.5, 0.5), z: -hw - 1.4 - r * 0.85, y: 0.5 + r * 0.45, facing: 0, sitting: true }));
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.9), toon(0xffffff, { map: makeSignTextureWide('HALLEN-STADTMEISTERSCHAFT', { bg: '#6b2a2a' }) }));
  banner.position.set(6, 4.2, -hw - 4.3);
  root.add(banner);

  // Auswechselbänke vorne.
  for (const x of [-5, 5]) root.add(makeBench(x, hw + 1.1, Math.PI));

  return { viewHeight: 12, bounds: { x: hl + 2, z: 2.5 } };
}
