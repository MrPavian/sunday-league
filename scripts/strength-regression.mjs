// Wirkung der Werte je Position per Regression (Konzept Spielerstärke 11.6): In jedem Spiel bekommen beide Mannschaften aus demselben
// Grundkader zufällige Verschiebungen je Position und Wert (gleichverteilt ±SPAN), unabhängig voneinander. Danach Regression der
// Tordifferenz auf die Unterschiede der Verschiebungen (kleinste Quadrate). Jedes Spiel trägt zu allen Werten bei – deutlich genauer
// als je Wert einzeln (scripts/strength-steepness.mjs attr:…), bei gleicher Rechenzeit.
//   node scripts/strength-regression.mjs [Platz=rasenplatz] [Spiele=300] [Start=0] > teil.json   (mehrere Teile parallel, dann --fit a.json b.json …)
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { normalizeTactic, systemFormation } from '../src/sim/tactics.js';

const SPAN = 0.25;
const POS = ['gk', 'def', 'mid', 'fwd'];
const ATTRS = { gk: ['keeping', 'technique', 'passing', 'pace', 'strength'], def: ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'strength'], mid: ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'strength'], fwd: ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'strength'] };
const FEATURES = POS.flatMap((p) => ATTRS[p].map((a) => `${a}@${p}`));

if (process.argv[2] === '--fit') {
  const rows = process.argv.slice(3).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).rows);
  // Normalgleichungen X'X b = X'y, gelöst mit Gauß-Elimination.
  const k = FEATURES.length + 1;
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (const r of rows) {
    const x = [1, ...r.x];
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j];
      A[i][k] += x[i] * r.y;
    }
  }
  const M = A.map((r) => [...r]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
  }
  const b = M.map((r, i) => r[k] / r[i]);
  // Standardfehler aus der Restvarianz (Diagonale der Inversen über die Varianz der Merkmale genähert: unabhängig, gleichverteilt).
  const n = rows.length;
  const res = rows.reduce((s, r) => s + (r.y - b[0] - r.x.reduce((t, v, i) => t + v * b[i + 1], 0)) ** 2, 0) / (n - k);
  const varX = (2 * SPAN) ** 2 / 6; // Differenz zweier unabhängiger Gleichverteilungen auf ±SPAN
  const se = Math.sqrt(res / (n * varX));
  console.log(JSON.stringify({ n, se: +se.toFixed(3), coef: Object.fromEntries(FEATURES.map((f, i) => [f, +b[i + 1].toFixed(3)])) }));
  process.exit(0);
}

const pitch = PITCHES[process.argv[2] ?? 'rasenplatz'];
const N = +process.argv[3] || 300;
const from = +process.argv[4] || 0;
const format = pitch.format ?? 5;
const BENCH = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH[format] ?? [])];
const clamp = (v) => Math.max(0.05, Math.min(0.98, v));
const rows = [];
for (let i = from; i < from + N; i++) {
  const rng = createRng(77000 + i);
  const base = generateTeam(createRng(3000 + i), TEAM_PRESETS[0], roles);
  const shifts = [0, 1].map(() => Object.fromEntries(FEATURES.map((f) => [f, rng.range(-SPAN, SPAN)])));
  const team = (t) => ({ ...TEAM_PRESETS[t], players: base.players.map((p) => ({ ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([a, v]) => [a, clamp(v + (shifts[t][`${a}@${p.position}`] ?? 0))])) })) });
  const m = createMatch({ seed: 9000 + i, pitch, human: false, teams: [team(0), team(1)] });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  rows.push({ x: FEATURES.map((f) => +(shifts[0][f] - shifts[1][f]).toFixed(4)), y: m.score[0] - m.score[1] });
}
console.log(JSON.stringify({ pitch: pitch.id, n: rows.length, rows }));
