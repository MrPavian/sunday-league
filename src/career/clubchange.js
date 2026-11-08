// Vereinswechsel nach der Entlassung (pressure.js, Nutzerentscheid 2026-11-05 „Ultimatum, dann Wechsel“): Man übernimmt einen
// anderen Verein derselben Liga, mitten in der Saison mit dessen Punkten und Spielplan. Der alte Verein spielt als CPU-Verein
// weiter (man trifft ihn wieder). Was am Verein hängt – Kasse, Anlage, Platz, Sponsoren, Jugend, Ämter, Feste, Chronik –,
// beginnt beim neuen Verein von vorn; was an der eigenen Figur hängt – Familie, Kraft, Auszeichnungen, Vermächtnis, Kenntnis
// der Spieler –, kommt mit. Die bisherige Vereinsgeschichte steht in career.pastClubs.
// Startkasse und Grundausstattung des neuen Vereins nach Liga sind Spielwerte.
// Ligaübergreifend (ROADMAP 11.17 Punkt 2, 2026-11-06): Im Sommer kommen Anfragen aus der Liga darüber für erfolgreiche Trainer
// (summerOffers), nach einer Entlassung im Sommer auch eine aus der Liga darunter (pressure.js). Der Wechsel in eine andere Liga
// geht nur zum Saisonstart (moveTo): Die neue Liga bekommt frische Kader und einen neuen Spielplan, der alte Verein spielt als
// CPU-Verein in seiner Liga weiter.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { clubById, humanClub, migrateCareer, proMap, roundRobin, seasonOver, squadPicker, SQUAD_SHAPES, startWeek, table, takenIndices } from './career.js';
import { EXTRA_CLUBS, LEAGUES, maxLevel } from './clubs.js';
import { leagueTitle, localized } from './verband.js';
import { ensureContracts } from './contracts.js';
import { isPresident } from './personal.js';
import { homeUnit } from './finances.js';
import { facilities } from './facilities.js';
import { setSeasonGoal } from './board.js';
import { board, TRUST } from './pressure.js';
import { chronicle } from './sagas.js';
import { ensureLeagues, syncOwnLeague } from './pyramid.js';

// Vereinsgebunden: wird beim Wechsel gelöscht und von migrateCareer frisch angelegt.
export const CLUB_KEYS = ['cash', 'ledger', 'sponsors', 'sponsorBans', 'offers', 'fines', 'seasonCards', 'spirit', 'tripBooked', 'platz', 'youth', 'staff', 'alumni', 'festival', 'cups', 'saga', 'tiger', 'eventLog', 'transfers', 'clubLife', 'renewals', 'facilities', 'rivals', 'relations', 'academy', 'women', 'oldBoys', 'hired', 'pendingGrumble', 'arcs', 'formers', 'pokale', 'euroQual', 'euroHistory', 'relegation', 'museum', 'reviews', 'founded'];
const CLUB_FLAGS = ['derbyRival', 'unrest', 'poached', 'chatFeud', 'summerfest', 'anniversary', 'talentScout', 'pressWeeks', 'fans', 'waiveUp', 'derbyFair'];

// Grundausstattung, die ein Verein dieser Liga schon hat (Spielwert): unten nichts, oben Stadion und Flutlicht.
const BASE_FACILITIES = [
  [5, ['flutlicht', 'grill', 'stehstufen']],
  [6, ['tribuene']],
  [7, ['sitzplaetze', 'tribdach']],
  [8, ['stadion']],
  [10, ['drittliga', 'flutlicht800']],
  [11, ['arena', 'rasenheizung', 'flutlicht1200', 'nlz']], // was die Zulassung der Liga verlangt (license.js)
  [12, ['sitzplatz8000', 'flutlicht1800']],
];
export const startCash = (level) => Math.max(200, Math.round(homeUnit(level) * 6)); // sechs mittlere Heimspiele (Spielwert)

export function takeOver(c, clubId) {
  const fired = board(c).fired;
  const old = humanClub(c);
  const neu = clubById(c, clubId);
  if (fired?.away?.some((o) => o.id === clubId) && c.round === 0) return moveTo(c, clubId, fired.away.find((o) => o.id === clubId).level, fired.reason);
  if (!neu || neu.human || !fired?.offers.includes(clubId)) return false;
  // Alter Verein wird CPU-Verein; die eigene Figur nimmt man mit, wenn sie im Kader steht.
  const coachIdx = c.coach?.idx;
  old.human = false;
  old.tiers ??= { ok: 0.5, gut: 0.35, stark: 0.15 };
  neu.human = true;
  if (coachIdx != null && old.squad.includes(coachIdx)) {
    old.squad = old.squad.filter((i) => i !== coachIdx);
    neu.squad.push(coachIdx);
  }
  syncOwnLeague(c); // Vereinsliste der Liga: der alte Verein ist jetzt CPU-Verein, der neue nicht mehr (pyramid.js)
  freshStart(c, old, neu, fired.reason);
  return true;
}

