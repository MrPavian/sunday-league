// Vereinswechsel nach der Entlassung (pressure.js, Nutzerentscheid 2026-11-05 „Ultimatum, dann Wechsel“): Man übernimmt einen
// anderen Verein derselben Liga, mitten in der Saison mit dessen Punkten und Spielplan. Der alte Verein spielt als CPU-Verein
// weiter (man trifft ihn wieder). Was am Verein hängt – Kasse, Anlage, Platz, Sponsoren, Jugend, Ämter, Feste, Chronik –,
// beginnt beim neuen Verein von vorn; was an der eigenen Figur hängt – Familie, Kraft, Auszeichnungen, Vermächtnis, Kenntnis
// der Spieler –, kommt mit. Die bisherige Vereinsgeschichte steht in career.pastClubs.
// Startkasse und Grundausstattung des neuen Vereins nach Liga sind Spielwerte.
import { tr } from '../core/i18n.js';
import { clubById, humanClub, migrateCareer, seasonOver, startWeek } from './career.js';
import { homeUnit } from './finances.js';
import { facilities } from './facilities.js';
import { setSeasonGoal } from './board.js';
import { board, TRUST } from './pressure.js';
import { chronicle } from './sagas.js';
import { syncOwnLeague } from './pyramid.js';

// Vereinsgebunden: wird beim Wechsel gelöscht und von migrateCareer frisch angelegt.
export const CLUB_KEYS = ['cash', 'ledger', 'sponsors', 'sponsorBans', 'offers', 'fines', 'seasonCards', 'spirit', 'tripBooked', 'platz', 'youth', 'staff', 'alumni', 'festival', 'cups', 'saga', 'tiger', 'eventLog', 'transfers', 'clubLife', 'renewals', 'facilities', 'rivals', 'relations', 'academy', 'women', 'oldBoys', 'hired', 'pendingGrumble', 'arcs', 'formers', 'pokale', 'relegation', 'museum', 'reviews', 'founded'];
const CLUB_FLAGS = ['derbyRival', 'unrest', 'poached', 'chatFeud', 'summerfest', 'anniversary', 'talentScout', 'pressWeeks', 'fans', 'waiveUp', 'derbyFair'];

// Grundausstattung, die ein Verein dieser Liga schon hat (Spielwert): unten nichts, oben Stadion und Flutlicht.
const BASE_FACILITIES = [
  [5, ['flutlicht', 'grill', 'stehstufen']],
  [6, ['tribuene']],
  [7, ['sitzplaetze', 'tribdach']],
  [8, ['stadion']],
  [10, ['drittliga', 'flutlicht800']],
];
export const startCash = (level) => Math.max(200, Math.round(homeUnit(level) * 6)); // sechs mittlere Heimspiele (Spielwert)

export function takeOver(c, clubId) {
  const fired = board(c).fired;
  const old = humanClub(c);
  const neu = clubById(c, clubId);
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
  (c.pastClubs ??= []).push({ id: old.id, name: old.name, short: old.short, from: c.coach?.clubSince ?? 1, to: c.season, history: c.history ?? [], reason: fired.reason });
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
  Object.assign(b, { trust: TRUST.newClub, warned: false, ultimatum: null, losses: 0, fired: null });
  chronicle(c, tr(`Neuer Verein: ${neu.name} übernimmt den Trainer von ${old.name}.`, `New club: ${neu.name} take over the manager from ${old.name}.`));
  if (!seasonOver(c)) {
    c.week = null;
    startWeek(c);
  }
  c.week?.chat.splice(1, 0, { from: null, text: tr(`Willkommen bei ${neu.name}! Der Vorstand gibt dir Rückendeckung – erstmal.`, `Welcome to ${neu.name}! The board backs you – for now.`), time: 'Mo 08:00' });
  return true;
}
