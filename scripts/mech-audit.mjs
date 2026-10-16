// Messung Spielmechanik und Ballphysik (ROADMAP 11.8), nur Messung, ändert nichts am Spiel.
//   node scripts/mech-audit.mjs phys                    – direkter Physiktest je Untergrund (Rollen, Abprall, Flug)
//   node scripts/mech-audit.mjs match <Platz> [Spiele]  – KI gegen KI (Voreinstellungsmannschaften), Seeds 900+i
// Ausgabe: je Aufruf eine JSON-Zeile. Hinweis: Die Spielzeit ist gerafft (HALF_BY_PITCH in match.js), die Physik läuft in
// Echtzeit (G = 9,81, Schritt 1/60 s). Zählwerte darum je Spiel UND je Spielsekunde ausgeben.
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES, STADIUM } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';
import { stepBall, createBall, BALL_RADIUS, ROLL_DRAG } from '../src/sim/ball.js';

const mode = process.argv[2] ?? 'phys';
const DT = 1 / 60;

// ---------- Physik ----------
if (mode === 'phys') {
  const field = (surface) => ({ surface, halfLength: 1e4, halfWidth: 1e4, wallX: 1e5, goalHalfWidth: 0, goalHeight: 0, goalType: 'open', boundary: 'walls' });
  const out = {};
  for (const [name, s] of Object.entries(SURFACES)) {
    const pitch = field(s);
    const r = { roll: {}, bounce: {}, flight: {} };
    // Rollen: flach (vy = 0) mit v0 abgeschossen.
    for (const v0 of [3.7, 6, 10, 15, 20, 25]) {
      const b = createBall();
      b.vel.x = v0;
      let t = 0, t5 = null, t10 = null, v5 = null, v10 = null;
      while (t < 60) {
        stepBall(b, pitch, DT);
        t += DT;
        if (t5 === null && b.pos.x >= 5) { t5 = t; v5 = b.vel.x; }
        if (t10 === null && b.pos.x >= 10) { t10 = t; v10 = b.vel.x; }
        if (b.vel.x === 0) break;
      }
      r.roll[v0] = { dist: +b.pos.x.toFixed(1), time: +t.toFixed(1), t5: t5 && +t5.toFixed(2), v5: v5 && +v5.toFixed(1), t10: t10 && +t10.toFixed(2), v10: v10 && +v10.toFixed(1), meanDecel: +(v0 / t).toFixed(2), initDecel: +(ROLL_DRAG * v0 * v0 + s.rollDecel).toFixed(2) };
    }
    // Abprall senkrecht: Fall aus 2 m (FIFA-Test), Verhältnis der Höhe.
    for (const h0 of [2, 4]) {
      const b = createBall();
      b.pos.y = h0 + BALL_RADIUS;
      let maxAfter = 0, hit = false, t = 0;
      while (t < 6) {
        const before = b.vel.y;
        stepBall(b, pitch, DT);
        t += DT;
        if (!hit && before < 0 && b.vel.y > 0) hit = true;
        if (hit) { maxAfter = Math.max(maxAfter, b.pos.y - BALL_RADIUS); if (b.vel.y < 0) break; }
      }
      r.bounce[h0] = { rebound: +maxAfter.toFixed(2), ratio: +(maxAfter / h0).toFixed(2) };
    }
    // Aufschlagen mit Anlauf (Pass mit vy): Weg bis Stillstand, Zahl der Abpraller (vy < -1).
    for (const [v0, vy] of [[10, 3.5], [16, 3.5], [20, 5]]) {
      const b = createBall();
      b.vel.x = v0; b.vel.y = vy;
      let t = 0, bounces = 0, first = null, prevVy = 0;
      while (t < 60) {
        prevVy = b.vel.y;
        stepBall(b, pitch, DT);
        t += DT;
        if (prevVy < -1 && b.vel.y > 0) { bounces++; first ??= b.pos.x; }
        if (b.vel.x === 0 && b.vel.y === 0) break;
      }
      r.flight[`${v0}/${vy}`] = { firstLand: first && +first.toFixed(1), bounces, dist: +b.pos.x.toFixed(1), time: +t.toFixed(1) };
    }
    out[name] = r;
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}

// ---------- Spiele ----------
const venue = process.argv[3] ?? 'rasenplatz';
const N = +process.argv[4] || 30;
const pitch = venue === 'stadion' ? STADIUM : PITCHES[venue];
const stat = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: xs.length, mean: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2), p10: +q(0.1).toFixed(2), p50: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), max: +s[s.length - 1].toFixed(2) };
};
const A = { games: 0, simSec: 0, goals: 0, ownGoals: 0, shots: 0, shotsOnGeo: 0, shotsOnGeoBeyond: 0, saves: 0, catches: 0, beaten: 0, headers: 0, passes: 0, passDone: 0, passLost: 0, passOut: 0, passUnres: 0, touches: 0, miscontrol: 0, whiff: 0, slide: 0, tackle: 0, poke: 0, pokeWon: 0, fouls: 0, outSide: 0, throwins: 0, corners: 0, goalkicks: 0, flips: 0, flipsQuick1: 0, flipsQuick2: 0, stillSec: 0, stuckEvents: 0, heldSec: 0, loftedPass: 0, lead: 0, airSec: 0, onEvt: 0, playSec: 0 };
const shotDist = [], onEvtDist = [];
const passSpeed = [], passLen = [], passArrive = [], passRatio = [], passSpeedLof = [], shotSpeed = [], shotVy = [], nnDist = [], nnRel = [], near5 = [], stillRuns = [], flightLen = [];
let longestStill = 0;

