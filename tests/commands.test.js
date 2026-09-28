import { describe, expect, it } from 'vitest';

const SLOW = 90_000; // Serien aus mehreren ganzen Spielen
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { planMods, setOrder } from '../src/sim/plan.js';

// Kleine Serien mit festen Seeds: Befehl für Team 0, sonst alles gleich.
function series(orders, { n = 8, pitch = PITCHES.parkplatz, duration = 150, seed = 300 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = createMatch({ seed: seed + i, pitch, human: false, duration, aiCoach: false }); // reine Engine, kein Gegen-Trainer
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

  it('high pressing squeezes the whole block up to the ball – and costs stamina', async () => {
    const { updateTactics, anchor } = await import('../src/sim/ai.js');
    // Eingefrorene Lage: Der Gegner baut in seiner Hälfte auf. Wohin schickt die KI unsere Leute?
    const freeze = (orders) => {
      const m = createMatch({ seed: 12, pitch: PITCHES.ascheplatz, human: false, aiCoach: false });
      for (const o of orders) setOrder(m, 0, ...o.split(':'));
      const carrier = m.players.find((p) => p.team === 1 && p.role === 'def');
      m.ball.pos = { x: m.pitch.halfLength * 0.55, y: 0, z: 2 };
      carrier.pos = { x: m.ball.pos.x + 0.5, z: 2 };
      m.ball.lastTouch = carrier.id;
      m.ball.lastAction = 'dribble';
      m.lastTouchTeam = 1;
      // Unsere Leute stehen dort, wo sie gegen den Ball hingehören.
      for (const p of m.players) if (p.team === 0 && p.role !== 'gk') p.pos = { ...anchor(m, p, false) };
      updateTactics(m, 1 / 60);
      const chaser = m.chasers[0];
      if (chaser) m.tactics[chaser] = { ...m.ball.pos };
      const ours = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
      const toBall = ours.map((p) => m.tactics[p.id] ?? p.pos).map((t) => Math.hypot(t.x - m.ball.pos.x, t.z - m.ball.pos.z)).sort((a, b) => a - b);
      const height = ours.reduce((sum, p) => sum + anchor(m, p, false).x, 0) / ours.length;
      return { block: mean(toBall), height };
    };
    const high = freeze(['press:hoch']);
    const deep = freeze(['press:tief']);
    expect(high.block).toBeLessThan(deep.block - 1); // der ganze Block ist näher am Ball
    expect(high.height).toBeGreaterThan(deep.height + 2);
    // Und es kostet Kraft.
    const stamina = (ms) => mean(ms.map((m) => mean(m.players.filter((p) => p.team === 0 && p.role !== 'gk').map((p) => p.stamina))));
    expect(stamina(series(['press:hoch'], { n: 4 }))).toBeLessThan(stamina(series(['press:tief'], { n: 4 })) - 0.05);
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
      const m = createMatch({ seed: 44, pitch: PITCHES.parkplatz, human: false, duration: 120, aiCoach: false });
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

describe('the coach on the other bench', async () => {
  const { aiCoaches } = await import('../src/sim/aicoach.js');
  const { enableManager } = await import('../src/sim/coach.js');

  it('AI clubs change their plan a few times per match – with the same orders you have', () => {
    let changes = 0;
    for (let i = 0; i < 6; i++) {
      const m = createMatch({ seed: 80 + i, pitch: PITCHES.ascheplatz, human: false });
      m.coachPersona = ['stratege', 'stratege'];
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        m.events.length = 0;
      }
      const ai = (m.decisions ?? []).filter((d) => d.by === 'ai');
      for (const team of [0, 1]) expect(ai.filter((d) => d.team === team && d.group !== 'side' && d.group !== 'cover').length).toBeLessThanOrEqual(4);
      changes += ai.length;
    }
    expect(changes).toBeGreaterThan(3);
  }, SLOW);

  it('never touches the team you coach or play for', () => {
    const m = enableManager(createMatch({ seed: 5, pitch: PITCHES.parkplatz, human: true }));
    expect(aiCoaches(m, 0)).toBe(false);
    expect(aiCoaches(m, 1)).toBe(true);
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    expect((m.decisions ?? []).filter((d) => d.team === 0 && d.by === 'ai')).toEqual([]);
  }, SLOW);
});
