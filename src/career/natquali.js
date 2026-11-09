// Qualifikation der Nationalteams, Variante 2 (ROADMAP 11.17 #14, vom Nutzer auf die Roadmap gesetzt 2026-11-06; „mach einfach
// weiter" 2026-11-08): über die Saison verteilt in Länderspielfenstern zwischen zwei Spieltagen – die Liga ruht, kein Ligaspiel
// fällt aus. Variante 1 (nationalteams.js makeField: alles auf einen Schlag beim Turnierstart) bleibt für alte Spielstände, die
// mitten in der Saison stehen, und für Turniere, deren Fenster schon vorbei sind.
//
// Fenster wie im Kalender des Weltverbands 2026–2030 (FIFA-Rat, Männer): September/Oktober zusammen mit bis zu vier Spielen,
// November und März mit je zwei; Juni liegt nach der Saison (Turniervorbereitung) und zählt hier nicht. Im gestauchten
// Spielkalender (weather.js monthOf) liegt jedes Fenster vor dem ersten Spieltag seines Monats bzw. (März) vor dem zweiten
// Spieltag nach der Winterpause – Spielwert. Wintermeisterschaften (Afrika, Asien) nutzen nur die Fenster vor der Winterpause.
//
// Gruppen, Lostöpfe und Plätze wie in Variante 1 (nationalteams.js qualiSetup), jetzt mit Hin- und Rückspiel nach Spielplan
// (Rundenturnier, Kreisverfahren). Mehr Spieltage als Termine (große Gruppen, Südamerika): mehrere Spieltage an einem Termin.
// Gastgeber: wo bekannt automatisch dabei (HOSTS), die Europameisterschaft 2028 mit zwei reservierten Plätzen wie in echt.
// Nationenliga (natleague.js): in den Saisons ohne europäische Qualifikation, Ligaphase im Herbst, K.-o.-Spiele im März.
// Play-offs (natplayoffs.js): an den letzten zwei Terminen (März, wie in echt), die Gruppen davor. Halbfinal-Paarungen stehen erst
// nach den Gruppen fest, die Finals nach den Halbfinals; ohne genug Termine werden sie beim Turnierstart gerechnet.
//
// Eigene Spieler (nur Profiligen, wie bei den Turnieren): nominiert nach Land und Stärke. Ihre Spiele stehen als Karte im
// Vereinsheim (im Stadion ansehen, nur Ergebnis, Rest vorspulen); was offen bleibt, rechnet die nächste Woche. Kosten: etwas
// Müdigkeit und Verletzungsrisiko je Spiel, ein kleiner Schub auf den Marktwert am Saisonende.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { NATIONS } from '../data/nations.js';
import { humanClub, playerOf, winterRound } from './career.js';
import { adjustFitness, MATCH_COST } from './fitness.js';
import { book } from './finances.js';
import { INJURIES, INJURY_BASE } from './injuries.js';
import { isCoach } from './personal.js';
import { monthOf } from './weather.js';
import { hash, idHash, lineupFrom, NAT, nationName, nationOf, qualifiedFrom, qualiSetup, quickMatch, squadOf, TOURNAMENTS, tournamentName, yearFor } from './nationalteams.js';
import { confElim } from './natelim.js';
import { applyCoach } from './natcoach.js';
import { leagueName, nlName, nlPrepare, nlSeasonEnd, planLeague } from './natleague.js';
import { advancePlayoffs, finishPlayoffs, INTER, interDraw, PLAYOFFS, playoffDraw, playoffTeams, rankAll, schedulePlayoffs } from './natplayoffs.js';

// Fenster: Monate im Spielkalender und Zahl der Termine (Kalender 2026–2030: Sep./Okt. 4 Spiele, Nov. 2, März 2).
export const WINDOWS = [
  { months: [9, 10], days: 4 },
  { months: [11], days: 2 },
  { months: [3], days: 2 },
];