// Was am Verein hängt, fängt neu an (Entlassung und Sommerwechsel).
function freshStart(c, old, neu, reason, welcome = null) {
  const b0 = board(c);
  (c.pastClubs ??= []).push({ id: old.id, name: old.name, short: old.short, from: c.coach?.clubSince ?? 1, to: reason === 'summer' ? c.season - 1 : c.season, history: c.history ?? [], reason });
  c.history = [];
  for (const k of CLUB_KEYS) delete c[k];
  for (const k of CLUB_FLAGS) delete c.flags?.[k];
  if (c.cpuCoaches) delete c.cpuCoaches[neu.id];
  if (c.coach) {
    delete c.coach.office; // wieder an der Linie (auch nach der Abwahl als Präsident)
    c.coach.clubSince = c.season;
  }
  c.founded = 1900 + ((c.seed ?? 0) + [...neu.id].reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 110;
  Object.assign(c, { pendingGrumble: [], arcs: [], cups: {} });
  migrateCareer(c);
  c.cash = startCash(c.level ?? 1);
  if (!seasonOver(c)) setSeasonGoal(c); // neuer Verein, neue Ansage
  for (const [lv, ids] of BASE_FACILITIES) if ((c.level ?? 1) >= lv) for (const id of ids) facilities(c).built[id] = c.season;
  const b = board(c);
  Object.assign(b, { trust: TRUST.newClub, warned: false, ultimatum: null, losses: 0, fired: null, votes: b0.votes ?? [] });
  chronicle(c, tr(`Neuer Verein: ${neu.name} übernimmt den Trainer von ${old.name}.`, `New club: ${neu.name} take over the manager from ${old.name}.`));
  if (!seasonOver(c)) {
    c.week = null;
    ensureContracts(c); // Profiverein: die Spieler haben schon Verträge (keine Meldung „erster Vertrag“)
    startWeek(c);
  }
  c.week?.chat.splice(1, 0, { from: null, text: welcome ?? tr(`Willkommen bei ${neu.name}! Der Vorstand gibt dir Rückendeckung – erstmal.`, `Welcome to ${neu.name}! The board backs you – for now.`), time: 'Mo 08:00' });
}

// --- Ligaübergreifend -------------------------------------------------------------------------------------------------
const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x1b873593);
const idHash = (id) => [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
const freshRecord = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, posXp: {} });
export const SUMMER = { champion: 2, podium: 1, maxPos: 3 }; // Anfragen im Sommer: Meister zwei, Zweiter und Dritter eine (Spielwerte)

// Vereine einer Liga, die einen Trainer suchen könnten (fest je Saison, kein Zufall aus dem Spielstand).
function pickClubs(c, level, n, salt, exclude = []) {
  const pool = (ensureLeagues(c)[level] ?? []).filter((d) => !exclude.includes(d.id));
  return pool
    .map((d) => ({ d, h: hash(c.seed ?? 0, c.season ?? 1, level, salt, idHash(d.id)) }))
    .sort((a, b) => a.h - b.h)
    .slice(0, n)
    .map(({ d }) => ({ id: d.id, name: d.name, level }));
}

// Anfragen am Saisonende für einen erfolgreichen Trainer: aus der Liga darüber, in der obersten Liga von größeren Vereinen derselben.
// Wird nur berechnet, nicht gespeichert – erst die Zusage (setSummerMove) steht im Spielstand.
export function summerOffers(c) {
  if (!seasonOver(c) || !c.fixtures?.length || isPresident(c) || board(c).fired) return [];
  const rows = table(c);
  const pos = rows.findIndex((r) => r.club.human) + 1;
  if (!pos || pos > SUMMER.maxPos) return [];
  const n = pos === 1 ? SUMMER.champion : SUMMER.podium;
  const level = c.level ?? 1;
  if (level < maxLevel(c)) return pickClubs(c, level + 1, n, 1);
  // Oberste Liga: die Vereine der oberen Tabellenhälfte (fest je Saison gemischt).
  const top = rows.slice(0, Math.ceil(rows.length / 2)).filter((r) => !r.club.human).map((r) => ({ id: r.club.id, name: r.club.name, level, h: hash(c.seed ?? 0, c.season ?? 1, 2, idHash(r.club.id)) }));
  return top.sort((a, b) => a.h - b.h).slice(0, n).map(({ h, ...o }) => o);
}

// Zusage oder Absage (Knopf am Saisonende). Der Wechsel selbst passiert beim Saisonwechsel (nextSeason).
export function setSummerMove(c, id) {
  const o = summerMove(c)?.id === id ? null : summerOffers(c).find((x) => x.id === id); // zweiter Tipp: doch bleiben
  c.summerMove = o ? { id: o.id, level: o.level, season: c.season } : null;
  return !!o;
}
export const summerMove = (c) => (c.summerMove?.season === c.season ? c.summerMove : null);

