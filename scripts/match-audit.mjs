// Gesamtprüfung der Match-Engine: Kennzahlen je Spielort und Stärke-Paarung (KI gegen KI, feste Seeds 900+i).
//   node scripts/match-audit.mjs <Platz> <Paarung> [Spiele=60] [Wurzel=.]
// Paarung: ww (schwach–schwach) · ws (schwach–stark) · ss (stark–stark) · bp (Bezirksliga gegen Profi, nur sinnvoll im Stadion)
// Stärke je Paarung: schwach = Kader der Roten Laterne (clubs.js, ok 0,68), stark = stärkster Kreisliga-A-Kader (clubs.js),
// Profi = Erstliga-Kader aus bundespokal.js samt Aufschlag. Der Stärkere spielt bei geraden Seeds als Team 0, bei ungeraden
// als Team 1 (kein Heimvorteil in der Messung). Ausgabe: eine JSON-Zeile mit Summen und eine lesbare Zeile je Zelle.
// Hinweis: Ein Spiel dauert hier die Standardlänge „kurz" des Platzes (Zeitraffer), Werte sind „je Spiel", nicht je 90 Minuten.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const venue = process.argv[2] ?? 'rasenplatz';
const pairing = process.argv[3] ?? 'ss';
const N = +process.argv[4] || 60;
const root = resolve(process.argv[5] ?? '.');
const load = (p) => import(pathToFileURL(`${root}/${p}`).href);
const { createMatch, matchDuration, stepMatch } = await load('src/sim/match.js');
const { PITCHES, STADIUM } = await load('src/sim/pitch.js');
const { generateTeam, ratePlayer } = await load('src/sim/generator.js');
const { normalizeTactic, systemFormation } = await load('src/sim/tactics.js');
const { TEAM_PRESETS } = await load('src/data/teams.js');
const { createRng } = await load('src/core/rng.js');
const { PROFI_KLASSEN, PROFI_ATTRS } = await load('src/career/bundespokal.js');
const { LEAGUES } = await load('src/career/clubs.js');

const pitch = venue === 'stadion' ? STADIUM : PITCHES[venue];
const BENCH_ROLES = { 4: ['mid', 'fwd'], 5: ['def', 'mid', 'fwd'], 7: ['def', 'mid', 'fwd'], 9: ['gk', 'def', 'mid', 'fwd'], 11: ['gk', 'def', 'def', 'mid', 'mid', 'fwd', 'fwd'] };
const WEAK = { ok: 0.68, gut: 0.27, stark: 0.05 };
const STRONG = { ok: 0.12, gut: 0.36, stark: 0.36, dorfstar: 0.13, superstar: 0.03 };
const BEZIRK = LEAGUES[5].clubs[0].tiers;
const PRO = PROFI_KLASSEN.erst;
const KIND = { ww: [WEAK, WEAK], ws: [STRONG, WEAK], ss: [STRONG, STRONG], bp: [PRO.tiers, BEZIRK] }[pairing]; // [stärker, schwächer]

const teamFor = (rng, slot, tiers, boost) => {
  const format = pitch.format ?? 5;
  const plan = normalizeTactic(TEAM_PRESETS[slot].tactic, format);
  const roles = [...systemFormation(format, plan.system).map((f) => f.role), ...(BENCH_ROLES[format] ?? [])];
  const t = generateTeam(rng, TEAM_PRESETS[slot], roles, { tierWeights: tiers });
  if (boost) for (const p of t.players) { for (const k of PROFI_ATTRS) p.attrs[k] = Math.min(0.98, p.attrs[k] + boost); p.rating = ratePlayer(p); }
  return t;
};

