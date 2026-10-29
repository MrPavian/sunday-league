// Frauenteam (ROADMAP 11.9 „Neue Mannschaften“ und 11.11 „Jugendspielerinnen → Frauenteam“; Nutzerentscheid 2026-10-29: verwaltet
// und simuliert, ohne 3D-Spiele). Gegründet wird es wie bisher über die Geschichte „frauen“ (sagas.js); ab der Saison danach hat es
// einen echten Kader mit Spielerinnen, eine Trainerin und eine eigene Liga mit Tabelle. Die Ergebnisse rechnet das schnelle
// Pokalmodell (pokal.js QUICK, an der Engine gemessen), parallel zu den Spieltagen der Herren.
// Hängt über hooks.js ein (migrate, startWeek, finishRound, nextSeason); der Zustand liegt in c.women und fehlt ohne Frauenteam.
// Alle Zufälle laufen über eigene, aus Saison und Spieltag abgeleitete Ströme – nichts verschiebt die bestehenden Würfe.
//
// QUELLEN:
//  - Schiedsrichter-Spesen Frauen je Heimspiel, Verband Westfalen 2025/26 (Kreisschiedsrichterausschuss Paderborn,
//    https://www.flvw-kreis-paderborn.de/data/downloads/SR_Spesen_Kreis_PB_01.07.2025.pdf): Kreisliga 22 €, Bezirksliga 25 €,
//    Landesliga 28 € + 2 × 18 € Assistenten, Westfalenliga (hier: Verbandsliga) 35 € + 2 × 25 €. Assistenten wie bei den Herren
//    erst ab der Landesliga (Annahme ohne Quelle, finances.js REF_FEE).
//  - Vornamen nach Jahrgang: data/girlnames.js.
// Spielwerte (keine Quelle): acht Mannschaften je Liga (doppelte Runde, 14 Spieltage), 16 Spielerinnen, Ligastärken (unten),
// Entwicklung je Alter, Abgänge und Neuzugänge.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { girlName, hairIndex, personIdentity, skinIndex } from '../data/origins.js';
import { girlsOfYear } from '../data/girlnames.js';
import { HAIR_COLORS, SKIN_TONES } from '../data/names.js';
import { humanClub, roundRobin, seasonOver } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { poisson, QUICK } from './pokal.js';
import { chronicle, yearOf } from './sagas.js';

// Ligen der Frauen. mean: mittlere Stärke der besten elf, hergeleitet aus den gemessenen Herrenstufen Kreisklasse C bis Bezirksliga
// (docs/KONZEPT-SPIELERSTAERKE.md, Abschnitt 1: 57,1 / 59,3 / 62,7 / 68,9) – eine Frauenliga so stark wie die Herrenstufe darüber
// gezählt ab der Kreisklasse C. Spielwert, bis das neue Stärkemodell kommt.
export const WOMEN_LEAGUES = [
  { name: tr('Frauen-Kreisliga', "Women's District League"), mean: 57.1, ref: 22 },
  { name: tr('Frauen-Bezirksliga', "Women's County League"), mean: 59.3, ref: 25 },
  { name: tr('Frauen-Landesliga', "Women's State League"), mean: 62.7, ref: 28 + 2 * 18 },
  { name: tr('Frauen-Verbandsliga', "Women's Regional League"), mean: 68.9, ref: 35 + 2 * 25 },
];
export const TEAMS = 8;
export const SQUAD = 16;
const SPREAD = 3; // Streuung der Gegnerstärke (Punkte): ±100 Elo aus dem Konzept, Abschnitt 3, umgerechnet mit 7,7 Punkten je 237 Elo
const SHAPE = { gk: 2, def: 5, mid: 5, fwd: 4 };
const GOAL_WEIGHT = { gk: 0, def: 1, mid: 2, fwd: 4 }; // wer die Tore schießt (Spielwert)
const OPP = tr(
  ['TSV Birkenau', 'SV Grün-Weiß Oberdorf', 'FC Lindenallee', 'SpVgg Hasenmoor', 'Sportfreunde Tannenhof', 'TuS Kiesgrube', 'Rot-Weiß Brückenau', 'Eintracht Wiesengrund', 'SC Fuchsberg', 'VfL Schilfwiese', 'DJK Mühlbach', 'FFC Kanaltal'],
  ['Birchwood', 'Upper Village', 'Lime Avenue', 'Hare Moor', 'Fir Farm', 'Gravel Pit', 'Bridgeton', 'Meadow United', 'Fox Hill', 'Reedmeadow', 'Millbrook', 'Canal Valley Ladies'],
);
const OPP_SHORT = ['TSB', 'GWO', 'FCL', 'HAS', 'TAN', 'KIE', 'BRB', 'WIE', 'FUC', 'SCH', 'MÜH', 'FFC'];
const OWN = 'own';

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x3c6ef372);
const rngFor = (c, ...k) => createRng(hashSeed(c.seed ?? 0, c.season ?? 1, ...k));
const clampR = (r) => Math.round(Math.max(25, Math.min(95, r)));

