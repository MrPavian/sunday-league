import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kitMaterial, toon, vertexToon } from './materials.js';

function part(w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// Alle einfarbigen Boxen eines starren Körperteils (Bein, Arm, Rumpf mit Kopf)
// zu einem Mesh mit Eckfarben backen. Texturierte Teile (Trikotmuster) und das
// Pflaster, das ein- und ausgeblendet wird, bleiben eigene Meshes.
function bake(node, skip) {
  const parts = node.children.filter((c) => c.isMesh && !c.material.map && c !== skip);
  if (parts.length < 2) return;
  const geos = parts.map((m) => {
    m.updateMatrix(); // Position steht sonst erst beim Rendern in der Matrix
    const g = m.geometry.toNonIndexed();
    g.applyMatrix4(m.matrix);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const { r, g: gr, b } = m.material.color;
    for (let i = 0; i < n; i++) col.set([r, gr, b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos, false), vertexToon());
  mesh.castShadow = true;
  for (const g of geos) g.dispose();
  for (const m of parts) {
    node.remove(m);
    m.geometry.dispose();
  }
  node.add(mesh);
}

// Low-Poly-Normalo aus Quadern. Bauch, Glatze, Bart und Größe kommen aus dem
// generierten Aussehen – keine zwei Spieler sehen gleich aus.
export function createPlayerModel(look, kit) {
  const skin = toon(look.skin);
  const shirt = kitMaterial(kit);
  const shorts = toon(kit.shorts);
  const socks = toon(kit.socks);
  const shoes = toon(0x1f1f1f);
  const hair = toon(look.hair);
  const belly = look.belly;

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  group.scale.setScalar(look.height);

  const legs = [];
  let plaster = null;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.11, 0.85, 0);
    pivot.add(part(0.17, 0.3, 0.19, shorts, 0, -0.15, 0));
    pivot.add(part(0.13, 0.25, 0.14, skin, 0, -0.42, 0));
    pivot.add(part(0.14, 0.3, 0.15, socks, 0, -0.65, 0));
    pivot.add(part(0.15, 0.1, 0.27, shoes, 0, -0.8, 0.04));
    if (side === 1) {
      plaster = part(0.14, 0.09, 0.03, toon(0xf4efe4), 0, -0.4, 0.075);
      plaster.visible = false;
      pivot.add(plaster);
    }
    body.add(pivot);
    legs.push(pivot);
  }

  body.add(part(0.4 + belly * 0.1, 0.18, 0.24 + belly * 0.08, shorts, 0, 0.87, 0));
  const torso = part(0.42 + belly * 0.12, 0.55, 0.24 + belly * 0.16, shirt, 0, 1.18, belly * 0.03);
  body.add(torso);

  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.27 + belly * 0.06), 1.4, 0);
    pivot.add(part(0.13, 0.2, 0.14, shirt, 0, -0.1, 0));
    pivot.add(part(0.11, 0.32, 0.12, skin, 0, -0.35, 0));
    body.add(pivot);
    arms.push(pivot);
  }

  body.add(part(0.26, 0.28, 0.26, skin, 0, 1.63, 0));
  if (!look.bald) {
    body.add(part(0.28, 0.08, 0.28, hair, 0, 1.8, 0));
    body.add(part(0.28, 0.16, 0.06, hair, 0, 1.7, -0.13));
  }
  if (look.beard) body.add(part(0.24, 0.1, 0.06, hair, 0, 1.53, 0.12));

  for (const node of [body, ...legs, ...arms]) bake(node, plaster);

  return { group, body, legs, arms, plaster, phase: Math.random() * 6 };
}

