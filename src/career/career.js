// Karriere: eine Saison in der Freizeitliga. Der Zustand ist reines JSON
// (speicherbar); Spieler werden nur über ihre Pool-Nummer referenziert.
import { legacySeasonEnd } from './legacy.js';
import { sponsorResult } from './sponsors.js';
import { createRng } from '../core/rng.js';
import { FORMATIONS } from '../sim/formation.js';
import { createPlayerPool, ratePlayer } from '../sim/generator.js';
import { createMatch, stepMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { allPlayers } from '../sim/squad.js';
import { gradePlayers } from '../sim/stats.js';
import { absenceChance, DECLINE_TEXT, FAREWELL, INJURED, JOIN_TEXT, LATE, noReasons, NUDGE_NO, NUDGE_YES, RUMOR_SOURCES, YES } from './chat.js';
import { HUMAN_CLUB_DEFAULT, LEAGUES } from './clubs.js';
import { applyPubToTeam } from './pub.js';
import { rollInjuries } from './injuries.js';
import { initAcademy, seasonAcademy, weeklyAcademy } from './academy.js';
import { applyWeather, rollWeather, WEATHER, WEATHER_CHAT } from './weather.js';
import { derbyResult, isDerbyFixture } from './derby.js';
import { applyChemistry, pastLink, setRelation } from './relations.js';
import { applyFusion, initSagas, sagaChat, sagaSeasonEnd, sagaWeek } from './sagas.js';
import { childrenGrowUp, coachAway, initCoach, isCoach, personalWeek, seasonPersonal, weeklyPersonal } from './personal.js';
import { absenceFactor, advanceArcs, applyForm, autoResolve, resultMood, rollWeekEvent, weeklyMood } from './events.js';
import { developYouth, expireYouth, initYouth, retirements, youthIntake } from './youth.js';
import { book, closeSeasonFinances, initFinances, KIT_COST, makeOffers, matchFinances, weeklyFinances } from './finances.js';

export const SAVE_VERSION = 1;
export const POOL_SEED = 1921;
export const SQUAD_SHAPES = {
  small: ['gk', 'def', 'def', 'def', 'mid', 'mid', 'mid', 'fwd', 'fwd'],
  large: ['gk', 'gk', 'def', 'def', 'def', 'def', 'mid', 'mid', 'mid', 'mid', 'fwd', 'fwd', 'fwd'],
};
const NUDGES_PER_WEEK = 3;
export const MAX_SQUAD = 12; // Freizeitliga; in der Kreisklasse mehr (siehe maxSquad)
export const MIN_SQUAD = 7;
const SCOUT_ACTIONS = 2;
const RUMOR_TIERS = { ok: 0.44, gut: 0.33, stark: 0.15, dorfstar: 0.06, superstar: 0.014, legende: 0.006 };
export const RECRUIT_BASE = { ok: 0.85, gut: 0.65, stark: 0.45, dorfstar: 0.3, superstar: 0.2, legende: 0.15 };
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

let poolCache = null;
export const getPool = () => (poolCache ??= createPlayerPool({ seed: POOL_SEED }));
// Eigene Spieler (du selbst, deine Kinder) liegen im Spielstand statt im Pool.
export const CUSTOM_BASE = 900000;
const CUSTOM = new Map();
export function registerCustomPlayers(career) {
  CUSTOM.clear();
  for (const [k, p] of Object.entries(career.custom ?? {})) CUSTOM.set(Number(k), p);
}
export function addCustomPlayer(career, player) {
  career.custom ??= {};
  const idx = CUSTOM_BASE + Object.keys(career.custom).length;
  const p = { ...player, poolIndex: idx };
  career.custom[idx] = p;
  CUSTOM.set(idx, p);
  return idx;
}
export const poolPlayer = (index) => CUSTOM.get(index) ?? getPool().get(index);
const rawPlayer = (career, idx) => career.custom?.[idx] ?? poolPlayer(idx);

const ATTR_KEYS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'];

// Spieler, wie er in dieser Karriere gerade ist: Pool-Grundwerte plus
// Entwicklung, und jede Saison ein Jahr älter.
export function playerOf(career, idx) {
  const base = rawPlayer(career, idx);
  const delta = career.players[idx]?.delta;
  const years = (career.season ?? 1) - 1;
  const extra = career.players[idx]?.addTraits; // z. B. „Ex-Profi" nach der Rückkehr
  if (!delta && years === 0 && !career.players[idx]?.job && !extra) return base;
  const attrs = { ...base.attrs };
  if (delta) for (const k of ATTR_KEYS) attrs[k] = Math.max(0.05, Math.min(0.98, attrs[k] + (delta[k] ?? 0)));
  const age = base.age + years;
  // Aus Schülern werden mit der Zeit Studenten oder Azubis.
  const job = career.players[idx]?.job; // Jobwechsel aus einer Lebensgeschichte
  const profession = job ? job : base.profession.startsWith('Schüler') && age >= 19 ? (base.poolIndex % 2 ? 'Student (1. Semester)' : 'Azubi Bürokaufmann') : base.profession;
  const p = { ...base, attrs, age, profession, traits: extra ? [...new Set([...base.traits, ...extra])] : base.traits };
  p.rating = ratePlayer(p);
  return p;
}

// Saisonwechsel: Junge werden besser (vor allem mit Spielpraxis), Ältere langsamer.
export function developPlayers(career) {
  const club = humanClub(career);
  const rng = createRng(hashSeed(career.seed, career.season, 17));
  const report = [];
  for (const idx of club.squad) {
    const rec = career.players[idx];
    const before = playerOf(career, idx);
    const age = before.age;
    const practice = rec.apps >= 5 ? 1.3 : rec.apps >= 2 ? 1 : 0.6;
    const coach = career.staff?.cotrainer ? 1.15 : 1;
    const growth = (age <= 20 ? 0.045 : age <= 23 ? 0.025 : age <= 29 ? 0.006 : 0) * coach;
    rec.delta ??= {};
    for (const k of ATTR_KEYS) {
      let d = growth * practice * (0.5 + rng.next());
      if (age >= 31 && (k === 'pace' || k === 'stamina')) d -= age >= 34 ? 0.035 : 0.015;
      if (age >= 34 && k !== 'pace' && k !== 'stamina') d -= 0.008;
      rec.delta[k] = (rec.delta[k] ?? 0) + d;
    }
    report.push({ idx, before: before.rating });
  }
  return report;
}

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// --- Neue Saison ----------------------------------------------------------------

export const leagueOf = (career) => LEAGUES[career.level ?? 1];
const youthDeps = () => ({ getPool, playerOf, freshRecord, book });
export const maxSquad = (career) => leagueOf(career).maxSquad;

// Kader aus dem Pool ziehen – nach Klassen-Gewichten und Positionen.
export function squadPicker(rng, used) {
  const pool = getPool();
  const byTierPos = {};
  for (const p of pool.everyone()) (byTierPos[`${p.tier}:${p.position}`] ??= []).push(p.poolIndex);
  return (tiers, shape) =>
    shape.map((position) => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const list = byTierPos[`${weighted(rng, tiers)}:${position}`];
        if (!list?.length) continue;
        const idx = rng.pick(list);
        if (!used.has(idx)) {
          used.add(idx);
          return idx;
        }
      }
      throw new Error('Pool erschöpft');
    });
}

