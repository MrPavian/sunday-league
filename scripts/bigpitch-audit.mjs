// Messung „Großfeld wirkt zu lang“ (ROADMAP 11.10 Spielfeld). Nur Messung, ändert nichts am Spiel.
//   node scripts/bigpitch-audit.mjs <Platz> [Spiele]   – KI gegen KI (Voreinstellungsmannschaften), Seeds 900+i
// Ausgabe: eine JSON-Zeile je Aufruf. Plätze: hinterhof parkplatz park ascheplatz rasenplatz sportplatz grossfeld halle
//   node scripts/bigpitch-audit.mjs cam            – nur Kamera (sichtbarer Ausschnitt je Platz und Bildformat, ohne Spiel)
// Gemessen werden in einem Lauf:
//   cam     – Kamera folgt dem Ball wie im Spiel (CameraRig.follow); Anteil Feldspieler im Bild, Ball im Bild, Platz voraus
//   speed   – Laufgeschwindigkeit der Feldspieler (Histogramm), mit und ohne Ball, Spitzenwerte je Spieler und Spiel
//   build   – Ballgewinne in der eigenen Hälfte: Zeit bis letztes Drittel / bis Schuss; Passrichtung, Passlänge
//   keeper  – Torwart-Tiefe (Abstand zur Torlinie) bei gegnerischen Angriffen und im Eins-gegen-eins, Ausgang
//   kpi     – Tore, Schüsse, Tore/Schuss, Paraden, Ballbesitzwechsel je Spiel
import * as THREE from 'three';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { CameraRig } from '../src/render/CameraRig.js';
import { cameraViewHeight } from '../src/render/quality.js';
import { distToSegment } from '../src/sim/players.js';

// Wunschhöhe der Kamera je Spielort (render/venues/*.js, Rückgabe von build*) und Rand für das Folgen.
export const VENUE_CAM = {
  hinterhof: { vh: 11, bx: 12.3 + 3.5, bz: 1.5 },
  parkplatz: { vh: 12.5, bx: 20.4 + 3, bz: 3 },
  park: { vh: 12.5, bx: 17 + 4, bz: 3.5 },
  ascheplatz: { vh: 13, bx: 20 + 4, bz: 3.5 },
  rasenplatz: { vh: 15, bx: 26 + 5.5, bz: 4.5 },
  sportplatz: { vh: 15, bx: 35 + 5.5, bz: 4.5 },
  grossfeld: { vh: 19, vhPortrait: 16, lead: 0.4, bx: 52.5 + 5.5, bz: 12 }, // Stand nach der Änderung; vorher vh 15, lead 0
  halle: { vh: 12, bx: 18 + 4, bz: 2.5 },
};
const ASPECTS = { desktop: [16, 9], handyQuer: [20, 9], handyHoch: [9, 19.5] };

function makeRig(venue, key, pitch) {
  const cfg = overrideCam?.[venue] ?? VENUE_CAM[venue];
  const rig = new CameraRig();
  rig.viewHeight = cameraViewHeight(cfg.vh);
  rig.depth = pitch.halfWidth;
  rig.viewHeightPortrait = cfg.vhPortrait ? cameraViewHeight(cfg.vhPortrait) : null;
  const [a, b] = ASPECTS[key];
  rig.resize(Math.round(360 * a / b), 360);
  rig.bounds = { x: cfg.bx, z: cfg.bz };
  rig.cfg = cfg;
  return rig;
}
const overrideCam = null;

const footprint = (rig) => {
  const c = rig.camera;
  const tilt = rig.offset.y / rig.offset.length();
  return { w: c.right - c.left, depth: (c.top - c.bottom) / tilt, cx: rig.target.x + (c.left + c.right) / 2, cz: rig.target.z - (c.top + c.bottom) / 2 / tilt };
};

const DT = 1 / 60;
const mode = process.argv[2] ?? 'grossfeld';

