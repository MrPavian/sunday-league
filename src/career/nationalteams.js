// Turniere der Nationalteams (docs/KONZEPT-NATIONALTEAMS.md; Nutzerentscheide 2026-11-06: nominiert wird nur aus den Profiligen,
// die Spiele der eigenen Spieler laufen als 3D-Spiel im Stadion, neutrale Turniernamen ohne Verbandsmarken).
//  - Kalender nach dem echten Rhythmus (TOURNAMENTS): Weltmeisterschaft, Europameisterschaft, Südamerika, Nord- und Mittelamerika,
//    Ozeanien im Sommer; Afrika und Asien im Winter – wer dort spielt, fehlt nach der Winterpause einige Spieltage.
//  - Teilnehmer: die Besten jedes Kontinentalverbands nach Stärke und Turnierform (fest je Karriere und Jahr). Gruppen zu vier,
//    die Besten (auch beste Dritte) in die K.-o.-Runde – wie in echt.
//  - Eigene Spieler (Profiligen, Stufe 9–12) werden nominiert, wenn ihr Land dabei ist und sie gut genug sind. Spiele ihres Landes
//    kann man im Stadion ansehen (3D, Zuschauer) oder nur das Ergebnis nehmen; alles andere rechnet das Schnellmodell (wie die
//    fremden Ligen, pyramid.js simTable).
//  - Danach: Turnier-Schub auf den Marktwert (natboost.js), Entschädigung des Weltverbands nur bei der Weltmeisterschaft.
// Die übrigen Kaderspieler sind erfunden: Pool-Spieler, auf die Stärke ihres Landes gehoben (niveau.js liftedTo), mit Namen und
// Aussehen ihres Landes. Gespeichert wird nur, was zählt (Feld, Stärke, Spiele, eigene Spieler) – die Kader werden neu gebaut.
import { rankTable } from '../core/standings.js';
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { NAME_GROUPS, NATIONS } from '../data/nations.js';
import { nameLocale, originOf } from '../data/origins.js';
import { lookFor } from '../sim/generator.js';
import { createMatch, MATCH, matchDuration } from '../sim/match.js';
import { liftedTo } from '../sim/niveau.js';
import { STADIUM } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { systemFormation } from '../sim/tactics.js';
import { getPool, humanClub, playerOf, resolveKits, seasonOver, takenIndices } from './career.js';
import { book } from './finances.js';
import { isCoach } from './personal.js';
import { poisson, QUICK, quickSlope } from './pokal.js';
import { chronicle, yearOf } from './sagas.js';

// --- Turniere ---------------------------------------------------------------------------------------------------------
// from/to: [Monat, Tag]. Quellen und Spielwerte stehen im Konzept (Abschnitt 2); kurz:
//  wm   48 Teams, 12 Gruppen, 8 beste Dritte → Runde der 32 (Format 2026); 11.6.–19.7. wie 2026. Plätze je Verband wie 2026
//       (Europa 16, Afrika 9, Asien 8, Südamerika 6, Nord-/Mittelamerika 6, Ozeanien 1), die zwei Plätze der Play-offs hier an Asien
//       und Nord-/Mittelamerika (Spielwert). Entschädigung: mindestens 5000 US-Dollar je Spieler und Tag (Weltverband 2026), im
//       Spiel 5000 € (hergeleitet).
//  em   24 Teams, 6 Gruppen, 4 beste Dritte → Achtelfinale; 9.6.–9.7. (Ausgabe 2028).
//  sam  16 Teams (10 aus Südamerika + 6 Gäste aus Nord-/Mittelamerika, erwartet für 2028), 4 Gruppen → Viertelfinale; Juni/Juli.
//  nam  16 Teams, alle zwei Jahre (2027: Juni/Juli, 16 Teams).
//  afr  24 Teams, 6 Gruppen → Achtelfinale; 21.12.–18.1. wie die Ausgabe 2025. Rhythmus alle zwei Jahre im Winter: Spielwert
//       (der Verband hat 2025 einen Vier-Jahres-Takt angekündigt, Berichte dazu widersprechen sich).
//  asi  24 Teams, 7.1.–5.2. (Ausgabe 2027), alle vier Jahre.
//  oce   8 Teams (Ausgabe 2024), 2 Gruppen → Halbfinale; Rhythmus alle vier Jahre: prüfen.
export const TOURNAMENTS = {
  wm: { de: 'Weltmeisterschaft', en: 'World Cup', groups: 12, best3: 8, when: 'summer', every: 4, anchor: 2026, from: [6, 11], to: [7, 19], slots: { uefa: 16, caf: 9, afc: 9, conmebol: 6, concacaf: 7, ofc: 1 }, weight: 1, pay: 5000 },
  em: { de: 'Europameisterschaft', en: 'European Championship', groups: 6, best3: 4, when: 'summer', every: 4, anchor: 2028, from: [6, 9], to: [7, 9], slots: { uefa: 24 }, weight: 0.9 },
  sam: { de: 'Südamerikameisterschaft', en: 'South American Championship', groups: 4, best3: 0, when: 'summer', every: 4, anchor: 2028, from: [6, 20], to: [7, 14], slots: { conmebol: 10, concacaf: 6 }, weight: 0.8 },
  nam: { de: 'Nord- und Mittelamerikameisterschaft', en: 'North and Central American Championship', groups: 4, best3: 0, when: 'summer', every: 2, anchor: 2027, from: [6, 14], to: [7, 6], slots: { concacaf: 16 }, weight: 0.5 },
  afr: { de: 'Afrikameisterschaft', en: 'Africa Championship', groups: 6, best3: 4, when: 'winter', every: 2, anchor: 2025, from: [12, 21], to: [1, 18], slots: { caf: 24 }, weight: 0.6 },
  asi: { de: 'Asienmeisterschaft', en: 'Asian Championship', groups: 6, best3: 4, when: 'winter', every: 4, anchor: 2027, from: [1, 7], to: [2, 5], slots: { afc: 24 }, weight: 0.6 },
  oce: { de: 'Ozeanienmeisterschaft', en: 'Oceania Championship', groups: 2, best3: 0, when: 'summer', every: 4, anchor: 2028, from: [6, 15], to: [6, 30], slots: { ofc: 8 }, weight: 0.3 },
};
export const tournamentName = (id) => tr(TOURNAMENTS[id].de, TOURNAMENTS[id].en);
export const nationName = (id) => (NATIONS[id] ? tr(NATIONS[id].de, NATIONS[id].en) : id);

