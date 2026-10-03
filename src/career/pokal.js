// Pokale im K.-o.-System, unter der Woche zwischen den Ligaspieltagen.
// Kreispokal: ab der Kreisklasse C (Stufe 2), 16 Vereine aus allen Kreisligen. Bezirkspokal: in der
// Bezirksliga – oder für den Kreispokalsieger der Vorsaison ab Kreisliga A –, 8 Vereine.
// Regeln wie in vielen Kreisen (z. B. Durchführungsbestimmungen Kreispokal Pforzheim 2025/26, FVN):
// Heimrecht hat der klassentiefere Verein, sonst der zuerst gezogene; steht es nach der regulären
// Spielzeit unentschieden, folgt direkt Elfmeterschießen (manche Kreise spielen erst Verlängerung).
// Gespielt wird im Format des Gastgebers: Wer als Bezirksligist zum Kreisklassen-Verein muss, spielt 7 gegen 7.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { createMatch, matchDuration } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { LEAGUES } from './clubs.js';
import { humanClub, playerOf, resolveKitClash, seasonOver, squadPicker, SQUAD_SHAPES, takenIndices, teamForMatch } from './career.js';
import { adjustMood } from './events.js';
import { afterMatchFitness } from './fitness.js';
import { matchFinances } from './finances.js';
import { chronicle, yearOf } from './sagas.js';
import { applyWeather } from './weather.js';

export const POKALE = {
  kreis: { name: tr('Kreispokal', 'District Cup'), size: 16, slots: [0.2, 0.4, 0.62, 0.85] },
  bezirk: { name: tr('Bezirkspokal', 'County Cup'), size: 8, slots: [0.3, 0.55, 0.78] },
};
const KINDS = ['kreis', 'bezirk'];

// Gegner aus der Landesliga (nur im Bezirkspokal): eine Stufe über der Bezirksliga.
const LANDESLIGA = [
  { id: 'll-westfalia', name: tr('SC Westfalia Kanalstadt', 'Canal Town Westfield'), short: tr('SCW', 'CTW'), kit: { shirt: 0xf2efe6, shorts: 0x1c1c1c, socks: 0xf2efe6, pattern: 'uni' }, keeperKit: { shirt: 0x3fa05a, shorts: 0x1c1c1c, socks: 0x3fa05a }, tiers: { ok: 0.15, gut: 0.4, stark: 0.3, dorfstar: 0.12, superstar: 0.03 } },
  { id: 'll-viktoria', name: tr('Viktoria Hafenstadt 1911', 'Harbour City Victoria 1911'), short: tr('VHS', 'HCV'), kit: { shirt: 0x6b2a8a, shorts: 0xf2efe6, socks: 0x6b2a8a, pattern: 'uni' }, keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 }, tiers: { ok: 0.18, gut: 0.4, stark: 0.28, dorfstar: 0.11, superstar: 0.03 } },
  { id: 'll-rotweiss', name: tr('Rot-Weiß Oberkanal', 'Upper Canal Red & White'), short: tr('RWO', 'UCR'), kit: { shirt: 0xc0392b, shorts: 0xf2efe6, socks: 0xc0392b, pattern: 'uni' }, keeperKit: { shirt: 0x1f3a6b, shorts: 0x1c1c1c, socks: 0x1f3a6b }, tiers: { ok: 0.2, gut: 0.42, stark: 0.27, dorfstar: 0.09, superstar: 0.02 } },
];

const LEVEL_VENUE = (level) => LEAGUES[Math.min(5, Math.max(2, level))].humanVenue;
const fresh = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 });

export const pokalOf = (c, kind) => (c.pokale?.[kind]?.season === c.season ? c.pokale[kind] : null);
export const pokalClub = (c, cup, id) => c.clubs.find((x) => x.id === id) ?? cup.guests.find((g) => g.id === id);

// Wer darf diese Saison in welchen Pokal?
export function pokalEligible(c, kind) {
  const level = c.level ?? 1;
  if (kind === 'kreis') return level >= 2;
  return level >= 5 || (level >= 4 && c.pokalQual === c.season);
}

