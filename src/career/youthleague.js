// Jugend, Punkt 3: Die Kinder spielen auch – jede Woche, in echten Ligen.
//
// D-, C- und B-Jugend spielen Kreisliga mit Tabelle (sechs Teams, Hin- und Rückrunde). Die
// E-Jugend spielt seit der DFB-Reform 2024/25 ohne Meisterschaftsrunde: Spielfeste mit
// kleinen Teams, Ergebnisse ja, Tabelle nein. Siege machen Spaß, Niederlagen kosten etwas,
// ein Spielfest macht immer Spaß.
//
// Kreisauswahl / DFB-Stützpunkt: Einmal im Jahr ist Sichtung. Gefördert werden die 3–5 %
// Besten eines Jahrgangs von 10 bis 14 (366 Stützpunkte, je zwei Gruppen à 30 Talente).
// Auch die Sichter sehen zum Teil nur, wer groß und schnell ist. Wer dabei ist, trainiert
// einmal die Woche zusätzlich am Stützpunkt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { teamOfAge } from './academy.js';
import { coachQuality } from './youthteams.js';
import { looksStrength, persona } from './kidpersona.js';
import { chronicle } from './sagas.js';

export const LEAGUE_TEAMS = ['D', 'C', 'B']; // mit Tabelle
export const FESTIVAL_TEAMS = ['E']; // Spielfeste ohne Tabelle
export const YOUTH_ROUNDS = 10; // sechs Teams, Hin- und Rückrunde
export const SICHTUNG_ROUND = 4;
export const STUETZPUNKT_AGES = [10, 14];
export const STUETZPUNKT_GROWTH = 0.004; // ein Zusatztraining je Woche

const YOUTH_CLUBS = ['JSG Auetal', 'TuS Mühlbach', 'SpVgg Hollerbach', 'JFV Kreis Nord', 'SV Rot-Weiß Oberdorf', 'TSV Eichenau', 'SG Wiesengrund', 'FC Bergheide', 'DJK Sankt Martin', 'VfB Kirchdorf', 'JSG Am Kanal', 'SC Lindenhof'];

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Wer ist in diesem Team? (eigene Kinder des Trainers spielen mit)
const kidsIn = (c, id, extra = []) => [...(c.youth.kids ?? []), ...extra].filter((k) => teamOfAge(k.age)?.id === id);

// Liga je Saison neu: fünf Gegner mit fester Stärke.
export function youthLeague(c) {
  const y = c.youth;
  if (y.league?.season === c.season) return y.league;
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, 515));
  const teams = {};
  for (const id of [...FESTIVAL_TEAMS, ...LEAGUE_TEAMS]) {
    const pool = [...YOUTH_CLUBS];
    const opps = [];
    while (opps.length < 5) opps.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
    teams[id] = { opps: opps.map((name) => ({ name, str: Math.round(rng.range(0.38, 0.62) * 100) / 100, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 })), own: { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, games: [] };
  }
  y.league = { season: c.season, teams };
  return y.league;
}

// Stärke auf dem Platz: Was man sieht (Größe zählt mit), dazu namenlose Mitspieler (Durchschnitt)
// und der Trainer. Ohne Trainer spielt das Team trotzdem – schlechter.
export function teamStrength(c, id, extra = []) {
  const kids = kidsIn(c, id, extra);
  const avg = kids.length ? kids.reduce((s, k) => s + looksStrength(k), 0) / kids.length : 0.5;
  const weight = Math.min(0.7, kids.length * 0.12); // wenige bekannte Kinder, viele „Mitspieler"
  return clamp01(avg * weight + 0.5 * (1 - weight) + (coachQuality(c, id) - 0.4) * 0.15); // Mitspieler: Kreisschnitt
}

// Tore: je Seite Poisson-ähnlich, Erwartung nach Stärkeunterschied (Jugend: viele Tore).
function goals(rng, mine, theirs) {
  const lambda = Math.max(0.3, 2.2 + (mine - theirs) * 6);
  let n = 0;
  let p = Math.exp(-lambda);
  let s = p;
  const r = rng.next();
  while (r > s && n < 12) {
    n++;
    p *= lambda / n;
    s += p;
  }
  return n;
}

const row = (r, gf, ga) => {
  r.p++;
  r.gf += gf;
  r.ga += ga;
  if (gf > ga) r.w++;
  else if (gf === ga) r.d++;
  else r.l++;
};
export const points = (r) => r.w * 3 + r.d;