// Stärke der Länder (Ligamittel der besten elf, Spielwerte an PRO_TARGET angelehnt: 1. Liga 186) und Nominierung.
export const NAT = {
  tier: { 1: 196, 2: 186, 3: 176, 4: 164, 5: 150 },
  form: 6, // Turnierform: ± so viele Stärkepunkte je Land und Turnier (Spielwert)
  nominate: 8, // eigener Spieler: höchstens so viel unter der Stärke seines Landes (Spielwert)
  squad: 26, // Kadergröße (Weltmeisterschaft seit 2022: 26 – prüfen für die anderen Turniere)
  shape: { gk: 3, def: 9, mid: 8, fwd: 6 },
  home: 0.45, // mit zweiter Herkunft: so oft für das Land, in dem er lebt (Spielwert)
  boost: { app: 0.02, goal: 0.04, max: 0.4, stage: { group: 0, r32: 0.02, r16: 0.04, qf: 0.08, sf: 0.12, f: 0.16, win: 0.22 } }, // Spielwerte
  proFrom: 9, // nominiert wird nur aus den Profiligen (Nutzerentscheid 2026-11-06)
};

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x6c8e9cf5);
const idHash = (id) => [...String(id)].reduce((s, ch) => Math.imul(s, 31) + ch.charCodeAt(0), 7) >>> 0;
const STEP_NAMES = { 32: 'r32', 16: 'r16', 8: 'qf', 4: 'sf', 2: 'f' };
export const stepLabel = (step) =>
  ({ g1: tr('1. Gruppenspiel', 'Group match 1'), g2: tr('2. Gruppenspiel', 'Group match 2'), g3: tr('3. Gruppenspiel', 'Group match 3'), r32: tr('Runde der letzten 32', 'Round of 32'), r16: tr('Achtelfinale', 'Round of 16'), qf: tr('Viertelfinale', 'Quarter-final'), sf: tr('Halbfinale', 'Semi-final'), f: tr('Finale', 'Final') })[step] ?? step;

// Turnierjahr (Kalenderjahr): Sommer nach der Saison, Winter im Dezember bzw. Januar der Saison.
function yearFor(c, cfg) {
  const y = yearOf(c); // Saison 1 = 2026/27
  return cfg.from[0] >= 8 ? y : y + 1; // Dezember im ersten Jahr der Saison, sonst im zweiten
}
export function dueTournaments(c, when) {
  return Object.entries(TOURNAMENTS)
    .filter(([, t]) => t.when === when && (((yearFor(c, t) - t.anchor) % t.every) + t.every) % t.every === 0)
    .map(([id]) => id);
}

// --- Nationalität ---------------------------------------------------------------------------------------------------
// Aus der Herkunft des Nachnamens (origins.js). Mit zweiter Herkunft spielt er oft für das Land, in dem er lebt. Einmal nominiert,
// bleibt es dabei (career.natLock).
const ORIGIN_NATIONS = {
  de: ['ger'], ruhr: ['ger'], russ: ['ger'], pl: ['pol'], tr: ['tur'], it: ['ita'], gr: ['gre'], pt: ['por'], ua: ['ukr'], ro: ['rou'], bg: ['bul'], ir: ['irn'], vn: ['vie'], afg: ['afg'],
  yu: ['srb', 'cro', 'bih', 'svn', 'mne', 'mkd'], al: ['alb', 'kos'], ar: ['mar', 'tun', 'alg', 'egy', 'lbn', 'syr', 'irq', 'jor'], wa: ['gha', 'nga', 'sen', 'civ', 'cmr', 'mli', 'gui'],
  // Englische Namensliste (origins_en.js)
  gb: ['eng', 'eng', 'eng', 'sco', 'wal', 'nir'], ie: ['irl'], eu: ['pol', 'rou', 'cze', 'hun'], in: ['ind'], pk: ['pak'], bd: ['ban'], af: ['nga', 'gha', 'sen', 'cmr'], cb: ['jam', 'tri'], mix: ['eng'], cn: ['chn'],
};
const homeNation = () => (nameLocale() === 'en' ? 'eng' : 'ger');
export function nationOf(c, idx) {
  const locked = c.natLock?.[idx];
  if (locked) return locked;
  const p = playerOf(c, idx);
  const last = p.name.split(' ').slice(1).join(' ');
  const list = ORIGIN_NATIONS[originOf(last)] ?? [homeNation()];
  const home = homeNation();
  if (!list.includes(home) && hash(idx, 41) / 2 ** 32 < NAT.home) return home;
  return list[hash(idx, 43) % list.length];
}

