// Turniere: Stadtmeisterschaft im Sommer (nach dem letzten Spieltag) und
// Hallen-Stadtmeisterschaft in der Winterpause (Saisonmitte). Acht Vereine,
// zwei Vierergruppen, Halbfinale, Finale – Unentschieden im K.-o.: Elfmeterschießen.
import { createRng } from '../core/rng.js';
import { createMatch, MATCH, matchDuration } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { book } from './finances.js';
import { clubById, humanClub, humanFixture, playerOf, resolveKitClash, seasonOver, squadPicker, SQUAD_SHAPES, takenIndices, teamForMatch, winterRound } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { salesMul } from './facilities.js';
import { chronicle, yearOf } from './sagas.js';
import { shootoutScore } from '../sim/shootout.js';
import { afterMatchFitness } from './fitness.js';
import { applyCards, isBanned } from './suspensions.js';
import { rollInjuries } from './injuries.js';
import { tr, euroFmt } from '../core/i18n.js';

export const CUPS = {
  stadt: { name: tr('Stadtmeisterschaft', 'City Championship'), title: tr('Stadtmeister', 'City champions'), venue: 'ascheplatz', place: 'Sportplatz Am Kanal', share: 0.75, prizes: { winner: 150, final: 60, semi: 25 }, absent: 0.12, absentWhy: tr('Sommer: wer im Urlaub ist, fehlt', 'Summer: whoever is on holiday is out') },
  halle: { name: tr('Hallen-Stadtmeisterschaft', 'Indoor City Championship'), title: tr('Hallenmeister', 'Indoor champions'), venue: 'halle', place: 'Sporthalle Kanalschule', share: 0.75, prizes: { winner: 100, final: 40, semi: 15 }, absent: 0.08, absentWhy: tr('Winter: wer erkältet ist, fehlt', 'Winter: whoever has a cold is out') },
};
// Sommerturnier (ROADMAP 11.9): vor der Saison, 4–8 Teams, kurze Spiele. Preisgelder und Kosten sind Spielwerte
// (keine Messwerte), geeicht über scripts/longrun.mjs --fest. Ort und Gastgeber stehen je Turnier in t.venue/t.place.
CUPS.sommer = { name: tr('Sommerturnier', 'Summer tournament'), title: tr('Turniersieger', 'Tournament winners'), venue: 'ascheplatz', place: tr('Sportplatz des Gastgebers', 'the host\'s ground'), share: 0.5, short: true, prizes: { winner: 90, final: 40, semi: 15 }, absent: 0.1, absentWhy: tr('Urlaub und Sommerlaune: manche fehlen', 'Holidays and summer mood: some are missing'), sizes: [4, 6, 8], hostBase: 30, hostPerTeam: 10, startFee: 8, spendPerFan: 1.2 };
export const CUP_NAME = CUPS.stadt.name;
export const PRIZES = CUPS.stadt.prizes;

function cupWeek(c) {
  const availability = {};
  for (const idx of humanClub(c).squad) {
    const rec = c.players[idx] ?? {};
    availability[idx] = rec.injuryWeeks > 0 || rec.awayWeeks > 0 || isBanned(c, idx) ? 'no' : 'yes';
  }
  return { cupWeek: true, availability, chat: [], nudges: 0, nudged: [], lineup: null, training: null, event: null, weather: null, postponed: null, rumors: [], actions: 0 };
}

// Gäste aus der Stadt, die nicht in eurer Liga spielen.
const GUESTS = [
  { id: 'gast-polizei', name: 'Polizei-SV Kanalstadt', short: 'PSV', kit: { shirt: 0x1f3a6b, shorts: 0x1f3a6b, socks: 0xf2efe6 }, keeperKit: { shirt: 0x3fa05a, shorts: 0x1c1c1c, socks: 0x3fa05a }, tiers: { ok: 0.3, gut: 0.4, stark: 0.24, dorfstar: 0.06 } },
  { id: 'gast-rathaus', name: 'SG Rathaus/Stadtwerke', short: 'SGR', kit: { shirt: 0xd8d0c0, shorts: 0x6b2a2a, socks: 0x6b2a2a }, keeperKit: { shirt: 0xe07a2a, shorts: 0x1c1c1c, socks: 0xe07a2a }, tiers: { ok: 0.55, gut: 0.33, stark: 0.1, dorfstar: 0.02 } },
  { id: 'gast-feuerwehr', name: 'Freiwillige Feuerwehr Nord', short: 'FFN', kit: { shirt: 0xb0302c, shorts: 0x1c1c1c, socks: 0xb0302c }, keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 }, tiers: { ok: 0.45, gut: 0.35, stark: 0.16, dorfstar: 0.04 } },
  { id: 'gast-futsal', name: 'Futsal-Freunde Oststadt', short: 'FFO', kit: { shirt: 0x2aa36a, shorts: 0xf2efe6, socks: 0x2aa36a }, keeperKit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c }, tiers: { ok: 0.35, gut: 0.38, stark: 0.2, dorfstar: 0.07 } },
];

