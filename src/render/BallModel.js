import * as THREE from 'three';
import { toon } from './materials.js';

export const BALL_VISUAL_RADIUS = 0.2;

// Leicht vergrößert, damit der Ball in der niedrigen Auflösung lesbar bleibt (echter Radius
// siehe sim/ball.js). Ikosaeder mit zwei Unterteilungen (180 flache Dreiecke): Die fünf
// Dreiecke rund um jede der zwölf Ecken des Grundkörpers sind dunkel – das ergibt die zwölf
// Fünfecke des klassischen Fußballs. Fest aus der Geometrie, kein Zufall: Das Muster ist in
// jedem Spiel und jedem Bild gleich, nur die Drehung ändert sich.
export function createBallModel() {
  const geo = new THREE.IcosahedronGeometry(BALL_VISUAL_RADIUS, 2);
  const t = (1 + Math.sqrt(5)) / 2;
  const corners = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((c) => new THREE.Vector3(...c).normalize());
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const isCorner = (i) => {
    v.fromBufferAttribute(pos, i).normalize();
    return corners.some((c) => c.dot(v) > 0.9999);
  };
  const colors = [];
  for (let f = 0; f < pos.count / 3; f++) {
    const dark = isCorner(f * 3) || isCorner(f * 3 + 1) || isCorner(f * 3 + 2);
    const c = dark ? [0.12, 0.12, 0.14] : [0.95, 0.95, 0.92];
    for (let k = 0; k < 3; k++) colors.push(...c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = toon(0xffffff).clone();
  mat.vertexColors = true;
  // Kennung im Alphakanal wie eine neutrale Figur (PlayerModel EDGE_CODE.neutral): Der
  // Post-Shader gibt dem Ball dieselbe kräftige Außenkante wie den Spielern – er bleibt vor
  // Rasen, Schnee, Zuschauern und im Abendlicht lesbar – und dämpft den Nebel auf ihm.
  mat.blending = THREE.NoBlending;
  mat.opacity = 0.7;
  // Nasser Ball: bleibt bewusst nur dunkler (MatchView). Ein Glanzpunkt per Shader wurde im
  // Polish-Pass getestet und verworfen – auf ~12 Pixeln Ball war er nicht sichtbar.
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.ball = true;
  return mesh;
}

const axis = new THREE.Vector3();
const q = new THREE.Quaternion();

// Drehgeschwindigkeit fürs Auge: bis etwa 3 m/s wie echtes Rollen, darüber gedeckelt – bei
// 125 rad/s (harter Schuss) würde das Muster nur noch flimmern. Pass ≈ 3 Umdrehungen/s,
// Schuss ≈ 5–6: schneller als ein Pass, aber das Muster bleibt sichtbar.
export function ballSpin(speed) {
  return Math.min(speed / BALL_VISUAL_RADIUS, 12 + speed * 0.9);
}

// airborne: in der Luft kommt ein leichter Drall um die Flugrichtung dazu (zweite Achse).
export function rollBall(mesh, vel, dt, airborne = false) {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 1e-3) return;
  const w = ballSpin(speed);
  axis.set(vel.z, 0, -vel.x).normalize();
  q.setFromAxisAngle(axis, w * dt);
  mesh.quaternion.premultiply(q);
  if (!airborne) return;
  axis.set(vel.x, 0, vel.z).normalize();
  q.setFromAxisAngle(axis, w * 0.35 * dt);
  mesh.quaternion.premultiply(q);
}
