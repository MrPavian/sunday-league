// Ersatzbank & Wechsel. Gewechselt wird bei jeder Unterbrechung. Die Regeln kommen
// vom Spiel (m.subRule): in der Freizeitliga rollend mit Rückwechsel, in der
// Kreisklasse begrenzt. Verletzte müssen runter – ohne Ersatz geht es in Unterzahl
// weiter.
import { dist2d } from '../core/math.js';
import { formationSpot } from './formation.js';
import { setControlled } from './players.js';

export const FREE_SUBS = { limit: Infinity, reentry: true };
export const LIMITED_SUBS = { limit: 4, reentry: false };
export const BEZIRK_SUBS = { limit: 5, reentry: false }; // Bezirksliga: fünf Wechsel, kein Rückwechsel (z. B. FVM 2024/25)

// Welche Regel gilt? mode aus den Einstellungen: 'liga' (Freizeitliga frei, ab der
// Kreisklasse begrenzt; Freundschaftsspiele frei), 'frei' oder 'begrenzt'.
export function subRuleFor(mode, level = null) {
  if (mode === 'frei') return FREE_SUBS;
  if (mode === 'begrenzt') return LIMITED_SUBS;
  if ((level ?? 1) >= 5) return BEZIRK_SUBS;
  return (level ?? 1) > 1 ? LIMITED_SUBS : FREE_SUBS;
}

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
    stamina: pl.fitness ?? 1, // Karriere: Fitness = Startausdauer (sonst voll)
    charge: 0,
    charging: false,
    pending: null,
    kickCooldown: 0,
    kickAnim: 0,
    headAnim: 0,
    diveAnim: 0,
    jumpAnim: 0,
    punchAnim: 0,
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
    yellow: 0,
  };
}

// Alle, die in diesem Spiel dabei sind – auch der Nachzügler aus dem Stau (Spieltags-Überraschung),
// der erst später in m.players kommt. Die 3D-Ansicht baut ihre Modelle aus dieser Liste.
export const allPlayers = (m) => [...m.players, ...m.bench[0], ...m.bench[1], ...(m.sentOff ?? []), ...(m.lateArrival ? [m.lateArrival.player] : [])];
export const findAnyPlayer = (m, id) => allPlayers(m).find((p) => p.id === id) ?? null;

// Auf der Bank erholt man sich (Zigarette an der Eckfahne inklusive).
export function restBench(m, dt) {
  for (const team of m.bench) for (const p of team) p.stamina = Math.min(p.fitness ?? 1, p.stamina + 0.02 * dt);
}

// Menschlicher Wechselwunsch ohne Auswahl: der Müdeste raus, der Frischeste rein.
export function requestSub(m, team) {
  if (!usableBench(m, team).length || !subsLeft(m, team)) return false;
  m.subRequests[team] = true;
  m.events.push({ type: 'sub_requested', team });
  return true;
}

// Geplanter Wechsel: genau dieser raus, genau der rein – bei der nächsten Unterbrechung.
export function planSub(m, team, outId, inId) {
  const out = m.players.find((p) => p.id === outId && p.team === team);
  const inn = usableBench(m, team).find((p) => p.id === inId);
  if (!out || !inn || !subsLeft(m, team)) return false;
  (m.subPlan ??= [null, null])[team] = { outId, inId };
  m.events.push({ type: 'sub_requested', team });
  return true;
}

const rule = (m) => m.subRule ?? FREE_SUBS;
export const subsLeft = (m, team) => rule(m).limit - (m.subsUsed?.[team] ?? 0);
// Wer darf rein? Nicht verletzt, nicht schon ausgewechselt (ohne Rückwechsel), nicht noch im Auto.
export const usableBench = (m, team) => m.bench[team].filter((b) => !b.usedUp && !b.mustLeave && !(b.late && m.half === 1));

