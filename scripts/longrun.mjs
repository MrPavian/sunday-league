import { createCareer, currentFixtures, finishRound, humanClub, migrateCareer, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';
const SEASONS = +process.argv[2] || 8, seed = +process.argv[3] || 4242;
const t0 = Date.now();
let c = createCareer({ seed });
const rng = createRng(seed + 1);
const seen = new Map(); const dupWeek = []; const perSeason = [];
let chatMax = 0, errors = [];
for (let s = 0; s < SEASONS; s++) {
  let goals = 0, games = 0;
  while (!seasonOver(c)) {
    const texts = (c.week?.chat ?? []).map((m) => m.text);
    chatMax = Math.max(chatMax, texts.length);
    const dups = texts.filter((t, i) => texts.indexOf(t) !== i);
    if (dups.length) dupWeek.push(`${c.season}/${c.round}: ${dups[0].slice(0, 70)}`);
    for (const t of texts) seen.set(t, (seen.get(t) ?? 0) + 1);
    const e = c.week?.event;
    if (e && e.choice === null && rng.chance(0.7)) try { resolveEvent(c, rng.int ? rng.int(0, e.options.length - 1) : Math.floor(rng.next() * e.options.length)); } catch (err) { errors.push('event ' + e.id + ': ' + err.message); }
    for (const f of currentFixtures(c)) {
      try { const p = prepareMatch(c, f, { duration: 240 }); simulateSync(p); recordResult(c, f, p); goals += f.result.home + f.result.away; games++; } catch (err) { errors.push(`match ${c.season}/${c.round}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); }
    }
    try { finishRound(c); } catch (err) { errors.push(`round ${c.season}/${c.round}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); c.round++; }
    c = migrateCareer(JSON.parse(JSON.stringify(c))); // Speichern + Laden
  }
  const me = humanClub(c);
  const res = nextSeason(c);
  const feuds = Object.values(c.feuds ?? {});
  const nem = Object.values(c.nemesis ?? {});
  perSeason.push({ season: c.season - 1, league: c.league, pos: c.history.at(-1).pos, squad: me.squad.length, gpg: +(goals / games).toFixed(2), chronicle: (c.saga?.chronicle ?? []).length, formers: Object.keys(c.formers ?? {}).length, nemMax: Math.max(0, ...nem), feud: feuds.length ? `${Math.min(...feuds)}..${Math.max(...feuds)}` : '-', otherSquads: c.clubs.filter((x) => !x.human).map((x) => x.squad.length).join(','), kb: Math.round(JSON.stringify(c).length / 1024), goal: c.goal?.type ?? '?', melee: (c.saga?.chronicle ?? []).filter((x) => x.text.startsWith('Rudel')).length });
}
console.table(perSeason);
console.log('chatMax/week', chatMax, 'errors', errors.length); errors.slice(0, 10).forEach((e) => console.log(' ', e));
console.log('duplicate within week:', dupWeek.length); dupWeek.slice(0, 8).forEach((d) => console.log(' ', d));
const top = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('most repeated texts:'); top.forEach(([t, n]) => console.log(String(n).padStart(4), t.slice(0, 100)));
console.log('distinct texts', seen.size, 'total', [...seen.values()].reduce((a, b) => a + b, 0), 'time', (Date.now() - t0) / 1000 + 's');
