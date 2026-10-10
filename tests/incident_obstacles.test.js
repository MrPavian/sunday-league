// Vorfälle mit Bewegung (Taube, Hund, Zaun, Sprenger, Polizei, Autoalarm, Ersatzschiri): Spieler, Schiri und Besucher
// laufen nicht durch Wände, Banden, Bänke, Autos, Zäune – dieselben Hindernisse wie beim Gewitter (shelter.js).
// Ausnahme: der Zaun-Kletterer am Ballfangzaun (gewollt). Ein Hund läuft unter hüfthohen Geländern durch.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { BUND_PITCHES, PITCHES as BASE_PITCHES } from '../src/sim/pitch.js';
import { incidentOnBall, VENUE_INCIDENTS } from '../src/sim/incidents.js';
import { crossesObstacle, shelterFor, walkObstacles } from '../src/sim/shelter.js';

const PITCHES = { ...BASE_PITCHES, ...BUND_PITCHES };
const DT = 1 / 60;
const BODY = 0.12; // so weit darf ein Körper höchstens in ein Hindernis ragen (Körpermitte gilt, wie beim Gewitter)
const VENUES = ['hinterhof', 'parkplatz', 'park', 'ascheplatz', 'rasenplatz', 'sportplatz', 'grossfeld', 'stadion', 'grossfeld_tribuene'];
const typesOf = (venue) => VENUE_INCIDENTS[PITCHES[venue].base ?? venue].filter((t) => t !== 'gewitter');
const SEEDS = [3, 4, 5, 6, 7, 8];

// Dünne Zäune zählen mit dem kleineren Maß (Körpermitte in der Hälfte der Dicke), dicke mit BODY.
const tol = (r) => Math.min(BODY, 0.45 * Math.min(r.x1 - r.x0, r.z1 - r.z0));
const within = (r, p) => p.x > r.x0 + tol(r) && p.x < r.x1 - tol(r) && p.z > r.z0 + tol(r) && p.z < r.z1 - tol(r);

// Spieler und Schiri zählen, solange der Vorfall läuft (danach ist es wieder das normale Spiel); Besucher und Hund, solange sie da sind.
function figures(m) {
  const out = [];
  if (m.referee && m.incident) out.push({ id: 'Schiri', pos: m.referee.pos });
  if (m.incident) for (const p of m.players) out.push({ id: p.id, pos: p.pos });
  for (const v of m.visitors ?? []) out.push({ id: v.id, pos: v.pos });
  if (m.dog) out.push({ id: 'Hund', pos: m.dog.pos, dog: true });
  return out;
}

// Prüft ein Bild: Körpermitte in keinem Hindernis und kein Sprung quer durch eines. Gibt eine Fehlerbeschreibung oder null zurück.
function check(m, prev, label) {
  const climber = m.incident?.type === 'zaun' ? m.incident.climber : null;
  const sh = shelterFor(m.pitch);
  for (const f of figures(m)) {
    if (climber && f.id === climber.id && climber.ct >= 0) continue; // am Ballfangzaun: gewollt
    const obs = f.dog ? walkObstacles(m.pitch, true) : sh.obstacles;
    const hit = obs.find((r) => within(r, f.pos));
    const where = `${label} ${f.id} bei ${f.pos.x.toFixed(2)},${f.pos.z.toFixed(2)} t=${m.incident?.t?.toFixed(2)}`;
    if (hit) return `${where} steht im Hindernis`;
    const was = prev.get(f.id);
    if (was && Math.hypot(was.x - f.pos.x, was.z - f.pos.z) < 1.5 && !obs.some((r) => within(r, was)) && crossesObstacle(obs.filter((r) => Math.min(r.x1 - r.x0, r.z1 - r.z0) < 0.5), was, f.pos)) return `${where} geht durch ein dünnes Hindernis`;
    prev.set(f.id, { x: f.pos.x, z: f.pos.z });
  }
  return null;
}

