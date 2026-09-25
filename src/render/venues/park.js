import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, ground, makeBackpack, makeBench, makeBin, makeBush, makeCone, makeDog, makeJacketPile, makeLamp, makeTree } from '../props.js';
import { makeSpectator } from '../spectators.js';
import { makeParkGrassTexture } from '../textures.js';

// Stadtpark: Rucksäcke und Hütchen als Tore, die Seitenlinie denkt man sich.
export function buildPark(root, pitch, rng, scene) {
  root.add(addLights(scene, { sky: 0x9cc3e0, sun: 0xfff3d0, sunIntensity: 2.9, sunPos: [-18, 28, 8] }));
  const W = 70;
  const D = 52;
  root.add(ground(W, D, toon(0xffffff, { map: makeParkGrassTexture(rng, { width: W, depth: D, goalX: pitch.halfLength }) })));
  root.add(ground(200, 200, toon(0x5f8a45), -0.02));

  const { halfLength: hl, halfWidth: hw, goalHalfWidth: gw } = pitch;

  // Tore: Rucksack + Hütchen auf der einen Seite, Jacken auf der anderen.
  const b1 = makeBackpack(rng);
  b1.position.set(hl, 0, -gw);
  root.add(b1, makeCone(hl, gw));
  const j = makeJacketPile(rng);
  j.position.set(-hl, 0, -gw);
  const b2 = makeBackpack(rng);
  b2.position.set(-hl, 0, gw);
  root.add(j, b2);
  // Eckhütchen und Mittelhütchen markieren die gedachte Linie.
  for (const x of [-hl, 0, hl]) for (const z of [-hw, hw]) root.add(makeCone(x, z, x === 0 ? 0xf2d23a : 0xe8742a));

  // Bäume hinten und an den Enden.
  for (let i = 0; i < 16; i++) {
    const t = makeTree(rng, rng.range(1, 1.4));
    t.position.set(rng.range(-32, 32), 0, -rng.range(17, 26));
    root.add(t);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const t = makeTree(rng, rng.range(1, 1.3));
      t.position.set(s * rng.range(24, 32), 0, rng.range(-14, 8));
      root.add(t);
    }
  }
  for (let i = 0; i < 8; i++) root.add(makeBush(rng, rng.range(-30, 30), -rng.range(15, 17)));

  // Teich mit Schilf hinten rechts.
  const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 12), toon(0x4f7fa0));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(16, 0.02, -21);
  pond.scale.set(1.6, 1, 1);
  root.add(pond);
  for (let i = 0; i < 12; i++) root.add(box(0.05, rng.range(0.6, 1.1), 0.05, 0x7a8a4a, 16 + rng.range(-8, 8), 0.4, -21 + rng.range(-4.5, -3.5)));

  // Weg mit Bänken, Laternen, Mülleimer – und Zuschauern.
  root.add(makeBench(-6, -14.2), makeBench(8, -14.2));
  root.add(makeSpectator(rng, { x: -6.4, z: -14.1, sitting: true }));
  root.add(makeSpectator(rng, { x: -5.5, z: -14.1, sitting: true }));
  root.add(makeSpectator(rng, { x: 2, z: -13.3, facing: 0.2 }));
  root.add(makeDog(2.8, -13, 0xd8c8a0, -1.2));
  root.add(makeDog(-12, -12.6, 0x2a2a2a, 0.4));
  root.add(makeSpectator(rng, { x: -12.8, z: -13.2, facing: 0.3 }));
  for (const x of [-18, 0, 18]) root.add(makeLamp(x, -15.5, 4));
  root.add(makeBin(12, -14.6, 0x3a5a3a));
  // Picknickdecke am Rand
  root.add(box(2, 0.02, 1.6, 0xc85a5a, -22, 0.01, -8), box(0.5, 0.3, 0.35, 0xc9a227, -21.6, 0.15, -8.2));

  return { viewHeight: 12.5, bounds: { x: hl + 4, z: 3.5 } };
}
