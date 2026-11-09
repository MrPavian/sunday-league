// Europapokal (ROADMAP 11.17 #13, vom Nutzer entschieden 2026-11-08): drei erfundene Wettbewerbe im echten Format seit 2024/25.
//
// Format (laut uefa.com „Regulations of the UEFA Champions League 2025/26“ Art. 17 und Berichten von ESPN, Olympics.com, The Athletic):
// - Ligaphase: 36 Vereine in einer Tabelle, vier Lostöpfe zu je neun nach Stärke; jeder spielt acht Gegner, aus jedem Topf zwei
//   (einmal zu Hause, einmal auswärts), nie gegen einen Verein aus dem eigenen Land.
// - Platz 1–8 direkt ins Achtelfinale, Platz 9–24 in die K.-o.-Play-offs (9–16 gesetzt gegen 17–24), Platz 25–36 ausgeschieden.
// - Play-offs, Achtel-, Viertel- und Halbfinale mit Hin- und Rückspiel; der Gesetzte hat das Rückspiel zu Hause. Steht es nach
//   beiden Spielen gleich, folgen Verlängerung und Elfmeterschießen (die Auswärtstorregel gibt es seit 2021/22 nicht mehr).
//   Das Endspiel ist ein Spiel auf neutralem Platz.
// - Tabelle bei Punktgleichheit: Tordifferenz, Tore, Auswärtstore, Siege, Auswärtssiege (laut Sports Mole, „Champions League
//   2025-26: … how many points are needed?“); die weiteren Kriterien (Punkte der Gegner, Fair Play, Koeffizient) ersetzt hier die Stärke.
// Prämien: europadata.js (UEFA-Rundschreiben 32/2025).
//
// Kalender (vom Nutzer entschieden 2026-11-08): Die 1. Liga hat im Spiel nur 10 Spielwochen. Deshalb zwei Europapokal-Abende je
// Woche, Dienstag und Donnerstag 21 Uhr – in der ersten Woche nur Donnerstag, in der Winterpause keiner. Das ergibt genau 17
// Termine: 8 Spieltage, Play-offs, Achtel-, Viertel-, Halbfinale (je 2) und das Endspiel am Donnerstag der letzten Woche.
// Die Spiele ohne den eigenen Verein rechnet das Schnellmodell (pokal.js quickTie); scheidet man aus, wird der Rest gleich ausgespielt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { rankTable } from '../core/standings.js';
import { createMatch, EXTRA_SHARE, MATCH, matchDuration } from '../sim/match.js';
import { BUND_PITCHES, PITCHES } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { subRuleFor } from '../sim/squad.js';
import { clubById, humanClub, playerOf, resolveKits, squadPicker, SQUAD_SHAPES, takenIndices, teamForMatch } from './career.js';
import { PROFI_ATTRS, PROFI_KLASSEN } from './bundespokal.js';
import { adjustMood } from './events.js';
import { book, matchFinances, UPPER_FANS } from './finances.js';
import { afterMatchFitness, fitnessOf } from './fitness.js';
import { poisson, QUICK, quickSlope } from './pokal.js';
import { chronicle, yearOf } from './sagas.js';
import { applyCards } from './suspensions.js';
import { applyWeather } from './weather.js';
import { EURO_COUNTRY, EURO_KINDS, EURO_NAMES, EURO_POOL, EURO_PRIZES, EURO_QUAL, EURO_STRENGTH, EURO_STRENGTH_OLD, EURO_TIERS } from './europadata.js';

export { EURO_KINDS, EURO_NAMES, EURO_PRIZES, EURO_QUAL };
export const EURO_LEVEL = 12; // nur aus der 1. Liga
const N = 36;
const POT = 9;
const MATCHDAYS = 8;
const KICKOFF = tr('21:00 Uhr', '9pm');
const DAY_NAME = { tue: tr('Dienstag', 'Tuesday'), wed: tr('Mittwoch', 'Wednesday'), thu: tr('Donnerstag', 'Thursday') };
export const euroWhen = (day) => `${DAY_NAME[day] ?? DAY_NAME.thu}, ${KICKOFF}`;
export const isEuro = (kind) => EURO_KINDS.includes(kind);

// Termine: [{ week, day, stage, md | leg }]
const PLAN = [
  ...Array.from({ length: MATCHDAYS }, (_, md) => ({ stage: 'lp', md })),
  ...['po', 'r16', 'qf', 'sf'].flatMap((stage) => [{ stage, leg: 0 }, { stage, leg: 1 }]),
  { stage: 'f', leg: 0 },
];
export function euroSlots(n) {
  const winter = Math.floor(n / 2);
  const days = [];
  for (let w = 0; w < n; w++) {
    if (w === winter) continue;
    if (w > 0) days.push({ week: w, day: 'tue' });
    days.push({ week: w, day: 'thu' });
  }
  while (days.length < PLAN.length) days.push({ ...days.at(-1) }); // kürzere Saison: mehrere Termine am selben Abend (kommt in der 1. Liga nicht vor)
  return PLAN.map((p, i) => ({ ...p, ...days[i] }));
}

const STAGE_NAME = {
  lp: tr('Ligaphase', 'League phase'),
  po: tr('K.-o.-Play-offs', 'Knockout play-offs'),
  r16: tr('Achtelfinale', 'Round of 16'),
  qf: tr('Viertelfinale', 'Quarter-finals'),
  sf: tr('Halbfinale', 'Semi-finals'),
  f: tr('Endspiel', 'Final'),
};
export const stageName = (stage) => STAGE_NAME[stage];
export function slotName(slot) {
  if (!slot) return '';
  if (slot.stage === 'lp') return tr(`Ligaphase, ${slot.md + 1}. Spieltag`, `League phase, matchday ${slot.md + 1}`);
  if (slot.stage === 'f') return STAGE_NAME.f;
  return `${STAGE_NAME[slot.stage]}, ${slot.leg === 0 ? tr('Hinspiel', 'first leg') : tr('Rückspiel', 'second leg')}`;
}

