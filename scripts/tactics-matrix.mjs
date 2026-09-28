// Befehle gegen verschiedene Gegnerstile: Tordifferenz je Spiel gegenüber „kein Befehl".
// node scripts/tactics-matrix.mjs N pitch order1,order2,…  (läuft einen Prozess pro Aufruf)
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setOrder } from '../src/sim/plan.js';
const N = Number(process.argv[2] ?? 40);
const pitch = PITCHES[process.argv[3] ?? 'ascheplatz'];
const orders = (process.argv[4] ?? '-').split(',');
const oppStyles = (process.argv[5] ?? 'ausgewogen,offensiv,konter,pressing,mauern,fluegel,kurzpass').split(',');
const out = {};
for (const o of orders) {
  const row = {};
  let tot = 0;
  for (const st of oppStyles) {
    let gd = 0;
    for (let i = 0; i < N; i++) {
      const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: process.env.AICOACH === '1' });
      m.plan[1] = { ...m.plan[1], style: st };
      m.modsCache = null;
      if (o !== '-') for (const x of o.split('+')) setOrder(m, 0, ...x.split(':'));
      while (m.phase !== 'ended') { stepMatch(m, undefined, 1 / 60); m.events.length = 0; }
      gd += m.score[0] - m.score[1];
    }
    row[st] = +(gd / N).toFixed(2);
    tot += gd / N;
  }
  row['Ø'] = +(tot / oppStyles.length).toFixed(2);
  out[o] = row;
}
console.log(JSON.stringify(out));
