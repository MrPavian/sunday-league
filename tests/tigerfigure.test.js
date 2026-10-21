// Tims Figur am Rand (src/render/tiger.js, PlayerModel): Ort, Gesten, Dose, Aussehen – reine Funktionen und Modell ohne DOM.
import { describe, expect, it } from 'vitest';
import { BUND_PITCHES, PITCHES } from '../src/sim/pitch.js';
import { animatePlayer, createPlayerModel, DOSE, TRINKEN } from '../src/render/PlayerModel.js';
import { TIGER_CYCLE, TIGER_LOOK, tigerCue, tigerIdle, tigerKit, tigerReact, tigerSpot, tigerState, tigerStep, tigerVenues, tigerYaw } from '../src/render/tiger.js';

const match = (id, team = 0, mood = 0.6) => ({ pitch: PITCHES[id], tiger: { team, mood }, time: 100, players: [{ id: 'a', team: 0, pos: { x: 20, z: 0 }, role: 'fwd' }, { id: 'b', team: 1, pos: { x: -20, z: 0 }, role: 'def' }] });
const teamOf = (id) => (id === 'a' ? 0 : 1);

describe('Tiger am Rand: Ort', () => {
  it('steht an jedem Spielort außer dem Stadion, hinter der Linie, auf der Seite der Mannschaft', () => {
    for (const id of tigerVenues()) {
      const p = PITCHES[id] ?? BUND_PITCHES[id];
      const m = { ...match(id), pitch: p };
      const s = tigerSpot(m);
      expect(s, id).toBeTruthy();
      expect(Math.sign(s.x), id).toBe(-1); // Mannschaft 0 links
      expect(tigerSpot({ ...m, tiger: { team: 1 } }).x).toBeCloseTo(-s.x, 6);
      if (['sportplatz', 'grossfeld', 'grossfeld_tribuene'].includes(id)) expect(Math.abs(s.x)).toBeGreaterThan(p.halfLength); // hinter dem Tor
      else expect(s.z, id).toBeLessThan(-p.halfWidth + 0.8); // Gegenseite
    }
    expect(tigerSpot({ pitch: { id: 'stadion', halfLength: 52, halfWidth: 34 }, tiger: { team: 0 } })).toBeNull();
    expect(tigerSpot({ pitch: PITCHES.halle })).toBeNull(); // ohne Tiger niemand
  });

  it('Halle: am Geländer vor der Tribüne, die Blickrichtung folgt dem Ball nur begrenzt', () => {
    const s = tigerSpot(match('halle'));
    expect(s.z).toBeLessThan(-PITCHES.halle.halfWidth);
    expect(s.z).toBeGreaterThan(-PITCHES.halle.halfWidth - 1.4);
    expect(Math.abs(tigerYaw(s, { x: 100, z: 20 }))).toBeLessThanOrEqual(0.46);
    expect(Math.abs(tigerYaw(s, { x: s.x, z: 0 }))).toBeLessThan(0.01);
  });
});

describe('Tiger am Rand: außerhalb der Laufwege', () => {
  it('liegt an jedem Spielort außerhalb der Fläche, die Spieler betreten können (clampPlayer), mit Abstand für den Körper', () => {
    for (const id of tigerVenues()) {
      const p = PITCHES[id] ?? BUND_PITCHES[id];
      const s = tigerSpot({ pitch: p, tiger: { team: 0 } });
      const zMax = p.boundary === 'lines' ? p.halfWidth + 1.2 : p.halfWidth - 0.3;
      const xMax = p.wallX - 0.3;
      const outside = Math.abs(s.z) >= zMax + 0.3 || Math.abs(s.x) >= xMax + 0.3;
      expect(outside, `${id}: x ${s.x} z ${s.z} (Laufweg ±${xMax} / ±${zMax})`).toBe(true);
    }
  });
});

describe('Tiger am Rand: Hinterhof-Fenster', () => {
  it('schaut aus einem Erdgeschossfenster der Hauswand, ohne Beine, auf der Seite der Mannschaft', () => {
    const s = tigerSpot(match('hinterhof'));
    expect(s).toMatchObject({ z: -PITCHES.hinterhof.halfWidth, legs: false });
    expect(s.y).toBeGreaterThan(0.8);
    expect(Math.abs(s.x)).toBeCloseTo(5.6, 6);
    expect(tigerSpot(match('hinterhof', 1)).x).toBeCloseTo(-s.x, 6);
    expect(tigerSpot(match('rasenplatz')).legs).toBeUndefined();
  });
});

