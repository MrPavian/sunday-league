// Bewegte Figuren am Spieltag (render/props.js makeMatchdayStaff, render/MatchView.js staffFrame): Der Linienrichter ist ein eigenes
// Mesh (nicht in der Kulisse verschmolzen) und trägt seinen Laufbereich. Der Platzwart ist seit 2026-11-15 entfernt (vom Nutzer).
import { describe, expect, it } from 'vitest';
import { makeMatchdayStaff } from '../src/render/props.js';
import { PITCHES } from '../src/sim/pitch.js';

describe('Bewegte Figuren am Spieltag', () => {
  it('Linienrichter: ein Mesh, nicht verschmelzbar, mit Laufbereich an der Linie; kein Platzwart mehr', () => {
    const pitch = PITCHES.rasenplatz;
    const g = makeMatchdayStaff(pitch);
    const figs = g.children.filter((o) => o.userData.staff);
    expect(figs.map((o) => o.userData.staff.kind)).toEqual(['lines']);
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
