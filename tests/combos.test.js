import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir, distToSegment } from '../src/sim/players.js';
import { shotOn } from '../src/sim/combos.js';
import { setOrder } from '../src/sim/plan.js';

const DT = 1 / 60;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Stürmer frei vor dem Tor, alle anderen weit weg – dann einen Gegner gezielt hinstellen.
function scene(fromX, blocker) {
  const m = createMatch({ seed: 7, pitch: PITCHES.ascheplatz, human: false, duration: 120, aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  const s = attackDir(m, 0);
  const p = m.players.find((x) => x.team === 0 && x.role === 'fwd');
  for (const q of m.players) if (q !== p && q.role !== 'gk') q.pos = { x: -s * 20, z: q.team ? 10 : -10 };
  p.pos = { x: s * fromX, z: 0 };
  p.facing = { x: s, z: 0 };
  if (blocker) m.players.find((x) => x.team === 1 && x.role !== 'gk').pos = { x: s * (fromX + 2), z: 0 };
  return { m, p, goal: { x: s * m.pitch.halfLength, z: 0 } };
}

describe('offence: finishing from a good position', () => {
  it('knows a clear sight of goal from a blocked or distant one', () => {
    const near = m => m.pitch.halfLength - 7;
    let { m, p, goal } = scene(PITCHES.ascheplatz.halfLength - 7);
    expect(shotOn(m, p, goal)).toBe(true);
    ({ m, p, goal } = scene(near(m), true));
    expect(shotOn(m, p, goal)).toBe(false); // Gegner in der Schussbahn
    ({ m, p, goal } = scene(-3));
    expect(shotOn(m, p, goal)).toBe(false); // eigene Hälfte
  });

  it('shoots from a promising position most of the time instead of dithering', () => {
    let chances = 0;
    let shots = 0;
    for (const id of ['parkplatz', 'hinterhof', 'ascheplatz', 'rasenplatz']) {
      for (const seed of [11, 12, 13]) {
        const m = createMatch({ seed, pitch: PITCHES[id], human: false, duration: 240, incidents: false });
        let spell = null;
        for (let i = 0; i < 60 * 600 && m.phase !== 'ended'; i++) {
          stepMatch(m, undefined, DT);
          const b = m.ball;
          const shot = m.events.some((e) => e.type === 'shot' && spell && e.playerId === spell.id);
          m.events.length = 0;
          if (spell) {
            if (shot) shots++;
            if (shot || b.lastTouch !== spell.id || m.phase !== 'play') spell = null;
            continue;
          }
          const p = m.players.find((x) => x.id === b.lastTouch);
          if (m.phase !== 'play' || !p || p.role === 'gk' || b.holder || d2(p.pos, b.pos) > 1.3 || Math.hypot(b.vel.x, b.vel.z) > 9 || b.lastAction === 'shoot') continue;
          const s = attackDir(m, p.team);
          const goal = { x: s * m.pitch.halfLength, z: 0 };
          const lane = !m.players.some((o) => o.team !== p.team && o.role !== 'gk' && o.state === 'normal' && distToSegment(o.pos, p.pos, goal) < 0.9);
          if (lane && p.pos.x * s > 0 && d2(p.pos, goal) < Math.min(12, m.pitch.halfLength * 0.55) && Math.abs(p.pos.z) < m.pitch.goalHalfWidth * 2 + 1) {
            chances++;
            spell = { id: p.id };
          }
        }
      }
    }
    expect(chances).toBeGreaterThan(40);
    expect(shots / chances).toBeGreaterThan(0.5);
  });
});

describe('offence: combinations', () => {
  it('plays one-twos, lay-offs with a run in behind and cut-backs – and they come off', () => {
    const made = {};
    const done = {};
    let forward = 0;
    let returns = 0;
    let matches = 0;
    for (const id of ['parkplatz', 'park', 'ascheplatz', 'rasenplatz', 'halle']) {
      for (const seed of [21, 22, 23, 24]) {
        const m = createMatch({ seed, pitch: PITCHES[id], human: false, duration: 240, incidents: false });
        matches++;
        let open = null;
        for (let i = 0; i < 60 * 600 && m.phase !== 'ended'; i++) {
          stepMatch(m, undefined, DT);
          for (const e of m.events) {
            if (e.type !== 'combo') continue;
            made[e.kind] = (made[e.kind] ?? 0) + 1;
            if (e.kind === 'onetwo' || e.kind === 'layoff') {
              // Der Rückpass geht nach vorn in den Lauf – nicht zurück.
              open = { kind: e.kind, id: e.playerId, wall: e.wallId, time: m.time, checked: false };
            }
          }
          // Der Rückpass selbst: geht er nach vorn in den Lauf?
          const back = open && !open.checked && m.events.find((e) => e.type === 'pass' && e.playerId === open.wall && e.combo);
          if (back) {
            open.checked = true;
            const wall = m.players.find((x) => x.id === open.wall);
            returns++;
            if (m.ball.vel.x * attackDir(m, wall.team) > 0) forward++;
          }
          m.events.length = 0;
          if (open && m.time - open.time > 0.05 && m.ball.lastTouch === open.id) {
            done[open.kind] = (done[open.kind] ?? 0) + 1;
            open = null;
          } else if (open && m.time - open.time > 2.5) open = null;
        }
      }
    }
    expect(made.onetwo / matches).toBeGreaterThan(0.6);
    expect(made.layoff / matches).toBeGreaterThan(0.6);
    expect(made.cutback).toBeGreaterThan(3);
    expect(returns).toBeGreaterThan(15);
    expect(forward).toBe(returns);
    // Die meisten Rückpässe kommen beim Läufer an.
    expect(done.onetwo / made.onetwo).toBeGreaterThan(0.6);
    expect(done.layoff / made.layoff).toBeGreaterThan(0.5);
  });

  it('a striker with his back to goal and a marker behind holds the ball up', () => {
    let held = 0;
    for (const seed of [31, 32, 33]) {
      const m = createMatch({ seed, pitch: PITCHES.hinterhof, human: false, duration: 240, incidents: false });
      for (let i = 0; i < 60 * 600 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
        const p = m.players.find((x) => x.id === m.ball.lastTouch);
        if (p && p.shielding && m.time - (p.holdUp ?? -9) < 0.05) held++;
      }
    }
    expect(held).toBeGreaterThan(30);
  });
});

describe('offence: the coach can ask for combination play', () => {
  it('„Kombinieren" brings clearly more one-twos and lay-offs', () => {
    const count = (orders) => {
      const r = { onetwo: 0, layoff: 0, layoff_pass: 0 };
      for (let i = 0; i < 36; i++) {
        const m = createMatch({ seed: 300 + i, pitch: PITCHES.parkplatz, human: false, duration: 150, aiCoach: false });
        for (const o of orders) setOrder(m, 0, ...o.split(':'));
        while (m.phase !== 'ended') {
          stepMatch(m, undefined, DT);
          for (const e of m.events) if (e.type === 'combo' && e.kind in r && m.players.find((x) => x.id === e.wallId)?.team === 0) r[e.kind]++;
          m.events.length = 0;
        }
      }
      return r;
    };
    const free = count([]);
    const asked = count(['route:kombi']);
    expect(asked.onetwo).toBeGreaterThan(free.onetwo * 1.6);
    expect(asked.layoff_pass).toBeGreaterThan(free.layoff_pass * 1.2);
    expect(asked.onetwo + asked.layoff).toBeGreaterThan((free.onetwo + free.layoff) * 1.4);
  }, 120000);
});
