// Spielerpersönlichkeit auf dem Platz (Gameplay 2.0, Punkt 29): starker Fuß und „zieht nach innen“.
import { describe, expect, it } from 'vitest';
import { cutsInside, footOf, HABITS, habitsOf } from '../src/sim/habits.js';
import { kickFoot, WEAK_FOOT } from '../src/render/reactions.js';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { WIDE_LANE } from '../src/sim/ai.js';

describe('Gewohnheiten', () => {
  it('etwa jeder Fünfte ist Linksfuß (Carey u. a. 2001: 21 %), fest je Spieler', () => {
    let left = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const p = { name: `Spieler ${i} Probe` };
      if (footOf(p) === -1) left++;
      expect(footOf(p)).toBe(footOf({ name: p.name }));
    }
    expect(left / n).toBeGreaterThan(0.18);
    expect(left / n).toBeLessThan(0.24);
  });

  it('nach innen nur auf der Seite des schwachen Fußes, im letzten Drittel, außen', () => {
    const pitch = PITCHES.rasenplatz;
    const m = createMatch({ seed: 2, pitch, human: false, aiCoach: false });
    const p = m.players.find((q) => q.role !== 'gk');
    Object.assign(p, { position: 'fwd', attrs: { ...p.attrs, technique: 0.8 } });
    // Einen Namen suchen, der „zieht nach innen“ hat.
    let i = 0;
    while (!habitsOf({ ...p, name: `Innen ${i}` }).includes('nachinnen')) i++;
    p.name = `Innen ${i}`;
    expect(habitsOf(p)).toContain('nachinnen');
    const s = attackDir(m, p.team);
    const goalX = s * pitch.halfLength;
    const foot = footOf(p);
    const wrongWing = foot * pitch.halfWidth * 0.8 * s; // z·s hat das Vorzeichen des Fußes
    p.pos = { x: goalX - s * 8, z: wrongWing };
    expect(cutsInside(m, p, s, goalX, WIDE_LANE)).toBe(true);
    p.pos = { x: goalX - s * 8, z: -wrongWing }; // Seite des starken Fußes: bleibt außen
    expect(cutsInside(m, p, s, goalX, WIDE_LANE)).toBe(false);
    p.pos = { x: -goalX * 0.5, z: wrongWing }; // weit weg vom Tor
    expect(cutsInside(m, p, s, goalX, WIDE_LANE)).toBe(false);
    HABITS.on = false;
    try {
      p.pos = { x: goalX - s * 8, z: wrongWing };
      expect(cutsInside(m, p, s, goalX, WIDE_LANE)).toBe(false);
    } finally {
      HABITS.on = true;
    }
  });

  it('Schuss mit dem starken Fuß, den schwachen nur bei Ball deutlich auf der anderen Seite', () => {
    const p = { pos: { x: 0, z: 0 }, facing: { x: 1, z: 0 } };
    const at = (z) => ({ pos: { x: 0.3, z } }); // z < 0: Ball rechts
    expect(kickFoot(p, at(0), 1)).toBe(1);
    expect(kickFoot(p, at(0), -1)).toBe(-1);
    expect(kickFoot(p, at(WEAK_FOOT * 0.5), 1)).toBe(1); // leicht links: trotzdem rechts
    expect(kickFoot(p, at(WEAK_FOOT * 1.5), 1)).toBe(-1); // deutlich links: links
    expect(kickFoot(p, at(-WEAK_FOOT * 1.5), -1)).toBe(1);
  });

  it('im Spiel: Wer nach innen zieht, dribbelt auf der falschen Seite meist zur Mitte – ohne die Schicht nicht', () => {
    const share = (on) => {
      HABITS.on = on;
      let n = 0;
      let inward = 0;
      try {
        for (const seed of [3001, 3002, 3003, 3004, 3005, 3006]) {
          const pitch = PITCHES.rasenplatz;
          HABITS.on = true;
          const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
          const ins = m.players.filter((q) => habitsOf(q).includes('nachinnen'));
          HABITS.on = on;
          let k = 0;
          while (m.phase !== 'ended') {
            stepMatch(m, undefined, 1 / 60);
            m.events.length = 0;
            if (m.phase !== 'play' || k++ % 6) continue;
            for (const q of ins) {
              if (m.ball.lastTouch !== q.id || m.ball.lastAction !== 'dribble' || !q.dribbleDir) continue;
              const s = attackDir(m, q.team);
              const goalX = s * pitch.halfLength;
              if (Math.abs(q.pos.z) < pitch.halfWidth * WIDE_LANE || Math.abs(goalX - q.pos.x) > pitch.halfLength * HABITS.insideFrom) continue;
              if (Math.sign(q.pos.z * s) !== footOf(q)) continue;
              n++;
              if (q.dribbleDir.z * -Math.sign(q.pos.z) > 0.25) inward++;
            }
          }
        }
      } finally {
        HABITS.on = true;
      }
      return inward / Math.max(1, n);
    };
    const on = share(true);
    const off = share(false);
    expect(on).toBeGreaterThan(0.75); // gemessen 0,90 (60 Spiele)
    expect(on).toBeGreaterThan(off + 0.2); // ohne: 0,52
  }, 240000);
});