// Gastgeber (Quellen: Weltverband 2024 für 2030 und 2034, Kontinentalverbände). auto = ohne Qualifikation dabei.
// Europameisterschaft 2028: Die vier Gastgeber müssen sich qualifizieren, zwei Plätze sind für sie reserviert (Europäischer Verband
// 2025). Weltmeisterschaft 2030: alle sechs Gastgeber automatisch (auch die drei der Jubiläumsspiele in Südamerika).
// Unbekannte Ausgaben: kein Gastgeber (nichts erfunden).
export const HOSTS = {
  wm: { 2026: { auto: ['usa', 'mex', 'can'] }, 2030: { auto: ['esp', 'por', 'mar', 'arg', 'uru', 'par'] }, 2034: { auto: ['ksa'] } },
  em: { 2028: { auto: [], reserved: ['eng', 'sco', 'wal', 'irl'], slots: 2 }, 2032: { auto: ['ita', 'tur'] } },
  afr: { 2025: { auto: ['mar'] }, 2027: { auto: ['ken', 'uga', 'tan'] } },
  asi: { 2027: { auto: ['ksa'] } },
};
export function hostsOf(id, year) {
  const h = HOSTS[id]?.[year];
  return { auto: (h?.auto ?? []).filter((nid) => NATIONS[nid]), reserved: (h?.reserved ?? []).filter((nid) => NATIONS[nid]), slots: h?.slots ?? 0 };
}

// Spielwerte für die Kosten und den Nutzen eines Länderspiels.
export const QUALI = {
  fatigueMax: 0.15, // höchstens so viel Fitness kostet ein Fenster (ein Spiel = MATCH_COST wie im Turnier)
  injuryMul: 1, // Verletzungsrisiko je Spiel wie im Ligaspiel (injuries.js INJURY_BASE)
  boost: { app: 0.005, goal: 0.01, max: 0.08 }, // Marktwert: ein Viertel der Turnierwerte (NAT.boost), Spielwert
  // Abstellungsgebühr je abgestelltem Spieler und Spiel: Europäischer Verband 3659 € für Qualifikation und Nations League
  // (Zyklus 2020–24, fester Satz), Weltverband 2362 US-Dollar für die WM-Qualifikation (erstmals für 2026, im Spiel 2362 €,
  // hergeleitet wie bei der Turnier-Entschädigung). In der europäischen WM-Qualifikation zahlen beide.
  release: { uefa: 3659, wm: 2362 },
};

// --- Termine ---------------------------------------------------------------------------------------------------------------
// Spieltag (Runde), vor dem ein Fenster liegt; null, wenn die Saison zu kurz ist (dann gehen die Termine ans vorige Fenster).
export function windowRounds(c) {
  const n = c.fixtures?.length ?? 0;
  const half = winterRound(c);
  const month = (r) => monthOf(c, r);
  const out = [];
  let from = 1;
  for (const [wi, w] of WINDOWS.entries()) {
    let r = null;
    if (wi < 2) {
      // Herbst: erster Spieltag ab dem Monat des Fensters (Okt. bzw. Nov.), vor der Winterpause.
      const want = wi === 0 ? 10 : 11;
      for (let k = from; k < half; k++) if (month(k) >= want) { r = k; break; }
      if (r == null && from < half) r = from;
    } else {
      // März: vor dem zweiten Spieltag nach der Winterpause.
      r = half + 1 < n ? half + 1 : null;
    }
    out.push(r == null ? null : { round: r, days: w.days });
    if (r != null) from = r + 1;
  }
  // Zu kurze Saison: Termine eines fehlenden Fensters gehen ans vorige.
  for (let i = out.length - 1; i > 0; i--) if (!out[i] && out[i - 1]) out[i - 1].days += WINDOWS[i].days;
  return out.filter(Boolean);
}

// Doppelrunde nach dem Kreisverfahren: Liste von Spieltagen mit [heim, auswärts]; ungerade Gruppen mit spielfreiem Team.
export function roundRobin(ids) {
  const list = ids.length % 2 ? [...ids, null] : [...ids];
  const k = list.length;
  const first = [];
  for (let r = 0; r < k - 1; r++) {
    const day = [];
    for (let i = 0; i < k / 2; i++) {
      const a = list[i];
      const b = list[k - 1 - i];
      if (a && b) day.push(r % 2 ? [b, a] : [a, b]);
    }
    first.push(day);
    list.splice(1, 0, list.pop()); // drehen, das erste Team bleibt stehen
  }
  return [...first, ...first.map((day) => day.map(([h, a]) => [a, h]))];
}

