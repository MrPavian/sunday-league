// Bewegung und Ballkontakte: Laufen, Schuss, Pass, Kopfball, Torwart, Dribbling.
import { clamp, dist2d, len, norm, rotate } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { ballSpeed } from './ball.js';
import { attackDir, distToSegment, setControlled } from './players.js';

export const REACH = 0.75;

export function movePlayer(m, p, intent, dt, leaders) {
  const { pitch } = m;
  const mv = intent.move;
  const mag = Math.min(1, len(mv.x, mv.z));
  const moving = mag > 0.1;
  const sprint = intent.sprint && moving && p.stamina > 0.05;

  let maxSpeed = (4.6 + 2.6 * p.attrs.pace + (hasTrait(p, 'schnell') ? 0.6 : 0)) * (0.72 + 0.28 * p.stamina);
  if (sprint) maxSpeed *= 1.28;
  if (p.injury) maxSpeed *= 1 - 0.03 * p.injury.severity * (hasTrait(p, 'hart_im_nehmen') ? 0.3 : 1);

  const speed = len(p.vel.x, p.vel.z);
  let drain = sprint ? 0.02 : speed > 2 ? 0.0012 : -0.008;
  if (drain > 0) {
    drain *= 1.3 - 0.6 * p.attrs.stamina;
    if (hasTrait(p, 'pferdelunge')) drain *= 0.5;
    if (hasTrait(p, 'raucher')) drain *= 1.3;
    if (p.injury) drain *= 1 + 0.1 * p.injury.severity;
    if (leaders.some((l) => l !== p && l.team === p.team && dist2d(l.pos, p.pos) < 8)) drain *= 0.85;
  }
  p.stamina = clamp(p.stamina - drain * dt, 0, 1);

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
  p.pos.x = clamp(x, -pitch.wallX + 0.3, pitch.wallX - 0.3);
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

export function tryExecute(m, p) {
  const { ball } = m;
  const a = p.pending;
  const holds = ball.holder === p.id;
  if (p.state !== 'normal') return;
  if (!holds) {
    if (ball.holder || p.kickCooldown > 0) return;
    if (dist2d(p.pos, ball.pos) > REACH || ball.pos.y > 1.1) return;
  }
  p.pending = null;
  p.setPieceAction = null;
  p.kickCooldown = 0.35;
  p.kickAnim = 0.3;
  const fatigue = 1 - p.stamina;

  if (holds) {
    ball.holder = null;
    p.catchCooldown = 0.3;
  } else {
    // Luftloch – gehört in der Kreisklasse dazu.
    const whiff = (0.05 * (1 - p.attrs.technique) + 0.04 * fatigue) * (hasTrait(p, 'ballsicher') ? 0.5 : 1) * (hasTrait(p, 'ex_profi') ? 0.3 : 1);
    if (m.rng.chance(whiff)) {
      m.events.push({ type: 'whiff', playerId: p.id });
      return;
    }
  }

  if (a.type === 'shoot' && !holds) shoot(m, p, a, fatigue);
  else pass(m, p, a, fatigue, holds);
  ball.lastAction = a.type === 'shoot' && !holds ? 'shoot' : 'pass';
  ball.lastTouch = p.id;
  m.lastTouchTeam = p.team;
}

function shoot(m, p, a, fatigue) {
  const { ball, rng } = m;
  const hammer = hasTrait(p, 'hammer');
  let dir = a.target ? norm(a.target.x - p.pos.x, a.target.z - p.pos.z) : { ...p.facing };
  const power = clamp(a.power ?? 0.5, 0.1, 1);
  const sigma = 0.025 + 0.16 * (1 - p.attrs.shooting) + 0.08 * fatigue + 0.05 * power + (hammer ? 0.03 : 0);
  dir = rotate(dir, rng.gauss() * sigma);
  const speed = (8 + 18 * power) * (0.85 + 0.15 * p.attrs.shooting) * (hammer ? 1.15 : 1);
  const vy = 0.8 + 5 * power * power + Math.abs(rng.gauss()) * 1.2 * (1 - p.attrs.shooting) * power;
  ball.vel.x = dir.x * speed;
  ball.vel.y = vy;
  ball.vel.z = dir.z * speed;
  p.facing = dir;
  m.events.push({ type: 'shot', playerId: p.id, power });
}

function pass(m, p, a, fatigue, fromHands) {
  const { ball, rng, pitch } = m;
  const eye = hasTrait(p, 'gutes_auge');
  const cone = a.cone ?? (eye ? 0.1 : 0.45);
  const outfieldThrow = fromHands && p.role !== 'gk';

  let target = null;
  let bestScore = -Infinity;
  for (const t of m.players) {
    if (t.team !== p.team || t === p || t.state === 'down') continue;
    const dx = t.pos.x - p.pos.x;
    const dz = t.pos.z - p.pos.z;
    const d = len(dx, dz);
    if (d < (a.minDist ?? 2) || (outfieldThrow && d > 16)) continue;
    const dot = (dx * p.facing.x + dz * p.facing.z) / d;
    if (dot < cone) continue;
    let score = dot - d * 0.035 - (t.role === 'gk' ? 0.8 : 0);
    // Flanken sollen in Tornähe landen.
    if (a.lofted) score -= Math.abs(t.pos.x - attackDir(p.team) * pitch.halfLength) * 0.08;
    for (const o of m.players) {
      if (o.team === p.team) continue;
      if (!a.lofted && distToSegment(o.pos, p.pos, t.pos) < 1.2) score -= 0.6;
    }
    if (score > bestScore) {
      bestScore = score;
      target = t;
    }
  }

  let dir;
  let speed;
  let vy;
  if (!target) {
    // Keiner frei? Dann eben nach vorne gebolzt – grob Richtung Tor.
    // Aus der eigenen Hälfte weit nach vorne, in der gegnerischen in die Mitte.
    const s = attackDir(p.team);
    const ownHalf = p.pos.x * s < 0;
    const aim = ownHalf ? { x: s * pitch.halfLength * 0.5, z: 0 } : { x: p.pos.x + s * 4, z: -p.pos.z * 0.5 };
    dir = p.id === m.controlledId ? { ...p.facing } : rotate(norm(aim.x - p.pos.x, aim.z - p.pos.z), rng.gauss() * 0.25);
    speed = outfieldThrow ? 9 : ownHalf ? 11 : 7;
    vy = ownHalf ? 2 : 0.5;
  } else {
    const lx = clamp(target.pos.x + target.vel.x * 0.35, -pitch.halfLength, pitch.halfLength);
    const edge = pitch.boundary === 'lines' ? 1.5 : 0.5;
    const lz = clamp(target.pos.z + target.vel.z * 0.35, -pitch.halfWidth + edge, pitch.halfWidth - edge);
    const d = len(lx - p.pos.x, lz - p.pos.z);
    dir = norm(lx - p.pos.x, lz - p.pos.z);
    if (a.lofted) {
      // Hoher Ball: Flanken kommen auf Kopfhöhe, sonst landet er vor den Füßen.
      const arrive = a.lofted === 'cross' ? 1.4 : 0.3;
      vy = clamp(3 + d * 0.22, 4, 8);
      const flight = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * 9.81 * (arrive - 0.11)))) / 9.81;
      speed = d / Math.max(0.4, flight);
    } else {
      speed = clamp(2.5 + d * 0.6, 4.5, 15);
      vy = d > 16 ? 3.5 : 0.2;
    }
    const sigma = (0.02 + 0.12 * (1 - p.attrs.passing) + 0.05 * fatigue) * (eye ? 0.5 : 1) * (hasTrait(p, 'ex_profi') ? 0.6 : 1);
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
  m.events.push({ type: 'pass', playerId: p.id, targetId: target?.id ?? null, lofted: !!a.lofted });
}

