// Challenges: kurze Szenarien mit festem Spielstand, Restzeit und Zielen.
// Beim ersten Abschluss gibt es eine Belohnung für die Karriere.
import { createRng } from '../core/rng.js';
import { TEAM_PRESETS } from '../data/teams.js';
import { FORMATIONS } from '../sim/formation.js';
import { createPlayerPool, generateTeam, HOBBY_TIER_WEIGHTS } from '../sim/generator.js';
import { createMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { startSetPiece } from '../sim/setpieces.js';
import { swapSides } from '../sim/squad.js';

const FULL = 600; // Spielzeit eines normalen Matches in Sekunden

// Helfer für Zielprüfungen: Werte des menschlichen Teams (Team 0).
const mine = (m, key) => Object.entries(m.stats.players).reduce((s, [id, p]) => s + (id.startsWith('0-') ? p[key] : 0), 0);
const won = (m) => m.score[0] > m.score[1];

export const CHALLENGES = [
  {
    id: 'einer-weniger',
    title: 'Einer weniger',
    story: 'Gelb-Rot für den Kapitän in der 45. Minute. Die zweite Halbzeit läuft – und ihr seid nur noch zu sechst.',
    venue: 'rasenplatz',
    seconds: 300,
    score: [0, 0],
    handicap: 1,
    goals: [
      { text: 'Gewinnen', check: won },
      { text: 'Mit zwei Toren Unterschied', check: (m) => m.score[0] - m.score[1] >= 2 },
      { text: 'Keine weitere Karte', check: (m) => mine(m, 'yellow') + mine(m, 'red') === 0 },
    ],
    reward: { cash: 60, text: 'Prämie vom Kreisblatt: 60 € für die Mannschaftskasse' },
  },
  {
    id: 'halt-die-null',
    title: 'Halt die Null',
    story: '1:0 auf Asche, noch drei Minuten. Der Gegner wirft alles nach vorne.',
    venue: 'ascheplatz',
    seconds: 180,
    score: [1, 0],
    goals: [
      { text: 'Kein Gegentor', check: (m) => m.score[1] === 0 },
      { text: 'Noch ein Tor nachlegen', check: (m) => m.score[0] >= 2 },
      { text: 'Ohne Grätsche – Asche im Knie ist teuer', check: (m) => mine(m, 'slides') === 0 },
    ],
    reward: { player: { tier: 'stark', position: 'def' }, text: 'Ein Abwehrspieler vom Gegner war beeindruckt und will zu euch' },
  },
  {
    id: 'aufholjagd',
    title: 'Aufholjagd',
    story: '0:2 im Stadtpark, noch vier Minuten. Die Hunde am Rand haben schon aufgegeben – ihr noch nicht.',
    venue: 'park',
    seconds: 240,
    score: [0, 2],
    goals: [
      { text: 'Mindestens Unentschieden', check: (m) => m.score[0] >= m.score[1] },
      { text: 'Sogar gewinnen', check: won },
      { text: 'Mindestens ein Kopfballtor', check: (m) => m.stats.goals.some((g) => g.team === 0 && g.via === 'header') },
    ],
    reward: { cash: 50, text: 'Die Picknickgruppe hat gesammelt: 50 € für die Kasse' },
  },
  {
    id: 'parkplatz-derby',
    title: 'Parkplatz-Derby',
    story: 'Der Getränkemarkt hat gerade neue Autos auf den Parkplatz gestellt. Wer eins trifft, bezahlt die Politur.',
    venue: 'parkplatz',
    seconds: 300,
    score: [0, 0],
    goals: [
      { text: 'Gewinnen', check: won },
      { text: 'Kein Auto getroffen', check: (m) => mine(m, 'cars') === 0 },
      { text: 'Drei eigene Tore', check: (m) => m.score[0] >= 3 },
    ],
    reward: { cash: 40, text: 'Getränke Hoffmann spendiert 40 € – und eine Kiste' },
  },
  {
    id: 'alte-herren',
    title: 'Alte Herren',
    story: 'Die Jungen sind alle beim Festival. Heute kicken nur die über 35 – im Hinterhof gegen eine Truppe Azubis.',
    venue: 'hinterhof',
    seconds: 300,
    score: [0, 0],
    veterans: true,
    goals: [
      { text: 'Gewinnen', check: won },
      { text: 'Keiner geht vorher vom Platz', check: (m) => m.players.filter((p) => p.team === 0).length === (m.pitch.format ?? 5) },
      { text: 'Höchstens ein Gegentor', check: (m) => m.score[1] <= 1 },
    ],
    reward: { player: { tier: 'dorfstar', minAge: 33 }, text: 'Ein alter Dorfstar hat zugeschaut und will es nochmal wissen' },
  },
  {
    id: 'knipser',
    title: 'Der Knipser',
    story: 'Die Tabellenführung hängt an deinem Stürmer. Fünf Minuten auf dem Rasenplatz, der Scout vom Kreisblatt sitzt auf der Tribüne.',
    venue: 'rasenplatz',
    seconds: 300,
    score: [0, 0],
    goals: [
      { text: 'Dein Stürmer trifft', check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 1 },
      { text: 'Er trifft doppelt', check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 2 },
      { text: 'Dreierpack!', check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 3 },
    ],
    reward: { player: { tier: 'superstar', position: 'fwd' }, text: 'Der Scout kennt jemanden, der früher höher gespielt hat – er kommt zu euch' },
  },
];

export const challengeById = (id) => CHALLENGES.find((c) => c.id === id);

let pool = null;
const getPool = () => (pool ??= createPlayerPool({ seed: 1921 }));

// Ein Team nur aus Spielern ab 35 – aus dem großen Pool gesucht.
function veteranTeam(rng, preset, roles) {
  const list = getPool().everyone().filter((p) => p.age >= 35 && p.tier !== 'legende');
  const players = roles.map((role) => {
    const fits = list.filter((p) => p.position === role);
    return { ...rng.pick(fits.length ? fits : list) };
  });
  return { ...preset, players };
}

export function createChallengeMatch(def, seed = Date.now() % 1e9) {
  const rng = createRng(seed);
  const pitch = PITCHES[def.venue];
  const roles = FORMATIONS[pitch.format].map((f) => f.role);
  const bench = pitch.format >= 5 ? ['def', 'mid', 'fwd'] : ['mid', 'fwd'];
  const home = def.veterans ? veteranTeam(rng, TEAM_PRESETS[0], [...roles, ...bench]) : generateTeam(rng, TEAM_PRESETS[0], [...roles, ...bench]);
  const away = generateTeam(rng, TEAM_PRESETS[1], [...roles, ...bench], { tierWeights: { ...HOBBY_TIER_WEIGHTS, stark: 0.12 } });
  const m = createMatch({ seed: rng.int(1, 1e9), pitch, teams: [home, away], human: true, kickoff: false, duration: FULL });

  // Uhr vorstellen, ggf. in die zweite Halbzeit.
  m.time = FULL - def.seconds;
  if (m.time >= FULL / 2) {
    m.half = 2;
    swapSides(m);
  }
  m.score = [...def.score];
  for (let i = 0; i < (def.handicap ?? 0); i++) {
    const out = m.players.filter((p) => p.team === 0 && p.role !== 'gk' && p.id !== m.controlledId).pop();
    m.players.splice(m.players.indexOf(out), 1);
    m.sentOff.push(out);
  }
  startSetPiece(m, { type: 'kickoff', team: m.score[0] <= m.score[1] ? 0 : 1 });
  const hero = m.players.find((p) => p.team === 0 && p.role === 'fwd') ?? m.players.find((p) => p.id === m.controlledId);
  m.controlledId = hero.id;
  return { match: m, ctx: { heroId: hero.id } };
}

export function evaluateChallenge(def, m, ctx) {
  const results = def.goals.map((g) => g.check(m, ctx));
  const stars = results[0] ? results.filter(Boolean).length : 0;
  return { results, stars };
}

// --- Fortschritt & Belohnungen (localStorage, robust gegen fehlenden Speicher) ---

const KEY = 'sunday-league:challenges';

export function loadProgress(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(KEY) ?? 'null') ?? { stars: {}, pendingRewards: [] };
  } catch {
    return { stars: {}, pendingRewards: [] };
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ohne Speicher gibt's eben keinen Fortschritt
  }
}

// Ergebnis eintragen; beim ersten Abschluss wird die Belohnung vorgemerkt.
export function recordChallenge(progress, def, stars) {
  const before = progress.stars[def.id] ?? 0;
  if (stars > before) progress.stars[def.id] = stars;
  const firstClear = before === 0 && stars > 0;
  if (firstClear) progress.pendingRewards.push({ id: def.id, ...def.reward });
  return { firstClear, best: Math.max(before, stars) };
}
