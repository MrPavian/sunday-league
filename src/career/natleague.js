// Nationenliga (ROADMAP 11.17 #14, offener Punkt „Nations League", 2026-11-08): Ligen der europäischen Nationalteams mit Auf- und
// Abstieg, im Spiel unter erfundenem Namen. Vorbild ist das echte Format der Ausgabe 2026/27 (Europäischer Verband, Reglement
// 2026/27; Wikipedia „2026–27 UEFA Nations League"):
//
//  - Ligaphase in den Saisons ohne europäische Qualifikation (Herbst eines geraden Jahres, Saison 1 = 2026/27 wie in echt):
//    sechs Spieltage im September/Oktober und November, Gruppen mit Hin- und Rückspiel (Dreiergruppen: vier Spiele je Team).
//  - Liga A: Gruppensieger und Zweite im Viertelfinale mit Hin- und Rückspiel im März (Sieger gegen Zweiten einer anderen Gruppe,
//    der Gruppensieger hat im Rückspiel Heimrecht). Die vier Sieger spielen im Juni die Endrunde: Halbfinale (offen gelost), Spiel
//    um Platz 3 und Finale, je ein Spiel.
//  - Auf- und Abstieg: Gruppenletzte der Liga A steigen ab, Gruppensieger der Liga B auf; Gruppendritte der Liga A spielen im März
//    gegen die Zweiten der Liga B (Hin- und Rückspiel, das Team der höheren Liga hat im Rückspiel Heimrecht). Zwischen B und C
//    tauschen die Gruppensieger der unteren und die schlechtesten Gruppenletzten der oberen Liga die Plätze.
//  - Gesamtrangliste: erst Liga, dann Gruppenplatz, dann Punkte, Tordifferenz und Tore (wie die echte Gesamtrangliste, Artikel 19).
//  - Folgen für die Qualifikation (natplayoffs.js): Die echten Play-offs der Weltmeisterschaft 2026 und der Europameisterschaft 2028
//    nehmen die bestplatzierten Gruppensieger der Nations League, die sich nicht über die Gruppe qualifiziert haben, danach die
//    Bestplatzierten der Gesamtrangliste. Genau so hier, mit der Nationenliga der Saison davor.
//
// Spielwerte (das Spiel kennt 37 statt 54 europäische Länder): Liga A wie echt 16 Teams in vier Vierergruppen, Liga B 12 Teams in
// vier Dreiergruppen, Liga C der Rest in Dreiergruppen; deshalb zwischen B und C kein Play-off, sondern direkter Tausch. Erste
// Ausgabe: Ligen nach Stärke (echt: Rangliste der Vorausgabe). Endrunde ohne eigenes Fenster, beim Saisonende gerechnet.
// Rückspiele: bei Gleichstand gleich Elfmeterschießen (wie bei den Play-offs der Qualifikation, Verlängerung weggelassen). Die
// Reform ab 2028/29 (drei Ligen mit je 18 Teams, Sechsergruppen ohne volle Doppelrunde) ist beschlossen, aber noch ohne
// veröffentlichte Einzelheiten – das Spiel bleibt beim Format 2026/27.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { NATIONS } from '../data/nations.js';
import { byPerGame, hash, idHash, nationName, quickMatch, targetOf, winnerOf } from './nationalteams.js';
import { finishPlayoffs, schedulePlayoffs } from './natplayoffs.js';
import { qualiTable, roundRobin } from './natquali.js';

export const NL = {
  de: 'Nationenliga',
  en: 'League of Nations',
  leagues: [
    { size: 16, groups: 4 },
    { size: 12, groups: 4 },
    { size: Infinity, groups: 0 }, // Rest in Dreiergruppen
  ],
};
export const nlName = () => tr(NL.de, NL.en);
const LETTERS = ['A', 'B', 'C', 'D'];
export const leagueName = (l) => tr(`Liga ${LETTERS[l]}`, `League ${LETTERS[l]}`);

// Saison mit Ligaphase: Herbst eines geraden Jahres (yearOf: Saison 1 = 2026/27).
export const nlSeason = (year) => year % 2 === 0;

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const uefa = () => Object.keys(NATIONS).filter((nid) => NATIONS[nid].conf === 'uefa');

// Ligen aufteilen: erste Ausgabe nach Stärke, danach aus c.natLeague (Auf- und Abstieg der Vorausgabe). Neue Länder kommen unten dazu.
export function leaguesFor(c, year) {
  const all = uefa();
  const str = Object.fromEntries(all.map((nid) => [nid, targetOf(c, year, nid)]));
  const prev = c.natLeague?.leagues;
  const order = prev ? [...prev.flat().filter((nid) => all.includes(nid)), ...all.filter((nid) => !prev.flat().includes(nid)).sort((a, b) => str[b] - str[a])] : [...all].sort((a, b) => str[b] - str[a]);
  const out = [];
  let from = 0;
  for (const L of NL.leagues) {
    if (from >= order.length) break;
    const size = Math.min(L.size, order.length - from);
    out.push(order.slice(from, from + size));
    from += size;
  }
  return { leagues: out, str };
}