// Tabelle (eigenes Team mit own: true).
export function youthTable(c, id, ownName = tr('Wir', 'Us')) {
  const t = youthLeague(c).teams[id];
  return [{ name: ownName, own: true, ...t.own }, ...t.opps.map((o) => ({ ...o }))].sort((a, b) => points(b) - points(a) || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
}
export const youthPos = (c, id) => youthTable(c, id).findIndex((r) => r.own) + 1;

// Ein Spieltag: Jedes Team spielt (Liga oder Spielfest); die anderen Gegner spielen
// untereinander, damit die Tabelle stimmt. Spaß je nach Ergebnis.
export function weeklyYouthMatches(c, extra = []) {
  if (!c.youth?.kids || (c.round ?? 0) >= YOUTH_ROUNDS) return [];
  const league = youthLeague(c);
  const round = c.round ?? 0;
  const rng = createRng(hashSeed(c.seed ?? 0, c.season ?? 1, round, 616));
  const out = [];
  for (const id of [...FESTIVAL_TEAMS, ...LEAGUE_TEAMS]) {
    const t = league.teams[id];
    if (t.games.some((g) => g.round === round)) continue; // schon gespielt
    const kids = kidsIn(c, id, extra);
    if (!kids.length && !c.youth.teams?.[id]?.coach) continue;
    const opp = t.opps[round % 5];
    const mine = teamStrength(c, id, extra);
    const gf = goals(rng, mine, opp.str);
    const ga = goals(rng, opp.str, mine);
    const game = { round, opp: opp.name, gf, ga, home: round < 5 };
    t.games.push(game);
    out.push({ team: id, ...game });
    const festival = FESTIVAL_TEAMS.includes(id);
    // Spaß: Spielfest immer schön; in der Liga zählt das Ergebnis.
    const dj = festival ? 0.015 : gf > ga ? 0.02 : gf === ga ? 0.005 : -0.01;
    for (const k of kids) (k.own ? k.ref : k).joy = clamp01((k.own ? k.ref.joy : k.joy) + dj);
    if (festival) continue;
    row(t.own, gf, ga);
    row(opp, ga, gf);
    // Die anderen vier Gegner spielen paarweise (einer hat spielfrei – fünf Gegner, wir sind der sechste).
    const rest = t.opps.filter((o) => o !== opp);
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const a = rest[(i + round) % rest.length];
      const b = rest[(i + 1 + round) % rest.length];
      const ag = goals(rng, a.str, b.str);
      const bg = goals(rng, b.str, a.str);
      row(a, ag, bg);
      row(b, bg, ag);
    }
  }
  c.youth.lastWeek = { round, games: out };
  if (round === SICHTUNG_ROUND) c.youth.lastWeek.sichtung = sichtung(c);
  return out;
}

// Kreisauswahl / DFB-Stützpunkt: Sichtung einmal im Jahr. Die Sichter sehen Talent, aber auch
// Größe und Tempo (halb, halb). Wer über der Schwelle liegt, wird eingeladen.
export const SICHTUNG_BAR = 0.92; // gemessen: so landen etwa 5 % der 10- bis 14-Jährigen am Stützpunkt
export const sichtungScore = (k) => 0.5 * (k.talent ?? 0) + 0.5 * looksStrength(k);
export function sichtung(c) {
  const [lo, hi] = STUETZPUNKT_AGES;
  const picked = [];
  for (const k of c.youth.kids ?? []) {
    persona(k);
    if (k.age < lo || k.age > hi) {
      k.stuetzpunkt = false;
      continue;
    }
    const was = !!k.stuetzpunkt;
    k.stuetzpunkt = sichtungScore(k) >= SICHTUNG_BAR;
    if (k.stuetzpunkt && !was) picked.push(k);
  }
  if (picked.length) {
    chronicle(c, tr(`${picked.map((k) => k.name).join(', ')} ${picked.length > 1 ? 'werden' : 'wird'} zum DFB-Stützpunkt eingeladen.`, `${picked.map((k) => k.name).join(', ')} ${picked.length > 1 ? 'are' : 'is'} invited to the regional DFB training centre.`));
    for (const k of picked) k.joy = clamp01(k.joy + 0.1);
  }
  return picked.map((k) => k.name);
}

// Zusatztraining am Stützpunkt (wöchentlich, im Training mitgerechnet).
export const stuetzpunktGrowth = (k) => (k.stuetzpunkt ? STUETZPUNKT_GROWTH : 0);

// Saisonbilanz: Platz aus der echten Tabelle (Liga) bzw. Spielfeste (E-Jugend, kein Platz).
export function seasonYouthResults(c) {
  const league = c.youth.league?.season === c.season ? c.youth.league : null;
  if (!league) return null;
  const results = [];
  for (const id of [...FESTIVAL_TEAMS, ...LEAGUE_TEAMS]) {
    const t = league.teams[id];
    if (!t.games.length) continue;
    if (FESTIVAL_TEAMS.includes(id)) results.push({ team: id, pos: null, festivals: t.games.length });
    else results.push({ team: id, pos: youthPos(c, id), of: 6 });
  }
  return results;
}

// Turniere (Pfingstturnier, eigenes Turnier) – Ereignisse am Schwarzen Brett, siehe academy.js.
export function tournamentOdds(c, id) {
  // Gegen den Schnitt eines Turnierfelds (0,5): wie oft gewinnt man es? Turnier-Schwerpunkt hilft.
  const s = teamStrength(c, id) + (c.youth.teams?.[id]?.focus === 'turnier' ? 0.05 : 0);
  return clamp01(0.12 + (s - 0.5) * 2.2);
}

// Kurzform für Bilanzen: „D-Jugend 2. Platz" bzw. „E-Jugend: 10 Spielfeste".
export const resultLabel = (r) =>
  r.pos == null
    ? tr(`${r.team}-Jugend: ${r.festivals} Spielfeste`, `${r.team} youth: ${r.festivals} festivals`)
    : tr(`${r.team}-Jugend ${r.pos}. Platz`, `${r.team} youth ${r.pos}${r.pos === 1 ? 'st' : r.pos === 2 ? 'nd' : r.pos === 3 ? 'rd' : 'th'}`);
