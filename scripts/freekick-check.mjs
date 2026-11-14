// Freistöße: wie viele je Spiel, wie viele in Schussweite (bis 30 m vor dem Tor, auf kleinen Feldern entsprechend), was der Schütze
// zuerst macht (Schuss, Flanke, Pass, Dribbling), wie nah die Gegner beim Ausführen stehen, Mauer ja/nein, Tore bis 8 s danach.
//   node scripts/freekick-check.mjs [N=40] [Plätze=rasenplatz,sportplatz,grossfeld] [Startwert=600]
// Zum Vergleich (Profis): ein direkter Freistoß hat im Schnitt 0,06 xG, rund 6 % werden zum Tor (The Analyst, Opta).
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';

const N = Number(process.argv[2] ?? 40);
const venues = (process.argv[3] ?? 'rasenplatz,sportplatz,grossfeld').split(',');
const seed0 = Number(process.argv[4] ?? 600);
for (const v of venues) {
  const pitch = PITCHES[v];
  const range = 30 * (pitch.halfLength / 52.5);
  const r = { fk: 0, near: 0, wall: 0, first: { shot: 0, cross: 0, pass: 0, other: 0 }, goals: 0, goalsDirect: 0, minOpp: [] };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: seed0 + i, pitch, human: false });
    let fk = null;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'setpiece' && e.kind === 'freekick') {
          const s = attackDir(m, e.team);
          const d = Math.hypot(s * pitch.halfLength - m.ball.pos.x, m.ball.pos.z);
          r.fk++;
          fk = d <= range ? { team: e.team, taker: e.playerId, time: null, spot: { ...m.ball.pos }, wall: !!m.wallIds?.length } : null;
          if (fk) (r.near++, fk.wall && r.wall++);
          continue;
        }
        if (!fk) continue;
        if (!fk.time && (e.type === 'shot' || e.type === 'pass') && e.playerId === fk.taker) {
          fk.time = m.time;
          const kind = e.type === 'shot' ? 'shot' : e.cross ? 'cross' : 'pass';
          r.first[kind]++;
          fk.direct = kind === 'shot';
          const opp = m.players.filter((p) => p.team !== fk.team && p.role !== 'gk').map((p) => Math.hypot(p.pos.x - fk.spot.x, p.pos.z - fk.spot.z));
          r.minOpp.push(Math.min(...opp));
        }
        if (e.type === 'goal' && fk.time && e.team === fk.team && m.time - fk.time < 8) (r.goals++, fk.direct && r.goalsDirect++, (fk = null));
      }
      if (fk && !fk.time && m.setPiece?.taken && m.ball.lastTouch !== fk.taker) (r.first.other++, (fk.time = m.time));
      if (fk?.time && m.time - fk.time >= 8) fk = null;
      m.events.length = 0;
    }
  }
  const pc = (x, n) => `${Math.round((100 * x) / (n || 1))} %`;
  const sorted = [...r.minOpp].sort((a, b) => a - b);
  console.log(`${v}: ${(r.fk / N).toFixed(1)} Freistöße je Spiel, ${(r.near / N).toFixed(2)} in Schussweite (Mauer ${pc(r.wall, r.near)}) · zuerst Schuss ${pc(r.first.shot, r.near)}, Flanke ${pc(r.first.cross, r.near)}, Pass ${pc(r.first.pass, r.near)}, anderes ${pc(r.first.other, r.near)} · nächster Gegner beim Ausführen Median ${sorted[sorted.length >> 1]?.toFixed(1)} m · Tore bis 8 s ${r.goals} (${pc(r.goals, r.near)}), davon direkt ${r.goalsDirect} (${pc(r.goalsDirect, r.first.shot)} der Schüsse)`);
}
