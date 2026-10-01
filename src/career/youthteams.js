// Jugend, Punkt 1: Jede Mannschaft (E, D, C, B) hat ihren eigenen Trainer und ihren eigenen
// Trainingsschwerpunkt. Trainer kommen aus dem Ehrenamt: Eltern, Ehemalige, A-Jugendliche –
// oder du machst es selbst (kostet dich jede Woche Kraft). Ein C-Lizenz-Kurs (120 €, vier
// Wochen) macht einen Trainer deutlich besser. Ohne Trainer fällt das Training aus: Die
// Kinder verlieren den Spaß, und ist zum Saisonende immer noch keiner da, wird das Team
// abgemeldet – ein Teil der Kinder hört auf.
//
// Schwerpunkt nach Alter (Ausbildungsgedanke des DFB): In der E-Jugend bringen Spiel und
// Technik am meisten, Kondition und Taktik sind dort fehl am Platz und kosten Spaß. Ab der
// C-Jugend lohnen Spielverständnis, Kondition und Turniervorbereitung.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { personName } from '../data/origins.js';
import { book } from './finances.js';

export const TEAM_IDS = ['E', 'D', 'C', 'B'];

// Wie gut passt ein Schwerpunkt zum Alter? (Faktor auf den Fortschritt)
export const FOCUS_FIT = {
  E: { spass: 1.2, technik: 1.3, taktik: 0.5, kondition: 0.4, turnier: 0.6 },
  D: { spass: 1.0, technik: 1.3, taktik: 0.8, kondition: 0.6, turnier: 0.9 },
  C: { spass: 0.8, technik: 1.1, taktik: 1.2, kondition: 1.1, turnier: 1.1 },
  B: { spass: 0.7, technik: 1.0, taktik: 1.3, kondition: 1.2, turnier: 1.2 },
};
export const fitLabel = (v) => (v >= 1.2 ? tr('passt genau', 'spot on') : v >= 0.9 ? tr('passt', 'fits') : v >= 0.7 ? tr('geht so', 'so-so') : tr('zu früh', 'too early'));

export const COACH_KINDS = {
  eltern: { label: tr('Elternteil', 'Parent') },
  ehemaliger: { label: tr('Ehemaliger', 'Former player') },
  ajugend: { label: tr('A-Jugendlicher', 'U19 player') },
  du: { label: tr('Du selbst', 'You') },
};
export const COURSE_COST = 120;
export const COURSE_WEEKS = 4;
export const SELF_ENERGY = 2; // je Woche: ein Trainingsabend mehr (Ereignisse kosten 3–8)

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Einrichten (auch für alte Spielstände): Der bisherige Jugendtrainer übernimmt die C-Jugend,
// die anderen Teams trainieren Eltern. Der bisherige Wochen-Schwerpunkt gilt für alle.
export function initTeams(c) {
  c.youth.teams ??= {};
  const rng = createRng(hashSeed(c.seed ?? 0, 4242));
  const legacy = c.week?.youthFocus ?? 'spass';
  for (const id of TEAM_IDS) {
    if (c.youth.teams[id]) continue;
    const coach = id === 'C' ? { name: c.youth.coach.name, quality: c.youth.coach.quality, kind: 'ehemaliger', licence: false } : { name: personName(rng, 40), quality: Math.round(rng.range(0.25, 0.45) * 100) / 100, kind: 'eltern', licence: false };
    c.youth.teams[id] = { coach, focus: legacy, course: null };
  }
  return c.youth.teams;
}

export const teamCoach = (c, id) => initTeams(c)[id]?.coach ?? null;

// Was der Trainer bewirkt: ohne Trainer kaum etwas.
export function coachQuality(c, id) {
  const coach = teamCoach(c, id);
  if (!coach) return 0.1;
  if (coach.kind === 'du') return selfQuality(c);
  return coach.quality;
}
// Du als Jugendtrainer: je nach eigener Erfahrung ordentlich, aber nicht überragend.
export const selfQuality = (c) => Math.min(0.7, 0.4 + ((c.season ?? 1) - 1) * 0.03);

export function setTeamFocus(c, id, focus) {
  const t = initTeams(c)[id];
  if (!t || !FOCUS_FIT[id][focus]) return false;
  t.focus = focus;
  return true;
}

