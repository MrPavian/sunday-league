import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, playerOf, prepareMatch } from '../src/career/career.js';
import { startStory, STORIES } from '../src/career/stories.js';
import { createRng } from '../src/core/rng.js';
import { absenceFactor, adjustForm, advanceArcs, EVENTS, moodLabel, resolveEvent, rollWeekEvent } from '../src/career/events.js';

describe('club life events', () => {
  it('every event can be triggered and every option resolves with a result text', () => {
    for (const [id, def] of Object.entries(EVENTS)) {
      for (let choice = 0; choice < def.options.length; choice++) {
        let career = null;
        let ctx = null;
        for (let seed = 1; seed < 60 && !ctx; seed++) {
          const c = createCareer({ seed: seed * 11 });
          c.round = id === 'sommerfest' ? 4 : 5; // manche Ereignisse brauchen ein paar Spieltage
          if (id === 'schiri_beschwerde') c.level = 2;
          if (id === 'firmenturnier') c.sponsors = [{ name: 'Bäckerei Krume', slot: 'trikot', weekly: 10 }];
          if (id === 'allueren') humanClub(c).squad.forEach((idx) => (c.players[idx].apps = 9));
          ctx = def.needs(c, { next: () => 0.3, pick: (l) => l[0], chance: () => true, int: (a) => a, range: (a) => a });
          career = c;
        }
        if (!ctx) continue; // z. B. kein Star im Kader – dann eben nicht
        career.week.event = { id, ctx, text: def.text(career, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
        const result = resolveEvent(career, choice);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(5);
        expect(resolveEvent(career, choice)).toBeNull(); // nur einmal
      }
    }
  });

  it('draws at most one event per week and never the same one twice in a row', () => {
    const c = createCareer({ seed: 3 });
    const ids = [];
    for (let r = 0; r < 9; r++) {
      if (c.week.event) ids.push(c.week.event.id);
      finishRound(c);
    }
    expect(ids.length).toBeGreaterThan(2);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });

  it('team mood changes absences; form changes the player in the match', () => {
    const c = createCareer({ seed: 4 });
    const idx = humanClub(c).squad[1];
    c.mood = 0.8;
    const happy = absenceFactor(c, idx);
    c.mood = -0.8;
    const grumpy = absenceFactor(c, idx);
    expect(grumpy).toBeGreaterThan(happy);
    expect(moodLabel(0.8)).toBe('super');
    expect(moodLabel(-0.8)).toBe('mies');

    c.mood = 0;
    c.week.lineup = null;
    const base = prepareMatch(c, humanFixture(c), { human: true, duration: 5 }).match;
    for (const i of humanClub(c).squad) adjustForm(c, i, -1);
    const hungover = prepareMatch(c, humanFixture(c), { human: true, duration: 5 }).match;
    const pace = (m) => m.players.filter((p) => p.team === 0).reduce((s, p) => s + p.attrs.pace, 0);
    expect(pace(hungover)).toBeLessThan(pace(base));
  });

  it('the "becoming a dad" story runs over several weeks', () => {
    const c = createCareer({ seed: 6 });
    const idx = humanClub(c).squad[2];
    startStory(c, 'vater', idx);
    for (let i = 0; i < 2; i++) advanceArcs(c);
    expect(c.week.availability[idx]).toBe('no');
    expect(c.week.chat.at(-1).text).toMatch(/Mädchen|Junge|ZWILLINGE/);
    advanceArcs(c);
    expect(c.arcs.find((a) => a.id === 'vater')).toBeUndefined(); // zu Ende erzählt
  });

  it('old saves with the dad story in the flags keep running', () => {
    const c = createCareer({ seed: 6 });
    const idx = humanClub(c).squad[2];
    c.flags.arcVater = { idx, step: 0, round: c.round };
    advanceArcs(c);
    expect(c.flags.arcVater).toBeUndefined();
    expect(c.arcs.some((a) => a.id === 'vater' && a.idx === idx)).toBe(true);
  });

  it('every life story can start and runs to its end with every choice', () => {
    for (const [id, story] of Object.entries(STORIES)) {
      for (let choice = 0; choice < story.start.options.length; choice++) {
        const c = createCareer({ seed: 21 });
        c.round = 3;
        if (id === 'abschluss') humanClub(c).squad.forEach((idx) => (c.players[idx].job = 'Student (5. Semester)'));
        const ctx = story.start.needs(c, createRng(choice + 5));
        expect(ctx, id).toBeTruthy();
        c.week.event = { id, ctx, text: story.start.text(c, ctx), options: story.start.options.map((o) => o.label), choice: null, result: null };
        expect(typeof resolveEvent(c, choice)).toBe('string');
        // Ein paar Wochen weiterspielen; Entscheidungen unterwegs nimmt die Gruppe automatisch.
        for (let w = 0; w < 8 && c.week; w++) {
          c.week.event = null;
          advanceArcs(c);
          if (c.week.event?.id.startsWith('story:')) {
            expect(c.week.event.text.length).toBeGreaterThan(10);
            expect(typeof resolveEvent(c, 0)).toBe('string');
          }
          if (id === 'bruder') c.round = Math.min(c.round + 1, c.fixtures.length - 1);
        }
        expect(c.arcs.filter((a) => a.id === id && a.id !== 'bruder').length, `${id}/${choice}`).toBe(0);
      }
    }
  });

  it('losing the job changes the profession, a commute means more absences', () => {
    const c = createCareer({ seed: 22 });
    const idx = humanClub(c).squad.find((i) => !/^(Schüler|Student|Azubi|Frührentner)/.test(playerOf(c, i).profession));
    const before = absenceFactor(c, idx);
    c.players[idx].job = 'Arbeitssuchend';
    c.players[idx].absenceMul = 0.3;
    expect(playerOf(c, idx).profession).toBe('Arbeitssuchend');
    expect(absenceFactor(c, idx)).toBeLessThan(before);
    c.players[idx].absenceMul = 3;
    expect(absenceFactor(c, idx)).toBeGreaterThan(before);
  });

  it('a broken promise to a bench player backfires', () => {
    const c = createCareer({ seed: 7 });
    const idx = humanClub(c).squad[5];
    c.flags.promise = { idx, round: c.round };
    const before = c.mood;
    c.round += 1;
    advanceArcs(c);
    expect(c.mood).toBeLessThan(before);
    expect(c.players[idx].grumpy).toBe(3);
    expect(c.flags.promise).toBeNull();
  });

  it('unanswered events are resolved automatically at the end of the week', () => {
    let c = null;
    for (let seed = 1; seed < 30 && !c?.week.event; seed++) c = createCareer({ seed });
    const ev = c.week.event;
    finishRound(c);
    expect(ev.choice).toBe(ev.options.length - 1);
    expect(ev.result).toBeTruthy();
    expect(rollWeekEvent).toBeTypeOf('function');
  });
});