// Gruppen einer Liga: Töpfe nach Rangliste (Reihenfolge in der Liga), je Gruppe einer aus jedem Topf.
function drawGroups(ids, G, rng) {
  const groups = Array.from({ length: G }, () => []);
  for (let pot = 0; pot * G < ids.length; pot++) shuffle(ids.slice(pot * G, pot * G + G), rng).forEach((nid, i) => groups[i].push(nid));
  return groups.filter((g) => g.length);
}

// Wettbewerb für den Saisonplan (natquali.js planQuali). days: Termine der Saison; null = keine Ligaphase in dieser Saison.
export function planLeague(c, year, days) {
  if (!nlSeason(year) || !days.length) return null;
  const { leagues, str } = leaguesFor(c, year);
  const rng = createRng(hash(c.seed ?? 0, year, idHash('nl'), 31));
  const groups = [];
  const leagueOf = [];
  const groupNames = [];
  leagues.forEach((ids, l) => {
    const G = NL.leagues[l].groups || Math.max(1, Math.round(ids.length / 3));
    drawGroups(ids, G, rng).forEach((g, i) => {
      groups.push(g);
      leagueOf.push(l);
      groupNames.push(tr(`Liga ${LETTERS[l]}, Gruppe ${i + 1}`, `League ${LETTERS[l]}, group ${i + 1}`));
    });
  });
  const poDays = days.length >= 4 ? days.slice(-2) : null;
  const gDays = poDays ? days.slice(0, -2) : days;
  const matches = [];
  groups.forEach((g, gi) => {
    const list = roundRobin(g);
    list.forEach((day, md) => {
      for (const [home, away] of day) matches.push({ step: `n${md + 1}`, md, day: gDays[Math.floor((md * gDays.length) / list.length)], g: gi, home, away, result: null });
    });
  });
  return { key: `nl-${year}`, isQuali: true, nl: true, id: 'nl', year, yearLabel: `${year}/${String(year + 1).slice(2)}`, conf: 'uefa', groups, leagueOf, groupNames, leagues, target: str, str: { ...str }, own: {}, stats: {}, matches, log: [], poDays };
}

// Rangliste einer Liga (Gruppenplatz, dann Punkte, Tordifferenz, Tore je Spiel) und Gesamtrangliste.
function leagueRows(comp, l) {
  const tables = comp.groups.map((_, g) => g).filter((g) => comp.leagueOf[g] === l).map((g) => qualiTable(comp, g));
  const out = [];
  for (let p = 0; p < 4; p++) out.push(...tables.map((tb) => tb[p]).filter(Boolean).map((r) => ({ ...r, place: p })).sort(byPerGame));
  return { tables, rows: out };
}

function groupsDone(c, comp) {
  for (const m of comp.matches) if (m.g >= 0 && !m.result) quickMatch(c, comp, m);
}

// Viertelfinale (Liga A) und Play-off A/B auslosen; days = [Hinspiel, Rückspiel], [-1, -1] = beim Saisonende.
export function nlPrepare(c, comp, days) {
  if (comp.po) return;
  groupsDone(c, comp);
  const rng = createRng(hash(c.seed ?? 0, comp.year, idHash('nl'), 32));
  const A = leagueRows(comp, 0).tables;
  const paths = [];
  // Viertelfinale: Sieger gegen Zweiten einer anderen Gruppe (Gruppensieger mit Heimrecht im Rückspiel).
  if (A.length >= 2) {
    const winners = A.map((tb) => tb[0].nid);
    let seconds = A.map((tb) => tb[1].nid);
    for (let guard = 0; guard < 50; guard++) {
      seconds = shuffle(seconds, rng);
      if (seconds.every((nid, i) => !comp.groups[comp.groups.findIndex((g) => g.includes(winners[i]))].includes(nid))) break;
    }
    winners.forEach((w, i) => paths.push({ kind: 'qf', semis: [[w, seconds[i]]], seed: null, legs: 2, steps: ['v1', 'v2'] }));
  }
  // Play-off A/B: Gruppendritte der Liga A gegen Zweite der Liga B (Team der Liga A mit Heimrecht im Rückspiel).
  const B = comp.leagues.length > 1 ? leagueRows(comp, 1).tables : [];
  const thirds = A.map((tb) => tb[2]?.nid).filter(Boolean);
  const bSecond = shuffle(B.map((tb) => tb[1]?.nid).filter(Boolean), rng);
  if (B.length) thirds.slice(0, bSecond.length).forEach((a, i) => paths.push({ kind: 'ab', semis: [[a, bSecond[i]]], seed: null, legs: 2, steps: ['a1', 'a2'] }));
  schedulePlayoffs(comp, { direct: [], paths }, days);
}

