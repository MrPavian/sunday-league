// Alte Herren (ROADMAP 11.9, „Neue Mannschaften“): das zweite Team im Verein – Ü32, wenig Training, viel Geselligkeit.
// Hängt über hooks.js ein (migrate, startWeek, finishRound, nextSeason); der Zustand liegt in c.oldBoys und fehlt, solange es
// keine Alten Herren gibt (alte Spielstände und Läufe ohne Team bleiben bitgleich).
//
// QUELLEN (Recherche 2026-10, Durchführungsbestimmungen der Landesverbände, jeweils Ü-Fußball):
//  - Altersgrenze: Ü32 = 32 Jahre vollendet im Spieljahr (Saarländischer Fußballverband, Durchführungsbestimmungen Ü-Fußball 24/25;
//    Fußballverband Niederrhein, Ü32-Spielrunde 2023/24; Kreis Heinsberg: nach Geburtsjahrgang). Darunter Ü40, Ü50, Ü60.
//  - Spielform: überwiegend Kleinfeld (Berliner Fußball-Verband 7er: 7 Spieler inkl. Torwart, Ü32 2 × 35 Min.; Kreis Heinsberg:
//    „alle Spiele auf einem Kleinspielfeld“), Großfeld im Pokal (Badischer Fußballverband, AH-Kreispokal Karlsruhe: 2 × 35 bis 2 × 45 Min.),
//    2 × 35 Min. als Regel (Saarland, Niedersachsen Ü32-Qualifikation). Auch Freundschaftsspiele nach Absprache.
//  - Verbände: saar-fv.de (Durchfuehrungsbestimmungen_Spielbetrieb-Ue_Fussball-24_25.pdf), kreis2.fvn.de
//    (durchfuehrungsbestimmungen_ue32_spielrunde_2023-24.pdf), berliner-fussball.de (Durchfuehrungsbestimmungen 7er 2025/26),
//    badfv.de (AH_Kreispokal_Durchfuehrungsbestimmungen.pdf), nfv.de (Ü32 Ausschreibung 2026/27).
// Daraus für das Spiel (Spielwerte, keine Verbandsvorgabe): Spieler ab 32; Spielform und -zeit wie die Liga des Vereins (kleiner
// Platz, kurze Halbzeiten); eine kleine Ü32-Runde mit sechs Mannschaften, einfach (5 Spiele), alle zwei Wochen am Freitagabend.
// Training gibt es nicht, dafür Bierkasse und Grillen: etwas Geld und Laune. Alle Zufälle laufen über eigene, aus Saison und
// Spieltag abgeleitete Ströme – nichts verschiebt die bestehenden Würfe.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { createMatch, MATCH, stepMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { subRuleFor } from '../sim/squad.js';
import { getPool, humanClub, leagueOf, MIN_SQUAD, playerOf, resolveKitClash, roundRobin, takenIndices, teamForMatch } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { applyWeather } from './weather.js';
import { chronicle } from './sagas.js';

export const SIM = { duration: undefined }; // Spielzeit in Sekunden für Skripte (longrun); sonst die Einstellung der Liga
export const AGE_MIN = 32; // Ü32
export const AGE_MAX = 45; // darüber ist Schluss (Spielwert)
export const FOUND_COST = 60; // Anmeldung, Trikotsatz (Spielwert, wie KIT_COST)
export const OH_ROUNDS = [1, 3, 5, 7, 9]; // Ligaspieltage, in deren Woche die Alten Herren Freitagabend spielen: alle zwei Wochen
export const MIN_FOUNDERS = 4; // so viele Ü32 im Umfeld braucht es zur Gründung (Spielwert)
const BEER_PER_HEAD = 0.75; // € Bierkasse je Spieler auf dem Platz bei Heimspielen (Spielwert)
const MOOD_PER_GAME = 0.012; // Geselligkeit: Stimmung der Ersten je Spiel der Alten Herren (Spielwert)
const GAMES_KEEP = 24;
const TIERS = { ok: 0.65, gut: 0.28, stark: 0.07 }; // Neuzugänge: ligagerecht schwach (Spielwert)

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x51ed270b);
const freshRecord = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, posXp: {} });

