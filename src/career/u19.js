// A-Jugend als eigenes Team (ROADMAP 11.17 Punkt 4b): Ab der Regionalliga spielt die eigene A-Jugend (career.youth.prospects)
// jede Woche in einer eigenen Liga mit Tabelle. Ihre Spiele laufen im Hintergrund (Schnellmodell wie die Zweite, reserve.js).
//
// Modus nach der U19-DFB-Nachwuchsliga (dfb.de, „U19-DFB-Nachwuchsliga – Informationen“, abgerufen 2026-11-08):
//  - Vereine mit Leistungszentrum sind dauerhaft dabei; Amateurvereine, wenn sie in der Vorsaison in der Meisterrunde waren
//    oder die Hauptrunde in der oberen Tabellenhälfte beendet haben.
//  - Vorrunde (1. Saisonhälfte): Gruppen mit höchstens acht Teams, Hin- und Rückspiel, 14 Spieltage.
//  - Meisterrunde (2. Saisonhälfte): Erste und Zweite jeder Vorrundengruppe (24 Vereine), Gruppen zu sechs, 10 Spieltage; die
//    vier Besten jeder Gruppe spielen die Endrunde (16 Teams, K.-o., ein Spiel, Verlängerung 2 × 15 und Elfmeterschießen).
//  - Hauptrunde (2. Saisonhälfte): alle übrigen, Gruppen zu acht, 14 Spieltage; dazu bis zu elf Amateurvereine, die nach der
//    Hinrunde ihre Verbandsliga anführen (direkter Aufstieg zur Hauptrunde).
// Im Spiel: Ohne Leistungszentrum (facilities.js „nlz“) spielt die A-Jugend in der Verbandsliga (Spielwert: zehn Teams, Hin- und
// Rückrunde); wer nach der Hinrunde Erster ist, wechselt in die Hauptrunde der Nachwuchsliga. Gegnerstärken, Kosten und die
// Wirkung auf die Entwicklung sind Spielwerte. Gegner sind erfundene Vereine aus den Ligen der Pyramide („… U19“).
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { rankTable } from '../core/standings.js';
import { NIVEAU_TARGET, PRO_TARGET } from '../sim/niveau.js';
import { book } from './finances.js';
import { hasFacility } from './facilities.js';
import { membersOf } from './pyramid.js';

export const U19_FROM = 9; // ab der Regionalliga (wie die Zweite)
export const U19_GROWTH = { vl: 1.08, haupt: 1.12, vor: 1.12, meister: 1.18 }; // Entwicklung mit ≥ 5 Einsätzen (Spielwerte)
export const U19_MIN_APPS = 5;
export const u19Cost = (tier) => (tier === 'nwl' ? 120 : 60); // € je Woche: Schiri, Fahrten, Meldegeld (Spielwerte)

// Phasen: Größe der Gruppe, Spieltage (doppelte Runde), Stärke der Gegner (Ligamittel einer Herren-Liga, Spielwert).
const PHASES = {
  vl: { teams: 10, rounds: 18, level: 6, spread: 8, name: () => tr('A-Junioren-Verbandsliga', 'U19 State League') },
  vor: { teams: 8, rounds: 14, level: 8, spread: 8, name: () => tr('U19-Nachwuchsliga, Vorrunde', 'U19 Youth League, first phase') },
  meister: { teams: 6, rounds: 10, level: 9, spread: 6, name: () => tr('U19-Nachwuchsliga, Meisterrunde', 'U19 Youth League, championship round') },
  haupt: { teams: 8, rounds: 14, level: 7, spread: 8, name: () => tr('U19-Nachwuchsliga, Hauptrunde', 'U19 Youth League, main round') },
};
export const phaseName = (id) => PHASES[id]?.name() ?? '';

const strengthAt = (level) => (level >= 9 ? PRO_TARGET[Math.min(12, level)] : NIVEAU_TARGET[Math.max(0, level - 1)]);
const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x6a09e667);

export const u19Of = (c) => c.u19 ?? null;
export const hasLZ = (c) => hasFacility(c, 'nlz');

function names(c, level, n) {
  const human = (c.clubs ?? []).find((x) => x.human)?.name;
  const out = [];
  for (let l = Math.min(12, level + 3); l >= Math.max(5, level - 2) && out.length < n * 3; l--) out.push(...membersOf(c, l).map((d) => d?.name ?? d));
  return [...new Set(out.filter((x) => x && x !== human))].map((x) => `${x} U19`);
}

