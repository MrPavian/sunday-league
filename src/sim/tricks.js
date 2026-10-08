// Tricks und Akrobatik: Technisch starke Spieler haben ein paar Kunststücke drauf –
// Übersteiger, Zidane-Drehung, Hackentrick, „Jay-Jay" (Ball hinten hochgelupft über den
// Gegner). Ein paar Mutige probieren Fall- und Seitfallzieher, landen dabei hart und holen
// sich auch mal eine Prellung.
//
// Wer was kann, wird wie die Spielerprofile aus Werten, Eigenschaften und Name abgeleitet –
// keine neuen Spielstandsdaten, derselbe Spieler hat immer dasselbe Repertoire.
import { tr } from '../core/i18n.js';
import { clamp, dist2d, len, norm, rotate } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { attackDir } from './players.js';
import { hasProfile } from './profiles.js';
import { acroInjury } from './knocks.js';
import { styleOf } from './plan.js';

// need: nötige Technik (ein Namens-Streuwert verschiebt sie um bis zu ±0,06).
export const TRICKS = {
  uebersteiger: { label: tr('Übersteiger', 'step-over'), need: 0.6, time: 0.45 },
  hacke: { label: tr('Hackentrick', 'back-heel flick'), need: 0.66, time: 0.4 },
  zidane: { label: tr('Zidane-Trick', 'Zidane roulette'), need: 0.72, time: 0.55 },
  jayjay: { label: tr('Jay-Jay-Lupfer', 'Jay-Jay flick'), need: 0.78, time: 0.5 },
};
export const ACRO = {
  fallrueck: { label: tr('Fallrückzieher', 'bicycle kick'), hurt: 0.1, time: 1.1 },
  seitfall: { label: tr('Seitfallzieher', 'scissor kick'), hurt: 0.06, time: 0.9 },
};

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Repertoire eines Spielers: { tricks: [...], acro: bool }.
export function tricksOf(p) {
  if (p._tricks) return p._tricks;
  const a = p.attrs ?? {};
  const pos = p.position ?? p.role;
  const h = hash(p.name ?? p.id);
  const out = { tricks: [], acro: false };
  if (pos !== 'gk') {
    const flair = (hasProfile(p, 'solist') || hasProfile(p, 'ballmagnet') ? 0.05 : 0) + (hasTrait(p, 'ex_profi') ? 0.12 : 0) + (hasTrait(p, 'ballsicher') ? 0.03 : 0);
    let k = 0;
    for (const [id, t] of Object.entries(TRICKS)) {
      const jitter = (((h >>> (k++ * 5)) & 31) / 31 - 0.5) * 0.12;
      if ((a.technique ?? 0) + flair >= t.need + jitter) out.tricks.push(id);
    }
    // Mut zur Akrobatik: Stürmer eher als Abwehrspieler, ein bisschen Technik braucht es.
    const brave = ((h >>> 21) % 100) / 100;
    const chance = (pos === 'fwd' ? 0.45 : pos === 'mid' ? 0.25 : 0.08) + (hasProfile(p, 'solist') ? 0.15 : 0);
    out.acro = (a.technique ?? 0) >= 0.5 && brave < chance;
  }
  if (p.team != null) Object.defineProperty(p, '_tricks', { value: out, enumerable: false, writable: true });
  return out;
}

// Kurzzeile fürs Spielerkärtchen: „Trickkiste: Übersteiger, Hackentrick · Fallrückzieher".
export function trickLine(p) {
  const r = tricksOf(p);
  const parts = r.tricks.map((id) => TRICKS[id].label);
  if (r.acro) parts.push(tr('traut sich Fallrückzieher', 'dares a bicycle kick'));
  return parts.length ? `${tr('Trickkiste', 'Bag of tricks')}: ${parts.join(', ')}` : '';
}

// Wer gerade getäuscht wurde, steht kurz falsch (movePlayer bremst, kein Zugriff auf den Ball).
export const fooled = (m, p) => (p.fooledUntil ?? -1) > m.time;

