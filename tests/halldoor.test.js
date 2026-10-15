import { describe, expect, it } from 'vitest';
import { HALL } from '../src/sim/pitch.js';
import { GEO } from '../src/sim/shelter.js';
import { boardDoorPeople, boardDoorTarget } from '../src/render/reactions.js';

const hw = HALL.halfWidth;
const lineZ = hw + 0.1;

describe('Bandentür der Halle', () => {
  it('bleibt zu, wenn niemand in der Nähe ist', () => {
    expect(boardDoorTarget([], hw)).toBe(0);
    expect(boardDoorTarget([{ x: GEO.hall.doorX, z: 0 }], hw)).toBe(0); // mitten auf dem Feld
    expect(boardDoorTarget([{ x: GEO.hall.doorX, z: lineZ + 3 }], hw)).toBe(0); // weit draußen
  });
  it('geht auf, wenn jemand an der Tür steht oder durchgeht, von beiden Seiten', () => {
    expect(boardDoorTarget([{ x: GEO.hall.doorX, z: lineZ }], hw)).toBe(1);
    expect(boardDoorTarget([{ x: GEO.hall.doorX + 0.3, z: lineZ - 0.7 }], hw)).toBe(1);
    expect(boardDoorTarget([{ x: GEO.hall.doorX, z: lineZ + 0.7 }], hw)).toBe(1);
    const half = boardDoorTarget([{ x: GEO.hall.doorX, z: lineZ - 1.2 }], hw);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
  });
  it('wird beim Näherkommen stetig größer', () => {
    let last = -1;
    for (let d = 2; d >= 0; d -= 0.1) {
      const t = boardDoorTarget([{ x: GEO.hall.doorX, z: lineZ - d }], hw);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
  });
  it('ignoriert Leute neben der Tür; der nächste bestimmt die Öffnung', () => {
    expect(boardDoorTarget([{ x: GEO.hall.doorX + 3, z: lineZ }], hw)).toBe(0);
    expect(boardDoorTarget([{ x: GEO.hall.doorX + 3, z: lineZ }, { x: GEO.hall.doorX, z: lineZ + 0.2 }], hw)).toBe(1);
  });
  it('zählt Besucher immer, den Schiri nur beim Abgang durch die Tür', () => {
    const referee = { pos: { x: 0, z: lineZ - 0.2 } };
    const visitor = { id: 'ordner', pos: { x: 5, z: 12 } };
    expect(boardDoorPeople({ referee, visitors: [], incident: null })).toEqual([]);
    expect(boardDoorPeople({ referee, visitors: [], incident: { type: 'ersatzschiri' } })).toEqual([]);
    expect(boardDoorPeople({ referee, visitors: [visitor], incident: { exit: { k: 0 } } })).toEqual([visitor.pos, referee.pos]);
    expect(boardDoorTarget(boardDoorPeople({ referee, visitors: [], incident: { exit: { k: 0 } } }), hw)).toBe(1);
    expect(boardDoorTarget(boardDoorPeople({ referee, visitors: [], incident: null }), hw)).toBe(0);
  });
});
