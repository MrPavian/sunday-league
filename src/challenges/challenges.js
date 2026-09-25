// Challenges: kurze Szenarien mit festem Spielstand, Restzeit und Zielen.
// Beim ersten Abschluss gibt es eine Belohnung für die Karriere.
import { tr } from '../core/i18n.js';
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
    title: tr('Einer weniger', 'One man down'),
    story: tr('Gelb-Rot für den Kapitän in der 45. Minute. Die zweite Halbzeit läuft – und ihr seid nur noch zu sechst.', 'Second yellow for the captain in the 45th minute. The second half is under way – and you are down to six.'),
    venue: 'rasenplatz',
    seconds: 300,
    score: [0, 0],
    handicap: 1,
    goals: [
      { text: tr('Gewinnen', 'Win'), check: won },
      { text: tr('Mit zwei Toren Unterschied', 'By two clear goals'), check: (m) => m.score[0] - m.score[1] >= 2 },
      { text: tr('Keine weitere Karte', 'No further cards'), check: (m) => mine(m, 'yellow') + mine(m, 'red') === 0 },
    ],
    reward: { cash: 60, text: tr('Prämie vom Kreisblatt: 60 € für die Mannschaftskasse', 'Bonus from the District Gazette: €60 for the team kitty') },
  },
  {
    id: 'halt-die-null',
    title: tr('Halt die Null', 'Keep a clean sheet'),
    story: tr('1:0 auf Asche, noch drei Minuten. Der Gegner wirft alles nach vorne.', '1-0 on cinders, three minutes to go. The opposition throw everything forward.'),
    venue: 'ascheplatz',
    seconds: 180,
    score: [1, 0],
    goals: [
      { text: tr('Kein Gegentor', 'No goals conceded'), check: (m) => m.score[1] === 0 },
      { text: tr('Noch ein Tor nachlegen', 'Add another goal'), check: (m) => m.score[0] >= 2 },
      { text: tr('Ohne Grätsche – Asche im Knie ist teuer', 'No slide tackles – cinders in the knee are expensive'), check: (m) => mine(m, 'slides') === 0 },
    ],
    reward: { player: { tier: 'stark', position: 'def' }, text: tr('Ein Abwehrspieler vom Gegner war beeindruckt und will zu euch', 'An opposition defender was impressed and wants to join you') },
  },
  {
    id: 'aufholjagd',
    title: tr('Aufholjagd', 'Comeback'),
    story: tr('0:2 im Stadtpark, noch vier Minuten. Die Hunde am Rand haben schon aufgegeben – ihr noch nicht.', '0-2 in the park, four minutes left. The dogs on the touchline have given up – you haven\'t.'),
    venue: 'park',
    seconds: 240,
    score: [0, 2],
    goals: [
      { text: tr('Mindestens Unentschieden', 'At least a draw'), check: (m) => m.score[0] >= m.score[1] },
      { text: tr('Sogar gewinnen', 'Even win it'), check: won },
      { text: tr('Mindestens ein Kopfballtor', 'At least one headed goal'), check: (m) => m.stats.goals.some((g) => g.team === 0 && g.via === 'header') },
    ],
    reward: { cash: 50, text: tr('Die Picknickgruppe hat gesammelt: 50 € für die Kasse', 'The picnic group had a whip-round: €50 for the kitty') },
  },
  {
    id: 'parkplatz-derby',
    title: tr('Parkplatz-Derby', 'Car park derby'),
    story: tr('Der Getränkemarkt hat gerade neue Autos auf den Parkplatz gestellt. Wer eins trifft, bezahlt die Politur.', 'The drinks market has just parked new cars in the car park. Hit one and you pay for the polish.'),
    venue: 'parkplatz',
    seconds: 300,
    score: [0, 0],
    goals: [
      { text: tr('Gewinnen', 'Win'), check: won },
      { text: tr('Kein Auto getroffen', 'No car hit'), check: (m) => mine(m, 'cars') === 0 },
      { text: tr('Drei eigene Tore', 'Score three goals'), check: (m) => m.score[0] >= 3 },
    ],
    reward: { cash: 40, text: tr('Getränke Hoffmann spendiert 40 € – und eine Kiste', 'Getränke Hoffmann chips in €40 – and a crate') },
  },
  {
    id: 'alte-herren',
    title: tr('Alte Herren', 'Old boys'),
    story: tr('Die Jungen sind alle beim Festival. Heute kicken nur die über 35 – im Hinterhof gegen eine Truppe Azubis.', 'The youngsters are all at a festival. Today only the over-35s play – in the backyard against a bunch of apprentices.'),
    venue: 'hinterhof',
    seconds: 300,
    score: [0, 0],
    veterans: true,
    goals: [
      { text: tr('Gewinnen', 'Win'), check: won },
      { text: tr('Keiner geht vorher vom Platz', 'Nobody goes off early'), check: (m) => m.players.filter((p) => p.team === 0).length === (m.pitch.format ?? 5) },
      { text: tr('Höchstens ein Gegentor', 'Concede one goal at most'), check: (m) => m.score[1] <= 1 },
    ],
    reward: { player: { tier: 'dorfstar', minAge: 33 }, text: tr('Ein alter Dorfstar hat zugeschaut und will es nochmal wissen', 'An old village star was watching and wants one more go') },
  },
  {
    id: 'knipser',
    title: tr('Der Knipser', 'The Poacher'),
    story: tr('Die Tabellenführung hängt an deinem Stürmer. Fünf Minuten auf dem Rasenplatz, der Scout vom Kreisblatt sitzt auf der Tribüne.', 'Top spot depends on your striker. Five minutes on the grass pitch, the District Gazette scout is in the stand.'),
    venue: 'rasenplatz',
    seconds: 300,
    score: [0, 0],
    goals: [
      { text: tr('Dein Stürmer trifft', 'Your striker scores'), check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 1 },
      { text: tr('Er trifft doppelt', 'He scores twice'), check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 2 },
      { text: tr('Dreierpack!', 'Hat-trick!'), check: (m, ctx) => (m.stats.players[ctx.heroId]?.goals ?? 0) >= 3 },
    ],
    reward: { player: { tier: 'superstar', position: 'fwd' }, text: tr('Der Scout kennt jemanden, der früher höher gespielt hat – er kommt zu euch', 'The scout knows someone who used to play higher up – he is joining you') },
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
