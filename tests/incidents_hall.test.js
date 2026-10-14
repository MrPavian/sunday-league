// Halle: kein Polizei-/Taubenbesuch, dafür der betrunkene Fan über der Bande; der verletzte Schiri geht durch die Bandentür.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { FAN_CLIMB, INCIDENT_TYPES, VENUE_INCIDENTS } from '../src/sim/incidents.js';
import { GEO, shelterFor, walkObstacles } from '../src/sim/shelter.js';
import { fanLift, incidentPose, visitorLift } from '../src/render/reactions.js';

const DT = 1 / 60;
const hall = PITCHES.halle;
const hw = hall.halfWidth;
const door = GEO.hall;

function start(type, seed) {
  const m = createMatch({ seed, pitch: hall, human: false, duration: 80, incidents: true });
  m.incidentPlan = { type, at: 2 };
  for (let i = 0; i < 60 * 60 && m.incident?.type !== type; i++) stepMatch(m, undefined, DT);
  expect(m.incident?.type).toBe(type);
  return m;
}

describe('Halle: Vorfälle', () => {
  it('keine Polizei und keine Taube; dafür der Fan; die Halle hat Hindernisse und eine Tür', () => {
    expect(VENUE_INCIDENTS.halle).not.toContain('polizei');
    expect(VENUE_INCIDENTS.halle).not.toContain('taube');
    expect(VENUE_INCIDENTS.halle).toContain('fan');
    expect(INCIDENT_TYPES).toContain('fan');
    const sh = shelterFor(hall);
    expect(sh.obstacles.length).toBeGreaterThan(8);
    expect(sh.door).toBeTruthy();
    // Die Bande ist zu: auf der Linie quer durch die Bande hinten ist ein Hindernis, durch die Tür vorn nicht.
    const obs = walkObstacles(hall);
    const hit = (x, z) => obs.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
    expect(hit(3, -hw - 0.1)).toBe(true);
    expect(hit(3, hw + 0.1)).toBe(true);
    expect(hit(door.doorX, hw + 0.1)).toBe(false);
    expect(hit(hall.wallX, 0)).toBe(true);
  });

  it('Fan: über die Bande, zum Torwart oder zum Ball, gepackt, durch die Tür hinaus – die Uhr steht, danach geht es weiter', () => {
    const modes = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const m = start('fan', seed);
      const f = m.incident.fan;
      modes.add(f.mode);
      const t0 = m.time;
      const stages = new Set();
      let prev = null;
      let maxLift = 0;
      let reachedKeeper = false;
      let tookBall = false;
      for (let i = 0; i < 60 * 70 && m.incident; i++) {
        stepMatch(m, undefined, DT);
        expect(m.time).toBe(t0); // Uhr steht
        stages.add(f.stage);
        const fan = m.visitors.find((v) => v.id === 'fan');
        if (!fan) continue;
        maxLift = Math.max(maxLift, visitorLift(fan));
        if (f.keeperId && f.stage === 'kuss') reachedKeeper = true;
        if (f.stage === 'beute') tookBall = true;
        // Er quert die Bande nur im Sprung (stage klettern) – sonst nie.
        if (prev && f.stage !== 'klettern' && prev.stage !== 'klettern') {
          const cross = (z) => (prev.z - z) * (fan.pos.z - z) < 0 && Math.abs(fan.pos.x) < hall.wallX;
          expect(cross(-hw - 0.1), `seed ${seed}: durch die Bande hinten`).toBe(false);
          if (Math.abs(fan.pos.x - door.doorX) > door.doorW / 2 - 0.05) expect(cross(hw + 0.1), `seed ${seed}: durch die Bande vorn`).toBe(false);
        }
        prev = { z: fan.pos.z, stage: f.stage };
      }
      expect(m.incident, `seed ${seed}: Fan fertig`).toBeNull();
      expect(f.done).toBe(true);
      expect(stages.has('klettern') && stages.has('gefasst') && stages.has('raus'), `seed ${seed}`).toBe(true);
      expect(maxLift).toBeCloseTo(FAN_CLIMB.height, 1);
      if (f.mode === 'kiss') expect(reachedKeeper || stages.has('gefasst')).toBe(true);
      else expect(tookBall || stages.has('gefasst')).toBe(true);
      expect(m.visitors.filter((v) => v.manual).length).toBe(0);
      expect(m.incidents.at(-1).type).toBe('fan');
      expect(m.incidents.at(-1).report).toContain('{min}');
      // Der Ball liegt im Feld, nicht hinter der Bande.
      expect(Math.abs(m.ball.pos.z)).toBeLessThan(hw + 0.5);
    }
    expect([...modes].sort()).toEqual(['ball', 'kiss']);
  }, 600000);

  it('Fan ist deterministisch (gleicher Seed, gleicher Ablauf)', () => {
    const trace = () => {
      const m = start('fan', 5);
      const out = [m.incident.fan.mode];
      for (let i = 0; i < 60 * 70 && m.incident; i++) {
        stepMatch(m, undefined, DT);
        if (i % 30 === 0) out.push(m.visitors.map((v) => `${v.id}:${v.pos.x.toFixed(3)},${v.pos.z.toFixed(3)}`).join('|'));
      }
      return out;
    };
    expect(trace()).toEqual(trace());
  }, 120000);

  it('Ersatzschiri: der Schiri humpelt durch die Bandentür zur Bank, der Zuschauer kommt durch dieselbe Tür herein', () => {
    for (const seed of [3, 4, 5]) {
      const m = start('ersatzschiri', seed);
      const ref0 = m.referee.name;
      let outside = false;
      let standInSeen = false;
      for (let i = 0; i < 60 * 60 && m.incident; i++) {
        stepMatch(m, undefined, DT);
        const r = m.referee.pos;
        // Im Streifen der Bande (z ≈ hw + 0,1) darf er nur in der Tür stehen.
        if (Math.abs(r.z - (hw + 0.1)) < 0.1) expect(Math.abs(r.x - door.doorX), `seed ${seed}: Schiri in der Bande`).toBeLessThan(door.doorW / 2);
        if (r.z > hw + 0.5) outside = true;
        const si = m.visitors.find((v) => v.id === 'ersatz');
        if (si) {
          standInSeen = true;
          if (Math.abs(si.pos.z - (hw + 0.1)) < 0.1) expect(Math.abs(si.pos.x - door.doorX)).toBeLessThan(door.doorW / 2);
        }
      }
      expect(m.incident).toBeNull();
      expect(outside).toBe(true);
      expect(standInSeen).toBe(true);
      expect(m.referee.name).not.toBe(ref0);
      expect(m.referee.trait).toBe('zuschauer');
      expect(m.referee.pos.z).toBeLessThan(hw); // der neue Schiri steht im Feld, nicht hinter der Bande
      expect(m.visitors.some((v) => v.id === 'ersatz')).toBe(false);
    }
  }, 300000);

  it('Darstellung: Sprunghöhe des Fans und Haltung des Torwarts', () => {
    const { up, top, down, height } = FAN_CLIMB;
    expect(fanLift(0)).toBe(0);
    expect(fanLift(up + top / 2)).toBe(height);
    expect(fanLift(up + top + down + 1)).toBe(0);
    expect(fanLift(up / 2)).toBeGreaterThan(0);
    expect(fanLift(up / 2)).toBeLessThan(height);
    expect(visitorLift({ climbCt: 0.3 })).toBe(fanLift(0.3));
    expect(visitorLift({})).toBe(0);
    const m = start('fan', 1);
    const f = m.incident.fan;
    const gk = m.players.find((p) => p.role === 'gk');
    for (let i = 0; i < 60 * 70 && m.incident && !['jagd', 'kuss'].includes(f.stage); i++) stepMatch(m, undefined, DT);
    if (f.keeperId) {
      const k = m.players.find((p) => p.id === f.keeperId);
      expect(incidentPose(m, k, m.players.indexOf(k)).gesture).toBe('unschuld');
    } else expect(gk).toBeTruthy();
  }, 120000);
});
