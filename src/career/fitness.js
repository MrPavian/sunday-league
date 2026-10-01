// Fitness (50–100 %): In der Kreisliga eher Lebenswandel als Belastung – bei einem Spiel pro
// Woche ist jeder bis Sonntag erholt. Unfit macht, wer gerade aus der Verletzung kommt, Schicht
// schiebt, verkatert antritt oder im Turnier ein Spiel nach dem anderen macht; mit dem Alter
// wird die Decke etwas niedriger.
//
// Wirkung: Startausdauer im Spiel (sim/squad.js), Verletzungsrisiko unter 70 %
// (injuries.js), automatische Aufstellung (career.js buildLineup). Fehlt der Wert (alter
// Spielstand), gilt 100 %.
import { hasFacility } from './facilities.js';
import { SHIFT_JOBS } from './chat.js';

export const FIT_MIN = 0.5;
export const FIT_LOW = 0.7; // darunter steigt das Verletzungsrisiko
const RECOVERY = 0.12; // je Woche
const MATCH_COST = 0.05; // ein ganzes Spiel (anteilig nach Spielzeit)

const clampFit = (v) => Math.max(FIT_MIN, Math.min(1, v));
export const fitnessOf = (c, idx) => c.players?.[idx]?.fitness ?? 1;

export function adjustFitness(c, idx, d) {
  const rec = c.players?.[idx];
  if (rec) rec.fitness = clampFit((rec.fitness ?? 1) + d);
}

// Obergrenze: Mit dem Alter kommt man nicht mehr ganz auf 100 % (ab 33 je Jahr 1 %, höchstens 10 %).
export function fitnessCap(p) {
  return 1 - Math.min(0.1, Math.max(0, (p.age ?? 25) - 32) * 0.01);
}

// Erholung über die Woche: Ältere langsamer, ein Fitnesstrainer im Kader schneller,
// mit Flutlicht wird nach Feierabend trainiert (nur der eigene Verein). Danach: Nachtschicht
// und Altersgrenze für den eigenen Kader.
export function weeklyFitness(c, playerOf, humanSquad) {
  const own = new Set(humanSquad);
  for (const [key, rec] of Object.entries(c.players ?? {})) {
    if (rec.fitness == null) continue; // nie unter 100 % gefallen
    const idx = Number(key);
    const p = playerOf(c, idx);
    let r = RECOVERY * ((p.age ?? 25) >= 33 ? 0.7 : 1);
    if (p.profession === 'Fitnesstrainer') r += 0.04;
    if (own.has(idx) && hasFacility(c, 'flutlicht')) r += 0.03;
    const cap = fitnessCap(p);
    rec.fitness = rec.fitness >= cap ? rec.fitness : clampFit(Math.min(cap, rec.fitness + r));
    if (rec.fitness >= 1) delete rec.fitness;
  }
  // Eigener Kader: Schichtarbeiter haben etwa jede dritte Woche Nachtschicht (fest aus dem
  // Spielstand abgeleitet), Ältere ab 35 kommen nicht mehr ganz auf 100 %.
  for (const idx of humanSquad) {
    const p = playerOf(c, idx);
    const rec = c.players?.[idx];
    if (!rec) continue;
    const night = SHIFT_JOBS.includes(p.profession) && ((c.seed ?? 0) * 31 + (c.round ?? 0) * 17 + idx * 7) % 10 < 3;
    if (night) rec.fitness = Math.min(rec.fitness ?? 1, 0.86);
    const cap = fitnessCap(p);
    if (cap < 1) rec.fitness = Math.min(rec.fitness ?? 1, cap);
  }
}

// Nach einem Spiel: Wer lange auf dem Platz stand, hat etwas weniger im Tank. In der Liga
// ist das bis Sonntag wieder weg – im Turnier (mehrere Spiele ohne Woche dazwischen) nicht.
export function afterMatchFitness(c, idx, share, factor = 1) {
  if (share > 0) adjustFitness(c, idx, -MATCH_COST * Math.min(1, share) * factor);
}

// Zurück aus der Verletzung: erst einmal nicht bei 100 % – je länger raus, desto weniger
// (1 Woche 74 %, 2 Wochen 70 %, 3 Wochen 66 %, ab 5 Wochen 60 %).
export function backFromInjury(c, idx, weeksOut = 1) {
  const rec = c.players?.[idx];
  if (rec) rec.fitness = Math.min(rec.fitness ?? 1, Math.max(0.6, 0.78 - 0.04 * weeksOut));
}

// Für die Anzeige: 84 → „Fitness 84 %“; ab 95 % nicht erwähnenswert.
export const fitnessPct = (f) => Math.round((f ?? 1) * 100);
export const fitnessShown = (f) => (f ?? 1) < 0.95;
