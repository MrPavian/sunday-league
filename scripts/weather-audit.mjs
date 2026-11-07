// Wirkung des Wetters im Spiel messen (ROADMAP 11.17 Punkt 9): dieselben Spiele (gleiche Seeds, gleiche Mannschaften) bei
// jedem Wetter. Gemessen: Tore, Schüsse, Pässe, Luftlöcher, Kopfbälle, Fouls je Spiel und die Restkraft am Ende.
// Aufruf: node scripts/weather-audit.mjs [Spiele] [Platz]
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';
import { applyWeather, WEATHER } from '../src/career/weather.js';

const N = Number(process.argv[2] ?? 100);
const base = PITCHES[process.argv[3] ?? 'rasenplatz'];
const format = base.format ?? 5;
const roles = [...systemFormation(format).map((f) => f.role), 'def', 'mid', 'fwd'];
const ONLY = process.argv[4]?.split(',');

function play(seed, pitch) {
  const rng = createRng(seed * 7919);
  const teams = [0, 1].map((i) => generateTeam(rng, TEAM_PRESETS[i], roles));
  const m = createMatch({ seed, pitch, teams, human: false, aiCoach: false });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  const sum = (k) => Object.values(m.stats.players).reduce((s, p) => s + (p[k] ?? 0), 0);
  const field = m.players.filter((p) => p.position !== 'gk');
  return {
    goals: m.score[0] + m.score[1],
    shots: m.stats.teams[0].shots + m.stats.teams[1].shots,
    passes: sum('passes'),
    whiffs: sum('whiffs'),
    headers: sum('headers'),
    fouls: m.stats.teams[0].fouls + m.stats.teams[1].fouls,
    energy: field.reduce((s, p) => s + (p.energy ?? p.stamina ?? 0), 0) / field.length,
  };
}

const rows = {};
// Regen zweimal: im September (nass, Ball rutscht) und im November (tiefer Platz).
const CASES = [[null], ...Object.keys(WEATHER).map((id) => [id, 11]), ['regen', 9]];
for (const [id, month] of CASES.filter(([x]) => !ONLY || ONLY.includes(x ?? 'ohne'))) {
  const pitch = id ? applyWeather(base, { id, month, temp: 8, leaves: false, windDir: 1 }) : base;
  const acc = {};
  for (let s = 1; s <= N; s++) {
    const r = play(2000 + s, pitch);
    for (const [k, v] of Object.entries(r)) {
      acc[k] ??= [0, 0];
      acc[k][0] += v;
      acc[k][1] += v * v;
    }
  }
  rows[id ? (id === 'regen' ? `regen ${month === 9 ? 'nass' : 'tief'}` : id) : 'ohne'] = Object.fromEntries(
    Object.entries(acc).map(([k, [s, s2]]) => {
      const mean = s / N;
      const se = Math.sqrt(Math.max(0, s2 / N - mean * mean) / N);
      return [k, `${mean.toFixed(k === 'energy' ? 3 : 2)}±${se.toFixed(k === 'energy' ? 3 : 2)}`];
    }),
  );
}
console.log(`${N} Spiele je Zeile, ${process.argv[3] ?? 'rasenplatz'} (Mittel ± Standardfehler)`);
console.table(rows);
