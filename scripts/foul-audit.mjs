// Foul-Messung: Fouls, Vorteil, Karten, Elfmeter je Spiel und die bereinigten Bezugsgrößen (KI gegen KI, Seeds 900+i).
//   node scripts/foul-audit.mjs <Platz> [Spiele=40] [Wurzel=.]
// Bezugsgrößen (Vergleichswerte Bundesliga 2023/24 stehen im Kopf von src/sim/fouls.js):
//   calledFouls = Pfiffe + Vorteile · foulsPerDuel = gepfiffene Fouls je Zweikampf-Begegnung (Grätsche, Stochern, Körperkontakt, Kopfball)
//   cardsPerFoul = Karten je Foul · penaltiesPerGoal = Elfmeter je Tor. Mit Wurzel kann ein älterer Stand (git archive) verglichen werden.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const venue = process.argv[2] ?? 'grossfeld';
const N = +process.argv[3] || 40;
const root = resolve(process.argv[4] ?? '.');
const load = (p) => import(pathToFileURL(`${root}/${p}`).href);
const { createMatch, matchDuration, stepMatch } = await load('src/sim/match.js');
const { PITCHES, STADIUM } = await load('src/sim/pitch.js');
const pitch = venue === 'stadion' ? STADIUM : PITCHES[venue];
const z = {};
const add = (k, n = 1) => (z[k] = (z[k] ?? 0) + n);
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false, incidents: false });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) {
      switch (e.type) {
        case 'slide': add('slides'); break;
        case 'poke': add('pokes'); break;
        case 'tackle': add('slideWon'); break;
        case 'poke_won': add('pokeWon'); break;
        case 'grab': add('grabs'); break;
        case 'header': add('headers'); break;
        case 'pass': add('passes'); break;
        case 'shot': add('shots'); break;
        case 'goal': add('goals'); break;
        case 'no_call': add('noCall'); break;
        case 'advantage': add('advantage'); if (e.card) add('advCard'); break;
        case 'foul': add('fouls'); add(`foul_${e.kind ?? 'tackle'}`); if (e.penalty) add('penalties'); if (e.dogso) add('dogsoFouls'); if (e.offensive) add('offensiveFouls'); break;
        case 'card': add(`card_${e.color}`); if (e.color === 'red') add(`red_${e.reason}`); if (e.late) add('lateCards'); if (e.reason === 'meckern') add('dissentCards'); break;
        case 'advantage_over': add(e.ok ? 'advOk' : 'advRecall'); break;
        case 'setpiece': if (e.kind === 'penalty') add('penaltyKicks'); if (e.kind === 'freekick') add('freekicks'); break;
      }
    }
    m.events.length = 0;
  }
  add('games');
  add('contactDuels', m.foulStats?.duels ?? 0);
  add('boxDuels', m.foulStats?.boxDuels ?? 0);
  add('sentOffEnd', m.sentOff.length);
}
const row = { venue, N };
for (const [k, v] of Object.entries(z)) row[k] = +(v / N).toFixed(3);
row.games = N;
// Gepfiffene Fouls = Pfiffe + Vorteile (die Statistik zählt beide). Zweikampf = Grätsche + Stochern + Körperkontakt-Begegnung (2 s Pause) + Kopfballduell.
const called = (z.fouls ?? 0) + (z.advantage ?? 0);
const duels = (z.slides ?? 0) + (z.pokes ?? 0) + (z.contactDuels ?? 0);
row.calledFouls = +(called / N).toFixed(2);
row.duels = +(duels / N).toFixed(1);
row.foulsPerDuel = +(called / Math.max(1, duels)).toFixed(3);
row.foulsPer100Passes = +((100 * called) / Math.max(1, z.passes ?? 0)).toFixed(2);
row.cardsPerFoul = +((((z.card_yellow ?? 0) + (z.card_yellowred ?? 0) + (z.card_red ?? 0))) / Math.max(1, called)).toFixed(3);
row.penaltiesPerGoal = +((z.penalties ?? 0) / Math.max(1, z.goals ?? 0)).toFixed(3);
row.sec = Math.round((Date.now() - t0) / 1000);
console.log(JSON.stringify(row));
