import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { ORDER_EFFECTS, planMods, setOrder } from '../src/sim/plan.js';

// Gleiche Befehle in anderer Klickreihenfolge → gleiche Wirkung (feste Reihenfolge der Gruppen).
const mods = (list) => {
  const m = createMatch({ seed: 1, pitch: PITCHES.rasenplatz, human: false });
  for (const o of list) setOrder(m, 0, ...o.split(':'));
  return planMods(m, 0);
};
const all = Object.entries(ORDER_EFFECTS).flatMap(([g, v]) => Object.keys(v).map((k) => `${g}:${k}`));

describe('Trainerbefehle kombinieren', () => {
  it('die Klickreihenfolge ändert nichts – für jedes Paar aus zwei Gruppen', () => {
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        if (all[i].split(':')[0] === all[j].split(':')[0]) continue;
        expect(mods([all[i], all[j]]), `${all[i]} + ${all[j]}`).toEqual(mods([all[j], all[i]]));
      }
  });

  it('der speziellere Befehl gewinnt: Tempo, Risiko und Form stehen über Aufbau und Angriffsweg', () => {
    expect(mods(['tempo:ruhig', 'route:konter']).tempo).toBeLessThan(1);
    expect(mods(['risk:aggressiv', 'build:halten']).risk).toBeGreaterThan(0);
    expect(mods(['shape:stuermer_fallen', 'route:konter']).fwdHold).toBe(0);
  });
});

describe('Befehle springen an', () => {
  it('„Tempo raus" spart Kraft und spielt weniger ab, „Tempo rein" umgekehrt', () => {
    const base = mods([]);
    const ruhig = mods(['tempo:ruhig']);
    const schnell = mods(['tempo:schnell']);
    expect(ruhig.tire).toBeLessThan(base.tire);
    expect(ruhig.passRate).toBeLessThan(base.passRate);
    expect(schnell.tire).toBeGreaterThan(base.tire);
    expect(schnell.passRate).toBeGreaterThan(base.passRate);
  });

  it('„Stürmer lässt sich fallen" holt die Spitze deutlich näher an den Ball', async () => {
    const { stepMatch } = await import('../src/sim/match.js');
    const { attackDir } = await import('../src/sim/players.js');
    // Gemessen (4 Spiele je Platz): 7er-Feld 11,2 → 4,3 m, 5er 4,3 → 2,1 m vor dem Ball.
    const ahead = (order) => {
      let rel = 0;
      let n = 0;
      for (const seed of [701, 702]) {
        const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false });
        if (order) setOrder(m, 0, 'shape', order);
        for (let i = 0; i < 60 * 240; i++) {
          stepMatch(m, undefined, 1 / 60);
          m.events.length = 0;
          if (i % 60 || m.phase !== 'play' || m.log?.cur?.team !== 0) continue;
          const s = attackDir(m, 0);
          for (const f of m.players.filter((p) => p.team === 0 && p.role === 'fwd')) {
            rel += (f.pos.x - m.ball.pos.x) * s;
            n++;
          }
        }
      }
      return rel / n;
    };
    expect(ahead('stuermer_fallen')).toBeLessThan(ahead(null) * 0.7);
  }, 120000);
});
