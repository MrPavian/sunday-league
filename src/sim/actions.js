import { styleOf } from './plan.js';
import { bondBonus, bondOf, isBad } from './bonds.js';
// Bewegung und Ballkontakte: Laufen, Schuss, Pass, Kopfball, Torwart, Dribbling.
import { clamp, dist2d, hypot, len, norm, rotate } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { BALL_RADIUS, ballSpeed, boardRoute, rollSpeedFor } from './ball.js';
import { attackDir, clampWallX, distToSegment, setControlled, wallPush } from './players.js';
import { aiSkill, keeperReaction, laneScore, WIDE_LANE } from './ai.js';

// Bonus für den freien Mann außen bei der Passwahl der KI (Stellschraube, gemessen mit scripts/orders-audit.mjs).
export const WIDE_OPEN = 0.55;
import { knockSpeed } from './knocks.js';
import { markOffside } from './offside.js';
import { hasProfile, pressureChaos } from './profiles.js';
import { fooled, tryTrick } from './tricks.js';
import { PINGPONG, STRENGTH_FX, strengthOf } from './strength.js';
import { headerDuelFoul } from './fouls.js';
import { STAMINA_DRAIN } from './pitch.js';
import { secondWind } from './mentality.js';

export const REACH = 0.75;

export function movePlayer(m, p, intent, dt, leaders) {
  const { pitch } = m;
  const mv = intent.move;
  const mag = Math.min(1, len(mv.x, mv.z));
  const moving = mag > 0.1;
  const sprint = intent.sprint && moving && p.stamina > 0.05;

  // Tempo: Sprint = (4,6 + 2,6·Pace)·1,28 ≈ 7,1–9,2 m/s; gemessen (scripts/bigpitch-audit.mjs, 100 Spiele je Platz) liegt der Spitzenwert je Spieler
  // und Spiel im Mittel bei 7,1 m/s (p90 7,8). Real: Sprinttest 30 m, Amateure ≈ 29,7 km/h = 8,3 m/s, Profis 31,2 km/h = 8,7 m/s (österreichische
  // Studie, lida.sport-iat.de/dfb/Record/4080853); Spitzentempo im Spiel Profis ≈ 32,9 km/h = 9,1 m/s (Biol. Sport 2024, PMC11694206). Das Tempo
  // gilt auf allen Plätzen gleich und wurde nicht verändert; mittleres Tempo im Spiel 3,3 m/s ist höher als real (≈ 1,9 m/s einschließlich Stehen).
  let maxSpeed = (4.6 + 2.6 * p.attrs.pace + (hasTrait(p, 'schnell') ? 0.6 : 0)) * (0.72 + 0.28 * p.stamina);
  if (sprint) maxSpeed *= 1.28;
  if (p.shielding) maxSpeed *= 0.55; // Körper zwischen Gegner und Ball
  if (p.heldUntil > m.time) maxSpeed *= p.heldFactor ?? STRENGTH_FX.heldBase; // wird am Trikot festgehalten (Körper des Halters/Gehaltenen: holding.js)
  if (p.holdingId != null) maxSpeed *= 0.7;
  if (fooled(m, p)) maxSpeed *= 0.35; // ausgetrickst: steht kurz falsch
  if (p.injury) maxSpeed *= 1 - 0.03 * p.injury.severity * (hasTrait(p, 'hart_im_nehmen') ? 0.3 : 1);
  maxSpeed *= knockSpeed(p); // angeschlagen humpelt man

  const speed = len(p.vel.x, p.vel.z);
  let drain = sprint ? 0.02 : speed > 2 ? 0.0012 : -0.008;
  if (drain > 0) {
    drain *= STAMINA.drain * (STAMINA_DRAIN[m.pitch.base ?? m.pitch.id] ?? 1);
    drain *= (1.3 - 0.6 * p.attrs.stamina) * (m.pitch.heat ?? 1); // Hitze kostet Kraft
    if (hasTrait(p, 'pferdelunge')) drain *= 0.5;
    if (hasTrait(p, 'raucher')) drain *= 1.3;
    if (p.injury) drain *= 1 + 0.1 * p.injury.severity;
    drain *= styleOf(m, p.team).tire ?? 1; // Pressing kostet Puste
    // Kurze Spiele: Die Kraft reicht trotzdem nur für ein Spiel – sonst wird nie jemand müde.
    drain *= shortGame(m);
    if (leaders.some((l) => l !== p && l.team === p.team && dist2d(l.pos, p.pos) < 8)) drain *= 0.85;
  }
  p.stamina = clamp(p.stamina - drain * dt, 0, 1);
  if (hasProfile(p, 'zweiteluft')) secondWind(m, p); // einmal je Spiel spät Kraft zurück (mentality.js)

  const dir = moving ? norm(mv.x, mv.z) : { x: 0, z: 0 };
  const tvx = dir.x * maxSpeed * mag;
  const tvz = dir.z * maxSpeed * mag;
  let dvx = tvx - p.vel.x;
  let dvz = tvz - p.vel.z;
  const dv = len(dvx, dvz);
  const maxDv = (moving ? 18 : 12) * dt;
  if (dv > maxDv) {
    dvx *= maxDv / dv;
    dvz *= maxDv / dv;
  }
  p.vel.x += dvx;
  p.vel.z += dvz;
  clampPlayer(pitch, p, p.pos.x + p.vel.x * dt, p.pos.z + p.vel.z * dt);

  if (moving && m.ball.holder !== p.id) p.facing = dir;
}

export function clampPlayer(pitch, p, x, z) {
  const zMax = pitch.boundary === 'lines' ? pitch.halfWidth + 1.2 : pitch.halfWidth - 0.3;
  p.pos.x = clampWallX(pitch, x, z);
  p.pos.z = clamp(z, -zMax, zMax);
}

export function separatePlayers(m) {
  const ps = m.players;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i].pos;
      const b = ps[j].pos;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = len(dx, dz);
      if (d > 0 && d < 0.55) {
        const push = (0.55 - d) / 2;
        a.x -= (dx / d) * push;
        a.z -= (dz / d) * push;
        b.x += (dx / d) * push;
        b.z += (dz / d) * push;
      }
    }
  }
  // Wegschieben darf niemanden durch die Wand drücken.
  for (const p of ps) clampPlayer(m.pitch, p, p.pos.x, p.pos.z);
}

// Hallencup (pitch.flatPlay): Hohe Pässe, Flanken und Abschläge werden zu Bodenpässen (Flanke: flache Hereingabe).
export function flatten(pitch, a) {
  if (!pitch.flatPlay || !a?.lofted) return a;
  return { ...a, lofted: undefined, driven: undefined, ...(a.lofted === 'cross' ? { low: true } : null) };
}

export function tryExecute(m, p) {
  const { ball } = m;
  const a = flatten(m.pitch, p.pending);
  const holds = ball.holder === p.id;
  if (p.state !== 'normal') return;
  if (!holds) {
    // Die kurze Sperre nach einer Dribbel-Berührung gilt nicht für einen gewollten
    // Schuss oder Pass – sonst verfällt die Aktion, bevor sie ausgeführt wird.
    // Auch die KI: Ein beschlossener Schuss geht aus dem Dribbling heraus sofort.
    const ownDribble = (p.id === m.controlledId || a?.type === 'shoot') && ball.lastTouch === p.id && ball.lastAction === 'dribble';
    if (ball.holder || (p.kickCooldown > 0 && !ownDribble) || fooled(m, p)) return;
    // Der gesteuerte Spieler kommt etwas weiter an den Ball – Taste gedrückt, Ball gespielt.
    if (dist2d(p.pos, ball.pos) > (p.id === m.controlledId ? REACH * 1.3 : REACH) || ball.pos.y > 1.1) return;
    if (shielded(m, p)) {
      p.pending = null;
      return;
    }
  }
  p.pending = null;
  p.setPieceAction = null;
  const restart = m.setPiece && m.setPiece.takerId === p.id && !m.setPiece.taken ? m.setPiece.type : null; // für die Abseitsregel
  if (m.setPiece && m.setPiece.takerId === p.id) m.setPiece.taken = true;
  p.kickCooldown = 0.35;
  p.kickAnim = 0.3;
  const fatigue = 1 - p.stamina;

  if (holds) {
    ball.holder = null;
    p.catchCooldown = 0.3;
    // lofted: Abschlag aus der Hand (Drop-Kick) – sonst wirft er (nur für die Darstellung).
    if (p.role === 'gk') m.keeperRelease = { id: p.id, team: p.team, time: m.time, lofted: !!a.lofted };
  } else {
    // Luftloch – gehört in der Kreisklasse dazu.
    const whiff = (0.05 * (1 - p.attrs.technique) + 0.04 * STAMINA.skill * fatigue) * (hasTrait(p, 'ballsicher') ? 0.5 : 1) * (hasTrait(p, 'ex_profi') ? 0.3 : 1) * (p.id === m.controlledId ? 0.5 : 1);
    if (!a.placed && m.rng.chance(whiff)) {
      m.events.push({ type: 'whiff', playerId: p.id });
      return;
    }
  }

  if (a.type === 'shoot' && !holds) shoot(m, p, a, fatigue);
  else if (pass(m, p, a, fatigue, holds) === false) {
    p.kickCooldown = 0;
    p.kickAnim = 0;
    return;
  }
  ball.lastAction = a.type === 'shoot' && !holds ? 'shoot' : 'pass';
  ball.lastTouch = p.id;
  m.lastTouchTeam = p.team;
  if (ball.lastAction === 'pass') markOffside(m, p, restart);
  else m.offside = null;
}

