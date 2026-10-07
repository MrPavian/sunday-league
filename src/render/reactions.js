// Reaktionen der Figuren auf Schüsse und Tore – nur Darstellung, aus den Ereignissen der Simulation.
// Ohne three.js und DOM, damit es sich mit der Simulation allein prüfen lässt (tests/reactions.test.js).

import { attackDir } from '../sim/players.js';
import { CLIMB } from '../sim/incidents.js';
import { subsLeft, usableBench } from '../sim/squad.js';

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

// --- Zuschauer (nur Darstellung) ---------------------------------------------------------
// Wie die Menge auf ein Ereignis reagiert, je nach Anhängerschaft. Liefert [{ who, kind, share, dur }]:
// who = Anhänger dieser Mannschaft (0/1), 'neutral' oder 'all'; kind = Bewegung (crowd.js); share = Anteil der
// Betroffenen (0…1), dur = Dauer in s. state merkt sich den letzten Schuss (für Pfosten, Parade, vorbei).
// Anteile und Dauern sind gewählt, nicht gemessen.
export const CHANCE_NEAR = 8; // „Chance“: Schuss aus höchstens so vielen Metern plus 0,3 · halbe Platzlänge vom Tor
export const isChance = (match, p) => {
  const gx = attackDir(match, p.team) * match.pitch.halfLength;
  return Math.hypot(gx - p.pos.x, p.pos.z) <= CHANCE_NEAR + 0.3 * match.pitch.halfLength;
};
export function crowdCues(state, match, e) {
  const last = state.lastShot && match.time - state.lastShot.time <= 3 ? state.lastShot : null;
  switch (e.type) {
    case 'goal': {
      const sc = e.ownGoal ? 1 - e.team : e.team;
      state.lastShot = null;
      return [{ who: sc, kind: 'cheer', share: 0.95, dur: 4 }, { who: 'neutral', kind: 'clap', share: 0.6, dur: 3 }, { who: 1 - sc, kind: 'head', share: 0.45, dur: 2.5 }];
    }
    case 'shot': {
      const p = match.players?.find((q) => q.id === e.playerId);
      if (!p) return [];
      state.lastShot = { team: p.team, time: match.time };
      if (!e.acro && !isChance(match, p)) return [{ who: 'all', kind: 'lean', share: 0.3, dur: 1.2 }];
      // Chance: die Anhänger des Schützen stehen auf und recken die Arme, die anderen halten die Luft an.
      return [{ who: p.team, kind: 'rise', share: 0.55, dur: 1.8 }, { who: 'neutral', kind: 'lean', share: e.acro ? 0.6 : 0.4, dur: 1.2 }, { who: 1 - p.team, kind: 'lean', share: 0.35, dur: 1.2 }];
    }
    case 'save': {
      const k = match.players?.find((q) => q.id === e.playerId);
      if (!k) return [{ who: 'all', kind: 'clap', share: 0.3, dur: 1.8 }];
      return [{ who: 1 - k.team, kind: 'head', share: last ? 0.5 : 0.2, dur: 1.6 }, { who: k.team, kind: 'clap', share: 0.45, dur: 1.8 }, { who: 'neutral', kind: 'clap', share: 0.3, dur: 1.5 }];
    }
    case 'post':
    case 'bar':
      return last ? [{ who: last.team, kind: 'head', share: 0.7, dur: 1.6 }, { who: 1 - last.team, kind: 'lean', share: 0.3, dur: 1 }, { who: 'neutral', kind: 'head', share: 0.4, dur: 1.4 }] : [{ who: 'all', kind: 'head', share: 0.4, dur: 1.6 }];
    case 'out':
      return e.restart === 'goalkick' && last && e.team !== last.team ? [{ who: last.team, kind: 'head', share: 0.4, dur: 1.4 }] : [];
    case 'trick':
      return e.ok ? [{ who: 'all', kind: 'clap', share: 0.22, dur: 1.4 }] : [];
    case 'foul':
    case 'card':
      return [{ who: 'all', kind: 'point', share: 0.18, dur: 1.5 }];
    default:
      return [];
  }
}

// --- Aufwärmen am Rand (nur Darstellung) --------------------------------------------------
// Auswechselspieler laufen hinter der Seitenlinie (Gegenseite, neben den Bänken) hin und her, hopsen und
// dehnen sich. Die Simulation weiß davon nichts: Wer aufwärmt, steht dort in match.bench und hat kein Spiel.
// Plätze mit Auswechselbank bzw. Platz hinter der Linie (die anderen Spielorte haben keinen Streifen).
// Der Park hat keine Bank und hätte das Grafik-Budget (e2e) mit zusätzlichen Figuren gerissen: dort kein Aufwärmen.
export const WARMUP_PITCHES = ['rasenplatz', 'sportplatz', 'grossfeld', 'ascheplatz'];
export const WARMUP_HOME = 1; // so viele der Heimmannschaft (je Figur ≈ 2 Draw Calls und ≈ 0,9 Tsd. Dreiecke, gemessen; mehr passt nicht ins Budget des Ascheplatzes)
export const WARMUP_AWAY = 1; // und so viele des Gasts
export const WARMUP_LANE = 0.6; // Abstand der Bahnen hinter der Linie (m): zwei Figuren berühren sich im Vorbeilaufen nicht

