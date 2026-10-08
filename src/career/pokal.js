// Pokale im K.-o.-System, unter der Woche zwischen den Ligaspieltagen.
// Kreispokal: ab der Kreisklasse C (Stufe 2), 16 Vereine aus allen Kreisligen. Bezirkspokal: in der
// Bezirksliga – oder für den Kreispokalsieger der Vorsaison ab Kreisliga A –, 8 Vereine.
// Landespokal: für den Bezirkspokalsieger der Vorsaison (ab Kreisliga A), 8 Vereine mit Landes- und Oberligisten.
// Überregionaler Pokal (BUND_NAME): für den Landespokalsieger der Vorsaison. Für Amateure endet er nach
// Runde 1 – dem Heimspiel gegen einen fiktiven Profiverein (Begründung bei POKALE.bund).
// Regeln wie in vielen Kreisen (z. B. Durchführungsbestimmungen Kreispokal Pforzheim 2025/26, FVN):
// Heimrecht hat der klassentiefere Verein, sonst der zuerst gezogene; steht es nach der regulären
// Spielzeit unentschieden, folgt standardmäßig direkt Elfmeterschießen (manche Kreise spielen erst
// Verlängerung) – MATCH.pokalExtra schaltet auf Verlängerung (ein Drittel der Spielzeit), dann Elfmeterschießen.
// Gespielt wird im Format des Gastgebers: Wer als Bezirksligist zum Kreisklassen-Verein muss, spielt 7 gegen 7.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { createMatch, EXTRA_SHARE, MATCH, matchDuration } from '../sim/match.js';
import { BUND_PITCHES, PITCHES } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { LEAGUES } from './clubs.js';
import { humanClub, playerOf, resolveKitClash, seasonOver, squadPicker, SQUAD_SHAPES, takenIndices, teamForMatch } from './career.js';
import { isCoach } from './personal.js';
import { adjustMood } from './events.js';
import { BUND_AWAY, BUND_ERST, BUND_NAME, BUND_PRIZE, BUND_PRIZE_WINNER, BUND_ROUND_NAMES, BUND_SPONSOR, BUND_TEXT, BUND_VENUES, OBERLIGA, PROFI_ATTRS, PROFI_KLASSEN, PROFIS } from './bundespokal.js';
import { afterMatchFitness } from './fitness.js';
import { book, homeUnit, matchFinances } from './finances.js';
import { chronicle, yearOf } from './sagas.js';
import { adjustRel, shirtSponsor } from './sponsors.js';
import { applyWeather } from './weather.js';

// Zufallssalze je Pokal (kreis/bezirk wie vor Einführung der übrigen Pokale, damit alte Auslosungen gleich bleiben):
// [Teilnehmer, Auslosung, Spiel, Rundenabschluss].
const SALT = { kreis: [11, 3, 1, 7], bezirk: [23, 5, 2, 13], land: [37, 17, 3, 19], bund: [41, 19, 4, 23] };
// Bundespokal – Entscheidung zur Länge: Für Amateure endet er nach Runde 1. Runde 2 wäre wieder ein Profi
// (in der Engine mit < 10 % Siegchance, siehe Messung), die Fortsetzung bräuchte eine Profiliga-Simulation
// mit Spielplan, Kader und Wirtschaft der übrigen Vereine, die es hier nicht gibt, und die Woche würde mit
// bis zu 4 Pokalen überfüllt (bei 6er-Liga hat die Saison nur 8 freie Wochen). Der Sieg über den Profi ist der
// Höhepunkt: Der Verein „zieht in die zweite Runde ein" (Prämie des Hauptsponsors), das Ausscheiden dort
// wird nicht gespielt.
export const POKALE = {
  kreis: { name: tr('Kreispokal', 'District Cup'), size: 16, slots: [0.2, 0.4, 0.62, 0.85] },
  bezirk: { name: tr('Bezirkspokal', 'County Cup'), size: 8, slots: [0.3, 0.55, 0.78] },
  land: { name: tr('Landespokal', 'State Cup'), size: 8, slots: [0.35, 0.58, 0.8] },
  bund: { name: BUND_NAME, size: 64, rounds: 6, slots: [0.08, 0.22, 0.38, 0.54, 0.7, 0.88], saturday: true },
};
const KINDS = ['kreis', 'bezirk', 'land', 'bund'];
export const POKAL_KINDS = KINDS;
// Wann wird gespielt? Pokale unter der Woche (Flutlicht), der überregionale Pokal am Samstag vor dem Ligaspieltag.
export const pokalWhen = (kind) => (POKALE[kind].saturday ? tr('Samstag, 15:30 Uhr', 'Saturday, 3:30pm') : tr('Mittwoch, 19:30 Uhr', 'Wednesday, 7:30pm'));