function freshGroup(c, phase, salt, season = c.season ?? 1) {
  const P = PHASES[phase];
  const rng = createRng(hashSeed(c.seed ?? 0, season, salt, 19));
  const pool = names(c, P.level, P.teams);
  const base = strengthAt(P.level);
  const teams = [];
  for (let i = 0; i < P.teams - 1; i++) {
    const name = pool.length ? pool.splice(rng.int(0, pool.length - 1), 1)[0] : tr(`JFV Feld ${i + 1}`, `JFV Feld ${i + 1}`);
    teams.push({ id: `u${i}`, name, str: Math.round(base + rng.range(-P.spread, P.spread)), pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  }
  teams.push({ id: 'own', name: tr('Eigene A-Jugend', 'Our U19s'), own: true, str: 0, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  return { phase, round: 0, teams, games: [] };
}

// Saisonstart (und Anmeldung): Nachwuchsliga mit Leistungszentrum oder Qualifikation, sonst Verbandsliga.
function startSeason(c, prev = null, season = c.season ?? 1) {
  const nwl = hasLZ(c) || !!prev?.qualified;
  return { since: prev?.since ?? season, tier: nwl ? 'nwl' : 'vl', qualified: false, group: freshGroup(c, nwl ? 'vor' : 'vl', 1, season), last: null, endrunde: null, history: prev?.history ?? [] };
}

// Die A-Jugend spielt automatisch, sobald der Verein in der Regionalliga ist (eine A-Jugend hat jeder Verein hier).
export function ensureU19(c) {
  if (c.u19 || (c.level ?? 1) < U19_FROM) return c.u19 ?? null;
  c.u19 = startSeason(c);
  return c.u19;
}

const lambda = (us, them) => Math.min(4.5, Math.max(0.2, 1.35 * 2 ** ((us - them) / 15)));
function poisson(rng, l) {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 12);
  return k - 1;
}
function score(t, f, x) {
  t.gf += f;
  t.ga += x;
  if (f > x) (t.w++, (t.pts += 3));
  else if (f === x) (t.d++, (t.pts += 1));
  else t.l++;
}
function pairings(round, n) {
  const r = round % (n - 1);
  const idx = [...Array(n).keys()];
  const rot = [idx[0], ...idx.slice(1).map((_, k) => idx[1 + ((k + r) % (n - 1))])];
  const out = [];
  for (let i = 0; i < n / 2; i++) out.push(round < n - 1 ? [rot[i], rot[n - 1 - i]] : [rot[n - 1 - i], rot[i]]); // Rückrunde: Heimrecht getauscht
  return out;
}

export const u19Table = (g) => rankTable(g.teams, g.games, { fallback: (x, y) => x.name.localeCompare(y.name) });
const place = (g) => u19Table(g).findIndex((t) => t.own) + 1;

// Wer spielt? Die Talente der A-Jugend (bis 18), die nicht bei der Ersten gespielt haben – alle bekommen den Einsatz.
export function u19Eleven(c, { playerOf, prospects = [], usedFirst = new Set(), unavailable = () => false }) {
  return prospects
    .filter((idx) => !usedFirst.has(idx) && !unavailable(idx) && playerOf(c, idx).age <= 18)
    .map((idx) => ({ idx, r: playerOf(c, idx).rating }))
    .sort((a, b) => b.r - a.r);
}

// Ein Spieltag (einmal je Ligarunde der Ersten). Gibt eine Chatzeile zurück oder null.
export function u19Matchday(c, deps) {
  const u = c.u19;
  if (!u) return null;
  const g = u.group;
  const P = PHASES[g.phase];
  if (g.round >= P.rounds) return null;
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, g.round, idOf(g.phase), 29));
  const eleven = u19Eleven(c, deps);
  const own = g.teams.find((t) => t.own);
  // Die A-Jugend hat mehr Spieler als die Talente im Spiel (prospects): Die übrigen Jugendlichen spielen knapp unter dem
  // Ligamittel (Spielwert −4). Aufgestellt werden die besten Elf aus beiden – ein schwaches Talent drückt das Team nicht.
  const fill = strengthAt(P.level) - 4;
  const best = [...eleven.map((x) => x.r), ...Array(11).fill(fill)].sort((a, b) => b - a).slice(0, 11);
  own.str = best.reduce((s, r) => s + r, 0) / 11;
  let line = null;
  for (const [i, j] of pairings(g.round, g.teams.length)) {
    const a = g.teams[i];
    const b = g.teams[j];
    const ga = poisson(rng, lambda(a.str, b.str));
    const gb = poisson(rng, lambda(b.str, a.str));
    score(a, ga, gb);
    score(b, gb, ga);
    g.games.push({ home: a.id, away: b.id, hg: ga, ag: gb });
    if (a.own || b.own) {
      const opp = a.own ? b : a;
      const [gf, gx] = a.own ? [ga, gb] : [gb, ga];
      u.last = { opp: opp.name, gf, ga: gx, home: a.own };
      for (const x of eleven) {
        const rec = c.players[x.idx];
        if (rec) rec.appsU19 = (rec.appsU19 ?? 0) + 1;
      }
      line = tr(`A-Jugend gegen ${opp.name}: ${gf}:${gx}.`, `U19s v ${opp.name}: ${gf}–${gx}.`);
    }
  }
  g.round++;
  book(c, tr('A-Jugend (Schiri, Fahrten, Meldegeld)', 'U19s (referees, travel, fees)'), -u19Cost(u.tier));
  // Phase vorbei → nächste Phase (Meister-/Hauptrunde) bzw. Wechsel nach der Hinrunde der Verbandsliga.
  const note = advance(c, u);
  return note ? `${line} ${note}` : line;
}
const idOf = (phase) => ['vl', 'vor', 'meister', 'haupt'].indexOf(phase) + 1;

function advance(c, u) {
  const g = u.group;
  const P = PHASES[g.phase];
  if (g.phase === 'vl' && g.round === P.rounds / 2 && place(g) === 1) {
    u.history.push({ season: c.season ?? 1, phase: 'vl', place: 1, half: true });
    u.group = freshGroup(c, 'haupt', 3);
    return tr('Herbstmeister! Die A-Jugend steigt direkt in die Hauptrunde der Nachwuchsliga auf.', 'Top at the halfway mark! The U19s go straight up to the main round of the Youth League.');
  }
  if (g.phase !== 'vor' || g.round < P.rounds) return null;
  const pl = place(g);
  u.history.push({ season: c.season ?? 1, phase: 'vor', place: pl });
  u.group = freshGroup(c, pl <= 2 ? 'meister' : 'haupt', 2);
  return pl <= 2 ? tr(`Platz ${pl} in der Vorrunde – ab in die Meisterrunde!`, `Finished ${pl} in the first phase – into the championship round!`) : tr(`Platz ${pl} in der Vorrunde – weiter in der Hauptrunde.`, `Finished ${pl} in the first phase – on to the main round.`);
}

// Endrunde (16 Teams, K.-o.): nur für die vier Besten einer Meisterrunden-Gruppe. Gegner um die Stärke der Meisterrunde.
function endrunde(c, u, own) {
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, 77, 31));
  const base = strengthAt(PHASES.meister.level);
  const steps = [tr('Achtelfinale', 'Round of 16'), tr('Viertelfinale', 'Quarter-final'), tr('Halbfinale', 'Semi-final'), tr('Finale', 'Final')];
  for (let i = 0; i < steps.length; i++) {
    const opp = base + 4 * i + rng.range(-6, 6); // je Runde stärker (Spielwert)
    let gf = poisson(rng, lambda(own, opp));
    let ga = poisson(rng, lambda(opp, own));
    if (gf === ga) {
      gf += poisson(rng, lambda(own, opp) / 3); // Verlängerung 2 × 15 = ein Drittel der Spielzeit
      ga += poisson(rng, lambda(opp, own) / 3);
    }
    const won = gf > ga || (gf === ga && rng.chance(0.5)); // sonst Elfmeterschießen
    if (!won) return { out: steps[i], champion: false };
  }
  return { out: null, champion: true };
}

