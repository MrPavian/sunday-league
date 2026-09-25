// Elfmeterschießen (in der Halle: Siebenmeter) für K.-o.-Spiele, die der Mensch
// selbst spielt. Geschossen wird immer auf dasselbe Tor; wer schießt, spielt für
// diesen Moment „nach rechts". Der Mensch zielt als Schütze mit ↑/↓ und dosiert
// die Wucht mit der Schusstaste; im Tor wählt er mit ↑/↓ die Ecke.
import { clamp } from '../core/math.js';
import { keeperSaves, tryExecute } from './actions.js';
import { stepBall } from './ball.js';
import { keeperReaction } from './ai.js';

const ROUNDS = 5;

export const spotDistance = (pitch) => (pitch.id === 'halle' ? 7 : pitch.halfLength > 19 ? 9 : 6);

export function startShootout(m) {
  const order = (team) =>
    [...m.players.filter((p) => p.team === team && p.role !== 'gk')].sort((a, b) => b.attrs.shooting - a.attrs.shooting).map((p) => p.id);
  m.phase = 'shootout';
  m.shootout = {
    order: [order(0), order(1)],
    kicks: [[], []], // true = drin, false = daneben/gehalten
    team: m.rng.chance(0.5) ? 0 : 1, // wer beginnt
    state: 'setup',
    timer: 0,
    aimZ: 0,
    diveZ: 0,
    done: false,
  };
  m.events.push({ type: 'shootout_start', team: m.shootout.team });
  setupKick(m);
}

const goals = (so, t) => so.kicks[t].filter(Boolean).length;

// Ist das Schießen entschieden? In den ersten fünf Runden auch vorzeitig.
function decided(so) {
  const [a, b] = [goals(so, 0), goals(so, 1)];
  const [na, nb] = [so.kicks[0].length, so.kicks[1].length];
  if (na <= ROUNDS && nb <= ROUNDS) {
    const leftA = ROUNDS - na;
    const leftB = ROUNDS - nb;
    if (a > b + leftB || b > a + leftA) return true;
    return na === ROUNDS && nb === ROUNDS && a !== b;
  }
  return na === nb && a !== b; // Sudden Death
}

function setupKick(m) {
  const so = m.shootout;
  const { pitch, ball } = m;
  // Der Schütze spielt „nach rechts": Team 1 bekommt dafür die Seiten getauscht.
  m.sidesSwapped = so.team === 1;
  const goalX = pitch.halfLength;
  const spotX = goalX - spotDistance(pitch);
  const list = so.order[so.team];
  const shooterId = list[so.kicks[so.team].length % list.length];
  const keeper = m.players.find((p) => p.team !== so.team && p.role === 'gk');
  for (const p of m.players) {
    // Alle anderen warten im Mittelkreis.
    const i = m.players.indexOf(p);
    p.pos.x = -2 + (i % 4) * 1.2;
    p.pos.z = -3 + Math.floor(i / 4) * 1.5;
    p.vel.x = p.vel.z = 0;
    p.state = 'normal';
    p.pending = null;
    p.charge = 0;
    p.charging = false;
    p.facing = { x: 1, z: 0 };
  }
  const shooter = m.players.find((p) => p.id === shooterId);
  Object.assign(shooter.pos, { x: spotX - 0.5, z: 0 });
  shooter.facing = { x: 1, z: 0 };
  shooter.kickCooldown = 0;
  Object.assign(keeper.pos, { x: goalX - 0.3, z: 0 });
  keeper.facing = { x: -1, z: 0 };
  keeper.catchCooldown = 0;
  keeper.diveAnim = 0;
  Object.assign(ball.pos, { x: spotX, y: 0.11, z: 0 });
  ball.vel.x = ball.vel.y = ball.vel.z = 0;
  ball.holder = null;
  ball.lastTouch = shooter.id;
  ball.lastAction = 'dribble';
  m.lastTouchTeam = so.team;
  m.shotTime = null;
  so.shooterId = shooter.id;
  so.keeperId = keeper.id;
  so.aimZ = 0;
  so.diveZ = 0;
  so.diveChosen = false;
  so.shot = false;
  so.state = 'aim';
  so.timer = 0;
  so.charge = 0;
  // Der Mensch steuert den Schützen oder den eigenen Torwart.
  if (m.humanTeam !== null) m.controlledId = so.team === m.humanTeam ? shooter.id : keeper.id;
  m.events.push({ type: 'shootout_kick', team: so.team, shooterId: shooter.id, keeperId: keeper.id });
}

