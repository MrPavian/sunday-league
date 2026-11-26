// AFS Phase 3 – Validierung der Spieldaten (sim/analytics.js): Streuung, Mindeststichprobe, Reaktion auf Taktik, Zuverlässigkeit
// der Spielerwerte, Abhängigkeit der Kennzahlen, Zusammenhang mit Toren. Feste Mannschaften je Platz; nur Seed und Befehl wechseln.
//   node scripts/afs-validate.mjs [N=40] [Plätze=rasenplatz,grossfeld] [Basis-Spiele=80]   (4 Worker-Threads)
// Ergebnis: Tabellen auf stdout, Rohdaten nach $AFS_OUT (wenn gesetzt).
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';

const CONDS = {
  base: [],
  'press:hoch': [['press', 'hoch']],
  'press:tief': [['press', 'tief']],
  'build:kurz': [['build', 'kurz']],
  'build:direkt': [['build', 'direkt']],
  'route:aussen': [['route', 'aussen']],
  'route:mitte': [['route', 'mitte']],
  'style:offensiv': 'offensiv',
  'style:mauern': 'mauern',
};
const PAIRS = [11, 12]; // zwei feste Paarungen je Platz (mehr Spieler für die Zuverlässigkeit)

async function runJob({ venue, cond, seed, pair }) {
  const { createMatch, matchDuration, stepMatch } = await import('../src/sim/match.js');
  const { PITCHES } = await import('../src/sim/pitch.js');
  const { createRng } = await import('../src/core/rng.js');
  const { TEAM_PRESETS } = await import('../src/data/teams.js');
  const { generateTeam } = await import('../src/sim/generator.js');
  const { systemFormation } = await import('../src/sim/tactics.js');
  const { setOrder } = await import('../src/sim/plan.js');
  const { allPlayers } = await import('../src/sim/squad.js');
  const pitch = PITCHES[venue];
  const rng = createRng(pair * 7919);
  const roles = [...systemFormation(pitch.format ?? 5).map((f) => f.role), 'def', 'mid', 'fwd'];
  const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[(pair + i) % TEAM_PRESETS.length], roles), tactic: { style: 'ausgewogen' } }));
  const m = createMatch({ seed, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  const c = CONDS[cond];
  if (typeof c === 'string') {
    m.plan[0] = { ...m.plan[0], style: c };
    m.modsCache = null;
  } else for (const [g, v] of c) setOrder(m, 0, g, v);
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  const an = m.an;
  const players = [];
  for (const p of allPlayers(m)) {
    const r = an.players[p.id];
    const st = m.stats.players[p.id];
    if (!r || !st || st.seconds <= 0) continue;
    players.push({ key: `${venue}:${pair}:${p.team}:${p.name}`, role: p.role, share: st.seconds / m.duration, ...r });
  }
  return { venue, cond, seed, pair, score: m.score, teams: an.teams, players };
}


// ---------------------------------------------------------------- Auswertung
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, a.length - 1)); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) (n += (a[i] - ma) * (b[i] - mb)), (da += (a[i] - ma) ** 2), (db += (b[i] - mb) ** 2); return da && db ? n / Math.sqrt(da * db) : NaN; };
const ratio = (a, b) => (b > 0 ? a / b : null);
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? '–' : x.toFixed(d));

// Kennzahlen je Mannschaft und Spiel (t = eigene, o = Gegner). share: Anteil, sonst Anzahl.
const TEAM_METRICS = {
  passes: { v: (t) => t.pass },
  passPct: { v: (t) => ratio(t.passOk, t.pass), share: true },
  pressShare: { v: (t) => ratio(t.pressPass, t.pass), share: true },
  pressPct: { v: (t) => ratio(t.pressPassOk, t.pressPass), share: true },
  packingPerPass: { v: (t) => ratio(t.packing, t.passOk) },
  linesPerPass: { v: (t) => ratio(t.lines, t.passOk) },
  duelPct: { v: (t) => ratio(t.duelWon, t.duelWon + t.duelLost), share: true },
  duels: { v: (t) => t.duelWon + t.duelLost },
  aerials: { v: (t) => t.aerialWon + t.aerialLost },
  looseShare: { v: (t, o) => ratio(t.loose, t.loose + o.loose), share: true },
  shots: { v: (t) => t.shots },
  xg: { v: (t) => t.xg },
  xa: { v: (t) => t.xa },
  tilt: { v: (t, o) => ratio(t.third[2], t.third[2] + o.third[2]), share: true },
  oppPressShare: { v: (t, o) => ratio(o.pressPass, o.pass), share: true },
  oppPassPct: { v: (t, o) => ratio(o.passOk, o.pass), share: true },
};
const teamVal = (r, side, k) => TEAM_METRICS[k].v(r.teams[side], r.teams[1 - side]);

