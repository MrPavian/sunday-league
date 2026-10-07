// Reaktionen der Figuren (nur Darstellung): Nach einem vergebenen Schuss greift sich der Schütze an den Kopf
// oder winkt ab, der Torwart ballt nach der Parade die Faust; beim Tor bilden die Mitspieler eine Traube.
import { describe, expect, it } from 'vitest';
import { catchKind, DUEL_FAR, duelPairs, foeBearing, isFumble, kickFoot, THROW_RUN, throwInRun, mateCelebration, punchStyle, refereeSignal, shotReactions, SUB_FIVE, SUB_WALK, subScene, tiredFace, wideStance, crowdCues, isChance, warmupPicks, warmupSpot, warmupStep, WARMUP_AWAY, WARMUP_CYCLE, WARMUP_HOME, WARMUP_LANE, WARMUP_PLAN } from '../src/render/reactions.js';
import { LIMITED_SUBS } from '../src/sim/squad.js';
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

  it('Spielfluss: Einwurf-Anlauf endet am Punkt, Zweikämpfe nur Gegner nah am Ball, Schussfuß nach Ballseite', () => {
    let runs = 0;
    let duels = 0;
    let feet = new Set();
    for (const seed of [5, 6, 7]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 300, aiCoach: false });
      let prevU = 0;
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        m.events.length = 0;
        const r = throwInRun(m);
        if (r) {
          runs++;
          const p = m.players.find((q) => q.id === r.id);
          expect(m.ball.holder).toBe(r.id);
          expect(r.off).toBeGreaterThanOrEqual(0);
          expect(r.off).toBeLessThanOrEqual(2.4 + 1e-9);
          // hinter ihm bleibt es auf dem Platz, am Ende des Anlaufs steht er auf dem Punkt
          expect(Math.abs(p.pos.x - r.dir * r.off)).toBeLessThanOrEqual(m.pitch.halfLength - 0.3 + 1e-9);
          if (r.u >= 1) expect(r.off).toBe(0);
          expect(r.u).toBeGreaterThanOrEqual(prevU - 1e-9);
          prevU = r.u;
        } else prevU = 0;
        for (const d of duelPairs(m)) {
          duels++;
          const a = m.players.find((q) => q.id === d.id);
          const b = m.players.find((q) => q.id === d.foe);
          expect(a.team).not.toBe(b.team);
          expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeLessThan(DUEL_FAR);
          expect(d.k).toBeGreaterThan(0);
          expect(d.k).toBeLessThanOrEqual(1);
        }
        for (const p of m.players) if (p.kickAnim > 0.29) feet.add(kickFoot(p, m.ball, 1));
      }
    }
    expect(runs).toBeGreaterThan(30); // mehrere Einwürfe mit Anlauf
    expect(duels).toBeGreaterThan(0);
    expect(feet.size).toBe(2); // beide Füße kommen vor
  }, 120000);

  it('Richtungshelfer: Gegner rechts/links/vorn/hinten, Anlaufdauer', () => {
    expect(foeBearing(0, 1, 0)).toBeCloseTo(Math.PI / 2, 5); // Blick +z, Gegner bei +x: rechts
    expect(foeBearing(0, 0, 1)).toBeCloseTo(0, 5);
    expect(Math.abs(foeBearing(0, 0, -1))).toBeCloseTo(Math.PI, 5);
    expect(foeBearing(Math.PI / 2, 0, -1)).toBeCloseTo(Math.PI / 2, 5); // Blick +x, Gegner bei -z: rechts
    expect(THROW_RUN).toBeGreaterThan(1);
  });
});