const OPP_NAMES = tr(
  ['AH TSV Birkenau', 'AH SV Grün-Weiß Oberdorf', 'AH FC Lindenallee', 'AH SpVgg Hasenmoor', 'AH Sportfreunde Tannenhof', 'AH TuS Kiesgrube', 'AH Rot-Weiß Brückenau', 'AH Eintracht Wiesengrund', 'AH SC Fuchsberg', 'AH VfL Schilfwiese'],
  ['Birchwood Old Boys', 'Upper Village Old Boys', 'Lime Avenue Old Boys', 'Hare Moor Old Boys', 'Fir Farm Old Boys', 'Gravel Pit Old Boys', 'Bridgeton Old Boys', 'Meadow Old Boys', 'Fox Hill Old Boys', 'Reedmeadow Old Boys'],
);
const OPP_SHORT = ['TSB', 'GWO', 'FCL', 'HAS', 'TAN', 'KIE', 'BRB', 'WIE', 'FUC', 'SCH'];
const KIT_SETS = [0xc8352f, 0x2f6fb5, 0x2e6b3a, 0xe0b020, 0x6b4f8c, 0xe8742a, 0x1d2b44, 0x4fa3e0, 0x9a6b4f, 0x8c2f2f];

// --- Zustand ----------------------------------------------------------------------------------------------------

export const oh = (c) => c.oldBoys ?? null;
export const founded = (c) => !!c.oldBoys;

function ensure(c) {
  const o = c.oldBoys;
  if (!o) return null;
  o.v ??= 1;
  o.squad ??= [];
  o.src ??= {}; // woher: first | alumni | former | new | coach | retired
  o.stats ??= {}; // Einsätze und Tore bei den Alten Herren
  o.hurt ??= {}; // verletzt: Spiele, die er noch fehlt
  o.offers ??= []; // Angebote bei Karriereende
  o.history ??= []; // abgeschlossene Runden
  o.games ??= []; // gespielte Spiele (die letzten GAMES_KEEP)
  o.totals ??= { w: 0, d: 0, l: 0, gf: 0, ga: 0, cash: 0 };
  o.nextId ??= 1;
  o.league ??= null;
  return o;
}

export const ohFormat = (c) => leagueOf(c).format ?? PITCHES[humanClub(c).venue]?.format ?? 5;
export const targetSize = (c) => Math.min(18, ohFormat(c) + 4);
export const maxSize = (c) => targetSize(c) + 3;

const ageOf = (c, idx) => playerOf(c, idx).age;
export const isMember = (c, idx) => !!c.oldBoys?.squad.includes(idx);

// --- Kader: wer kommt in Frage ---------------------------------------------------------------------------------

const inAnySquad = (c) => new Set([...c.clubs.flatMap((x) => x.squad), ...(c.transfers?.neighbors ?? []).flatMap((n) => n.squad)]);

// Wer kann zu den Alten Herren: Spieler der Ersten ab 32, Ehemalige (Ruheständler), ehemalige Spieler anderer Wege.
export function candidates(c) {
  const clubs = inAnySquad(c);
  const mine = new Set(oh(c)?.squad ?? []);
  const taken = takenIndices(c);
  const coachIdx = c.coach?.idx;
  const first = humanClub(c).squad.filter((i) => i !== coachIdx && ageOf(c, i) >= AGE_MIN && ageOf(c, i) <= AGE_MAX);
  const alumni = (c.alumni ?? [])
    .filter((a) => a.idx != null && a.idx !== coachIdx && !clubs.has(a.idx) && !mine.has(a.idx) && !(c.youth?.prospects ?? []).includes(a.idx) && !c.formers?.[a.idx]?.pro && ageOf(c, a.idx) >= AGE_MIN && ageOf(c, a.idx) <= AGE_MAX)
    .sort((a, b) => b.apps + b.goals * 2 - (a.apps + a.goals * 2))
    .map((a) => a.idx);
  const alu = new Set(alumni);
  const former = Object.keys(c.formers ?? {})
    .map(Number)
    .filter((i) => !alu.has(i) && !taken.has(i) && !mine.has(i) && !c.formers[i].pro && ageOf(c, i) >= AGE_MIN && ageOf(c, i) <= AGE_MAX);
  return { first, alumni, former };
}

