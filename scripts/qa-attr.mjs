// Balancing & Simulation QA, Abschnitt A2: Welche Spielerwerte entscheiden in echten Ligaspielen? Nur Auswertung.
// Liest Messdateien von scripts/qa-league.mjs (Feld „xi“: Startelf-Mittel je Rolle und Wert) und rechnet je Gruppe eine
// Regression der Tordifferenz (Heim − Gast) auf die Unterschiede der Werte (kleinste Quadrate, Standardfehler aus (X'X)⁻¹).
// Modelle: nur Stärke (rating), alle Werte, nur Körperwerte (Tempo, Ausdauer, Körper), nur Technikwerte.
//   node scripts/qa-attr.mjs <a.jsonl> … [--by=fmt|lv] [--skip-first] [--json=out.json]
// --skip-first: erste gemessene Saison je Datei auslassen (Startweg --start, siehe docs/BALANCING-QA-02-TESTS.md Abschnitt 1).
import { readFileSync, writeFileSync } from 'node:fs';
import { ATTR_KEYS } from '../src/sim/strength.js';

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const BY = opt('by') ?? 'fmt';
const M = [];
for (const f of args.filter((a) => !a.startsWith('--'))) {
  const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((o) => o.k === 'm' && o.xi);
  const first = Math.min(...rows.map((o) => o.season));
  M.push(...rows.filter((o) => !args.includes('--skip-first') || o.season > first));
}

const ROLES = ['gk', 'def', 'mid', 'fwd'];
const PHYS = new Set(['pace', 'stamina', 'strength']);
// Torwart: nur die Werte, die er im Spiel braucht; Feldspieler: alle außer Torwartspiel.
const use = (r, k) => (r === 'gk' ? ['keeping', 'passing', 'technique', 'pace', 'strength'].includes(k) : k !== 'keeping');
const ALL = ROLES.flatMap((r) => ATTR_KEYS.filter((k) => use(r, k)).map((k) => [r, k]));
const MODELS = {
  stärke: null,
  alle: ALL,
  körper: ALL.filter(([r, k]) => PHYS.has(k)),
  technik: ALL.filter(([r, k]) => !PHYS.has(k)),
};

function solve(A) { // Gauß-Jordan: gibt die Inverse von A zurück (A quadratisch)
  const n = A.length, M2 = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    const d = M2[c][c];
    if (Math.abs(d) < 1e-12) return null;
    for (let j = 0; j < 2 * n; j++) M2[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M2[r][j] -= f * M2[c][j]; }
  }
  return M2.map((r) => r.slice(n));
}

function ols(X, y) {
  const n = X.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { Xty[a] += X[i][a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]; }
  const inv = solve(XtX);
  if (!inv) return null;
  const beta = inv.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) { const p = X[i].reduce((s, v, j) => s + v * beta[j], 0); sse += (y[i] - p) ** 2; sst += (y[i] - my) ** 2; }
  const s2 = sse / (n - k);
  return { beta, se: inv.map((r, i) => Math.sqrt(Math.max(0, r[i] * s2))), r2: 1 - sse / sst, adj: 1 - (sse / (n - k)) / (sst / (n - 1)), n };
}

const val = (m, t, r, k) => m.xi[t].roles[r]?.[ATTR_KEYS.indexOf(k)] ?? null;
function analyse(ms) {
  const y = ms.map((m) => m.score[0] - m.score[1]);
  const out = {};
  for (const [name, feats] of Object.entries(MODELS)) {
    let fs = feats;
    if (fs) fs = fs.filter(([r, k]) => ms.every((m) => val(m, 0, r, k) != null && val(m, 1, r, k) != null)); // Rolle fehlt im Format
    const X = ms.map((m) => [1, ...(fs ? fs.map(([r, k]) => val(m, 0, r, k) - val(m, 1, r, k)) : [m.xi[0].rating - m.xi[1].rating])]);
    const res = ols(X, y);
    if (!res) { out[name] = null; continue; }
    out[name] = { r2: res.r2, adj: res.adj, n: res.n, home: [res.beta[0], res.se[0]], coef: Object.fromEntries((fs ?? [['', 'rating']]).map(([r, k], i) => [`${k}${r ? '@' + r : ''}`, [res.beta[i + 1], res.se[i + 1]]])) };
  }
  // Streuung der Werte im Feld (Startelf, je Spiel und Mannschaft): woran liegen Unterschiede?
  const spread = {};
  for (const [r, k] of ALL) { const v = ms.flatMap((m) => [val(m, 0, r, k), val(m, 1, r, k)]).filter((x) => x != null); if (!v.length) continue; const mu = v.reduce((s, x) => s + x, 0) / v.length; spread[`${k}@${r}`] = [mu, Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / v.length)]; }
  return { n: ms.length, models: out, spread };
}

const groups = {};
for (const m of M) (groups[m[BY]] ??= []).push(m);
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
const result = {};
for (const [g, ms] of Object.entries(groups)) {
  const a = (result[g] = analyse(ms));
  console.log(`\n== ${BY} ${g}: ${a.n} Spiele`);
  for (const [name, r] of Object.entries(a.models)) if (r) console.log(`  Modell ${name.padEnd(8)} R² ${f(r.r2, 3)} (bereinigt ${f(r.adj, 3)}), Heim-Konstante ${f(r.home[0])} ± ${f(r.home[1])}`);
  const st = a.models.stärke;
  if (st) console.log(`  Stärke: +10 rating Unterschied → ${f(st.coef.rating[0] * 10)} ± ${f(st.coef.rating[1] * 10)} Tore`);
  const all = a.models.alle;
  if (all) {
    const sig = Object.entries(all.coef).map(([k, [b, se]]) => [k, b * 0.1, se * 0.1, b / se]).sort((x, y) => Math.abs(y[3]) - Math.abs(x[3]));
    console.log(`  Wirkung je +0,1 Unterschied (Tore), |t| ≥ 2: ${sig.filter((s) => Math.abs(s[3]) >= 2).map(([k, b, se, t]) => `${k} ${f(b)} ± ${f(se)} (t ${f(t, 1)})`).join(' · ') || 'keine'}`);
  }
  console.log(`  Streuung (SD) im Feld: ${Object.entries(a.spread).filter(([k]) => /@(def|mid|fwd)$/.test(k)).map(([k, [mu, sd]]) => `${k} ${f(mu)}±${f(sd, 3)}`).join(' · ')}`);
}
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(result));