function shoot(m, p, a, fatigue) {
  const { ball, rng } = m;
  const hammer = hasTrait(p, 'hammer');
  let dir = a.target ? norm(a.target.x - p.pos.x, a.target.z - p.pos.z) : { ...p.facing };
  // Zielhilfe für den Menschen: Wer grob aufs Tor zielt, wird in den Rahmen gezogen –
  // die Ecke bestimmt er weiter selbst über die Laufrichtung.
  if (!a.target && p.id === m.controlledId) dir = aimAssist(m, p, dir);
  const flat = m.pitch.flatPlay;
  // Halle: Abpraller über die Bande, wenn ein Gegner den direkten Schuss zustellt (nur KI, nur mit Ziel).
  const board = a.target && !a.placed ? boardChoice(m, p, a.target, true) : null;
  if (board) dir = norm(board.aim.x - p.pos.x, board.aim.z - p.pos.z);
  const power = clamp(a.power ?? 0.5, 0.1, 1);
  // Streuung: Technik, Müdigkeit, Wucht. Die KI streut etwas mehr als der Mensch,
  // der selbst zielt – sonst treffen Amateure wie Profis.
  const sigma = 0.025 + 0.16 * (1 - p.attrs.shooting) + 0.08 * STAMINA.skill * fatigue + 0.05 * power + (hammer ? 0.03 : 0) + (p.id === m.controlledId ? 0 : 0.005 + (aiSkill(m, p) < 1 ? 0.05 : aiSkill(m, p) > 1 ? -0.015 : 0));
  // Elfmeter: in Ruhe platziert, ohne Gegner am Fuß – deutlich weniger Streuung.
  // Ebene 3: Wer bedrängt abzieht, streut mehr – nervöse Spieler noch mehr.
  // Direktabnahme und Schuss aus der Drehung sind schwerer zu platzieren.
  dir = rotate(dir, rng.gauss() * sigma * (a.placed ? 0.35 : pressureChaos(m, p)) * (a.first ? 1.2 : 1) * (a.turn ? 1.25 : 1) * (flat?.aimBoost ?? 1));
  const speed = (8 + 18 * power) * (0.85 + 0.15 * p.attrs.shooting) * (hammer ? 1.15 : 1) * (flat?.shotBoost ?? 1);
  let vy = 0.8 + 5 * power * power + Math.abs(rng.gauss()) * 1.2 * (1 - p.attrs.shooting) * power;
  // Halle: hoch nur vorm Tor, weiter weg bleibt der Schuss flach.
  if (flat && Math.abs(p.pos.x - attackDir(m, p.team) * m.pitch.halfLength) > flat.shotNear) vy = Math.min(vy, flat.shotVy);
  ball.vel.x = dir.x * speed;
  ball.vel.y = vy;
  ball.vel.z = dir.z * speed;
  p.facing = dir;
  if (a.placed && m.setPiece?.type === 'penalty' && m.setPiece.takerId === p.id) m.penaltyKick = m.time;
  m.events.push({ type: 'shot', playerId: p.id, power });
  if (board) m.events.push({ type: 'bandenpass', kind: 'shot', playerId: p.id, targetId: null });
  (m.lastShotAt ??= [-9, -9])[p.team] = m.time;
  markShooter(m, p);
  m.shotTime = m.time; // Der Torwart braucht einen Moment, bis er die Richtung erkennt.
  m.shotFrom = { x: p.pos.x, z: p.pos.z }; // für die Reaktionszeit des Torwarts (keeperSaves)
}

function cornerZone(m, p, kind) {
  const { pitch } = m;
  const s = attackDir(m, p.team);
  const gx = s * pitch.halfLength;
  const side = Math.sign(p.pos.z) || 1;
  if (kind === 'short') return { x: p.pos.x - s * 3, z: p.pos.z - side * 3 };
  if (kind === 'near') return { x: gx - s * 2, z: side * pitch.goalHalfWidth * 1.1 };
  return { x: gx - s * 3.5, z: -side * pitch.goalHalfWidth * 1.3 }; // langer Pfosten
}

function aimAssist(m, p, dir) {
  const { pitch } = m;
  const gx = attackDir(m, p.team) * pitch.halfLength;
  const dx = gx - p.pos.x;
  if (dx * dir.x <= 0 || Math.abs(dx) > 26) return dir;
  // Wo würde der Schuss die Torlinie kreuzen?
  const hitZ = p.pos.z + (dir.z / dir.x) * dx;
  const gw = pitch.goalHalfWidth;
  if (Math.abs(hitZ) > gw + 2.5) return dir; // klar vorbeigezielt bleibt vorbei
  const z = clamp(hitZ, -gw * 0.88, gw * 0.88);
  return norm(dx, z - p.pos.z);
}