// --- Stärke und Kader ---------------------------------------------------------------------------------------------------
// Erfundene Kaderspieler eines Landes: feste Pool-Spieler je Karriere, Land und Jahr (ohne die Spieler im Spielstand), auf die Stärke
// des Landes gehoben, mit Namen und Aussehen des Landes.
let posLists = null;
function poolByPos() {
  if (posLists) return posLists;
  posLists = { gk: [], def: [], mid: [], fwd: [] };
  for (const p of getPool().everyone()) posLists[p.position]?.push(p.poolIndex);
  return posLists;
}
function fillSquad(c, t, nation, taken) {
  const n = NATIONS[nation];
  const rng = createRng(hash(c.seed ?? 0, t.year, idHash(t.id), idHash(nation)));
  const target = t.target[nation];
  const names = NAME_GROUPS[n.names] ?? NAME_GROUPS.en;
  const lists = poolByPos();
  const out = [];
  for (const [pos, k] of Object.entries(NAT.shape)) {
    for (let i = 0; i < k; i++) {
      let idx;
      for (let tries = 0; tries < 20; tries++) {
        idx = rng.pick(lists[pos]);
        if (!taken.has(idx)) break;
      }
      taken.add(idx);
      const base = getPool().get(idx);
      const q = liftedTo(base, target);
      out.push({ ...q, name: `${rng.pick(names.first)} ${rng.pick(names.last)}`, look: lookFor(rng, q.age, n.look), traits: [], nat: nation, fill: true });
    }
  }
  return out;
}
// Startelf (System des Landes) und Bank aus einem Kader: je Rolle die Stärksten.
const SYSTEM = '4-4-2';
function lineupFrom(players) {
  const formation = systemFormation(11, SYSTEM);
  const left = [...players].sort((a, b) => b.rating - a.rating);
  const take = (role) => {
    const i = left.findIndex((p) => p.position === role);
    return left.splice(i >= 0 ? i : 0, 1)[0];
  };
  const xi = formation.map((f) => take(f.role));
  const bench = ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'].map(take).filter(Boolean);
  return { xi, bench };
}
const strengthOf = (xi) => Math.round((xi.reduce((s, p) => s + p.rating, 0) / xi.length) * 10) / 10;

// Kader eines Landes in diesem Turnier: eigene Nominierte ersetzen die schwächsten Erfundenen ihrer Position.
function squadOf(c, t, nation) {
  const taken = takenIndices(c);
  const fill = fillSquad(c, t, nation, taken);
  const own = (t.own[nation] ?? []).map((idx) => ({ ...playerOf(c, idx), nat: nation, own: true }));
  for (const p of own) {
    const same = fill.filter((f) => f.position === p.position).sort((a, b) => a.rating - b.rating);
    const out = same[0] ?? fill.sort((a, b) => a.rating - b.rating)[0];
    fill.splice(fill.indexOf(out), 1);
  }
  return [...own, ...fill];
}

// --- Feld, Gruppen, Spielplan -------------------------------------------------------------------------------------------
// Qualifikation (Variante 1, Nutzerentscheid 2026-11-06): beim Turnierstart auf einen Schlag im Schnellmodell ausgespielt.
// Je Verband Gruppen mit Hin- und Rückspiel (Heimvorteil wie in simTable); weiter sind die Gruppensieger, die übrigen Plätze gehen
// an die besten Zweiten, dann die besten Dritten (nach Punkten, Tordifferenz und Toren je Spiel). Play-offs sind dabei
// vereinfacht: Ihre Plätze gehen an die Nächstbesten der Rangliste. Wo ein Verband nicht mehr Länder hat als Plätze, gibt es keine.
// Gruppenzahl: wo bekannt wie in echt, sonst halb so viele wie Plätze (höchstens ein Drittel der Länder, Spielwert).
//  - Weltmeisterschaft, Europa: 12 Gruppen, die 12 Sieger direkt, 4 Plätze über Play-offs (Quali 2026; hier die 4 besten Zweiten).
//  - Weltmeisterschaft, Südamerika: eine Liga, jeder gegen jeden mit Hin- und Rückspiel, die besten 6 (Quali 2026).
//  - Weltmeisterschaft, Afrika: 9 Gruppen, die Sieger direkt (Quali 2026, prüfen).
//  - Europameisterschaft: 12 Gruppen, Sieger und 8 beste Zweite direkt, 4 Plätze über Play-offs (Quali 2028; hier die Nächstbesten).
// Im Spiel hat Europa 37 Länder (in echt 54) – die Gruppen sind darum kleiner als die echten Vierer- und Fünfergruppen.
export const QUALI_GROUPS = { wm: { uefa: 12, conmebol: 1, caf: 9 }, em: { uefa: 12 } };
const formOf = (c, year, nid) => (((hash(c.seed ?? 0, year, idHash(nid), 9) % 1000) / 1000) - 0.5) * 2 * NAT.form;
const targetOf = (c, year, nid) => NAT.tier[NATIONS[nid].tier] + formOf(c, year, nid);

