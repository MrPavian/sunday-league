import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { GET_UP } from '../src/sim/tackles.js';

const DT = 1 / 60;
const run = (m, s) => {
  for (let i = 0; i < s * 60; i++) stepMatch(m, undefined, DT);
};

describe('Aufstehen nach Grätsche und Sturz', () => {
  it('in der Pause vor dem Standard bleibt keiner in der Grätsche liegen', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false });
    run(m, 2);
    const p = m.players.find((x) => x.role === 'mid');
    m.phase = 'setpiece';
    m.phaseTimer = 3;
    p.state = 'tackle';
    p.stateTimer = 0.45;
    run(m, 0.5);
    expect(p.state).toBe('recover');
    expect(p.recoverFrom).toBe('tackle');
    run(m, GET_UP.tackle + 0.1);
    expect(p.state).toBe('normal');
    expect(m.phase).toBe('setpiece'); // alles noch vor dem Anpfiff
  });

  it('wer am Boden lag, steht über „recover" auf', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.park, human: false });
    run(m, 2);
    const p = m.players.find((x) => x.role === 'def');
    m.phase = 'setpiece';
    m.phaseTimer = 3;
    p.state = 'down';
    p.stateTimer = 0.2;
    run(m, 0.3);
    expect(p.state).toBe('recover');
    expect(p.recoverFrom).toBe('down');
    run(m, GET_UP.down + 0.1);
    expect(p.state).toBe('normal');
  });
});
