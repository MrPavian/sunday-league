// Profile (AFS Phase 5, docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md Abschnitt 4.1): Spieler, Vereine und Trainer über die
// laufende Saison, gelesen aus den Saisonsummen (career/seasonstats.js). Nichts davon wird gespeichert – die Summen sind die
// einzige Quelle, Profile werden beim Lesen berechnet (kein zweiter Stand, der auseinanderlaufen kann).
//
// Spielerwert = (Summe + k · Positionsmittel der Liga) / (Spielanteil + k)  – Schrumpfung zum Mittel, Herkunft ESTIMATED.
// k ist gemessen (docs/ADVANCED-FOOTBALL-SYSTEM-05-PROFILES.md): Kreuzvalidierung auf den 320 Basis-Spielen aus Phase 3
// (Rasenplatz und Großfeld, feste Paarungen), ein k je Wert, das auf beiden Plätzen und für 3–30 Einsätze höchstens so viel
// Fehler macht wie angegeben über dem je Platz besten k:
//   pass 6,5 (≤ 1,05×), xg 12,5 (≤ 1,19×), duel 12 (≤ 1,02×).
// Nur Werte, die Phase 3 für Spieler freigegeben hat (Pässe, xG, Zweikämpfe als Zählung). Vergleich nur relativ: Perzentil unter
// den Spielern derselben Position in der eigenen Liga.
//
// Vereine anderer Ligen spielen nicht mit voller Engine (Tabelle per Poisson, pyramid.js simTable) und haben keine Kader: für sie
// gibt es nur ein Werte-Profil (Stärke, Rang der Stärke in ihrer Liga, Trainertyp), Herkunft MODELED (Entscheidung E2 b).
// Ausnahme (E2 a, Phase 5b): die Nachbarn aus dem Transfermarkt bekommen Spielerprofile aus Messspielen (samplePlayerProfiles).
import { seasonRow, PKEYS } from '../career/seasonstats.js';
import { getPool, playerOf } from '../career/career.js';
import { defStrength, membersOf } from '../career/pyramid.js';
import { coachOf } from '../career/opponents.js';
import { TOP_NIVEAU } from '../sim/niveau.js';
import { tstate } from '../career/transfers.js';
import { sampleStore } from './sample.js';

export const PROFILE = {
  k: { pass: 6.5, xg: 12.5, duel: 12 }, // gemessen, siehe oben
};
const VALUE = { pass: (r) => r.pass, xg: (r) => r.xg, duel: (r) => r.duelWon + r.duelLost };
export const PROFILE_KEYS = Object.keys(VALUE);

// Zeile eines Spielers mit Spielanteil (null, wenn es keine gibt oder sie aus einem älteren Stand ohne Spielanteil stammt).
function rowOf(rec) {
  const arr = rec?.an;
  if (!arr || arr.length < PKEYS.length) return null;
  const r = seasonRow(arr, PKEYS);
  return r.share > 0 ? r : null;
}

// Positionsmittel der Liga: Summe aller Werte / Summe aller Spielanteile der Spieler dieser Position (je Wert). Nur Spieler,
// die jetzt in einem Kader der eigenen Liga stehen (Abgänge in andere Ligen zählen nicht mehr mit).
function positionMeans(career, entries = (career.clubs ?? []).flatMap((c) => c.squad ?? []).map((idx) => [idx, rowOf(career.players?.[idx])])) {
  const acc = {};
  for (const [idx, r] of entries) {
    if (!r) continue;
    const pos = playerOf(career, idx)?.position;
    const a = (acc[pos] ??= { share: 0, players: [], ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, 0])) });
    a.share += r.share;
    for (const k of PROFILE_KEYS) a[k] += VALUE[k](r);
    a.players.push([idx, r]);
  }
  return acc;
}

const shrink = (sum, share, mu, k) => (sum + k * mu) / (share + k);