// --- Über zwei Saisons (Europa) ---------------------------------------------------------------------------------------------
// Wie die echte EM-Qualifikation 2028 (Europäischer Verband; Wikipedia „UEFA Euro 2028 qualifying“): Gruppenphase von März 2027
// bis November 2027 – Spieltage 1–2 im März, 3–4 im Juni, 5–8 im September/Oktober, 9–10 im November –, Play-offs im März 2028.
// Im März spielen nur die Gruppen ohne Viertelfinalisten der Nations League (echt: die Fünfergruppen; die Viertelfinalisten
// werden in Vierergruppen gelost, die erst im Juni beginnen). Im Spiel: Die Gruppen starten im März der Saison davor, der Juni
// liegt nach der Saison und wird beim Saisonende gerechnet, der Rest folgt in den Pausen der nächsten Saison. Gruppen mit einem
// Viertelfinalisten der Nationenliga beginnen im Juni (Spielwert: das Spiel hat Dreier- und Vierergruppen, nicht Vierer und
// Fünfer). Weltmeisterschaft, Europa: dasselbe (die WM-Qualifikation 2026 lief ebenfalls über ein Kalenderjahr; das Format ab 2028
// ist noch nicht veröffentlicht, Spielwert). Alte Spielstände und die übrigen Verbände: wie bisher in einer Saison.
export const TWO_SEASON = { em: ['uefa'], wm: ['uefa'] };
const SLOTS = ['M1', 'M2', 'J1', 'J2', 'S1', 'S2', 'S3', 'S4', 'N1', 'N2'];
const LATE = ['S1', 'S2', 'S3', 'S4', 'N1', 'N2'];
const due = (cfg, year) => (((year - cfg.anchor) % cfg.every) + cfg.every) % cfg.every === 0;

// Gruppen auslosen und Spieltage anlegen, die Termine folgen im März (slotEarly).
function earlyComp(c, id, year, conf, march) {
  const setup = qualiSetup(c, id, year, conf);
  if (!setup.groups) return null;
  const matches = [];
  setup.groups.forEach((g, gi) =>
    roundRobin(g).forEach((day, md) => {
      for (const [home, away] of day) matches.push({ step: `q${md + 1}`, md, day: null, slot: null, g: gi, home, away, result: null });
    }),
  );
  return { key: `${id}-${year}-${conf}`, isQuali: true, early: true, id, year, conf, groups: setup.groups, target: setup.str, str: { ...setup.str }, own: {}, stats: {}, matches, log: [], poDays: null, march };
}
// Spieltage auf die echten Termine verteilen; Gruppen mit einem Viertelfinalisten (qf) oder ohne März-Fenster beginnen im Juni.
function slotEarly(comp, qf) {
  if (comp.slotted) return;
  comp.slotted = true;
  comp.groups.forEach((g, gi) => {
    const list = comp.march && !g.some((nid) => qf.has(nid)) ? SLOTS : SLOTS.slice(2);
    const ms = comp.matches.filter((m) => m.g === gi);
    const M = Math.max(...ms.map((m) => m.md)) + 1;
    for (const m of ms) {
      m.slot = list[Math.floor((m.md * list.length) / M)];
      m.day = m.slot === 'M1' ? comp.march[0] : m.slot === 'M2' ? comp.march[1] : null;
    }
  });
}
// Neue Saison: die übernommene Qualifikation bekommt ihre Termine im Herbst und die Play-offs im März.
function lateComp(comp, days) {
  const poDays = days.length >= 4 ? days.slice(-2) : null;
  const gDays = poDays ? days.slice(0, -2) : days;
  for (const m of comp.matches) {
    if (m.result) {
      m.day = -1; // in der Vorsaison gespielt (März, Juni)
      continue;
    }
    const k = LATE.indexOf(m.slot);
    m.day = gDays[Math.floor((Math.max(0, k) * gDays.length) / LATE.length)];
  }
  comp.poDays = poDays && PLAYOFFS[comp.id]?.[comp.conf] ? poDays : null;
  delete comp.early;
  delete comp.march;
  return comp;
}

// --- Saisonplan --------------------------------------------------------------------------------------------------------------
export const qualiComp = (c, key) => c.natQuali?.comps.find((x) => x.key === key) ?? null;