// Prämie des Hauptsponsors (Trikotsponsor) für Pokalerfolge, als Vielfaches seines Saisonziel-Bonus (s.bonus).
// Herleitung: Der Bonus (makeOffer in sponsors.js: 40–80 € × Liga-Maßstab 1…6) ist das, was der Sponsor für ein
// erfülltes Saisonziel zahlt – also für eine ganze erfolgreiche Saison. Ein Pokalsieg ist ein einzelner, seltenerer
// Erfolg: Kreispokal (4 Siege nötig) ≈ ein Saisonziel (×1), Bezirkspokal ×1,5, Landespokal ×2. Der Einzug des
// Amateurs in die zweite Runde des überregionalen Pokals (Sieg über einen Profi, Chance gemessen unter 10 %) ist
// das Seltenste: ×3. So wächst die Prämie mit der Liga wie die übrigen Sponsorenzahlungen und bleibt immer in
// derselben Größenordnung wie das, was der Vertrag sonst hergibt (kein fester Eurobetrag aus der Luft).
export const PRAEMIE = { kreis: 1, bezirk: 1.5, land: 2, bund: 3 };
export function sponsorPraemie(c, kind, mult = PRAEMIE[kind]) {
  const s = shirtSponsor(c) ?? [...(c.sponsors ?? [])].sort((a, b) => b.weekly - a.weekly)[0] ?? null;
  return s ? { sponsor: s, amount: Math.round(s.bonus * mult) } : null;
}

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
  if (kind === 'land') return level >= 4 && c.landQual === c.season; // Bezirkspokalsieger der Vorsaison
  if (kind === 'bund') return c.bundQual === c.season; // Landespokalsieger der Vorsaison
  return level >= 5 || (level >= 4 && c.pokalQual === c.season);
}

// Spieltage, vor denen eine Runde unter der Woche steigt. Nicht in der ersten Woche, nicht in der
// Winterpause (Hallenturnier), nicht zwei Pokale in derselben Woche.
export function pokalRounds(c, kind) {
  const n = c.fixtures.length;
  const winter = Math.floor(n / 2);
  const taken = new Set([winter]);
  if (kind !== 'bund') for (const other of KINDS.slice(0, KINDS.indexOf(kind))) if (other !== 'bund') for (const r of pokalRounds(c, other)) taken.add(r); // der überregionale Pokal läuft samstags, die anderen mittwochs
  return POKALE[kind].slots.map((f) => {
    const target = Math.min(n - 1, Math.max(1, Math.round(n * f)));
    let r = target;
    if (kind === 'land') {
      // Die dritte Pokalart sucht die nächste freie Woche in beide Richtungen (sonst springt sie bei vollem Kalender an den Saisonrand).
      for (let d = 1; taken.has(r) && d < n; d++) r = [target + d, target - d].find((x) => x >= 1 && x <= n - 1 && !taken.has(x)) ?? r;
    } else {
      while (taken.has(r) && r < n - 1) r++;
      while (taken.has(r) && r > 1) r--;
    }
    if (taken.has(r)) r = target; // alle Wochen belegt (kurze Saison, mehrere Pokale): zwei Pokale in einer Woche
    taken.add(r);
    return r;
  }).slice(0, roundsFor(kind)).sort((x, y) => x - y);
}
const roundsFor = (kind) => POKALE[kind].rounds ?? Math.log2(POKALE[kind].size);

