// Reaktionen der Figuren auf Schüsse und Tore – nur Darstellung, aus den Ereignissen der Simulation.
// Ohne three.js und DOM, damit es sich mit der Simulation allein prüfen lässt (tests/reactions.test.js).

import { attackDir } from '../sim/players.js';

// Vergebene Chance: Der Schütze greift sich an den Kopf (Pfosten, Latte, vorbei) oder winkt ab
// (gehalten); der Torwart ballt nach der Parade kurz die Faust. state merkt sich den letzten Schuss.
// Liefert [{ id, gesture, time, face? }].
export function shotReactions(state, match) {
  const out = [];
  const teamOf = (id) => match.players.find((q) => q.id === id)?.team;
  const missed = (gesture) => {
    const s = state.lastShot;
    if (!s || match.time - s.time > 2.5) return;
    out.push({ id: s.id, gesture, time: 1.4, face: gesture === 'haende' ? 'sad' : 'angry' });
    state.lastShot = null;
  };
  for (const e of match.events) {
    if (e.type === 'shot') state.lastShot = { id: e.playerId, team: teamOf(e.playerId), time: match.time };
    else if (e.type === 'goal') state.lastShot = null;
    else if (e.type === 'save' && state.lastShot) {
      missed('abwinken');
      out.push({ id: e.playerId, gesture: 'geballt', time: 0.8 });
    } else if (e.type === 'post' || e.type === 'bar') missed('haende');
    else if (e.type === 'out' && e.restart === 'goalkick' && state.lastShot && e.team !== state.lastShot.team) missed('haende');
  }
  return out;
}

// Jubel der Mitspieler: am Torschützen in die Traube, auf dem Weg dorthin mit erhobenem Arm,
// sonst der eigene Jubel.
export function mateCelebration(match, p, own) {
  if (p.mood !== 'celebrate' || p.role === 'gk') return own;
  const sc = match.players.find((q) => q.id === match.lastGoal?.scorerId);
  if (!sc || sc === p) return own;
  if (Math.hypot(sc.pos.x - p.pos.x, sc.pos.z - p.pos.z) < 1.6) return 'umarmen';
  return Math.hypot(p.vel.x, p.vel.z) > 2.5 ? 'hinterher' : own;
}

// Schiri zeigt an: Ecke, Abstoß und Elfmeter zum Punkt (dort liegt der Ball), Freistoß und Einwurf in
// Angriffsrichtung der ausführenden Mannschaft, nach dem Tor zur Mitte. Liefert { x, z, time } oder null:
// den Punkt, auf den er zeigt (Freistoß/Einwurf: 10 m vor ihm in Angriffsrichtung).
export function refereeSignal(match, attackDir) {
  const r = match.referee;
  if (!r) return null;
  let sig = null;
  for (const e of match.events) {
    if (e.type === 'goal') sig = { x: 0, z: 0, time: 1.6 };
    else if (e.type === 'setpiece' && (e.kind === 'corner' || e.kind === 'goalkick' || e.kind === 'penalty')) sig = { x: match.ball.pos.x, z: match.ball.pos.z, time: 1.4 };
    else if (e.type === 'setpiece' && (e.kind === 'freekick' || e.kind === 'throwin')) sig = { x: r.pos.x + attackDir(match, e.team) * 10, z: r.pos.z, time: 1.2 };
  }
  return sig;
}

// Wechsel an der Mittellinie: Der Ausgewechselte steht neben dem Neuen, beide klatschen ab (0,6 s), dann
// trottet er über die Seitenlinie raus (1,8 s). sub = { x, z, t }; liefert Pose und Ort oder done.
export const SUB_FIVE = 0.6;
export const SUB_WALK = 1.8;
export function subScene(sub, dt) {
  sub.t += dt;
  const out = Math.sign(sub.z) || 1; // Richtung über die Seitenlinie
  if (sub.t < SUB_FIVE) return { x: sub.x + 0.55, z: sub.z, angle: -Math.PI / 2, speed: 0, gesture: 'abklatschen' };
  const w = sub.t - SUB_FIVE;
  if (w > SUB_WALK) return { done: true };
  return { x: sub.x + 0.55, z: sub.z + out * w * 1.5, angle: out > 0 ? 0 : Math.PI, speed: 1.5, gesture: null };
}