// Wer zuletzt aufs Tor geschossen oder geköpft hat: Lenkt der Gegner (Torwart, Verteidiger) den Ball danach ins Tor, bekommt der
// Schütze das Tor und kein Eigentor, wenn der Schuss höchstens SHOT_CREDIT Sekunden her ist (Zeit gewählt, nicht gemessen;
// vorher waren 25–35 % der Tore auf dem Großfeld „Eigentore", real rund 5 %: Fußballregel – abgefälschte Schüsse zählen für den Schützen).
export const SHOT_CREDIT = 3;
export function markShooter(m, p) {
  (m.lastShot ??= [null, null])[p.team] = { id: p.id, time: m.time };
}
export const CORNER_SCATTER = 2.5;
// Befreiungsschlag: Tempo (m/s) und Steigung (m/s) – gewählt, nicht gemessen.
export const CLEAR = { speed: 15, vy: 5 };
export const CROSS_VMAX = { driven: 24, high: 27 };
// Ankunftshöhe einer Flanke am Zielpunkt (m): im Kopfballbereich von headerTouch (1,35–2,4 m). Gewählt, nicht gemessen.
export const CROSS_ARRIVE = { driven: 1.55, high: 1.4 };
function pass(m, p, a, fatigue, fromHands) {
  const { ball, rng, pitch } = m;
  const eye = hasTrait(p, 'gutes_auge');
  const cone = a.cone ?? (eye ? 0.1 : 0.45);
  const outfieldThrow = fromHands && p.role !== 'gk';

  let target = null;
  let bestScore = -Infinity;
  // Ohne Sympathien wäre der hier dran gewesen – für „Kalle ignoriert Jens".
  let plainBest = null;
  let plainScore = -Infinity;
  // Ecke mit Ansage: kurz, erster Pfosten oder langer Pfosten – der Mitspieler,
  // der der Zielzone am nächsten steht, wird angespielt.
  const zone = a.zone ? cornerZone(m, p, a.zone) : null;
  for (const t of (a.clear ? [] : m.players)) {
    if (t.team !== p.team || t === p || t.state === 'down') continue;
    if (a.targetId && t.id !== a.targetId) continue;
    if (zone) {
      if (t.role === 'gk') continue;
      const zs = -dist2d(t.pos, zone);
      if (zs > bestScore) {
        bestScore = zs;
        target = t;
      }
      continue;
    }
    const dx = t.pos.x - p.pos.x;
    const dz = t.pos.z - p.pos.z;
    const d = len(dx, dz);
    if (d < (a.minDist ?? 2) || (outfieldThrow && d > 16)) continue;
    const dot = (dx * p.facing.x + dz * p.facing.z) / d;
    if (dot < cone) continue;
    // Lieber nach vorn als quer, lieber frei als zugestellt.
    // Die KI spielt lieber nach vorne; zum eigenen Torwart nur, wenn es brennt.
    const ai = p.id !== m.controlledId;
    const pressed = ai && m.players.some((o) => o.team !== p.team && dist2d(o.pos, p.pos) < 1.8);
    const gkMalus = t.role === 'gk' ? (ai && !pressed ? 2 : 0.8) : 0;
    const st = styleOf(m, p.team);
    // Die KI schaut sich um: Blickrichtung zählt nur halb (vorher voll – dann ging fast jeder Ball dorthin,
    // wohin der Ballführende schaute, also zur Mitte). Ein freier Mann außen ist eine echte Option.
    let score = (ai ? 0.25 + 0.75 * dot : dot) - d * (ai ? st.shortPass : 0.035) - gkMalus + (t.pos.x - p.pos.x) * attackDir(m, p.team) * (ai ? st.forward : 0.025);
    if (ai && !a.lofted && t.role !== 'gk' && Math.abs(t.pos.z) > pitch.halfWidth * WIDE_LANE && (t.pos.x - p.pos.x) * attackDir(m, p.team) > -1) {
      const free = !m.players.some((o) => o.team !== p.team && dist2d(o.pos, t.pos) < 3.5);
      if (free) score += WIDE_OPEN * (st.channel === 'wide' ? 1.6 : st.channel === 'centre' ? 0.3 : 1);
    }
    // Angriffsseite und -kanal: dorthin wird der Ball eher verteilt (nicht bei Rückpässen).
    if (ai && (st.focus || st.channel) && (t.pos.x - p.pos.x) * attackDir(m, p.team) > -2) score += laneScore(m, p, st, t.pos) * 0.7;
    const riskK = ai ? (1 - 0.35 * st.risk) * (hasProfile(p, 'teamplayer') ? 1.2 : 1) : 1;
    // Flanken sollen in Tornähe landen.
    if (a.lofted) score -= Math.abs(t.pos.x - attackDir(m, p.team) * pitch.halfLength) * 0.08;
    for (const o of m.players) {
      if (o.team === p.team) continue;
      const lane = distToSegment(o.pos, p.pos, t.pos);
      if (!a.lofted && lane < 1.4) score -= (0.9 - lane * 0.3) * riskK;
      // Wer eng gedeckt ist, bekommt den Ball ungern – vor allem nicht vom Torwart.
      const near = dist2d(o.pos, t.pos);
      if (near < 2.5) score -= (2.5 - near) * (p.role === 'gk' ? 0.5 : 0.2) * riskK;
    }
    if (score > plainScore) {
      plainScore = score;
      plainBest = t;
    }
    if (ai) score += bondBonus(bondOf(m, p, t));
    // Profile: Den Spielmacher sucht man, der Ballmagnet will ihn sowieso.
    // 0,65 statt 0,25: Seit auf kleinen Plätzen weniger aus der Distanz geschossen wird, bekommt das
    // zentrale Mittelfeld ohnehin viel mehr Bälle – mit 0,25 fiel der Spielmacher nicht mehr auf
    // (gemessen 0,97 statt 1,32 mehr Pässe), mit 0,65 wieder 1,27 (96 Spiele, Parkplatz).
    if (ai && hasProfile(t, 'spielmacher')) score += 0.65;
    if (ai && hasProfile(t, 'ballmagnet')) score += 0.12;
    if (score > bestScore) {
      bestScore = score;
      target = t;
    }
  }
  if (target && plainBest && target !== plainBest && isBad(bondOf(m, p, plainBest))) m.events.push({ type: 'snub', playerId: p.id, otherId: plainBest.id });

  // Freiwilliger Pass der KI, aber keiner wirklich frei? Dann lieber weiterdribbeln.
  if (a.optional && (!target || bestScore < 0.35 - (p.id !== m.controlledId ? 0.12 * styleOf(m, p.team).risk : 0))) return false;

  let dir;
  let speed;
  let vy;
  let board = null;
  const lead = target && a.through && target.id === a.targetId ? a.through : null;
  // Rückpass beim Doppelpass nur nach vorn: Der Auftrag gilt bis 0,6 s – ist die Wand inzwischen am Zielpunkt vorbei,
  // spielt sie ihn nicht (sonst ginge er zurück statt in den Lauf).
  if (a.combo && lead && (lead.x - p.pos.x) * attackDir(m, p.team) < 1) return false;
  if (!target) {
    // Keiner frei? Dann eben nach vorne gebolzt – grob Richtung Tor.
    // Aus der eigenen Hälfte weit nach vorne, in der gegnerischen in die Mitte.
    const s = attackDir(m, p.team);
    const ownHalf = p.pos.x * s < 0;
    // Befreiungsschlag (a.clear): hoch und weit schräg nach vorn auf die Seitenlinie zu, weg vom Tor und von der Mitte.
    const clearSide = Math.sign(p.pos.z) || (rng.chance(0.5) ? 1 : -1);
    const aim = a.clear && pitch.boundary === 'lines' ? { x: p.pos.x + s * pitch.halfLength * 0.35, z: clearSide * (pitch.halfWidth + 3) } : ownHalf ? { x: s * pitch.halfLength * 0.5, z: 0 } : { x: p.pos.x + s * 4, z: -p.pos.z * 0.5 };
    dir = p.id === m.controlledId ? { ...p.facing } : rotate(norm(aim.x - p.pos.x, aim.z - p.pos.z), rng.gauss() * 0.25);
    speed = a.clear ? CLEAR.speed : outfieldThrow ? 9 : ownHalf ? 11 : 7;
    vy = pitch.flatPlay ? 0.3 : a.clear ? CLEAR.vy : ownHalf ? 2 : 0.5;
  } else {
    // Pass in die Tiefe (lead): nicht in den Fuß, sondern in den Raum vor dem Läufer.
    const lx0 = clamp(lead ? lead.x : target.pos.x + target.vel.x * 0.35, -pitch.halfLength, pitch.halfLength);
    const edge = pitch.boundary === 'lines' ? 1.5 : 0.5;
    const lz0 = clamp(lead ? lead.z : target.pos.z + target.vel.z * 0.35, -pitch.halfWidth + edge, pitch.halfWidth - edge);
    // Eckstoß: Die Flanke landet nicht auf den Zentimeter beim Mitspieler, sondern streut um den Zielpunkt (Standardabweichung
    // in Metern, gewählt, nicht gemessen; sonst fiel aus gut 13 % der Ecken ein Tor, real sind es 3–5 %).
    const sc = a.zone && a.lofted ? CORNER_SCATTER * (1.4 - p.attrs.passing) : 0;
    // Gestreut, aber im Feld: Ohne Grenze lag der Zielpunkt einer Ecke (2–3,5 m vor der Torlinie, Streuung um 2,5 m) oft hinter
    // der Linie – der Ball flog direkt ins Toraus (gemessen, scripts/corner-check.mjs). Ohne Streuung bleibt alles wie vorher.
    const lx = sc ? clamp(lx0 + rng.gauss() * sc, -pitch.halfLength + 1, pitch.halfLength - 1) : lx0;
    const lz = clamp(lz0 + rng.gauss() * sc, -pitch.halfWidth + edge, pitch.halfWidth - edge);
    // Halle: Ist der direkte Weg zugestellt, kommt aber ein Ball über die Bande an, wird die Bande angespielt.
    board = !a.lofted && !lead && !a.zone && target ? boardChoice(m, p, { x: lx, z: lz }, false) : null;
    const d = board ? board.len : len(lx - p.pos.x, lz - p.pos.z);
    dir = board ? norm(board.aim.x - p.pos.x, board.aim.z - p.pos.z) : norm(lx - p.pos.x, lz - p.pos.z);
    if (a.lofted) {
      // Hoher Ball: Flanken kommen auf Kopfhöhe, sonst landet er vor den Füßen.
      // Scharf an den ersten Pfosten: flacher und schneller – aber auch dann in Kopfhöhe (CROSS_ARRIVE). Mit 1,1 m kam er auf
      // Brusthöhe an, zu hoch für den Fuß und zu tief für den Kopf (headerTouch ab 1,35 m): Gemessen ging so rund jede dritte
      // Ecke unberührt durch bis ins Aus (scripts/corner-check.mjs, vom Nutzer gemeldet 2026-10-23).
      const arrive = a.lofted === 'cross' ? (a.driven ? CROSS_ARRIVE.driven : CROSS_ARRIVE.high) : 0.3;
      vy = a.driven ? clamp(1.5 + d * 0.1, 2, 3.2) : clamp(3 + d * 0.22, 4, 8);
      const flight = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * 9.81 * (arrive - 0.11)))) / 9.81;
      speed = d / Math.max(0.4, flight);
      // Zu weit für den Bogen: Bei vy 3 und 20 m ergab die Rechnung 50 m/s (Ecke auf dem Großfeld bis 129 m/s). Höchsttempo
      // einer Flanke: 24 m/s scharf, 27 m/s hoch (gewählt, nicht gemessen); der Bogen wird dann so hoch, dass der Ball
      // zum Zeitpunkt t = d / v in der Ankunftshöhe ist: vy = (h - 0,11) / t + g t / 2.
      const vmax = a.driven ? CROSS_VMAX.driven : CROSS_VMAX.high;
      if (speed > vmax) {
        const t = d / vmax;
        vy = (arrive - 0.11) / t + 4.905 * t;
        speed = vmax;
      }
    } else if (lead) {
      // In den Lauf: so dosiert, dass er kurz (2,5 m) hinter dem Zielpunkt ausrollt (Bodenmodell aus ball.js).
      speed = clamp(rollSpeedFor(d + 2.5, 0, pitch.surface), 6, 15);
      vy = 0.2;
    } else {
      // Flache Pässe mit Zug – ein lahmer Pass wird in der Kreisklasse abgefangen.
      speed = clamp(3.5 + d * 0.75, 5.5, 16);
      vy = d > 16 && !pitch.flatPlay ? 3.5 : 0.2;
    }
    const sigma = (0.02 + 0.12 * (1 - p.attrs.passing) + 0.05 * STAMINA.skill * fatigue) * (eye ? 0.5 : 1) * (hasTrait(p, 'ex_profi') ? 0.6 : 1) * (hasProfile(p, 'spielmacher') ? 0.85 : 1) * pressureChaos(m, p);
    dir = rotate(dir, rng.gauss() * sigma);
    speed *= 1 + rng.gauss() * 0.08 * (1 - p.attrs.passing);
    if (p.id === m.controlledId) m.pendingSwitch = { receiver: target.id, kicker: p.id };
  }
  if (fromHands) vy = Math.max(vy, 1.5);
  if (outfieldThrow) speed = Math.min(speed, 12);
  ball.vel.x = dir.x * speed;
  ball.vel.y = vy;
  ball.vel.z = dir.z * speed;
  p.facing = { x: dir.x, z: dir.z };
  m.lastPass = { playerId: p.id, team: p.team, time: m.time };
  // Offener Pass: Der Adressat läuft dem Ball entgegen (siehe ai.js, receiveSpot).
  // Flache Hereingabe (a.low) zählt als Flanke, ist aber ein Pass am Boden.
  const isCross = a.lofted === 'cross' || !!a.low;
  m.pass = target ? { targetId: target.id, kicker: p.id, team: p.team, time: m.time, cross: isCross || undefined, board: board?.side } : null;
  // In die Tiefe: Wie lange die Verteidiger zum Umschalten brauchen, hängt an ihrem Zweikampfverhalten.
  if (m.pass && lead && !isCross) { // Flanke in den Lauf ist kein Steilpass: keine Schrecksekunde der Abwehr
    const defs = m.players.filter((o) => o.team !== p.team && o.role === 'def');
    const read = defs.length ? defs.reduce((s2, o) => s2 + o.attrs.tackling, 0) / defs.length : 0.5;
    m.pass.through = true;
    m.pass.react = 0.55 - 0.3 * read;
  }
  // Rückpass beim Doppelpass: in den Lauf gespielt, aber kein Ball hinter die Abwehrlinie.
  if (a.combo && m.combo?.wall === p.id && !m.combo.returned) {
    m.combo.returned = true;
    m.events.push({ type: 'combo', kind: m.combo.kind, playerId: m.combo.runner, wallId: p.id });
  }
  m.events.push({ type: 'pass', playerId: p.id, targetId: target?.id ?? null, lofted: !!a.lofted, cross: isCross || undefined, crossKind: isCross ? (a.low ? 'flach' : a.driven ? 'halbhoch' : 'hoch') : undefined, from: { x: p.pos.x, z: p.pos.z }, to: target ? { x: target.pos.x, z: target.pos.z } : null, through: !!(a.through && target && !a.combo && !isCross), combo: a.combo || undefined });
  if (board) m.events.push({ type: 'bandenpass', kind: 'pass', playerId: p.id, targetId: target.id });
}

