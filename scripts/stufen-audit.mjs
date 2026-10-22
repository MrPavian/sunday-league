// Stufen-Audit: Wie gut sind die Spieler, die der Spieler bekommt – je Weg und Liga-Stufe – im Vergleich zur Liga?
// Ein aktiver Bot (wie longrun --bot, dazu Probetraining) spielt mehrere Karrieren; jeder Neuzugang im
// eigenen Kader wird einem Weg zugeordnet (Gerücht, Wirt/Derby-Gerücht, Probetraining, Jugend, Ereignis,
// Wochenwechsel, Saisonwechsel, Start). Aufruf: node scripts/stufen-audit.mjs [--seasons=9] [--seeds=12] [--seed0=4242]
//   [--dur=60] [--json=datei]. Spielminuten (--dur) beeinflussen nur die Tempo-Zahl; Stufen/Stärken sind davon unabhängig.
// Alle Werte im Spiel sind erfunden, keine Realwerte.
import fs from 'node:fs';
import { createCareer, currentFixtures, finishRound, humanClub, maxSquad, nextSeason, nudge, playerOf, prepareMatch, recordResult, recruit, scoutRumor, seasonOver, simulateSync } from '../src/career/career.js';
import { acceptSponsor } from '../src/career/sponsors.js';
import { build, canBuild, FACILITIES } from '../src/career/facilities.js';
import { care, platz, renew } from '../src/career/platz.js';
import { promoteProspect } from '../src/career/youth.js';
import { resolveEvent } from '../src/career/events.js';
import { createRng } from '../src/core/rng.js';
import { inviteTrialist, runStation, startTraining, STATIONS, trainingDone } from '../src/career/training.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const SEASONS = +arg('seasons', 9), SEEDS = +arg('seeds', 12), SEED0 = +arg('seed0', 4242), DUR = +arg('dur', 60), JSON_OUT = arg('json', '');
const TIERS = ['ok', 'gut', 'stark', 'dorfstar', 'superstar', 'legende'];
const arrivals = []; // { src, level, tier, rating, season }
const seasonsLog = []; // { seed, season, level, pos, promoted, mine, opp, mineTop, tiers }
const oppSquads = []; // { level, tiers, rating }
const runs = []; // { seed, firstPromo, finalLevel }