export function foundCheck(c) {
  const cand = candidates(c);
  const n = cand.first.length + cand.alumni.length + cand.former.length;
  const reasons = [];
  if (n < MIN_FOUNDERS) reasons.push(tr(`Zu wenig Ü32 im Umfeld (${n} von ${MIN_FOUNDERS}).`, `Not enough over-32s around the club (${n} of ${MIN_FOUNDERS}).`));
  if (c.cash < FOUND_COST) reasons.push(tr(`Die Kasse reicht nicht (${FOUND_COST} €).`, `Not enough in the kitty (€${FOUND_COST}).`));
  return { ok: !reasons.length, cost: FOUND_COST, count: n, cand, reasons };
}

// Wunschzusammensetzung (Torwart zuerst), damit der Kader spielbar bleibt.
const WANT = ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'def', 'mid', 'fwd', 'gk', 'def', 'mid', 'fwd', 'def', 'mid', 'def', 'mid', 'fwd', 'def', 'mid'];
function missingPositions(c, have, n) {
  const tally = {};
  for (const i of have) {
    const p = playerOf(c, i).position;
    tally[p] = (tally[p] ?? 0) + 1;
  }
  const out = [];
  for (const pos of WANT.slice(0, Math.max(n, have.length))) {
    if (tally[pos] > 0) tally[pos]--;
    else out.push(pos);
  }
  return out.slice(0, Math.max(0, n - have.length));
}

let byKey = null;
function oldPlayers() {
  if (byKey) return byKey;
  byKey = {};
  for (const p of getPool().everyone()) (byKey[`${p.tier}:${p.position}`] ??= []).push(p.poolIndex);
  return byKey;
}
// Ü32-Spieler aus dem Pool für die gewünschten Positionen; Stufen nach Gewicht.
function pickOld(c, rng, positions, weights, used) {
  const lists = oldPlayers();
  const years = (c.season ?? 1) - 1;
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const tier = () => {
    let r = rng.next() * total;
    for (const [k, w] of entries) if ((r -= w) < 0) return k;
    return entries[0][0];
  };
  const out = [];
  for (const pos of positions) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const list = lists[`${tier()}:${pos}`];
      if (!list?.length) continue;
      const idx = rng.pick(list);
      const age = getPool().get(idx).age + years;
      if (used.has(idx) || age < AGE_MIN || age > AGE_MAX - 3) continue;
      used.add(idx);
      out.push(idx);
      break;
    }
  }
  return out;
}

const addMember = (c, idx, src) => {
  const o = ensure(c);
  if (o.squad.includes(idx)) return;
  o.squad.push(idx);
  o.src[idx] = src;
  o.stats[idx] ??= { apps: 0, goals: 0 };
  c.players[idx] ??= freshRecord();
};
function dropMember(c, idx) {
  const o = ensure(c);
  o.squad = o.squad.filter((x) => x !== idx);
  delete o.src[idx];
  delete o.hurt[idx];
  const inClub = inAnySquad(c).has(idx) || (c.alumni ?? []).some((a) => a.idx === idx) || c.coach?.idx === idx;
  if (!inClub && c.players[idx] && !c.formers?.[idx]) delete c.players[idx];
}

// Neue Gesichter bis zur Sollstärke.
export function topUp(c, want = targetSize(c)) {
  const o = ensure(c);
  const need = missingPositions(c, o.squad, want);
  if (!need.length) return 0;
  const rng = createRng(hashSeed(c.seed, c.season, c.round, 8801, o.nextId++));
  const used = takenIndices(c);
  for (const i of o.squad) used.add(i);
  const got = pickOld(c, rng, need, TIERS, used);
  for (const idx of got) addMember(c, idx, 'new');
  return got.length;
}

// --- Gründung -----------------------------------------------------------------------------------------------------

