// AFS Phase 8 – Matchplan der CPU (src/intel/matchplan.js): Wirken die Gegenmittel aus career/patterns.js in der heutigen Engine?
//   node scripts/afs-plan.mjs [N=40] [Plätze=hinterhof,rasenplatz,grossfeld]
// Mannschaft 0 läuft mit der Handschrift auf (PATTERNS[x].orders), Mannschaft 1 einmal ohne Befehl, einmal mit dem Gegenmittel
// (PATTERNS[x].counter). Gleiche Seeds und Paarungen, gepaarter Vergleich aus Sicht von Mannschaft 1. Ergebnis: Tabelle auf stdout.
import { isMainThread, parentPort, Worker } from 'node:worker_threads';
import { cpus } from 'node:os';

const PAIRS = [11, 12, 13, 14];

async function runJob({ venue, pattern, cond, seed, pair }) {
  const { createMatch, matchDuration, stepMatch } = await import('../src/sim/match.js');
  const { PITCHES } = await import('../src/sim/pitch.js');
  const { createRng } = await import('../src/core/rng.js');
  const { TEAM_PRESETS } = await import('../src/data/teams.js');
  const { generateTeam } = await import('../src/sim/generator.js');
  const { systemFormation } = await import('../src/sim/tactics.js');
  const { PATTERNS } = await import('../src/career/patterns.js');
  const pitch = PITCHES[venue];
  const rng = createRng(pair * 7919);
  const roles = [...systemFormation(pitch.format ?? 5).map((f) => f.role), 'def', 'mid', 'fwd'];
  const P = PATTERNS[pattern];
  const orders = [{ ...P.orders }, cond === 'counter' ? { [P.counter.group]: P.counter.value } : {}];
  const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[(pair + i) % TEAM_PRESETS.length], roles), tactic: { style: 'ausgewogen', orders: orders[i] } }));
  const m = createMatch({ seed, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  const t = m.an.teams;
  return { venue, pattern, cond, seed, pair, score: m.score, xg: [t[0].xg, t[1].xg] };
}

if (!isMainThread) {
  parentPort.on('message', async (job) => parentPort.postMessage(await runJob(job)));
} else {
  const { PATTERNS } = await import('../src/career/patterns.js');
  const N = Number(process.argv[2] ?? 40);
  const venues = (process.argv[3] ?? 'hinterhof,rasenplatz,grossfeld').split(',');
  const patterns = Object.keys(PATTERNS).filter((k) => PATTERNS[k].counter);
  const jobs = [];
  for (const venue of venues) for (const pattern of patterns) for (const cond of ['none', 'counter']) for (const pair of PAIRS) for (let i = 0; i < N; i++) jobs.push({ venue, pattern, cond, pair, seed: 40000 + i });
  const results = [];
  const W = Math.min(4, cpus().length);
  await new Promise((done) => {
    let next = 0, busy = 0;
    const workers = Array.from({ length: W }, () => new Worker(new URL(import.meta.url)));
    const feed = (w) => {
      if (next >= jobs.length) { if (!busy) { workers.forEach((x) => x.terminate()); done(); } return; }
      busy++; w.postMessage(jobs[next++]);
    };
    for (const w of workers) {
      w.on('message', (r) => { results.push(r); busy--; feed(w); });
      feed(w);
    }
  });
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const sd = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, a.length - 1)); };
  const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
  const key = (r) => `${r.venue}|${r.pattern}|${r.pair}|${r.seed}`;
  console.log(`\n${PAIRS.length} Paarungen × ${N} Seeds je Platz und Handschrift; Sicht der Mannschaft, die das Gegenmittel setzt`);
  console.log('| Platz | Handschrift | Gegenmittel | Tordifferenz ohne | mit | Δ | t | Δ xG-Differenz | t |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const venue of venues) for (const pattern of patterns) {
    const R = results.filter((r) => r.venue === venue && r.pattern === pattern);
    const none = new Map(R.filter((r) => r.cond === 'none').map((r) => [key(r), r]));
    const pairs = R.filter((r) => r.cond === 'counter').map((r) => [r, none.get(key(r))]).filter(([, b]) => b);
    const gd = (r) => r.score[1] - r.score[0];
    const xd = (r) => r.xg[1] - r.xg[0];
    const dg = pairs.map(([a, b]) => gd(a) - gd(b));
    const dx = pairs.map(([a, b]) => xd(a) - xd(b));
    const t = (d) => mean(d) / (sd(d) / Math.sqrt(d.length));
    const c = PATTERNS[pattern].counter;
    console.log(`| ${venue} | ${pattern} | ${c.group}:${c.value} | ${f(mean(pairs.map(([, b]) => gd(b))))} | ${f(mean(pairs.map(([a]) => gd(a))))} | ${f(mean(dg), 3)} | ${f(t(dg), 1)} | ${f(mean(dx), 3)} | ${f(t(dx), 1)} |`);
  }
}
