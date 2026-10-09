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
    else if (e.type === 'setpiece' && (e.kind === 'corner' || e.kind === 'goalkick' || e.kind === 'penalty')) sig = { x: match.ball.pos.x, z: match.ball.pos.z, time: 1.4, kind: e.kind };
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
      // Rennen mit den Händen über dem Kopf; im Unterstand angekommen frieren sie (Arme verschränkt).
      if (speed > 1.5) out.cover = 1;
      else if (inc.sheltered?.has(p.id) && i % 2) out.gesture = 'arme';
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

// --- Fouls, Pfiff, Karten (nur Darstellung) ----------------------------------------------------------
// Die Simulation meldet foul/no_call/advantage/card nur als Ereignis. Wie es aussieht, wird hier aus den Ereignissen
// abgeleitet – ohne Zufall aus der Simulation: Variation kommt aus den Kennungen (variation()), nie aus match.rng.
// Zeiten sind Sekunden Spielzeit seit dem Ereignis (SIM_STEP je Simulationsschritt, wie in main.js STEP), damit
// Tempo und Pausen mitlaufen. Maße in Metern bei Figurgröße 1; Werte „gewählt, nicht gemessen", die Griffabstände
// (FOUL_REACH) per Gitter-Suche an der Figur festgelegt (tests/player.test.js prüft Hand ≤ 3 cm am Ziel).

export const SIM_STEP = 1 / 60;

