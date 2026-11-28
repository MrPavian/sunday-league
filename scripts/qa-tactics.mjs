// Balancing & Simulation QA, Phase 4 (docs/BALANCING-QA-AUFTRAG.md): Systeme und Spielphilosophien. Nur Messung, ändert keinen
// Spielcode. Grundkader wie scripts/qa-attr-exp.mjs (angehoben auf ein Niveau), beide Mannschaften aus demselben Kader.
// Je Spiel ziehen beide Mannschaften unabhängig ein System (sim/tactics.js SYSTEMS des Formats) und eine Spielweise (APPROACHES);
// Mannschaft 0 bekommt zusätzlich einen Stärkeunterschied d (gleichverteilt ±DSPAN auf alle Spielwerte außer Spielintelligenz),
// damit sich prüfen lässt, ob Außenseiter durch Taktik gewinnen. KI-Trainer aus (aiCoach: false): gemessen wird die gewählte
// Taktik, nicht der Wechsel während des Spiels.
//   node scripts/qa-tactics.mjs run <Platz> <Niveau> <Spiele> <Start> > teil.json
//   node scripts/qa-tactics.mjs sum a.json b.json …
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { createChanceLog, feedChances } from '../src/sim/chances.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { MIND_SET } from '../src/sim/mind.js';
import { lifted } from '../src/sim/niveau.js';
import { PITCHES } from '../src/sim/pitch.js';
import { normalizeTactic, systemFormation, systemsFor } from '../src/sim/tactics.js';

// Spielphilosophien des Auftrags → Spielstile (sim/tactics.js STYLES) bzw. Befehle (sim/plan.js ORDER_EFFECTS) auf „ausgewogen“.
const APPROACHES = {
  ausgewogen: { style: 'ausgewogen' },
  ballbesitz: { style: 'kurzpass' },
  pressing: { style: 'pressing' },
  tief: { style: 'mauern' },
  konter: { style: 'konter' },
  direkt: { style: 'ausgewogen', orders: { build: 'direkt' } },
  fluegel: { style: 'fluegel' },
  zentrum: { style: 'ausgewogen', orders: { route: 'mitte' } },
  offensiv: { style: 'offensiv' },
};
const AP = Object.keys(APPROACHES);
const DSPAN = 0.15;
const AFTER = 8; // s, wie scripts/qa-mind-diag.mjs

const [mode, pitchId, nivArg, nArg, fromArg] = process.argv.slice(2);

function invert(A) {
  const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const dv = M[c][c];
    for (let j = 0; j < 2 * n; j++) M[c][j] /= dv;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(n));
}
function ols(X, y) {
  const k = X[0].length, XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  X.forEach((x, i) => { for (let a = 0; a < k; a++) { Xty[a] += x[a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += x[a] * x[b]; } });
  const inv = invert(XtX), b = inv.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
  const s2 = X.reduce((s, x, i) => s + (y[i] - x.reduce((t, v, j) => t + v * b[j], 0)) ** 2, 0) / (X.length - k);
  return { b, se: inv.map((r, i) => Math.sqrt(r[i] * s2)) };
}

if (mode === 'sum') {
  const parts = process.argv.slice(3).map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const rows = parts.flatMap((p) => p.rows);
  const SY = parts[0].systems;
  // 1) Haupteffekte: gd = c + β·d + Σ System (Heim − Gast) + Σ Spielweise (Heim − Gast); Bezug 1. System, „ausgewogen“.
  const X = rows.map((r) => [1, r.d, ...SY.slice(1).map((s) => (r.sys[0] === s) - (r.sys[1] === s)), ...AP.slice(1).map((a) => (r.ap[0] === a) - (r.ap[1] === a))]);
  const main = ols(X, rows.map((r) => r.gd));
  const beta = main.b[1];
  const eff = (i) => [+main.b[i].toFixed(3), +main.se[i].toFixed(3)];
  const sysEff = Object.fromEntries(SY.map((s, i) => [s, i ? eff(1 + i) : [0, 0]]));
  const apEff = Object.fromEntries(AP.map((a, i) => [a, i ? eff(1 + SY.length - 1 + i) : [0, 0]]));
  // 2) Spielweise gegen Spielweise: Tordifferenz aus Sicht von A, um den Stärkeunterschied bereinigt (β aus 1).
  const cell = {};
  for (const r of rows) for (const [t, sgn] of [[0, 1], [1, -1]]) {
    const k = `${r.ap[t]}|${r.ap[1 - t]}`;
    (cell[k] ??= []).push(sgn * (r.gd - beta * r.d));
  }
  const stat = (v) => { const mu = v.reduce((s, x) => s + x, 0) / v.length; return [+mu.toFixed(3), +(Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, v.length - 1)) / Math.sqrt(v.length)).toFixed(3), v.length]; };
  const matrix = Object.fromEntries(AP.map((a) => [a, Object.fromEntries(AP.map((b) => [b, cell[`${a}|${b}`] ? stat(cell[`${a}|${b}`]) : null]))]));
  // 3) Außenseiter (|d| ≥ 0,08): bereinigte Tordifferenz des Schwächeren je Spielweise, und Stärke-Steigung je Spielweise.
  const dog = {};
  for (const r of rows.filter((x) => Math.abs(x.d) >= 0.08)) { const t = r.d < 0 ? 0 : 1, sgn = t === 0 ? 1 : -1; (dog[r.ap[t]] ??= []).push(sgn * (r.gd - beta * r.d)); }
  const underdog = Object.fromEntries(AP.map((a) => [a, dog[a] ? stat(dog[a]) : null]));
  // 4) Kennzahlen je Spielweise (je Mannschaft und Spiel).
  const kp = {};
  for (const r of rows) for (const t of [0, 1]) (kp[r.ap[t]] ??= []).push(r.k[t]);
  const mean = (v, f) => +(v.reduce((s, x) => s + f(x), 0) / v.length).toFixed(3);
  const kpis = Object.fromEntries(AP.map((a) => { const v = kp[a] ?? []; const thr = v.reduce((s, x) => s + x.thr, 0); return [a, { n: v.length, gf: mean(v, (x) => x.gf), ga: mean(v, (x) => x.ga), pos: mean(v, (x) => x.pos), sh: mean(v, (x) => x.sh), xg: mean(v, (x) => x.xg), thr: mean(v, (x) => x.thr), xgPerThr: thr ? +(v.reduce((s, x) => s + x.thrXg, 0) / thr).toFixed(3) : null, cross: mean(v, (x) => x.cross), pass: mean(v, (x) => x.pass) }]; }));
  const goals = mean(rows, (r) => r.k[0].gf + r.k[1].gf);
  console.log(JSON.stringify({ pitch: parts[0].pitch, niveau: parts[0].niveau, n: rows.length, goals, beta: eff(1), systems: sysEff, approaches: apEff, matrix, underdog, kpis }));
  process.exit(0);
}
if (mode !== 'run') throw new Error('Modus: run | sum');

