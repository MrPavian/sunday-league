import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { planIncident, VENUE_INCIDENTS } from '../src/sim/incidents.js';

const DT = 1 / 60;

function play(m, maxSeconds = 400) {
  let frozen = 0;
  for (let i = 0; i < maxSeconds * 60 && m.phase !== 'ended'; i++) {
    const t = m.time;
    stepMatch(m, undefined, DT);
    if (m.phase === 'incident' && m.time === t) frozen++;
  }
  return frozen;
}

describe('match incidents', () => {
  it('every incident can happen on its venues, stops the clock and the match goes on', () => {
    for (const [venue, types] of Object.entries(VENUE_INCIDENTS)) {
      for (const type of types) {
        let happened = false;
        for (let seed = 1; seed <= 6 && !happened; seed++) {
          const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: 80, incidents: true });
          m.incidentPlan = { type, at: 2 };
          const frozen = play(m);
          expect(m.phase, `${venue}/${type}`).toBe('ended');
          if (m.incidents.length) {
            happened = true;
            expect(m.incidents[0].type).toBe(type);
            expect(m.incidents[0].report).toContain('{min}');
            expect(frozen).toBeGreaterThan(60); // mindestens eine Sekunde Pause
            expect(m.incident).toBeNull();
          }
        }
        expect(happened, `${venue}/${type}`).toBe(true);
      }
    }
  }, 30000);

  it('a thunderstorm leaves the pitch wet; a hurt referee is replaced by a spectator', () => {
    const storm = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false, duration: 60, incidents: true });
    storm.incidentPlan = { type: 'gewitter', at: 2 };
    const grip = storm.pitch.surface.rollFriction;
    play(storm);
    expect(storm.weather).toBe('rain');
    expect(storm.pitch.surface.wet).toBe(true);
    expect(storm.pitch.surface.rollFriction).toBeLessThan(grip);

    const ref = createMatch({ seed: 4, pitch: PITCHES.rasenplatz, human: false, duration: 60, incidents: true });
    ref.incidentPlan = { type: 'ersatzschiri', at: 2 };
    const before = ref.referee.name;
    play(ref);
    expect(ref.referee.trait).toBe('zuschauer');
    expect(ref.referee.name).not.toBe(before);
  });

  it('incidents are rare, deterministic and off unless asked for', () => {
    expect(createMatch({ seed: 1, human: false }).incidentPlan).toBeNull();
    let planned = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const m = createMatch({ seed, pitch: PITCHES.park, human: false, kickoff: false, incidents: true });
      if (m.incidentPlan) planned++;
      expect(planIncident(m, seed)).toEqual(m.incidentPlan);
    }
    expect(planned).toBeGreaterThan(50);
    expect(planned).toBeLessThan(110);
  });
});
