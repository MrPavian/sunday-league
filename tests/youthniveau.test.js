// Vom Nutzer gemeldet (2026-11-06): In der ersten Saison standen A-Jugendliche mit Stärke 70 und 111 im Freizeitligisten (Kader 45–60).
// Ursache: Der Jahrgang (youth.js youthIntake) und der Spielertrainer ohne eigene Figur (personal.js initCoach) kamen aus dem ganzen
// Pool, ohne auf das Niveau (sim/niveau.js) zu achten. Jetzt gilt wie bei Zugängen von außen: niveauFits.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, niveauFits, playerOf } from '../src/career/career.js';

describe('Jugend und Spielertrainer vom Niveau der eigenen Liga', () => {
  it('Startjahrgang und Spielertrainer passen in 40 Karrieren zur Freizeitliga', () => {
    let worst = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const c = createCareer({ seed });
      for (const idx of c.youth.prospects) {
        expect(niveauFits(c, idx)).toBe(true);
        worst = Math.max(worst, playerOf(c, idx).rating);
      }
      if (c.coach.idx != null) expect(niveauFits(c, c.coach.idx)).toBe(true);
      expect(Math.max(...humanClub(c).squad.map((i) => playerOf(c, i).rating))).toBeLessThan(90);
    }
    expect(worst).toBeLessThan(75); // vorher bis 125
  });
});
