// Freistoßregeln je Platz (sim/setpieces.js FK_DISTANCE, wallRange, WALL_GAP) und Freistoß-Varianten der KI (sim/ai.js
// FREE_KICK, freeKickChoice; Schuss über die Mauer in actions.js). Gemessen mit scripts/freekick-check.mjs.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { FK_DISTANCE, WALL_GAP, setPieceDistance, startSetPiece, wallRange } from '../src/sim/setpieces.js';
import { FREE_KICK, freeKickChoice } from '../src/sim/ai.js';
import { attackDir } from '../src/sim/players.js';
import { dist2d } from '../src/core/math.js';

const freekick = (venue, fromGoal, z = 0, seed = 7) => {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false });
  const s = attackDir(m, 0);
  // Gegner rund um die Stelle, Angreifer mitten in der Mauer: beides muss die Regel auflösen.
  const spot = { x: s * (m.pitch.halfLength - fromGoal), z };
  m.players.filter((p) => p.role !== 'gk').forEach((p, i) => {
    p.pos.x = spot.x + s * (1 + (i % 5));
    p.pos.z = z + ((i % 3) - 1) * 1.5;
  });
  startSetPiece(m, { type: 'freekick', team: 0, spot });
  return { m, s, spot };
};

describe('Freistoßregeln je Platz', () => {
  it('Abstand: Großfeld 9,15 m, 9er 6 m, 7er 5 m, Halle 5 m, Hobbyplätze 3,5 m', () => {
    expect(setPieceDistance(PITCHES.grossfeld)).toBe(9.15);
    expect(setPieceDistance(PITCHES.sportplatz)).toBe(6);
    expect(setPieceDistance(PITCHES.rasenplatz)).toBe(5);
    expect(setPieceDistance(PITCHES.halle)).toBe(5);
    expect(setPieceDistance(PITCHES.parkplatz)).toBe(3.5);
    expect(FK_DISTANCE.grossfeld).toBe(9.15);
  });

  for (const venue of ['grossfeld', 'sportplatz', 'rasenplatz']) {
    it(`${venue}: kein Gegner näher als der Regelabstand, Mauer steht im Abstand`, () => {
      const { m, spot } = freekick(venue, Math.min(20, wallRange(PITCHES[venue]) - 3));
      const d = setPieceDistance(m.pitch);
      for (const p of m.players) if (p.team === 1) expect(dist2d(p.pos, spot)).toBeGreaterThanOrEqual(d - 0.05);
      expect(m.wallIds?.length).toBeGreaterThanOrEqual(3);
      for (const id of m.wallIds) expect(dist2d(m.players.find((p) => p.id === id).pos, spot)).toBeLessThan(d + 1.5);
    });
  }

  it('Mauerzone wächst mit dem Platz: auf dem Großfeld noch aus 28 m', () => {
    expect(wallRange(PITCHES.grossfeld)).toBeCloseTo(30);
    expect(freekick('grossfeld', 28).m.wallIds?.length).toBe(4);
    expect(freekick('rasenplatz', 28).m.wallIds).toBe(null);
  });

  it('1-m-Regel: kein Angreifer näher als 1 m an der Mauer', () => {
    const { m } = freekick('grossfeld', 22);
    const wall = m.players.filter((p) => m.wallIds.includes(p.id));
    for (const p of m.players) {
      if (p.team !== 0 || p.id === m.setPiece.takerId || p.role === 'gk') continue;
      for (const w of wall) expect(dist2d(p.pos, w.pos)).toBeGreaterThanOrEqual(WALL_GAP - 1e-6);
    }
  });
});

describe('Freistoß-Varianten', () => {
  it('zentral und nah meist direkt, seitlich meist nicht', () => {
    const count = (z) => {
      let shots = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const { m, s } = freekick('grossfeld', 20, z, seed);
        const taker = m.players.find((p) => p.id === m.setPiece.takerId);
        if (freeKickChoice(m, taker, { x: s * m.pitch.halfLength, z: 0 }).type === 'shoot') shots++;
      }
      return shots / 60;
    };
    expect(count(0)).toBeGreaterThan(0.45);
    expect(count(25)).toBeLessThan(0.35);
    expect(FREE_KICK.direct).toBeGreaterThan(FREE_KICK.wideShot);
  });

  it('Schuss über die Mauer geht über die Köpfe und unter die Latte', () => {
    let checked = 0;
    for (let seed = 1; seed <= 30 && checked < 5; seed++) {
      const { m, s, spot } = freekick('grossfeld', 20, 0, seed);
      const taker = m.players.find((p) => p.id === m.setPiece.takerId);
      taker.setPieceAction = null;
      taker.attrs.shooting = 1;
      taker.pending = { type: 'shoot', overWall: true, target: { x: s * m.pitch.halfLength, z: 2 }, power: 0.7, ttl: 0.5 };
      const wallD = setPieceDistance(m.pitch);
      let atWall = null;
      for (let i = 0; i < 300 && !atWall; i++) {
        stepMatch(m, undefined, 1 / 60);
        if (m.setPiece?.taken === false) continue;
        if (m.ball.lastTouch !== taker.id) break;
        if (dist2d(m.ball.pos, spot) >= wallD) atWall = m.ball.pos.y;
      }
      if (atWall == null) continue;
      checked++;
      expect(atWall).toBeGreaterThan(1.9);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