const fresh = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 });

// Alte Spielstände: c.tournament → c.cups.stadt
function store(c) {
  c.cups ??= {};
  if (c.tournament && !c.cups.stadt) {
    c.cups.stadt = { kind: 'stadt', ...c.tournament };
    for (const m of c.cups.stadt.matches) m.kind ??= 'stadt';
  }
  delete c.tournament;
  return c.cups;
}
export const cupOf = (c, kind = 'stadt') => {
  const t = store(c)[kind];
  return t?.season === c.season ? t : null;
};
export function cupClub(c, id) {
  for (const t of Object.values(store(c))) {
    const g = t?.guests?.find((x) => x.id === id);
    if (g) return g;
  }
  return clubById(c, id);
}

// Winterpause: Das Hallenturnier liegt in der Saisonmitte.
export { winterRound };
// Fällig in der Woche der Winterpause (career.js winterBreakWeek); alte Spielstände ohne diese Woche: wie bisher in der Woche des Spieltags.
export const winterCupDue = (c) => !!c.week && !seasonOver(c) && c.round === winterRound(c) && !cupOf(c, 'halle') && (c.week.breakWeek === 'winter' || c.flags?.winterBreak !== c.season);
export const winterCupRunning = (c) => !!cupOf(c, 'halle') && cupOf(c, 'halle').stage !== 'done';

// opts (nur Sommerturnier): size 4/6/8 Teams, host = wir richten aus, venue/place/hostName des Orts.
export function startTournament(c, kind = 'stadt', opts = {}) {
  if (cupOf(c, kind)) return cupOf(c, kind);
  // Stadtmeisterschaft nach dem letzten Spieltag: Es gibt keine Woche mehr – für Aufstellung und Rotation eine Turnierwoche
  // (wer verletzt oder gesperrt ist, fehlt; zufällige Absagen kommen je Spiel dazu, CUPS.absent).
  if (!c.week && !opts.noWeek) c.week = cupWeek(c);
  const cfg = CUPS[kind];
  const size = cfg.sizes?.includes(opts.size) ? opts.size : 8;
  const rng = createRng((c.seed * 31 + c.season * 977 + kind.length * 101 + 5) >>> 0);
  const used = takenIndices(c);
  const pick = squadPicker(rng, used);
  const guestDefs = [...GUESTS].sort(() => rng.next() - 0.5).slice(0, Math.max(0, size - c.clubs.length)); // aufgefüllt auf die Teamzahl
  const venue = opts.venue ?? cfg.venue;
  const guests = guestDefs.map((g) => ({ ...g, id: `${g.id}-${kind}`, human: false, venue, squad: pick(g.tiers, SQUAD_SHAPES.small) }));
  for (const g of guests) for (const idx of g.squad) c.players[idx] ??= fresh();
  const ids = [...c.clubs.map((x) => x.id), ...guests.map((g) => g.id)];
  // Auslosung: der eigene Verein kommt in Gruppe A.
  const others = ids.filter((id) => id !== humanClub(c).id).sort(() => rng.next() - 0.5);
  const me = humanClub(c).id;
  // 8 Teams: zwei Vierergruppen; 6: zwei Dreiergruppen; 4: eine Gruppe (die zwei Besten spielen das Finale).
  const groups = size === 8 ? [[me, ...others.slice(0, 3)], others.slice(3, 7)] : size === 6 ? [[me, ...others.slice(0, 2)], others.slice(2, 5)] : [[me, ...others.slice(0, 3)]];
  const matches = [];
  // Jeder gegen jeden in der Gruppe, drei Runden (Vierergruppe: zwei Spiele je Runde, Dreiergruppe: eins, einer ruht).
  const pairings = groups[0].length === 4 ? [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]] : [[[0, 1]], [[0, 2]], [[1, 2]]];
  pairings.forEach((round, r) =>
    groups.forEach((g, gi) => round.forEach(([a, b]) => matches.push({ kind, stage: gi === 0 ? 'A' : 'B', round: r, home: g[a], away: g[b], result: null }))),
  );
  store(c)[kind] = { kind, season: c.season, year: yearOf(c), guests, groups, matches, round: 0, stage: 'group', winner: null, skipped: false, log: [], size, ...(opts.venue ? { venue: opts.venue } : {}), ...(opts.place ? { place: opts.place } : {}), ...(opts.host != null ? { host: !!opts.host } : {}) };
  if (kind === 'sommer' && opts.host) book(c, tr('Sommerturnier ausrichten (Pokale, Schiri, Bälle, Getränke vorab)', 'Hosting the summer tournament (trophies, referee, balls, drinks up front)'), -hostCost(c, size));
  return store(c)[kind];
}

