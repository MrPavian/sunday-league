import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { PERSONAL_EVENTS } from '../src/career/personal.js';
import { STORY_STARTS } from '../src/career/stories.js';
import { createRng } from '../src/core/rng.js';

const variety = (id, def, prep) => {
  const texts = new Set();
  for (let r = 0; r < 24; r++) {
    const c = createCareer({ seed: 700 });
    c.round = r % 10;
    c.season = 1 + Math.floor(r / 10);
    prep?.(c);
    const ctx = def.needs(c, createRng(3));
    if (!ctx) continue;
    c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
    texts.add(resolveEvent(c, 0));
  }
  return texts.size;
};

describe('twists make stories unpredictable', () => {
  it('story starts end differently from time to time', () => {
    for (const id of ['vater', 'umzug', 'hochzeit', 'jobverlust']) {
      expect(variety(id, STORY_STARTS[id]), id).toBeGreaterThanOrEqual(3);
    }
  });
  it('private decisions too', () => {
    const prep = (c) => Object.assign(c.coach, { patience: 30, energy: 20, kids: 1 });
    for (const id of ['familienwochenende', 'muede']) expect(variety(id, PERSONAL_EVENTS[id], prep), id).toBeGreaterThanOrEqual(3);
    expect(humanClub(createCareer({ seed: 1 })).squad.length).toBeGreaterThan(0);
  });
});