// Prozedurale Animation: Laufzyklus, Schuss, Torwart hält den Ball.
export function animatePlayer(model, { speed, dt, kickAnim, headAnim, holding, state, injured, dive, celebrate, sad }) {
  const s = Math.min(1, speed / 6);
  model.phase += dt * (3 + speed * 1.7);
  const swing = Math.sin(model.phase) * 0.9 * s;
  const [legL, legR] = model.legs;
  const [armL, armR] = model.arms;
  legL.rotation.x = swing;
  legR.rotation.x = -swing;
  armL.rotation.x = -swing * 0.8;
  armR.rotation.x = swing * 0.8;
  model.body.position.y = Math.abs(Math.sin(model.phase)) * 0.05 * s;
  model.body.position.x = 0;
  model.body.rotation.x = s * 0.12;
  armL.rotation.z = armR.rotation.z = 0;
  // Mit Schürfwunde humpelt man ein bisschen.
  model.body.rotation.z = injured ? Math.sin(model.phase) * 0.07 * s : 0;
  model.plaster.visible = injured;

  if (kickAnim > 0) {
    const t = 1 - kickAnim / 0.3;
    legR.rotation.x = t < 0.4 ? (t / 0.4) * 0.9 : 0.9 - ((t - 0.4) / 0.6) * 2.3;
    armL.rotation.x = -0.6;
  }
  if (holding === 'chest') {
    armL.rotation.x = -1.3;
    armR.rotation.x = -1.3;
  } else if (holding === 'overhead') {
    armL.rotation.x = armR.rotation.x = -2.9; // Einwurf
  }
  if (headAnim > 0) {
    // Kopfball: kurz hochspringen und nicken.
    const t = 1 - headAnim / 0.3;
    model.body.position.y = Math.sin(t * Math.PI) * 0.35;
    model.body.rotation.x = -0.3 + t * 0.7;
    armL.rotation.x = armR.rotation.x = -0.6;
  }

  // Grätsche: Füße voran, Oberkörper nach hinten. Gefoult: bäuchlings hin.
  if (state === 'tackle') {
    model.body.rotation.x = -1.15;
    model.body.position.y = 0.12;
    legL.rotation.x = -1.3;
    legR.rotation.x = -0.9;
    armL.rotation.x = armR.rotation.x = 0.8;
  } else if (state === 'complain') {
    // Meckern: Arme hoch, fuchteln.
    armL.rotation.x = -2.4 + Math.sin(model.phase * 3) * 0.4;
    armR.rotation.x = -2.4 - Math.sin(model.phase * 3) * 0.4;
    model.phase += dt * 4;
  } else if (state === 'down') {
    model.body.rotation.x = 1.45;
    model.body.position.y = 0.12;
    legL.rotation.x = legR.rotation.x = 0.1;
    armL.rotation.x = armR.rotation.x = -2.6;
  }
  // Hechtsprung des Torwarts: seitlich flach in die Ecke.
  if (dive) {
    const k = Math.sin(Math.min(1, (0.5 - dive.t) / 0.2) * Math.PI * 0.5);
    model.body.rotation.z = dive.side * 1.35 * k;
    model.body.position.x = -dive.side * 0.55 * k;
    model.body.position.y = 0.25 * k;
    armL.rotation.x = armR.rotation.x = -2.9;
  }

  // Torjubel – jeder hat seinen eigenen.
  if (celebrate) {
    const t = model.phase;
    if (celebrate === 'flugzeug') {
      armL.rotation.z = -1.45;
      armR.rotation.z = 1.45;
      model.body.rotation.z = Math.sin(t * 0.8) * 0.25;
    } else if (celebrate === 'faust') {
      armR.rotation.x = -2.6 + Math.sin(t * 3) * 0.4;
    } else if (celebrate === 'tanz') {
      armL.rotation.x = -2.5 + Math.sin(t * 4) * 0.8;
      armR.rotation.x = -2.5 - Math.sin(t * 4) * 0.8;
      model.body.position.y = Math.abs(Math.sin(t * 4)) * 0.12;
    } else if (celebrate === 'rutscher' && speed > 1.5) {
      // Knierutscher auf Rasen: auf die Knie, Oberkörper zurück, Arme hoch.
      model.body.position.y = -0.38;
      model.body.rotation.x = -0.35;
      legL.rotation.x = legR.rotation.x = -1.4;
      armL.rotation.x = armR.rotation.x = -2.8;
    } else if (celebrate === 'rutscher') {
      armL.rotation.x = armR.rotation.x = -2.8;
    }
  } else if (sad) {
    // Gegentor: Kopf runter, Hände in die Hüften.
    model.body.rotation.x = 0.14;
    armL.rotation.z = 0.5;
    armR.rotation.z = -0.5;
  }
}
