// Ereignis-Zählung über alle Ligen (ROADMAP 11.18 Punkt 2): Welche Ereignisse kommen nie, welche zu oft?
// Aufruf: node scripts/events-count.mjs [Seeds=48] [Saisons=16] [--json=datei]
// Ablauf: keine simulierten Spiele (schnell), aber gemischte Ergebnisse: Die eigene Mannschaft gewinnt 40 %, spielt 25 %
// unentschieden und verliert 35 % (ausgewürfelt je Spiel, fester Samen) – erzwungene Seriensiege würden Ereignisse nach
// „großen Spielen“ künstlich häufen. Selbst angelegter Trainer (Privatleben läuft mit, Familienstand wechselt je Seed),
// Sponsoren werden angenommen. Zielliga je Seed (Seed mod 12 + 1): Die Karriere wird dorthin gesetzt (eine erzwungene
// Aufstiegssaison aus der Liga darunter mit voller Zulassung) und bleibt dann dem Zufall überlassen.
// Antworten zu 70 % zufällig, sonst autoResolve wie im Spiel.
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { resolveEvent, rolledEventIds } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';
import { acceptSponsor } from '../src/career/sponsors.js';
import { facilities } from '../src/career/facilities.js';
import { startCash } from '../src/career/clubchange.js';
import { writeFileSync } from 'node:fs';

const SEEDS = +process.argv[2] || 48, SEASONS = +process.argv[3] || 16;
const out = (process.argv.find((a) => a.startsWith('--json=')) ?? '').split('=')[1];
const norm = (id) => (id.startsWith('story:') ? 'story:' + id.slice(6).split('-')[0] : id);
const count = {}; // id → { n, perLevel: {lv: n}, careers: Set, maxPerCareer }
const weeksPer = {};
const errors = [];
let weeks = 0, withEv = 0;
const RELS = ['single', 'beziehung', 'verheiratet'];
for (let s = 1; s <= SEEDS; s++) {
  const target = (s % 12) + 1;
  let c = createCareer({ seed: s * 97 + 11, coach: { first: 'Uwe', last: 'Brandt', age: 30 + (s % 4) * 6, relation: RELS[s % 3], profession: 'Elektriker', style: 'libero', children: s % 3 === 2 ? [{ name: 'Paul', age: 3 + (s % 5) * 3, sex: 'm' }] : [], mode: s % 2 ? 'coachOnly' : undefined } });
  const rng = createRng(s * 13 + 5);
  const mine = {};
  if (target > 1) {
    try {
      c.level = target - 1;
      c.cash = 1e8;
      for (const id of ['stadion', 'flutlicht', 'drittliga', 'flutlicht800', 'arena', 'rasenheizung', 'flutlicht1200', 'sitzplatz8000', 'flutlicht1800']) facilities(c).built[id] = 1;
      const me0 = humanClub(c).id;
      while (!seasonOver(c)) {
        for (const f of c.fixtures[c.round]) f.result ??= f.home === me0 ? { home: 2, away: 0 } : f.away === me0 ? { home: 0, away: 2 } : { home: 1, away: 1 };
        finishRound(c);
      }
      nextSeason(c);
      c.cash = Math.max(startCash(c.level), 5000);
      c = migrateCareer(JSON.parse(JSON.stringify(c)));
    } catch (err) { errors.push(`lift L${target}: ${err.message}`); continue; }
  }
  for (let season = 0; season < SEASONS; season++) {
    while (!seasonOver(c)) {
      const lv = c.level ?? 1;
      const e = c.week?.event;
      weeks++; weeksPer[lv] = (weeksPer[lv] ?? 0) + 1;
      if (e) {
        withEv++;
        const id = norm(e.id);
        const x = (count[id] ??= { n: 0, perLevel: {}, careers: new Set(), maxPerCareer: 0 });
        x.n++; x.perLevel[lv] = (x.perLevel[lv] ?? 0) + 1; x.careers.add(s);
        mine[id] = (mine[id] ?? 0) + 1; x.maxPerCareer = Math.max(x.maxPerCareer, mine[id]);
        if (e.choice === null && rng.chance(0.7)) try { resolveEvent(c, Math.floor(rng.next() * e.options.length)); } catch (err) { errors.push(`${e.id}: ${err.message}`); }
      }
      for (let i = (c.offers ?? []).length - 1; i >= 0; i--) acceptSponsor(c, i);
      const me = humanClub(c).id;
      for (const f of c.fixtures[c.round]) {
        if (f.result) continue;
        const mineGame = f.home === me || f.away === me;
        const r = rng.next();
        const res = !mineGame ? [1, 1] : r < 0.4 ? [2, rng.chance(0.5) ? 0 : 1] : r < 0.65 ? [1, 1] : [rng.chance(0.5) ? 0 : 1, 2];
        f.result = !mineGame || f.home === me ? { home: res[0], away: res[1] } : { home: res[1], away: res[0] };
      }
      try { finishRound(c); } catch (err) { errors.push(`round L${lv}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
    }
    try { nextSeason(c); c = migrateCareer(JSON.parse(JSON.stringify(c))); } catch (err) { errors.push(`season: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
  }
}
const all = rolledEventIds();
const never = all.filter((id) => !count[id]);
const rare = all.filter((id) => count[id] && count[id].careers.size <= 2);
const ranked = Object.entries(count).sort((a, b) => b[1].n - a[1].n);
console.log(`Seeds ${SEEDS} × ${SEASONS} Saisons · Wochen ${weeks} · mit Ereignis ${Math.round((100 * withEv) / weeks)} % · gezogen werden können ${all.length} · vorgekommen ${all.filter((id) => count[id]).length} · Fehler ${errors.length}`);
console.log('Wochen je Liga:', Object.entries(weeksPer).map(([k, v]) => `L${k} ${v}`).join(' · '));
console.log(`\nNIE vorgekommen (${never.length}):\n${never.join(' ')}`);
console.log(`\nSelten (in höchstens 2 von ${SEEDS} Karrieren, ${rare.length}):\n${rare.join(' ')}`);
console.log('\nAm häufigsten (Anteil an allen Ereignissen · höchstens je Karriere · Ligen):');
for (const [id, x] of ranked.slice(0, 25)) console.log(`${String(x.n).padStart(5)} ${((100 * x.n) / withEv).toFixed(1).padStart(5)} %  max ${String(x.maxPerCareer).padStart(3)}  ${id}  [${Object.keys(x.perLevel).join(',')}]`);
console.log('\nJe Liga: Dichte · verschiedene · häufigstes (Anteil)');
for (const lv of Object.keys(weeksPer)) {
  const e = Object.entries(count).filter(([, x]) => x.perLevel[lv]).map(([id, x]) => [id, x.perLevel[lv]]).sort((a, b) => b[1] - a[1]);
  const tot = e.reduce((s2, [, n]) => s2 + n, 0);
  console.log(`L${String(lv).padStart(2)}: ${Math.round((100 * tot) / weeksPer[lv])} % · ${e.length} · ${e[0]?.[0]} ${tot ? Math.round((100 * e[0][1]) / tot) : 0} %`);
}
errors.slice(0, 10).forEach((e) => console.log('  ', e));
if (out) writeFileSync(out, JSON.stringify({ weeks, withEv, never, rare, count: Object.fromEntries(Object.entries(count).map(([k, x]) => [k, { n: x.n, perLevel: x.perLevel, careers: x.careers.size, maxPerCareer: x.maxPerCareer }])), errors }, null, 1));