export function createCareer({ seed = Date.now() % 1e9, club = {}, coach = null } = {}) {
  const rng = createRng(seed);
  const league = LEAGUES[1];
  const pick = squadPicker(rng, new Set());
  const human = { ...HUMAN_CLUB_DEFAULT, ...club, human: true, venue: league.humanVenue };
  const clubs = [human, ...league.clubs.map((c) => ({ ...c, human: false }))].map((c) => ({
    ...c,
    squad: pick(c.tiers, SQUAD_SHAPES[league.squadShape]),
  }));

  const players = {};
  for (const c of clubs) for (const idx of c.squad) players[idx] = freshRecord();

  const career = {
    version: SAVE_VERSION,
    seed,
    level: 1,
    league: league.name,
    season: 1,
    round: 0,
    clubs,
    players,
    fixtures: roundRobin(clubs.map((c) => c.id), rng),
    history: [],
    mood: 0,
    flags: {},
    arcs: [],
    week: null,
  };
  initFinances(career);
  initYouth(career);
  youthIntake(career, youthDeps());
  registerCustomPlayers(career);
  initCoach(career, coach);
  initAcademy(career);
  initSagas(career);
  startWeek(career);
  return career;
}

// Saisonwechsel: Tabelle auswerten, auf- oder absteigen, Kader behalten.
export function nextSeason(career) {
  const legacyNotes = legacySeasonEnd(career); // Schuhe an den Nagel, Nachfolge
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human) + 1;
  const level = career.level ?? 1;
  const promoted = pos === 1 && level < 2;
  const relegated = level > 1 && pos === rows.length;
  const scorer = humanClub(career).squad.map((idx) => ({ idx, goals: career.players[idx]?.goals ?? 0 })).sort((a, b) => b.goals - a.goals)[0];
  const topScorer = scorer?.goals ? { name: playerOf(career, scorer.idx).name, goals: scorer.goals } : null;
  career.history = [...(career.history ?? []), { season: career.season, league: career.league, pos, champion: rows[0].club.name, topScorer, promoted, relegated }];

  // Entwicklung zuerst – die Einsätze dieser Saison zählen als Spielpraxis.
  const development = developPlayers(career);
  developYouth(career);
  const retired = retirements(career, youthDeps(), MIN_SQUAD);

  // Saisonwerte in die Karriere-Gesamtstatistik übernehmen.
  for (const rec of Object.values(career.players)) {
    rec.total = {
      apps: (rec.total?.apps ?? 0) + rec.apps,
      goals: (rec.total?.goals ?? 0) + rec.goals,
      assists: (rec.total?.assists ?? 0) + rec.assists,
    };
    Object.assign(rec, { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0 });
  }

  const own = rows[pos - 1];
  closeSeasonFinances(career, { wins: own.w, goals: own.gf, rank: pos, cards: career.seasonCards });

  const newLevel = promoted ? level + 1 : relegated ? level - 1 : level;
  const league = LEAGUES[newLevel];
  const rng = createRng(hashSeed(career.seed, career.season, 99));
  const human = humanClub(career);
  const sagaNotes = sagaSeasonEnd(career, { level });
  human.venue = career.saga.homeLost[newLevel] ?? league.humanVenue;
  let clubs = career.clubs;
  if (newLevel === level) {
    const used = new Set([...clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? []), ...(career.alumni ?? []).map((a) => a.idx)]);
    const pickFusion = squadPicker(createRng(hashSeed(career.seed, career.season, 98)), used);
    const fused = applyFusion(career, clubs, (tiers) => pickFusion(tiers, SQUAD_SHAPES[league.squadShape]), freshRecord);
    clubs = fused.clubs;
    sagaNotes.push(...fused.notes);
  } else if (career.saga.fusion) career.saga.fusion = null; // Liga gewechselt – der Nachbar spielt woanders
  if (newLevel !== level) {
    // Neue Liga, neue Gegner. Die alten Gegner verlassen den Spielstand.
    const used = new Set(human.squad);
    const pick = squadPicker(rng, used);
    for (const c of career.clubs) if (!c.human) for (const idx of c.squad) delete career.players[idx];
    clubs = [human, ...league.clubs.map((c) => ({ ...c, human: false, squad: pick(c.tiers, SQUAD_SHAPES[league.squadShape]) }))];
    for (const c of clubs) for (const idx of c.squad) career.players[idx] ??= freshRecord();
  }
  if (career.flags) Object.assign(career.flags, { summerfest: false, anniversary: false });
  seasonPersonal(career, pos);
  if (career.arcs) career.arcs = career.arcs.filter((a) => a.id !== 'bruder'); // neuer Spielplan
  Object.assign(career, {
    level: newLevel,
    league: league.name,
    season: career.season + 1,
    round: 0,
    clubs,
    fixtures: roundRobin(clubs.map((c) => c.id), rng),
  });
  const leaving = expireYouth(career, playerOf);
  sagaNotes.push(...childrenGrowUp(career));
  sagaNotes.push(...seasonAcademy(career));
  const intake = youthIntake(career, youthDeps());
  startWeek(career);
  const note = (text) => career.week?.chat.splice(1, 0, { from: null, text, time: 'Mo 09:00' });
  for (const n of sagaNotes) note(n);
  for (const n of legacyNotes) note(n);
  for (const n of career.sponsorNotes ?? []) note(n);
  career.sponsorNotes = [];
  for (const r of retired) note(`Abschied: ${r.name} (${r.age}) hört auf – ${r.apps} Spiele, ${r.goals} Tore. Bleibt uns erhalten als ${r.role}.`);
  for (const idx of leaving) note(`${poolPlayer(idx).name} war zu alt für die A-Jugend und ist zum Nachbarn gewechselt.`);
  if (intake.length) note(`Neuer Jahrgang in der A-Jugend: ${intake.map((idx) => playerOf(career, idx).name).join(', ')}.`);
  // Trainingsbericht aus der Saisonvorbereitung in die Gruppe.
  for (const d of development) {
    const now = playerOf(career, d.idx);
    const diff = now.rating - d.before;
    if (diff >= 2) career.week?.chat.splice(1, 0, { from: null, text: `Vorbereitung: ${now.name} (${now.age}) hat richtig zugelegt – Stärke ${d.before} → ${now.rating}.`, time: 'Mo 09:00' });
    else if (diff <= -2) career.week?.chat.splice(1, 0, { from: null, text: `${now.name} (${now.age}) merkt die Jahre – Stärke ${d.before} → ${now.rating}.`, time: 'Mo 09:00' });
  }
  return { pos, promoted, relegated, development, retired, intake, leaving };
}

