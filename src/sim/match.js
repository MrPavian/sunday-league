// Deterministische Match-Simulation. Kennt kein three.js – dieselbe Logik soll
// später auch ungespielte Partien simulieren und online laufen können.
import { createRng } from '../core/rng.js';
import { dist2d, norm } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { TEAM_PRESETS } from '../data/teams.js';
import { bodyBlock, dribbleTouch, headerTouch, keeperSaves, movePlayer, separatePlayers, tryExecute } from './actions.js';
import { keeperIntent, outfieldIntent, updateTactics } from './ai.js';
import { createBall, stepBall } from './ball.js';
import { FORMATIONS, formationSpot } from './formation.js';
import { generateTeam } from './generator.js';
import { PARKING_LOT } from './pitch.js';
import { attackDir, getPlayer, setControlled, teamAttacking } from './players.js';
import { makeEntity, requestSub, restBench, swapSides } from './squad.js';
import { createStats, trackStep } from './stats.js';
import { createReferee, stepReferee } from './referee.js';
import { carRule, restartFromOut, startSetPiece } from './setpieces.js';
import { resolveTackles, startPoke, startTackle, stateMove } from './tackles.js';

export { attackDir, getPlayer } from './players.js';
export { startPoke, startTackle } from './tackles.js';

export const MATCH_DURATION = 600; // Sekunden Spielzeit (Prototyp: 10 Minuten)

const NO_INPUT = { move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, tackle: false, switchPlayer: false, sub: false };

const BENCH_ROLES = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'] };

// human: false → beide Teams von der KI gesteuert (Simulation ungespielter Partien).
export function createMatch({ seed = 1, pitch = PARKING_LOT, teams, kickoff = true, human = true, duration = MATCH_DURATION } = {}) {
  const rng = createRng(seed);
  const formation = FORMATIONS[pitch.format ?? 5];
  const roles = formation.map((f) => f.role);
  const benchRoles = BENCH_ROLES[pitch.format ?? 5] ?? [];
  const squads = teams ?? TEAM_PRESETS.map((preset) => generateTeam(rng, preset, [...roles, ...benchRoles]));

  const players = [];
  const bench = [[], []];
  squads.forEach((team, ti) => {
    team.players.forEach((pl, i) => {
      const entry = formation[i] ?? formation.find((f) => f.role === pl.position) ?? formation[formation.length - 1];
      const p = makeEntity(pl, ti, i, entry.role, formationSpot(pitch, entry, ti));
      p.formationEntry = entry;
      if (i < formation.length) players.push(p);
      else bench[ti].push(p);
    });
  });

  const m = {
    pitch,
    rng,
    teams: squads,
    players,
    bench,
    subRequests: [false, false],
    ball: createBall(),
    score: [0, 0],
    time: 0,
    duration,
    half: 1,
    sidesSwapped: false,
    phase: 'play',
    phaseTimer: 0,
    setPiece: null,
    kickoffTeam: 0,
    lastGoal: null,
    lastPass: null,
    events: [],
    stats: createStats(),
    referee: pitch.referee ? createReferee(rng) : null,
    sentOff: [],
    humanTeam: human ? 0 : null,
    controlledId: human ? players.find((p) => p.team === 0 && p.role === 'fwd').id : null,
    chasers: [null, null],
    tactics: {},
    pendingSwitch: null,
    lastTouchTeam: null,
  };
  if (kickoff) startSetPiece(m, { type: 'kickoff', team: 0 });
  return m;
}

export function stepMatch(m, input = NO_INPUT, dt) {
  if (m.phase === 'ended') return;
  if (input.sub && m.humanTeam !== null) requestSub(m, m.humanTeam);
  restBench(m, dt);
  step(m, input, dt);
  if (m.phase === 'play' || m.phase === 'setpiece') stepReferee(m, dt);
  trackStep(m, dt);
}

function step(m, input, dt) {
  const { ball, pitch } = m;

  if (m.phase === 'goal') {
    m.phaseTimer -= dt;
    stepBall(ball, pitch, dt);
    celebrate(m, dt);
    if (m.phaseTimer <= 0) startSetPiece(m, { type: 'kickoff', team: m.kickoffTeam });
    return;
  }
  if (m.phase === 'setpiece') {
    if ((m.phaseTimer -= dt) <= 0) m.phase = 'play';
    return;
  }
  if (m.phase === 'halftime') {
    if ((m.phaseTimer -= dt) > 0) return;
    // Seitenwechsel, kurz durchschnaufen, die andere Mannschaft stößt an.
    swapSides(m);
    for (const p of m.players) p.stamina = Math.min(1, p.stamina + 0.25);
    startSetPiece(m, { type: 'kickoff', team: 1 });
    return;
  }

  m.time += dt;
  if (m.half === 1 && m.time >= m.duration / 2) {
    m.half = 2;
    m.phase = 'halftime';
    m.phaseTimer = 3;
    m.events.push({ type: 'halftime' });
    return;
  }
  if (m.time >= m.duration) {
    m.phase = 'ended';
    m.events.push({ type: 'end' });
    return;
  }

  if (input.switchPlayer) switchToNearest(m);
  updateTactics(m, dt);

  const leaders = m.players.filter((p) => hasTrait(p, 'anfuehrer') || hasTrait(p, 'ex_profi'));
  for (const p of m.players) {
    p.kickCooldown = Math.max(0, p.kickCooldown - dt);
    p.kickAnim = Math.max(0, p.kickAnim - dt);
    p.headAnim = Math.max(0, p.headAnim - dt);
    p.diveAnim = Math.max(0, p.diveAnim - dt);
    p.catchCooldown = Math.max(0, p.catchCooldown - dt);
    p.decideTimer -= dt;
    if (p.state !== 'normal') {
      stateMove(m, p, dt);
      continue;
    }
    let intent;
    if (p.id === m.controlledId) intent = humanIntent(m, p, input, dt);
    else if (p.role === 'gk') intent = keeperIntent(m, p, dt);
    else intent = outfieldIntent(m, p, dt);
    if (intent.tackle === 'slide') startTackle(m, p);
    else if (intent.tackle === 'poke') startPoke(m, p);
    else movePlayer(m, p, intent, dt, leaders);
  }
  separatePlayers(m);
  if (resolveTackles(m)) return;

  if (ball.holder) {
    const h = getPlayer(m, ball.holder);
    const overhead = h.role !== 'gk';
    ball.pos.x = h.pos.x + h.facing.x * (overhead ? 0.1 : 0.35);
    ball.pos.y = overhead ? 2.0 * h.look.height : 1.1;
    ball.pos.z = h.pos.z + h.facing.z * (overhead ? 0.1 : 0.35);
    ball.vel.x = ball.vel.y = ball.vel.z = 0;
  }

  for (const p of m.players) {
    if (!p.pending) continue;
    tryExecute(m, p);
    if (p.pending && (p.pending.ttl -= dt) <= 0) p.pending = null;
  }

  keeperSaves(m);
  headerTouch(m);
  bodyBlock(m);
  dribbleTouch(m);

  const ev = stepBall(ball, pitch, dt);
  if (ev) handleBallEvent(m, ev);

  updatePendingSwitch(m);
}