export const euroOf = (c) => EURO_KINDS.map((k) => (c.pokale?.[k]?.season === c.season ? c.pokale[k] : null)).find(Boolean) ?? null;
export const euroKind = (c) => euroOf(c)?.kind ?? null;

// --- Stärke und Schnellmodell -----------------------------------------------------------------------------------
const squadStrength = (c, club) => {
  const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11);
  return r.reduce((s, x) => s + x, 0) / Math.max(1, r.length);
};
function strOf(c, cup, id) {
  const f = cup.field.find((x) => x.id === id);
  if (f?.human) return squadStrength(c, humanClub(c));
  if (f?.domestic) {
    const club = clubById(c, id);
    return club ? squadStrength(c, club) : f.str;
  }
  return f?.str ?? 150;
}
function quickGame(c, cup, home, away, rng, neutral = false) {
  const sh = strOf(c, cup, home);
  const sa = strOf(c, cup, away);
  const d = sh - sa;
  const pp = quickSlope(c, sh, sa);
  const lh = QUICK.base * Math.exp(pp * d + (neutral ? 0 : QUICK.home));
  const la = QUICK.base * Math.exp(-pp * d);
  return { hg: poisson(rng, lh), ag: poisson(rng, la), lh, la };
}

// --- Teilnehmer ------------------------------------------------------------------------------------------------
const gaussOf = (rng) => Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
const FIELD_COLORS = [0x2f6fb5, 0xc8352f, 0x2e6b3a, 0xe0b020, 0x6b4f8c, 0xe8742a, 0x1f8a8a, 0x8c2f2f, 0x58c9a5, 0x3a8fb7, 0xd8c690, 0x7a1f3d];
const SHORTS = [0xf2efe6, 0x1c1c1c, 0x14233a];
function kitOf(id) {
  let h = 11;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const shirt = FIELD_COLORS[h % FIELD_COLORS.length];
  return { shirt, shorts: SHORTS[(h >>> 4) % SHORTS.length], socks: shirt, pattern: 'uni' };
}

function buildField(c, kind, rng, domestic) {
  const me = humanClub(c);
  const field = [{ id: me.id, name: me.name, short: me.short, country: 'ger', human: true }];
  for (const id of domestic) {
    const club = clubById(c, id);
    if (club && !club.human && field.length < 3) field.push({ id, name: club.name, short: club.short, country: 'ger', domestic: true });
  }
  const tiers = EURO_TIERS[kind];
  const need = N - field.length;
  const pool = EURO_POOL.filter((x) => tiers.includes(x.tier))
    .map((x) => ({ x, r: rng.next() }))
    .sort((a, b) => a.x.tier - b.x.tier || a.r - b.r)
    .slice(0, need)
    .map(({ x }) => x);
  const [mean, sd] = ((c.strength ?? 1) >= 3 ? EURO_STRENGTH : EURO_STRENGTH_OLD)[kind];
  const values = pool.map(() => +(mean + gaussOf(rng) * sd).toFixed(1)).sort((a, b) => b - a);
  pool.forEach((x, i) => field.push({ id: x.id, name: x.name, short: x.short, country: x.country, str: values[i] }));
  return field;
}

// --- Auslosung der Ligaphase ------------------------------------------------------------------------------------
// Jeder Spieltag ist eine vollständige Paarung aller 36 (Suche mit Zurücksetzen). Bedingungen: kein Gegner doppelt, nie dasselbe Land,
// je Topf genau ein Heim- und ein Auswärtsspiel. Klappt ein Durchgang nicht, wird neu begonnen (deterministisch über rng).
export function drawLeaguePhase(field, potOf, rng) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const days = tryDraw(field, potOf, rng);
    if (days) return days;
  }
  throw new Error('Europapokal: Auslosung der Ligaphase gescheitert');
}
function tryDraw(field, potOf, rng) {
  const met = field.map(() => new Set());
  const home = field.map(() => [false, false, false, false]);
  const away = field.map(() => [false, false, false, false]);
  const days = [];
  for (let d = 0; d < MATCHDAYS; d++) {
    const free = new Set(field.map((_, i) => i));
    const pairs = [];
    let budget = 4000;
    const options = (t) => {
      const out = [];
      for (const u of free) {
        if (u === t || met[t].has(u) || field[t].country === field[u].country) continue;
        const pt = potOf[t];
        const pu = potOf[u];
        if (!home[t][pu] && !away[u][pt]) out.push([t, u]);
        if (!away[t][pu] && !home[u][pt]) out.push([u, t]);
      }
      return out;
    };
    const solve = () => {
      if (!free.size) return true;
      if (budget-- <= 0) return false;
      let bestOpts = null;
      for (const t of free) {
        const o = options(t);
        if (!o.length) return false;
        if (!bestOpts || o.length < bestOpts.length) bestOpts = o;
      }
      const opts = bestOpts.map((o) => ({ o, r: rng.next() })).sort((a, b) => a.r - b.r).map((x) => x.o);
      for (const [h, a] of opts) {
        const ph = potOf[h];
        const pa = potOf[a];
        free.delete(h);
        free.delete(a);
        home[h][pa] = true;
        away[a][ph] = true;
        pairs.push([h, a]);
        if (solve()) return true;
        pairs.pop();
        home[h][pa] = false;
        away[a][ph] = false;
        free.add(h);
        free.add(a);
      }
      return false;
    };
    if (!solve()) return null;
    for (const [h, a] of pairs) {
      met[h].add(a);
      met[a].add(h);
    }
    days.push(pairs.map(([h, a]) => ({ home: field[h].id, away: field[a].id, hg: null, ag: null })));
  }
  return days;
}

// --- Start -----------------------------------------------------------------------------------------------------
export const euroEligible = (c) => (c.level ?? 1) === EURO_LEVEL && !!c.euroQual && c.euroQual.season === c.season && EURO_KINDS.includes(c.euroQual.kind);

