// Relegation: Der Zweite spielt gegen den Vorletzten der Liga darüber um den
// Aufstieg; der Vorletzte verteidigt seinen Platz gegen den Zweiten von unten.
// Hin- und Rückspiel, es zählt das Gesamtergebnis. Steht es danach gleich, wird
// im Rückspiel Elfmeter geschossen – selbst gespielt live, simuliert gewürfelt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { createMatch } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { LEAGUES, MAX_LEVEL } from './clubs.js';
import { humanClub, resolveKitClash, simulateSync, squadPicker, SQUAD_SHAPES, table, teamForMatch } from './career.js';
import { adjustMood } from './events.js';
import { applyWeather } from './weather.js';
import { chronicle } from './sagas.js';

const RELEGATION_ID = 'relegation';

// Nach dem letzten Spieltag: Muss der eigene Verein in die Relegation?
export function relegationNeeded(career) {
  const level = career.level ?? 1;
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human) + 1;
  if (pos === 2 && level < MAX_LEVEL) return { kind: 'up', level, other: level + 1 };
  if (pos === rows.length - 1 && level > 1) return { kind: 'stay', level, other: level - 1 };
  return null;
}

export const relegationOf = (career) => (career.relegation?.season === career.season ? career.relegation : null);

// Gegner anlegen: beim Aufstiegsspiel der schwächste Verein der Liga darüber
// (der „Vorletzte"), beim Klassenerhalt der stärkste von unten (der „Zweite").
export function startRelegation(career) {
  const need = relegationNeeded(career);
  if (!need || relegationOf(career)) return relegationOf(career);
  const league = LEAGUES[need.other];
  const strength = (c) => (c.tiers.stark ?? 0) + 2 * (c.tiers.dorfstar ?? 0) + 3 * (c.tiers.superstar ?? 0) + 0.5 * (c.tiers.gut ?? 0);
  const sorted = [...league.clubs].sort((a, b) => strength(a) - strength(b));
  const def = need.kind === 'up' ? sorted[0] : sorted[sorted.length - 1];
  const rng = createRng((career.seed * 977 + career.season * 31) >>> 0);
  const used = new Set([...career.clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? []), ...(career.alumni ?? []).map((a) => a.idx)]);
  const squad = squadPicker(rng, used)(def.tiers, SQUAD_SHAPES[LEAGUES[Math.max(need.level, need.other)].squadShape]);
  for (const idx of squad) career.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  const opponent = { ...def, id: RELEGATION_ID, human: false, squad };
  // Hinspiel beim Unterklassigen, Rückspiel beim Höherklassigen.
  const humanHigher = need.kind === 'stay';
  career.relegation = {
    season: career.season,
    kind: need.kind,
    fromLevel: need.level,
    otherLevel: need.other,
    opponent,
    legs: [
      { home: humanHigher ? RELEGATION_ID : humanClub(career).id, result: null },
      { home: humanHigher ? humanClub(career).id : RELEGATION_ID, result: null },
    ],
    leg: 0,
    agg: [0, 0], // [wir, die]
    pens: null,
    done: false,
    won: null,
  };
  return career.relegation;
}

export function prepareRelegationMatch(career, { human = false, duration } = {}) {
  const r = relegationOf(career);
  const leg = r.legs[r.leg];
  const me = humanClub(career);
  const homeIsMe = leg.home === me.id;
  const home = homeIsMe ? me : r.opponent;
  const away = homeIsMe ? r.opponent : me;
  const rng = createRng((career.seed * 613 + career.season * 97 + r.leg * 7) >>> 0);
  const higher = LEAGUES[Math.max(r.fromLevel, r.otherLevel)];
  const base = PITCHES[home.venue] ?? PITCHES.rasenplatz;
  const format = higher.format ?? base.format;
  const pitch = applyWeather({ ...base, format, referee: true }, career.week?.weather);
  const avail = (club) => (club.human ? career.week?.availability ?? Object.fromEntries(club.squad.map((i) => [i, 'yes'])) : Object.fromEntries(club.squad.map((i) => [i, rng.chance(0.1) ? 'no' : 'yes'])));
  const teamHome = teamForMatch(career, home, format, avail(home), rng);
  const teamAway = teamForMatch(career, resolveKitClash(home, away), format, avail(away), rng);
  const humanIsAway = human && !homeIsMe;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration, incidents: true });
  // Rückspiel: Hinspiel-Tore zählen mit; bei Gleichstand Elfmeterschießen.
  if (r.leg === 1) {
    match.knockout = true;
    const [ours, theirs] = r.agg;
    // Team 0 ist der Mensch (wenn er spielt), sonst die Heimmannschaft.
    const t0IsMe = human ? true : homeIsMe;
    match.aggregate = t0IsMe ? [ours, theirs] : [theirs, ours];
  }
  return { match, humanIsAway, pitch, home, away, relegation: true, homeIsMe };
}

