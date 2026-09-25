// Deterministische Match-Simulation. Kennt kein three.js – dieselbe Logik soll
// später auch ungespielte Partien simulieren und online laufen können.
import { createRng } from '../core/rng.js';
import { clamp, dist2d, len, norm, rotate } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { TEAM_PRESETS } from '../data/teams.js';
import { ballSpeed, createBall, stepBall } from './ball.js';
import { generateTeam } from './generator.js';
import { PARKING_LOT } from './pitch.js';

export const MATCH_DURATION = 600; // Sekunden Spielzeit (Prototyp: 10 Minuten)
export const REACH = 0.75;

// 4 gegen 4 auf dem Parkplatz: Torwart + drei Feldspieler. Werte für Team 0,
// Team 1 wird gespiegelt.
const FORMATION = [
  { role: 'gk', x: -17.2, z: 0 },
  { role: 'def', x: -11, z: 0 },
  { role: 'mid', x: -6, z: -4.5 },
  { role: 'fwd', x: -3, z: 4 },
];

const NO_INPUT = { move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, tackle: false, switchPlayer: false };

export const attackDir = (team) => (team === 0 ? 1 : -1);

export function createMatch({ seed = 1, pitch = PARKING_LOT, teams } = {}) {
  const rng = createRng(seed);
  const roles = FORMATION.map((f) => f.role);
  const squads = teams ?? TEAM_PRESETS.map((preset) => generateTeam(rng, preset, roles));

  const players = [];
  squads.forEach((team, ti) => {
    const s = attackDir(ti);
    team.players.forEach((pl, i) => {
      const f = FORMATION[i];
      players.push({
        ...pl,
        id: `${ti}-${i}`,
        team: ti,
        role: f.role,
        home: { x: f.x * s, z: f.z * s },
        pos: { x: f.x * s, z: f.z * s },
        vel: { x: 0, z: 0 },
        facing: { x: s, z: 0 },
        stamina: 1,
        charge: 0,
        charging: false,
        pending: null,
        kickCooldown: 0,
        kickAnim: 0,
        catchCooldown: 0,
        holdTimer: 0,
        decideTimer: 0,
        dribbleDir: null,
        aimZ: 0,
        state: 'normal', // normal | tackle | recover | down
        stateTimer: 0,
        tackleWon: false,
        tackleHits: [],
        injury: null,
      });
    });
  });

  return {
    pitch,
    rng,
    teams: squads,
    players,
    ball: createBall(),
    score: [0, 0],
    time: 0,
    duration: MATCH_DURATION,
    phase: 'play',
    phaseTimer: 0,
    events: [],
    humanTeam: 0,
    controlledId: players.find((p) => p.team === 0 && p.role === 'fwd').id,
    chasers: [null, null],
    pendingSwitch: null,
    lastTouchTeam: null,
  };
}

export const getPlayer = (m, id) => m.players.find((p) => p.id === id);

export function stepMatch(m, input = NO_INPUT, dt) {
  const { ball, pitch } = m;
  if (m.phase === 'ended') return;

  if (m.phase === 'goal') {
    m.phaseTimer -= dt;
    stepBall(ball, pitch, dt);
    for (const p of m.players) {
      p.vel.x *= 0.9;
      p.vel.z *= 0.9;
      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;
    }
    if (m.phaseTimer <= 0) kickoff(m);
    return;
  }
  if (m.phase === 'freekick') {
    if ((m.phaseTimer -= dt) <= 0) m.phase = 'play';
    return;
  }

  m.time += dt;
  if (m.time >= m.duration) {
    m.phase = 'ended';
    m.events.push({ type: 'end' });
    return;
  }

  if (input.switchPlayer) switchToNearest(m);
  updateChasers(m);

  const leaders = m.players.filter((p) => hasTrait(p, 'anfuehrer'));
  for (const p of m.players) {
    p.kickCooldown = Math.max(0, p.kickCooldown - dt);
    p.kickAnim = Math.max(0, p.kickAnim - dt);
    p.catchCooldown = Math.max(0, p.catchCooldown - dt);
    p.decideTimer -= dt;
    if (p.state !== 'normal') {
      stateMove(m, p, dt);
      continue;
    }
    let intent;
    if (p.id === m.controlledId) intent = humanIntent(m, p, input, dt);
    else if (p.role === 'gk') intent = keeperIntent(m, p, dt);
    else intent = outfieldIntent(m, p);
    if (p.state === 'normal') movePlayer(m, p, intent, dt, leaders);
  }
  separatePlayers(m);
  if (resolveTackles(m)) return;

  if (ball.holder) {
    const h = getPlayer(m, ball.holder);
    ball.pos.x = h.pos.x + h.facing.x * 0.35;
    ball.pos.y = 1.1;
    ball.pos.z = h.pos.z + h.facing.z * 0.35;
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
  }

  for (const p of m.players) {
    if (!p.pending) continue;
    tryExecute(m, p);
    if (p.pending && (p.pending.ttl -= dt) <= 0) p.pending = null;
  }

  keeperSaves(m);
  dribbleTouch(m);

  const goal = stepBall(ball, pitch, dt);
  if (goal) onGoal(m, goal.team);

  updatePendingSwitch(m);
}

