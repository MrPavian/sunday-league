// Entwicklung der eigenen Spieler nachmessen (development.js): je Liga N Karrieren, 8 Saisons Vorbereitung mit
// Spielpraxis (8 Einsätze), ohne Tapetenwechsel. Zielwerte (Nutzer, 2026-10-23) für 16- bis 20-Jährige:
// Ø etwa +8 (Freizeitliga) bzw. +14 (Bezirksliga), 5–10 % Durchbrüche (mindestens 7 über dem Ligaschnitt, also etwa
// +15 bzw. +21), 10–15 % bei höchstens +3.
//   node scripts/development-check.mjs [N=60]
import { createCareer, developPlayers, humanClub, playerOf } from '../src/career/career.js';

const N = Number(process.argv[2] ?? 60);
const out = {};
for (const level of [1, 5]) {
  const rows = [];
  for (let seed = 1; seed <= N; seed++) {
    const c = createCareer({ seed });
    c.level = level;
    const sq = humanClub(c).squad;
    const start = Object.fromEntries(sq.map((i) => [i, playerOf(c, i)]));
    for (let s = 0; s < 8; s++) {
      for (const i of sq) c.players[i].apps = 8;
      developPlayers(c);
      c.season++;
    }
    for (const i of sq) rows.push({ age: start[i].age, d: playerOf(c, i).rating - start[i].rating });
  }
  const bands = {};
  for (const [a, b] of [[16, 20], [21, 23], [24, 29], [30, 34], [35, 50]]) {
    const x = rows.filter((r) => r.age >= a && r.age <= b).map((r) => r.d);
    if (!x.length) continue;
    const mean = x.reduce((s, v) => s + v, 0) / x.length;
    bands[`${a}-${b}`] = { n: x.length, mean: +mean.toFixed(1), big: +(x.filter((v) => v >= mean + 7).length / x.length).toFixed(3), stuck: +(x.filter((v) => v <= 3).length / x.length).toFixed(3), min: Math.min(...x), max: Math.max(...x) };
  }
  out[`Stufe ${level}`] = bands;
}
console.log(JSON.stringify(out, null, 1));
