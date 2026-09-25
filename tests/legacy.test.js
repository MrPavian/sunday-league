import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, nextSeason, playerOf } from '../src/career/career.js';
import { coachAge, coachPlaying, legacy, legacyPrompt, resolveLegacy, stepDown, succeed, successionCandidates } from '../src/career/legacy.js';

const coach = (age, children = []) => ({ first: 'Uwe', last: 'Brandt', age, relation: 'verheiratet', profession: 'Elektriker', style: 'libero', children });
const skipSeason = (c) => {
  c.round = c.fixtures.length;
  return nextSeason(c);
};

describe('career end and succession', () => {
  it('a 44-year-old player-coach is asked about his boots and can retire as a player', () => {
    const c = createCareer({ seed: 5, coach: coach(44) });
    c.round = c.fixtures.length;
    let prompt = legacyPrompt(c);
    for (let i = 0; i < 3 && !prompt; i++) {
      skipSeason(c);
      c.round = c.fixtures.length;
      prompt = legacyPrompt(c);
    }
    expect(prompt?.id).toBe('schuhe');
    resolveLegacy(c, 2);
    expect(coachPlaying(c)).toBe(false);
    expect(legacyPrompt(c)).toBe(null); // einmal pro Saison
    skipSeason(c);
    expect(c.coach.idx).not.toBe(null); // weiter Trainer
    expect(humanClub(c).squad).not.toContain(c.coach.idx);
  });

  it('the body decides at 50 at the latest, the family at 80: the save goes on with a successor', () => {
    const c = createCareer({ seed: 6, coach: coach(44, [{ name: 'Max', age: 14, sex: 'm' }]) });
    const first = c.coach.idx;
    let seasons = 0;
    while (c.coach.idx === first && seasons < 40) {
      skipSeason(c);
      seasons++;
      if (coachAge(c) > 50) expect(coachPlaying(c)).toBe(false);
    }
    expect(c.coach.idx).not.toBe(first);
    expect(playerOf(c, first).age).toBeLessThanOrEqual(81);
    expect(legacy(c).eras.length).toBe(1);
    expect(c.season).toBeGreaterThan(seasons);
  });

  it('your son can step into your footsteps; a new coach can be created', () => {
    const c = createCareer({ seed: 7, coach: coach(50, [{ name: 'Max', age: 22, sex: 'm' }, { name: 'Lena', age: 24, sex: 'w' }]) });
    skipSeason(c);
    c.round = c.fixtures.length;
    stepDown(c);
    const cands = successionCandidates(c);
    expect(cands.map((x) => x.type)).toContain('kind');
    expect(cands.at(-1).type).toBe('neu');
    const lena = cands.find((x) => x.child === 'Lena');
    succeed(c, lena);
    expect(playerOf(c, c.coach.idx).name).toBe('Lena Brandt');
    expect(c.coach.generation).toBe(2);
    expect(playerOf(c, c.coach.idx).age).toBe(25);

    c.round = c.fixtures.length;
    stepDown(c);
    succeed(c, { type: 'neu', name: 'Jupp Heynckes' }, coach(38));
    expect(playerOf(c, c.coach.idx).age).toBe(38);
    expect(humanClub(c).squad).toContain(c.coach.idx);
    const notes = skipSeason(c);
    expect(legacy(c).eras.length).toBe(2);
    expect(c.week.chat.some((m) => m.text.startsWith('Neue Ära'))).toBe(true);
    expect(notes).toBeTruthy();
  });
});
