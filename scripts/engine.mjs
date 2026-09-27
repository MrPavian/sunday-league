// Vermessung der Match-Engine: pro Platz N Spiele (KI gegen KI) und Kennzahlen.
// node scripts/engine.mjs [spiele pro Platz] [dauer in s]
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
const N = +process.argv[2] || 12;
const DUR = process.argv[3] === 'auto' ? null : +process.argv[3] || 240; // 'auto' = Dauer je Platz
const rows = [];
for (const [id, pitch] of Object.entries(PITCHES).filter(([k]) => !process.argv[4] || process.argv[4].split(',').includes(k))) {
  const t = { goals: 0, shots: 0, onTarget: 0, saves: 0, fouls: 0, yellow: 0, red: 0, corners: 0, throwins: 0, goalkicks: 0, freekicks: 0, pens: 0, own: 0, draws00: 0, inj: 0, injOut: 0, short: 0, stall: 0, maxStall: 0, possDiff: 0, homeWins: 0, awayWins: 0, passes: 0, headers: 0, posts: 0, setTime: 0 };
  for (let seed = 1; seed <= N; seed++) {
    const m = createMatch({ seed: seed * 7 + id.length, pitch, human: false, duration: DUR ?? undefined });
    let still = 0;
    t.durSum = (t.durSum ?? 0) + m.duration;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      if (m.phase === 'setpiece') t.setTime += 1 / 60;
      const v = Math.hypot(m.ball.vel.x, m.ball.vel.z);
      if (m.phase === 'play' && v < 0.3 && !m.ball.owner) still += 1 / 60; else still = 0;
      if (still > 3) { t.stall += 1 / 60; t.maxStall = Math.max(t.maxStall, still); }
      for (const e of m.events) {
        if (e.type === 'shot') t.shots++;
        if (e.type === 'injury') { t.inj++; if (e.out) t.injOut++; }
        if (e.type === 'injury_off') t.short++;
        if (e.type === 'save' || e.type === 'catch') t.saves++;
        if (e.type === 'pass') t.passes++;
        if (e.type === 'header') t.headers++;
        if (e.type === 'post' || e.type === 'bar') t.posts++;
        if (e.type === 'goal' && e.ownGoal) t.own++;
        if (e.type === 'setpiece') {
          if (e.kind === 'corner') t.corners++;
          else if (e.kind === 'throwin') t.throwins++;
          else if (e.kind === 'goalkick') t.goalkicks++;
          else if (e.kind === 'freekick') t.freekicks++;
          else if (e.kind === 'penalty') t.pens++;
        }
      }
      m.events.length = 0;
    }
    const st = m.stats.teams;
    t.goals += m.score[0] + m.score[1];
    t.fouls += st[0].fouls + st[1].fouls;
    t.yellow += st[0].yellow + st[1].yellow;
    t.red += st[0].red + st[1].red;
    const p = st[0].possession + st[1].possession;
    t.possDiff += p ? Math.abs(st[0].possession - st[1].possession) / p : 0;
    if (m.score[0] === 0 && m.score[1] === 0) t.draws00++;
    if (m.score[0] > m.score[1]) t.homeWins++;
    if (m.score[1] > m.score[0]) t.awayWins++;
  }
  const r = (k, d = 1) => +(t[k] / N).toFixed(d);
  rows.push({ platz: id, tore: r('goals'), schuss: r('shots'), paraden: r('saves'), 'tor/schuss': +(t.goals / Math.max(1, t.shots)).toFixed(2), paesse: r('passes', 0), kopf: r('headers'), fouls: r('fouls'), gelb: r('yellow', 2), rot: r('red', 2), ecken: r('corners'), einwurf: r('throwins'), abstoss: r('goalkicks'), freist: r('freekicks'), elfer: r('pens', 2), eigentor: r('own', 2), pfosten: r('posts', 2), '0:0': t.draws00, verletzt: r('inj', 2), 'muss raus': r('injOut', 2), unterzahl: r('short', 2), 'H/A': `${t.homeWins}/${t.awayWins}`, 'Standard %': +((t.setTime / t.durSum) * 100).toFixed(0), dauer: t.durSum / N, 'Stillstand s': r('stall'), 'max still': +t.maxStall.toFixed(1), 'Ballbes.-Diff': +(t.possDiff / N).toFixed(2) });
}
console.table(rows);