export function found(c, { free = false } = {}) {
  if (c.oldBoys) return false;
  const chk = foundCheck(c);
  if (!free && !chk.ok) return false;
  const club = humanClub(c);
  const ohName = tr(`${club.name} Alte Herren`, `${club.name} Old Boys`);
  c.oldBoys = { v: 1, since: c.season, name: ohName, short: tr(`${club.short} AH`, `${club.short} OB`), squad: [], src: {}, stats: {}, hurt: {}, offers: [], history: [], games: [], totals: { w: 0, d: 0, l: 0, gf: 0, ga: 0, cash: 0 }, nextId: 1, league: null };
  const o = ensure(c);
  const target = targetSize(c);
  if (c.coach?.oldBoys && c.coach.idx != null && !club.squad.includes(c.coach.idx)) addMember(c, c.coach.idx, 'coach');
  for (const idx of [...chk.cand.alumni, ...chk.cand.former]) if (o.squad.length < target - 2) addMember(c, idx, chk.cand.alumni.includes(idx) ? 'alumni' : 'former');
  topUp(c, target);
  if (!free) book(c, tr('Gründung Alte Herren (Anmeldung, Trikots)', 'Old boys founded (registration, kit)'), -FOUND_COST);
  chronicle(c, tr(`Der Verein gründet eine Alte-Herren-Mannschaft (${o.squad.length} Mann).`, `The club founds an old boys side (${o.squad.length} men).`));
  c.week?.chat.push({ from: null, text: tr(`Alte Herren gegründet: ${o.squad.length} Mann, erstes Spiel Freitagabend, danach Grillen. Training gibt es nicht – „wir sind ja nicht mehr zwanzig“.`, `Old boys side founded: ${o.squad.length} men, first game on Friday night, barbecue afterwards. No training – "we are not twenty any more".`), time: 'Mo 08:20' });
  ensureLeague(c);
  return true;
}

// Wechsel aus der Ersten (Spieler ab 32, nicht der Trainer): bleibt im Verein, spielt nur noch Freitagabend.
export function moveFromFirst(c, idx) {
  const o = ensure(c);
  const club = humanClub(c);
  if (!o || !club.squad.includes(idx) || idx === c.coach?.idx || ageOf(c, idx) < AGE_MIN || club.squad.length <= MIN_SQUAD || o.squad.length >= maxSize(c)) return false;
  club.squad = club.squad.filter((x) => x !== idx);
  if (c.week) {
    delete c.week.availability[idx];
    if (c.week.lineup) c.week.lineup = c.week.lineup.map((x) => (x === idx ? null : x));
  }
  addMember(c, idx, 'first');
  chronicle(c, tr(`${playerOf(c, idx).name} (${ageOf(c, idx)}) wechselt von der Ersten zu den Alten Herren.`, `${playerOf(c, idx).name} (${ageOf(c, idx)}) moves from the first team to the old boys.`));
  return true;
}

// Angebot bei Karriereende annehmen oder ablehnen.
export function acceptOffer(c, idx) {
  const o = ensure(c);
  const i = o?.offers.findIndex((x) => x.idx === idx) ?? -1;
  if (i < 0) return false;
  o.offers.splice(i, 1);
  if (o.squad.length >= maxSize(c) || inAnySquad(c).has(idx)) return false;
  addMember(c, idx, 'retired');
  return true;
}
export function declineOffer(c, idx) {
  const o = ensure(c);
  if (o) o.offers = o.offers.filter((x) => x.idx !== idx);
}

// Aus dem Kader der Alten Herren nehmen (zurück zu den Ehemaligen).
export function releaseMember(c, idx) {
  const o = ensure(c);
  if (!o?.squad.includes(idx) || o.squad.length <= 7) return false;
  dropMember(c, idx);
  return true;
}

// --- Runde und Termine ---------------------------------------------------------------------------------------------

const ownId = 'ah:own';

function ensureLeague(c) {
  const o = ensure(c);
  if (!o) return null;
  if (o.league?.season === c.season) return o.league;
  if (o.league) archiveLeague(c);
  const rng = createRng(hashSeed(c.seed, c.season, 8802));
  const names = OPP_NAMES.map((n, i) => i);
  const picked = [];
  while (picked.length < 5) picked.push(names.splice(Math.floor(rng.next() * names.length), 1)[0]);
  const used = takenIndices(c);
  for (const i of o.squad) used.add(i);
  const size = ohFormat(c) + 3;
  const opps = picked.map((n, k) => {
    const str = Math.round(rng.next() * 100) / 100;
    const squad = pickOld(c, rng, missingPositions(c, [], size), { ok: 0.75 - 0.3 * str, gut: 0.2 + 0.15 * str, stark: 0.05 + 0.15 * str }, used);
    return { id: `ah:opp${k}`, name: OPP_NAMES[n], short: OPP_SHORT[n], str, kit: { shirt: KIT_SETS[n], shorts: n % 2 ? 0xf2efe6 : 0x1c1c1c, socks: KIT_SETS[n], pattern: 'uni', second: KIT_SETS[n] }, squad };
  });
  const rounds = roundRobin([ownId, ...opps.map((x) => x.id)], rng).slice(0, OH_ROUNDS.length);
  // Kein Termin nach dem Saisonende (kleine Ligen); mitten in der Saison gegründet: frühere Termine entfallen.
  const plan = rounds.map((fixtures, i) => ({ round: OH_ROUNDS[i], skipped: OH_ROUNDS[i] < c.round, fixtures })).filter((d) => d.round < (c.fixtures?.length ?? 10));
  o.league = { season: c.season, opps, days: plan };
  return o.league;
}

