// Einwürfe messen (ROADMAP 11.18 Punkt 6): Wie lange dauert es bis zum Wurf, wie weit geht er, wer ist als Nächster am Ball,
// und wie viele Mitspieler stehen beim Wurf anspielbar in der Nähe?
//   node scripts/throwin-check.mjs [N=40] [Plätze=rasenplatz,sportplatz,grossfeld]
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const N = Number(process.argv[2] ?? 40);
for (const v of (process.argv[3] ?? 'rasenplatz,sportplatz,grossfeld').split(',')) {
  const pitch = PITCHES[v];
  const s = { n: 0, mate: 0, opp: 0, out: 0, wait: [], dist: [], near: [], free: [], lost5: 0, kept5: 0 };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: 700 + i, pitch, human: false });
    let pending = null; // angesetzter Einwurf
    let track = null; // geworfener Einwurf bis zum nächsten Kontakt
    let after = null; // Ballbesitz 5 s nach dem Wurf
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'setpiece') pending = e.kind === 'throwin' ? { taker: e.playerId, t: m.time, team: e.team } : null;
        if (track && e.type === 'out') { s.out++; s.n++; track = null; after = null; }
      }
      if (pending && m.setPiece?.taken && m.ball.holder !== pending.taker) {
        const t = m.players.find((p) => p.id === pending.taker);
        const mates = m.players.filter((p) => p.team === pending.team && p.id !== pending.taker && p.role !== 'gk');
        const opps = m.players.filter((p) => p.team !== pending.team);
        const near = mates.filter((p) => Math.hypot(p.pos.x - t.pos.x, p.pos.z - t.pos.z) < 12);
        const free = near.filter((p) => !opps.some((o) => Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < 2));
        s.wait.push(m.time - pending.t); s.near.push(near.length); s.free.push(free.length);
        track = { t: m.time, x: t.pos.x, z: t.pos.z, taker: pending.taker, team: pending.team };
        after = { t: m.time, team: pending.team };
        pending = null;
      }
      if (track && m.ball.lastTouch && m.ball.lastTouch !== track.taker) {
        const p = m.players.find((q) => q.id === m.ball.lastTouch);
        (p.team === track.team ? s.mate++ : s.opp++);
        s.n++;
        s.dist.push(Math.hypot(p.pos.x - track.x, p.pos.z - track.z));
        track = null;
      }
      if (after && m.time - after.t >= 5) {
        const last = m.players.find((q) => q.id === m.ball.lastTouch);
        (last && last.team === after.team && m.phase === 'play' ? s.kept5++ : s.lost5++);
        after = null;
      }
      m.events.length = 0;
    }
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const pc = (x) => `${Math.round((100 * x) / (s.n || 1))} %`;
  console.log(`${v}: ${s.n} Einwürfe (${(s.n / N).toFixed(1)} je Spiel) · zuerst am Ball: Mitspieler ${pc(s.mate)}, Gegner ${pc(s.opp)}, gleich wieder im Aus ${pc(s.out)} · Ball nach 5 s noch beim Team ${Math.round((100 * s.kept5) / Math.max(1, s.kept5 + s.lost5))} % · Zeit bis zum Wurf ${avg(s.wait).toFixed(1)} s · Wurfweite ${avg(s.dist).toFixed(1)} m · Mitspieler im Umkreis von 12 m: ${avg(s.near).toFixed(1)}, davon frei ${avg(s.free).toFixed(1)} · ohne freien Mitspieler ${Math.round((100 * s.free.filter((x) => x === 0).length) / Math.max(1, s.free.length))} %`);
}
