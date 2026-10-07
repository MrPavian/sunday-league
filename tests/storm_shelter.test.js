// Gewitter: Schiri und Spieler laufen zu einem echten Unterstand – ohne durch Wände, Autos, Banden, Bänke,
// Tribünenstufen oder Kisten zu laufen – und stehen dort mit Abstand. Je Spielort mehrere Seeds.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { INFLATE, SLOT_GAP, shelterFor } from '../src/sim/shelter.js';

const DT = 1 / 60;
const VENUES = ['hinterhof', 'parkplatz', 'park', 'ascheplatz', 'rasenplatz', 'sportplatz', 'grossfeld'];
const SEEDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const BODY = 0.12; // so weit darf ein Körper höchstens in ein Hindernis ragen (Körpermitte gilt)

const inRect = (r, p, e) => p.x > r.x0 - e && p.x < r.x1 + e && p.z > r.z0 - e && p.z < r.z1 + e;

function storm(venue, seed) {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: 80, incidents: true });
  m.incidentPlan = { type: 'gewitter', at: 2 };
  for (let i = 0; i < 60 * 60 && m.incident?.type !== 'gewitter'; i++) stepMatch(m, undefined, DT);
  expect(m.incident?.type, `${venue}/${seed}`).toBe('gewitter');
  return m;
}

describe('Gewitter: Unterstand', () => {
  for (const venue of VENUES) {
    it(`${venue}: Plätze liegen frei und weit genug auseinander`, () => {
      const sh = shelterFor(PITCHES[venue]);
      for (const [i, a] of sh.slots.entries()) {
        for (const r of sh.obstacles) expect(inRect(r, a, INFLATE - 0.05), `Platz ${i} im Hindernis`).toBe(false);
        for (const b of sh.slots.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z), `Plätze ${i}`).toBeGreaterThanOrEqual(SLOT_GAP + 0.2);
      }
      const n = PITCHES[venue].format * 2 + (PITCHES[venue].referee ? 1 : 0);
      expect(sh.slots.length, 'genug Plätze').toBeGreaterThanOrEqual(n);
    });

    it(`${venue}: kein Frame in einem Hindernis, am Ende alle im Unterstand mit Abstand, Schiri zuerst`, () => {
      for (const seed of SEEDS) {
        const m = storm(venue, seed);
        const sh = shelterFor(m.pitch);
        const first = new Map();
        let last = null;
        let frames = 0;
        while (m.incident && frames++ < 60 * 60) {
          stepMatch(m, undefined, DT);
          const all = [...(m.referee ? [{ id: 'ref', pos: m.referee.pos }] : []), ...m.players.map((p) => ({ id: p.id, pos: p.pos }))];
          for (const e of all) {
            const hit = sh.obstacles.find((r) => inRect(r, e.pos, -BODY));
            expect(hit, `${venue}/${seed} ${e.id} bei ${e.pos.x.toFixed(2)},${e.pos.z.toFixed(2)} t=${m.incident?.t?.toFixed(2)}`).toBeUndefined();
          }
          if (m.incident) {
            for (const id of m.incident.sheltered) if (!first.has(id)) first.set(id, m.incident.t);
            last = { all: all.map((e) => ({ id: e.id, x: e.pos.x, z: e.pos.z })), sheltered: new Set(m.incident.sheltered) };
          }
        }
        expect(m.incident, `${venue}/${seed} endet`).toBeNull();
        expect(m.incidents.at(-1).type).toBe('gewitter');
        // Am Ende steht jeder auf einem Platz des Unterstands …
        expect(last.sheltered.size, `${venue}/${seed} angekommen`).toBe(last.all.length);
        for (const e of last.all) expect(sh.slots.some((s) => Math.hypot(s.x - e.x, s.z - e.z) < 1e-6), `${venue}/${seed} ${e.id} nicht auf einem Platz`).toBe(true);
        // … mit mindestens 0,5 m Abstand zu jedem anderen.
        for (const [i, a] of last.all.entries()) for (const b of last.all.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z), `${venue}/${seed} ${a.id}/${b.id}`).toBeGreaterThanOrEqual(SLOT_GAP);
        // Der Schiri ist als Erster da.
        if (m.referee || first.has('ref')) {
          const others = [...first].filter(([id]) => id !== 'ref').map(([, t]) => t);
          expect(first.get('ref'), `${venue}/${seed} Schiri`).toBeLessThan(Math.min(...others));
        }
      }
    }, 120000);
  }
});