// Nächster Gegner vor dem Ballführer (Blickrichtung fx/fz), sonst null.
function victimAhead(m, p, fx, fz, range) {
  let victim = null;
  let best = range;
  for (const o of m.players) {
    if (o.team === p.team || o.state !== 'normal' || o.role === 'gk') continue;
    const rx = o.pos.x - p.pos.x;
    const rz = o.pos.z - p.pos.z;
    const d = len(rx, rz);
    if (d < best && (rx * fx + rz * fz) / d > 0.55) {
      best = d;
      victim = o;
    }
  }
  return victim;
}

// Beim Dribbeln (dribbleTouch der KI): Gegner direkt vor sich und ein Trick im Repertoire?
// Gibt true zurück, wenn der Trick die Ballberührung übernommen hat.
export function tryTrick(m, p) {
  const { rng } = m;
  if (p.id === m.controlledId || (p.trickCooldown ?? 0) > m.time) return false;
  const rep = tricksOf(p);
  if (!rep.tricks.length) return false;
  const speed = len(p.vel.x, p.vel.z);
  if (speed < 1.2) return false;
  const victim = victimAhead(m, p, p.vel.x / speed, p.vel.z / speed, 2.1);
  if (!victim) return false;
  const st = styleOf(m, p.team);
  const mood = (hasProfile(p, 'solist') ? 1.6 : 1) * (hasProfile(p, 'teamplayer') ? 0.5 : 1) * (1 + 0.3 * (st.risk ?? 0));
  if (!rng.chance(0.2 * mood)) return false;
  const kind = rng.pick(rep.tricks);
  p.trickCooldown = m.time + rng.range(3, 6);
  performTrick(m, p, kind, victim);
  return true;
}

// Tricktaste der eigenen Figur: gedrückt in den letzten 0,35 s (p.trickWish), Ball am Fuß.
// Welcher Trick, sagt der Stick relativ zur Laufrichtung:
//   nach vorn → Jay-Jay-Lupfer · zur Seite → Übersteiger dorthin · zurück → Zidane-Trick ·
//   Stick los → Hackentrick. Wer den Trick nicht im Repertoire hat, versucht es trotzdem –
//   klappt dann nur deutlich seltener.
export const WISH_TIME = 0.35;
export function humanTrick(m) {
  if (m.controlledId == null) return false;
  const p = m.players.find((q) => q.id === m.controlledId);
  if (!p || m.time - (p.trickWish ?? -9) > WISH_TIME || p.state !== 'normal') return false;
  const { ball } = m;
  if (ball.holder || ball.pos.y > 0.5 || (p.trickCooldown ?? 0) > m.time) return false;
  const own = ball.lastTouch === p.id && ball.lastAction === 'dribble';
  if (!own || dist2d(p.pos, ball.pos) > 1.1) return false;
  const speed = len(p.vel.x, p.vel.z);
  const f = speed > 0.8 ? { x: p.vel.x / speed, z: p.vel.z / speed } : p.facing;
  const st = p.trickStick ?? { x: 0, z: 0 };
  const sl = len(st.x, st.z);
  let kind = 'hacke';
  let side = 0;
  if (sl > 0.3) {
    const dot = (st.x * f.x + st.z * f.z) / sl;
    const cross = (f.x * st.z - f.z * st.x) / sl;
    if (dot > 0.7) kind = 'jayjay';
    else if (dot < -0.5) kind = 'zidane';
    else {
      kind = 'uebersteiger';
      side = cross >= 0 ? 1 : -1;
    }
  }
  p.trickWish = -9;
  performTrick(m, p, kind, victimAhead(m, p, f.x, f.z, 2.6), { fwd: f, side, skilled: tricksOf(p).tricks.includes(kind) });
  p.trickCooldown = m.time + 0.9;
  return true;
}