// Teilnehmer und Auslosung der ersten Runde (zu Saisonbeginn).
export function startPokal(c, kind) {
  if (pokalOf(c, kind) || !pokalEligible(c, kind)) return pokalOf(c, kind);
  const cfg = POKALE[kind];
  const level = c.level ?? 1;
  const rng = createRng((c.seed * 53 + c.season * 389 + SALT[kind][0]) >>> 0);
  const used = takenIndices(c);
  const pick = squadPicker(rng, used);
  if (kind === 'bund') {
    c.pokale ??= {};
    c.pokale.bund = { kind, season: c.season, year: yearOf(c), guests: [], levels: { [humanClub(c).id]: level }, rounds: pokalRounds(c, kind), round: 0, ties: [], out: false, winner: null, log: [], done: false };
    bundDraw(c, c.pokale.bund);
    return c.pokale.bund;
  }
  const own = c.clubs.map((x) => ({ id: x.id, level }));
  // Auffüllen aus den anderen Ligen des Kreises (Kreispokal) bzw. aus Bezirks- und Landesliga.
  const everyone = kind === 'kreis' || (kind === 'bezirk' && level === 5);
  let pool;
  if (kind === 'kreis') pool = [2, 3, 4, 5].filter((l) => l !== level).flatMap((l) => LEAGUES[l].clubs.map((d) => ({ d, level: l })));
  else if (kind === 'bezirk') pool = [...(level === 5 ? [] : LEAGUES[5].clubs.map((d) => ({ d, level: 5 }))), ...LANDESLIGA.map((d) => ({ d, level: 6 }))];
  else if (kind === 'land') pool = [...LANDESLIGA.map((d) => ({ d, level: 6 })), ...OBERLIGA.map((d) => ({ d, level: 7 }))];
  else pool = [];
  const want = cfg.size - (everyone ? own.length : 1);
  const shuffled = [...pool].sort(() => rng.next() - 0.5).slice(0, Math.max(0, want));
  const guests = shuffled.map(({ d, level: l }) => {
    const squad = pick(d.tiers, SQUAD_SHAPES[LEAGUES[Math.min(5, l)].squadShape]);
    for (const idx of squad) c.players[idx] ??= fresh();
    return { ...d, id: `pokal-${kind}-${d.id}`, human: false, venue: LEVEL_VENUE(l), squad, level: l };
  });
  // Bezirkspokal aus der Kreisliga A (und Landes-/überregionaler Pokal): nur der eigene Verein kommt aus der Liga.
  const entrants = [...(everyone ? own : [{ id: humanClub(c).id, level }]), ...guests.map((g) => ({ id: g.id, level: g.level }))];
  c.pokale ??= {};
  c.pokale[kind] = { kind, season: c.season, year: yearOf(c), guests, levels: Object.fromEntries(entrants.map((e) => [e.id, e.level])), rounds: pokalRounds(c, kind), round: 0, ties: [], out: false, winner: null, log: [], done: false };
  draw(c, kind, entrants.map((e) => e.id));
  return c.pokale[kind];
}

// Überregionaler Pokal: pro Runde ein neuer Profi (Zweit- oder Erstligist, siehe BUND_ERST), Runde 1 immer zu Hause beim
// Amateur; später kann das Los das Auswärtsspiel im großen Stadion des Profis bringen (BUND_AWAY).
export function bundDraw(c, cup) {
  const r = cup.round;
  const me = humanClub(c).id;
  const rng = createRng((c.seed * 61 + c.season * 443 + r * 89 + SALT.bund[0]) >>> 0);
  const klass = PROFI_KLASSEN[rng.chance(BUND_ERST[r]) ? 'erst' : 'zweit'];
  const free = PROFIS.filter((p) => !cup.guests.some((g) => g.id === `pokal-bund-${p.id}`));
  const def = { ...rng.pick(free), tiers: klass.tiers };
  const squad = squadPicker(rng, takenIndices(c))(def.tiers, SQUAD_SHAPES.xxl);
  for (const idx of squad) c.players[idx] = { ...fresh(), delta: Object.fromEntries(PROFI_ATTRS.map((k) => [k, klass.boost])) };
  const guest = { ...def, id: `pokal-bund-${def.id}`, human: false, venue: 'grossfeld', squad, level: klass.level, klass: klass === PROFI_KLASSEN.erst ? 'erst' : 'zweit' };
  cup.guests.push(guest);
  cup.levels[guest.id] = guest.level;
  const away = r > 0 && rng.chance(BUND_AWAY);
  cup.ties.push({ kind: 'bund', round: r, home: away ? guest.id : me, away: away ? me : guest.id, result: null, pens: null, venue: away ? 'stadium' : null });
}

// Auslosung: Paare in gezogener Reihenfolge; Heimrecht beim klassentieferen, sonst beim zuerst gezogenen.
function draw(c, kind, ids) {
  const cup = c.pokale[kind];
  const rng = createRng((c.seed * 71 + c.season * 997 + cup.round * 131 + SALT[kind][1]) >>> 0);
  const order = [...ids].sort(() => rng.next() - 0.5);
  for (let i = 0; i + 1 < order.length; i += 2) {
    const [a, b] = [order[i], order[i + 1]];
    const lower = cup.levels[b] < cup.levels[a];
    cup.ties.push({ kind, round: cup.round, home: lower ? b : a, away: lower ? a : b, result: null, pens: null });
  }
}