// Übernimmt zum Saisonstart einen Verein einer anderen Liga (oder derselben: Sommerwechsel in der obersten Liga).
// Gesucht wird der Verein dort, wo er jetzt spielt – er kann im Sommer selbst auf- oder abgestiegen sein.
export function moveTo(c, clubId, wanted, reason = 'summer') {
  if ((c.round ?? 0) !== 0 || seasonOver(c)) return false;
  const leagues = ensureLeagues(c);
  const old = humanClub(c);
  const oldLevel = c.level ?? 1;
  const family = new Set([c.coach?.idx, ...(c.coach?.children ?? []).map((k) => k.idx)].filter((x) => x != null && old.squad.includes(x)));
  const own = clubById(c, clubId);
  if (own) {
    // Gleiche Liga (oberste Liga): Tausch wie nach der Entlassung, die Kader bleiben, der Spielplan auch.
    if (own.human) return false;
    old.human = false;
    old.tiers ??= { ok: 0.5, gut: 0.35, stark: 0.15 };
    old.squad = old.squad.filter((i) => !family.has(i));
    own.human = true;
    own.squad.push(...family);
    syncOwnLeague(c);
    freshStart(c, old, own, reason, welcomeText(c, own, reason));
    news(c, old, own);
    return true;
  }
  const level = [wanted, ...Object.keys(leagues).map(Number)].find((l) => leagues[l]?.some((d) => d.id === clubId));
  const def = level ? leagues[level].find((d) => d.id === clubId) : null;
  if (!def || level > maxLevel(c)) return false;
  // Die eigene Figur und ihre Kinder im Kader kommen mit; alle anderen Spieler der alten Liga verlassen den Spielstand.
  for (const club of c.clubs) for (const idx of club.squad) if (!family.has(idx)) delete c.players[idx];
  for (const idx of c.youth?.prospects ?? []) if (!family.has(idx)) delete c.players[idx];
  syncOwnLeague(c);
  const { squad, human, ...oldDef } = old;
  leagues[oldLevel] = leagues[oldLevel].filter((d) => d.id !== clubId).concat({ ...oldDef, tiers: old.tiers ?? { ok: 0.5, gut: 0.35, stark: 0.15 } });
  leagues[level] = leagues[level].filter((d) => d.id !== clubId);
  const { squad: s0, human: h0, ...neuDef } = def;
  // Neue Liga: frische Kader für alle (wie beim Auf- und Abstieg in career.js nextSeason).
  const league = LEAGUES[level];
  const used = new Set([...Object.keys(c.players).map(Number), ...takenIndices(c)]);
  const pick = squadPicker(createRng(hash(c.seed ?? 0, c.season ?? 1, 97, idHash(clubId))), used, (c.strength ?? 1) >= 3 ? level : null, proMap(c));
  const shape = SQUAD_SHAPES[league.squadShape];
  const size = c.leagueSize ?? 6;
  const extras = size >= 8 ? (EXTRA_CLUBS[level] ?? []).map((e) => localized(c, e, level, leagues)) : [];
  const neu = { ...neuDef, human: true, squad: [...pick(neuDef.tiers, shape), ...family] };
  const others = [...leagues[level], ...extras].map((d) => ({ ...d, human: false, squad: pick(d.tiers, shape) }));
  const clubs = [neu, ...others];
  for (const club of clubs) for (const idx of club.squad) c.players[idx] ??= freshRecord();
  Object.assign(c, { level, league: leagueTitle(c, level), clubs, fixtures: roundRobin(clubs.map((x) => x.id), createRng(hash(c.seed ?? 0, c.season ?? 1, 96))) });
  syncOwnLeague(c);
  freshStart(c, old, neu, reason, welcomeText(c, neu, reason, level < oldLevel));
  news(c, old, neu);
  return true;
}

const welcomeText = (c, neu, reason, down = false) => (down
  ? tr(`Willkommen bei ${neu.name} in der ${c.league}! Ein Schritt zurück, um wieder anzugreifen.`, `Welcome to ${neu.name} in the ${c.league}! A step back to attack again.`)
  : reason === 'summer'
    ? tr(`Willkommen bei ${neu.name} in der ${c.league}! Neuer Verein, neue Kabine – der Vorstand erwartet viel von dir.`, `Welcome to ${neu.name} in the ${c.league}! New club, new dressing room – the board expects a lot from you.`)
    : null);
const news = (c, old, neu) => (c.pendingNews ??= []).push(tr(`Kreisblatt: Der Trainer von ${old.name} wechselt zu ${neu.name}.`, `District Gazette: the ${old.name} manager moves to ${neu.name}.`));

// Hook (hooks.js): Saisonwechsel – eine angenommene Sommer-Anfrage wird jetzt wirksam.
export function nextSeason(c) {
  const m = c.summerMove;
  if (!m) return;
  delete c.summerMove;
  if (m.season !== c.season - 1) return;
  if (!moveTo(c, m.id, m.level, 'summer')) c.week?.chat.splice(1, 0, { from: null, text: tr('Der Wechsel ist geplatzt: Der Verein hat sich anders entschieden. Du bleibst.', 'The move has fallen through: the club changed its mind. You stay.'), time: 'Mo 08:00' });
}
