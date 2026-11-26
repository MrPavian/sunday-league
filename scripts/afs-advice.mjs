// AFS Phase 12: Manager-Beratung in echten Saisons messen (docs/ADVANCED-FOOTBALL-SYSTEM-12-ADVICE.md).
// Je Seed vier Läufe: Beratung aus, an (nie übernommen), an (immer übernommen), selten (immer übernommen).
// Gezählt: Wochen mit Hinweis, Befund und Vorschlag, Nachfassen (geholfen / noch nicht), Rechenzeit; dazu, ob „an, nie
// übernommen“ dieselbe Tabelle ergibt wie „aus“ (die Beratung allein ändert das Spiel nicht).
// Aufruf: node scripts/afs-advice.mjs [Ligagröße] [seeds…]   (Ligagröße 6 oder 8, Standard 6)
import { createCareer, currentFixtures, finishRound, prepareMatch, recordResult, seasonOver, simulateSync, table } from '../src/career/career.js';
import { applyAdvice, followUp, opponentHint, weekAdvice } from '../src/intel/advice.js';

const [size = 6, ...seeds] = process.argv.slice(2).map(Number).filter(Boolean);
function run(seed, mode, take) {
  const c = createCareer({ seed, leagueSize: size });
  const out = { weeks: 0, hints: 0, types: {}, actions: {}, follow: { better: 0, notyet: 0 }, opp: 0, ms: 0 };
  while (!seasonOver(c)) {
    out.weeks++;
    const t0 = performance.now();
    const fu = followUp(c, mode);
    const h = weekAdvice(c, mode);
    const opp = (() => {
      const f = currentFixtures(c).find((x) => c.clubs.find((y) => y.human).id === x.home || c.clubs.find((y) => y.human).id === x.away);
      if (!f) return null;
      const me = c.clubs.find((y) => y.human).id;
      return opponentHint(c, f.home === me ? f.away : f.home, mode);
    })();
    out.ms += performance.now() - t0;
    if (fu) out.follow[fu.result]++;
    if (opp) out.opp++;
    if (h) {
      out.hints++;
      out.types[h.type] = (out.types[h.type] ?? 0) + 1;
      out.actions[h.action.key] = (out.actions[h.action.key] ?? 0) + 1;
      if (take) applyAdvice(c, h);
    }
    for (const f of currentFixtures(c)) {
      const p = prepareMatch(c, f);
      simulateSync(p);
      recordResult(c, f, p);
    }
    finishRound(c);
  }
  out.table = table(c).map((r) => `${r.club.id}:${r.pts}`).join(' ');
  out.ms = +(out.ms / out.weeks).toFixed(2);
  return out;
}
for (const seed of seeds.length ? seeds : [11, 23]) {
  const res = { aus: run(seed, 'aus', false), anNie: run(seed, 'an', false), anImmer: run(seed, 'an', true), seltenImmer: run(seed, 'selten', true) };
  console.log(`Seed ${seed}, ${size} Vereine: Tabelle „an, nie übernommen“ = „aus“: ${res.anNie.table === res.aus.table}`);
  for (const [k, r] of Object.entries(res)) {
    const { table: t, ...rest } = r;
    console.log(`  ${k}: ${JSON.stringify(rest)}`);
    if (k !== 'anNie') console.log(`    Tabelle ${t}`);
  }
}