describe('Aufwärmen am Rand', () => {
  const mk = (seed = 5, pitch = PITCHES.rasenplatz) => createMatch({ seed, pitch, human: false, duration: 240, aiCoach: false });

  it('wählt nur Bankspieler: geplanter Einwechselspieler zuerst, dann Position des Müdesten, nie die Ausgewechselten', () => {
    const m = mk();
    for (const team of [0, 1]) {
      const picks = warmupPicks(m, team, 2);
      expect(picks.length).toBe(2);
      for (const b of picks) expect(m.bench[team]).toContain(b);
      expect(new Set(picks.map((b) => b.id)).size).toBe(2);
    }
    expect(warmupPicks(m, 0, 0)).toEqual([]);
    // Ein Wechsel ist angesagt: genau dieser Spieler wärmt sich zuerst auf, auch wenn er hinten auf der Bank sitzt.
    const last = m.bench[0].at(-1);
    m.subPlan = [{ outId: m.players.find((p) => p.team === 0 && p.role !== 'gk').id, inId: last.id }, null];
    expect(warmupPicks(m, 0, 2)[0]).toBe(last);
    // Der müdeste Feldspieler bestimmt die Position des zweiten Kandidaten.
    m.subPlan = null;
    const tired = m.players.filter((p) => p.team === 1 && p.role !== 'gk').sort((a, b) => a.stamina - b.stamina)[0];
    const sameRole = m.bench[1].find((b) => b.position === tired.role);
    if (sameRole) expect(warmupPicks(m, 1, 1)[0]).toBe(sameRole);
    // Ausgewechselte bleiben draußen; ist das Wechselkontingent leer, wärmt sich keiner auf.
    const first = warmupPicks(m, 0, 1)[0];
    expect(warmupPicks(m, 0, 1, new Set([first.id]))[0]).not.toBe(first);
    m.subRule = LIMITED_SUBS;
    m.subsUsed = [LIMITED_SUBS.limit, 0];
    expect(warmupPicks(m, 0, 2)).toEqual([]);
    expect(warmupPicks(m, 1, 2).length).toBe(2);
    expect(WARMUP_HOME + WARMUP_AWAY).toBeLessThanOrEqual(4);
  });

  it('verändert die Simulation nicht und liefert im ganzen Spiel nur Bankspieler (kein Feldspieler doppelt)', () => {
    const m = mk(6);
    const out = new Set();
    let subs = 0;
    const planned = new Set();
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) if (e.type === 'sub') (subs++, out.add(e.outId));
      for (const team of [0, 1]) {
        const before = JSON.stringify([m.bench[team].map((b) => b.id), m.players.map((p) => p.id), m.subPlan]);
        for (const b of warmupPicks(m, team, 2, out)) {
          expect(m.players.some((p) => p.id === b.id)).toBe(false);
          expect(m.bench[team]).toContain(b);
          expect(out.has(b.id)).toBe(false);
          if (m.subPlan?.[team]?.inId === b.id) planned.add(b.id);
        }
        expect(JSON.stringify([m.bench[team].map((b) => b.id), m.players.map((p) => p.id), m.subPlan])).toBe(before);
      }
      m.events.length = 0;
    }
    expect(subs).toBeGreaterThan(0);
  }, 120000);

  it('Streifen: nur auf Spielorten mit Platz, hinter der Gegenseite, Heim links/Gast rechts, Bahnen im Abstand', () => {
    for (const id of ['rasenplatz', 'sportplatz', 'grossfeld', 'ascheplatz']) {
      const m = mk(5, PITCHES[id]);
      const a = warmupSpot(m, 0);
      const b = warmupSpot(m, 1);
      const c = warmupSpot(m, 0, 1);
      for (const sp of [a, b]) {
        expect(sp.z).toBeLessThan(-m.pitch.halfWidth - 0.3); // hinter der Linie
        expect(sp.z).toBeGreaterThan(-m.pitch.halfWidth - 1); // dicht dran, vor der Bank (Bank ab 1,5 m)
        expect(sp.x1 - sp.x0).toBeGreaterThan(4);
      }
      expect(a.x1).toBeLessThan(0);
      expect(b.x0).toBeGreaterThan(0);
      expect(Math.abs(Math.max(Math.abs(a.x0), Math.abs(b.x1)))).toBeLessThan(m.pitch.halfLength); // vor der Eckfahne
      expect(a.z - c.z).toBeCloseTo(WARMUP_LANE, 9);
    }
    for (const id of ['halle', 'hinterhof', 'parkplatz', 'park']) expect(warmupSpot(mk(5, PITCHES[id]), 0), id).toBeNull();
  });

  it('Ablauf: bleibt auf dem Streifen, läuft stetig, zeigt alle Übungen, Dehnen erst links, dann rechts', () => {
    const w = { x0: -16, x1: -8, z: -17.5, t: 0 };
    const out = {};
    const seen = new Set();
    let prev = null;
    const dt = 1 / 60;
    let turned = 0;
    let lastDir = null;
    for (let k = 0; k < 60 * WARMUP_CYCLE * 2; k++) {
      warmupStep(w, dt, out);
      seen.add(out.gesture);
      expect(out.x).toBeGreaterThanOrEqual(-16 - 1e-9);
      expect(out.x).toBeLessThanOrEqual(-8 + 1e-9);
      expect(out.z).toBe(-17.5);
      expect(Number.isFinite(out.angle)).toBe(true);
      if (prev) {
        expect(Math.abs(out.x - prev)).toBeLessThanOrEqual(out.speed * dt + 1e-9); // nie schneller als sein Tempo
        if (out.speed === 0) expect(out.x).toBe(prev); // Übungen im Stand
      }
      prev = out.x;
      if (out.speed > 0 && w.dir !== lastDir) (lastDir !== null && turned++, (lastDir = w.dir));
    }
    for (const g of [null, 'dehnenL', 'dehnenR', 'hopser', 'kreisen', 'armkreisen']) expect(seen.has(g), String(g)).toBe(true);
    expect(turned).toBeGreaterThan(2); // läuft hin und her
    // Reihenfolge im Plan: erst L, dann R innerhalb derselben Dehnübung
    const st = { x0: 0, x1: 8, z: 0, t: WARMUP_PLAN[0].dur };
    expect(warmupStep(st, 0.01, {}).gesture).toBe('dehnenL');
    st.t = WARMUP_PLAN[0].dur + WARMUP_PLAN[1].dur - 0.5;
    expect(warmupStep(st, 0.01, {}).gesture).toBe('dehnenR');
    // Das Ergebnisobjekt wird wiederverwendet (keine Allokation je Bild).
    expect(warmupStep(w, dt, out)).toBe(out);
  });
});

