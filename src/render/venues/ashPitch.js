import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, cylinder, ground, makeBench, makeFence, makeFloodlight, makeGoalFrame, makeSideline, makeTree } from '../props.js';
import { crowdRow, makeSpectator } from '../spectators.js';
import { GEO } from '../../sim/shelter.js';
import { groundTexels, makeAshTexture, makeSignTextureWide } from '../textures.js';

// Ascheplatz vom SV Grün-Weiß: Jugendtore, Ballfangzaun, Flutlicht,
// Vereinsheim im Container und die üblichen drei Zuschauer.
export function buildAshPitch(root, pitch, rng, scene) {
  root.add(addLights(scene));
  const W = 56;
  const D = 40;
  root.add(ground(W, D, toon(0xffffff, { map: makeAshTexture(rng, { width: W, depth: D, pitch, texelsPerMeter: groundTexels(W, D, 13) }) })));
  root.add(ground(200, 200, toon(0x5d7a42), -0.02));

  const { halfLength: hl, goalHalfWidth: gw, goalHeight: gh } = pitch;
  const right = makeGoalFrame(gw, gh, 1);
  right.position.x = hl;
  root.add(right);
  const left = makeGoalFrame(gw, gh, -1);
  left.position.x = -hl;
  root.add(left);

  // Eckfahnen (Farben der übrigen Kulisse: kein zusätzlicher Draw Call).
  root.add(makeSideline(pitch, rng, { benches: false, gear: false, pole: 0xd0d0d0, flag: 0x2e8b57 }));

  // Ballfangzäune hinter den Toren, niedriger Zaun hinten, Geländer vorne.
  for (const s of [-1, 1]) root.add(makeFence(s * (hl + 3.5), -16, s * (hl + 3.5), 16, 5, 0x3d6b4a));
  root.add(makeFence(-hl - 3.5, -17, hl + 3.5, -17, 1.8, 0x3d6b4a));
  root.add(box(W - 6, 0.06, 0.06, 0x8a9096, 0, 0.9, 16.5));
  for (let x = -25; x <= 25; x += 5) root.add(box(0.06, 0.9, 0.06, 0x8a9096, x, 0.45, 16.5));

  // Flutlichtmasten hinten.
  const masts = [-18, 0, 18];
  for (const x of masts) root.add(makeFloodlight(x, -18.5, 14, 2.4));

  // Auswechselbänke mit Dach.
  // Ein durchgehendes Dach über beiden Bänken: Unterstand beim Gewitter.
  const A = GEO.ash;
  for (const x of [-5, 5]) root.add(makeBench(x, -15.6));
  root.add(box(A.x * 2, 0.08, A.z1 - A.z0, 0x2f4f3a, 0, A.y, (A.z0 + A.z1) / 2), box(A.x * 2, A.y, 0.06, 0x2f4f3a, 0, A.y / 2, A.z0));
  for (const s of [-1, 1]) root.add(box(0.1, A.y, 0.1, 0x2f4f3a, s * (A.x - 0.1), A.y / 2, A.z1 - 0.1));

  // Vereinsheim-Container mit Schild und Fahne.
  root.add(box(9, 2.8, 3, 0x3f7a4a, -10, 1.4, -21.5));
  root.add(box(9.4, 0.15, 3.4, 0x2f5a3a, -10, 2.87, -21.5));
  for (const x of [-13, -10, -7]) root.add(box(1.2, 0.9, 0.05, 0xd8e0e0, x, 1.7, -19.98));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.8), toon(0xffffff, { map: makeSignTextureWide('SV GRÜN-WEISS AM KANAL 1921') }));
  sign.position.set(-10, 3.4, -20);
  root.add(sign);
  root.add(cylinder(0.05, 7, 0xd0d0d0, -3.5, 3.5, -20.5, 6), box(1.4, 0.9, 0.03, 0x2e8b57, -2.8, 6.4, -20.5));
  root.add(box(2.2, 0.08, 0.6, 0x7a5a3a, -4, 0.75, -19), box(2.2, 0.06, 0.3, 0x7a5a3a, -4, 0.45, -18.5));

  // Pappeln am Kanal.
  for (let x = -40; x <= 40; x += 4.5) {
    const h = rng.range(8, 11);
    const trunk = cylinder(0.2, 2, 0x5a3d26, x, 1, -27, 6);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.3, h, 6), toon(rng.pick([0x3f6b35, 0x4e7a3a])));
    crown.position.set(x, 1.8 + h / 2, -27);
    crown.castShadow = true;
    root.add(trunk, crown);
  }
  for (let i = 0; i < 6; i++) {
    const t = makeTree(rng, 1.2);
    t.position.set((i % 2 ? 1 : -1) * rng.range(27, 34), 0, rng.range(-16, 6));
    root.add(t);
  }

  // Zuschauer am Zaun: der Ex-Trainer, der Opa mit Schiebermütze, ein Vater.
  root.add(makeSpectator(rng, { x: 9, z: -17.6, facing: 0 }));
  root.add(makeSpectator(rng, { x: 10.1, z: -17.7, facing: -0.2 }));
  root.add(makeSpectator(rng, { x: -16, z: -17.6, facing: 0.3 }));

  const lights = { heads: masts.map((x) => [x, 14.4, -18.2]), pools: masts.map((x) => [x * 0.8, -5, 10.5]), field: [hl, pitch.halfWidth] };
  // Weitere Leute am Zaun hinten – eine Handvoll, ein Ascheplatz ist kein Stadion.
  for (const o of crowdRow(301, { x0: -24, x1: 24, z: -17.7, n: 14, dz: 0.2, jitter: 1.2 })) root.add(o);
  return { viewHeight: 13, bounds: { x: hl + 4, z: 3.5 }, lights };
}
