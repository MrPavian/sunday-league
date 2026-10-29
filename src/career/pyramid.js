// Ligenpyramide (ROADMAP 11.10): Jede Liga hat ihre eigene Vereinsliste (career.leagues), nicht mehr die feste aus clubs.js.
// Am Saisonende steigt in jeder Liga der beste CPU-Verein auf und der schlechteste der Liga darüber ab – vorher stieg nur der
// eigene Verein, die CPU-Vereine blieben für immer in ihrer Liga. Die Liga des eigenen Vereins zählt mit ihrer echten Tabelle,
// die anderen werden per Schnellmodell ausgespielt (Hin- und Rückrunde, Torerwartung wie im Pokal: QUICK in pokal.js).
// Die Ligen ohne den eigenen Verein haben je fünf Vereine (wie clubs.js); Zusatzvereine der großen Liga (EXTRA_CLUBS) gehören
// nur zur Liga des eigenen Vereins und steigen nicht.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { PITCHES } from '../sim/pitch.js';
import { EXTRA_CLUBS, LEAGUES, MAX_LEVEL } from './clubs.js';
import { poisson, QUICK } from './pokal.js';
import { leagueTitle } from './verband.js';

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491); // wie career.js
const stripSquad = ({ squad, human, ...def }) => def;
const isExtra = (level, id) => (EXTRA_CLUBS[level] ?? []).some((e) => e.id === id);

// Vereinslisten anlegen (alte Spielstände, neue Karriere): die festen Listen, für die eigene Liga die tatsächlichen Gegner.
export function ensureLeagues(career) {
  if (career.leagues) return career.leagues;
  const own = career.level ?? 1;
  career.leagues = {};
  for (let l = 1; l <= MAX_LEVEL; l++) {
    career.leagues[l] = l === own ? career.clubs.filter((c) => !c.human && !isExtra(l, c.id)).map(stripSquad) : LEAGUES[l].clubs.map((d) => ({ ...d }));
  }
  return career.leagues;
}

// Vereine einer Liga (ohne Kader), für Nachbarligen, Relegation und Pokale.
export const membersOf = (career, level) => (LEAGUES[level] ? ensureLeagues(career)[level] ?? LEAGUES[level].clubs : []);

// Platz passend zur Liga: Spielerzahl der Liga (Stufe 1: Kleinfeld bis 5 gegen 5). Passt der Heimplatz nicht (Aufsteiger aus dem
// Kleinfeld), spielt der Verein auf dem Platz, den die Liga verlangt; Absteiger in die Freizeitliga auf deren Standardplatz.
export function venueFor(venue, level) {
  const league = LEAGUES[level];
  const fmt = PITCHES[venue]?.format ?? 5;
  if (league.format ? fmt === league.format : fmt <= 5) return venue;
  return league.format ? league.humanVenue : LEAGUES[1].clubs[0].venue;
}

// Stärke eines Vereins wie im Pokal (pokal.js strength: Ø Wertung der besten n im Format der Liga): aus einem Probekader nach
// seiner Kadermischung (tiers) und Kadergröße, gezogen aus dem Spielerpool ohne ihn zu belegen (fest je Verein und Stufe).
// Ein Mittel über die Klassen allein lag nur 3–5 Punkte zwischen den Ligen – zu wenig, die Tabellen wären fast Zufall.
const strCache = new Map();
export function defStrength(def, pool, level) {
  const key = `${def.id}:${level}`;
  if (strCache.has(key)) return strCache.get(key);
  const league = LEAGUES[level];
  const size = SQUAD_SIZE[league.squadShape] ?? 12;
  const n = league.format ?? 5;
  const rng = createRng(hashSeed(level, ...[...def.id].map((ch) => ch.charCodeAt(0))));
  const tiers = Object.entries(def.tiers ?? { ok: 1 });
  const total = tiers.reduce((s, [, w]) => s + w, 0);
  let v = 0;
  for (let rep = 0; rep < STR_SAMPLES; rep++) {
    const ratings = [];
    for (let k = 0; k < size; k++) {
      let u = rng.next() * total;
      const tier = tiers.find(([, w]) => (u -= w) < 0)?.[0] ?? tiers[0][0];
      const list = pool.byTier(tier);
      if (list.length) ratings.push(list[Math.floor(rng.next() * list.length)].rating);
    }
    const top = ratings.sort((a, b) => b - a).slice(0, n);
    v += top.reduce((s, x) => s + x, 0) / Math.max(1, top.length) / STR_SAMPLES;
  }
  strCache.set(key, v);
  return v;
}
// Kadergröße je Liga (wie SQUAD_SHAPES in career.js); Mittel über STR_SAMPLES Probekader, damit ein Ausreißer nicht zählt.
const STR_SAMPLES = 12;
const SQUAD_SIZE = { small: 9, large: 13, xl: 15, xxl: 20 };

