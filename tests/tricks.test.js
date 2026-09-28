import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';
import { acrobaticTouch, landAcro, tricksOf, TRICKS } from '../src/sim/tricks.js';
import { attackDir } from '../src/sim/players.js';

function newMatch(pitchId, seed) {
  const pitch = PITCHES[pitchId];
  const rng = createRng(seed * 7919);
  const roles = [...systemFormation(pitch.format ?? 5).map((f) => f.role), 'def', 'mid', 'fwd'];
  const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[i], roles), tactic: { style: 'ausgewogen' } }));
  return createMatch({ seed, pitch, teams, human: false, aiCoach: false, duration: 120 });
}
const person = (over = {}) => ({ id: 'x', name: 'Kalle Test', role: 'fwd', position: 'fwd', age: 25, traits: [], attrs: { technique: 0.5, passing: 0.5, pace: 0.5, stamina: 0.5, tackling: 0.5, shooting: 0.5, heading: 0.5, keeping: 0.1 }, ...over });

describe('Tricks und Akrobatik', () => {
  it('Repertoire: fest aus Werten und Name, Technik entscheidet, Torhüter tricksen nicht', () => {
    const artist = person({ attrs: { ...person().attrs, technique: 0.95, passing: 0.5 } });
    expect(tricksOf(artist)).toEqual(tricksOf({ ...artist }));
    expect(tricksOf(artist).tricks.length).toBeGreaterThanOrEqual(3);
    expect(tricksOf(person({ attrs: { ...person().attrs, technique: 0.3 } })).tricks).toEqual([]);
    const gk = person({ role: 'gk', position: 'gk', attrs: { ...person().attrs, technique: 0.95 } });
    expect(tricksOf(gk)).toEqual({ tricks: [], acro: false });
    expect(tricksOf(person({ traits: ['ex_profi'], attrs: { ...person().attrs, technique: 0.72 } })).tricks).toContain('uebersteiger');
  });

  it('im Spiel: nur Spieler mit Repertoire tricksen, gelingt mal, misslingt mal', () => {
    const seen = { n: 0, ok: 0, kinds: new Set() };
    for (const [id, seed] of [['rasenplatz', 1], ['ascheplatz', 2], ['halle', 3], ['park', 4], ['parkplatz', 5], ['rasenplatz', 6]]) {
      const m = newMatch(id, seed);
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        for (const e of m.events) {
          if (e.type !== 'trick') continue;
          const p = m.players.find((q) => q.id === e.playerId);
          expect(tricksOf(p).tricks).toContain(e.trick);
          expect(TRICKS[e.trick]).toBeTruthy();
          seen.n++;
          if (e.ok) seen.ok++;
          seen.kinds.add(e.trick);
        }
        m.events.length = 0;
      }
    }
    expect(seen.n).toBeGreaterThan(3);
    expect(seen.ok).toBeGreaterThan(0);
    expect(seen.ok).toBeLessThan(seen.n);
  }, 120000);

  it('Fallrückzieher: Rücken zum Tor, Ball in Brusthöhe → Schuss aufs Tor, danach liegt er kurz', () => {
    const m = newMatch('rasenplatz', 3);
    m.phase = 'play';
    const p = m.players.find((q) => q.role !== 'gk' && q.team === 0);
    Object.defineProperty(p, '_tricks', { value: { tricks: [], acro: true }, configurable: true });
    const s = attackDir(m, 0);
    p.pos = { x: s * (m.pitch.halfLength - 7), z: 0 };
    p.facing = { x: -s, z: 0 };
    p.kickCooldown = 0;
    for (const q of m.players) if (q !== p) q.pos = { x: -s * 5, z: 3 };
    let tries = 0;
    let hit = false;
    while (!hit && tries++ < 40) {
      p.kickCooldown = 0;
      m.ball.holder = null;
      m.ball.pos = { x: p.pos.x + 0.3, y: 1.4, z: 0 };
      m.ball.vel = { x: 0, y: -1, z: 0 };
      m.events.length = 0;
      hit = acrobaticTouch(m);
    }
    expect(hit).toBe(true);
    const shot = m.events.find((e) => e.type === 'shot');
    expect(shot.acro).toBe('fallrueck');
    expect(p.state).toBe('acro');
    expect(m.ball.vel.x * s).toBeGreaterThan(0); // Richtung gegnerisches Tor
  });

  it('harte Landung: meist Prellung, nie mit noKnocks; ohne Pech steht er wieder auf', () => {
    const kinds = new Set();
    for (let i = 0; i < 20; i++) {
      const m = newMatch('ascheplatz', 1);
      m.rng = { next: () => (i % 10) / 10, chance: () => true, range: (a) => a };
      m.events.length = 0;
      const p = m.players.find((q) => q.role !== 'gk');
      p.state = 'acro';
      p.acro = 'fallrueck';
      landAcro(m, p);
      const inj = m.events.find((e) => e.type === 'injury');
      expect(inj).toBeTruthy();
      kinds.add(inj.kind);
    }
    expect(kinds.has('prellung')).toBe(true);
    const m = newMatch('rasenplatz', 1);
    m.noKnocks = true;
    m.rng = { next: () => 0, chance: () => true, range: (a) => a };
    const p = m.players.find((q) => q.role !== 'gk');
    p.state = 'acro';
    landAcro(m, p);
    expect(m.events.some((e) => e.type === 'injury')).toBe(false);
    expect(p.state).toBe('recover');
  });
});
