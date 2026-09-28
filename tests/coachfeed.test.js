import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { enableManager } from '../src/sim/coach.js';
import { answerCard } from '../src/sim/coachfeed.js';

function coached(seed, onCard) {
  const m = enableManager(createMatch({ seed, pitch: PITCHES.ascheplatz, human: true }));
  const cards = [];
  const follow = [];
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) if (e.type === 'coach_followup') follow.push(e);
    if (m.coachCard && !cards.includes(m.coachCard)) {
      cards.push(m.coachCard);
      onCard?.(m, m.coachCard);
    }
    m.events.length = 0;
  }
  return { m, cards, follow };
}

describe('coach feed', () => {
  it('shows a few cards per match, never in the opening minutes, with three options each', () => {
    let total = 0;
    for (const seed of [1, 2, 3, 4]) {
      const { m, cards } = coached(seed);
      total += cards.length;
      expect(cards.length).toBeLessThanOrEqual(6);
      for (const c of cards) {
        expect(c.t).toBeGreaterThanOrEqual(m.duration * 0.12);
        expect(c.options).toHaveLength(3);
        expect(c.title.length).toBeGreaterThan(5);
      }
      for (let i = 1; i < cards.length; i++) expect(cards[i].t - cards[i - 1].t).toBeGreaterThanOrEqual(Math.max(20, m.duration * 0.14) - 1);
    }
    expect(total).toBeGreaterThan(2);
  }, 90_000);

  it('answering a card sets the order and later tells you whether it worked', () => {
    let follows = 0;
    for (const seed of [1, 3, 4, 5]) {
      let chosen = null;
      const { m, follow } = coached(seed, (mm) => {
        const opt = answerCard(mm, 0, 0);
        chosen ??= opt;
      });
      if (!chosen) continue;
      expect(m.decisions.some((d) => d.group === chosen.group && d.by === 'card')).toBe(true);
      for (const f of follow) expect(['better', 'worse']).toContain(f.result);
      follows += follow.length;
    }
    expect(follows).toBeGreaterThan(0);
  }, 120_000);
});
