// Zweite Mannschaft (ROADMAP 11.17 Punkt 4): Ab der Regionalliga kann der Verein eine Zweite melden. Dort spielen, wer am
// Wochenende bei der Ersten nicht zum Einsatz kam, und A-Jugendliche ab 18. Die Zweite hat eine eigene Liga mit Tabelle,
// Auf- und Abstieg; ihre Spiele laufen im Hintergrund (kein 3D-Spiel). Wer dort spielt, bekommt Spielpraxis: Er entwickelt
// sich wie ein Ergänzungsspieler statt wie einer, der nur auf der Bank sitzt, und murrt weniger über fehlende Einsätze.
//
// Regeln (DFB, „Wo dürfen zweite Mannschaften spielen?“, https://www.dfb.de/news/detail/wo-duerfen-zweite-mannschaften-spielen-das-ist-zu-beachten-144294):
//  - Zwei Mannschaften eines Vereins spielen nicht in derselben Spielklasse: die Zweite eines Regionalligisten höchstens Oberliga.
//  - Zweite Mannschaften von Drittligisten spielen nicht in der Regionalliga.
//  - Aufstieg in die Lizenzligen (2./1. Liga) ist ausgeschlossen, wenn der Verein dort schon spielt (§ 55 DFB-Spielordnung, zitiert bei
//    Sport1, https://www.sport1.de/fussball/3-liga/2020/02/3-liga-die-2-mannschaft-des-fc-bayern-muenchen-darf-nicht-aufsteigen);
//    im Spiel steigt die Zweite ohnehin nie über die Regionalliga (3. Liga für Erstligisten, wie Bayern II).
// Spielwerte: Neue Zweite beginnt in der untersten Klasse (Kreisklasse C), wie neu gemeldete Mannschaften; 16 Mannschaften, Hin- und
// Rückrunde, zwei steigen auf, drei ab; Kosten für Schiedsrichter, Fahrten und Meldegeld je Woche.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { NIVEAU_TARGET, PRO_TARGET } from '../sim/niveau.js';
import { book } from './finances.js';
import { membersOf } from './pyramid.js';

export const RESERVE_FROM = 9;
export const RESERVE_START = 2; // Kreisklasse C – die unterste Klasse mit Meisterschaft (die Freizeitliga zählt nicht)
export const RESERVE_TEAMS = 16;
export const RESERVE_ROUNDS = 2 * (RESERVE_TEAMS - 1);
export const RESERVE_UP = 2;
export const RESERVE_DOWN = 3;
// Höchste Liga der Zweiten je Liga der Ersten (DFB, siehe oben).
export const RESERVE_CAP = { 9: 8, 10: 8, 11: 9, 12: 10 };
export const reserveCap = (firstLevel) => RESERVE_CAP[Math.min(12, firstLevel)] ?? Math.max(1, firstLevel - 1);
export const reserveCost = (level) => 40 + 20 * level; // Spielwert, € je Woche

const strengthAt = (level) => (level >= 9 ? PRO_TARGET[Math.min(12, level)] : NIVEAU_TARGET[Math.max(0, level - 1)]);
const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x6a09e667);

export const reserveOf = (c) => c.reserve ?? null;
export const canRegister = (c) => !c.reserve && (c.level ?? 1) >= RESERVE_FROM;