function handleBallEvent(m, ev) {
  if (ev.type === 'goal') onGoal(m, teamAttacking(m, ev.side));
  else if (ev.type === 'out') restartFromOut(m, ev);
  else if (ev.type === 'car') carRule(m, ev);
  else m.events.push(ev); // post, bar
}

function humanIntent(m, p, input, dt) {
  const { ball } = m;
  if (ball.holder === p.id) {
    // Einwurf: mit dem Stick zielen, Pass- oder Schusstaste wirft.
    const mv = input.move;
    if (Math.hypot(mv.x, mv.z) > 0.3) p.facing = { x: mv.x / Math.hypot(mv.x, mv.z), z: mv.z / Math.hypot(mv.x, mv.z) };
    if (input.pass || input.shootHeld) p.pending = { type: 'pass', ttl: 0.3, cone: 0.2 };
    return { move: { x: 0, z: 0 }, sprint: false };
  }
  if (input.tackle) {
    // Auf hartem Boden wird im Stehen gestochert – Sprint + Grätsche erzwingt
    // die Grätsche trotzdem.
    return { tackle: m.pitch.surface.hard && !input.sprint ? 'poke' : 'slide' };
  }
  if (input.shootHeld) {
    p.charging = true;
    p.charge = Math.min(1, p.charge + dt * 1.25);
  } else if (p.charging) {
    p.charging = false;
    p.pending = { type: 'shoot', power: Math.max(0.15, p.charge), ttl: 0.3 };
    p.charge = 0;
  }
  // Shift + Pass = hoher Ball; bei der Ecke automatisch als Flanke.
  if (input.pass) p.pending = { type: 'pass', ttl: 0.3, lofted: p.setPieceAction === 'cross' ? 'cross' : !!input.sprint };
  p.dribbleDir = null;
  return { move: input.move, sprint: input.sprint };
}

function onGoal(m, team) {
  m.score[team]++;
  const scorer = m.ball.lastTouch && getPlayer(m, m.ball.lastTouch);
  const ownGoal = !!scorer && scorer.team !== team;
  const lp = m.lastPass;
  const assistId = !ownGoal && lp && lp.team === team && lp.playerId !== scorer?.id && m.time - lp.time < 8 ? lp.playerId : null;
  m.events.push({ type: 'goal', team, scorerId: scorer?.id ?? null, assistId, ownGoal, via: m.ball.lastAction, time: m.time });
  m.lastGoal = { team, scorerId: ownGoal ? null : scorer?.id ?? null };
  for (const p of m.players) p.mood = p.team !== team ? 'sad' : p.id === m.lastGoal.scorerId ? 'scorer' : 'celebrate';
  m.phase = 'goal';
  m.phaseTimer = 2.5;
  m.kickoffTeam = 1 - team; // Wer das Tor kassiert, stößt an.
  m.pendingSwitch = null;
  for (const p of m.players) {
    p.pending = null;
    p.charging = false;
    p.charge = 0;
  }
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

// Torjubel: Der Torschütze läuft zur Eckfahne, die Mitspieler hinterher,
// die anderen trotten mit hängenden Köpfen zurück.
function celebrate(m, dt) {
  const { pitch } = m;
  const scorer = getPlayer(m, m.lastGoal?.scorerId);
  const s = attackDir(m, m.lastGoal?.team ?? 0);
  for (const p of m.players) {
    let target = null;
    let speed = 0;
    if (p.mood === 'scorer') {
      target = { x: s * (pitch.halfLength - 3), z: pitch.halfWidth * 0.6 };
      speed = 6;
    } else if (p.mood === 'celebrate' && p.role !== 'gk' && scorer) {
      target = scorer.pos;
      speed = dist2d(p.pos, scorer.pos) > 1.2 ? 5 : 0;
    } else if (p.mood === 'sad') {
      target = p.home;
      speed = 1.2;
    }
    if (!target || speed === 0 || dist2d(p.pos, target) < 0.3) {
      p.vel.x *= 0.85;
      p.vel.z *= 0.85;
    } else {
      const dir = norm(target.x - p.pos.x, target.z - p.pos.z);
      p.vel.x = dir.x * speed;
      p.vel.z = dir.z * speed;
      p.facing = dir;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;
  }
}
