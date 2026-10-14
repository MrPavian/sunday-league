// Positionsfremd messen (sim/position.js): Dieselbe Mannschaft B tritt gegen dieselbe Mannschaft A an,
// einmal normal aufgestellt, einmal mit Spielern auf fremden Positionen. Gleiche Seeds, KI gegen KI.
//   node scripts/position-audit.mjs [Spiele=60] [Platz=sportplatz] [Szenarien=alle, kommagetrennt]
// Szenarien: weit-3 (3 weit weg + 2 Nachbarn), weit-2 (Abwehr↔Sturm getauscht = 2 Spieler weit weg), weit-4 (zwei Tausche), nah-4 (Abwehr↔Mitte
// zweimal), tor (Feldspieler im Tor, Torwart in der Mitte), mix (weit-3 + Tor).
// Seite: B steht abwechselnd links/rechts (gerade/ungerade Seeds), damit die Seite nichts verzerrt.
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';

const N = Number(process.argv[2] ?? 60);
const pitch = PITCHES[process.argv[3] ?? 'sportplatz'];
const format = pitch.format ?? 5;
const slots = systemFormation(format).map((f) => f.role);
const idxOf = (role) => slots.map((r, i) => (r === role ? i : -1)).filter((i) => i >= 0);

function swap(players, i, j) {
  [players[i], players[j]] = [players[j], players[i]];
}
const SCENARIOS = {
  normal: () => {},
  'weit-2': (pl) => swap(pl, idxOf('def')[0], idxOf('fwd')[0]),
  // weit-3: drei Spieler weit weg (Abwehr↔Sturm getauscht + Abwehr→Sturm), dazu zwei Nachbarn verschoben
  'weit-3': (pl) => {
    swap(pl, idxOf('def')[0], idxOf('fwd')[0]);
    swap(pl, idxOf('def')[1], idxOf('fwd')[1]);
    swap(pl, idxOf('fwd')[1], idxOf('mid')[0]);
  },
  'weit-4': (pl) => {
    swap(pl, idxOf('def')[0], idxOf('fwd')[0]);
    swap(pl, idxOf('def')[1], idxOf('fwd')[1] ?? idxOf('fwd')[0]);
  },
  'nah-4': (pl) => {
    swap(pl, idxOf('def')[0], idxOf('mid')[0]);
    swap(pl, idxOf('def')[1], idxOf('mid')[1]);
  },
  tor: (pl) => swap(pl, 0, idxOf('mid')[0]),
  mix: (pl) => {
    SCENARIOS['weit-3'](pl);
    SCENARIOS.tor(pl);
  },
};

function play(seed, scenario) {
  const rng = createRng(seed * 7919);
  const roles = [...slots, 'def', 'mid', 'fwd'];
  const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[i], roles), tactic: { style: 'ausgewogen' } }));
  const b = seed % 2; // B ist Team 0 oder 1
  SCENARIOS[scenario](teams[b].players);
  const m = createMatch({ seed, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  const oop = m.players.filter((p) => p.team === b && p.oop).length;
  return { gf: m.score[b], ga: m.score[1 - b], oop, shots: m.stats.teams[b].shots };
}

console.log(`Platz ${pitch.id} (Format ${format}), ${N} Spiele je Szenario, Seeds 900…${900 + N - 1}`);
const rows = [];
for (const name of (process.argv[4] ? process.argv[4].split(',') : Object.keys(SCENARIOS))) {
  const t = { gf: 0, ga: 0, w: 0, d: 0, l: 0, oop: 0, shots: 0 };
  for (let i = 0; i < N; i++) {
    const r = play(900 + i, name);
    t.gf += r.gf; t.ga += r.ga; t.oop += r.oop; t.shots += r.shots;
    if (r.gf > r.ga) t.w++; else if (r.gf < r.ga) t.l++; else t.d++;
  }
  rows.push([name, (t.oop / N).toFixed(1), (t.gf / N).toFixed(2), (t.ga / N).toFixed(2), ((t.gf - t.ga) / N).toFixed(2), t.w, t.d, t.l, ((t.w * 3 + t.d) / N).toFixed(2), (t.shots / N).toFixed(1)]);
}
console.log(['Szenario', 'oop', 'Tore+', 'Tore-', 'Diff', 'S', 'U', 'N', 'Pkt/Sp', 'Schüsse'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