// Profile aller Spieler der eigenen Liga mit Daten: { idx: { position, share, values: { k: { v, raw, pct } }, src } }.
// pct = Anteil der Spieler derselben Position mit kleinerem Wert (0 … 1), bei Gleichstand halb gezählt.
export function playerProfiles(career, entries) {
  const out = {};
  for (const [pos, a] of Object.entries(positionMeans(career, entries))) {
    const mu = Object.fromEntries(PROFILE_KEYS.map((k) => [k, a[k] / a.share]));
    const rows = a.players.map(([idx, r]) => ({
      idx,
      share: r.share,
      values: Object.fromEntries(PROFILE_KEYS.map((k) => [k, { v: shrink(VALUE[k](r), r.share, mu[k], PROFILE.k[k]), raw: VALUE[k](r) / r.share }])),
    }));
    for (const k of PROFILE_KEYS) {
      for (const p of rows) {
        let below = 0;
        for (const q of rows) if (q !== p) below += q.values[k].v < p.values[k].v ? 1 : q.values[k].v === p.values[k].v ? 0.5 : 0;
        p.values[k].pct = rows.length > 1 ? below / (rows.length - 1) : null;
      }
    }
    for (const p of rows) out[p.idx] = { position: pos, share: p.share, mean: mu, values: p.values, src: 'ESTIMATED' };
  }
  return out;
}
export const playerProfile = (career, idx) => playerProfiles(career)[idx] ?? null;

// Spieler der Nachbarn einer Nachbarliga aus den Messspielen (AFS Phase 5b, intel/sample.js): gleiche Rechnung, Mittel und
// Perzentil aber nur unter den gemessenen Spielern dieser Liga (anderes Format, andere Stärke). sample = Messspiele des Vereins.
export function samplePlayerProfiles(career, level) {
  const nb = sampleStore(career);
  if (!nb) return {};
  const clubs = (tstate(career).neighbors ?? []).filter((n) => n.level === level);
  const games = Object.fromEntries(clubs.flatMap((n) => n.squad.map((idx) => [idx, nb.n[n.id] ?? 0])));
  const entries = clubs.flatMap((n) => n.squad).map((idx) => [idx, rowOf({ an: nb.p[idx] })]);
  const out = playerProfiles(career, entries);
  for (const [idx, p] of Object.entries(out)) Object.assign(p, { level, sample: games[idx] });
  return out;
}

// Vereinsprofil der laufenden Saison (eigene Liga, volle Engine). Raten je Spiel bzw. je Pass; Stufen bildet die Anzeige.
export function teamProfile(career, id) {
  return clubProfile(career.an?.clubs?.[id]);
}
// Dasselbe aus einem Vereinsdatensatz (career.an.clubs[id] oder ein Ausschnitt daraus, etwa „seit dem Hinweis“).
export function clubProfile(c) {
  if (!c?.s || !c.n) return null;
  const r = seasonRow(c.s);
  const ratio = (a, b) => (b > 0 ? a / b : null);
  return {
    n: c.n,
    src: 'MEASURED',
    passPct: ratio(r.passOk, r.pass),
    packing: ratio(r.packing, r.passOk),
    xg: r.xg / c.n,
    xgA: (c.xgA ?? 0) / 100 / c.n,
    tilt: ratio(c.third[2], c.third[2] + (c.attA ?? 0)),
    row: r,
  };
}

// Trainerprofil: Befehle des KI-Trainers im Spiel je Gruppe und je Spiel (MEASURED aus m.decisions). Nur CPU-Vereine: beim
// eigenen Verein stammen KI-Befehle aus automatisch simulierten Spielen, nicht vom Menschen.
export function coachProfile(career, id) {
  const c = career.an?.clubs?.[id];
  if (!c?.n || (career.clubs ?? []).find((x) => x.id === id)?.human) return null;
  const dec = c.dec ?? {};
  const total = Object.values(dec).reduce((s, x) => s + x, 0);
  const top = Object.entries(dec).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return { n: c.n, src: 'MEASURED', perMatch: total / c.n, byGroup: Object.fromEntries(Object.entries(dec).map(([g, x]) => [g, x / c.n])), top };
}

// Werte-Profile einer anderen Liga (kein Kader, keine Spieldaten): Stärke wie in simTable, Rang 1 = stärkster Verein.
export function modeledProfiles(career, level, pool = getPool(), topNiv = career.pro ? TOP_NIVEAU : 8) {
  const defs = membersOf(career, level);
  const rows = defs.map((d) => ({ id: d.id, str: defStrength(d, pool, level, career.strength ?? 1, topNiv), coach: coachOf(d).type }));
  const order = [...rows].sort((a, b) => b.str - a.str || a.id.localeCompare(b.id));
  return Object.fromEntries(rows.map((r) => [r.id, { src: 'MODELED', str: r.str, rank: order.indexOf(r) + 1, of: rows.length, coach: r.coach }]));
}