const days = (c) => ensureLeague(c)?.days ?? [];

export const ownFixtureOf = (day) => day.fixtures.find((f) => f.home === ownId || f.away === ownId);
const oppOf = (c, id) => oh(c).league.opps.find((x) => x.id === id);

// Das Spiel dieser Woche (noch ohne Ergebnis) – oder null.
export function pendingGame(c) {
  const o = oh(c);
  if (!o || !c.week) return null;
  const ds = days(c);
  const d = ds.findIndex((x) => x.round === c.round && !x.skipped);
  if (d < 0) return null;
  const f = ownFixtureOf(ds[d]);
  if (!f || f.result) return null;
  return { day: d, fixture: f, home: f.home === ownId, opp: oppOf(c, f.home === ownId ? f.away : f.home) };
}
// Verpasste Spiele (Woche vorbei, ohne Ergebnis).
const overdue = (c) => (oh(c) ? days(c).map((d, i) => ({ d, i })).filter(({ d }) => !d.skipped && d.round < c.round && !ownFixtureOf(d)?.result) : []);

export function nextGame(c) {
  const o = oh(c);
  if (!o) return null;
  const ds = days(c);
  const i = ds.findIndex((d) => !d.skipped && d.round >= c.round && !ownFixtureOf(d)?.result);
  if (i < 0) return null;
  const f = ownFixtureOf(ds[i]);
  return { day: i, round: ds[i].round, weeks: ds[i].round - c.round, home: f.home === ownId, opp: oppOf(c, f.home === ownId ? f.away : f.home), fixture: f };
}

// Tabelle einer Ü32-Runde (die laufende, wenn nichts angegeben ist).
export function ohTable(c, league = ensureLeague(c)) {
  const o = oh(c);
  if (!o || !league) return [];
  const rows = [{ id: ownId, name: o.name, short: o.short, own: true, kit: humanClub(c).kit }, ...league.opps.map((x) => ({ id: x.id, name: x.name, short: x.short, own: false, kit: x.kit }))].map((r) => ({ ...r, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const d of league.days) {
    if (d.skipped) continue;
    for (const f of d.fixtures) {
      if (!f.result) continue;
      const h = by[f.home];
      const a = by[f.away];
      h.played++; a.played++;
      h.gf += f.result.home; h.ga += f.result.away; a.gf += f.result.away; a.ga += f.result.home;
      if (f.result.home > f.result.away) { h.w++; a.l++; h.pts += 3; } else if (f.result.home < f.result.away) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
    }
  }
  return rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || (a.own ? -1 : 1));
}

// Alte Runde abschließen (beim Start der neuen): Platzierung in die Historie, Meisterfeier.
function archiveLeague(c) {
  const o = oh(c);
  const l = o?.league;
  if (!l || l.archived) return;
  l.archived = true;
  const rows = ohTable(c, l);
  const me = rows.find((r) => r.own);
  if (me.played === 0) return;
  const pos = rows.indexOf(me) + 1;
  o.history.push({ season: l.season, pos, pts: me.pts, played: me.played, w: me.w, d: me.d, l: me.l, gf: me.gf, ga: me.ga, champion: rows[0].name });
  if (o.history.length > 20) o.history.shift();
  if (pos === 1) {
    chronicle(c, tr(`Die Alten Herren werden Meister der Ü32-Runde (${me.pts} Punkte).`, `The old boys win the over-32 league (${me.pts} points).`));
    book(c, tr('Meisterfass der Alten Herren', 'Old boys\' champions\' keg'), -20);
    adjustMood(c, 0.05);
    c.week?.chat.push({ from: null, text: tr('Die Alten Herren sind Meister der Ü32-Runde. Das Fass ging auf die Kasse – der Kassenwart weint, die Alten Herren singen.', 'The old boys have won the over-32 league. The keg was on the kitty – the treasurer weeps, the old boys sing.'), time: 'Mo 08:20' });
  }
}

// --- Spiel -----------------------------------------------------------------------------------------------------------

function clubFor(c, id) {
  const o = oh(c);
  const me = humanClub(c);
  if (id === ownId) return { id: ownId, name: o.name, short: o.short, kit: me.kit, keeperKit: me.keeperKit, crest: me.crest, human: false, venue: me.venue, squad: o.squad };
  const x = oppOf(c, id);
  return { id: x.id, name: x.name, short: x.short, kit: x.kit, keeperKit: { shirt: 0x7a3fa0, shorts: 0x1c1c1c, socks: 0x7a3fa0 }, human: false, venue: me.venue, squad: x.squad };
}

// Spiel vorbereiten (Liveticker oder unbeobachtet). Gespielt wird auf dem Platz des Vereins in der Form der Liga.
export function prepareOldBoysMatch(c, game = pendingGame(c)) {
  const o = oh(c);
  const f = game.fixture;
  const home = clubFor(c, f.home);
  const away = clubFor(c, f.away);
  const league = leagueOf(c);
  const base = PITCHES[humanClub(c).venue] ?? PITCHES.rasenplatz;
  const pitch = applyWeather({ ...base, format: league.format ?? base.format, referee: !!(league.referee || base.referee) }, c.week?.weather);
  const rng = createRng(hashSeed(c.seed, c.season, game.day, 8803, f.home === ownId ? 1 : 2));
  const avail = (club) => Object.fromEntries(club.squad.map((i) => [i, (club.id === ownId && (o.hurt[i] ?? 0) > 0) || rng.chance(0.12) ? 'no' : 'yes']));
  const teamHome = teamForMatch(c, home, pitch.format, avail(home), rng);
  const teamAway = teamForMatch(c, resolveKitClash(home, away), pitch.format, avail(away), rng);
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams: [teamHome, teamAway], human: false, duration: SIM.duration, incidents: true });
  match.subRule = subRuleFor(MATCH.subs, c.level);
  match.crowd = rng.int(3, 8) + pitch.format;
  return { match, pitch, home, away, game, oldBoys: true };
}