export function startEuro(c) {
  if (euroOf(c) || !euroEligible(c)) return euroOf(c);
  const kind = c.euroQual.kind;
  const rng = createRng((c.seed * 131 + c.season * 7919 + 4243 + EURO_KINDS.indexOf(kind) * 17) >>> 0);
  const domestic = c.euroQual.domestic?.[kind] ?? [];
  const field = buildField(c, kind, rng, domestic);
  const me = humanClub(c).id;
  const cup = { kind, euro: true, season: c.season, year: yearOf(c), field, guests: [], levels: {}, slots: euroSlots(c.fixtures.length), cursor: 0, ties: [], lp: null, ko: {}, out: false, winner: null, log: [], done: false, earned: 0 };
  cup.levels[me] = EURO_LEVEL;
  // Lostöpfe nach Stärke (in echt nach dem Klubkoeffizienten; den gibt es im Spiel nicht).
  const order = [...field].sort((a, b) => strOf(c, cup, b.id) - strOf(c, cup, a.id)).map((f) => f.id);
  for (const f of field) f.pot = Math.floor(order.indexOf(f.id) / POT);
  const days = drawLeaguePhase(field, field.map((f) => f.pot), rng);
  cup.lp = { days };
  c.pokale ??= {};
  c.pokale[kind] = cup;
  days.forEach((pairs, md) => {
    const g = pairs.find((p) => p.home === me || p.away === me);
    if (g) addHumanTie(c, cup, { stage: 'lp', md, home: g.home, away: g.away }, rng);
  });
  prize(c, cup, 'start', tr('Startgeld', 'Starting fee'));
  cup.log.push(tr(`${EURO_NAMES[kind]} ${cup.year}: Ligaphase mit 36 Vereinen, ihr steht in Topf ${field[0].pot + 1}.`, `${EURO_NAMES[kind]} ${cup.year}: league phase with 36 clubs, you are in pot ${field[0].pot + 1}.`));
  return cup;
}

// Gegner des eigenen Vereins als Gast mit echtem Kader (für das Spiel in 3D), wie im überregionalen Pokal (pokal.js bundDraw).
function guestFor(c, cup, fieldId, rng) {
  const f = cup.field.find((x) => x.id === fieldId);
  if (!f || f.human) return humanClub(c).id;
  if (f.domestic) return f.id;
  const gid = `euro-${f.id}`;
  if (cup.guests.some((g) => g.id === gid)) return gid;
  const m3 = (c.strength ?? 1) >= 3;
  const klass = PROFI_KLASSEN.erst;
  const squad = squadPicker(rng, takenIndices(c), m3 ? 8 : null)(klass.tiers, SQUAD_SHAPES.xxl);
  // Technik auf die Stärke dieses Vereins angehoben (wie profiDelta in pokal.js: Oberliga-Kader ≈ 129, 0,7 = Anteil der Technik).
  const tech = m3 ? (f.str - 129) / (100 * 0.7) : klass.boost;
  for (const idx of squad) c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, delta: Object.fromEntries(PROFI_ATTRS.map((k) => [k, k === 'pace' || k === 'stamina' ? klass.boost : tech])) };
  cup.guests.push({ id: gid, fieldId: f.id, name: f.name, short: f.short, country: f.country, kit: kitOf(f.id), keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 }, human: false, venue: 'grossfeld', squad, level: EURO_LEVEL, klass: 'euro' });
  cup.levels[gid] = EURO_LEVEL;
  return gid;
}
const toField = (cup, id) => cup.guests.find((g) => g.id === id)?.fieldId ?? id;

function addHumanTie(c, cup, { stage, md = null, leg = 0, home, away, neutral = false }, rng) {
  const slot = cup.slots.findIndex((s) => s.stage === stage && (stage === 'lp' ? s.md === md : s.leg === leg));
  const h = guestFor(c, cup, home, rng);
  const a = guestFor(c, cup, away, rng);
  cup.ties.push({ kind: cup.kind, round: slot, slot, stage, md, leg, day: cup.slots[slot].day, home: h, away: a, result: null, pens: null, ...(neutral ? { neutral: true } : {}) });
}

// --- Eigenes Spiel ---------------------------------------------------------------------------------------------
export function euroHumanTie(c, kind) {
  const cup = c.pokale?.[kind];
  if (!cup || cup.season !== c.season || cup.done || cup.out) return null;
  const slot = cup.slots[cup.cursor];
  if (!slot || slot.week !== c.round || c.round >= c.fixtures.length) return null;
  return cup.ties.find((t) => t.slot === cup.cursor && !t.result) ?? null;
}

// Gesamtergebnis vor dem Rückspiel aus Sicht der Heimmannschaft des Rückspiels.
export function firstLegOf(cup, tie) {
  if (tie.stage === 'lp' || tie.stage === 'f' || tie.leg !== 1) return null;
  const first = cup.ties.find((t) => t.stage === tie.stage && t.leg === 0);
  if (!first?.result) return null;
  // Im Hinspiel waren Heim und Gast vertauscht.
  return { home: first.result.away, away: first.result.home };
}