// ---------------------------------------------------------------------------
// Steuerung & KI

function humanIntent(m, p, input, dt) {
  if (input.tackle) {
    // Auf hartem Boden wird im Stehen gestochert – Sprint + Grätsche erzwingt
    // die Grätsche trotzdem.
    if (m.pitch.surface.hard && !input.sprint) startPoke(m, p);
    else startTackle(m, p);
    return null;
  }
  if (input.shootHeld) {
    p.charging = true;
    p.charge = Math.min(1, p.charge + dt * 1.25);
  } else if (p.charging) {
    p.charging = false;
    p.pending = { type: 'shoot', power: Math.max(0.15, p.charge), ttl: 0.3 };
    p.charge = 0;
  }
  if (input.pass) p.pending = { type: 'pass', ttl: 0.3 };
  p.dribbleDir = null;
  return { move: input.move, sprint: input.sprint };
}

function updateChasers(m) {
  const { ball } = m;
  const target = { x: ball.pos.x + ball.vel.x * 0.3, z: ball.pos.z + ball.vel.z * 0.3 };
  const human = getPlayer(m, m.controlledId);
  for (let team = 0; team < 2; team++) {
    let best = null;
    let bestD = Infinity;
    for (const p of m.players) {
      if (p.team !== team || p.role === 'gk' || p.id === m.controlledId) continue;
      const d = dist2d(p.pos, target);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    // Im eigenen Team läuft die KI nur an, wenn der gesteuerte Spieler weit weg ist.
    if (team === m.humanTeam && !(bestD < dist2d(human.pos, target) - 6)) best = null;
    const holder = ball.holder && getPlayer(m, ball.holder);
    if (holder && holder.team === team) best = null;
    m.chasers[team] = best ? best.id : null;
  }
}

function outfieldIntent(m, p) {
  const { ball, pitch } = m;
  const s = attackDir(p.team);
  const oppGoal = { x: s * pitch.halfLength, z: 0 };

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
    const dBall = dist2d(p.pos, ball.pos);
    const tackle = chooseTackle(m, p, dBall);
    if (tackle) {
      if (tackle === 'slide') startTackle(m, p);
      else startPoke(m, p);
      return null;
    }
    p.dribbleDir = norm(oppGoal.x - p.pos.x, p.aimZ - p.pos.z);
    if (dBall < 1.3 && p.decideTimer <= 0 && !p.pending && !ball.holder) {
      // Amateure brauchen einen Moment, bis sie sich entscheiden.
      p.decideTimer = 0.25 + (1 - p.attrs.technique) * 0.35 + m.rng.next() * 0.2;
      aiDecide(m, p, oppGoal);
    }
    return { move: norm(ax - p.pos.x, az - p.pos.z), sprint: dBall > 3 && p.stamina > 0.3 };
  }

  p.dribbleDir = null;
  const possession = m.lastTouchTeam === p.team;
  const sx = clamp(p.home.x * 0.5 + ball.pos.x * 0.7 + (possession ? s * 2.5 : -s), -pitch.halfLength + 1.5, pitch.halfLength - 1.5);
  const sz = clamp(p.home.z + ball.pos.z * 0.3, -pitch.halfWidth + 1.2, pitch.halfWidth - 1.2);
  const dx = sx - p.pos.x;
  const dz = sz - p.pos.z;
  const d = len(dx, dz);
  if (d < 0.4) return { move: { x: 0, z: 0 }, sprint: false };
  const n = norm(dx, dz);
  const k = Math.min(1, d / 3) * 0.75;
  return { move: { x: n.x * k, z: n.z * k }, sprint: d > 9 && p.stamina > 0.4 };
}