if (mode === 'cam') {
  const out = {};
  for (const [venue, pitch] of Object.entries(PITCHES)) {
    out[venue] = { len: 2 * pitch.halfLength, wid: 2 * pitch.halfWidth };
    for (const key of Object.keys(ASPECTS)) {
      const rig = makeRig(venue, key, pitch);
      rig.follow(0, 0, 1, rig.bounds);
      const f = footprint(rig);
      out[venue][key] = { sichtbarX: +f.w.toFixed(1), sichtbarTiefe: +f.depth.toFixed(1), anteilLaenge: +(f.w / (2 * pitch.halfLength)).toFixed(2), anteilBreite: +Math.min(1, f.depth / (2 * pitch.halfWidth)).toFixed(2), mittellinieBisStrafraum36: +Math.min(1, f.w / 36).toFixed(2) };
    }
    out[venue].viewHeightRoh = rig0(venue);
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}
function rig0(v) { return +cameraViewHeight((overrideCam?.[v] ?? VENUE_CAM[v]).vh).toFixed(2); }

const venue = mode;
const N = +process.argv[3] || 30;
const pitch = PITCHES[venue];
if (!pitch) throw new Error(`Platz ${venue}?`);
if (process.env.SWEEP && pitch.keeperSweep) pitch.keeperSweep = { ...pitch.keeperSweep, ...JSON.parse(process.env.SWEEP) }; // Ablationen, nur Messung
const hl = pitch.halfLength;
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); };
const mean = (arr) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null);
const hist = () => new Float64Array(160); // 0,1-m/s-Klassen bis 16
const hq = (h, p) => { const tot = h.reduce((a, b) => a + b, 0); let acc = 0; for (let i = 0; i < h.length; i++) { acc += h[i]; if (acc >= p * tot) return +((i + 0.5) / 10).toFixed(1); } return null; };
const hshare = (h, v) => { const tot = h.reduce((a, b) => a + b, 0); let s = 0; for (let i = Math.round(v * 10); i < h.length; i++) s += h[i]; return tot ? +(100 * s / tot).toFixed(1) : 0; };

let fieldN = 1;
const C = { games: 0, goals: 0, ownGoals: 0, shots: 0, saves: 0, catches: 0, beaten: 0, flips: 0, passes: 0 };
const camAcc = Object.fromEntries(Object.keys(ASPECTS).map((k) => [k, { n: 0, playersIn: 0, ballIn: 0, ahead: [], aheadEdge: [], fieldPlayersIn: [] }]));
const spdAll = hist(), spdBall = hist(), spdFree = hist();
const peaks = [], distPerGame = [], simSec = [];
const passLen = [], passSpd = [], dirCnt = { fwd: 0, lat: 0, back: 0 };
const spells = { own: 0, third: 0, shot: 0, tThird: [], tShot: [], passesThird: [], gain_u: [] };
const keep = { atkSec: 0, depth: [], out15: 0, out4: 0, shotDepth: [], shotDepthOpp: [], oneOnOne: [], goalsLob: 0, shotsOpp: 0, outEpisodes: 0 };

