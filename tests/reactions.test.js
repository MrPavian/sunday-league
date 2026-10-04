// Reaktionen der Figuren (nur Darstellung): Nach einem vergebenen Schuss greift sich der Schütze an den Kopf
// oder winkt ab, der Torwart ballt nach der Parade die Faust; beim Tor bilden die Mitspieler eine Traube.
import { describe, expect, it } from 'vitest';
import { catchKind, isFumble, mateCelebration, punchStyle, refereeSignal, shotReactions, SUB_FIVE, SUB_WALK, subScene, wideStance } from '../src/render/reactions.js';
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

  it('Torwart: Fangart nach Ballhöhe, Fausten beidhändig nur mittig, Breitmachen nur gegen den Ballführer, Abpraller', () => {
    expect([0.11, 0.7, 0.8, 1.2, 1.49, 1.5, 2.2].map(catchKind)).toEqual(['tief', 'tief', 'brust', 'brust', 'brust', 'kopf', 'kopf']);
    expect([0, 0.49, -0.49].map(punchStyle)).toEqual(['beide', 'beide', 'beide']);
    expect([0.5, 2].map(punchStyle)).toEqual(['rechts', 'rechts']);
    expect(punchStyle(-0.5)).toBe('links');
    const seen = {};
    const add = (k) => (seen[k] = (seen[k] ?? 0) + 1);
    for (const seed of [5, 6, 7]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 240, aiCoach: false });
      const held = {};
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        for (const g of m.players.filter((p) => p.role === 'gk')) {
          const h = m.ball.holder === g.id;
          // Zugreifen: Die Ballhöhe im Schritt des Fangens bestimmt die Art; „hoch“ der Simulation ist Kopfhöhe.
          if (h && !held[g.id] && m.phase === 'play') {
            const ev = m.events.find((e) => e.type === 'catch' && e.playerId === g.id);
            if (ev) expect(catchKind(m.ball.pos.y) === 'kopf', 'hoch = Kopf').toBe(!!ev.high);
            add('catch');
          }
          held[g.id] = h;
          const w = wideStance(m, g);
          expect(w >= 0 && w <= 1).toBe(true);
          if (w > 0) {
            // nur mit einem Gegner am Ball, vor dem Torwart und höchstens 7 m entfernt
            const s = attackDir(m, g.team);
            const o = m.players.find((q) => q.team !== g.team && q.id === m.ball.lastTouch);
            expect(o, 'Ballführer').toBeTruthy();
            expect(Math.hypot(o.pos.x - g.pos.x, o.pos.z - g.pos.z)).toBeLessThanOrEqual(7);
            expect((o.pos.x - g.pos.x) * s).toBeGreaterThanOrEqual(-0.3);
            expect(m.ball.holder).toBeNull();
            add('breit');
          }
        }
        for (const e of m.events) {
          if (isFumble(e, m)) add('abpraller');
          if (e.type === 'save' && e.punch) {
            const g = m.players.find((p) => p.id === e.playerId);
            const lateral = m.ball.pos.z - g.pos.z;
            const st = punchStyle(lateral);
            expect(st === 'beide').toBe(Math.abs(lateral) < 0.5);
            add('faust');
          }
          if (e.type === 'save') {
            // Abpraller = nicht gefaustet und nach vorn weg; über die Latte/ums Tor gelenkt ist keiner.
            const g = m.players.find((p) => p.id === e.playerId);
            const forward = m.ball.vel.x * attackDir(m, g.team) > 0;
            expect(isFumble(e, m)).toBe(!e.punch && forward);
            if (!e.punch && !forward) add('gelenkt');
          }
          if (e.type === 'catch') expect(isFumble(e, m)).toBe(false);
        }
        m.events.length = 0;
      }
    }
    for (const k of ['catch', 'breit', 'abpraller', 'faust']) expect(seen[k] ?? 0, k).toBeGreaterThan(0);
  }, 120000);
});
