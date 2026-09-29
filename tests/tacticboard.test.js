import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { planMods, planTarget, setOrder } from '../src/sim/plan.js';

// UI 2.0 Phase E: Die Taktiktafel liest nur. planTarget zeigt Stil + Befehle, fasst den Zeit-Cache
// der Simulation (planMods) nicht an – sonst hinge der Spielverlauf davon ab, wann jemand das
// Taktik-Blatt öffnet.
describe('Taktiktafel', () => {
  it('planTarget spiegelt die Befehle und lässt den Cache der Simulation in Ruhe', () => {
    const m = createMatch({ seed: 5, pitch: PITCHES.ascheplatz, human: false });
    planMods(m, 0);
    const cache = m.modsCache[0];
    expect(planTarget(m, 0).press).toBe(false);
    setOrder(m, 0, 'press', 'hoch');
    const cacheAfterOrder = m.modsCache[0];
    const t = planTarget(m, 0);
    expect(t.press).toBe(true);
    expect(t.pressZone).toBe('high');
    expect(t.line).toBeGreaterThan(0);
    expect(m.modsCache[0]).toBe(cacheAfterOrder); // unverändert durch die Tafel
    expect(cache).not.toBeUndefined();
  });

  it('gleicher Seed, gleiches Spiel – auch wenn die Tafel zwischendurch liest', () => {
    const run = (peek) => {
      const m = createMatch({ seed: 12, pitch: PITCHES.ascheplatz, human: false, duration: 40 });
      setOrder(m, 0, 'route', 'aussen');
      let n = 0;
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        if (peek && n++ % 37 === 0) planTarget(m, 0);
        m.events.length = 0;
      }
      return `${m.score.join(':')}|${m.stats.teams[0].shots}|${m.ball.pos.x.toFixed(4)}`;
    };
    expect(run(true)).toBe(run(false));
  }, 60_000);
});