const z = { games: 0, goals: 0, ownGoals: 0, shots: 0, onTarget: 0, corners: 0, throwins: 0, goalkicks: 0, gkOutOpp: 0, fouls: 0, freekicks: 0, penalties: 0, penGoals: 0, hdrGoals: 0, cornerGoals: 0, cornerGoalsStrict: 0, cornerHdrGoals: 0, saves: 0, catches: 0, offsides: 0, strongWins: 0, draws: 0, posStrong: 0, posTot: 0, strongGoals: 0, weakGoals: 0, headers: 0, cards: 0, passes: 0 };
const strengthSum = [0, 0];
for (let i = 0; i < N; i++) {
  const rng = createRng(5000 + i);
  const strongSlot = i % 2;
  const teams = [];
  teams[strongSlot] = teamFor(rng, strongSlot, KIND[0], pairing === 'bp' ? PRO.boost : 0);
  teams[1 - strongSlot] = teamFor(rng, 1 - strongSlot, KIND[1], 0);
  const m = createMatch({ seed: 900 + i, pitch, teams, human: false, duration: matchDuration(pitch), aiCoach: false });
  let lastCorner = -99, shotPending = null, gk = null, cornerTeam = null; // cornerTeam: Mannschaft, solange die Eckenphase läuft
  while (m.phase !== 'ended') {
    const prevTouch = m.ball.lastTouch;
    stepMatch(m, undefined, 1 / 60);
    // Abstoß bis ins gegnerische Toraus: Der Torwart war letzter Ballkontakt, der Gegner bekommt Abstoß. Vor der Hauptschleife,
    // weil der neue Abstoß (setpiece) im selben Schritt vor dem out-Ereignis gemeldet wird.
    if (gk && m.events.some((e) => e.type === 'out' && e.restart === 'goalkick' && e.team !== gk.team) && prevTouch === gk.id && m.time - gk.t < 8) { z.gkOutOpp++; gk = null; }
    for (const e of m.events) {
      if (e.type === 'setpiece') {
        if (e.kind === 'corner') { z.corners++; lastCorner = m.time; cornerTeam = e.team; }
        else if (e.kind === 'throwin') z.throwins++;
        else if (e.kind === 'goalkick') { z.goalkicks++; gk = { id: e.playerId, team: e.team, t: m.time }; }
        else if (e.kind === 'freekick') z.freekicks++;
        else if (e.kind === 'penalty') z.penalties++;
      }
      if (e.type === 'shot') { z.shots++; shotPending = m.time; }
      if (e.type === 'header') { z.headers++; if (e.onGoal) { shotPending = m.time; } }
      if (e.type === 'save' || e.type === 'catch') { if (shotPending !== null && m.time - shotPending < 3) { z.onTarget++; shotPending = null; } if (e.type === 'save') z.saves++; else z.catches++; }
      if (cornerTeam !== null) {
        const who = e.playerId ? m.players.find((q) => q.id === e.playerId) : null;
        // Die Eckenphase endet bei Abstoß/Einwurf/Ecke danach, wenn der Gegner den Ball spielt (Pass, Kopfball, Fangen) oder nach 8 s.
        if ((e.type === 'out' && e.restart !== 'corner') || (who && who.team !== cornerTeam && ['pass', 'header', 'catch'].includes(e.type)) || m.time - lastCorner >= 8) cornerTeam = null;
      }
      if (e.type === 'pass') z.passes++;
      if (e.type === 'foul') z.fouls++;
      if (e.type === 'offside') z.offsides++;
      if (e.type === 'card') z.cards++;
      if (e.type === 'goal') {
        z.goals++;
        if (e.ownGoal) z.ownGoals++;
        else if (shotPending !== null) { z.onTarget++; shotPending = null; }
        if (e.via === 'header') z.hdrGoals++;
        if (!e.ownGoal && m.time - lastCorner < 8) z.cornerGoals++;
        if (cornerTeam !== null && e.team === cornerTeam && m.time - lastCorner < 8) { z.cornerGoalsStrict++; if (e.via === 'header') z.cornerHdrGoals++; }
        z[e.team === strongSlot ? 'strongGoals' : 'weakGoals']++;
      }
    }
    if (gk && m.time - gk.t > 8) gk = null;
    if (shotPending !== null && m.time - shotPending > 3) shotPending = null;
    m.events.length = 0;
  }
  const [a, b] = m.score;
  const sg = m.score[strongSlot], wg = m.score[1 - strongSlot];
  void a; void b;
  if (sg > wg) z.strongWins++; else if (sg === wg) z.draws++;
  const pos = m.stats.teams.map((t) => t.possession);
  z.posStrong += pos[strongSlot]; z.posTot += pos[0] + pos[1];
  z.games++;
  for (let t = 0; t < 2; t++) strengthSum[t === strongSlot ? 0 : 1] += m.players.filter((p) => p.team === t).map((p) => p.rating ?? 0).reduce((s, x) => s + x, 0) / Math.max(1, m.players.filter((p) => p.team === t).length);
}
const f = (x, d = 2) => (x / N).toFixed(d);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const row = { venue, pairing, N, goals: +f(z.goals), shots: +f(z.shots), onTargetPct: pct(z.onTarget, z.shots), corners: +f(z.corners), throwins: +f(z.throwins), goalkicks: +f(z.goalkicks), gkOutOpp: +f(z.gkOutOpp), fouls: +f(z.fouls), freekicks: +f(z.freekicks), penalties: +f(z.penalties), hdrPct: pct(z.hdrGoals, z.goals), cornerGoalPct: pct(z.cornerGoals, z.corners), cornerStrictPct: +((100 * z.cornerGoalsStrict) / Math.max(1, z.corners)).toFixed(1), cornerHdrPct: +((100 * z.cornerHdrGoals) / Math.max(1, z.corners)).toFixed(1), saves: +f(z.saves), catches: +f(z.catches), offsides: +f(z.offsides), posStrongPct: pct(z.posStrong, z.posTot), strongWinPct: pct(z.strongWins, N), drawPct: pct(z.draws, N), strongGoals: +f(z.strongGoals), weakGoals: +f(z.weakGoals), cards: +f(z.cards), passes: +f(z.passes, 1), ownGoals: +f(z.ownGoals), cornerGoals: z.cornerGoals, hdrGoals: z.hdrGoals, totalGoals: z.goals, totalCorners: z.corners, ratingStrong: +(strengthSum[0] / N).toFixed(1), ratingWeak: +(strengthSum[1] / N).toFixed(1) };
console.log(JSON.stringify(row));