export function skipTournament(c, kind = 'stadt') {
  const t = startTournament(c, kind, { noWeek: true });
  t.skipped = true;
  t.stage = 'done';
  cleanup(c, kind);
}

// Tabelle: Punkte, Tordifferenz, Tore, direkter Vergleich, zuletzt ein Los (fest je Spielstand, Saison und Verein).
export function groupTable(c, g, kind = 'stadt') {
  const t = cupOf(c, kind);
  const rows = Object.fromEntries(t.groups[g].map((id) => [id, { id, club: cupClub(c, id), p: 0, gf: 0, ga: 0, pts: 0 }]));
  const played = t.matches.filter((m) => m.stage === (g === 0 ? 'A' : 'B') && m.result);
  for (const m of played) {
    const [h, a] = [rows[m.home], rows[m.away]];
    h.p++;
    a.p++;
    h.gf += m.result.home;
    h.ga += m.result.away;
    a.gf += m.result.away;
    a.ga += m.result.home;
    if (m.result.home > m.result.away) h.pts += 3;
    else if (m.result.home < m.result.away) a.pts += 3;
    else {
      h.pts++;
      a.pts++;
    }
  }
  // Direkter Vergleich zweier punkt- und torgleicher Teams: wer das Spiel gegeneinander gewonnen hat.
  const direct = (x, y) => {
    const m = played.find((q) => (q.home === x.id && q.away === y.id) || (q.home === y.id && q.away === x.id));
    if (!m || m.result.home === m.result.away) return 0;
    return (m.result.home > m.result.away ? m.home : m.away) === x.id ? -1 : 1;
  };
  const lot = (id) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, (c.seed * 7 + c.season) >>> 0);
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || direct(x, y) || lot(x.id) - lot(y.id));
}

// Die Spiele der aktuellen Runde (Gruppenrunde 0–2, dann Halbfinale, Finale).
export function currentCupMatches(c, kind = 'stadt') {
  const t = cupOf(c, kind);
  if (!t || t.stage === 'done') return [];
  return t.matches.filter((m) => m.round === t.round && !m.result);
}
export const humanCupMatch = (c, kind = 'stadt') => currentCupMatches(c, kind).find((m) => m.home === humanClub(c).id || m.away === humanClub(c).id) ?? null;

export function prepareCupMatch(c, m, { human = false, duration } = {}) {
  const kind = m.kind ?? 'stadt';
  const cfg = CUPS[kind];
  const t = cupOf(c, kind);
  const rng = createRng((c.seed * 131 + c.season * 17 + t.matches.indexOf(m) * 7919 + kind.length) >>> 0);
  const home = cupClub(c, m.home);
  const away = cupClub(c, m.away);
  const pitch = { ...PITCHES[t.venue ?? cfg.venue], format: 5, referee: true };
  const avail = (club) => Object.fromEntries(club.squad.map((idx) => [idx, (c.players[idx]?.injuryWeeks ?? 0) > 0 || rng.chance(cfg.absent) ? 'no' : 'yes']));
  const teamHome = teamForMatch(c, home, 5, avail(home), rng);
  const teamAway = teamForMatch(c, resolveKitClash(home, away), 5, avail(away), rng);
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration: duration ?? Math.round(matchDuration(pitch) * (cfg.short ? cfg.share : MATCH.cupShare ?? cfg.share)), incidents: true });
  match.crowd = kind === 'halle' ? 70 + rng.int(0, 40) : 40 + rng.int(0, 30); // Turnier: halbe Stadt am Rand
  match.knockout = m.stage !== 'A' && m.stage !== 'B';
  return { match, humanIsAway, pitch, home, away, cup: m };
}

