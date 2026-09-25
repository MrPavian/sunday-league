// Wiederverwendbare Low-Poly-Requisiten für alle Spielorte.
import * as THREE from 'three';
import { toon } from './materials.js';

export const CAR_COLORS = [0x8c2f2f, 0x2f4f7f, 0xd8d4c8, 0x3b3b3b, 0x6a7d4a, 0xb8962e, 0x7a7f86, 0x4a2f5c];
export const JACKET_COLORS = [0x2b3a55, 0x6b1e1e, 0x2e5d3a, 0x444444, 0xc27a1a];

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cylinder(r, h, color, x = 0, y = 0, z = 0, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function ground(width, depth, material, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

export function makeCar(rng) {
  const g = new THREE.Group();
  const color = rng.pick(CAR_COLORS);
  const long = rng.range(3.9, 4.5);
  g.add(box(1.8, 0.62, long, color, 0, 0.55, 0));
  const cabinLen = long * rng.range(0.45, 0.58);
  const cabinZ = rng.range(-0.3, 0.1);
  g.add(box(1.62, 0.55, cabinLen, 0x39444f, 0, 1.13, cabinZ));
  g.add(box(1.5, 0.06, cabinLen - 0.2, color, 0, 1.42, cabinZ));
  for (const sx of [-0.85, 0.85])
    for (const sz of [-long * 0.32, long * 0.32]) {
      const w = cylinder(0.32, 0.24, 0x1b1b1b, sx, 0.32, sz, 10);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
  g.add(box(1.5, 0.12, 0.05, 0xe8e2c0, 0, 0.62, long / 2));
  return g;
}

export function makeTree(rng, scale = 1) {
  const g = new THREE.Group();
  const h = rng.range(2.2, 3.4) * scale;
  g.add(cylinder(0.18 * scale, h, 0x5a3d26, 0, h / 2, 0, 6));
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(rng.range(1.4, 2.1) * scale, 0),
    toon(rng.pick([0x3f6b35, 0x4e7a3a, 0x365c30])),
  );
  crown.position.y = h + 0.9 * scale;
  crown.castShadow = true;
  g.add(crown);
  return g;
}

export function makeBush(rng, x, z) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(0.6, 1.1), 0), toon(rng.pick([0x3f6436, 0x4a7040])));
  b.position.set(x, 0.4, z);
  b.scale.y = 0.7;
  b.castShadow = true;
  return b;
}

export function makeJacketPile(rng) {
  const g = new THREE.Group();
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const j = box(rng.range(0.5, 0.7), 0.1, rng.range(0.35, 0.55), rng.pick(JACKET_COLORS), rng.range(-0.08, 0.08), 0.05 + i * 0.09, rng.range(-0.08, 0.08));
    j.rotation.y = rng.range(-0.6, 0.6);
    g.add(j);
  }
  return g;
}

export function makeBackpack(rng) {
  return group(box(0.34, 0.42, 0.22, rng.pick(JACKET_COLORS), 0, 0.21, 0), cylinder(0.04, 0.26, 0x9fd0e8, 0.3, 0.13, 0.05, 6));
}

export function makeCone(x, z, color = 0xe8742a) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), toon(color));
  c.position.set(x, 0.17, z);
  c.castShadow = true;
  return c;
}

export function makeCrates(x, z) {
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

export function makeLamp(x, z, height = 5.5) {
  return group(cylinder(0.08, height, 0x4d5358, x, height / 2, z, 6), box(0.9, 0.18, 0.3, 0x4d5358, x, height, z + 0.35));
}

export function makeBin(x, z, color) {
  return group(box(0.6, 1.0, 0.7, color, x, 0.5, z), box(0.64, 0.08, 0.74, color, x, 1.04, z));
}

export function makeBench(x, z, rotation = 0) {
  const g = group(
    box(1.8, 0.08, 0.45, 0x7a5a3a, 0, 0.45, 0),
    box(1.8, 0.4, 0.08, 0x7a5a3a, 0, 0.7, -0.2),
    box(0.08, 0.45, 0.4, 0x3d3d3d, -0.8, 0.22, 0),
    box(0.08, 0.45, 0.4, 0x3d3d3d, 0.8, 0.22, 0),
  );
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  return g;
}

export function makeBike(x, z, color, rotation = 0) {
  const wheel = (wx) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 4, 12), toon(0x1f1f1f));
    w.position.set(wx, 0.34, 0);
    w.castShadow = true;
    return w;
  };
  const g = group(wheel(-0.5), wheel(0.5), box(1.0, 0.05, 0.05, color, 0, 0.62, 0), box(0.05, 0.4, 0.05, color, 0.3, 0.8, 0), box(0.3, 0.05, 0.4, 0x1f1f1f, 0.3, 1.0, 0));
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  return g;
}