function qualiGroup(c, year, key, ids, str) {
  const rng = createRng(hash(c.seed ?? 0, year, idHash(key), 13));
  const rows = Object.fromEntries(ids.map((nid) => [nid, { nid, p: 0, pts: 0, gf: 0, ga: 0 }]));
  for (const h of ids)
    for (const a of ids) {
      if (h === a) continue;
      const d = str[h] - str[a];
      const pp = quickSlope(c, str[h], str[a]);
      const gh = poisson(rng, QUICK.base * Math.exp(pp * d + QUICK.home));
      const ga = poisson(rng, QUICK.base * Math.exp(-pp * d));
      const H = rows[h];
      const A = rows[a];
      H.p++;
      A.p++;
      H.gf += gh;
      H.ga += ga;
      A.gf += ga;
      A.ga += gh;
      if (gh > ga) H.pts += 3;
      else if (gh < ga) A.pts += 3;
      else {
        H.pts++;
        A.pts++;
      }
    }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || str[y.nid] - str[x.nid]);
}
const perGame = (r) => [r.pts / r.p, (r.gf - r.ga) / r.p, r.gf / r.p];
const byPerGame = (x, y) => {
  const a = perGame(x);
  const b = perGame(y);
  return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
};

function makeField(c, id, year) {
  const cfg = TOURNAMENTS[id];
  const field = [];
  const quali = {};
  for (const [conf, n] of Object.entries(cfg.slots)) {
    const ids = Object.keys(NATIONS).filter((nid) => NATIONS[nid].conf === conf);
    const str = Object.fromEntries(ids.map((nid) => [nid, targetOf(c, year, nid)]));
    const sorted = [...ids].sort((a, b) => str[b] - str[a]);
    if (ids.length <= n) {
      field.push(...sorted);
      continue;
    }
    const G = QUALI_GROUPS[id]?.[conf] ?? Math.max(1, Math.min(Math.floor(ids.length / 3), Math.ceil(n / 2)));
    // Lostöpfe nach Stärke, je Gruppe einer aus jedem Topf (gemischt fest je Karriere und Jahr).
    const rng = createRng(hash(c.seed ?? 0, year, idHash(id), idHash(conf), 11));
    const groups = Array.from({ length: G }, () => []);
    for (let pot = 0; pot * G < sorted.length; pot++) {
      const list = sorted.slice(pot * G, pot * G + G);
      for (let i = list.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [list[i], list[j]] = [list[j], list[i]];
      }
      list.forEach((nid, i) => groups[i].push(nid));
    }
    const tables = groups.map((g, gi) => qualiGroup(c, year, `${id}-${conf}-${gi}`, g, str));
    const qualified = [];
    for (let place = 0; qualified.length < n && place < 6; place++) {
      const rows = tables.map((tb) => tb[place]).filter(Boolean).sort(byPerGame);
      qualified.push(...rows.slice(0, n - qualified.length).map((r) => r.nid));
    }
    field.push(...qualified);
    quali[conf] = tables.map((tb) => tb.map((r) => ({ nid: r.nid, pts: r.pts, gd: r.gf - r.ga, q: qualified.includes(r.nid) })));
  }
  return { field, quali };
}

function drawGroups(t, rng) {
  const cfg = TOURNAMENTS[t.id];
  const sorted = [...t.field].sort((a, b) => t.str[b] - t.str[a]);
  const g = cfg.groups;
  const groups = Array.from({ length: g }, () => []);
  for (let pot = 0; pot < 4; pot++) {
    const list = sorted.slice(pot * g, pot * g + g);
    for (let i = list.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
    list.forEach((nid, i) => groups[i].push(nid));
  }
  return groups;
}

const GROUP_PAIRS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];

export function groupTable(t, gi) {
  const rows = Object.fromEntries(t.groups[gi].map((nid) => [nid, { nid, pts: 0, gf: 0, ga: 0, p: 0 }]));
  for (const m of t.matches) {
    if (m.g !== gi || !m.result) continue;
    const h = rows[m.home];
    const a = rows[m.away];
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
  // Punktgleichheit (core/standings.js): Weltmeisterschaft und Europameisterschaft zuerst der direkte Vergleich, sonst
  // Tordifferenz und Tore; zuletzt die Stärke statt Fair Play, Weltrangliste und Los.
  const games = t.matches.filter((m) => m.g === gi && m.result).map((m) => ({ home: m.home, away: m.away, hg: m.result.home, ag: m.result.away }));
  const list = Object.values(rows).map((r) => ({ ...r, id: r.nid }));
  return rankTable(list, games, { mode: H2H_CUPS.has(t.id) ? 'h2h' : 'gd', fallback: (x, y) => t.str[y.nid] - t.str[x.nid] });
}
const H2H_CUPS = new Set(['wm', 'em']);

const winnerOf = (m) => (m.result.home !== m.result.away ? (m.result.home > m.result.away ? m.home : m.away) : m.pens.home > m.pens.away ? m.home : m.away);

// Nächste Runde anlegen: nach den Gruppen die Qualifizierten (Erste, Zweite, beste Dritte), danach die Sieger paarweise.
function nextStep(t) {
  const cfg = TOURNAMENTS[t.id];
  const steps = t.steps;
  const i = steps.indexOf(t.step);
  if (i === steps.length - 1) return null;
  const next = steps[i + 1];
  if (next.startsWith('g')) {
    const gi = Number(next.slice(1)) - 1;
    t.groups.forEach((grp, g) => GROUP_PAIRS[gi].forEach(([a, b]) => t.matches.push({ step: next, g, home: grp[a], away: grp[b], result: null })));
  } else if (t.step === 'g3') {
    const tables = t.groups.map((_, gi) => groupTable(t, gi));
    const firsts = tables.map((r) => r[0]);
    const seconds = tables.map((r) => r[1]);
    const thirds = tables.map((r) => r[2]).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf).slice(0, cfg.best3);
    const seeded = [...firsts, ...seconds, ...thirds].map((r) => r.nid); // Gruppensieger gegen die Dritten, Zweite untereinander
    const n = seeded.length;
    for (let k = 0; k < n / 2; k++) t.matches.push({ step: next, home: seeded[k], away: seeded[n - 1 - k], result: null });
  } else {
    const prev = t.matches.filter((m) => m.step === t.step);
    for (let k = 0; k + 1 < prev.length; k += 2) t.matches.push({ step: next, home: winnerOf(prev[k]), away: winnerOf(prev[k + 1]), result: null });
  }
  t.step = next;
  return next;
}

