export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Math.sqrt statt Math.hypot: in V8 ein Vielfaches schneller (Simulation gesamt −43 % je Schritt, gemessen); rundet in der
// letzten Stelle teils anders – die Simulation ist damit weiter deterministisch, nur mit anderer Zahlenfolge als vorher.
export const hypot = (x, z) => Math.sqrt(x * x + z * z);
export const hypot3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export const len = hypot;
export const dist2d = (a, b) => hypot(a.x - b.x, a.z - b.z);

export function norm(x, z) {
  const l = hypot(x, z);
  return l > 1e-6 ? { x: x / l, z: z / l } : { x: 0, z: 0 };
}

export function rotate(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.z * s, z: v.x * s + v.z * c };
}
