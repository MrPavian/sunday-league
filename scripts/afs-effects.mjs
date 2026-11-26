// AFS Phase 7: gemessene Wirkung je Befehl gegen das Spiel ohne Befehl (src/intel/core.js EFFECTS).
// Eingabe: Rohdaten aus scripts/afs-validate.mjs (AFS_OUT=… node scripts/afs-validate.mjs 40 rasenplatz,grossfeld 80).
// Aufruf: node scripts/afs-effects.mjs <AFS_OUT-Datei>. ** = auf beiden Plätzen |t| ≥ 2 in dieselbe Richtung;
// es = Unterschied in Standardabweichungen eines Spiels ohne Befehl.
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.argv[2]));
const M = {
  xg: (t) => t.xg, xgA: (t, o) => o.xg, tilt: (t, o) => t.third[2] / (t.third[2] + o.third[2] || 1),
  poss: (t, o) => (t.poss == null ? NaN : t.poss / (t.poss + o.poss || 1)), passes: (t) => t.pass, passPct: (t) => t.passOk / (t.pass || 1), packing: (t) => t.packing / (t.passOk || 1),
};
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const vr = (a) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
const out = {};
for (const venue of ['rasenplatz', 'grossfeld']) {
  const base = R.filter((g) => g.venue === venue && g.cond === 'base');
  for (const cond of [...new Set(R.map((g) => g.cond))].filter((c) => c !== 'base')) {
    const gs = R.filter((g) => g.venue === venue && g.cond === cond);
    for (const [k, f] of Object.entries(M)) {
      const a = gs.map((g) => f(g.teams[0], g.teams[1])), b = base.map((g) => f(g.teams[0], g.teams[1]));
      const d = mean(a) - mean(b), t = d / Math.sqrt(vr(a) / a.length + vr(b) / b.length);
      ((out[cond] ??= {})[k] ??= {})[venue] = { d: +d.toFixed(4), es: +(d / Math.sqrt(vr(b))).toFixed(2), t: +t.toFixed(1), n: a.length };
    }
  }
}
console.log('| Befehl | Wert | Rasenplatz Δ (t) | Großfeld Δ (t) |');
for (const [c, ms] of Object.entries(out)) for (const [k, v] of Object.entries(ms)) {
  const r = v.rasenplatz, g = v.grossfeld; const mark = Math.abs(r.t) >= 2 && Math.abs(g.t) >= 2 && Math.sign(r.d) === Math.sign(g.d) ? ' **' : '';
  console.log(`| ${c} | ${k} | ${r.d} (${r.t}, es ${r.es}) | ${g.d} (${g.t}, es ${g.es}) |${mark}`);
}