// Zu Saisonbeginn: Fenster und alle Qualifikationen der Turniere dieser Saison (Winter) und des Sommers danach.
export function planQuali(c) {
  const windows = windowRounds(c);
  const q = { season: c.season ?? 1, windows, comps: [], open: null };
  const dayWin = windows.flatMap((w, wi) => Array.from({ length: w.days }, () => wi));
  const half = winterRound(c);
  const carry = c.natQualiCarry ?? [];
  delete c.natQualiCarry;
  const marchWi = windows.findIndex((w) => w.round >= half);
  const march = marchWi >= 0 && windows[marchWi].days >= 2 ? dayWin.map((wi, d) => (wi === marchWi ? d : null)).filter((d) => d != null).slice(-2) : null;
  for (const [id, cfg] of Object.entries(TOURNAMENTS)) {
    const year = yearFor(c, cfg);
    // Über zwei Saisons: die Qualifikation zum Turnier des übernächsten Sommers beginnt im März dieser Saison.
    if (TWO_SEASON[id] && due(cfg, year + 1)) for (const conf of TWO_SEASON[id]) {
      const comp = earlyComp(c, id, year + 1, conf, march);
      if (comp) q.comps.push(comp);
    }
    if (!due(cfg, year)) continue;
    // Wintermeisterschaft: nur Termine vor der Winterpause.
    const days = dayWin.map((wi, d) => (cfg.when === 'winter' && windows[wi].round >= half ? null : d)).filter((d) => d != null);
    if (!days.length) continue;
    const poDays = days.length >= 4 ? days.slice(-2) : null;
    for (const conf of Object.keys(cfg.slots)) {
      const po = poDays && (INTER[id] || PLAYOFFS[id]?.[conf]); // interkontinental: alle Gruppen vor den Play-offs fertig
      const gDays = po ? days.slice(0, -2) : days;
      const key = `${id}-${year}-${conf}`;
      const kept = carry.find((x) => x.key === key);
      if (kept) {
        q.comps.push(lateComp(kept, days));
        continue;
      }
      const setup = qualiSetup(c, id, year, conf);
      if (!setup.groups) continue;
      const rounds = setup.groups.map((g) => roundRobin(g));
      const M = Math.max(...rounds.map((r) => r.length));
      const matches = [];
      rounds.forEach((list, g) =>
        list.forEach((day, md) => {
          for (const [home, away] of day) matches.push({ step: `q${md + 1}`, md, day: gDays[Math.floor((md * gDays.length) / M)], g, home, away, result: null });
        }),
      );
      q.comps.push({ key, isQuali: true, id, year, conf, groups: setup.groups, target: setup.str, str: { ...setup.str }, own: {}, stats: {}, matches, log: [], poDays: po && PLAYOFFS[id]?.[conf] ? poDays : null });
    }
    if (INTER[id] && poDays) q.comps.push({ key: `${id}-${year}-inter`, isQuali: true, id, year, conf: 'inter', groups: [], target: {}, str: {}, own: {}, stats: {}, matches: [], log: [], poDays });
  }
  // Nationenliga (natleague.js): in den Saisons ohne europäische Qualifikation, alle Termine.
  const nl = planLeague(c, yearFor(c, { from: [9] }), dayWin.map((_, d) => d));
  if (nl) q.comps.push(nl);
  c.natQuali = q;
  return q;
}

// Tabelle einer Gruppe (wie Variante 1: Punkte, Tordifferenz, Tore, dann Stärke).
export function qualiTable(comp, g) {
  const rows = Object.fromEntries(comp.groups[g].map((nid) => [nid, { nid, p: 0, pts: 0, gf: 0, ga: 0 }]));
  for (const m of comp.matches) {
    if (m.g !== g || !m.result) continue; // Play-off-Spiele haben g = -1
    const H = rows[m.home];
    const A = rows[m.away];
    H.p++;
    A.p++;
    H.gf += m.result.home;
    H.ga += m.result.away;
    A.gf += m.result.away;
    A.ga += m.result.home;
    if (m.result.home > m.result.away) H.pts += 3;
    else if (m.result.home < m.result.away) A.pts += 3;
    else {
      H.pts++;
      A.pts++;
    }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || comp.str[y.nid] - comp.str[x.nid]);
}