// Saisonende: alles Offene rechnen, Endrunde, Auf- und Abstieg, Gesamtrangliste für die Qualifikation der nächsten Saison.
export function nlSeasonEnd(c, comp) {
  nlPrepare(c, comp, [-1, -1]);
  finishPlayoffs(c, comp);
  const tie = (kind) => comp.po.paths.map((p, path) => ({ p, path })).filter(({ p }) => p.kind === kind);
  const tieWin = (path) => {
    const [s1, s2] = comp.po.paths[path].steps;
    const l1 = comp.matches.find((m) => m.path === path && m.step === s1);
    const l2 = comp.matches.find((m) => m.path === path && m.step === s2);
    const ga = l2.result.home + l1.result.away;
    const gb = l2.result.away + l1.result.home;
    return ga !== gb ? (ga > gb ? l2.home : l2.away) : l2.pens.home > l2.pens.away ? l2.home : l2.away;
  };
  // Endrunde im Juni: Halbfinale offen gelost, Spiel um Platz 3, Finale.
  const four = tie('qf').map(({ path }) => tieWin(path));
  let champion = null;
  if (four.length === 4) {
    const rng = createRng(hash(c.seed ?? 0, comp.year, idHash('nl'), 33));
    const [a, b, cc, d] = shuffle(four, rng);
    const semis = [
      { step: 'sf', md: -1, g: -1, day: -1, home: a, away: b, result: null },
      { step: 'sf', md: -1, g: -1, day: -1, home: cc, away: d, result: null },
    ];
    comp.matches.push(...semis);
    for (const m of semis) quickMatch(c, comp, m);
    const win = semis.map(winnerOf);
    const lose = semis.map((m) => (winnerOf(m) === m.home ? m.away : m.home));
    const third = { step: 'p3', md: -1, g: -1, day: -1, home: lose[0], away: lose[1], result: null };
    const final = { step: 'f', md: -1, g: -1, day: -1, home: win[0], away: win[1], result: null };
    comp.matches.push(third, final);
    quickMatch(c, comp, third);
    quickMatch(c, comp, final);
    champion = winnerOf(final);
  }
  // Auf- und Abstieg.
  const L = comp.leagues.map((_, l) => leagueRows(comp, l));
  const next = comp.leagues.map((ids) => [...ids]);
  const move = (nid, from, to) => {
    next[from] = next[from].filter((x) => x !== nid);
    next[to].push(nid);
  };
  const abWin = new Set(tie('ab').map(({ path }) => tieWin(path)));
  for (const { p } of tie('ab')) {
    const [a, b] = p.semis[0];
    if (abWin.has(b)) {
      move(a, 0, 1);
      move(b, 1, 0);
    }
  }
  for (let l = 0; l + 1 < comp.leagues.length; l++) {
    const upper = L[l].tables;
    const lower = L[l + 1].tables;
    const n = Math.min(upper.length, lower.length);
    const lastPlace = Math.min(...upper.map((tb) => tb.length)) - 1;
    const down = L[l].rows.filter((r) => r.place === lastPlace).slice(-n).map((r) => r.nid);
    const up = L[l + 1].rows.filter((r) => r.place === 0).slice(0, n).map((r) => r.nid);
    for (const nid of down) move(nid, l, l + 1);
    for (const nid of up) move(nid, l + 1, l);
  }
  // Reihenfolge in den neuen Ligen: nach der Gesamtrangliste (Töpfe der nächsten Ausgabe).
  const ranking = L.flatMap((x) => x.rows.map((r) => r.nid));
  const pos = Object.fromEntries(ranking.map((nid, i) => [nid, i]));
  const winners = L.flatMap((x) => x.rows.filter((r) => r.place === 0).map((r) => r.nid));
  c.natLeague = { leagues: next.map((ids) => ids.sort((a, b) => pos[a] - pos[b])), last: { edition: comp.year, ranking, winners, champion } };
  if (champion) comp.log.push(tr(`${nlName()} ${comp.yearLabel}: Sieger ${nationName(champion)}`, `${nlName()} ${comp.yearLabel}: winners ${nationName(champion)}`));
  return { champion, promoted: comp.leagues.map((ids, l) => next[l].filter((nid) => !ids.includes(nid))) };
}

// Teilnehmer der Play-offs aus der Nationenliga: bestplatzierte Gruppensieger, dann die Gesamtrangliste; ohne passende Ausgabe null.
export function nlPlayoffPool(c, year, exclude) {
  const last = c.natLeague?.last;
  if (!last || last.edition !== year - 2) return null;
  const skip = new Set(exclude);
  return [...last.winners, ...last.ranking].filter((nid, i, a) => !skip.has(nid) && a.indexOf(nid) === i);
}
