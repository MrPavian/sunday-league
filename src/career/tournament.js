// Stadtmeisterschaft im Sommer: nach dem letzten Spieltag, vor der neuen Saison.
// Acht Vereine auf dem Sportplatz Am Kanal, 5 gegen 5 mit Schiri, kurze Spiele.
// Zwei Vierergruppen, die ersten zwei ins Halbfinale, dann das Finale.
// Unentschieden in der K.-o.-Runde: Elfmeterschießen.
import { createRng } from '../core/rng.js';
import { createMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { book } from './finances.js';
import { clubById, humanClub, playerOf, resolveKitClash, squadPicker, SQUAD_SHAPES, takenIndices, teamForMatch } from './career.js';
import { adjustMood } from './events.js';
import { chronicle, yearOf } from './sagas.js';

export const CUP_NAME = 'Stadtmeisterschaft';
export const CUP_DURATION = 300; // Sekunden Spielzeit – zwei kurze Halbzeiten
const CUP_VENUE = 'ascheplatz';
export const PRIZES = { winner: 150, final: 60, semi: 25 };

// Zwei Gäste aus der Stadt, die nicht in eurer Liga spielen.
const GUESTS = [
  { id: 'gast-polizei', name: 'Polizei-SV Kanalstadt', short: 'PSV', kit: { shirt: 0x1f3a6b, shorts: 0x1f3a6b, socks: 0xf2efe6 }, keeperKit: { shirt: 0x3fa05a, shorts: 0x1c1c1c, socks: 0x3fa05a }, tiers: { ok: 0.3, gut: 0.4, stark: 0.24, dorfstar: 0.06 } },
  { id: 'gast-rathaus', name: 'SG Rathaus/Stadtwerke', short: 'SGR', kit: { shirt: 0xd8d0c0, shorts: 0x6b2a2a, socks: 0x6b2a2a }, keeperKit: { shirt: 0xe07a2a, shorts: 0x1c1c1c, socks: 0xe07a2a }, tiers: { ok: 0.55, gut: 0.33, stark: 0.1, dorfstar: 0.02 } },
  { id: 'gast-feuerwehr', name: 'Freiwillige Feuerwehr Nord', short: 'FFN', kit: { shirt: 0xb0302c, shorts: 0x1c1c1c, socks: 0xb0302c }, keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 }, tiers: { ok: 0.45, gut: 0.35, stark: 0.16, dorfstar: 0.04 } },
];

const fresh = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 });
export const cupOf = (c) => (c.tournament?.season === c.season ? c.tournament : null);
export const cupClub = (c, id) => c.tournament?.guests.find((g) => g.id === id) ?? clubById(c, id);

export function startTournament(c) {
  if (cupOf(c)) return cupOf(c);
  const rng = createRng((c.seed * 31 + c.season * 977 + 5) >>> 0);
  const used = takenIndices(c);
  const pick = squadPicker(rng, used);
  const guestDefs = [...GUESTS].sort(() => rng.next() - 0.5).slice(0, 2);
  const guests = guestDefs.map((g) => ({ ...g, human: false, venue: CUP_VENUE, squad: pick(g.tiers, SQUAD_SHAPES.small) }));
  for (const g of guests) for (const idx of g.squad) c.players[idx] ??= fresh();
  const ids = [...c.clubs.map((x) => x.id), ...guests.map((g) => g.id)];
  // Auslosung: der eigene Verein kommt in Gruppe A.
  const others = ids.filter((id) => id !== humanClub(c).id).sort(() => rng.next() - 0.5);
  const groups = [[humanClub(c).id, ...others.slice(0, 3)], others.slice(3, 7)];
  const matches = [];
  // Jeder gegen jeden in der Gruppe, drei Runden à zwei Spiele.
  const pairings = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  pairings.forEach((round, r) =>
    groups.forEach((g, gi) => round.forEach(([a, b]) => matches.push({ stage: gi === 0 ? 'A' : 'B', round: r, home: g[a], away: g[b], result: null }))),
  );
  c.tournament = { season: c.season, year: yearOf(c), guests, groups, matches, round: 0, stage: 'group', winner: null, skipped: false, log: [] };
  return c.tournament;
}

export function skipTournament(c) {
  const t = startTournament(c);
  t.skipped = true;
  t.stage = 'done';
  cleanup(c);
}

