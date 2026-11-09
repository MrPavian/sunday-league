// Gegner-Check auch vor Pokalspielen (ROADMAP 11.17 Punkt 8, offener Rest, 2026-11-09).
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, seasonOver } from '../src/career/career.js';
import { pokalDue } from '../src/career/pokal.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

describe('Gegner-Check vor dem Pokalspiel', () => {
  it('die Pokalkarte zeigt den Bericht über den Pokalgegner', () => {
    const c = createCareer({ seed: 3 });
    c.level = 2;
    finishRound(c); // Saisonstart: Anmeldung zum Kreispokal
    while (!seasonOver(c) && !pokalDue(c)) finishRound(c);
    const kind = pokalDue(c);
    expect(kind).toBeTruthy();
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = c;
    const html = house.pokalCard(kind);
    expect(html).toMatch(/data-testid="opp-check"/);
    expect(html).toMatch(/Gegner-Check/);
  });
});
