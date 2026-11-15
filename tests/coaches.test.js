// Trainer an der Seitenlinie: Orte und Gesten (render/coaches.js) und der Zusammenstoß in der Simulation (sim/coachclash.js).
import { describe, expect, it } from 'vitest';
import { COACH, coachCue, coachIdle, coachLook, coachSpots, coachTarget } from '../src/render/coaches.js';
import { CLASH, coachFoul } from '../src/sim/coachclash.js';
import { PITCHES } from '../src/sim/pitch.js';

describe('Trainer an der Seitenlinie (Darstellung)', () => {
  it('nur auf den kleinen Plätzen, außerhalb des Feldes, jede Mannschaft auf ihrer Seite', () => {
    expect(coachSpots({ pitch: PITCHES.grossfeld })).toBe(null);
    const s = coachSpots({ pitch: PITCHES.rasenplatz });
    expect(s[0].x).toBeLessThan(0);
    expect(s[1].x).toBeGreaterThan(0);
    for (const p of s) expect(Math.abs(p.z)).toBeGreaterThan(PITCHES.rasenplatz.halfWidth);
  });
  it('Aussehen fest je Spiel und Mannschaft', () => {
    expect(coachLook({ seed: 3 }, 0)).toEqual(coachLook({ seed: 3 }, 0));
    expect(coachLook({ seed: 3, coachLooks: [{ skin: 1 }] }, 0).skin).toBe(1);
  });
  it('Gesten: Jubel beim eigenen Tor, Ärger beim Gegentor, ab Hitze 2 wilder; Zusammenstoß hat Vorrang', () => {
    const teamOf = (id) => (id < 10 ? 0 : 1);
    expect(coachCue(0, { type: 'goal', team: 0 }, teamOf).gesture).toBe('faust');
    expect(coachCue(0, { type: 'goal', team: 1 }, teamOf).gesture).toBe('kopfschuetteln');
    expect(coachCue(0, { type: 'goal', team: 1 }, teamOf, 2).gesture).toBe('abwinken');
    expect(coachCue(0, { type: 'foul', playerId: 12, victimId: 3 }, teamOf, 3).gesture).toBe('schimpfen');
    expect(coachCue(1, { type: 'coachclash' }, teamOf).prio).toBeGreaterThan(coachCue(1, { type: 'goal', team: 1 }, teamOf).prio);
    const idle = new Set();
    for (let t = 0; t < 20; t += 0.5) idle.add(coachIdle(t, 0));
    expect(idle.has('call')).toBe(true);
    expect(idle.has(null)).toBe(true);
  });
  it('Zusammenstoß: beide gehen in die Mitte, Nase an Nase', () => {
    const [a, b] = coachSpots({ pitch: PITCHES.rasenplatz });
    const ta = coachTarget(a, 0, true);
    const tb = coachTarget(b, 1, true);
    expect(Math.abs(ta.x - tb.x)).toBeCloseTo(COACH.gap);
    expect(coachTarget(a, 0, false).x).toBe(a.x);
  });
});

describe('Zusammenstoß der Trainer (Simulation)', () => {
  const run = (heat, fouls) => {
    const m = { coachHeat: heat, events: [] };
    for (let i = 0; i < fouls; i++) coachFoul(m);
    return m;
  };
  it('ohne hitziges Duell nie', () => {
    expect(run(CLASH.from - 1, 30).events).toHaveLength(0);
    expect(run(undefined, 30).events).toHaveLength(0);
  });
  it('heißer = früher; höchstens dreimal; beim zweiten Mal Gelb, beim dritten Gelb-Rot für beide', () => {
    const hot = run(5, CLASH.fouls(5));
    expect(hot.events.filter((e) => e.type === 'coachclash')).toHaveLength(1);
    expect(run(3, CLASH.fouls(5)).events).toHaveLength(0);
    const m = run(5, 40);
    expect(m.events.filter((e) => e.type === 'coachclash')).toHaveLength(CLASH.max);
    const cards = m.events.filter((e) => e.type === 'coachcard');
    expect(cards.map((e) => e.color)).toEqual(['yellow', 'yellow', 'red', 'red']);
    expect(m.clash.banned).toEqual([true, true]);
  });
});

describe('Spielertrainer', async () => {
  const { coachOnTouchline } = await import('../src/render/coaches.js');
  it('an der Linie nur, wenn er nicht auf dem Platz steht', () => {
    const m = { playerCoach: { team: 0, idx: 5 }, players: [{ team: 0, poolIndex: 5 }], sentOff: [] };
    expect(coachOnTouchline(m, 0)).toBe(false);
    expect(coachOnTouchline(m, 1)).toBe(true);
    m.players = [];
    expect(coachOnTouchline(m, 0)).toBe(true); // Bank oder ausgewechselt
    m.sentOff = [{ team: 0, poolIndex: 5 }];
    expect(coachOnTouchline(m, 0)).toBe(false);
    expect(coachOnTouchline({}, 0)).toBe(true);
  });
});