// Elfmeterschießen (in der Halle: Siebenmeter): fünf pro Team, dann Sudden Death.
function penalties(c, m, prepared) {
  const t = cupOf(c, m.kind ?? 'stadt');
  const rng = createRng((c.seed * 7 + t.matches.indexOf(m) * 131 + 3) >>> 0);
  const [t0, t1] = prepared.match.teams;
  const shooters = (tm) => tm.players.filter((p) => p.position !== 'gk').sort((a, b) => b.attrs.shooting - a.attrs.shooting);
  const keeper = (tm) => tm.players.find((p) => p.position === 'gk') ?? tm.players[0];
  const score = [0, 0];
  const take = (ti, n) => {
    const list = shooters([t0, t1][ti]);
    const shooter = list[n % list.length];
    const k = keeper([t1, t0][ti]);
    if (rng.chance(Math.max(0.45, Math.min(0.92, 0.72 + (shooter.attrs.shooting - k.attrs.keeping) * 0.4)))) score[ti]++;
  };
  for (let n = 0; n < 5; n++) {
    take(0, n);
    take(1, n);
  }
  for (let n = 5; score[0] === score[1] && n < 30; n++) {
    take(0, n);
    take(1, n);
  }
  if (score[0] === score[1]) score[rng.chance(0.5) ? 0 : 1]++;
  return prepared.humanIsAway ? { home: score[1], away: score[0] } : { home: score[0], away: score[1] };
}

export function recordCupResult(c, m, prepared) {
  const [s0, s1] = prepared.match.score;
  // Turnier: mehrere Spiele ohne Woche dazwischen – das merkt man in den Beinen.
  const mm = prepared.match;
  for (const p of [...mm.players, ...mm.bench.flat(), ...(mm.sentOff ?? [])]) {
    const st = mm.stats.players[p.id];
    if (p.poolIndex != null && st?.seconds > 0) {
      afterMatchFitness(c, p.poolIndex, st.seconds / (mm.duration || st.seconds), 1.6);
      const tt = cupOf(c, m.kind ?? 'stadt');
      if (tt && m.kind === 'sommer' && humanClub(c).squad.includes(p.poolIndex)) (tt.played ??= []).includes(p.poolIndex) || tt.played.push(p.poolIndex);
    }
  }
  applyCards(c, prepared, { league: false, beforeLeague: true });
  // Sommerturnier: Man kann sich auch beim Vorbereitungsturnier wehtun (Seed je Turnierspiel).
  if (m.kind === 'sommer' && (m.home === humanClub(c).id || m.away === humanClub(c).id)) rollInjuries(c, prepared, 200 + cupOf(c, 'sommer').matches.indexOf(m));
  m.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  if (m.stage !== 'A' && m.stage !== 'B' && m.result.home === m.result.away) {
    // Selbst geschossen? Dann zählt das echte Elfmeterschießen, sonst wird gewürfelt.
    const so = prepared.match.shootout;
    if (so?.done) {
      const [a, b] = shootoutScore(so);
      m.pens = prepared.humanIsAway ? { home: b, away: a } : { home: a, away: b };
    } else m.pens = penalties(c, m, prepared);
  }
  const human = humanClub(c).id;
  if (m.home === human || m.away === human) cupOf(c, m.kind ?? 'stadt').log.push(`${stageName(m)}: ${cupClub(c, m.home).short} ${m.result.home}:${m.result.away}${m.pens ? ` (${m.pens.home}:${m.pens.away} ${tr('i. E.', 'on pens')})` : ''} ${cupClub(c, m.away).short}`);
}

