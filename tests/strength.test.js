// Körper („strength“, UI „Körper“/„Strength“) und die Ping-Pong-Bremse A + B (docs/agent/pingpong-audit-2026-10.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCareer, developPlayers, humanClub, importCareer, playerOf } from '../src/career/career.js';
import { createCoachPlayer } from '../src/career/personal.js';
import { createRng } from '../src/core/rng.js';
import { dribbleTouch } from '../src/sim/actions.js';
import { createPlayerPool, generatePlayer } from '../src/sim/generator.js';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { deriveStrength, ensureStrength, PINGPONG, STRENGTH_FX } from '../src/sim/strength.js';

describe('Körper: Wert und Ableitung', () => {
  const pool = createPlayerPool({ seed: 1921 });
  const all = pool.everyone();
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  it('every pool player has a strength in 0.08…0.92 (legends: archetype value), centred near 0.5', () => {
    for (const p of all) expect(p.attrs.strength).toBeGreaterThanOrEqual(0.08);
    for (const p of all) expect(p.attrs.strength).toBeLessThanOrEqual(0.92);
    const m = mean(all.map((p) => p.attrs.strength));
    expect(m).toBeGreaterThan(0.47); // gemessen 0,496
    expect(m).toBeLessThan(0.53);
  });

  it('defenders are slightly stronger than midfielders, teenagers weaker than players in their prime', () => {
    const avg = (f) => mean(all.filter(f).map((p) => p.attrs.strength));
    expect(avg((p) => p.position === 'def')).toBeGreaterThan(avg((p) => p.position === 'mid') + 0.02);
    expect(avg((p) => p.age <= 20)).toBeLessThan(avg((p) => p.age >= 25 && p.age <= 32) - 0.04);
  });

  it('taller and heavier means stronger, all else equal (average over many names)', () => {
    let d = 0;
    for (let i = 0; i < 400; i++) {
      const base = { name: `Test Spieler ${i}`, age: 27, position: 'mid', look: { skin: 1, hair: 1, height: 1, belly: 0.2 } };
      d += deriveStrength({ ...base, look: { ...base.look, height: 1.07 } }) - deriveStrength({ ...base, look: { ...base.look, height: 0.93 } });
    }
    expect(d / 400).toBeGreaterThan(0.1); // Soll 0,9 · 0,14 = 0,126
    expect(d / 400).toBeLessThan(0.15);
  });

  it('does not touch the random stream: the generated player is the same as before apart from the new value', () => {
    // Werte aus dem Stand vor der Änderung (HEAD d5f377d), Seed 1921: Pool-Nummer 1 und 100.
    const a = pool.get(1);
    expect([a.name, a.age, a.position, a.tier, a.rating]).toEqual(['Pascal Baumann', 19, 'mid', 'gut', 50]);
    expect(a.attrs.technique).toBeCloseTo(0.4153445722305099, 12);
    const g = pool.get(100);
    expect([g.name, g.age, g.position, g.tier, g.rating]).toEqual(['Sascha Winter', 22, 'gk', 'ok', 42]);
    expect(g.attrs.keeping).toBeCloseTo(0.46902562640091244, 12);
    // und ein frischer Würfelstrom bleibt gleich lang: derselbe Folgewert nach dem Spieler
    const r1 = createRng(5);
    generatePlayer(r1, { role: 'def', tier: 'gut' });
    const r2 = createRng(5);
    generatePlayer(r2, { role: 'def', tier: 'gut' });
    expect(r1.next()).toBe(r2.next());
  });
});