describe('Tiger am Rand: Gesten', () => {
  it('Ruhe: Durchgang von 36 s mit Dose, zwei Schlucken und Achselzucken, bei Wut Arme verschränkt', () => {
    const seen = new Set();
    for (let t = 0; t < TIGER_CYCLE; t += 0.5) seen.add(tigerIdle(t));
    expect([...seen].sort()).toEqual(['bier', 'dose', 'schulter']);
    expect(tigerIdle(1)).toBe(tigerIdle(1 + TIGER_CYCLE));
    expect(tigerIdle(-5)).toBe(tigerIdle(TIGER_CYCLE - 5));
    const sour = new Set();
    for (let t = 0; t < TIGER_CYCLE; t += 0.5) sour.add(tigerIdle(t, 0.1));
    expect(sour.has('arme')).toBe(true);
  });

  it('Tore, Gegentore, vergebene Chancen, Fouls, Karten, Paraden', () => {
    const st = tigerState();
    const m = match('rasenplatz');
    expect(tigerCue(st, m, { type: 'goal', team: 0 }, teamOf)).toMatchObject({ gesture: 'dosejubel', prio: 3 });
    expect(tigerCue(st, m, { type: 'goal', team: 1 }, teamOf)).toMatchObject({ gesture: 'haende' });
    expect(tigerCue(st, m, { type: 'goal', team: 1, ownGoal: true }, teamOf).gesture).toBe('dosejubel'); // Eigentor des Gegners
    expect(tigerCue(st, match('rasenplatz', 0, 0.1), { type: 'goal', team: 0 }, teamOf).gesture).toBe('geballt');
    expect(tigerCue(st, m, { type: 'foul', playerId: 'b', victimId: 'a' }, teamOf).gesture).toBe('zeigen');
    expect(tigerCue(st, m, { type: 'foul', playerId: 'a', victimId: 'b' }, teamOf).gesture).toBe('unschuld');
    expect(tigerCue(st, m, { type: 'card', playerId: 'a' }, teamOf).gesture).toBe('schimpfen');
    expect(tigerCue(st, m, { type: 'card', playerId: 'b' }, teamOf).gesture).toBe('finger');
    // Schuss aus Nähe, gehalten → abwinken; ein Gegenschuss, vom eigenen Torwart gehalten → Faust
    m.players[0].pos = { x: 48, z: 0 };
    tigerCue(st, m, { type: 'shot', playerId: 'a' }, teamOf);
    expect(tigerCue(st, m, { type: 'save', playerId: 'k' }, teamOf).gesture).toBe('abwinken');
    m.players[1].pos = { x: -48, z: 0 };
    tigerCue(st, m, { type: 'shot', playerId: 'b' }, teamOf);
    expect(tigerCue(st, m, { type: 'save', playerId: 'k' }, teamOf).gesture).toBe('geballt');
  });

  it('Ablauf: Reaktion ersetzt Ruhe, Tore gehen vor, danach zurück zur Ruhe; deterministisch', () => {
    const run = () => {
      const st = tigerState(3);
      const out = {};
      const seq = [];
      tigerReact(st, { gesture: 'finger', time: 1, prio: 2 });
      for (let i = 0; i < 40; i++) {
        if (i === 5) tigerReact(st, { gesture: 'dosejubel', time: 2, prio: 3 });
        if (i === 6) expect(tigerReact(st, { gesture: 'call', time: 1, prio: 1 })).toBe(false);
        seq.push(tigerStep(st, 0.1, 0.6, out).gesture);
      }
      return seq;
    };
    const a = run();
    expect(a[0]).toBe('finger');
    expect(a[6]).toBe('dosejubel');
    expect(a.at(-1)).not.toBe('dosejubel');
    expect(run()).toEqual(a);
  });
});

describe('Tiger: Figur', () => {
  const model = () => createPlayerModel(TIGER_LOOK, tigerKit(0xc0392b), { number: 12, edge: 'neutral' });

  it('Dreiecke im Rahmen (≤ 700), Halbglatze und Vollbart, Dose nur bei ihm', () => {
    const m = model();
    expect(m.mesh.geometry.attributes.position.count / 3).toBeLessThanOrEqual(700);
    expect(m.hairStyle).toBe('halbglatze');
    expect(m.features.beard).toBe('full');
    const plain = createPlayerModel({ ...TIGER_LOOK, can: false }, tigerKit());
    expect(m.mesh.geometry.attributes.position.count).toBeGreaterThan(plain.mesh.geometry.attributes.position.count);
  });

  it('Gesten animieren ohne Fehler; beim Trinken ist die Dose nah am Mund, in Ruhe vor dem Bauch', () => {
    const m = model();
    for (const g of ['dose', 'bier', 'dosejubel', 'haende', 'schimpfen', 'zeigen', 'finger', 'abwinken', 'geballt', 'call', 'schulter', 'unschuld', 'arme']) for (const t of [0, 0.7, 2.2]) {
      m.gestT = t;
      m.gestName = g;
      animatePlayer(m, { speed: 0, dt: 0.016, kickAnim: 0, headAnim: 0, holding: null, state: 'normal', gesture: g });
    }
    expect(DOSE[0]).toBeLessThan(0);
    expect(TRINKEN[1]).toBeLessThan(DOSE[1]); // quer vor die Brust zum Mund
  });
});
