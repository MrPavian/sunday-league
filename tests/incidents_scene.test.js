// Vorfälle als kleine Szenen: Gewitter (alle rennen raus), Polizei (gestikuliert), Herrchen, Taube.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const DT = 1 / 60;
const start = (type, venue, seed = 3) => {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: 80, incidents: true });
  m.incidentPlan = { type, at: 2 };
  for (let i = 0; i < 60 * 60 && m.incident?.type !== type; i++) stepMatch(m, undefined, DT);
  expect(m.incident?.type).toBe(type);
  return m;
};
const run = (m, s, each = () => {}) => {
  for (let i = 0; i < s * 60 && m.incident; i++) {
    stepMatch(m, undefined, DT);
    each(m);
  }
};

describe('Vorfälle als Szene', () => {
  it('Gewitter: alle sprinten vom Platz – nach 5 s steht keiner mehr drauf, der Schiri auch nicht', () => {
    const m = start('gewitter', 'rasenplatz');
    run(m, 5);
    const hw = m.pitch.halfWidth;
    for (const p of m.players) expect(p.pos.z, p.id).toBeLessThan(-hw);
    expect(m.referee.pos.z).toBeLessThan(-hw);
  });

  it('Polizei: angekommen droht einer mit dem Finger, der andere verschränkt die Arme; alle schauen hin', () => {
    const m = start('polizei', 'hinterhof');
    run(m, 6);
    const g = m.visitors.map((v) => v.gesture).sort();
    expect(g).toEqual(['arme', 'finger']);
    const cop = m.visitors.find((v) => v.gesture === 'finger');
    const p = m.players[3];
    const look = (cop.pos.x - p.pos.x) * p.facing.x + (cop.pos.z - p.pos.z) * p.facing.z;
    expect(look).toBeGreaterThan(0);
  });

  it('Hund: Herrchen rennt hinterher und geht danach mit ihm vom Platz', () => {
    const m = start('hund', 'park');
    const owner = () => m.visitors.find((v) => v.id === 'herrchen');
    expect(owner()?.gesture).toBe('call');
    let closest = Infinity;
    run(m, 20, () => m.dog && owner() && (closest = Math.min(closest, Math.hypot(owner().pos.x - m.dog.pos.x, owner().pos.z - m.dog.pos.z))));
    expect(closest).toBeLessThan(3);
    for (let i = 0; i < 60 * 15 && (m.dog || owner()); i++) stepMatch(m, undefined, DT);
    expect(m.dog).toBeNull();
    expect(owner()).toBeUndefined();
  });

  it('Taube: gleitet ein, landet, wird verscheucht und fliegt am Ende davon', () => {
    const m = start('taube', 'park');
    expect(m.pigeon.y).toBeGreaterThan(4);
    const seen = new Set();
    run(m, 10, () => m.pigeon && seen.add(m.pigeon.state));
    expect([...seen]).toEqual(expect.arrayContaining(['gleiten', 'picken']));
    expect(m.incidents[0].type).toBe('taube');
    expect(m.pigeon?.state).toBe('weg');
    for (let i = 0; i < 60 * 6 && m.pigeon; i++) stepMatch(m, undefined, DT);
    expect(m.pigeon).toBeNull();
    expect(m.phase).not.toBe('incident');
  });
});