describe('Zuschauer-Reaktionen auf Spielereignisse', () => {
  const m = createMatch({ seed: 5, pitch: PITCHES.rasenplatz, human: false, duration: 240, aiCoach: false });
  const field = (team) => m.players.find((p) => p.team === team && p.role !== 'gk');
  const kinds = (cues) => Object.fromEntries(cues.map((c) => [`${c.who}:${c.kind}`, c.share]));
  const place = (p, x, z) => ((p.pos.x = x), (p.pos.z = z));

  it('Chance (nah am Tor): Anhänger des Schützen stehen auf, die anderen halten still; Fernschuss nur Vorbeugen', () => {
    const s = field(0);
    const gx = attackDir(m, 0) * m.pitch.halfLength;
    place(s, gx - attackDir(m, 0) * 8, 1);
    expect(isChance(m, s)).toBe(true);
    const near = crowdCues({}, m, { type: 'shot', playerId: s.id });
    expect(near.find((c) => c.kind === 'rise')).toMatchObject({ who: 0 });
    expect(kinds(near)['1:lean']).toBeDefined();
    place(s, gx - attackDir(m, 0) * 30, 8);
    expect(isChance(m, s)).toBe(false);
    const far = crowdCues({}, m, { type: 'shot', playerId: s.id });
    expect(far.map((c) => c.kind)).toEqual(['lean']);
    expect(far[0].who).toBe('all');
    // Wer in Gegenrichtung angreift, hat sein Tor auf der anderen Seite.
    const g = field(1);
    place(g, attackDir(m, 1) * m.pitch.halfLength - attackDir(m, 1) * 5, 0);
    expect(crowdCues({}, m, { type: 'shot', playerId: g.id }).find((c) => c.kind === 'rise').who).toBe(1);
  });

  it('Parade, Pfosten, vorbei: der Schütze und seine Fans ärgern sich, die des Torwarts klatschen', () => {
    const s = field(0);
    const k = m.players.find((p) => p.team === 1 && p.role === 'gk');
    const state = {};
    m.time = 100;
    place(s, attackDir(m, 0) * m.pitch.halfLength - 5 * attackDir(m, 0), 0);
    crowdCues(state, m, { type: 'shot', playerId: s.id });
    m.time = 100.5;
    const save = kinds(crowdCues(state, m, { type: 'save', playerId: k.id }));
    expect(save['0:head']).toBe(0.5); // Fans des Schützen: Hände an den Kopf
    expect(save['1:clap']).toBeGreaterThan(0);
    const post = crowdCues(state, m, { type: 'post' });
    expect(post[0]).toMatchObject({ who: 0, kind: 'head' });
    expect(post[0].share).toBeGreaterThan(0.5);
    expect(crowdCues(state, m, { type: 'out', restart: 'goalkick', team: 1 })[0]).toMatchObject({ who: 0, kind: 'head' });
    expect(crowdCues(state, m, { type: 'out', restart: 'goalkick', team: 0 })).toEqual([]); // eigener Abstoß: kein Ärger
    // Der Schuss ist lange her: Pfosten und Parade lösen keinen gezielten Ärger aus.
    m.time = 120;
    expect(crowdCues(state, m, { type: 'post' })[0].who).toBe('all');
    expect(kinds(crowdCues(state, m, { type: 'save', playerId: k.id }))['0:head']).toBeLessThan(0.5);
  });

  it('Tor: Fans des Torschützen springen, bei Eigentor die der anderen Mannschaft; der Schuss wird vergessen', () => {
    const st = { lastShot: { team: 0, time: m.time } };
    const c = crowdCues(st, m, { type: 'goal', team: 0 });
    expect(c[0]).toMatchObject({ who: 0, kind: 'cheer' });
    expect(c.find((x) => x.who === 1)).toMatchObject({ kind: 'head' });
    expect(st.lastShot).toBeNull();
    expect(crowdCues({}, m, { type: 'goal', team: 0, ownGoal: true })[0].who).toBe(1);
    expect(crowdCues({}, m, { type: 'pass' })).toEqual([]);
  });
});
