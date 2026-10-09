import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, cylinder, ground, makeFence, makeFloodlight, makeGoalFrame, makeSideline } from '../props.js';
import { crowdRow, makeSpectator } from '../spectators.js';
import { groundTexels, makeLawnTexture, makeSignTextureWide } from '../textures.js';
import { bandBoards, SPONSORS } from './lawn.js';

// Stadion für den überregionalen Pokal: Ränge rundum, Banden rundherum, vier Flutlichtmasten in den Ecken.
// Nur für diese Spiele (nicht im Menü). Statische Kulisse wird verschmolzen (mergeStatic), die Zuschauer laufen
// über die gemeinsame Crowd – Draw-Call-Budget siehe BUDGET in scripts/e2e/modes.mjs.
export function buildStadium(root, pitch, rng, scene) {
  const { halfLength: hl, halfWidth: hw, goalHalfWidth: gw, goalHeight: gh } = pitch;
  root.add(addLights(scene, { span: 70 }));
  const W = 2 * hl + 30;
  const D = 2 * hw + 24;
  root.add(ground(W, D, toon(0xffffff, { map: makeLawnTexture(rng, { width: W, depth: D, pitch, texelsPerMeter: groundTexels(W, D, 15) }) })));
  root.add(ground(260, 260, toon(0x6a6e72), -0.02));
  for (const s of [-1, 1]) {
    const goal = makeGoalFrame(gw, gh, s);
    goal.position.x = s * hl;
    root.add(goal);
  }
  root.add(makeSideline(pitch, rng));

  // Banden rundum: lange Seiten mit Sponsoren, hinter den Toren eine durchgehende Bande.
  for (const s of [-1, 1]) {
    const bz = s * (hw + 2.4);
    bandBoards(pitch, 3).forEach(([text, bg, fg], i) => {
      const x = -hl + 4 + i * ((hl * 2 - 8) / (SPONSORS.length - 1));
      const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.9), toon(0xffffff, { map: makeSignTextureWide(text, { bg, fg }) }));
      board.position.set(x, 0.5, bz - s * 0.05);
      board.rotation.y = s > 0 ? Math.PI : 0;
      root.add(board, box(6.5, 0.95, 0.08, 0x3a3a3a, x, 0.48, bz));
    });
    root.add(box(0.3, 0.95, 2 * hw + 4.8, 0x3a3a3a, s * (hl + 5), 0.48, 0));
    root.add(makeFence(s * (hl + 4.2), -hw - 2, s * (hl + 4.2), hw + 2, 4, 0x3d6b4a));
  }

  // Ränge: acht Stufen je Längsseite (mit Dach), sechs Stufen hinter den Toren.
  // Die Kamera blickt von +z: Auf dieser Seite bleibt der Rang niedrig (sonst verdeckt er das Spielfeld), gegenüber steigt er hoch.
  for (const s of [-1, 1]) {
    const ROWS = s < 0 ? 8 : 4;
    const rise = s < 0 ? 0.55 : 0.3;
    const z0 = s * (hw + 5);
    for (let r = 0; r < ROWS; r++) root.add(box(2 * hl + 6, 0.5, 1.2, r % 2 ? 0x8d9399 : 0x9aa0a6, 0, 0.25 + r * rise, z0 + s * r * 1.2));
    if (s < 0) {
      root.add(box(2 * hl + 8, 0.16, 8.8, 0x4a5058, 0, 7.6, z0 + s * 5.2));
      for (const x of [-hl - 1, -hl / 2, 0, hl / 2, hl + 1]) root.add(cylinder(0.14, 7.6, 0x4a5058, x, 3.8, z0 + s * 9.2, 6));
      root.add(box(2 * hl + 6, 3.4, 0.3, 0x3a4048, 0, 2.2, z0 + s * (ROWS * 1.2 + 0.3))); // Rückwand
    }
    for (let r = 0; r < ROWS - (s < 0 ? 2 : 1); r++) for (const o of crowdRow(501 + r + (s > 0 ? 20 : 0), { x0: -hl - 1, x1: hl + 1, z: z0 + s * r * 1.2, y: 0.5 + r * rise, n: s < 0 ? 110 : 70, sitting: true })) root.add(o);
  }
  for (const s of [-1, 1]) {
    const x0 = s * (hl + 8);
    for (let r = 0; r < 6; r++) root.add(box(1.2, 0.5, 2 * hw + 4, r % 2 ? 0x8d9399 : 0x9aa0a6, x0 + s * r * 1.2, 0.25 + r * 0.55, 0));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) root.add(makeSpectator(rng, { x: x0 + s * r * 1.2, z: -hw + 1 + (i * (2 * hw - 2)) / 13, y: 0.5 + r * 0.55, sitting: true }));
  }

  // Flutlichtmasten in den Ecken.
  const heads = [];
  const pools = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (hl + 12);
    const z = sz * (hw + 10);
    root.add(makeFloodlight(x, z, 26, 4));
    heads.push([x, 26.4, z - 0.3 * sz]);
    pools.push([sx * hl * 0.55, sz * hw * 0.4, 14]);
  }
  // Anzeigetafel hinter dem Tor.
  const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), toon(0xffffff, { map: makeSignTextureWide('KANAL-ARENA', { bg: '#1c2230', fg: '#f4e9c8' }) }));
  board.position.set(-hl - 11.5, 8, 0);
  board.rotation.y = Math.PI / 2;
  root.add(board);
  return { viewHeight: 17, bounds: { x: hl + 6, z: 4.5 }, lights: { heads, pools, field: [hl, hw] } };
}