// Trick ausführen. victim darf fehlen (Kunststück ohne Gegner, dann wird niemand getäuscht).
// opt.fwd Laufrichtung, opt.side erzwungene Seite (±1), opt.skilled false = nicht im Repertoire.
function performTrick(m, p, kind, victim, opt = {}) {
  const { ball, rng } = m;
  const speed = len(p.vel.x, p.vel.z);
  const fwd = opt.fwd ?? { x: p.vel.x / Math.max(speed, 1e-3), z: p.vel.z / Math.max(speed, 1e-3) };
  const fx = fwd.x;
  const fz = fwd.z;
  const t = TRICKS[kind];
  p.trick = kind;
  p.trickAnim = t.time;
  p.kickCooldown = 0.25;
  ball.lastTouch = p.id;
  ball.lastAction = 'dribble';
  m.lastTouchTeam = p.team;

  const fatigue = 1 - p.stamina;
  const human = p.id === m.controlledId;
  const tackling = victim ? victim.attrs.tackling : 0.3;
  const ok = rng.chance(clamp(0.3 + 0.65 * p.attrs.technique - 0.35 * tackling - 0.2 * fatigue + (hasTrait(p, 'ex_profi') ? 0.1 : 0) + (human ? 0.08 : 0) - (opt.skilled === false ? 0.3 : 0), human ? 0.08 : 0.15, 0.85));
  // Auf welche Seite am Gegner vorbei? Weg von ihm (oder wohin der Stick zeigt).
  const rx = victim ? victim.pos.x - p.pos.x : fx;
  const rz = victim ? victim.pos.z - p.pos.z : fz;
  const side = opt.side || (rx * -fz + rz * fx >= 0 ? -1 : 1);
  p.trickSide = side;
  if (ok) {
    if (victim) {
      victim.fooledFor = rng.range(0.45, 0.8);
      victim.fooledUntil = m.time + victim.fooledFor;
    }
    let dir;
    let v;
    let vy = 0;
    if (kind === 'uebersteiger') {
      dir = rotate(fwd, side * 0.75); // antäuschen, dann zur anderen Seite weg
      v = speed + 1.2;
    } else if (kind === 'zidane') {
      dir = rotate(fwd, side * 1.0); // um den Gegner herumgedreht
      v = speed * 0.8 + 1;
      p.vel.x *= 0.5;
      p.vel.z *= 0.5;
    } else if (kind === 'hacke') {
      dir = rotate(fwd, side * 0.45); // hinter dem Standbein vorbeigespitzelt
      v = speed + 2;
    } else {
      dir = fwd; // hinten hochgelupft, über den Gegner
      v = Math.max(4.5, speed + 1.5);
      vy = 3.6;
      ball.pos.y = Math.max(ball.pos.y, 0.3);
    }
    ball.vel.x = dir.x * v;
    ball.vel.z = dir.z * v;
    ball.vel.y = vy;
    p.dribbleDir = dir;
  } else {
    // Misslungen: Ball springt weg, oft dem Gegner vor die Füße.
    const dir = rotate(norm(rx, rz), rng.gauss() * 0.6);
    const v = rng.range(2, 4);
    ball.vel.x = dir.x * v;
    ball.vel.z = dir.z * v;
    ball.vel.y = kind === 'jayjay' ? 2 : 0;
    p.kickCooldown = 0.5;
  }
  m.events.push({ type: 'trick', playerId: p.id, victimId: victim?.id ?? null, trick: kind, ok });
}

