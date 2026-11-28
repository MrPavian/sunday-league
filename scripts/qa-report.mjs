// Balancing & Simulation QA, Abschnitt A: Auswertung der Messdateien von scripts/qa-league.mjs (nur lesen, nichts simulieren).
//   node scripts/qa-report.mjs <a.jsonl> [b.jsonl …] [--json=out.json] [--by=fmt|lv|pitch]
// Ausgabe: Kennzahlen je Gruppe (Standard: Spielformat) als Text; mit --json zusätzlich alle Werte für Bericht und Diagramme.
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const BY = opt('by') ?? 'fmt';
const M = [], S = [], E = [];
for (const f of files)
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    const o = JSON.parse(line);
    (o.k === 'm' ? M : o.k === 's' ? S : E).push(o);
  }

const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : NaN);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
const pct = (n, d) => (d ? (100 * n) / d : NaN);
const corr = (x, y) => { const mx = mean(x), my = mean(y); const c = sum(x.map((v, i) => (v - mx) * (y[i] - my))); return c / Math.sqrt(sum(x.map((v) => (v - mx) ** 2)) * sum(y.map((v) => (v - my) ** 2))); };
const both = (m, k) => (m[k] ? m[k][0] + m[k][1] : NaN);

function matchStats(ms) {
  const n = ms.length;
  const g = ms.map((m) => m.score[0] + m.score[1]);
  const hg = ms.map((m) => m.score[0]), ag = ms.map((m) => m.score[1]);
  const res = { H: 0, D: 0, A: 0 }, lines = {};
  for (const m of ms) {
    res[m.score[0] > m.score[1] ? 'H' : m.score[0] === m.score[1] ? 'D' : 'A']++;
    const k = `${Math.max(...m.score)}:${Math.min(...m.score)}`;
    lines[k] = (lines[k] ?? 0) + 1;
  }
  const top = Object.entries(lines).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, pct(v, n)]);
  // Schüsse
  const shots = ms.flatMap((m) => m.shots);
  const kinds = { kopf: (s) => s[2] === 1, elfer: (s) => s[3] === 1, strafraum: (s) => s[6] === 1 && !s[2] && !s[3], aussen: (s) => s[6] === 0 && !s[2] && !s[3], ohneStrafraumMass: (s) => s[6] == null && !s[2] && !s[3] };
  const shotKinds = Object.fromEntries(Object.entries(kinds).map(([k, f]) => { const a = shots.filter(f); const goals = a.filter((s) => s[5] === 'g').length; return [k, { n: a.length, perMatch: a.length / n, conv: pct(goals, a.length), xg: mean(a.map((s) => s[4])) }]; }));
  const distBuckets = [[0, 6], [6, 11], [11, 16.5], [16.5, 25], [25, 99]].map(([a, b]) => { const s = shots.filter((x) => !x[3] && x[1] >= a && x[1] < b); return { range: `${a}–${b} m`, n: s.length, conv: pct(s.filter((x) => x[5] === 'g').length, s.length), xg: mean(s.map((x) => x[4])) }; });
  const xgSum = sum(ms.map((m) => m.xg[0] + m.xg[1])), goalsSum = sum(g);
  const shotGoals = shots.filter((s) => s[5] === 'g').length;
  // Ballbesitz, Pässe, Zweikämpfe
  const posShare = ms.map((m) => m.pos[0] / Math.max(1, m.pos[0] + m.pos[1]));
  const passOkPct = pct(sum(ms.map((m) => both(m, 'passOk'))), sum(ms.map((m) => both(m, 'pass'))));
  const pressOkPct = pct(sum(ms.map((m) => both(m, 'ppOk'))), sum(ms.map((m) => both(m, 'pp'))));
  // Spielverlauf: Torminuten (in Spielminuten, 0–90+), Anteil 2. Halbzeit, ab 76.
  const goalMin = ms.flatMap((m) => m.goals.map((x) => x[1]));
  const minBins = Array.from({ length: 6 }, (_, i) => pct(goalMin.filter((x) => (i === 5 ? x > 75 : x > i * 15 && x <= (i + 1) * 15) || (i === 0 && x === 0)).length, goalMin.length));
  // Führung nach dem ersten Tor: Wer zuerst trifft, gewinnt / remis / verliert
  let first = { W: 0, D: 0, L: 0 };
  for (const m of ms) { if (!m.goals.length) continue; const t = m.goals[0][0]; const d = m.score[t] - m.score[1 - t]; first[d > 0 ? 'W' : d === 0 ? 'D' : 'L']++; }
  const firstN = first.W + first.D + first.L;
  // Halbzeitführung (Tore bis Minute 45): Ausgang aus Sicht der Führenden – vergleichbar mit echten Daten (HTHG/HTAG)
  const ht = { W: 0, D: 0, L: 0 };
  for (const m of ms) { const h = [0, 0]; for (const x of m.goals) if (x[1] <= 45) h[x[0]]++; if (h[0] === h[1]) continue; const t = h[0] > h[1] ? 0 : 1; const d = m.score[t] - m.score[1 - t]; ht[d > 0 ? 'W' : d === 0 ? 'D' : 'L']++; }
  const htN = ht.W + ht.D + ht.L;
  // Rote Karten: Ergebnis aus Sicht der Mannschaft mit Rot (nur Spiele mit genau einer roten Karte für eine Seite)
  const redGames = ms.filter((m) => m.r[0] + m.r[1] === 1);
  const redRes = { W: 0, D: 0, L: 0 };
  for (const m of redGames) { const t = m.r[0] ? 0 : 1; const d = m.score[t] - m.score[1 - t]; redRes[d > 0 ? 'W' : d === 0 ? 'D' : 'L']++; }
  // Stärke: Ergebnis gegen Stärkeunterschied (Heim − Gast)
  const dStr = ms.map((m) => m.str[0] - m.str[1]), dGoal = ms.map((m) => m.score[0] - m.score[1]);
  const favBins = [[0, 2], [2, 5], [5, 10], [10, 99]].map(([a, b]) => {
    const s = ms.filter((m) => Math.abs(m.str[0] - m.str[1]) >= a && Math.abs(m.str[0] - m.str[1]) < b);
    let W = 0, D = 0, L = 0;
    for (const m of s) { const f = m.str[0] >= m.str[1] ? 0 : 1; const d = m.score[f] - m.score[1 - f]; d > 0 ? W++ : d === 0 ? D++ : L++; }
    return { range: `${a}–${b}`, n: s.length, fav: pct(W, s.length), draw: pct(D, s.length), under: pct(L, s.length) };
  });
  return {
    n, goals: { mean: mean(g), sd: sd(g), home: mean(hg), away: mean(ag), median: q(g, 0.5), p90: q(g, 0.9), max: Math.max(...g), hist: Array.from({ length: 11 }, (_, i) => pct(g.filter((x) => (i === 10 ? x >= 10 : x === i)).length, n)) },
    result: { H: pct(res.H, n), D: pct(res.D, n), A: pct(res.A, n) },
    lines: { '0:0': pct(lines['0:0'] ?? 0, n), '1:0': pct(lines['1:0'] ?? 0, n), '1:1': pct(lines['1:1'] ?? 0, n), '2:1': pct(lines['2:1'] ?? 0, n), '3:2': pct(lines['3:2'] ?? 0, n), ge5: pct(g.filter((x) => x >= 5).length, n), diff4: pct(ms.filter((m) => Math.abs(m.score[0] - m.score[1]) >= 4).length, n), diff6: pct(ms.filter((m) => Math.abs(m.score[0] - m.score[1]) >= 6).length, n), top },
    shots: { perMatch: mean(ms.map((m) => m.sh[0] + m.sh[1])), onTarget: shots.filter((x) => x[5] === 's' || x[5] === 'g').length / n, // gehalten oder Tor (sim/chances.js result); analytics „shots“ zählt alle Abschlüsse
      attempts: mean(ms.map((m) => both(m, 'sot'))), logged: shots.length / n, goalsPerShot: goalsSum / Math.max(1, sum(ms.map((m) => m.sh[0] + m.sh[1]))), xgPerMatch: xgSum / n, goalsPerXg: goalsSum / xgSum, shotGoalShare: pct(shotGoals, goalsSum), kinds: shotKinds, dist: distBuckets },
    poss: { homeShare: mean(posShare), sdShare: sd(posShare), passes: mean(ms.map((m) => both(m, 'pass'))), passOk: passOkPct, pressShare: pct(sum(ms.map((m) => both(m, 'pp'))), sum(ms.map((m) => both(m, 'pass')))), pressOk: pressOkPct },
    duels: { ground: mean(ms.map((m) => both(m, 'dW'))), aerial: mean(ms.map((m) => both(m, 'aW'))), loose: mean(ms.map((m) => both(m, 'loose'))) },
    discipline: { fouls: mean(ms.map((m) => m.fo[0] + m.fo[1])), yellow: mean(ms.map((m) => m.y[0] + m.y[1])), red: mean(ms.map((m) => m.r[0] + m.r[1])), corners: mean(ms.map((m) => m.cor[0] + m.cor[1])), offside: mean(ms.map((m) => m.off[0] + m.off[1])) },
    flow: { minBins, secondHalf: pct(goalMin.filter((x) => x > 45).length, goalMin.length), firstScorer: { W: pct(first.W, firstN), D: pct(first.D, firstN), L: pct(first.L, firstN) }, htLead: { n: htN, W: pct(ht.W, htN), D: pct(ht.D, htN), L: pct(ht.L, htN) }, red: { n: redGames.length, ...Object.fromEntries(Object.entries(redRes).map(([k, v]) => [k, pct(v, redGames.length)])) } },
    strength: { corrDiff: corr(dStr, dGoal), sdDiff: sd(dStr), fav: favBins },
  };
}