// Poisson-Wurf für Partien der anderen Mannschaften (Tabelle der Runde).
function poisson(rng, mean) {
  const L = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 12);
  return k - 1;
}
function resolveOthers(c, dayIdx) {
  const d = days(c)[dayIdx];
  const rng = createRng(hashSeed(c.seed, c.season, dayIdx, 8804));
  for (const f of d.fixtures) {
    if (f.result) continue;
    const a = oppOf(c, f.home)?.str ?? 0.5;
    const b = oppOf(c, f.away)?.str ?? 0.5;
    const share = Math.max(0.25, Math.min(0.75, 0.5 + (a - b) * 0.25 + 0.04)); // kleiner Heimvorteil
    f.result = { home: poisson(rng, 4.4 * share), away: poisson(rng, 4.4 * (1 - share)) };
  }
}

const RESULT_TEXT = {
  win: () => tr(['Freitagabend: {S} gegen {O}. Bierkasse gefüllt, Grillwurst gesichert.', 'Die Alten Herren siegen {S} gegen {O} – gefeiert wird bis die Wirtin die Stühle hochstellt.', '{S} gegen {O}: Läuft nicht mehr, aber das Ergebnis stimmt.'], ['Friday night: {S} against {O}. Beer kitty full, sausages secured.', 'The old boys win {S} against {O} – celebrations last until the landlady stacks the chairs.', '{S} against {O}: the legs have gone, but the result is right.']),
  draw: () => tr(['Alte Herren: {S} gegen {O}. Gerecht, sagen beide Seiten beim Bier.', '{S} gegen {O} – Unentschieden, und die Grillwurst teilt man trotzdem.'], ['Old boys: {S} against {O}. Fair, both sides say over a beer.', '{S} against {O} – a draw, and the sausages are shared anyway.']),
  loss: () => tr(['Alte Herren verlieren {S} gegen {O}. „Das Bier danach war trotzdem gut.“', '{S} gegen {O}: Niederlage. Einer meint, es lag am Rasen. Ein anderer am Alter.'], ['Old boys lose {S} against {O}. "The beer afterwards was good anyway."', '{S} against {O}: a defeat. One blames the pitch. Another blames age.']),
};

