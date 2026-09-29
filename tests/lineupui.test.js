import { describe, expect, it } from 'vitest';
import { createCareer, currentLineup, humanClub } from '../src/career/career.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

// UI 2.0 Phase D: Aufstellung per Tippen (Spieler → Ziel) – die Alternative zum Ziehen.
// Beide Wege enden in derselben Karriere-Funktion (setLineupSlot); keine eigene Datenhaltung.
function house(c) {
  const h = new Clubhouse({ addEventListener() {} }, { onChange() {} });
  h.career = c;
  return h;
}

describe('Aufstellung auf dem Spielfeld', () => {
  it('Position antippen, dann andere Position: die beiden tauschen', () => {
    const c = createCareer({ seed: 21 });
    const h = house(c);
    const [a, b] = currentLineup(c).lineup;
    h.lineupPick({ slot: 0 });
    expect(h.pick).toEqual({ slot: 0 });
    h.lineupPick({ slot: 1 });
    expect(h.pick).toBeNull();
    expect(currentLineup(c).lineup.slice(0, 2)).toEqual([b, a]);
  });

  it('Bank antippen, dann Position: er spielt dort, der andere geht auf die Bank', () => {
    const c = createCareer({ seed: 21 });
    const h = house(c);
    const { lineup } = currentLineup(c);
    const benchGuy = humanClub(c).squad.find((idx) => c.week.availability[idx] === 'yes' && !lineup.includes(idx));
    expect(benchGuy).toBeDefined();
    const last = lineup.length - 1;
    const out = lineup[last];
    h.lineupPick({ idx: benchGuy });
    h.lineupPick({ slot: last });
    const now = currentLineup(c).lineup;
    expect(now[last]).toBe(benchGuy);
    expect(now).not.toContain(out);
  });

  it('dieselbe Position zweimal antippen wählt ab und ändert nichts; Ziehen nutzt denselben Weg', () => {
    const c = createCareer({ seed: 21 });
    const h = house(c);
    const before = currentLineup(c).lineup;
    h.lineupPick({ slot: 2 });
    h.lineupPick({ slot: 2 });
    expect(h.pick).toBeNull();
    expect(currentLineup(c).lineup).toEqual(before);
    h.applyLineup({ slot: 0 }, { slot: 2 }); // wie ein Ziehen von 0 nach 2
    expect(currentLineup(c).lineup[0]).toBe(before[2]);
    expect(currentLineup(c).lineup[2]).toBe(before[0]);
  });
});