function analyze(results, venues, N) {
  for (const venue of venues) {
    const R = results.filter((r) => r.venue === venue);
    const base = R.filter((r) => r.cond === 'base');
    console.log(`\n## ${venue} – Basis ${base.length} Spiele × 2 Mannschaften`);
    console.log('| Kennzahl | Mittel | SD | Mindest-n (95 %-KI ±10 % bzw. ±0,05) |');
    console.log('|---|---|---|---|');
    for (const k of Object.keys(TEAM_METRICS)) {
      const vals = base.flatMap((r) => [teamVal(r, 0, k), teamVal(r, 1, k)]).filter((x) => x != null);
      const mu = mean(vals), s = sd(vals);
      const half = TEAM_METRICS[k].share ? 0.05 : 0.1 * mu;
      console.log(`| ${k} | ${f(mu)} | ${f(s)} | ${half > 0 ? Math.ceil((1.96 * s / half) ** 2) : '–'} |`);
    }
    // Taktik: Befehl der Mannschaft 0 gegen Basis (Mannschaft 0 ohne Befehl, gleiche Seeds und Paarungen).
    console.log('\n| Bedingung | ' + Object.keys(TEAM_METRICS).join(' | ') + ' |');
    console.log('|---|' + Object.keys(TEAM_METRICS).map(() => '---').join('|') + '|');
    const cmp = {};
    for (const cond of Object.keys(CONDS)) {
      const rows = R.filter((r) => r.cond === cond && r.seed < 20000 + N); // Basis: dieselben Seeds wie die Befehle
      cmp[cond] = Object.fromEntries(Object.keys(TEAM_METRICS).map((k) => [k, rows.map((r) => teamVal(r, 0, k)).filter((x) => x != null)]));
      console.log(`| ${cond} | ` + Object.keys(TEAM_METRICS).map((k) => f(mean(cmp[cond][k]))).join(' | ') + ' |');
    }
    const H = [
      ['press:hoch', 'press:tief', 'tilt', +1], ['press:hoch', 'press:tief', 'oppPressShare', +1], ['press:hoch', 'press:tief', 'oppPassPct', -1],
      ['build:kurz', 'build:direkt', 'passes', +1], ['build:kurz', 'build:direkt', 'passPct', +1], ['build:kurz', 'build:direkt', 'packingPerPass', -1],
      ['style:mauern', 'style:offensiv', 'tilt', -1], ['style:mauern', 'style:offensiv', 'xg', -1],
      ['route:aussen', 'route:mitte', 'aerials', +1],
    ];
    console.log('\n| Hypothese | A | B | Differenz | t | erfüllt |');
    console.log('|---|---|---|---|---|---|');
    for (const [a, b, k, dir] of H) {
      const A = cmp[a][k], B = cmp[b][k];
      const d = mean(A) - mean(B);
      const t = d / Math.sqrt(sd(A) ** 2 / A.length + sd(B) ** 2 / B.length);
      console.log(`| ${k}: ${a} ${dir > 0 ? '>' : '<'} ${b} | ${f(mean(A))} | ${f(mean(B))} | ${f(d)} | ${f(t, 1)} | ${Math.sign(d) === dir && Math.abs(t) >= 2 ? 'ja' : 'nein'} |`);
    }
    // Abhängigkeit: Korrelationen über alle Basis-Spiele (beide Mannschaften), nur |r| ≥ 0,7.
    const keys = Object.keys(TEAM_METRICS);
    const cols = Object.fromEntries(keys.map((k) => [k, base.flatMap((r) => [teamVal(r, 0, k), teamVal(r, 1, k)])]));
    const high = [];
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        const ok = cols[keys[i]].map((x, n) => x != null && cols[keys[j]][n] != null);
        const r = corr(cols[keys[i]].filter((_, n) => ok[n]), cols[keys[j]].filter((_, n) => ok[n]));
        if (Math.abs(r) >= 0.7) high.push(`${keys[i]}~${keys[j]} ${f(r)}`);
      }
    console.log(`\nStark abhängig (|r| ≥ 0,7): ${high.join('; ') || 'keine'}`);
    // Zusammenhang mit Toren (alle Spiele dieses Platzes, Sicht Mannschaft 0).
    const gd = R.map((r) => r.score[0] - r.score[1]);
    const xgd = R.map((r) => r.teams[0].xg - r.teams[1].xg);
    const tilt = R.map((r) => teamVal(r, 0, 'tilt') ?? 0.5);
    const goals = R.flatMap((r) => r.score), xgs = R.flatMap((r) => [r.teams[0].xg, r.teams[1].xg]);
    console.log(`Tore ~ xG: r ${f(corr(xgs, goals))}; Tordifferenz ~ xG-Differenz: r ${f(corr(xgd, gd))}; Tordifferenz ~ Field Tilt: r ${f(corr(tilt, gd))}; Tore/xG gesamt ${f(mean(goals) / mean(xgs))}`);
    // Spieler: Zuverlässigkeit (gerade gegen ungerade Basis-Spiele), Spearman-Brown, Spiele für 0,7.
    const P = {};
    for (const r of base) for (const p of r.players) (P[p.key] ??= { role: p.role, half: [[], []] }).half[r.seed % 2].push(p);
    const PM = {
      passPerShare: (ps) => ratio(ps.reduce((s, p) => s + p.pass, 0), ps.reduce((s, p) => s + p.share, 0)),
      passPct: (ps) => ratio(ps.reduce((s, p) => s + p.passOk, 0), ps.reduce((s, p) => s + p.pass, 0)),
      packingPerPass: (ps) => ratio(ps.reduce((s, p) => s + p.packing, 0), ps.reduce((s, p) => s + p.passOk, 0)),
      duelPct: (ps) => ratio(ps.reduce((s, p) => s + p.duelWon, 0), ps.reduce((s, p) => s + p.duelWon + p.duelLost, 0)),
      loosePerShare: (ps) => ratio(ps.reduce((s, p) => s + p.loose, 0), ps.reduce((s, p) => s + p.share, 0)),
      xgPerShare: (ps) => ratio(ps.reduce((s, p) => s + p.xg, 0), ps.reduce((s, p) => s + p.share, 0)),
      xaPerShare: (ps) => ratio(ps.reduce((s, p) => s + p.xa, 0), ps.reduce((s, p) => s + p.share, 0)),
    };
    const outfield = Object.values(P).filter((x) => x.role !== 'gk' && x.half[0].length >= 5 && x.half[1].length >= 5);
    const perHalf = mean(outfield.map((x) => (x.half[0].length + x.half[1].length) / 2));
    console.log(`\nSpieler (Feld, je ≥ 5 Spiele in beiden Hälften): ${outfield.length}, Ø ${f(perHalf, 0)} Spiele je Hälfte`);
    console.log('| Spielerwert | r (Hälften) | Zuverlässigkeit (alle) | Spiele für 0,7 |');
    console.log('|---|---|---|---|');
    for (const [k, fn] of Object.entries(PM)) {
      const a = [], b = [];
      for (const x of outfield) {
        const u = fn(x.half[0]), v = fn(x.half[1]);
        if (u != null && v != null) a.push(u), b.push(v);
      }
      const r = corr(a, b);
      const full = (2 * r) / (1 + r);
      const need = r > 0 ? Math.ceil(perHalf * ((0.7 * (1 - r)) / (r * 0.3))) : null;
      console.log(`| ${k} | ${f(r)} | ${f(full)} | ${need ?? '–'} |`);
    }
  }
}