export const roundName = (cup, r = cup.round) => {
  if (cup.kind === 'bund') return BUND_ROUND_NAMES()[r];
  const left = POKALE[cup.kind].size / 2 ** r;
  return left === 2 ? tr('Finale', 'Final') : left === 4 ? tr('Halbfinale', 'Semi-final') : left === 8 ? tr('Viertelfinale', 'Quarter-final') : tr(`${r + 1}. Runde`, `Round ${r + 1}`);
};
export const roundTies = (cup, r = cup.round) => cup.ties.filter((t) => t.round === r);
export const tieOnPens = (t) => (t.pens ? ` (${t.pens.home}:${t.pens.away} ${tr('i. E.', 'on pens')})` : '');
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
  const rng = createRng((c.seed * 433 + c.season * 59 + cup.ties.indexOf(tie) * 7919 + SALT[kind][2]) >>> 0);
  // Gegen den Profi: Großfeld, 11 gegen 11 – der Verband nimmt nichts anderes ab, auch wenn die Liga kleiner spielt.
  // Spielort der Heimspiele (Entscheidung per Ereignis, Standard eigener Platz); beim Profi immer das große Stadion.
  const bundVenue = kind === 'bund' ? (home.human ? tie.venue ?? 'own' : 'stadium') : null;
  const base = kind === 'bund' ? (bundVenue === 'own' ? PITCHES.grossfeld : BUND_PITCHES[BUND_VENUES[bundVenue].pitch]) : PITCHES[home.human ? home.venue : LEVEL_VENUE(homeLevel)] ?? PITCHES.rasenplatz;
  const format = kind === 'bund' ? 11 : LEAGUES[Math.min(5, Math.max(2, homeLevel))].format ?? base.format;
  const pitch = applyWeather({ ...base, format, referee: true }, c.week?.weather);
  const avail = (club) => (club.human ? c.week?.availability ?? Object.fromEntries(club.squad.map((i) => [i, 'yes'])) : Object.fromEntries(club.squad.map((i) => [i, (c.players[i]?.injuryWeeks ?? 0) > 0 || rng.chance(0.12) ? 'no' : 'yes'])));
  const teamHome = teamForMatch(c, home, format, avail(home), rng);
  const teamAway = teamForMatch(c, resolveKitClash(home, away), format, avail(away), rng);
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration: duration ?? matchDuration(pitch), incidents: true });
  match.knockout = true; // unentschieden → (Verlängerung und) Elfmeterschießen
  match.extraTime = MATCH.pokalExtra; // Einstellung: erst Verlängerung (ein Drittel der Spielzeit)?
  match.midweek = !POKALE[kind].saturday; // Mittwochabend: Flutlicht (main.js); der überregionale Pokal läuft samstags
  match.crowd = Math.round(30 + 25 * Math.max(cup.levels[tie.home], cup.levels[tie.away]) + rng.int(0, 30)); // Pokal zieht: der Große kommt
  if (kind === 'bund') {
    const bv = BUND_VENUES[bundVenue];
    match.crowd = Math.min(bv.cap, match.crowd * bv.mul);
    match.homeTeam = humanIsAway ? 1 : 0;
  }
  return { match, humanIsAway, pitch, home, away, tie, kind, bund: kind === 'bund' ? { venue: bundVenue } : null };
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
    if (p.poolIndex != null && st?.seconds > 0) afterMatchFitness(c, p.poolIndex, st.seconds / (m.duration || st.seconds), m.extra ? 1 + EXTRA_SHARE : 1); // Verlängerung kostet ein Drittel mehr Kraft. Doppelbelastung: bis Sonntag keine Erholung (die kommt erst zum Wochenwechsel)
  }
  const [s0, s1] = m.score;
  tie.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  if (m.extra) tie.et = true; // nach Verlängerung (die Tore der Verlängerung stehen im Ergebnis)
  if (tie.result.home === tie.result.away) {
    const so = m.shootout;
    const pens = so?.done ? shootoutScore(so) : penalties(m.teams, createRng((c.seed * 7 + cup.ties.indexOf(tie) * 131 + 9) >>> 0));
    tie.pens = prepared.humanIsAway ? { home: pens[1], away: pens[0] } : { home: pens[0], away: pens[1] };
  }
  matchFinances(c, tie, prepared, kind === 'bund' ? c.level ?? 1 : cup.levels[tie.home]); // Heimspiel: Theke, Schiri, Platzmiete; auswärts: Sprit
  logTie(c, cup, tie);
  afterHumanTie(c, kind);
}

