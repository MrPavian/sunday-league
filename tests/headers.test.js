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
    // 100 statt 40 Spiele: Kopfballtore sind selten (160 Spiele: 0,09 je Spiel mit und 0,07 ohne Körper-Änderung, also 15 bzw. 11 Tore);
    // bei 40 Spielen erwartet man nur etwa 3 und ein Lauf mit 0 ist reiner Zufall (~6 %). Stichprobe 2,5-fach, Schwelle mitgewachsen: vorher > 0 Tore in 40 Spielen (mehr als 1/40 je Spiel), jetzt > 2 in 100.
    const r = heads('rasenplatz', 100);
    expect(r.onGoalPerGame).toBeGreaterThan(0.4); // gemessen 0,78 (160 Spiele), vorher 0,13
    expect(r.hdrGoals).toBeGreaterThan(2); // gemessen 0,07-0,09 je Spiel, vorher 0
  }, 1500000);
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