export function groupTable(c, g) {
  const t = cupOf(c);
  const rows = Object.fromEntries(t.groups[g].map((id) => [id, { id, club: cupClub(c, id), p: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const m of t.matches) {
    if (m.stage !== (g === 0 ? 'A' : 'B') || !m.result) continue;
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
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
}

// Die Spiele der aktuellen Runde (Gruppenrunde 0–2, dann Halbfinale, Finale).
export function currentCupMatches(c) {
  const t = cupOf(c);
  if (!t || t.stage === 'done') return [];
  return t.matches.filter((m) => m.round === t.round && !m.result);
}
export const humanCupMatch = (c) => currentCupMatches(c).find((m) => m.home === humanClub(c).id || m.away === humanClub(c).id) ?? null;

export function prepareCupMatch(c, m, { human = false, duration = CUP_DURATION } = {}) {
  const rng = createRng((c.seed * 131 + c.season * 17 + c.tournament.matches.indexOf(m) * 7919) >>> 0);
  const home = cupClub(c, m.home);
  const away = cupClub(c, m.away);
  const pitch = { ...PITCHES[CUP_VENUE], format: 5, referee: true };
  // Sommer: Wer im Urlaub ist, fehlt.
  const avail = (club) => Object.fromEntries(club.squad.map((idx) => [idx, (c.players[idx]?.injuryWeeks ?? 0) > 0 || rng.chance(0.12) ? 'no' : 'yes']));
  const teamHome = teamForMatch(c, home, 5, avail(home), rng);
  const teamAway = teamForMatch(c, resolveKitClash(home, away), 5, avail(away), rng);
  const humanIsAway = human && away.human;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration, incidents: true });
  return { match, humanIsAway, pitch, home, away, cup: m };
}

// Elfmeterschießen: fünf pro Team, dann Sudden Death.
function penalties(c, m, prepared) {
  const rng = createRng((c.seed * 7 + c.tournament.matches.indexOf(m) * 131 + 3) >>> 0);
  const [t0, t1] = prepared.match.teams;
  const shooters = (t) => t.players.filter((p) => p.position !== 'gk').sort((a, b) => b.attrs.shooting - a.attrs.shooting);
  const keeper = (t) => t.players.find((p) => p.position === 'gk') ?? t.players[0];
  const score = [0, 0];
  const take = (ti, n) => {
    const shooter = shooters([t0, t1][ti])[n % shooters([t0, t1][ti]).length];
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
  m.result = prepared.humanIsAway ? { home: s1, away: s0 } : { home: s0, away: s1 };
  if (m.stage !== 'A' && m.stage !== 'B' && m.result.home === m.result.away) m.pens = penalties(c, m, prepared);
  const human = humanClub(c).id;
  if (m.home === human || m.away === human) c.tournament.log.push(`${stageName(m)}: ${cupClub(c, m.home).short} ${m.result.home}:${m.result.away}${m.pens ? ` (${m.pens.home}:${m.pens.away} i. E.)` : ''} ${cupClub(c, m.away).short}`);
}

export const winnerOf = (m) => (m.result.home + (m.pens?.home ?? 0) * 0.01 > m.result.away + (m.pens?.away ?? 0) * 0.01 ? m.home : m.away);
export const stageName = (m) => ({ A: 'Gruppe A', B: 'Gruppe B', SF: 'Halbfinale', F: 'Finale' })[m.stage];

// Runde fertig? Dann weiter: nächste Gruppenrunde, Halbfinale, Finale, Siegerehrung.
export function advanceCup(c) {
  const t = cupOf(c);
  if (!t || currentCupMatches(c).length) return false;
  if (t.stage === 'group' && t.round < 2) t.round++;
  else if (t.stage === 'group') {
    const [a, b] = [groupTable(c, 0), groupTable(c, 1)];
    t.round = 3;
    t.stage = 'sf';
    t.matches.push({ stage: 'SF', round: 3, home: a[0].id, away: b[1].id, result: null }, { stage: 'SF', round: 3, home: b[0].id, away: a[1].id, result: null });
    const human = humanClub(c).id;
    if (![a[0].id, a[1].id, b[0].id, b[1].id].includes(human)) t.log.push('In der Gruppe ausgeschieden. Die anderen spielen weiter – ihr grillt.');
  } else if (t.stage === 'sf') {
    const sfs = t.matches.filter((m) => m.stage === 'SF');
    t.round = 4;
    t.stage = 'final';
    t.matches.push({ stage: 'F', round: 4, home: winnerOf(sfs[0]), away: winnerOf(sfs[1]), result: null });
  } else if (t.stage === 'final') {
    finishTournament(c);
  }
  return true;
}

function finishTournament(c) {
  const t = c.tournament;
  const final = t.matches.find((m) => m.stage === 'F');
  t.winner = winnerOf(final);
  t.stage = 'done';
  const me = humanClub(c).id;
  const sfTeams = t.matches.filter((m) => m.stage === 'SF').flatMap((m) => [m.home, m.away]);
  const winnerName = cupClub(c, t.winner).name;
  if (t.winner === me) {
    book(c, `Preisgeld ${CUP_NAME}`, PRIZES.winner);
    adjustMood(c, 0.2);
    c.trophies = [...(c.trophies ?? []), { name: `${CUP_NAME} ${t.year}`, season: c.season }];
    c.flags.cityChamp = c.season;
    chronicle(c, `Stadtmeister ${t.year}! Finale gegen ${cupClub(c, final.home === me ? final.away : final.home).name}.`);
    t.log.push(`STADTMEISTER! Der Pokal steht jetzt in der Vitrine im Vereinsheim. ${PRIZES.winner} € Preisgeld.`);
  } else if (final.home === me || final.away === me) {
    book(c, `Preisgeld ${CUP_NAME} (Finale)`, PRIZES.final);
    adjustMood(c, 0.06);
    chronicle(c, `Finale der Stadtmeisterschaft ${t.year}, knapp verloren gegen ${winnerName}.`);
    t.log.push(`Im Finale verloren. ${PRIZES.final} € für den Vizemeister und ein Kasten vom Veranstalter.`);
  } else if (sfTeams.includes(me)) {
    book(c, `Preisgeld ${CUP_NAME} (Halbfinale)`, PRIZES.semi);
    t.log.push(`Im Halbfinale raus. ${PRIZES.semi} € und eine Bratwurst für jeden. Stadtmeister: ${winnerName}.`);
  } else t.log.push(`Stadtmeister wird ${winnerName}.`);
  cleanup(c);
}

// Gäste verlassen den Spielstand wieder.
function cleanup(c) {
  for (const g of c.tournament.guests) for (const idx of g.squad) if (!c.clubs.some((x) => x.squad.includes(idx))) delete c.players[idx];
}

export const tournamentOpen = (c) => !cupOf(c) || cupOf(c).stage !== 'done';
export const playerName = (c, idx) => playerOf(c, idx).name;
