// Relegation: Der Zweite spielt gegen den Vorletzten der Liga darüber um den
// Aufstieg; der Vorletzte verteidigt seinen Platz gegen den Zweiten von unten.
// Hin- und Rückspiel, es zählt das Gesamtergebnis. Steht es danach gleich, wird
// im Rückspiel Elfmeter geschossen – selbst gespielt live, simuliert gewürfelt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { createMatch, MATCH } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { shootoutScore } from '../sim/shootout.js';
import { subRuleFor } from '../sim/squad.js';
import { LEAGUES, MAX_LEVEL } from './clubs.js';
import { humanClub, resolveKitClash, simulateSync, squadPicker, SQUAD_SHAPES, table, teamForMatch } from './career.js';
import { adjustMood } from './events.js';
import { applyWeather, rollWeather } from './weather.js';
import { coachAway, isCoach } from './personal.js';
import { isBanned } from './suspensions.js';
import { chronicle } from './sagas.js';
import { membersOf } from './pyramid.js';

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
  const strength = (c) => (c.tiers.stark ?? 0) + 2 * (c.tiers.dorfstar ?? 0) + 3 * (c.tiers.superstar ?? 0) + 0.5 * (c.tiers.gut ?? 0);
  const sorted = [...membersOf(career, need.other)].sort((a, b) => strength(a) - strength(b)); // aktuelle Vereinsliste (pyramid.js)
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

// Platz eines Relegationsspiels: der des Heimvereins, wenn die höhere Liga dort spielt – sonst (Hinterhof, Parkplatz …) der Platz,
// den die höhere Liga verlangt (humanVenue). Spielerzahl wie in der höheren Liga. Vorher stand im Hinterhof 7 gegen 7
// (vom Nutzer gemeldet, 2026-10-23): die Spielerzahl kam aus der höheren Liga, der Platz vom Heimverein.
function legVenue(r, home) {
  const higher = LEAGUES[Math.max(r.fromLevel, r.otherLevel)];
  const ok = home.venue === higher.humanVenue || higher.clubs.some((c) => c.venue === home.venue);
  const base = PITCHES[ok ? home.venue : higher.humanVenue] ?? PITCHES.rasenplatz;
  return { base, format: higher.format ?? base.format, higher };
}
const legHome = (career, r) => (r.legs[r.leg].home === humanClub(career).id ? humanClub(career) : r.opponent);

// Platz des nächsten Relegationsspiels (für Aufstellung und Taktik im Vereinsheim), null ohne offene Relegation.
export function nextRelegationPitch(career) {
  const r = relegationOf(career);
  if (!r || r.done) return null;
  const { base, format } = legVenue(r, legHome(career, r));
  return applyWeather({ ...base, format, referee: true }, career.week?.weather);
}

// Spielwoche der Relegation: Nach dem letzten Spieltag gibt es sonst keine Woche – Aufstellung und Taktik ließen sich nicht
// wählen (vom Nutzer gemeldet). Zusagen: wer nicht verletzt, gesperrt oder verreist ist, ist dabei – um den Aufstieg fehlt
// keiner. Keine Ereignisse, keine Gerüchte, kein Nachhaken; die gewählte Aufstellung gilt für Hin- und Rückspiel.
export function relegationWeek(career, lineup = null) {
  const r = startRelegation(career);
  if (!r || r.done) return null;
  const club = humanClub(career);
  const availability = {};
  for (const idx of club.squad) {
    const rec = career.players[idx] ?? {};
    if (isCoach(career, idx)) availability[idx] = coachAway(career) || isBanned(career, idx) ? 'no' : 'yes';
    else availability[idx] = rec.injuryWeeks > 0 || isBanned(career, idx) || rec.awayWeeks > 0 ? 'no' : 'yes';
  }
  const home = r.legs[r.leg].home === club.id;
  const what = r.leg === 0 ? tr('Hinspiel', 'first leg') : tr('Rückspiel', 'second leg');
  const text = tr(`Relegation, ${what} gegen ${r.opponent.name}${home ? ' bei uns' : ' auswärts'}. Alle an Bord – um so ein Spiel fehlt keiner.`, `Play-off, ${what} against ${r.opponent.name}${home ? ' at ours' : ' away'}. All hands on deck – nobody misses a game like this.`);
  const weather = rollWeather(career, Math.max(0, (career.fixtures?.length ?? 1) - 1));
  return { relegation: true, availability, chat: [{ from: null, text, time: 'Mo 08:00', me: true }], nudges: 0, nudged: [], lineup, training: null, event: null, weather, postponed: null, rumors: [], actions: 0 };
}

// „Weiter zum Rückspiel“: wie nach dem Pokalspiel unter der Woche ein eigener Schritt zwischen zwei Spielen.
export function finishFirstLeg(career) {
  if (career.week) delete career.week.legDone;
}

export function prepareRelegationMatch(career, { human = false, duration } = {}) {
  const r = relegationOf(career);
  const leg = r.legs[r.leg];
  const me = humanClub(career);
  const homeIsMe = leg.home === me.id;
  const home = homeIsMe ? me : r.opponent;
  const away = homeIsMe ? r.opponent : me;
  const rng = createRng((career.seed * 613 + career.season * 97 + r.leg * 7) >>> 0);
  const { base, format, higher } = legVenue(r, home);
  const pitch = applyWeather({ ...base, format, referee: true }, career.week?.weather);
  const avail = (club) => (club.human ? career.week?.availability ?? Object.fromEntries(club.squad.map((i) => [i, 'yes'])) : Object.fromEntries(club.squad.map((i) => [i, rng.chance(0.1) ? 'no' : 'yes'])));
  const teamHome = teamForMatch(career, home, format, avail(home), rng);
  const teamAway = teamForMatch(career, resolveKitClash(home, away), format, avail(away), rng);
  const humanIsAway = human && !homeIsMe;
  const teams = humanIsAway ? [teamAway, teamHome] : [teamHome, teamAway];
  const match = createMatch({ seed: rng.int(1, 1e9), pitch, teams, human, duration, incidents: true });
  match.subRule = subRuleFor(MATCH.subs, higher.level);
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
    career.week = relegationWeek(career, career.week?.lineup ?? null); // Rückspiel: neue Zusagen, Aufstellung bleibt
    if (career.week) career.week.legDone = true; // erst „Weiter zum Rückspiel“ im Vereinsheim (finishFirstLeg), dann das Rückspiel
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