describe('Körper: alte Spielstände', () => {
  it('migration derives the same value as generation, without an rng (deterministic, repeatable)', () => {
    const p = generatePlayer(createRng(77), { role: 'fwd', tier: 'stark' });
    const old = JSON.parse(JSON.stringify(p));
    delete old.attrs.strength; // so sah ein Spieler vor der Änderung aus
    expect(ensureStrength(old)).toBe(true);
    expect(old.attrs.strength).toBe(p.attrs.strength);
    expect(ensureStrength(old)).toBe(false); // vorhandener Wert bleibt
  });

  it('the old e2e save loads, every player has a strength and a second load gives the identical numbers', () => {
    const raw = readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8');
    const c1 = importCareer(raw);
    const c2 = importCareer(raw);
    const club = humanClub(c1);
    expect(club.squad.length).toBeGreaterThan(5);
    for (const idx of club.squad) {
      const s = playerOf(c1, idx).attrs.strength;
      expect(s).toBeGreaterThanOrEqual(0.05);
      expect(s).toBeLessThanOrEqual(0.98);
      expect(s).toBe(playerOf(c2, idx).attrs.strength);
    }
  });

  it('custom players (you, children) of an old save get their strength on load, identical to a fresh derivation', () => {
    const c = createCareer({ seed: 41, coach: { first: 'Max', last: 'Muster', age: 33, style: 'dauerlaeufer', profession: 'Koch', relation: 'single', children: [] } });
    const idx = c.coach.idx;
    expect(c.custom[idx].attrs.strength).toBeGreaterThan(0);
    const fresh = c.custom[idx].attrs.strength;
    // ein Spielstand ohne Körper: Wert bei allen eigenen Spielern entfernen (so sah er vor der Änderung aus)
    const stripped = JSON.parse(JSON.stringify(c));
    for (const p of Object.values(stripped.custom)) delete p.attrs.strength;
    const back = importCareer(JSON.stringify(stripped));
    const me = playerOf(back, idx);
    expect(me.attrs.strength).toBe(deriveStrength(back.custom[idx]));
    expect(me.attrs.strength).toBe(fresh); // Stil ohne Körper-Aufschlag: dieselbe Ableitung wie beim Anlegen
    // zweites Laden: identisch
    expect(playerOf(importCareer(JSON.stringify(stripped)), idx).attrs.strength).toBe(me.attrs.strength);
  });

  it('the coach avatar: style Stopper adds body on top of the derived value', () => {
    const base = { first: 'A', last: 'B', age: 30, style: 'spielmacher', look: {} };
    const stopper = createCoachPlayer({ ...base, style: 'ausputzer' }, 5);
    const playmaker = createCoachPlayer(base, 5);
    expect(stopper.attrs.strength).toBeGreaterThan(playmaker.attrs.strength);
  });
});

describe('Körper: Entwicklung', () => {
  it('grows when young, falls slowly after 30, and does not change the other attributes’ development', () => {
    const c = createCareer({ seed: 52 });
    const club = humanClub(c);
    const young = club.squad.find((i) => playerOf(c, i).age <= 23);
    const old = club.squad.find((i) => playerOf(c, i).age >= 36);
    const sum = { young: 0, old: 0 };
    for (let s = 0; s < 12; s++) {
      c.season++;
      developPlayers(c);
    }
    if (young != null) sum.young = c.players[young].delta.strength;
    if (old != null) sum.old = c.players[old].delta.strength;
    expect(typeof c.players[club.squad[0]].delta.strength).toBe('number');
    if (young != null) expect(sum.young).toBeGreaterThan(sum.old);
  });
});

