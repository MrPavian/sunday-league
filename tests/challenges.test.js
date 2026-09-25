import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { applyChallengeRewards } from '../src/career/rewards.js';
import { CHALLENGES, createChallengeMatch, evaluateChallenge, recordChallenge } from '../src/challenges/challenges.js';
import { stepMatch } from '../src/sim/match.js';

const DT = 1 / 60;

describe('challenges', () => {
  it.each(CHALLENGES.map((c) => [c.id, c]))('%s: sets up the scenario and can be evaluated', (id, def) => {
    const { match: m, ctx } = createChallengeMatch(def, 5);
    expect(m.score).toEqual(def.score);
    expect(m.duration - m.time).toBe(def.seconds);
    if (def.seconds <= 300) expect(m.half).toBe(2);
    const mine = m.players.filter((p) => p.team === 0).length;
    expect(mine).toBe(m.pitch.format - (def.handicap ?? 0));
    if (def.veterans) for (const p of m.players.filter((q) => q.team === 0)) expect(p.age).toBeGreaterThanOrEqual(35);
    expect(m.players.find((p) => p.id === ctx.heroId).team).toBe(0);
    for (let i = 0; i < 60 * 400 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      m.events.length = 0;
    }
    expect(m.phase).toBe('ended');
    const { results, stars } = evaluateChallenge(def, m, ctx);
    expect(results).toHaveLength(3);
    expect(stars).toBeGreaterThanOrEqual(0);
    expect(stars).toBeLessThanOrEqual(3);
    if (!results[0]) expect(stars).toBe(0);
  });

  it('keeps the best result, rewards only the first clear, and pays out in the career', () => {
    const progress = { stars: {}, pendingRewards: [] };
    const cashDef = CHALLENGES.find((c) => c.reward.cash);
    const playerDef = CHALLENGES.find((c) => c.reward.player);
    expect(recordChallenge(progress, cashDef, 0).firstClear).toBe(false);
    expect(recordChallenge(progress, cashDef, 2).firstClear).toBe(true);
    expect(recordChallenge(progress, cashDef, 1).best).toBe(2);
    expect(recordChallenge(progress, cashDef, 3).firstClear).toBe(false);
    recordChallenge(progress, playerDef, 1);
    expect(progress.pendingRewards).toHaveLength(2);

    const career = createCareer({ seed: 5 });
    const cash = career.cash;
    const size = humanClub(career).squad.length;
    const applied = applyChallengeRewards(career, progress);
    expect(applied).toHaveLength(2);
    expect(career.cash).toBe(cash + cashDef.reward.cash);
    expect(humanClub(career).squad).toHaveLength(size + 1);
    expect(progress.pendingRewards).toHaveLength(0);
  });
});