// Termin einer Runde (für Abwesenheit und Entschädigung): gleichmäßig zwischen Anfang und Ende des Turniers.
function stepDate(t, step) {
  const cfg = TOURNAMENTS[t.id];
  const y0 = t.year; // Jahr des ersten Spieltags (Afrika: Dezember, Ende im Januar danach)
  const start = Date.UTC(y0, cfg.from[0] - 1, cfg.from[1]);
  const end = Date.UTC(cfg.to[0] < cfg.from[0] ? y0 + 1 : y0, cfg.to[0] - 1, cfg.to[1]);
  const i = t.steps.indexOf(step);
  return start + ((end - start) * i) / (t.steps.length - 1);
}
const DAY = 86400000;

// --- Start ------------------------------------------------------------------------------------------------------------
export const natCups = (c) => (c.natCups ??= []);
export const natRunning = (c, when = null) => natCups(c).filter((t) => !t.done && (!when || TOURNAMENTS[t.id].when === when));
const proNow = (c) => !!c.pro && (c.level ?? 1) >= NAT.proFrom;

export function startTournament(c, id) {
  const cfg = TOURNAMENTS[id];
  const year = yearFor(c, cfg);
  if (natCups(c).some((t) => t.id === id && t.year === year) || (c.natHistory ?? []).some((h) => h.id === id && h.year === year)) return null;
  const { field, quali } = makeField(c, id, year);
  const target = {};
  for (const nid of field) target[nid] = targetOf(c, year, nid);
  const ko = (cfg.groups * 2 + cfg.best3) | 0;
  const steps = ['g1', 'g2', 'g3'];
  for (let n = ko; n >= 2; n /= 2) steps.push(STEP_NAMES[n]);
  const t = { id, year, season: c.season ?? 1, field, quali, target, str: {}, own: {}, stats: {}, steps, step: null, matches: [], groups: [], done: false, log: [] };
  // Nominierung: eigene Spieler aus den Profiligen, deren Land dabei ist und die gut genug sind.
  const taken = takenIndices(c);
  for (const nid of field) {
    const { xi } = lineupFrom(fillSquad(c, t, nid, taken));
    t.str[nid] = strengthOf(xi);
  }
  // Gescheitert in der Qualifikation: große Länder (Stufe 1–2) ins Kreisblatt, eigene Spieler ohne Turnier in den Chat.
  const out = Object.values(quali).flat(2).filter((r) => !r.q).map((r) => r.nid);
  t.failed = out.filter((nid) => NATIONS[nid].tier <= 2);
  if (proNow(c)) {
    const club = humanClub(c);
    const missing = club.squad.filter((idx) => c.natLock?.[idx] && out.includes(c.natLock[idx]));
    if (missing.length) note(c, tr(`Qualifikation zur ${tournamentName(id)} ${year}: ohne ${missing.map((idx) => `${playerOf(c, idx).name} (${nationName(c.natLock[idx])})`).join(', ')} – das Land hat es nicht geschafft.`, `Qualifying for the ${tournamentName(id)} ${year}: no place for ${missing.map((idx) => `${playerOf(c, idx).name} (${nationName(c.natLock[idx])})`).join(', ')} – the country did not make it.`));
    for (const idx of club.squad) {
      if (isCoach(c, idx) || (c.players[idx]?.injuryWeeks ?? 0) > 0) continue;
      const nid = nationOf(c, idx);
      if (!field.includes(nid)) continue;
      if (playerOf(c, idx).rating < t.str[nid] - NAT.nominate) continue;
      (t.own[nid] ??= []).push(idx);
    }
    for (const [nid, list] of Object.entries(t.own)) {
      t.own[nid] = list.sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating).slice(0, NAT.squad);
      for (const idx of t.own[nid]) {
        (c.natLock ??= {})[idx] = nid;
        t.stats[idx] = { apps: 0, goals: 0, nat: nid };
      }
      t.str[nid] = strengthOf(lineupFrom(squadOf(c, t, nid)).xi);
    }
  }
  t.groups = drawGroups(t, createRng(hash(c.seed ?? 0, year, idHash(id), 3)));
  t.step = 'g0';
  t.steps = ['g0', ...steps];
  nextStep(t);
  natCups(c).push(t);
  const ownIdx = Object.values(t.own).flat();
  const name = tournamentName(id);
  if (t.failed.length) note(c, tr(`Kreisblatt: Ohne ${t.failed.map(nationName).join(', ')} – in der Qualifikation zur ${name} ${year} gescheitert.`, `District Gazette: no ${t.failed.map(nationName).join(', ')} – knocked out in qualifying for the ${name} ${year}.`));
  if (ownIdx.length) {
    const list = ownIdx.map((idx) => `${playerOf(c, idx).name} (${nationName(t.stats[idx].nat)})`).join(', ');
    note(c, tr(`${name} ${year}: Nominiert aus unserem Kader – ${list}.`, `${name} ${year}: called up from our squad – ${list}.`));
    chronicle(c, tr(`${ownIdx.length === 1 ? 'Ein Spieler' : `${ownIdx.length} Spieler`} des Vereins fahren zur ${name} ${year}.`, `${ownIdx.length === 1 ? 'One player' : `${ownIdx.length} players`} of the club go to the ${name} ${year}.`));
  }
  settle(c, t);
  return t;
}