// ---------------------------------------------------------------- Start (am Ende: die Auswertung oben ist dann definiert)
if (!isMainThread) {
  parentPort.on('message', async (jobs) => {
    const out = [];
    for (const j of jobs) out.push(await runJob(j));
    parentPort.postMessage(out);
  });
} else {
  const N = Number(process.argv[2] ?? 40);
  const venues = (process.argv[3] ?? 'rasenplatz,grossfeld').split(',');
  const NB = Number(process.argv[4] ?? 80);
  const jobs = [];
  for (const venue of venues)
    for (const pair of PAIRS)
      for (const cond of Object.keys(CONDS)) {
        const n = cond === 'base' ? NB : N;
        for (let i = 0; i < n; i++) jobs.push({ venue, cond, pair, seed: 20000 + i });
      }
  const W = Math.min(4, cpus().length);
  const parts = Array.from({ length: W }, (_, w) => jobs.filter((_, k) => k % W === w));
  const t0 = Date.now();
  const results = (await Promise.all(parts.map((part) => new Promise((res, rej) => {
    const w = new Worker(new URL(import.meta.url), { workerData: {} });
    w.once('message', (r) => (w.terminate(), res(r)));
    w.once('error', rej);
    w.postMessage(part);
  })))).flat();
  if (process.env.AFS_OUT) writeFileSync(process.env.AFS_OUT, JSON.stringify(results));
  console.log(`${results.length} Spiele in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  analyze(results, venues, N);
}
void workerData;
