import * as THREE from 'three';

// Dreistufiges Toon-Shading passt zur Pixelart und hält die Palette ruhig.
const gradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
gradient.minFilter = THREE.NearestFilter;
gradient.magFilter = THREE.NearestFilter;
gradient.generateMipmaps = false;
gradient.needsUpdate = true;

const cache = new Map();

export function toon(color, { map = null } = {}) {
  const key = map ? null : color;
  if (key !== null && cache.has(key)) return cache.get(key);
  const mat = new THREE.MeshToonMaterial({ color, gradientMap: gradient, map });
  if (key !== null) cache.set(key, mat);
  return mat;
}

// Ein Material für alle einfarbigen Teile: Die Farbe steckt in den Ecken (vertex
// colors). So lassen sich viele Boxen zu einem Mesh backen – ein Draw Call statt zwanzig.
let vertexMat = null;
export function vertexToon() {
  vertexMat ??= new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient });
  return vertexMat;
}

export function pixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


// Leuchtende Teile (Flutlichtköpfe, Laternen, erleuchtete Fenster): dasselbe Toon-
// Material mit Eigenleuchten. Tagsüber aus, abends und in der Halle an – gesteuert über
// einen einzigen Regler (setEmissiveLevel), ohne eigene Shader-Variante: Das Toon-
// Material hat das Eigenleuchten immer eingebaut. Geteilt je Farbe, wie toon().
const glowCache = new Map();
let glowLevel = 0;
export function emissiveToon(color, glow = 0xfff2c8, strength = 1) {
  const key = `${color}|${glow}|${strength}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const mat = new THREE.MeshToonMaterial({ color, gradientMap: gradient, emissive: glow, emissiveIntensity: glowLevel * strength });
  mat.userData.emissiveStrength = strength;
  glowCache.set(key, mat);
  return mat;
}
export function setEmissiveLevel(level) {
  glowLevel = level;
  for (const mat of glowCache.values()) mat.emissiveIntensity = level * mat.userData.emissiveStrength;
}
export const emissiveLevel = () => glowLevel;
