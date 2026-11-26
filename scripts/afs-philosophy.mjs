// AFS Phase 6: Philosophien und fünfter Trainertyp messen (docs/ADVANCED-FOOTBALL-SYSTEM-06-PHILOSOPHY.md).
//   1. Verteilung der Trainertypen über alle Vereine der Pyramide (Schalter COACH5 an / aus)
//   2. Gleiche Befunde, verschiedene Entscheidungen: erster Vorschlag je Philosophie über alle Verein × Spieltag
//   3. Echte Saisons mit Schalter an und aus: Tabelle, Tore, Vereine mit geändertem Typ
// Aufruf: node scripts/afs-philosophy.mjs [Ligagröße=8] [seeds…=11 23]
import { createCareer, currentFixtures, finishRound, prepareMatch, recordResult, seasonOver, simulateSync, table, tacticOf, leagueOf } from '../src/career/career.js';
import { COACH5, coachOf } from '../src/career/opponents.js';
import { membersOf } from '../src/career/pyramid.js';
import { PRO_MAX_LEVEL } from '../src/career/clubs.js';
import { diagnose, rank } from '../src/intel/core.js';
import { philosophyOf, PHILOSOPHY_TYPES } from '../src/intel/philosophy.js';

const [size = 8, ...seeds] = process.argv.slice(2).map(Number).filter(Boolean);
const SEEDS = seeds.length ? seeds : [11, 23];

// 1. Verteilung
{
  const c = createCareer({ seed: SEEDS[0], leagueSize: size });
  c.pro = true;
  const ids = new Set();
  for (let l = 1; l <= PRO_MAX_LEVEL; l++) for (const d of membersOf(c, l)) ids.add(d.id);
  for (const on of [false, true]) {
    COACH5.on = on;
    const n = {};
    for (const id of ids) n[coachOf({ id }).type] = (n[coachOf({ id }).type] ?? 0) + 1;
    console.log(`Typen (${ids.size} Vereine, Schalter ${on ? 'an' : 'aus'}): ${JSON.stringify(n)}`);
  }
}

function season(seed, on, cb) {
  COACH5.on = on;
  const c = createCareer({ seed, leagueSize: size });
  let goals = 0, games = 0;
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) {
      const p = prepareMatch(c, f);
      simulateSync(p);
      recordResult(c, f, p);
      goals += (p.match.score?.[0] ?? 0) + (p.match.score?.[1] ?? 0);
      games++;
    }
    finishRound(c);
    cb?.(c);
  }
  return { c, goals: goals / games, table: table(c).map((r) => `${r.club.id}:${r.pts}`).join(' ') };
}

for (const seed of SEEDS) {
  // 2. Entscheidungen je Philosophie auf denselben Befunden (Saison mit Schalter an)
  const first = Object.fromEntries(PHILOSOPHY_TYPES.map((t) => [t, {}]));
  let cases = 0, differ = 0;
  const on = season(seed, true, (c) => {
    for (const cl of c.clubs) {
      const fs = diagnose(c, cl.id);
      if (!fs.some((f) => f.kind === 'problem')) continue;
      const current = tacticOf(cl, leagueOf(c).format ?? 5);
      const picks = PHILOSOPHY_TYPES.map((t) => rank(fs, { philosophy: philosophyOf(t), current })[0]?.key ?? '–');
      cases++;
      if (new Set(picks).size > 1) differ++;
      PHILOSOPHY_TYPES.forEach((t, i) => (first[t][picks[i]] = (first[t][picks[i]] ?? 0) + 1));
    }
  });
  console.log(`Seed ${seed}: Verein × Spieltag mit Problem ${cases}, davon mit verschiedenen ersten Vorschlägen je Typ ${differ}`);
  for (const t of PHILOSOPHY_TYPES) console.log(`  ${t}: ${JSON.stringify(first[t])}`);
  // 3. Schalter an gegen aus
  COACH5.on = true;
  const changed = on.c.clubs.filter((cl) => !cl.human && coachOf(cl).type === 'ballbesitz').map((cl) => cl.id);
  const off = season(seed, false);
  const pts = (t, id) => Number(t.split(' ').find((x) => x.startsWith(`${id}:`))?.split(':')[1]);
  console.log(`  Ballbesitz-Vereine in der Liga (Punkte aus → an): ${changed.map((id) => `${id} ${pts(off.table, id)} → ${pts(on.table, id)}`).join(', ') || 'keine'}`);
  console.log(`  BB ${seed} ${changed.map((id) => pts(on.table, id) - pts(off.table, id)).join(' ')}`);
  console.log(`  Tore je Spiel aus / an: ${off.goals.toFixed(2)} / ${on.goals.toFixed(2)}`);
  console.log(`  Tabelle aus: ${off.table}`);
  console.log(`  Tabelle an:  ${on.table}`);
  COACH5.on = true;
}
