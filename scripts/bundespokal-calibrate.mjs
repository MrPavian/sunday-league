// Misst an der echten Engine die Außenseiterchance des Amateurs gegen den Profi im überregionalen Pokal
// (Runde 1, Großfeld 11 gegen 11, Heimrecht des Amateurs). Beide Mannschaften spielt die KI – ein Mensch
// am Gamepad kann besser oder schlechter sein als die KI, die Zahl ist der Richtwert für die Balance.
//   node scripts/bundespokal-calibrate.mjs [Spiele=200] [Kader=bezirk|mittel|stark] [Klasse=zweit|erst] [extra]
// Klasse: Zweit- oder Erstligist als Gegner (erzwingt BUND_ERST der Runde 1); Runde 1 = Heimspiel des Amateurs.
// Kader: bezirk = Zusammensetzung des stärksten Bezirksligisten (clubs.js), mittel = Zugänge, wie sie ein Bezirksligist
// anwirbt (RUMOR_TIERS_BY_LEVEL[5] in career.js), stark = Auswahl-Kader.
import { createCareer, humanClub, playerOf, simulateSync, squadPicker, SQUAD_SHAPES } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { MATCH } from '../src/sim/match.js';
import { createRng } from '../src/core/rng.js';
import { BUND_ERST } from '../src/career/bundespokal.js';
import { pokalClub, pokalOf, preparePokalMatch, recordPokalResult, startPokal, tieWinner } from '../src/career/pokal.js';

const N = +process.argv[2] || 200;
const KLASSE = process.argv[4] === 'erst' ? 1 : 0;
BUND_ERST[0] = KLASSE;
const SQUAD = process.argv[3] ?? 'bezirk';
MATCH.pokalExtra = process.argv.includes('extra');
const TIERS = { bezirk: LEAGUES[5].clubs[0].tiers, mittel: { ok: 0.14, gut: 0.33, stark: 0.3, dorfstar: 0.16, superstar: 0.06, legende: 0.01 }, stark: { gut: 0.1, stark: 0.4, dorfstar: 0.3, superstar: 0.18, legende: 0.02 } }[SQUAD];
const top = (c, club, n) => club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, n).reduce((s, x) => s + x, 0) / n;
let win = 0, draw = 0, lose = 0, regWin = 0, goalsF = 0, goalsA = 0, et = 0, str = 0, strP = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const c = createCareer({ seed: 1000 + i });
  c.level = 5;
  c.bundQual = c.season;
  const me = humanClub(c);
  me.squad = squadPicker(createRng(77 + i), new Set())(TIERS, SQUAD_SHAPES.xxl);
  for (const idx of me.squad) c.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  const cup = startPokal(c, 'bund');
  const tie = cup.ties[0];
  const prepared = preparePokalMatch(c, 'bund', tie);
  const m = simulateSync(prepared);
  const [gf, ga] = prepared.humanIsAway ? [m.score[1], m.score[0]] : m.score;
  goalsF += gf; goalsA += ga; if (m.extra) et++;
  str += top(c, me, 11); strP += top(c, pokalClub(c, cup, tie.away === me.id ? tie.home : tie.away), 11);
  if (gf > ga) regWin++;
  c.round = cup.rounds[0];
  recordPokalResult(c, prepared);
  if (tieWinner(tie) === me.id) win++; else lose++;
  if (gf === ga) draw++;
}
console.log(`${N} Spiele (${SQUAD}-Kader, Gegner ${KLASSE ? 'Erstligist' : 'Zweitligist'}, ${MATCH.pokalExtra ? 'mit Verlängerung' : 'direkt Elfmeterschießen'}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`Stärke (Schnitt beste 11): Amateur ${(str / N).toFixed(1)} · Profi ${(strP / N).toFixed(1)}`);
console.log(`Tore je Spiel: Amateur ${(goalsF / N).toFixed(2)} : Profi ${(goalsA / N).toFixed(2)} · Siege nach regulärer Zeit ${regWin} (${((regWin / N) * 100).toFixed(1)} %) · Remis ${draw} · Verlängerung ${et}`);
const p = win / N;
console.log(`Weiter (inkl. Verlängerung/Elfmeterschießen): ${win} von ${N} = ${(p * 100).toFixed(1)} % (±${(196 * Math.sqrt((p * (1 - p)) / N)).toFixed(1)} Prozentpunkte, 95 %)`);