export function prepareEuroMatch(c, kind, tie, { human = false, duration } = {}) {
  const cup = c.pokale[kind];
  const home = clubById(c, tie.home) ?? cup.guests.find((g) => g.id === tie.home);
  const away = clubById(c, tie.away) ?? cup.guests.find((g) => g.id === tie.away);
  const rng = createRng((c.seed * 433 + c.season * 59 + tie.slot * 7919 + 77) >>> 0);
  // Heimspiel im eigenen Stadion, auswärts und im Endspiel im großen Stadion.
  const base = home.human && !tie.neutral ? PITCHES[home.venue] ?? PITCHES.grossfeld : BUND_PITCHES.stadion;
  const pitch = applyWeather({ ...base, format: 11, referee: true }, c.week?.weather);
  const avail = (club) => (club.human ? c.week?.availability ?? Object.fromEntries(club.squad.map((i) => [i, 'yes'])) : Object.fromEntries(club.squad.map((i) => [i, (c.players[i]?.injuryWeeks ?? 0) > 0 || rng.chance(0.08) ? 'no' : 'yes'])));
  const kits = resolveKits(home, away);
  const teamHome = teamForMatch(c, kits.home, 11, avail(home), rng);
  const teamAway = teamForMatch(c, kits.away, 11, avail(away), rng);
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration: duration ?? matchDuration(pitch), incidents: true });
  match.subRule = subRuleFor(MATCH.subs, EURO_LEVEL);
  match.midweek = true; // Flutlicht
  match.extraTime = MATCH.pokalExtra;
  if (tie.stage === 'f') match.knockout = true;
  if (cup.sc) match.extraTime = false; // Supercup: bei Unentschieden direkt Elfmeterschießen (so 2025 in Udine, 2:2 und 4:3 i. E.)
  const first = firstLegOf(cup, tie);
  if (first) {
    match.knockout = true;
    // Team 0 ist der eigene Verein, wenn er spielt, sonst die Heimmannschaft.
    const t0Home = !humanIsAway;
    match.aggregate = t0Home ? [first.home, first.away] : [first.away, first.home];
  }
  match.crowd = rng.int(...UPPER_FANS[EURO_LEVEL]);
  match.homeTeam = humanIsAway ? 1 : 0;
  return { match, humanIsAway, pitch, home, away, tie, kind, euro: true };
}

export function recordEuroResult(c, prepared) {
  const { tie, kind, match: m } = prepared;
  const cup = c.pokale[kind];
  const cost = {};
  for (const p of [...m.players, ...m.bench.flat(), ...(m.sentOff ?? [])]) {
    const st = m.stats.players[p.id];
    if (p.poolIndex == null || !(st?.seconds > 0)) continue;
    const before = fitnessOf(c, p.poolIndex);
    afterMatchFitness(c, p.poolIndex, Math.min(1 + EXTRA_SHARE, st.seconds / (m.duration || st.seconds)), 1, 1 + EXTRA_SHARE);
    if (before > fitnessOf(c, p.poolIndex)) cost[p.poolIndex] = before - fitnessOf(c, p.poolIndex);
  }
  const [s0, s1] = m.score;
  tie.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  if (m.extra) tie.et = true;
  const first = firstLegOf(cup, tie);
  const level = first ? tie.result.home + first.home === tie.result.away + first.away : tie.stage === 'f' && tie.result.home === tie.result.away;
  if (level) {
    const so = m.shootout;
    const r = createRng((c.seed * 7 + tie.slot * 131 + 19) >>> 0);
    const pens = so?.done ? shootoutScore(so) : r.chance(0.5) ? [5, 4] : [4, 5]; // ohne Szene: Glückssache (wie pokal.js)
    tie.pens = prepared.humanIsAway ? { home: pens[1], away: pens[0] } : { home: pens[0], away: pens[1] };
  }
  applyCards(c, prepared, { league: false, beforeLeague: true });
  matchFinances(c, tie, { ...prepared, bund: null }, EURO_LEVEL);
  const me = humanClub(c).id;
  const ours = tie.home === me ? tie.result.home : tie.result.away;
  const theirs = tie.home === me ? tie.result.away : tie.result.home;
  if (cup.sc) playSuper(c, cup, tie);
  else playSlot(c, cup, cup.cursor);
  const opp = (clubById(c, tie.home === me ? tie.away : tie.home) ?? cup.guests.find((g) => g.id === (tie.home === me ? tie.away : tie.home))).name;
  if (c.week) c.week.midweek = { kind, day: tie.day, result: [ours, theirs], pens: tie.pens ? (tie.home === me ? [tie.pens.home, tie.pens.away] : [tie.pens.away, tie.pens.home]) : null, et: !!tie.et, opp, cost, note: euroNote(c, cup, tie) };
}

// Text unter dem Ergebnis im Vereinsheim.
function euroNote(c, cup, tie) {
  if (cup.sc) return cup.winner === humanClub(c).id ? tr(`${EURO_NAMES.esc}-Sieger!`, `${EURO_NAMES.esc} winners!`) : tr('Supercup verloren.', 'Super Cup lost.');
  if (cup.done) return cup.winner === humanClub(c).id ? tr(`${EURO_NAMES[cup.kind]}-Sieger!`, `${EURO_NAMES[cup.kind]} winners!`) : tr('Im Endspiel verloren.', 'Lost the final.');
  if (cup.out) return tr('Ausgeschieden.', 'Knocked out.');
  if (tie.stage === 'lp') {
    const pos = euroTable(c, cup).findIndex((r) => r.id === humanClub(c).id) + 1;
    return tr(`Ligaphase: jetzt Platz ${pos} von 36.`, `League phase: now ${pos}th of 36.`);
  }
  if (tie.leg === 0) return tr('Das Rückspiel entscheidet.', 'The second leg decides.');
  return tr('Eine Runde weiter.', 'Through to the next round.');
}

// --- Termine abarbeiten --------------------------------------------------------------------------------------------
function slotRng(c, cup, si) {
  return createRng((c.seed * 151 + c.season * 3571 + si * 613 + EURO_KINDS.indexOf(cup.kind) * 29 + 5) >>> 0);
}

