import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, prepareMatch } from '../src/career/career.js';
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
    c.flags.arcVater = { idx, step: 0, round: c.round };
    c.round += 2;
    advanceArcs(c);
    expect(c.flags.arcVater.step).toBe(1);
    expect(c.week.availability[idx]).toBe('no');
    expect(c.week.chat.at(-1).text).toContain('Mädchen');
    c.round += 1;
    advanceArcs(c);
    expect(c.flags.arcVater.step).toBe(2);
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
