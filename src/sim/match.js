// Deterministische Match-Simulation. Kennt kein three.js – dieselbe Logik soll
// später auch ungespielte Partien simulieren und online laufen können.
import { createRng } from '../core/rng.js';
import { dist2d } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { TEAM_PRESETS } from '../data/teams.js';
import { bodyBlock, dribbleTouch, headerTouch, keeperSaves, movePlayer, separatePlayers, tryExecute } from './actions.js';
import { keeperIntent, outfieldIntent, updateTactics } from './ai.js';
import { createBall, stepBall } from './ball.js';
import { FORMATIONS, formationSpot } from './formation.js';
import { generateTeam } from './generator.js';
import { PARKING_LOT } from './pitch.js';
import { attackDir, getPlayer, setControlled } from './players.js';
import { carRule, restartFromOut, startSetPiece } from './setpieces.js';
import { resolveTackles, startPoke, startTackle, stateMove } from './tackles.js';

export { attackDir, getPlayer } from './players.js';
export { startPoke, startTackle } from './tackles.js';

export const MATCH_DURATION = 600; // Sekunden Spielzeit (Prototyp: 10 Minuten)

const NO_INPUT = { move: { x: 0, z: 0 }, sprint: false, shootHeld: false, pass: false, tackle: false, switchPlayer: false };

// human: false → beide Teams von der KI gesteuert (Simulation ungespielter Partien).
export function createMatch({ seed = 1, pitch = PARKING_LOT, teams, kickoff = true, human = true } = {}) {
  const rng = createRng(seed);
  const formation = FORMATIONS[pitch.format ?? 5];
  const roles = formation.map((f) => f.role);
  const squads = teams ?? TEAM_PRESETS.map((preset) => generateTeam(rng, preset, roles));

  const players = [];
  squads.forEach((team, ti) => {
    team.players.forEach((pl, i) => {
      const home = formationSpot(pitch, formation[i], ti);
      players.push({
        ...pl,
        id: `${ti}-${i}`,
        team: ti,
        role: formation[i].role,
        home,
        pos: { ...home },
        vel: { x: 0, z: 0 },
        facing: { x: attackDir(ti), z: 0 },
        stamina: 1,
        charge: 0,
        charging: false,
        pending: null,
        kickCooldown: 0,
        kickAnim: 0,
        headAnim: 0,
        catchCooldown: 0,
        holdTimer: 0,
        decideTimer: 0,
        dribbleDir: null,
        aimZ: 0,
        state: 'normal', // normal | tackle | poke | recover | down | complain
        stateTimer: 0,
        tackleWon: false,
        tackleHits: [],
        complainNext: null,
        setPieceAction: null,
        injury: null,
      });
    });
  });

  const m = {
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
    setPiece: null,
    kickoffTeam: 0,
    events: [],
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
    if (m.phaseTimer <= 0) startSetPiece(m, { type: 'kickoff', team: m.kickoffTeam });
    return;
  }
  if (m.phase === 'setpiece') {
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
  updateTactics(m, dt);

  const leaders = m.players.filter((p) => hasTrait(p, 'anfuehrer'));
  for (const p of m.players) {
    p.kickCooldown = Math.max(0, p.kickCooldown - dt);
    p.kickAnim = Math.max(0, p.kickAnim - dt);
    p.headAnim = Math.max(0, p.headAnim - dt);
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
  if (ev.type === 'goal') onGoal(m, ev.team);
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
  if (input.pass) p.pending = { type: 'pass', ttl: 0.3, lofted: !!input.sprint || p.setPieceAction === 'cross' };
  p.dribbleDir = null;
  return { move: input.move, sprint: input.sprint };
}

function onGoal(m, team) {
  m.score[team]++;
  const scorer = m.ball.lastTouch && getPlayer(m, m.ball.lastTouch);
  m.events.push({
    type: 'goal',
    team,
    scorerId: scorer?.id ?? null,
    ownGoal: !!scorer && scorer.team !== team,
    via: m.ball.lastAction,
  });
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