// Wer käme als Trainer in Frage? (für ein unbesetztes Team)
export function coachCandidates(c, id) {
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, TEAM_IDS.indexOf(id), 77));
  const busy = new Set(Object.values(c.youth.teams ?? {}).map((t) => t.coach?.name).filter(Boolean));
  const out = [{ kind: 'eltern', name: personName(rng, 40), quality: Math.round(rng.range(0.2, 0.4) * 100) / 100 }];
  const ex = (c.alumni ?? []).find((a) => !busy.has(a.name));
  if (ex) out.push({ kind: 'ehemaliger', name: ex.name, quality: Math.round(Math.min(0.6, 0.35 + (ex.apps ?? 0) / 400) * 100) / 100 });
  const prospect = (c.youth.prospects ?? []).find((i) => !Object.values(c.youth.teams ?? {}).some((t) => t.coach?.idx === i));
  if (prospect != null) out.push({ kind: 'ajugend', idx: prospect, quality: 0.3 });
  if (!Object.values(c.youth.teams ?? {}).some((t) => t.coach?.kind === 'du')) out.push({ kind: 'du', name: tr('Du', 'You'), quality: selfQuality(c) });
  return out;
}

export function appointCoach(c, id, kind, nameOf = () => '?') {
  const t = initTeams(c)[id];
  if (!t || t.coach) return false;
  const cand = coachCandidates(c, id).find((x) => x.kind === kind);
  if (!cand) return false;
  t.coach = { name: cand.name ?? nameOf(cand.idx), quality: cand.quality, kind, licence: false, idx: cand.idx };
  return true;
}

export function startCourse(c, id) {
  const t = initTeams(c)[id];
  if (!t?.coach || t.coach.kind === 'du' || t.coach.licence || t.course || c.cash < COURSE_COST) return false;
  book(c, tr(`C-Lizenz-Kurs ${t.coach.name}`, `C licence course ${t.coach.name}`), -COURSE_COST);
  t.course = { until: c.round + COURSE_WEEKS, season: c.season };
  return true;
}

// Jede Woche: Kurse laufen, wer selbst trainiert, zahlt mit Kraft.
export function weeklyTeams(c, adjustEnergy) {
  const teams = initTeams(c);
  for (const id of TEAM_IDS) {
    const t = teams[id];
    if (t.course && (c.round >= t.course.until || c.season !== t.course.season)) {
      t.course = null;
      if (t.coach) {
        t.coach.licence = true;
        t.coach.quality = Math.min(0.85, t.coach.quality + 0.2);
      }
    }
    if (t.coach?.kind === 'du') adjustEnergy?.(c, -SELF_ENERGY);
  }
}

// Saisonende: Manche Trainer hören auf (Eltern, wenn das eigene Kind rauswächst, Ehrenamt
// ist Ehrenamt). Wer jetzt ohne Trainer ist, wird abgemeldet: ein Teil der Kinder hört auf.
export function seasonTeams(c, rng, kidsOf) {
  const teams = initTeams(c);
  const notes = [];
  for (const id of TEAM_IDS) {
    const t = teams[id];
    const name = tr(`${id}-Jugend`, `${id} youth`);
    if (!t.coach) {
      const kids = kidsOf(id);
      const lost = kids.filter(() => rng.chance(0.4));
      if (kids.length) notes.push(tr(`Die ${name} hatte keinen Trainer und wurde abgemeldet – ${lost.length} Kinder hören auf.`, `The ${name} had no coach and was withdrawn – ${lost.length} kids quit.`));
      for (const k of lost) k.quit = true;
      continue;
    }
    const quitChance = t.coach.kind === 'eltern' ? 0.25 : t.coach.kind === 'ajugend' ? 0.3 : t.coach.kind === 'du' ? 0 : 0.12;
    if (rng.chance(quitChance)) {
      notes.push(tr(`${t.coach.name} hört als Trainer der ${name} auf. Das Team braucht einen neuen.`, `${t.coach.name} steps down as ${name} coach. The team needs a new one.`));
      t.coach = null;
      t.course = null;
    }
  }
  return notes;
}
