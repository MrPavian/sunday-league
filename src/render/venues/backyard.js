import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, ground, makeBike, makeBin, makeBush } from '../props.js';
import { makeConcreteTexture, makeShutterTexture } from '../textures.js';

// Hinterhof zwischen Mietshäusern: Garagentor auf der einen Seite, ein mit
// Kreide an die Hauswand gemaltes Tor auf der anderen.
export function buildBackyard(root, pitch, rng, scene) {
  root.add(addLights(scene, { sky: 0xb4c4cf, sunPos: [-8, 24, -16], sunIntensity: 2.3, hemi: 1.6, span: 24 }));
  const W = 32;
  const D = 22;
  root.add(ground(W, D, toon(0xffffff, { map: makeConcreteTexture(rng, { width: W, depth: D }) })));
  root.add(ground(120, 120, toon(0x6b6a66), -0.02));

  const hw = pitch.halfWidth;
  const wx = pitch.wallX;
  // Stirnwände enden an der Vordermauer, sonst stehen sie vor der Kamera.
  const endDepth = hw * 2 + 1.1;
  const endZ = -0.35;

  // Mietshaus hinten mit Fenstern, Balkonen und Oma am Fenster.
  const facadeZ = -hw - 0.35;
  root.add(box(W + 4, 11, 0.7, 0xcdb89a, 0, 5.5, facadeZ));
  root.add(box(W + 4, 0.4, 1.0, 0x8a7a66, 0, 11.1, facadeZ));
  const floors = [2.6, 5.4, 8.2];
  let omaPlaced = false;
  for (const y of floors) {
    for (let x = -14; x <= 14; x += 2.8) {
      const lit = rng.chance(0.15);
      root.add(box(1.0, 1.3, 0.1, lit ? 0xe8d9a0 : 0x3d5068, x, y, facadeZ + 0.36));
      root.add(box(1.2, 0.1, 0.18, 0xe6e0d4, x, y - 0.72, facadeZ + 0.4));
      if (!omaPlaced && y === floors[1] && x > 2) {
        // Oma Gisela lehnt auf dem Kissen und guckt zu.
        root.add(box(0.9, 0.18, 0.3, 0xb04a4a, x, y - 0.5, facadeZ + 0.5));
        root.add(box(0.26, 0.28, 0.24, 0xf1d0b5, x, y - 0.22, facadeZ + 0.5));
        root.add(box(0.3, 0.12, 0.28, 0xe8e8e8, x, y - 0.03, facadeZ + 0.48));
        root.add(box(0.5, 0.3, 0.22, 0x6b4f8c, x, y - 0.5, facadeZ + 0.62));
        omaPlaced = true;
      }
    }
  }
  for (const x of [-8.4, 5.6]) {
    root.add(box(2.4, 0.15, 1.1, 0x9a948a, x, 4.6, facadeZ + 0.9));
    root.add(box(2.4, 0.8, 0.06, 0x6b6f73, x, 5.05, facadeZ + 1.42));
  }
  // Wäscheleine
  root.add(box(0.06, 3.3, 0.06, 0x7a7a7a, -7, 1.65, -hw + 0.4));
  root.add(box(0.06, 3.3, 0.06, 0x7a7a7a, 3, 1.65, -hw + 0.4));
  root.add(box(10, 0.02, 0.02, 0xdddddd, -2, 3.2, -hw + 0.4));
  const laundry = [0xf2f2f2, 0xc8352f, 0x2f6fb5, 0xe0b020, 0xf2f2f2, 0x5a8a4a];
  for (let i = 0; i < 6; i++) {
    const w = rng.range(0.4, 0.7);
    root.add(box(w, rng.range(0.5, 0.8), 0.02, laundry[i], -6.2 + i * 1.5, 2.8, -hw + 0.4));
  }

  // Garagenzeile rechts – das mittlere Tor ist das Tor.
  root.add(box(1.2, 2.8, endDepth, 0x9d9a92, wx + 0.6, 1.4, endZ));
  root.add(box(1.6, 0.2, endDepth, 0x6e6a64, wx + 0.6, 2.9, endZ));
  const shutterTex = makeShutterTexture();
  shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping;
  shutterTex.repeat.set(2, 3);
  for (const [z, color] of [[0, 0xffffff], [-3.4, 0x6b8a6b], [3.4, 0x8a5a4a]]) {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(pitch.goalHalfWidth * 2, pitch.goalHeight),
      toon(color, { map: z === 0 ? shutterTex : null }),
    );
    door.rotation.y = -Math.PI / 2;
    door.position.set(wx - 0.01, pitch.goalHeight / 2, z);
    root.add(door);
  }

  // Hauswand links mit Kreidetor.
  root.add(box(1.2, 3.2, endDepth, 0xd6c8b0, -wx - 0.6, 1.6, endZ));
  const chalk = 0xf4f2ea;
  for (const s of [-1, 1]) root.add(box(0.02, pitch.goalHeight, 0.08, chalk, -wx + 0.01, pitch.goalHeight / 2, s * pitch.goalHalfWidth));
  root.add(box(0.02, 0.08, pitch.goalHalfWidth * 2 + 0.08, chalk, -wx + 0.01, pitch.goalHeight, 0));
  root.add(box(0.02, 0.9, 0.6, 0xa0a0a0, -wx + 0.01, 1.6, -4.5)); // Schild "Ballspielen verboten"
  root.add(box(0.03, 0.5, 0.5, 0xc0392b, -wx + 0.02, 1.7, -4.5));

  // Vorne nur eine niedrige Mauer, damit man drüber gucken kann.
  root.add(box(W, 0.9, 0.35, 0x9a5a45, 0, 0.45, hw + 0.35));
  root.add(box(W, 0.1, 0.45, 0x8a8a84, 0, 0.95, hw + 0.35));
  for (const [x, c] of [[-9, 0x2f5f9f], [-8.2, 0xe0c030], [-7.4, 0x6b4a2a], [-6.6, 0x4a4a4a]]) root.add(makeBin(x, hw + 1.2, c));
  root.add(makeBike(4, hw + 1.1, 0xc0392b, 0.1));
  root.add(makeBike(5.2, hw + 1.2, 0x2f6fb5, -0.1));
  for (let i = 0; i < 4; i++) root.add(makeBush(rng, rng.range(-14, 14), hw + 2.2));

  return { viewHeight: 11, bounds: { x: wx + 2, z: 1.5 } };
}
