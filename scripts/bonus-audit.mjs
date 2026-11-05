// Wirkung der verdeckten Boni im Spiel (sim/bonus.js) messen: dieselben Spiele mit und ohne Bonus für einen Spieler der
// Mannschaft 0. Aufruf: node scripts/bonus-audit.mjs [Spiele] [Platz]
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';
import { clutch } from '../src/sim/bonus.js';

const N = Number(process.argv[2] ?? 200);
const pitch = PITCHES[process.argv[3] ?? 'rasenplatz'];
const format = pitch.format ?? 5;
const roles = [...systemFormation(format).map((f) => f.role), 'def', 'mid', 'fwd'];

// Wem der Bonus gegeben wird: Weltklasse/Star dem Stürmer, Führung dem ersten Mittelfeldspieler.
const target = { weltklasse: 'fwd', fuehrung: 'mid', star: 'fwd' };

function play(seed, bonus) {
  const rng = createRng(seed * 7919);
  const teams = [0, 1].map((i) => generateTeam(rng, TEAM_PRESETS[i], roles));
  if (bonus) {
    const p = teams[0].players.find((q) => q.position === target[bonus]) ?? teams[0].players[1];
    p.bonus = [bonus];
  }
  const m = createMatch({ seed, pitch, teams, human: false, aiCoach: false });
  let late = [0, 0];
  while (m.phase !== 'ended') {
    const before = [...m.score];
    const tight = clutch(m);
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
    if (tight) for (const t of [0, 1]) late[t] += m.score[t] - before[t];
  }
  return { gd: m.score[0] - m.score[1], pts: m.score[0] > m.score[1] ? 3 : m.score[0] === m.score[1] ? 1 : 0, late };
}

const rows = {};
for (const bonus of [null, 'weltklasse', 'fuehrung', 'star']) {
  let gd = 0, gd2 = 0, pts = 0, late0 = 0, late1 = 0;
  for (let s = 1; s <= N; s++) {
    const r = play(1000 + s, bonus);
    gd += r.gd; gd2 += r.gd * r.gd; pts += r.pts; late0 += r.late[0]; late1 += r.late[1];
  }
  const mean = gd / N;
  rows[bonus ?? 'ohne'] = { tordiff: mean.toFixed(3), se: Math.sqrt((gd2 / N - mean * mean) / N).toFixed(3), punkte: (pts / N).toFixed(3), spaeteTore: `${(late0 / N).toFixed(3)}:${(late1 / N).toFixed(3)}` };
}
console.log(`${N} Spiele je Zeile, ${process.argv[3] ?? 'rasenplatz'}`);
console.table(rows);