// Wer wärmt sich auf? Höchstens count Bankspieler der Mannschaft, die noch eingewechselt werden dürfen:
// zuerst der geplante Einwechselspieler (Wechsel ist angesagt), dann der, den die KI für den müdesten
// Feldspieler nehmen würde (gleiche Position), dann der Rest der Bank in Bankreihenfolge.
// exclude: Ausgewechselte (sie sitzen jetzt, sie wärmen sich nicht gleich wieder auf).
export function warmupPicks(match, team, count, exclude = null) {
  if (count <= 0 || !match.bench || subsLeft(match, team) <= 0) return [];
  const pool = usableBench(match, team).filter((b) => !exclude?.has(b.id));
  if (!pool.length) return [];
  const out = [];
  const take = (b) => b && !out.includes(b) && out.length < count && out.push(b);
  const plan = match.subPlan?.[team];
  if (plan) take(pool.find((b) => b.id === plan.inId));
  let tired = null;
  for (const p of match.players) if (p.team === team && p.role !== 'gk' && (!tired || p.stamina < tired.stamina)) tired = p;
  if (tired) take(pool.find((b) => b.position === tired.role));
  for (const b of pool) take(b);
  return out;
}

// Streifen hinter der Seitenlinie der Gegenseite (z < 0, Kamera steht auf der anderen Seite): von x0 bis x1,
// neben der Bank der Mannschaft (Mannschaft 0 links, 1 rechts – unabhängig vom Seitenwechsel), lane = Bahn.
// null, wo es keinen Platz gibt. Maße im Verhältnis zur Platzlänge: Bank steht bei ±5,5·hl/26, Eckfahne bei hl.
export function warmupSpot(match, team, lane = 0) {
  const { pitch } = match;
  if (!pitch || !WARMUP_PITCHES.includes(pitch.id)) return null;
  const s = team === 0 ? -1 : 1;
  const a = s * pitch.halfLength * 0.31;
  const b = s * pitch.halfLength * 0.65;
  return { x0: Math.min(a, b), x1: Math.max(a, b), z: -pitch.halfWidth - 0.5 - lane * WARMUP_LANE };
}

// Ablauf eines Aufwärmers, Dauern in s (gewählt, nicht gemessen: lockeres Traben ist der Hauptteil, dazwischen
// kurze Übungen; ein Durchgang dauert gut eine Minute, dann beginnt er von vorn). speed in m/s.
export const WARMUP_PLAN = [
  { name: 'trab', dur: 10, speed: 2.2 },
  { name: 'dehnen', dur: 6, speed: 0 }, // Oberschenkel, erst ein Bein, nach der Hälfte das andere
  { name: 'hopser', dur: 5, speed: 2.4 },
  { name: 'kreisen', dur: 5, speed: 0 }, // Hüftkreisen
  { name: 'trab', dur: 8, speed: 2.2 },
  { name: 'armkreisen', dur: 5, speed: 0 },
];
export const WARMUP_CYCLE = WARMUP_PLAN.reduce((a, p) => a + p.dur, 0);

// Zustand: { x0, x1, z, t, u (0…1 Ort auf dem Streifen), dir (±1), angle }. Schreibt ins Ergebnisobjekt out
// (wird wiederverwendet, keine Allokation je Bild): { x, z, angle, speed, gesture, step }.
// gesture: PlayerModel-Geste oder null (beim Dehnen erst links, nach der Hälfte rechts); step: Index im Plan.
export function warmupStep(w, dt, out = {}) {
  w.t += dt;
  let t = w.t % WARMUP_CYCLE;
  let i = 0;
  while (t >= WARMUP_PLAN[i].dur) t -= WARMUP_PLAN[i++].dur;
  const ph = WARMUP_PLAN[i];
  const len = Math.max(0.1, w.x1 - w.x0);
  w.u ??= 0;
  w.dir ??= 1;
  if (ph.speed > 0) {
    w.u += (w.dir * ph.speed * dt) / len;
    if (w.u > 1) (w.u = 1), (w.dir = -1);
    else if (w.u < 0) (w.u = 0), (w.dir = 1);
  }
  // Blickrichtung: beim Laufen entlang der Linie (nach dem Wenden weich gedreht), beim Dehnen im Profil (man sieht,
  // wie der Fuß zum Gesäß geht), bei den anderen Übungen zum Spielfeld (+z, zur Kamera).
  const want = ph.speed > 0 || ph.name === 'dehnen' ? w.dir * (Math.PI / 2) : 0;
  const d = Math.atan2(Math.sin(want - (w.angle ?? want)), Math.cos(want - (w.angle ?? want)));
  w.angle = (w.angle ?? want) + d * Math.min(1, dt * 6);
  out.x = w.x0 + w.u * len;
  out.z = w.z;
  out.angle = w.angle;
  out.speed = ph.speed;
  out.gesture = ph.name === 'trab' ? null : ph.name === 'dehnen' ? (t > ph.dur / 2 ? 'dehnenR' : 'dehnenL') : ph.name;
  out.step = i;
  return out;
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