export const winnerOf = (m) => (m.result.home + (m.pens?.home ?? 0) * 0.01 > m.result.away + (m.pens?.away ?? 0) * 0.01 ? m.home : m.away);
export const stageName = (m) => tr({ A: 'Gruppe A', B: 'Gruppe B', SF: 'Halbfinale', F: 'Finale' }, { A: 'Group A', B: 'Group B', SF: 'Semi-final', F: 'Final' })[m.stage];

// Runde fertig? Dann weiter: nächste Gruppenrunde, Halbfinale, Finale, Siegerehrung.
export function advanceCup(c, kind = 'stadt') {
  const t = cupOf(c, kind);
  if (!t || currentCupMatches(c, kind).length) return false;
  if (t.stage === 'group' && t.round < 2) t.round++;
  else if (t.stage === 'group') {
    const human = humanClub(c).id;
    const a = groupTable(c, 0, kind);
    let through;
    if (t.groups.length === 1) {
      // Vier Teams: Gruppensieger und Zweiter spielen gleich das Finale.
      t.round = 4;
      t.stage = 'final';
      t.matches.push({ kind, stage: 'F', round: 4, home: a[0].id, away: a[1].id, result: null });
      through = [a[0].id, a[1].id];
    } else {
      const b = groupTable(c, 1, kind);
      t.round = 3;
      t.stage = 'sf';
      t.matches.push({ kind, stage: 'SF', round: 3, home: a[0].id, away: b[1].id, result: null }, { kind, stage: 'SF', round: 3, home: b[0].id, away: a[1].id, result: null });
      through = [a[0].id, a[1].id, b[0].id, b[1].id];
    }
    if (!through.includes(human)) t.log.push(kind === 'halle' ? tr('In der Gruppe raus. Ihr schaut von der Tribüne zu und esst Waffeln.', 'Out in the group stage. You watch from the stands and eat waffles.') : tr('In der Gruppe ausgeschieden. Die anderen spielen weiter – ihr grillt.', 'Out in the group stage. The others play on – you fire up the barbecue.'));
  } else if (t.stage === 'sf') {
    const sfs = t.matches.filter((m) => m.stage === 'SF');
    t.round = 4;
    t.stage = 'final';
    t.matches.push({ kind, stage: 'F', round: 4, home: winnerOf(sfs[0]), away: winnerOf(sfs[1]), result: null });
  } else if (t.stage === 'final') {
    finishTournament(c, kind);
  }
  return true;
}

