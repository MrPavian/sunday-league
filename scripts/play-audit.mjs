// Spielverhalten der KI messen (Gameplay 2.0, Punkt 19): Pässe, Dribblings, Gewühle, Freilaufen. KI gegen KI, feste Seeds.
//   node scripts/play-audit.mjs <Platz> [Spiele=40] [Wurzel=.]
// Kennzahlen (je Platz, beide Teams zusammen):
//   passOk      – Anteil Pässe, die beim Mitspieler ankommen (nächster Ballkontakt eigenes Team; Aus zählt als verloren)
//   laneBad     – Anteil Pässe (flach, keine Flanke), bei denen beim Abspiel schon ein Gegner höchstens 1,3 m neben der Passlinie stand
//   laneBadOk   – Ankommquote genau dieser Pässe
//   betterOpen  – Anteil Pässe, bei denen ein freier Mitspieler mindestens 6 m weiter vorn stand als der Angespielte
//   carry       – mittlere Ballführzeit je Ballbesitz eines Spielers bis Abspiel/Schuss/Verlust (s); carryLong: Anteil über 3 s
//   lossDribble – Anteil der Einzelballbesitze, die mit Ballverlust am Fuß enden (Gegner nimmt ihn ab, ohne Pass/Schuss)
//   lossOpen    – Anteil dieser Ballverluste, bei denen in dem Moment ein Mitspieler frei anspielbar war
//   crowd       – mittlere Zahl Feldspieler (beide Teams) im Umkreis 6 m um den Ball; crowdHeavy: Anteil Proben mit ≥ 6
//   openAhead   – mittlere Zahl freier Mitspieler vor dem Ballführenden (kein Gegner im Umkreis 3 m, Linie frei, ≤ 25 m)
//   passPerPoss – Pässe je Mannschaftsballbesitz; possSec: mittlere Dauer eines Mannschaftsballbesitzes (s)
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const venue = process.argv[2] ?? 'rasenplatz';
const N = +process.argv[3] || 40;
const root = resolve(process.argv[4] ?? '.');
const load = (p) => import(pathToFileURL(`${root}/${p}`).href);
const { createMatch, matchDuration, stepMatch } = await load('src/sim/match.js');
const { PITCHES, STADIUM } = await load('src/sim/pitch.js');
const { generateTeam } = await load('src/sim/generator.js');
const { normalizeTactic, systemFormation } = await load('src/sim/tactics.js');
const { TEAM_PRESETS } = await load('src/data/teams.js');
const { createRng } = await load('src/core/rng.js');
// Schalter für Vorher/Nachher-Vergleiche: OFF=PASS_SAFETY,… schaltet die genannten Neuerungen ab.
const mods = [await load('src/sim/actions.js'), await load('src/sim/ai.js'), await load('src/sim/ball.js'), await load('src/sim/ground.js')];
// SET=INERTIA.acc=8,ANTICIPATE.react=0.3 setzt einzelne Werte (nur Zahlen).
for (const kv of (process.env.SET ?? '').split(',').filter(Boolean)) { const [path, v] = kv.split('='); const [k, f] = path.split('.'); const o = mods.map((x) => x[k]).find(Boolean); if (!o || !(f in o)) throw new Error(`unbekannter Wert ${path}`); o[f] = +v; }
for (const k of (process.env.OFF ?? '').split(',').filter(Boolean)) { const o = mods.map((x) => x[k]).find(Boolean); if (o && 'on' in o) o.on = false; else throw new Error(`unbekannter Schalter ${k}`); }

const pitch = venue === 'stadion' ? STADIUM : PITCHES[venue];
const BENCH_ROLES = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const STRONG = { ok: 0.12, gut: 0.36, stark: 0.36, dorfstar: 0.13, superstar: 0.03 };
const teamFor = (rng, slot) => {
  const format = pitch.format ?? 5;
  const plan = normalizeTactic(TEAM_PRESETS[slot].tactic, format);
  const roles = [...systemFormation(format, plan.system).map((f) => f.role), ...(BENCH_ROLES[format] ?? [])];
  return generateTeam(rng, TEAM_PRESETS[slot], roles, { tierWeights: STRONG });
};
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const segDist = (p, a, b) => {
  const vx = b.x - a.x, vz = b.z - a.z, L = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / L));
  return Math.hypot(p.x - a.x - vx * t, p.z - a.z - vz * t);
};
const attack = (m, team) => (m.attackDir ? m.attackDir(team) : null);
// Angriffsrichtung aus dem Torwart: Er steht vor dem eigenen Tor, angegriffen wird in die Gegenrichtung.
const dirOf = (m, team) => {
  const gk = m.players.find((p) => p.team === team && p.role === 'gk');
  if (gk) return gk.pos.x < 0 ? 1 : -1;
  const xs = m.players.filter((p) => p.team === team).map((p) => p.pos.x);
  return xs.reduce((s, x) => s + x, 0) / xs.length < 0 ? 1 : -1;
};
const openMates = (m, c) => {
  const s = dirOf(m, c.team);
  return m.players.filter((t) => t.team === c.team && t !== c && t.role !== 'gk' && t.state === 'normal' && d2(t.pos, c.pos) <= 25
    && !m.players.some((o) => o.team !== c.team && o.state === 'normal' && (d2(o.pos, t.pos) < 3 || segDist(o.pos, c.pos, t.pos) < 1.3))).map((t) => ({ t, gain: (t.pos.x - c.pos.x) * s }));
};