// Spieltage, vor denen eine Runde unter der Woche steigt. Nicht in der ersten Woche, nicht in der
// Winterpause (Hallenturnier), nicht zwei Pokale in derselben Woche.
export function pokalRounds(c, kind) {
  const n = c.fixtures.length;
  const winter = Math.floor(n / 2);
  const taken = new Set([winter]);
  if (kind === 'bezirk') for (const r of pokalRounds(c, 'kreis')) taken.add(r);
  return POKALE[kind].slots.map((f) => {
    let r = Math.min(n - 1, Math.max(1, Math.round(n * f)));
    while (taken.has(r) && r < n - 1) r++;
    while (taken.has(r) && r > 1) r--;
    taken.add(r);
    return r;
  }).slice(0, roundsFor(kind));
}
const roundsFor = (kind) => Math.log2(POKALE[kind].size);

// Teilnehmer und Auslosung der ersten Runde (zu Saisonbeginn).
export function startPokal(c, kind) {
  if (pokalOf(c, kind) || !pokalEligible(c, kind)) return pokalOf(c, kind);
  const cfg = POKALE[kind];
  const level = c.level ?? 1;
  const rng = createRng((c.seed * 53 + c.season * 389 + (kind === 'kreis' ? 11 : 23)) >>> 0);
  const used = takenIndices(c);
  const pick = squadPicker(rng, used);
  const own = c.clubs.map((x) => ({ id: x.id, level }));
  // Auffüllen aus den anderen Ligen des Kreises (Kreispokal) bzw. aus Bezirks- und Landesliga.
  const pool = kind === 'kreis'
    ? [2, 3, 4, 5].filter((l) => l !== level).flatMap((l) => LEAGUES[l].clubs.map((d) => ({ d, level: l })))
    : [...(level === 5 ? [] : LEAGUES[5].clubs.map((d) => ({ d, level: 5 }))), ...LANDESLIGA.map((d) => ({ d, level: 6 }))];
  const want = cfg.size - (kind === 'kreis' || level === 5 ? own.length : 1);
  const shuffled = [...pool].sort(() => rng.next() - 0.5).slice(0, Math.max(0, want));
  const guests = shuffled.map(({ d, level: l }) => {
    const squad = pick(d.tiers, SQUAD_SHAPES[LEAGUES[Math.min(5, l)].squadShape]);
    for (const idx of squad) c.players[idx] ??= fresh();
    return { ...d, id: `pokal-${kind}-${d.id}`, human: false, venue: LEVEL_VENUE(l), squad, level: l };
  });
  // Bezirkspokal aus der Kreisliga A: nur der eigene Verein kommt aus der Liga.
  const entrants = [...(kind === 'kreis' || level === 5 ? own : [{ id: humanClub(c).id, level }]), ...guests.map((g) => ({ id: g.id, level: g.level }))];
  c.pokale ??= {};
  c.pokale[kind] = { kind, season: c.season, year: yearOf(c), guests, levels: Object.fromEntries(entrants.map((e) => [e.id, e.level])), rounds: pokalRounds(c, kind), round: 0, ties: [], out: false, winner: null, log: [], done: false };
  draw(c, kind, entrants.map((e) => e.id));
  return c.pokale[kind];
}

// Auslosung: Paare in gezogener Reihenfolge; Heimrecht beim klassentieferen, sonst beim zuerst gezogenen.
function draw(c, kind, ids) {
  const cup = c.pokale[kind];
  const rng = createRng((c.seed * 71 + c.season * 997 + cup.round * 131 + (kind === 'kreis' ? 3 : 5)) >>> 0);
  const order = [...ids].sort(() => rng.next() - 0.5);
  for (let i = 0; i + 1 < order.length; i += 2) {
    const [a, b] = [order[i], order[i + 1]];
    const lower = cup.levels[b] < cup.levels[a];
    cup.ties.push({ kind, round: cup.round, home: lower ? b : a, away: lower ? a : b, result: null, pens: null });
  }
}