for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  C.games++;
  const rigs = Object.fromEntries(Object.keys(ASPECTS).map((k) => [k, makeRig(venue, k, pitch)]));
  const field = m.players.filter((p) => p.role !== 'gk');
  fieldN = field.length;
  const peak = new Map(field.map((p) => [p.id, 0]));
  const dist = new Map(field.map((p) => [p.id, 0]));
  let lastTeam = null, spell = null, lastFlip = -9, ep = null, epGap = 99;
  let pendShot = null;
  const teamOf = (id) => m.players.find((p) => p.id === id)?.team ?? null;

  while (m.phase !== 'ended') {
    stepMatch(m, undefined, DT);
    const b = m.ball;
    const play = m.phase === 'play';

    // ---- Kamera
    if (play) {
      for (const [k, rig] of Object.entries(rigs)) {
        const tt = b.lastTouch ? teamOf(b.lastTouch) : null;
        rig.follow(b.pos.x, b.pos.z, DT, rig.bounds, tt !== null ? attackDir(m, tt) : 0, rig.cfg.lead ?? 0, b.vel.x);
        const f = footprint(rig);
        const a = camAcc[k];
        a.n++;
        const inView = (x, z) => Math.abs(x - f.cx) <= f.w / 2 && Math.abs(z - f.cz) <= f.depth / 2;
        let cnt = 0;
        for (const p of field) if (p.state !== 'sent' && !p.sentOff && inView(p.pos.x, p.pos.z)) cnt++;
        a.fieldPlayersIn.push(cnt);
        if (inView(b.pos.x, b.pos.z)) a.ballIn++;
        if (a.n % 30 === 0) { // alle 0,5 s: Platz voraus in Spielrichtung des Ballbesitzers
          const tm = b.lastTouch ? teamOf(b.lastTouch) : null;
          if (tm !== null) { const s = attackDir(m, tm); a.aheadEdge.push((f.cx + s * f.w / 2 - b.pos.x) * s); }
        }
      }
    }

    // ---- Laufgeschwindigkeit
    if (play) {
      for (const p of field) {
        if (p.state === 'sent' || p.sentOff) continue;
        const v = Math.hypot(p.vel.x, p.vel.z);
        const bin = Math.min(159, Math.floor(v * 10));
        spdAll[bin]++;
        const carrying = b.holder === p.id || (b.lastTouch === p.id && b.lastAction === 'dribble' && Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 1.5);
        (carrying ? spdBall : spdFree)[bin]++;
        peak.set(p.id, Math.max(peak.get(p.id), v));
        dist.set(p.id, dist.get(p.id) + v * DT);
      }
    }

    // ---- Ballgewinn / Aufbau
    const tmNow = b.lastTouch ? teamOf(b.lastTouch) : null;
    if (play && tmNow !== null && tmNow !== lastTeam) {
      if (lastTeam !== null) {
        C.flips++;
        // alter Spell endet, neuer beginnt
        const s = attackDir(m, tmNow);
        const u = s * b.pos.x;
        if (u < 0) { spells.own++; spell = { team: tmNow, t0: m.time, third: false, shot: false, passes: 0 }; } else spell = null;
      }
      lastTeam = tmNow;
    }
    if (!play) { spell = null; }
    if (spell) {
      const s = attackDir(m, spell.team);
      if (!spell.third && s * b.pos.x > hl / 3) { spell.third = true; spells.third++; spells.tThird.push(m.time - spell.t0); spells.passesThird.push(spell.passes); }
    }

    // ---- Torwart bei gegnerischen Angriffen
    if (play) {
      for (const k of m.players) {
        if (k.role !== 'gk' || k.state !== 'normal') continue;
        const s = attackDir(m, k.team);
        const goalX = -s * hl;
        const dBallGoal = Math.abs(b.pos.x - goalX);
        const oppHas = tmNow !== null && tmNow !== k.team;
        const kd = Math.abs(k.pos.x - goalX);
        if (oppHas && dBallGoal < Math.min(30, hl * 1.2)) {
          keep.atkSec += DT;
          keep.depth.push(kd);
          if (kd > 1.5) keep.out15 += DT;
          if (kd > 4) keep.out4 += DT;
        }
        // Eins-gegen-eins: Gegner mit Ball am Fuß, innerhalb 25 m, kein Verteidiger torseitig im Streifen
        const car = b.lastTouch ? m.players.find((p) => p.id === b.lastTouch) : null;
        const isDuel = car && car.team !== k.team && b.lastAction === 'dribble' && b.pos.y < 0.6 && Math.hypot(car.pos.x - b.pos.x, car.pos.z - b.pos.z) < 1.3 && dBallGoal < 25;
        const covered = isDuel && m.players.some((o) => o.team === k.team && o.role !== 'gk' && o.state === 'normal' && Math.abs(o.pos.x - goalX) < dBallGoal + 1 && Math.abs(o.pos.z - b.pos.z) < 7);
        if (isDuel && !covered) {
          if (!ep || m.time - ep.last > 2) { ep = { t0: m.time, last: m.time, maxDepth: 0, carrier: car.id, depthAtShot: null, shot: false, res: null, dMin: 99, shooterD: null }; keep.oneOnOne.push(ep); }
          ep.last = m.time;
          ep.maxDepth = Math.max(ep.maxDepth, kd);
          ep.dMin = Math.min(ep.dMin, Math.hypot(k.pos.x - b.pos.x, k.pos.z - b.pos.z));
        }
      }
    }

    // ---- Ereignisse
    for (const e of m.events) {
      if (e.type === 'pass') {
        C.passes++;
        const pl = m.players.find((p) => p.id === e.playerId);
        if (spell && pl?.team === spell.team) spell.passes++;
        if (e.to && e.from) passLen.push(Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z));
        const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
        passSpd.push(sp);
        const s = attackDir(m, pl?.team ?? 0);
        const cos = (b.vel.x * s) / Math.max(0.01, Math.hypot(b.vel.x, b.vel.z));
        if (cos > 0.707) dirCnt.fwd++; else if (cos < -0.707) dirCnt.back++; else dirCnt.lat++;
      } else if (e.type === 'shot') {
        C.shots++;
        const pl = m.players.find((p) => p.id === e.playerId);
        if (spell && pl?.team === spell.team && !spell.shot) { spell.shot = true; spells.shot++; spells.tShot.push(m.time - spell.t0); }
        const gk = m.players.find((p) => p.role === 'gk' && p.team !== pl?.team);
        if (gk) {
          const goalX = Math.sign(b.vel.x) * hl;
          const kd = Math.abs(gk.pos.x - goalX);
          keep.shotDepthOpp.push(kd);
          keep.shotsOpp++;
          pendShot = { t: m.time, kd, vy: b.vel.y };
          if (ep && m.time - ep.last < 1.5 && ep.carrier === e.playerId) { ep.shot = true; ep.depthAtShot = kd; ep.shooterD = Math.abs(b.pos.x - goalX); ep.vy = b.vel.y; }
        }
      } else if (e.type === 'goal') {
        C.goals++; if (e.ownGoal) C.ownGoals++;
        if (pendShot && m.time - pendShot.t < 3) { if (ep && ep.shot && !ep.res) ep.res = 'tor'; if (pendShot.vy > 2.5 && pendShot.kd > 2) keep.goalsLob++; }
      } else if (e.type === 'save') { C.saves++; if (ep && ep.shot && !ep.res) ep.res = 'parade'; }
      else if (e.type === 'catch') { C.catches++; if (ep && ep.shot && !ep.res) ep.res = 'gefangen'; }
      else if (e.type === 'beaten') C.beaten++;
    }
    m.events.length = 0;
  }
  simSec.push(m.time);
  for (const v of peak.values()) peaks.push(v);
  for (const v of dist.values()) distPerGame.push(v);
  for (const [k, rig] of Object.entries(rigs)) void rig;
}

