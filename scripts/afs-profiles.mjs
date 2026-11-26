// AFS Phase 5: Schrumpfungskonstante k je Spielerwert messen (src/intel/profiles.js PROFILE.k).
// Eingabe: Rohdaten aus scripts/afs-validate.mjs (AFS_OUT=… node scripts/afs-validate.mjs 40 rasenplatz,grossfeld 80).
// Aufruf: node scripts/afs-profiles.mjs <AFS_OUT-Datei>
// Verfahren: je Feldspieler (Basis-Spiele, gleiche Paarung) Blöcke aus n Einsätzen als Stichprobe, alle übrigen Einsätze als
// Wahrheit; Fehler des geschrumpften Werts (Summe + k · Rollenmittel ohne den Spieler) / (Spielanteil + k) über k von 0 bis 80.
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.argv[2]));
const METRICS = { pass: (p) => p.pass, xg: (p) => p.xg, duel: (p) => p.duelWon + p.duelLost };
const NS = [3, 5, 8, 14, 20, 30];
const REL = {};
const KS = Array.from({ length: 161 }, (_, i) => i * 0.5);
for (const venue of ['rasenplatz', 'grossfeld']) {
  const games = R.filter((g) => g.cond === 'base' && g.venue === venue).sort((a, b) => a.seed - b.seed || a.pair - b.pair);
  const byP = new Map();
  for (const g of games) for (const p of g.players) {
    if (p.role === 'gk' || p.share < 0.05) continue;
    if (!byP.has(p.key)) byP.set(p.key, { role: p.role, m: [] });
    byP.get(p.key).m.push(p);
  }
  const players = [...byP.entries()].filter(([, v]) => v.m.length >= 60);
  console.log(`\n## ${venue}: ${players.length} Feldspieler, Einsätze je Spieler ${Math.min(...players.map(([, v]) => v.m.length))}–${Math.max(...players.map(([, v]) => v.m.length))}`);
  console.log('| Wert | n | k (beste) | Fehler roh | Fehler k | Fehler Rollenmittel | Rang-Korr. zweier Blöcke roh / k |');
  for (const [mk, f] of Object.entries(METRICS)) {
    const rate = (ms) => ms.reduce((s, p) => s + f(p), 0) / ms.reduce((s, p) => s + p.share, 0);
    for (const n of NS) {
      const err = KS.map(() => 0); let cnt = 0; const pairs = [];
      for (const [key, v] of players) {
        const others = players.filter(([k2, v2]) => k2 !== key && v2.role === v.role);
        const mu = others.reduce((s, [, v2]) => s + rate(v2.m), 0) / others.length; // Rollenmittel ohne den Spieler
        const blocks = Math.floor(v.m.length / n);
        const est = [];
        for (let b = 0; b < blocks; b++) {
          const tr = v.m.slice(b * n, b * n + n), te = [...v.m.slice(0, b * n), ...v.m.slice(b * n + n)];
          const sv = tr.reduce((s, p) => s + f(p), 0), ss = tr.reduce((s, p) => s + p.share, 0), truth = rate(te);
          KS.forEach((k, i) => { err[i] += ((sv + k * mu) / (ss + k) - truth) ** 2; });
          cnt++;
          if (b < 2) est.push({ sv, ss, mu });
        }
        if (est.length === 2) pairs.push(est);
      }
      const mse = err.map((e) => e / cnt);
      let bi = 0; mse.forEach((e, i) => { if (e < mse[bi]) bi = i; });
      const kBest = KS[bi];
      const rank = (a) => { const s = a.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]); const r = []; s.forEach(([, i], j) => (r[i] = j)); return r; };
      const spear = (a, b) => { const ra = rank(a), rb = rank(b), m = (ra.length - 1) / 2; let num = 0, da = 0, db = 0; ra.forEach((x, i) => { num += (x - m) * (rb[i] - m); da += (x - m) ** 2; db += (rb[i] - m) ** 2; }); return num / Math.sqrt(da * db); };
      // Rangkorrelation innerhalb der Rolle: Wert minus Rollenmittel
      const val = (e, k) => (e.sv + k * e.mu) / (e.ss + k) - e.mu;
      const r0 = spear(pairs.map((p) => val(p[0], 0)), pairs.map((p) => val(p[1], 0)));
      const rk = spear(pairs.map((p) => val(p[0], kBest)), pairs.map((p) => val(p[1], kBest)));
      const eMu = mse[mse.length - 1];
      (REL[mk] ??= []).push(mse.map((e) => e / mse[bi]));
      const at = (k) => (mse[KS.indexOf(k)] / mse[bi]).toFixed(2);
      console.log(`  rel. Fehler bei k=5/10/15/22: ${at(5)} ${at(10)} ${at(15)} ${at(22)}`);
      console.log(`| ${mk} | ${n} | ${kBest} | ${mse[0].toFixed(4)} | ${mse[bi].toFixed(4)} | ${eMu.toFixed(4)} (k=80) | ${r0.toFixed(2)} / ${rk.toFixed(2)} |`);
    }
  }
}

console.log('\n## ein k je Wert für beide Plätze (größter relativer Fehler über Plätze und n)');
for (const [mk, rows] of Object.entries(REL)) {
  let best = 0, bw = Infinity;
  KS.forEach((k, i) => { const w = Math.max(...rows.map((r) => r[i])); if (w < bw) { bw = w; best = k; } });
  console.log(`${mk}: k=${best}, schlechtester Fall ${bw.toFixed(2)}× des je Platz und n besten Fehlers`);
}
