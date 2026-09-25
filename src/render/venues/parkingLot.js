import * as THREE from 'three';
import { toon } from '../materials.js';
import { addLights, box, cylinder, ground, group, makeBackpack, makeCar, makeCrates, makeDog, makeFence, makeJacketPile, makeLamp, makeTree } from '../props.js';
import { makeSpectator } from '../spectators.js';
import { makeAsphaltTexture, makeShutterTexture, makeSignTexture } from '../textures.js';

const LOT_W = 56;
const LOT_D = 40;

export function buildParkingLot(root, pitch, rng, scene) {
  root.add(addLights(scene));
  root.add(ground(160, 160, toon(0x5d7d3e), -0.02));
  root.add(ground(LOT_W, LOT_D, toon(0xffffff, { map: makeAsphaltTexture(rng, { width: LOT_W, depth: LOT_D }) })));

  for (const s of [-1, 1]) {
    root.add(box(LOT_W, 0.14, 0.3, 0xa8a59c, 0, 0.07, s * (LOT_D / 2)));
    root.add(box(0.3, 0.14, LOT_D, 0xa8a59c, s * (LOT_W / 2), 0.07, 0));
  }

  // Parkende Autos entlang der Längsseiten (Stoßstangen = Spielfeldrand)
  for (const side of [-1, 1]) {
    for (let x = -17.6; x <= 17.6; x += 3.2) {
      if (rng.chance(0.18)) continue;
      const car = makeCar(rng);
      car.position.set(x + rng.range(-0.15, 0.15), 0, side * (pitch.halfWidth + 2.1 + rng.range(0.1, 0.4)));
      car.rotation.y = (side > 0 ? Math.PI : 0) + rng.range(-0.05, 0.05);
      root.add(car);
    }
  }

  // Getränkemarkt hinter dem rechten Tor
  const bx = pitch.wallX + 4.4;
  root.add(box(8.8, 5.2, 34, 0xd9c9a3, bx, 2.6, 0));
  root.add(box(9.2, 0.3, 34.4, 0x6e5a48, bx, 5.3, 0));
  const shutterTex = makeShutterTexture();
  shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping;
  shutterTex.repeat.set(4, 3);
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), toon(0xffffff, { map: shutterTex }));
  shutter.rotation.y = -Math.PI / 2;
  shutter.position.set(pitch.wallX - 0.01, 1.6, 0);
  root.add(shutter);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), toon(0xffffff, { map: makeSignTexture('GETRÄNKE HOFFMANN') }));
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(pitch.wallX - 0.02, 4.1, 0);
  root.add(sign);
  for (const z of [-9, 9]) root.add(box(0.1, 1.2, 3.2, 0x7ea2b8, pitch.wallX - 0.02, 2.2, z));
  root.add(makeCrates(pitch.wallX - 0.5, 4.2));
  root.add(makeCrates(pitch.wallX - 0.5, -6.4));

  // Maschendrahtzaun hinter dem linken Tor
  root.add(makeFence(-pitch.wallX - 0.2, -LOT_D / 2 + 1, -pitch.wallX - 0.2, LOT_D / 2 - 1));

  // Bäume & Hecke nur hinten und an den Enden – vorne würden sie die Sicht verdecken.
  for (let i = 0; i < 14; i++) {
    const t = makeTree(rng);
    t.position.set(rng.range(-34, -24), 0, rng.range(-22, 22));
    root.add(t);
  }
  for (let i = 0; i < 10; i++) {
    const t = makeTree(rng);
    t.position.set(rng.range(-26, 18), 0, -rng.range(22, 30));
    root.add(t);
  }
  root.add(box(LOT_W - 8, 1.0, 1.0, 0x3f6436, -2, 0.5, -(LOT_D / 2 + 1.2)));
  for (const x of [-14, 0, 14]) root.add(makeLamp(x, -18.6));

  root.add(cylinder(0.3, 0.9, 0x2f5a3a, -19.3, 0.45, 9.6, 8));
  const cart = group(box(0.55, 0.45, 0.9, 0xb0b6bb, 0, 0.7, 0), box(0.5, 0.05, 0.8, 0x80868c, 0, 0.3, 0));
  cart.position.set(18.9, 0, -9.8);
  cart.rotation.y = 0.4;
  root.add(cart);

  // Jackentore
  for (const s of [-1, 1]) {
    const x = s * pitch.halfLength;
    const a = makeJacketPile(rng);
    a.position.set(x, 0, -pitch.goalHalfWidth);
    root.add(a);
    const b = rng.chance(0.5) ? makeJacketPile(rng) : makeBackpack(rng);
    b.position.set(x, 0, pitch.goalHalfWidth);
    root.add(b);
  }

  // Zwei Kunden mit Einkaufstüten schauen zu, einer mit Hund.
  root.add(makeSpectator(rng, { x: 6, z: -16.2, facing: 0 }));
  root.add(makeSpectator(rng, { x: 7.1, z: -16.4, facing: -0.3 }));
  root.add(makeDog(7.8, -15.8, 0x3a2a1a, -Math.PI / 2));

  return { viewHeight: 12.5, bounds: { x: pitch.wallX + 3, z: 3 } };
}