// Ergebnis eintragen: Spielstatistik, Kasse, Stimmung, Meldung; danach die übrigen Partien des Tages.
export function recordOldBoysResult(c, prepared) {
  const o = oh(c);
  const { match: m, game } = prepared;
  const f = game.fixture;
  f.result = { home: m.score[0], away: m.score[1] };
  const mine = f.home === ownId ? 0 : 1;
  const gf = m.score[mine];
  const ga = m.score[1 - mine];
  for (const k of Object.keys(o.hurt)) o.hurt[k] = Math.max(0, o.hurt[k] - 1);
  for (const p of [...m.players, ...m.bench.flat(), ...(m.sentOff ?? [])]) {
    const st = m.stats.players[p.id];
    if (p.poolIndex == null || !st || !o.squad.includes(p.poolIndex) || st.seconds <= 0) continue;
    const s = (o.stats[p.poolIndex] ??= { apps: 0, goals: 0 });
    s.apps++;
    s.goals += st.goals;
    if (p.injury && p.injury.severity >= 2) o.hurt[p.poolIndex] = 2;
  }
  const t = o.totals;
  if (gf > ga) t.w++; else if (gf < ga) t.l++; else t.d++;
  t.gf += gf; t.ga += ga;
  const opp = oppOf(c, f.home === ownId ? f.away : f.home);
  // Bierkasse beim Heimspiel (Spielwert): jeder auf dem Platz wirft ein, abzüglich Wurst.
  let cash = 0;
  if (game.home) {
    cash = Math.round(m.players.length * BEER_PER_HEAD);
    book(c, tr(`Bierkasse Alte Herren (Heimspiel gegen ${opp.short})`, `Old boys' beer kitty (home game v ${opp.short})`), cash);
  }
  t.cash += cash;
  adjustMood(c, MOOD_PER_GAME + (gf > ga ? 0.004 : 0)); // Geselligkeit statt Training
  o.games.push({ season: c.season, day: game.day, round: c.round, home: game.home, opp: opp.name, short: opp.short, gf, ga, cash });
  if (o.games.length > GAMES_KEEP) o.games.shift();
  const kind = gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
  const rng = createRng(hashSeed(c.seed, c.season, game.day, 8805));
  const text = rng.pick(RESULT_TEXT[kind]()).replace('{S}', `${gf}:${ga}`).replace('{O}', opp.name);
  c.week?.chat.push({ from: null, text: `${text}${cash ? tr(` (+${cash} € Bierkasse)`, ` (+€${cash} beer kitty)`) : ''}`, time: 'Sa 09:30', press: true });
  resolveOthers(c, game.day);
  return f.result;
}

// Fällige Spiele: Wochen, die vorbei sind (ohne Ergebnis) – und mit includeCurrent das Spiel dieser Woche.
function dueGames(c, includeCurrent) {
  if (!oh(c)) return [];
  const list = overdue(c).map(({ i }) => ({ day: i, fixture: ownFixtureOf(days(c)[i]) }));
  const cur = includeCurrent ? pendingGame(c) : null;
  if (cur) list.push({ day: cur.day, fixture: cur.fixture });
  return list.map((g) => ({ ...g, home: g.fixture.home === ownId, opp: oppOf(c, g.fixture.home === ownId ? g.fixture.away : g.fixture.home) }));
}
export const stepOut = (m) => {
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
};
// Synchron (Wochenwechsel, Skripte).
export function playDueSync(c, includeCurrent = false) {
  const list = dueGames(c, includeCurrent);
  for (const g of list) {
    const prepared = prepareOldBoysMatch(c, g);
    stepOut(prepared.match);
    recordOldBoysResult(c, prepared);
  }
  return list.length;
}
// Asynchron: `runMatch(prepared)` simuliert in Häppchen (Oberfläche friert nicht ein).
export async function playDue(c, runMatch, includeCurrent = false) {
  const list = dueGames(c, includeCurrent);
  for (const g of list) {
    const prepared = prepareOldBoysMatch(c, g);
    await runMatch(prepared);
    recordOldBoysResult(c, prepared);
  }
  return list.length;
}

// --- Hooks (hooks.js) ------------------------------------------------------------------------------------------