// Für den Turnierstart (nationalteams.js makeField): die gespielten Tabellen; offene Spiele werden jetzt gerechnet. null = keine
// Qualifikation in Fenstern (alter Spielstand oder andere Saison) – dann Variante 1.
export function qualiTables(c, id, year, conf) {
  const comp = qualiComp(c, `${id}-${year}-${conf}`);
  if (!comp || comp.early) return null; // über zwei Saisons: erst in der Saison des Turniers
  for (const m of comp.matches) if (m.g >= 0 && !m.result) quickMatch(c, comp, m);
  return comp.groups.map((_, g) => qualiTable(comp, g));
}

// Für den Turnierstart: Tabellen und Qualifizierte mit Play-offs (Offenes im Schnellmodell). qualified null = ohne Play-off-Regel.
export function qualiOutcome(c, id, year, conf, setup) {
  const comp = qualiComp(c, `${id}-${year}-${conf}`);
  if (!comp || comp.early) return null;
  const tables = qualiTables(c, id, year, conf);
  if (!comp.po) {
    const draw = playoffDraw(c, id, year, conf, tables, setup);
    if (!draw) return { tables, qualified: null };
    schedulePlayoffs(comp, draw, [-1, -1]);
  }
  return { tables, qualified: finishPlayoffs(c, comp) };
}

// Interkontinentale Play-offs aus dem Saisonplan; null = nicht in Fenstern geplant.
export function interOutcome(c, id, year, teams) {
  const comp = qualiComp(c, `${id}-${year}-inter`);
  if (!comp) return null;
  if (!comp.po) setupInter(c, comp, teams, [-1, -1]);
  return comp.po.paths.length ? finishPlayoffs(c, comp) : comp.po.direct;
}
function setupInter(c, comp, teams, days) {
  const d = interDraw(c, comp.id, comp.year, teams);
  Object.assign(comp.str, d.str);
  Object.assign(comp.target, d.str);
  schedulePlayoffs(comp, d, days);
}
// Teilnehmer der interkontinentalen Play-offs: je Verband die Nächstbesten hinter den Qualifizierten.
function interTeams(c, id, year) {
  return Object.entries(INTER[id].from).flatMap(([conf, n]) => {
    const setup = qualiSetup(c, id, year, conf);
    if (!setup.groups) return setup.direct.slice(setup.places, setup.places + n);
    const tables = qualiTables(c, id, year, conf);
    if (!tables) return [];
    const elim = confElim(c, id, year, conf, tables, setup); // eigene Ausscheidung des Verbands (natelim.js)
    if (elim) return elim.entrants.slice(0, n);
    const qualified = qualifiedFrom(tables, setup.places, setup.reserved, setup.reservedSlots);
    return rankAll(tables)
      .filter((nid) => !qualified.includes(nid))
      .slice(0, n);
  });
}
// Fenster mit Play-off-Terminen: Paarungen auslosen, sobald die Gruppen fertig sind.
function preparePlayoffs(c, q, days) {
  for (const comp of q.comps) {
    if (comp.po || !comp.poDays || !days.has(comp.poDays[0])) continue;
    if (comp.nl) {
      nlPrepare(c, comp, comp.poDays);
      continue;
    }
    if (comp.conf === 'inter') {
      setupInter(c, comp, interTeams(c, comp.id, comp.year), comp.poDays);
      continue;
    }
    const draw = playoffDraw(c, comp.id, comp.year, comp.conf, qualiTables(c, comp.id, comp.year, comp.conf), qualiSetup(c, comp.id, comp.year, comp.conf));
    if (draw) schedulePlayoffs(comp, draw, comp.poDays);
  }
}
// Spiele ohne eigene Spieler im Fenster gleich als Ergebnis; Finals entstehen, sobald die Halbfinals gespielt sind.
function settleOthers(c, comp, days) {
  for (let guard = 0; guard < 8; guard++) {
    for (const m of comp.matches) if (days.has(m.day) && !m.result && !isOwn(comp, m)) quickMatch(c, comp, m);
    if (!advancePlayoffs(c, comp)) break;
  }
}
// Nach einem eigenen Spiel (ansehen oder Ergebnis): Play-off weiterschalten, Spiele ohne eigene Spieler rechnen.
export function qualiAfter(c, comp) {
  const q = c.natQuali;
  if (q?.open == null) advancePlayoffs(c, comp);
  else settleOthers(c, comp, new Set(windowDays(q, q.openWin)));
}