// Bandenspiel (pitch.boardPlay, nur KI): Der direkte Weg nach `to` ist zugestellt, aber ein Ball über die Längsbande kommt an.
// Rückgabe { side, bounce, aim, len } (siehe boardRoute in ball.js) oder null. Für Schüsse zählt der Torwart nicht als Sperre.
function boardChoice(m, p, to, shot) {
  const { pitch } = m;
  const bp = pitch.boardPlay;
  if (!bp || p.id === m.controlledId) return null;
  const opps = m.players.filter((o) => o.team !== p.team && !(shot && o.role === 'gk') && dist2d(o.pos, p.pos) > 0.7);
  const blocked = (a, b, lane) => opps.some((o) => distToSegment(o.pos, a, b) < lane);
  if (!blocked(p.pos, to, shot ? bp.shotBlockLane : bp.blockLane)) return null;
  const direct = dist2d(p.pos, to);
  let best = null;
  for (const side of [-1, 1]) {
    const r = boardRoute(pitch, p.pos, to, side);
    if (!r || r.len > bp.maxLen || r.len > direct * bp.maxDetour + 4 || Math.abs(r.bounce.x) > pitch.halfLength - 1) continue;
    if (blocked(p.pos, r.bounce, bp.clearLane) || blocked(r.bounce, to, bp.clearLane)) continue;
    if (!best || r.len < best.len) best = { ...r, side };
  }
  return best;
}

// Strafraum: Nur hier darf der Torwart den Ball in die Hand nehmen.
// Wie viel kürzer als die lange Spieldauer auf diesem Platz das Spiel ist
// (1 = volle Länge, bis 2,5). So ist „kurz" im Hinterhof so flott wie auf dem Rasen.
// Torwart gegen Fernschüsse (Spielwerte, eingemessen auf Opta-Werte der Premier League: im Strafraum 13–15 %, von außerhalb
// 3–4 % Tore je Schuss, https://www.premierleague.com/news/4272809). KEEPER_FAR: Zuschlag für kurze Spiele voll bis 16,5 m,
// weg ab 25 m. KEEPER_TIME: je Sekunde Flugzeit über 1 s 0,4 weniger Gegentreffer, höchstens 0,35 (ab 0,5 s kostete es auf
// Rasen- und Sportplatz zu viele Tore: 9 % je Schuss statt 10–12 %).
export const KEEPER_FAR = { from: 16.5, span: 8.5 };
// Torwart im Strafraum: Zuschlag für kurze Spiele höchstens wie auf dem 7er-Feld (halbe Länge 26 m), Reichweite wächst ab dem
// 5-m-Tor (halbe Breite 2,5 m) mit der Torbreite. Gemessen (Schüsse aus < 16,5 m, 60–120 Spiele): Rasen 13,9 %, Sportplatz
// 21 → 16 %, Großfeld 32 → 17 % Tore je Schuss.
export const BRISK_PITCH_MAX = 1.5;
export const KEEPER_REACH_GW = 2.5;
export const KEEPER_TIME = { from: 1, per: 0.4, max: 0.35 };
// Kraftverlust insgesamt (Faktor auf alle Verluste, für Messungen); je Platz: pitch.js STAMINA_DRAIN.
// skill: wie stark Müdigkeit Schuss, Pass, Ballannahme und Luftlöcher verstreut. 2 statt 1 (2026-10-30): Mit dem eingemessenen
// Kraftverlust sind Schützen im Schnitt nur noch etwa halb so müde (Müdigkeit bei Schüssen Großfeld 0,73 → 0,30, Rasen 0,64 → 0,35,
// Parkplatz 0,43 → 0,34); die Eichungen der Torquoten hatten die ständige Erschöpfung stillschweigend eingerechnet. Doppelt gewichtet
// zielt man frisch genauer, müde am Ende so schlecht wie vorher. Messung: docs/KONZEPT-SPIELERSTAERKE.md 11.4.
export const STAMINA = { drain: 1, skill: 2 };
export const shortGame = (m) => clamp((m.fullLength || 600) / (m.duration || 600), 1, 2.5);

// Elfmeter – im Elfmeterschießen oder im Spiel: Der Torwart muss raten.
const spotKick = (m) => m.phase === 'shootout' || m.time - (m.penaltyKick ?? -9) < 1.2;

export function keeperBox(pitch) {
  const depth = Math.min(6, pitch.halfLength * 0.3);
  return { depth, halfWidth: Math.min(pitch.halfWidth, pitch.goalHalfWidth + depth * 0.9) };
}
// Strafraum für Fouls, Elfmeter und Torwart-Hände: echte Maße, wo der Platz sie hat (Großfeld), sonst der Torwartraum.
export const penaltyBox = (pitch) => pitch.penaltyBox ?? keeperBox(pitch);
export function inPenaltyBox(pitch, pos, goalX, margin = 0) {
  const b = penaltyBox(pitch);
  return Math.abs(pos.x - goalX) <= b.depth + margin && Math.abs(pos.z) <= b.halfWidth + margin;
}
export function inKeeperBox(pitch, pos, goalX, margin = 0) {
  const b = keeperBox(pitch);
  return Math.abs(pos.x - goalX) <= b.depth + margin && Math.abs(pos.z) <= b.halfWidth + margin;
}

// Hände nur im Torraum: 1 m vor der Linie, je 1 m neben den Pfosten. Kommt der Keeper weiter
// raus, spielt er wie ein Feldspieler mit dem Fuß (der Strafraum oben bleibt für Standards).
export const HAND_ZONE = { depth: 1, side: 1 };
export function inHandZone(pitch, pos, goalX, margin = 0) {
  if (pitch.keeperSweep?.handsInBox) return inPenaltyBox(pitch, pos, goalX, margin); // Großfeld: Hände im Strafraum (pitch.js)
  return Math.abs(pos.x - goalX) <= HAND_ZONE.depth + margin && Math.abs(pos.z) <= pitch.goalHalfWidth + HAND_ZONE.side + margin;
}

