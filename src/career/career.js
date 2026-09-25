// Karriere: eine Saison in der Freizeitliga. Der Zustand ist reines JSON
// (speicherbar); Spieler werden nur über ihre Pool-Nummer referenziert.
import { createRng } from '../core/rng.js';
import { FORMATIONS } from '../sim/formation.js';
import { createPlayerPool } from '../sim/generator.js';
import { createMatch, stepMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { allPlayers } from '../sim/squad.js';
import { gradePlayers } from '../sim/stats.js';
import { absenceChance, DECLINE_TEXT, FAREWELL, INJURED, JOIN_TEXT, LATE, noReasons, NUDGE_NO, NUDGE_YES, RUMOR_SOURCES, YES } from './chat.js';
import { AI_CLUBS, HUMAN_CLUB_DEFAULT, LEAGUE_NAME } from './clubs.js';

export const SAVE_VERSION = 1;
export const POOL_SEED = 1921;
const SQUAD_SHAPE = ['gk', 'def', 'def', 'def', 'mid', 'mid', 'mid', 'fwd', 'fwd'];
const NUDGES_PER_WEEK = 3;
export const MAX_SQUAD = 12;
export const MIN_SQUAD = 7;
const SCOUT_ACTIONS = 2;
const RUMOR_TIERS = { ok: 0.44, gut: 0.33, stark: 0.15, dorfstar: 0.06, superstar: 0.014, legende: 0.006 };
const RECRUIT_BASE = { ok: 0.85, gut: 0.65, stark: 0.45, dorfstar: 0.3, superstar: 0.2, legende: 0.15 };
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

let poolCache = null;
export const getPool = () => (poolCache ??= createPlayerPool({ seed: POOL_SEED }));
export const poolPlayer = (index) => getPool().get(index);

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// --- Neue Saison ----------------------------------------------------------------

export function createCareer({ seed = Date.now() % 1e9, club = {} } = {}) {
  const rng = createRng(seed);
  const pool = getPool();
  const byTierPos = {};
  for (const p of pool.everyone()) (byTierPos[`${p.tier}:${p.position}`] ??= []).push(p.poolIndex);
  const used = new Set();

  const pick = (tiers, position) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const tier = weighted(rng, tiers);
      const list = byTierPos[`${tier}:${position}`];
      if (!list?.length) continue;
      const idx = rng.pick(list);
      if (!used.has(idx)) {
        used.add(idx);
        return idx;
      }
    }
    throw new Error('Pool erschöpft');
  };

  const human = { ...HUMAN_CLUB_DEFAULT, ...club, human: true };
  const clubs = [human, ...AI_CLUBS.map((c) => ({ ...c, human: false }))].map((c) => ({
    ...c,
    squad: SQUAD_SHAPE.map((pos) => pick(c.tiers, pos)),
  }));

  const players = {};
  for (const c of clubs) for (const idx of c.squad) players[idx] = freshRecord();

  const career = {
    version: SAVE_VERSION,
    seed,
    league: LEAGUE_NAME,
    season: 1,
    round: 0,
    clubs,
    players,
    fixtures: roundRobin(clubs.map((c) => c.id), rng),
    week: null,
  };
  startWeek(career);
  return career;
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
    const p = poolPlayer(idx);
    const rec = career.players[idx];
    let status = 'yes';
    let text;
    if (rec.injuryWeeks > 0) {
      status = 'no';
      text = rng.pick(INJURED);
    } else if (rng.chance(absenceChance(p.profession))) {
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
  career.week = { availability, chat, nudges: NUDGES_PER_WEEK, nudged: [], lineup: null };
  career.week.rumors = makeRumors(career, createRng(hashSeed(career.seed, career.season, career.round, 3)));
  career.week.actions = SCOUT_ACTIONS;
}

// Nachhaken bei einer Absage – klappt ungefähr jedes zweite Mal.
export function nudge(career, idx) {
  const w = career.week;
  if (!w || w.nudges <= 0 || w.availability[idx] !== 'no' || w.nudged.includes(idx)) return null;
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
      const p = poolPlayer(idx);
      return p.attrs[attr] + (p.position === slot.role ? 0.25 : 0) + p.rating / 400;
    };
    free.sort((a, b) => score(b) - score(a));
    lineup[i] = free.shift();
  });
  return { lineup, bench: [...free, ...late], late, helpers };
}

