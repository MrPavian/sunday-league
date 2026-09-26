import { describe, expect, it } from 'vitest';
import { PITCHES } from '../src/sim/pitch.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { activeShouts, enableManager, shout } from '../src/sim/coach.js';
import { attackDir } from '../src/sim/players.js';

const DT = 1 / 60;

// Ein Spiel im Trainer-Modus; call(m) darf alle paar Sekunden reinrufen.
function play(seed, call, seconds = 90) {
  const m = enableManager(createMatch({ seed, pitch: PITCHES.rasenplatz, human: true, duration: seconds }));
  let depth = 0;
  let samples = 0;
  for (let i = 0; i < seconds * 60 * 1.2 && m.phase !== 'ended'; i++) {
    const input = i % 90 === 0 && call ? { shout: call } : undefined;
    stepMatch(m, input, DT);
    m.events.length = 0;
    if (m.phase === 'play' && i % 30 === 0) {
      const s = attackDir(m, 0);
      for (const p of m.players) if (p.team === 0 && p.role !== 'gk') (depth += p.pos.x * s), samples++;
    }
  }
  return { m, depth: depth / samples };
}

describe('manager mode', () => {
  it('nobody is steered; the team plays on its own and the match ends', () => {
    const { m } = play(3, null);
    expect(m.phase).toBe('ended');
    expect(m.controlledId).toBe(null);
    expect(m.stats.teams[0].shots + m.stats.teams[1].shots).toBeGreaterThan(0);
  });

  it('shouts need a breather and expire', () => {
    const m = enableManager(createMatch({ seed: 1, pitch: PITCHES.rasenplatz, human: true, duration: 60 }));
    m.time = 10;
    expect(shout(m, 'press')).toBe(true);
    expect(shout(m, 'back')).toBe(false); // zu schnell hintereinander
    expect(activeShouts(m)).toContain('press');
    m.time = 30;
    expect(activeShouts(m)).not.toContain('press');
    expect(shout(m, 'nonsense')).toBe(false);
  });

  it('"Hau drauf!" means more shots, "Hinten dicht!" means a deeper team', () => {
    let calm = 0;
    let shooty = 0;
    let deep = 0;
    let base = 0;
    for (const seed of [11, 12, 13, 14]) {
      const a = play(seed, null);
      calm += a.m.stats.teams[0].shots;
      base += a.depth;
      shooty += play(seed, 'shoot').m.stats.teams[0].shots;
      deep += play(seed, 'back').depth;
    }
    expect(shooty).toBeGreaterThan(calm);
    expect(deep).toBeLessThan(base - 4);
  });
});

describe('live ticker with decisions', async () => {
  const { answer, checkDecision, createTouchline } = await import('../src/sim/touchline.js');

  function run(seed, pick) {
    const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 120 });
    const tl = createTouchline(m, 1); // die Gäste coachen
    const asked = [];
    for (let i = 0; i < 120 * 60 * 1.5 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      const d = checkDecision(tl, m.events);
      m.events.length = 0;
      if (d) {
        asked.push(d.id);
        answer(tl, pick(d));
      }
    }
    return { m, asked };
  }

  it('asks at kick-off and half-time and applies the answer', () => {
    const { m, asked } = run(21, (d) => (d.id === 'start' ? 1 : 0));
    expect(asked[0]).toBe('start');
    expect(asked).toContain('halftime');
    expect(m.mentality).toBe('offensive');
    expect(m.phase).toBe('ended');
  });

  it('a substitution choice brings on the bench player', () => {
    let subbed = false;
    for (const seed of [31, 32, 33, 34, 35]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 120 });
      const tl = createTouchline(m, 0);
      for (const p of m.players) if (p.team === 0 && p.role !== 'gk') p.stamina = 0.3;
      m.time = m.duration * 0.62; // 56. Minute
      m.half = 2;
      tl.asked.add('start');
      tl.asked.add('halftime');
      const d = checkDecision(tl, []);
      if (d?.id !== 'sub') continue;
      const incoming = m.bench[0][0];
      answer(tl, 1);
      expect(m.players).toContain(incoming);
      subbed = true;
      break;
    }
    expect(subbed).toBe(true);
  });
});