function autoFound(c) {
  if (!c.oldBoys && c.coach?.oldBoys) found(c, { free: true }); // der Trainer geht zu den Alten Herren: das Team entsteht mit ihm
}

export function create() {}
export function migrate(c) {
  autoFound(c);
  if (!c.oldBoys) return;
  ensure(c);
  ensureLeague(c);
}
export function startWeek(c) {
  autoFound(c);
  if (!c.oldBoys) return;
  ensure(c);
  days(c); // Runde der neuen Saison anlegen (und die alte archivieren)
  const g = pendingGame(c);
  if (g && c.week) {
    c.week.chat.splice(1, 0, { from: null, text: g.home ? tr(`Freitagabend: Alte Herren zu Hause gegen ${g.opp.name}. Anstoß 19 Uhr, Grill ab 18.`, `Friday night: old boys at home to ${g.opp.name}. Kick-off at 7, barbecue from 6.`) : tr(`Freitagabend: Alte Herren auswärts bei ${g.opp.name}. Treffpunkt Parkplatz, Fahrgemeinschaften.`, `Friday night: old boys away at ${g.opp.name}. Meet at the car park, car shares.`), time: 'Mo 08:30' });
  }
}
export function finishRound(c) {
  if (c.oldBoys) playDueSync(c); // wer in der Woche nicht zugeschaut hat und nicht im Spieltag lief: jetzt rechnen
}

export function nextSeason(c, summary) {
  const o = oh(c);
  if (!o) {
    // Hinweis: im Umfeld gibt es genug Ü32 für eine Mannschaft.
    const chk = foundCheck(c);
    if (chk.ok && c.week && (c.season ?? 1) >= 2 && c.flags?.ohHint !== c.season) {
      c.flags.ohHint = c.season;
      c.week.chat.splice(1, 0, { from: null, text: tr(`${chk.count} Ü32 im Umfeld des Vereins: Das reicht für eine Alte-Herren-Mannschaft. Unter Verein → Alte Herren kann man sie gründen.`, `${chk.count} over-32s around the club: enough for an old boys side. You can found one under Club → Old boys.`), time: 'Mo 08:25' });
    }
    return;
  }
  ensure(c);
  // Altern: Ü32 werden langsamer (Spielwerte, wie bei der Ersten ab 31/34).
  for (const idx of [...o.squad]) {
    const age = ageOf(c, idx);
    if (age > AGE_MAX || (age >= 41 && createRng(hashSeed(c.seed, c.season, idx, 8806)).chance(0.18))) {
      dropMember(c, idx);
      continue;
    }
    const rec = (c.players[idx] ??= freshRecord());
    rec.delta ??= {};
    const d = { pace: age >= 34 ? -0.035 : -0.02, stamina: age >= 34 ? -0.035 : -0.02, strength: age >= 34 ? -0.015 : -0.008 };
    if (age >= 34) for (const k of ['passing', 'technique', 'shooting', 'dribbling', 'tackling', 'keeping']) d[k] = -0.006;
    for (const [k, v] of Object.entries(d)) rec.delta[k] = (rec.delta[k] ?? 0) + v;
  }
  // Verjüngung: die zwei schwächsten ab 38 machen Platz (Spielwert), sonst altert der Kader weg.
  const tired = o.squad.filter((i) => ageOf(c, i) >= 38 && i !== c.coach?.idx).sort((a, b) => playerOf(c, a).rating - playerOf(c, b).rating).slice(0, 2);
  for (const idx of tired) if (o.squad.length > 8) dropMember(c, idx);
  // Angebote bei Karriereende: wer 32 oder älter aufhört, kann bei den Alten Herren weiterspielen.
  o.offers = [];
  for (const r of summary?.retired ?? []) {
    if (r.age < AGE_MIN || o.squad.includes(r.idx) || inAnySquad(c).has(r.idx) || r.idx === c.coach?.idx) continue;
    o.offers.push({ idx: r.idx, name: r.name, age: r.age, season: c.season });
  }
  for (const ang of o.offers) c.week?.chat.splice(1, 0, { from: null, text: tr(`${ang.name} (${ang.age}) hört auf – die Alten Herren würden ihn nehmen (Verein → Alte Herren → Kader).`, `${ang.name} (${ang.age}) is retiring – the old boys would take him (Club → Old boys → Squad).`), time: 'Mo 08:25' });
  topUp(c, targetSize(c) - 1);
}
