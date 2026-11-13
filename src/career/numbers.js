// Feste Rückennummern (vom Nutzer gewünscht, 2026-11-13). Ab der Kreisklasse C (Stufe 2) trägt jeder Spieler der eigenen
// Mannschaft seine Nummer, bis er geht oder der Trainer sie ändert; darunter (Hinterhof, Freizeitliga) gibt es wie bisher die
// Nummer nach Aufstellung. Vergeben wird beim ersten Bedarf: der Torwart die 1, Feldspieler die klassische Nummer ihrer
// Position (Abwehr 2–5, Mittelfeld 6, 8, 10, Angriff 7, 9, 11), sonst die kleinste freie ab 12. Nummern von Vereinslegenden
// können gesperrt werden (legends.js) und werden dann nicht mehr vergeben. Nur Anzeige: Die Simulation liest die Nummer nicht.
// Die klassische Zuordnung ist die übliche 1–11 nach Position (hergeleitet aus der traditionellen Nummerierung), ein Spielwert.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';

export const NUMBERS_FROM = 2; // Kreisklasse C
export const NUMBER_MAX = 99;
export const RETIRE_MIN = 3; // Saisons, nach denen der Verein eine gesperrte Nummer von Hand wieder freigeben kann
export const RETIRE_MAX = 10; // nach so vielen Saisons wird sie von selbst wieder frei (vom Nutzer gewünscht: sonst fallen irgendwann alle weg)
const CLASSIC = { gk: [1], def: [2, 3, 4, 5], mid: [6, 8, 10], att: [9, 7, 11] };
const groupOf = (pos) => (pos === 'gk' ? 'gk' : pos === 'def' ? 'def' : pos === 'fwd' || pos === 'att' ? 'att' : 'mid');

export const numbersOn = (c) => (c.level ?? 1) >= NUMBERS_FROM;
export const retiredNumbers = (c) => c.retiredNumbers ?? [];
const store = (c) => (c.numbers ??= {});
// Nummern, die gerade jemand im Kader trägt (ohne `except`).
function taken(c, except = null) {
  const out = new Set(retiredNumbers(c).map((r) => r.n));
  for (const idx of humanClub(c).squad) if (idx !== except && c.numbers?.[idx] != null) out.add(c.numbers[idx]);
  return out;
}
export const numberFree = (c, n, except = null) => Number.isInteger(n) && n >= 1 && n <= NUMBER_MAX && !taken(c, except).has(n);

// Nummer eines Spielers der eigenen Mannschaft; vergibt sie beim ersten Aufruf. null, solange es keine festen Nummern gibt.
export function numberOf(c, idx) {
  if (!numbersOn(c) || !humanClub(c).squad.includes(idx)) return null;
  const s = store(c);
  if (s[idx] != null && numberFree(c, s[idx], idx)) return s[idx];
  const used = taken(c, idx);
  const p = playerOf(c, idx);
  const want = CLASSIC[groupOf(p?.position ?? p?.role)] ?? [];
  let n = want.find((x) => !used.has(x));
  for (let x = 12; n == null && x <= NUMBER_MAX; x++) if (!used.has(x)) n = x;
  for (let x = 1; n == null && x <= NUMBER_MAX; x++) if (!used.has(x)) n = x;
  s[idx] = n ?? null;
  return s[idx];
}

// Der Trainer ändert eine Nummer. Trägt sie ein anderer, tauschen die beiden. false: Nummer ungültig oder gesperrt.
export function setNumber(c, idx, n) {
  n = Number(n);
  if (!numbersOn(c) || !humanClub(c).squad.includes(idx) || !Number.isInteger(n) || n < 1 || n > NUMBER_MAX) return false;
  if (retiredNumbers(c).some((r) => r.n === n)) return false;
  const mine = numberOf(c, idx);
  const other = humanClub(c).squad.find((i) => i !== idx && numberOf(c, i) === n);
  store(c)[idx] = n;
  if (other != null) store(c)[other] = mine;
  return true;
}

// Nummer einer Legende sperren: Niemand trägt sie mehr; wer sie gerade hat, bekommt beim nächsten Bedarf eine neue.
export function retireNumber(c, n, name) {
  if (!Number.isInteger(n) || retiredNumbers(c).some((r) => r.n === n)) return false;
  (c.retiredNumbers ??= []).push({ n, name, season: c.season });
  for (const idx of humanClub(c).squad) if (c.numbers?.[idx] === n) delete c.numbers[idx];
  return true;
}

// Sperre aufheben: von Hand frühestens nach RETIRE_MIN Saisons (force: ohne Frist, für den Ablauf).
export const canRelease = (c, r) => !!r && c.season - r.season >= RETIRE_MIN;
export function releaseNumber(c, n, force = false) {
  const r = retiredNumbers(c).find((x) => x.n === n);
  if (!r || (!force && !canRelease(c, r))) return false;
  c.retiredNumbers = c.retiredNumbers.filter((x) => x !== r);
  return true;
}

// Zur neuen Saison: Sperren laufen nach RETIRE_MAX Saisons ab; Nummern von Spielern, die nicht mehr im Kader sind, werden frei.
export function nextSeason(c) {
  for (const r of [...retiredNumbers(c)]) {
    if (c.season - r.season < RETIRE_MAX) continue;
    releaseNumber(c, r.n, true);
    (c.pendingNews ??= []).push(tr(`Die Nummer ${r.n} von ${r.name} wird nach ${RETIRE_MAX} Jahren wieder vergeben. Sein Trikot bleibt im Vereinsheim hängen.`, `${r.name}'s number ${r.n} is issued again after ${RETIRE_MAX} years. His shirt stays on the clubhouse wall.`));
  }
  if (!c.numbers) return;
  const squad = new Set(humanClub(c).squad);
  for (const k of Object.keys(c.numbers)) if (!squad.has(Number(k))) delete c.numbers[k];
}