// Ausgepumpt: niedrige Ausdauer und er steht oder trabt (Sprint zeigt Anstrengung, keine Erschöpfung).
// was = war er es im Bild davor – weite Schwellen verhindern Flackern an der Grenze.
export const TIRED_STAMINA = 0.3;
export const TIRED_SPEED = 3.2;
export function tiredFace(p, was = false) {
  if (p.state !== 'normal' || p.injury) return false;
  const k = was ? 1.2 : 1;
  return p.stamina < TIRED_STAMINA * k && Math.hypot(p.vel.x, p.vel.z) < TIRED_SPEED * k;
}

// Torwart-Darstellung (nur Anzeige, aus Ball und Spielern abgeleitet).

// Wie er fängt, je nach Ballhöhe im Moment des Zugreifens: hoch über dem Kopf (ab 1,5 m wie in der
// Simulation „hoher Ball“), vor der Brust, oder tief vor dem Körper (Bauch/Knie).
export function catchKind(y) {
  return y >= 1.5 ? 'kopf' : y >= 0.8 ? 'brust' : 'tief';
}

// Fausten: kommt der Ball hoch und mittig (seitlicher Abstand zum Torwart in m), schlägt er mit beiden
// Fäusten zu, sonst nur mit der Seite des Balls: 'beide', 'links' oder 'rechts' (rechts = +x der Figur).
export function punchStyle(lateral) {
  return Math.abs(lateral) < 0.5 ? 'beide' : lateral > 0 ? 'rechts' : 'links';
}

// Breitmachen im 1 gegen 1: 0…1, wenn ein Gegner den Ball am Fuß vor dem eigenen Tor auf ihn zuführt
// (ab 7 m langsam, ab 4 m ganz). Nur wenn der Torwart nahe seinem Tor steht und frei ist.
export function wideStance(match, gk) {
  const ball = match.ball;
  if (match.phase !== 'play' || ball.holder || gk.state !== 'normal' || gk.diveAnim > 0 || ball.pos.y > 0.8) return 0;
  const s = attackDir(match, gk.team);
  if (Math.abs(gk.pos.x + s * match.pitch.halfLength) > 10) return 0;
  let best = 0;
  for (const o of match.players) {
    if (o.team === gk.team || o.role === 'gk' || o.state !== 'normal' || ball.lastTouch !== o.id) continue;
    if (Math.hypot(o.pos.x - ball.pos.x, o.pos.z - ball.pos.z) > 1.4) continue;
    if ((o.pos.x - gk.pos.x) * s < -0.3) continue; // nicht hinter ihm
    const d = Math.hypot(o.pos.x - gk.pos.x, o.pos.z - gk.pos.z);
    best = Math.max(best, Math.min(1, Math.max(0, (7 - d) / 3)));
  }
  return best;
}

// Abpraller: ein abgewehrter Ball ohne Festhalten (Ereignis „save“ ohne Fausten), der nach vorn wegspringt –
// die Hände klappen zurück. Lenkt er ihn über die Latte oder ums Tor (Ball fliegt Richtung Torlinie,
// src/sim/actions.js „tip“), war das Absicht: kein Abpraller. ball = Ball direkt nach dem Ereignis.
export const isFumble = (e, match) => {
  if (e.type !== 'save' || e.punch) return false;
  const gk = match.players.find((p) => p.id === e.playerId);
  return !gk || match.ball.vel.x * attackDir(match, gk.team) > 0;
};

