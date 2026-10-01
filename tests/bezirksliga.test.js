import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, currentLineup, finishRound, humanClub, humanFixture, leagueOf, matchFormat, maxSquad, nextSeason, playerOf, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { AE_WEEK, fahrgeld, OPS_COST } from '../src/career/finances.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { systemsFor } from '../src/sim/tactics.js';
import { penaltySpot } from '../src/sim/setpieces.js';
import { BEZIRK_SUBS, subRuleFor } from '../src/sim/squad.js';
import { checkOffside, markOffside } from '../src/sim/offside.js';
import { startSetPiece } from '../src/sim/setpieces.js';

function winSeason(c) {
  while (!seasonOver(c)) {
    for (const f of currentFixtures(c)) {
      const h = c.clubs.find((cl) => cl.id === f.home);
      const a = c.clubs.find((cl) => cl.id === f.away);
      f.result = h.human ? { home: 3, away: 0 } : a.human ? { home: 0, away: 3 } : { home: 1, away: 1 };
    }
    finishRound(c);
  }
}

describe('Großfeld: 11 gegen 11', () => {
  it('105 × 68 m, Tore 7,32 × 2,44 m, Elfmeter aus 11 m; vier 11er-Systeme', () => {
    const p = PITCHES.grossfeld;
    expect([p.halfLength * 2, p.halfWidth * 2, p.goalHalfWidth * 2, p.goalHeight]).toEqual([105, 68, 7.32, 2.44]);
    expect(p.offside).toBe(true);
    const m = createMatch({ seed: 1, pitch: p, human: false });
    expect(Math.abs(penaltySpot(m, 0).x)).toBeCloseTo(52.5 - 11, 5);
    expect(m.players.filter((q) => q.team === 0)).toHaveLength(11);
    for (const s of Object.values(systemsFor(11))) expect(s.formation).toHaveLength(11);
    expect(PITCHES.sportplatz.penaltyDistance).toBe(8); // DFB-9er
    expect(subRuleFor('liga', 5)).toBe(BEZIRK_SUBS);
    expect(BEZIRK_SUBS).toEqual({ limit: 5, reentry: false });
  });
});

describe('Abseits', () => {
  // Kleine Szene: Team 0 greift an (+x). Passgeber im Mittelfeld, ein Stürmer hinter der Abwehr.
  function scene() {
    const m = createMatch({ seed: 3, pitch: PITCHES.grossfeld, human: false });
    m.phase = 'play';
    const s = m.sidesSwapped ? -1 : 1;
    const t0 = m.players.filter((p) => p.team === 0);
    const t1 = m.players.filter((p) => p.team === 1);
    t1.forEach((p, i) => (p.pos = { x: s * (p.role === 'gk' ? 50 : 20 - i * 0.1), z: i - 5 })); // letzte Linie bei ~20
    const kicker = t0.find((p) => p.role === 'mid');
    const runner = t0.find((p) => p.role === 'fwd');
    const onside = t0.filter((p) => p.role === 'fwd')[1];
    kicker.pos = { x: s * 5, z: 0 };
    m.ball.pos = { x: s * 5, y: 0.11, z: 0 };
    runner.pos = { x: s * 26, z: 3 }; // klar hinter der Linie
    onside.pos = { x: s * 18, z: -3 }; // davor
    return { m, kicker, runner, onside };
  }

  it('wer bei der Ballabgabe hinter der Linie steht und den Ball spielt, ist abseits: Freistoß für den Gegner', () => {
    const { m, kicker, runner } = scene();
    markOffside(m, kicker, null);
    expect(m.offside.ids.map((e) => e.id)).toContain(runner.id);
    m.rng = { ...m.rng, chance: () => false }; // Schiri sieht es
    m.ball.lastTouch = runner.id;
    expect(checkOffside(m, startSetPiece)).toBe(true);
    expect(m.setPiece).toMatchObject({ type: 'freekick', team: 1 });
  });

  it('der Mitspieler davor ist nicht abseits; nach Einwurf, Abstoß und Ecke gibt es kein Abseits', () => {
    const { m, kicker, onside, runner } = scene();
    markOffside(m, kicker, null);
    expect(m.offside.ids.map((e) => e.id)).not.toContain(onside.id);
    m.ball.lastTouch = onside.id;
    expect(checkOffside(m, startSetPiece)).toBe(false);
    for (const restart of ['throwin', 'goalkick', 'corner']) {
      markOffside(m, kicker, restart);
      expect(m.offside).toBeNull();
    }
    expect(runner).toBeTruthy();
  });

  it('auf dem Kleinfeld gibt es kein Abseits', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false });
    const kicker = m.players.find((p) => p.team === 0 && p.role === 'mid');
    markOffside(m, kicker, null);
    expect(m.offside).toBeNull();
  });

  it('in echten Großfeld-Spielen wird Abseits gepfiffen', () => {
    let offsides = 0;
    for (const seed of [1, 2]) {
      const m = createMatch({ seed, pitch: PITCHES.grossfeld, human: false, incidents: false });
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, 1 / 60);
        offsides += m.events.filter((e) => e.type === 'offside' || e.type === 'offside_missed').length;
        m.events.length = 0;
      }
    }
    expect(offsides).toBeGreaterThan(0);
  }, 120000);
});

describe('Bezirksliga in der Karriere', () => {
  it('Aufstieg aus der Kreisliga A: 11er-Format, Großfeld, Kader bis 22, eine Partie läuft 11 gegen 11', () => {
    const c = createCareer({ seed: 91 });
    c.level = 4;
    winSeason(c);
    expect(nextSeason(c).promoted).toBe(true);
    expect(leagueOf(c).level).toBe(5);
    expect(c.league).toBe('Bezirksliga Kanal');
    expect(humanClub(c).venue).toBe('grossfeld');
    expect(maxSquad(c)).toBe(22);
    expect(matchFormat(c)).toBe(11);
    expect(currentLineup(c).formation).toHaveLength(11);
    for (const club of c.clubs.filter((x) => !x.human)) expect(club.squad.length).toBe(20);
    const f = humanFixture(c);
    const prepared = prepareMatch(c, f, { duration: 60 });
    expect(prepared.match.players.filter((p) => p.team === 0).length).toBeLessThanOrEqual(11);
    simulateSync(prepared);
    recordResult(c, f, prepared);
    expect(f.result).toBeTruthy();
  }, 120000);

  it('Aufwandsentschädigung statt Fahrgeld – höchstens 250 € im Monat (DFB), ab „stark"', () => {
    const c = createCareer({ seed: 92 });
    c.level = 5;
    const fg = fahrgeld(c);
    expect(fg.ae).toBe(true);
    const expected = humanClub(c).squad.filter((i) => i !== c.coach?.idx).reduce((s, i) => s + (AE_WEEK[playerOf(c, i).tier] ?? 0), 0);
    expect(fg.total).toBe(expected);
    for (const v of Object.values(AE_WEEK)) expect(v * 52 / 12).toBeLessThanOrEqual(251.4);
    expect(AE_WEEK.gut).toBeUndefined();
    expect(OPS_COST[5]).toBeGreaterThan(OPS_COST[4]);
  });
});