// Zwei Spieler am Ball: Stehen beide dicht dran, würfelt dribbleTouch (shielded) den Klau. Hier ohne Fremde in der Nähe.
function duel({ carrierStr, chalStr, seed, shielding = false, protectedUntil = 0 }) {
  const m = createMatch({ seed: 1, pitch: PITCHES.rasenplatz, human: false, duration: 60, aiCoach: false });
  m.rng = createRng(seed);
  const carrier = m.players.find((p) => p.team === 0 && p.role !== 'gk');
  const chal = m.players.find((p) => p.team === 1 && p.role !== 'gk');
  for (const p of m.players) {
    p.pos = { x: 40 + p.id.length, z: 30 + m.players.indexOf(p) };
    p.vel = { x: 0, z: 0 };
    p.kickCooldown = 1;
  }
  carrier.pos = { x: 0, z: 0 };
  chal.pos = { x: 0.3, z: 0 };
  carrier.kickCooldown = 0;
  chal.kickCooldown = 0;
  carrier.attrs = { ...carrier.attrs, technique: 0.5, strength: carrierStr };
  chal.attrs = { ...chal.attrs, tackling: 0.5, strength: chalStr };
  carrier.shielding = shielding;
  carrier.protectUntil = protectedUntil;
  m.ball.pos = { x: 0.28, y: 0.11, z: 0 };
  m.ball.vel = { x: 0, y: 0, z: 0 };
  m.ball.holder = null;
  m.ball.lastTouch = carrier.id;
  m.ball.lastAction = 'dribble';
  m.lastTouchTeam = 0;
  m.controlledId = null;
  dribbleTouch(m);
  return { m, carrier, chal, won: m.ball.lastTouch === chal.id };
}
const rate = (opts, n = 600) => {
  let w = 0;
  for (let s = 0; s < n; s++) w += duel({ ...opts, seed: 1000 + s }).won ? 1 : 0;
  return w / n;
};

describe('Körper im Zweikampf (shielded)', () => {
  it('the stronger challenger takes the ball more often, the stronger carrier keeps it more often', () => {
    const strongChal = rate({ carrierStr: 0.3, chalStr: 0.7 });
    const even = rate({ carrierStr: 0.5, chalStr: 0.5 });
    const strongCarrier = rate({ carrierStr: 0.7, chalStr: 0.3 });
    expect(strongChal).toBeGreaterThan(even + 0.04);
    expect(even).toBeGreaterThan(strongCarrier + 0.04);
  });

  it('standing and shielding, the body is the main factor (steal chance spread ≥ 0.2 between 0.2 and 0.8)', () => {
    const weak = rate({ carrierStr: 0.2, chalStr: 0.5, shielding: true });
    const strong = rate({ carrierStr: 0.8, chalStr: 0.5, shielding: true });
    expect(weak - strong).toBeGreaterThan(0.2);
    expect(STRENGTH_FX.shieldPerStrength).toBeGreaterThan(0.3);
  });
});

describe('Ping-Pong-Bremse A + B', () => {
  it('A: after a stolen ball the previous carrier cannot take it back by touch for 0.6 s', () => {
    for (let s = 0; s < 80; s++) {
      const r = duel({ carrierStr: 0.5, chalStr: 0.5, seed: 4000 + s });
      if (!r.won) continue;
      expect(r.carrier.kickCooldown).toBeGreaterThanOrEqual(PINGPONG.loserLock);
      expect(r.chal.protectUntil).toBeCloseTo(r.m.time + PINGPONG.winnerProtect, 6);
      return;
    }
    throw new Error('kein Klau in 80 Versuchen');
  });

  it('B: the winner is protected – the steal chance is halved while protected', () => {
    const free = rate({ carrierStr: 0.5, chalStr: 0.5 }, 1500);
    const prot = rate({ carrierStr: 0.5, chalStr: 0.5, protectedUntil: 10 }, 1500);
    expect(prot).toBeLessThan(free * 0.65); // erwartet ≈ 0,5
    expect(prot).toBeGreaterThan(free * 0.35);
  });

  it('own team-mate touches do not lock anyone', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.rasenplatz, human: false, duration: 60, aiCoach: false });
    const [a, b] = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
    for (const p of m.players) { p.pos = { x: 40, z: 30 + m.players.indexOf(p) }; p.kickCooldown = 1; }
    a.kickCooldown = 0;
    b.pos = { x: 0, z: 0 };
    b.kickCooldown = 0;
    m.ball.pos = { x: 0.1, y: 0.11, z: 0 };
    m.ball.vel = { x: 0, y: 0, z: 0 };
    m.ball.lastTouch = a.id;
    m.ball.lastAction = 'pass';
    m.lastTouchTeam = 0;
    dribbleTouch(m);
    expect(m.ball.lastTouch).toBe(b.id);
    expect(a.kickCooldown).toBe(0);
    expect(b.protectUntil).toBe(0);
  });
});
