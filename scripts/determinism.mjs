// Seed-Determinismus über Code-Stände: spielt Karriere (2 Seeds, volle Saison + Saisonwechsel),
// Einzelspiele je Platz und einen Spielstand weiter und schreibt SHA-256-Hashes. Unter zwei Ständen
// ausführen (z. B. git worktree) und die JSON-Dateien vergleichen – sie müssen gleich sein.
// Aufruf: node determinism.mjs <repo-root> <out.json> [save-in.json]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const [root, out, saveIn] = process.argv.slice(2);
const C = await import(`${root}/src/career/career.js`);
const M = await import(`${root}/src/sim/match.js`);
const h = (x) => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
const res = { career: {}, matches: {}, save: null };
function round(c) {
  for (const f of C.currentFixtures(c)) { const p = C.prepareMatch(c, f, { duration: 240 }); C.simulateSync(p); C.recordResult(c, f, p); }
  C.finishRound(c);
  return C.migrateCareer(JSON.parse(JSON.stringify(c)));
}
let midSave = null;
for (const seed of [11, 4242]) {
  let c = C.createCareer({ seed });
  const trail = [h(c)];
  while (!C.seasonOver(c)) { c = round(c); trail.push(h(c)); if (seed === 11 && c.round === 5) midSave = JSON.stringify(c); }
  C.nextSeason(c); trail.push(h(c));
  for (let r = 0; r < 3; r++) { c = round(c); trail.push(h(c)); }
  res.career[seed] = { rounds: trail.length, final: h(c), trail };
}
// Einzelspiele je Platz
const { createMatch, stepMatch } = M;
const pitches = (await import(`${root}/src/sim/pitch.js`).catch(() => null))?.PITCHES;
if (pitches) for (const id of Object.keys(pitches)) {
  const m = createMatch({ seed: 777, pitch: pitches[id], human: null, duration: 120, incidents: true });
  let steps = 0; while (m.phase !== 'ended' && steps < 60 * 400) { stepMatch(m, undefined, 1 / 60); steps++; }
  res.matches[id] = { score: m.score, steps, hash: h({ s: m.score, b: m.ball.pos, p: m.players?.map?.((p) => [p.pos.x, p.pos.z]) }) };
}
// Spielstand fortsetzen: mitgegebener (alter) Spielstand oder eigener Zwischenstand
const src = saveIn ? readFileSync(saveIn, 'utf8') : midSave;
let s = C.migrateCareer(JSON.parse(src));
const strail = [h(s)];
while (!C.seasonOver(s)) { s = round(s); strail.push(h(s)); }
res.save = { final: h(s), trail: strail };
if (!saveIn) writeFileSync(out.replace('.json', '.save.json'), midSave);
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(root.split('/').pop(), 'Karriere:', Object.entries(res.career).map(([k, v]) => `${k}:${v.final}(${v.rounds})`).join(' '), '| Spiele:', Object.keys(res.matches).length, '| Spielstand:', res.save.final);
