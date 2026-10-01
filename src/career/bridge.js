// Jugend, Punkt 5: Die Brücke von der A-Jugend in die erste Mannschaft.
//
// Mittrainieren: Bis zu zwei A-Jugendliche trainieren bei der Ersten mit. Sie lernen
// schneller und gewöhnen sich ans Tempo („Reife"). Wer ohne Reife hochgezogen wird, ist die
// ersten Wochen nervös (Formtief); wer schon dazugehört, legt los.
//
// Paten: Ein erfahrener Spieler (ab 28) nimmt einen Jungen unter seine Fittiche. Je besser er
// selbst kickt und führt, desto mehr lernt der Junge. Beim Hochziehen sind die beiden
// gleich „Pate & Schützling" – das hilft auf dem Platz.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { setRelation } from './relations.js';
import { coachQuality } from './youth.js';

export const MAX_UP = 2; // mehr verträgt ein Kreisliga-Training nicht
export const REIFE_WEEKS = 8; // so lange dauert es, bis einer dazugehört
export const UP_BONUS = 0.5; // ganze Saison mittrainiert: +50 % Entwicklung
export const PATE_AGE = 28;
export const NERVOUS_FORM = -0.4;
export const READY_FORM = 0.2;

const prospectsOf = (c) => c.youth?.prospects ?? [];
export const trainingUp = (c) => prospectsOf(c).filter((idx) => c.players[idx]?.trainsUp);

export function toggleTrainUp(c, idx) {
  const rec = c.players[idx];
  if (!rec || !prospectsOf(c).includes(idx)) return false;
  if (!rec.trainsUp && trainingUp(c).length >= MAX_UP) return false;
  rec.trainsUp = !rec.trainsUp;
  return true;
}

export const reifeOf = (c, idx) => Math.min(1, (c.players[idx]?.reife ?? 0));

// Paten: wer kommt in Frage? Erfahrene Spieler im Kader, die noch keinen Schützling haben.
export const paten = (c) => (c.youth.paten ??= {});
export function pateCandidates(c) {
  const busy = new Set(Object.values(paten(c)));
  return humanClub(c).squad.filter((idx) => playerOf(c, idx).age >= PATE_AGE && !busy.has(idx) && c.coach?.idx !== idx);
}
export function setPate(c, prospect, mentor) {
  if (!prospectsOf(c).includes(prospect)) return false;
  if (mentor == null) {
    delete paten(c)[prospect];
    return true;
  }
  if (!pateCandidates(c).includes(mentor)) return false;
  paten(c)[prospect] = mentor;
  return true;
}
export const pateOf = (c, prospect) => paten(c)[prospect] ?? null;
// Was der Pate bringt: gemessen +10 % bis +30 % Entwicklung (Ø +17 %), dazu die Beziehung beim Hochziehen.
export const pateBonus = (c, prospect) => {
  const m = pateOf(c, prospect);
  return m == null ? 0 : 0.4 * coachQuality(playerOf(c, m));
};

// Jede Woche: Mittrainierer sammeln Reife; Paten, die nicht mehr im Kader sind, fallen weg.
export function weeklyBridge(c) {
  const squad = new Set(humanClub(c).squad);
  for (const [p, m] of Object.entries(paten(c))) if (!squad.has(m) || !prospectsOf(c).includes(Number(p))) delete paten(c)[p];
  for (const idx of trainingUp(c)) {
    const rec = c.players[idx];
    rec.reife = Math.min(1, (rec.reife ?? 0) + 1 / REIFE_WEEKS);
    rec.upWeeks = (rec.upWeeks ?? 0) + 1;
  }
}

// Saisonende: Entwicklungsfaktor je A-Jugendlichem (für developYouth), danach zurücksetzen.
export function youthFactor(c, idx, rounds) {
  const rec = c.players[idx];
  const up = Math.min(1, (rec?.upWeeks ?? 0) / Math.max(1, rounds));
  return 1 + UP_BONUS * up + pateBonus(c, idx);
}
export function seasonBridge(c) {
  for (const idx of prospectsOf(c)) if (c.players[idx]) c.players[idx].upWeeks = 0;
}

// Hochziehen: Wer schon dazugehört, legt los; wer nicht, ist nervös. Pate & Schützling.
export function onPromote(c, idx) {
  const rec = c.players[idx];
  if (!rec) return null;
  const ready = reifeOf(c, idx) >= 1;
  rec.form = ready ? READY_FORM : NERVOUS_FORM;
  const m = pateOf(c, idx);
  if (m != null && humanClub(c).squad.includes(m)) setRelation(c, idx, m, 'pate');
  delete paten(c)[idx];
  delete rec.trainsUp;
  delete rec.upWeeks;
  return ready
    ? tr(`${playerOf(c, idx).name} kennt das Tempo schon vom Mittrainieren – er ist sofort da.`, `${playerOf(c, idx).name} already knows the pace from training with the team – he is right at home.`)
    : tr(`${playerOf(c, idx).name} ist nervös: Das Tempo bei den Herren ist ein anderes.`, `${playerOf(c, idx).name} is nervous: the pace in senior football is something else.`);
}