const z = { goals: 0, shots: 0, passes: 0, passOk: 0, laneBad: 0, laneBadOk: 0, betterOpen: 0, carries: 0, carryT: 0, carryLong: 0, lossDribble: 0, lossOpen: 0, crowdSum: 0, crowdHeavy: 0, samples: 0, openAheadSum: 0, openSamples: 0, poss: 0, possT: 0, possPasses: 0 };
void attack;
for (let i = 0; i < N; i++) {
  const rng = createRng(5000 + i);
  const teams = [teamFor(rng, 0), teamFor(rng, 1)];
  const m = createMatch({ seed: 900 + i, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  let pend = null; // offener Pass
  let cur = null; // { id, team, t0, ended }
  let poss = null; // { team, t0, passes }
  let nextSample = 0;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    const ball = m.ball;
    const live = m.phase === 'play' && !(m.setPiece && !m.setPiece.taken);
    for (const e of m.events) {
      if (e.type === 'pass' && !e.longThrow) {
        const p = m.players.find((q) => q.id === e.playerId);
        const tg = e.targetId ? m.players.find((q) => q.id === e.targetId) : null;
        if (p && tg && e.to) {
          const lane = !e.lofted && !e.cross && m.players.some((o) => o.team !== p.team && o.state === 'normal' && d2(o.pos, p.pos) > 1 && segDist(o.pos, e.from, e.to) < 1.3);
          const s = dirOf(m, p.team);
          const gain = (e.to.x - e.from.x) * s;
          const better = openMates(m, p).some((o) => o.t !== tg && o.gain > gain + 6);
          pend = { team: p.team, from: p.id, lane, t: m.time };
          z.passes++;
          if (lane) z.laneBad++;
          if (better) z.betterOpen++;
        }
        if (cur && cur.id === e.playerId) { cur.ended = 'pass'; cur.tEnd ??= m.time; }
        if (poss) poss.passes++;
      }
      if ((e.type === 'shot' || (e.type === 'header' && e.onGoal)) && cur && cur.id === e.playerId) { cur.ended = 'shot'; cur.tEnd ??= m.time; }
      if (e.type === 'goal') z.goals++;
      if (e.type === 'shot') z.shots++;
      if (e.type === 'out' && pend) pend = null; // Aus: Pass verloren (nicht als ok gezählt)
    }
    m.events.length = 0;
    const t = ball.lastTouch;
    const toucher = t ? m.players.find((q) => q.id === t) : null;
    if (toucher && pend && toucher.id !== pend.from) {
      if (toucher.team === pend.team) { z.passOk++; if (pend.lane) z.laneBadOk++; }
      pend = null;
    }
    // Einzelballbesitz (Ballführen) eines Spielers
    if (toucher && toucher.role !== 'gk' && (!cur || cur.id !== toucher.id)) {
      if (cur) {
        const dt = (cur.tEnd ?? m.time) - cur.t0; // bis zum Abspiel/Schuss, ohne Flugzeit des Balls
        z.carries++; z.carryT += dt; if (dt > 3) z.carryLong++;
        if (!cur.ended && toucher.team !== cur.team && cur.lastDribble) { z.lossDribble++; if (cur.openAtLoss) z.lossOpen++; }
      }
      cur = { id: toucher.id, team: toucher.team, t0: m.time, ended: null, lastDribble: false };
    }
    if (cur && toucher && toucher.id === cur.id && ball.lastAction === 'dribble' && live) {
      cur.lastDribble = true;
      if (Math.round(m.time * 60) % 6 === 0) cur.openAtLoss = openMates(m, toucher).some((o) => o.gain > -2);
    }
    // Mannschaftsballbesitz
    if (toucher && live && (!poss || poss.team !== toucher.team)) {
      if (poss) { z.poss++; z.possT += m.time - poss.t0; z.possPasses += poss.passes; }
      poss = { team: toucher.team, t0: m.time, passes: 0 };
    }
    if (live && m.time >= nextSample) {
      nextSample = m.time + 0.5;
      const near = m.players.filter((p) => p.role !== 'gk' && p.state === 'normal' && d2(p.pos, ball.pos) < 6).length;
      z.crowdSum += near; z.samples++; if (near >= 6) z.crowdHeavy++;
      if (toucher && toucher.role !== 'gk' && ball.lastAction === 'dribble' && d2(toucher.pos, ball.pos) < 1.5) {
        z.openAheadSum += openMates(m, toucher).filter((o) => o.gain > 2).length; z.openSamples++;
      }
    }
  }
}
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
console.log(JSON.stringify({ venue, N, off: process.env.OFF ?? '', set: process.env.SET ?? '', goals: +(z.goals / N).toFixed(2), shots: +(z.shots / N).toFixed(1), passesPerGame: +(z.passes / N).toFixed(1), passOk: pct(z.passOk, z.passes), laneBad: pct(z.laneBad, z.passes), laneBadOk: pct(z.laneBadOk, z.laneBad), betterOpen: pct(z.betterOpen, z.passes), carry: +(z.carryT / z.carries).toFixed(2), carryLong: pct(z.carryLong, z.carries), lossDribble: pct(z.lossDribble, z.carries), lossOpen: pct(z.lossOpen, z.lossDribble), crowd: +(z.crowdSum / z.samples).toFixed(2), crowdHeavy: pct(z.crowdHeavy, z.samples), openAhead: +(z.openAheadSum / z.openSamples).toFixed(2), changes: +(z.poss / N).toFixed(1), passPerPoss: +(z.possPasses / z.poss).toFixed(2), possSec: +(z.possT / z.poss).toFixed(1) }));
