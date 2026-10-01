import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { initAcademy, seasonAcademy, setYouthFocus, teamOfAge, weeklyAcademy } from '../src/career/academy.js';
import { appointCoach, coachCandidates, COURSE_COST, COURSE_WEEKS, FOCUS_FIT, initTeams, SELF_ENERGY, startCourse, weeklyTeams } from '../src/career/youthteams.js';

function career(seed = 3) {
  const c = createCareer({ seed });
  initAcademy(c);
  initTeams(c);
  return c;
}
const kidsOf = (c, id) => c.youth.kids.filter((k) => teamOfAge(k.age)?.id === id);
const avg = (list, f) => list.reduce((s, k) => s + f(k), 0) / (list.length || 1);

describe('Jugend: Trainer und Schwerpunkt je Mannschaft', () => {
  it('jede Mannschaft hat zu Beginn einen Trainer und einen Schwerpunkt; alte Spielstände übernehmen den Wochen-Schwerpunkt', () => {
    const c = createCareer({ seed: 3 });
    c.week.youthFocus = 'technik';
    initAcademy(c);
    const teams = initTeams(c);
    for (const id of ['E', 'D', 'C', 'B']) {
      expect(teams[id].coach).toBeTruthy();
      expect(teams[id].focus).toBe('technik');
    }
  });

  it('der Schwerpunkt wirkt je nach Alter: Technik in der E-Jugend bringt mehr als Kondition – und Kondition kostet die Kleinen Spaß', () => {
    const run = (focus) => {
      const c = career(4);
      setYouthFocus(c, focus, 'E');
      const kids = kidsOf(c, 'E');
      const t0 = avg(kids, (k) => k.talent);
      const j0 = avg(kids, (k) => k.joy);
      for (let w = 0; w < 8; w++) weeklyAcademy(c);
      return { talent: avg(kids, (k) => k.talent) - t0, joy: avg(kids, (k) => k.joy) - j0 };
    };
    const technik = run('technik');
    const kondition = run('kondition');
    expect(technik.talent).toBeGreaterThan(kondition.talent);
    expect(kondition.joy).toBeLessThan(technik.joy);
    expect(FOCUS_FIT.B.kondition).toBeGreaterThan(FOCUS_FIT.E.kondition);
  });

  it('ohne Trainer: kaum Fortschritt, Spaß sinkt – zum Saisonende wird das Team abgemeldet', () => {
    const c = career(5);
    c.youth.teams.D.coach = null;
    const kids = kidsOf(c, 'D');
    expect(kids.length).toBeGreaterThan(0);
    const j0 = avg(kids, (k) => k.joy);
    for (let w = 0; w < 6; w++) weeklyAcademy(c);
    expect(avg(kids, (k) => k.joy)).toBeLessThan(j0);
    const notes = seasonAcademy(c);
    expect(notes.join(' ')).toMatch(/abgemeldet|withdrawn/);
  });

  it('freie Stelle besetzen: Elternteil immer, Ehemalige und A-Jugendliche wenn vorhanden, oder du selbst (kostet Kraft)', () => {
    const c = career(6);
    c.youth.teams.E.coach = null;
    const kinds = coachCandidates(c, 'E').map((x) => x.kind);
    expect(kinds).toContain('eltern');
    expect(kinds).toContain('du');
    expect(appointCoach(c, 'E', 'du')).toBe(true);
    expect(c.youth.teams.E.coach.kind).toBe('du');
    const e0 = c.coach.energy;
    weeklyTeams(c, (cc, d) => (cc.coach.energy += d));
    expect(c.coach.energy).toBe(e0 - SELF_ENERGY);
    // Nur ein Team kannst du selbst übernehmen.
    c.youth.teams.D.coach = null;
    expect(coachCandidates(c, 'D').map((x) => x.kind)).not.toContain('du');
  });

  it('C-Lizenz-Kurs: kostet Geld, dauert vier Wochen, danach ist der Trainer deutlich besser', () => {
    const c = career(7);
    c.cash = 500;
    const coach = c.youth.teams.B.coach;
    const q0 = coach.quality;
    expect(startCourse(c, 'B')).toBe(true);
    expect(c.cash).toBe(500 - COURSE_COST);
    expect(startCourse(c, 'B')).toBe(false); // läuft schon
    for (let w = 0; w < COURSE_WEEKS; w++) {
      c.round++;
      weeklyTeams(c);
    }
    expect(coach.licence).toBe(true);
    expect(coach.quality).toBeCloseTo(Math.min(0.85, q0 + 0.2), 5);
    expect(c.youth.teams.B.course).toBeNull();
  });
});
