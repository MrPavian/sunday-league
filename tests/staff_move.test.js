// Bewegte Figuren am Spieltag (render/props.js makeMatchdayStaff, render/MatchView.js staffFrame): Platzwart und Linienrichter sind je
// ein eigenes Mesh (nicht in der Kulisse verschmolzen) und tragen ihren Laufbereich.
import { describe, expect, it } from 'vitest';
import { makeMatchdayStaff } from '../src/render/props.js';
import { PITCHES } from '../src/sim/pitch.js';

describe('Bewegte Figuren am Spieltag', () => {
  it('Platzwart und Linienrichter: je ein Mesh, nicht verschmelzbar, mit Laufbereich an der Linie', () => {
    const pitch = PITCHES.rasenplatz;
    const g = makeMatchdayStaff(pitch);
    const figs = g.children.filter((o) => o.userData.staff);
    expect(figs.map((o) => o.userData.staff.kind).sort()).toEqual(['lines', 'warden']);
    for (const f of figs) {
      const meshes = [];
      f.traverse((o) => o.isMesh && meshes.push(o));
      expect(meshes).toHaveLength(1);
      expect(meshes[0].userData.keep).toBe(true);
      const st = f.userData.staff;
      expect(st.from).toBeLessThan(st.to);
      expect(Math.abs(st.to)).toBeLessThanOrEqual(pitch.halfLength);
      expect(Math.abs(st.z)).toBeGreaterThan(pitch.halfWidth); // hinter der Seitenlinie
    }
  });
});
