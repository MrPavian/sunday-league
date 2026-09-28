// Fingerabdruck einer Simulation: Wer die Engine umbaut, ohne das Verhalten ändern
// zu wollen, muss hier bitgleich bleiben (siehe tests/golden.test.js).
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';

function createTeamsFor(seed, pitch, styleA, styleB) {
  const rng = createRng(seed * 7919);
  const format = pitch.format ?? 5;
  const roles = [...systemFormation(format).map((f) => f.role), 'def', 'mid', 'fwd'];
  return [styleA, styleB].map((style, i) => ({ ...generateTeam(rng, TEAM_PRESETS[i], roles), tactic: { style } }));
}

export const GOLDEN_CASES = [
  ['hinterhof', 1, 'ausgewogen', 'pressing'],
  ['parkplatz', 2, 'konter', 'kurzpass'],
  ['ascheplatz', 3, 'fluegel', 'mauern'],
  ['rasenplatz', 4, 'offensiv', 'ausgewogen'],
  ['halle', 5, 'pressing', 'konter'],
  ['park', 6, 'kurzpass', 'fluegel'],
];

export function fingerprint([pitchId, seed, styleA, styleB]) {
  const pitch = PITCHES[pitchId];
  const m = createMatch({ seed, pitch, teams: createTeamsFor(seed, pitch, styleA, styleB), human: false, duration: 120 });
  let events = 0;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    events += m.events.length;
    m.events.length = 0;
  }
  const r = (v) => Math.round(v * 1000) / 1000;
  return {
    score: m.score,
    events,
    shots: m.stats.teams.map((t) => t.shots),
    possession: m.stats.teams.map((t) => r(t.possession)),
    ball: [r(m.ball.pos.x), r(m.ball.pos.z)],
    stamina: m.players.map((p) => r(p.stamina)),
  };
}
