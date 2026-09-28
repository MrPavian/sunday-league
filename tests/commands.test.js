import { describe, expect, it } from 'vitest';

const SLOW = 90_000; // Serien aus mehreren ganzen Spielen
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { planMods, setOrder } from '../src/sim/plan.js';

// Kleine Serien mit festen Seeds: Befehl für Team 0, sonst alles gleich.
function series(orders, { n = 8, pitch = PITCHES.parkplatz, duration = 150, seed = 300 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = createMatch({ seed: seed + i, pitch, human: false, duration });
    for (const o of orders) setOrder(m, 0, ...o.split(':'));
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    out.push(m);
  }
  return out;
}
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const ballSide = (ms) => mean(ms.flatMap((m) => m.log.samples.filter((s) => s.poss === 0).map((s) => s.ballSide[0])));

describe('coach orders change real behaviour', () => {
  it('attacking focus left/right moves our play to that side', () => {
    const left = ballSide(series(['side:left']));
    const right = ballSide(series(['side:right']));
    const none = ballSide(series([]));
    expect(left).toBeLessThan(none);
    expect(right).toBeGreaterThan(none);
    expect(right - left).toBeGreaterThan(0.12);
  }, SLOW);

  it('high pressing wins the ball higher up but costs stamina', () => {
    const high = series(['press:hoch']);
    const deep = series(['press:tief']);
    const wins = (ms) => mean(ms.map((m) => m.log.turnovers.filter((t) => t.to === 0 && t.third === 'att').length));
    const stamina = (ms) => mean(ms.map((m) => mean(m.players.filter((p) => p.team === 0 && p.role !== 'gk').map((p) => p.stamina))));
    expect(wins(high)).toBeGreaterThan(wins(deep));
    expect(stamina(high)).toBeLessThan(stamina(deep) - 0.05);
  }, SLOW);

  it('balls in behind only happen when the coach asks for them', () => {
    const through = (ms) => ms.reduce((s, m) => s + m.log.passes.filter((p) => p.team === 0 && p.through).length, 0);
    expect(through(series([]))).toBe(0);
    expect(through(series(['route:tiefe'], { pitch: PITCHES.ascheplatz, duration: 200 }))).toBeGreaterThan(2);
  }, SLOW);

  it('a weak side carries out orders less fully than a good one', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.parkplatz, human: false });
    for (const p of m.players) if (p.team === 0) p.attrs = { ...p.attrs, technique: 0.9, passing: 0.9 };
    for (const p of m.players) if (p.team === 1) p.attrs = { ...p.attrs, technique: 0.15, passing: 0.15 };
    setOrder(m, 0, 'side', 'left');
    setOrder(m, 1, 'side', 'left');
    const good = planMods(m, 0);
    const weak = planMods(m, 1);
    expect(good.focus).toBeLessThan(weak.focus); // beide negativ, der Gute stärker
    expect(good.exec).toBeGreaterThan(weak.exec);
  });

  it('decisions are recorded, nonsense is refused', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.parkplatz, human: false });
    expect(setOrder(m, 0, 'press', 'hoch')).toBe(true);
    expect(setOrder(m, 0, 'press', 'hoch')).toBe(false); // schon so
    expect(setOrder(m, 0, 'press', 'irgendwas')).toBe(false);
    expect(setOrder(m, 0, 'quatsch', 'x')).toBe(false);
    setOrder(m, 0, 'press', null);
    expect(m.decisions.map((d) => `${d.group}:${d.before}>${d.value}`)).toEqual(['press:null>hoch', 'press:hoch>null']);
  });
});

describe('fairness', () => {
  it('no hidden comeback help: the score changes nothing about how the match plays', () => {
    const run = (fakeScore) => {
      const m = createMatch({ seed: 44, pitch: PITCHES.parkplatz, human: false, duration: 120 });
      const trail = [];
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        // Mitten im Spiel steht es plötzlich 0:3 – nur auf der Anzeige.
        if (fakeScore && Math.abs(m.time - 30) < 1 / 120) m.score = [m.score[0], m.score[1] + 3];
        if (m.time > 30) trail.push(Math.round(m.ball.pos.x * 1000));
        m.events.length = 0;
      }
      return trail;
    };
    expect(run(true)).toEqual(run(false));
  }, SLOW);

  it('same seed and same orders replay exactly – different seeds do not', () => {
    const scores = (seed) => series(['press:hoch'], { n: 1, seed })[0].stats.teams.map((t) => t.shots).join(':');
    expect(scores(5)).toBe(scores(5));
    const many = new Set(series([], { n: 8, seed: 60 }).map((m) => m.score.join(':')));
    expect(many.size).toBeGreaterThan(2);
  }, SLOW);
});