// Nachricht: im Chat der Woche, sonst (Saisonende) ins Kreisblatt der nächsten Woche.
function note(c, text) {
  if (c.week?.chat) c.week.chat.splice(1, 0, { from: null, text, time: 'Mo 09:00' });
  else (c.pendingNews ??= []).push(text);
}

// --- Spiele -------------------------------------------------------------------------------------------------------------
const ownNation = (t, nid) => !!t.own[nid]?.length;
export const isOwnMatch = (t, m) => ownNation(t, m.home) || ownNation(t, m.away);
const isKo = (m) => !m.step.startsWith('g');

function quickPens(rng, a, b) {
  const p = Math.max(0.35, Math.min(0.65, 0.5 + (a - b) * 0.01));
  const home = rng.chance(p);
  return home ? { home: 5, away: 4 } : { home: 4, away: 5 };
}

function quickMatch(c, t, m) {
  const i = t.matches.indexOf(m);
  const rng = createRng(hash(c.seed ?? 0, t.year, idHash(t.id), i, 77));
  const a = t.str[m.home];
  const b = t.str[m.away];
  const pp = quickSlope(c, a, b);
  m.result = { home: poisson(rng, QUICK.base * Math.exp(pp * (a - b))), away: poisson(rng, QUICK.base * Math.exp(pp * (b - a))) };
  if (isKo(m) && m.result.home === m.result.away) {
    // Verlängerung: ein Drittel der Spielzeit, dann Elfmeterschießen.
    const eh = poisson(rng, (QUICK.base / 3) * Math.exp(pp * (a - b)));
    const ea = poisson(rng, (QUICK.base / 3) * Math.exp(pp * (b - a)));
    m.result.home += eh;
    m.result.away += ea;
    m.et = true;
    if (m.result.home === m.result.away) m.pens = quickPens(rng, a, b);
  }
  // Eigene Spieler im Schnellmodell: Einsatz für die Startelf, Tore nach Position verteilt.
  for (const side of ['home', 'away']) {
    const nid = m[side];
    if (!ownNation(t, nid)) continue;
    const { xi } = lineupFrom(squadOf(c, t, nid));
    const w = { gk: 0, def: 0.5, mid: 1.5, fwd: 3 };
    const total = xi.reduce((s, p) => s + w[p.position], 0);
    for (const p of xi) if (p.own && t.stats[p.poolIndex]) t.stats[p.poolIndex].apps++;
    for (let g = 0; g < m.result[side]; g++) {
      let r = rng.next() * total;
      const scorer = xi.find((p) => (r -= w[p.position]) < 0) ?? xi.at(-1);
      if (scorer.own && t.stats[scorer.poolIndex]) t.stats[scorer.poolIndex].goals++;
    }
  }
  logMatch(c, t, m);
}

function logMatch(c, t, m) {
  if (!isOwnMatch(t, m)) return;
  const r = m.result;
  const extra = m.pens ? tr(` (i. E. ${m.pens.home}:${m.pens.away})`, ` (${m.pens.home}-${m.pens.away} pens)`) : m.et ? tr(' n. V.', ' aet') : '';
  t.log.push(`${stepLabel(m.step)}: ${nationName(m.home)} ${r.home}:${r.away} ${nationName(m.away)}${extra}`);
}

// Nächstes offenes Spiel eines Landes mit eigenen Spielern (für Ansehen oder Ergebnis).
export function nextOwnMatch(c) {
  for (const t of natRunning(c)) {
    const m = t.matches.find((x) => x.step === t.step && !x.result && isOwnMatch(t, x));
    if (m) return { t, m };
  }
  return null;
}

// Runde fertig rechnen und weiter, solange kein Spiel mit eigenen Spielern ansteht; am Ende abschließen.
function settle(c, t) {
  for (;;) {
    if (t.matches.some((m) => m.step === t.step && !m.result && isOwnMatch(t, m))) return;
    for (const m of t.matches) if (m.step === t.step && !m.result) quickMatch(c, t, m);
    if (!nextStep(t)) return finish(c, t);
  }
}

