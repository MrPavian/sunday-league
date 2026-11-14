// Einwurf: Mitspieler bieten sich an, der Werfer wartet kurz auf sie (ai.js throwInOffers, THROWIN).
// Gemessen mit scripts/throwin-check.mjs (40 Spiele je Platz): zuerst am Ball ist ein Mitspieler in 81 / 85 / 92 % der Einwürfe
// (7er / 9er / Großfeld; vorher 75 / 50 / 38 %), ohne freien Mitspieler in Wurfweite 2 / 4 / 1 % (vorher 55 / 77 / 88 %).
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { startSetPiece } from '../src/sim/setpieces.js';
import { THROWIN, throwInOffers } from '../src/sim/ai.js';

const measure = (venue, games, seed0) => {
  const pitch = PITCHES[venue];
  const s = { n: 0, mate: 0, wait: [], alone: 0 };
  for (let i = 0; i < games; i++) {
    const m = createMatch({ seed: seed0 + i, pitch, human: false });
    let pending = null;
    let track = null;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'setpiece') pending = e.kind === 'throwin' ? { taker: e.playerId, t: m.time, team: e.team } : null;
        if (track && e.type === 'out') track = null;
      }
      if (pending && m.setPiece?.taken && m.ball.holder !== pending.taker) {
        const t = m.players.find((p) => p.id === pending.taker);
        const near = m.players.filter((p) => p.team === pending.team && p.id !== pending.taker && p.role !== 'gk' && Math.hypot(p.pos.x - t.pos.x, p.pos.z - t.pos.z) <= THROWIN.near + 3);
        // Weiter Einwurf (ai.js longThrowPlan, seit 2026-11-14): Die Mitspieler laufen gewollt in den Strafraum – kein „allein“.
        if (!near.length && !m.setPiece?.longPlan) s.alone++;
        s.wait.push(m.time - pending.t);
        track = { taker: pending.taker, team: pending.team };
        pending = null;
      }
      if (track && m.ball.lastTouch && m.ball.lastTouch !== track.taker) {
        s.n++;
        if (m.players.find((q) => q.id === m.ball.lastTouch).team === track.team) s.mate++;
        track = null;
      }
      m.events.length = 0;
    }
  }
  return s;
};

describe('Einwurf mit Anspielstationen', () => {
  it('zwei Mitspieler bekommen Laufziele: einer kurz im Feld, einer die Linie entlang', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.sportplatz, human: false });
    startSetPiece(m, { type: 'throwin', team: 0, spot: { x: 5, z: m.pitch.halfWidth } });
    const mates = m.players.filter((p) => p.team === 0);
    const offers = throwInOffers(m, 0, mates);
    expect(offers.size).toBe(2);
    expect(offers.has(m.setPiece.takerId)).toBe(false);
    const spots = [...offers.values()];
    for (const sp of spots) {
      expect(Math.abs(sp.z)).toBeLessThan(m.pitch.halfWidth); // im Feld
      expect(Math.hypot(sp.x - 5, sp.z - m.pitch.halfWidth)).toBeLessThanOrEqual(THROWIN.near + 1);
    }
    expect(spots[0].x).not.toBe(spots[1].x);
    expect([...offers.keys()].every((id) => mates.find((p) => p.id === id).role !== 'gk')).toBe(true);
  });

  it('nach dem Wurf ist meist ein Mitspieler zuerst am Ball, und der Werfer wartet nicht ewig', () => {
    for (const [venue, seed] of [['sportplatz', 700], ['grossfeld', 700]]) {
      const s = measure(venue, 5, seed);
      expect(s.n, venue).toBeGreaterThan(8);
      expect(s.mate / s.n, `${venue}: Mitspieler zuerst am Ball`).toBeGreaterThan(0.65);
      expect(s.alone / s.wait.length, `${venue}: Werfer allein`).toBeLessThan(0.15);
      expect(Math.max(...s.wait), `${venue}: längstes Warten`).toBeLessThan(1 + THROWIN.wait + 1.5); // Pause + Warten + Wurf
    }
  }, 120000); // zehn ganze Spiele: im vollen Lauf mit allen Workern über 20 s (2026-11-14 an der Standardgrenze gescheitert)
});
