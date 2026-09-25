// Standardsituationen: Anstoß, Freistoß, Einwurf, Ecke, Abstoß.
// Ohne Schiri gelten die Hobbyregeln: Wer gefoult wurde, legt sich den Ball
// hin; wer ans Auto schießt, gibt den Ball ab.
import { clamp, dist2d, len, norm } from '../core/math.js';
import { attackDir, clampToPitch, getPlayer, setControlled, teamAttacking } from './players.js';
import { processSubs } from './squad.js';
import { keeperZone } from './ai.js';

const FREEZE = { kickoff: 0.8, freekick: 1.3, throwin: 1.0, corner: 1.3, goalkick: 1.0 };
const DISTANCE = 3.5;

export function startSetPiece(m, { type, team, spot = { x: 0, z: 0 }, takerId = null }) {
  const { ball, pitch } = m;
  const s = attackDir(m, team);
  processSubs(m); // Wechsel nur bei Unterbrechungen

  if (type === 'kickoff') {
    for (const p of m.players) {
      p.pos.x = p.home.x;
      p.pos.z = p.home.z;
      p.facing = { x: attackDir(m, p.team), z: 0 };
      p.state = 'normal';
      p.stateTimer = 0;
      p.complainNext = null;
      p.mood = null;
    }
  }

  // Der vorgesehene Schütze kann gerade ausgewechselt worden sein.
  const taker = (takerId && getPlayer(m, takerId)) || pickTaker(m, type, team, spot);
  const toGoal = norm(s * pitch.halfLength - spot.x, -spot.z);

  ball.pos.x = spot.x;
  ball.pos.y = 0.11;
  ball.pos.z = spot.z;
  ball.vel.x = ball.vel.y = ball.vel.z = 0;
  ball.holder = null;
  ball.lastTouch = taker.id;
  m.lastTouchTeam = team;
  m.pendingSwitch = null;

  taker.state = 'normal';
  taker.decideTimer = 0;
  if (type === 'throwin' || type === 'goalkick') {
    // Ball in die Hand: Einwurf über den Kopf, Torwart wirft/schlägt ab.
    taker.pos.x = spot.x;
    taker.pos.z = spot.z;
    taker.facing = type === 'throwin' ? norm(s * 0.8, -Math.sign(spot.z)) : { x: s, z: 0 };
    taker.holdTimer = 0;
    ball.holder = taker.id;
  } else {
    const back = type === 'kickoff' ? 0.4 : 0.5;
    // Nicht hinter die Wand stellen, wenn der Freistoß direkt davor liegt.
    taker.pos.x = clamp(spot.x - toGoal.x * back, -pitch.wallX + 0.3, pitch.wallX - 0.3);
    taker.pos.z = spot.z - toGoal.z * back;
    taker.facing = toGoal;
  }
  taker.setPieceAction = type === 'corner' ? 'cross' : null;

  for (const p of m.players) {
    p.vel.x = p.vel.z = 0;
    p.pending = null;
    p.charging = false;
    p.charge = 0;
    if (p !== taker) p.setPieceAction = null;
    if (p.team === team) continue;
    const dx = p.pos.x - spot.x;
    const dz = p.pos.z - spot.z;
    const d = len(dx, dz);
    // Beim Abstoß müssen alle Gegner raus aus dem Strafraum.
    const keep = type === 'goalkick' ? keeperZone(pitch) : DISTANCE;
    if (d < keep) {
      const n = d > 0.01 ? { x: dx / d, z: dz / d } : { x: -toGoal.x, z: -toGoal.z };
      const zMax = pitch.boundary === 'lines' ? pitch.halfWidth + 1 : pitch.halfWidth - 0.3;
      p.pos.x = clamp(spot.x + n.x * keep, -pitch.wallX + 0.3, pitch.wallX - 0.3);
      p.pos.z = clamp(spot.z + n.z * keep, -zMax, zMax);
    }
  }

  if (team === m.humanTeam && taker.role !== 'gk') setControlled(m, taker.id);
  m.phase = 'setpiece';
  m.phaseTimer = FREEZE[type];
  m.setPiece = { type, team, takerId: taker.id, time: m.time, taken: false };
  m.wallIds = type === 'freekick' ? buildWall(m, team, spot) : null;
  m.events.push({ type: 'setpiece', kind: type, team, playerId: taker.id });
}

