// Manager-Beratung (AFS Phase 12, docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md Abschnitt 4.8 und 11.2, Entscheidung E8):
// dieselben Befunde wie für die CPU (intel/core.js), gedrosselt und mit genau einer Handlung.
//   weekAdvice(career, mode)      → höchstens ein Hinweis je Woche (selten: je zwei Wochen) zum eigenen Verein
//   applyAdvice(career, hint)     → Befehl in den Spielplan, Nachfassen vormerken
//   followUp(career)              → nach drei eigenen Spielen: Wert seither besser oder noch nicht (wie coachfeed.js checkFollowUps)
//   opponentHint(career, id, mode) → vor dem Spiel: stärkster Befund des Gegners, nur wenn er einen hat
// Schalter: mode 'aus' liest und schreibt nichts. Die Beratung ändert nichts am Spiel, solange man nichts übernimmt.
// Stilbefehle (Mauern, Offensiv) schlägt die Beratung nicht vor – der Stil bleibt Grundentscheidung des Menschen
// (Nutzerentscheidung 2026-11-26). Gezeigt wird nur, was der Kern mit gemessener Wirkung vorschlägt.
import { getLang, tr } from '../core/i18n.js';
import { humanClub, setClubPlan } from '../career/career.js';
import { orderLabel } from '../sim/commands.js';
import { clubProfile, teamProfile } from './profiles.js';
import { diagnose, goodOf, rank } from './core.js';

// Spielwerte aus Vorschlag 11.2 (E8) bzw. Nutzerentscheidung („selten“ = höchstens alle zwei Wochen); nach Messläufen prüfen.
export const ADVICE = { minN: 5, repeatWeeks: 4, gap: { an: 1, selten: 2 }, followUp: 3 };
export const ADVICE_MODES = ['an', 'selten', 'aus'];

const weeksSince = (a, now) => (a && a.season === now.season ? now.round - a.round : Infinity);
const nowOf = (career) => ({ season: career.season, round: career.round });

function pick(career, club, mode, st, now) {
  if (weeksSince(st.last, now) < (ADVICE.gap[mode] ?? 1)) return null;
  const me = teamProfile(career, club.id);
  if (!me || me.n < ADVICE.minN) return null;
  const findings = diagnose(career, club.id);
  const current = { style: club.tactic?.style ?? 'ausgewogen', orders: club.tactic?.orders ?? {} };
  for (const o of rank(findings, { current })) {
    if (o.group === 'style') continue;
    const f = findings.find((x) => x.kind === 'problem' && o.reason.helps.includes(x.type) && weeksSince(st.seen?.[x.type], now) >= ADVICE.repeatWeeks);
    if (!f) continue;
    return { type: f.type, metric: f.metric, z: f.z, evidence: f.evidence, action: { key: o.key, group: o.group, value: o.value }, hurts: o.reason.hurts };
  }
  return null;
}

// Hinweis dieser Woche. Wird je Woche einmal bestimmt und gemerkt (gleiche Woche → gleicher Hinweis).
export function weekAdvice(career, mode = 'an') {
  if (mode === 'aus' || !career?.an) return null;
  const club = humanClub(career);
  if (!club) return null;
  const st = (career.advice ??= { seen: {} });
  const now = nowOf(career);
  if (st.week?.season === now.season && st.week.round === now.round) return st.week.hint;
  const hint = pick(career, club, mode, st, now);
  st.week = { ...now, hint };
  if (hint) {
    st.last = now;
    st.seen = { ...st.seen, [hint.type]: now };
  }
  return hint;
}

const snap = (c) => ({ n: c.n, s: [...c.s], xgA: c.xgA ?? 0, third: [...c.third], attA: c.attA ?? 0 });
export function applyAdvice(career, hint) {
  if (!hint?.action) return;
  setClubPlan(career, hint.action.group, hint.action.value);
  const c = career.an?.clubs?.[humanClub(career).id];
  if (!c?.s) return;
  (career.advice ??= { seen: {} }).follow = { ...nowOf(career), type: hint.type, metric: hint.metric, key: hint.action.key, before: hint.evidence.value, base: snap(c) };
}
export const adviceTaken = (career, hint) => !!hint && career.advice?.follow?.type === hint.type && career.advice.follow.season === career.season && career.advice.follow.round === career.round;