function logTie(c, cup, tie) {
  const name = (id) => pokalClub(c, cup, id).short;
  cup.log.push(`${roundName(cup, tie.round)}: ${name(tie.home)} ${tie.result.home}:${tie.result.away}${tie.et ? ` ${tr('n. V.', 'a.e.t.')}` : ''}${tieOnPens(tie)} ${name(tie.away)}`);
}

// --- Schnelles Ergebnis für Spiele ohne den eigenen Verein ---------------------------------------
// Eine volle Simulation kostet 2–3 s je Spiel (gemessen), eine Pokalrunde mit 7 Fremdspielen wäre auf
// dem Handy zu langsam. Deshalb: Tore als Poisson-Zufall, Erwartung aus der Stärke der besten Spieler.
// Die Konstanten sind an der echten Engine gemessen (scripts/pokal-calibrate.mjs).
// Gemessen (120 Spiele, Okt. 2026): 1,40 Tore je Team; Heimsiege Engine 20/38/78 %, Modell 21/49/71 %
// bei Stärkeunterschied < −5 / −5…5 / > 5.
export const QUICK = { base: 1.4, perPoint: 0.03, home: 0.3 };
// Gegen Profis (Stärkeunterschied bis −30 statt höchstens ±15) ist die Steigung steiler: an der Engine gemessen
// (scripts/bundespokal-calibrate.mjs, 400 Spiele je Zeile) kommt der Amateur gegen Zweit-/Erstligisten auf
// 4,5 / 2,8 % (Kader „mittel") und 6,8 / 5,0 % (Kader „bezirk", der stärkste Bezirksligist); das schnelle Modell
// liefert mit perPoint 0,04 3,4 / 3,0 und 5,6 / 4,5 % (mit 0,035: 5,8 / 5,2 und 8,5 / 7,1 %, mit 0,045: 2,1 / 1,5 und 3,2 / 2,6 %).
export const QUICK_BUND = { perPoint: 0.04 };
const strength = (c, club, n) => {
  const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, n);
  return r.reduce((s, x) => s + x, 0) / Math.max(1, r.length);
};
// Stärke eines Teilnehmers im Format des Gastgebers dieser Paarung.
export const teamStrength = (c, cup, id, tie) => strength(c, pokalClub(c, cup, id), LEAGUES[Math.min(5, Math.max(2, cup.levels[tie.home]))].format ?? 7);
export const poisson = (rng, l) => {
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
  const pp = tie.kind === 'bund' ? QUICK_BUND.perPoint : QUICK.perPoint;
  const lh = QUICK.base * Math.exp(pp * d + QUICK.home);
  const la = QUICK.base * Math.exp(-pp * d);
  tie.result = { home: poisson(rng, lh), away: poisson(rng, la) };
  // Verlängerung (Einstellung): dieselben Torerwartungen, anteilig für die Dauer (EXTRA_SHARE = ein Drittel der Spielzeit).
  if (tie.result.home === tie.result.away && MATCH.pokalExtra) {
    tie.result = { home: tie.result.home + poisson(rng, lh * EXTRA_SHARE), away: tie.result.away + poisson(rng, la * EXTRA_SHARE) };
    tie.et = true;
  }
  if (tie.result.home === tie.result.away) {
    tie.pens = rng.chance(0.5) ? { home: 5, away: 4 } : { home: 4, away: 5 }; // ohne Szene: Glückssache
  }
  tie.quick = true;
}

// Nach dem eigenen Spiel: die anderen Spiele der Runde, dann ggf. nächste Auslosung.
export function afterHumanTie(c, kind) {
  const cup = pokalOf(c, kind);
  const me = humanClub(c).id;
  const mine = roundTies(cup).find((t) => t.home === me || t.away === me);
  if (mine?.result && tieWinner(mine) !== me) {
    cup.out = true;
    if (kind !== 'bund') adjustMood(c, cup.levels[mine.home] !== cup.levels[mine.away] && cup.levels[tieWinner(mine)] < (c.level ?? 1) ? -0.08 : -0.03);
  }
  finishRound(c, kind);
}

function finishRound(c, kind) {
  const cup = pokalOf(c, kind);
  const rng = createRng((c.seed * 29 + c.season * 457 + cup.round * 61 + SALT[kind][3]) >>> 0);
  for (const t of roundTies(cup)) if (!t.result) quickTie(c, cup, t, rng);
  const me = humanClub(c).id;
  for (const t of roundTies(cup)) if (t.quick && (t.home === me || t.away === me)) logTie(c, cup, t); // ohne dich gespielt
  if (kind === 'bund') return bundRoundEnd(c, cup);
  const winners = roundTies(cup).map(tieWinner);
  if (!winners.includes(me)) cup.out = true;
  if (winners.length === 1) return finishPokal(c, kind, winners[0]);
  cup.round++;
  draw(c, kind, winners);
}

