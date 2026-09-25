// Ersatzbank & Wechsel. Wie im Hobbyfußball: rollende Wechsel bei jeder
// Unterbrechung, wer raus ist, darf später wieder rein.
import { dist2d } from '../core/math.js';
import { formationSpot } from './formation.js';

export function makeEntity(pl, team, index, role, home) {
  return {
    ...pl,
    id: `${team}-${index}`,
    team,
    role,
    home,
    pos: { ...home },
    vel: { x: 0, z: 0 },
    facing: { x: team === 0 ? 1 : -1, z: 0 },
    stamina: 1,
    charge: 0,
    charging: false,
    pending: null,
    kickCooldown: 0,
    kickAnim: 0,
    headAnim: 0,
    diveAnim: 0,
    diveSide: 0,
    catchCooldown: 0,
    holdTimer: 0,
    decideTimer: 0,
    dribbleDir: null,
    aimZ: 0,
    state: 'normal', // normal | tackle | poke | recover | down | complain
    stateTimer: 0,
    tackleWon: false,
    tackleHits: [],
    complainNext: null,
    setPieceAction: null,
    injury: null,
    mood: null, // Torjubel: scorer | celebrate | sad
  };
}

export const allPlayers = (m) => [...m.players, ...m.bench[0], ...m.bench[1]];
export const findAnyPlayer = (m, id) => allPlayers(m).find((p) => p.id === id) ?? null;

// Auf der Bank erholt man sich (Zigarette an der Eckfahne inklusive).
export function restBench(m, dt) {
  for (const team of m.bench) for (const p of team) p.stamina = Math.min(1, p.stamina + 0.02 * dt);
}

// Menschlicher Wechselwunsch: der Müdeste raus, der Frischeste rein.
export function requestSub(m, team) {
  if (!m.bench[team].length) return false;
  m.subRequests[team] = true;
  m.events.push({ type: 'sub_requested', team });
  return true;
}

// Wird an jeder Unterbrechung aufgerufen (Standard, Tor, Halbzeit).
export function processSubs(m) {
  for (let team = 0; team < 2; team++) {
    const human = team === m.humanTeam;
    if (human && !m.subRequests[team]) continue;
    m.subRequests[team] = false;
    const bench = m.bench[team];
    if (!bench.length) continue;
    const onPitch = m.players.filter((p) => p.team === team && p.role !== 'gk');
    const tired = onPitch.reduce((a, b) => (b.stamina < a.stamina ? b : a), onPitch[0]);
    if (!tired) continue;
    // Die KI wechselt erst, wenn jemand wirklich platt ist.
    if (!human && (tired.stamina > 0.45 || m.rng.next() < 0.3)) continue;
    // Wer selbst wechselt, entscheidet selbst – die KI nur für echte Frische.
    // Wer erst zur zweiten Halbzeit kommt, sitzt vorher noch im Auto.
    const ready = bench.filter((b) => !(b.late && m.half === 1));
    const fresh = human ? ready : ready.filter((b) => b.stamina > tired.stamina + 0.2);
    if (!fresh.length) continue;
    const incoming = fresh.find((b) => b.position === tired.role) ?? fresh.reduce((a, b) => (b.stamina > a.stamina ? b : a));
    substitute(m, tired, incoming);
  }
}

export function substitute(m, out, incoming) {
  const idx = m.players.indexOf(out);
  const bench = m.bench[out.team];
  bench.splice(bench.indexOf(incoming), 1);
  bench.push(out);
  Object.assign(incoming, {
    role: out.role,
    home: out.home,
    formationEntry: out.formationEntry,
    pos: { x: 0, z: m.pitch.halfWidth - 0.6 }, // kommt an der Mittellinie rein
    vel: { x: 0, z: 0 },
    facing: { ...out.facing },
    state: 'normal',
    stateTimer: 0,
    pending: null,
    mood: null,
  });
  out.pending = null;
  out.charging = false;
  out.charge = 0;
  m.players[idx] = incoming;
  if (m.controlledId === out.id) m.controlledId = incoming.id;
  if (m.ball.holder === out.id) m.ball.holder = null;
  m.events.push({ type: 'sub', team: out.team, outId: out.id, inId: incoming.id });
}

// Seitenwechsel: neue Grundpositionen für alle.
export function swapSides(m) {
  m.sidesSwapped = !m.sidesSwapped;
  for (const p of [...m.players, ...m.bench[0], ...m.bench[1]]) {
    if (p.formationEntry) p.home = formationSpot(m.pitch, p.formationEntry, p.team, m.sidesSwapped);
  }
}

export const nearestTo = (list, pos) => list.reduce((a, b) => (dist2d(b.pos, pos) < dist2d(a.pos, pos) ? b : a));
