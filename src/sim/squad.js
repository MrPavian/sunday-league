// Ersatzbank & Wechsel. Gewechselt wird bei jeder Unterbrechung. Die Regeln kommen
// vom Spiel (m.subRule): in der Freizeitliga beliebig oft, ab der Kreisklasse
// begrenzt. Einen Rückwechsel gibt es nirgends (vom Nutzer festgelegt, 2026-10-23): raus ist raus. Verletzte müssen runter – ohne Ersatz geht es in Unterzahl
// weiter.
import { dist2d } from '../core/math.js';
import { formationSpot } from './formation.js';
import { setControlled } from './players.js';
import { applyPositionMalus, bestForRole, posGrade } from './position.js';

// windows: wie oft im Spiel gewechselt werden darf (Unterbrechungen mit Wechseln; die Halbzeit zählt nicht mit).
export const FREE_SUBS = { limit: Infinity, reentry: false, windows: Infinity };
export const LIMITED_SUBS = { limit: 4, reentry: false, windows: Infinity }; // Einstellung „begrenzt“
// Wechselregeln je Liga (recherchiert 2026-11-05, Nutzerwunsch „Regeln der Ligen einhalten“):
//  - Amateure (Kreisklasse bis Oberliga): fünf Auswechslungen bei den Herren – Sächsischer FV, Hinweise Spielbetrieb 2024/25
//    (§ 56 Abs. 7 SFV-Spielordnung), Württembergischer FV, Schiedsrichter-Merkblatt 2024/25. Eine Begrenzung der
//    Wechselgelegenheiten nennen die Amateurbestimmungen nicht. Rückwechsel nur in einzelnen untersten Kreisklassen einiger
//    Verbände – im Spiel nirgends (Nutzerentscheid 2026-10-23: raus ist raus).
//  - Regionalliga und 3. Liga: fünf Auswechslungen in höchstens drei Wechselgelegenheiten, dazu die Halbzeitpause (DFB-
//    Fußballregeln 2023/24, Regel 3; für die 3. Liga Durchführungsbestimmungen zu § 31 Nr. 3a DFB-Spielordnung). Für die
//    Regionalliga fand sich keine eigene Bestimmung – sie spielt nach denselben Regeln (hergeleitet).
export const AMATEUR_SUBS = { limit: 5, reentry: false, windows: Infinity };
export const PRO_SUBS = { limit: 5, reentry: false, windows: 3 };
export const BEZIRK_SUBS = AMATEUR_SUBS; // alter Name

// Welche Regel gilt? mode aus den Einstellungen: 'liga' (Freizeitliga frei, ab der Kreisklasse fünf Wechsel, Profiligen
// zusätzlich drei Gelegenheiten; Freundschaftsspiele frei), 'frei' oder 'begrenzt'.
export function subRuleFor(mode, level = null) {
  if (mode === 'frei') return FREE_SUBS;
  if (mode === 'begrenzt') return LIMITED_SUBS;
  if ((level ?? 1) >= 9) return PRO_SUBS;
  return (level ?? 1) > 1 ? AMATEUR_SUBS : FREE_SUBS;
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
    protectUntil: 0, // Ballgewinn per Berührung: bis dahin halbe Klauchance (strength.js PINGPONG)
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
    // Felder, die erst im Spiel dazukommen: von Anfang an da (undefined, also wie fehlend), damit alle Spieler dieselbe Form
    // haben – der JavaScript-Motor rechnet dann schneller (gemessen 2026-11-06). Im Spielstand stehen sie nicht (JSON lässt
    // undefined weg).
    shielding: undefined,
    holdingId: undefined,
    trickAnim: undefined,
    acroAnim: undefined,
    keeperTz: undefined,
    supportTimer: undefined,
    supportSpot: undefined,
    boxState: undefined,
    holdUpStart: undefined,
    holdUp: undefined,
    recoverFrom: undefined,
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
  return planSubs(m, team, [{ outId, inId }]);
}
// Mehrere Wechsel auf einmal (vom Nutzer gewünscht 2026-11-05): alle bei der nächsten Unterbrechung, zusammen eine Gelegenheit.
// Ungültige Paare (doppelt, nicht auf dem Platz, nicht auf der Bank) fallen weg; mehr als die verbleibenden Wechsel geht nicht.
export function planSubs(m, team, pairs) {
  const outs = new Set();
  const ins = new Set();
  const ok = [];
  for (const { outId, inId } of pairs) {
    if (ok.length >= subsLeft(m, team) || outs.has(outId) || ins.has(inId)) continue;
    const out = m.players.find((p) => p.id === outId && p.team === team);
    const inn = usableBench(m, team).find((p) => p.id === inId);
    if (!out || !inn) continue;
    outs.add(outId);
    ins.add(inId);
    ok.push({ outId, inId });
  }
  if (!ok.length) return false;
  (m.subPlan ??= [null, null])[team] = ok;
  m.events.push({ type: 'sub_requested', team });
  return true;
}

