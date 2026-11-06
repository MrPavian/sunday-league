// Funde aus dem Bugsuch-Test (2026-11-06): eigene Jugend auf Liga-Niveau, Sommerfest-Zugang, keine Doppelten nach Ligawechsel.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, getPool, humanClub, nextSeason, playerOf, seasonOver, takenIndices, youthNiveau } from '../src/career/career.js';
import { graduate } from '../src/career/academy.js';
import { createRng } from '../src/core/rng.js';
import { niveauOf } from '../src/sim/niveau.js';

const grad = (c, talent) => {
  c.youth ??= {};
  c.youth.prospects ??= [];
  return playerOf(c, graduate(c, { name: 'Test Kind', talent, position: 'mid', age: 16 }, createRng(3)));
};

describe('Bugsuche 2026-11-06', () => {
  it('youthNiveau: eine Stufe unter der Liga, in den Profiligen zwei', () => {
    const c = createCareer({ seed: 7 });
    expect([1, 2, 6, 9, 12].map((lv) => youthNiveau({ ...c, level: lv }))).toEqual([1, 1, 5, 7, 10]);
  });
  it('eigene Jugend wächst mit der Liga: Toptalent in der 1. Liga deutlich stärker als in der Kreisliga', () => {
    const low = createCareer({ seed: 7 });
    const high = createCareer({ seed: 7 });
    high.level = 12;
    const a = grad(low, 0.95).rating;
    const b = grad(high, 0.95).rating;
    expect(b).toBeGreaterThan(a + 60);
  });
  it('alter Spielstand: Absolvent ohne Niveau bleibt wie er war', () => {
    const c = createCareer({ seed: 7 });
    c.level = 12;
    const p = grad(c, 0.95);
    const idx = Object.keys(c.custom).map(Number).at(-1);
    delete c.custom[idx].niv;
    expect(playerOf(c, idx).rating).toBeLessThan(p.rating);
  });
  it('Ligawechsel: Spieler der Alten Herren landen nicht in neuen Gegnerkadern', () => {
    const c = createCareer({ seed: 11 });
    // Viele Ü32-Spieler vom Niveau der nächsten Liga belegen – vorher wurden sie beim Ligawechsel neu verteilt.
    const taken = takenIndices(c);
    const oh = getPool().everyone().filter((p) => !taken.has(p.poolIndex) && [1, 2].includes(niveauOf(p.poolIndex))).slice(0, 400).map((p) => p.poolIndex);
    c.oldBoys = { squad: oh, offers: [] };
    const me = () => humanClub(c);
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) f.result ??= f.home === me().id ? { home: 3, away: 0 } : f.away === me().id ? { home: 0, away: 3 } : { home: 1, away: 1 };
      finishRound(c);
    }
    nextSeason(c);
    expect(c.level).toBe(2);
    const set = new Set(oh);
    expect(c.clubs.flatMap((k) => k.squad).filter((i) => set.has(i))).toEqual([]);
  });
});
