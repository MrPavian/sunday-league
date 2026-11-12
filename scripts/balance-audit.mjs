// Balance über lange Karrieren (ROADMAP 11.18 Punkt 1): Hängt ein Wert dauerhaft am Anschlag, wird man zu oft entlassen,
// steigt man zu schnell auf, läuft die Kasse oder das private Konto davon?
// Aufruf: node scripts/balance-audit.mjs [Karrieren=12] [Saisons=12] [--json=datei] [--start=Liga]
// --start=L (2 bis 12): Die Karriere wird in Liga L gesetzt (wie pro-audit.mjs: eine erzwungene Aufstiegssaison aus L−1 mit
// voller Zulassung, dann der Kader eines mittleren Vereins der Liga und die übliche Startkasse) und von dort echt gespielt.
// Ohne das bleiben Bot-Karrieren in zwölf Saisons in den Ligen 1 bis 3 – die oberen Ligen wären ungemessen.
// Ablauf: selbst angelegter Trainer (Nur Trainer, verheiratet, ein Kind – damit Privatleben und Familie mitlaufen), echte
// simulierte Spiele (Dauer 240 s wie longrun.mjs), Ereignisse zu 70 % zufällig beantwortet, sonst autoResolve wie im Spiel.
// Drei Spielweisen im Wechsel je Seed: „passiv“ (nichts außer Ereignissen), „aktiv“ (Sponsoren annehmen, Leute holen,
// ausbauen, Platz pflegen – der Bot aus longrun.mjs in klein), „aktiv+privat“ (dazu Geld ausgeben wie üblich in der Liga).
// Nach einer Entlassung übernimmt der Trainer das erste Angebot. Gemessen wird am Ende jeder Saison.
import { createCareer, currentFixtures, finishRound, humanClub, maxSquad, migrateCareer, nextSeason, nudge, prepareMatch, recordResult, recruit, scoutRumor, seasonOver, simulateSync } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { acceptSponsor } from '../src/career/sponsors.js';
import { build, canBuild, FACILITIES } from '../src/career/facilities.js';
import { care, platz } from '../src/career/platz.js';
import { board, trustOf } from '../src/career/pressure.js';
import { startCash, takeOver } from '../src/career/clubchange.js';
import { facilities } from '../src/career/facilities.js';
import { playerOf } from '../src/career/career.js';
import { auftreten, buy, EXPECT, GOODS, moveHome, privat, typus } from '../src/career/privat.js';
import { createRng } from '../src/core/rng.js';
import { writeFileSync } from 'node:fs';

const N = +process.argv[2] || 12;
const SEASONS = +process.argv[3] || 12;
const JSON_OUT = (process.argv.find((a) => a.startsWith('--json=')) ?? '').split('=')[1];
const STYLES = ['passiv', 'aktiv', 'aktiv+privat'];
const START = +((process.argv.find((a) => a.startsWith('--start=')) ?? '').split('=')[1] ?? 1) || 1;
const evCount = {}; // id → { n, perLevel }
const norm = (id) => (id.startsWith('story:') ? 'story:' + id.slice(6).split('-')[0] : id);
function liftTo(c, level) {
  c.level = level - 1;
  c.cash = 1e8;
  for (const id of ['stadion', 'flutlicht', 'drittliga', 'flutlicht800', 'arena', 'rasenheizung', 'flutlicht1200', 'sitzplatz8000', 'flutlicht1800']) facilities(c).built[id] = 1;
  const me = humanClub(c).id;
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me ? { home: 2, away: 0 } : f.away === me ? { home: 0, away: 2 } : { home: 1, away: 1 };
    finishRound(c);
  }
  nextSeason(c);
  const top11 = (club) => { const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11); return r.reduce((s, x) => s + x, 0) / r.length; };
  const sorted = c.clubs.filter((x) => !x.human).sort((a, b) => top11(b) - top11(a));
  const mid = sorted[Math.floor(sorted.length / 2)];
  const mine = humanClub(c);
  const keep = mine.squad.filter((i) => i === c.coach?.idx);
  const swap = mid.squad;
  mid.squad = mine.squad.filter((i) => i !== c.coach?.idx);
  mine.squad = [...swap, ...keep];
  for (const idx of mine.squad) if (c.players[idx]) delete c.players[idx].contract;
  c.cash = startCash(c.level);
  if (c.board) Object.assign(c.board, { trust: 60, warned: false, ultimatum: null, losses: 0, fired: null });
}

