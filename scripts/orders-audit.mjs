// Ergänzt scripts/tactics.mjs um Kennzahlen für Befehle gegen den Ball und für Tempo/Form:
// Angriffsseiten des Gegners (aus unserer Sicht), Konter gegen uns, Pässe pro Minute im Ballbesitz,
// Höhe der Spitze relativ zum Ball, Kraft. Team 0 bekommt den Befehl, gleiche Seeds wie ohne.
// node scripts/orders-audit.mjs [N] [pitch] [orders…]  (Kombinationen mit +, z. B. route:konter+press:hoch)
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setOrder } from '../src/sim/plan.js';
import { attackDir } from '../src/sim/players.js';
import { mirrorLane } from '../src/sim/matchlog.js';

const N = Number(process.argv[2] ?? 24);
const pitch = PITCHES[process.argv[3] ?? 'rasenplatz'];
const list = process.argv.slice(4).length ? process.argv.slice(4) : ['-'];
const rows = {};
for (const o of list) {
  const a = { oppL: 0, oppM: 0, oppR: 0, oppE: 0, counters: 0, counterShots: 0, passes: 0, possTime: 0, fwdRel: 0, fwdN: 0, stamina: 0, goals: 0, against: 0, done: 0, tried: 0 };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: 700 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    if (o !== '-') for (const x of o.split('+')) setOrder(m, 0, ...x.split(':'));
    let tSample = 0;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
      if (m.phase === 'play' && m.time >= tSample) {
        tSample = m.time + 1;
        if (m.log?.cur?.team === 0) {
          const s = attackDir(m, 0);
          const fwd = m.players.filter((p) => p.team === 0 && p.role === 'fwd');
          for (const f of fwd) { a.fwdRel += (f.pos.x - m.ball.pos.x) * s; a.fwdN++; }
        }
      }
    }
    const L = m.log;
    a.goals += m.score[0];
    a.against += m.score[1];
    for (const p of L.poss) {
      if (p.team === 1 && p.entryLane) {
        const lane = mirrorLane(p.entryLane); // aus unserer Sicht: unsere linke Seite
        if (lane === 'left') a.oppL++; else if (lane === 'right') a.oppR++; else a.oppM++;
        a.oppE++;
      }
      // Konter gegen uns: Ballgewinn des Gegners außerhalb seines Angriffsdrittels, Schuss binnen 8 s.
      if (p.team === 1 && p.how !== 'restart' && p.startThird !== 'att') {
        a.counters++;
        if (p.shots > 0 && (p.end ?? m.time) - p.start < 8) a.counterShots++;
      }
      if (p.team === 0) { a.passes += p.passes; a.possTime += (p.end ?? m.time) - p.start; }
    }
    const ps = L.passes.filter((p) => p.team === 0 && p.done !== null);
    a.tried += ps.length;
    a.done += ps.filter((p) => p.done).length;
    const out = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
    a.stamina += out.reduce((s, p) => s + p.stamina, 0) / out.length;
  }
  const pct = (x, y) => (y ? Math.round((100 * x) / y) : 0);
  rows[o] = {
    Tore: `${(a.goals / N).toFixed(2)}:${(a.against / N).toFixed(2)}`,
    'Gegner L/M/R %': `${pct(a.oppL, a.oppE)}/${pct(a.oppM, a.oppE)}/${pct(a.oppR, a.oppE)}`,
    'Konter gegen (Schuss %)': `${(a.counterShots / N).toFixed(1)} (${pct(a.counterShots, a.counters)}%)`,
    'Pässe/min': +((a.passes / Math.max(1, a.possTime)) * 60).toFixed(1),
    'Pass%': pct(a.done, a.tried),
    'Spitze vor Ball m': +(a.fwdRel / Math.max(1, a.fwdN)).toFixed(1),
    Kraft: +(a.stamina / N).toFixed(3),
  };
}
console.table(rows);
console.log(`${pitch.id}, ${N} Spiele je Zeile`);