export function keeperSaves(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder) return;
  for (const p of m.players) {
    if (p.role !== 'gk' || p.catchCooldown > 0 || p.state !== 'normal') continue;
    const s = attackDir(p.team);
    const goalX = -s * pitch.halfLength;
    if (Math.abs(ball.pos.x - goalX) > 6) continue;
    const reach = 0.85 + 0.75 * p.attrs.keeping; // inkl. Hechtsprung
    if (dist2d(p.pos, ball.pos) > reach || ball.pos.y > 2.3) continue;

    const bs = ballSpeed(ball);
    const towardGoal = ball.vel.x * -s > 0;
    if (bs >= 4 && !towardGoal) continue;
    p.catchCooldown = 0.25;
    const pCatch = bs < 4 ? 0.97 : clamp(0.3 + 0.6 * p.attrs.keeping - (bs - 8) * 0.03, 0.08, 0.95);
    if (rng.chance(pCatch)) {
      ball.holder = p.id;
      ball.vel.x = ball.vel.y = ball.vel.z = 0;
      ball.lastTouch = p.id;
      m.lastTouchTeam = p.team;
      m.pendingSwitch = null;
      if (bs >= 4) m.events.push({ type: 'catch', playerId: p.id });
    } else {
      // Zur Seite abwehren, nicht zurück vors eigene Tor.
      const side = Math.sign(ball.pos.z - p.pos.z) || (rng.chance(0.5) ? 1 : -1);
      ball.vel.x = -ball.vel.x * 0.25;
      ball.vel.z = side * (4 + rng.next() * 4);
      ball.vel.y = Math.abs(ball.vel.y) * 0.5 + 1;
      ball.lastTouch = p.id;
      ball.lastAction = 'save';
      m.lastTouchTeam = p.team;
      m.events.push({ type: 'save', playerId: p.id });
    }
    return;
  }
}

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
  p.kickCooldown = 0.35;
  p.headAnim = 0.3;
  const monster = hasTrait(p, 'kopfball');
  const skill = clamp(p.attrs.heading + (monster ? 0.2 : 0), 0, 1);
  if (!rng.chance(0.35 + 0.4 * skill)) return; // verpasst – Ball fliegt weiter

  const s = attackDir(p.team);
  const goal = { x: s * pitch.halfLength, z: rng.range(-pitch.goalHalfWidth * 0.8, pitch.goalHalfWidth * 0.8) };
  const nearGoal = dist2d(p.pos, goal) < 8;
  let dir = nearGoal ? norm(goal.x - p.pos.x, goal.z - p.pos.z) : norm(s * 0.8 + p.facing.x * 0.2, p.facing.z * 0.5);
  dir = rotate(dir, rng.gauss() * (0.1 + 0.4 * (1 - skill)) * (monster ? 0.5 : 1));
  const speed = 4 + 4 * skill + (monster ? 1.5 : 0);
  ball.vel.x = dir.x * speed;
  ball.vel.y = nearGoal ? rng.range(-1.5, 0.5) : rng.range(1, 3);
  ball.vel.z = dir.z * speed;
  ball.lastTouch = p.id;
  ball.lastAction = 'header';
  m.lastTouchTeam = p.team;
  p.facing = dir;
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

