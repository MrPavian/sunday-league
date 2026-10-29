// Kadergrenze je Liga anzeigen und verschieben (ROADMAP 11.10, vom Nutzer gewünscht).
import { describe, expect, it } from 'vitest';
import { createCareer, maxSquad, MIN_SQUAD, setSquadExtra, SQUAD_EXTRA_MAX } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';

describe('Kadergrenze', () => {
  it('Standard der Liga, verschiebbar zwischen Mindestkader und Standard + 10', () => {
    const c = createCareer({ seed: 5 });
    expect(maxSquad(c)).toBe(LEAGUES[1].maxSquad);
    expect(setSquadExtra(c, 3)).toBe(LEAGUES[1].maxSquad + 3);
    expect(setSquadExtra(c, 99)).toBe(LEAGUES[1].maxSquad + SQUAD_EXTRA_MAX);
    expect(setSquadExtra(c, -99)).toBe(MIN_SQUAD);
    setSquadExtra(c, 0);
    expect(c.squadExtra).toBeUndefined();
  });
  it('die Verschiebung gilt auch nach Auf- und Abstieg relativ zum Standard der neuen Liga', () => {
    const c = createCareer({ seed: 5 });
    setSquadExtra(c, 2);
    c.level = 5;
    expect(maxSquad(c)).toBe(LEAGUES[5].maxSquad + 2);
  });
});
