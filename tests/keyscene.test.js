// Schlüsselszenen-Modus (Gameplay 2.0, Punkt 32): Zeitraffer zwischen den spannenden Momenten. Die Erkennung liest nur mit.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { KEY_SCENE, keySceneApplies, keySceneHot } from '../src/sim/keyscene.js';

const DT = 1 / 60;

function play(venue, seed, watch) {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: matchDuration(PITCHES[venue]), aiCoach: false });
  const memo = {};
  const r = { steps: 0, hot: 0, shots: 0, shotsHot: 0, goals: 0, goalsHot: 0, corners: 0, cornersHot: 0, events: 0 };
  let prev = true;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, DT);
    r.events += m.events.length;
    for (const e of m.events) {
      if (e.type === 'shot') (r.shots++, prev && r.shotsHot++);
      if (e.type === 'goal') (r.goals++, prev && r.goalsHot++);
    }
    if (watch) {
      prev = keySceneHot(m, memo, m.events);
      r.steps++;
      if (prev) r.hot++;
      if (m.phase === 'setpiece' && m.setPiece?.type === 'corner') (r.corners++, prev && r.cornersHot++);
    }
    m.events.length = 0;
  }
  r.score = [...m.score];
  return r;
}

describe('Schlüsselszenen', () => {
  it('liest nur mit: gleiches Spiel mit und ohne Erkennung', () => {
    const a = play('rasenplatz', 41, true);
    const b = play('rasenplatz', 41, false);
    expect(a.score).toEqual(b.score);
    expect(a.events).toBe(b.events);
  });

  it('Großfeld: ein guter Teil läuft im Zeitraffer, Schüsse, Tore und Ecken fast immer in normalem Tempo', () => {
    const t = { steps: 0, hot: 0, shots: 0, shotsHot: 0, goals: 0, goalsHot: 0, corners: 0, cornersHot: 0 };
    for (const seed of [701, 702, 703]) {
      const r = play('grossfeld', seed, true);
      for (const k of Object.keys(t)) t[k] += r[k];
    }
    const hot = t.hot / t.steps;
    expect(hot).toBeGreaterThan(0.4); // gemessen 60 % (8 Spiele)
    expect(hot).toBeLessThan(0.8);
    expect(t.shotsHot / t.shots).toBeGreaterThan(0.93); // gemessen 99 %
    expect(t.goalsHot).toBe(t.goals);
    expect(t.cornersHot).toBe(t.corners);
  }, 240000);

  it('nach einer Szene bleibt es eine Weile normal, Zeitraffer erst nach etwas Ruhe', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.grossfeld, human: false, aiCoach: false });
    while (m.phase !== 'play') stepMatch(m, undefined, DT);
    // Ball ruhig im eigenen Drittel beim Torwart der Heimelf … dann ein Foul.
    const memo = {};
    keySceneHot(m, memo, [{ type: 'foul' }]);
    expect(memo.until).toBeCloseTo(m.time + KEY_SCENE.hold, 5);
    expect(keySceneHot(m, memo, [])).toBe(true);
  });

  it('gilt nur an der Seitenlinie oder beim Zuschauen, nicht wenn man selbst spielt', () => {
    expect(keySceneApplies({ manager: true, humanTeam: 0 })).toBe(true);
    expect(keySceneApplies({ manager: false, humanTeam: null })).toBe(true);
    expect(keySceneApplies({ manager: false, humanTeam: 0 })).toBe(false);
  });
});
