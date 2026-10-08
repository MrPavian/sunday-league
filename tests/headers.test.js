// Kopfballtore auf allen Feldern. Vorher (80 Spiele): 7er 0 %, 9er 3 %, Großfeld 1 % der Tore; real 15,4 % (Bundesliga 2025/26,
// sportschau.de). Ursache: Bei Ecken stand kein Angreifer im Strafraum, und Kopfbälle aufs Tor flogen mit dem Tempo der Flanke.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

function heads(venue, n) {
  const r = { goals: 0, hdrGoals: 0, onGoal: 0, cornerHdr: 0 };
  for (let i = 0; i < n; i++) {
    const m = createMatch({ seed: 900 + i, pitch: PITCHES[venue], human: false, duration: matchDuration(PITCHES[venue]), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'goal') {
          r.goals++;
          if (e.via === 'header') r.hdrGoals++;
        } else if (e.type === 'header' && e.onGoal) r.onGoal++;
      }
      m.events.length = 0;
    }
  }
  return { ...r, perGame: r.hdrGoals / n, onGoalPerGame: r.onGoal / n, share: r.hdrGoals / Math.max(1, r.goals) };
}

describe('Kopfballtore', () => {
  it('7er-Feld: Kopfbälle aufs Tor und Kopfballtore', () => {
    const r = heads('rasenplatz', 40);
    expect(r.onGoalPerGame).toBeGreaterThan(0.4); // gemessen 0,78 (80 Spiele), vorher 0,13
    expect(r.hdrGoals).toBeGreaterThan(0); // gemessen 0,15 je Spiel (4 %), vorher 0
  }, 400000);
  it('9er-Feld: Kopfballtore mindestens 3 % der Tore', () => {
    const r = heads('sportplatz', 24);
    expect(r.onGoalPerGame).toBeGreaterThan(0.5); // gemessen 0,95, vorher 0,38
    expect(r.share).toBeGreaterThan(0.03); // gemessen 5 %, vorher 3 %
  }, 400000);
  it('Großfeld: Kopfballtore mindestens 3 % der Tore', () => {
    const r = heads('grossfeld', 16);
    expect(r.onGoalPerGame).toBeGreaterThan(0.4); // gemessen 0,78, vorher 0,07
    expect(r.share).toBeGreaterThan(0.03); // gemessen 5 %, vorher 1 %
  }, 600000);
});
