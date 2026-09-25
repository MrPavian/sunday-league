export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const len = (x, z) => Math.hypot(x, z);
export const dist2d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function norm(x, z) {
  const l = Math.hypot(x, z);
  return l > 1e-6 ? { x: x / l, z: z / l } : { x: 0, z: 0 };
}

export function rotate(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.z * s, z: v.x * s + v.z * c };
}
