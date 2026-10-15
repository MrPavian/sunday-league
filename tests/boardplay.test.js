import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, BOARD_BOUNCE, boardRoute, createBall, stepBall } from '../src/sim/ball.js';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { HALL, PITCHES } from '../src/sim/pitch.js';

// Halle: Die KI spielt die Bande an (Bandenpass, Abpraller), wenn der direkte Weg zugestellt ist, und schießt etwas schärfer
// und genauer flach. Gemessen mit scripts/board-audit.mjs, 60 Spiele (Seeds 900+): Tore je Spiel 1,45 -> 2,05, Bandenpässe 5,0 je
// Spiel (68 % kommen bei einem Mitspieler an), Bandenschüsse 2,0 je Spiel, höchster Ball 1,5 m.

// Ball mit der Simulationsphysik von `from` aus gegen `aim` schießen; kleinster Abstand zum Ziel `to` nach dem Abprall.
function flyVia(from, aim, to) {
  const ball = createBall();
  ball.pos = { x: from.x, y: BALL_RADIUS, z: from.z };
  const d = Math.hypot(aim.x - from.x, aim.z - from.z);
  ball.vel = { x: ((aim.x - from.x) / d) * 12, y: 0, z: ((aim.z - from.z) / d) * 12 };
  let bounced = false;
  let best = Infinity;
  for (let i = 0; i < 600; i++) {
    const vz = ball.vel.z;
    stepBall(ball, HALL, 1 / 120);
    if (Math.sign(vz) !== Math.sign(ball.vel.z) && vz !== 0) bounced = true;
    if (bounced) best = Math.min(best, Math.hypot(ball.pos.x - to.x, ball.pos.z - to.z));
  }
  return { bounced, best };
}

describe('Bandenpass: Geometrie mit der echten Rückprallzahl', () => {
  it('Die Rückprallzahl der Bande kommt aus ball.js (0,5)', () => {
    expect(BOARD_BOUNCE).toBe(0.5);
  });

  it('Das gespiegelte Ziel trifft den Mitspieler über beide Banden', () => {
    const cases = [
      [{ x: -6, z: 7 }, { x: 4, z: 2 }, 1],
      [{ x: 3, z: -8 }, { x: -5, z: -3 }, -1],
      [{ x: 0, z: 5 }, { x: 8, z: 7.5 }, 1],
      [{ x: -10, z: -2 }, { x: -2, z: -6 }, -1],
    ];
    for (const [from, to, side] of cases) {
      const r = boardRoute(HALL, from, to, side);
      expect(r).not.toBeNull();
      expect(Math.abs(r.bounce.z)).toBeCloseTo(HALL.halfWidth - BALL_RADIUS, 6);
      const f = flyVia(from, r.aim, to);
      expect(f.bounced).toBe(true);
      expect(f.best).toBeLessThan(0.25);
    }
  });

  it('Die Rückprallzahl zählt: Der einfache Spiegelpunkt (Faktor 1) verfehlt deutlich', () => {
    const from = { x: -6, z: 7 };
    const to = { x: 4, z: 2 };
    const zw = HALL.halfWidth - BALL_RADIUS;
    const plain = { x: to.x, z: 2 * zw - to.z };
    expect(flyVia(from, plain, to).best).toBeGreaterThan(1);
  });

  it('Kein Weg über die falsche Bande oder von hinter der Bande', () => {
    expect(boardRoute(HALL, { x: 0, z: 12 }, { x: 4, z: 2 }, 1)).toBeNull();
    expect(boardRoute(HALL, { x: 0, z: 2 }, { x: 4, z: 12 }, 1)).toBeNull();
  });
});

function run(pitch, seeds, onEvent) {
  for (const seed of seeds) {
    const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) onEvent(e, m);
      m.events.length = 0;
    }
  }
}

describe('Halle: Bandenspiel und Flachschüsse im Spiel', () => {
  it('Die KI spielt über die Bande, die Pässe kommen meist an, der Ball bleibt flach', () => {
    let passes = 0;
    let shots = 0;
    let maxY = 0;
    let ok = 0;
    let n = 0;
    for (let seed = 900; seed < 906; seed++) {
      let pend = null;
      run(HALL, [seed], (e, m) => {
        maxY = Math.max(maxY, m.ball.pos.y);
        if (e.type === 'bandenpass' && e.kind === 'pass') {
          passes++;
          pend = { team: m.players.find((p) => p.id === e.playerId).team, kicker: e.playerId };
        } else if (e.type === 'bandenpass') shots++;
        else if (pend && m.ball.lastTouch && m.ball.lastTouch !== pend.kicker) {
          n++;
          if (m.players.find((p) => p.id === m.ball.lastTouch)?.team === pend.team) ok++;
          pend = null;
        }
      });
    }
    expect(passes).toBeGreaterThan(12); // gemessen rund 5 je Spiel
    expect(shots).toBeGreaterThan(4); // gemessen rund 2 je Spiel
    expect(maxY).toBeLessThan(HALL.catchNet.height);
    expect(n).toBeGreaterThan(0);
  });

  it('Flachschüsse sind schärfer als ohne Aufschlag (shotBoost)', () => {
    const speed = (pitch) => {
      let sum = 0;
      let k = 0;
      run(pitch, [900, 901, 902, 903], (e, m) => {
        if (e.type === 'shot') {
          sum += Math.hypot(m.ball.vel.x, m.ball.vel.z);
          k++;
        }
      });
      return sum / k;
    };
    expect(HALL.flatPlay.shotBoost).toBeGreaterThan(1);
    expect(HALL.flatPlay.aimBoost).toBeLessThan(1);
    const plain = speed({ ...HALL, flatPlay: { ...HALL.flatPlay, shotBoost: 1, aimBoost: 1 } });
    expect(speed(HALL) / plain).toBeGreaterThan(1.1); // gemessen rund 1,2
  });

  it('Andere Plätze: kein Bandenspiel, keine Bandenereignisse', () => {
    for (const id of ['parkplatz', 'rasenplatz']) {
      expect(PITCHES[id].boardPlay).toBeUndefined();
      let n = 0;
      run(PITCHES[id], [900], (e) => {
        if (e.type === 'bandenpass') n++;
      });
      expect(n).toBe(0);
    }
  });
});
