// Niveau je Spieler (src/sim/niveau.js, Konzept Spielerstärke 12.5): Verteilung wie die Pyramide, fest je Pool-Nummer, und der
// Aufschlag hebt die Stärke um genau seinen Wert (bis auf Rundung), ohne Tempo, Ausdauer und Körper zu ändern.
import { describe, expect, it } from 'vitest';
import { getPool } from '../src/career/career.js';
import { lifted, NIVEAU_LIFT, NIVEAU_SHARE, niveauOf } from '../src/sim/niveau.js';

describe('Niveau je Spieler', () => {
  it('Anteile wie vorgegeben, fest je Pool-Nummer', () => {
    const n = 20000;
    const count = new Array(9).fill(0);
    for (let i = 0; i < n; i++) count[niveauOf(i)]++;
    NIVEAU_SHARE.forEach((s, k) => expect(Math.abs(count[k + 1] / n - s)).toBeLessThan(0.01));
    expect(niveauOf(123)).toBe(niveauOf(123));
  });

  it('Aufschlag: Stärke wächst um den Aufschlag, Körperwerte bleiben', () => {
    const pool = getPool();
    for (let i = 0; i < 300; i++) {
      const p = pool.get(i);
      for (const nv of [1, 4, 8]) {
        const q = lifted(p, nv);
        const raw = lifted(p, 1).rating; // ohne 99-Deckel
        expect(Math.abs(q.rating - raw - NIVEAU_LIFT[nv - 1])).toBeLessThanOrEqual(1);
        for (const k of ['pace', 'stamina', 'strength']) expect(q.attrs[k]).toBe(p.attrs[k]);
        expect(q.niveau).toBe(nv);
      }
    }
  });
});