// --- Fenster -----------------------------------------------------------------------------------------------------------------
const proNow = (c) => !!c.pro && (c.level ?? 1) >= NAT.proFrom;
const windowDays = (q, wi) => {
  let d = 0;
  for (let i = 0; i < wi; i++) d += q.windows[i].days;
  return Array.from({ length: q.windows[wi].days }, (_, k) => d + k);
};
const isOwn = (comp, m) => !!(comp.own[m.home]?.length || comp.own[m.away]?.length) || (!!comp.coach && (m.home === comp.coach || m.away === comp.coach)); // eigene Spieler oder Nationaltrainer

// Wochenbeginn (Hook startWeek): neue Saison planen, ein offenes Fenster der Vorwoche abschließen, ein neues öffnen.
export function qualiWeek(c) {
  if (!c.fixtures?.length) return;
  let q = c.natQuali;
  if (!q || q.season !== (c.season ?? 1)) {
    qualiSeasonEnd(c);
    const first = windowRounds(c)[0];
    if (!first || c.round > first.round) return; // alter Spielstand mitten in der Saison: Variante 1
    q = planQuali(c);
  }
  if (q.open != null && q.open !== c.round) closeWindow(c);
  const wi = q.windows.findIndex((w) => w.round === c.round);
  if (wi < 0 || q.open === c.round || (q.played ?? -1) >= wi) return;
  openWindow(c, wi);
}

