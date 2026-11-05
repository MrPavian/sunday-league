// Vorstand und Erfolgsdruck (pressure.js): Wie oft gibt es Warnung, Ultimatum und Entlassung je Liga?
// Ergebnisse des eigenen Vereins zufällig (Sieg/Remis/Niederlage nach festen Anteilen), sonst 1:1. Nach einer Entlassung wird
// das erste Angebot angenommen (clubchange.js), dann geht es weiter. Aufstiege werden verzichtet, Abstiege passieren.
// Aufruf: node scripts/pressure-audit.mjs [Saisons=6] [Karrieren=8]
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { board } from '../src/career/pressure.js';
import { takeOver } from '../src/career/clubchange.js';
import { facilities } from '../src/career/facilities.js';

// Echte Liga der Stufe: eine Stufe tiefer anfangen und als Meister aufsteigen (mit Zulassung), dann gilt der Kader der Liga.
function careerAt(seed, level) {
  const c = createCareer({ seed });
  if (level === 1) return c;
  c.level = level - 1;
  for (const id of ['stadion', 'flutlicht', 'drittliga', 'flutlicht800']) facilities(c).built[id] = 1;
  c.cash = 1e7;
  while (!seasonOver(c)) {
    const me = humanClub(c).id;
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me ? { home: 3, away: 0 } : f.away === me ? { home: 0, away: 3 } : { home: 1, away: 1 };
    finishRound(c);
  }
  nextSeason(c);
  board(c).trust = 60;
  return c;
}

const SEASONS = Number(process.argv[2] ?? 6);
const RUNS = Number(process.argv[3] ?? 8);
const MIX = { gut: [0.45, 0.25], mittel: [0.33, 0.27], schlecht: [0.2, 0.25] };
for (const level of [1, 3, 5, 7, 9, 10]) {
  const out = {};
  for (const [form, [pw, pd]] of Object.entries(MIX)) {
    let seasons = 0, warn = 0, ult = 0, fired = 0;
    for (let r = 0; r < RUNS; r++) {
      const c = careerAt(100 + r, level);
      const rng = createRng(500 + r);
      for (let s = 0; s < SEASONS; s++) {
        let w = false, u = false;
        while (!seasonOver(c)) {
          const me = humanClub(c).id;
          for (const f of c.fixtures[c.round]) {
            if (f.result) continue;
            const x = rng.next();
            const res = x < pw ? [2, 0] : x < pw + pd ? [1, 1] : [0, 2];
            f.result = f.home === me ? { home: res[0], away: res[1] } : f.away === me ? { home: res[1], away: res[0] } : { home: 1, away: 1 };
          }
          finishRound(c);
          const b = board(c);
          w ||= b.warned;
          u ||= !!b.ultimatum;
          if (b.fired) {
            fired++;
            takeOver(c, b.fired.offers[0]);
          }
        }
        c.flags.waiveUp = c.season; // Liga halten: auf den Aufstieg verzichten
        nextSeason(c);
        if (board(c).fired) {
          fired++;
          takeOver(c, board(c).fired.offers[0]);
        }
        seasons++;
        warn += w;
        ult += u;
      }
    }
    out[form] = `Warnung ${Math.round((100 * warn) / seasons)} % · Ultimatum ${Math.round((100 * ult) / seasons)} % · Entlassung ${Math.round((100 * fired) / seasons)} % je Saison`;
  }
  console.log(`Stufe ${level}:`, JSON.stringify(out, null, 1));
}
