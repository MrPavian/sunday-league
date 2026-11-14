// Weite Einwürfe (ai.js LONG_THROW): wie oft je Spiel, wer kommt zuerst an den Ball, Tore bis 8 s danach, Wurfweite.
//   node scripts/longthrow-check.mjs [N=40] [Plätze=sportplatz,grossfeld] [Startwert=800]
// Vergleich (Premier League 2025/26, The Analyst): rund 3 weite Einwürfe (ab 20 m) je Spiel, ein Tor aus 49.
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const N = Number(process.argv[2] ?? 40);
const venues = (process.argv[3] ?? 'sportplatz,grossfeld').split(',');
const seed0 = Number(process.argv[4] ?? 800);
for (const v of venues) {
  const r = { throws: 0, mate: 0, touched: 0, goals: 0, dist: [], goalsAll: 0 };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: seed0 + i, pitch: PITCHES[v], human: false });
    let t = null;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'pass' && e.longThrow) {
          const p = m.players.find((q) => q.id === e.playerId);
          t = { time: m.time, team: p.team, kicker: p.id, from: { ...m.ball.pos } };
          r.throws++;
        }
        if (e.type === 'goal') r.goalsAll++;
        if (e.type === 'goal' && t && e.team === t.team && m.time - t.time < 8) (r.goals++, (t = null));
      }
      if (t && !t.first && m.ball.lastTouch && m.ball.lastTouch !== t.kicker) {
        t.first = true;
        r.touched++;
        if (m.players.find((q) => q.id === m.ball.lastTouch)?.team === t.team) r.mate++;
        r.dist.push(Math.hypot(m.ball.pos.x - t.from.x, m.ball.pos.z - t.from.z));
      }
      if (t && m.time - t.time >= 8) t = null;
      m.events.length = 0;
    }
  }
  const avg = r.dist.length ? r.dist.reduce((a, b) => a + b, 0) / r.dist.length : 0;
  console.log(`${v}: ${(r.throws / N).toFixed(2)} weite Einwürfe je Spiel · erster Kontakt Mitspieler ${Math.round((100 * r.mate) / (r.touched || 1))} % · Weite bis zum ersten Kontakt ${avg.toFixed(1)} m · Tore bis 8 s danach ${r.goals} (${((100 * r.goals) / (r.throws || 1)).toFixed(1)} %) · Tore je Spiel ${(r.goalsAll / N).toFixed(2)}`);
}
