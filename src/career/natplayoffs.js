// Play-offs der Qualifikation (ROADMAP 11.17 #14, offener Punkt „echte Play-offs", 2026-11-08). Vorher gingen die Play-off-Plätze
// einfach an die Nächstbesten der Rangliste; jetzt wird gespielt – im Format der echten Vorbilder:
//
//  - Weltmeisterschaft, Europa (Quali 2026): 12 Gruppensieger direkt; 16 Teams in 4 Pfaden, je Halbfinale und Finale in einem
//    Spiel, die Pfadsieger fahren hin. Teilnehmer wie echt: 12 Gruppenzweite + die bestplatzierten Gruppensieger der Nationenliga
//    der Saison davor (natleague.js), die nicht schon über die Gruppe dabei sind, danach deren Gesamtrangliste. Gibt es keine
//    passende Nationenliga (erste Qualifikation einer Karriere, alter Spielstand), gehen die Plätze an die besten Gruppendritten (Spielwert).
//    Lostöpfe: echt die Zweiten nach Weltrangliste vor den Teams der Nations League, hier die Zweiten nach der
//    Qualifikations-Rangliste vor den Teams der Nationenliga (Spielwert). Halbfinale: Topf 1 gegen 4, Topf 2 gegen 3, die besser
//    Gesetzten zu Hause; Heimrecht im Finale wird gelost.
//  - Europameisterschaft (Quali 2028): 12 Gruppensieger und 8 beste Zweite direkt, dann bis zu 2 reservierte Gastgeberplätze für
//    die bestplatzierten Gastgeber, die es nicht direkt geschafft haben. Übrige Plätze über Play-offs: je Platz ein Pfad mit
//    4 Teams (Halbfinale und Finale in einem Spiel); bleiben 4 Plätze (kein Gastgeberplatz gebraucht), 8 Teams in 4 Duellen mit
//    Hin- und Rückspiel. Teilnehmer wie echt: übrige Zweite + Gruppensieger der Nationenliga (wie oben, ohne sie beste Dritte).
//    Andere Ausgaben (2032): dieselbe Regel (Spielwert, das echte Format steht noch nicht fest).
//  - Weltmeisterschaft, interkontinentale Play-offs (2026): 6 Teams – je eins aus Asien, Afrika, Südamerika, Ozeanien, zwei aus
//    Nord- und Mittelamerika (Verband des Gastgebers). Die zwei Stärksten (echt: Weltrangliste) stehen gesetzt im Finale, die
//    anderen vier losen zwei Halbfinals aus; alles in einem Spiel auf neutralem Platz, die zwei Pfadsieger fahren hin. Teilnehmer
//    je Verband: über die eigenen Ausscheidungen wie 2026 (natelim.js). Für spätere
//    Weltmeisterschaften gilt dasselbe Format (Spielwert).
//  - Rückspiel: Bei Gleichstand im Gesamtergebnis entscheidet gleich das Elfmeterschießen (keine Auswärtstorregel, wie seit 2021;
//    die Verlängerung ist hier vereinfacht weggelassen).
// Quellen: Europäischer Verband (Qualifikationssystem EM 2028, 2025), Weltverband (Play-off-Turnier 2026), Wikipedia
// („2026 FIFA World Cup qualification (UEFA)", „… inter-confederation play-offs").
import { createRng } from '../core/rng.js';
import { nlPlayoffPool } from './natleague.js';
import { byPerGame, hash, idHash, quickMatch, quickPens, targetOf, winnerOf } from './nationalteams.js';

// seconds: wie viele der besten Gruppenzweiten direkt weiter sind; fourTies: bei 4 offenen Plätzen Hin- und Rückspiel.
export const PLAYOFFS = {
  wm: { uefa: { seconds: 0, fourTies: false } },
  em: { uefa: { seconds: 8, fourTies: true } },
};
// Interkontinentale Play-offs: Teilnehmer je Verband und Plätze.
export const INTER = { wm: { from: { afc: 1, caf: 1, conmebol: 1, ofc: 1, concacaf: 2 }, places: 2 } };

const ranked = (tables, place) =>
  tables
    .map((tb) => tb[place])
    .filter(Boolean)
    .sort(byPerGame)
    .map((r) => r.nid);
