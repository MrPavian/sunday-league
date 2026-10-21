import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { afterHumanTie, pokalOf, pokalWonNow, roundTies, startPokal } from '../src/career/pokal.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

// Pokalsieg: Die Meldung muss gleich nach dem gewonnenen Finale im Vereinsheim stehen (nicht erst im Pokal-Reiter).
const house = (c) => {
  const h = new Clubhouse({ addEventListener() {} }, { onChange() {} });
  h.career = c;
  return h;
};
function settle(c, kind, win = true) {
  const cup = pokalOf(c, kind);
  const me = humanClub(c).id;
  c.round = cup.rounds[cup.round];
  const tie = roundTies(cup).find((t) => t.home === me || t.away === me);
  tie.result = win === (tie.home === me) ? { home: 2, away: 0 } : { home: 0, away: 2 };
  afterHumanTie(c, kind);
}

describe('Pokalsieg wird sofort gemeldet', () => {
  it('Kreispokal: nach dem gewonnenen Finale zeigt die Startseite „POKALSIEGER!"; in der Woche danach nicht mehr', () => {
    const c = createCareer({ seed: 8 });
    c.level = 5;
    const cup = startPokal(c, 'kreis');
    let guard = 0;
    while (!cup.done && guard++ < 8) {
      expect(pokalWonNow(c)).toBeNull();
      settle(c, 'kreis', true);
    }
    expect(cup.winner).toBe(humanClub(c).id);
    expect(pokalWonNow(c)).toBe('kreis');
    const html = house(c).hub();
    expect(html).toContain('POKALSIEGER!');
    expect(html).toContain('data-value="cup"');
    c.round++;
    expect(pokalWonNow(c)).toBeNull();
  });

  it('verlorenes Finale und ausgeschiedene Runde: keine Sieg-Meldung', () => {
    const c = createCareer({ seed: 9 });
    c.level = 5;
    startPokal(c, 'kreis');
    settle(c, 'kreis', false);
    expect(pokalWonNow(c)).toBeNull();
    expect(house(c).hub()).not.toContain('POKALSIEGER!');
  });
});
