
// Aufstellungen in normierten Koordinaten (Anteil von halfLength/halfWidth),
// damit sie auf jede Spielfeldgröße passen. Werte gelten für Team 0.
export const FORMATIONS = {
  4: [
    { role: 'gk', x: -0.96, z: 0 },
    { role: 'def', x: -0.61, z: 0 },
    { role: 'mid', x: -0.33, z: -0.41 },
    { role: 'fwd', x: -0.17, z: 0.36 },
  ],
  5: [
    { role: 'gk', x: -0.96, z: 0 },
    { role: 'def', x: -0.62, z: -0.34 },
    { role: 'def', x: -0.62, z: 0.34 },
    { role: 'mid', x: -0.36, z: 0 },
    { role: 'fwd', x: -0.14, z: 0.3 },
  ],
};

FORMATIONS[7] = [
  { role: 'gk', x: -0.96, z: 0 },
  { role: 'def', x: -0.66, z: -0.32 },
  { role: 'def', x: -0.66, z: 0.32 },
  { role: 'mid', x: -0.4, z: -0.55 },
  { role: 'mid', x: -0.42, z: 0 },
  { role: 'mid', x: -0.4, z: 0.55 },
  { role: 'fwd', x: -0.14, z: 0.1 },
];

export function formationSpot(pitch, entry, team, swapped = false) {
  const s = (team === 0 ? 1 : -1) * (swapped ? -1 : 1);
  return { x: entry.x * pitch.halfLength * s, z: entry.z * pitch.halfWidth * s };
}
