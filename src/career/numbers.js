// Feste Rückennummern (vom Nutzer gewünscht, 2026-11-13). Ab der Kreisklasse C (Stufe 2) trägt jeder Spieler der eigenen
// Mannschaft seine Nummer, bis er geht oder der Trainer sie ändert; darunter (Hinterhof, Freizeitliga) gibt es wie bisher die
// Nummer nach Aufstellung. Vergeben wird beim ersten Bedarf: der Torwart die 1, Feldspieler die klassische Nummer ihrer
// Position (Abwehr 2–5, Mittelfeld 6, 8, 10, Angriff 7, 9, 11), sonst die kleinste freie ab 12. Nummern von Vereinslegenden
// können gesperrt werden (legends.js) und werden dann nicht mehr vergeben. Nur Anzeige: Die Simulation liest die Nummer nicht.
// Die klassische Zuordnung ist die übliche 1–11 nach Position (hergeleitet aus der traditionellen Nummerierung), ein Spielwert.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { hasProfile } from '../sim/profiles.js';

export const NUMBERS_FROM = 2; // Kreisklasse C
export const NUMBER_MAX = 99;
export const RETIRE_MIN = 3; // Saisons, nach denen der Verein eine gesperrte Nummer von Hand wieder freigeben kann
export const RETIRE_MAX = 10; // nach so vielen Saisons wird sie von selbst wieder frei (vom Nutzer gewünscht: sonst fallen irgendwann alle weg)
const groupOf = (pos) => (pos === 'gk' ? 'gk' : pos === 'def' ? 'def' : pos === 'fwd' || pos === 'att' ? 'att' : 'mid');
// Typische Nummern je Rolle (vom Nutzer gewünscht 2026-11-15): Torwart 1, Spielmacher 10, defensiver Mittelfeldspieler 6,
// Mittelstürmer 9, Flügel 7 und 11, Innenverteidiger 4 und 5, Außenverteidiger 2 und 3. Die Rolle ergibt sich aus den Werten
// im Vergleich zum Kader. Etwas Abwechslung (Spielwerte, fest je Spieler): Jeder Fünfte tauscht die ersten beiden Wünsche, jeder
// Zwanzigste hat eine Lieblingsnummer; wer keine klassische bekommt, landet auf einer festen Nummer zwischen 12 und 33.
const FAVOURITES = [13, 14, 17, 19, 20, 21, 23, 27];
const hashN = (...parts) => parts.reduce((h, x) => (Math.imul(h ^ (Number(x) | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);
const av = (p, k) => p?.attrs?.[k] ?? 0.5;
const groupIdx = (c, i) => groupOf(playerOf(c, i)?.position ?? playerOf(c, i)?.role);
const rankIn = (c, list, idx, score) => [...list].sort((a, b) => score(playerOf(c, b)) - score(playerOf(c, a))).indexOf(idx);
function wishes(c, squad, idx, salt) {
  const p = playerOf(c, idx);
  const g = groupIdx(c, idx);
  const same = squad.filter((i) => groupIdx(c, i) === g);
  let list;
  if (g === 'gk') list = rankIn(c, same, idx, (q) => av(q, 'keeping')) === 0 ? [1] : [12, 22, 1];
  else if (g === 'def') list = rankIn(c, same, idx, (q) => av(q, 'tackling') + av(q, 'heading') - av(q, 'pace') * 0.5) < 2 ? [4, 5, 3, 2] : [2, 3, 5, 4];
  else if (g === 'att') {
    const r = rankIn(c, same, idx, (q) => av(q, 'shooting') + av(q, 'heading') * 0.5);
    list = r === 0 ? [9, 11, 7] : av(p, 'pace') >= 0.55 ? [7, 11, 9] : [11, 7, 9];
  } else {
    const play = hasProfile(p, 'spielmacher') || rankIn(c, same, idx, (q) => av(q, 'passing') + av(q, 'technique')) === 0;
    const holder = rankIn(c, same, idx, (q) => av(q, 'tackling') + av(q, 'stamina') * 0.5 - av(q, 'technique') * 0.3) === 0;
    list = play ? [10, 8, 6] : holder ? [6, 8, 5] : [8, 6, 7, 11, 10];
  }
  const h = hashN(idx, salt);
  if (h % 100 < 5) list = [FAVOURITES[(h >>> 8) % FAVOURITES.length], ...list];
  else if (h % 100 < 20 && list.length > 1 && list[0] !== 1) list = [list[1], list[0], ...list.slice(2)];
  return { list, spare: 12 + ((h >>> 12) % 22) };
}
function pick(used, { list, spare }) {
  let n = list.find((x) => !used.has(x));
  for (let k = 0; n == null && k < NUMBER_MAX; k++) {
    const x = 12 + ((spare - 12 + k) % (NUMBER_MAX - 11));
    if (!used.has(x)) n = x;
  }
  for (let x = 1; n == null && x <= NUMBER_MAX; x++) if (!used.has(x)) n = x;
  return n ?? null;
}

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
  s[idx] = pick(used, wishes(c, humanClub(c).squad, idx, c.seed ?? 0));
  return s[idx];
}

// Gegner (ROADMAP 11.18 Punkt 14, 2026-11-15): feste Nummern auch bei den anderen Vereinen, ohne Spielstand. Vergeben wird nach
// derselben Zuordnung nach Rolle (wishes); solange der Kader gleich bleibt, bleibt auch die Nummer gleich.
export function clubNumbers(c, club) {
  const out = new Map();
  if (!numbersOn(c)) return out;
  const used = new Set();
  // Die Stärksten wählen zuerst; die Rolle ergibt sich aus dem Vergleich im Kader (wishes).
  const order = [...club.squad].sort((a, b) => (playerOf(c, b)?.rating ?? 0) - (playerOf(c, a)?.rating ?? 0));
  for (const idx of order) {
    const n = pick(used, wishes(c, club.squad, idx, String(club.id).length * 131 + (c.seed ?? 0)));
    out.set(idx, n);
    used.add(n);
  }
  return out;
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