export function keeperSaves(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder) return;
  for (const p of m.players) {
    if (p.role !== 'gk' || p.catchCooldown > 0 || p.state !== 'normal') continue;
    const s = attackDir(m, p.team);
    const goalX = -s * pitch.halfLength;
    // Hände nur im eigenen Torraum. Weiter draußen (bis zum Strafraum) hält er flache Bälle
    // nur noch mit Fuß und Körper: kürzere Reichweite, kein Fangen, kein Hechtsprung.
    const hands = inHandZone(pitch, ball.pos, goalX, 0.2) && inHandZone(pitch, p.pos, goalX, 0.2);
    if (!hands && (!inKeeperBox(pitch, ball.pos, goalX, 0.3) || !inKeeperBox(pitch, p.pos, goalX, 0.3))) continue;
    // Inkl. Hechtsprung. Vor großen Toren (Asche, Rasen) streckt er sich weiter –
    // sonst deckt er dort anteilig viel weniger ab als vor dem Jackentor.
    // Beim Elfmeter steht er fest auf der Linie – ohne Anlauf reicht der Sprung weniger weit.
    // Vor dem 7,32-m-Tor (Großfeld) deckt er anteilig so viel ab wie vor dem 5-m-Tor (KEEPER_REACH_GW): Vorher gingen dort
    // 35 von 486 Schüssen aus dem Strafraum rein, an die er gar nicht herankam (120 Spiele), jetzt 10.
    const reach = hands ? (0.85 + 0.75 * p.attrs.keeping) * clamp(pitch.goalHalfWidth / 1.6, 0.85, 1.3) * Math.max(1, pitch.goalHalfWidth / KEEPER_REACH_GW) * (spotKick(m) ? 0.62 : 1) : 0.55 + 0.35 * p.attrs.keeping;
    // Gegnerische Flanke: Er fängt sie auch, wenn sie nicht aufs Tor fliegt (Ecken kommen von der Grundlinie weg), und streckt
    // sich höher (ai.js KEEPER_CLAIM). Vorher sprang er nur für Bälle Richtung Tor und bis 2,3 m.
    const oppCross = hands && !!m.pass?.cross && m.pass.team !== p.team && ball.pos.y > 1;
    if (dist2d(p.pos, ball.pos) > reach || ball.pos.y > (hands ? (oppCross ? KEEPER_CLAIM_Y : 2.3) : 1)) continue;

    const bs = ballSpeed(ball);
    const towardGoal = ball.vel.x * -s > 0;
    if (bs >= 4 && !towardGoal && !oppCross) continue;
    // Langsamer Ball außerhalb des Torraums: kein Abwehren – er nimmt ihn mit dem Fuß an.
    if (!hands && bs < 4) continue;
    // Ball am Fuß eines Gegners: Der Keeper muss sich in die Füße werfen. Klappt
    // mal, sonst liegt er und das Tor ist offen.
    const carrier = ball.lastAction === 'dribble' ? m.players.find((c) => c.id === ball.lastTouch) : null;
    if (carrier && carrier.team !== p.team && dist2d(carrier.pos, ball.pos) < 0.9) {
      p.catchCooldown = 0.9;
      p.diveAnim = 0.5;
      p.diveSide = Math.sign(ball.pos.z - p.pos.z) || 1;
      if (!rng.chance(0.52 + 0.35 * p.attrs.keeping - 0.15 * carrier.attrs.technique)) {
        m.events.push({ type: 'beaten', playerId: p.id });
        return;
      }
    } else p.catchCooldown = 0.25;
    // Kreisklasse-Keeper: Scharfe, platzierte Schüsse sind oft einfach drin.
    if (bs >= 6 && ball.lastAction !== 'pass') {
      // Platzierung zählt: Wo kreuzt der Ball die Linie – wie weit weg vom Keeper?
      const goalX = -s * pitch.halfLength;
      const tLine = Math.abs(ball.vel.x) > 0.1 ? (goalX - ball.pos.x) / ball.vel.x : 0;
      const lineZ = ball.pos.z + ball.vel.z * Math.max(0, tLine);
      const away = Math.abs(lineZ - p.pos.z);
      const gw = pitch.goalHalfWidth;
      const corner = clamp((away / gw - 0.35) * 0.45, 0, 0.3) + (Math.abs(lineZ) > gw * 0.65 ? 0.06 : 0);
      // Aus kurzer Distanz bleibt kaum Zeit zu reagieren: Nur was direkt auf den Mann
      // kommt, hält er sicher.
      const since = m.time - (m.shotTime ?? -9);
      const reaction = keeperReaction(m, p);
      const pointBlank = since < reaction + 0.12 ? clamp((dist2d(p.pos, ball.pos) - 0.35) * 0.3, 0, 0.25) : 0;
      // Elfmeter an den Pfosten: selbst bei richtiger Ecke schwer zu halten.
      const postShot = spotKick(m) ? clamp(Math.abs(lineZ) / gw, 0, 1) * 0.5 : 0;
      // Kurze Spiele: etwas mehr Tore, sonst endet die Hälfte 0:0.
      // Wie weit weg wurde geschossen? Der Zuschlag für kurze Spiele gilt nur bis knapp vor den Strafraum (KEEPER_FAR) – bei einem
      // Fernschuss hat der Torwart Zeit. Vorher galt er für jeden Schuss: Auf dem Großfeld gingen 13 % der Schüsse aus mehr als
      // 25 m rein (real 3–4 % von außerhalb des Strafraums).
      const fromD = m.shotFrom && since < 3 ? Math.hypot(goalX - m.shotFrom.x, m.shotFrom.z) : 0;
      const near = clamp(1 - (fromD - KEEPER_FAR.from) / KEEPER_FAR.span, 0, 1);
      // Der Zuschlag wächst mit der Platzlänge nur bis zum 7er-Feld (BRISK_PITCH_MAX). Vorher: Sportplatz ×2,25, Großfeld ×3,7 – dort
      // gingen 21 % bzw. 32 % der Schüsse aus dem Strafraum rein (real 13–16 %, Opta).
      const brisk = spotKick(m) ? 0 : (shortGame(m) - 1) * 0.1 * Math.min(BRISK_PITCH_MAX, 1 + Math.max(0, pitch.halfLength - 20) / 12) * (m.goalPace ?? 1) * near;
      // Lange Flugzeit: Der Torwart sieht den Ball kommen und steht richtig (KEEPER_TIME).
      const tFly = fromD > 0 ? fromD / Math.max(bs, 1) : 0;
      const early = spotKick(m) ? 0 : clamp((tFly - KEEPER_TIME.from) * KEEPER_TIME.per, 0, KEEPER_TIME.max);
      const beaten = clamp((bs - 8) * 0.02 + corner * 0.85 + pointBlank + postShot + brisk - early - 0.3 * p.attrs.keeping - (dist2d(p.pos, ball.pos) < 0.45 ? 0.15 : 0), 0.02, 0.7);
      if (rng.chance(beaten)) {
        p.catchCooldown = 0.7; // zu spät – der Ball ist vorbei
        if (hands && ball.pos.y > 1.5) p.jumpAnim = 0.5; // hoch: springt vergeblich hoch
        else p.diveAnim = 0.5;
        p.diveSide = Math.sign(ball.pos.z - p.pos.z) || 1;
        m.events.push({ type: 'beaten', playerId: p.id });
        return;
      }
    }
    // Hoher Ball im Torraum: hochspringen, beide Arme lang – statt zur Seite zu hechten.
    const high = hands && ball.pos.y > 1.5;
    // Bedrängt (Gegner am Ball)? Dann lieber fausten als fangen.
    const pressed = high && m.players.some((o) => o.team !== p.team && o.state === 'normal' && dist2d(o.pos, ball.pos) < 1.5);
    if (high) p.jumpAnim = 0.5;
    // Hechtsprung, wenn der Ball nicht direkt auf den Mann kommt (nur mit Händen).
    else if (hands && dist2d(p.pos, ball.pos) > 0.45) {
      p.diveAnim = 0.5;
      p.diveSide = Math.sign(ball.pos.z - p.pos.z) || 1;
    }
    const pCatch = (!hands ? 0 : bs < 4 ? 0.97 : clamp(0.3 + 0.6 * p.attrs.keeping - (bs - 8) * 0.03, 0.08, 0.95)) * (pressed ? 0.45 : 1);
    if (pCatch > 0 && rng.chance(pCatch)) {
      ball.holder = p.id;
      ball.vel.x = ball.vel.y = ball.vel.z = 0;
      ball.lastTouch = p.id;
      m.lastTouchTeam = p.team;
      m.pendingSwitch = null;
      if (bs >= 4) m.events.push({ type: 'catch', playerId: p.id, high });
    } else if (high) {
      // Fausten: weit nach vorn und hoch weg vom Tor – nicht zur Seite, nicht zurück ins Getümmel.
      const side = Math.sign(ball.pos.z - p.pos.z) || (rng.chance(0.5) ? 1 : -1);
      ball.vel.x = s * rng.range(7, 11);
      ball.vel.z = side * rng.range(1, 4);
      ball.vel.y = rng.range(3, 5);
      p.punchAnim = 0.35;
      p.catchCooldown = 0.6;
      ball.lastTouch = p.id;
      ball.lastAction = 'save';
      m.lastTouchTeam = p.team;
      m.events.push({ type: 'save', playerId: p.id, punch: true });
    } else {
      // Zur Seite abwehren, flach und zügig – nicht zurück vors eigene Tor und
      // nicht als Kerze über den Keeper.
      const side = Math.sign(ball.pos.z - p.pos.z) || (rng.chance(0.5) ? 1 : -1);
      // Harte Schüsse lenkt er über die Latte oder ums Tor – dann gibt es Ecke. Vorher 0,35–1,05 Ecken je Spiel (40 Spiele
      // je Platz): nur 12 von 77 Paraden wurden gelenkt, jeder dritte gelenkte Ball blieb vor der Linie liegen.
      // Bezug: 3,1–3,5 Ecken je Tor (Bundesliga 10,9, Premier League 9,4 Ecken bei je rund 27 Schüssen; soccerstats.com).
      const tip = hands && pitch.boundary === 'lines' && m.phase !== 'shootout' && rng.chance(clamp(0.3 + (bs - 10) * 0.05, 0.2, 0.9));
      if (tip) {
        const over = Math.abs(ball.pos.z) < pitch.goalHalfWidth * 0.6 || rng.chance(0.5); // mittig nur drüber, nie ins eigene Netz
        ball.pos.y = Math.min(ball.pos.y, 1.2);
        // Über die Latte heißt: Der Scheitel liegt über der Latte. Vorher reichten 4,5–6 m/s nur bis 2,2–3,0 m – vor dem
        // Großfeld-Tor (2,44 m) fiel ein Teil der gelenkten Bälle ins eigene Netz (25 von 29 Fernschusstoren in 30 Spielen).
        const clearBar = Math.sqrt(2 * 9.81 * Math.max(0.5, pitch.goalHeight + 0.35 - ball.pos.y));
        ball.vel.y = over ? Math.max(clearBar, rng.range(4.5, 6)) : rng.range(0.5, 1.5);
        // Der Ball muss die Linie auch erreichen: Weg bis hinter die Linie, über den Scheitel bzw. in 0,35 s.
        const toLine = pitch.halfLength + BALL_RADIUS + 0.3 - Math.abs(ball.pos.x);
        ball.vel.x = -s * Math.max(toLine / (over ? ball.vel.y / 9.81 : 0.35), 1.5);
        ball.vel.z = (over ? side : Math.sign(ball.pos.z) || side) * (over ? rng.range(1, 2.5) : rng.range(5, 7)); // ums Tor: nach außen, nie zur Tormitte
      } else {
        ball.vel.x = s * rng.range(3, 5);
        ball.vel.z = side * rng.range(4, 7);
        ball.vel.y = rng.range(0.3, 1.4);
      }
      ball.pos.y = Math.min(ball.pos.y, 1.2);
      p.catchCooldown = 0.6; // den eigenen Abpraller nicht sofort wieder fangen
      ball.lastTouch = p.id;
      ball.lastAction = 'save';
      m.lastTouchTeam = p.team;
      m.events.push({ type: 'save', playerId: p.id });
    }
    return;
  }
}

