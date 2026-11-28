// Balancing & Simulation QA, Abschnitt A (docs/BALANCING-QA-AUFTRAG.md): ganze Ligasaisons wie im Spiel, nur Messung.
// Karriere ohne Eingriffe (createCareer, alle Spiele der eigenen Liga mit voller Engine über prepareMatch, finishRound,
// nextSeason – der Verein des Menschen spielt dabei wie ein CPU-Verein, ohne Aufstellung, Befehle, Training oder Transfers).
// Je Spiel eine JSON-Zeile mit Ergebnis, Stärke, Schüssen (mit xG aus sim/chances.js), Ballbesitz, Pässen, Zweikämpfen,
// Karten und Torminuten; je Saison eine Tabellenzeile. Messspiele der Nachbarligen (Phase 5b) sind aus, sie zählen nirgends.
//   node scripts/qa-league.mjs <out.jsonl> [Saisons=10] [Ligagröße=8] [seed=11] [--start=Liga]
// --start=L: Karriere in Liga L setzen wie scripts/balance-audit.mjs liftTo (erzwungene Aufstiegssaison aus L−1, dann Kader
// eines mittleren CPU-Vereins). Die Aufstiegssaison wird nicht gemessen. Ohne das bleibt die Karriere in Liga 1–2.
// Mehrere Seeds: mehrere Prozesse (scripts/qa-report.mjs liest alle Dateien zusammen).
import { writeFileSync, appendFileSync } from 'node:fs';
import { createCareer, currentFixtures, finishRound, humanClub, migrateCareer, nextSeason, playerOf, prepareMatch, recordResult, seasonOver, table } from '../src/career/career.js';
import { startCash } from '../src/career/clubchange.js';
import { facilities } from '../src/career/facilities.js';
import { SAMPLE } from '../src/intel/sample.js';
import { createChanceLog, feedChances } from '../src/sim/chances.js';
import { footballMinute } from '../src/sim/minute.js';
import { stepMatch } from '../src/sim/match.js';
import { findAnyPlayer } from '../src/sim/squad.js';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [out, seasonsArg, sizeArg, seedArg] = pos;
const START = Number(process.argv.find((a) => a.startsWith('--start='))?.split('=')[1]) || 1;
if (!out) throw new Error('Aufruf: node scripts/qa-league.mjs <out.jsonl> [Saisons] [Ligagröße] [seed]');
const SEASONS = Number(seasonsArg) || 10, SIZE = Number(sizeArg) || 8, SEED = Number(seedArg) || 11;
SAMPLE.on = false;
writeFileSync(out, '');
const put = (o) => appendFileSync(out, JSON.stringify(o) + '\n');
const r2 = (x) => Math.round(x * 100) / 100;

// Stärke wie career/pokal.js strength: Schnitt der besten n Spielerwerte (rating) des Kaders, n = Spieler auf dem Platz.
const strength = (c, club, n) => {
  const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, n);
  return r.reduce((s, x) => s + x, 0) / Math.max(1, r.length);
};

function play(c, f) {
  const p = prepareMatch(c, f);
  const m = p.match;
  const log = createChanceLog(m);
  const goals = [], cards = [];
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    feedChances(log, m, m.events);
    for (const e of m.events) {
      if (e.type === 'goal') goals.push([e.team, Math.round(footballMinute(m)), e.via ?? null, e.ownGoal ? 1 : 0]);
      else if (e.type === 'card') cards.push([findAnyPlayer(m, e.playerId)?.team ?? null, e.color, Math.round(footballMinute(m))]);
    }
    m.events.length = 0;
  }
  recordResult(c, f, p);
  return { p, m, log, goals, cards };
}