// Einen Termin ausspielen: alle Spiele ohne eigenes Ergebnis per Schnellmodell, danach ggf. Auslosung der nächsten Runde.
export function playSlot(c, cup, si) {
  const slot = cup.slots[si];
  if (!slot || si !== cup.cursor) return;
  const rng = slotRng(c, cup, si);
  const me = humanClub(c).id;
  const mine = cup.ties.find((t) => t.slot === si);
  if (mine && !mine.result && slot.stage === 'lp') {
    // Ohne uns gespielt (z. B. verpasst): Schnellmodell mit dem echten Kader.
    const g = quickGame(c, cup, toField(cup, mine.home), toField(cup, mine.away), rng, !!mine.neutral);
    mine.result = { home: g.hg, away: g.ag };
    mine.quick = true;
  }
  if (slot.stage === 'lp') {
    for (const p of cup.lp.days[slot.md]) {
      if (p.hg != null) continue;
      const own = mine && toField(cup, mine.home) === p.home && toField(cup, mine.away) === p.away ? mine : null;
      if (own) [p.hg, p.ag] = [own.result.home, own.result.away];
      else {
        const g = quickGame(c, cup, p.home, p.away, rng);
        [p.hg, p.ag] = [g.hg, g.ag];
      }
    }
    if (mine) {
      const ours = mine.home === me ? mine.result.home : mine.result.away;
      const theirs = mine.home === me ? mine.result.away : mine.result.home;
      if (ours > theirs) prize(c, cup, 'win', tr(`Siegprämie ${slotName(slot)}`, `Win bonus, ${slotName(slot)}`));
      else if (ours === theirs) prize(c, cup, 'draw', tr(`Remisprämie ${slotName(slot)}`, `Draw bonus, ${slotName(slot)}`));
      logTie(c, cup, mine);
    }
    cup.cursor++;
    if (slot.md === MATCHDAYS - 1) leaguePhaseEnd(c, cup, rng);
  } else {
    for (const t of cup.ko[slot.stage] ?? []) playKoLeg(c, cup, t, slot, mine?.result ? mine : null, rng);
    if (mine && !mine.result) {
      // Ohne uns gespielt: Ergebnis aus dem Schnellmodell übernehmen.
      const t = cup.ko[slot.stage].find((x) => x.a === me || x.b === me);
      const leg = t.legs[slot.stage === 'f' ? 0 : slot.leg];
      mine.result = { home: leg.hg, away: leg.ag };
      if (t.pens && (slot.stage === 'f' || slot.leg === 1)) mine.pens = t.pens;
      if (t.et && (slot.stage === 'f' || slot.leg === 1)) mine.et = true;
      mine.quick = true;
    }
    if (mine) logTie(c, cup, mine);
    cup.cursor++;
    if (slot.stage === 'f' || slot.leg === 1) stageEnd(c, cup, slot.stage, rng);
  }
  // Ausgeschieden: Der Rest des Wettbewerbs wird gleich ausgespielt, der echte Sieger steht fest.
  if (cup.out && !cup.done) while (!cup.done && cup.cursor < cup.slots.length) playSlot(c, cup, cup.cursor);
}

function playKoLeg(c, cup, t, slot, mine, rng) {
  const leg = slot.stage === 'f' ? 0 : slot.leg;
  if (t.legs[leg]?.hg != null) return;
  // Hinspiel beim Ungesetzten (b), Rückspiel beim Gesetzten (a); Endspiel neutral.
  const home = slot.stage === 'f' ? t.a : leg === 0 ? t.b : t.a;
  const away = home === t.a ? t.b : t.a;
  const own = mine && toField(cup, mine.home) === home && toField(cup, mine.away) === away ? mine : null;
  let hg;
  let ag;
  let et = false;
  let pens = null;
  let lambdas = null;
  if (own) {
    [hg, ag] = [own.result.home, own.result.away];
    et = !!own.et;
    pens = own.pens;
  } else {
    const g = quickGame(c, cup, home, away, rng, slot.stage === 'f');
    [hg, ag] = [g.hg, g.ag];
    lambdas = [g.lh, g.la];
  }
  t.legs[leg] = { home, away, hg, ag };
  const decisive = slot.stage === 'f' || leg === 1;
  if (!decisive) return;
  const first = slot.stage === 'f' ? null : t.legs[0];
  const aggHome = hg + (first ? (first.home === home ? first.hg : first.ag) : 0);
  const aggAway = ag + (first ? (first.home === away ? first.hg : first.ag) : 0);
  if (aggHome === aggAway && !own) {
    if (MATCH.pokalExtra && lambdas) {
      const eh = poisson(rng, lambdas[0] * EXTRA_SHARE);
      const ea = poisson(rng, lambdas[1] * EXTRA_SHARE);
      t.legs[leg].hg += eh;
      t.legs[leg].ag += ea;
      et = true;
      if (eh !== ea) {
        t.et = true;
        t.winner = eh > ea ? home : away;
        return;
      }
    }
    pens = rng.chance(0.5) ? { home: 5, away: 4 } : { home: 4, away: 5 };
  }
  t.et = et;
  if (aggHome !== aggAway && !(own && pens)) t.winner = aggHome > aggAway ? home : away;
  else if (pens) {
    t.pens = pens;
    t.winner = pens.home > pens.away ? home : away;
  } else t.winner = rng.chance(0.5) ? home : away; // eigenes Spiel ohne Elfmeterergebnis (sollte nicht vorkommen)
}

function logTie(c, cup, t) {
  const name = (id) => (clubById(c, id) ?? cup.guests.find((g) => g.id === id))?.short ?? '?';
  cup.log.push(`${slotName(cup.slots[t.slot])}: ${name(t.home)} ${t.result.home}:${t.result.away}${t.et ? ` ${tr('n. V.', 'a.e.t.')}` : ''}${t.pens ? ` (${t.pens.home}:${t.pens.away} ${tr('i. E.', 'pens')})` : ''} ${name(t.away)}${t.quick ? ` ${tr('(ohne euch gewertet)', '(played without you)')}` : ''}`);
}