// Rangliste eines Verbands: alle Ersten (je Spiel), dann alle Zweiten …
export function rankAll(tables) {
  const out = [];
  for (let p = 0; p < 8; p++) out.push(...ranked(tables, p));
  return out;
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Auslosung der Play-offs eines Verbands nach den Gruppentabellen. null = keine Play-offs (Regel fehlt).
// direct: ohne Play-off weiter; paths: [{ semis: [[heim, gast], …], seed, legs }].
export function playoffDraw(c, id, year, conf, tables, setup) {
  const rule = PLAYOFFS[id]?.[conf];
  if (!rule || !tables) return null;
  const order = rankAll(tables);
  const direct = [...ranked(tables, 0), ...ranked(tables, 1).slice(0, rule.seconds)];
  const hosts = order.filter((nid) => setup.reserved.includes(nid) && !direct.includes(nid)).slice(0, setup.reservedSlots ?? 0);
  direct.push(...hosts);
  const k = setup.places - direct.length;
  // Teilnehmer: übrige Gruppenzweite, dann die Nationenliga der Saison davor (natleague.js); ohne sie die nächsten der Rangliste.
  const seconds = ranked(tables, 1).filter((nid) => !direct.includes(nid));
  const nl = nlPlayoffPool(c, year, [...direct, ...seconds, ...setup.auto ?? []]);
  const pool = nl ? [...seconds, ...nl.filter((nid) => order.includes(nid))] : order.filter((nid) => !direct.includes(nid));
  if (k <= 0) return { direct: direct.slice(0, setup.places), paths: [] };
  const rng = createRng(hash(c.seed ?? 0, year, idHash(id), idHash(conf), 21));
  if (rule.fourTies && k === 4 && pool.length >= 8) {
    const seeded = shuffle(pool.slice(0, 4), rng);
    const other = shuffle(pool.slice(4, 8), rng);
    return { direct, paths: seeded.map((a, i) => ({ semis: [[a, other[i]]], seed: null, legs: 2 })) };
  }
  if (pool.length < 4 * k) return { direct: [...direct, ...pool.slice(0, k)], paths: [] }; // zu wenige Länder: Nächstbeste
  const pots = [0, 1, 2, 3].map((p) => shuffle(pool.slice(p * k, p * k + k), rng));
  const paths = pots[0].map((_, i) => ({
    semis: [
      [pots[0][i], pots[3][i]],
      [pots[1][i], pots[2][i]],
    ],
    seed: null,
    legs: 1,
  }));
  return { direct, paths };
}

// Interkontinentale Play-offs: die zwei Stärksten gesetzt im Finale, die übrigen losen die Halbfinals aus.
export function interDraw(c, id, year, teams) {
  const str = Object.fromEntries(teams.map((nid) => [nid, targetOf(c, year, nid)]));
  const sorted = [...teams].sort((a, b) => str[b] - str[a]);
  const places = INTER[id].places;
  if (teams.length < places * 3) return { direct: sorted.slice(0, places), paths: [], str };
  const rest = shuffle(sorted.slice(places), createRng(hash(c.seed ?? 0, year, idHash(id), 22)));
  const paths = sorted.slice(0, places).map((seed, i) => ({ semis: [[rest[2 * i], rest[2 * i + 1]]], seed, legs: 1 }));
  return { direct: [], paths, str };
}

// Spiele anlegen: Halbfinals bzw. Hin- und Rückspiel; Finals kommen mit advancePlayoffs, sobald die Halbfinals gespielt sind.
// days: [Termin 1, Termin 2] im Länderspielkalender (natquali.js), [-1, -1] = ohne Fenster (beim Turnierstart gerechnet).
export function schedulePlayoffs(comp, draw, days) {
  comp.po = { direct: draw.direct, paths: draw.paths, days };
  draw.paths.forEach((p, path) => {
    if (p.legs === 2) {
      const [a, b] = p.semis[0];
      const [s1, s2] = p.steps ?? ['l1', 'l2'];
      comp.matches.push({ step: s1, path, md: -1, g: -1, day: days[0], home: b, away: a, result: null });
      comp.matches.push({ step: s2, path, md: -1, g: -1, day: days[1], home: a, away: b, result: null });
    } else for (const [home, away] of p.semis) comp.matches.push({ step: 'p1', path, md: -1, g: -1, day: days[0], home, away, result: null });
  });
}

const legs = (comp, path) => {
  const [s1, s2] = comp.po.paths[path].steps ?? ['l1', 'l2'];
  return [comp.matches.find((m) => m.path === path && m.step === s1), comp.matches.find((m) => m.path === path && m.step === s2)];
};
function tieWinner(l1, l2) {
  const a = l2.home;
  const b = l2.away;
  const ga = l2.result.home + l1.result.away;
  const gb = l2.result.away + l1.result.home;
  if (ga !== gb) return ga > gb ? a : b;
  return l2.pens.home > l2.pens.away ? a : b;
}

// Nach gespielten Halbfinals das Finale anlegen; Rückspiel mit Gleichstand im Gesamtergebnis: Elfmeterschießen. true = etwas neu.
export function advancePlayoffs(c, comp) {
  const po = comp.po;
  if (!po) return false;
  let changed = false;
  po.paths.forEach((p, path) => {
    if (p.legs === 2) {
      const [l1, l2] = legs(comp, path);
      if (l1.result && l2.result && !l2.pens && l2.result.home + l1.result.away === l2.result.away + l1.result.home) {
        l2.pens = quickPens(createRng(hash(c.seed ?? 0, comp.year, idHash(comp.key), path, 24)), comp.str[l2.home], comp.str[l2.away]);
        if (comp.own?.[l2.home]?.length || comp.own?.[l2.away]?.length) comp.log.push(`Play-off: ${l2.pens.home}:${l2.pens.away} i. E.`);
        changed = true;
      }
      return;
    }
    if (comp.matches.some((m) => m.path === path && m.step === 'p2')) return;
    const semis = comp.matches.filter((m) => m.path === path && m.step === 'p1');
    if (semis.some((m) => !m.result)) return;
    const ws = semis.map(winnerOf);
    let [home, away] = p.seed ? [p.seed, ws[0]] : ws;
    if (!p.seed && createRng(hash(c.seed ?? 0, comp.year, idHash(comp.key), path, 23)).chance(0.5)) [home, away] = [away, home]; // Heimrecht gelost
    comp.matches.push({ step: 'p2', path, md: -1, g: -1, day: po.days[1], home, away, result: null });
    changed = true;
  });
  return changed;
}

// Pfadsieger; null, solange etwas offen ist.
export function playoffWinners(comp) {
  const po = comp.po;
  if (!po) return null;
  const out = [];
  for (const [path, p] of po.paths.entries()) {
    if (p.legs === 2) {
      const [l1, l2] = legs(comp, path);
      if (!l1.result || !l2.result || (!l2.pens && l2.result.home + l1.result.away === l2.result.away + l1.result.home)) return null;
      out.push(tieWinner(l1, l2));
    } else {
      const f = comp.matches.find((m) => m.path === path && m.step === 'p2');
      if (!f?.result) return null;
      out.push(winnerOf(f));
    }
  }
  return out;
}

// Alles Offene im Schnellmodell zu Ende spielen und die Qualifizierten liefern (direkt + Pfadsieger).
export function finishPlayoffs(c, comp) {
  for (let guard = 0; guard < 8; guard++) {
    for (const m of comp.matches) if (m.g === -1 && !m.result) quickMatch(c, comp, m);
    if (!advancePlayoffs(c, comp)) break;
  }
  return [...comp.po.direct, ...(playoffWinners(comp) ?? [])];
}

// Ohne Fenster (Variante 1 oder zu kurze Saison): Play-offs auf einen Schlag in einem Hilfsobjekt.
export function quickPlayoffs(c, key, year, draw, str) {
  const comp = { key, year, str, target: str, own: {}, stats: {}, matches: [], log: [] };
  schedulePlayoffs(comp, draw, [-1, -1]);
  return finishPlayoffs(c, comp);
}

// Teams im Play-off eines Wettbewerbs (für die Nominierung eigener Spieler).
export const playoffTeams = (comp) => (comp.po ? comp.po.paths.flatMap((p) => [...p.semis.flat(), ...(p.seed ? [p.seed] : [])]) : []);
