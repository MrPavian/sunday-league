// Flügelspiel messen: Wo kommen die Angriffe ins letzte Drittel (links/Mitte/rechts, laneOf in
// matchlog.js), wie viele Flanken, Rückpässe von der Grundlinie, Pässe von außen in den Strafraum,
// Schüsse und Tore je Spiel. Beide Teams, gleiche Seeds.
//   node scripts/wing-audit.mjs [Spiele=24] [Platz=rasenplatz]
// Bezug: In der Bundesliga laufen nur rund 33 % der Angriffe durch die Mitte (Bundesliga Match Facts
// „Attacking Zones", vier gleich breite Streifen – also die mittlere Hälfte der Breite).
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const N = Number(process.argv[2] ?? 24);
const venue = process.argv[3] ?? 'rasenplatz';
const pitch = PITCHES[venue];
const a = { L: 0, M: 0, R: 0, cross: 0, cutback: 0, wideToBox: 0, passes: 0, shots: 0, goals: 0, halfMid: 0, entries: 0 };
for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  const hw = m.pitch.halfWidth;
  const inBox = (pos, team) => Math.abs(pos.z) < m.pitch.goalHalfWidth * 2.2 && Math.abs(pos.x) > m.pitch.halfLength * 0.72 && Math.sign(pos.x) === (m.players.find((q) => q.team === team)?.home.x < 0 ? 1 : -1) * (m.sidesSwapped ? -1 : 1);
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) {
      if (e.type === 'pass') {
        a.passes++;
        if (e.cross) a.cross++;
        const t = m.players.find((q) => q.id === e.playerId)?.team;
        if (e.from && e.to && Math.abs(e.from.z) > hw * 0.4 && t != null && inBox(e.to, t)) a.wideToBox++;
      } else if (e.type === 'combo' && e.kind === 'cutback') a.cutback++;
      else if (e.type === 'shot') a.shots++;
      else if (e.type === 'goal') a.goals++;
    }
    m.events.length = 0;
  }
  for (const p of m.log.poss) {
    if (!p.entryLane) continue;
    a.entries++;
    a[p.entryLane === 'left' ? 'L' : p.entryLane === 'right' ? 'R' : 'M']++;
  }
}
const pct = (x) => `${Math.round((100 * x) / Math.max(1, a.entries))} %`;
const per = (x) => (x / N).toFixed(1);
console.log(`${venue}, ${N} Spiele: Angriffe links/Mitte/rechts ${pct(a.L)} / ${pct(a.M)} / ${pct(a.R)} · Flanken ${per(a.cross)} · Rückpässe Grundlinie ${per(a.cutback)} · von außen in den Strafraum ${per(a.wideToBox)} · Pässe ${per(a.passes)} · Schüsse ${per(a.shots)} · Tore ${per(a.goals)} je Spiel`);
