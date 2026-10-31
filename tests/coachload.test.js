// Familie und Energie nach Liga (personal.js, coachload.js): ab Bezirksliga springt der Co-Trainer ein, ab Verbandsliga dauert
// eine Krise eine Woche; im roten Bereich kostet Energie eine Aktion, Familie den günstigeren Sonntag.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { startWeek } from '../src/career/coachload.js';
import { CRISES, crisisWeeks, personalWeek, RED, standIn, weeklyPersonal } from '../src/career/personal.js';

describe('Familie und Energie nach Liga', () => {
  it('Krise: zwei Wochen bis Landesliga, eine ab Verbandsliga; wer einspringt', () => {
    const c = createCareer({ seed: 61 });
    for (const [level, weeks] of [[1, 2], [4, 2], [6, 2], [7, 1], [8, 1]]) {
      c.level = level;
      expect(crisisWeeks(c)).toBe(weeks);
    }
    c.level = 4;
    c.staff = { cotrainer: { name: 'Co' } };
    expect(standIn(c)).toBe('kapitaen');
    c.level = 5;
    expect(standIn(c)).toBe('cotrainer');
    c.staff = {};
    expect(standIn(c)).toBe('kapitaen');
  });

  it('Burnout in der Verbandsliga mit Co-Trainer: eine Woche weg, der Co-Trainer übernimmt', () => {
    const c = createCareer({ seed: 62 });
    c.level = 7;
    c.staff = { cotrainer: { name: 'Co' } };
    c.coach.pendingCrisis = 'burnout';
    personalWeek(c);
    expect(c.coach.awayWeeks).toBe(1);
    expect(c.week.event.text).toContain('eine Woche');
    expect(CRISES.burnout.options[0].effect(c)).toContain('Co-Trainer');
    const d = createCareer({ seed: 62 });
    d.coach.pendingCrisis = 'familienkrise';
    personalWeek(d);
    expect(d.coach.awayWeeks).toBe(2);
    expect(CRISES.familienkrise.options[0].effect(d)).toContain('Kapitän');
  });

  it('Energie im roten Bereich: eine Aktion weniger, mit Hinweis', () => {
    const c = createCareer({ seed: 63 });
    const before = c.week.actions;
    c.coach.energy = RED + 5;
    startWeek(c);
    expect(c.week.actions).toBe(before);
    c.coach.energy = RED - 1;
    startWeek(c);
    expect(c.week.actions).toBe(before - 1);
    expect(c.week.chat.some((m) => m.tired)).toBe(true);
  });

  it('Familie im roten Bereich: der günstigere Sonntag fällt weg', () => {
    const run = (patience) => {
      const c = createCareer({ seed: 64 });
      c.coach.flags.familyAtGames = true;
      c.coach.patience = patience;
      c.week.actions = 2;
      c.week.training = false;
      weeklyPersonal(c);
      return c.coach.patience - patience;
    };
    // 4 − 1,5 = +2,5 → gerundet +3 (personal.js clamp100); im roten Bereich 4 − 3 = +1.
    expect(run(RED + 10)).toBe(3);
    expect(run(RED - 10)).toBe(1);
  });
});