function finishTournament(c, kind) {
  const t = cupOf(c, kind);
  const cfg = CUPS[kind];
  const final = t.matches.find((m) => m.stage === 'F');
  t.winner = winnerOf(final);
  t.stage = 'done';
  const me = humanClub(c).id;
  const sfTeams = t.matches.filter((m) => m.stage === 'SF').flatMap((m) => [m.home, m.away]);
  const winnerName = cupClub(c, t.winner).name;
  // Ausrichter zahlen kein Preisgeld an sich selbst – bei ihnen bleiben Startgelder und Theke (summerTournamentMoney).
  const prize = (text, amount) => (t.host ? null : book(c, text, amount));
  if (t.winner === me) {
    prize(tr(`Preisgeld ${cfg.name}`, `Prize money ${cfg.name}`), cfg.prizes.winner);
    adjustMood(c, kind === 'halle' ? 0.15 : 0.2);
    c.trophies = [...(c.trophies ?? []), { name: `${cfg.name} ${t.year}${t.host ? tr(' (Heimturnier)', ' (hosted)') : ''}`, season: c.season }];
    if (kind === 'stadt') c.flags.cityChamp = c.season;
    chronicle(c, tr(`${cfg.title} ${t.year}! Finale gegen ${cupClub(c, final.home === me ? final.away : final.home).name}.`, `${cfg.title} ${t.year}! Final against ${cupClub(c, final.home === me ? final.away : final.home).name}.`));
    t.log.push(tr(`${cfg.title.toUpperCase()}! Der Pokal steht jetzt in der Vitrine im Vereinsheim.${t.host ? '' : ` ${cfg.prizes.winner} € Preisgeld.`}`, `${cfg.title.toUpperCase()}! The cup now sits in the clubhouse cabinet.${t.host ? '' : ` ${euroFmt(cfg.prizes.winner)} prize money.`}`));
  } else if (final.home === me || final.away === me) {
    prize(tr(`Preisgeld ${cfg.name} (Finale)`, `Prize money ${cfg.name} (final)`), cfg.prizes.final);
    adjustMood(c, 0.06);
    chronicle(c, tr(`Finale der ${cfg.name} ${t.year}, knapp verloren gegen ${winnerName}.`, `Final of the ${cfg.name} ${t.year}, lost narrowly to ${winnerName}.`));
    t.log.push(tr(`Im Finale verloren.${t.host ? ' Der Pokal geht an die Gäste.' : ` ${cfg.prizes.final} € für den Zweiten und ein Kasten vom Veranstalter.`}`, `Lost in the final.${t.host ? ' The cup goes to the guests.' : ` ${euroFmt(cfg.prizes.final)} for the runners-up and a crate of beer from the organisers.`}`));
  } else if (sfTeams.includes(me)) {
    prize(tr(`Preisgeld ${cfg.name} (Halbfinale)`, `Prize money ${cfg.name} (semi-final)`), cfg.prizes.semi);
    t.log.push(tr(`Im Halbfinale raus. ${t.host ? 'Für jeden gibt es ' : `${cfg.prizes.semi} € und für jeden `}${kind === 'halle' ? 'eine Waffel' : 'eine Bratwurst'}. ${cfg.title}: ${winnerName}.`, `Out in the semi-final. ${t.host ? 'Everyone gets ' : `${euroFmt(cfg.prizes.semi)} and `}${kind === 'halle' ? 'a waffle' : 'a sausage'}${t.host ? '' : ' for everyone'}. ${cfg.title}: ${winnerName}.`));
  } else t.log.push(tr(`${cfg.title} wird ${winnerName}.`, `${cfg.title}: ${winnerName}.`));
  if (kind === 'sommer') summerAftermath(c, t);
  cleanup(c, kind);
}

// Sommerturnier danach: Theke und Startgelder (nur als Gastgeber), Spielpraxis für die Form, Kreisblatt-Zeile.
// Zuschauer je Spiel: Spielwerte, nach Liga gestaffelt (kleiner als ein Ligaheimspiel, dafür viele Spiele an einem Tag).
const LEVEL_MUL = [0, 1, 1.3, 1.6, 2, 2.6, 4, 5.5, 6.9]; // Kosten wachsen mit der Liga wie im Vereinsfest (festival.js); Stufen 6–8: 2,6 × upperScale
export const hostCost = (c, size = 4) => Math.round((CUPS.sommer.hostBase + CUPS.sommer.hostPerTeam * size) * LEVEL_MUL[Math.min(8, Math.max(1, c.level ?? 1))]);
export const SUMMER_FANS = [0, [10, 24], [16, 34], [24, 46], [34, 64], [50, 110], [78, 171], [105, 232], [132, 291]]; // Stufen 6–8: Stufe 5 × upperScale (finances.js)
function summerAftermath(c, t) {
  const cfg = CUPS.sommer;
  const me = humanClub(c).id;
  const rng = createRng((c.seed * 53 + c.season * 211 + 17) >>> 0);
  const [lo, hi] = SUMMER_FANS[Math.min(8, Math.max(1, c.level ?? 1))];
  if (t.host) {
    let fans = 0;
    for (let i = 0; i < t.size / 2; i++) fans += rng.int(lo, hi); // Publikum kommt für den Tag, nicht je Spiel
    const wirt = (c.staff?.wirt ? 1.3 : 1) * salesMul(c);
    t.fans = fans;
    t.theke = Math.round(fans * cfg.spendPerFan * wirt);
    t.fees = Math.round(cfg.startFee * LEVEL_MUL[Math.min(8, Math.max(1, c.level ?? 1))]) * (t.size - 1);
    book(c, tr(`Theke beim Sommerturnier (${fans} Zuschauer insgesamt)`, `Bar at the summer tournament (${fans} spectators in total)`), t.theke);
    book(c, tr(`Startgelder Sommerturnier (${t.size - 1} Gäste)`, `Summer tournament entry fees (${t.size - 1} guests)`), t.fees);
    t.log.push(tr(`Als Gastgeber: ${euroFmt(t.theke)} Theke und ${euroFmt(t.fees)} Startgelder.`, `As hosts: ${euroFmt(t.theke)} from the bar and ${euroFmt(t.fees)} entry fees.`));
  }
  // Spielpraxis vor der Saison: wer mitgespielt hat, kommt mit etwas Schwung in die Runde (Form klingt in einer Woche ab).
  const won = t.winner === me;
  for (const idx of humanClub(c).squad) if (c.players[idx]?.apps !== undefined && t.played?.includes(idx)) adjustForm(c, idx, won ? 0.3 : 0.15);
  adjustMood(c, won ? 0.05 : 0.02);
  const winnerName = cupClub(c, t.winner).name;
  if (!won) chronicle(c, tr(`Kreisblatt: ${cfg.name} ${t.year}${t.host ? ' bei uns' : ''} – ${won ? 'wir holen den Pokal' : `Sieger ist ${winnerName}`}.`, `District Gazette: ${cfg.name} ${t.year}${t.host ? ' at our ground' : ''} – ${won ? 'we lift the trophy' : `${winnerName} win`}.`));
  if (won) c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, 2);
}