// Hoher Ball vor dem Tor, Rücken oder Seite zum Tor: Fall- oder Seitfallzieher.
// Läuft vor dem Kopfball (headerTouch); gibt true zurück, wenn einer abgezogen hat.
export function acrobaticTouch(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder || ball.pos.y < 0.8 || ball.pos.y > 1.9 || ball.vel.y > 1.5) return false;
  for (const p of m.players) {
    // Die eigene Figur nur auf Tastendruck (Tricktaste), dann auch ohne Repertoire und weiter weg.
    const human = p.id === m.controlledId;
    if (human && m.time - (p.trickWish ?? -9) > WISH_TIME) continue;
    if (p.role === 'gk' || p.state !== 'normal' || (p.kickCooldown > 0 && !human)) continue;
    if (ball.lastAction === 'shoot' && m.lastTouchTeam === p.team) continue;
    if (dist2d(p.pos, ball.pos) > (human ? 1 : 0.85) || (!human && !tricksOf(p).acro)) continue;
    const s = attackDir(m, p.team);
    const gx = s * pitch.halfLength;
    const toGoal = norm(gx - p.pos.x, -p.pos.z);
    const dGoal = len(gx - p.pos.x, p.pos.z);
    if (human ? dGoal < 2 : dGoal > 14 || dGoal < 3) continue;
    const face = p.facing.x * toGoal.x + p.facing.z * toGoal.z;
    const kind = face < -0.35 && ball.pos.y > 1.05 ? 'fallrueck' : Math.abs(face) < 0.6 && ball.pos.y < 1.55 ? 'seitfall' : null;
    if (!kind) continue;
    // Nicht jeder traut sich jedes Mal (die eigene Figur schon – Taste gedrückt).
    p.kickCooldown = 0.6;
    if (!human && !rng.chance(0.45)) continue;
    if (human) p.trickWish = -9;
    acrobatic(m, p, kind, toGoal, dGoal, human && !tricksOf(p).acro);
    return true;
  }
  return false;
}

function acrobatic(m, p, kind, toGoal, dGoal, untrained = false) {
  const { ball, rng, pitch } = m;
  const a = ACRO[kind];
  p.acro = kind;
  p.acroAnim = a.time;
  p.state = 'acro';
  p.stateTimer = a.time;
  p.pending = null;
  p.vel.x *= 0.3;
  p.vel.z *= 0.3;
  const fatigue = 1 - p.stamina;
  // Voll getroffen? Sonst geht der Ball irgendwohin.
  const clean = rng.chance(clamp(0.3 + 0.45 * p.attrs.technique + 0.15 * p.attrs.shooting - 0.15 * fatigue - (kind === 'fallrueck' ? 0.08 : 0) - (untrained ? 0.15 : 0), 0.1, 0.8));
  const gw = pitch.goalHalfWidth;
  const aimZ = rng.range(-gw * 0.8, gw * 0.8);
  let dir = norm(attackDir(m, p.team) * pitch.halfLength - p.pos.x, aimZ - p.pos.z);
  dir = rotate(dir, rng.gauss() * (clean ? 0.08 + 0.12 * (1 - p.attrs.shooting) : 0.5));
  const speed = clean ? rng.range(13, 19) : rng.range(6, 11);
  ball.vel.x = dir.x * speed;
  ball.vel.z = dir.z * speed;
  ball.vel.y = clean ? rng.range(-0.5, 1.2) + dGoal * 0.08 : rng.range(0.5, 4);
  ball.lastTouch = p.id;
  ball.lastAction = 'shoot';
  m.lastTouchTeam = p.team;
  p.facing = toGoal.x * p.facing.x + toGoal.z * p.facing.z < 0 ? { x: -dir.x, z: -dir.z } : { x: dir.x, z: dir.z };
  m.lastAcro = { id: p.id, kind, time: m.time };
  m.events.push({ type: 'shot', playerId: p.id, power: clean ? 0.9 : 0.5, acro: kind });
  (m.lastShotAt ??= [-9, -9])[p.team] = m.time;
  (m.lastShot ??= [null, null])[p.team] = { id: p.id, time: m.time }; // wie markShooter (actions.js; dort importiert, hier wäre es zirkulär)
  m.shotTime = m.time;
}

// Landung nach dem Fall-/Seitfallzieher (stateMove, wenn die Zeit um ist): Wer hart
// aufkommt, holt sich eine Prellung – auf Asche und Asphalt eher als auf Rasen.
export function landAcro(m, p) {
  const a = ACRO[p.acro] ?? ACRO.seitfall;
  p.acro = null;
  const ground = m.pitch.surface.hard ? 1.8 : (m.pitch.surface.bumpiness ?? 0) > 0.3 ? 1.3 : 1;
  const risk = a.hurt * ground * (hasTrait(p, 'hart_im_nehmen') ? 0.5 : 1) * (p.age >= 33 ? 1.4 : 1);
  if (m.rng.chance(risk) && acroInjury(m, p)) return;
  p.state = 'recover';
  p.stateTimer = 0.45;
}
