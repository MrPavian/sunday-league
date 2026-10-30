// Mannschaftstraining mit Trainingsplan (ROADMAP „Verein, Kader, Wirtschaft“: Training und Trainingspläne). Zwei Stellschrauben:
// Trainingstage je Woche und ein Schwerpunkt, dazu wahlweise Torwarttraining. Wirkung:
//  - Entwicklung zum Saisonende (career.js developPlayers): mehr Tage als in der Liga üblich mehr Zuwachs, weniger Tage weniger;
//    der Schwerpunkt verteilt den Zuwachs auf seine Werte (Summe gleich, nur anders verteilt).
//  - Jede Woche: Tage über der Liga-Norm kosten Familie und Kraft des Trainers, Tage darunter schonen sie.
// Ohne eigenen Plan gilt die Liga-Norm mit „ausgewogen“ – dann ändert sich nichts gegenüber bisher (alte Spielstände bitgleich).
//
// QUELLEN zum Trainingsumfang (schwach, siehe docs/KONZEPT-SPIELERSTAERKE.md Abschnitt 2): Kreisliga 2 Einheiten je Woche,
// Bezirks-/Landesliga 3–4, Oberliga 4 und mehr (fitindiesaison.de, Ratgeber eines Anbieters von Vorbereitungsplänen,
// https://fitindiesaison.de/fussball-vorbereitung-der-komplette-guide-fuer-trainer/); Landesliga dreimal je Woche (Rheinpfalz,
// https://www.rheinpfalz.de/lokal/pirmasens_artikel,-interessante-landesliga-_arid,178439.html). Freizeitliga 1: Spielwert.
// Spielwerte: Zuwachs je Tag, Verteilung der Schwerpunkte, Kosten für Familie und Kraft.
import { tr } from '../core/i18n.js';
import { adjustEnergy, adjustPatience, isPresident } from './personal.js';

export const TRAINING_NORM = [1, 2, 2, 2, 3, 3, 4, 4]; // Stufe 1 (Freizeitliga) bis 8 (Oberliga)
export const MIN_DAYS = 1;
export const MAX_DAYS = 5;
export const PER_DAY = 0.12; // Entwicklung je Tag über/unter der Norm (Spielwert)
const KEEPER_BOOST = 1.5; // Torwarttraining: Zuwachs im Torwartspiel der Torhüter (Spielwert)
const COST = { patience: 1.5, energy: 1, keeper: 0.5 }; // je Woche und Tag über der Norm (Spielwert)

export const FOCUS = {
  ausgewogen: { name: tr('Ausgewogen', 'Balanced'), desc: tr('Von allem etwas.', 'A bit of everything.'), w: {} },
  kondition: { name: tr('Kondition', 'Fitness'), desc: tr('Läufe, Sprints, Kraft. Tempo, Ausdauer und Körper legen zu.', 'Runs, sprints, strength. Pace, stamina and strength improve.'), w: { pace: 1.3, stamina: 1.8, strength: 1.4 } },
  ball: { name: tr('Ball und Passspiel', 'Ball work and passing'), desc: tr('Rondos, Passformen, Ballkontrolle. Technik und Passen legen zu.', 'Rondos, passing drills, ball control. Technique and passing improve.'), w: { technique: 1.7, passing: 1.6, shooting: 1.1 } },
  abschluss: { name: tr('Abschluss', 'Finishing'), desc: tr('Torschuss, Flanken, Kopfball. Abschluss und Kopfball legen zu.', 'Shooting, crosses, headers. Finishing and heading improve.'), w: { shooting: 1.9, heading: 1.3, technique: 1.1 } },
  zweikampf: { name: tr('Zweikampf und Abwehr', 'Duels and defending'), desc: tr('Eins gegen eins, Verschieben, Kopfballduelle. Zweikampf, Körper und Kopfball legen zu.', 'One against one, shifting, aerial duels. Tackling, strength and heading improve.'), w: { tackling: 1.8, strength: 1.3, heading: 1.2 } },
};
const ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping', 'strength'];
const OTHER = 0.8; // Werte außerhalb des Schwerpunkts

export const normDays = (c) => TRAINING_NORM[Math.max(1, Math.min(TRAINING_NORM.length, c.level ?? 1)) - 1];
export function plan(c) {
  const p = c.trainingPlan ?? {};
  return { days: p.days ?? normDays(c), focus: FOCUS[p.focus] ? p.focus : 'ausgewogen', keeper: !!p.keeper };
}
export function setPlan(c, { days, focus, keeper } = {}) {
  const now = plan(c);
  c.trainingPlan = {
    days: days == null ? now.days : Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(days))),
    focus: focus && FOCUS[focus] ? focus : now.focus,
    keeper: keeper == null ? now.keeper : !!keeper,
  };
  return c.trainingPlan;
}

// Faktor auf den Saisonzuwachs (developPlayers): 1 bei der Liga-Norm.
export const trainingGrowth = (c) => Math.max(0.4, 1 + PER_DAY * (plan(c).days - normDays(c)));

// Verteilung des Zuwachses auf die Werte (Mittel über alle Werte 1, damit die Summe gleich bleibt).
export function focusWeight(c, attr, position) {
  const pl = plan(c);
  const f = FOCUS[pl.focus];
  let w = 1;
  if (pl.focus !== 'ausgewogen') {
    const raw = (k) => f.w[k] ?? OTHER;
    const mean = ATTRS.reduce((s, k) => s + raw(k), 0) / ATTRS.length;
    w = raw(attr) / mean;
  }
  if (pl.keeper && position === 'gk' && attr === 'keeping') w *= KEEPER_BOOST;
  return w;
}

// Wöchentliche Kosten und Entlastung (hooks.js finishRound). Präsidium: Das Training macht der eingestellte Trainer.
export function finishRound(c) {
  if (!c.trainingPlan || !c.coach || isPresident(c)) return;
  const pl = plan(c);
  const extra = pl.days - normDays(c);
  if (extra > 0) {
    adjustPatience(c, -COST.patience * extra);
    adjustEnergy(c, -COST.energy * extra - (pl.keeper ? COST.keeper : 0));
  } else if (extra < 0) adjustPatience(c, -0.5 * extra); // weniger Abende auf dem Platz: mehr Zeit für die Familie
  else if (pl.keeper) adjustEnergy(c, -COST.keeper);
}

export const planSummary = (c) => {
  const pl = plan(c);
  const n = normDays(c);
  const g = Math.round((trainingGrowth(c) - 1) * 100);
  return tr(
    `${pl.days}× je Woche (üblich in der Liga: ${n}×) · ${FOCUS[pl.focus].name}${pl.keeper ? ' · mit Torwarttraining' : ''} · Entwicklung ${g >= 0 ? '+' : ''}${g} %`,
    `${pl.days}× a week (usual in this league: ${n}×) · ${FOCUS[pl.focus].name}${pl.keeper ? ' · with keeper training' : ''} · development ${g >= 0 ? '+' : ''}${g} %`,
  );
};