// --- Tabelle der Ligaphase ------------------------------------------------------------------------------------------
export function euroTable(c, cup) {
  const rows = Object.fromEntries(cup.field.map((f) => [f.id, { id: f.id, name: f.name, short: f.short, country: f.country, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, awayGoals: 0, awayWins: 0 }]));
  for (const day of cup.lp.days)
    for (const g of day) {
      if (g.hg == null) continue;
      const h = rows[g.home];
      const a = rows[g.away];
      h.p++;
      a.p++;
      h.gf += g.hg;
      h.ga += g.ag;
      a.gf += g.ag;
      a.ga += g.hg;
      a.awayGoals += g.ag;
      if (g.hg > g.ag) {
        h.w++;
        h.pts += 3;
        a.l++;
      } else if (g.hg < g.ag) {
        a.w++;
        a.awayWins++;
        a.pts += 3;
        h.l++;
      } else {
        h.d++;
        a.d++;
        h.pts++;
        a.pts++;
      }
    }
  const str = Object.fromEntries(cup.field.map((f) => [f.id, strOf(c, cup, f.id)]));
  return rankTable(Object.values(rows), [], { mode: 'gd', fallback: (x, y) => y.awayGoals - x.awayGoals || y.w - x.w || y.awayWins - x.awayWins || str[y.id] - str[x.id] });
}

function leaguePhaseEnd(c, cup, rng) {
  const table = euroTable(c, cup);
  cup.final = table.map((r) => r.id);
  const me = humanClub(c).id;
  const pos = cup.final.indexOf(me) + 1;
  prize(c, cup, 'share', tr(`Platzierungsprämie Ligaphase (Platz ${pos})`, `League phase ranking bonus (${pos}th)`), 37 - pos);
  if (pos <= 8) prize(c, cup, 'top8', tr('Zuschlag Platz 1–8', 'Bonus for places 1–8'));
  else if (pos <= 16) prize(c, cup, 'top16', tr('Zuschlag Platz 9–16', 'Bonus for places 9–16'));
  if (pos <= 8) {
    prize(c, cup, 'r16', tr('Einzug ins Achtelfinale', 'Reaching the round of 16'));
    cup.log.push(tr(`Ligaphase beendet: Platz ${pos} – direkt im Achtelfinale!`, `League phase over: ${pos}th – straight into the round of 16!`));
  } else if (pos <= 24) {
    prize(c, cup, 'po', tr('Einzug in die K.-o.-Play-offs', 'Reaching the knockout play-offs'));
    cup.log.push(tr(`Ligaphase beendet: Platz ${pos} – weiter in die K.-o.-Play-offs.`, `League phase over: ${pos}th – on to the knockout play-offs.`));
  } else {
    cup.out = true;
    cup.reached = 'lp';
    adjustMood(c, -0.04);
    cup.log.push(tr(`Ligaphase beendet: Platz ${pos} – ausgeschieden.`, `League phase over: ${pos}th – eliminated.`));
  }
  // Play-offs: 9/10 gegen 23/24, 11/12 gegen 21/22, 13/14 gegen 19/20, 15/16 gegen 17/18 (Los innerhalb der Paare).
  const at = (p) => cup.final[p - 1];
  cup.ko.po = [];
  for (let k = 0; k < 4; k++) {
    const seeded = [at(9 + 2 * k), at(10 + 2 * k)];
    const unseeded = rng.chance(0.5) ? [at(23 - 2 * k), at(24 - 2 * k)] : [at(24 - 2 * k), at(23 - 2 * k)];
    seeded.forEach((a, i) => cup.ko.po.push({ a, b: unseeded[i], legs: [], winner: null, path: k }));
  }
  addKoTies(c, cup, 'po', rng);
}

// Achtelfinale: 1/2 gegen die Sieger aus 15/16–17/18, 3/4 gegen 13/14–19/20, 5/6 gegen 11/12–21/22, 7/8 gegen 9/10–23/24.
// Die Reihenfolge ergibt den festen Turnierbaum: 1 und 2 in verschiedenen Hälften.
function drawR16(c, cup, rng) {
  const at = (p) => cup.final[p - 1];
  const poWin = (k) => cup.ko.po.filter((t) => t.path === k).map((t) => t.winner);
  const pairsFor = (seeded, k) => {
    const w = rng.chance(0.5) ? poWin(k) : [...poWin(k)].reverse();
    return seeded.map((a, i) => ({ a, b: w[i], legs: [], winner: null }));
  };
  const [p12, p34, p56, p78] = [pairsFor([at(1), at(2)], 3), pairsFor([at(3), at(4)], 2), pairsFor([at(5), at(6)], 1), pairsFor([at(7), at(8)], 0)];
  // Hälfte A: 1, 8, 4, 5 – Hälfte B: 2, 7, 3, 6.
  cup.ko.r16 = [p12[0], p78[1], p34[1], p56[0], p12[1], p78[0], p34[0], p56[1]];
}

