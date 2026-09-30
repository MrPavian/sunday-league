import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';

// Hausregel: Aufs Tor geschossen wird erst hinter der Mittellinie. Ein Tor aus der eigenen
// Hälfte (oder direkt von der Mittellinie) zählt nicht – Abstoß für den Gegner.
function shotFrom(fromX) {
  const m = createMatch({ seed: 5, pitch: PITCHES.hinterhof, human: false, duration: 120, aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, 1 / 60);
  const p = m.players.find((x) => x.team === 0 && x.role === 'fwd');
  const s = attackDir(m, 0);
  for (const q of m.players) if (q.team === 1) q.pos = { x: -s * 30, z: 8 };
  p.pos = { x: s * fromX, z: 0 };
  m.ball.pos = { x: s * fromX + s * 0.5, y: 0, z: 0 };
  m.ball.vel = { x: 0, y: 0, z: 0 };
  m.ball.lastTouch = p.id;
  m.ball.lastAction = 'dribble';
  m.lastTouchTeam = 0;
  stepMatch(m, undefined, 1 / 60);
  m.ball.vel = { x: s * 25, y: 0.3, z: 0 };
  const seen = [];
  for (let i = 0; i < 240 && !seen.length; i++) {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) if (e.type === 'goal' || e.type === 'no_goal') seen.push(e.type);
    m.events.length = 0;
  }
  return { event: seen[0], score: [...m.score], restart: m.setPiece?.type, team: m.setPiece?.team };
}

describe('goals only from the opponent half', () => {
  it('a goal from inside the own half does not count – goal kick for the opponent', () => {
    expect(shotFrom(-2)).toEqual({ event: 'no_goal', score: [0, 0], restart: 'goalkick', team: 1 });
    expect(shotFrom(-0.3).event).toBe('no_goal'); // knapp vor der Mittellinie auch nicht
  });
  it('a goal from the opponent half counts', () => {
    const r = shotFrom(3);
    expect(r.event).toBe('goal');
    expect(r.score).toEqual([1, 0]);
  });
  it('the AI does not shoot from its own half', () => {
    let own = 0;
    let shots = 0;
    for (const id of Object.keys(PITCHES)) {
      const m = createMatch({ seed: 21, pitch: PITCHES[id], human: false, duration: 120, aiCoach: false });
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        for (const e of m.events) {
          if (e.type !== 'shot' || m.phase === 'shootout') continue;
          const p = m.players.find((x) => x.id === e.playerId);
          shots++;
          if (p.pos.x * attackDir(m, p.team) <= 0) own++;
        }
        m.events.length = 0;
      }
    }
    expect(shots).toBeGreaterThan(50);
    expect(own).toBe(0);
  }, 60_000);
});
