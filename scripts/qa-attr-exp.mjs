// Balancing & Simulation QA, Abschnitt A2 Teil 2 (docs/BALANCING-QA-AUFTRAG.md Phase 3): Wirkung der Spielerwerte und Spielertypen
// in gezielten Versuchen. Nur Messung, ändert keinen Spielcode.
// Grundkader wie scripts/strength-regression.mjs (generateTeam aus TEAM_PRESETS[0]), zusätzlich auf ein Niveau angehoben wie
// im Spiel (sim/niveau.js lifted: Technikwerte + Aufschlag, Stärkemodell 3). Beide Mannschaften aus demselben Grundkader.
//   reg   – je Spiel zufällige Verschiebung ±SPAN je Rolle und Wert für beide Mannschaften unabhängig; Ausgabe Zeilen x / y
//           (Tordifferenz Heim − Gast). Untergrenze 0,05, keine Obergrenze (Werte über 1 gibt es ab Niveau 5 ohnehin).
//   types – Spielertyp für alle Spieler einer Rolle bei gleicher Anzeige-Stärke (RATING_WEIGHTS V1): Typ-Aufschläge, der Rest
//           der V1-Werte gleicht die Stärke aus. Gegner: unveränderter Grundkader. Gleicher Seed mit Seiten im Wechsel.
//   fit   – Teile von reg zusammenrechnen (kleinste Quadrate, Standardfehler aus (X'X)⁻¹).
//   sum   – Teile von types zusammenfassen.
//   node scripts/qa-attr-exp.mjs reg   <Platz> <Niveau> <Spiele> <Start> > teil.json
//   node scripts/qa-attr-exp.mjs types <Platz> <Niveau> <Spiele> <Start> [Typ,Typ…] > teil.json
//   node scripts/qa-attr-exp.mjs fit|sum a.json b.json …
import { readFileSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { RATING_WEIGHTS, generateTeam, ratePlayer } from '../src/sim/generator.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { lifted } from '../src/sim/niveau.js';
import { PITCHES } from '../src/sim/pitch.js';
import { profilesOf } from '../src/sim/profiles.js';
import { normalizeTactic, systemFormation } from '../src/sim/tactics.js';

const SPAN = 0.25;
const POS = ['gk', 'def', 'mid', 'fwd'];
const FIELD = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'strength'];
const ATTRS = { gk: ['keeping', 'technique', 'passing', 'pace', 'strength'], def: FIELD, mid: FIELD, fwd: FIELD };
const FEATURES = POS.flatMap((p) => ATTRS[p].map((a) => `${a}@${p}`));

// Spielertypen (Aufgabe Phase 3). Aufschläge sind Versuchswerte (gewählt, nicht recherchiert); die Stärke bleibt gleich.
export const TYPES = {
  kontrolle: { role: null, d: {} },
  fwd_schnell_technikschwach: { role: 'fwd', d: { pace: 0.2, technique: -0.2 } },
  fwd_langsam_techniker: { role: 'fwd', d: { pace: -0.2, technique: 0.2 } },
  fwd_zielspieler: { role: 'fwd', d: { heading: 0.3, strength: 0.2, pace: -0.15 } },
  fwd_pressing: { role: 'fwd', d: { stamina: 0.2, tackling: 0.2, pace: 0.1 } },
  mid_spielmacher: { role: 'mid', d: { passing: 0.2, technique: 0.15 } },
  mid_defensiv: { role: 'mid', d: { tackling: 0.25, strength: 0.15, stamina: 0.1 } },
  def_zweikampf: { role: 'def', d: { tackling: 0.2, heading: 0.15, strength: 0.15 } },
  def_spielstark: { role: 'def', d: { passing: 0.2, technique: 0.2 } },
  def_schnell: { role: 'def', d: { pace: 0.25, stamina: 0.1 } },
  gk_klassisch: { role: 'gk', d: { keeping: 0.1, strength: 0.15 } },
  gk_mitspielend: { role: 'gk', d: { passing: 0.25, technique: 0.25, pace: 0.1 } },
};

