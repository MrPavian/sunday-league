// Trainer auf der anderen Seite: Die KI-Vereine sehen dieselben Situationen wie du
// (situations.js) und stellen mit denselben Befehlen um (plan.js) – kein Bonus,
// keine Abkürzung, nur eine eigene Handschrift:
//   Stratege  – reagiert oft und nimmt die naheliegende Lösung
//   Alte Schule – reagiert selten, mag Pressing, Kompaktheit, lange Bälle
//   Großmaul  – will immer mehr: Risiko, Aufrücken, Pressing
//   Kumpeltyp – lässt die Jungs meistens machen
// Eigener Zufall (m.coachRng), damit das Spiel selbst nicht aus dem Takt gerät.
import { createRng } from '../core/rng.js';
import { setOrder } from './plan.js';

const PERSONAS = {
  stratege: { react: 0.85, like: [], avoid: [] },
  oldschool: { react: 0.4, like: ['press:hoch', 'shape:kompakt', 'build:direkt', 'press:tief', 'route:konter'], avoid: ['build:kurz', 'build:halten', 'tempo:ruhig'] },
  grossmaul: { react: 0.6, like: ['risk:aggressiv', 'shape:aufruecken', 'press:hoch', 'route:tiefe'], avoid: ['press:tief', 'build:halten'] },
  kumpeltyp: { react: 0.35, like: [], avoid: [] },
  normal: { react: 0.55, like: [], avoid: [] },
};
const DIFFICULTY = { easy: 0.5, normal: 1, hard: 1.35 };
const MAX_CHANGES = 4;

const personaOf = (m, team) => PERSONAS[m.coachPersona?.[team]] ?? PERSONAS.normal;

// Coacht die KI diese Mannschaft? Nicht, wenn du selbst an der Linie stehst oder spielst.
export const aiCoaches = (m, team) => m.aiCoach !== false && team !== m.humanTeam && !(m.manager && team === m.coachTeam);

export function stepAiCoach(m, team) {
  if (!aiCoaches(m, team) || m.phase !== 'play') return;
  const st = (m.aiCoachState ??= [null, null])[team] ?? (m.aiCoachState[team] = { next: m.duration * 0.15, changes: 0 });
  if (m.time < st.next || st.changes >= MAX_CHANGES) return;
  st.next = m.time + 2;
  const top = (m.situations?.[team] ?? []).find((s) => s.severity * s.confidence >= 0.3);
  if (!top) return;
  const p = personaOf(m, team);
  const rng = (m.coachRng ??= createRng(((m.seed ?? 1) * 2246822519) >>> 0));
  const skill = m.humanTeam != null && team !== m.humanTeam ? DIFFICULTY[m.difficulty] ?? 1 : 1;
  // Überlegt – und nicht gleich wieder.
  st.next = m.time + Math.max(25, m.duration * 0.16);
  if (!rng.chance(Math.min(0.95, p.react * skill))) return;
  const opts = top.options.filter((o) => o.value != null && !p.avoid.includes(`${o.group}:${o.value}`));
  if (!opts.length) return;
  const weights = opts.map((o, i) => (i === 0 ? 2 : 1) + (p.like.includes(`${o.group}:${o.value}`) ? 3 : 0));
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  const pick = opts.find((_, i) => (r -= weights[i]) < 0) ?? opts[0];
  if (setOrder(m, team, pick.group, pick.value, { by: 'ai' })) {
    st.changes++;
    m.events.push({ type: 'ai_coach', team, situation: top.type, group: pick.group, value: pick.value });
  }
}

// Halbzeit: Seitenbefehle sind Momentaufnahmen – die KI überlegt neu.
export function aiCoachHalftime(m, team) {
  if (!aiCoaches(m, team)) return;
  const rng = (m.coachRng ??= createRng(((m.seed ?? 1) * 2246822519) >>> 0));
  for (const g of ['side', 'cover']) if (m.orders?.[team]?.[g] && rng.chance(0.5)) setOrder(m, team, g, null, { by: 'ai' });
}
