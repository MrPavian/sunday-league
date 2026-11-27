// AFS Phase 8 – Matchplan der CPU in echten Saisons: Schalter PLAN an gegen aus (src/intel/matchplan.js).
//   node scripts/afs-plan-season.mjs [Plan des Menschen=-|press:hoch] [Ligagröße=8] [seeds…=11 23 37 41 59 73 89 97 101 113 127 131]
// Plan des Menschen: „-“ = keiner; sonst Gruppe:Wert, den der eigene Verein die ganze Saison setzt (der CPU-Gegner sieht ihn ab dem
// zweiten eigenen Spiel). Ergebnis: Punkte je Verein (aus → an), gesetzte Pläne, Tore je Spiel.
import { createCareer, currentFixtures, finishRound, prepareMatch, recordResult, seasonOver, setClubPlan, simulateSync, table } from '../src/career/career.js';
import { coachOf } from '../src/career/opponents.js';
import { matchPlan, PLAN } from '../src/intel/matchplan.js';

const [planArg = '-', sizeArg, ...rest] = process.argv.slice(2);
const size = Number(sizeArg) || 8;
const SEEDS = rest.map(Number).filter(Boolean).length ? rest.map(Number).filter(Boolean) : [11, 23, 37, 41, 59, 73, 89, 97, 101, 113, 127, 131];

function season(seed, on) {
  PLAN.on = on;
  const c = createCareer({ seed, leagueSize: size });
  if (planArg !== '-') setClubPlan(c, ...planArg.split(':'));
  let goals = 0, games = 0, plans = 0, vsHuman = 0;
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) {
      const p = prepareMatch(c, f);
      // Gezählt mit derselben Entscheidung wie in prepareMatch (kein Zufallsstrom, also gleiche Antwort).
      for (const [club, opp] of [[p.home, p.away], [p.away, p.home]]) if (matchPlan(c, club, opp)) { plans++; if (opp.human) vsHuman++; }
      simulateSync(p);
      recordResult(c, f, p);
      goals += (p.match.score?.[0] ?? 0) + (p.match.score?.[1] ?? 0);
      games++;
    }
    finishRound(c);
  }
  PLAN.on = true;
  return { c, goals: goals / games, plans, vsHuman, pts: Object.fromEntries(table(c).map((r) => [r.club.id, r.pts])) };
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, a.length - 1)); };
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
const human = [], byType = {}, goals = [[], []];
let plans = 0, vsHuman = 0;
for (const seed of SEEDS) {
  const off = season(seed, false);
  const on = season(seed, true);
  plans += on.plans; vsHuman += on.vsHuman;
  goals[0].push(off.goals); goals[1].push(on.goals);
  for (const cl of on.c.clubs) {
    const d = on.pts[cl.id] - off.pts[cl.id];
    if (cl.human) human.push(d);
    else (byType[coachOf(cl).type] ??= []).push(d);
  }
  console.log(`Seed ${seed}: Pläne ${on.plans} (gegen uns ${on.vsHuman}), Tore/Spiel ${f(off.goals)} → ${f(on.goals)}, eigener Verein ${off.pts[on.c.clubs.find((x) => x.human).id]} → ${on.pts[on.c.clubs.find((x) => x.human).id]}`);
}
console.log(`\nPlan des Menschen: ${planArg}; ${SEEDS.length} Saisons, Ligagröße ${size}`);
console.log(`Pläne je Saison: ${f(plans / SEEDS.length, 1)} (gegen den eigenen Verein ${f(vsHuman / SEEDS.length, 1)}); Tore/Spiel aus ${f(mean(goals[0]))}, an ${f(mean(goals[1]))}`);
console.log('| Verein | Saisons | Punkte an − aus | Streuung | t |');
console.log('|---|---|---|---|---|');
const row = (label, d) => console.log(`| ${label} | ${d.length} | ${f(mean(d), 1)} | ${f(sd(d), 1)} | ${f(mean(d) / (sd(d) / Math.sqrt(d.length)), 1)} |`);
row('eigener Verein', human);
for (const [t, d] of Object.entries(byType)) row(t, d);
