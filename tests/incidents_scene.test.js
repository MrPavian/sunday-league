// Vorfälle als kleine Szenen: Gewitter (alle rennen raus), Polizei (gestikuliert), Herrchen, Taube.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { CLIMB, coachSpot, incidentOnBall } from '../src/sim/incidents.js';
import { climbLift, incidentPose, refereePose } from '../src/render/reactions.js';

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
    expect(g).toEqual(['arme', 'finger', 'schulter']); // der Trainer zuckt mit den Schultern
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

  it('Gewitter: der Schiri ist als Erster unterm Vordach, einer rutscht aus und steht wieder auf', () => {
    for (const seed of [3, 4, 5]) {
      const m = start('gewitter', 'rasenplatz', seed);
      const roof = -m.pitch.halfWidth - 1;
      const under = new Map();
      const states = new Set();
      const slipper = m.incident.slip.id;
      run(m, 8, () => {
        for (const p of m.players) if (!under.has(p.id) && p.pos.z < roof) under.set(p.id, m.incident.t);
        if (!under.has('ref') && m.referee.pos.z < roof) under.set('ref', m.incident.t);
        states.add(m.players.find((p) => p.id === slipper).state);
      });
      const first = Math.min(...[...under].filter(([id]) => id !== 'ref').map(([, t]) => t));
      expect(under.get('ref'), `Seed ${seed}`).toBeLessThanOrEqual(first);
      expect([...states]).toEqual(expect.arrayContaining(['normal', 'down', 'recover']));
      expect(under.has(slipper)).toBe(true); // und rennt danach weiter
    }
  });

  it('Gewitter: Darstellung – Rennende halten die Hände über den Kopf, der Gestürzte liegt (state down)', () => {
    const m = start('gewitter', 'rasenplatz');
    let cover = 0;
    let down = 0;
    run(m, 4, () =>
      m.players.forEach((p, i) => {
        const pose = incidentPose(m, p, i);
        if (pose.cover) cover++;
        if (p.state === 'down') down++;
      }),
    );
    expect(cover).toBeGreaterThan(100);
    expect(down).toBeGreaterThan(20);
  });

  it('Polizei: die Beamten gehen zum Trainer am Rand und reden mit ihm', () => {
    const m = start('polizei', 'parkplatz');
    const spot = coachSpot(m);
    const trainer = m.visitors.find((v) => v.id === 'trainer');
    expect(trainer.pos).toEqual(spot);
    run(m, 8);
    const cops = m.visitors.filter((v) => v.id.startsWith('polizei'));
    for (const c of cops) {
      expect(Math.hypot(c.pos.x - spot.x, c.pos.z - spot.z), c.id).toBeLessThan(3.5);
      const look = (spot.x - c.pos.x) * c.facing.x + (spot.z - c.pos.z) * c.facing.z;
      expect(look, `${c.id} schaut zum Trainer`).toBeGreaterThan(0);
    }
    expect(trainer.gesture).toBe('schulter');
  });

  it('Hund: Haken im Lauf, Spieler hechten nach dem Ball im Maul', () => {
    const m = start('hund', 'park');
    let lunges = 0;
    const was = new Set();
    let turns = 0;
    run(m, 12, () => {
      for (const p of m.players) {
        if (p.state === 'down' && !was.has(p.id)) lunges++;
        if (p.state === 'down') was.add(p.id);
        else was.delete(p.id);
      }
      if (m.dog?.hasBall && Math.abs(m.dog.turn) > 0.02) turns++;
    });
    expect(lunges).toBeGreaterThan(0);
    expect(turns).toBeGreaterThan(20);
  });

  it('Taube: sitzt auf der Latte, flattert beim Schuss auf und landet dann neben dem Ball', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false, duration: 200, incidents: true });
    m.incidentPlan = { type: 'taube', at: 2 };
    const seen = [];
    let shotWhilePerched = false;
    for (let i = 0; i < 60 * 120 && m.incident?.type !== 'taube'; i++) {
      stepMatch(m, undefined, DT);
      const st = m.pigeon?.state;
      if (st && seen.at(-1) !== st) seen.push(st);
      if (st === 'latte') {
        expect(m.pigeon.y).toBeCloseTo(m.pitch.goalHeight + 0.06, 5); // auf der Latte
        expect(Math.abs(m.pigeon.pos.x)).toBeCloseTo(m.pitch.halfLength, 5);
      }
      if (st === 'auf' && m.events.some((e) => e.type === 'shot')) shotWhilePerched = true;
      if (st === 'auf' && !shotWhilePerched) shotWhilePerched = m.shotTime === m.time || m.time - m.shotTime < 0.1;
    }
    expect(seen.slice(0, 4)).toEqual(['anflug', 'latte', 'auf', 'wartet']);
    expect(shotWhilePerched).toBe(true);
    expect(m.incident?.type).toBe('taube');
    expect(m.pigeon.state).toBe('gleiten');
  }, 60000);

  it('Zaun: einer klettert hoch, zwei stehen am Zaun, die Hände der anderen gehen an den Kopf', () => {
    let m = null;
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const t = createMatch({ seed, pitch: PITCHES.hinterhof, human: false, duration: 120, incidents: true });
      t.incidentPlan = { type: 'zaun', at: 2 };
      for (let i = 0; i < 60 * 100 && t.incident?.type !== 'zaun'; i++) stepMatch(t, undefined, DT);
      if (t.incident?.type === 'zaun') {
        m = t;
        break;
      }
    }
    expect(m, 'Zaun-Vorfall tritt auf').not.toBeNull();
    const { climber, helpers } = m.incident;
    let maxLift = 0;
    const gestures = new Set();
    run(m, 20, () =>
      m.players.forEach((p, i) => {
        const pose = incidentPose(m, p, i);
        if (p.id === climber.id) maxLift = Math.max(maxLift, pose.lift);
        if (pose.gesture) gestures.add(`${helpers.includes(p.id) ? 'helfer' : p.id === climber.id ? 'kletterer' : 'rest'}:${pose.gesture}`);
      }),
    );
    expect(maxLift).toBeCloseTo(CLIMB.height, 1);
    expect(gestures.has('kletterer:klettern')).toBe(true);
    expect(gestures.has('helfer:zaun')).toBe(true);
    expect(m.incident).toBeNull(); // er ist wieder unten, der Vorfall zu Ende
  }, 60000);

  it('climbLift: hoch, oben, runter', () => {
    expect(climbLift(-1)).toBe(0);
    expect(climbLift(CLIMB.up / 2)).toBeGreaterThan(0);
    expect(climbLift(CLIMB.up + 0.1)).toBe(CLIMB.height);
    expect(climbLift(CLIMB.up + CLIMB.top + CLIMB.down / 2)).toBeLessThan(CLIMB.height);
    expect(climbLift(CLIMB.up + CLIMB.top + CLIMB.down + 1)).toBe(0);
  });

  it('Sprenger: wer in den Strahl gerät, rennt zum Rand, die anderen schauen hin und zeigen oder schimpfen', () => {
    const m = start('sprenger', 'rasenplatz');
    const seen = new Set();
    run(m, 4, () =>
      m.players.forEach((p, i) => {
        const g = incidentPose(m, p, i);
        seen.add(g.cover ? 'cover' : g.gesture);
      }),
    );
    expect(m.incident?.fled.size).toBeGreaterThan(0);
    expect(m.incident.fled.size).toBeLessThan(m.players.length);
    expect(seen.has('cover')).toBe(true);
    expect(seen.has('zeigen') || seen.has('schimpfen')).toBe(true);
  });

  it('Autoalarm: alle zeigen zum Auto, der Schütze fasst sich an den Kopf', () => {
    let m = null;
    for (const seed of [15, 16, 17, 18, 19, 20]) {
      const t = createMatch({ seed, pitch: PITCHES.parkplatz, human: false, duration: 80, incidents: true });
      t.incidentPlan = { type: 'autoalarm', at: 2 };
      t.lastTouchTeam = 0;
      for (let i = 0; i < 60 * 70 && !t.incident; i++) {
        stepMatch(t, undefined, DT);
        if (t.time > 2 && !t.incident && t.phase === 'play') incidentOnBall(t, { type: 'car', x: t.ball.pos.x, z: t.pitch.halfWidth + 1 });
      }
      if (t.incident?.type === 'autoalarm') {
        m = t;
        break;
      }
    }
    expect(m).not.toBeNull();
    run(m, 2);
    const g = m.players.map((p, i) => incidentPose(m, p, i).gesture);
    expect(g.filter((x) => x === 'zeigen').length).toBeGreaterThan(m.players.length / 2);
    const shooter = m.players.findIndex((p) => p.id === m.ball.lastTouch);
    if (shooter >= 0) expect(g[shooter]).toBe('haende');
    const p = m.players[0];
    const toCar = (m.incident.info.x - p.pos.x) * p.facing.x + (m.incident.info.z - p.pos.z) * p.facing.z;
    expect(toCar).toBeGreaterThan(0);
  }, 60000);

  it('Ersatzschiri: der Schiri hält sich das Bein, zwei Spieler laufen zu ihm', () => {
    const m = start('ersatzschiri', 'rasenplatz');
    expect(refereePose(m)).toBe('wade');
    run(m, 4);
    const near = m.players.filter((p) => Math.hypot(p.pos.x - m.referee.pos.x, p.pos.z - m.referee.pos.z) < 2.5);
    expect(near.length).toBe(2);
    expect(near.every((p) => incidentPose(m, p, m.players.indexOf(p)).gesture === 'schulter')).toBe(true);
    for (let i = 0; i < 60 * 10 && m.incident; i++) stepMatch(m, undefined, DT);
    expect(refereePose(m)).toBeNull();
  });
});
