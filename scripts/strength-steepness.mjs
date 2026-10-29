// Schritt 1 aus docs/KONZEPT-SPIELERSTAERKE.md: Wie steil reagiert die Engine auf Stärkeunterschiede? Nur Messung.
// Zwei Mannschaften aus demselben Grundkader; die eine bekommt alle Werte um D/200 höher, die andere um D/200 niedriger
// (Werte 0–1, die Stärke ist ihre gewichtete Summe × 100). Gemessen wird der echte Unterschied der Stärke (Schnitt der Startelf).
// Heim und Gast wechseln je Spiel, damit Anstoß und Seite herausfallen.
//   node scripts/strength-steepness.mjs [Platz=sportplatz] [Spiele je Stufe=40] [Stufen=0,4,8,12,20]
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam, ratePlayer } from '../src/sim/generator.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { BENCH_ROLES } from '../src/sim/squad.js';
import { normalizeTactic, systemFormation } from '../src/sim/tactics.js';

const pitch = PITCHES[process.argv[2] ?? 'sportplatz'];
const N = +process.argv[3] || 40;
const STEPS = (process.argv[4] ?? '0,4,8,12,20').split(',').map(Number);
const format = pitch.format ?? 5;
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH_ROLES[format] ?? [])];
const clamp = (v) => Math.max(0.05, Math.min(0.98, v));
const shift = (team, preset, dx) => ({ ...preset, players: team.players.map((p) => { const attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, clamp(v + dx)])); const q = { ...p, attrs }; return { ...q, rating: ratePlayer(q) }; }) });
const eleven = (t) => t.players.slice(0, format).reduce((s, p) => s + p.rating, 0) / format;

const out = [];
for (const D of STEPS) {
  let pts = 0;
  let goals = 0;
  let gs = 0;
  let gw = 0;
  let realD = 0;
  for (let i = 0; i < N; i++) {
    const base = generateTeam(createRng(1000 + i), TEAM_PRESETS[0], roles);
    const strong = shift(base, TEAM_PRESETS[0], D / 200);
    const weak = shift(base, TEAM_PRESETS[1], -D / 200);
    realD += eleven(strong) - eleven(weak);
    const strongHome = i % 2 === 0;
    const m = createMatch({ seed: 7 + i * 13 + D, pitch, human: false, teams: strongHome ? [strong, weak] : [weak, strong] });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    const [s, w] = strongHome ? m.score : [m.score[1], m.score[0]];
    pts += s > w ? 1 : s === w ? 0.5 : 0;
    goals += s + w;
    gs += s;
    gw += w;
  }
  const perPoint = D ? Math.log((gs + 0.5) / (gw + 0.5)) / 2 / (realD / N) : 0;
  out.push({ D, realD: +(realD / N).toFixed(1), points: +((pts / N) * 100).toFixed(1), goalsPerTeam: +(goals / N / 2).toFixed(2), perPoint: +perPoint.toFixed(3) });
}
console.log(JSON.stringify({ pitch: pitch.id, format, N, rows: out }));
