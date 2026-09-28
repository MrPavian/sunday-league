// Wiederverwendbare Low-Poly-Requisiten für alle Spielorte.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { emissiveToon, toon } from './materials.js';
import { shadowBias } from './lighting.js';
import { currentQuality } from './quality.js';

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
  const head = box(0.9, 0.18, 0.3, 0x4d5358, x, height, z + 0.35);
  head.material = emissiveToon(0x4d5358, 0xffe2a0, 1.3);
  return group(cylinder(0.08, height, 0x4d5358, x, height / 2, z, 6), head);
}
// Lampenkopf einer Laterne (für Lichthof und Lichtpool, siehe lighting.js).
export const lampHead = (x, z, height = 5.5) => [x, height, z + 0.35];

// Flutlichtmast: Mast plus leuchtender Kopf (zur Spielfeldseite geneigt).
export function makeFloodlight(x, z, height, width = 2.5) {
  const head = box(width, 0.95, 0.3, 0x4d5358, x, height + 0.2, z + 0.3);
  head.rotation.x = -0.4;
  head.material = emissiveToon(0x4d5358, 0xfff4d0, 1.5);
  return group(cylinder(0.16, height, 0x7a7f84, x, height / 2, z, 6), head);
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
// Mit Netzreaktion (Qualitätsstufe netFx) werden die Schnüre zu einem eigenen Mesh je Tor
// zusammengefasst, das sich beim Tor ausbeulen kann (Ball 2.0, BallView) – sonst bleiben es
// Einzelboxen, die mergeStatic mit der übrigen Kulisse verschmilzt.
export function makeGoalFrame(halfWidth, height, sign, depth = 1.2) {
  const g = new THREE.Group();
  const white = 0xf2f2ee;
  const net = 0xd8d8d0;
  const t = 0.12;
  g.add(box(t, height, t, white, 0, height / 2, -halfWidth));
  g.add(box(t, height, t, white, 0, height / 2, halfWidth));
  g.add(box(t, t, halfWidth * 2 + t, white, 0, height, 0));
  const back = sign * depth;
  const strings = [];
  for (const z of [-halfWidth, halfWidth]) strings.push(box(depth, 0.04, 0.04, net, back / 2, height * 0.9, z));
  for (let y = 0.3; y < height; y += 0.35) strings.push(box(0.02, 0.02, halfWidth * 2, net, back, y, 0));
  for (let z = -halfWidth; z <= halfWidth + 0.01; z += 0.5) strings.push(box(0.02, height * 0.9, 0.02, net, back, height * 0.45, z));
  for (let x = 0.3; x < depth; x += 0.35) strings.push(box(0.02, 0.02, halfWidth * 2, net, sign * x, height * 0.9, 0));
  if (!(currentQuality().netFx > 0)) {
    for (const m of strings) g.add(m);
    return g;
  }
  const geo = mergeGeometries(strings.map((m) => m.geometry.clone().translate(m.position.x, m.position.y, m.position.z)), false);
  for (const m of strings) m.geometry.dispose();
  const mesh = new THREE.Mesh(geo, netMaterial(net, sign, depth));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.keep = true; // nicht mit der Kulisse verschmelzen
  mesh.userData.net = { sign, halfWidth, height, depth };
  g.add(mesh);
  return g;
}

// Netz-Material: Die Schnüre werden hinten am stärksten und rund um den Einschlagpunkt
// (hit = Höhe, Breite) nach außen gedrückt; amount kommt aus einer gedämpften Feder.
function netMaterial(color, sign, depth) {
  const mat = toon(color).clone();
  const amount = { value: 0 };
  const hit = { value: new THREE.Vector2(1, 0) };
  mat.userData.amount = amount;
  mat.userData.hit = hit;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNetAmount = amount;
    s.uniforms.uNetHit = hit;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uNetAmount;\nuniform vec2 uNetHit;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wBack = clamp(abs(position.x) / ${depth.toFixed(2)}, 0.0, 1.0);
        vec2 dh = vec2(position.y - uNetHit.x, position.z - uNetHit.y);
        float fall = exp(-dot(dh * dh, vec2(1.4, 0.7)));
        transformed.x += ${sign.toFixed(1)} * uNetAmount * wBack * fall;`,
      );
  };
  mat.customProgramCacheKey = () => `net${sign}|${depth}`;
  return mat;
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

// Die drei Lichter jedes Spielorts: Himmelslicht, Sonne (mit Schatten) und ein
// Gegenlicht von hinten. Farben, Stärken und Sonnenstand setzt applyLighting aus dem
// Lichtpaket (lighting.js); span = halbe Breite des Schattenausschnitts.
export function addLights(scene, { span = 32 } = {}) {
  scene.background = new THREE.Color(0xa9bccb);
  const hemiLight = new THREE.HemisphereLight(0xdbe8ff, 0x5a5140, 1.4);
  const light = new THREE.DirectionalLight(0xfff0d8, 2.6);
  light.castShadow = true;
  light.shadow.mapSize.setScalar(currentQuality().shadowMap);
  Object.assign(light.shadow.camera, { left: -span, right: span, top: span * 0.8, bottom: -span * 0.8, near: 1, far: 120 });
  light.shadow.camera.updateProjectionMatrix();
  // Gegenlicht von hinten: Spieler heben sich besser vom Boden ab.
  const rim = new THREE.DirectionalLight(0xbcd4ff, 0.57);
  hemiLight.userData.role = 'hemi';
  light.userData.role = 'sun';
  rim.userData.role = 'rim';
  const g = group(hemiLight, light, rim);
  g.userData.scene = scene;
  return g;
}

const SUN_DISTANCE = 45;
// Lichtpaket anwenden: Sonnenstand (Schatten gehen mit), Farben, Stärken, Himmel.
export function applyLighting(root, scene, L) {
  scene.background = new THREE.Color(L.sky);
  const bias = shadowBias(L.sun.elevation);
  root.traverse((o) => {
    const role = o.isLight && o.userData.role;
    if (role === 'hemi') {
      o.color.setHex(L.hemi.sky);
      o.groundColor.setHex(L.hemi.ground);
      o.intensity = L.hemi.intensity;
    } else if (role === 'sun') {
      o.position.set(...L.sun.dir.map((v) => v * SUN_DISTANCE));
      o.color.setHex(L.sun.color);
      o.intensity = L.sun.intensity;
      o.shadow.intensity = L.shadow;
      o.shadow.bias = bias.bias;
      o.shadow.normalBias = bias.normalBias;
    } else if (role === 'rim') {
      // Von hinten, gegenüber der Sonne, etwas flacher.
      const [x, y] = L.sun.dir;
      o.position.set(-x * 30, Math.max(8, y * 20), -30);
      o.color.setHex(L.rim.color);
      o.intensity = L.rim.intensity;
      o.visible = L.rim.intensity > 0;
    }
  });
}
