// Taktische Muster des Gegners (Gameplay 2.0, Punkt 30): Handschrift je Gegnertrainer, im Spiel und im Scouting.
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, humanClub, prepareMatch, setClubPlan, tacticOf } from '../src/career/career.js';
import { coachOf } from '../src/career/opponents.js';
import { PATTERNS, patternOf } from '../src/career/patterns.js';
import { scoutReport } from '../src/career/opponentscout.js';

describe('Handschrift der Gegnertrainer', () => {
  it('passt zum Trainertyp, ist fest je Verein; Kumpeltypen haben keine', () => {
    const c = createCareer({ seed: 30 });
    const seen = new Set();
    for (const club of c.clubs.filter((x) => !x.human)) {
      const pat = patternOf(club);
      expect(patternOf(club)).toBe(pat);
      const type = coachOf(club).type;
      if (type === 'kumpeltyp') expect(pat).toBeNull();
      else expect(Object.keys(PATTERNS)).toContain(pat);
      if (type === 'grossmaul') expect(pat).toBe('pressing');
      if (pat) seen.add(pat);
    }
    expect(seen.size).toBeGreaterThan(0);
    expect(patternOf(humanClub(c))).toBeNull();
  });

  it('wirkt im Spiel: Die Befehle des Gegners stehen ab Anpfiff; unser Gegenmittel auch', () => {
    const c = createCareer({ seed: 31 });
    const me = humanClub(c);
    const opp = c.clubs.find((x) => !x.human && patternOf(x) && PATTERNS[patternOf(x)].counter);
    expect(opp).toBeTruthy();
    expect(tacticOf(opp, 11).orders).toEqual(PATTERNS[patternOf(opp)].orders);
    const { group, value } = PATTERNS[patternOf(opp)].counter;
    setClubPlan(c, group, value);
    // Ein beliebiges eigenes Spiel: Unser Plan gilt; das Spiel gegen opp hat dessen Befehle.
    const f = currentFixtures(c).find((x) => x.home === me.id || x.away === me.id);
    const m = prepareMatch(c, f, { duration: 240 }).match;
    const us = m.teams.findIndex((t) => t.name === me.name);
    expect(m.orders[us][group]).toBe(value);
    const them = c.clubs.find((x) => x.id === (f.home === me.id ? f.away : f.home));
    for (const [g, v] of Object.entries(PATTERNS[patternOf(them)]?.orders ?? {})) expect(m.orders[1 - us][g]).toBe(v);
  });

  it('Scouting zeigt die Handschrift samt Satz des Co-Trainers, sobald man den Gegner grob kennt', () => {
    const c = createCareer({ seed: 32 });
    const opp = c.clubs.find((x) => !x.human && patternOf(x));
    const r = scoutReport(c, opp, 11);
    if (r.level >= 1) {
      expect(r.pattern.id).toBe(patternOf(opp));
      expect(r.pattern.hint.length).toBeGreaterThan(20);
    } else expect(r.pattern).toBeNull();
    expect(PATTERNS.mauern.counter).toBeNull(); // gegen Mauern half nichts messbar
  });
});