export const women = (c) => c.women ?? null;
export const ageOf = (c, p) => yearOf(c) - p.born;
export const leagueDef = (w) => WOMEN_LEAGUES[w.level ?? 0];

// --- Kader ------------------------------------------------------------------------------------------------------

function newPlayer(c, rng, { pos, age, rating, name = null, fromYouth = false }) {
  const w = c.women;
  const born = yearOf(c) - age;
  const id = personIdentity(rng, age);
  const last = id.name.split(' ').slice(1).join(' ');
  const look = { skin: SKIN_TONES[skinIndex(rng, id.origin)], hair: HAIR_COLORS[hairIndex(rng, id.origin, age)], long: rng.chance(0.75) };
  return { id: w.nextId++, name: name ?? `${girlName(rng, girlsOfYear(born))} ${last}`, born, pos, rating: clampR(rating), look, joined: c.season, fromYouth, apps: 0, goals: 0, total: { apps: 0, goals: 0 } };
}

const strengthOf = (list) => {
  const top = list.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return top.reduce((s, x) => s + x, 0) / Math.max(1, top.length);
};
export const teamStrength = (w) => strengthOf(w.squad);

// Neue Mannschaft: aus der Gründung (saga.frauen). strength (0–0,9) der alten Geschichte verschiebt die Kaderstärke.
function create(c) {
  const fr = c.saga.frauen;
  const rng = rngFor(c, 7101);
  c.women = { v: 1, level: 0, squad: [], nextId: 1, league: null, history: [], coach: null, captain: fr.captain, results: [] };
  const w = c.women;
  const base = WOMEN_LEAGUES[0].mean + ((fr.strength ?? 0.35) - 0.5) * 16;
  for (const [pos, n] of Object.entries(SHAPE)) for (let i = 0; i < n; i++) w.squad.push(newPlayer(c, rng, { pos, age: rng.int(17, 32), rating: base + rng.gauss() * 4 }));
  // Die Kapitänin aus der Gründung spielt mit.
  w.squad[SHAPE.gk + SHAPE.def].name = fr.captain;
  const coachAge = rng.int(32, 55);
  const cid = personIdentity(rng, coachAge);
  w.coach = { name: `${girlName(rng, girlsOfYear(yearOf(c) - coachAge))} ${cid.name.split(' ').slice(1).join(' ')}`, age: coachAge };
}

// Aus der Jugend (academy.js, personal.js): mit 16 ins Frauenteam. talent 0–1 (wie die Jugend), Stärke: Spielwert.
export function addFromYouth(c, { name, talent = 0.4, age = 16 }) {
  if (!c.saga?.frauen) return null;
  if (!c.women) create(c);
  const w = c.women;
  const rng = rngFor(c, 7102, w.nextId);
  const pos = rng.pick(['def', 'mid', 'mid', 'fwd']);
  const p = newPlayer(c, rng, { pos, age, rating: leagueDef(w).mean - 8 + talent * 12, name, fromYouth: true });
  w.squad.push(p);
  return p;
}

// --- Liga -------------------------------------------------------------------------------------------------------

function newLeague(c) {
  const w = c.women;
  const rng = rngFor(c, 7103);
  const ids = OPP.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  ids.length = TEAMS - 1;
  const def = leagueDef(w);
  const opps = ids.map((i) => ({ id: `w${i}`, name: OPP[i], short: OPP_SHORT[i], strength: def.mean + rng.gauss() * SPREAD }));
  w.league = { season: c.season, level: w.level, opps, days: roundRobin([OWN, ...opps.map((o) => o.id)], rng), played: 0 };
  // Saisonwerte in die Gesamtstatistik, dann von vorn.
  for (const p of w.squad) {
    p.total.apps += p.apps;
    p.total.goals += p.goals;
    Object.assign(p, { apps: 0, goals: 0 });
  }
}

const nameOf = (w, id) => (id === OWN ? null : w.league.opps.find((o) => o.id === id)?.name);