export const roundName = (cup, r = cup.round) => {
  const left = POKALE[cup.kind].size / 2 ** r;
  return left === 2 ? tr('Finale', 'Final') : left === 4 ? tr('Halbfinale', 'Semi-final') : left === 8 ? tr('Viertelfinale', 'Quarter-final') : tr(`${r + 1}. Runde`, `Round ${r + 1}`);
};
export const roundTies = (cup, r = cup.round) => cup.ties.filter((t) => t.round === r);
export const tieWinner = (t) => (t.result.home + (t.pens?.home ?? 0) * 0.01 > t.result.away + (t.pens?.away ?? 0) * 0.01 ? t.home : t.away);

// Das eigene Pokalspiel dieser Woche (vor dem Ligaspiel), sonst null.
export function humanTie(c, kind) {
  const cup = pokalOf(c, kind);
  if (!cup || cup.done || cup.out || seasonOver(c) || cup.rounds[cup.round] !== c.round) return null;
  const me = humanClub(c).id;
  return roundTies(cup).find((t) => !t.result && (t.home === me || t.away === me)) ?? null;
}
export const pokalDue = (c) => KINDS.map((k) => (humanTie(c, k) ? k : null)).find(Boolean) ?? null;

export function preparePokalMatch(c, kind, tie, { human = false, duration } = {}) {
  const cup = pokalOf(c, kind);
  const home = pokalClub(c, cup, tie.home);
  const away = pokalClub(c, cup, tie.away);
  const homeLevel = cup.levels[tie.home];
  const rng = createRng((c.seed * 433 + c.season * 59 + cup.ties.indexOf(tie) * 7919 + (kind === 'kreis' ? 1 : 2)) >>> 0);
  const base = PITCHES[home.human ? home.venue : LEVEL_VENUE(homeLevel)] ?? PITCHES.rasenplatz;
  const format = LEAGUES[Math.min(5, Math.max(2, homeLevel))].format ?? base.format;
  const pitch = applyWeather({ ...base, format, referee: true }, c.week?.weather);
  const avail = (club) => (club.human ? c.week?.availability ?? Object.fromEntries(club.squad.map((i) => [i, 'yes'])) : Object.fromEntries(club.squad.map((i) => [i, (c.players[i]?.injuryWeeks ?? 0) > 0 || rng.chance(0.12) ? 'no' : 'yes'])));
  const teamHome = teamForMatch(c, home, format, avail(home), rng);
  const teamAway = teamForMatch(c, resolveKitClash(home, away), format, avail(away), rng);
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration: duration ?? matchDuration(pitch), incidents: true });
  match.knockout = true; // unentschieden → Elfmeterschießen
  match.midweek = true; // Mittwochabend: Flutlicht (main.js)
  match.crowd = Math.round(30 + 25 * Math.max(cup.levels[tie.home], cup.levels[tie.away]) + rng.int(0, 30)); // Pokal zieht: der Große kommt
  return { match, humanIsAway, pitch, home, away, tie, kind };
}

// Elfmeterschießen ohne Live-Szene: fünf pro Team, dann Sudden Death.
function penalties(teams, rng) {
  const shooters = (tm) => tm.players.filter((p) => p.position !== 'gk').sort((a, b) => b.attrs.shooting - a.attrs.shooting);
  const keeper = (tm) => tm.players.find((p) => p.position === 'gk') ?? tm.players[0];
  const score = [0, 0];
  const take = (ti, n) => {
    const list = shooters(teams[ti]);
    const k = keeper(teams[1 - ti]);
    if (rng.chance(Math.max(0.45, Math.min(0.92, 0.72 + (list[n % list.length].attrs.shooting - k.attrs.keeping) * 0.4)))) score[ti]++;
  };
  for (let n = 0; n < 5; n++) [0, 1].forEach((ti) => take(ti, n));
  for (let n = 5; score[0] === score[1] && n < 30; n++) [0, 1].forEach((ti) => take(ti, n));
  if (score[0] === score[1]) score[rng.chance(0.5) ? 0 : 1]++;
  return score;
}