for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  A.games++;
  const area = 4 * pitch.halfLength * pitch.halfWidth;
  let shotPend = null; // letzter Schuss { t, d }, zählt als aufs Tor, wenn binnen 3 s Parade/Fangen/Tor folgt
  let pend = null; // offener Pass { team, kicker, t, v0, from }
  let lastTouch = m.ball.lastTouch, lastTouchTeam = null, lastFlipT = -99, prevSpeed = 0, still = 0, stuckFlag = false, sampleT = 0;
  const teamOf = (id) => m.players.find((q) => q.id === id)?.team ?? null;
  while (m.phase !== 'ended') {
    const speedBefore = Math.hypot(m.ball.vel.x, m.ball.vel.y, m.ball.vel.z);
    stepMatch(m, undefined, DT);
    const b = m.ball;
    const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
    const playing = m.phase === 'play';
    if (playing) {
      A.playSec += DT;
      if (b.pos.y > 0.4) A.airSec += DT;
      if (b.holder) A.heldSec += DT;
      if (!b.holder && sp < 0.15) {
        A.stillSec += DT;
        still += DT;
        if (still > 4 && !stuckFlag) { A.stuckEvents++; stuckFlag = true; }
      } else { if (still > 0) stillRuns.push(still); still = 0; stuckFlag = false; }
      longestStill = Math.max(longestStill, still);
    } else { still = 0; stuckFlag = false; }

    // Ballkontakt-Wechsel
    if (b.lastTouch !== lastTouch && b.lastTouch !== null) {
      const tm = teamOf(b.lastTouch);
      if (pend && b.lastTouch !== pend.kicker) {
        if (tm === pend.team) { A.passDone++; passArrive.push(speedBefore); passRatio.push(speedBefore / Math.max(0.1, pend.v0)); flightLen.push(m.time - pend.t); }
        else A.passLost++;
        pend = null;
      }
      if (tm !== null && lastTouchTeam !== null && tm !== lastTouchTeam) {
        A.flips++;
        if (m.time - lastFlipT < 1) A.flipsQuick1++;
        if (m.time - lastFlipT < 2) A.flipsQuick2++;
        lastFlipT = m.time;
      }
      if (tm !== null) lastTouchTeam = tm;
      lastTouch = b.lastTouch;
    }
    if (pend && m.time - pend.t > 6) { A.passUnres++; pend = null; }

    for (const e of m.events) {
      switch (e.type) {
        case 'pass': {
          A.passes++;
          const v0 = sp, p = m.players.find((q) => q.id === e.playerId);
          if (e.to && e.from) {
            const d = Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z);
            passLen.push(d);
          }
          (e.lofted ? passSpeedLof : passSpeed).push(v0);
          if (e.lofted) A.loftedPass++;
          if (e.through) A.lead++;
          pend = e.targetId ? { team: p?.team, kicker: e.playerId, t: m.time, v0 } : null;
          break;
        }
        case 'shot': {
          A.shots++;
          shotSpeed.push(sp);
          { const dd = Math.abs(b.pos.x - Math.sign(b.vel.x) * pitch.halfLength); shotDist.push(dd); shotPend = { t: m.time, d: dd }; }
          shotVy.push(b.vel.y);
          // Geometrisch aufs Tor? (ohne Luftwiderstand, Abpraller ignoriert)
          const gx = Math.sign(b.vel.x) * pitch.halfLength;
          const t = (gx - b.pos.x) / b.vel.x;
          if (t > 0) {
            const z = b.pos.z + b.vel.z * t, y = b.pos.y + b.vel.y * t - 4.905 * t * t;
            if (Math.abs(z) < pitch.goalHalfWidth && y > 0 && y < pitch.goalHeight) A.shotsOnGeo++;
          }
          if (Math.abs(b.pos.x - Math.sign(b.vel.x) * pitch.halfLength) > 0.45 * pitch.halfLength) A.shotsOnGeoBeyond++;
          break;
        }
        case 'header': A.headers++; break;
        case 'goal': if (shotPend && m.time - shotPend.t < 3) { A.onEvt++; onEvtDist.push(shotPend.d); shotPend = null; } A.goals++; if (e.ownGoal) A.ownGoals++; break;
        case 'save': A.saves++; if (shotPend && m.time - shotPend.t < 3) { A.onEvt++; onEvtDist.push(shotPend.d); shotPend = null; } break;
        case 'catch': A.catches++; if (shotPend && m.time - shotPend.t < 3) { A.onEvt++; onEvtDist.push(shotPend.d); shotPend = null; } break;
        case 'beaten': A.beaten++; break;
        case 'touch': A.touches++; break;
        case 'miscontrol': A.miscontrol++; break;
        case 'whiff': A.whiff++; break;
        case 'slide': A.slide++; break;
        case 'tackle': A.tackle++; break;
        case 'poke': A.poke++; break;
        case 'poke_won': A.pokeWon++; break;
        case 'foul': A.fouls++; break;
        case 'out':
          if (e.restart === 'throwin') A.throwins++; else if (e.restart === 'corner') A.corners++; else if (e.restart === 'goalkick') A.goalkicks++;
          if (pend) { A.passOut++; pend = null; }
          break;
        default:
      }
    }
    m.events.length = 0;

    // Gedränge alle 0,5 s: Abstand zum nächsten Mitspieler (Feldspieler)
    sampleT += DT;
    if (playing && sampleT >= 0.5) {
      sampleT = 0;
      const field = m.players.filter((q) => q.role !== 'gk' && q.state !== 'sent' && !q.sentOff);
      const per = field.filter((q) => q.team === 0).length || 1;
      const ref = Math.sqrt(area / Math.max(1, per)); // Platz je Spieler als Kantenlänge
      for (const q of field) {
        let best = 1e9;
        for (const o of field) if (o !== q && o.team === q.team) best = Math.min(best, Math.hypot(o.pos.x - q.pos.x, o.pos.z - q.pos.z));
        if (best < 1e9) { nnDist.push(best); nnRel.push(best / ref); }
      }
      let c = 0;
      for (const q of field) if (Math.hypot(q.pos.x - b.pos.x, q.pos.z - b.pos.z) < 5) c++;
      near5.push(c);
    }
    prevSpeed = sp;
  }
  A.simSec += m.time;
}
const per = (x) => +(x / N).toFixed(2);
const pct = (a, b) => (b ? +((100 * a) / b).toFixed(1) : 0);
const resolved = A.passDone + A.passLost + A.passOut;
console.log(JSON.stringify({
  venue, N, durationSec: matchDuration(pitch), simSecPerGame: +(A.simSec / N).toFixed(0), playSecPerGame: +(A.playSec / N).toFixed(0),
  perGame: { goals: per(A.goals), shots: per(A.shots), passes: per(A.passes), touches: per(A.touches), headers: per(A.headers), saves: per(A.saves), catches: per(A.catches), beaten: per(A.beaten), throwins: per(A.throwins), corners: per(A.corners), goalkicks: per(A.goalkicks), fouls: per(A.fouls), slides: per(A.slide), slidesWon: per(A.tackle), pokes: per(A.poke), pokesWon: per(A.pokeWon), whiffs: per(A.whiff), miscontrols: per(A.miscontrol), flips: per(A.flips), flipsUnder1s: per(A.flipsQuick1), flipsUnder2s: per(A.flipsQuick2), stuck4s: per(A.stuckEvents), stillSec: per(A.stillSec), heldSec: per(A.heldSec) },
  per90min: { goals: +(A.goals / N * 5400 / (A.simSec / N)).toFixed(2), shots: +(A.shots / N * 5400 / (A.simSec / N)).toFixed(1) },
  rates: { passCompletePct: pct(A.passDone, resolved), passIntercepted: pct(A.passLost, resolved), passOutPct: pct(A.passOut, resolved), passUnresolvedPct: pct(A.passUnres, A.passes), shotsOnTargetEvtPct: pct(A.onEvt, A.shots), shotsOnTargetGeoPct: pct(A.shotsOnGeo, A.shots), shotGoalPct: pct(A.goals - A.ownGoals, A.shots), saveOrCatchPerOnTarget: pct(A.saves + A.catches, A.shotsOnGeo), duelWinSlidePct: pct(A.tackle, A.slide), pokeWonPct: pct(A.pokeWon, A.poke), flipUnder1sPct: pct(A.flipsQuick1, A.flips), miscontrolPerTouchPct: pct(A.miscontrol, A.touches), airSharePct: pct(A.airSec, A.playSec), stillSharePct: pct(A.stillSec, A.playSec), loftedSharePct: pct(A.loftedPass, A.passes), throughSharePct: pct(A.lead, A.passes) },
  passSpeedFlat: stat(passSpeed), passSpeedLofted: stat(passSpeedLof), passLen: stat(passLen), passArriveSpeed: stat(passArrive), passArriveRatio: stat(passRatio), passFlightTime: stat(flightLen),
  shotSpeed: stat(shotSpeed), shotDist: stat(shotDist), onTargetShotDist: stat(onEvtDist), shotVy: stat(shotVy),
  nearestMate: stat(nnDist), nearestMateRel: stat(nnRel), playersWithin5mOfBall: stat(near5),
  stillRuns: stat(stillRuns), longestStill: +longestStill.toFixed(1),
}));