// Spielt den Vorfall und danach, bis Hund und Besucher weg sind; Autoalarm und Zaun ohne Mauer werden per Ballereignis ausgelöst.
function run(venue, type, seed, tweak) {
  const m = createMatch({ seed, pitch: PITCHES[venue], human: false, duration: 80, incidents: true });
  m.incidentPlan = { type, at: 2 };
  const prev = new Map();
  const label = `${venue}/${type}/${seed}`;
  let seen = false;
  let quiet = 0;
  for (let i = 0; i < 60 * 200 && m.phase !== 'ended'; i++) {
    if (m.incidentPlan && m.time > 2) {
      if (type === 'autoalarm') incidentOnBall(m, { type: 'car', x: 4, z: m.pitch.halfWidth + 1 });
      if (type === 'zaun' && m.pitch.boundary !== 'walls') incidentOnBall(m, { type: 'out', flying: true, x: m.pitch.halfLength + 2, z: 0 });
    }
    stepMatch(m, undefined, DT);
    if (m.incident && !seen) {
      seen = true;
      tweak?.(m);
    }
    if (!seen) continue;
    const bad = check(m, prev, label);
    if (bad) return { m, bad, seen };
    if (!m.incident && !m.visitors?.length && !m.dog && ++quiet > 30) break;
  }
  return { m, bad: null, seen };
}

describe('Vorfälle: nicht durch Hindernisse', () => {
  for (const venue of VENUES) {
    for (const type of typesOf(venue)) {
      it(`${venue}/${type}: kein Frame in einem Hindernis`, () => {
        for (const seed of SEEDS) {
          const r = run(venue, type, seed);
          expect(r.seen, `${venue}/${type}/${seed} findet statt`).toBe(true);
          expect(r.bad ?? undefined).toBeUndefined();
        }
      }, 300000);
    }
  }

  // Taube am Rand: Sie sitzt in der Ecke, an der Linie, hinter der Linie, auf Bande, Garage, Zaun. Dazu stehen drei Spieler
  // nahe dran. Wer sie nicht auf freiem Weg erreicht, bleibt stehen.
  for (const venue of VENUES) {
    it(`${venue}/taube: Taube am Rand oder hinter einem Hindernis, keiner läuft durch`, () => {
      const { halfLength: hl, halfWidth: hw } = PITCHES[venue];
      const spots = [];
      for (const k of [-0.4, 0.6, 1.5, 2.6, 3.8]) for (const s of [-1, 1]) spots.push({ x: 0, z: s * (hw + k) }, { x: s * (hl * 0.5), z: s * (hw + k) }, { x: s * (hl + k), z: 0 }, { x: s * (hl + k), z: s * (hw * 0.5) });
      let tried = 0;
      for (const [i, spot] of spots.entries()) {
        const seed = 20 + (i % 4);
        const { bad, seen } = run(venue, 'taube', seed, (m) => {
          const pg = m.pigeon;
          Object.assign(pg, { state: 'picken', y: 0, t: 0, land: { ...spot } });
          pg.pos.x = spot.x;
          pg.pos.z = spot.z;
          const sh = shelterFor(m.pitch);
          let n = 0;
          for (const p of m.players.filter((q) => q.role !== 'gk')) {
            // Drei Spieler 2 bis 5 m von der Taube, auf dem Platz (oder gleich am Rand), nicht schon im Hindernis.
            const q = { x: Math.max(-hl + 0.5, Math.min(hl - 0.5, spot.x + 2 + n)), z: Math.max(-hw + 0.5, Math.min(hw - 0.5, spot.z + (spot.z > 0 ? -2 : 2))) };
            if (sh.obstacles.some((r) => within(r, q))) continue;
            p.pos.x = q.x;
            p.pos.z = q.z;
            if (++n === 3) break;
          }
        });
        expect(seen).toBe(true);
        expect(bad ?? undefined, `Taube bei ${spot.x.toFixed(1)},${spot.z.toFixed(1)}`).toBeUndefined();
        tried++;
      }
      expect(tried).toBe(spots.length);
    }, 600000);
  }
});