// Eigenes Spiel nur als Ergebnis (Schnellmodell).
export function quickOwnMatch(c) {
  const next = nextOwnMatch(c);
  if (!next) return false;
  quickMatch(c, next.t, next.m);
  settle(c, next.t);
  return true;
}

// Alle laufenden Turniere (oder die eines Zeitpunkts) ohne Zuschauen zu Ende rechnen.
export function finishAll(c, when = null) {
  for (const t of natRunning(c, when)) {
    for (let guard = 0; guard < 200 && !t.done; guard++) {
      const m = t.matches.find((x) => x.step === t.step && !x.result);
      if (m) quickMatch(c, t, m);
      else if (!nextStep(t)) finish(c, t);
    }
  }
}

// 3D-Spiel im Stadion: beide Teams von der KI, man schaut zu (Hud: Zuschauer, keine Zurufe und Wechsel).
export function prepareNatMatch(c, { t, m }, { duration } = {}) {
  const i = t.matches.indexOf(m);
  const rng = createRng(hash(c.seed ?? 0, t.year, idHash(t.id), i, 91));
  const pitch = { ...STADIUM, name: tr('Turnierstadion', 'Tournament stadium'), format: 11, referee: true };
  const club = (nid) => ({ id: `nat-${nid}`, name: nationName(nid), short: nid.toUpperCase(), kit: NATIONS[nid].kit, keeperKit: { shirt: 0x2f8f5a, shorts: 0x1c1c1c, socks: 0x2f8f5a } });
  const kits = resolveKits(club(m.home), club(m.away));
  const team = (cl, nid) => {
    const { xi, bench } = lineupFrom(squadOf(c, t, nid));
    return { rels: {}, name: cl.name, short: cl.short, kit: cl.kit, keeperKit: cl.keeperKit, crest: cl.crest ?? null, tactic: { system: SYSTEM, style: 'ausgewogen' }, sponsor: null, sleeve: null, players: [...xi, ...bench].map((p) => ({ ...p })), helpers: [] };
  };
  const teams = [team(kits.home, m.home), team(kits.away, m.away)];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human: false, duration: duration ?? matchDuration(pitch), incidents: true });
  match.knockout = isKo(m);
  match.extraTime = MATCH.pokalExtra;
  match.crowd = 3500; // ausverkauft (so viel, wie das Stadion zeigt)
  return { match, humanIsAway: false, pitch, nat: { id: t.id, year: t.year, index: i } };
}

// Ergebnis des angesehenen Spiels eintragen (Tore und Einsätze der eigenen Spieler aus der Engine).
export function recordNatMatch(c, prepared) {
  const t = natCups(c).find((x) => x.id === prepared.nat.id && x.year === prepared.nat.year);
  const m = t?.matches[prepared.nat.index];
  if (!m || m.result) return false;
  const g = prepared.match;
  m.result = { home: g.score[0], away: g.score[1] };
  if (g.extra) m.et = true;
  if (isKo(m) && m.result.home === m.result.away) {
    const so = g.shootout;
    const pens = so?.done ? shootoutScore(so) : null;
    m.pens = pens ? { home: pens[0], away: pens[1] } : quickPens(createRng(hash(c.seed ?? 0, t.year, prepared.nat.index, 5)), t.str[m.home], t.str[m.away]);
  }
  for (const p of [...g.players, ...g.bench.flat(), ...(g.sentOff ?? [])]) {
    const st = g.stats.players[p.id];
    if (p.poolIndex == null || !t.stats[p.poolIndex] || !p.own) continue;
    if (st?.seconds > 0) t.stats[p.poolIndex].apps++;
    t.stats[p.poolIndex].goals += st?.goals ?? 0;
  }
  m.watched = true;
  logMatch(c, t, m);
  settle(c, t);
  return true;
}

// --- Abschluss -------------------------------------------------------------------------------------------------------------
function reachedOf(t, nid) {
  const lost = t.matches.filter((m) => isKo(m) && (m.home === nid || m.away === nid));
  if (!lost.length) return 'group';
  const last = lost.at(-1);
  if (last.result && winnerOf(last) === nid && last.step === 'f') return 'win';
  return last.step;
}