function stageEnd(c, cup, stage, rng) {
  const me = humanClub(c).id;
  const ties = cup.ko[stage];
  const mineTie = ties.find((t) => t.a === me || t.b === me);
  const won = mineTie && mineTie.winner === me;
  if (stage === 'f') {
    cup.winner = ties[0].winner;
    cup.done = true;
    const name = cup.field.find((f) => f.id === cup.winner)?.name ?? '?';
    if (won) {
      prize(c, cup, 'winner', tr('Siegprämie Endspiel', 'Winner\'s bonus'));
      c.trophies = [...(c.trophies ?? []), { name: `${EURO_NAMES[cup.kind]} ${cup.year}`, season: c.season }];
      adjustMood(c, 0.35);
      chronicle(c, tr(`${EURO_NAMES[cup.kind]}-Sieger ${cup.year}! ${humanClub(c).name} gewinnt den Europapokal.`, `${EURO_NAMES[cup.kind]} winners ${cup.year}! ${humanClub(c).name} win the European trophy.`));
      cup.log.push(tr(`EUROPAPOKALSIEGER! Der ${EURO_NAMES[cup.kind]} steht in der Vitrine.`, `EUROPEAN CHAMPIONS! The ${EURO_NAMES[cup.kind]} is in the cabinet.`));
      cup.reached = 'win';
    } else {
      if (mineTie) {
        adjustMood(c, 0.05);
        chronicle(c, tr(`Im Endspiel des ${EURO_NAMES[cup.kind]}s ${cup.year} gegen ${name} verloren.`, `Lost the ${EURO_NAMES[cup.kind]} final ${cup.year} to ${name}.`));
        cup.reached = 'f';
      }
      cup.log.push(tr(`${EURO_NAMES[cup.kind]}-Sieger ${cup.year}: ${name}.`, `${EURO_NAMES[cup.kind]} winners ${cup.year}: ${name}.`));
    }
    cleanupGuests(c, cup);
    return;
  }
  if (mineTie && !won) {
    cup.out = true;
    cup.reached = stage;
    adjustMood(c, -0.03);
    cup.log.push(tr(`${STAGE_NAME[stage]}: ausgeschieden.`, `${STAGE_NAME[stage]}: knocked out.`));
  }
  const next = { po: 'r16', r16: 'qf', qf: 'sf', sf: 'f' }[stage];
  if (stage === 'po') drawR16(c, cup, rng);
  else {
    const w = ties.map((t) => t.winner);
    cup.ko[next] = [];
    for (let i = 0; i + 1 < w.length; i += 2) {
      // Ab dem Viertelfinale ungesetzt: das Los bestimmt, wer zuerst zu Hause spielt.
      const [a, b] = rng.chance(0.5) ? [w[i], w[i + 1]] : [w[i + 1], w[i]];
      cup.ko[next].push({ a, b, legs: [], winner: null });
    }
  }
  if (won) {
    prize(c, cup, next, tr(`Einzug: ${STAGE_NAME[next]}`, `Reached: ${STAGE_NAME[next]}`));
    cup.log.push(tr(`${STAGE_NAME[stage]} überstanden – weiter im ${STAGE_NAME[next]}.`, `${STAGE_NAME[stage]} survived – on to the ${STAGE_NAME[next]}.`));
  }
  addKoTies(c, cup, next, rng);
}

function addKoTies(c, cup, stage, rng) {
  if (cup.out) return;
  const me = humanClub(c).id;
  const t = (cup.ko[stage] ?? []).find((x) => x.a === me || x.b === me);
  if (!t) return;
  if (stage === 'f') addHumanTie(c, cup, { stage, leg: 0, home: t.a, away: t.b, neutral: true }, rng);
  else {
    addHumanTie(c, cup, { stage, leg: 0, home: t.b, away: t.a }, rng);
    addHumanTie(c, cup, { stage, leg: 1, home: t.a, away: t.b }, rng);
  }
}

// --- Prämien -----------------------------------------------------------------------------------------------------
function prize(c, cup, key, text, times = 1) {
  const amount = Math.round((EURO_PRIZES[cup.kind][key] ?? 0) * times);
  if (!amount) return;
  cup.earned = (cup.earned ?? 0) + amount;
  book(c, `${EURO_NAMES[cup.kind]}: ${text}`, amount);
}

function cleanupGuests(c, cup) {
  for (const g of cup.guests) for (const idx of g.squad) if (!c.clubs.some((x) => x.squad.includes(idx))) delete c.players[idx];
}

// --- Wochenablauf und Saisonwechsel ----------------------------------------------------------------------------------
// Zu Wochenbeginn: anmelden (erste Woche) und Termine, deren Woche vorbei ist, ohne uns ausspielen.
export function advanceEuro(c) {
  if (c.superQual?.season === c.season && c.round === 0) startSuper(c);
  const sc = c.pokale?.esc;
  if (sc?.season === c.season && !sc.done && sc.slots[0].week < c.round) playSuper(c, sc, null);
  if (!euroOf(c) && euroEligible(c) && c.round === 0) startEuro(c);
  const cup = euroOf(c);
  if (!cup || cup.done) return;
  let guard = 0;
  while (!cup.done && cup.cursor < cup.slots.length && cup.slots[cup.cursor].week < c.round && guard++ < 40) playSlot(c, cup, cup.cursor);
}

// Saisonende: Rest ausspielen (falls etwas offen ist), Startplatz für die nächste Saison vergeben. Gibt eine Zeile für den Rückblick zurück.
export function euroSeasonEnd(c, { pos, level, rows }) {
  const cup = euroOf(c);
  let note = null;
  if (cup && !cup.done) {
    let guard = 0;
    while (!cup.done && cup.cursor < cup.slots.length && guard++ < 40) playSlot(c, cup, cup.cursor);
  }
  if (cup) {
    const reach = { lp: tr('Aus in der Ligaphase', 'out in the league phase'), po: tr('Aus in den Play-offs', 'out in the play-offs'), r16: tr('Aus im Achtelfinale', 'out in the round of 16'), qf: tr('Aus im Viertelfinale', 'out in the quarter-finals'), sf: tr('Aus im Halbfinale', 'out in the semi-finals'), f: tr('Endspiel verloren', 'lost the final'), win: tr('Sieger', 'winners') }[cup.reached] ?? '';
    note = tr(`${EURO_NAMES[cup.kind]}: ${reach}, Prämien ${fmtMoney(cup.earned)}.`, `${EURO_NAMES[cup.kind]}: ${reach}, prize money ${fmtMoney(cup.earned)}.`);
    c.euroHistory = [...(c.euroHistory ?? []), { season: c.season, kind: cup.kind, reached: cup.reached ?? null, earned: cup.earned, winner: cup.field.find((f) => f.id === cup.winner)?.name ?? null }];
  }
  delete c.euroQual;
  // Supercup zur nächsten Saison: Sieger des obersten oder des zweiten Wettbewerbs (gegen den Sieger des jeweils anderen).
  if (cup?.winner === humanClub(c).id && (cup.kind === 'eu1' || cup.kind === 'eu2')) {
    c.superQual = { season: c.season + 1, from: cup.kind };
    const q = tr(`Zum Saisonstart: ${EURO_NAMES.esc} gegen den Sieger des ${EURO_NAMES[cup.kind === 'eu1' ? 'eu2' : 'eu1']}.`, `At the start of next season: ${EURO_NAMES.esc} against the ${EURO_NAMES[cup.kind === 'eu1' ? 'eu2' : 'eu1']} winners.`);
    note = note ? `${note} ${q}` : q;
  }
  if (level === EURO_LEVEL && EURO_QUAL[pos]) {
    const kind = EURO_QUAL[pos];
    const domestic = Object.fromEntries(EURO_KINDS.map((k) => [k, []]));
    rows.forEach((r, i) => {
      const k = EURO_QUAL[i + 1];
      if (k && !r.club.human) domestic[k].push(r.club.id);
    });
    c.euroQual = { season: c.season + 1, kind, domestic };
    const q = tr(`Platz ${pos}: nächste Saison im ${EURO_NAMES[kind]}.`, `${pos}th place: next season in the ${EURO_NAMES[kind]}.`);
    note = note ? `${note} ${q}` : q;
  }
  return note;
}

