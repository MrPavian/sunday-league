// Wie oft erkennt die SituationEngine was? node scripts/situations.mjs [N]
import { createMatch, stepMatch, matchDuration } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { STYLE_IDS } from '../src/sim/tactics.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';

const N = Number(process.argv[2] ?? 12);
const pitches = (process.argv[3] ?? 'hinterhof,parkplatz,ascheplatz,rasenplatz').split(',');
const counts = {};
let matches = 0;
const t0 = performance.now();
for (const id of pitches) {
  const pitch = PITCHES[id];
  for (let i = 0; i < N; i++) {
    const rng = createRng(1000 + i);
    const format = pitch.format ?? 5;
    const roles = [...systemFormation(format).map((f) => f.role), 'def', 'mid', 'fwd'];
    const styles = [STYLE_IDS[i % STYLE_IDS.length], STYLE_IDS[(i * 3 + 1) % STYLE_IDS.length]];
    const teams = styles.map((style, k) => ({ ...generateTeam(rng, TEAM_PRESETS[k], roles), tactic: { style } }));
    const m = createMatch({ seed: 50 + i, pitch, teams, human: false, duration: matchDuration(pitch) });
    while (m.phase !== 'ended') { stepMatch(m, undefined, 1 / 60); m.events.length = 0; }
    matches++;
    for (const e of m.situationLog ?? []) {
      const c = (counts[e.type] ??= { episodes: 0, matches: new Set(), secs: 0, peak: 0, styles: {} });
      c.episodes++;
      c.matches.add(`${id}${i}-${e.team}`);
      c.secs += e.until - e.from;
      c.peak += e.peak;
      const st = styles[e.team];
      c.styles[st] = (c.styles[st] ?? 0) + 1;
    }
  }
}
console.log(`${matches} Spiele, ${((performance.now() - t0) / matches).toFixed(0)} ms/Spiel`);
console.table(Object.fromEntries(Object.entries(counts).map(([k, c]) => [k, {
  'Team-Spiele %': Math.round((c.matches.size / (matches * 2)) * 100),
  'Episoden/Spiel': +(c.episodes / matches).toFixed(2),
  'Ø Dauer s': +(c.secs / c.episodes).toFixed(1),
  'Ø Spitze': +(c.peak / c.episodes).toFixed(2),
  Stile: Object.entries(c.styles).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `${s}:${n}`).join(' '),
}])));