// Überregionaler Pokal: Ende einer Runde. Sieg = weiter (nächste Auslosung), Niederlage = Ausscheiden.
function bundRoundEnd(c, cup) {
  const me = humanClub(c).id;
  const tie = roundTies(cup)[0];
  const won = tieWinner(tie) === me;
  bundMemory(c, cup, tie, won);
  if (won && cup.round < cup.rounds.length - 1) {
    cup.round++;
    bundDraw(c, cup);
    return;
  }
  if (!won) cup.out = true;
  finishPokal(c, 'bund', tieWinner(tie));
}

// Eine Runde gegen einen Profi festhalten (Chronik, Museum, Kreisblatt, Prämien, Foto mit dem Star). Sieg = Sensation
// und Einzug in die nächste Runde (Sponsorprämie); knappe Niederlage (höchstens ein Tor Unterschied, auch nach
// Verlängerung/Elfmeterschießen) = achtbar; sonst nur das Erlebnis. Ein Saisonrückschlag wird daraus nie.
function bundMemory(c, cup, tie, won) {
  const me = humanClub(c).id;
  const r = tie.round;
  const rname = roundName(cup, r);
  const hosting = tie.home === me;
  const opp = pokalClub(c, cup, hosting ? tie.away : tie.home);
  const gf = hosting ? tie.result.home : tie.result.away;
  const ga = hosting ? tie.result.away : tie.result.home;
  const close = !won && ga - gf <= 1;
  const pens = tie.pens ? (hosting ? `${tie.pens.home}:${tie.pens.away}` : `${tie.pens.away}:${tie.pens.home}`) : null;
  const score = `${gf}:${ga}${tie.et ? ` ${tr('n. V.', 'a.e.t.')}` : ''}${pens ? ` (${pens} ${tr('i. E.', 'on pens')})` : ''}`;
  const club = humanClub(c).name;
  const last = r === cup.rounds.length - 1;
  (c.bundGames ??= []).push({ season: c.season, year: cup.year, round: r, opp: opp.name, klass: opp.klass, gf, ga, et: !!tie.et, pens, won, close });
  const rng = createRng((c.seed * 3 + c.season * 7 + gf * 13 + ga + r * 31) >>> 0);
  const news = (list) => (c.pendingNews ??= []).push(rng.pick(list));
  if (won) {
    adjustMood(c, r === 0 ? 0.25 : 0.12);
    chronicle(c, r === 0
      ? tr(`SENSATION im ${BUND_NAME} ${cup.year}: ${club} wirft den Profiverein ${opp.name} raus (${score}).`, `SENSATION in the ${BUND_NAME} ${cup.year}: ${club} knock out professional club ${opp.name} (${score}).`)
      : tr(`${BUND_NAME} ${cup.year}, ${rname}: ${club} schlägt schon wieder einen Profi – ${opp.name} (${score}).`, `${BUND_NAME} ${cup.year}, ${rname}: ${club} beat yet another professional side – ${opp.name} (${score}).`));
    cup.log.push(tr(`${rname}: ${score} gegen ${opp.name}${last ? ' – POKALSIEG!' : '. Weiter!'}`, `${rname}: ${score} against ${opp.name}${last ? ' – CUP WINNERS!' : '. Through!'}`));
    news(r === 0 ? BUND_TEXT.win(opp.name, club, score) : BUND_TEXT.winLater(opp.name, club, score, rname));
    const p = sponsorPraemie(c, 'bund', BUND_SPONSOR[r]);
    if (p) {
      book(c, tr(`Prämie ${p.sponsor.name}: ${rname} ${BUND_NAME}`, `Bonus ${p.sponsor.name}: ${BUND_NAME} ${rname}`), p.amount);
      adjustRel(p.sponsor, 12);
      cup.log.push(tr(`${p.sponsor.name} legt ${p.amount} € Prämie drauf.`, `${p.sponsor.name} add a €${p.amount} bonus.`));
    } else if (r === 0) cup.log.push(tr('Ohne Hauptsponsor gibt es keine Prämie – nur den Ruhm.', 'No main sponsor, no bonus – just the glory.'));
  } else if (close) {
    adjustMood(c, 0.06);
    chronicle(c, tr(`Achtbar im ${BUND_NAME} ${cup.year} (${rname}): ${club} verliert nur knapp gegen den Profiverein ${opp.name} (${score}).`, `Honourable exit in the ${BUND_NAME} ${cup.year} (${rname}): ${club} lose narrowly to professional club ${opp.name} (${score}).`));
    cup.log.push(tr(`${rname}: knapp ausgeschieden gegen ${opp.name} (${score}). Die Stadt ist stolz.`, `${rname}: narrow exit against ${opp.name} (${score}). The town is proud.`));
    news(BUND_TEXT.closeLoss(opp.name, club, score));
  } else {
    adjustMood(c, 0.02);
    cup.log.push(tr(`${rname}: ausgeschieden gegen ${opp.name} (${score}). Ein Erlebnis bleibt es trotzdem.`, `${rname}: out against ${opp.name} (${score}). An experience all the same.`));
    news(BUND_TEXT.loss(opp.name, club, score));
  }
  // Rundenprämie des Verbands (Verdopplung je Runde, siehe BUND_PRIZE) – wer mitspielt, bekommt sie, ob Sieg oder Niederlage.
  const mult = last ? (won ? BUND_PRIZE_WINNER : BUND_PRIZE[5]) : BUND_PRIZE[r];
  const prize = Math.round(homeUnit(c.level ?? 1) * mult);
  book(c, tr(`Rundenprämie ${BUND_NAME} (${rname})`, `${BUND_NAME} round bonus (${rname})`), prize);
  cup.log.push(tr(`Rundenprämie des Verbands: ${prize} €.`, `Round bonus from the association: €${prize}.`));
  // Foto mit dem Star des Profivereins: kommt in die Vitrine (einmal je Verein), wenn das Spiel wirklich stattfand.
  if (!tie.quick && !(c.trophies ?? []).some((t) => t.kind === 'foto' && t.club === opp.id)) {
    const star = [...opp.squad].map((i) => playerOf(c, i)).sort((a, b) => b.rating - a.rating)[0];
    c.trophies = [...(c.trophies ?? []), { name: tr(`Foto mit ${star.name} (${opp.short})`, `Photo with ${star.name} (${opp.short})`), season: c.season, kind: 'foto', club: opp.id }];
  }
}