// --- Supercup (ROADMAP 13, offen „Supercup", 2026-11-09) -------------------------------------------------------------
// Vorbild: der europäische Supercup – ein Spiel im August zwischen den Siegern der beiden obersten Wettbewerbe, im neutralen Stadion,
// bei Unentschieden direkt Elfmeterschießen. Im Spiel: in der ersten Woche der Saison am Mittwochabend (vor dem ersten Spieltag am
// Sonntag; in echt meist eine Woche vor dem Ligastart – Spielwert). Der Gegner ist der Sieger des anderen Wettbewerbs: ein erfundener
// Verein aus dem Pool des anderen Wettbewerbs; Stärke Mittel + eine Streuung (ein Sieger ist besser als der Schnitt, Spielwert).
export function startSuper(c) {
  const q = c.superQual;
  if (!q || q.season !== c.season || (c.pokale?.esc?.season === c.season)) return null;
  const other = q.from === 'eu1' ? 'eu2' : 'eu1';
  const rng = createRng((c.seed * 173 + c.season * 6113 + 911) >>> 0);
  const me = humanClub(c);
  const top = Math.min(...EURO_TIERS[other]);
  const pool = EURO_POOL.filter((x) => x.tier === top && x.country !== 'ger');
  const x = pool[rng.int(0, pool.length - 1)];
  const [mean, sd] = ((c.strength ?? 1) >= 3 ? EURO_STRENGTH : EURO_STRENGTH_OLD)[other];
  const field = [{ id: me.id, name: me.name, short: me.short, country: 'ger', human: true }, { id: x.id, name: x.name, short: x.short, country: x.country, str: +(mean + sd).toFixed(1) }];
  const cup = { kind: 'esc', euro: true, sc: true, from: q.from, season: c.season, year: yearOf(c), field, guests: [], levels: { [me.id]: EURO_LEVEL }, slots: [{ week: 0, day: 'wed', stage: 'f', leg: 0 }], cursor: 0, ties: [], out: false, winner: null, log: [], done: false, earned: 0 };
  c.pokale ??= {};
  c.pokale.esc = cup;
  const home = rng.chance(0.5) ? me.id : x.id; // „Heimmannschaft" im neutralen Stadion: gelost
  const h = guestFor(c, cup, home, rng);
  const a = guestFor(c, cup, home === me.id ? x.id : me.id, rng);
  cup.ties.push({ kind: 'esc', round: 0, slot: 0, stage: 'f', leg: 0, day: 'wed', home: h, away: a, result: null, pens: null, neutral: true });
  prize(c, cup, 'start', tr('Startgeld', 'Participation fee'));
  cup.log.push(tr(`${EURO_NAMES.esc} ${cup.year} gegen ${x.name} (${countryName(x.country)}), Sieger des ${EURO_NAMES[other]}.`, `${EURO_NAMES.esc} ${cup.year} against ${x.name} (${countryName(x.country)}), ${EURO_NAMES[other]} winners.`));
  return cup;
}

// Ergebnis eintragen (eigenes Spiel) oder ohne uns per Schnellmodell, Sieger, Prämie.
export function playSuper(c, cup, mine) {
  if (cup.done) return;
  const t = cup.ties[0];
  const me = humanClub(c).id;
  const rng = createRng((c.seed * 151 + c.season * 3571 + 4441) >>> 0);
  if (!t.result) {
    const g = quickGame(c, cup, toField(cup, t.home), toField(cup, t.away), rng, true);
    t.result = { home: g.hg, away: g.ag };
    t.quick = true;
  }
  if (t.result.home === t.result.away && !t.pens) t.pens = rng.chance(0.5) ? { home: 5, away: 4 } : { home: 4, away: 5 };
  const winner = t.result.home + (t.pens?.home ?? 0) * 0.01 > t.result.away + (t.pens?.away ?? 0) * 0.01 ? t.home : t.away;
  cup.winner = toField(cup, winner);
  cup.reached = cup.winner === me ? 'win' : 'f';
  cup.done = true;
  cup.cursor = 1;
  if (cup.winner === me) {
    prize(c, cup, 'winner', tr('Siegprämie', 'Winner bonus'));
    c.trophies = [...(c.trophies ?? []), { name: `${EURO_NAMES.esc} ${cup.year}`, season: c.season }];
  }
  logTie(c, cup, t);
  c.superHistory = [...(c.superHistory ?? []), { season: c.season, won: cup.winner === me, opp: cup.field[1].name }];
  delete c.superQual;
  cleanupGuests(c, cup);
}

const fmtMoney = (v) => (v >= 1e6 ? tr(`${(v / 1e6).toFixed(1).replace('.', ',')} Mio. €`, `€${(v / 1e6).toFixed(1)}m`) : tr(`${Math.round(v / 1000)} Tsd. €`, `€${Math.round(v / 1000)}k`));
export const euroMoney = fmtMoney;
export const countryName = (id) => EURO_COUNTRY[id] ?? id;
export const euroClub = (c, cup, id) => clubById(c, id) ?? cup.guests.find((g) => g.id === id) ?? cup.field.find((f) => f.id === id);
