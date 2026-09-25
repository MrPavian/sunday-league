import * as THREE from 'three';
import { toon } from './materials.js';
import { makeAsphaltTexture, makeShutterTexture, makeSignTexture } from './textures.js';

const LOT_W = 56;
const LOT_D = 40;
const CAR_COLORS = [0x8c2f2f, 0x2f4f7f, 0xd8d4c8, 0x3b3b3b, 0x6a7d4a, 0xb8962e, 0x7a7f86, 0x4a2f5c];
const JACKET_COLORS = [0x2b3a55, 0x6b1e1e, 0x2e5d3a, 0x444444, 0xc27a1a];

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(r, h, color, x = 0, y = 0, z = 0, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCar(rng) {
  const g = new THREE.Group();
  const color = rng.pick(CAR_COLORS);
  const long = rng.range(3.9, 4.5);
  g.add(box(1.8, 0.62, long, color, 0, 0.55, 0));
  const cabinLen = long * rng.range(0.45, 0.58);
  g.add(box(1.62, 0.55, cabinLen, 0x39444f, 0, 1.13, rng.range(-0.3, 0.1)));
  g.add(box(1.5, 0.06, cabinLen - 0.2, color, 0, 1.42, g.children[1].position.z));
  for (const sx of [-0.85, 0.85])
    for (const sz of [-long * 0.32, long * 0.32]) {
      const w = cylinder(0.32, 0.24, 0x1b1b1b, sx, 0.32, sz, 10);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
  g.add(box(1.5, 0.12, 0.05, 0xe8e2c0, 0, 0.62, long / 2)); // Scheinwerfer / Kennzeichen
  return g;
}

function makeTree(rng) {
  const g = new THREE.Group();
  const h = rng.range(2.2, 3.4);
  g.add(cylinder(0.18, h, 0x5a3d26, 0, h / 2, 0, 6));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(1.4, 2.1), 0), toon(rng.pick([0x3f6b35, 0x4e7a3a, 0x365c30])));
  crown.position.y = h + 0.9;
  crown.castShadow = true;
  g.add(crown);
  return g;
}

function makeJacketPile(rng) {
  const g = new THREE.Group();
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const j = box(rng.range(0.5, 0.7), 0.1, rng.range(0.35, 0.55), rng.pick(JACKET_COLORS), rng.range(-0.08, 0.08), 0.05 + i * 0.09, rng.range(-0.08, 0.08));
    j.rotation.y = rng.range(-0.6, 0.6);
    g.add(j);
  }
  return g;
}

function makeBackpack(rng) {
  const g = new THREE.Group();
  g.add(box(0.34, 0.42, 0.22, rng.pick(JACKET_COLORS), 0, 0.21, 0));
  g.add(cylinder(0.04, 0.26, 0x9fd0e8, 0.3, 0.13, 0.05, 6)); // Wasserflasche
  return g;
}

function makeCrates(x, z) {
  const g = new THREE.Group();
  const colors = [0xb03a2e, 0x2e6b30, 0x2c4f8a, 0xc9a227];
  let i = 0;
  for (let col = 0; col < 3; col++) {
    const stack = 2 + ((col * 7) % 3);
    for (let s = 0; s < stack; s++) g.add(box(0.42, 0.3, 0.32, colors[i++ % colors.length], 0, 0.15 + s * 0.3, col * 0.34));
  }
  g.position.set(x, 0, z);
  return g;
}