function openWindow(c, wi) {
  const q = c.natQuali;
  q.open = c.round;
  q.openWin = wi;
  const days = new Set(windowDays(q, wi));
  preparePlayoffs(c, q, days);
  // Über zwei Saisons: im März die Termine festlegen, sobald die Viertelfinalisten der Nationenliga feststehen.
  const nl = q.comps.find((x) => x.nl);
  const qf = new Set((nl?.po?.paths ?? []).filter((p) => p.kind === 'qf').flatMap((p) => p.semis.flat()));
  for (const comp of q.comps) if (comp.early && comp.march && days.has(comp.march[0])) slotEarly(comp, qf);
  const club = humanClub(c);
  const games = {}; // eigene Spieler: Spiele in diesem Fenster
  for (const comp of q.comps) {
    comp.own = {};
    const nations = new Set([...comp.groups.flat(), ...playoffTeams(comp)]);
    if (proNow(c)) {
      for (const idx of club.squad) {
        const rec = c.players[idx];
        if (!rec || isCoach(c, idx) || (rec.injuryWeeks ?? 0) > 0 || (rec.awayWeeks ?? 0) > 0) continue;
        const nid = nationOf(c, idx);
        if (!nations.has(nid) || playerOf(c, idx).rating < comp.str[nid] - NAT.nominate) continue;
        (comp.own[nid] ??= []).push(idx);
      }
      for (const [nid, list] of Object.entries(comp.own)) {
        comp.own[nid] = list.sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating).slice(0, NAT.squad);
        for (const idx of comp.own[nid]) {
          (c.natLock ??= {})[idx] = nid;
          comp.stats[idx] ??= { apps: 0, goals: 0, nat: nid };
        }
      }
    }
    applyCoach(c, comp, nations); // Nationaltrainer: das eigene Land mit der eigenen Auswahl (natcoach.js)
    for (const m of comp.matches) if (days.has(m.day) && !m.result && isOwn(comp, m)) for (const nid of [m.home, m.away]) if (comp.own[nid]) games[nid] = (games[nid] ?? 0) + 1;
    // Play-off-Finale noch offen: als mögliches Spiel mitzählen (Müdigkeit).
    for (const p of comp.po?.paths ?? []) if (p.legs === 1 && days.has(comp.po.days[1])) for (const nid of new Set([...p.semis.flat(), p.seed].filter(Boolean))) if (comp.own[nid]) games[nid] = (games[nid] ?? 0) + 1;
  }
  // Abstellungsgebühr für die Eigenen (alle Nominierten, je Spiel ihres Landes in diesem Fenster).
  let fee = 0;
  for (const comp of q.comps) {
    const rate = (comp.conf === 'uefa' ? QUALI.release.uefa : 0) + (comp.id === 'wm' ? QUALI.release.wm : 0);
    for (const [nid, list] of Object.entries(comp.own)) fee += rate * (games[nid] ?? 0) * list.length;
  }
  if (fee && c.ledger) book(c, tr('Abstellungsgebühren Länderspielpause', 'Release fees, international break'), fee);
  // Kosten für die Eigenen in der Startelf ihres Landes: Müdigkeit und Verletzungsrisiko je Spiel.
  const rng = createRng(hash(c.seed ?? 0, c.season ?? 1, c.round, 61));
  const away = [];
  for (const comp of q.comps) {
    for (const [nid, list] of Object.entries(comp.own)) {
      const n = games[nid] ?? 0;
      if (!n) continue;
      const xi = new Set(lineupFrom(squadOf(c, comp, nid)).xi.filter((p) => p.own).map((p) => p.poolIndex));
      for (const idx of list) {
        away.push(`${playerOf(c, idx).name} (${nationName(nid)}, ${n} ${n === 1 ? tr('Spiel', 'game') : tr('Spiele', 'games')})`);
        if (!xi.has(idx)) continue;
        adjustFitness(c, idx, -Math.min(QUALI.fatigueMax, MATCH_COST * n));
        for (let k = 0; k < n; k++) {
          if (!rng.chance(INJURY_BASE * QUALI.injuryMul)) continue;
          const types = Object.entries(INJURIES).filter(([, d]) => d.weeks[1] <= 5); // kleine bis mittlere Verletzungen
          const [type, def] = types[rng.int(0, types.length - 1)];
          const weeks = rng.int(def.weeks[0], def.weeks[1]);
          const rec = c.players[idx];
          rec.injuryWeeks = Math.max(rec.injuryWeeks ?? 0, weeks);
          rec.injury = { type, label: def.label, weeks };
          if (c.week?.availability) c.week.availability[idx] = 'no';
          note(c, tr(`Verletzt von der Nationalmannschaft zurück: ${playerOf(c, idx).name} (${def.label}, ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}).`, `Back injured from international duty: ${playerOf(c, idx).name} (${def.label}, ${weeks} ${weeks === 1 ? 'week' : 'weeks'}).`));
          comp.own[nid] = comp.own[nid].filter((x) => x !== idx);
          break;
        }
      }
    }
  }
  // Wer verletzt ausfällt, macht ein Spiel ohne eigene Spieler daraus: gleich als Ergebnis.
  for (const comp of q.comps) settleOthers(c, comp, days);
  const feeText = fee && c.ledger ? tr(` Abstellungsgebühren: ${fee.toLocaleString('de-DE')} €.`, ` Release fees: €${fee.toLocaleString('en-GB')}.`) : '';
  if (away.length) note(c, tr(`Länderspielpause: unterwegs sind ${[...new Set(away)].join(', ')}. Die Spiele stehen im Vereinsheim.${feeText}`, `International break: away are ${[...new Set(away)].join(', ')}. The games are in the clubhouse.${feeText}`));
}

// Fenster schließen: offene Spiele nur als Ergebnis (Hook der Folgewoche oder „Rest vorspulen").
// Rest des offenen Fensters nur als Ergebnis; die Pause bleibt bis zum nächsten Spieltag offen (Karte „alles gespielt“).
export function playWindow(c) {
  const q = c.natQuali;
  if (!q || q.open == null) return;
  const days = new Set(windowDays(q, q.openWin));
  for (const comp of q.comps)
    for (let guard = 0; guard < 8; guard++) {
      for (const m of comp.matches) if (days.has(m.day) && !m.result) quickMatch(c, comp, m);
      if (!advancePlayoffs(c, comp)) break;
    }
}

export function closeWindow(c) {
  const q = c.natQuali;
  if (!q || q.open == null) return;
  playWindow(c);
  q.played = Math.max(q.played ?? -1, q.openWin);
  q.open = null;
}

// Nächstes offenes Spiel eines Landes mit eigenen Spielern im offenen Fenster.
export function nextQualiMatch(c) {
  const q = c.natQuali;
  if (!q || q.open == null || q.open !== c.round) return null;
  const days = new Set(windowDays(q, q.openWin));
  for (const comp of q.comps) {
    const m = comp.matches.filter((x) => days.has(x.day) && !x.result && isOwn(comp, x)).sort((a, b) => a.day - b.day)[0];
    if (m) return { t: comp, m };
  }
  return null;
}