const camOut = {};
for (const [k, a] of Object.entries(camAcc)) {
  const rig = makeRig(venue, k, pitch); rig.follow(0, 0, 1, rig.bounds);
  const f = footprint(rig);
  camOut[k] = { sichtbarX_m: +f.w.toFixed(1), sichtbarTiefe_m: +f.depth.toFixed(1), anteilFeldspielerImBild: +(mean(a.fieldPlayersIn) / fieldN).toFixed(2), feldspielerImBild: mean(a.fieldPlayersIn), ballImBildPct: +(100 * a.ballIn / a.n).toFixed(1), platzVorausBallbesitz_m: { p10: q(a.aheadEdge, 0.1), p50: q(a.aheadEdge, 0.5), mean: mean(a.aheadEdge) } };
}
const tot = Math.max(1, spdAll.reduce((a, b) => a + b, 0));
let sumV = 0; for (let i = 0; i < 160; i++) sumV += spdAll[i] * (i + 0.5) / 10;
const simT = simSec.reduce((a, b) => a + b, 0) / N;
const dirTot = dirCnt.fwd + dirCnt.lat + dirCnt.back || 1;
const fin = (v, f = 1) => +(v).toFixed(f);
const oo = keep.oneOnOne;
console.log(JSON.stringify({
  venue, N, durationSec: matchDuration(pitch), cam: camOut,
  speed: {
    meanAll: fin(sumV / tot, 2), p50: hq(spdAll, 0.5), p90: hq(spdAll, 0.9), p99: hq(spdAll, 0.99), shareOver5_5pct: hshare(spdAll, 5.5), shareOver7pct: hshare(spdAll, 7),
    withBall: { p50: hq(spdBall, 0.5), p90: hq(spdBall, 0.9), p99: hq(spdBall, 0.99), share: fin(100 * spdBall.reduce((a, b) => a + b, 0) / tot, 1) },
    withoutBall: { p50: hq(spdFree, 0.5), p90: hq(spdFree, 0.9), p99: hq(spdFree, 0.99) },
    peakPerPlayerGame: { mean: mean(peaks), p10: q(peaks, 0.1), p90: q(peaks, 0.9), max: q(peaks, 1) },
    distPerPlayerGame_m: mean(distPerGame), distKmPer90minEquivalent: fin(mean(distPerGame) / simT * 5400 / 1000, 1),
  },
  build: {
    spellsOwnHalfPerGame: fin(spells.own / N), reachThirdPct: fin(100 * spells.third / Math.max(1, spells.own)), reachShotPct: fin(100 * spells.shot / Math.max(1, spells.own)),
    tThird_s: { p10: q(spells.tThird, 0.1), p50: q(spells.tThird, 0.5), p90: q(spells.tThird, 0.9), mean: mean(spells.tThird) }, tShot_s: { p50: q(spells.tShot, 0.5), mean: mean(spells.tShot) }, passesBeforeThird: mean(spells.passesThird),
    passDir: { fwdPct: fin(100 * dirCnt.fwd / dirTot), latPct: fin(100 * dirCnt.lat / dirTot), backPct: fin(100 * dirCnt.back / dirTot) },
    passLen_m: { mean: mean(passLen), p50: q(passLen, 0.5), p90: q(passLen, 0.9) }, ballSpeedAtPass_ms: { mean: mean(passSpd), p50: q(passSpd, 0.5), p90: q(passSpd, 0.9) },
  },
  keeper: {
    angriffSecPerGame: fin(keep.atkSec / N), depth_m: { mean: mean(keep.depth), p50: q(keep.depth, 0.5), p90: q(keep.depth, 0.9), p99: q(keep.depth, 0.99), max: q(keep.depth, 1) },
    shareOver1_5mPct: fin(100 * keep.out15 / Math.max(1e-9, keep.atkSec)), shareOver4mPct: fin(100 * keep.out4 / Math.max(1e-9, keep.atkSec)),
    depthAtShot_m: { mean: mean(keep.shotDepthOpp), p90: q(keep.shotDepthOpp, 0.9) },
    oneOnOne: { perGame: fin(oo.length / N, 2), shotPct: fin(100 * oo.filter((x) => x.shot).length / Math.max(1, oo.length)), maxDepth_m: { mean: mean(oo.map((x) => x.maxDepth)), p90: q(oo.map((x) => x.maxDepth), 0.9) }, depthAtShot_m: mean(oo.filter((x) => x.shot).map((x) => x.depthAtShot)), shooterDistAtShot_m: mean(oo.filter((x) => x.shot).map((x) => x.shooterD)), goalPct: fin(100 * oo.filter((x) => x.res === 'tor').length / Math.max(1, oo.filter((x) => x.shot).length)), saveCatchPct: fin(100 * oo.filter((x) => x.res === 'parade' || x.res === 'gefangen').length / Math.max(1, oo.filter((x) => x.shot).length)) },
    lobGoalsPerGame: fin(keep.goalsLob / N, 2),
  },
  kpi: { goals: fin(C.goals / N, 2), shots: fin(C.shots / N, 2), goalsPerShotPct: fin(100 * (C.goals - C.ownGoals) / Math.max(1, C.shots), 1), saves: fin(C.saves / N, 2), catches: fin(C.catches / N, 2), beaten: fin(C.beaten / N, 2), flips: fin(C.flips / N, 1), passes: fin(C.passes / N, 1) },
}));
