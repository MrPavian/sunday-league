import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, cylinder, ground, makeBench, makeDog, makeFence, makeGoalFrame, makeTree } from '../props.js';
import { makeSpectator } from '../spectators.js';
import { makeLawnTexture, makeSignTextureWide } from '../textures.js';

// Lokale Sponsoren – selbst gemalte Banden, wie sie auf jedem Dorfplatz hängen.
const SPONSORS = [
  ['BÄCKEREI KRUME', '#c9a227', '#2a2620'],
  ['FAHRSCHULE VOLLGAS', '#c0392b', '#ffffff'],
  ['DÖNER SULTAN', '#1f5e3a', '#f4e9c8'],
  ['AUTOHAUS BRENNER', '#2c4f8a', '#ffffff'],
  ['GETRÄNKE HOFFMANN', '#1f5e3a', '#f4e9c8'],
  ['PHYSIO AM MARKT', '#f2efe6', '#2c4f8a'],
  ['FRISEUR SCHNITTIG', '#6b4f8c', '#ffffff'],
  ['DACHDECKEREI KOWALSKI', '#8a5a3a', '#f4e9c8'],
];

// Sportplatz Waldesruh: der erste "richtige" Platz in der Kreisklasse –
// Rasen, Tribüne mit drei Stufen, Banden, Vereinsheim aus Backstein.
export function buildLawn(root, pitch, rng, scene) {
  root.add(addLights(scene, { sky: 0x9ec4de, sun: 0xfff0d0, sunIntensity: 2.8, sunPos: [-22, 26, 10], span: 40 }));
  const W = 72;
  const D = 50;
  root.add(ground(W, D, toon(0xffffff, { map: makeLawnTexture(rng, { width: W, depth: D, pitch }) })));
  root.add(ground(220, 220, toon(0x5d7a42), -0.02));

  const { halfLength: hl, halfWidth: hw, goalHalfWidth: gw, goalHeight: gh } = pitch;
  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s);
    goal.position.x = s * hl;
    root.add(goal);
    root.add(makeFence(s * (hl + 3.5), -hw - 2, s * (hl + 3.5), hw + 2, 5, 0x3d6b4a));
  }

  // Banden an der Gegengerade.
  const bandZ = -hw - 2.2;
  SPONSORS.forEach(([text, bg, fg], i) => {
    const x = -hl + 3 + i * ((hl * 2 - 6) / (SPONSORS.length - 1));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.8), toon(0xffffff, { map: makeSignTextureWide(text, { bg, fg }) }));
    board.position.set(x, 0.45, bandZ);
    root.add(board, box(5.6, 0.85, 0.08, 0x3a3a3a, x, 0.43, bandZ - 0.05));
  });

  // Kleine Tribüne mit drei Stufen und Dach.
  const tz = -hw - 5;
  for (let step = 0; step < 3; step++) root.add(box(18, 0.4, 1.2, 0x9a9690, 0, 0.2 + step * 0.4, tz - step * 1.2));
  root.add(box(18.6, 0.12, 4.6, 0x4a5058, 0, 3.6, tz - 1.2));
  for (const x of [-9, 0, 9]) root.add(cylinder(0.08, 3.6, 0x4a5058, x, 1.8, tz - 3.2, 6));
  for (let i = 0; i < 12; i++) {
    const step = i % 3;
    root.add(makeSpectator(rng, { x: -8 + rng.range(0, 16), z: tz - step * 1.2, sitting: true, y: step * 0.4 }));
  }
  // Ein paar stehen am Zaun, einer mit Hund.
  root.add(makeSpectator(rng, { x: 14, z: bandZ - 0.8 }));
  root.add(makeSpectator(rng, { x: -15, z: bandZ - 0.8, facing: 0.3 }));
  root.add(makeDog(-14.2, bandZ - 0.6, 0x8a6a3a, 0.2));

  // Vereinsheim aus Backstein mit Terrasse.
  root.add(box(12, 3.4, 5, 0x9a4a38, 20, 1.7, -hw - 10));
  root.add(box(12.6, 0.3, 5.6, 0x3a3a3a, 20, 3.5, -hw - 10));
  for (const x of [16, 20, 24]) root.add(box(1.4, 1.1, 0.05, 0xd8e0e0, x, 2, -hw - 7.48));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), toon(0xffffff, { map: makeSignTextureWide('SPORTPLATZ WALDESRUH', { bg: '#f2efe6', fg: '#2a2620' }) }));
  sign.position.set(20, 4.1, -hw - 7.45);
  root.add(sign);
  root.add(makeBench(18, -hw - 6.5), makeBench(22, -hw - 6.5));
  // Bratwurststand
  root.add(box(2.4, 1.1, 1.2, 0xc9a227, 8, 0.55, -hw - 8), box(2.6, 0.1, 1.5, 0xc0392b, 8, 2.2, -hw - 8), cylinder(0.04, 1.1, 0x555555, 7, 1.65, -hw - 8.6, 4), cylinder(0.04, 1.1, 0x555555, 9, 1.65, -hw - 8.6, 4));

  // Flutlicht und Bäume hinten.
  for (const x of [-24, 0, 24]) {
    root.add(cylinder(0.16, 15, 0x7a7f84, x, 7.5, -hw - 13, 6));
    const head = box(2.6, 1, 0.3, 0x4d5358, x, 15.2, -hw - 12.7);
    head.rotation.x = -0.4;
    root.add(head);
  }
  for (let i = 0; i < 18; i++) {
    const t = makeTree(rng, rng.range(1.1, 1.5));
    t.position.set(rng.range(-40, 40), 0, -rng.range(hw + 15, hw + 24));
    root.add(t);
  }
  root.add(box(W - 6, 0.06, 0.06, 0x8a9096, 0, 0.9, hw + 2.5));

  return { viewHeight: 15, bounds: { x: hl + 4, z: 4.5 } };
}