const shares = (list) => { const o = Object.fromEntries(TIERS.map((t) => [t, 0])); for (const t of list) o[t]++; return o; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function run(seed) {
  let c = createCareer({ seed });
  const rng = createRng(seed + 1);
  const cur = () => new Set(humanClub(c).squad);
  const note = (before, src, detail = '') => {
    for (const idx of humanClub(c).squad) if (!before.has(idx)) {
      const p = playerOf(c, idx);
      const chat = (c.week?.chat ?? []).filter((m) => m.from === idx && /neu in der Gruppe|new in the group/.test(m.text)).pop()?.text?.replace(/^\([^)]*\)\s*/, '').slice(0, 28) ?? '';
      arrivals.push({ src, detail: detail || chat, level: c.level ?? 1, tier: p.tier, rating: p.rating, season: c.season, custom: p.custom ?? '' });
    }
  };
  { const empty = new Set(); note(empty, 'start'); }
  let firstPromo = null;
  for (let s = 0; s < SEASONS; s++) {
    for (const cl of c.clubs.filter((x) => !x.human)) {
      const ps = cl.squad.map((i) => playerOf(c, i));
      oppSquads.push({ level: c.level, tiers: ps.map((p) => p.tier), rating: mean(ps.map((p) => p.rating)) });
    }
    while (!seasonOver(c)) {
      const w = c.week;
      const club = humanClub(c);
      let b = cur();
      for (const idx of club.squad) if (w.availability[idx] === 'no') nudge(c, idx);
      (w.rumors ?? []).forEach((r, i) => {
        if (club.squad.length < maxSquad(c) && r.status === 'open') { b = cur(); scoutRumor(c, i); recruit(c, i); note(b, i < 3 ? 'geruecht' : 'geruecht-extra'); }
      });
      // Probetraining: jede dritte Woche, beste Probanden einladen (wie ein aktiver Mensch)
      if (c.round % 3 === 1 && !w.training && c.cash > 40 && startTraining(c)) {
        for (const id of Object.keys(STATIONS).slice(0, 3)) runStation(c, id);
        if (trainingDone(c)) {
          const order = w.training.trialists.map((t, i) => ({ t, i, r: playerOf(c, t.idx).rating })).sort((x, y) => y.r - x.r);
          for (const { i } of order) { if (club.squad.length >= maxSquad(c)) break; b = cur(); inviteTrialist(c, i); note(b, 'probetraining'); }
        }
      }
      b = cur();
      for (const idx of [...(c.youth?.prospects ?? [])].sort((x, y) => playerOf(c, y).rating - playerOf(c, x).rating)) if (club.squad.length < maxSquad(c) - 1 && playerOf(c, idx).rating >= 42) promoteProspect(c, idx, maxSquad(c));
      note(b, 'jugend');
      for (let i = (c.offers ?? []).length - 1; i >= 0; i--) acceptSponsor(c, i);
      care(c, 'maehen', 'helfer'); care(c, 'kreide', 'helfer'); care(c, 'waessern', 'helfer'); if (platz(c).cond < 0.6) care(c, 'nachsaeen', 'profi'); care(c, 'abziehen', 'helfer'); if (platz(c).angebot) renew(c);
      for (const id of Object.keys(FACILITIES)) if (canBuild(c, id) && c.cash > FACILITIES[id].cost * 1.4) build(c, id, 'handwerker');
      const e = c.week?.event;
      if (e && e.choice === null && rng.chance(0.7)) { b = cur(); try { resolveEvent(c, Math.floor(rng.next() * e.options.length)); } catch {} note(b, 'ereignis', e.id); }
      for (const f of currentFixtures(c)) { const p = prepareMatch(c, f, { duration: DUR }); simulateSync(p); recordResult(c, f, p); }
      b = cur();
      try { finishRound(c); } catch { c.round++; }
      note(b, 'wochenwechsel');
    }
    const rows = c.clubs.filter((x) => !x.human);
    const mineP = humanClub(c).squad.map((i) => playerOf(c, i));
    const top = [...mineP].sort((a, b2) => b2.rating - a.rating).slice(0, 9);
    const lvl = c.level;
    const b = cur();
    nextSeason(c);
    const h = c.history.at(-1);
    if (h.promoted && firstPromo == null) firstPromo = h.season;
    seasonsLog.push({ seed, season: h.season, level: lvl, pos: h.pos, promoted: h.promoted, relegated: h.relegated, mine: mean(mineP.map((p) => p.rating)), opp: mean(rows.map((x) => mean(x.squad.map((i) => playerOf(c, i).rating)))), mineTop: mean(top.map((p) => p.rating)), tiers: mineP.map((p) => p.tier) });
    note(b, 'saisonwechsel');
  }
  runs.push({ seed, firstPromo, finalLevel: c.level });
}