const rule = (m) => m.subRule ?? FREE_SUBS;
export const subsLeft = (m, team) => rule(m).limit - (m.subsUsed?.[team] ?? 0);
// Wechselgelegenheiten: In der Halbzeit zählt es nicht (Regel 3).
export const windowsLeft = (m, team) => (rule(m).windows ?? Infinity) - (m.subWindows?.[team] ?? 0);
const atHalftime = (m) => m.phase === 'halftime';
export const canSubNow = (m, team) => subsLeft(m, team) > 0 && (atHalftime(m) || windowsLeft(m, team) > 0);
// Geplante Wechsel (mehrere auf einmal, eine Unterbrechung): Liste von { outId, inId }; alte Spielstände hatten ein Paar.
export const plannedSubs = (m, team) => {
  const p = m.subPlan?.[team];
  return !p ? [] : Array.isArray(p) ? p : [p];
};
// Wer darf rein? Nicht verletzt, nicht schon ausgewechselt, nicht noch im Auto.
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
    applyPositionMalus(keeper); // Feldspieler im Tor
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
    const before = m.subsUsed?.[team] ?? 0;
    processTeam(m, team);
    // Eine Gelegenheit verbraucht, wenn in dieser Unterbrechung gewechselt wurde (nicht in der Halbzeit).
    if ((m.subsUsed?.[team] ?? 0) > before && !atHalftime(m) && Number.isFinite(rule(m).windows ?? Infinity)) (m.subWindows ??= [0, 0])[team]++;
  }
}
function processTeam(m, team) {
  {
    // 1. Verletzte zuerst – egal, wer coacht.
    for (const hurt of m.players.filter((p) => p.team === team && p.mustLeave)) {
      const pool = canSubNow(m, team) ? usableBench(m, team) : [];
      // Dieselbe Rolle zuerst, sonst der mit dem kleinsten Positionsabzug (ein Feldspieler ersetzt keinen Torwart, wenn es anders geht).
      const incoming = pool.length ? bestForRole(hurt.role === 'gk' ? pool : pool.filter((b) => b.position !== 'gk').length ? pool.filter((b) => b.position !== 'gk') : pool, hurt.role) : null;
      if (incoming) substitute(m, hurt, incoming, { forced: true });
      else leaveInjured(m, hurt);
    }
    // 2. Selbst geplanter Wechsel.
    const plan = plannedSubs(m, team);
    if (plan.length) {
      m.subPlan[team] = null;
      m.subRequests[team] = false;
      for (const pair of plan) {
        const out = m.players.find((p) => p.id === pair.outId);
        const inn = usableBench(m, team).find((p) => p.id === pair.inId);
        if (out && inn && canSubNow(m, team)) substitute(m, out, inn);
      }
      return;
    }
    // 3. Automatisch: Wer selbst spielt oder coacht, wechselt nur auf Wunsch.
    const human = team === m.humanTeam || (m.manager && team === m.coachTeam);
    if (human && !m.subRequests[team]) return;
    m.subRequests[team] = false;
    if (!canSubNow(m, team)) return;
    // Begrenzte Wechsel: Die KI hält den letzten für eine Verletzung zurück, bis es spät ist.
    if (!human && Number.isFinite(rule(m).limit) && Math.min(subsLeft(m, team), usableBench(m, team).length) === 1 && m.time < m.duration * 0.8) return;
    // Begrenzte Gelegenheiten (Profiligen): die letzte hält die KI ebenso zurück.
    if (!human && windowsLeft(m, team) === 1 && !atHalftime(m) && m.time < m.duration * 0.8) return;
    const ready = usableBench(m, team);
    if (!ready.length) return;
    const onPitch = m.players.filter((p) => p.team === team && p.role !== 'gk');
    const tired = onPitch.reduce((a, b) => (b.stamina < a.stamina ? b : a), onPitch[0]);
    if (!tired) return;
    // Die KI wechselt erst, wenn jemand wirklich platt ist.
    if (!human && (tired.stamina > 0.45 || m.rng.next() < 0.3)) return;
    // Die KI wechselt nur auf die eigene Position. Gibt es keinen frischen Ersatz dafür, bleibt der Müde draußen
    // (ein Nachbar oder gar ein Feldspieler auf weiter Position wäre mit Abzug oft schlechter als der Müde).
    const fresh = human ? ready : ready.filter((b) => b.stamina > tired.stamina + 0.2 && posGrade(b.position, tired.role) === 'own');
    if (!fresh.length) return;
    const incoming = bestForRole(fresh, tired.role); // Position vor Frische, sonst kleinster Abzug
    substitute(m, tired, incoming);
  }
}

export function substitute(m, out, incoming, { forced = false } = {}) {
  const idx = m.players.indexOf(out);
  const bench = m.bench[out.team];
  bench.splice(bench.indexOf(incoming), 1);
  bench.push(out);
  (m.subsUsed ??= [0, 0])[out.team]++;
  // Ausgewechselt (kein Rückwechsel) oder verletzt: Für ihn ist das Spiel vorbei.
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
  applyPositionMalus(incoming); // neue Rolle = neue Werte (Einwechsler auf fremder Position)
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