// --- Gerüchteküche & Transfers -------------------------------------------------------

const takenIndices = (career) => new Set(career.clubs.flatMap((c) => c.squad));

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

// Alte Spielstände ohne Gerüchteküche nachrüsten.
export function migrateCareer(career) {
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
  if (p.tier === 'legende') {
    // Ex-Profis wollen keinen Rummel, aber eine gute Truppe.
    if (played && rank === 1) chance -= 0.15;
    const goodVibes = club.squad.some((idx) => ['teamchemie', 'anfuehrer'].some((t) => poolPlayer(idx).traits.includes(t)));
    if (goodVibes) chance += 0.12;
  }
  return Math.max(0.05, Math.min(0.95, chance));
}

export function scoutRumor(career, i) {
  const w = career.week;
  const r = w?.rumors[i];
  if (!r || r.scouted || r.status !== 'open' || w.actions <= 0) return false;
  w.actions--;
  r.scouted = true;
  return true;
}

export function recruit(career, i) {
  const w = career.week;
  const r = w?.rumors[i];
  const club = humanClub(career);
  if (!r || r.status !== 'open' || w.actions <= 0) return null;
  if (club.squad.length >= MAX_SQUAD) return 'full';
  const p = poolPlayer(r.idx);
  const rng = createRng(hashSeed(career.seed, career.season, career.round, r.idx, 13));
  w.actions--;
  if (rng.chance(recruitChance(career, r))) {
    r.status = 'joined';
    r.scouted = true;
    r.reply = rng.pick(JOIN_TEXT);
    club.squad.push(r.idx);
    career.players[r.idx] = freshRecord();
    w.availability[r.idx] = 'yes';
    w.chat.push({ from: r.idx, text: `(neu in der Gruppe) ${r.reply}`, time: 'Sa 18:03' });
    return 'joined';
  }
  r.status = 'declined';
  r.reply = rng.pick(DECLINE_TEXT[p.tier] ?? DECLINE_TEXT.default);
  return 'declined';
}

export function releasePlayer(career, idx) {
  const club = humanClub(career);
  if (club.squad.length <= MIN_SQUAD || !club.squad.includes(idx)) return false;
  club.squad = club.squad.filter((x) => x !== idx);
  delete career.players[idx];
  if (career.week) {
    delete career.week.availability[idx];
    if (career.week.lineup) career.week.lineup = career.week.lineup.map((x) => (x === idx ? null : x));
    career.week.chat.push({ from: idx, text: `${FAREWELL[idx % FAREWELL.length]} (hat die Gruppe verlassen)`, time: 'Sa 20:30' });
  }
  return true;
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
  const mate = poolPlayer(club.squad[idx % club.squad.length]);
  return { ...copyPlayer(poolPlayer(idx)), helperFor: mate.name.split(' ')[0] };
}

export function teamForMatch(career, club, format, availability, rng) {
  const manual = club.human ? career.week?.lineup : null;
  const { lineup, bench, late, helpers } = buildLineup(career, club, format, availability, rng, manual);
  const players = [...lineup, ...bench].map((idx) => {
    const p = helpers.includes(idx) ? helperOf(career, club, idx) : copyPlayer(poolPlayer(idx));
    if (late.includes(idx)) p.late = true;
    return p;
  });
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
  const pitch = PITCHES[home.venue];
  const avail = (c) => (c.human ? career.week.availability : aiAvailability(c, rng));
  const teamHome = teamForMatch(career, home, pitch.format, avail(home), rng);
  const teamAway = teamForMatch(career, away, pitch.format, avail(away), rng);
  // Der menschliche Verein ist in der Simulation immer Team 0.
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration });
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
    rec.goals += st.goals;
    rec.assists += st.assists;
    if (grades[p.id] !== undefined) {
      rec.gradeSum += grades[p.id];
      rec.graded++;
    }
    // Schürfwunden ab ×2 brauchen eine Woche.
    if (p.injury && p.injury.severity >= 2) rec.injuryWeeks = 1;
  }
  return fixture.result;
}

export function finishRound(career) {
  for (const rec of Object.values(career.players)) if (rec.injuryWeeks > 0) rec.injuryWeeks--;
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