// Hund, der am Spielfeldrand sitzt und zuguckt.
export function makeDog(x, z, color = 0x8a6a3a, rotation = 0) {
  const g = group(
    box(0.55, 0.28, 0.22, color, 0, 0.38, 0),
    box(0.2, 0.22, 0.2, color, 0.32, 0.58, 0),
    box(0.08, 0.1, 0.06, 0x2a2a2a, 0.43, 0.56, 0),
    box(0.06, 0.26, 0.06, color, -0.2, 0.13, 0.07),
    box(0.06, 0.26, 0.06, color, -0.2, 0.13, -0.07),
    box(0.06, 0.26, 0.06, color, 0.18, 0.13, 0.07),
    box(0.06, 0.26, 0.06, color, 0.18, 0.13, -0.07),
    box(0.2, 0.05, 0.05, color, -0.35, 0.48, 0),
  );
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  return g;
}

// Echtes Tor mit Pfosten, Latte und angedeutetem Netz (dünne Schnüre).
export function makeGoalFrame(halfWidth, height, sign, depth = 1.2) {
  const g = new THREE.Group();
  const white = 0xf2f2ee;
  const net = 0xd8d8d0;
  const t = 0.12;
  g.add(box(t, height, t, white, 0, height / 2, -halfWidth));
  g.add(box(t, height, t, white, 0, height / 2, halfWidth));
  g.add(box(t, t, halfWidth * 2 + t, white, 0, height, 0));
  const back = sign * depth;
  for (const z of [-halfWidth, halfWidth]) g.add(box(depth, 0.04, 0.04, net, back / 2, height * 0.9, z));
  for (let y = 0.3; y < height; y += 0.35) g.add(box(0.02, 0.02, halfWidth * 2, net, back, y, 0));
  for (let z = -halfWidth; z <= halfWidth + 0.01; z += 0.5) g.add(box(0.02, height * 0.9, 0.02, net, back, height * 0.45, z));
  for (let x = 0.3; x < depth; x += 0.35) g.add(box(0.02, 0.02, halfWidth * 2, net, sign * x, height * 0.9, 0));
  return g;
}

export function makeFence(x0, z0, x1, z1, height = 2.2, color = 0x6b7076) {
  const g = new THREE.Group();
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.add(cylinder(0.05, height, color, x0 + (x1 - x0) * t, height / 2, z0 + (z1 - z0) * t, 6));
  }
  const angle = Math.atan2(z1 - z0, x1 - x0);
  for (let y = 0.15; y <= height; y += 0.35) {
    const rail = box(len, 0.025, 0.025, 0x9aa0a6, (x0 + x1) / 2, y, (z0 + z1) / 2);
    rail.rotation.y = -angle;
    g.add(rail);
  }
  return g;
}

export function addLights(scene, { sky = 0xa9bccb, sun = 0xfff0d8, sunIntensity = 2.6, hemi = 1.4, sunPos = [-14, 26, 12], span = 32 } = {}) {
  scene.background = new THREE.Color(sky);
  const hemiLight = new THREE.HemisphereLight(0xdbe8ff, 0x5a5140, hemi);
  const light = new THREE.DirectionalLight(sun, sunIntensity);
  light.position.set(...sunPos);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -span, right: span, top: span * 0.8, bottom: -span * 0.8, near: 1, far: 90 });
  light.shadow.bias = -0.0008;
  light.shadow.normalBias = 0.02;
  // Kühles Gegenlicht von hinten: Spieler heben sich besser vom Rasen ab.
  const rim = new THREE.DirectionalLight(0xbcd4ff, sunIntensity * 0.22);
  rim.position.set(-sunPos[0] * 0.8, sunPos[1] * 0.6, -Math.abs(sunPos[2]) - 10);
  for (const l of [hemiLight, light, rim]) l.userData.base = { intensity: l.intensity, color: l.color.getHex() };
  light.userData.sun = true;
  return group(hemiLight, light, rim);
}

// Lichtstimmung fürs Wetter: Regen dämpft die Sonne, Hitze macht sie gelb und hart.
const MOODS = {
  klar: { sun: 1, hemi: 1, tint: null },
  hitze: { sun: 1.15, hemi: 0.95, tint: 0xffe2a8 },
  rain: { sun: 0.45, hemi: 1.15, tint: 0xc8d4e6 },
  fog: { sun: 0.35, hemi: 1.25, tint: 0xdfe4e8 },
  snow: { sun: 0.55, hemi: 1.3, tint: 0xe8f0ff },
  frost: { sun: 0.85, hemi: 1.05, tint: 0xdce8ff },
  leaves: { sun: 0.95, hemi: 1, tint: 0xffd9a8 },
};
export function setLightMood(root, id = 'klar') {
  const m = MOODS[id] ?? MOODS.klar;
  root.traverse((o) => {
    const base = o.isLight && o.userData.base;
    if (!base) return;
    const sun = o.userData.sun;
    o.intensity = base.intensity * (o.isHemisphereLight ? m.hemi : m.sun);
    o.color.setHex(base.color);
    if (sun && m.tint) o.color.setHex(m.tint);
  });
}
