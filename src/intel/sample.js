// Messspiele der Nachbarligen (AFS Phase 5b, docs/ADVANCED-FOOTBALL-SYSTEM-05B-SAMPLE.md; Entscheidung E2 a in
// docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md Abschnitt 11.1).
// Nutzerentscheide 2026-11-27:
//   - Gemessen werden die Nachbarn aus dem Transfermarkt (career/transfers.js genNeighbors: je Nachbarliga NEIGHBOR_CLUBS Vereine
//     mit festem Kader für die Saison). Keine neuen Kader.
//   - Ein Messspiel je Spieltag, abwechselnd Liga darunter und darüber, mit voller Engine. Das Ergebnis zählt nirgends: keine
//     Tabelle (die bleibt Poisson, pyramid.js simTable), keine Verletzungen, Karten, Form oder Chronik. Erfasst werden nur die
//     Spielerzeilen wie in der eigenen Liga (career/seasonstats.js), getrennt in career.an.nb.
//   - Kader und Daten gelten eine Saison (closeSeasonAnalytics löscht sie, genNeighbors zieht neu).
// Kein Zufallsstrom des Spielstands: eigener Seed aus Spielstand, Saison und Spieltag.
import { createRng } from '../core/rng.js';
import { LEAGUES } from '../career/clubs.js';
import { resolveKits, simulateSync, teamForMatch } from '../career/career.js';
import { coachOf } from '../career/opponents.js';
import { membersOf, venueFor } from '../career/pyramid.js';
import { addRow, PKEYS } from '../career/seasonstats.js';
import { tstate } from '../career/transfers.js';
import { KEYS } from '../sim/analytics.js';
import { createMatch, MATCH } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { allPlayers, subRuleFor } from '../sim/squad.js';

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491); // wie career.js

// Schalter der Schicht: aus = keine Messspiele (Stand vor Phase 5b).
export const SAMPLE = { on: true };
const PAIRS = [[0, 1], [1, 2], [2, 0]];
const ABSENT = 0.15; // wie career.js aiAvailability

// Messdaten der Saison: { s: Saison, k: zuletzt gemessener Spieltag, n: { Nachbar-ID: Spiele }, p: { Spieler: Zeile } }.
export function sampleStore(career, create = false) {
  const nb = career.an?.nb;
  if (nb?.s === career.season || !create) return nb?.s === career.season ? nb : null;
  career.an ??= { v: 1, keys: KEYS, clubs: {}, history: [] };
  career.an.nb = { s: career.season, k: null, n: {}, p: {} };
  return career.an.nb;
}

// Paarung dieses Spieltags: { level, home, away } (Nachbar-Datensätze) oder null.
export function sampleFixture(career) {
  if (!SAMPLE.on) return null;
  const nbs = tstate(career).neighbors ?? [];
  const levels = [...new Set(nbs.map((n) => n.level))].sort((a, b) => a - b);
  if (!levels.length) return null;
  const r = career.round ?? 0;
  const level = levels[r % levels.length];
  const clubs = nbs.filter((n) => n.level === level && n.squad?.length);
  if (clubs.length < 2) return null;
  const turn = Math.floor(r / levels.length);
  const pairs = clubs.length === 2 ? [[0, 1]] : PAIRS;
  const [a, b] = pairs[turn % pairs.length];
  const swap = Math.floor(turn / pairs.length) % 2 === 1;
  return { level, home: swap ? clubs[b] : clubs[a], away: swap ? clubs[a] : clubs[b] };
}

// Verein fürs Spiel: Stammdaten aus der Vereinsliste der Nachbarliga (Trikot, Platz, Trainer), Kader vom Nachbarn.
function asClub(career, n) {
  const def = membersOf(career, n.level).find((d) => `n:${d.id}` === n.id);
  return def ? { ...def, squad: n.squad, human: false } : null;
}

export function prepareSample(career, { duration } = {}) {
  const fx = sampleFixture(career);
  if (!fx) return null;
  const home = asClub(career, fx.home);
  const away = asClub(career, fx.away);
  if (!home || !away) return null;
  const league = LEAGUES[fx.level];
  const rng = createRng(hashSeed(career.seed ?? 0, career.season ?? 0, career.round ?? 0, fx.level, 5150));
  const base = PITCHES[venueFor(home.venue, fx.level)];
  const pitch = { ...base, format: league.format ?? base.format, referee: league.referee || !!base.referee };
  const avail = (c) => Object.fromEntries(c.squad.map((i) => [i, rng.chance(ABSENT) ? 'no' : 'yes']));
  const kits = resolveKits(home, away);
  const teams = [teamForMatch(career, kits.home, pitch.format, avail(home), rng), teamForMatch(career, kits.away, pitch.format, avail(away), rng)];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human: false, duration, incidents: true });
  match.subRule = subRuleFor(MATCH.subs, fx.level);
  match.coachPersona = [coachOf(home).type, coachOf(away).type];
  return { match, fixture: fx, sample: true };
}

// Nur die Spielerzeilen (wie seasonstats.js recordSeasonAnalytics) und die Zahl der Messspiele je Nachbar.
export function recordSample(career, prepared) {
  const m = prepared?.match;
  if (!m?.an) return;
  const nb = sampleStore(career, true);
  nb.k = career.round ?? 0;
  for (const n of [prepared.fixture.home, prepared.fixture.away]) nb.n[n.id] = (nb.n[n.id] ?? 0) + 1;
  for (const p of allPlayers(m)) {
    const r = m.an.players[p.id];
    if (p.poolIndex == null || !r || !KEYS.some((k) => r[k])) continue;
    const share = (m.stats?.players?.[p.id]?.seconds ?? 0) / (m.duration || 1);
    nb.p[p.poolIndex] = addRow(nb.p[p.poolIndex], { ...r, share }, PKEYS);
  }
}

// Das Messspiel dieses Spieltags (app/matchflow.js runRound). run: Simulation (im Browser in Häppchen). Höchstens eins je Spieltag.
export async function playSample(career, run = simulateSync, opts = {}) {
  if (!SAMPLE.on || sampleStore(career)?.k === (career.round ?? 0)) return null;
  const prepared = prepareSample(career, opts);
  if (!prepared) return null;
  await run(prepared);
  recordSample(career, prepared);
  return prepared;
}