// Für die Karte im Vereinsheim: Spiele der eigenen Länder in diesem Fenster und ihre Gruppen.
export function windowView(c) {
  const q = c.natQuali;
  if (!q || q.open == null || q.open !== c.round) return null;
  const days = new Set(windowDays(q, q.openWin));
  const list = [];
  for (const comp of q.comps) {
    const nations = Object.keys(comp.own).filter((nid) => comp.own[nid].length || nid === comp.coach);
    if (!nations.length) continue;
    const games = comp.matches.filter((m) => days.has(m.day) && (nations.includes(m.home) || nations.includes(m.away)));
    if (!games.length && comp.early) continue; // Qualifikation der nächsten Saison ohne Spiel in dieser Pause
    const groups = [...new Set(games.map((m) => m.g).filter((g) => g >= 0))].map((g) => ({ g, rows: qualiTable(comp, g), mine: nations.filter((nid) => comp.groups[g].includes(nid)) }));
    list.push({ comp, name: tournamentName(comp.id), year: comp.year, players: nations.flatMap((nid) => comp.own[nid].map((idx) => ({ idx, nid }))), games, groups });
  }
  return { window: q.openWin, list };
}

// Neue Saison (qualiWeek vor dem neuen Plan): kleiner Marktwert-Schub und Länderspiel-Statistik für die eigenen Spieler.
export function qualiSeasonEnd(c) {
  const q = c.natQuali;
  if (!q) return;
  // Über zwei Saisons: was im März offen blieb und die Juni-Spieltage (nach der Saison) jetzt rechnen.
  const carry = [];
  for (const comp of q.comps) {
    if (!comp.early) continue;
    slotEarly(comp, new Set());
    for (const m of comp.matches) if (!m.result && ['M1', 'M2', 'J1', 'J2'].includes(m.slot)) quickMatch(c, comp, m);
    carry.push(comp);
  }
  for (const comp of q.comps) {
    if (!comp.nl) continue;
    const { champion, promoted } = nlSeasonEnd(c, comp);
    const own = new Set(Object.values(comp.stats).map((s) => s.nat));
    const up = promoted.flatMap((ids, l) => ids.filter((nid) => own.has(nid)).map((nid) => `${nationName(nid)} (${leagueName(l)})`));
    if (champion) note(c, tr(`${nlName()} ${comp.yearLabel}: Sieger ${nationName(champion)}.${up.length ? ` Neue Liga: ${up.join(', ')}.` : ''}`, `${nlName()} ${comp.yearLabel}: winners ${nationName(champion)}.${up.length ? ` New league: ${up.join(', ')}.` : ''}`));
  }
  const sum = {};
  for (const comp of q.comps)
    for (const [idx, s] of Object.entries(comp.stats)) {
      const t = (sum[idx] ??= { apps: 0, goals: 0 });
      t.apps += s.apps;
      t.goals += s.goals;
    }
  const B = QUALI.boost;
  for (const [key, s] of Object.entries(sum)) {
    const rec = c.players[Number(key)];
    if (!rec || !s.apps) continue;
    rec.natCaps = (rec.natCaps ?? 0) + s.apps;
    rec.natGoals = (rec.natGoals ?? 0) + s.goals;
    const v = Math.min(B.max, s.apps * B.app + s.goals * B.goal);
    const before = rec.natBoost && (c.season ?? 1) - rec.natBoost.season <= 1 ? rec.natBoost.v : 0;
    if (v > before) rec.natBoost = { v: Math.round(v * 100) / 100, season: q.season };
  }
  // Übernommene Qualifikation: Statistik ist verbucht, Nominierungen neu in der nächsten Saison.
  if (carry.length) c.natQualiCarry = carry.map((comp) => ({ ...comp, own: {}, stats: {} }));
  delete c.natQuali;
}

function note(c, text) {
  if (c.week?.chat) c.week.chat.splice(1, 0, { from: null, text, time: 'Mo 09:00' });
  else (c.pendingNews ??= []).push(text);
}