// Ergebnis des selbst gespielten (oder Liveticker-)Pokalspiels eintragen.
export function recordPokalResult(c, prepared) {
  const { tie, kind, match: m } = prepared;
  const cup = pokalOf(c, kind);
  for (const p of [...m.players, ...m.bench.flat(), ...(m.sentOff ?? [])]) {
    const st = m.stats.players[p.id];
    if (p.poolIndex != null && st?.seconds > 0) afterMatchFitness(c, p.poolIndex, st.seconds / (m.duration || st.seconds)); // Doppelbelastung: bis Sonntag keine Erholung (die kommt erst zum Wochenwechsel)
  }
  const [s0, s1] = m.score;
  tie.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  if (tie.result.home === tie.result.away) {
    const so = m.shootout;
    const pens = so?.done ? shootoutScore(so) : penalties(m.teams, createRng((c.seed * 7 + cup.ties.indexOf(tie) * 131 + 9) >>> 0));
    tie.pens = prepared.humanIsAway ? { home: pens[1], away: pens[0] } : { home: pens[0], away: pens[1] };
  }
  matchFinances(c, tie, prepared, cup.levels[tie.home]); // Heimspiel: Theke, Schiri, Platzmiete; auswärts: Sprit
  logTie(c, cup, tie);
  afterHumanTie(c, kind);
}

function logTie(c, cup, tie) {
  const name = (id) => pokalClub(c, cup, id).short;
  cup.log.push(`${roundName(cup, tie.round)}: ${name(tie.home)} ${tie.result.home}:${tie.result.away}${tie.pens ? ` (${tie.pens.home}:${tie.pens.away} ${tr('i. E.', 'on pens')})` : ''} ${name(tie.away)}`);
}

// --- Schnelles Ergebnis für Spiele ohne den eigenen Verein ---------------------------------------
// Eine volle Simulation kostet 2–3 s je Spiel (gemessen), eine Pokalrunde mit 7 Fremdspielen wäre auf
// dem Handy zu langsam. Deshalb: Tore als Poisson-Zufall, Erwartung aus der Stärke der besten Spieler.
// Die Konstanten sind an der echten Engine gemessen (scripts/pokal-calibrate.mjs).
// Gemessen (120 Spiele, Okt. 2026): 1,40 Tore je Team; Heimsiege Engine 20/38/78 %, Modell 21/49/71 %
// bei Stärkeunterschied < −5 / −5…5 / > 5.
export const QUICK = { base: 1.4, perPoint: 0.03, home: 0.3 };
const strength = (c, club, n) => {
  const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, n);
  return r.reduce((s, x) => s + x, 0) / Math.max(1, r.length);
};
// Stärke eines Teilnehmers im Format des Gastgebers dieser Paarung.
export const teamStrength = (c, cup, id, tie) => strength(c, pokalClub(c, cup, id), LEAGUES[Math.min(5, Math.max(2, cup.levels[tie.home]))].format ?? 7);
const poisson = (rng, l) => {
  let k = 0;
  let p = Math.exp(-l);
  let s = p;
  const u = rng.next();
  while (u > s && k < 15) {
    k++;
    p *= l / k;
    s += p;
  }
  return k;
};
export function quickTie(c, cup, tie, rng) {
  const d = teamStrength(c, cup, tie.home, tie) - teamStrength(c, cup, tie.away, tie);
  const lh = QUICK.base * Math.exp(QUICK.perPoint * d + QUICK.home);
  const la = QUICK.base * Math.exp(-QUICK.perPoint * d);
  tie.result = { home: poisson(rng, lh), away: poisson(rng, la) };
  if (tie.result.home === tie.result.away) {
    tie.pens = rng.chance(0.5) ? { home: 5, away: 4 } : { home: 4, away: 5 }; // ohne Szene: Glückssache
  }
  tie.quick = true;
}

