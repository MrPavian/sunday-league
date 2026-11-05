// Profiligen (Konzept Profiligen): Geldfluss einer Saison in Regionalliga und 3. Liga mit einem ligatypischen Kader.
// Der eigene Kader wird durch den Kader des stärksten CPU-Vereins ersetzt, damit Gehälter und Stärke zur Liga passen.
// Aufruf: node scripts/pro-audit.mjs [seed]   (START=10 node … für 2. und 1. Liga)
import { createCareer, humanClub, nextSeason, seasonOver, finishRound, playerOf, table } from '../src/career/career.js';
import { payroll } from '../src/career/contracts.js';
import { facilities, capacity, fansMul } from '../src/career/facilities.js';
import { entryFee, UPPER_FANS, TV_MONEY } from '../src/career/finances.js';

const seed = Number(process.argv[2] ?? 5);
const c = createCareer({ seed });
const me = () => humanClub(c);
const top11 = (club) => { const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11); return r.reduce((s, x) => s + x, 0) / r.length; };
function playSeason(win) {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me().id ? { home: win ? 2 : 1, away: 1 } : f.away === me().id ? { home: 1, away: win ? 2 : 1 } : { home: 1, away: 1 };
    finishRound(c);
  }
}
const all = [];
const tap = () => {
  if (c.ledger.tapped) return;
  const push = c.ledger.push.bind(c.ledger);
  c.ledger.push = (...xs) => (all.push(...xs), push(...xs));
  c.ledger.tapped = true;
};
const start = Number(process.env.START ?? 8);
c.level = start;
c.cash = 1e8; // reicht für jeden Finanznachweis (license.js)
for (const id of ['stadion', 'flutlicht', 'drittliga', 'flutlicht800', 'arena', 'rasenheizung', 'flutlicht1200', 'sitzplatz8000', 'flutlicht1800']) facilities(c).built[id] = 1; // Zulassung (license.js)
playSeason(true);
nextSeason(c); // → nächste Stufe
for (let s = 0; s < 2; s++) {
  // eigener Kader = stärkster CPU-Kader der Liga
  const sorted = c.clubs.filter((x) => !x.human).sort((a, b) => top11(b) - top11(a));
  const best = sorted[process.env.PICK === 'top' ? 0 : Math.floor(sorted.length / 2)]; // Standard: mittlerer Verein der Liga
  const swap = best.squad;
  best.squad = me().squad;
  me().squad = swap;
  for (const idx of me().squad) delete c.players[idx].contract;
  const cash0 = c.cash;
  tap();
  const log0 = all.length;
  playSeason(true);
  const pay = payroll(c);
  const lines = {};
  for (const e of all.slice(log0)) {
    const k = String(e.text ?? e.label ?? '').replace(/\(.*?\)|\d[\d.]*/g, '').trim().slice(0, 34);
    lines[k] = (lines[k] ?? 0) + (e.amount ?? 0);
  }
  console.log(`\n${c.league} (Stufe ${c.level}), eigener Kader Ø beste 11: ${top11(me()).toFixed(1)}, ${c.fixtures.length} Spieltage`);
  console.log(`Gehälter: ${pay.n} Spieler, ${pay.monthly} €/Monat, ${pay.round} € je Spieltag`);
  // Heimspiele laufen im Spiel über matchFinances (echtes Spiel) – hier als Erwartung: mittlere Zuschauer × Fanfaktor, gedeckelt.
  const [lo, hi] = UPPER_FANS[c.level];
  const fans = Math.min(capacity(c), ((lo + hi) / 2) * fansMul(c));
  const gate = Math.round((c.fixtures.length / 2) * fans * (2.5 + entryFee(c.level)));
  console.log(`Saisonergebnis ohne Heimspiele: ${Math.round(c.cash - cash0)} €; Heimspiele (Erwartung): +${gate} € (${Math.round(fans)} Zuschauer je Spiel)`);
  console.log(`Saldo mit Heimspielen: ${Math.round(c.cash - cash0 + gate)} €`);
  console.table(Object.fromEntries(Object.entries(lines).sort((a, b) => a[1] - b[1]).map(([k, v]) => [k, Math.round(v)])));
  nextSeason(c);
}
