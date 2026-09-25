// KI: Wer läuft an, wer sichert ab, wer deckt, wer läuft sich frei.
import { clamp, dist2d, len, norm } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { ballSpeed } from './ball.js';
import { attackDir, clampToPitch, distToSegment, getPlayer, wallPush } from './players.js';

// Schwierigkeitsgrad: Nur der Gegner des Menschen spielt klüger oder nachsichtiger –
// schneller entscheiden, entschlossener in den Zweikampf, öfter der kluge Pass.
// Werte der Spieler bleiben unangetastet.
const SKILL = { easy: 0.7, normal: 1, hard: 1.25 };
// Reaktionszeit des Torwarts: Stärke, dazu der Schwierigkeitsgrad beim Gegner-Keeper.
export const keeperReaction = (m, p) => (0.14 + (1 - p.attrs.keeping) * 0.14) * (aiSkill(m, p) < 1 ? 1.35 : aiSkill(m, p) > 1 ? 0.85 : 1);
export const aiSkill = (m, p) => (m.humanTeam !== null && p.team !== m.humanTeam ? SKILL[m.difficulty] ?? 1 : 1);

// Einmal pro Schritt: Rollen für beide Teams verteilen.
//   chaser – geht auf den Ball
//   cover  – sichert zwischen Ball und eigenem Tor ab
//   mark   – deckt einen Gegenspieler (torseitig)
//   support – läuft sich frei (bei eigenem Ballbesitz)
export function updateTactics(m, dt) {
  const { ball, pitch } = m;
  const target = { x: ball.pos.x + ball.vel.x * 0.3, z: ball.pos.z + ball.vel.z * 0.3 };
  const human = getPlayer(m, m.controlledId);
  const holder = ball.holder && getPlayer(m, ball.holder);
  const possession = holder ? holder.team : m.lastTouchTeam;
  m.tactics = {};

  for (let team = 0; team < 2; team++) {
    const s = attackDir(m, team);
    const ownGoal = { x: -s * pitch.halfLength, z: 0 };
    const pool = m.players
      .filter((p) => p.team === team && p.role !== 'gk' && p.id !== m.controlledId)
      .sort((a, b) => dist2d(a.pos, target) - dist2d(b.pos, target));

    // Hält der gegnerische Torwart den Ball, zieht sich das Team aus seinem Raum zurück.
    // Kurz nach dem Abwurf gilt die Zone noch – sonst wird der kurze Wurf sofort abgefangen.
    const rel = m.keeperRelease;
    const fresh = rel && rel.team !== team && m.time - rel.time < 0.8 ? getPlayer(m, rel.id) : null;
    const oppKeeper = holder && holder.team !== team && holder.role === 'gk' ? holder : fresh;
    let chaser = oppKeeper ? null : pool[0] ?? null;
    // Offener Pass ans eigene Team: Der Adressat holt sich den Ball, kein anderer rennt dazwischen.
    const receiver = incomingPass(m, team);
    if (receiver) chaser = null;
    // Im eigenen Team läuft die KI nur an, wenn der gesteuerte Spieler weit weg ist.
    if (human && team === m.humanTeam && chaser && !(dist2d(chaser.pos, target) < dist2d(human.pos, target) - 2.5)) chaser = null;
    if (holder && holder.team === team) chaser = null;
    m.chasers[team] = chaser?.id ?? null;
    const rest = pool.filter((p) => p !== chaser);

    if (possession !== null && possession !== team) {
      // Absichern: Wer am schnellsten zwischen Ball und Tor kommt, macht das –
      // nicht einfach der Nächste am Ball.
      const dirG = norm(ownGoal.x - ball.pos.x, ownGoal.z - ball.pos.z);
      const dG = Math.min(3.5, dist2d(ball.pos, ownGoal) * 0.5);
      const coverPt = { x: ball.pos.x + dirG.x * dG, z: ball.pos.z + dirG.z * dG };
      rest.sort((a, b) => dist2d(a.pos, coverPt) - dist2d(b.pos, coverPt));
      const cover = rest.shift();
      if (cover) {
        const dir = norm(ownGoal.x - ball.pos.x, ownGoal.z - ball.pos.z);
        const d = Math.min(3.5, dist2d(ball.pos, ownGoal) * 0.5);
        m.tactics[cover.id] = { type: 'cover', ...clampToPitch(pitch, ball.pos.x + dir.x * d, ball.pos.z + dir.z * d) };
      }
      const carrier = ball.lastTouch;
      const opponents = m.players.filter((o) => o.team !== team && o.role !== 'gk' && o.id !== carrier);
      const taken = new Set();
      for (const p of rest) {
        let best = null;
        let bestD = Infinity;
        for (const o of opponents) {
          if (taken.has(o.id)) continue;
          const d = dist2d(o.pos, p.pos);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        if (!best) continue;
        taken.add(best.id);
        const dir = norm(ownGoal.x - best.pos.x, ownGoal.z - best.pos.z);
        m.tactics[p.id] = { type: 'mark', ...clampToPitch(pitch, best.pos.x + dir.x * 1.5, best.pos.z + dir.z * 1.5) };
      }
    } else {
      // Ecke fürs eigene Team: rein in den Strafraum – erster Pfosten, langer Pfosten,
      // Elfmeterpunkt, Strafraumkante.
      const sp = m.setPiece;
      const cornerRun = sp && sp.type === 'corner' && sp.team === team && !sp.taken && m.time - sp.time < 6;
      const boxSpots = cornerRun ? cornerSpots(m, team) : null;
      for (const p of rest) {
        if (boxSpots?.length && p.role !== 'def') {
          const spot = boxSpots.shift();
          m.tactics[p.id] = { type: 'support', ...clampToPitch(pitch, spot.x, spot.z, 0.5) };
          continue;
        }
        const spot = supportSpot(m, p, dt);
        // Absicherung: Abwehrspieler bleiben immer ein Stück hinter dem Ball – auch
        // wenn der Ball schneller wandert, als sie ihren Laufweg neu planen.
        if (p.role === 'def') spot.x = Math.min(spot.x * s, ball.pos.x * s - 5, pitch.halfLength * 0.35) * s;
        m.tactics[p.id] = { type: 'support', ...clampToPitch(pitch, spot.x, spot.z, 0.5) };
      }
    }
    if (receiver && receiver.id !== m.controlledId) m.tactics[receiver.id] = { type: 'receive', ...receiveSpot(m, receiver) };
    if (oppKeeper) {
      const r = keeperZone(pitch);
      for (const p of pool) {
        const t = m.tactics[p.id] ?? { type: 'mark', x: p.pos.x, z: p.pos.z };
        const d = dist2d(t, oppKeeper.pos);
        if (d >= r) continue;
        // Nach vorne aus der Zone heraus (Richtung Mittellinie), seitlich bleibt er, wo er ist.
        const ks = attackDir(m, oppKeeper.team);
        const dz = clamp(t.z - oppKeeper.pos.z, -r * 0.9, r * 0.9);
        const x = oppKeeper.pos.x + ks * (Math.sqrt(r * r - dz * dz) + 0.5);
        m.tactics[p.id] = { type: 'mark', ...clampToPitch(pitch, x, oppKeeper.pos.z + dz) };
      }
    }
  }
}

function cornerSpots(m, team) {
  const { pitch, ball } = m;
  const s = attackDir(m, team);
  const gx = s * pitch.halfLength;
  const side = Math.sign(ball.pos.z) || 1;
  const gw = pitch.goalHalfWidth;
  return [
    { x: gx - s * 2, z: side * gw * 1.1 }, // erster Pfosten
    { x: gx - s * 3.5, z: -side * gw * 1.3 }, // langer Pfosten
    { x: gx - s * Math.min(6, pitch.halfLength * 0.3), z: 0 }, // Elfmeterpunkt
    { x: gx - s * Math.min(9, pitch.halfLength * 0.45), z: -side * 1.5 }, // Strafraumkante
  ];
}

// Läuft gerade ein Pass zu einem Mitspieler dieses Teams? Dann gilt er, bis jemand
// anderes den Ball berührt oder nach drei Sekunden.
function incomingPass(m, team) {
  const ps = m.pass;
  if (!ps || ps.team !== team) return null;
  if (m.ball.lastTouch !== ps.kicker || m.time - ps.time > 3 || m.ball.holder) {
    m.pass = null;
    return null;
  }
  const r = getPlayer(m, ps.targetId);
  return r && r.state === 'normal' ? r : null;
}

// Wo erreicht der Adressat den rollenden Ball am frühesten? Der Ball wird mit
// grober Reibung vorausberechnet; der Spieler läuft zum ersten erreichbaren Punkt.
function receiveSpot(m, p) {
  const { ball, pitch } = m;
  const k = pitch.surface?.rollFriction ?? 0.7;
  const speed = 4.6 + 2.6 * p.attrs.pace;
  let spot = { x: ball.pos.x, z: ball.pos.z };
  for (let t = 0.1; t <= 2.5; t += 0.1) {
    const f = (1 - Math.exp(-k * t)) / k;
    spot = { x: ball.pos.x + ball.vel.x * f, z: ball.pos.z + ball.vel.z * f };
    if (dist2d(p.pos, spot) <= speed * t + 0.4) break;
  }
  return clampToPitch(pitch, spot.x, spot.z, 0.3);
}

// Hält der Torwart den Ball, bleiben Gegner so weit weg (wie beim Abstoß).
export const keeperZone = (pitch) => Math.min(9, pitch.halfLength * 0.45);

// Freilaufen: Kandidaten rund um die Grundposition bewerten – Abstand zu
// Gegnern, freie Passlinie vom Ball, Richtung Tor. Alle ~0.7 s neu überlegt.
function supportSpot(m, p, dt) {
  const { ball, pitch, rng } = m;
  p.supportTimer = (p.supportTimer ?? 0) - dt;
  if (p.supportSpot && p.supportTimer > 0) return { ...p.supportSpot };

  const s = attackDir(m, p.team);
  // Mit Auslinien nicht direkt an der Linie anbieten.
  const margin = pitch.boundary === 'lines' ? 2.5 : 1.2;
  // Bei Ballbesitz rücken alle auf: Stürmer laufen in die Tiefe, das Mittelfeld
  // bietet sich davor an. Die Abwehr bleibt als Absicherung hinter dem Ball.
  const push = p.role === 'fwd' ? 4.5 : p.role === 'mid' ? 3 : 1;
  let bx = p.home.x * 0.4 + ball.pos.x * 0.7 + s * push;
  if (p.role === 'def') bx = Math.min(bx * s, ball.pos.x * s - 5.5, pitch.halfLength * 0.35) * s;
  const base = clampToPitch(pitch, bx, p.home.z + ball.pos.z * 0.3, margin);
  const deep = p.role === 'fwd' ? [[5, 0], [5, 3], [5, -3]] : [];
  const back = p.role === 'def';
  const offsets = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [2.5, 2.5], [2.5, -2.5], [-2.5, 2.5], [-2.5, -2.5], ...deep];
  let best = base;
  let bestScore = -Infinity;
  for (const [ox, oz] of offsets) {
    const c = clampToPitch(pitch, base.x + ox * s, base.z + oz, margin);
    let score = (back ? 0 : s * c.x * 0.07) - len(c.x - base.x, c.z - base.z) * 0.13;
    for (const o of m.players) {
      if (o.team === p.team) continue;
      const d = dist2d(o.pos, c);
      if (d < 4) score -= 4 - d;
      if (distToSegment(o.pos, ball.pos, c) < 1.2) score -= 1.5;
    }
    for (const t of m.players) {
      if (t.team === p.team && t !== p && dist2d(t.pos, c) < 3) score -= 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  p.supportSpot = { ...best };
  p.supportTimer = 1.0 + rng.next() * 0.4; // seltener umentscheiden = ruhigeres Bild
  return best;
}

export function outfieldIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const oppGoal = { x: s * pitch.halfLength, z: 0 };

  if (ball.holder === p.id) {
    // Einwurf: kurz orientieren, dann werfen.
    p.holdTimer += dt;
    if (p.holdTimer > 0.8 && !p.pending) p.pending = { type: 'pass', ttl: 0.5, cone: -0.6 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  if (m.chasers[p.team] === p.id) {
    const toGoal = norm(oppGoal.x - ball.pos.x, oppGoal.z - ball.pos.z);
    const rx = p.pos.x - ball.pos.x;
    const rz = p.pos.z - ball.pos.z;
    let ax = ball.pos.x - toGoal.x * 0.35;
    let az = ball.pos.z - toGoal.z * 0.35;
    // Steht der Spieler vor dem Ball, läuft er außen herum.
    if (rx * toGoal.x + rz * toGoal.z > 0.2) {
      const side = rx * -toGoal.z + rz * toGoal.x >= 0 ? 1 : -1;
      ax = ball.pos.x - toGoal.x * 0.9 - toGoal.z * side * 0.9;
      az = ball.pos.z - toGoal.z * 0.9 + toGoal.x * side * 0.9;
    }
    // Ball an der Wand: nicht dahinter klemmen, sondern von der Feldseite kommen.
    const wall = wallPush(pitch, ball.pos);
    if (wall.near) {
      ax = ball.pos.x + wall.x * 0.45;
      az = ball.pos.z + wall.z * 0.45;
    }
    const dBall = dist2d(p.pos, ball.pos);
    if (p.setPieceAction === 'cross' && dBall < 1.3) {
      p.setPieceAction = null;
      // Ecke der KI: meist hoch an den langen Pfosten, mal scharf an den ersten, mal kurz.
      const r = m.rng.next();
      p.pending = m.setPiece?.type === 'corner' && m.setPiece.takerId === p.id
        ? r < 0.5 ? { type: 'pass', lofted: 'cross', zone: 'far', ttl: 0.4 } : r < 0.8 ? { type: 'pass', lofted: 'cross', driven: true, zone: 'near', ttl: 0.4 } : { type: 'pass', zone: 'short', ttl: 0.4 }
        : { type: 'pass', lofted: 'cross', cone: -0.8, ttl: 0.4 };
    }
    const tackle = chooseTackle(m, p, dBall);
    if (tackle) return { tackle };
    p.dribbleDir = norm(oppGoal.x - p.pos.x, p.aimZ - p.pos.z);
    // In der Ecke nicht lange fackeln: abspielen oder raus Richtung Mitte.
    if (wall.corner && dBall < 1.3 && !p.pending && !ball.holder && p.decideTimer > 0.15) p.decideTimer = 0.15;
    if (dBall < 1.3 && p.decideTimer <= 0 && !p.pending && !ball.holder) {
      // Amateure brauchen einen Moment, bis sie sich entscheiden.
      p.decideTimer = (0.4 + (1 - p.attrs.technique) * 0.4 + m.rng.next() * 0.25) / aiSkill(m, p);
      aiDecide(m, p, oppGoal);
    }
    // Anlaufen: Auf „locker" trabt der Gegner eher hin, auf „hart" sprintet er früh.
    const k = aiSkill(m, p);
    const intensity = k < 1 ? 0.8 : 1;
    const mv = norm(ax - p.pos.x, az - p.pos.z);
    return { move: { x: mv.x * intensity, z: mv.z * intensity }, sprint: dBall > (k > 1 ? 2 : k < 1 ? 5 : 3) && p.stamina > 0.3 };
  }

  p.dribbleDir = null;
  const t = m.tactics[p.id] ?? clampToPitch(pitch, p.home.x * 0.5 + ball.pos.x * 0.7, p.home.z + ball.pos.z * 0.3, 1.2);
  const dx = t.x - p.pos.x;
  const dz = t.z - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.4) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const urgent = t.type === 'cover' || t.type === 'mark' || t.type === 'receive';
  if (t.type === 'receive') {
    // Dem Ball entgegen: volle Kraft bis zum Treffpunkt, dann abbremsen und annehmen.
    p.dribbleDir = norm(oppGoal.x - p.pos.x, -p.pos.z * 0.3);
    return { move: d < 0.3 ? { x: 0, z: 0 } : norm(dx, dz), sprint: d > 3 && p.stamina > 0.25 };
  }
  const k = urgent ? Math.min(1, d / 2) : Math.min(1, d / 3) * 0.75;
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > (urgent ? 5 : 9) && p.stamina > 0.35 };
}

function aiDecide(m, p, oppGoal) {
  const { rng, pitch } = m;
  if (wallPush(pitch, m.ball.pos, 1.2).corner) {
    p.pending = { type: 'pass', ttl: 0.4, cone: -0.9 };
    return;
  }
  const dGoal = dist2d(p.pos, oppGoal);
  const toG = norm(oppGoal.x - p.pos.x, oppGoal.z - p.pos.z);
  const facingDot = p.facing.x * toG.x + p.facing.z * toG.z;
  p.aimZ = rng.range(-2.5, 2.5);

  const range = 10 + p.attrs.shooting * 5 + (hasTrait(p, 'hammer') ? 4 : 0);
  // Schussauswahl: „hart" wartet auf die bessere Lage, „locker" schießt auch mal überhastet.
  const skill = aiSkill(m, p);
  const facingNeed = skill > 1 ? 0.45 : skill < 1 ? 0 : 0.2;
  if (dGoal < range * (skill > 1 ? 0.9 : 1) && facingDot > facingNeed) {
    const gw = pitch.goalHalfWidth;
    p.pending = {
      type: 'shoot',
      power: clamp(0.3 + dGoal / 20, 0.35, 0.95),
      // Die KI zielt auf die Ecken – mal drin, mal knapp daneben.
      target: { x: oppGoal.x, z: (rng.chance(0.5) ? 1 : -1) * rng.range(gw * 0.45, gw * 1.05) },
      ttl: 0.3,
    };
    return;
  }
  // Distanzschuss: Wer schießen kann und Platz hat, versucht es auch mal von weiter weg.
  const longRange = range + 7;
  const space = !m.players.some((o) => o.team !== p.team && o.role !== 'gk' && dist2d(o.pos, p.pos) < 3 && (o.pos.x - p.pos.x) * toG.x + (o.pos.z - p.pos.z) * toG.z > 0);
  if (dGoal >= range && dGoal < longRange && facingDot > 0.5 && space && (p.attrs.shooting > 0.55 || hasTrait(p, 'hammer')) && rng.chance(0.18)) {
    const gw = pitch.goalHalfWidth;
    p.pending = { type: 'shoot', power: 0.95, target: { x: oppGoal.x, z: (rng.chance(0.5) ? 1 : -1) * rng.range(gw * 0.4, gw * 1.0) }, ttl: 0.3 };
    return;
  }
  // Außen an der Grundlinie: Flanke in die Mitte.
  const wide = Math.abs(p.pos.z) > pitch.halfWidth * 0.55 && Math.abs(p.pos.x - oppGoal.x) < pitch.halfLength * 0.4;
  if (wide && rng.chance(0.5)) {
    p.pending = { type: 'pass', lofted: 'cross', cone: -0.3, ttl: 0.3 };
    return;
  }
  const underPressure = m.players.some((o) => {
    if (o.team === p.team) return false;
    const dx = o.pos.x - p.pos.x;
    const dz = o.pos.z - p.pos.z;
    const d = len(dx, dz);
    return d < 2.2 && (dx * toG.x + dz * toG.z) / (d || 1) > 0.2;
  });
  if (underPressure && rng.chance(Math.min(0.95, (0.45 + 0.4 * p.attrs.passing) * aiSkill(m, p)))) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2 };
    return;
  }
  if (rng.chance(0.05)) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2, optional: true };
    return;
  }
  // Ein Mitspieler steht weiter vorn frei? Dann den Ball laufen lassen, statt allein
  // durch drei Leute zu dribbeln – wie oft, hängt vom Passspiel ab.
  const s = attackDir(m, p.team);
  const open = m.players.find((t) => {
    if (t.team !== p.team || t === p || t.role === 'gk' || t.state !== 'normal') return false;
    const ahead = (t.pos.x - p.pos.x) * s;
    const d = dist2d(t.pos, p.pos);
    if (ahead < 3 || d > 16) return false;
    return !m.players.some((o) => o.team !== p.team && (dist2d(o.pos, t.pos) < 2.5 || distToSegment(o.pos, p.pos, t.pos) < 1.3));
  });
  if (open && rng.chance(Math.min(0.9, (0.25 + 0.35 * p.attrs.passing) * aiSkill(m, p)))) p.pending = { type: 'pass', ttl: 0.3, cone: -0.3, optional: true };
}