export function recordRelegationLeg(career, prepared) {
  const r = relegationOf(career);
  const m = prepared.match;
  // Aus Sicht des eigenen Vereins: Team 0 ist man selbst, wenn man gespielt hat
  // (oder zu Hause war).
  const t0IsMe = m.humanTeam !== null ? true : prepared.homeIsMe;
  const ours = t0IsMe ? m.score[0] : m.score[1];
  const theirs = t0IsMe ? m.score[1] : m.score[0];
  r.legs[r.leg].result = { ours, theirs };
  r.agg[0] += ours;
  r.agg[1] += theirs;
  if (r.leg === 0) {
    r.leg = 1;
    return r;
  }
  if (r.agg[0] === r.agg[1]) {
    const so = m.shootout?.done ? shootoutScore(m.shootout) : null;
    if (so) r.pens = t0IsMe ? { ours: so[0], theirs: so[1] } : { ours: so[1], theirs: so[0] };
    else {
      const rng = createRng((career.seed * 13 + career.season * 101) >>> 0);
      let a = 0;
      let b = 0;
      for (let i = 0; i < 5 || a === b; i++) {
        if (rng.chance(0.7)) a++;
        if (rng.chance(0.7)) b++;
        if (i > 20) break;
      }
      if (a === b) a++;
      r.pens = { ours: a, theirs: b };
    }
    r.won = r.pens.ours > r.pens.theirs;
  } else r.won = r.agg[0] > r.agg[1];
  r.done = true;
  adjustMood(career, r.won ? 0.15 : -0.1);
  const league = LEAGUES[r.kind === 'up' ? r.otherLevel : r.fromLevel].name;
  chronicle(
    career,
    r.kind === 'up'
      ? r.won
        ? tr(`Aufstieg über die Relegation gegen ${r.opponent.name} (${r.agg[0]}:${r.agg[1]}${r.pens ? `, i. E. ${r.pens.ours}:${r.pens.theirs}` : ''}) – ab jetzt ${league}.`, `Promoted via the play-off against ${r.opponent.name} (${r.agg[0]}-${r.agg[1]}${r.pens ? `, ${r.pens.ours}-${r.pens.theirs} on pens` : ''}) – ${league} from now on.`)
        : tr(`Relegation gegen ${r.opponent.name} verloren (${r.agg[0]}:${r.agg[1]}${r.pens ? `, i. E. ${r.pens.ours}:${r.pens.theirs}` : ''}). Nächstes Jahr.`, `Lost the play-off to ${r.opponent.name} (${r.agg[0]}-${r.agg[1]}${r.pens ? `, ${r.pens.ours}-${r.pens.theirs} on pens` : ''}). Next year.`)
      : r.won
        ? tr(`Klassenerhalt in der Relegation gegen ${r.opponent.name} (${r.agg[0]}:${r.agg[1]}${r.pens ? `, i. E. ${r.pens.ours}:${r.pens.theirs}` : ''}). Durchatmen.`, `Survived the play-off against ${r.opponent.name} (${r.agg[0]}-${r.agg[1]}${r.pens ? `, ${r.pens.ours}-${r.pens.theirs} on pens` : ''}). Deep breath.`)
        : tr(`Abstieg nach der Relegation gegen ${r.opponent.name} (${r.agg[0]}:${r.agg[1]}${r.pens ? `, i. E. ${r.pens.ours}:${r.pens.theirs}` : ''}).`, `Relegated after the play-off against ${r.opponent.name} (${r.agg[0]}-${r.agg[1]}${r.pens ? `, ${r.pens.ours}-${r.pens.theirs} on pens` : ''}).`),
  );
  return r;
}

// Für den Saisonwechsel: Ergebnis der Relegation (falls es eine gab).
export function relegationOutcome(career) {
  const r = relegationOf(career);
  if (!r?.done) return null;
  return { promoted: r.kind === 'up' && r.won, relegated: r.kind === 'stay' && !r.won };
}

// Nicht selbst gespielt? Dann werden die offenen Relegationsspiele simuliert.
export function autoRelegation(career) {
  if (!relegationNeeded(career)) return null;
  const r = startRelegation(career);
  while (!r.done) {
    const prepared = prepareRelegationMatch(career);
    simulateSync(prepared);
    recordRelegationLeg(career, prepared);
  }
  return r;
}
