// Saisonsummen der Spieldaten (AFS Phase 1): Ligaspiele (recordResult) addieren die Spielzusammenfassung aus sim/analytics.js
// je Spieler (career.players[idx].an) und je Verein (career.an.clubs[id]). Zum Saisonende bekommt der eigene Kader seine Zeile
// in die Saisonchronik (rec.seasons[].an), der Verein seine in career.an.history (höchstens SEASON_AN.history Saisons; xgA
// und attA = xG und Sekunden im letzten Drittel der Gegner); danach beginnt alles bei null. Nur volle Simulation hat diese Daten: Spiele anderer Ligen
// (Poisson) tragen nichts bei (Audit, Regel 9).
// xG und xA werden als Hundertstel gespeichert (ganze Zahlen, kleiner Spielstand).
// Phase 5 (Profile): Spielerzeilen tragen am Ende zusätzlich den Spielanteil (share, Hundertstel eines ganzen Spiels, aus
// m.stats.players[].seconds) – Zeilen aus älteren Ständen ohne ihn bleiben bis Saisonende ohne (sonst stimmte die Rate nicht).
// Vereine zählen die Befehle ihres KI-Trainers je Gruppe (dec, aus m.decisions mit by 'ai').
import { KEYS } from '../sim/analytics.js';
import { allPlayers } from '../sim/squad.js';

export const SEASON_AN = { history: 5 }; // Spielwert: so viele Saisons Vereinsbilanz bleiben gespeichert
export const PKEYS = [...KEYS, 'share']; // Spielerzeile
const HUNDREDTHS = new Set(['xg', 'xa', 'share']);
const toInt = (k, v) => (HUNDREDTHS.has(k) ? Math.round(v * 100) : v);
const addRow = (dst, r, keys = KEYS) => keys.map((k, i) => (dst?.[i] ?? 0) + toInt(k, r[k]));

// Nach einem Ligaspiel (career.js recordResult). Team 0 ist der eigene Verein, wenn er auswärts spielt.
export function recordSeasonAnalytics(career, fixture, prepared) {
  const m = prepared.match;
  if (!m?.an) return;
  const clubOf = (t) => ((t === 0) !== !!prepared.humanIsAway ? fixture.home : fixture.away);
  for (const p of allPlayers(m)) {
    const rec = career.players[p.poolIndex];
    const r = m.an.players[p.id];
    if (!rec || !r || !KEYS.some((k) => r[k])) continue;
    const share = (m.stats?.players?.[p.id]?.seconds ?? 0) / (m.duration || 1);
    rec.an = addRow(rec.an, { ...r, share }, !rec.an || rec.an.length >= PKEYS.length ? PKEYS : KEYS);
  }
  const an = (career.an ??= { v: 1, keys: KEYS, clubs: {}, history: [] });
  an.pkeys = PKEYS;
  m.an.teams.forEach((t, i) => {
    const id = clubOf(i);
    const c = (an.clubs[id] ??= { n: 0, s: null, third: [0, 0, 0], xgA: 0, attA: 0 });
    c.n++;
    c.s = addRow(c.s, t);
    c.xgA = (c.xgA ?? 0) + Math.round(m.an.teams[1 - i].xg * 100); // xG des Gegners (Hundertstel)
    c.third = c.third.map((x, j) => x + Math.round(t.third[j]));
    c.attA = (c.attA ?? 0) + Math.round(m.an.teams[1 - i].third[2]); // Sekunden des Gegners im letzten Drittel (Feldvorteil)
    for (const d of m.decisions ?? []) if (d.team === i && d.by === 'ai') (c.dec ??= {})[d.group] = (c.dec[d.group] ?? 0) + 1;
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