// Wochenchat zum Profispiel: Auslosung im Kreisblatt, Kartenansturm, Vorfreude in der Gruppe, Aufbau, Spieltag – je Runde.
export function bundChat(c, chat) {
  const cup = pokalOf(c, 'bund');
  const left = cup && !cup.done && !cup.out ? cup.rounds[cup.round] - c.round : -1;
  if (left < 0) return;
  const rng = createRng((c.seed * 5 + c.season * 11 + c.round * 3) >>> 0);
  const club = humanClub(c);
  const tie = roundTies(cup)[0];
  const opp = pokalClub(c, cup, tie.home === club.id ? tie.away : tie.home).name;
  const talkers = club.squad.filter((idx) => !isCoach(c, idx));
  const say = (text, time) => talkers.length && chat.push({ from: rng.pick(talkers), text, time });
  if (cup.drawn !== cup.round) {
    cup.drawn = cup.round;
    const first = cup.round === 0;
    chat.push({ from: null, text: first ? rng.pick(BUND_TEXT.draw(opp, club.name)) : rng.pick(BUND_TEXT.drawLater(opp, club.name, roundName(cup))), time: 'Mo 07:30', press: true });
    if (tie.home === club.id) chat.push({ from: null, text: rng.pick(BUND_TEXT.tickets(opp)), time: 'Mo 12:15', press: true });
    say(rng.pick(BUND_TEXT.chat(opp)), 'Mo 07:52');
    say(rng.pick(BUND_TEXT.chat(opp)), 'Mo 09:10');
  } else if (left > 0) {
    chat.push({ from: null, text: rng.pick(BUND_TEXT.hype(opp)), time: 'Do 06:30', press: true });
    say(rng.pick(BUND_TEXT.chat(opp)), 'Do 18:20');
  }
  if (left === 0) {
    chat.push({ from: null, text: rng.pick(BUND_TEXT.matchday(opp)), time: 'Fr 17:45', press: true });
    say(rng.pick(BUND_TEXT.chat(opp)), 'Fr 18:30');
  }
}

// Hauptsponsor zahlt für den Pokalsieg (Höhe: PRAEMIE). Ohne Sponsor gibt es nur den Pokal.
function praemie(c, cup, kind) {
  const p = sponsorPraemie(c, kind);
  if (!p) return cup.log.push(tr('Ohne Hauptsponsor gibt es keine Prämie – nur den Pokal.', 'No main sponsor, no bonus – just the trophy.'));
  const cfg = POKALE[kind];
  book(c, tr(`Pokalprämie ${p.sponsor.name}: ${cfg.name}`, `Cup bonus ${p.sponsor.name}: ${cfg.name}`), p.amount);
  adjustRel(p.sponsor, 8);
  cup.log.push(tr(`${p.sponsor.name} legt ${p.amount} € Prämie drauf.`, `${p.sponsor.name} add a €${p.amount} bonus.`));
}

