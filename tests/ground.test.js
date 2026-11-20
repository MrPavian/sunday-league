// Untergrund im Spiel (Gameplay 2.0, Punkt 24): Pfützen, Buckel, Absprung je Boden.
import { describe, expect, it } from 'vitest';
import { createBall, stepBall } from '../src/sim/ball.js';
import { gamePuddles, inPuddle, PUDDLE_COUNT, puddleLayout, TURF } from '../src/sim/ground.js';
import { PITCHES } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';
import { applyWeather } from '../src/career/weather.js';

const rain = (id) => applyWeather(PITCHES[id], { id: 'regen', month: 6, windDir: 1 });

// Ball rollt flach von (x, z) mit Tempo v in x-Richtung, bis er liegt oder t Sekunden um sind; Rückgabe: Weg.
function roll(pitch, x, z, v, t = 6) {
  const b = createBall();
  b.pos = { x, y: 0.11, z };
  b.vel = { x: v, y: 0, z: 0 };
  for (let i = 0; i < t * 60 && Math.hypot(b.vel.x, b.vel.z) > 0; i++) stepBall(b, pitch, 1 / 60);
  return b.pos.x - x;
}

// Ball fällt aus 2 m mit etwas Vorwärtstempo; Rückgabe: Geschwindigkeit direkt nach dem ersten Aufsetzen.
function drop(pitch, x, z, noBumps = false) {
  const b = createBall();
  b.pos = { x, y: 2, z };
  b.vel = { x: 6, y: 0, z: 0 };
  b.noBumps = noBumps;
  for (let i = 0; i < 120; i++) {
    stepBall(b, pitch, 1 / 60);
    if (b.vel.y > 0) return { ...b.vel };
  }
  return null;
}

describe('Untergrund: Pfützen', () => {
  it('nur bei Regen vor dem Spiel, nicht in der Halle, nicht bei trockenem Wetter', () => {
    expect(gamePuddles(PITCHES.parkplatz)).toEqual([]);
    expect(gamePuddles(rain('parkplatz')).length).toBe(PUDDLE_COUNT.parkplatz);
    expect(gamePuddles(rain('halle'))).toEqual([]);
    // Gewitter mitten im Spiel: nasser Boden, aber keine Pfützen (visual bleibt ohne 'rain').
    expect(gamePuddles({ ...PITCHES.rasenplatz, surface: { ...SURFACES.grass, wet: true } })).toEqual([]);
  });

  it('die Grafik zeichnet dieselben Pfützen (gleiche Anordnung wie die ersten der Grafikstufe)', () => {
    const p = rain('ascheplatz');
    const game = gamePuddles(p);
    expect(puddleLayout('ascheplatz', 'rain', p, game.length + 6).slice(0, game.length)).toEqual(game);
  });

  it('ein Ball, der durch eine Pfütze rollt, kommt deutlich weniger weit', () => {
    const p = rain('parkplatz');
    const q = gamePuddles(p)[0];
    expect(inPuddle([q], q.x, q.z)).toBe(true);
    const through = roll(p, q.x - 3, q.z, 9);
    const dry = roll({ ...p, visual: null }, q.x - 3, q.z, 9);
    expect(through).toBeLessThan(dry * 0.85);
  });
});

describe('Untergrund: Buckel und Absprung', () => {
  it('Asche: Absprung an jeder Stelle anders, an derselben Stelle gleich; Halle fast gerade', () => {
    const p = PITCHES.ascheplatz;
    const a = drop(p, 1.3, 2.7);
    expect(drop(p, 1.3, 2.7)).toEqual(a);
    const sideways = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => Math.abs(drop(p, i * 1.7, i * 0.9).z));
    expect(Math.max(...sideways)).toBeGreaterThan(0.3);
    const hall = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => Math.abs(drop(PITCHES.halle, i * 1.7, i * 0.9).z));
    expect(Math.max(...hall)).toBeLessThan(0.1);
  });

  it('die Vorhersage der Spieler kennt die Buckel nicht (ball.noBumps)', () => {
    const p = PITCHES.park;
    const real = [0, 1, 2, 3, 4, 5].map((i) => drop(p, i * 2.3, i * 1.1));
    const guess = [0, 1, 2, 3, 4, 5].map((i) => drop(p, i * 2.3, i * 1.1, true));
    expect(guess.every((g) => Math.abs(g.z) < 1e-9)).toBe(true);
    expect(real.some((r, i) => Math.abs(r.z - guess[i].z) > 0.2)).toBe(true);
  });

  it('nass rutscht er beim Aufsetzen weiter, tief bleibt er eher stecken', () => {
    const base = { ...PITCHES.rasenplatz, surface: SURFACES.grass };
    const x = (s) => drop({ ...base, surface: { ...SURFACES.grass, bumpiness: 0, ...s } }, 0, 0).x;
    expect(x({ wet: true })).toBeGreaterThan(x({}));
    expect(x({ deep: true })).toBeLessThan(x({}));
  });

  it('abgeschaltet (TURF.on = false): Aufsetzen wie vorher, ohne Pfützen', () => {
    TURF.on = false;
    try {
      const v = drop(PITCHES.ascheplatz, 1.3, 2.7);
      expect(Math.abs(v.z)).toBeLessThan(1e-9);
      expect(drop(PITCHES.ascheplatz, 5.1, -8.3)).toEqual(v); // überall gleich
      expect(gamePuddles(rain('parkplatz'))).toEqual([]);
    } finally {
      TURF.on = true;
    }
  });
});