// Verletzt und kein Ersatz: Er geht vom Platz, die Mannschaft spielt mit einem weniger.
function leaveInjured(m, p) {
  const i = m.players.indexOf(p);
  if (i < 0) return;
  m.players.splice(i, 1);
  p.injuredOff = true;
  m.sentOff.push(p);
  if (m.ball.holder === p.id) m.ball.holder = null;
  const mates = m.players.filter((q) => q.team === p.team);
  // Ohne Torwart geht einer ins Tor – der, der am nächsten dran steht.
  if (p.role === 'gk' && mates.length) {
    const goalX = p.home.x;
    const keeper = mates.reduce((a, b) => (Math.abs(b.pos.x - goalX) < Math.abs(a.pos.x - goalX) ? b : a));
    Object.assign(keeper, { role: 'gk', home: p.home, formationEntry: p.formationEntry });
  }
  if (m.controlledId === p.id) {
    const next = mates.filter((q) => q.role !== 'gk').sort((a, b) => dist2d(a.pos, m.ball.pos) - dist2d(b.pos, m.ball.pos))[0];
    if (next) setControlled(m, next.id);
    else m.controlledId = null;
  }
  m.events.push({ type: 'injury_off', team: p.team, playerId: p.id });
}

// Wird an jeder Unterbrechung aufgerufen (Standard, Tor, Halbzeit).
export function processSubs(m) {
  for (let team = 0; team < 2; team++) {
    // 1. Verletzte zuerst – egal, wer coacht.
    for (const hurt of m.players.filter((p) => p.team === team && p.mustLeave)) {
      const pool = subsLeft(m, team) > 0 ? usableBench(m, team) : [];
      const incoming = pool.find((b) => (hurt.role === 'gk' ? b.position === 'gk' : b.position === hurt.role)) ?? pool.find((b) => b.position !== 'gk') ?? pool[0];
      if (incoming) substitute(m, hurt, incoming, { forced: true });
      else leaveInjured(m, hurt);
    }
    // 2. Selbst geplanter Wechsel.
    const plan = m.subPlan?.[team];
    if (plan) {
      m.subPlan[team] = null;
      m.subRequests[team] = false;
      const out = m.players.find((p) => p.id === plan.outId);
      const inn = usableBench(m, team).find((p) => p.id === plan.inId);
      if (out && inn && subsLeft(m, team) > 0) substitute(m, out, inn);
      continue;
    }
    // 3. Automatisch: Wer selbst spielt oder coacht, wechselt nur auf Wunsch.
    const human = team === m.humanTeam || (m.manager && team === m.coachTeam);
    if (human && !m.subRequests[team]) continue;
    m.subRequests[team] = false;
    if (subsLeft(m, team) <= 0) continue;
    // Begrenzte Wechsel: Die KI hält den letzten für eine Verletzung zurück, bis es spät ist.
    if (!human && Number.isFinite(rule(m).limit) && Math.min(subsLeft(m, team), usableBench(m, team).length) === 1 && m.time < m.duration * 0.8) continue;
    const ready = usableBench(m, team);
    if (!ready.length) continue;
    const onPitch = m.players.filter((p) => p.team === team && p.role !== 'gk');
    const tired = onPitch.reduce((a, b) => (b.stamina < a.stamina ? b : a), onPitch[0]);
    if (!tired) continue;
    // Die KI wechselt erst, wenn jemand wirklich platt ist.
    if (!human && (tired.stamina > 0.45 || m.rng.next() < 0.3)) continue;
    const fresh = human ? ready : ready.filter((b) => b.stamina > tired.stamina + 0.2);
    if (!fresh.length) continue;
    const incoming = fresh.find((b) => b.position === tired.role) ?? fresh.reduce((a, b) => (b.stamina > a.stamina ? b : a));
    substitute(m, tired, incoming);
  }
}

export function substitute(m, out, incoming, { forced = false } = {}) {
  const idx = m.players.indexOf(out);
  const bench = m.bench[out.team];
  bench.splice(bench.indexOf(incoming), 1);
  bench.push(out);
  (m.subsUsed ??= [0, 0])[out.team]++;
  // Verletzt oder ohne Rückwechsel: Für ihn ist das Spiel vorbei.
  if (out.mustLeave || !rule(m).reentry) out.usedUp = true;
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
  m.events.push({ type: 'sub', team: out.team, outId: out.id, inId: incoming.id, forced });
}

// Seitenwechsel: neue Grundpositionen für alle.
export function swapSides(m) {
  m.sidesSwapped = !m.sidesSwapped;
  for (const p of [...m.players, ...m.bench[0], ...m.bench[1]]) {
    if (p.formationEntry) p.home = formationSpot(m.pitch, p.formationEntry, p.team, m.sidesSwapped);
  }
}
