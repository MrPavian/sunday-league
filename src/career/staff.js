// Ehrenamt selbst besetzen: Co-Trainer, Wirt, Platzwart und Jugendleiter muss man nicht
// erst von einem Ehemaligen erben. Zwei Wege:
//
// - Aus dem Kader: Ein Spieler (ab 25) übernimmt das Amt nebenher, ohne Geld. Verlässt er
//   den Verein, ist das Amt wieder frei. Hört er auf, behält er es als Ehemaliger.
// - Aushang im Vereinsheim: Jemand von außen übernimmt das Amt und bekommt dafür eine
//   steuerfreie Pauschale. Das ist die übliche Form im Amateurverein. Seit 1.1.2026 gelten
//   (Steueränderungsgesetz 2025):
//     Übungsleiterpauschale (§ 3 Nr. 26 EStG) 3.300 € im Jahr = 275 € im Monat, für Trainer,
//     Ehrenamtspauschale (§ 3 Nr. 26a EStG) 960 € im Jahr = 80 € im Monat, für Wirt,
//     Platzwart und Jugendleiter.
//   Wir zahlen die volle Pauschale.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { personName } from '../data/origins.js';
import { book } from './finances.js';
import { coachQuality, STAFF_ROLES } from './youth.js';

export const UEBUNGSLEITER_MONTH = 275; // 3.300 € / 12
export const EHRENAMT_MONTH = 80; // 960 € / 12
export const STAFF_MIN_AGE = 25;
export const ROLES = ['cotrainer', 'wirt', 'platzwart', 'jugendleiter'];
export const feeOf = (role) => (role === 'cotrainer' ? UEBUNGSLEITER_MONTH : EHRENAMT_MONTH);
export const weeklyFee = (role) => Math.round((feeOf(role) * 12) / 52);

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x1b873593);

// Wer hat schon ein Amt? (Spieler aus dem Kader, Ehemalige)
export function holders(c) {
  const out = new Set();
  for (const r of ['cotrainer', 'wirt', 'platzwart']) if (c.staff?.[r]?.idx != null) out.add(c.staff[r].idx);
  if (c.youth?.coach?.from != null) out.add(c.youth.coach.from);
  return out;
}

export const holderOf = (c, role) => (role === 'jugendleiter' ? c.youth?.coach : c.staff?.[role]) ?? null;

// Kandidaten aus dem Kader: ab 25, nicht du, noch ohne Amt. Für Trainerämter die Besten zuerst.
export function squadCandidates(c, role, { playerOf, squad }) {
  const busy = holders(c);
  return squad
    .filter((idx) => idx !== c.coach?.idx && !busy.has(idx) && playerOf(c, idx).age >= STAFF_MIN_AGE)
    .map((idx) => ({ idx, name: playerOf(c, idx).name, quality: Math.round(coachQuality(playerOf(c, idx)) * 100) / 100 }))
    .sort((a, b) => (role === 'cotrainer' || role === 'jugendleiter' ? b.quality - a.quality : 0));
}

// Wer sich auf den Aushang meldet: je Saison und Amt eine Person.
export function outsideCandidate(c, role) {
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, ROLES.indexOf(role), 41));
  const age = Math.round(rng.range(38, 67));
  return { name: personName(rng, age), age, fee: feeOf(role), quality: Math.round(rng.range(0.3, 0.55) * 100) / 100 };
}

// Per Aushang nur, wenn die Kasse den ersten Monat zahlen kann.
export const canAffordOutside = (c, role) => (c.cash ?? 0) >= feeOf(role);

// Amt besetzen. who: { idx } aus dem Kader oder 'outside'.
export function appointStaff(c, role, who, deps) {
  if (!ROLES.includes(role)) return false;
  if (who === 'outside') {
    if (!canAffordOutside(c, role)) return false;
    const cand = outsideCandidate(c, role);
    const rec = { idx: null, name: cand.name, fee: cand.fee, outside: true, since: c.season };
    if (role === 'jugendleiter') c.youth.coach = { name: cand.name, quality: cand.quality, from: null, fee: cand.fee, outside: true };
    else c.staff[role] = rec;
    return true;
  }
  const cand = squadCandidates(c, role, deps).find((x) => x.idx === who.idx);
  if (!cand) return false;
  if (role === 'jugendleiter') c.youth.coach = { name: cand.name, quality: cand.quality, from: cand.idx, playing: true };
  else c.staff[role] = { idx: cand.idx, name: cand.name, playing: true, since: c.season };
  return true;
}

// Amt abgeben. Der Jugendleiter wird nicht leer: Dann macht es wieder der alte Heinz.
export function releaseStaff(c, role) {
  if (role === 'jugendleiter') c.youth.coach = { name: 'Heinz Brückner', quality: 0.4, from: null };
  else if (c.staff?.[role]) c.staff[role] = null;
  else return false;
  return true;
}

// Jede Woche: Pauschalen zahlen; wer aus dem Kader den Verein verlassen hat, gibt das Amt ab.
export function weeklyStaff(c, { squad }) {
  const notes = [];
  const inSquad = new Set(squad);
  const alumni = new Set((c.alumni ?? []).map((a) => a.idx));
  for (const role of ROLES) {
    const h = holderOf(c, role);
    if (!h) continue;
    const idx = role === 'jugendleiter' ? h.from : h.idx;
    if (h.playing && idx != null && !inSquad.has(idx) && !alumni.has(idx)) {
      releaseStaff(c, role);
      notes.push(tr(`${h.name} ist weg – das Amt ${roleLabel(role)} ist wieder frei.`, `${h.name} has left – the ${roleLabel(role)} post is vacant again.`));
      continue;
    }
    if (!h.outside || !h.fee) continue;
    // Leere Kasse: Die Pauschale bleibt aus – und wer nicht bezahlt wird, hört auf. Schulden gibt es nicht.
    if (c.cash < weeklyFee(role)) {
      releaseStaff(c, role);
      notes.push(tr(`Die Kasse ist leer: ${h.name} bekommt die Pauschale nicht mehr und hört als ${roleLabel(role)} auf.`, `The kitty is empty: ${h.name} no longer gets the allowance and quits as ${roleLabel(role)}.`));
      continue;
    }
    book(c, tr(`Pauschale ${roleLabel(role)} (${h.name})`, `Allowance ${roleLabel(role)} (${h.name})`), -weeklyFee(role));
  }
  return notes;
}

export const roleLabel = (role) => (role === 'jugendleiter' ? tr('Jugendleiter', 'youth director') : STAFF_ROLES[role].name);
