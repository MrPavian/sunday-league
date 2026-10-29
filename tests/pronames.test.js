// Keine echten Fußballer als Spielernamen (vom Nutzer gemeldet: ein Name eines aktiven Nationaltorwarts) und Bewerber,
// die mit dem Alter aussehen wie ihre Altersgenossen (65-Jähriger mit vollem braunem Haar).
import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { agedLook, greyChance, personIdentityDE, personIdentityDE6, personIdentityDE7, personIdentityDE8, personIdentityEN } from '../src/data/origins.js';
import { PRO_NAMES } from '../src/data/pronames.js';
import { HAIR_COLORS } from '../src/data/names.js';
import { createCareer } from '../src/career/career.js';
import { coachApplicants } from '../src/career/president.js';

describe('Keine echten Profinamen', () => {
  it('die Sperrliste enthält die gemeldeten und bekannte Namen', () => {
    for (const n of ['Oliver Baumann', 'Thomas Müller', 'Harry Kane', 'Robert Lewandowski']) expect(PRO_NAMES.has(n)).toBe(true);
  });
  it('kein Namenssatz erzeugt einen Namen von der Liste (je 50 000 Namen)', () => {
    for (const f of [personIdentityDE, personIdentityDE6, personIdentityDE7, personIdentityDE8, personIdentityEN]) {
      const rng = createRng(4711);
      for (let i = 0; i < 50000; i++) expect(PRO_NAMES.has(f(rng, 16 + (i % 45)).name)).toBe(false);
    }
  });
});

describe('Bewerber und Spieler altern sichtbar', () => {
  it('Bewerber über 60 sind meist grau wie die Spieler (greyChance), unter 35 nie', () => {
    let old = 0, oldGrey = 0, young = 0, youngGrey = 0;
    for (let s = 1; s <= 400; s++) {
      const c = createCareer({ seed: s });
      for (const cand of coachApplicants(c)) {
        const grey = cand.look.hair === HAIR_COLORS[5];
        if (cand.age >= 60) (old++, (oldGrey += grey));
        if (cand.age < 35) (young++, (youngGrey += grey));
      }
    }
    expect(old).toBeGreaterThan(30);
    expect(oldGrey / old).toBeGreaterThan(0.7); // greyChance(60) = 0,85
    expect(youngGrey).toBe(0);
  });
  it('mit den Jahren grau, im selben Anteil wie beim Würfeln, und dann bleibt es so', () => {
    let g55 = 0;
    for (let k = 0; k < 4000; k++) {
      const at50 = agedLook({ hair: HAIR_COLORS[1] }, 30, 50, k).hair === HAIR_COLORS[5];
      const at55 = agedLook({ hair: HAIR_COLORS[1] }, 30, 55, k).hair === HAIR_COLORS[5];
      if (at50) expect(at55).toBe(true);
      g55 += at55;
    }
    expect(Math.abs(g55 / 4000 - greyChance(55))).toBeLessThan(0.03);
    expect(agedLook({ hair: HAIR_COLORS[1] }, 30, 30, 1).hair).toBe(HAIR_COLORS[1]);
  });
});