// Die KI geht in den Zweikampf, wenn ein Gegner den Ball am Fuß hat. Auf
// hartem Boden stochert sie – gegrätscht wird dort nur von Hitzköpfen.
function chooseTackle(m, p, dBall) {
  const { ball, rng } = m;
  const surface = m.pitch.surface;
  if (p.decideTimer > 0 || dBall < 0.6 || dBall > 2.2 || ball.holder) return null;
  const opp = ball.lastTouch && getPlayer(m, ball.lastTouch);
  if (!opp || opp.team === p.team || opp.role === 'gk' || dist2d(opp.pos, ball.pos) > 1.2) return null;
  const tb = norm(ball.pos.x - p.pos.x, ball.pos.z - p.pos.z);
  if (tb.x * p.facing.x + tb.z * p.facing.z < 0.8) return null;
  p.decideTimer = 1.3 / aiSkill(m, p); // nicht im Sekundentakt reingehen

  const tough = hasTrait(p, 'hart_im_nehmen');
  let slideChance = surface.hard ? (p.injury ? 0 : tough ? 0.2 : 0.03) : 0.06 + 0.14 * p.attrs.tackling;
  if (m.derby) slideChance *= 1.4; // im Derby geht man dazwischen
  if (p.yellow) slideChance *= 0.3; // mit Gelb vorbelastet lieber vorsichtig
  if (dBall > 0.9 && rng.chance(slideChance)) return 'slide';
  if (dBall < 1.4 && rng.chance((0.15 + 0.25 * p.attrs.tackling) * aiSkill(m, p))) return 'poke';
  return null;
}