function aiDecide(m, p, oppGoal) {
  const { rng, pitch } = m;
  const dGoal = dist2d(p.pos, oppGoal);
  const toG = norm(oppGoal.x - p.pos.x, oppGoal.z - p.pos.z);
  const facingDot = p.facing.x * toG.x + p.facing.z * toG.z;
  p.aimZ = rng.range(-2.5, 2.5);

  if (dGoal < 10 + p.attrs.shooting * 5 && facingDot > 0.2) {
    const gw = pitch.goalHalfWidth;
    p.pending = {
      type: 'shoot',
      power: clamp(0.3 + dGoal / 20, 0.35, 0.95),
      target: { x: oppGoal.x, z: rng.range(-gw * 0.8, gw * 0.8) },
      ttl: 0.3,
    };
    return;
  }
  const underPressure = m.players.some((o) => {
    if (o.team === p.team) return false;
    const dx = o.pos.x - p.pos.x;
    const dz = o.pos.z - p.pos.z;
    const d = len(dx, dz);
    return d < 2.2 && (dx * toG.x + dz * toG.z) / (d || 1) > 0.2;
  });
  if ((underPressure && rng.chance(0.45 + 0.4 * p.attrs.passing)) || rng.chance(0.03)) {
    p.pending = { type: 'pass', ttl: 0.3, cone: -0.2 };
  }
}