// --- Spielfluss (nur Darstellung) -------------------------------------------------------

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Einwurf mit Anlauf: Der Werfer steht in der Simulation von Anfang an auf dem Punkt und hält den Ball.
// Gezeigt wird er die ersten THROW_RUN Sekunden nach dem Pfiff ein paar Schritte weiter hinten an der
// Linie, er läuft an und steht dann am Punkt – dort wirft er. Liefert null, wenn kein Anlauf läuft, sonst
// { id, u (0 → 1 Fortschritt), dir (Richtung des Anlaufs entlang der Linie, ±1), off (Meter hinter dem Punkt),
// speed (m/s), turn (0 → 1: von der Laufrichtung in die Wurfrichtung drehen) }. Hinten bleibt es auf dem Platz.
export const THROW_RUN = 1.5;
export const THROW_STEPS = 2.4;
const THROW_PAUSE = 1.0; // Pause vor dem Einwurf in der Simulation (setpieces.js FREEZE)
export function throwInRun(match) {
  const sp = match.setPiece;
  if (!sp || sp.type !== 'throwin' || sp.taken || (match.phase !== 'setpiece' && match.phase !== 'play')) return null;
  const p = match.players.find((q) => q.id === sp.takerId);
  if (!p || match.ball.holder !== p.id || p.state !== 'normal') return null;
  const dir = attackDir(match, sp.team);
  // Die Spielzeit steht in der Pause vor dem Wurf (Simulation: 1 s); danach läuft sie weiter.
  const since = match.phase === 'setpiece' ? THROW_PAUSE - match.phaseTimer : THROW_PAUSE + match.time - sp.time;
  const u = clamp01(since / THROW_RUN);
  const back = Math.max(0, Math.min(THROW_STEPS, match.pitch.halfLength - 0.3 + dir * p.pos.x));
  return { id: p.id, u, dir, off: back * (1 - u) ** 1.5, speed: ((back * 1.5) / THROW_RUN) * (1 - u) ** 0.5, turn: smoothstep(0.6, 1, u) };
}

// Mit welchem Fuß geschossen wird: liegt der Ball deutlich rechts (links) neben der Blickrichtung, mit
// diesem Fuß, sonst bleibt es beim bisherigen (prev ±1). Standbein steht dann neben dem Ball.
export function kickFoot(p, ball, prev = 1) {
  const lateral = (ball.pos.x - p.pos.x) * p.facing.z - (ball.pos.z - p.pos.z) * p.facing.x;
  return lateral > 0.12 ? 1 : lateral < -0.12 ? -1 : prev;
}

// Zweikampf um den Ball: Der Ballführende (letzter Kontakt war Dribbling, Ball am Fuß) und der nächste Gegner, wenn sie
// Schulter an Schulter stehen (ab DUEL_FAR m Abstand beginnt das Anlehnen, ab DUEL_NEAR voll). Liefert je
// Beteiligtem { id, foe, k 0…1, shield: schirmt den Ball ab (nur der Ballführende, Simulation: p.shielding) }.
export const DUEL_NEAR = 0.8;
export const DUEL_FAR = 1.4;
export function duelPairs(match) {
  const out = [];
  const ball = match.ball;
  if (match.phase !== 'play' || ball.holder || ball.pos.y > 0.8) return out;
  const c = match.players.find((q) => q.id === ball.lastTouch);
  if (!c || c.role === 'gk' || c.state !== 'normal' || ball.lastAction !== 'dribble' || Math.hypot(c.pos.x - ball.pos.x, c.pos.z - ball.pos.z) > 1.5) return out;
  let foe = null;
  let fd = DUEL_FAR;
  for (const o of match.players) {
    if (o.team === c.team || o.role === 'gk' || (o.state !== 'normal' && o.state !== 'poke')) continue;
    const d = Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z);
    if (d < fd) (fd = d), (foe = o);
  }
  if (!foe) return out;
  const k = clamp01((DUEL_FAR - fd) / (DUEL_FAR - DUEL_NEAR));
  out.push({ id: c.id, foe: foe.id, k, shield: !!c.shielding }, { id: foe.id, foe: c.id, k, shield: false });
  return out;
}

// Richtung zum Gegner in der Figur (0 = vorn, positiv = rechts), aus Blickwinkel a (Bogenmaß, wie
// group.rotation.y) und Versatz (dx, dz) zum Gegner.
export function foeBearing(a, dx, dz) {
  return Math.atan2(dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a));
}