// Typ anwenden, Stärke (V1, ohne Deckel) gleich halten: die nicht berührten V1-Werte gleichen den Unterschied gemeinsam aus.
function applyType(p, d) {
  const w = RATING_WEIGHTS[p.position] ?? RATING_WEIGHTS.mid;
  const attrs = { ...p.attrs };
  for (const [k, v] of Object.entries(d)) attrs[k] = Math.max(0.05, attrs[k] + v);
  const delta = Object.entries(w).reduce((s, [k, wk]) => s + wk * (attrs[k] - p.attrs[k]), 0);
  const comp = Object.keys(w).filter((k) => !(k in d));
  const wsum = comp.reduce((s, k) => s + w[k], 0);
  for (const k of comp) attrs[k] = Math.max(0.05, attrs[k] - delta / wsum);
  const q = { ...p, attrs };
  q.rating = ratePlayer(q, Infinity);
  return q;
}

const [mode, pitchId, niveauArg, nArg, fromArg, typeArg] = process.argv.slice(2);

if (mode === 'fit') {
  const files = process.argv.slice(3);
  const rows = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).rows);
  const k = FEATURES.length + 1;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  for (const r of rows) { const x = [1, ...r.x]; for (let i = 0; i < k; i++) { Xty[i] += x[i] * r.y; for (let j = 0; j < k; j++) XtX[i][j] += x[i] * x[j]; } }
  const A = XtX.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const dv = A[c][c];
    for (let j = 0; j < 2 * k; j++) A[c][j] /= dv;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A[r][j] -= f * A[c][j]; }
  }
  const inv = A.map((r) => r.slice(k));
  const b = inv.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
  const n = rows.length;
  const sse = rows.reduce((s, r) => s + (r.y - b[0] - r.x.reduce((t, v, i) => t + v * b[i + 1], 0)) ** 2, 0);
  const s2 = sse / (n - k);
  const goals = rows.reduce((s, r) => s + (r.g ?? 0), 0) / n;
  const meta = JSON.parse(readFileSync(files[0], 'utf8'));
  // Wirkung je +0,1 Unterschied in Toren je Spiel, mit Standardfehler.
  console.log(JSON.stringify({ pitch: meta.pitch, niveau: meta.niveau, n, goals: +goals.toFixed(3), coef: Object.fromEntries(FEATURES.map((f, i) => [f, [+(b[i + 1] * 0.1).toFixed(4), +(Math.sqrt(inv[i + 1][i + 1] * s2) * 0.1).toFixed(4)]])), profiles: meta.profiles }));
  process.exit(0);
}

if (mode === 'sum') {
  const parts = process.argv.slice(3).map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const by = {};
  for (const p of parts) for (const r of p.rows) (by[r.type] ??= []).push(r);
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const out = {};
  for (const [t, rs] of Object.entries(by)) {
    const gd = rs.map((r) => r.gd), mu = mean(gd), sd = Math.sqrt(gd.reduce((s, x) => s + (x - mu) ** 2, 0) / (gd.length - 1));
    const res = (f) => rs.filter(f).length / rs.length;
    out[t] = { n: rs.length, gd: +mu.toFixed(3), se: +(sd / Math.sqrt(rs.length)).toFixed(3), w: +res((r) => r.gd > 0).toFixed(3), dr: +res((r) => r.gd === 0).toFixed(3), l: +res((r) => r.gd < 0).toFixed(3),
      gf: +mean(rs.map((r) => r.gf)).toFixed(3), ga: +mean(rs.map((r) => r.ga)).toFixed(3), roleGoals: +mean(rs.map((r) => r.rg)).toFixed(3), roleShots: +mean(rs.map((r) => r.rs)).toFixed(3) };
  }
  console.log(JSON.stringify({ pitch: parts[0].pitch, niveau: parts[0].niveau, types: out }));
  process.exit(0);
}

