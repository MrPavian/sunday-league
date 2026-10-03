// Misst an der echten Engine, wie viele Tore in Pokalspielen fallen – abhängig vom Stärkeunterschied
// (Schnitt der besten Spieler im Format des Gastgebers). Daraus die Konstanten für QUICK in
// src/career/pokal.js: Tore ≈ base · exp(±perPoint · Unterschied [+ home]).
//   node scripts/pokal-calibrate.mjs [Spiele=80]
import { createCareer, playerOf, simulateSync } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { pokalClub, preparePokalMatch, startPokal } from '../src/career/pokal.js';
import { createRng } from '../src/core/rng.js';

const N = +process.argv[2] || 80;
// Ergebnisse zwischenspeichern: CACHE=datei.json liest/schreibt die gemessenen Spiele.
const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
const rows = process.env.CACHE && existsSync(process.env.CACHE) ? JSON.parse(readFileSync(process.env.CACHE, 'utf8')) : [];
for (let seed = 1; rows.length < N; seed++) {
  const c = createCareer({ seed });
  c.level = 2 + (seed % 4);
  const cup = startPokal(c, 'kreis');
  for (const tie of cup.ties) {
    if (rows.length >= N) break;
    const prepared = preparePokalMatch(c, 'kreis', tie);
    const m = simulateSync(prepared);
    const n = LEAGUES[Math.min(5, cup.levels[tie.home])].format ?? 7;
    const str = (id) => {
      const r = pokalClub(c, cup, id).squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, n);
      return r.reduce((s, x) => s + x, 0) / r.length;
    };
    rows.push({ d: str(tie.home) - str(tie.away), h: m.score[0], a: m.score[1] });
  }
}
if (process.env.CACHE) writeFileSync(process.env.CACHE, JSON.stringify(rows));
// Log-lineares Modell per Momenten: mittlere Tore → base; Steigung aus Kovarianz von d und log-Torverhältnis.
const mean = (f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
const goals = mean((r) => (r.h + r.a) / 2);
const home = Math.log(mean((r) => r.h + 0.5) / mean((r) => r.a + 0.5)) / 2;
// Steigung und Heimvorteil per Maximum-Likelihood auf Sieg/Remis/Niederlage (Gitter-Suche):
// Wahrscheinlichkeiten aus zwei Poisson-Verteilungen, base = mittlere Tore je Team.
const pmf = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
const probs = (lh, la) => {
  let w = 0, d = 0;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) { const p = pmf(lh, i) * pmf(la, j); if (i > j) w += p; else if (i === j) d += p; }
  return { w, d, l: Math.max(1e-9, 1 - w - d) };
};
let best = { ll: -Infinity };
for (let pp = 0; pp <= 0.2001; pp += 0.005) for (let hm = -0.3; hm <= 0.3001; hm += 0.05) {
  let ll = 0;
  for (const r of rows) { const q = probs(goals * Math.exp(pp * r.d + hm), goals * Math.exp(-pp * r.d)); ll += Math.log(r.h > r.a ? q.w : r.h === r.a ? q.d : q.l); }
  if (ll > best.ll) best = { ll, pp, hm };
}
const perPoint = best.pp;
const homeFit = best.hm;
const winRate = (lo, hi) => {
  const sel = rows.filter((r) => r.d >= lo && r.d < hi);
  return sel.length ? `${((sel.filter((r) => r.h > r.a).length / sel.length) * 100).toFixed(0)} % Heimsiege (n=${sel.length})` : '–';
};
console.log(`Spiele ${rows.length} · Tore je Team ${goals.toFixed(2)} · base ${goals.toFixed(2)} · perPoint ${perPoint.toFixed(3)} · home ${homeFit.toFixed(2)} (Torverhältnis daheim ${home.toFixed(2)}) · Unterschied ${Math.min(...rows.map((r) => r.d)).toFixed(1)} … ${Math.max(...rows.map((r) => r.d)).toFixed(1)}`);
console.log('Engine   – Unterschied < -5:', winRate(-99, -5), '| -5…5:', winRate(-5, 5), '| > 5:', winRate(5, 99));
// Gegenprobe: dasselbe mit dem schnellen Modell (gleiche Unterschiede, 200 Würfe je Spiel).
const rng = createRng(7);
const pois = (l) => { let k = 0, p = Math.exp(-l), s = p; const u = rng.next(); while (u > s && k < 15) { k++; p *= l / k; s += p; } return k; };
const quick = (lo, hi) => {
  const sel = rows.filter((r) => r.d >= lo && r.d < hi);
  let w = 0, n = 0;
  for (const r of sel) for (let k = 0; k < 200; k++, n++) if (pois(goals * Math.exp(perPoint * r.d + homeFit)) > pois(goals * Math.exp(-perPoint * r.d))) w++;
  return n ? `${((w / n) * 100).toFixed(0)} % Heimsiege` : '–';
};
console.log('Schnell  – Unterschied < -5:', quick(-99, -5), '| -5…5:', quick(-5, 5), '| > 5:', quick(5, 99));