const pitch = PITCHES[pitchId ?? 'grossfeld'];
const NIV = +nivArg || 1, N = +nArg || 20, from = +fromArg || 0;
const format = pitch.format ?? 5;
const SY = Object.keys(systemsFor(format));
const BENCH = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH[format] ?? [])];
const rows = [];
for (let i = from; i < from + N; i++) {
  const rng = createRng(55000 + i);
  const base = generateTeam(createRng(3000 + i), TEAM_PRESETS[0], roles).players.map((p) => lifted(p, NIV));
  const sys = [0, 1].map(() => SY[Math.floor(rng.next() * SY.length)]);
  const ap = [0, 1].map(() => AP[Math.floor(rng.next() * AP.length)]);
  const d = rng.range(-DSPAN, DSPAN);
  const players = (t) => (t === 0 ? base.map((p) => ({ ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, MIND_SET.has(k) ? v : Math.max(0.05, v + d)])) })) : base);
  const team = (t) => ({ ...TEAM_PRESETS[t], tactic: { system: sys[t], style: APPROACHES[ap[t]].style, orders: APPROACHES[ap[t]].orders ?? {} }, players: players(t) });
  const m = createMatch({ seed: 9000 + i, pitch, human: false, aiCoach: false, teams: [team(0), team(1)] });
  const log = createChanceLog(m);
  const thr = [[], []], cross = [0, 0];
  const teamOf = (id) => m.players.find((p) => p.id === id)?.team;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    feedChances(log, m, m.events);
    for (const e of m.events) if (e.type === 'pass') { const t = teamOf(e.playerId); if (t == null) continue; if (e.through) thr[t].push(m.time); if (e.cross) cross[t]++; }
    m.events.length = 0;
  }
  const st = m.stats.teams, an = m.an.teams;
  const k = [0, 1].map((t) => {
    const mine = log.shots.filter((s) => s.team === t);
    return { gf: m.score[t], ga: m.score[1 - t], pos: +((100 * st[t].possession) / Math.max(1e-9, st[0].possession + st[1].possession)).toFixed(1), sh: mine.length, xg: +log.xg[t].toFixed(3), thr: thr[t].length,
      thrXg: +mine.filter((s) => thr[t].some((x) => s.t >= x && s.t - x <= AFTER)).reduce((a, s) => a + s.xg, 0).toFixed(3), cross: cross[t], pass: an[t].pass };
  });
  rows.push({ i, sys, ap, d: +d.toFixed(4), gd: m.score[0] - m.score[1], k });
}
console.log(JSON.stringify({ pitch: pitch.id, niveau: NIV, systems: SY, n: rows.length, rows }));
