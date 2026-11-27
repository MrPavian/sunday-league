// AFS Phase 5b – Messspiele der Nachbarligen (src/intel/sample.js): Rechenzeit, Speicher, Messspiele je Verein, und ob das Spiel
// sonst gleich bleibt (Schalter SAMPLE an gegen aus, gleicher Seed).
//   node scripts/afs-sample.mjs [Saisons=5] [Ligagröße=8] [seeds…=11 23 37]
import { createCareer, currentFixtures, finishRound, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync, table } from '../src/career/career.js';
import { tstate } from '../src/career/transfers.js';
import { samplePlayerProfiles } from '../src/intel/profiles.js';
import { playSample, SAMPLE } from '../src/intel/sample.js';

const [seasonsArg, sizeArg, ...rest] = process.argv.slice(2);
const SEASONS = Number(seasonsArg) || 5;
const size = Number(sizeArg) || 8;
const SEEDS = rest.map(Number).filter(Boolean).length ? rest.map(Number).filter(Boolean) : [11, 23, 37];

async function career(seed, on) {
  SAMPLE.on = on;
  const c = createCareer({ seed, leagueSize: size });
  const out = { ms: [], peak: 0, games: [], profiled: [], tables: [] };
  for (let s = 0; s < SEASONS; s++) {
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f);
        simulateSync(p);
        recordResult(c, f, p);
      }
      const t0 = performance.now();
      const p = await playSample(c);
      if (p) out.ms.push([performance.now() - t0, p.fixture.level]);
      out.peak = Math.max(out.peak, JSON.stringify(c.an?.nb ?? null).length);
      finishRound(c);
    }
    // Saisonende, vor nextSeason (danach sind die Messdaten gelöscht)
    const nbs = tstate(c).neighbors;
    out.games.push(...nbs.map((n) => c.an?.nb?.n[n.id] ?? 0));
    const levels = [...new Set(nbs.map((n) => n.level))];
    out.profiled.push([levels.reduce((x, l) => x + Object.keys(samplePlayerProfiles(c, l)).length, 0), nbs.flatMap((n) => n.squad).length]);
    out.tables.push(table(c).map((r) => `${r.club.id}:${r.pts}:${r.gd}`).join(' '));
    nextSeason(c);
  }
  out.bytes = JSON.stringify(c).length;
  SAMPLE.on = true;
  return out;
}

const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
for (const seed of SEEDS) {
  const off = await career(seed, false);
  const on = await career(seed, true);
  const same = off.tables.join('|') === on.tables.join('|');
  const byLevel = {};
  for (const [ms, l] of on.ms) (byLevel[l] ??= []).push(ms);
  console.log(`Seed ${seed}: Tabellen gleich ${same ? 'ja' : 'NEIN'}; Spielstand nach ${SEASONS} Saisons ${f(off.bytes / 1024)} → ${f(on.bytes / 1024)} KB; Messdaten höchstens ${f(on.peak / 1024)} KB`);
  console.log(`  Messspiele ${on.ms.length}, je Nachbar und Saison Ø ${f(mean(on.games))} (min ${Math.min(...on.games)}, max ${Math.max(...on.games)}); Spieler mit Profil am Saisonende ${f(mean(on.profiled.map(([a, b]) => a / b)) * 100, 0)} % der Nachbarkader`);
  console.log(`  ms je Messspiel: ${Object.entries(byLevel).map(([l, a]) => `Stufe ${l} ${f(mean(a), 0)}`).join(', ')}`);
}