const t0 = Date.now();
const MERGE = arg('merge', ''); // --merge=a.json,b.json: mehrere Läufe (parallel gerechnet) zusammenfassen statt neu zu spielen
if (MERGE) for (const f of MERGE.split(',')) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); arrivals.push(...d.arrivals); seasonsLog.push(...d.seasonsLog); oppSquads.push(...d.oppSquads); runs.push(...d.runs); }
else for (let k = 0; k < SEEDS; k++) { run(SEED0 + k * 101); process.stderr.write(`seed ${k + 1}/${SEEDS} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); }

const pct = (x) => (100 * x).toFixed(1).padStart(5);
const fmt = (list) => { const n = list.length || 1; const sh = shares(list.map((a) => a.tier)); return `${String(list.length).padStart(5)} | ${TIERS.map((t) => pct(sh[t] / n)).join(' ')} | ${mean(list.map((a) => a.rating)).toFixed(1).padStart(5)}`; };
const head = `${'n'.padStart(5)} | ${TIERS.map((t) => t.slice(0, 5).padStart(5)).join(' ')} | Ø-St.`;
console.log(`\n== Gegner je Liga (Kader zu Saisonbeginn, % je Stufe) ==\nLiga  | ${head}`);
for (let L = 1; L <= 5; L++) { const l = oppSquads.filter((o) => o.level === L); if (!l.length) continue; const all = l.flatMap((o) => o.tiers); const sh = shares(all); console.log(`L${L}    | ${String(all.length).padStart(5)} | ${TIERS.map((t) => pct(sh[t] / all.length)).join(' ')} | ${mean(l.map((o) => o.rating)).toFixed(1).padStart(5)}`); }
const srcs = [...new Set(arrivals.map((a) => a.src))];
console.log(`\n== Neuzugänge je Weg und Liga (Stufenanteile %, Ø-Stärke) ==`);
for (const src of srcs) { console.log(`-- ${src}\nLiga  | ${head}`); for (let L = 1; L <= 5; L++) { const l = arrivals.filter((a) => a.src === src && a.level === L); if (l.length) console.log(`L${L}    | ${fmt(l)}`); } }
console.log(`\n== Alle Neuzugänge (ohne Start) je Liga ==\nLiga  | ${head}`);
for (let L = 1; L <= 5; L++) { const l = arrivals.filter((a) => a.src !== 'start' && a.level === L); if (l.length) console.log(`L${L}    | ${fmt(l)}`); }
console.log(`\n== Details (Ereignis / Chat-Text), Anzahl, Stufen ==`);
const det = {}; for (const a of arrivals) if (a.src !== 'start' && a.src !== 'geruecht' && a.src !== 'probetraining' && a.src !== 'jugend') (det[`${a.src}:${a.detail}:${a.custom}`] ??= []).push(a);
for (const [k, l] of Object.entries(det).sort((x, y) => y[1].length - x[1].length).slice(0, 40)) console.log(String(l.length).padStart(4), k.padEnd(60), TIERS.map((t) => l.filter((a) => a.tier === t).length).join('/'), 'Ø', mean(l.map((a) => a.rating)).toFixed(1), 'Liga', [...new Set(l.map((a) => a.level))].join(','));
console.log(`\n== Kader vs Liga je Stufe (Saisonende) ==\nLiga  | Saisons | Ø-Kader | Ø-Gegner | Diff | Top9 | Anteil im Kader %: ${TIERS.join(' ')}`);
for (let L = 1; L <= 5; L++) { const l = seasonsLog.filter((x) => x.level === L); if (!l.length) continue; const all = l.flatMap((x) => x.tiers); const sh = shares(all); console.log(`L${L}    | ${String(l.length).padStart(7)} | ${mean(l.map((x) => x.mine)).toFixed(1).padStart(7)} | ${mean(l.map((x) => x.opp)).toFixed(1).padStart(8)} | ${(mean(l.map((x) => x.mine)) - mean(l.map((x) => x.opp))).toFixed(1).padStart(4)} | ${mean(l.map((x) => x.mineTop)).toFixed(1).padStart(4)} | ${TIERS.map((t) => pct(sh[t] / all.length)).join(' ')}`); }
console.log(`\n== Tempo ==`);
for (const r of runs) console.log(`seed ${r.seed}: erster Aufstieg Saison ${r.firstPromo ?? '-'}, Endliga ${r.finalLevel}`);
const fp = runs.filter((r) => r.firstPromo != null);
console.log(`Ø erster Aufstieg: ${fp.length ? mean(fp.map((r) => r.firstPromo)).toFixed(2) : '-'} (${fp.length}/${runs.length}); Ø Endliga ${mean(runs.map((r) => r.finalLevel)).toFixed(2)}`);
console.log(`Saisons: Meister ${seasonsLog.filter((x) => x.pos === 1).length}, Aufstiege ${seasonsLog.filter((x) => x.promoted).length}, Abstiege ${seasonsLog.filter((x) => x.relegated).length} von ${seasonsLog.length}`);
console.log(`Zeit ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arrivals, seasonsLog, oppSquads, runs }));
