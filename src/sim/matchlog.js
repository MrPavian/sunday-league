// Spielprotokoll für Trainer und Nachanalyse: Ballbesitzphasen, Ballverluste, Pässe
// und Schüsse mit Zone, dazu alle halbe Sekunde eine Momentaufnahme (Abwehrlinien,
// Abstand der Spitze, Kraft). Liest nur – kein Zufall, keine Wirkung aufs Spiel.
//
// Zonen immer aus Sicht der handelnden Mannschaft:
//   third: 'def' | 'mid' | 'att'  (eigenes Drittel … gegnerisches Drittel)
//   lane:  'left' | 'centre' | 'right'  (links/rechts in Spielrichtung)
import { dist2d } from '../core/math.js';
import { attackDir } from './players.js';

const SAMPLE = 0.5;
const CONFIRM = 0.7; // so lange muss ein Ballgewinn halten, damit er zählt

// Wie weit vorne (−1 eigene Torlinie … +1 gegnerische) liegt pos für dieses Team?
export const advance = (m, team, pos) => (pos.x * attackDir(m, team)) / m.pitch.halfLength;
export const thirdOf = (adv) => (adv < -1 / 3 ? 'def' : adv > 1 / 3 ? 'att' : 'mid');
export function laneOf(m, team, pos) {
  const l = (-pos.z * attackDir(m, team)) / m.pitch.halfWidth;
  return l > 0.33 ? 'left' : l < -0.33 ? 'right' : 'centre';
}
// Dieselbe Stelle aus Sicht des Gegners: links ↔ rechts, Angriff ↔ Abwehr.
export const mirrorLane = (lane) => (lane === 'left' ? 'right' : lane === 'right' ? 'left' : lane);
export const mirrorThird = (third) => (third === 'def' ? 'att' : third === 'att' ? 'def' : third);

export function createLog() {
  return { poss: [], turnovers: [], passes: [], shots: [], samples: [], cur: null, pending: null, nextSample: 0, setPiece: null };
}

const zone = (m, team, pos) => {
  const adv = advance(m, team, pos);
  return { adv, third: thirdOf(adv), lane: laneOf(m, team, pos) };
};

function openPossession(m, log, team, how) {
  const z = zone(m, team, m.ball.pos);
  if (log.cur) log.cur.end = m.time;
  log.cur = { team, start: m.time, end: null, how, startThird: z.third, startLane: z.lane, passes: 0, maxAdv: z.adv, entryLane: null, box: false, shots: 0, goal: false, half: m.half };
  log.poss.push(log.cur);
}

// Nach jedem Schritt (nach trackStep) aufrufen.
export function stepLog(m) {
  const log = (m.log ??= createLog());
  const { ball } = m;
  let cause = null;
  for (const e of m.events) {
    const p = e.playerId ? m.players.find((q) => q.id === e.playerId) : null;
    switch (e.type) {
      case 'pass':
        if (!p) break;
        log.pending = { t: m.time, half: m.half, team: p.team, kicker: p.id, targetId: e.targetId, lofted: e.lofted, through: !!e.through, ...zone(m, p.team, p.pos), done: null };
        log.passes.push(log.pending);
        if (log.cur?.team === p.team) log.cur.passes++;
        break;
      case 'shot':
        if (!p) break;
        log.shots.push({ t: m.time, half: m.half, team: p.team, playerId: p.id, ...zone(m, p.team, p.pos), dist: dist2d(p.pos, { x: attackDir(m, p.team) * m.pitch.halfLength, z: 0 }), possIndex: log.poss.length - 1 });
        if (log.cur?.team === p.team) log.cur.shots++;
        break;
      case 'tackle':
      case 'poke_won':
        cause = 'tackle';
        break;
      case 'save':
      case 'catch':
        cause = 'keeper';
        break;
      case 'goal':
        if (log.cur && log.cur.team === e.team) log.cur.goal = true;
        break;
    }
  }
  // Pass angekommen? Entschieden, sobald ein anderer den Ball berührt.
  const pend = log.pending;
  if (pend && ball.lastTouch && ball.lastTouch !== pend.kicker) {
    pend.done = m.lastTouchTeam === pend.team;
    pend.receiver = ball.lastTouch;
    log.pending = null;
  }
  // Neuer Standard: Ballbesitz durch Pfiff.
  if (m.setPiece && m.setPiece !== log.setPiece) {
    log.setPiece = m.setPiece;
    if (m.setPiece.team != null && m.setPiece.team !== log.cur?.team) openPossession(m, log, m.setPiece.team, 'restart');
  }
  // Ballbesitzwechsel im Spiel. Erst wenn das neue Team den Ball einen Moment
  // behält – sonst wäre jedes Gestocher ein Wechsel hin und her.
  const team = m.lastTouchTeam;
  const tent = log.tentative;
  if (team != null && team !== log.cur?.team) {
    if (!tent || tent.team !== team) {
      const z = zone(m, team, ball.pos);
      log.tentative = { team, t: m.time, how: cause ?? (pend && pend.done === false ? 'intercept' : 'loose'), third: z.third, lane: z.lane };
    } else if (cause && tent.how === 'loose') tent.how = cause;
    const t2 = log.tentative;
    if (m.time - t2.t >= CONFIRM || cause === 'keeper' || m.phase !== 'play') {
      log.turnovers.push({ t: t2.t, half: m.half, to: team, how: t2.how, third: t2.third, lane: t2.lane });
      openPossession(m, log, team, t2.how);
      log.cur.start = t2.t;
      log.tentative = null;
    }
  } else log.tentative = null;
  // Wo ist der Angriff hingekommen?
  const cur = log.cur;
  if (cur && m.phase === 'play') {
    const z = zone(m, cur.team, ball.pos);
    if (z.adv > cur.maxAdv) cur.maxAdv = z.adv;
    if (!cur.entryLane && z.third === 'att') cur.entryLane = z.lane;
    if (z.adv > 0.7 && Math.abs(ball.pos.z) < m.pitch.halfWidth * 0.5) cur.box = true;
  }
  if (m.phase === 'play' && m.time >= log.nextSample) {
    log.nextSample = m.time + SAMPLE;
    log.samples.push(sample(m, cur?.team ?? null));
  }
}

function sample(m, poss) {
  const out = { t: m.time, half: m.half, poss, line: [0, 0], top: [0, 0], fwdGap: [0, 0], stamina: [0, 0], ballSide: [0, 1].map((t) => (m.ball.pos.z * attackDir(m, t)) / m.pitch.halfWidth), ballAdv: advance(m, 0, m.ball.pos) };
  for (let team = 0; team < 2; team++) {
    const mine = m.players.filter((p) => p.team === team && p.role !== 'gk');
    if (!mine.length) continue;
    const advs = mine.map((p) => advance(m, team, p.pos));
    out.line[team] = Math.min(...advs);
    out.top[team] = Math.max(...advs);
    out.stamina[team] = mine.reduce((s, p) => s + p.stamina, 0) / mine.length;
    // Die vorderste Spitze: wie weit weg ist der nächste Mitspieler?
    const front = mine[advs.indexOf(out.top[team])];
    const others = mine.filter((p) => p !== front);
    out.fwdGap[team] = others.length ? Math.min(...others.map((p) => dist2d(p.pos, front.pos))) / m.pitch.halfLength : 0;
  }
  return out;
}

// Einträge der letzten `secs` Spielsekunden.
export const since = (list, m, secs) => list.filter((e) => (e.t ?? e.start) >= m.time - secs);
