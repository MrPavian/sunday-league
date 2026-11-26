// AFI-Kern (AFS Phase 7, docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md Abschnitt 2 und 4.2–4.3):
//   diagnose(career, id)            → Befunde über einen Verein der eigenen Liga
//   options(befund)                 → Befehle mit gemessener Wirkung auf den Wert des Befunds
//   rank(befunde, { philosophy, current }) → geordnete Befehle mit Begründung
// Kennt nur Profile (intel/profiles.js), nicht die Engine. Kein Zufall: gleicher Spielstand → gleiche Befunde und Rangfolge.
// Mensch-Beratung und CPU-Trainer bekommen dieselben Befunde; Unterschiede nur über die Philosophie.
//
// Befunde: nur Vereinswerte, die Phase 3 freigegeben hat, als Stufe gegen den Liga-Schnitt (Feldvorteil gegen 0,5) mit
// z ≥ 1,96 (intel/levels.js). Spielerbefunde fehlen bewusst: für Rollen- und Positionswechsel gibt es keine gemessene Wirkung.
//
// Wirkungen (EFFECTS): Phase-3-Spiele (scripts/afs-effects.mjs auf den Rohdaten von scripts/afs-validate.mjs, Seeds 20000–20079,
// je Platz 160 Spiele ohne Befehl gegen 80 mit Befehl). Aufgenommen nur, was auf Rasenplatz UND Großfeld mit |t| ≥ 2 in dieselbe
// Richtung geht. es = Unterschied zum Spiel ohne Befehl in Standardabweichungen eines Spiels, der kleinere der beiden Plätze.
// Kein Befehl hebt die eigenen xG oder senkt die xG des Gegners auf beiden Plätzen – solche Befunde haben keine Option.
import { teamProfile } from './profiles.js';
import { LEVELS, zScore } from './levels.js';

export const EFFECTS = {
  'build:direkt': { packing: 0.8, passPct: -0.29 },
  'style:mauern': { packing: 1.08, passPct: -0.37 },
  'route:mitte': { passPct: 0.3 },
  'style:offensiv': { tilt: 0.42 },
};
// Philosophie: bevorzugte Befehle zählen so viel mehr (Charakter, kein Messwert – Spielwert); gemiedene fallen weg.
export const INTEL = { like: 1.5 };

// Werte eines Vereins: Vergleichswert, Streuung je Spiel, Mindest-n, gute Richtung (+1 = mehr ist besser).
const avgOf = (rows, k) => {
  const v = rows.map((r) => r[k]).filter((x) => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const METRICS = {
  xg: { good: 1, min: LEVELS.clubMin, ref: (rows) => avgOf(rows, 'xg'), sd: (ref) => ref * LEVELS.relXg },
  xgA: { good: -1, min: LEVELS.clubMin, ref: (rows) => avgOf(rows, 'xgA'), sd: (ref) => ref * LEVELS.relXg },
  tilt: { good: 1, min: LEVELS.clubMin, ref: () => 0.5, sd: () => LEVELS.sdTilt },
  packing: { good: 1, min: LEVELS.clubMin, ref: (rows) => avgOf(rows, 'packing'), sd: (ref) => ref * LEVELS.relPacking },
  passPct: { good: 1, min: LEVELS.passPctMin, ref: (rows) => avgOf(rows, 'passPct'), sd: () => LEVELS.sdPassPct },
};
export const METRIC_KEYS = Object.keys(METRICS);

// Befunde: { type: 'xg:low', metric, kind: 'problem' | 'strength', club, z, evidence: { value, ref, n, src } }, stärkster zuerst.
export function diagnose(career, id) {
  const me = teamProfile(career, id);
  if (!me) return [];
  const rows = Object.keys(career.an?.clubs ?? {}).map((x) => teamProfile(career, x)).filter(Boolean);
  const out = [];
  for (const [metric, M] of Object.entries(METRICS)) {
    if (me.n < M.min) continue;
    const ref = M.ref(rows);
    const z = ref == null ? null : zScore(me[metric], ref, M.sd(ref), me.n);
    if (z == null || Math.abs(z) < LEVELS.z) continue;
    const dir = Math.sign(z);
    out.push({ type: `${metric}:${dir > 0 ? 'high' : 'low'}`, metric, kind: dir === M.good ? 'strength' : 'problem', club: id, z, evidence: { value: me[metric], ref, n: me.n, src: me.src } });
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z) || a.type.localeCompare(b.type));
}

// Befehle, die den Wert eines Problems gemessen in die gute Richtung bewegen.
export function options(finding) {
  if (finding.kind !== 'problem') return [];
  const good = METRICS[finding.metric].good;
  return Object.entries(EFFECTS)
    .filter(([, eff]) => (eff[finding.metric] ?? 0) * good > 0)
    .map(([key, eff]) => ({ key, group: key.split(':')[0], value: key.split(':')[1], effect: eff[finding.metric] * good, src: 'MEASURED' }));
}

// Rangfolge über alle Probleme: Nutzen = Summe der gemessenen Wirkungen auf die Problemwerte (Nebenwirkungen auf andere Probleme
// zählen negativ), × INTEL.like für bevorzugte Befehle. Gemiedene und schon aktive Befehle fallen weg, ebenso Nutzen ≤ 0.
// current: { style, orders } wie career.js tacticOf; philosophy: { like: [], avoid: [] } wie aicoach.js PERSONAS.
export function rank(findings, { philosophy = {}, current = {} } = {}) {
  const problems = findings.filter((f) => f.kind === 'problem');
  const keys = new Set(problems.flatMap((f) => options(f).map((o) => o.key)));
  const active = (key) => {
    const [g, v] = key.split(':');
    return g === 'style' ? current.style === v : current.orders?.[g] === v;
  };
  const out = [];
  for (const key of keys) {
    if (philosophy.avoid?.includes(key) || active(key)) continue;
    const eff = EFFECTS[key];
    const helps = [], hurts = [];
    let score = 0;
    for (const f of problems) {
      const e = (eff[f.metric] ?? 0) * METRICS[f.metric].good;
      if (!e) continue;
      score += e;
      (e > 0 ? helps : hurts).push(f.type);
    }
    const liked = !!philosophy.like?.includes(key);
    if (liked) score *= INTEL.like;
    if (score <= 0) continue;
    const [group, value] = key.split(':');
    out.push({ key, group, value, score, reason: { helps, hurts, liked, src: 'MEASURED' } });
  }
  return out.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}