// Nach dem eigenen Spiel: die anderen Spiele der Runde, dann ggf. nächste Auslosung.
function afterHumanTie(c, kind) {
  const cup = pokalOf(c, kind);
  const me = humanClub(c).id;
  const mine = roundTies(cup).find((t) => t.home === me || t.away === me);
  if (mine?.result && tieWinner(mine) !== me) {
    cup.out = true;
    adjustMood(c, cup.levels[mine.home] !== cup.levels[mine.away] && cup.levels[tieWinner(mine)] < (c.level ?? 1) ? -0.08 : -0.03);
  }
  finishRound(c, kind);
}

function finishRound(c, kind) {
  const cup = pokalOf(c, kind);
  const rng = createRng((c.seed * 29 + c.season * 457 + cup.round * 61 + (kind === 'kreis' ? 7 : 13)) >>> 0);
  for (const t of roundTies(cup)) if (!t.result) quickTie(c, cup, t, rng);
  const me = humanClub(c).id;
  for (const t of roundTies(cup)) if (t.quick && (t.home === me || t.away === me)) logTie(c, cup, t); // ohne dich gespielt
  const winners = roundTies(cup).map(tieWinner);
  if (!winners.includes(me)) cup.out = true;
  if (winners.length === 1) return finishPokal(c, kind, winners[0]);
  cup.round++;
  draw(c, kind, winners);
}

// Zu Wochenbeginn (startWeek): anmelden, und Runden, deren Woche vorbei ist, ohne uns ausspielen.
export function advancePokale(c) {
  for (const kind of KINDS) {
    // Anmelden bis zur ersten Runde (alte Spielstände mitten in der Saison steigen erst nächste Saison ein).
    if (!pokalOf(c, kind) && pokalEligible(c, kind) && !seasonOver(c) && c.round <= pokalRounds(c, kind)[0]) startPokal(c, kind);
    const cup = pokalOf(c, kind);
    if (!cup || cup.done) continue;
    let guard = 0;
    while (!cup.done && cup.rounds[cup.round] < c.round && guard++ < 6) finishRound(c, kind);
  }
}

function finishPokal(c, kind, winner) {
  const cup = pokalOf(c, kind);
  const cfg = POKALE[kind];
  cup.winner = winner;
  cup.done = true;
  const me = humanClub(c).id;
  const final = roundTies(cup).at(-1);
  const name = pokalClub(c, cup, winner).name;
  if (winner === me) {
    const opp = pokalClub(c, cup, final.home === me ? final.away : final.home).name;
    c.trophies = [...(c.trophies ?? []), { name: `${cfg.name} ${cup.year}`, season: c.season }];
    adjustMood(c, 0.2);
    chronicle(c, tr(`${cfg.name}sieger ${cup.year}! Finale gegen ${opp}.`, `${cfg.name} winners ${cup.year}! Final against ${opp}.`));
    cup.log.push(tr(`POKALSIEGER! Der ${cfg.name} steht in der Vitrine.`, `CUP WINNERS! The ${cfg.name} is in the cabinet.`));
    if (kind === 'kreis') {
      c.pokalQual = c.season + 1; // nächste Saison im Bezirkspokal (ab Kreisliga A)
      cup.log.push(tr('Als Kreispokalsieger seid ihr nächste Saison im Bezirkspokal dabei – wenn ihr dann mindestens in der Kreisliga A spielt.', 'As District Cup winners you enter next season\'s County Cup – if you are in the Premier Division or above by then.'));
    }
  } else if (final.home === me || final.away === me) {
    adjustMood(c, 0.04);
    chronicle(c, tr(`Im Finale des ${cfg.name}s ${cup.year} gegen ${name} verloren.`, `Lost the ${cfg.name} final ${cup.year} to ${name}.`));
    cup.log.push(tr(`Finale verloren. ${cfg.name}sieger: ${name}.`, `Lost the final. ${cfg.name} winners: ${name}.`));
  } else cup.log.push(tr(`${cfg.name}sieger: ${name}.`, `${cfg.name} winners: ${name}.`));
  // Gäste verlassen den Spielstand wieder.
  for (const g of cup.guests) for (const idx of g.squad) if (!c.clubs.some((x) => x.squad.includes(idx))) delete c.players[idx];
}
