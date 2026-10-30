// Prüft eine Gewichtung der Stärkezahl an echten Kadern (Konzept Spielerstärke 11.6): Pokalspiele mit den Kadern der Karriere,
// echte Engine; dann für alte und neue Gewichte die Steigung des Poisson-Modells (wie pokal-calibrate) und die Log-Likelihood der
// Ergebnisse. Besser vorhersagende Gewichte: höhere Likelihood, steilere Steigung.
//   node scripts/rating-validate.mjs [Spiele=160] [Start-Seed=1] > teil.json ;  node scripts/rating-validate.mjs --fit a.json b.json
import { readFileSync } from 'node:fs';
import { createCareer, playerOf, simulateSync } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { pokalClub, preparePokalMatch, startPokal } from '../src/career/pokal.js';
import { RATING_WEIGHTS_V2, TRAIT_RATING } from '../src/sim/generator.js';

// alt: die echte Stärkezahl (mit Zuschlägen); neu: neue Gewichte ohne (v2) und mit den alten Zuschlägen (v3).
const rate = (p, variant) => {
  if (variant === 'alt') return p.rating;
  const w = RATING_WEIGHTS_V2[p.position] ?? RATING_WEIGHTS_V2.mid;
  let s = 0;
  for (const [k, v] of Object.entries(w)) s += (p.attrs[k] ?? 0.5) * v;
  return s * 100 + (variant === 'v3' ? p.traits.reduce((b, t) => b + (TRAIT_RATING[t] ?? 1), 0) : 0);
};
if (process.argv[2] === '--fit') {
  const rows = process.argv.slice(3).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
  const pmf = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
  const probs = (lh, la) => { let w = 0, d = 0; for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) { const p = pmf(lh, i) * pmf(la, j); if (i > j) w += p; else if (i === j) d += p; } return { w, d, l: Math.max(1e-9, 1 - w - d) }; };
  const g = rows.reduce((s, r) => s + r.h + r.a, 0) / rows.length / 2;
  for (const key of ['d1', 'd2', 'd3']) {
    let best = { ll: -Infinity };
    for (let pp = 0; pp <= 0.2001; pp += 0.0025) for (let hm = -0.3; hm <= 0.3001; hm += 0.05) {
      let ll = 0;
      for (const r of rows) { const q = probs(g * Math.exp(pp * r[key] + hm), g * Math.exp(-pp * r[key])); ll += Math.log(r.h > r.a ? q.w : r.h === r.a ? q.d : q.l); }
      if (ll > best.ll) best = { ll, pp, hm };
    }
    const sd = Math.sqrt(rows.reduce((s, r) => s + r[key] ** 2, 0) / rows.length);
    console.log(`${{ d1: 'alt', d2: 'neu ohne Zuschläge', d3: 'neu mit Zuschlägen' }[key]}: Spiele ${rows.length} · Steigung ${best.pp.toFixed(4)} je Punkt · Streuung der Unterschiede ${sd.toFixed(1)} · Steigung × Streuung ${(best.pp * sd).toFixed(3)} · LogL ${best.ll.toFixed(1)}`);
  }
  process.exit(0);
}
const N = +process.argv[2] || 160;
const rows = [];
for (let seed = +process.argv[3] || 1; rows.length < N; seed++) {
  const c = createCareer({ seed });
  c.level = 2 + (seed % 4);
  const cup = startPokal(c, 'kreis');
  for (const tie of cup.ties) {
    if (rows.length >= N) break;
    const m = simulateSync(preparePokalMatch(c, 'kreis', tie));
    const n = LEAGUES[Math.min(5, cup.levels[tie.home])].format ?? 7;
    const str = (id, W) => { const r = pokalClub(c, cup, id).squad.map((i) => rate(playerOf(c, i), W)).sort((a, b) => b - a).slice(0, n); return r.reduce((s, x) => s + x, 0) / r.length; };
    rows.push({ d1: str(tie.home, 'alt') - str(tie.away, 'alt'), d2: str(tie.home, 'v2') - str(tie.away, 'v2'), d3: str(tie.home, 'v3') - str(tie.away, 'v3'), h: m.score[0], a: m.score[1] });
  }
}
console.log(JSON.stringify(rows));
