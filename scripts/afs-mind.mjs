// AFS Phase 6b – Spielintelligenz (src/sim/mind.js): Schicht an gegen aus, und Wirkung je Wert auf die Tordifferenz.
//   node scripts/afs-mind.mjs [N=60] [Plätze=rasenplatz,grossfeld] [Bedingungen=off,on,shift:anticipation,shift:vision,shift:positioning]
// Bedingungen: off = MIND.on false (Engine rechnet mit 0,5 für alle); on = Werte wie gewürfelt; shift:<Wert> = an, Mannschaft 0 bekommt
// +SHIFT auf diesen Wert für alle Feldspieler (gegen „on“ mit denselben Seeds und Paarungen). Feste Paarungen, nur der Seed wechselt.
// Ergebnis: Tabellen auf stdout (4 Worker-Threads).
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';

const SHIFT = 0.2;
const PAIRS = [11, 12, 13, 14];

async function runJob({ venue, cond, seed, pair }) {
  const { createMatch, matchDuration, stepMatch } = await import('../src/sim/match.js');
  const { PITCHES } = await import('../src/sim/pitch.js');
  const { createRng } = await import('../src/core/rng.js');
  const { TEAM_PRESETS } = await import('../src/data/teams.js');
  const { generateTeam } = await import('../src/sim/generator.js');
  const { systemFormation } = await import('../src/sim/tactics.js');
  const { MIND } = await import('../src/sim/mind.js');
  const pitch = PITCHES[venue];
  const rng = createRng(pair * 7919);
  const roles = [...systemFormation(pitch.format ?? 5).map((f) => f.role), 'def', 'mid', 'fwd'];
  const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[(pair + i) % TEAM_PRESETS.length], roles), tactic: { style: 'ausgewogen' } }));
  MIND.on = cond !== 'off';
  if (cond.startsWith('shift:')) {
    const k = cond.slice(6);
    for (const p of teams[0].players) if (p.position !== 'gk') p.attrs = { ...p.attrs, [k]: Math.min(0.98, p.attrs[k] + SHIFT) };
  }
  const m = createMatch({ seed, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  const t0 = performance.now();
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  const ms = performance.now() - t0;
  MIND.on = true;
  const t = m.an.teams;
  return { venue, cond, seed, pair, ms, score: m.score, xg: [t[0].xg, t[1].xg], loose: [t[0].loose, t[1].loose], pass: [t[0].pass, t[1].pass], passOk: [t[0].passOk, t[1].passOk], shots: [t[0].shots, t[1].shots] };
}

if (!isMainThread) {
  parentPort.on('message', async (job) => parentPort.postMessage(await runJob(job)));
} else {
  const N = Number(process.argv[2] ?? 60);
  const venues = (process.argv[3] ?? 'rasenplatz,grossfeld').split(',');
  const conds = (process.argv[4] ?? 'off,on,shift:anticipation,shift:vision,shift:positioning').split(',');
  const jobs = [];
  for (const venue of venues) for (const cond of conds) for (const pair of PAIRS) for (let i = 0; i < N; i++) jobs.push({ venue, cond, pair, seed: 30000 + i });
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
  const key = (r) => `${r.venue}|${r.pair}|${r.seed}`;
  for (const venue of venues) {
    const R = results.filter((r) => r.venue === venue);
    const by = (c) => R.filter((r) => r.cond === c);
    console.log(`\n## ${venue} – ${PAIRS.length} Paarungen × ${N} Seeds`);
    console.log('| Bedingung | Tore/Spiel | xG/Mannschaft | Schüsse | Pässe | Passquote | zweite Bälle | ms/Spiel |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const c of ['off', 'on'].filter((c) => conds.includes(c))) {
      const g = by(c);
      const both = (k) => g.flatMap((r) => r[k]);
      console.log(`| ${c} | ${f(mean(g.map((r) => r.score[0] + r.score[1])))} | ${f(mean(both('xg')))} | ${f(mean(both('shots')), 1)} | ${f(mean(both('pass')), 1)} | ${f(mean(g.flatMap((r) => [r.passOk[0] / (r.pass[0] || 1), r.passOk[1] / (r.pass[1] || 1)])) * 100, 1)} % | ${f(mean(both('loose')), 1)} | ${f(mean(g.map((r) => r.ms)), 0)} |`);
    }
    const on = new Map(by('on').map((r) => [key(r), r]));
    console.log(`\n| Verschiebung (+${f(SHIFT, 1)}, Mannschaft 0) | Δ Tordifferenz | t | Δ xG-Differenz | t | Δ zweite Bälle (Anteil) | t |`);
    console.log('|---|---|---|---|---|---|---|');
    for (const c of conds.filter((c) => c.startsWith('shift:'))) {
      const pairs = by(c).map((r) => [r, on.get(key(r))]).filter(([, b]) => b);
      const diff = (fn) => pairs.map(([a, b]) => fn(a) - fn(b));
      const stat = (d) => [mean(d), mean(d) / (sd(d) / Math.sqrt(d.length))];
      const gd = stat(diff((r) => r.score[0] - r.score[1]));
      const xd = stat(diff((r) => r.xg[0] - r.xg[1]));
      const ls = stat(diff((r) => r.loose[0] / (r.loose[0] + r.loose[1] || 1)));
      console.log(`| ${c.slice(6)} | ${f(gd[0], 3)} | ${f(gd[1], 1)} | ${f(xd[0], 3)} | ${f(xd[1], 1)} | ${f(ls[0], 3)} | ${f(ls[1], 1)} |`);
    }
  }
}