// Höchsttempo eines Kopfballs aufs Tor: 16 m/s (rund 58 km/h), Spielwert. Vorher folgte es der Flanke (bis 27 m/s), dann
// 22 m/s – auf dem Großfeld lag fast jeder Kopfball nach einer Flanke an dieser Grenze, aus 3–8 m hielt der Torwart davon kaum
// einen (39 % der Kopfbälle aufs Tor gingen rein, real 11–13 %: MLS 2011–2015, Frauen-WM 2019). Eingemessen mit 120 Spielen je Platz.
export const HEAD_VMAX = 16;
export const HEAD_DUEL = { dist: 1.5, factor: 0.6, contest: 0.6 }; // contest: so viel weiter als die eigene Reichweite springt der Gegner mit (Spielwert)
export const KEEPER_CLAIM_Y = 2.6; // so hoch fängt der Torwart eine Flanke (m, Spielwert; Sprung mit gestreckten Armen)
export const HEAD_MISS = 0.45;
export const HEAD_KEEP = 0.75; // Anteil des Flankentempos, der beim Kopfball aufs Tor bleibt (Spielwert, eingemessen)
export const HEAD_PLACE = 1.6; // weiteste Platzierung eines Kopfballs neben der Tormitte (m, Spielwert, eingemessen)
export const HEAD_CLEAR = { speed: 8, vy: [3, 5] }; // Klärender Kopfball am eigenen Tor: Tempo ab 8 m/s (+5 · Kopfball), Steigung (Spielwert)
export const HEAD_GRAZE = 0.7; // Anteil der nicht sauber getroffenen Kopfbälle, die den Ball noch streifen (Spielwert)
// Zielstreuung eines Kopfballs aufs Tor (Bogenmaß, zusätzlich zur Streuung durch die Kopfballstärke): real kommen nur rund 34 % der
// Kopfbälle aufs Tor (StatsBomb); der Wert 0,3 ist gewählt, nicht gemessen.
export const HEAD_AIM = 0.3;
// Kopfball: hohe Bälle in Reichweite. Vorne aufs Tor, hinten weg vom Tor.
export function headerTouch(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder || ball.pos.y < 1.35 || ball.pos.y > 2.4) return;
  let p = null;
  let best = Infinity;
  for (const c of m.players) {
    if (c.role === 'gk' || c.kickCooldown > 0 || c.state !== 'normal') continue;
    // Den Schuss des eigenen Mitspielers lässt man durch.
    if (ball.lastAction === 'shoot' && m.lastTouchTeam === c.team) continue;
    const reach = hasTrait(c, 'kopfball') ? 0.9 : 0.7;
    const top = 1.75 * c.look.height + 0.35; // Absprung
    const d = dist2d(c.pos, ball.pos);
    if (d < reach && ball.pos.y < top && d < best) {
      best = d;
      p = c;
    }
  }
  if (!p) return;
  // Kopfballduell: Steht ein Gegner ebenfalls fast in Sprungweite (HEAD_DUEL.contest), gewinnt nicht automatisch der Nächste –
  // Kopfballstärke, Körper und Abstand entscheiden. Vorher köpfte immer der Nächste, bei Ecken fast immer der Angreifer.
  let rival = null;
  let rd = Infinity;
  for (const c of m.players) {
    if (c.team === p.team || c.role === 'gk' || c.kickCooldown > 0 || c.state !== 'normal') continue;
    const d = dist2d(c.pos, ball.pos);
    if (d < (hasTrait(c, 'kopfball') ? 0.9 : 0.7) + HEAD_DUEL.contest && ball.pos.y < 1.75 * c.look.height + 0.45 && d < rd) {
      rd = d;
      rival = c;
    }
  }
  if (rival) {
    const w = (c, d) => ((0.4 + c.attrs.heading + (hasTrait(c, 'kopfball') ? 0.25 : 0)) * (1 + STRENGTH_FX.head * 2 * (strengthOf(c) - 0.5))) / (0.25 + d);
    if (rng.chance(w(rival, rd) / (w(p, best) + w(rival, rd)))) p = rival;
  }
  if (headerDuelFoul(m, p)) return; // Schubsen im Kopfballduell: Pfiff (bei Ecken und Flanken fallen so viele Elfmeter)
  p.kickCooldown = 0.35;
  p.headAnim = 0.3;
  const monster = hasTrait(p, 'kopfball');
  const skill = clamp(p.attrs.heading + (monster ? 0.2 : 0), 0, 1);
  // Bedrängt (Gegner im Nacken): Der Kopfball gelingt seltener – bei Ecken steht jedem Angreifer ein Verteidiger gegenüber.
  // Faktor 0,6 gewählt, nicht gemessen; Maßstab war der Anteil der Ecken, aus denen ein Tor fällt (real rund 3–5 %).
  // Körper: Gegen den kräftigsten Decker im Nacken zählt der Unterschied (Mitte 0,5 = wie bisher, STRENGTH_FX.head).
  let duel = 1;
  for (const o of m.players) {
    if (o.team === p.team || o.role === 'gk' || o.state !== 'normal' || dist2d(o.pos, p.pos) >= HEAD_DUEL.dist) continue;
    const f = clamp(HEAD_DUEL.factor + STRENGTH_FX.head * (strengthOf(p) - strengthOf(o)), 0.2, 1);
    duel = Math.min(duel, f);
  }
  if (!rng.chance((0.35 + 0.4 * skill) * duel)) {
    // Nicht sauber getroffen: Meist streift er ihn noch (Kopf, Schulter, Hinterkopf) – der Ball wird abgefälscht und verliert
    // Tempo. Ganz verpasst wird er selten. Vorher flog jeder verpasste Kopfball unberührt weiter, gemessen ging so bei Ecken
    // jeder dritte Ball trotz Spieler in Reichweite ins Aus (scripts/corner-check.mjs). Anteil HEAD_GRAZE gewählt, nicht gemessen.
    if (!rng.chance(HEAD_GRAZE)) return; // ganz verpasst – Ball fliegt weiter
    const v = hypot(ball.vel.x, ball.vel.z);
    const d2 = rotate(norm(ball.vel.x, ball.vel.z), rng.gauss() * 0.6);
    const k = rng.range(0.35, 0.7);
    ball.vel.x = d2.x * v * k;
    ball.vel.z = d2.z * v * k;
    ball.vel.y = rng.range(-0.5, 2);
    p.kickCooldown = 0.35;
    p.headAnim = 0.3;
    ball.lastTouch = p.id;
    ball.lastAction = 'header';
    m.lastTouchTeam = p.team;
    m.events.push({ type: 'header', playerId: p.id, onGoal: false, graze: true });
    return;
  }

  const s = attackDir(m, p.team);
  // Wohin geköpft wird: nicht bis in den Winkel eines Großfeldtors – ein Kopfball ist selten so platziert (HEAD_PLACE, Meter).
  const place = Math.min(pitch.goalHalfWidth * 0.8, HEAD_PLACE);
  const goal = { x: s * pitch.halfLength, z: rng.range(-place, place) };
  // Aufs Tor geköpft wird bis knapp hinter den Elfmeterpunkt (Großfeld 11 m) – fest 8 m hieß dort: nie.
  const nearGoal = dist2d(p.pos, goal) < Math.max(8, (pitch.penaltyDistance ?? 0) + 2);
  let dir = nearGoal ? norm(goal.x - p.pos.x, goal.z - p.pos.z) : norm(s * 0.8 + p.facing.x * 0.2, p.facing.z * 0.5);
  dir = rotate(dir, rng.gauss() * ((nearGoal ? HEAD_AIM : 0.1) + 0.4 * (1 - skill)) * (monster ? 0.5 : 1));
  // Aufs Tor: Das Tempo der Flanke bleibt erhalten, der Kopf legt bis zu 4,5 m/s drauf (Sprung-/Standkopfball,
  // MDPI Appl. Sci. 14/946, 2024). Vorher immer 4–8 m/s – der Torwart hielt 14 von 22 Kopfbällen aufs Tor.
  const incoming = hypot(ball.vel.x, ball.vel.z);
  // Verteidiger köpft am eigenen Tor, ein Gegner im Nacken: Nicht jede Klärung geht sauber nach vorn. Der Ball wird
  // nur verlängert, behält seine Richtung (um bis zu etwa 30 Grad abgelenkt) und fliegt hinter die eigene Grundlinie
  // oder ins Seitenaus. Anteil gewählt, nicht gemessen: steigt mit Bedrängnis und sinkt mit Kopfballstärke.
  const own = -s;
  if (!nearGoal && ball.vel.x * own > 0 && p.pos.x * own > pitch.halfLength * 0.45 && incoming > 3) {
    const pressed = m.players.some((o) => o.team !== p.team && o.role !== 'gk' && o.state === 'normal' && dist2d(o.pos, p.pos) < 2);
    if (pressed && rng.chance(HEAD_MISS * (1.3 - skill))) {
      const d2 = rotate(norm(ball.vel.x, ball.vel.z), rng.gauss() * 0.5);
      const v = Math.max(5, incoming * rng.range(0.6, 0.9));
      ball.vel.x = d2.x * v;
      ball.vel.z = d2.z * v;
      ball.vel.y = rng.range(1, 3);
      ball.lastTouch = p.id;
      ball.lastAction = 'header';
      m.lastTouchTeam = p.team;
      m.events.push({ type: 'header', playerId: p.id, onGoal: false });
      return;
    }
  }
  // Aufs Tor: vom Tempo der Flanke bleibt beim Umlenken nur ein Teil (HEAD_KEEP), der Kopf legt etwas drauf. Weg vom Tor
  // (Klärung der Abwehr, Ablage): weiter und höher als früher (4–8 m/s, 1–3 m/s hoch) – die Klärungen landeten wieder im
  // Strafraum, nach Ecken fiel so aus jeder sechsten ein Tor (real 2–4 %). Beides Spielwerte, eingemessen auf die
  // Verwertung von Kopfbällen aufs Tor (real 11–13 %: MLS 2011–2015, Frauen-WM 2019) und die Torquote nach Ecken
  // (scripts/corner-check.mjs).
  const clear = !nearGoal && p.pos.x * own > pitch.halfLength * 0.4; // am eigenen Tor
  const speed = nearGoal ? Math.min(incoming * HEAD_KEEP + 1.5 + 3 * skill + (monster ? 1.5 : 0), HEAD_VMAX) : clear ? HEAD_CLEAR.speed + 5 * skill : 4 + 4 * skill + (monster ? 1.5 : 0);
  ball.vel.x = dir.x * speed;
  ball.vel.y = nearGoal ? rng.range(-1.5, 0.5) : clear ? rng.range(HEAD_CLEAR.vy[0], HEAD_CLEAR.vy[1]) : rng.range(1, 3);
  ball.vel.z = dir.z * speed;
  ball.lastTouch = p.id;
  ball.lastAction = 'header';
  m.lastTouchTeam = p.team;
  p.facing = dir;
  if (nearGoal) {
    markShooter(m, p);
    // Für den Torwart ist ein Kopfball aufs Tor ein Schuss: Reaktionszeit und Entfernung zählen wie beim Fuß (keeperSaves).
    // Vorher blieb m.shotTime beim letzten Schuss stehen – aus 6 m hatte er dieselbe Zeit wie bei einem Fernschuss und hielt
    // 91 % der Kopfbälle aufs Tor (Großfeld, 80 Spiele); Kopfballtore: 4–7 % der Kopfbälle aufs Tor, real 11–13 % (siehe HEAD_VMAX).
    m.shotTime = m.time;
    m.shotFrom = { x: p.pos.x, z: p.pos.z };
  }
  m.events.push({ type: 'header', playerId: p.id, onGoal: nearGoal });
}