// Tabelle einer Liga ohne den eigenen Verein, ausgespielt per Schnellmodell (fest je Spielstand, Saison und Liga).
export function simTable(career, level, pool) {
  const defs = membersOf(career, level);
  const rng = createRng(hashSeed(career.seed, career.season, level, 7331));
  const rows = defs.map((d) => ({ id: d.id, pts: 0, gd: 0, gf: 0, str: defStrength(d, pool, level) }));
  for (const h of rows)
    for (const a of rows) {
      if (h === a) continue;
      const d = h.str - a.str;
      const gh = poisson(rng, QUICK.base * Math.exp(QUICK.perPoint * d + QUICK.home));
      const ga = poisson(rng, QUICK.base * Math.exp(-QUICK.perPoint * d));
      h.gf += gh;
      a.gf += ga;
      h.gd += gh - ga;
      a.gd += ga - gh;
      if (gh > ga) h.pts += 3;
      else if (gh < ga) a.pts += 3;
      else {
        h.pts++;
        a.pts++;
      }
    }
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.id.localeCompare(y.id)).map((r) => r.id);
}

// Saisonende: Auf- und Abstieg der CPU-Vereine zwischen allen Ligen. ownOrder: CPU-Vereine der eigenen Liga in Tabellenfolge.
// Gibt die Wechsel zurück ({ level, up, down } mit Vereinsnamen) – für Kreisblatt und Chronik.
export function cpuMoves(career, ownOrder, pool) {
  const leagues = ensureLeagues(career);
  const own = career.level ?? 1;
  const order = {};
  for (let l = 1; l <= MAX_LEVEL; l++) order[l] = l === own ? ownOrder.filter((id) => leagues[l].some((d) => d.id === id)) : simTable(career, l, pool);
  const moves = [];
  for (let l = 1; l < MAX_LEVEL; l++) {
    const upId = order[l][0];
    const downId = order[l + 1].at(-1);
    if (!upId || !downId) continue;
    const up = leagues[l].find((d) => d.id === upId);
    const down = leagues[l + 1].find((d) => d.id === downId);
    leagues[l] = leagues[l].filter((d) => d.id !== upId).concat({ ...down, venue: venueFor(down.venue, l) });
    leagues[l + 1] = leagues[l + 1].filter((d) => d.id !== downId).concat({ ...up, venue: venueFor(up.venue, l + 1) });
    moves.push({ level: l, up: up.name, down: down.name, upId, downId });
  }
  return moves;
}

// Kreisblatt: Auf- und Absteiger rund um die Liga, in der der eigene Verein nächste Saison spielt.
export function movesNotes(career, moves, level) {
  return moves
    .filter((m) => m.level === level || m.level === level - 1)
    .map((m) => tr(`Kreisblatt: ${m.up} steigt in die ${leagueTitle(career, m.level + 1)} auf, ${m.down} muss runter in die ${leagueTitle(career, m.level)}.`, `District Gazette: ${m.up} go up to the ${leagueTitle(career, m.level + 1)}, ${m.down} drop to the ${leagueTitle(career, m.level)}.`));
}

// Nach dem Saisonwechsel: Die eigene Liga hält ihre Vereinsliste aus den tatsächlichen Gegnern (Fusionen, neue Vereine).
export function syncOwnLeague(career) {
  const l = career.level ?? 1;
  ensureLeagues(career)[l] = career.clubs.filter((c) => !c.human && !isExtra(l, c.id)).map(stripSquad);
}
