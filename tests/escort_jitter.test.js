// Begleiter des verletzten Schiris: ruhiges Gehen statt Zappeln.
// Gemessen am alten Verhalten (Ziel hinter dem laufenden Schiri, Tempo 3,2 gegen 1,1, Totbereich 0,8 m), je 6 Seeds:
// Blicksprung pro Schritt bis 3,13 rad (Halle) / 1,59 rad (Rasen), 1.635-2.159 Schritte mit Drehung über 0,2 rad,
// 1.488-1.979 Wechsel über die 2,5-m/s-Schwelle, Tempoänderung bis 3,2 m/s in einem Schritt.
// Neu: höchstens 0,12 rad pro Schritt (Drehrate 7 rad/s bei 60 Hz), keine Drehung über 0,2 rad, je Helfer höchstens
// 2-3 Schwellenwechsel (einmal hoch, einmal runter), Tempoänderung höchstens 0,3 m/s pro Schritt.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const DT = 1 / 60;
const MIN_NEAR = 0.75; // gemessen: nach der Ankunft 0,82 (Halle, am Ende geht der Schiri durch die Tür) bis 1,0

function escort(venue, seed) {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: 80, incidents: true });
  if (!m.referee) return null;
  m.incidentPlan = { type: 'ersatzschiri', at: 2 };
  for (let i = 0; i < 3600 && m.incident?.type !== 'ersatzschiri'; i++) stepMatch(m, undefined, DT);
  if (m.incident?.type !== 'ersatzschiri') return null;
  const ids = [...m.incident.helpers];
  const prev = new Map();
  const st = new Map(ids.map((id) => [id, { maxTurn: 0, big: 0, thr: 0, maxDv: 0, near: 0, after: 0, arrived: false }]));
  while (m.incident) {
    stepMatch(m, undefined, DT);
    if (!m.incident) break;
    for (const id of ids) {
      const p = m.players.find((q) => q.id === id);
      const s = st.get(id);
      const f = Math.atan2(p.facing.x, p.facing.z);
      const sp = Math.hypot(p.vel.x, p.vel.z);
      const pv = prev.get(id);
      if (pv) {
        let d = Math.abs(f - pv.f);
        if (d > Math.PI) d = 2 * Math.PI - d;
        s.maxTurn = Math.max(s.maxTurn, d);
        if (d > 0.2) s.big++;
        if (sp > 2.5 !== pv.sp > 2.5) s.thr++;
        s.maxDv = Math.max(s.maxDv, Math.abs(sp - pv.sp));
      }
      // Ab dem ersten Erreichen (unter 2,5 m) bleibt er beim Schiri.
      const near = Math.hypot(p.pos.x - m.referee.pos.x, p.pos.z - m.referee.pos.z) < 2.5;
      if (near) s.arrived = true;
      if (s.arrived) (s.after++, near && s.near++);
      prev.set(id, { f, sp });
    }
  }
  return [...st.values()];
}

describe('Ersatzschiri: Begleiter gehen ruhig', () => {
  for (const venue of ['rasenplatz', 'sportplatz', 'grossfeld', 'halle']) {
    it(`${venue}: kein Blicksprung, keine Ruck-Tempowechsel (Seeds 1-6)`, () => {
      let runs = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const res = escort(venue, seed);
        if (!res) continue;
        runs++;
        for (const s of res) {
          expect(s.maxTurn, `${venue}/${seed} Drehung pro Schritt`).toBeLessThanOrEqual(0.13);
          expect(s.big, `${venue}/${seed} Drehungen über 0,2 rad`).toBe(0);
          expect(s.thr, `${venue}/${seed} Schwellenwechsel`).toBeLessThanOrEqual(4);
          expect(s.maxDv, `${venue}/${seed} Tempoänderung pro Schritt`).toBeLessThanOrEqual(0.3);
          expect(s.arrived, `${venue}/${seed} erreicht den Schiri`).toBe(true);
          expect(s.near / s.after, `${venue}/${seed} Anteil beim Schiri nach Ankunft`).toBeGreaterThan(MIN_NEAR);
        }
      }
      expect(runs).toBeGreaterThan(0);
    }, 120000);
  }
});