// Gäste verlassen den Spielstand wieder.
function cleanup(c, kind) {
  const t = cupOf(c, kind);
  for (const g of t?.guests ?? []) for (const idx of g.squad) if (!c.clubs.some((x) => x.squad.includes(idx))) delete c.players[idx];
}

export const tournamentOpen = (c, kind = 'stadt') => !cupOf(c, kind) || cupOf(c, kind).stage !== 'done';
export const playerName = (c, idx) => playerOf(c, idx).name;

// --- Sommerturnier: vor der Saison, Einladung oder Heimturnier ---------------------------------------
// Fällig, solange noch kein Spieltag gespielt ist (Runde 0) und für diese Saison nichts entschieden wurde.
export const summerCupDue = (c) => !!c.week && !seasonOver(c) && c.round === 0 && !humanFixture(c)?.result && !cupOf(c, 'sommer');
export const summerCupRunning = (c) => !!cupOf(c, 'sommer') && cupOf(c, 'sommer').stage !== 'done';

// Das Angebot für diese Saison: eingeladen vom Nachbarn (Ort dort) oder selbst ausrichten (eigener Platz).
// Der Nachbar kommt aus dem Saison-Seed – festgelegt, kein Würfeln beim Öffnen.
export function summerOffer(c) {
  const rng = createRng((c.seed * 17 + c.season * 389 + 41) >>> 0);
  const others = c.clubs.filter((x) => !x.human);
  const neighbour = others[rng.int(0, others.length - 1)] ?? null;
  const size = [6, 8, 8][rng.int(0, 2)];
  return { neighbour, inviteSize: size, canHost: c.cash >= hostCost(c, 4), hostCosts: { 4: hostCost(c, 4), 6: hostCost(c, 6), 8: hostCost(c, 8) } };
}

// choice: 'invite' (eingeladen, Platz des Nachbarn) oder 'host' (eigener Platz; size 4/6/8).
export function startSummerCup(c, choice = 'invite', size = null) {
  if (cupOf(c, 'sommer')) return cupOf(c, 'sommer');
  const offer = summerOffer(c);
  if (choice === 'host') {
    if (c.cash < offer.hostCosts[size ?? 6]) return null;
    const venue = humanClub(c).venue;
    return startTournament(c, 'sommer', { size: size ?? 6, host: true, venue, place: PITCHES[venue]?.name ?? humanClub(c).name });
  }
  const place = offer.neighbour ? `Sportplatz ${offer.neighbour.name}` : CUPS.sommer.place;
  return startTournament(c, 'sommer', { size: offer.inviteSize, host: false, venue: offer.neighbour?.venue ?? 'ascheplatz', place });
}

// Wer das Turnier angefangen und nicht beendet hat, spielt den ersten Spieltag nicht daneben: Rest wird gestrichen.
export function abandonSummerCup(c) {
  if (summerCupRunning(c)) {
    const t = cupOf(c, 'sommer');
    t.stage = 'done';
    t.skipped = true;
    t.log.push(tr('Das Turnier wurde abgebrochen – die Saison beginnt.', 'The tournament was called off – the season begins.'));
    cleanup(c, 'sommer');
  }
}
