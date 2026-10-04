// Ecken: Vorher gab es 0,35–1,05 je Spiel (40 Spiele je Platz, Stand 41c30bd), weil der Torwart
// fast nie ins Aus lenkte und gelenkte Bälle oft vor der Linie liegen blieben. Bezug: 3,1–3,5 Ecken je Tor
// (Bundesliga 10,9 und Premier League 9,4 Ecken bei je rund 27 Schüssen; soccerstats.com).
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

function corners(venue, n) {
  let c = 0;
  for (let i = 0; i < n; i++) {
    const m = createMatch({ seed: 900 + i, pitch: PITCHES[venue], human: false, duration: matchDuration(PITCHES[venue]), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) if (e.type === 'setpiece' && e.kind === 'corner') c++;
      m.events.length = 0;
    }
  }
  return c / n;
}

describe('Ecken', () => {
  it('7er-Feld: mehr Ecken je Spiel als vorher', () => {
    expect(corners('rasenplatz', 16)).toBeGreaterThan(1.2); // gemessen 1,5 (16 Spiele), vorher 0,88
  }, 240000);
  it('9er-Feld: mehr Ecken je Spiel als vorher', () => {
    expect(corners('sportplatz', 16)).toBeGreaterThan(0.9); // gemessen 1,06, vorher 0,69
  }, 240000);
});
