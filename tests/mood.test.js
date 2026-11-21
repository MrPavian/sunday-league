// Momente mit Stimmung (Gameplay 2.0, Punkt 33): Schlussphase lauter, Stille und Nahaufnahme beim Elfmeter, Raunen bei knapp vorbei.
import { describe, expect, it } from 'vitest';
import { CameraRig } from '../src/render/CameraRig.js';
import { crowdMood, lateDrama, MOOD, nearMiss, penaltyTaker } from '../src/render/mood.js';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { penaltySpot, startSetPiece } from '../src/sim/setpieces.js';

const DT = 1 / 60;
const kickoff = (seed, pitch = PITCHES.rasenplatz) => {
  const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  return m;
};

describe('Stimmung', () => {
  it('Elfmeter: still, Kamera nah am Schützen mit Blick aufs Tor – bis geschossen ist', () => {
    const m = kickoff(3);
    expect(penaltyTaker(m)).toBeNull();
    startSetPiece(m, { type: 'penalty', team: 0, spot: penaltySpot(m, 0) });
    const taker = penaltyTaker(m);
    expect(taker?.id).toBe(m.setPiece.takerId);
    const mood = crowdMood(m);
    expect(mood.hush).toBeLessThan(0.3);
    expect(mood.focus.zoom).toBeLessThan(1);
    // Bildmitte zwischen Ball und Tor.
    const goalX = Math.sign(m.ball.pos.x) * m.pitch.halfLength;
    expect(Math.abs(goalX - mood.focus.x)).toBeLessThan(Math.abs(goalX - m.ball.pos.x));
    let n = 0;
    while (!m.setPiece?.taken && m.phase === 'setpiece' && n++ < 600) stepMatch(m, undefined, DT);
    expect(crowdMood(m).focus).toBeNull();
    expect(crowdMood(m).hush).toBe(1);
  });

  it('Schlussphase: nur in den letzten Minuten eines knappen Spiels, steigt bis zum Abpfiff', () => {
    const m = kickoff(4);
    m.score = [1, 1];
    m.time = m.duration * 0.5;
    expect(lateDrama(m)).toBe(0);
    m.time = m.duration * 0.9;
    const mid = lateDrama(m);
    expect(mid).toBeGreaterThan(0);
    m.time = m.duration * 0.99;
    expect(lateDrama(m)).toBeGreaterThan(mid);
    expect(crowdMood(m).tension).toBeCloseTo(MOOD.lateTension * lateDrama(m), 6);
    m.score = [4, 1];
    expect(lateDrama(m)).toBe(0);
  });

  it('Raunen nur bei knapp vorbei (auch auf Plätzen mit Wänden), und die Stimmung ändert das Spiel nicht', () => {
    for (const venue of ['rasenplatz', 'parkplatz']) {
      let misses = 0;
      for (const seed of [21, 22, 23]) {
        const pitch = PITCHES[venue];
        const a = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
        const b = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
        const memo = {};
        let shotAt = null;
        while (a.phase !== 'ended') {
          const before = { ...a.ball.pos };
          stepMatch(a, undefined, DT);
          stepMatch(b, undefined, DT);
          crowdMood(a);
          for (const e of a.events) if (e.type === 'shot' || (e.type === 'header' && e.onGoal)) shotAt = a.time;
          if (nearMiss(a, memo)) {
            misses++;
            // kurz nach einem Schuss, Ball gerade über die Torlinie, kein Tor
            expect(a.time - shotAt).toBeLessThanOrEqual(MOOD.missWindow);
            expect(Math.abs(before.x)).toBeLessThan(a.pitch.halfLength);
            expect(a.events.some((e) => e.type === 'goal')).toBe(false);
          }
          a.events.length = 0;
          b.events.length = 0;
        }
        expect(a.score).toEqual(b.score);
        expect(a.time).toBe(b.time);
      }
      expect(misses).toBeGreaterThan(0);
    }
  }, 240000);

  it('Kamera: zoomt weich heran und wieder zurück, auch nach Größenänderung', () => {
    const r = new CameraRig({ viewHeight: 16 });
    r.resize(640, 360);
    const base = r.camera.right;
    r.setZoom(0.72, 2.5);
    for (let i = 0; i < 30; i++) r.follow(0, 0, DT, { x: 60, z: 4 });
    expect(r.camera.right).toBeLessThan(base);
    expect(r.camera.right).toBeGreaterThan(base * 0.72);
    for (let i = 0; i < 300; i++) r.follow(0, 0, DT, { x: 60, z: 4 });
    expect(r.camera.right).toBeCloseTo(base * 0.72, 3);
    r.resize(640, 360);
    r.follow(0, 0, DT, { x: 60, z: 4 });
    expect(r.camera.right).toBeCloseTo(base * 0.72, 3);
    r.setZoom(1);
    for (let i = 0; i < 300; i++) r.follow(0, 0, DT, { x: 60, z: 4 });
    expect(r.camera.right).toBeCloseTo(base, 3);
  });
});