const freshRecord = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 });

function weighted(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[0][0];
}

// Jeder gegen jeden, Hin- und Rückrunde (Kreis-Methode).
export function roundRobin(ids, rng) {
  const teams = [...ids];
  const n = teams.length;
  const first = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      round.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    first.push(round);
    teams.splice(1, 0, teams.pop());
  }
  const second = first.map((round) => round.map((f) => ({ home: f.away, away: f.home })));
  return [...first, ...second].map((round) => round.map((f) => ({ ...f, result: null })));
}

// --- Woche: Chatgruppe & Verfügbarkeit ------------------------------------------

export const humanClub = (career) => career.clubs.find((c) => c.human);
export const clubById = (career, id) => career.clubs.find((c) => c.id === id);
export const currentFixtures = (career) => career.fixtures[career.round] ?? null;
export const seasonOver = (career) => career.round >= career.fixtures.length;

export function humanFixture(career) {
  const id = humanClub(career).id;
  return currentFixtures(career)?.find((f) => f.home === id || f.away === id) ?? null;
}

export function startWeek(career) {
  if (seasonOver(career)) {
    career.week = null;
    return;
  }
  const rng = createRng(hashSeed(career.seed, career.season, career.round, 1));
  const club = humanClub(career);
  const weather = rollWeather(career);
  const weatherAbsence = WEATHER[weather.id].absence;
  const availability = {};
  const chat = [];
  let minute = 0;
  const time = () => {
    minute += 20 + Math.floor(rng.next() * 400);
    const day = Math.min(DAYS.length - 1, Math.floor(minute / 1440));
    const m = minute % 1440;
    return `${DAYS[day]} ${String(8 + Math.floor((m / 1440) * 14)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const fixture = humanFixture(career);
  const opponent = clubById(career, fixture.home === club.id ? fixture.away : fixture.home);
  chat.push({ from: null, text: `Sonntag gegen ${opponent.name}${fixture.home === club.id ? ' bei uns' : ' auswärts'}. Wer kann?`, time: time() });

  for (const idx of club.squad) {
    const p = rawPlayer(career, idx);
    const rec = career.players[idx];
    let status = 'yes';
    let text;
    if (isCoach(career, idx)) {
      // Du selbst: kein Chat-Eintrag, du bist da – außer du fällst aus.
      availability[idx] = coachAway(career) ? 'no' : 'yes';
      continue;
    }
    if (rec.injuryWeeks > 0) {
      status = 'no';
      text = rec.injury && rec.injuryWeeks > 1 ? `Noch ${rec.injuryWeeks} Wochen raus (${rec.injury.label}). Ich komm aber gucken.` : rng.pick(INJURED);
    } else if (rec.awayWeeks > 0) {
      status = 'no';
      text = rec.awayReason ?? 'Bin diese Woche nicht da.';
    } else if (rng.chance(absenceChance(p.profession) * (career.spirit ? 0.75 : 1) * absenceFactor(career, idx) * weatherAbsence)) {
      status = 'no';
      text = rng.pick(noReasons(p.profession));
    } else if (rng.chance(0.07)) {
      status = 'late';
      text = rng.pick(LATE);
    } else {
      text = rng.pick(YES);
    }
    availability[idx] = status;
    chat.push({ from: idx, text, time: time() });
  }
  // Einer kommentiert das Wetter.
  const talker = club.squad.find((idx) => availability[idx] === 'yes' && !isCoach(career, idx));
  if (talker != null) chat.push({ from: talker, text: rng.pick(WEATHER_CHAT[weather.id]), time: 'Sa 09:40' });
  career.week = { availability, chat, nudges: NUDGES_PER_WEEK, nudged: [], lineup: null, training: null, event: null, weather };
  career.flags ??= {};
  career.flags.derbyRival = leagueOf(career).derby?.club ?? null;
  advanceArcs(career);
  personalWeek(career);
  rollWeekEvent(career);
  sagaChat(career);
  if (career.round === 0 && career.offersSeason !== career.season) makeOffers(career, career.level ?? 1);
  career.week.rumors = makeRumors(career, createRng(hashSeed(career.seed, career.season, career.round, 3)));
  career.week.actions = SCOUT_ACTIONS;
}

// Nachhaken bei einer Absage – klappt ungefähr jedes zweite Mal.
export function nudge(career, idx) {
  const w = career.week;
  if (!w || w.nudges <= 0 || w.availability[idx] !== 'no' || w.nudged.includes(idx) || isCoach(career, idx)) return null;
  if (career.players[idx].injuryWeeks > 0) return null;
  const rng = createRng(hashSeed(career.seed, career.round, idx, 7));
  w.nudges--;
  w.nudged.push(idx);
  const ok = rng.chance(0.5);
  if (ok) w.availability[idx] = 'yes';
  const msg = { from: idx, text: rng.pick(ok ? NUDGE_YES : NUDGE_NO), time: 'Sa 21:14' };
  w.chat.push(msg);
  return ok;
}

// --- Aufstellung ----------------------------------------------------------------

const ROLE_ATTR = { gk: 'keeping', def: 'tackling', mid: 'passing', fwd: 'shooting' };

// Beste verfügbare Elf für das Format des Platzes; fehlen Leute, hilft ein
// Kumpel aus dem Pool aus ("der Schwager von …").
// manual: vom Trainer gewählte Pool-Nummern je Position (null = automatisch).
export function buildLineup(career, club, format, availability, rng, manual = null) {
  const formation = FORMATIONS[format];
  const avail = club.squad.filter((idx) => availability[idx] !== 'no');
  const starters = avail.filter((idx) => availability[idx] !== 'late');
  const late = avail.filter((idx) => availability[idx] === 'late');
  const helpers = [];
  const pool = getPool();
  while (starters.length < formation.length) {
    const idx = rng.int(0, pool.size - 1);
    const p = pool.get(idx);
    if (p.tier !== 'ok' || career.players[idx] || helpers.includes(idx)) continue;
    helpers.push(idx);
    starters.push(idx);
  }
  const lineup = formation.map((_, i) => {
    const idx = manual?.[i];
    return idx != null && starters.includes(idx) ? idx : null;
  });
  // Doppelt gewählte Spieler nur einmal aufstellen.
  lineup.forEach((idx, i) => {
    if (idx != null && lineup.indexOf(idx) !== i) lineup[i] = null;
  });
  const free = starters.filter((idx) => !lineup.includes(idx));
  formation.forEach((slot, i) => {
    if (lineup[i] != null) return;
    const attr = ROLE_ATTR[slot.role];
    const score = (idx) => {
      const p = playerOf(career, idx);
      return p.attrs[attr] + (p.position === slot.role ? 0.25 : 0) + p.rating / 400;
    };
    free.sort((a, b) => score(b) - score(a));
    lineup[i] = free.shift();
  });
  return { lineup, bench: [...free, ...late], late, helpers };
}

// --- Gerüchteküche & Transfers -------------------------------------------------------

export const takenIndices = (career) =>
  new Set([...career.clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? []), ...(career.alumni ?? []).map((a) => a.idx)]);

function makeRumors(career, rng) {
  const pool = getPool();
  const taken = takenIndices(career);
  const rumors = [];
  for (let n = 0; n < 3; n++) {
    const tier = weighted(rng, RUMOR_TIERS);
    const list = pool.byTier(tier);
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = rng.pick(list);
      if (taken.has(p.poolIndex) || rumors.some((r) => r.idx === p.poolIndex)) continue;
      const spread = 6 + Math.floor(rng.next() * 6);
      const shift = Math.floor(rng.next() * spread);
      // Pro Woche keine zwei gleichen Gerüchte.
      const templates = RUMOR_SOURCES[tier];
      const offset = Math.floor(rng.next() * templates.length);
      const texts = templates.map((_, k) => templates[(offset + k) % templates.length]({ ...p, first: p.name.split(' ')[0] }));
      const source = texts.find((t) => !rumors.some((r) => r.source.slice(0, 25) === t.slice(0, 25))) ?? texts[0];
      rumors.push({ idx: p.poolIndex, source, scouted: false, status: 'open', range: [p.rating - shift, p.rating - shift + spread], reply: null });
      break;
    }
  }
  return rumors;
}

// Ein zusätzliches Gerücht (z. B. vom Wirt): eher die Besseren, die keiner auf dem Zettel hat.
export function addRumor(career, rng, source) {
  const w = career.week;
  if (!w) return null;
  const pool = getPool();
  const taken = takenIndices(career);
  const list = pool.byTier(rng.pick(['gut', 'gut', 'stark', 'dorfstar']));
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = rng.pick(list);
    if (taken.has(p.poolIndex) || w.rumors.some((r) => r.idx === p.poolIndex)) continue;
    const spread = 5 + Math.floor(rng.next() * 4);
    const shift = Math.floor(rng.next() * spread);
    const rumor = { idx: p.poolIndex, source: source.replace('{first}', p.name.split(' ')[0]), scouted: false, status: 'open', range: [p.rating - shift, p.rating - shift + spread], reply: null };
    w.rumors.push(rumor);
    return rumor;
  }
  return null;
}

// Alte Spielstände ohne Gerüchteküche nachrüsten.
export function migrateCareer(career) {
  registerCustomPlayers(career);
  career.level ??= 1;
  career.mood ??= 0;
  career.flags ??= {};
  initFinances(career);
  initYouth(career);
  initCoach(career);
  initSagas(career);
  initAcademy(career);
  career.history ??= [];
  if (career.week && !career.week.rumors) {
    career.week.rumors = makeRumors(career, createRng(hashSeed(career.seed, career.season, career.round, 3)));
    career.week.actions = SCOUT_ACTIONS;
  }
  return career;
}

// Wie hoch sind die Chancen, dass jemand zusagt?
export function recruitChance(career, rumor) {
  const p = poolPlayer(rumor.idx);
  const club = humanClub(career);
  const rows = table(career);
  const rank = rows.findIndex((r) => r.club.human) + 1;
  const played = rows[0].played > 0;
  let chance = RECRUIT_BASE[p.tier] + (rumor.scouted ? 0.1 : 0);
  if (played && rank <= 2) chance += 0.08;
  if (played && rank >= rows.length - 1) chance -= 0.05;
  chance += (career.mood ?? 0) * 0.08; // gute Stimmung spricht sich rum
  if (career.flags?.cityChamp === career.season - 1) chance += 0.05; // Stadtmeister!
  if (p.tier === 'legende') {
    // Ex-Profis wollen keinen Rummel, aber eine gute Truppe.
    if (played && rank === 1) chance -= 0.15;
    if (career.flags?.pressWeeks > 0) chance -= 0.15; // Kreisblatt-Rummel
    const goodVibes = club.squad.some((idx) => ['teamchemie', 'anfuehrer'].some((t) => poolPlayer(idx).traits.includes(t)));
    if (goodVibes) chance += 0.12;
  }
  return Math.max(0.05, Math.min(0.95, chance));
}

export function scoutRumor(career, i) {
  const w = career.week;
  const r = w?.rumors[i];
  if (!r || r.scouted || r.status !== 'open' || w.actions <= 0 || coachAway(career)) return false;
  w.actions--;
  r.scouted = true;
  return true;
}

// Neuer Spieler kommt in den Kader, die Gruppe erfährt es sofort.
export function joinSquad(career, idx, text) {
  const club = humanClub(career);
  if (club.squad.length >= maxSquad(career) || club.squad.includes(idx)) return false;
  club.squad.push(idx);
  career.players[idx] = freshRecord();
  if (career.week) {
    career.week.availability[idx] = 'yes';
    career.week.chat.push({ from: idx, text: `(neu in der Gruppe) ${text}`, time: 'Sa 18:03' });
  }
  // Man kennt sich von früher – im Guten oder im Schlechten.
  const past = pastLink(career, idx);
  if (past) {
    setRelation(career, idx, past.other, past.kind === 'mobber' ? 'feinde' : 'schulfreunde');
    career.flags ??= {};
    career.flags.pastLink = { a: idx, b: past.other, kind: past.kind, round: career.round };
    career.week?.chat.push({ from: past.other, text: past.kind === 'mobber' ? '…' : 'Ey! Wir waren zusammen auf der Gesamtschule!', time: 'Sa 18:10' });
  }
  return true;
}

export function recruit(career, i) {
  const w = career.week;
  const r = w?.rumors[i];
  const club = humanClub(career);
  if (!r || r.status !== 'open' || w.actions <= 0 || coachAway(career)) return null;
  if (club.squad.length >= maxSquad(career)) return 'full';
  const p = poolPlayer(r.idx);
  const rng = createRng(hashSeed(career.seed, career.season, career.round, r.idx, 13));
  w.actions--;
  if (rng.chance(recruitChance(career, r))) {
    r.status = 'joined';
    r.scouted = true;
    r.reply = rng.pick(JOIN_TEXT);
    joinSquad(career, r.idx, r.reply);
    return 'joined';
  }
  r.status = 'declined';
  r.reply = rng.pick(DECLINE_TEXT[p.tier] ?? DECLINE_TEXT.default);
  return 'declined';
}

export function releasePlayer(career, idx) {
  const club = humanClub(career);
  if (club.squad.length <= MIN_SQUAD || !club.squad.includes(idx) || isCoach(career, idx)) return false;
  club.squad = club.squad.filter((x) => x !== idx);
  delete career.players[idx];
  if (career.week) {
    delete career.week.availability[idx];
    if (career.week.lineup) career.week.lineup = career.week.lineup.map((x) => (x === idx ? null : x));
    career.week.chat.push({ from: idx, text: `${FAREWELL[idx % FAREWELL.length]} (hat die Gruppe verlassen)`, time: 'Sa 20:30' });
  }
  return true;
}

// --- Verein & Trikots -------------------------------------------------------------

export const KIT_COLORS = [0xf2efe6, 0x1c1c1c, 0xc8352f, 0x8c2f2f, 0xe8742a, 0xe0b020, 0x2e6b3a, 0x5cc46a, 0x2f6fb5, 0x1d2b44, 0x4fa3e0, 0x6b4f8c, 0x9a6b4f, 0x8a9096];
export const KIT_PATTERNS = { uni: 'Uni', streifen: 'Längsstreifen', ringel: 'Ringel' };

// Trikots werden vor Saisonbeginn bestellt – danach ist die Saison gelaufen.
export const kitEditable = (career) => career.round === 0;

export function updateClub(career, { name, short, kit }) {
  if (!kitEditable(career)) return false;
  const club = humanClub(career);
  if (name?.trim()) club.name = name.trim().slice(0, 32);
  if (short?.trim()) club.short = short.trim().toUpperCase().slice(0, 4);
  if (kit && JSON.stringify({ ...club.kit, ...kit }) !== JSON.stringify(club.kit)) {
    // Neue Trikots kosten – ohne Geld in der Kasse bleibt's beim alten Satz.
    if (career.cash < KIT_COST) return 'nocash';
    book(career, 'Neuer Trikotsatz', -KIT_COST);
    club.kit = { ...club.kit, ...kit };
    // Torwart immer in einer Kontrastfarbe.
    const keeper = [0xe8742a, 0x5cc46a, 0xe0b020, 0x6b4f8c].find((c) => colorDistance(c, club.kit.shirt) > 150) ?? 0xe8742a;
    club.keeperKit = { shirt: keeper, shorts: 0x1c1c1c, socks: keeper };
  }
  return true;
}

export function colorDistance(a, b) {
  const ch = (n, s) => (n >> s) & 255;
  return Math.hypot(ch(a, 16) - ch(b, 16), ch(a, 8) - ch(b, 8), ch(a, 0) - ch(b, 0));
}

// Bei ähnlichen Trikots läuft der Gast im Ausweichtrikot auf.
export function resolveKitClash(home, away) {
  if (colorDistance(home.kit.shirt, away.kit.shirt) > 110) return away;
  const alt = [0xf2efe6, 0x1c1c1c, 0xe0b020].find((c) => colorDistance(c, home.kit.shirt) > 150);
  return { ...away, kit: { shirt: alt, shorts: alt === 0x1c1c1c ? 0xf2efe6 : 0x1c1c1c, socks: alt } };
}

// --- Aufstellung durch den Trainer ------------------------------------------------

export function matchFormat(career) {
  const f = humanFixture(career);
  return PITCHES[clubById(career, f.home).venue].format;
}

// Aktuelle Aufstellung für die Anzeige: gewählte Spieler, Rest automatisch.
// Aushilfen erscheinen als null ("Aushilfe").
export function currentLineup(career) {
  const club = humanClub(career);
  const format = matchFormat(career);
  const { lineup, bench, helpers } = buildLineup(career, club, format, career.week.availability, createRng(1), career.week.lineup);
  return {
    format,
    formation: FORMATIONS[format],
    lineup: lineup.map((idx) => (helpers.includes(idx) ? null : idx)),
    bench: bench.filter((idx) => !helpers.includes(idx)),
  };
}

// Spieler auf eine Position setzen; steht er schon woanders, wird getauscht.
export function setLineupSlot(career, slot, idx) {
  if (coachAway(career)) return; // der Kapitän stellt auf
  const { lineup } = currentLineup(career);
  const next = [...lineup];
  const from = next.indexOf(idx);
  if (from >= 0) next[from] = next[slot];
  next[slot] = idx;
  career.week.lineup = next;
}

export function resetLineup(career) {
  career.week.lineup = null;
}

// Tiefe Kopie – das Match verändert seine Spieler, der Pool bleibt unberührt.
const copyPlayer = (p) => ({ ...p, attrs: { ...p.attrs }, traits: [...p.traits], look: { ...p.look } });

function helperOf(career, club, idx) {
  const mate = rawPlayer(career, club.squad[idx % club.squad.length]);
  return { ...copyPlayer(poolPlayer(idx)), helperFor: mate.name.split(' ')[0] };
}

export function teamForMatch(career, club, format, availability, rng) {
  const manual = club.human ? career.week?.lineup : null;
  const { lineup, bench, late, helpers } = buildLineup(career, club, format, availability, rng, manual);
  const players = [...lineup, ...bench].map((idx) => {
    const p = helpers.includes(idx) ? helperOf(career, club, idx) : applyForm(copyPlayer(playerOf(career, idx)), career.players[idx], club.human ? career.mood ?? 0 : 0);
    if (late.includes(idx)) p.late = true;
    return p;
  });
  applyPubToTeam(career, club, players); // Bierdeckel-Taktik bzw. Tipp vom Wirt
  if (club.human) applyChemistry(career, lineup.filter((idx) => !helpers.includes(idx)), players); // Kumpels & Rivalen
  return { name: club.name, short: club.short, kit: club.kit, keeperKit: club.keeperKit, players, helpers };
}

// Gegner: ein, zwei Leute fehlen immer.
function aiAvailability(club, rng) {
  const a = {};
  for (const idx of club.squad) a[idx] = rng.chance(0.15) ? 'no' : 'yes';
  return a;
}

export function prepareMatch(career, fixture, { human = false, duration } = {}) {
  const index = (id) => career.clubs.findIndex((c) => c.id === id);
  const rng = createRng(hashSeed(career.seed, career.season, career.round, index(fixture.home), index(fixture.away)));
  const home = clubById(career, fixture.home);
  const away = clubById(career, fixture.away);
  const league = leagueOf(career);
  const base = PITCHES[home.venue];
  // Das Wetter der Woche gilt auf allen Plätzen der Liga.
  const pitch = applyWeather({ ...base, format: league.format ?? base.format, referee: league.referee || !!base.referee }, career.week?.weather);
  const avail = (c) => (c.human ? career.week.availability : aiAvailability(c, rng));
  const teamHome = teamForMatch(career, home, pitch.format, avail(home), rng);
  const teamAway = teamForMatch(career, resolveKitClash(home, away), pitch.format, avail(away), rng);
  // Der menschliche Verein ist in der Simulation immer Team 0.
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration, incidents: true });
  // Derby: hitziger, mehr Karten – außer man hat sich aufs faire Grillen geeinigt.
  match.derby = isDerbyFixture(career, fixture) && !career.week?.derbyFair;
  return { match, humanIsAway, pitch, home, away, helpers: [...teamHome.helpers, ...teamAway.helpers] };
}

// Ungespielte Partie im Hintergrund simulieren, in Häppchen, damit die
// Oberfläche nicht einfriert.
export async function simulate(prepared, { chunk = 6000, yieldFn = () => new Promise((r) => setTimeout(r, 0)) } = {}) {
  const m = prepared.match;
  let steps = 0;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
    if (++steps % chunk === 0) await yieldFn();
  }
  return m;
}

export function simulateSync(prepared) {
  const m = prepared.match;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  return m;
}

// --- Ergebnisse ------------------------------------------------------------------

export function recordResult(career, fixture, prepared) {
  const m = prepared.match;
  const [s0, s1] = m.score;
  fixture.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  const grades = gradePlayers(m);
  for (const p of allPlayers(m)) {
    const rec = career.players[p.poolIndex];
    const st = m.stats.players[p.id];
    if (!rec || !st || st.seconds <= 0) continue;
    rec.apps++;
    rec.lastApp = career.round;
    rec.goals += st.goals;
    rec.assists += st.assists;
    if (grades[p.id] !== undefined) {
      rec.gradeSum += grades[p.id];
      rec.graded++;
    }
    // Schürfwunden ab ×2 brauchen eine Woche.
    if (p.injury && p.injury.severity >= 2) rec.injuryWeeks = Math.max(rec.injuryWeeks, 1);
  }
  const humanId = humanClub(career).id;
  if (fixture.home === humanId || fixture.away === humanId) rollInjuries(career, prepared); // Zerrung bis Kreuzband
  matchFinances(career, fixture, prepared, career.level ?? 1);
  const human = humanClub(career).id;
  if (fixture.home === human) resultMood(career, fixture.result.home, fixture.result.away);
  else if (fixture.away === human) resultMood(career, fixture.result.away, fixture.result.home);
  if (fixture.home === human) sponsorResult(career, fixture.result.home, fixture.result.away);
  else if (fixture.away === human) sponsorResult(career, fixture.result.away, fixture.result.home);
  if (isDerbyFixture(career, fixture)) {
    const homeHuman = fixture.home === human;
    derbyResult(career, homeHuman ? fixture.result.home : fixture.result.away, homeHuman ? fixture.result.away : fixture.result.home);
  }
  return fixture.result;
}

export function finishRound(career) {
  autoResolve(career);
  weeklyFinances(career);
  weeklyMood(career);
  weeklyPersonal(career);
  sagaWeek(career);
  weeklyAcademy(career);
  for (const rec of Object.values(career.players)) {
    if (rec.injuryWeeks > 0) rec.injuryWeeks--;
    if (rec.injuryWeeks === 0) rec.injury = null;
    if (rec.awayWeeks > 0) rec.awayWeeks--;
  }
  career.round++;
  startWeek(career);
}

export function table(career) {
  const rows = Object.fromEntries(career.clubs.map((c) => [c.id, { club: c, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const round of career.fixtures)
    for (const f of round) {
      if (!f.result) continue;
      const h = rows[f.home];
      const a = rows[f.away];
      h.played++;
      a.played++;
      h.gf += f.result.home;
      h.ga += f.result.away;
      a.gf += f.result.away;
      a.ga += f.result.home;
      if (f.result.home > f.result.away) {
        h.w++;
        a.l++;
        h.pts += 3;
      } else if (f.result.home < f.result.away) {
        a.w++;
        h.l++;
        a.pts += 3;
      } else {
        h.d++;
        a.d++;
        h.pts++;
        a.pts++;
      }
    }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.club.name.localeCompare(y.club.name));
}

// --- Speichern ---------------------------------------------------------------------

const SAVE_KEY = 'sunday-league:career';

export function saveCareer(career, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(career));
    return true;
  } catch {
    return false;
  }
}

export function loadCareer(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c.version === SAVE_VERSION ? migrateCareer(c) : null;
  } catch {
    return null;
  }
}

export function deleteCareer(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // egal
  }
}
