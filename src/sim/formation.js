import { attackDir } from './players.js';

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

export function formationSpot(pitch, entry, team) {
  const s = attackDir(team);
  return { x: entry.x * pitch.halfLength * s, z: entry.z * pitch.halfWidth * s };
}