// Nachfassen: nach ADVICE.followUp eigenen Spielen seit dem Übernehmen. Ergebnis in der Woche, in der es feststeht.
export function followUp(career, mode = 'an') {
  const fu = career?.advice?.follow;
  if (mode === 'aus' || !fu) return null;
  const now = nowOf(career);
  if (fu.result) return fu.at?.season === now.season && fu.at.round === now.round ? fu : null;
  const c = career.an?.clubs?.[humanClub(career)?.id];
  if (fu.season !== now.season || !c?.s) {
    delete career.advice.follow; // Saisonwechsel: Summen zurückgesetzt, kein Vergleich mehr möglich
    return null;
  }
  const b = fu.base;
  if (c.n - b.n < ADVICE.followUp) return null;
  const since = clubProfile({ n: c.n - b.n, s: c.s.map((x, i) => x - (b.s[i] ?? 0)), xgA: (c.xgA ?? 0) - b.xgA, third: c.third.map((x, i) => x - b.third[i]), attA: (c.attA ?? 0) - b.attA });
  fu.after = since?.[fu.metric] ?? null;
  fu.games = c.n - b.n;
  fu.result = fu.after != null && fu.before != null && (fu.after - fu.before) * goodOf(fu.metric) > 0 ? 'better' : 'notyet';
  fu.at = now;
  return fu;
}

// Vor dem Spiel: stärkster Befund des Gegners (nur eigene Liga, ab ADVICE.minN Spielen). Keine Handlung: gegen Werte des
// Gegners gibt es keine gemessene Wirkung eines Befehls (Phase 7) – das Gegenmittel gegen die Trainer-Handschrift bleibt.
export function opponentHint(career, id, mode = 'an') {
  if (mode === 'aus') return null;
  return diagnose(career, id).find((f) => f.evidence.n >= ADVICE.minN) ?? null;
}

// Texte
export const METRIC_LABEL = () => ({
  xg: tr('Torchancen (xG) je Spiel', 'chances (xG) per game'),
  xgA: tr('Torchancen des Gegners (xG) je Spiel', 'chances conceded (xG) per game'),
  tilt: tr('Feldvorteil (Zeit im letzten Drittel)', 'field tilt (time in the final third)'),
  packing: tr('überspielte Gegner je Pass', 'opponents bypassed per pass'),
  passPct: tr('Passquote', 'pass completion'),
});
const dec2 = (v) => (getLang() === 'de' ? v.toFixed(2).replace('.', ',') : v.toFixed(2));
export const fmtMetric = (metric, v) => (v == null ? '–' : metric === 'passPct' || metric === 'tilt' ? `${Math.round(v * 100)} %` : dec2(v));
export function evidenceText(f) {
  const e = f.evidence;
  const ref = f.metric === 'tilt' ? tr('ausgeglichen', 'level') : tr('Liga', 'league');
  return `${fmtMetric(f.metric, e.value)} · ${ref} ${fmtMetric(f.metric, e.ref)} · ${e.n} ${tr('Spiele', 'games')}`;
}
export function findingText(f, who = 'we') {
  const high = f.type.endsWith(':high');
  const label = METRIC_LABEL()[f.metric];
  const side = f.metric === 'tilt' ? (high ? tr('deutlich über 50 %', 'well above 50 %') : tr('deutlich unter 50 %', 'well below 50 %')) : high ? tr('deutlich über dem Liga-Schnitt', 'well above the league average') : tr('deutlich unter dem Liga-Schnitt', 'well below the league average');
  const text = who === 'we' ? tr(`${label} bei uns: ${side}.`, `Our ${label}: ${side}.`) : `${label}: ${side}.`;
  return text[0].toUpperCase() + text.slice(1);
}
export function hurtsText(hint) {
  const labels = [...new Set(hint.hurts.map((t) => METRIC_LABEL()[t.split(':')[0]]))];
  return labels.length ? tr(`Kostet gemessen etwas: ${labels.join(', ')}.`, `Measured cost: ${labels.join(', ')}.`) : '';
}
export function followText(fu) {
  const label = METRIC_LABEL()[fu.metric];
  const order = orderLabel(...fu.key.split(':'));
  const res = fu.result === 'better' ? tr('hat geholfen', 'it helped') : tr('noch nicht', 'not yet');
  return tr(`Nachgefasst – „${order}“: ${label} vorher ${fmtMetric(fu.metric, fu.before)}, seither ${fmtMetric(fu.metric, fu.after)} (${fu.games} Spiele): ${res}. Nach so wenigen Spielen kann auch Zufall drinstecken.`, `Follow-up – "${order}": ${label} before ${fmtMetric(fu.metric, fu.before)}, since ${fmtMetric(fu.metric, fu.after)} (${fu.games} games): ${res}. After so few games luck may play a part.`);
}