const pitch = PITCHES[pitchId ?? 'grossfeld'];
const NIV = +niveauArg || 1;
const N = +nArg || 100;
const from = +fromArg || 0;
const format = pitch.format ?? 5;
const BENCH = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const roles = [...systemFormation(format, normalizeTactic(TEAM_PRESETS[0].tactic, format).system).map((f) => f.role), ...(BENCH[format] ?? [])];
const baseTeam = (i) => generateTeam(createRng(3000 + i), TEAM_PRESETS[0], roles).players.map((p) => lifted(p, NIV));
const play = (seed, t0, t1) => {
  const m = createMatch({ seed, pitch, human: false, teams: [t0, t1] });
  const ev = [];
  while (m.phase !== 'ended') { stepMatch(m, undefined, 1 / 60); for (const e of m.events) if (e.type === 'goal' || e.type === 'shot') ev.push(e); m.events.length = 0; }
  return { m, ev };
};
// Profile der Grundkader (sim/profiles.js leitet sie aus den Werten ab – auch aus angehobenen).
const profiles = {};
const countProfiles = (ps) => { for (const p of ps) for (const id of profilesOf(p)) profiles[id] = (profiles[id] ?? 0) + 1; profiles._n = (profiles._n ?? 0) + ps.length; };

if (mode === 'reg') {
  const rows = [];
  for (let i = from; i < from + N; i++) {
    const rng = createRng(77000 + i);
    const base = baseTeam(i);
    countProfiles(base);
    const shifts = [0, 1].map(() => Object.fromEntries(FEATURES.map((f) => [f, rng.range(-SPAN, SPAN)])));
    const team = (t) => ({ ...TEAM_PRESETS[t], players: base.map((p) => ({ ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([a, v]) => [a, Math.max(0.05, v + (shifts[t][`${a}@${p.position}`] ?? 0))])) })) });
    const { m } = play(9000 + i, team(0), team(1));
    rows.push({ x: FEATURES.map((f) => +(shifts[0][f] - shifts[1][f]).toFixed(4)), y: m.score[0] - m.score[1], g: m.score[0] + m.score[1] });
  }
  console.log(JSON.stringify({ pitch: pitch.id, niveau: NIV, n: rows.length, profiles, rows }));
} else if (mode === 'types') {
  const list = typeArg ? typeArg.split(',') : Object.keys(TYPES);
  const rows = [];
  for (let i = from; i < from + N; i++) {
    const base = baseTeam(i);
    for (const t of list) {
      const { role, d } = TYPES[t];
      const typed = base.map((p) => (p.position === role ? applyType(p, d) : p));
      for (const side of [0, 1]) { // Seiten im Wechsel, gleicher Seed
        const me = { ...TEAM_PRESETS[side], players: typed }, opp = { ...TEAM_PRESETS[1 - side], players: base };
        const { m, ev } = play(9000 + i, side === 0 ? me : opp, side === 0 ? opp : me);
        const pl = (id) => m.players.find((p) => p.id === id);
        const roleOf = (id) => pl(id)?.role;
        const mine = (e) => (e.type === 'shot' ? pl(e.playerId)?.team : e.team) === side;
        const gf = m.score[side], ga = m.score[1 - side];
        rows.push({ type: t, i, side, gd: gf - ga, gf, ga,
          rg: role ? ev.filter((e) => e.type === 'goal' && mine(e) && !e.ownGoal && roleOf(e.scorerId) === role).length : 0,
          rs: role ? ev.filter((e) => e.type === 'shot' && mine(e) && roleOf(e.playerId) === role).length : 0 });
      }
    }
  }
  console.log(JSON.stringify({ pitch: pitch.id, niveau: NIV, n: rows.length, rows }));
} else throw new Error('Modus: reg | types | fit | sum');
