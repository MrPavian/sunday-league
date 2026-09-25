import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, playerOf, prepareMatch, simulateSync } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { endCareer, INJURIES, INJURY_EVENTS, rollInjuries } from '../src/career/injuries.js';
import { LIFE_EVENTS } from '../src/career/life.js';
import { createRng } from '../src/core/rng.js';

const force = (c, id, def, ctx, choice) => {
  c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
  return resolveEvent(c, choice);
};

describe('everyday life and injuries', () => {
  it('every life event fits some player and resolves with every option', () => {
    for (const [id, def] of Object.entries(LIFE_EVENTS)) {
      let found = false;
      for (let seed = 1; seed <= 30 && !found; seed++) {
        const c = createCareer({ seed: 300 + seed });
        const ctx = def.needs(c, createRng(seed));
        if (!ctx) continue;
        found = true;
        for (let choice = 0; choice < def.options.length; choice++) {
          const d = createCareer({ seed: 300 + seed });
          expect(typeof force(d, id, def, ctx, choice), `${id}/${choice}`).toBe('string');
        }
      }
      expect(found, id).toBe(true);
    }
  });

  it('matches cause injuries of all kinds; the sick list counts down', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 60; seed++) {
      const c = createCareer({ seed: 400 + seed });
      const prepared = prepareMatch(c, humanFixture(c), { duration: 20 });
      simulateSync(prepared);
      prepared.match.players.forEach((p) => (prepared.match.stats.players[p.id] ??= { seconds: 1 }));
      for (let k = 0; k < 6; k++) for (const n of rollInjuries(c, prepared, k)) seen.add(n.type);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
    const c = createCareer({ seed: 5 });
    const idx = humanClub(c).squad[1];
    Object.assign(c.players[idx], { injuryWeeks: 2, injury: { label: INJURIES.baender.label } });
    finishRound(c);
    if (c.players[idx]) expect(c.week.availability[idx]).toBe('no');
    finishRound(c);
    finishRound(c);
    expect(c.players[idx]?.injury ?? null).toBeNull(); // (oder er hat den Verein verlassen)
  });

  it('a severe injury brings a diagnosis; sports invalidity ends the career but keeps him in the club', () => {
    for (let choice = 0; choice < INJURY_EVENTS.diagnose.options.length; choice++) {
      const c = createCareer({ seed: 500 + choice });
      const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
      c.players[idx].injuryWeeks = 20;
      c.flags.injuryNews = { idx, type: 'kreuzband', weeks: 20 };
      const ctx = INJURY_EVENTS.diagnose.needs(c, createRng(1));
      expect(typeof force(c, 'diagnose', INJURY_EVENTS.diagnose, ctx, choice)).toBe('string');
    }
    const c = createCareer({ seed: 510 });
    const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
    const name = playerOf(c, idx).name;
    c.flags.invalid = { idx, type: 'achilles' };
    const ctx = INJURY_EVENTS.invaliditaet.needs(c, createRng(1));
    const res = force(c, 'invaliditaet', INJURY_EVENTS.invaliditaet, ctx, 0);
    expect(res).toContain('Co-Trainer');
    expect(humanClub(c).squad).not.toContain(idx);
    expect(c.staff.cotrainer.name).toBe(name);
    expect(c.alumni.at(-1).role).toBe('Co-Trainer');
    expect(endCareer).toBeTypeOf('function');
  });
});
