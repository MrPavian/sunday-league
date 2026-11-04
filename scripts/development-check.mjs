// Entwicklung der eigenen Spieler nachmessen (development.js): je Liga N Karrieren, 8 Saisons Vorbereitung mit
// Spielpraxis (8 Einsätze), ohne Tapetenwechsel. Zielwerte (Nutzer, 2026-10-23) für 16- bis 20-Jährige:
// Ø etwa +8 (Freizeitliga) bzw. +14 (Bezirksliga), 5–10 % Durchbrüche (mindestens 7 über dem Ligaschnitt, also etwa
// +15 bzw. +21), 10–15 % bei höchstens +3.
//   node scripts/development-check.mjs [N=60]   (STRENGTH=1 für das alte Stärkemodell, LEVELS=1,5,8 für andere Ligen)
import { createCareer, developPlayers, humanClub, playerOf, SQUAD_SHAPES, squadPicker } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { createRng } from '../src/core/rng.js';
import { talentOf } from '../src/career/development.js';

const N = Number(process.argv[2] ?? 60);
const out = {};
const LEVELS = (process.env.LEVELS ?? '1,5').split(',').map(Number);
for (const level of LEVELS) {
  const rows = [];
  for (let seed = 1; seed <= N; seed++) {
    const c = createCareer({ seed });
    if (process.env.STRENGTH) c.strength = Number(process.env.STRENGTH);
    c.level = level;
    // Stärkemodell 3: Kader der gemessenen Liga (Niveau je Spieler), sonst misst man Freizeitliga-Spieler mit Oberliga-Umfeld.
    if (level > 1 && (c.strength ?? 1) >= 3) {
      const used = new Set(c.clubs.flatMap((k) => k.squad));
      const squad = squadPicker(createRng(seed * 31 + level), used, level)({ ok: 0.5, gut: 0.35, stark: 0.13, dorfstar: 0.02 }, SQUAD_SHAPES[LEAGUES[level].squadShape]);
      humanClub(c).squad = squad;
      for (const i of squad) c.players[i] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, posXp: {} };
    }
    const sq = humanClub(c).squad;
    const start = Object.fromEntries(sq.map((i) => [i, playerOf(c, i)]));
    for (let s = 0; s < 8; s++) {
      for (const i of sq) c.players[i].apps = 8;
      developPlayers(c);
      c.season++;
    }
    for (const i of sq) rows.push({ age: start[i].age, d: playerOf(c, i).rating - start[i].rating, talent: talentOf(c, i)?.id ?? '-' });
  }
  const bands = {};
  for (const [a, b] of [[16, 20], [21, 23], [24, 29], [30, 34], [35, 50]]) {
    const x = rows.filter((r) => r.age >= a && r.age <= b).map((r) => r.d);
    if (!x.length) continue;
    const mean = x.reduce((s, v) => s + v, 0) / x.length;
    bands[`${a}-${b}`] = { n: x.length, mean: +mean.toFixed(1), big: +(x.filter((v) => v >= mean + 7).length / x.length).toFixed(3), stuck: +(x.filter((v) => v <= 3).length / x.length).toFixed(3), min: Math.min(...x), max: Math.max(...x) };
  }
  const young = rows.filter((r) => r.age >= 16 && r.age <= 20);
  bands.talent = {};
  for (const t of [...new Set(young.map((r) => r.talent))]) {
    const x = young.filter((r) => r.talent === t).map((r) => r.d);
    bands.talent[t] = { n: x.length, mean: +(x.reduce((s, v) => s + v, 0) / x.length).toFixed(1), stuck: +(x.filter((v) => v <= 3).length / x.length).toFixed(2) };
  }
  out[`Stufe ${level}`] = bands;
}
console.log(JSON.stringify(out, null, 1));
