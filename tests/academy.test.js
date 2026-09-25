import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, playerOf, seasonOver } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { ACADEMY_EVENTS, ownKids, poachKid, scoutList, seasonAcademy, setYouthFocus, weeklyAcademy } from '../src/career/academy.js';
import { createRng } from '../src/core/rng.js';

describe('youth academy', () => {
  it('starts with kids in all age groups; drills build talent but cost joy', () => {
    const c = createCareer({ seed: 601 });
    expect(c.youth.kids.length).toBeGreaterThanOrEqual(10);
    const k = c.youth.kids[0];
    const [t0, j0] = [k.talent, k.joy];
    setYouthFocus(c, 'kondition');
    for (let i = 0; i < 5; i++) weeklyAcademy(c);
    expect(k.talent).toBeGreaterThan(t0);
    expect(k.joy).toBeLessThan(j0);
    setYouthFocus(c, 'spass');
    const j1 = k.joy;
    weeklyAcademy(c);
    expect(k.joy).toBeGreaterThan(j1);
  });

  it('at 16 kids move up to the A-youth as real players; new kids arrive each summer', () => {
    const c = createCareer({ seed: 602 });
    const oldest = c.youth.kids.reduce((a, b) => (a.age > b.age ? a : b));
    oldest.age = 15;
    oldest.girl = false;
    oldest.joy = 0.9;
    const before = c.youth.prospects.length;
    const notes = seasonAcademy(c);
    expect(c.youth.prospects.length).toBeGreaterThan(before);
    const idx = c.youth.prospects.at(-1);
    expect(playerOf(c, idx).name).toBe(oldest.name);
    expect(notes.join(' ')).toContain('Schnuppertraining');
  });

  it('your own children play in the youth teams', () => {
    const c = createCareer({ seed: 603, coach: { first: 'A', last: 'Kranz', age: 36, style: 'libero', relation: 'verheiratet', children: [{ name: 'Paul', age: 9, sex: 'm' }] } });
    expect(ownKids(c).map((k) => k.name)).toContain('Paul Kranz');
  });

  it('you can poach kids from other clubs – once a week', () => {
    const c = createCareer({ seed: 604 });
    const list = scoutList(c);
    expect(list).toHaveLength(3);
    const res = poachKid(c, list[0].id);
    expect(['joined', 'declined']).toContain(res);
    expect(poachKid(c, list[1].id)).toBeNull();
  });

  it('every academy event resolves with every option', () => {
    for (const [id, def] of Object.entries(ACADEMY_EVENTS)) {
      for (let choice = 0; choice < def.options.length; choice++) {
        const c = createCareer({ seed: 610 + choice });
        c.round = 3;
        c.youth.kids.forEach((k) => Object.assign(k, { talent: 0.8, age: 12, parent: 'ehrgeizig' }));
        const ctx = def.needs(c, createRng(choice + 2));
        expect(ctx, id).toBeTruthy();
        c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
        expect(typeof resolveEvent(c, choice), `${id}/${choice}`).toBe('string');
      }
    }
  });

  it('a whole season runs with the academy', () => {
    const c = createCareer({ seed: 620 });
    while (!seasonOver(c)) finishRound(c);
    nextSeason(c);
    expect(c.youth.results.length).toBe(1);
    expect(humanClub(c).squad.length).toBeGreaterThan(6);
  });
});