function activeBot(c) {
  const w = c.week;
  if (!w) return;
  for (const idx of humanClub(c).squad) if (w.availability[idx] === 'no') nudge(c, idx);
  (w.rumors ?? []).forEach((r, i) => { if (humanClub(c).squad.length < maxSquad(c) && r.status === 'open') { scoutRumor(c, i); recruit(c, i); } });
  for (let i = (c.offers ?? []).length - 1; i >= 0; i--) acceptSponsor(c, i);
  care(c, 'maehen', 'helfer'); care(c, 'kreide', 'helfer'); care(c, 'waessern', 'helfer');
  if (platz(c).cond < 0.6) care(c, 'nachsaeen', 'profi');
  for (const id of Object.keys(FACILITIES)) if (canBuild(c, id) && c.cash > FACILITIES[id].cost * 1.4) build(c, id, 'handwerker');
}
// Gibt Geld aus, bis das Auftreten zum Üblichen der Liga passt (billigste nächste Stufe zuerst); zieht um, wenn er pendelt.
function privatBot(c) {
  const p = privat(c);
  if (!p) return;
  if (p.commute) moveHome(c);
  for (let guard = 0; guard < 6 && auftreten(c).glanz < EXPECT(c.level ?? 1) + 1; guard++) {
    const next = Object.keys(GOODS).filter((k) => p.own[k] < 4).map((k) => ({ k, tier: p.own[k] + 1, price: GOODS[k].tiers[p.own[k] + 1].price })).sort((a, b) => a.price - b.price)[0];
    if (!next || p.wallet < next.price * 1.5 || !buy(c, next.k, next.tier)) break;
  }
}