function finish(c, t) {
  if (t.done) return;
  t.done = true;
  const cfg = TOURNAMENTS[t.id];
  const final = t.matches.find((m) => m.step === 'f');
  const winner = final ? winnerOf(final) : null;
  const name = tournamentName(t.id);
  const own = [];
  for (const [idx, s] of Object.entries(t.stats)) {
    const i = Number(idx);
    const reached = reachedOf(t, s.nat);
    const B = NAT.boost;
    const v = Math.min(B.max, (s.apps * B.app + s.goals * B.goal + (B.stage[reached] ?? 0)) * cfg.weight);
    const rec = c.players[i];
    if (rec) {
      const before = rec.natBoost && natAge(c, rec.natBoost) <= 1 ? rec.natBoost.v : 0;
      if (v > before) rec.natBoost = { v: Math.round(v * 100) / 100, season: c.season ?? 1 };
      rec.natCaps = (rec.natCaps ?? 0) + s.apps;
      rec.natGoals = (rec.natGoals ?? 0) + s.goals;
    }
    // Rückkehr: Datum des letzten Spiels seines Landes; Winterturniere kosten Ligaspiele.
    const exit = stepDate(t, reached === 'win' ? 'f' : reached === 'group' ? 'g3' : reached);
    if (cfg.when === 'winter' && rec && humanClub(c).squad.includes(i)) {
      const missed = missedRounds(c, t, exit);
      if (missed) {
        rec.awayWeeks = Math.max(rec.awayWeeks ?? 0, missed + (c.week?.breakWeek === 'winter' ? 1 : 0));
        rec.awayReason = tr(`Bin noch bei der ${name} – ${nationName(s.nat)}.`, `Still away at the ${name} – ${nationName(s.nat)}.`);
        if (c.week?.availability && !c.week.breakWeek) c.week.availability[i] = 'no';
      }
      s.missed = missed;
    }
    if (cfg.pay && humanClub(c).squad.includes(i)) {
      const days = Math.max(1, Math.round((exit - stepDate(t, 'g0')) / DAY) + 1);
      s.pay = days * cfg.pay;
      if (c.ledger) book(c, tr(`Abstellung ${playerOf(c, i).name} (${name}, ${days} Tage)`, `Release of ${playerOf(c, i).name} (${name}, ${days} days)`), s.pay);
    }
    own.push({ idx: i, name: playerOf(c, i).name, nat: s.nat, apps: s.apps, goals: s.goals, reached, boost: Math.round(v * 100), missed: s.missed ?? 0, pay: s.pay ?? 0 });
  }
  const entry = { id: t.id, year: t.year, season: t.season, failed: t.failed ?? [], winner, runnerUp: final ? (winner === final.home ? final.away : final.home) : null, own, log: t.log.slice(-12) };
  (c.natHistory ??= []).push(entry);
  if (c.natHistory.length > 16) c.natHistory.splice(0, c.natHistory.length - 16);
  c.natCups = natCups(c).filter((x) => x !== t);
  const ownText = own.map((o) => tr(`${o.name} (${nationName(o.nat)}): ${o.apps} Spiele, ${o.goals} Tore, ${reachLabel(o.reached)}`, `${o.name} (${nationName(o.nat)}): ${o.apps} games, ${o.goals} goals, ${reachLabel(o.reached)}`)).join('; ');
  note(c, tr(`Kreisblatt: ${nationName(winner)} gewinnt die ${name} ${t.year}.${ownText ? ` Unsere Spieler – ${ownText}.` : ''}`, `District Gazette: ${nationName(winner)} win the ${name} ${t.year}.${ownText ? ` Our players – ${ownText}.` : ''}`));
  for (const o of own) if (o.reached === 'win') chronicle(c, tr(`${o.name} gewinnt mit ${nationName(o.nat)} die ${name} ${t.year}.`, `${o.name} wins the ${name} ${t.year} with ${nationName(o.nat)}.`));
}
// Verpasste Ligaspiele nach einem Winterturnier (hergeleitet): Der Spielkalender ist gestaucht (nach der Hinrunde geht es erst im
// Frühjahr weiter), darum zählen die echten Spieltage der 1. Liga ab dem Ende ihrer Winterpause (Spielwert: 10. Januar, wöchentlich)
// bis zum letzten Spiel des Landes – umgerechnet auf die Spieltage der eigenen Liga (34 in der 1. Liga).
export const WINTER = { resume: [1, 10], realRounds: 34 };
export function missedRounds(c, t, exit) {
  const resume = Date.UTC(TOURNAMENTS[t.id].from[0] >= 8 ? t.year + 1 : t.year, WINTER.resume[0] - 1, WINTER.resume[1]);
  if (exit < resume) return 0;
  const real = Math.floor((exit - resume) / (7 * DAY)) + 1;
  return Math.max(1, Math.round((real * (c.fixtures?.length ?? WINTER.realRounds)) / WINTER.realRounds));
}
const natAge = (c, b) => (c.season ?? 1) - b.season;
export const reachLabel = (r) => ({ group: tr('Vorrunde', 'group stage'), r32: tr('Runde der 32', 'round of 32'), r16: tr('Achtelfinale', 'round of 16'), qf: tr('Viertelfinale', 'quarter-final'), sf: tr('Halbfinale', 'semi-final'), f: tr('Finale', 'final'), win: tr('Titel', 'title') })[r] ?? r;

export const natHistory = (c) => c.natHistory ?? [];
export const recentNat = (c) => natHistory(c).filter((h) => h.season === (c.season ?? 1));

// --- Hooks (hooks.js) --------------------------------------------------------------------------------------------------
// Sommer: nach dem letzten Spieltag beginnen die Sommerturniere.
export function finishRound(c) {
  if (!seasonOver(c)) return;
  for (const id of dueTournaments(c, 'summer')) startTournament(c, id);
}
// Winter: in der Winterpause beginnen Afrika- und Asienmeisterschaft.
export function breakWeek(c) {
  for (const id of dueTournaments(c, 'winter')) startTournament(c, id);
}
// Nach der Winterpause bzw. zur neuen Saison: was noch läuft, wird ohne Zuschauen zu Ende gerechnet.
export function startWeek(c) {
  if (c.week?.breakWeek) return;
  if (natRunning(c, 'winter').length) finishAll(c, 'winter');
}
export function nextSeason(c) {
  if (natRunning(c, 'summer').length) finishAll(c, 'summer');
}