// Mitspieler in Wurfweite, um den im Umkreis von 4 m kein Gegner steht.
function openMate(m, gk) {
  const s = attackDir(m, gk.team);
  let best = null;
  let bestScore = -Infinity;
  for (const t of m.players) {
    if (t.team !== gk.team || t === gk || t.state !== 'normal') continue;
    const d = dist2d(t.pos, gk.pos);
    if (d < 4 || d > 16 || (t.pos.x - gk.pos.x) * s < -1) continue;
    const near = Math.min(...m.players.filter((o) => o.team !== gk.team).map((o) => dist2d(o.pos, t.pos)));
    const lane = m.players.some((o) => o.team !== gk.team && distToSegment(o.pos, gk.pos, t.pos) < 1.5);
    if (near < 4 || lane) continue;
    const score = near - d * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function keeperIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(m, p.team);
  const goalX = -s * pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  p.dribbleDir = { x: s, z: 0 };

  if (ball.holder === p.id) {
    p.holdTimer += dt;
    p.facing = { x: s, z: 0 };
    // Erst abwerfen, wenn die Gegner aus dem Strafraum sind (spätestens nach 3 s).
    // Ist ein Mitspieler frei, wirft er kurz – sonst Abschlag weit nach vorne.
    const crowded = m.players.some((o) => o.team !== p.team && dist2d(o.pos, p.pos) < keeperZone(pitch) * 0.6);
    if (!p.pending && (p.holdTimer > 3 || (p.holdTimer > 1.0 && !crowded))) {
      const free = openMate(m, p);
      p.pending = free ? { type: 'pass', ttl: 0.5, cone: -0.2, targetId: free.id } : { type: 'pass', ttl: 0.5, cone: -0.2, lofted: true, minDist: 9 };
    }
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  let tx = goalX + s * 0.8;
  let tz = clamp(ball.pos.z * 0.4, -gw - 0.2, gw + 0.2);
  // Reaktionszeit: Erst nach einem Moment erkennt der Keeper die Schussrichtung –
  // bis dahin bleibt er, wo er war. Gute Keeper sind schneller.
  const reaction = keeperReaction(m, p);
  const reacting = m.shotTime != null && m.time - m.shotTime < reaction;
  if (reacting && p.keeperTz != null) tz = p.keeperTz;
  else if (ball.vel.x * -s > 2) {
    const t = (tx - ball.pos.x) / ball.vel.x;
    if (t > 0 && t < 2) tz = clamp(ball.pos.z + ball.vel.z * t, -gw - 0.6, gw + 0.6);
  }
  p.keeperTz = tz;
  // Eins gegen eins: Kommt ein Gegner mit Ball frei aufs Tor, geht der Keeper raus
  // und verkürzt den Winkel – auf der Linie zwischen Ball und Tormitte.
  const carrier = ball.lastTouch && getPlayer(m, ball.lastTouch);
  if (!reacting && carrier && carrier.team !== p.team && ball.pos.y < 0.6 && dist2d(carrier.pos, ball.pos) < 1.3) {
    const dGoal = Math.hypot(ball.pos.x - goalX, ball.pos.z);
    const covered = m.players.some((o) => o.team === p.team && o !== p && o.state === 'normal' && distToSegment(o.pos, ball.pos, { x: goalX, z: 0 }) < 1 && dist2d(o.pos, { x: goalX, z: 0 }) < dGoal);
    if (dGoal < 11 && !covered) {
      const out = clamp(dGoal * 0.35, 0.8, 3.2) * (0.7 + 0.3 * p.attrs.keeping);
      const dir = norm(ball.pos.x - goalX, ball.pos.z);
      tx = goalX + dir.x * out;
      tz = dir.z * out;
    }
  }
  // Freie Bälle im Fünfer holt er sich.
  const dMe = dist2d(p.pos, ball.pos);
  const beaten = m.players.some((o) => o.team !== p.team && dist2d(o.pos, ball.pos) < dMe - 0.5);
  if (!ball.holder && !beaten && Math.abs(ball.pos.x - goalX) < 5 && Math.abs(ball.pos.z) < 5 && ballSpeed(ball) < 6) {
    tx = ball.pos.x;
    tz = ball.pos.z;
  }
  const dx = tx - p.pos.x;
  const dz = tz - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.15) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const k = Math.min(1, d / 1.5);
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > 2 };
}
