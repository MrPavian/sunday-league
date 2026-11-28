// Balancing & Simulation QA, Phase 6 (docs/BALANCING-QA-AUFTRAG.md): Extrem- und Grenzfälle. Nur Messung, ändert keinen Spielcode.
// Grundkader wie scripts/qa-attr-exp.mjs (angehoben auf ein Niveau). Testmannschaft = Grundkader mit einer Veränderung (FALL),
// Gegner = unveränderter Grundkader. Gleicher Kader und Seed in allen Fällen, Seiten im Wechsel. KI-Trainer wie im Spiel an.
// Die Stärke der Veränderungen sind Versuchswerte (gewählt, nicht recherchiert) – Ziel ist die Plausibilität am Rand.
//   node scripts/qa-extreme.mjs run <Platz> <Niveau> <Kader> <Start> > teil.json
//   node scripts/qa-extreme.mjs sum a.json b.json …
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { MIND_SET } from '../src/sim/mind.js';
import { lifted } from '../src/sim/niveau.js';
import { PITCHES } from '../src/sim/pitch.js';
import { sendOff } from '../src/sim/referee.js';
import { normalizeTactic, systemFormation } from '../src/sim/tactics.js';

const add = (ps, f) => ps.map((p) => ({ ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, f(k, v, p)])) }));
const field = (p) => p.position !== 'gk';
const all = (d) => (ps) => add(ps, (k, v) => (MIND_SET.has(k) ? v : Math.max(0.05, v + d)));
// Fälle: players(ps, niv) → Spieler der Testmannschaft; tactic → Taktik; off → Zeitpunkt (Anteil der Spielzeit) eines Platzverweises.
const CASES = {
  gleich: {},
  stark_gegen_schwach: { players: all(0.3) },
  schwach_gegen_stark: { players: all(-0.3) },
  drei_niveaus_hoeher: { niveau: 3 },
  alle_schnell: { players: (ps) => add(ps, (k, v, p) => (k === 'pace' && field(p) ? Math.max(v, 0.95) : v)) },
  alle_technik: { players: (ps) => add(ps, (k, v, p) => (k === 'technique' && field(p) ? v + 0.3 : v)) },
  alle_kopfball: { players: (ps) => add(ps, (k, v, p) => ((k === 'heading' || k === 'strength') && field(p) ? Math.max(v, 0.95) : v)) },
  sehr_defensiv: { tactic: { style: 'mauern', orders: { press: 'tief', shape: 'kompakt' } } },
  maximal_offensiv: { tactic: { style: 'offensiv', orders: { press: 'hoch', shape: 'aufruecken', route: 'tiefe' } } },
  stammspieler_verletzt: { players: (ps) => { // bestes Drittel der Feldspieler durch schwächere Ersatzleute (−0,2 auf alle Werte)
    const top = new Set(ps.filter(field).sort((a, b) => b.rating - a.rating).slice(0, Math.ceil(ps.filter(field).length / 3)).map((p) => p.id ?? p.name));
    return add(ps, (k, v, p) => (top.has(p.id ?? p.name) && !MIND_SET.has(k) ? Math.max(0.05, v - 0.2) : v));
  } },
  unterzahl_ab_anpfiff: { off: 0 },
  unterzahl_ab_halbzeit: { off: 0.5 },
  fitness_60: { players: (ps) => ps.map((p) => ({ ...p, fitness: 0.6 })) },
  jung_gegen_alt: { players: (ps) => ps.map((p) => ({ ...p, age: 19 })), oppAge: 33 },
};

const [mode, pitchId, nivArg, nArg, fromArg] = process.argv.slice(2);

if (mode === 'sum') {
  const rows = process.argv.slice(3).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).rows);
  const meta = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const out = {};
  for (const c of Object.keys(CASES)) {
    const rs = rows.filter((r) => r.c === c);
    if (!rs.length) continue;
    const mean = (f) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
    const gd = mean((r) => r.gf - r.ga), sd = Math.sqrt(mean((r) => (r.gf - r.ga - gd) ** 2));
    const pct = (f) => +(100 * mean((r) => (f(r) ? 1 : 0))).toFixed(1);
    const top = {};
    for (const r of rs) { const k = `${r.gf}:${r.ga}`; top[k] = (top[k] ?? 0) + 1; }
    out[c] = { n: rs.length, gd: +gd.toFixed(2), se: +(sd / Math.sqrt(rs.length)).toFixed(2), w: pct((r) => r.gf > r.ga), d: pct((r) => r.gf === r.ga), l: pct((r) => r.gf < r.ga),
      gf: +mean((r) => r.gf).toFixed(2), ga: +mean((r) => r.ga).toFixed(2), goals: +mean((r) => r.gf + r.ga).toFixed(2), sh: +mean((r) => r.sh).toFixed(1), shA: +mean((r) => r.shA).toFixed(1),
      pos: +mean((r) => r.pos).toFixed(1), margin4: pct((r) => Math.abs(r.gf - r.ga) >= 4), maxGf: Math.max(...rs.map((r) => r.gf)), maxGoals: Math.max(...rs.map((r) => r.gf + r.ga)),
      common: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round((100 * v) / rs.length)}%`) };
  }
  console.log(JSON.stringify({ pitch: meta.pitch, niveau: meta.niveau, cases: out }));
  process.exit(0);
}
if (mode !== 'run') throw new Error('Modus: run | sum');

const pitch = PITCHES[pitchId ?? 'grossfeld'];
const NIV = +nivArg || 1, N = +nArg || 20, from = +fromArg || 0;
const format = pitch.format ?? 5;
const BENCH = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH[format] ?? [])];
const rows = [];
for (let i = from; i < from + N; i++) {
  const raw = generateTeam(createRng(3000 + i), TEAM_PRESETS[0], roles).players;
  const base = raw.map((p) => lifted(p, NIV));
  for (const [c, cs] of Object.entries(CASES)) {
    let mine = cs.niveau ? raw.map((p) => lifted(p, NIV + cs.niveau)) : base;
    if (cs.players) mine = cs.players(mine);
    const opp = cs.oppAge ? base.map((p) => ({ ...p, age: cs.oppAge })) : base;
    for (const side of [0, 1]) {
      const T = (t, ps, tac) => ({ ...TEAM_PRESETS[t], ...(tac ? { tactic: { ...TEAM_PRESETS[t].tactic, ...tac } } : null), players: ps });
      const me = T(side, mine, cs.tactic), them = T(1 - side, opp, null);
      const m = createMatch({ seed: 9000 + i, pitch, human: false, teams: side === 0 ? [me, them] : [them, me] });
      let offDone = cs.off == null, shots = [0, 0];
      while (m.phase !== 'ended') {
        if (!offDone && m.phase === 'play' && m.time >= cs.off * m.duration) {
          const p = m.players.find((q) => q.team === side && q.role === 'mid') ?? m.players.find((q) => q.team === side && q.role !== 'gk');
          if (p) sendOff(m, p);
          offDone = true;
        }
        stepMatch(m, undefined, 1 / 60);
        for (const e of m.events) if (e.type === 'shot') { const t = m.players.find((q) => q.id === e.playerId)?.team; if (t != null) shots[t]++; }
        m.events.length = 0;
      }
      const st = m.stats.teams;
      rows.push({ c, i, side, gf: m.score[side], ga: m.score[1 - side], sh: shots[side], shA: shots[1 - side], pos: +((100 * st[side].possession) / Math.max(1e-9, st[0].possession + st[1].possession)).toFixed(1) });
    }
  }
}
console.log(JSON.stringify({ pitch: pitch.id, niveau: NIV, n: rows.length, rows }));
