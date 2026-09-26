import { createCareer, currentFixtures, finishRound, humanClub, maxSquad, migrateCareer, nextSeason, nudge, playerOf, prepareMatch, recordResult, recruit, scoutRumor, seasonOver, simulateSync } from '../src/career/career.js';
import { acceptSponsor } from '../src/career/sponsors.js';
import { build, canBuild, FACILITIES } from '../src/career/facilities.js';
import { promoteProspect } from '../src/career/youth.js';
import { table } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';
const SEASONS = +process.argv[2] || 8, seed = +process.argv[3] || 4242;
const BOT = process.argv.includes('--bot'); // spielt wie ein aktiver Mensch: holt Leute, baut aus, nimmt Sponsoren
const log = { recruited: 0, promoted: 0, built: [], sponsors: 0 };
const money = {}; // Einnahmen/Ausgaben je Liga und Kategorie
const cat = (t) => /Getränke|Drinks/.test(t) ? 'getraenke' : /Mitglied|Membership/.test(t) ? 'beitraege' : /\((Trikot|Ärmel|Bande|Ball|Shirt|Sleeve|Board)/.test(t) ? 'sponsoren' : /Strafen|Fines/.test(t) ? 'strafen' : /Schiri|Referee|Platzmiete|Pitch rent/.test(t) ? 'schiri+platz' : /Bonus|Prämie/i.test(t) ? 'praemien' : /Handwerker|Material|builders/.test(t) ? 'ausbau' : /Nebenkosten|running/.test(t) ? 'nebenkosten' : /Fahrgeld|Travel money/.test(t) ? 'fahrgeld' : /Spielbetrieb|Running the team/.test(t) ? 'spielbetrieb' : /Auswärts|Away trip/.test(t) ? 'auswaerts' : /Fahrt|trip/i.test(t) ? 'fahrt' : 'sonstiges';
function bot(c) {
  const w = c.week; if (!w) return;
  for (const idx of humanClub(c).squad) if (w.availability[idx] === 'no') nudge(c, idx);
  (w.rumors ?? []).forEach((r, i) => { if (humanClub(c).squad.length < maxSquad(c) && r.status === 'open') { scoutRumor(c, i); if (recruit(c, i)) log.recruited++; } });
  for (const idx of [...(c.youth?.prospects ?? [])].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)) if (humanClub(c).squad.length < maxSquad(c) - 1 && playerOf(c, idx).rating >= 42 && promoteProspect(c, idx, maxSquad(c))) log.promoted++;
  for (let i = (c.offers ?? []).length - 1; i >= 0; i--) if (acceptSponsor(c, i)) log.sponsors++;
  for (const id of Object.keys(FACILITIES)) if (canBuild(c, id) && c.cash > FACILITIES[id].cost * 1.4 && build(c, id, 'handwerker')) log.built.push(`${id}@S${c.season}`);
}
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
    if (BOT) bot(c);
    const e = c.week?.event;
    if (e && e.choice === null && rng.chance(0.7)) try { resolveEvent(c, rng.int ? rng.int(0, e.options.length - 1) : Math.floor(rng.next() * e.options.length)); } catch (err) { errors.push('event ' + e.id + ': ' + err.message); }
    const lastEntry = c.ledger.length ? c.ledger[c.ledger.length - 1] : null;
    for (const f of currentFixtures(c)) {
      try { const p = prepareMatch(c, f, { duration: 240 }); simulateSync(p); recordResult(c, f, p); goals += f.result.home + f.result.away; games++; } catch (err) { errors.push(`match ${c.season}/${c.round}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); }
    }
    try { finishRound(c); } catch (err) { errors.push(`round ${c.season}/${c.round}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); c.round++; }
    { const L = c.ledger; let i = lastEntry ? L.lastIndexOf(lastEntry) + 1 : 0; const lv = 'L' + (c.level ?? 1); money[lv] ??= {}; for (; i < L.length; i++) { const k = cat(L[i].text); money[lv][k] = Math.round((money[lv][k] ?? 0) + L[i].amount); } }
    c = migrateCareer(JSON.parse(JSON.stringify(c))); // Speichern + Laden
  }
  const me = humanClub(c);
  const res = nextSeason(c);
  const feuds = Object.values(c.feuds ?? {});
  const nem = Object.values(c.nemesis ?? {});
  perSeason.push({ season: c.season - 1, pos: c.history.at(-1).pos, squad: me.squad.length, gpg: +(goals / games).toFixed(2), chronicle: (c.saga?.chronicle ?? []).length, formers: Object.keys(c.formers ?? {}).length, nemMax: Math.max(0, ...nem), feud: feuds.length ? `${Math.min(...feuds)}..${Math.max(...feuds)}` : '-', otherSquads: c.clubs.filter((x) => !x.human).map((x) => x.squad.length).join(','), kb: Math.round(JSON.stringify(c).length / 1024), goal: c.goal?.type ?? '?', alumni: (c.alumni ?? []).length, cash: Math.round(c.cash), fee: c.clubLife?.fee ?? 0, sup: c.clubLife?.supporters ?? 0, nb: c.clubLife?.neighbors ?? 0, mood: +(c.mood ?? 0).toFixed(2), avgRat: Math.round(humanClub(c).squad.reduce((a, i) => a + playerOf(c, i).rating, 0) / humanClub(c).squad.length), oppRat: c.clubs.filter((x) => !x.human).map((x) => Math.round(x.squad.reduce((a, i) => a + playerOf(c, i).rating, 0) / x.squad.length)).join('/'), lvl: c.level, heirs: (c.heirs?.kids ?? []).length, melee: (c.saga?.chronicle ?? []).filter((x) => x.text.startsWith('Rudel')).length });
}
console.table(perSeason);
if (BOT) console.log('bot:', JSON.stringify(log));
for (const [lv, m] of Object.entries(money)) console.log(lv, JSON.stringify(m));
console.log('chatMax/week', chatMax, 'errors', errors.length); errors.slice(0, 10).forEach((e) => console.log(' ', e));
console.log('duplicate within week:', dupWeek.length); dupWeek.slice(0, 8).forEach((d) => console.log(' ', d));
const top = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('most repeated texts:'); top.forEach(([t, n]) => console.log(String(n).padStart(4), t.slice(0, 100)));
console.log('distinct texts', seen.size, 'total', [...seen.values()].reduce((a, b) => a + b, 0), 'time', (Date.now() - t0) / 1000 + 's');