// Neue Liga für die Zweite: 15 Gegner (Zweite anderer Vereine oder Dorfvereine), Stärke um das Ligamittel.
function freshLeague(c, level, names) {
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, level, 5));
  const base = strengthAt(level);
  const pool = [...names];
  const teams = [];
  for (let i = 0; i < RESERVE_TEAMS - 1; i++) {
    const name = pool.length ? pool.splice(rng.int(0, pool.length - 1), 1)[0] : tr(`SV Feld ${i + 1}`, `SV Feld ${i + 1}`);
    teams.push({ name, str: Math.round(base + rng.range(-8, 8)), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  }
  teams.push({ name: tr('Zweite Mannschaft', 'Reserves'), own: true, str: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  return teams;
}

// Namen der Gegner: die Vereine dieser Liga, dazu Zweite Mannschaften von Vereinen aus den drei Ligen darüber („TSV Musterdorf II“).
function opponentNames(c, level) {
  const human = (c.clubs ?? []).find((x) => x.human)?.name;
  const name = (d) => d?.name ?? d;
  const second = (n) => (/ I{2,3}$/.test(n) ? n : `${n} II`);
  const out = membersOf(c, level).map(name);
  for (let l = level + 1; l <= level + 3; l++) out.push(...membersOf(c, l).map((d) => second(name(d))));
  return [...new Set(out.filter((n) => n && n !== human && n !== `${human} II`))];
}

export function registerReserve(c) {
  if (!canRegister(c)) return false;
  c.reserve = { level: RESERVE_START, since: c.season ?? 1, round: 0, last: null, teams: freshLeague(c, RESERVE_START, opponentNames(c, RESERVE_START)), history: [] };
  return true;
}

export function withdrawReserve(c) {
  if (!c.reserve) return false;
  c.reserve = null;
  return true;
}

// Erwartete Tore aus dem Stärkeabstand (Spielwert: 15 Stärkepunkte = eine Liga ≈ Faktor 2).
const lambda = (us, them) => Math.min(4.5, Math.max(0.2, 1.35 * 2 ** ((us - them) / 15))); // gedeckelt: auch ein klarer Favorit gewinnt nicht jede Woche zweistellig
function poisson(rng, l) {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 12);
  return k - 1;
}
function play(rng, a, b) {
  const ga = poisson(rng, lambda(a.str, b.str));
  const gb = poisson(rng, lambda(b.str, a.str));
  for (const [t, f, x] of [[a, ga, gb], [b, gb, ga]]) {
    t.gf += f;
    t.ga += x;
    if (f > x) (t.w++, (t.p += 3));
    else if (f === x) (t.d++, (t.p += 1));
    else t.l++;
  }
  return [ga, gb];
}

// Spielplan nach Kreisverfahren: Runde r, Paarungen (i, j).
function pairings(round, n = RESERVE_TEAMS) {
  const r = round % (n - 1);
  const idx = [...Array(n).keys()];
  const rot = [idx[0], ...idx.slice(1).map((_, k) => idx[1 + ((k + r) % (n - 1))])];
  const out = [];
  for (let i = 0; i < n / 2; i++) out.push([rot[i], rot[n - 1 - i]]);
  return out;
}

// Wer aus dem Kader spielt am Wochenende in der Zweiten? Fit, nicht gesperrt, nicht bei der Ersten eingesetzt; dazu A-Jugendliche
// ab 18. Die übrigen Plätze besetzen die eigenen Amateure der Zweiten.
// deps: { playerOf, squad, prospects, usedFirst (Set), unavailable (idx → bool) }
export function reserveSquad(c, { playerOf, squad, prospects = [], usedFirst = new Set(), unavailable = () => false }) {
  const pick = (list) => list.filter((idx) => !usedFirst.has(idx) && !unavailable(idx));
  const senior = pick(squad).map((idx) => ({ idx, r: playerOf(c, idx).rating }));
  const youth = pick(prospects)
    .map((idx) => ({ idx, r: playerOf(c, idx).rating, age: playerOf(c, idx).age, youth: true }))
    .filter((x) => x.age >= 18);
  return [...senior, ...youth].sort((a, b) => b.r - a.r).slice(0, 11);
}

// Spieltag der Zweiten (einmal je Ligarunde der Ersten). Gibt eine Chatzeile zurück oder null.
export function reserveMatchday(c, deps) {
  const res = c.reserve;
  if (!res || res.round >= RESERVE_ROUNDS) return null;
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, res.round, 23));
  const eleven = reserveSquad(c, deps);
  const own = res.teams.find((t) => t.own);
  // Die Zweite hat eigene Amateure: Fehlen Spieler aus dem Kader, füllen sie auf – Stärke knapp unter dem Ligamittel (Spielwert).
  const fill = strengthAt(res.level) - 5;
  own.str = (eleven.reduce((s, x) => s + x.r, 0) + fill * (11 - eleven.length)) / 11;
  const ownIdx = res.teams.indexOf(own);
  let line = null;
  for (const [i, j] of pairings(res.round)) {
    const a = res.teams[i];
    const b = res.teams[j];
    if (i !== ownIdx && j !== ownIdx) {
      play(rng, a, b);
      continue;
    }
    const opp = i === ownIdx ? b : a;
    const [gf, ga] = i === ownIdx ? play(rng, own, opp) : play(rng, opp, own).reverse();
    res.last = { opp: opp.name, gf, ga };
    for (const x of eleven) {
      const rec = c.players[x.idx];
      if (rec) rec.apps2 = (rec.apps2 ?? 0) + 1;
    }
    line = tr(`Zweite Mannschaft gegen ${opp.name}: ${gf}:${ga}.`, `Reserves v ${opp.name}: ${gf}–${ga}.`);
  }
  res.round++;
  book(c, tr('Zweite Mannschaft (Schiri, Fahrten, Meldegeld)', 'Reserves (referees, travel, fees)'), -reserveCost(res.level));
  return line;
}

export const reserveTable = (res) => [...res.teams].sort((a, b) => b.p - a.p || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name));

// Saisonende: Platz, Auf- oder Abstieg (nie über die Grenze der Liga der Ersten), neue Liga. Gibt eine Chatzeile zurück.
export function reserveSeasonEnd(c, firstLevel = c.level ?? 1) {
  const res = c.reserve;
  if (!res) return null;
  const table = reserveTable(res);
  const place = table.findIndex((t) => t.own) + 1;
  const cap = reserveCap(firstLevel);
  const before = res.level;
  let level = before;
  if (place <= RESERVE_UP) level++;
  else if (place > RESERVE_TEAMS - RESERVE_DOWN) level = Math.max(RESERVE_START, level - 1);
  const blocked = level > cap && before <= cap && level > before; // Aufstieg verwehrt
  level = Math.min(level, cap);
  res.history.push({ season: c.season ?? 1, level: before, place });
  Object.assign(res, { level, round: 0, last: null, teams: freshLeague(c, level, opponentNames(c, level)) });
  if (blocked) return tr(`Zweite Mannschaft: Platz ${place} – aufsteigen darf sie nicht, sie muss eine Liga unter der Ersten bleiben.`, `Reserves: finished ${place} – they may not go up, they must stay a league below the first team.`);
  if (level > before) return tr(`Zweite Mannschaft: Platz ${place} – Aufstieg!`, `Reserves: finished ${place} – promoted!`);
  if (level < before && before > cap) return tr(`Zweite Mannschaft: Sie muss eine Liga unter der Ersten spielen – Rückstufung.`, `Reserves: they must play a league below the first team – moved down.`);
  if (level < before) return tr(`Zweite Mannschaft: Platz ${place} – Abstieg.`, `Reserves: finished ${place} – relegated.`);
  return tr(`Zweite Mannschaft: Platz ${place}.`, `Reserves: finished ${place}.`);
}
