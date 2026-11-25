// Saisonsummen der Spieldaten (AFS Phase 1): Ligaspiele (recordResult) addieren die Spielzusammenfassung aus sim/analytics.js
// je Spieler (career.players[idx].an) und je Verein (career.an.clubs[id]). Zum Saisonende bekommt der eigene Kader seine Zeile
// in die Saisonchronik (rec.seasons[].an), der Verein seine in career.an.history (höchstens HISTORY Saisons); danach beginnt
// alles bei null. Nur volle Simulation hat diese Daten: Spiele anderer Ligen (Poisson) tragen nichts bei (Audit, Regel 9).
// xG und xA werden als Hundertstel gespeichert (ganze Zahlen, kleiner Spielstand).
import { KEYS } from '../sim/analytics.js';
import { allPlayers } from '../sim/squad.js';

export const SEASON_AN = { history: 5 }; // Spielwert: so viele Saisons Vereinsbilanz bleiben gespeichert
const HUNDREDTHS = new Set(['xg', 'xa']);
const toInt = (k, v) => (HUNDREDTHS.has(k) ? Math.round(v * 100) : v);
const addRow = (dst, r) => KEYS.map((k, i) => (dst?.[i] ?? 0) + toInt(k, r[k]));

// Nach einem Ligaspiel (career.js recordResult). Team 0 ist der eigene Verein, wenn er auswärts spielt.
export function recordSeasonAnalytics(career, fixture, prepared) {
  const m = prepared.match;
  if (!m?.an) return;
  const clubOf = (t) => ((t === 0) !== !!prepared.humanIsAway ? fixture.home : fixture.away);
  for (const p of allPlayers(m)) {
    const rec = career.players[p.poolIndex];
    const r = m.an.players[p.id];
    if (!rec || !r || !KEYS.some((k) => r[k])) continue;
    rec.an = addRow(rec.an, r);
  }
  const an = (career.an ??= { v: 1, keys: KEYS, clubs: {}, history: [] });
  m.an.teams.forEach((t, i) => {
    const id = clubOf(i);
    const c = (an.clubs[id] ??= { n: 0, s: null, third: [0, 0, 0] });
    c.n++;
    c.s = addRow(c.s, t);
    c.third = c.third.map((x, j) => x + Math.round(t.third[j]));
  });
}

// Saisonende (career.js, nach logSeason, bevor die Zahlen zurückgesetzt werden).
export function closeSeasonAnalytics(career, squad, humanId) {
  for (const idx of squad) {
    const rec = career.players[idx];
    const last = rec?.seasons?.[rec.seasons.length - 1];
    if (rec?.an && last && last.season === career.season) last.an = rec.an;
  }
  for (const rec of Object.values(career.players)) delete rec.an;
  const an = career.an;
  if (!an) return;
  const own = an.clubs[humanId];
  if (own) an.history = [...an.history, { season: career.season, ...own }].slice(-SEASON_AN.history);
  an.clubs = {};
}

// Saisonzeile als Objekt (xG/xA wieder in Toren).
export function seasonRow(arr, keys = KEYS) {
  if (!arr) return null;
  return Object.fromEntries(keys.map((k, i) => [k, HUNDREDTHS.has(k) ? arr[i] / 100 : arr[i]]));
}