const rows = [];
const errors = [];
const t0 = Date.now();
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1]; // nur die Karriere mit dieser Nummer (ab 0), zum Nachstellen
for (let n = 0; n < N; n++) {
  if (ONLY != null && +ONLY !== n) continue;
  const seed = 9000 + n * 37;
  const style = STYLES[n % STYLES.length];
  let c = createCareer({ seed, coach: { first: 'Uwe', last: 'Brandt', age: 38, relation: 'verheiratet', profession: 'Elektriker', style: 'libero', children: [{ name: 'Paul', age: 4, sex: 'm' }], mode: 'coachOnly' } });
  const rng = createRng(seed + 1);
  let fired = 0;
  if (START > 1) { try { liftTo(c, START); } catch (err) { errors.push(`lift ${seed}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); continue; } if (c.level !== START) errors.push(`lift ${seed}: Liga ${c.level} statt ${START}`); c = migrateCareer(JSON.parse(JSON.stringify(c))); }
  for (let s = 0; s < SEASONS; s++) {
    let minCash = Infinity, minMood = 1, minPat = 100, minEn = 100, events = 0, weeks = 0, firedNow = 0;
    while (!seasonOver(c)) {
      if (board(c).fired) {
        const f = board(c).fired;
        const id = f.offers?.[0] ?? f.away?.[0]?.id;
        if (!id || !takeOver(c, id)) { errors.push(`Seed ${seed} S${c.season}/${c.round}: entlassen ohne Angebot – ${JSON.stringify({ reason: f.reason, offers: f.offers, away: f.away, from: f.from, firedAt: [f.season, f.round], clubs: c.clubs.map((x) => x.id + (x.human ? '*' : '')), president: !!c.coach?.office })}`); break; }
        fired++; firedNow++;
      }
      if (style !== 'passiv') try { activeBot(c); } catch (err) { errors.push(`bot ${seed} ${c.season}/${c.round}: ${err.message}`); }
      if (style === 'aktiv+privat') privatBot(c);
      // Ein engagierter Mensch nutzt jede Woche beide Aktionen (Scouten, Reden, Anwerben) – das kostet Geduld zu Hause
      // (personal.js weeklyPersonal). Der Bot oben braucht sie nur gelegentlich; hier gelten sie als verbraucht.
      if (style !== 'passiv' && c.week && (c.week.actions ?? 0) > 0) c.week.actions = 0;
      const e = c.week?.event;
      if (e) { events++; const x = (evCount[norm(e.id)] ??= { n: 0, perLevel: {} }); x.n++; x.perLevel[c.level ?? 1] = (x.perLevel[c.level ?? 1] ?? 0) + 1; }
      if (e && e.choice === null && rng.chance(0.7)) try { resolveEvent(c, rng.int(0, e.options.length - 1)); } catch (err) { errors.push(`event ${e.id} (${seed} ${c.season}/${c.round}): ${err.message}`); }
      for (const f of currentFixtures(c)) {
        try { const p = prepareMatch(c, f, { duration: 240 }); simulateSync(p); recordResult(c, f, p); } catch (err) { errors.push(`match ${seed} ${c.season}/${c.round}: ${err.message}`); f.result ??= { home: 1, away: 1 }; }
      }
      try { finishRound(c); } catch (err) { errors.push(`round ${seed} ${c.season}/${c.round}: ${err.stack.split('\n').slice(0, 2).join(' | ')}`); c.round++; }
      weeks++;
      minCash = Math.min(minCash, c.cash);
      minMood = Math.min(minMood, c.mood ?? 0);
      minPat = Math.min(minPat, c.coach.patience ?? 100);
      minEn = Math.min(minEn, c.coach.energy ?? 100);
      c = migrateCareer(JSON.parse(JSON.stringify(c)));
    }
    // Am letzten Spieltag entlassen: Im Spiel wählt man erst den neuen Verein, dann beginnt die neue Saison (home.js firedCard).
    if (board(c).fired) { const f = board(c).fired; if (takeOver(c, f.offers?.[0] ?? f.away?.[0]?.id)) { fired++; firedNow++; } }
    const p = privat(c);
    const level = c.level ?? 1;
    rows.push({ seed, style, season: c.season, level, pos: 0, cash: Math.round(c.cash), minCash: Math.round(minCash), mood: +(c.mood ?? 0).toFixed(2), minMood: +minMood.toFixed(2), trust: trustOf(c), patience: Math.round(c.coach.patience ?? 0), minPat: Math.round(minPat), energy: Math.round(c.coach.energy ?? 0), minEn: Math.round(minEn), wallet: Math.round(p?.wallet ?? 0), glanz: auftreten(c).glanz, typ: typus(c), relation: c.coach.relation, kids: (c.coach.children ?? []).length, squad: humanClub(c).squad.length, events, weeks, fired: firedNow });
    try { nextSeason(c); rows.at(-1).pos = c.history?.at(-1)?.pos ?? c.pastClubs?.at(-1)?.history?.at(-1)?.pos ?? 0; } catch (err) { errors.push(`nextSeason ${seed} S${c.season}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
  }
  console.error(`Karriere ${n + 1}/${N} (${style}, Seed ${seed}): Liga ${c.level}, ${fired}× entlassen, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : 0; };
const share = (a, pred) => (a.length ? Math.round((100 * a.filter(pred).length) / a.length) : 0);
console.log(`\n${N} Karrieren × ${SEASONS} Saisons, ${rows.length} Saisons gemessen, ${((Date.now() - t0) / 1000).toFixed(0)} s, Fehler: ${errors.length}`);
errors.slice(0, 12).forEach((e) => console.log('  ', e));
for (const style of STYLES) {
  const r = rows.filter((x) => x.style === style);
  if (!r.length) continue;
  const last = r.filter((x) => x.season === Math.max(...r.map((y) => y.season)));
  console.log(`\n== ${style} (${new Set(r.map((x) => x.seed)).size} Karrieren)`);
  console.log(`Liga am Ende: ${last.map((x) => x.level).sort((a, b) => a - b).join(' ')}`);
  console.log(`Entlassungen je 10 Saisons: ${(10 * avg(r.map((x) => x.fired))).toFixed(1)}`);
  console.log(`Platz im Mittel: ${avg(r.map((x) => x.pos)).toFixed(1)} · Meister/Aufstiegsplatz 1: ${share(r, (x) => x.pos === 1)} %`);
  console.log(`Ereignisse je Woche: ${(avg(r.map((x) => x.events)) / avg(r.map((x) => x.weeks))).toFixed(2)}`);
  const line = (name, key, lo, hi) => console.log(`${name.padEnd(22)} Mittel ${avg(r.map((x) => x[key])).toFixed(2).padStart(10)} · 10 % ${String(q(r.map((x) => x[key]), 0.1)).padStart(9)} · 90 % ${String(q(r.map((x) => x[key]), 0.9)).padStart(9)}${lo != null ? ` · am unteren Anschlag ${share(r, (x) => x[key] <= lo)} %` : ''}${hi != null ? ` · am oberen ${share(r, (x) => x[key] >= hi)} %` : ''}`);
  line('Stimmung (Saisonende)', 'mood', -0.9, 0.9);
  line('Stimmung (Tiefpunkt)', 'minMood', -0.9, null);
  line('Vertrauen Vorstand', 'trust', 5, 95);
  line('Geduld Familie', 'patience', 5, 95);
  line('Geduld (Tiefpunkt)', 'minPat', 5, null);
  line('Energie', 'energy', 5, 95);
  line('Energie (Tiefpunkt)', 'minEn', 5, null);
  line('Kasse', 'cash', 0, null);
  line('Kasse (Tiefpunkt)', 'minCash', 0, null);
  line('Privates Konto', 'wallet', 0, null);
  line('Auftreten', 'glanz');
  console.log(`Trainertyp: ${Object.entries(r.reduce((m, x) => ((m[x.typ] = (m[x.typ] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`Beziehung am Ende: ${last.map((x) => x.relation).join(', ')} · Kinder ${last.map((x) => x.kids).join(' ')}`);
}
console.log('\nJe Liga (alle Spielweisen): Saisons · Platz · Kasse (Median) · Konto (Median) · Vertrauen · Geduld · Entlassungen');
for (const lv of [...new Set(rows.map((x) => x.level))].sort((a, b) => a - b)) {
  const r = rows.filter((x) => x.level === lv);
  console.log(`Liga ${String(lv).padStart(2)}: ${String(r.length).padStart(3)} · ${avg(r.map((x) => x.pos)).toFixed(1)} · ${q(r.map((x) => x.cash), 0.5)} · ${q(r.map((x) => x.wallet), 0.5)} · ${Math.round(avg(r.map((x) => x.trust ?? 0)))} · ${Math.round(avg(r.map((x) => x.patience)))} · ${r.reduce((s, x) => s + x.fired, 0)}`);
}
const evTotal = Object.values(evCount).reduce((s, x) => s + x.n, 0);
console.log(`\nHäufigste Ereignisse (echte Ergebnisse, ${evTotal} Ereignisse, ${Object.keys(evCount).length} verschiedene):`);
for (const [id, x] of Object.entries(evCount).sort((a, b) => b[1].n - a[1].n).slice(0, 15)) console.log(`${String(x.n).padStart(5)} ${((100 * x.n) / evTotal).toFixed(1).padStart(5)} %  ${id}`);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ rows, errors, evCount }));
