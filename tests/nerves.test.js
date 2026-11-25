// Fehler, die menschlich wirken (Gameplay 2.0, Punkt 31): Ball über den Fuß, verunsicherter Stürmer, wackelnder Torwart.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { HUMAN, isShaken, trackNerves } from '../src/sim/nerves.js';

const DT = 1 / 60;
const live = (seed = 3, venue = 'rasenplatz') => {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, aiCoach: false });
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  m.events.length = 0;
  return m;
};

describe('Menschliche Fehler', () => {
  it('vergebene Großchance: der Schütze ist eine Weile verunsichert, danach nicht mehr', () => {
    const m = live();
    const p = m.players.find((q) => q.team === 0 && q.role === 'fwd') ?? m.players.find((q) => q.team === 0 && q.role !== 'gk');
    const s = attackDir(m, 0);
    p.pos = { x: s * (m.pitch.halfLength - 5), z: 0 };
    const events = [{ type: 'shot', playerId: p.id }];
    trackNerves(m, events);
    m.time += 3.5;
    trackNerves(m, events);
    expect(isShaken(m, p)).toBe(true);
    expect(events.some((e) => e.type === 'shaken' && e.playerId === p.id)).toBe(true);
    m.time += m.duration * HUMAN.shaken + 1;
    expect(isShaken(m, p)).toBe(false);
  });

  it('Schuss aus der Ferne vorbei: keine Großchance, keine Verunsicherung; Tor: auch nicht', () => {
    const m = live(4);
    const p = m.players.find((q) => q.team === 0 && q.role !== 'gk');
    const s = attackDir(m, 0);
    p.pos = { x: s * (m.pitch.halfLength - 20), z: 0 };
    const ev = [{ type: 'shot', playerId: p.id }];
    trackNerves(m, ev);
    m.time += 4;
    trackNerves(m, ev);
    expect(isShaken(m, p)).toBe(false);
    p.pos = { x: s * (m.pitch.halfLength - 4), z: 0 };
    const ev2 = [{ type: 'shot', playerId: p.id }];
    trackNerves(m, ev2);
    ev2.push({ type: 'goal', team: 0, scorerId: p.id });
    trackNerves(m, ev2);
    m.time += 4;
    trackNerves(m, ev2);
    expect(isShaken(m, p)).toBe(false);
  });

  it('Fernschusstor: der Torwart wackelt', () => {
    const m = live(5);
    const p = m.players.find((q) => q.team === 0 && q.role !== 'gk');
    const gk = m.players.find((q) => q.team === 1 && q.role === 'gk');
    const s = attackDir(m, 0);
    p.pos = { x: s * (m.pitch.halfLength - HUMAN.blunderFrom - 2), z: 0 };
    const ev = [{ type: 'shot', playerId: p.id }];
    trackNerves(m, ev);
    ev.push({ type: 'goal', team: 0, scorerId: p.id });
    trackNerves(m, ev);
    expect(isShaken(m, gk)).toBe(true);
  });

  it('im Spiel: der Ball springt auf holprigem Boden über den Fuß – auf Rasen und Hallenboden nie; abgeschaltet: nirgends', () => {
    const count = (venue, on) => {
      HUMAN.on = on;
      let n = 0;
      try {
        for (const seed of [6001, 6002, 6003]) {
          const pitch = PITCHES[venue];
          const m = createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
          while (m.phase !== 'ended') {
            stepMatch(m, undefined, DT);
            for (const e of m.events) if (e.type === 'miscontrol' && e.kind === 'unterfuss') n++;
            m.events.length = 0;
          }
        }
      } finally {
        HUMAN.on = true;
      }
      return n;
    };
    expect(count('ascheplatz', true)).toBeGreaterThan(0);
    expect(count('ascheplatz', false)).toBe(0);
    expect(count('halle', true)).toBe(0);
    expect(count('rasenplatz', true)).toBe(0); // gepflegter Rasen: nie
  }, 240000);
});
