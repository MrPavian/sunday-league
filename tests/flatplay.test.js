import { describe, expect, it } from 'vitest';
import { catchNetX, createBall, stepBall } from '../src/sim/ball.js';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { flatten } from '../src/sim/actions.js';

// Hallencup: vorwiegend flach (pitch.flatPlay). Gemessen mit scripts/flat-audit.mjs, 60 Spiele (Seeds 900+):
// vorher 19 % der Pässe hoch (Steigung > 1,5 m/s), 39 % der langen Pässe, 90 % der Schüsse hoch (davon fast alle aus
// mehr als 8 m), 7,6 Mal je Spiel flog der Ball über Bandenhöhe an die Wand (bis 8,3 m hoch); nachher 0 % / 0 % /
// 20 % (nur noch aus Torentfernung) / 0,5 Mal je Spiel (höchstens 1,8 m). Schwellen deutlich über dem Messwert, aber weit unter dem Vorher.
function measure(id, seeds) {
  const pitch = PITCHES[id];
  const a = { passes: 0, high: 0, shots: 0, highFar: 0, maxY: 0 };
  for (const seed of seeds) {
    const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'pass') {
          a.passes++;
          if (m.ball.vel.y > 1.5) a.high++;
        } else if (e.type === 'shot') {
          a.shots++;
          const dx = Math.abs(Math.abs(m.ball.pos.x) - pitch.halfLength);
          if (m.ball.vel.y > 2.5 && dx > 8) a.highFar++;
        }
      }
      m.events.length = 0;
      a.maxY = Math.max(a.maxY, m.ball.pos.y);
    }
  }
  return a;
}
const seeds = Array.from({ length: 12 }, (_, i) => 900 + i);

describe('Hallencup: flach spielen', () => {
  it('Pässe gehen am Boden: kaum Hochbälle, auch bei langen Pässen', () => {
    const a = measure('halle', seeds);
    expect(a.passes).toBeGreaterThan(400);
    expect(a.high / a.passes).toBeLessThan(0.03); // vorher 19 %
  });

  it('Schüsse aus der Distanz bleiben flach, hoch nur vorm Tor', () => {
    const a = measure('halle', seeds);
    expect(a.shots).toBeGreaterThan(200);
    expect(a.highFar / a.shots).toBeLessThan(0.02); // vorher rund 60 %
    expect(a.maxY).toBeLessThan(4.5); // vorher bis 11 m: hinter dem Netz und über der Hallendecke
  });

  it('andere Plätze unverändert: Parkplatz spielt weiter auch hoch', () => {
    const a = measure('parkplatz', seeds.slice(0, 6));
    expect(a.high / a.passes).toBeGreaterThan(0.1); // gemessen 17 %
    expect(a.highFar / a.shots).toBeGreaterThan(0.4); // gemessen rund 65 %
  });

  it('flatten: nur in der Halle werden hohe Pässe und Flanken flach', () => {
    const hall = PITCHES.halle;
    expect(flatten(hall, { type: 'pass', lofted: true, minDist: 9 })).toMatchObject({ lofted: undefined });
    expect(flatten(hall, { type: 'pass', lofted: 'cross', driven: true })).toMatchObject({ lofted: undefined, low: true });
    const hoch = { type: 'pass', lofted: 'cross' };
    expect(flatten(PITCHES.parkplatz, hoch)).toBe(hoch);
    expect(flatten(PITCHES.rasenplatz, hoch)).toBe(hoch);
    const flach = { type: 'pass' };
    expect(flatten(hall, flach)).toBe(flach);
  });
});

describe('Fangnetz hinter dem Tor (Halle)', () => {
  const hall = PITCHES.halle;
  const throwAt = (pitch, { x, y, z, vx }) => {
    const b = createBall();
    b.pos = { x, y, z };
    b.vel = { x: vx, y: 0, z: 0 };
    let ev = null;
    for (let i = 0; i < 30; i++) ev = stepBall(b, pitch, 1 / 60) ?? ev;
    return b;
  };

  it('Maße: Netz steht über der Bande, hinter dem Tor, und lehnt zum Feld', () => {
    expect(catchNetX(hall, { x: 18.5, y: 0.5, z: 0 })).toBeNull(); // Bande
    expect(catchNetX(hall, { x: 18.5, y: 5, z: 0 })).toBeNull(); // über dem Netz
    expect(catchNetX(hall, { x: 18.5, y: 2, z: hall.goalHalfWidth + hall.catchNet.margin + 0.1 })).toBeNull(); // neben dem Netz
    const low = catchNetX(hall, { x: 18.5, y: 1, z: 0 });
    const high = catchNetX(hall, { x: 18.5, y: 4, z: 0 });
    expect(low).toBeLessThan(hall.wallX);
    expect(high).toBeLessThan(low);
    expect(catchNetX(PITCHES.parkplatz, { x: 0, y: 2, z: 0 })).toBeNull();
  });

  it('ein hoher Ball bleibt im Netz hängen und fällt, statt von der Wand zurückzufliegen', () => {
    const b = throwAt(hall, { x: 17, y: 2.5, z: 0.5, vx: 20 });
    expect(Math.abs(b.pos.x)).toBeLessThan(hall.wallX);
    expect(b.vel.x).toBeLessThan(2); // nur kaum zurück (vorher -10)
    expect(b.pos.y).toBeLessThan(2.5);
  });

  it('Bande unten, Seite neben dem Netz und andere Plätze prallen wie bisher ab', () => {
    expect(throwAt(hall, { x: 17, y: 0.4, z: 0.5, vx: 20 }).vel.x).toBeLessThan(-5); // Bande
    expect(throwAt(hall, { x: 17, y: 2.5, z: 6, vx: 20 }).vel.x).toBeLessThan(-5); // Wand neben dem Netz
    const park = PITCHES.parkplatz;
    expect(throwAt(park, { x: park.wallX - 3, y: 2.5, z: 0.5, vx: 20 }).vel.x).toBeLessThan(-5);
  });
});
