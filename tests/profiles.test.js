import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { hasProfile, pressureChaos, profilesOf } from '../src/sim/profiles.js';

const player = (attrs, extra = {}) => ({ name: 'Test Spieler', age: 27, position: 'mid', traits: [], attrs: { pace: 0.5, stamina: 0.5, technique: 0.5, passing: 0.5, shooting: 0.5, tackling: 0.5, heading: 0.5, keeping: 0.1, ...attrs }, ...extra });

describe('player profiles', () => {
  it('come from values and traits – the same player always gets the same profile', () => {
    expect(profilesOf(player({}, { traits: ['gutes_auge'] }))).toContain('spielmacher');
    expect(profilesOf(player({ pace: 0.85 }))).toContain('sprinter');
    expect(profilesOf(player({ technique: 0.8, passing: 0.4 }))).not.toContain('teamplayer');
    expect(profilesOf(player({ passing: 0.8, technique: 0.45 }))).toContain('teamplayer');
    expect(profilesOf(player({ tackling: 0.8, stamina: 0.75 }))).toContain('kaempfer');
    expect(profilesOf(player({}, { traits: ['ballsicher'] }))).toContain('ruhepol');
    const p = player({ technique: 0.7, passing: 0.72 });
    expect(profilesOf(p)).toEqual(profilesOf({ ...p }));
    expect(profilesOf(player({ pace: 0.9, technique: 0.8, passing: 0.3, tackling: 0.9, stamina: 0.9 })).length).toBeLessThanOrEqual(2);
  });

  it('under pressure a nervy player gets more chaotic, a calm one hardly', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.parkplatz, human: false });
    const [p] = m.players.filter((q) => q.team === 0 && q.role !== 'gk');
    const opp = m.players.find((q) => q.team === 1 && q.role !== 'gk');
    opp.pos = { x: p.pos.x + 0.4, z: p.pos.z };
    for (const q of m.players) if (q.team === 0 && q !== p) q.pos = { x: -99, z: 0 }; // kein Ruhepol in der Nähe
    p._profiles = ['nervoes'];
    const nervy = pressureChaos(m, p);
    p._profiles = ['ruhepol'];
    const calm = pressureChaos(m, p);
    p._profiles = [];
    const normal = pressureChaos(m, p);
    expect(nervy).toBeGreaterThan(normal);
    expect(calm).toBeLessThan(normal);
    opp.pos = { x: p.pos.x + 5, z: p.pos.z };
    expect(pressureChaos(m, p)).toBe(1); // ohne Druck kein Aufschlag
  });

  it('team-mates look for the playmaker', () => {
    const received = (makePlaymaker) => {
      let n = 0;
      for (let i = 0; i < 6; i++) {
        const m = createMatch({ seed: 500 + i, pitch: PITCHES.parkplatz, human: false, duration: 150, aiCoach: false });
        const mid = m.players.find((q) => q.team === 0 && q.role === 'mid');
        mid._profiles = makePlaymaker ? ['spielmacher'] : [];
        for (const q of m.players) if (q !== mid && q.team === 0) q._profiles = [];
        while (m.phase !== 'ended') {
          stepMatch(m, undefined, 1 / 60);
          for (const e of m.events) if (e.type === 'pass' && e.targetId === mid.id) n++;
          m.events.length = 0;
        }
      }
      return n;
    };
    expect(received(true)).toBeGreaterThan(received(false) * 1.1);
    expect(hasProfile({ _profiles: ['spielmacher'] }, 'spielmacher')).toBe(true);
  }, 90_000);
});
