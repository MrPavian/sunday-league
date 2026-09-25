import * as THREE from 'three';
import { toon } from './materials.js';

export const BALL_VISUAL_RADIUS = 0.2;

// Leicht vergrößert, damit der Ball in der niedrigen Auflösung lesbar bleibt.
export function createBallModel() {
  const geo = new THREE.IcosahedronGeometry(BALL_VISUAL_RADIUS, 1);
  const colors = [];
  const faces = geo.attributes.position.count / 3;
  for (let f = 0; f < faces; f++) {
    const dark = f % 7 === 0 || f % 11 === 3;
    const c = dark ? [0.12, 0.12, 0.14] : [0.95, 0.95, 0.92];
    for (let v = 0; v < 3; v++) colors.push(...c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = toon(0xffffff).clone();
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

const axis = new THREE.Vector3();
const q = new THREE.Quaternion();

export function rollBall(mesh, vel, dt) {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 1e-3) return;
  axis.set(vel.z, 0, -vel.x).normalize();
  q.setFromAxisAngle(axis, (speed / BALL_VISUAL_RADIUS) * dt);
  mesh.quaternion.premultiply(q);
}