// Tabellen je Saison: Punkte je Spiel, Abstand Meister–Zweiter, Rang gegen Stärke, Wechsel der Meister.
function tableStats(ss) {
  const ppg = [], champ = [], last = [], gap = [], rankCorr = [], champRank = [], humPos = [];
  for (const s of ss) {
    const games = s.rows[0].w + s.rows[0].d + s.rows[0].l;
    const p = s.rows.map((r) => r.pts / games);
    ppg.push(sd(p)); champ.push(p[0]); last.push(p.at(-1)); gap.push(p[0] - p[1]);
    rankCorr.push(corr(s.rows.map((r) => r.str), s.rows.map((r) => -r.pos)));
    const byStr = [...s.rows].sort((a, b) => b.str - a.str);
    champRank.push(byStr.findIndex((r) => r.pos === 1) + 1);
    const h = s.rows.find((r) => r.hum); if (h) humPos.push(h.pos);
  }
  const champRankHist = {};
  for (const r of champRank) champRankHist[r] = (champRankHist[r] ?? 0) + 1;
  return { seasons: ss.length, ppgSd: mean(ppg), champPpg: mean(champ), lastPpg: mean(last), gap12: mean(gap), strRankCorr: mean(rankCorr.filter(Number.isFinite)), champStrongest: pct(champRankHist[1] ?? 0, ss.length), champRankHist, humPos: mean(humPos), levels: [...new Set(ss.map((s) => s.lv))].sort((a, b) => a - b) };
}

