// Angriffs-KI: Spiel über außen. Vorher liefen 80–85 % der Angriffe durch die Mitte (scripts/wing-audit.mjs,
// Stand 96fa064); Bezug Bundesliga: rund 33 % durch die mittlere Hälfte der Breite (Bundesliga Match Facts).
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

function audit(venue, n) {
  const a = { L: 0, M: 0, R: 0, cross: 0, goals: 0, wideShots: 0, shots: 0, hdrGoal: 0, hdrOnGoal: 0, kinds: { flach: 0, halbhoch: 0, hoch: 0 } };
  for (let i = 0; i < n; i++) {
    const m = createMatch({ seed: 900 + i, pitch: PITCHES[venue], human: false, duration: matchDuration(PITCHES[venue]), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'pass' && e.cross) {
          a.cross++;
          a.kinds[e.crossKind ?? 'hoch']++;
        }
        else if (e.type === 'goal') {
          a.goals++;
          if (e.via === 'header' && !e.ownGoal) a.hdrGoal++;
        } else if (e.type === 'header' && e.onGoal) a.hdrOnGoal++;
      }
      m.events.length = 0;
    }
    for (const p of m.log.poss) if (p.entryLane) a[p.entryLane === 'left' ? 'L' : p.entryLane === 'right' ? 'R' : 'M']++;
  }
  const entries = a.L + a.M + a.R;
  return { centre: a.M / entries, left: a.L / entries, right: a.R / entries, crosses: a.cross / n, goals: a.goals / n, hdrGoals: a.hdrGoal, hdrOnGoal: a.hdrOnGoal / n, kinds: a.kinds };
}

describe('Spiel über außen', () => {
  it('7er-Feld: deutlich weniger durch die Mitte, mehr Flanken, Tore bleiben im üblichen Rahmen', () => {
    const r = audit('rasenplatz', 16);
    expect(r.centre).toBeLessThan(0.75); // gemessen 0,68 (48 Spiele), vorher 0,82
    expect(r.left).toBeGreaterThan(0.1);
    expect(r.right).toBeGreaterThan(0.1);
    expect(r.crosses).toBeGreaterThan(1.6); // gemessen 2,9, vorher 1,3
    expect(r.goals).toBeGreaterThan(2.2); // gemessen 2,7, vorher 2,9
  }, 240000);

  // Flankenverwertung: Der Abnehmer läuft dorthin, wo die Flanke in Kopfhöhe ankommt, und der Kopfball behält ihr
  // Tempo. Vorher (bdc0489) 0 Kopfballtore in 80 Spielen auf dem 9er-Feld, 0,25 Kopfbälle aufs Tor je Spiel.
  it('9er-Feld: Kopfbälle aufs Tor nach Flanken, und Kopfballtore fallen', () => {
    const r = audit('sportplatz', 24);
    expect(r.hdrOnGoal).toBeGreaterThan(0.32); // gemessen 0,45 (80 Spiele), vorher 0,25
    expect(r.hdrGoals).toBeGreaterThan(0); // gemessen 5 % der Tore, rund 3 in 24 Spielen
    expect(r.goals).toBeGreaterThan(2.2);
  }, 240000);

  // Flankenarten nach Feldgröße: Auf dem 7er-Feld kommen Flanken eher flach oder halbhoch, auf dem Großfeld hoch.
  // Gemessen (80 Spiele): 7er flach 0,69 / halbhoch 1,39 / hoch 0,45 je Spiel; Großfeld 0,05 / 0,15 / 0,95.
  it('Flankenart passt zum Feld: 7er flach/halbhoch, Großfeld hoch', () => {
    const k7 = audit('rasenplatz', 16).kinds;
    expect(k7.flach + k7.halbhoch).toBeGreaterThan(2 * k7.hoch);
    expect(k7.flach).toBeGreaterThan(0);
    const k11 = audit('grossfeld', 16).kinds;
    expect(k11.hoch).toBeGreaterThan(2 * (k11.flach + k11.halbhoch));
  }, 300000);
});
