// Bodenmodell des Balls: Rollwiderstand + Luftwiderstand ∝ v² (ball.js). Die Hilfsfunktionen (Strecke, Zeit, Umkehrung) müssen
// zum Schrittmodell stepBall passen – die KI dosiert Pässe und Annahmepunkte damit.
import { describe, expect, it } from 'vitest';
import { createBall, rollDistance, rollSpeedAfter, rollSpeedFor, rollStopDistance, rollStopTime, rollTime, stepBall } from '../src/sim/ball.js';
import { SURFACES } from '../src/sim/surfaces.js';

const DT = 1 / 60;
const field = (surface) => ({ surface, halfLength: 1e4, halfWidth: 1e4, wallX: 1e5, goalHalfWidth: 0, goalHeight: 0, goalType: 'open', boundary: 'walls' });

// Rollt mit v0 und liefert Weg/Zeit bis zum Stillstand sowie eine Messung bei Weg d.
function roll(surface, v0, d = null) {
  const b = createBall();
  b.vel.x = v0;
  let t = 0;
  let at = null;
  while (t < 90) {
    stepBall(b, field(surface), DT);
    t += DT;
    if (at === null && d !== null && b.pos.x >= d) at = { t, v: b.vel.x };
    if (b.vel.x === 0) break;
  }
  return { dist: b.pos.x, time: t, at };
}

describe('Rollen am Boden', () => {
  it('Hilfsfunktionen stimmen mit stepBall überein (Stoppweg, Stoppzeit, Geschwindigkeit und Zeit nach d)', () => {
    for (const s of Object.values(SURFACES)) {
      for (const v0 of [3.7, 6, 10, 15, 20, 25]) {
        const r = roll(s, v0, 5);
        // Das Schrittmodell setzt Geschwindigkeiten unter 0,05 m/s auf 0 und rechnet explizit: kleine Abweichung erlaubt.
        expect(Math.abs(r.dist - rollStopDistance(v0, s)), `${s.id} ${v0} Weg`).toBeLessThan(0.03 * rollStopDistance(v0, s) + 0.15);
        expect(Math.abs(r.time - rollStopTime(v0, s)), `${s.id} ${v0} Zeit`).toBeLessThan(0.04 * rollStopTime(v0, s) + 0.1);
        if (r.at) {
          expect(Math.abs(r.at.v - rollSpeedAfter(v0, 5, s)), `${s.id} ${v0} v(5 m)`).toBeLessThan(0.06 * v0 + 0.1);
          expect(Math.abs(r.at.t - rollTime(v0, 5, s)), `${s.id} ${v0} t(5 m)`).toBeLessThan(0.08); // ein Bild Auflösung plus Reihenfolge Ort/Bremse im Schritt
        }
        expect(Math.abs(rollDistance(v0, r.time, s) - r.dist), `${s.id} ${v0} Weg(t)`).toBeLessThan(0.03 * r.dist + 0.15);
      }
    }
  });

  it('Umkehrung: rollSpeedFor trifft die gewünschte Ankunftsgeschwindigkeit in stepBall', () => {
    for (const s of Object.values(SURFACES)) {
      // Kommt er gerade an (vEnd = 0), steht der Ball nach d Metern.
      const stop = roll(s, rollSpeedFor(8, 0, s));
      expect(Math.abs(stop.dist - 8), `${s.id} Stopp bei 8 m`).toBeLessThan(0.4);
      for (const [d, vEnd] of [[12, 3], [20, 5], [25, 8]]) {
        const v0 = rollSpeedFor(d, vEnd, s);
        const r = roll(s, v0, d);
        expect(r.at, `${s.id} ${d} m erreicht`).not.toBeNull();
        expect(Math.abs(r.at.v - vEnd), `${s.id} ${d} m ${vEnd} m/s`).toBeLessThan(0.45);
        expect(rollSpeedAfter(v0, d, s)).toBeCloseTo(vEnd, 6);
      }
    }
  });

  it('Eichung: 15 m/s auf Rasen 28-32 m, langsame Bälle auf Kunstrasen/Halle im FIFA-Rollbereich, Ordnung der Böden bleibt', () => {
    const d15 = Object.fromEntries(Object.values(SURFACES).map((s) => [s.id, roll(s, 15).dist]));
    expect(d15.grass).toBeGreaterThan(28);
    expect(d15.grass).toBeLessThan(32);
    for (const id of ['artificial', 'hall']) {
      const d = roll(SURFACES[id], 3.7).dist;
      expect(d, id).toBeGreaterThan(4);
      expect(d, id).toBeLessThan(10);
    }
    // Parkwiese < Asche < Rasen < Asphalt < Beton < Kunstrasen < Halle (bremsen stark → schwach)
    const order = ['parkGrass', 'ash', 'grass', 'asphalt', 'concrete', 'artificial', 'hall'];
    for (let i = 1; i < order.length; i++) expect(d15[order[i]], order[i]).toBeGreaterThan(d15[order[i - 1]]);
  });

  it('Form: Luftwiderstand ∝ v² macht schnelle Bälle kürzer als reiner Rollwiderstand, langsame nicht', () => {
    const s = SURFACES.grass;
    const constOnly = (v) => (v * v) / (2 * s.rollDecel);
    expect(rollStopDistance(20, s)).toBeLessThan(0.6 * constOnly(20));
    expect(rollStopDistance(3.7, s)).toBeGreaterThan(0.9 * constOnly(3.7));
  });
});