// Feste Variation 0…1 aus beliebigen Kennungen (FNV-1a) – dieselben Spieler und Art geben immer dieselbe Szene.
export function variation(...keys) {
  let h = 2166136261;
  for (const c of keys.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Zeiten des Sturzes (PlayerModel.js fallPose): Ruck/Stoß, Fall, Liegen, Aufstehen; Taumeln dauert stumble.
// Zusammen ≈ 1,46 s – kurz genug, dass der Gefoulte beim Freistoß (Pause 1,3 s) wieder steht.
export const FALL = { yank: 0.3, down: 0.32, lie: 0.22, up: 0.62, stumble: 0.95 };
export const FALL_TOTAL = FALL.yank + FALL.down + FALL.lie + FALL.up;

// Abstand Mitte Foulender → Mitte Gefoulter beim Griff (Figurgröße 1): Gitter-Suche, siehe PlayerModel.js (GRIP).
export const FOUL_REACH = { ziehen: 0.8, festhalten: 0.64, schubsen: 0.58, schubsenLuft: 0.56, beinstellen: 0.52 };

// Welche Szene zeigt dieses Foul? e = foul | no_call | advantage; ctx:
//   air     Kopfballduell (der Ball war vor dem Pfiff in Kopfhöhe beim Gefoulten),
//   slide   der Foulende rutscht (Sim-Zustand tackle: seine Grätsche zeigt MatchView selbst),
//   poke    er stochert (Sim-Zustand poke),
//   hurtDown der Gefoulte liegt laut Simulation (state down: verletzt oder umgesäbelt).
// Liefert { kind, stopped, air, offAct, vicAct, s (Sturzseite ±1), vr (Variation), hold (zusätzliche Liegezeit), layout }.
export function foulPlan(e, ctx = {}) {
  const kind = e.kind ?? 'tackle';
  const stopped = e.type === 'foul';
  const vr = variation(e.playerId, e.victimId, kind, 'v');
  const s = variation(e.playerId, e.victimId, kind, 's') < 0.5 ? -1 : 1;
  const air = !!ctx.air && (kind === 'push' || kind === 'hold' || kind === 'shirt');
  let offAct = null;
  let vicAct = null;
  if (kind === 'shirt') (offAct = 'ziehen'), (vicAct = stopped && vr < 0.55 ? 'sturzRueck' : 'taumelRueck');
  else if (kind === 'hold') (offAct = 'festhalten'), (vicAct = stopped && vr < 0.4 ? 'sturzRueck' : 'taumelSeite');
  else if (kind === 'push') (offAct = air ? 'schubsenLuft' : 'schubsen'), (vicAct = air ? (stopped ? 'sturzLuft' : 'taumelLuft') : stopped && vr < 0.7 ? 'sturzSeite' : 'taumelSeite');
  else if (kind === 'trip') (offAct = 'beinstellen'), (vicAct = stopped ? 'sturzVorn' : 'taumelVorn');
  else if (kind === 'poke') vicAct = stopped ? 'sturzVorn' : 'taumelVorn';
  else if (kind === 'tackle') vicAct = ctx.slide ? (stopped ? 'sturzSeite' : null) : stopped ? 'sturzVorn' : 'taumelVorn';
  if (ctx.hurtDown) vicAct = vicAct && vicAct.startsWith('sturz') ? vicAct : null; // liegt er sowieso, übernimmt die Simulation
  if (ctx.slide || ctx.poke) offAct = null;
  const fall = vicAct && vicAct.startsWith('sturz');
  const lieEnd = FALL.yank + FALL.down + FALL.lie;
  const hold = fall && e.penalty && !ctx.hurtDown ? 0.5 : 0;
  // Liegt er laut Simulation weiter (verletzt), endet der Sturz im Liegen: danach übernimmt die Pose der Simulation.
  return { kind, stopped, air, offAct, vicAct, s, vr, penalty: !!e.penalty, hold, fall: !!fall, dur: fall ? (ctx.hurtDown ? lieEnd : FALL_TOTAL + hold) : FALL.stumble + 0.2 };
}

// Zeit in der Sturzpose: bei Elfmeter bleibt der Gefoulte länger liegen (hold), danach geht es weiter wie sonst.
export function poseTime(plan, t) {
  if (!plan.hold) return t;
  const lieEnd = FALL.yank + FALL.down + FALL.lie;
  return t < lieEnd ? t : t < lieEnd + plan.hold ? lieEnd - 1e-4 : t - plan.hold;
}

// Aufstellung beim Griff im Rahmen des Gefoulten (x: +x zur Seite des „R"-Knochens, z: nach vorn) mit Blickrichtung des
// Foulenden relativ zum Gefoulten (Bogenmaß). Der Foulende steht dazu entgegen der Fallrichtung s.
export function foulLayout(plan) {
  const r = FOUL_REACH;
  switch (plan.offAct) {
    case 'ziehen': return { x: 0, z: -r.ziehen, yaw: 0 };
    case 'festhalten': return { x: 0, z: -r.festhalten, yaw: 0 };
    case 'schubsen': return { x: -plan.s * r.schubsen, z: 0, yaw: plan.s * (Math.PI / 2) };
    case 'schubsenLuft': return { x: -plan.s * r.schubsenLuft, z: -0.15, yaw: plan.s * (Math.PI / 2) };
    case 'beinstellen': return { x: 0.21 * plan.s, z: r.beinstellen, yaw: Math.PI };
    default: return null; // Grätsche/Stochern: der Foulende bleibt, wo ihn die Simulation hat
  }
}

const sm = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Pose und Weg beider Beteiligten zur Zeit t seit dem Foul. Schreibt ins Objekt out (wiederverwendbar, keine Allokation):
//   vAct/oAct  Name der Pose (PlayerModel.js animatePlayer: act) oder null, vT/oT Posenzeit, vW/oW Überblendung 0…1,
//   vx, vz     Verschiebung des Gefoulten im eigenen Rahmen (x seitlich, z nach vorn, in m), ox, oz die des Foulenden
//              im Rahmen des Gefoulten, oyaw Zusatzdrehung des Foulenden, lay: Anteil der Aufstellung (1 = Griffabstand).
export function foulFrame(plan, t, out = {}) {
  const T = plan.dur;
  const pt = poseTime(plan, t);
  out.vAct = plan.vicAct && t < T ? plan.vicAct : null;
  out.vT = pt;
  const edge = (t0, t1) => sm(0, 0.08, t0) * (1 - sm(t1 - 0.2, t1, t0)); // weich ein, weich aus
  out.vW = out.vAct ? edge(t, T) : 0;
  const OT = plan.fall ? 0.85 : 0.7;
  out.oAct = plan.offAct && t < OT ? plan.offAct : null;
  out.oT = t;
  out.oW = out.oAct ? edge(t, OT) : 0;
  out.vx = out.vz = out.ox = out.oz = out.oyaw = 0;
  const s = plan.s;
  const v = plan.vicAct;
  // Weg des Gefoulten (relativ zur Stelle beim Pfiff): zuerst vom Griff gezogen/gestoßen, dann der Sturz selbst.
  const pull = sm(0.04, FALL.yank, t);
  const fall = plan.fall ? sm(FALL.yank, FALL.yank + FALL.down, t) : 0;
  const stag = plan.fall ? 0 : Math.sin(Math.PI * clamp01(t / FALL.stumble));
  if (v === 'sturzRueck' || v === 'sturzLuft') out.vz = -0.22 * pull - 0.36 * fall;
  else if (v === 'taumelRueck' || v === 'taumelLuft') out.vz = -0.3 * stag;
  else if (v === 'sturzSeite') out.vx = s * (0.08 * pull + 0.55 * fall);
  else if (v === 'taumelSeite') out.vx = s * 0.3 * stag;
  else if (v === 'sturzVorn') out.vz = 0.25 * pull + 0.55 * fall + 0.55 * sm(FALL.yank + FALL.down, FALL.yank + FALL.down + FALL.lie, t);
  else if (v === 'taumelVorn') out.vz = 0.5 * stag;
  // Foulender: bleibt am Gefoulten (zieht, schiebt) und gibt dann den Weg frei.
  const lay = foulLayout(plan);
  out.lay = lay ? 1 : 0;
  if (lay) {
    const rel = sm(0.34, 0.7, t); // lässt los, geht aus dem Weg
    out.ox = lay.x + out.vx;
    out.oz = lay.z + out.vz;
    out.oyaw = lay.yaw;
    if (plan.offAct === 'ziehen' || plan.offAct === 'festhalten') {
      out.ox += s * 0.85 * rel * (plan.fall ? 1 : 0.4);
      out.oz += (plan.fall ? 0.2 : 0.1) * rel;
    } else if (plan.offAct === 'schubsen' || plan.offAct === 'schubsenLuft') {
      out.ox = lay.x + out.vx * 0.55 - s * 0.1 * rel;
      out.oz = lay.z + out.vz * 0.55;
    } else if (plan.offAct === 'beinstellen') {
      out.ox += -s * 0.8 * sm(0.18, 0.5, t);
      out.oz = lay.z + (plan.fall ? 0.1 : 0) - 0.2 * sm(0.15, 0.5, t) + out.vz * 0.1;
    }
  }
  return out;
}

// Weltlage beider Beteiligten aus Stelle und Blickrichtung des Gefoulten beim Foul (v0 = { x, z, yaw }) und foulFrame().
// Rahmen: lokal +z = Blickrichtung (sin yaw, cos yaw), lokal +x = (cos yaw, −sin yaw). Schreibt ins Ergebnisobjekt out
// { vx, vz, vyaw, ox, oz, oyaw }.
export function foulPlace(v0, fr, out = {}) {
  const c = Math.cos(v0.yaw);
  const s = Math.sin(v0.yaw);
  out.vx = v0.x + fr.vx * c + fr.vz * s;
  out.vz = v0.z - fr.vx * s + fr.vz * c;
  out.vyaw = v0.yaw;
  out.ox = v0.x + fr.ox * c + fr.oz * s;
  out.oz = v0.z - fr.ox * s + fr.oz * c;
  out.oyaw = v0.yaw + fr.oyaw;
  return out;
}

// Kopfballduell? Der Ball war vor dem Pfiff (Bild davor, prevBall) in Kopfhöhe nahe beim Gefoulten.
export const isAerial = (prevBall, pos) => !!prevBall && prevBall.y >= 1.1 && Math.hypot(prevBall.x - pos.x, prevBall.z - pos.z) < 2.6;

// Wer geht zum Schiri? Bis zu zwei Mitspieler des Foulenden (Protest), einer der Gefoulten-Mannschaft bei Elfmeter oder
// Karte (fordert sie). Nur Feldspieler im Umkreis von 16 m um den Schiri, nie die Beteiligten. Liefert [{ id, kind: 'protest' | 'fordern', x, z }]
// mit dem Ziel: 2 m vor dem Schiri auf der Linie von der eigenen Stelle (Wege höchstens 6 m: es ist Darstellung, die Simulation hält sie fest).
export function refCrowd(match, offId, vicId, ref, demand = false) {
  if (!ref) return [];
  const off = match.players.find((p) => p.id === offId);
  const vic = match.players.find((p) => p.id === vicId);
  if (!off || !vic) return [];
  const near = (team, n) =>
    match.players
      .filter((p) => p.team === team && p.id !== offId && p.id !== vicId && p.role !== 'gk' && p.state === 'normal')
      .map((p) => ({ p, d: Math.hypot(ref.pos.x - p.pos.x, ref.pos.z - p.pos.z) }))
      .filter((c) => c.d < 16 && c.d > 2.5)
      .sort((a, b) => a.d - b.d)
      .slice(0, n);
  const out = [];
  const go = ({ p, d }, kind) => {
    const k = Math.min(6, d - 2) / d;
    out.push({ id: p.id, kind, x: p.pos.x + (ref.pos.x - p.pos.x) * k, z: p.pos.z + (ref.pos.z - p.pos.z) * k });
  };
  for (const c of near(off.team, demand ? 1 : 2)) go(c, 'protest');
  if (demand) for (const c of near(vic.team, 1)) go(c, 'fordern');
  return out;
}

// Zeitplan der Gesten nach dem Pfiff (Sekunden seit dem Foul): Foulender hebt die Hände („war nix“), der Gefoulte
// reklamiert, sobald er steht (nicht, wenn er liegen bleibt). Liefert { off: [t0, t1], vic: [t0, t1] }.
export function whistleTimes(plan, hurt = false) {
  return { off: [plan.fall ? 0.6 : 0.35, plan.fall ? 2.6 : 2.2], vic: hurt ? null : [plan.fall ? Math.min(plan.dur, FALL_TOTAL) - 0.1 : 0.7, plan.dur + 1.4] };
}

// Schiri-Gesten nach einer Karte (Sekunden seit dem Ereignis): kurz nach dem Pfiff Karte hoch (gelb/rot, bei Gelb-Rot erst
// Gelb, dann Rot), danach zückt er das Notizbuch. null = keine Geste.
export const CARD_AT = 0.35;
export const CARD_HOLD = 1.2;
export const BOOK_FOR = 1.6;
export function cardGesture(color, t) {
  const a = CARD_AT;
  if (t < a) return null;
  if (color === 'yellowred') {
    if (t < a + CARD_HOLD * 0.75) return 'karteGelb';
    if (t < a + CARD_HOLD * 1.5) return 'karteRot';
    return t < a + CARD_HOLD * 1.5 + BOOK_FOR ? 'notizbuch' : null;
  }
  if (t < a + CARD_HOLD) return color === 'yellow' ? 'karteGelb' : 'karteRot';
  return t < a + CARD_HOLD + BOOK_FOR ? 'notizbuch' : null;
}

// Vorteil: der Schiri streckt die Arme nach vorn, solange die Simulation den Vorteil offen hält (match.advantage), mindestens
// 0,8 s ab dem Ereignis. state merkt sich den Beginn.
export function advantageGesture(state, match) {
  if (match.advantage) state.advSince ??= match.time;
  else if (state.advSince != null && (state.advHold ?? 0) <= 0) state.advSince = null;
  return match.advantage || (state.advHold ?? 0) > 0 ? 'vorteil' : null;
}

// Ausgeschlossen: steht kurz mit dem Kopf in der Hand und schüttelt ihn, geht dann langsam zur nächsten Seitenlinie
// (Kamera-Seite, wenn er in deren Hälfte steht), bis er hinter ihr verschwindet. Der Weg ist gerade, quer zur Linie.
// Liefert { x, z, angle, speed, gesture, done } aus w = { x, z, t, dirZ, len } (Anfang x, z); schreibt ins Ergebnis out.
export const WALK_STAND = 1.4;
export const WALK_SPEED = 1.7;
export const WALK_MAX = 18;
export function walkOffStart(pitch, pos) {
  const dirZ = pos.z >= 0 ? 1 : -1;
  return { x: pos.x, z: pos.z, t: 0, dirZ, len: Math.max(1, pitch.halfWidth + 2.4 - pos.z * dirZ) };
}
export function walkOffStep(w, dt, out = {}) {
  w.t += dt;
  const moving = w.t > WALK_STAND;
  const u = Math.max(0, w.t - WALK_STAND);
  const k = clamp01(u / 0.8); // beginnt langsam: in 0,8 s auf Gehtempo
  const walked = WALK_SPEED * (u < 0.8 ? (0.5 * u * u) / 0.8 : 0.4 + (u - 0.8));
  const d = Math.max(0, Math.min(w.len, walked));
  out.x = w.x;
  out.z = w.z + w.dirZ * d;
  out.angle = w.dirZ > 0 ? 0 : Math.PI;
  out.speed = moving ? WALK_SPEED * Math.max(0.15, k) : 0;
  out.gesture = moving ? 'abgang' : 'kopfschuetteln';
  out.done = d >= w.len || w.t > WALK_MAX;
  return out;
}

// Wer tröstet oder schimpft? Die beiden nächsten Mitspieler (Feldspieler) des Ausgeschlossenen im Umkreis von 14 m: der erste
// legt die Hand auf die Schulter und geht mit (kind 'troesten', s = Seite), der zweite fasst sich an den Kopf (kind 'schimpfen').
// Die Gegner in der Nähe reißen die Faust (kind 'jubel', bis zu zwei, Abstand ≤ 18 m).
export function consolers(match, off) {
  const mates = (team, same, max, n) =>
    match.players
      .filter((p) => (p.team === team) === same && p.role !== 'gk' && p.state === 'normal')
      .map((p) => ({ p, d: Math.hypot(p.pos.x - off.pos.x, p.pos.z - off.pos.z) }))
      .filter((c) => c.d < max)
      .sort((a, b) => a.d - b.d)
      .slice(0, n);
  const out = [];
  mates(off.team, true, 14, 2).forEach((c, i) => out.push({ id: c.p.id, kind: i === 0 ? 'troesten' : 'schimpfen', s: variation(c.p.id, off.id) < 0.5 ? -1 : 1 }));
  for (const c of mates(off.team, false, 18, 2)) out.push({ id: c.p.id, kind: 'jubel', s: 1 });
  return out;
}
// Lage des tröstenden Mitspielers im Rahmen des Gehenden: schräg hinter ihm auf der Seite s (Gitter-Suche, siehe PlayerModel TROESTEN).
export const CONSOLE_AT = { side: 0.35, behind: 0.4 };

// Elfmeter verwandelt? state merkt sich einen Elfmeterpfiff (Ereignis setpiece/penalty), das nächste Tor bis zum Anstoß ist ein
// Elfmetertor. Liefert true für das Torereignis e, sonst false.
export function penaltyGoal(state, e) {
  if (e.type === 'setpiece') state.penalty = e.kind === 'penalty' ? e.team : null;
  else if (e.type === 'goal') {
    const pen = state.penalty != null && state.penalty === e.team && !e.ownGoal;
    state.penalty = null;
    return pen;
  } else if (e.type === 'save' || e.type === 'post' || e.type === 'bar' || e.type === 'out') state.penalty = null;
  return false;
}

// Ballführung: der Spieler führt den Ball am Fuß (letzter Kontakt Dribbling, Ball in Fußnähe, in Bewegung). 0 oder 1;
// MatchView glättet.
export function dribbleCarry(match, p) {
  const b = match.ball;
  if (b.holder || b.lastTouch !== p.id || b.lastAction !== 'dribble' || b.pos.y > 0.5 || p.state !== 'normal' || p.role === 'gk') return 0;
  return Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 1.5 && Math.hypot(p.vel.x, p.vel.z) > 0.8 ? 1 : 0;
}
