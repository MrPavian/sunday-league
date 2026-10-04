// Reaktionen der Figuren auf Schüsse und Tore – nur Darstellung, aus den Ereignissen der Simulation.
// Ohne three.js und DOM, damit es sich mit der Simulation allein prüfen lässt (tests/reactions.test.js).

import { attackDir } from '../sim/players.js';
import { CLIMB } from '../sim/incidents.js';

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

// Vorfälle: Wie die Figuren auf dem Platz reagieren (nur Darstellung, aus dem Stand der Simulation: wer rennt,
// wer steht, wer ist am Zaun). Gesten: PlayerModel.js. Liefert { gesture, cover, lift } – das Objekt wird
// wiederverwendet (out), also nicht aufheben. i = Platz in match.players (die Simulation verteilt Rollen nach i).
const POSE = { gesture: null, cover: 0, lift: 0 };

// Höhe am Zaun in m: hoch (CLIMB.up), oben (CLIMB.top), wieder runter (CLIMB.down); ct = Zeit seit dem Ankommen.
export function climbLift(ct) {
  if (!(ct > 0)) return 0;
  const { up, top, down, height } = CLIMB;
  const ease = (t) => t * t * (3 - 2 * t);
  if (ct < up) return height * ease(ct / up);
  if (ct < up + top) return height;
  return ct < up + top + down ? height * (1 - ease((ct - up - top) / down)) : 0;
}

export function incidentPose(match, p, i, out = POSE) {
  out.gesture = null;
  out.cover = 0;
  out.lift = 0;
  const inc = match.incident;
  if (!inc || p.state !== 'normal') return out;
  const speed = Math.hypot(p.vel.x, p.vel.z);
  const { pitch } = match;
  switch (inc.type) {
    case 'gewitter':
      // Rennen mit den Händen über dem Kopf; unterm Vordach angekommen frieren sie (Arme verschränkt).
      if (speed > 1.5) out.cover = 1;
      else if (p.pos.z < -pitch.halfWidth - 1 && i % 2) out.gesture = 'arme';
      break;
    case 'sprenger':
      // Wer nass wird, rennt weg (Hände vors Gesicht); die anderen zeigen auf den Sprenger oder schimpfen.
      if (speed > 1.5) out.cover = 1;
      else out.gesture = i % 3 === 0 ? 'schimpfen' : i % 3 === 1 ? 'zeigen' : null;
      break;
    case 'hund':
      if (match.dog && p.role !== 'gk' && Math.hypot(match.dog.pos.x - p.pos.x, match.dog.pos.z - p.pos.z) < 3) out.gesture = 'scheuchen';
      break;
    case 'taube': {
      const pg = match.pigeon;
      if (pg && pg.state !== 'gleiten' && Math.hypot(pg.pos.x - p.pos.x, pg.pos.z - p.pos.z) < 2.3) out.gesture = 'scheuchen';
      break;
    }
    case 'zaun': {
      const { climber, fence } = inc;
      if (!climber || !fence) break;
      if (p.id === climber.id) {
        if (climber.ct > 0 && !climber.done) {
          out.gesture = 'klettern';
          out.lift = climbLift(climber.ct);
        }
      } else if (inc.helpers.includes(p.id)) {
        if (Math.hypot(fence.x - p.pos.x, fence.z - p.pos.z) < 2.2) out.gesture = 'zaun';
      } else if (match.ball.lastTouch === p.id) out.gesture = 'haende';
      else if (inc.lost && i % 3 === 0 && speed < 1) out.gesture = 'schimpfen';
      break;
    }
    case 'autoalarm':
      // Der Schütze fasst sich an den Kopf, die anderen zeigen aufs Auto.
      out.gesture = match.ball.lastTouch === p.id ? 'haende' : i % 4 === 3 ? null : 'zeigen';
      break;
    case 'polizei':
      if (match.visitors?.some((v) => v.gesture && v.id.startsWith('polizei')) && i % 3 === 0) out.gesture = 'arme';
      break;
    case 'ersatzschiri': {
      const r = match.referee;
      if (r && inc.helpers.includes(p.id) && Math.hypot(r.pos.x - p.pos.x, r.pos.z - p.pos.z) < 2.5) out.gesture = 'schulter';
      else if (i % 2) out.gesture = 'arme';
      break;
    }
  }
  return out;
}

// Der verletzte Schiri hält sich den Oberschenkel, bis ein Zuschauer die Pfeife nimmt.
export const refereePose = (match) => (match.incident?.type === 'ersatzschiri' ? 'wade' : null);