function keeperIntent(m, p, dt) {
  const { ball, pitch } = m;
  const s = attackDir(p.team);
  const goalX = -s * pitch.halfLength;
  const gw = pitch.goalHalfWidth;
  p.dribbleDir = { x: s, z: 0 };

  if (ball.holder === p.id) {
    p.holdTimer += dt;
    p.facing = { x: s, z: 0 };
    if (p.holdTimer > 1.2 && !p.pending) p.pending = { type: 'pass', ttl: 0.5, cone: -0.2 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  p.holdTimer = 0;

  let tx = goalX + s * 0.8;
  let tz = clamp(ball.pos.z * 0.4, -gw - 0.2, gw + 0.2);
  if (ball.vel.x * -s > 2) {
    const t = (tx - ball.pos.x) / ball.vel.x;
    if (t > 0 && t < 2) tz = clamp(ball.pos.z + ball.vel.z * t, -gw - 0.6, gw + 0.6);
  }
  // Freie Bälle im Fünfer holt er sich.
  if (!ball.holder && Math.abs(ball.pos.x - goalX) < 5 && Math.abs(ball.pos.z) < 5 && ballSpeed(ball) < 6) {
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

// ---------------------------------------------------------------------------
// Bewegung

function movePlayer(m, p, intent, dt, leaders) {
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
  p.pos.x = clamp(p.pos.x + p.vel.x * dt, -pitch.wallX + 0.3, pitch.wallX - 0.3);
  p.pos.z = clamp(p.pos.z + p.vel.z * dt, -pitch.halfWidth + 0.3, pitch.halfWidth - 0.3);

  if (moving && m.ball.holder !== p.id) p.facing = dir;
}

function separatePlayers(m) {
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
}

// ---------------------------------------------------------------------------
// Ballkontakte

function tryExecute(m, p) {
  const { ball } = m;
  const a = p.pending;
  const holds = ball.holder === p.id;
  if (p.state !== 'normal') return;
  if (!holds) {
    if (ball.holder || p.kickCooldown > 0) return;
    if (dist2d(p.pos, ball.pos) > REACH || ball.pos.y > 1.1) return;
  }
  p.pending = null;
  p.kickCooldown = 0.35;
  p.kickAnim = 0.3;
  const fatigue = 1 - p.stamina;

  if (holds) {
    ball.holder = null;
    p.catchCooldown = 1.0;
  } else {
    // Luftloch – gehört in der Kreisklasse dazu.
    const whiff = (0.05 * (1 - p.attrs.technique) + 0.04 * fatigue) * (hasTrait(p, 'ballsicher') ? 0.5 : 1);
    if (m.rng.chance(whiff)) {
      m.events.push({ type: 'whiff', playerId: p.id });
      return;
    }
  }

  if (a.type === 'shoot') shoot(m, p, a, fatigue);
  else pass(m, p, a, fatigue, holds);
  ball.lastTouch = p.id;
  m.lastTouchTeam = p.team;
}

function shoot(m, p, a, fatigue) {
  const { ball, rng } = m;
  let dir = a.target ? norm(a.target.x - p.pos.x, a.target.z - p.pos.z) : { ...p.facing };
  const power = clamp(a.power ?? 0.5, 0.1, 1);
  const sigma = 0.025 + 0.16 * (1 - p.attrs.shooting) + 0.08 * fatigue + 0.05 * power;
  dir = rotate(dir, rng.gauss() * sigma);
  const speed = (8 + 18 * power) * (0.85 + 0.15 * p.attrs.shooting);
  const vy = 0.8 + 5 * power * power + Math.abs(rng.gauss()) * 1.2 * (1 - p.attrs.shooting) * power;
  ball.vel.x = dir.x * speed;
  ball.vel.y = vy;
  ball.vel.z = dir.z * speed;
  p.facing = dir;
  m.events.push({ type: 'shot', playerId: p.id, power });
}

function pass(m, p, a, fatigue, thrown) {
  const { ball, rng, pitch } = m;
  const eye = hasTrait(p, 'gutes_auge');
  const cone = a.cone ?? (eye ? 0.1 : 0.45);

  let target = null;
  let bestScore = -Infinity;
  for (const t of m.players) {
    if (t.team !== p.team || t === p) continue;
    const dx = t.pos.x - p.pos.x;
    const dz = t.pos.z - p.pos.z;
    const d = len(dx, dz);
    if (d < 2) continue;
    const dot = (dx * p.facing.x + dz * p.facing.z) / d;
    if (dot < cone) continue;
    let score = dot - d * 0.035 - (t.role === 'gk' ? 0.8 : 0);
    for (const o of m.players) {
      if (o.team === p.team) continue;
      if (distToSegment(o.pos, p.pos, t.pos) < 1.2) score -= 0.6;
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
    // Keiner frei? Dann eben nach vorne gebolzt.
    dir = { ...p.facing };
    speed = 11;
    vy = 2;
  } else {
    const lx = clamp(target.pos.x + target.vel.x * 0.35, -pitch.halfLength, pitch.halfLength);
    const lz = clamp(target.pos.z + target.vel.z * 0.35, -pitch.halfWidth + 0.5, pitch.halfWidth - 0.5);
    const d = len(lx - p.pos.x, lz - p.pos.z);
    dir = norm(lx - p.pos.x, lz - p.pos.z);
    speed = clamp(2.5 + d * 0.6, 4.5, 15);
    vy = d > 16 ? 3.5 : 0.2;
    const sigma = (0.02 + 0.12 * (1 - p.attrs.passing) + 0.05 * fatigue) * (eye ? 0.5 : 1);
    dir = rotate(dir, rng.gauss() * sigma);
    speed *= 1 + rng.gauss() * 0.08 * (1 - p.attrs.passing);
    if (p.id === m.controlledId) m.pendingSwitch = { receiver: target.id, kicker: p.id };
  }
  if (thrown) vy = Math.max(vy, 1.5);
  ball.vel.x = dir.x * speed;
  ball.vel.y = vy;
  ball.vel.z = dir.z * speed;
  p.facing = { x: dir.x, z: dir.z };
  m.events.push({ type: 'pass', playerId: p.id, targetId: target?.id ?? null });
}

function distToSegment(q, a, b) {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const l2 = abx * abx + abz * abz || 1;
  const t = clamp(((q.x - a.x) * abx + (q.z - a.z) * abz) / l2, 0, 1);
  return len(q.x - (a.x + abx * t), q.z - (a.z + abz * t));
}

function keeperSaves(m) {
  const { ball, rng, pitch } = m;
  if (ball.holder) return;
  for (const p of m.players) {
    if (p.role !== 'gk' || p.catchCooldown > 0) continue;
    const s = attackDir(p.team);
    const goalX = -s * pitch.halfLength;
    if (Math.abs(ball.pos.x - goalX) > 6) continue;
    const reach = 0.7 + 0.6 * p.attrs.keeping;
    if (dist2d(p.pos, ball.pos) > reach || ball.pos.y > 2.3) continue;

    const bs = ballSpeed(ball);
    const towardGoal = ball.vel.x * -s > 0;
    if (bs >= 4 && !towardGoal) continue;
    p.catchCooldown = 0.5;
    const pCatch = bs < 4 ? 0.97 : clamp(0.3 + 0.6 * p.attrs.keeping - (bs - 8) * 0.03, 0.08, 0.95);
    if (rng.chance(pCatch)) {
      ball.holder = p.id;
      ball.vel.x = ball.vel.y = ball.vel.z = 0;
      ball.lastTouch = p.id;
      m.lastTouchTeam = p.team;
      m.pendingSwitch = null;
      if (bs >= 4) m.events.push({ type: 'catch', playerId: p.id });
    } else {
      ball.vel.x = -ball.vel.x * 0.35;
      ball.vel.z += rng.gauss() * 3;
      ball.vel.y = Math.abs(ball.vel.y) * 0.5 + 1;
      ball.lastTouch = p.id;
      m.lastTouchTeam = p.team;
      m.events.push({ type: 'save', playerId: p.id });
    }
    return;
  }
}

function dribbleTouch(m) {
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
  const calm = hasTrait(p, 'ballsicher') ? 0.5 : 1;
  const bs = ballSpeed(ball);
  p.kickCooldown = 0.2 + rng.next() * 0.12;
  ball.lastTouch = p.id;
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
  dir = rotate(dir, rng.gauss() * (0.04 + 0.22 * (1 - tech) + 0.1 * fatigue) * calm);
  const touch = speed * 1.25 + 1.0;
  ball.vel.x = dir.x * touch;
  ball.vel.z = dir.z * touch;
  ball.vel.y = rng.chance(pitch.surface.bumpiness) ? 1 + rng.next() * 1.5 : 0;
}

// ---------------------------------------------------------------------------
// Grätschen & Fouls

export function startTackle(m, p) {
  if (p.state !== 'normal' || p.role === 'gk') return;
  const speed = Math.max(len(p.vel.x, p.vel.z) + 1.5, 6.5);
  p.state = 'tackle';
  p.stateTimer = 0.45;
  p.vel.x = p.facing.x * speed;
  p.vel.z = p.facing.z * speed;
  p.tackleWon = false;
  p.tackleHits = [];
  p.pending = null;
  p.charging = false;
  p.charge = 0;
  p.stamina = Math.max(0, p.stamina - 0.03);
  m.events.push({ type: 'slide', playerId: p.id });
}

// Zweikampf im Stehen: kurzer Ausfallschritt, Fuß dazwischen.
export function startPoke(m, p) {
  if (p.state !== 'normal' || p.role === 'gk') return;
  p.state = 'poke';
  p.stateTimer = 0.28;
  p.vel.x += p.facing.x * 1.5;
  p.vel.z += p.facing.z * 1.5;
  p.tackleWon = false;
  p.tackleHits = [];
  p.pending = null;
  p.charging = false;
  p.charge = 0;
  p.kickAnim = 0.3;
  m.events.push({ type: 'poke', playerId: p.id });
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
  p.decideTimer = 0.8;

  const tough = hasTrait(p, 'hart_im_nehmen');
  const slideChance = surface.hard ? (p.injury ? 0 : tough ? 0.25 : 0.04) : 0.12 + 0.25 * p.attrs.tackling;
  if (dBall > 0.9 && rng.chance(slideChance)) return 'slide';
  if (dBall < 1.4 && rng.chance(0.3 + 0.35 * p.attrs.tackling)) return 'poke';
  return null;
}

function stateMove(m, p, dt) {
  const { pitch, rng } = m;
  const damp = Math.exp(-(p.state === 'tackle' ? pitch.surface.slideDamp : 8) * dt);
  p.vel.x *= damp;
  p.vel.z *= damp;
  p.pos.x = clamp(p.pos.x + p.vel.x * dt, -pitch.wallX + 0.3, pitch.wallX - 0.3);
  p.pos.z = clamp(p.pos.z + p.vel.z * dt, -pitch.halfWidth + 0.3, pitch.halfWidth - 0.3);
  if ((p.stateTimer -= dt) > 0) return;
  if (p.state === 'tackle') {
    p.state = 'recover';
    p.stateTimer = 0.55;
    const risk = pitch.surface.scrapeChance * (hasTrait(p, 'hart_im_nehmen') ? 0.5 : 1);
    if (rng.chance(risk)) injure(m, p);
  } else if (p.state === 'poke') {
    p.state = 'recover';
    p.stateTimer = 0.25;
  } else {
    p.state = 'normal';
  }
}

function injure(m, p) {
  const label = m.pitch.surface.scrapeLabel;
  if (!label) return;
  if (p.injury) p.injury.severity = Math.min(3, p.injury.severity + 1);
  else p.injury = { type: 'scrape', label, severity: 1 };
  m.events.push({ type: 'scrape', playerId: p.id, label });
}

function knockBall(m, p, spread, minSpeed, maxSpeed) {
  const { ball, rng } = m;
  const dir = rotate(p.facing, rng.gauss() * spread * (1 - p.attrs.tackling));
  const speed = rng.range(minSpeed, maxSpeed);
  ball.vel.x = dir.x * speed;
  ball.vel.y = 0.3;
  ball.vel.z = dir.z * speed;
  ball.lastTouch = p.id;
  m.lastTouchTeam = p.team;
}

// Grätsche: Ball zuerst gespielt → sauber, Mann zuerst → Foul.
// Stochern: gewinnt den Ball je nach Zweikampf gegen Technik; wer nur den
// Gegner erwischt, riskiert ein Foul (Tritt, Schubser).
// Returns true when a foul interrupted play.
function resolveTackles(m) {
  const { ball, rng, pitch } = m;
  for (const p of m.players) {
    const slide = p.state === 'tackle';
    if (!slide && p.state !== 'poke') continue;
    const reach = slide ? 0.95 : 1.0;
    if (!p.tackleWon && !ball.holder && ball.pos.y < 0.6 && dist2d(p.pos, ball.pos) < reach) {
      if (slide) {
        knockBall(m, p, 0.4, 4, 7);
        p.tackleWon = true;
        m.events.push({ type: 'tackle', playerId: p.id });
      } else {
        const opp = ball.lastTouch && getPlayer(m, ball.lastTouch);
        const contested = opp && opp.team !== p.team && dist2d(opp.pos, ball.pos) < 1.0;
        const win = contested
          ? clamp(0.4 + 0.5 * p.attrs.tackling - 0.3 * opp.attrs.technique - (hasTrait(opp, 'ballsicher') ? 0.1 : 0), 0.15, 0.9)
          : 0.95;
        p.tackleWon = rng.chance(win) ? true : 'missed';
        if (p.tackleWon === true) {
          knockBall(m, p, 0.5, 3, 5);
          m.events.push({ type: 'poke_won', playerId: p.id });
        }
      }
    }
    for (const o of m.players) {
      if (o.team === p.team || o.state === 'down' || p.tackleHits.includes(o.id)) continue;
      if (dist2d(p.pos, o.pos) > (slide ? 0.7 : 0.6)) continue;
      p.tackleHits.push(o.id);
      let foul;
      if (slide) {
        const fromBehind = o.facing.x * p.facing.x + o.facing.z * p.facing.z > 0.5;
        foul = p.tackleWon !== true || rng.chance(0.12 * (1 - p.attrs.tackling) + (fromBehind ? 0.2 : 0));
        o.state = 'down';
        o.stateTimer = foul ? 1.4 : 0.7;
        o.pending = null;
        o.charging = false;
        o.charge = 0;
        // Wer auf Beton umgesäbelt wird, steht auch nicht unversehrt auf.
        if (foul && rng.chance(pitch.surface.scrapeChance * 0.4)) injure(m, o);
      } else {
        foul = p.tackleWon !== true && rng.chance(0.3);
      }
      if (foul) {
        m.events.push({ type: 'foul', playerId: p.id, victimId: o.id });
        startFreeKick(m, o);
        return true;
      }
    }
  }
  return false;
}

// Ohne Schiri gilt die Parkplatzregel: Wer gefoult wurde, legt sich den Ball hin.
function startFreeKick(m, victim) {
  const { ball, pitch } = m;
  const s = attackDir(victim.team);
  const spot = {
    x: clamp(victim.pos.x, -pitch.halfLength + 1, pitch.halfLength - 1),
    z: clamp(victim.pos.z, -pitch.halfWidth + 0.8, pitch.halfWidth - 0.8),
  };
  const toGoal = norm(s * pitch.halfLength - spot.x, -spot.z);
  ball.pos.x = spot.x;
  ball.pos.y = 0.11;
  ball.pos.z = spot.z;
  ball.vel.x = ball.vel.y = ball.vel.z = 0;
  ball.holder = null;
  ball.lastTouch = victim.id;
  m.lastTouchTeam = victim.team;

  victim.state = 'normal';
  victim.stateTimer = 0;
  victim.pos.x = spot.x - toGoal.x * 0.5;
  victim.pos.z = spot.z - toGoal.z * 0.5;
  victim.facing = toGoal;
  victim.decideTimer = 0;
  for (const p of m.players) {
    p.vel.x = p.vel.z = 0;
    p.pending = null;
    if (p.team === victim.team) continue;
    const dx = p.pos.x - spot.x;
    const dz = p.pos.z - spot.z;
    const d = len(dx, dz);
    if (d < 3.5) {
      const n = d > 0.01 ? { x: dx / d, z: dz / d } : { x: -toGoal.x, z: -toGoal.z };
      p.pos.x = clamp(spot.x + n.x * 3.5, -pitch.wallX + 0.3, pitch.wallX - 0.3);
      p.pos.z = clamp(spot.z + n.z * 3.5, -pitch.halfWidth + 0.3, pitch.halfWidth - 0.3);
    }
  }
  m.pendingSwitch = null;
  if (victim.team === m.humanTeam && victim.role !== 'gk') setControlled(m, victim.id);
  m.phase = 'freekick';
  m.phaseTimer = 1.3;
  m.events.push({ type: 'freekick', team: victim.team, playerId: victim.id });
}

// ---------------------------------------------------------------------------
// Spielablauf

function onGoal(m, team) {
  m.score[team]++;
  const scorer = m.ball.lastTouch && getPlayer(m, m.ball.lastTouch);
  m.events.push({
    type: 'goal',
    team,
    scorerId: scorer?.id ?? null,
    ownGoal: !!scorer && scorer.team !== team,
  });
  m.phase = 'goal';
  m.phaseTimer = 2.5;
  m.pendingSwitch = null;
  for (const p of m.players) {
    p.pending = null;
    p.charging = false;
    p.charge = 0;
  }
}

export function kickoff(m) {
  m.phase = 'play';
  const b = m.ball;
  b.pos.x = 0;
  b.pos.y = 0.11;
  b.pos.z = 0;
  b.vel.x = b.vel.y = b.vel.z = 0;
  b.holder = null;
  b.lastTouch = null;
  m.lastTouchTeam = null;
  for (const p of m.players) {
    p.pos.x = p.home.x;
    p.pos.z = p.home.z;
    p.vel.x = p.vel.z = 0;
    p.facing = { x: attackDir(p.team), z: 0 };
    p.state = 'normal';
    p.stateTimer = 0;
  }
  m.events.push({ type: 'kickoff' });
}

function setControlled(m, id) {
  const old = getPlayer(m, m.controlledId);
  if (old) {
    old.charging = false;
    old.charge = 0;
  }
  m.controlledId = id;
  m.pendingSwitch = null;
}

export function switchToNearest(m) {
  let best = null;
  let bestD = Infinity;
  for (const p of m.players) {
    if (p.team !== m.humanTeam || p.role === 'gk' || p.id === m.controlledId) continue;
    const d = dist2d(p.pos, m.ball.pos);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (best) setControlled(m, best.id);
}

function updatePendingSwitch(m) {
  const ps = m.pendingSwitch;
  if (!ps) return;
  const lt = m.ball.lastTouch;
  if (lt !== ps.kicker && lt !== ps.receiver) {
    m.pendingSwitch = null;
    return;
  }
  const r = getPlayer(m, ps.receiver);
  if (dist2d(r.pos, m.ball.pos) < 2.5) setControlled(m, r.id);
}