export function stepShootout(m, input, dt) {
  const so = m.shootout;
  const { pitch, ball, rng } = m;
  const gw = pitch.goalHalfWidth;
  const shooter = m.players.find((p) => p.id === so.shooterId);
  const keeper = m.players.find((p) => p.id === so.keeperId);
  const humanShoots = m.humanTeam === so.team;
  const humanKeeps = m.humanTeam !== null && !humanShoots;
  so.timer += dt;
  for (const p of m.players) {
    p.kickCooldown = Math.max(0, p.kickCooldown - dt);
    p.kickAnim = Math.max(0, p.kickAnim - dt);
    p.diveAnim = Math.max(0, p.diveAnim - dt);
    p.catchCooldown = Math.max(0, p.catchCooldown - dt);
  }
  const stick = clamp(input?.move?.z ?? 0, -1, 1);

  if (so.state === 'aim') {
    if (humanShoots) {
      // ↑/↓ verschiebt die Ecke, Schusstaste halten lädt, loslassen schießt.
      so.aimZ = clamp(so.aimZ + stick * dt * 1.6, -1, 1);
      shooter.charge = so.charge; // für den Schuss-Balken im HUD
      if (input?.shootHeld) so.charge = Math.min(1, so.charge + dt * 1.25);
      else if (so.charge > 0) kick(m, shooter, so.aimZ, Math.max(0.25, so.charge));
      else if (so.timer > 12) kick(m, shooter, so.aimZ, 0.6); // nicht ewig warten
    } else if (so.timer > 1.4) {
      // Die KI sucht sich eine Ecke – oder schiebt frech in die Mitte.
      const r = rng.next();
      const aim = r < 0.15 ? rng.range(-0.2, 0.2) : (rng.chance(0.5) ? 1 : -1) * rng.range(0.5, 0.95);
      kick(m, shooter, aim, rng.range(0.55, 0.95));
    }
    if (humanKeeps && Math.abs(stick) > 0.3) {
      so.diveZ = Math.sign(stick);
      so.diveChosen = true;
    }
    return;
  }

  if (so.state === 'flight') {
    if (humanKeeps && !so.diveChosen && Math.abs(stick) > 0.3 && m.time - m.shotTime < 0.35) {
      so.diveZ = Math.sign(stick);
      so.diveChosen = true;
    }
    moveKeeper(m, keeper, dt);
    m.time += dt;
    keeperSaves(m);
    const ev = stepBall(ball, pitch, dt);
    if (ev?.type === 'goal') return finishKick(m, true);
    const out = ev && (ev.type === 'out' || ev.type === 'car');
    const stopped = Math.hypot(ball.vel.x, ball.vel.z) < 0.5 && ball.pos.y < 0.2;
    const away = ball.vel.x < 0 && ball.pos.x < pitch.halfLength - spotDistance(pitch) - 1;
    if (ev?.type === 'post' || ev?.type === 'bar') m.events.push({ type: ev.type });
    if (out || stopped || away || ball.holder || so.timer > 3) finishKick(m, false);
    return;
  }

  if (so.state === 'result' && so.timer > 1.6) {
    if (decided(so)) {
      so.done = true;
      m.phase = 'ended';
      m.events.push({ type: 'shootout_end', score: [goals(so, 0), goals(so, 1)] });
      m.events.push({ type: 'end' });
      return;
    }
    so.team = 1 - so.team;
    setupKick(m);
  }
}

function kick(m, shooter, aim, power) {
  const so = m.shootout;
  const gw = m.pitch.goalHalfWidth;
  shooter.charge = 0;
  shooter.pending = { type: 'shoot', power, target: { x: m.pitch.halfLength, z: aim * gw * 0.9 }, ttl: 1, placed: true };
  // Ball liegt direkt vor dem Schützen – sofort ausführen.
  shooter.pos.x = m.ball.pos.x - 0.4;
  tryExecute(m, shooter);
  so.shot = true;
  so.state = 'flight';
  so.timer = 0;
  // Die KI im Tor rät eine Ecke – etwas besser, je stärker der Keeper.
  if (!(m.humanTeam !== null && m.humanTeam !== so.team)) {
    const r = m.rng.next();
    so.diveZ = r < 0.2 ? 0 : m.rng.chance(0.5) ? 1 : -1;
  }
}

// Der Keeper springt in die gewählte Ecke, sobald er reagiert hat.
function moveKeeper(m, keeper, dt) {
  const so = m.shootout;
  if (m.time - m.shotTime < keeperReaction(m, keeper) * 0.8) return;
  const target = so.diveZ * m.pitch.goalHalfWidth * 0.6;
  const dz = target - keeper.pos.z;
  if (Math.abs(dz) < 0.05) return;
  const speed = 3.5 + 1.5 * keeper.attrs.keeping;
  keeper.pos.z += Math.sign(dz) * Math.min(Math.abs(dz), speed * dt);
  if (so.diveZ !== 0 && keeper.diveAnim <= 0) {
    keeper.diveAnim = 0.5;
    keeper.diveSide = -so.diveZ; // aus Sicht des Keepers (schaut nach -x)
  }
}

function finishKick(m, scored) {
  const so = m.shootout;
  if (so.state === 'result') return;
  so.kicks[so.team].push(scored);
  so.state = 'result';
  so.timer = 0;
  m.events.push({ type: scored ? 'pen_goal' : 'pen_miss', team: so.team, playerId: so.shooterId, keeperId: so.keeperId });
}

export const shootoutScore = (so) => [goals(so, 0), goals(so, 1)];