function pickTaker(m, type, team, spot) {
  const mates = m.players.filter((p) => p.team === team);
  if (type === 'goalkick') return mates.find((p) => p.role === 'gk');
  if (type === 'kickoff') return mates.find((p) => p.role === 'fwd') ?? mates[mates.length - 1];
  let best = null;
  let bestD = Infinity;
  for (const p of mates) {
    if (p.role === 'gk') continue;
    const d = dist2d(p.pos, spot);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// Ball im Aus: Seitenaus → Einwurf, Toraus → Ecke oder Abstoß.
export function restartFromOut(m, ev) {
  const { pitch } = m;
  const lastTeam = m.lastTouchTeam ?? 0;
  const other = 1 - lastTeam;
  if (ev.line === 'side') {
    const spot = { x: clamp(ev.x, -pitch.halfLength + 0.5, pitch.halfLength - 0.5), z: Math.sign(ev.z) * pitch.halfWidth };
    startSetPiece(m, { type: 'throwin', team: other, spot });
    m.events.push({ type: 'out', restart: 'throwin', team: other });
    return;
  }
  const defending = 1 - teamAttacking(m, Math.sign(ev.x));
  const attacking = 1 - defending;
  const sx = Math.sign(ev.x);
  if (lastTeam === defending) {
    const spot = { x: sx * (pitch.halfLength - 0.3), z: Math.sign(ev.z || 1) * (pitch.halfWidth - 0.3) };
    startSetPiece(m, { type: 'corner', team: attacking, spot });
    m.events.push({ type: 'out', restart: 'corner', team: attacking });
  } else {
    const spot = { x: sx * (pitch.halfLength - 1.5), z: 0 };
    startSetPiece(m, { type: 'goalkick', team: defending, spot });
    m.events.push({ type: 'out', restart: 'goalkick', team: defending });
  }
}

// Parkplatzregel: Wer den Ball gegen ein Auto drischt, gibt ihn ab.
export function carRule(m, ev) {
  if (m.lastTouchTeam === null) return false;
  const team = 1 - m.lastTouchTeam;
  const spot = clampToPitch(m.pitch, ev.x, ev.z - Math.sign(ev.z) * 1.0, 1.0);
  m.events.push({ type: 'car', team, playerId: m.ball.lastTouch });
  startSetPiece(m, { type: 'freekick', team, spot });
  return true;
}

// Direkter Freistoß in Tornähe: Die Verteidiger stellen eine Mauer auf Abstand –
// zwei Mann, auf dem großen Feld drei. Sie bleibt stehen, bis der Ball gespielt ist.
function buildWall(m, team, spot) {
  const { pitch } = m;
  const defending = 1 - team;
  const goalX = attackDir(m, team) * pitch.halfLength;
  const dGoal = Math.hypot(goalX - spot.x, spot.z);
  if (dGoal > 17 || dGoal < DISTANCE + 1.5 || pitch.format < 5) return null; // im Hinterhof stellt keiner eine Mauer
  const size = pitch.format >= 7 ? 3 : 2;
  const dir = norm(goalX - spot.x, -spot.z);
  const side = { x: -dir.z, z: dir.x };
  const centre = { x: spot.x + dir.x * DISTANCE, z: spot.z + dir.z * DISTANCE };
  const men = m.players
    .filter((p) => p.team === defending && p.role !== 'gk' && p.state === 'normal')
    .sort((a, b) => dist2d(a.pos, centre) - dist2d(b.pos, centre))
    .slice(0, size);
  men.forEach((p, i) => {
    const off = (i - (men.length - 1) / 2) * 0.6;
    const zMax = pitch.boundary === 'lines' ? pitch.halfWidth + 1 : pitch.halfWidth - 0.3;
    p.pos.x = clamp(centre.x + side.x * off, -pitch.wallX + 0.3, pitch.wallX - 0.3);
    p.pos.z = clamp(centre.z + side.z * off, -zMax, zMax);
    p.vel.x = p.vel.z = 0;
    p.facing = { x: -dir.x, z: -dir.z };
  });
  return men.map((p) => p.id);
}
