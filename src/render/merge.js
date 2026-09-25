import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Statische Kulisse zusammenfassen: Alle Meshes mit demselben Material (und
// denselben Schatten-Einstellungen) werden zu einem Mesh verschmolzen. Aus
// Hunderten Einzelboxen – Autos, Zaunpfosten, Bäume, Zuschauer – werden so
// eine Handvoll Draw Calls. Da jedes Bild drei Durchgänge hat (Schatten, Farbe,
// Normalen), spart das besonders viel.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.visible || Array.isArray(o.material) || o.userData.keep) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  let removed = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    // Nur Attribute, die alle Teile haben – sonst lässt sich nicht verschmelzen.
    const names = Object.keys(meshes[0].geometry.attributes).filter((n) => meshes.every((m) => m.geometry.attributes[n]));
    const parts = meshes.map((m) => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      g.morphAttributes = {};
      g.clearGroups();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    if (!merged) continue;
    const first = meshes[0];
    const mesh = new THREE.Mesh(merged, first.material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.name = 'merged';
    for (const m of meshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
    root.add(mesh);
    removed += meshes.length - 1;
  }
  // Leere Gruppen aufräumen.
  const empty = [];
  root.traverse((o) => {
    if (o !== root && o.isGroup && o.children.length === 0) empty.push(o);
  });
  for (const g of empty) g.parent?.remove(g);
  return removed;
}

// Beim Platzwechsel alles freigeben, was nur diese Kulisse benutzt hat:
// Geometrien, Texturen (Schilder, Bodentexturen) und Materialien mit Textur.
// Die geteilten Toon-Materialien ohne Textur bleiben im Cache.
export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (!m.map) continue;
      m.map.dispose();
      m.dispose();
    }
  });
}
