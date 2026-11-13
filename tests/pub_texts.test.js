// Textvielfalt in der Kneipe (career/pub.js say): mehrere Fassungen über die Spieltage, Wirkung unverändert.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { buyRound, pubState, setTactic, TACTICS } from '../src/career/pub.js';

describe('Textvielfalt in der Kneipe', () => {
  it('Runde und Bierdeckel: über eine Saison mehrere Fassungen, jede nennt Preis bzw. Taktik', () => {
    const c = createCareer({ seed: 71 });
    const rounds = new Set();
    const mats = new Set();
    const id = Object.keys(TACTICS)[0];
    for (let r = 0; r < 12; r++) {
      c.round = r;
      pubState(c).actions = 2;
      const t = buyRound(c);
      expect(t).toContain('Runde');
      expect(t).toMatch(/€/);
      rounds.add(t.replace(/\(.*?\)/, ''));
      pubState(c).actions = 2;
      const m = setTactic(c, id);
      expect(m).toContain(TACTICS[id].name);
      mats.add(m);
    }
    expect(rounds.size).toBeGreaterThanOrEqual(3);
    expect(mats.size).toBeGreaterThanOrEqual(2);
  });
});
