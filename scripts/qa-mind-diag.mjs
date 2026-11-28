// Balancing & Simulation QA: Diagnose der Spielintelligenz (sim/mind.js, Schicht standardmäßig aus). Nur Messung, ändert keinen
// Spielcode (Schalter MIND.on und Stellschrauben MIND_FX werden nur in diesem Prozess gesetzt).
// Frage: Kostet die Verhaltensänderung eines schwachen Werts im Spiel überhaupt etwas – örtlich (zweite Bälle, Steilpässe,
// zugelassene Schüsse) und im Ergebnis?
// Aufbau: Grundkader wie scripts/qa-attr-exp.mjs (angehoben auf ein Niveau). Beide Mannschaften haben alle drei Werte auf
// MIND_FX.hi (0,75 = fehlerfrei); die Testmannschaft bekommt in einer Variante einen Wert auf MIND_FX.lo (0,15 = volle Schwäche).
// Gleicher Kader und Seed in allen Varianten, Seiten im Wechsel – Vergleich gepaart mit der Kontrolle.
//   node scripts/qa-mind-diag.mjs run <Platz> <Niveau> <Kader> <Start> > teil.json
//   node scripts/qa-mind-diag.mjs sum a.json b.json …
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam } from '../src/sim/generator.js';
import { createChanceLog, feedChances } from '../src/sim/chances.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { MIND, MIND_FX, MIND_KEYS } from '../src/sim/mind.js';
import { lifted } from '../src/sim/niveau.js';
import { PITCHES } from '../src/sim/pitch.js';
import { normalizeTactic, systemFormation } from '../src/sim/tactics.js';

const FX0 = { ...MIND_FX };
// Varianten: Wert der Testmannschaft auf lo; fx überschreibt Stellschrauben (nur für diese Variante).
const VARIANTS = {
  kontrolle: { key: null },
  antizipation: { key: 'anticipation' },
  uebersicht: { key: 'vision' },
  stellung: { key: 'positioning' },
  stellung_nur_zug: { key: 'positioning', fx: { caught: 0 } },
  stellung_nur_rueckweg: { key: 'positioning', fx: { pull: 0 } },
  stellung_zug_doppelt: { key: 'positioning', fx: { caught: 0, pull: 2 * FX0.pull } },
};
const AFTER = 8; // s: Schüsse derselben Mannschaft bis so lange nach einem Steilpass zählen als dessen Folge (Spielwert der Messung)

const [mode, pitchId, nivArg, nArg, fromArg] = process.argv.slice(2);

if (mode === 'sum') {
  const rows = process.argv.slice(3).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).rows);
  const meta = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const ctrl = new Map(rows.filter((r) => r.v === 'kontrolle').map((r) => [`${r.i}:${r.side}`, r]));
  const KEYS = ['gd', 'gf', 'ga', 'xgf', 'xga', 'shf', 'sha', 'loose', 'looseOpp', 'thr', 'thrXg', 'passPct'];
  const out = {};
  for (const v of Object.keys(VARIANTS)) {
    const rs = rows.filter((r) => r.v === v);
    const res = {};
    for (const k of KEYS) {
      const vals = rs.map((r) => r[k]).filter((x) => x != null), mu = vals.reduce((s, x) => s + x, 0) / vals.length;
      const d = rs.map((r) => r[k] - ctrl.get(`${r.i}:${r.side}`)[k]).filter(Number.isFinite);
      const dm = d.reduce((s, x) => s + x, 0) / d.length, sd = Math.sqrt(d.reduce((s, x) => s + (x - dm) ** 2, 0) / Math.max(1, d.length - 1));
      res[k] = [+mu.toFixed(3), +dm.toFixed(3), +(sd / Math.sqrt(d.length)).toFixed(3)]; // Mittel, Unterschied zur Kontrolle (gepaart), Standardfehler
    }
    out[v] = { n: rs.length, ...res };
  }
  console.log(JSON.stringify({ pitch: meta.pitch, niveau: meta.niveau, variants: out }));
  process.exit(0);
}
if (mode !== 'run') throw new Error('Modus: run | sum');

const pitch = PITCHES[pitchId ?? 'grossfeld'];
const NIV = +nivArg || 1, N = +nArg || 20, from = +fromArg || 0;
const format = pitch.format ?? 5;
const BENCH = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH[format] ?? [])];
MIND.on = true;
const withMind = (ps, key) => ps.map((p) => ({ ...p, attrs: { ...p.attrs, ...Object.fromEntries(MIND_KEYS.map((k) => [k, k === key ? FX0.lo : FX0.hi])) } }));

const rows = [];
for (let i = from; i < from + N; i++) {
  const base = generateTeam(createRng(3000 + i), TEAM_PRESETS[0], roles).players.map((p) => lifted(p, NIV));
  for (const [v, { key, fx }] of Object.entries(VARIANTS)) {
    Object.assign(MIND_FX, FX0, fx ?? {});
    for (const side of [0, 1]) {
      const me = { ...TEAM_PRESETS[side], players: withMind(base, key) }, opp = { ...TEAM_PRESETS[1 - side], players: withMind(base, null) };
      const m = createMatch({ seed: 9000 + i, pitch, human: false, teams: side === 0 ? [me, opp] : [opp, me] });
      const log = createChanceLog(m);
      const thr = []; // Zeitpunkte der Steilpässe der Testmannschaft
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        feedChances(log, m, m.events);
        for (const e of m.events) if (e.type === 'pass' && e.through && m.players.find((p) => p.id === e.playerId)?.team === side) thr.push(m.time);
        m.events.length = 0;
      }
      const mine = log.shots.filter((s) => s.team === side), theirs = log.shots.filter((s) => s.team !== side);
      const thrXg = mine.filter((s) => thr.some((t) => s.t >= t && s.t - t <= AFTER)).reduce((a, s) => a + s.xg, 0);
      const an = m.an.teams;
      rows.push({ v, i, side, gd: m.score[side] - m.score[1 - side], gf: m.score[side], ga: m.score[1 - side],
        xgf: +log.xg[side].toFixed(3), xga: +log.xg[1 - side].toFixed(3), shf: mine.length, sha: theirs.length,
        loose: an[side].loose, looseOpp: an[1 - side].loose, thr: thr.length, thrXg: +thrXg.toFixed(3),
        passPct: an[side].pass ? +(an[side].passOk / an[side].pass).toFixed(3) : null });
    }
  }
}
Object.assign(MIND_FX, FX0);
console.log(JSON.stringify({ pitch: pitch.id, niveau: NIV, n: rows.length, rows }));
