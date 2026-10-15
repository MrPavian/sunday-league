// Bandenspiel und Torquote in der Halle messen: Tore je Spiel, Schüsse, Bandenpässe/-schüsse je Spiel, Erfolgsquote
// (Pass: nächster Ballkontakt ist ein Mitspieler, beim Ziel-Mitspieler extra gezählt; Schuss: Tor binnen 3 s), höchster Ball.
// Gleiche Seeds vorher/nachher:  node scripts/board-audit.mjs [Spiele=60] [Platz=halle]
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const N = Number(process.argv[2] ?? 60);
const venue = process.argv[3] ?? 'halle';
const pitch = PITCHES[venue];
const a = { goals: 0, shots: 0, passes: 0, bp: 0, bpOk: 0, bpTarget: 0, bs: 0, bsGoal: 0, maxY: 0 };
for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  let open = null;
  const shotOpen = [];
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) {
      if (e.type === 'pass') a.passes++;
      else if (e.type === 'shot') a.shots++;
      else if (e.type === 'goal') {
        a.goals++;
        for (const s of shotOpen) if (m.time - s.t < 3 && s.team === e.team) (s.hit = true);
      } else if (e.type === 'bandenpass') {
        const p = m.players.find((q) => q.id === e.playerId);
        if (e.kind === 'pass') {
          a.bp++;
          open = { team: p.team, kicker: p.id, target: e.targetId };
        } else {
          a.bs++;
          shotOpen.push({ t: m.time, team: p.team, hit: false });
        }
      }
    }
    m.events.length = 0;
    if (open && m.ball.lastTouch !== open.kicker && m.ball.lastTouch) {
      const q = m.players.find((x) => x.id === m.ball.lastTouch);
      if (q && q.team === open.team) {
        a.bpOk++;
        if (q.id === open.target) a.bpTarget++;
      }
      open = null;
    }
    a.maxY = Math.max(a.maxY, m.ball.pos.y);
  }
  a.bsGoal += shotOpen.filter((s) => s.hit).length;
}
const per = (x) => (x / N).toFixed(2);
const pc = (x, y) => `${Math.round((100 * x) / Math.max(1, y))} %`;
console.log(`${venue}, ${N} Spiele: Tore ${per(a.goals)} · Schüsse ${per(a.shots)} · Pässe ${per(a.passes)} · höchster Ball ${a.maxY.toFixed(2)} m`);
console.log(`  Bandenpässe ${per(a.bp)} je Spiel, Mitspieler am Ball ${pc(a.bpOk, a.bp)} (davon der Gemeinte ${pc(a.bpTarget, a.bp)}) · Bandenschüsse ${per(a.bs)} je Spiel, Tor binnen 3 s ${pc(a.bsGoal, a.bs)}`);
