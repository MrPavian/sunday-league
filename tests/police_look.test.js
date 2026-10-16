// Polizei muss man vom Schiri unterscheiden: Schirmmütze und deutlich hellere blaue Uniform.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { POLICE_KIT } from '../src/sim/incidents.js';
import { BONES, createPlayerModel } from '../src/render/PlayerModel.js';

const lum = (hex) => (0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255)) / 255;
const REF_KIT = { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c }; // wie MatchView (Schiri-Standard)
const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1, belly: 0.3, bald: false, beard: false };

describe('Polizei-Aussehen', () => {
  it('die Besucher polizei0/1 tragen die Schirmmütze und das Polizei-Kit', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.hinterhof, human: false, duration: 80, incidents: true });
    m.incidentPlan = { type: 'polizei', at: 2 };
    for (let i = 0; i < 3600 && m.incident?.type !== 'polizei'; i++) stepMatch(m, undefined, 1 / 60);
    const cops = m.visitors.filter((v) => v.id.startsWith('polizei'));
    expect(cops.length).toBe(2);
    for (const c of cops) {
      expect(c.look.hat).toBe('polizei');
      expect(c.kit).toBe(POLICE_KIT);
    }
  });

  it('Jacke deutlich heller als der Schiri, Hose dunkler als die Jacke, Blau statt Schwarz', () => {
    expect(lum(POLICE_KIT.shirt) - lum(REF_KIT.shirt)).toBeGreaterThan(0.25);
    expect(lum(POLICE_KIT.shorts)).toBeLessThan(lum(POLICE_KIT.shirt));
    expect(lum(POLICE_KIT.shorts)).toBeGreaterThan(lum(REF_KIT.shorts));
    expect(POLICE_KIT.shirt & 255).toBeGreaterThan((POLICE_KIT.shirt >> 16) & 255); // Blauanteil vorn
  });

  it('die Mütze verändert das Netz, bleibt im Dreiecksbudget und kostet keinen zusätzlichen Mesh', () => {
    const plain = createPlayerModel(look, POLICE_KIT, { textured: false });
    const hat = createPlayerModel({ ...look, hat: 'polizei' }, POLICE_KIT, { textured: false });
    expect(hat.mesh.geometry.attributes.position.count).not.toBe(plain.mesh.geometry.attributes.position.count);
    expect(hat.mesh.geometry.attributes.position.count / 3).toBeLessThan(700);
    expect(hat.mesh.isSkinnedMesh).toBe(true);
    expect(hat.group.children.filter((c) => c.isMesh || c.isSkinnedMesh).length).toBe(plain.group.children.filter((c) => c.isMesh || c.isSkinnedMesh).length);
  });

  it('lange Hose: Unterschenkel in Hosenfarbe, Schuhe dunkel, gleiches Netz im Dreiecksbudget', () => {
    const idx = Object.fromEntries(BONES.map((n, i) => [n, i]));
    // Farben je Knochen (Vertexfarben, ohne Atlas): hips = Hosenfarbe, foot = Schuh.
    const colors = (model, bone) => {
      const g = model.mesh.geometry, set = new Set();
      for (let i = 0; i < g.attributes.position.count; i++) {
        if (g.attributes.skinIndex.getX(i) !== idx[bone]) continue;
        set.add([g.attributes.color.getX(i), g.attributes.color.getY(i), g.attributes.color.getZ(i)].map((v) => v.toFixed(4)).join(','));
      }
      return set;
    };
    const cop = createPlayerModel({ ...look, hat: 'polizei' }, POLICE_KIT, { textured: false });
    const trousers = colors(cop, 'hips');
    expect(trousers.size).toBe(1);
    for (const s of ['L', 'R']) {
      expect([...colors(cop, `lowerLeg${s}`)]).toEqual([...trousers]); // Knie bis Knöchel: nur Hosenfarbe, keine Haut/Stutzen
      expect([...colors(cop, `upperLeg${s}`)]).toEqual([...trousers]);
      expect(colors(cop, `foot${s}`).has([...trousers][0])).toBe(false); // Schuh bleibt eigene (dunkle) Farbe
    }
    const shorts = createPlayerModel({ ...look, hat: 'polizei' }, { ...POLICE_KIT, trousers: false }, { textured: false });
    expect(colors(shorts, 'lowerLegL').size).toBeGreaterThan(0);
    expect([...colors(shorts, 'lowerLegL')]).not.toEqual([...trousers]);
    expect(cop.mesh.geometry.attributes.position.count / 3).toBeLessThan(700);
    expect(cop.mesh.geometry.attributes.position.count).toBeLessThanOrEqual(shorts.mesh.geometry.attributes.position.count);
  });
});
