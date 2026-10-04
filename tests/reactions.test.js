// Reaktionen der Figuren (nur Darstellung): Nach einem vergebenen Schuss greift sich der Schütze an den Kopf
// oder winkt ab, der Torwart ballt nach der Parade die Faust; beim Tor bilden die Mitspieler eine Traube.
import { describe, expect, it } from 'vitest';
import { mateCelebration, refereeSignal, shotReactions, SUB_FIVE, SUB_WALK, subScene, tiredFace } from '../src/render/reactions.js';
import { attackDir } from '../src/sim/players.js';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

describe('Reaktionen nach Schüssen und Toren', () => {
  it('Schütze und Torwart reagieren, Mitspieler laufen zum Torschützen und umarmen ihn', () => {
    const seen = new Map();
    const add = (k) => seen.set(k, (seen.get(k) ?? 0) + 1);
    let goals = 0;
    for (const seed of [5, 6, 7]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 240, aiCoach: false });
      const state = {};
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        for (const r of shotReactions(state, m)) {
          add(r.gesture);
          const p = m.players.find((q) => q.id === r.id);
          if (r.gesture === 'geballt') expect(p.role).toBe('gk');
          else expect(m.events.some((e) => e.type === 'goal')).toBe(false);
        }
        goals += m.events.filter((e) => e.type === 'goal').length;
        m.events.length = 0;
        for (const p of m.players) if (p.mood === 'celebrate') add(mateCelebration(m, p, 'eigen'));
      }
    }
    expect(seen.get('haende') ?? 0).toBeGreaterThan(0);
    expect(seen.get('abwinken') ?? 0).toBeGreaterThan(0);
    expect(seen.get('geballt') ?? 0).toBeGreaterThan(0);
    expect(goals).toBeGreaterThan(0);
    expect(seen.get('umarmen') ?? 0).toBeGreaterThan(0);
    expect(seen.get('hinterher') ?? 0).toBeGreaterThan(0);
  }, 120000);

  it('kein Ärger nach einem Tor: der letzte Schuss wird beim Tor vergessen', () => {
    const state = {};
    const match = { time: 10, players: [{ id: 'a', team: 0 }, { id: 'k', team: 1, role: 'gk' }], events: [{ type: 'shot', playerId: 'a' }, { type: 'goal', team: 0 }] };
    expect(shotReactions(state, match)).toEqual([]);
    match.events = [{ type: 'out', restart: 'goalkick', team: 1 }];
    expect(shotReactions(state, match)).toEqual([]);
  });

  it('Schiri zeigt an: Ecke zur Fahne, Abstoß und Elfmeter zum Punkt, Freistoß in Angriffsrichtung, Tor zur Mitte', () => {
    const kinds = new Map();
    for (const seed of [5, 6, 7, 8]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: matchDuration(PITCHES.rasenplatz), aiCoach: false });
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        const sig = refereeSignal(m, attackDir);
        const e = m.events.find((x) => x.type === 'goal' || (x.type === 'setpiece' && x.kind !== 'kickoff'));
        if (e) {
          expect(sig).not.toBeNull();
          const k = e.type === 'goal' ? 'goal' : e.kind;
          kinds.set(k, (kinds.get(k) ?? 0) + 1);
          if (k === 'goal') expect(sig).toMatchObject({ x: 0, z: 0 });
          else if (k === 'corner') expect(Math.abs(sig.x)).toBeGreaterThan(m.pitch.halfLength - 1);
          else if (k === 'freekick' || k === 'throwin') expect(Math.sign(sig.x - m.referee.pos.x)).toBe(attackDir(m, e.team));
        }
        m.events.length = 0;
      }
    }
    for (const k of ['goal', 'corner', 'goalkick', 'throwin']) expect(kinds.get(k) ?? 0, k).toBeGreaterThan(0);
  }, 120000);

  it('Wechsel: erst abklatschen am Neuen, dann über die Seitenlinie raus, danach weg', () => {
    const sub = { x: 0, z: 9.4, t: 0 };
    const first = subScene(sub, 0.1);
    expect(first.gesture).toBe('abklatschen');
    expect(Math.abs(first.x - sub.x)).toBeLessThan(1);
    let last = first;
    while (sub.t + 0.1 < SUB_FIVE + SUB_WALK - 0.05) last = subScene(sub, 0.1);
    expect(last.done).toBeUndefined();
    expect(last.z).toBeGreaterThan(9.4 + 2); // jenseits der Linie
    expect(subScene(sub, 0.2).done).toBe(true);
  });
});

describe('Erschöpfung im Gesicht', () => {
  it('Schwellen mit Hysterese, Sprint und Verletzte zeigen sie nicht', () => {
    const p = { stamina: 0.2, vel: { x: 0, z: 0 }, state: 'normal' };
    expect(tiredFace(p)).toBe(true);
    expect(tiredFace({ ...p, stamina: 0.5 })).toBe(false);
    expect(tiredFace({ ...p, vel: { x: 6, z: 0 } })).toBe(false);
    expect(tiredFace({ ...p, state: 'tackle' })).toBe(false);
    expect(tiredFace({ ...p, injury: { severity: 1 } })).toBe(false);
    const edge = { ...p, stamina: 0.34 };
    expect(tiredFace(edge, false)).toBe(false);
    expect(tiredFace(edge, true)).toBe(true);
  });

  it('in echten Spielen werden Spieler müde, aber nicht alle, und nur im Stand oder Trab', () => {
    let tired = 0;
    let frames = 0;
    const ever = new Set();
    const all = new Set();
    for (const seed of [5]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 240, aiCoach: false });
      const was = new Map();
      let n = 0;
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        if (++n % 20) continue; // alle 1/3 s genügt
        for (const p of m.players) {
          const t = tiredFace(p, was.get(p.id));
          was.set(p.id, t);
          frames++;
          all.add(seed + p.id);
          if (t) {
            tired++;
            ever.add(seed + p.id);
            expect(Math.hypot(p.vel.x, p.vel.z)).toBeLessThan(3.2 * 1.2);
            expect(p.stamina).toBeLessThan(0.3 * 1.2);
          }
        }
      }
    }
    expect(tired).toBeGreaterThan(0);
    expect(tired).toBeLessThan(frames * 0.5);
    expect(ever.size).toBeLessThan(all.size);
  }, 180000);
});