// Harte Bälle in Hüft- bis Brusthöhe prallen vom Körper eines Gegners ab.
export function bodyBlock(m) {
  const { ball, rng } = m;
  if (ball.holder || ball.pos.y < 0.7 || ball.pos.y > 1.7 || ballSpeed(ball) < 7) return;
  for (const c of m.players) {
    if (c.team === m.lastTouchTeam || c.role === 'gk' || c.state === 'down') continue;
    if (dist2d(c.pos, ball.pos) > 0.4) continue;
    const side = rng.chance(0.5) ? 1 : -1;
    // Prallt ab und fällt vor die Füße – verliert fast den ganzen Schwung.
    ball.vel.x = -ball.vel.x * rng.range(0.05, 0.15);
    ball.vel.z = ball.vel.z * 0.15 + side * rng.range(0.5, 2);
    ball.vel.y = rng.range(0, 1.5);
    ball.lastTouch = c.id;
    ball.lastAction = 'block';
    m.lastTouchTeam = c.team;
    m.events.push({ type: 'block', playerId: c.id });
    return;
  }
}

// Ball am Fuß: Wer gerade dribbelt und dicht dran ist, behält den Ball. Ein Gegner,
// der nur hinläuft (oder blind draufhält), kommt selten dran – dafür gibt es
// Stochern und Grätsche. Gibt true zurück, wenn der Gegner leer ausgeht.
function shielded(m, p) {
  const { ball, rng } = m;
  if (ball.lastAction !== 'dribble' || ball.lastTouch === p.id) return false;
  const carrier = m.players.find((c) => c.id === ball.lastTouch);
  if (!carrier || carrier.team === p.team || carrier.state !== 'normal' || dist2d(carrier.pos, ball.pos) > REACH * 1.5) return false;
  // Körper (strength.js): Abschirmen im Stehen hängt am eigenen Körper (vorher fest 0,2), im Duell zählt der Unterschied.
  const shield = carrier.shielding ? STRENGTH_FX.shieldBase + STRENGTH_FX.shieldPerStrength * strengthOf(carrier) : 0;
  let steal = clamp(0.3 + 0.3 * p.attrs.tackling - 0.3 * carrier.attrs.technique - shield - (carrier.id === m.controlledId ? 0.08 : 0) + STRENGTH_FX.duel * (strengthOf(p) - strengthOf(carrier)), 0.05, 0.5);
  // Ping-Pong-Bremse B (docs/agent/pingpong-audit-2026-10.md, Mechanismus 1): Wer den Ball gerade per Berührung gewonnen hat,
  // ist kurz geschützt – die Klauchance halbiert sich. Ohne Schutz nahm der Ex-Ballführer ihn im 0,35-s-Takt zurück.
  if (carrier.protectUntil > m.time) steal *= PINGPONG.protectedStealMul;
  if (rng.chance(steal)) return false;
  p.kickCooldown = 0.35;
  return true;
}

// Ballführung: Wer dribbelt und dicht dran ist, zieht den Ball sanft vor den eigenen
// Fuß – auch in Kurven. Technik entscheidet, wie eng; der gesteuerte Spieler bekommt
// etwas Hilfe. Gegner kommen nur über Stochern, Grätsche oder einen Fehler dran.
export function carryBall(m, dt) {
  const { ball } = m;
  if (ball.holder || ball.pos.y > 0.5 || ball.lastAction !== 'dribble') return;
  const c = m.players.find((p) => p.id === ball.lastTouch);
  if (!c || c.state !== 'normal' || c.role === 'gk' || c.shooting) return;
  const d = dist2d(c.pos, ball.pos);
  if (d > 1.1 || ballSpeed(ball) > 11) return;
  const human = c.id === m.controlledId;
  const grip = clamp(0.35 + 0.5 * c.attrs.technique + (human ? 0.3 : 0) + (hasTrait(c, 'ballsicher') ? 0.15 : 0) - 0.2 * (1 - c.stamina), 0.2, 1.1);
  const ahead = 0.4 + 0.08 * len(c.vel.x, c.vel.z) / 6;
  const tx = c.pos.x + c.facing.x * ahead;
  const tz = c.pos.z + c.facing.z * ahead;
  const wantX = c.vel.x + (tx - ball.pos.x) * 4;
  const wantZ = c.vel.z + (tz - ball.pos.z) * 4;
  const k = 1 - Math.exp(-grip * 7 * dt);
  ball.vel.x += (wantX - ball.vel.x) * k;
  ball.vel.z += (wantZ - ball.vel.z) * k;
}