const groups = {};
for (const m of M) (groups[m[BY]] ??= []).push(m);
const out = { files, matches: M.length, seasons: S.length, ms: sum(E.map((e) => e.ms)), by: BY, groups: {}, all: matchStats(M), tables: tableStats(S), tablesByLevel: {} };
for (const [k, ms] of Object.entries(groups)) out.groups[k] = matchStats(ms);
const sByLv = {};
for (const s of S) (sByLv[s.lv] ??= []).push(s);
for (const [k, ss] of Object.entries(sByLv)) out.tablesByLevel[k] = tableStats(ss);

const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
console.log(`${M.length} Spiele, ${S.length} Saisontabellen, Rechenzeit ${f(out.ms / 60000)} min (Summe der Prozesse)`);
for (const [k, s] of [['alle', out.all], ...Object.entries(out.groups).map(([k, v]) => [`${BY} ${k}`, v])]) {
  console.log(`\n== ${k}: ${s.n} Spiele`);
  console.log(`Tore Ø ${f(s.goals.mean, 2)} (Heim ${f(s.goals.home, 2)}, Gast ${f(s.goals.away, 2)}) SD ${f(s.goals.sd, 2)} Median ${f(s.goals.median, 0)} P90 ${f(s.goals.p90, 0)} max ${s.goals.max}`);
  console.log(`Ausgang H/U/A ${f(s.result.H)} / ${f(s.result.D)} / ${f(s.result.A)} %; 0:0 ${f(s.lines['0:0'])} · 1:0 ${f(s.lines['1:0'])} · 1:1 ${f(s.lines['1:1'])} · 2:1 ${f(s.lines['2:1'])} · 3:2 ${f(s.lines['3:2'])} · ≥5 Tore ${f(s.lines.ge5)} · Diff ≥4 ${f(s.lines.diff4)} · ≥6 ${f(s.lines.diff6)} %`);
  console.log(`Häufigste: ${s.lines.top.map(([l, p]) => `${l} ${f(p)}`).join(' · ')}`);
  console.log(`Schüsse ${f(s.shots.perMatch)} (aufs Tor, also gehalten oder Tor: ${f(s.shots.onTarget)}; Abschlüsse inkl. Kopfball ${f(s.shots.attempts)}), Tore je Schuss ${f(s.shots.goalsPerShot, 3)}, xG ${f(s.shots.xgPerMatch, 2)}, Tore/xG ${f(s.shots.goalsPerXg, 2)}, Tore nach erfasstem Abschluss ${f(s.shots.shotGoalShare)} %`);
  console.log(`  Arten: ${Object.entries(s.shots.kinds).filter(([, v]) => v.n).map(([k, v]) => `${k} ${f(v.perMatch)}/Spiel Quote ${f(v.conv)} % xG ${f(v.xg, 3)}`).join(' · ')}`);
  console.log(`  Distanz: ${s.shots.dist.filter((d) => d.n).map((d) => `${d.range} n=${d.n} Quote ${f(d.conv)} % xG ${f(d.xg, 3)}`).join(' · ')}`);
  console.log(`Ballbesitz Heim ${f(s.poss.homeShare * 100)} % (SD ${f(s.poss.sdShare * 100)}), Pässe ${f(s.poss.passes, 0)}, angekommen ${f(s.poss.passOk)} %, unter Druck ${f(s.poss.pressShare)} % davon an ${f(s.poss.pressOk)} %`);
  console.log(`Zweikämpfe Boden ${f(s.duels.ground)}, Luft ${f(s.duels.aerial)}, zweite Bälle ${f(s.duels.loose)}; Fouls ${f(s.discipline.fouls)}, Gelb ${f(s.discipline.yellow, 2)}, Rot ${f(s.discipline.red, 3)}, Ecken ${f(s.discipline.corners)}, Abseits ${f(s.discipline.offside)}`);
  console.log(`Torminuten je 15 min ${s.flow.minBins.map((x) => f(x)).join(' / ')} %; 2. Halbzeit ${f(s.flow.secondHalf)} %; wer zuerst trifft S/U/N ${f(s.flow.firstScorer.W)} / ${f(s.flow.firstScorer.D)} / ${f(s.flow.firstScorer.L)} %; Halbzeitführung S/U/N ${f(s.flow.htLead.W)} / ${f(s.flow.htLead.D)} / ${f(s.flow.htLead.L)} %; mit Rot (n=${s.flow.red.n}) S/U/N ${f(s.flow.red.W)} / ${f(s.flow.red.D)} / ${f(s.flow.red.L)} %`);
  console.log(`Stärke: Korrelation Stärkeabstand–Tordifferenz ${f(s.strength.corrDiff, 2)} (SD Abstand ${f(s.strength.sdDiff, 1)}); Favorit S/U/N je Abstand ${s.strength.fav.map((b) => `${b.range}: ${f(b.fav, 0)}/${f(b.draw, 0)}/${f(b.under, 0)} (n=${b.n})`).join(' · ')}`);
}
const t = out.tables;
console.log(`\n== Tabellen: ${t.seasons} Saisons, Ligen ${t.levels.join(', ')}`);
console.log(`Punkte je Spiel: SD ${f(t.ppgSd, 2)}, Meister ${f(t.champPpg, 2)}, Letzter ${f(t.lastPpg, 2)}, Abstand 1–2 ${f(t.gap12, 2)}; Korrelation Stärke–Rang ${f(t.strRankCorr, 2)}; Meister = stärkster Kader ${f(t.champStrongest)} %; Meister nach Kaderrang ${JSON.stringify(t.champRankHist)}; Verein des Menschen (ohne Eingriffe) Ø Platz ${f(t.humPos, 1)}`);
for (const [lv, x] of Object.entries(out.tablesByLevel)) console.log(`  Liga ${lv}: ${x.seasons} Saisons, SD ${f(x.ppgSd, 2)}, Meister ${f(x.champPpg, 2)}, Letzter ${f(x.lastPpg, 2)}, Stärke–Rang ${f(x.strRankCorr, 2)}, Meister = stärkster ${f(x.champStrongest)} %`);
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(out));