export function womenTable(c, league = c.women?.league) {
  const w = c.women;
  if (!w || !league) return [];
  const club = humanClub(c);
  const rows = [{ id: OWN, name: club.name, short: club.short, own: true }, ...league.opps.map((o) => ({ id: o.id, name: o.name, short: o.short, own: false }))].map((r) => ({ ...r, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const day of league.days)
    for (const f of day) {
      if (!f.result) continue;
      const h = by[f.home];
      const a = by[f.away];
      h.played++; a.played++;
      h.gf += f.result.home; h.ga += f.result.away; a.gf += f.result.away; a.ga += f.result.home;
      if (f.result.home > f.result.away) { h.w++; a.l++; h.pts += 3; } else if (f.result.home < f.result.away) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
    }
  return rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || (a.own ? -1 : 1));
}

// Ein Spieltag der Frauen. Torschützinnen nach Position und Stärke gewichtet (Spielwert).
function playDay(c, k) {
  const w = c.women;
  const l = w.league;
  const rng = rngFor(c, 7104, k);
  const str = (id) => (id === OWN ? teamStrength(w) : l.opps.find((o) => o.id === id).strength);
  let own = null;
  for (const f of l.days[k]) {
    const d = str(f.home) - str(f.away);
    f.result = { home: poisson(rng, QUICK.base * Math.exp(QUICK.perPoint * d + QUICK.home)), away: poisson(rng, QUICK.base * Math.exp(-QUICK.perPoint * d)) };
    if (f.home === OWN || f.away === OWN) own = f;
  }
  l.played = k + 1;
  if (!own) return null;
  const home = own.home === OWN;
  const goals = home ? own.result.home : own.result.away;
  const eleven = [...w.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  for (const p of eleven) p.apps++;
  const scorers = [];
  const pool = eleven.filter((p) => GOAL_WEIGHT[p.pos] > 0);
  for (let g = 0; g < goals && pool.length; g++) {
    const total = pool.reduce((s, p) => s + GOAL_WEIGHT[p.pos] * p.rating, 0);
    let x = rng.next() * total;
    const p = pool.find((q) => (x -= GOAL_WEIGHT[q.pos] * q.rating) <= 0) ?? pool[0];
    p.goals++;
    scorers.push(p.name.split(' ')[0]);
  }
  if (home) book(c, tr('Schiri Frauen', "Referee (women's team)"), -leagueDef(w).ref);
  const res = { season: c.season, day: k + 1, home, opp: nameOf(w, home ? own.away : own.home), gf: goals, ga: home ? own.result.away : own.result.home, scorers };
  w.results = [...w.results, res].slice(-10);
  return res;
}

// Spieltage nachziehen: so viele, wie es dem Stand der Herren-Saison entspricht; am Saisonende alle.
export function playDue(c) {
  const w = c.women;
  if (!w?.league || w.league.archived) return [];
  const l = w.league;
  const W = l.days.length;
  const R = Math.max(1, c.fixtures?.length ?? 1);
  const target = seasonOver(c) ? W : Math.min(W, Math.floor(((c.round ?? 0) * W) / R));
  const out = [];
  while (l.played < target) {
    const r = playDay(c, l.played);
    if (r) out.push(r);
  }
  if (l.played >= W) archive(c);
  return out;
}

// Restliche Spieltage ohne Rücksicht auf die Herren (Saisonende ohne letzten Spieltag, z. B. nach der Relegation).
function finishLeague(c) {
  const l = c.women.league;
  while (l.played < l.days.length) playDay(c, l.played);
  archive(c);
}

// Runde abschließen: Platz in die Geschichte, Auf- und Abstieg.
function archive(c) {
  const w = c.women;
  const l = w.league;
  if (l.archived) return;
  l.archived = true;
  const rows = womenTable(c, l);
  const pos = rows.findIndex((r) => r.own) + 1;
  const me = rows[pos - 1];
  const up = pos === 1 && w.level < WOMEN_LEAGUES.length - 1;
  const down = pos === rows.length && w.level > 0;
  const entry = { season: l.season, level: l.level, league: WOMEN_LEAGUES[l.level].name, pos, pts: me.pts, w: me.w, d: me.d, l: me.l, gf: me.gf, ga: me.ga, champion: rows[0].name, up, down };
  w.history.push(entry);
  c.saga.frauen.seasons.push({ season: l.season, pos }); // Chronik (club.js)
  if (up) w.level++;
  if (down) w.level--;
  const lg = WOMEN_LEAGUES[l.level].name;
  const text = pos === 1
    ? tr(`Frauen: Meister der ${lg}!${up ? ` Aufstieg in die ${WOMEN_LEAGUES[w.level].name}.` : ''}`, `Women's team: champions of the ${lg}!${up ? ` Promoted to the ${WOMEN_LEAGUES[w.level].name}.` : ''}`)
    : tr(`Frauen: ${pos}. Platz in der ${lg}.${down ? ' Abstieg.' : ''}`, `Women's team: finished ${pos} in the ${lg}.${down ? ' Relegated.' : ''}`);
  if (pos === 1) {
    chronicle(c, tr(`Die Frauen werden Meister der ${lg} (Kapitänin ${w.captain}).`, `The women's team wins the ${lg} (captain ${w.captain}).`));
    adjustMood(c, 0.04);
  }
  c.week?.chat.splice(1, 0, { from: null, text, time: 'Mo 08:22' });
}

// --- Saisonwechsel: Entwicklung, Abgänge, Neuzugänge ---------------------------------------------------------------

// Zuwachs je Saison nach Alter (Spielwert, Verlauf wie die Alterskurve der Herren, development.js: Höhepunkt Mitte 20).
const GROWTH = (age) => (age <= 19 ? 3 : age <= 22 ? 2 : age <= 26 ? 0.5 : age <= 30 ? 0 : age <= 33 ? -1 : -2);

function turnover(c) {
  const w = c.women;
  const rng = rngFor(c, 7105);
  const notes = [];
  for (const p of w.squad) {
    p.rating = clampR(p.rating + GROWTH(ageOf(c, p)) + rng.gauss() * 1.2);
  }
  // Abgänge: ab 34 hört gut jede Dritte auf, ab 30 manche, sonst zieht mal eine weg (Studium, Umzug). Spielwerte.
  const leaving = w.squad.filter((p) => {
    const age = ageOf(c, p);
    return rng.chance(age >= 34 ? 0.35 : age >= 30 ? 0.08 : 0.05);
  });
  for (const p of leaving) notes.push(ageOf(c, p) >= 30 ? tr(`${p.name} beendet ihre Laufbahn im Frauenteam.`, `${p.name} retires from the women's team.`) : tr(`${p.name} verlässt das Frauenteam (Umzug).`, `${p.name} leaves the women's team (moving away).`));
  w.squad = w.squad.filter((p) => !leaving.includes(p));
  if (!w.squad.some((p) => p.name === w.captain) && w.squad.length) {
    w.captain = [...w.squad].sort((a, b) => ageOf(c, b) + b.rating / 10 - (ageOf(c, a) + a.rating / 10))[0].name;
    c.saga.frauen.captain = w.captain;
    notes.push(tr(`Neue Kapitänin der Frauen: ${w.captain}.`, `New women's team captain: ${w.captain}.`));
  }
  // Neuzugänge bis zur Kadergröße, fehlende Torhüterinnen zuerst.
  const def = leagueDef(w);
  while (w.squad.length < SQUAD) {
    const pos = w.squad.filter((p) => p.pos === 'gk').length < 2 ? 'gk' : rng.pick(['def', 'mid', 'mid', 'fwd']);
    const p = newPlayer(c, rng, { pos, age: rng.int(17, 28), rating: def.mean - 1 + rng.gauss() * 4 });
    w.squad.push(p);
    notes.push(tr(`Neu im Frauenteam: ${p.name} (${ageOf(c, p)}).`, `New in the women's team: ${p.name} (${ageOf(c, p)}).`));
  }
  return notes;
}

// --- Hooks (hooks.js) ---------------------------------------------------------------------------------------------

function sync(c) {
  const fr = c.saga?.frauen;
  if (!fr) return false;
  if (!c.women) create(c);
  const w = c.women;
  if (fr.founded < c.season && (!w.league || w.league.season !== c.season) && !seasonOver(c)) {
    if (w.league && !w.league.archived) finishLeague(c); // alte Runde zu Ende rechnen, bevor die neue beginnt
    newLeague(c);
  }
  return true;
}

export function migrate(c) {
  sync(c);
}
export function startWeek(c) {
  sync(c);
}
export function finishRound(c) {
  if (!sync(c)) return;
  for (const r of playDue(c)) {
    const score = `${r.gf}:${r.ga}`;
    const who = r.scorers.length ? tr(` Tore: ${r.scorers.join(', ')}.`, ` Goals: ${r.scorers.join(', ')}.`) : '';
    c.week?.chat.splice(1, 0, { from: null, text: r.home ? tr(`Frauen: ${score} zu Hause gegen ${r.opp}.${who}`, `Women's team: ${score} at home to ${r.opp}.${who}`) : tr(`Frauen: ${score} auswärts bei ${r.opp}.${who}`, `Women's team: ${score} away at ${r.opp}.${who}`), time: 'Mo 08:21' });
  }
}
export function nextSeason(c) {
  const w = c.women;
  if (!w || w.turnover === c.season) return;
  w.turnover = c.season;
  for (const text of turnover(c)) c.week?.chat.push({ from: null, text, time: 'Mo 08:23' });
}