// Gerade gespielter Pass, ein Gegner steht dicht am Passgeber: Kommt der Ball an ihm vorbei?
// Früher bekam der nächste Gegner in Ballnähe den Ball einfach – rund vier von fünf
// abgefangenen Pässen waren so „geblockt", ganz gleich, wie gut Passgeber und Presser sind.
// Jetzt entscheidet das Duell: saubere, schnelle Ablage am Mann vorbei (Passwert) gegen
// Antizipation und Zugriff (Zweikampf), dazu Balltempo und ob er vor dem Ball steht oder
// nur daneben. Einmal je Pass und Gegner; kommt der Ball vorbei, ist er für diesen Ball raus.
const PASS_DUEL_TIME = 0.4;
function passBeatsPresser(m, c) {
  const { ball } = m;
  const lp = m.lastPass;
  if (!lp || ball.lastAction !== 'pass' || ball.lastTouch !== lp.playerId || c.team === lp.team || m.time - lp.time > PASS_DUEL_TIME) return false;
  lp.duel ??= {};
  if (lp.duel[c.id] === undefined) {
    const kicker = m.players.find((q) => q.id === lp.playerId);
    if (!kicker) return false;
    const bs = ballSpeed(ball);
    const dx = c.pos.x - ball.pos.x;
    const dz = c.pos.z - ball.pos.z;
    const ahead = (dx * ball.vel.x + dz * ball.vel.z) / ((len(dx, dz) || 1) * (bs || 1)); // 1 = mitten im Weg
    const block = clamp(0.55 + 0.5 * (c.attrs.tackling - 0.5) - 0.7 * (kicker.attrs.passing - 0.5) + 0.2 * ahead - 0.03 * (bs - 9), 0.1, 0.92);
    lp.duel[c.id] = !m.rng.chance(block);
  }
  if (!lp.duel[c.id]) return false;
  c.kickCooldown = Math.max(c.kickCooldown, 0.3);
  return true;
}

// Abgefälscht: Ein Gegner kommt an einen harten Ball, der aufs eigene Tor fliegt, und kann ihn nicht
// kontrollieren. Ein streifender Kontakt wirft den Ball nicht zurück (das war die frühere Abprallregel,
// Faktor -0,35), sondern lenkt ihn aus der Richtung ab: er behält den größeren Teil von Tempo und
// Richtung. So gehen abgefälschte Schüsse, Flanken und Pässe auch mal hinter die eigene Grundlinie
// (Ecke) oder zur Seite (Einwurf). Die Spanne (Ablenkwinkel, 45–75 % des Tempos) ist gewählt, nicht gemessen.
export const DEFLECT = { wideMin: 1.5, wideMax: 7, keepMin: 0.45, keepMax: 0.75 };
function deflect(m, p, prevTeam) {
  const { ball, rng } = m;
  if (prevTeam === null || prevTeam === p.team || m.pitch.boundary !== 'lines') return false; // nur Plätze mit Linien (dort gibt es Ecken)
  const own = -attackDir(m, p.team); // Richtung des eigenen Tors
  if (ball.vel.x * own <= 0 || p.pos.x * own <= 0) return false; // nur Bälle aufs eigene Tor, in der eigenen Hälfte
  const keep = rng.range(DEFLECT.keepMin, DEFLECT.keepMax);
  // Wohin: an den Pfosten vorbei (Zielpunkt auf der Grundlinie neben dem Tor), aber nicht mehr als etwa 85 Grad
  // aus der Flugrichtung gedreht. Ein Ball, der abgefälscht wird und doch ins Tor geht, ist selten (Eigentor).
  const gx = own * m.pitch.halfLength;
  const wide = m.pitch.goalHalfWidth + rng.range(DEFLECT.wideMin, DEFLECT.wideMax);
  const inc = norm(ball.vel.x, ball.vel.z);
  const toward = (zt) => norm(gx - p.pos.x, zt - p.pos.z);
  // Die Seite, die näher an der Flugrichtung liegt (weniger Drehung).
  const cosOf = (v) => v.x * inc.x + v.z * inc.z;
  const dPos = toward(wide);
  const dNeg = toward(-wide);
  let d = cosOf(dPos) > cosOf(dNeg) ? dPos : dNeg;
  if (rng.chance(0.3)) d = d === dPos ? dNeg : dPos; // auch die andere Seite kommt vor
  if (cosOf(d) < 0.09) d = norm(inc.x + d.x * 0.5, inc.z + d.z * 0.5);
  const h = hypot(ball.vel.x, ball.vel.z) * keep;
  ball.vel.x = d.x * h;
  ball.vel.z = d.z * h;
  ball.vel.y = (1 + rng.next() * 3) * (m.pitch.flatPlay ? 0.4 : 1); // vom Schienbein oder Fuß auch mal hoch (Halle: kaum)
  ball.lastAction = 'block'; // kein Ballführen danach
  return true;
}

export function dribbleTouch(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder || ball.pos.y > 0.7) return;
  let p = null;
  let best = REACH * 0.8;
  for (const c of m.players) {
    // Den eigenen Ball, den man gerade überläuft, darf man auch direkt wieder berühren.
    const catching = c.id === ball.lastTouch && ball.lastAction === 'dribble' && ballSpeed(ball) < len(c.vel.x, c.vel.z);
    if ((c.kickCooldown > 0 && !catching) || c.state !== 'normal' || fooled(m, c)) continue;
    const d = dist2d(c.pos, ball.pos);
    if (d < best) {
      best = d;
      p = c;
    }
  }
  if (!p) return;

  if (passBeatsPresser(m, p)) return;
  if (shielded(m, p)) return;

  // Ball am Fuß, Gegner vor sich: Wer es draufhat, versucht einen Trick.
  const own = ball.lastTouch === p.id && ball.lastAction === 'dribble';
  if (own && ballSpeed(ball) < 9 && tryTrick(m, p)) {
    m.events.push({ type: 'touch', playerId: p.id });
    return;
  }

  const tech = p.attrs.technique;
  const fatigue = 1 - p.stamina;
  const calm = hasTrait(p, 'ballsicher') || hasTrait(p, 'ex_profi') ? 0.5 : 1;
  const bs = ballSpeed(ball);
  const prevTeam = m.lastTouchTeam;
  p.kickCooldown = 0.2 + rng.next() * 0.12;
  // Ping-Pong-Bremse A + B (docs/agent/pingpong-audit-2026-10.md, Mechanismus 1, Varianten „losslock“ und „winlock“):
  // Wer den Ball per Berührung vom Gegner holt, ist kurz geschützt (B, siehe shielded); der Verlierer darf ihn
  // PINGPONG.loserLock lang nicht per Berührung zurückholen (A). Rein zeitliche Sperren, kein Zufallsstrom.
  const loser = ball.lastTouch != null ? m.players.find((q) => q.id === ball.lastTouch) : null;
  if (loser && loser.team !== p.team) {
    loser.kickCooldown = Math.max(loser.kickCooldown, PINGPONG.loserLock);
    p.protectUntil = m.time + PINGPONG.winnerProtect;
  }
  ball.lastTouch = p.id;
  ball.lastAction = 'dribble';
  m.events.push({ type: 'touch', playerId: p.id });
  m.lastTouchTeam = p.team;
  if (m.pendingSwitch && p.id === m.pendingSwitch.receiver) setControlled(m, p.id);

  // Harte Bälle verspringen gerne mal.
  const pControl = clamp(0.45 + 0.5 * tech - (bs - 9) * 0.03, 0.2, 0.98);
  if (bs > 9 && !rng.chance(pControl)) {
    if (deflect(m, p, prevTeam)) return;
    ball.vel.x *= -0.35;
    ball.vel.z = ball.vel.z * -0.35 + rng.gauss() * 2;
    ball.vel.y = 0.5 + rng.next() * 1.5;
    m.events.push({ type: 'miscontrol', playerId: p.id });
    return;
  }

  const speed = len(p.vel.x, p.vel.z);
  if (speed < 0.6) {
    ball.vel.x *= 0.15;
    ball.vel.z *= 0.15;
    ball.vel.y = 0;
    return;
  }
  let dir = p.dribbleDir ?? p.facing;
  if (p.dribbleDir && dir.x * p.facing.x + dir.z * p.facing.z < 0) dir = p.facing;
  // An Wand und Auto dribbelt die KI entlang oder weg, statt sich in der Ecke festzulaufen.
  const wall = wallPush(pitch, ball.pos);
  if (wall.near && p.id !== m.controlledId) {
    let dx = dir.x;
    let dz = dir.z;
    if (wall.x && dx * wall.x < 0.3) dx = wall.x * 0.8;
    if (wall.z && dz * wall.z < 0.3) dz = wall.z * 0.8;
    dir = norm(dx, dz);
  }
  // Die KI führt den Ball an der Seitenlinie nach innen statt ins Aus.
  if (pitch.boundary === 'lines' && p.id !== m.controlledId && Math.abs(ball.pos.z) > pitch.halfWidth - 2.5 && dir.z * ball.pos.z > 0) {
    dir = norm(dir.x || attackDir(m, p.team), -Math.sign(ball.pos.z) * 0.4);
  }
  // Der gesteuerte Spieler führt den Ball etwas enger (Spielhilfe für den Menschen).
  const assist = p.id === m.controlledId ? 0.6 : 1;
  dir = rotate(dir, rng.gauss() * (0.04 + 0.18 * (1 - tech) + 0.08 * STAMINA.skill * fatigue) * calm * assist);
  // Kurze Ballberührungen: der Ball läuft nur knapp vor dem Spieler her.
  const touch = speed * (1.0 + 0.1 * (1 - tech) * assist) + 0.3 + 0.4 * (1 - tech) * assist;
  ball.vel.x = dir.x * touch;
  ball.vel.z = dir.z * touch;
  ball.vel.y = rng.chance(pitch.surface.bumpiness) ? 1 + rng.next() * 1.5 : 0;
}