export function dribbleTouch(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder || ball.pos.y > 0.7) return;
  let p = null;
  let best = REACH * 0.8;
  for (const c of m.players) {
    if (c.kickCooldown > 0 || c.state !== 'normal') continue;
    const d = dist2d(c.pos, ball.pos);
    if (d < best) {
      best = d;
      p = c;
    }
  }
  if (!p) return;

  const tech = p.attrs.technique;
  const fatigue = 1 - p.stamina;
  const calm = hasTrait(p, 'ballsicher') || hasTrait(p, 'ex_profi') ? 0.5 : 1;
  const bs = ballSpeed(ball);
  p.kickCooldown = 0.2 + rng.next() * 0.12;
  ball.lastTouch = p.id;
  ball.lastAction = 'dribble';
  m.lastTouchTeam = p.team;
  if (m.pendingSwitch && p.id === m.pendingSwitch.receiver) setControlled(m, p.id);

  // Harte Bälle verspringen gerne mal.
  const pControl = clamp(0.45 + 0.5 * tech - (bs - 9) * 0.03, 0.2, 0.98);
  if (bs > 9 && !rng.chance(pControl)) {
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
  // Die KI führt den Ball an der Seitenlinie nach innen statt ins Aus.
  if (pitch.boundary === 'lines' && p.id !== m.controlledId && Math.abs(ball.pos.z) > pitch.halfWidth - 2.5 && dir.z * ball.pos.z > 0) {
    dir = norm(dir.x || attackDir(p.team), -Math.sign(ball.pos.z) * 0.4);
  }
  dir = rotate(dir, rng.gauss() * (0.04 + 0.22 * (1 - tech) + 0.1 * fatigue) * calm);
  const touch = speed * 1.25 + 1.0;
  ball.vel.x = dir.x * touch;
  ball.vel.z = dir.z * touch;
  ball.vel.y = rng.chance(pitch.surface.bumpiness) ? 1 + rng.next() * 1.5 : 0;
}