function record(c, f, { m, log, goals, cards }) {
  const home = c.clubs.find((x) => x.id === f.home), away = c.clubs.find((x) => x.id === f.away);
  const n = m.pitch.format ?? 11;
  fmt = n;
  const st = m.stats.teams, an = m.an?.teams;
  const box = m.pitch.penaltyBox ?? null;
  const shots = log.shots.map((s) => {
    const dx = m.pitch.halfLength - Math.abs(s.from.x), az = Math.abs(s.from.z);
    const inBox = box ? (dx <= box.depth && az <= box.halfWidth ? 1 : 0) : null;
    return [s.team, r2(Math.hypot(dx, az)), s.head ? 1 : 0, s.penalty ? 1 : 0, Math.round(s.xg * 1000) / 1000, s.result[0], inBox];
  });
  const t = (k) => (an ? an.map((x) => x[k] ?? 0) : null);
  put({
    k: 'm', seed: SEED, season: c.season, lv: c.level, round: c.round, pitch: m.pitch.base ?? m.pitch.id, fmt: n, dur: m.duration,
    home: f.home, away: f.away, hum: home.human ? 0 : away.human ? 1 : -1,
    str: [r2(strength(c, home, n)), r2(strength(c, away, n))], score: [...m.score],
    sh: st.map((x) => x.shots), cor: st.map((x) => x.corners), fo: st.map((x) => x.fouls), y: st.map((x) => x.yellow), r: st.map((x) => x.red), off: st.map((x) => x.offsides ?? 0),
    pos: st.map((x) => Math.round(x.possession)), xg: log.xg.map((x) => r2(x)),
    pass: t('pass'), passOk: t('passOk'), pp: t('pressPass'), ppOk: t('pressPassOk'), pack: t('packing'),
    dW: t('duelWon'), dL: t('duelLost'), aW: t('aerialWon'), aL: t('aerialLost'), loose: t('loose'), sot: t('shots'),
    third: an ? an.map((x) => x.third.map((v) => Math.round(v))) : null,
    goals, cards, shots,
  });
}

// Wie scripts/balance-audit.mjs liftTo (unverändert übernommen).
function liftTo(c, level) {
  c.level = level - 1;
  c.cash = 1e8;
  for (const id of ['stadion', 'flutlicht', 'drittliga', 'flutlicht800', 'arena', 'rasenheizung', 'flutlicht1200', 'sitzplatz8000', 'flutlicht1800']) facilities(c).built[id] = 1;
  const me = humanClub(c).id;
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me ? { home: 2, away: 0 } : f.away === me ? { home: 0, away: 2 } : { home: 1, away: 1 };
    finishRound(c);
  }
  nextSeason(c);
  const top11 = (club) => { const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11); return r.reduce((s, x) => s + x, 0) / r.length; };
  const sorted = c.clubs.filter((x) => !x.human).sort((a, b) => top11(b) - top11(a));
  const mid = sorted[Math.floor(sorted.length / 2)];
  const mine = humanClub(c);
  const keep = mine.squad.filter((i) => i === c.coach?.idx);
  const swap = mid.squad;
  mid.squad = mine.squad.filter((i) => i !== c.coach?.idx);
  mine.squad = [...swap, ...keep];
  for (const idx of mine.squad) if (c.players[idx]) delete c.players[idx].contract;
  c.cash = startCash(c.level);
  if (c.board) Object.assign(c.board, { trust: 60, warned: false, ultimatum: null, losses: 0, fired: null });
}

const t0 = performance.now();
let c = createCareer({ seed: SEED, leagueSize: SIZE });
if (START > 1) { liftTo(c, START); if (c.level !== START) throw new Error(`Liga ${c.level} statt ${START}`); c = migrateCareer(JSON.parse(JSON.stringify(c))); }
let matches = 0, fmt = 11;
for (let s = 0; s < SEASONS; s++) {
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) { record(c, f, play(c, f)); matches++; }
    finishRound(c);
  }
  const rows = table(c).map((r, i) => ({ id: r.club.id, hum: r.club.human ? 1 : 0, pos: i + 1, pts: r.pts, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, str: r2(strength(c, r.club, fmt)) }));
  put({ k: 's', seed: SEED, season: c.season, lv: c.level, rows });
  nextSeason(c);
}
put({ k: 'end', seed: SEED, start: START, seasons: SEASONS, matches, ms: Math.round(performance.now() - t0) });
