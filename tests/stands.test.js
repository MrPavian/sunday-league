// Stadionausbau sichtbar (ROADMAP 11.17 Punkt 6): Ausbaustufe aus der Karriere, Ränge wachsen mit der Stufe.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { standStage } from '../src/career/facilities.js';
import { venueExtras } from '../src/career/sponsors.js';
import { BIG_PITCH } from '../src/sim/pitch.js';
import { buildStands, STAND_STAGES, stageRank } from '../src/render/venues/stands.js';

const built = (...ids) => {
  const c = createCareer({ seed: 7 });
  c.facilities = { ...(c.facilities ?? {}), built: Object.fromEntries(ids.map((id) => [id, true])) };
  return c;
};
// Schilder malen auf eine Leinwand; im Testlauf ohne Browser reicht eine stumme.
globalThis.document ??= { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true }) }) };
const slots = (stage) => {
  const root = new THREE.Group();
  buildStands(root, BIG_PITCH, stage, { seat: 0xc0392b });
  let n = 0;
  let red = 0;
  root.traverse((o) => {
    if (o.userData.crowdSlot) n++;
    if (o.material?.color?.getHex?.() === 0xc0392b) red++;
  });
  return { n, meshes: root.children.length, red };
};

describe('Stadionausbau in 3D', () => {
  it('Stufe: die höchste gebaute ab dem Stadionausbau, darunter keine', () => {
    expect(standStage(built())).toBe(null);
    expect(standStage(built('tribuene', 'sitzplaetze', 'tribdach'))).toBe(null);
    expect(standStage(built('stadion'))).toBe('stadion');
    expect(standStage(built('stadion', 'drittliga', 'arena'))).toBe('arena');
    expect(standStage(built('stadion', 'drittliga', 'arena', 'sitzplatz8000', 'grossarena'))).toBe('grossarena');
  });

  it('venueExtras gibt Stufe, Sitzfarbe und Stahlrohrtribüne weiter', () => {
    expect(venueExtras(built())).toBeNull();
    expect(venueExtras(built('sitzplaetze'))).toMatchObject({ extraStand: true });
    expect(venueExtras(built('sitzplaetze')).stage).toBeUndefined();
    const c = built('sitzplaetze', 'stadion', 'drittliga');
    expect(venueExtras(c)).toMatchObject({ extraStand: true, stage: 'drittliga', seat: humanClub(c).kit.shirt });
  });

  it('jede Stufe zeigt mehr Ränge und Plätze als die davor; ohne Stufe kommt nichts dazu', () => {
    expect(slots(null)).toEqual({ n: 0, meshes: 0, red: 0 });
    let prev = { n: 0, meshes: 0, red: 0 };
    for (const stage of STAND_STAGES) {
      const now = slots(stage);
      expect(stageRank(stage)).toBeGreaterThan(0);
      if (stage === 'sitzplatz8000') {
        // gleiche Ränge, aber Sitzschalen in Vereinsfarben auch hinter den Toren und auf der Kameraseite
        expect(now.meshes).toBe(prev.meshes);
        expect(now.red).toBeGreaterThan(prev.red);
      } else {
        expect(now.meshes).toBeGreaterThan(prev.meshes);
        expect(now.n).toBeGreaterThan(prev.n);
      }
      prev = now;
    }
  });
});