// Zu Wochenbeginn (startWeek): anmelden, und Runden, deren Woche vorbei ist, ohne uns ausspielen.
export function advancePokale(c) {
  for (const kind of KINDS) {
    // Anmelden bis zur ersten Runde (alte Spielstände mitten in der Saison steigen erst nächste Saison ein).
    if (!pokalOf(c, kind) && pokalEligible(c, kind) && !seasonOver(c) && c.round <= pokalRounds(c, kind)[0]) startPokal(c, kind);
    const cup = pokalOf(c, kind);
    if (!cup || cup.done) continue;
    let guard = 0;
    while (!cup.done && cup.rounds[cup.round] < c.round && guard++ < 8) finishRound(c, kind);
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
  if (kind === 'bund') {
    if (winner === me) {
      c.trophies = [...(c.trophies ?? []), { name: `${cfg.name} ${cup.year}`, season: c.season }];
      adjustMood(c, 0.3);
      chronicle(c, tr(`${cfg.name}sieger ${cup.year}! Ein Amateurverein hat den ${cfg.name} gewonnen. ${humanClub(c).name} im Märchenland.`, `${cfg.name} winners ${cup.year}! An amateur club has won the ${cfg.name}. ${humanClub(c).name} in fairy-tale land.`));
      cup.log.push(tr(`POKALSIEGER! Der ${cfg.name} steht in der Vitrine.`, `CUP WINNERS! The ${cfg.name} is in the cabinet.`));
    }
  } else if (winner === me) {
    const opp = pokalClub(c, cup, final.home === me ? final.away : final.home).name;
    c.trophies = [...(c.trophies ?? []), { name: `${cfg.name} ${cup.year}`, season: c.season }];
    adjustMood(c, 0.2);
    chronicle(c, tr(`${cfg.name}sieger ${cup.year}! Finale gegen ${opp}.`, `${cfg.name} winners ${cup.year}! Final against ${opp}.`));
    cup.log.push(tr(`POKALSIEGER! Der ${cfg.name} steht in der Vitrine.`, `CUP WINNERS! The ${cfg.name} is in the cabinet.`));
    if (kind === 'kreis') {
      c.pokalQual = c.season + 1; // nächste Saison im Bezirkspokal (ab Kreisliga A)
      cup.log.push(tr('Als Kreispokalsieger seid ihr nächste Saison im Bezirkspokal dabei – wenn ihr dann mindestens in der Kreisliga A spielt.', 'As District Cup winners you enter next season\'s County Cup – if you are in the Premier Division or above by then.'));
    } else if (kind === 'bezirk') {
      c.landQual = c.season + 1; // nächste Saison im Landespokal (ab Kreisliga A)
      cup.log.push(tr(`Als Bezirkspokalsieger seid ihr nächste Saison im ${POKALE.land.name} dabei – wenn ihr dann mindestens in der Kreisliga A spielt.`, `As County Cup winners you enter next season's ${POKALE.land.name} – if you are in the Premier Division or above by then.`));
    } else if (kind === 'land') {
      c.bundQual = c.season + 1; // nächste Saison: erste Runde gegen einen Profi
      cup.log.push(tr(`Als Landespokalsieger seid ihr nächste Saison im ${BUND_NAME} – erste Runde gegen einen Profiverein, Heimrecht.`, `As State Cup winners you enter next season's ${BUND_NAME} – first round at home against a professional club.`));
    }
    praemie(c, cup, kind);
  } else if (final.home === me || final.away === me) {
    adjustMood(c, 0.04);
    chronicle(c, tr(`Im Finale des ${cfg.name}s ${cup.year} gegen ${name} verloren.`, `Lost the ${cfg.name} final ${cup.year} to ${name}.`));
    cup.log.push(tr(`Finale verloren. ${cfg.name}sieger: ${name}.`, `Lost the final. ${cfg.name} winners: ${name}.`));
  } else cup.log.push(tr(`${cfg.name}sieger: ${name}.`, `${cfg.name} winners: ${name}.`));
  // Gäste verlassen den Spielstand wieder.
  for (const g of cup.guests) for (const idx of g.squad) if (!c.clubs.some((x) => x.squad.includes(idx))) delete c.players[idx];
}
