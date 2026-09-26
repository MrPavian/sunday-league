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

// Pixel-Ziffern 3 × 5 für die Rückennummer.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];

// Aussehen, das nicht im Spielstand steht (Frisur, Bartform), leitet sich
// deterministisch aus dem Rest ab – der Spielerpool bleibt unverändert.
function lookHash(look) {
  let h = (look.skin ?? 0) ^ ((look.hair ?? 0) << 3) ^ Math.round((look.height ?? 1) * 1000) * 2654435761;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}

const luminance = (hex) => (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;

// Low-Poly-Normalo aus Quadern. Bauch, Glatze, Bart und Größe kommen aus dem
// generierten Aussehen – keine zwei Spieler sehen gleich aus. Dazu Gesicht,
// Frisur, Rückennummer, Stutzenring und beim Torwart Handschuhe.
export function createPlayerModel(look, kit, { number = null, keeper = false } = {}) {
  const skin = toon(look.skin);
  const shirt = kitMaterial(kit);
  const shorts = toon(kit.shorts);
  const socks = toon(kit.socks);
  const shoes = toon(0x1f1f1f);
  const hair = toon(look.hair);
  const eye = toon(0x1a1716);
  const belly = look.belly;
  const hash = lookHash(look);
  // Kontrastfarbe für Nummer und Stutzenring: helles Trikot → dunkel, sonst hell.
  const accentHex = luminance(kit.shirt) > 0.55 ? 0x1c1c1c : 0xf4f1e8;
  const accent = toon(accentHex);

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
    pivot.add(part(0.148, 0.04, 0.158, accent, 0, -0.53, 0)); // Ring am Stutzen
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
  const torsoW = 0.42 + belly * 0.12;
  const torsoD = 0.24 + belly * 0.16;
  const torso = part(torsoW, 0.55, torsoD, shirt, 0, 1.18, belly * 0.03);
  body.add(torso);
  // Kragen und kleines Wappen vorne.
  body.add(part(0.2, 0.04, 0.2, accent, 0, 1.46, belly * 0.02));
  body.add(part(0.06, 0.07, 0.02, accent, -0.1, 1.33, belly * 0.03 + torsoD / 2 + 0.005));
  // Rückennummer aus Pixeln – von hinten lesbar.
  if (number != null) {
    const digits = String(number).slice(0, 2).split('').map(Number);
    const cell = 0.036;
    const width = digits.length * 3 * cell + (digits.length - 1) * cell;
    const zBack = belly * 0.03 - torsoD / 2 - 0.006;
    digits.forEach((dg, di) => {
      const bits = DIGITS[dg];
      for (let row = 0; row < 5; row++) {
        // Waagerechte Läufe zu einem Quader zusammenfassen.
        let col = 0;
        while (col < 3) {
          if (bits[row * 3 + col] !== '1') {
            col++;
            continue;
          }
          let run = 1;
          while (col + run < 3 && bits[row * 3 + col + run] === '1') run++;
          const left = width / 2 - di * 4 * cell - col * cell; // Blick von hinten: links = +x
          const x = left - (run * cell) / 2;
          body.add(part(run * cell, cell, 0.012, accent, x, 1.3 - row * cell, zBack));
          col += run;
        }
      }
    });
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.27 + belly * 0.06), 1.4, 0);
    pivot.add(part(0.13, 0.2, 0.14, shirt, 0, -0.1, 0));
    pivot.add(part(0.11, 0.32, 0.12, keeper ? shirt : skin, 0, -0.35, 0));
    // Hände – der Torwart trägt Handschuhe.
    pivot.add(part(0.1, 0.08, 0.11, keeper ? toon(0xeeeeea) : skin, 0, -0.54, 0));
    body.add(pivot);
    arms.push(pivot);
  }

  // Kopf mit Ohren und Augen (vorne ist +z).
  body.add(part(0.26, 0.28, 0.26, skin, 0, 1.63, 0));
  body.add(part(0.03, 0.07, 0.06, skin, 0.14, 1.63, 0));
  body.add(part(0.03, 0.07, 0.06, skin, -0.14, 1.63, 0));
  body.add(part(0.045, 0.05, 0.02, eye, 0.06, 1.665, 0.132));
  body.add(part(0.045, 0.05, 0.02, eye, -0.06, 1.665, 0.132));

  // Frisuren: kurz, lang, Locken, Irokese, Pony, Dutt – bei Glatze mal ein Haarkranz.
  const style = hash % 6;
  if (!look.bald) {
    if (style === 3) {
      body.add(part(0.08, 0.1, 0.26, hair, 0, 1.82, 0)); // Irokese
    } else {
      const big = style === 2;
      body.add(part(big ? 0.32 : 0.28, big ? 0.12 : 0.08, big ? 0.32 : 0.28, hair, 0, big ? 1.81 : 1.8, 0));
      if (style === 1) {
        body.add(part(0.28, 0.3, 0.07, hair, 0, 1.62, -0.13)); // lang über den Nacken
        body.add(part(0.04, 0.2, 0.2, hair, 0.14, 1.68, -0.02));
        body.add(part(0.04, 0.2, 0.2, hair, -0.14, 1.68, -0.02));
      } else body.add(part(0.28, 0.16, 0.06, hair, 0, 1.7, -0.13));
      if (style === 4) body.add(part(0.26, 0.06, 0.05, hair, 0.02, 1.755, 0.12)); // Pony
      if (style === 5) body.add(part(0.1, 0.1, 0.1, hair, 0, 1.84, -0.1)); // Dutt
    }
  } else if (hash % 2) {
    body.add(part(0.04, 0.09, 0.22, hair, 0.135, 1.68, -0.02)); // Haarkranz
    body.add(part(0.04, 0.09, 0.22, hair, -0.135, 1.68, -0.02));
    body.add(part(0.28, 0.09, 0.05, hair, 0, 1.68, -0.13));
  }
  if (look.beard) {
    if ((hash >> 4) % 3 === 0) body.add(part(0.14, 0.035, 0.03, hair, 0, 1.585, 0.135)); // Schnauzer
    else body.add(part(0.24, 0.1, 0.06, hair, 0, 1.53, 0.12));
  }

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