export function buildParkingLot(scene, pitch, rng) {
  // Rasen drumherum
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), toon(0x5d7d3e));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  scene.add(grass);

  // Asphalt
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT_W, LOT_D),
    toon(0xffffff, { map: makeAsphaltTexture(rng, { width: LOT_W, depth: LOT_D }) }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  scene.add(asphalt);

  // Bordsteine
  for (const s of [-1, 1]) {
    scene.add(box(LOT_W, 0.14, 0.3, 0xa8a59c, 0, 0.07, s * (LOT_D / 2)));
    scene.add(box(0.3, 0.14, LOT_D, 0xa8a59c, s * (LOT_W / 2), 0.07, 0));
  }

  // Parkende Autos entlang der Längsseiten (Stoßstangen = Spielfeldrand)
  for (const side of [-1, 1]) {
    for (let x = -17.6; x <= 17.6; x += 3.2) {
      if (rng.chance(0.18)) continue;
      const car = makeCar(rng);
      const len = 4.2;
      car.position.set(x + rng.range(-0.15, 0.15), 0, side * (pitch.halfWidth + len / 2 + rng.range(0.1, 0.4)));
      car.rotation.y = (side > 0 ? Math.PI : 0) + rng.range(-0.05, 0.05);
      scene.add(car);
    }
  }

  // Getränkemarkt hinter dem rechten Tor
  const bx = pitch.wallX + 4.4;
  scene.add(box(8.8, 5.2, 34, 0xd9c9a3, bx, 2.6, 0));
  scene.add(box(9.2, 0.3, 34.4, 0x6e5a48, bx, 5.3, 0));
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), toon(0xffffff, { map: makeShutterTexture() }));
  shutter.material.map.wrapS = shutter.material.map.wrapT = THREE.RepeatWrapping;
  shutter.material.map.repeat.set(4, 3);
  shutter.rotation.y = -Math.PI / 2;
  shutter.position.set(pitch.wallX - 0.01, 1.6, 0);
  scene.add(shutter);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), toon(0xffffff, { map: makeSignTexture('GETRÄNKE HOFFMANN') }));
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(pitch.wallX - 0.02, 4.1, 0);
  scene.add(sign);
  for (const z of [-9, 9]) scene.add(box(0.1, 1.2, 3.2, 0x7ea2b8, pitch.wallX - 0.02, 2.2, z)); // Schaufenster
  scene.add(makeCrates(pitch.wallX - 0.5, 4.2));
  scene.add(makeCrates(pitch.wallX - 0.5, -6.4));

  // Maschendrahtzaun hinter dem linken Tor
  const fx = -pitch.wallX - 0.2;
  for (let z = -LOT_D / 2 + 1; z <= LOT_D / 2 - 1; z += 2.5) scene.add(cylinder(0.05, 2.2, 0x6b7076, fx, 1.1, z, 6));
  for (const y of [0.15, 1.1, 2.15]) scene.add(box(0.04, 0.04, LOT_D - 2, 0x80868c, fx, y, 0));
  for (let y = 0.4; y < 2.1; y += 0.3) scene.add(box(0.02, 0.02, LOT_D - 2, 0x9aa0a6, fx, y, 0));

  // Bäume & Hecken rundherum
  for (let i = 0; i < 14; i++) {
    const t = makeTree(rng);
    t.position.set(rng.range(-34, -24), 0, rng.range(-22, 22));
    scene.add(t);
  }
  // Nur hinter dem Spielfeld – auf der Kameraseite würden sie die Sicht verdecken.
  for (let i = 0; i < 10; i++) {
    const t = makeTree(rng);
    t.position.set(rng.range(-26, 18), 0, -rng.range(22, 30));
    scene.add(t);
  }
  for (const s of [-1, 1]) scene.add(box(LOT_W - 8, 1.0, 1.0, 0x3f6436, -2, 0.5, s * (LOT_D / 2 + 1.2)));

  // Laternen
  for (const [x, z] of [[-14, -18.6], [0, -18.6], [14, -18.6]]) {
    scene.add(cylinder(0.08, 5.5, 0x4d5358, x, 2.75, z, 6));
    scene.add(box(0.9, 0.18, 0.3, 0x4d5358, x, 5.5, z - Math.sign(z) * 0.35));
  }

  // Mülleimer & Einkaufswagen
  scene.add(cylinder(0.3, 0.9, 0x2f5a3a, -19.3, 0.45, 9.6, 8));
  const cart = new THREE.Group();
  cart.add(box(0.55, 0.45, 0.9, 0xb0b6bb, 0, 0.7, 0));
  cart.add(box(0.5, 0.05, 0.8, 0x80868c, 0, 0.3, 0));
  cart.position.set(18.9, 0, -9.8);
  cart.rotation.y = 0.4;
  scene.add(cart);

  // Jackentore
  for (const s of [-1, 1]) {
    const x = s * pitch.halfLength;
    const a = makeJacketPile(rng);
    a.position.set(x, 0, -pitch.goalHalfWidth);
    scene.add(a);
    const b = rng.chance(0.5) ? makeJacketPile(rng) : makeBackpack(rng);
    b.position.set(x, 0, pitch.goalHalfWidth);
    scene.add(b);
  }
}

export function addLights(scene) {
  scene.background = new THREE.Color(0xa9bccb);
  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x5a5140, 1.4));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-14, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera;
  c.left = -32;
  c.right = 32;
  c.top = 26;
  c.bottom = -26;
  c.near = 1;
  c.far = 80;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  return sun;
}