// Saisonende: Rest der Phase rechnen, Endrunde, Qualifikation für die nächste Vorrunde. Gibt eine Chatzeile zurück.
export function u19SeasonEnd(c, deps) {
  const u = ensureU19(c);
  if (!u) return null;
  for (let guard = 0; guard < 40 && u.group.round < PHASES[u.group.phase].rounds; guard++) u19Matchday(c, deps);
  const g = u.group;
  const pl = place(g);
  let text;
  let qualified = false;
  if (g.phase === 'meister') {
    qualified = true; // Meisterrunde = für die nächste Vorrunde qualifiziert
    if (pl <= 4) {
      const own = g.teams.find((t) => t.own).str;
      u.endrunde = endrunde(c, u, own);
      text = u.endrunde.champion
        ? tr('Die A-Jugend ist Deutscher Meister der U19!', 'The U19s are national U19 champions!')
        : tr(`A-Jugend: Platz ${pl} in der Meisterrunde, in der Endrunde aus im ${u.endrunde.out}.`, `U19s: ${pl} in the championship round, out in the ${u.endrunde.out} of the finals.`);
    } else text = tr(`A-Jugend: Platz ${pl} in der Meisterrunde.`, `U19s: finished ${pl} in the championship round.`);
  } else if (g.phase === 'haupt') {
    qualified = pl <= g.teams.length / 2; // obere Tabellenhälfte
    text = tr(`A-Jugend: Platz ${pl} in der Hauptrunde${qualified ? ' – nächste Saison wieder in der Vorrunde der Nachwuchsliga.' : '.'}`, `U19s: finished ${pl} in the main round${qualified ? ' – back in the Youth League first phase next season.' : '.'}`);
  } else text = tr(`A-Jugend: Platz ${pl} in der Verbandsliga.`, `U19s: finished ${pl} in the state league.`);
  u.history.push({ season: c.season ?? 1, phase: g.phase, place: pl, ...(u.endrunde ? { endrunde: u.endrunde.champion ? 'meister' : u.endrunde.out } : {}) });
  c.u19 = startSeason(c, { ...u, qualified }, (c.season ?? 1) + 1); // neue Gegner für die kommende Saison
  return text;
}

// Entwicklung: Wer regelmäßig spielt (≥ 5 Einsätze), entwickelt sich besser – je höher die Runde, desto mehr.
export function u19Growth(c, idx) {
  const u = c.u19;
  const rec = c.players[idx];
  if (!u || (rec?.appsU19 ?? 0) < U19_MIN_APPS) return 1;
  const best = u.history.filter((h) => h.season === (c.season ?? 1)).map((h) => U19_GROWTH[h.phase] ?? 1);
  return Math.max(U19_GROWTH[u.group.phase] ?? 1, ...best);
}
