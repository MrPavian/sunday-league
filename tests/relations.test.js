import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, humanFixture, playerOf, prepareMatch } from '../src/career/career.js';
import { absenceFactor, resolveEvent } from '../src/career/events.js';
import { canSupportDream, supportDream, talk } from '../src/career/pub.js';
import { applyChemistry, chemistry, relationOf, relationsAmong, setRelation } from '../src/career/relations.js';
import { SOCIAL_EVENTS } from '../src/career/social.js';
import { createRng } from '../src/core/rng.js';

describe('relations and player stories', () => {
  it('relations are symmetric, stable and can be changed by events', () => {
    const c = createCareer({ seed: 81 });
    const [a, b] = humanClub(c).squad;
    expect(relationOf(c, a, b)).toBe(relationOf(c, b, a));
    setRelation(c, a, b, 'rivalen');
    expect(relationOf(c, b, a)).toBe('rivalen');
    setRelation(c, a, b, null);
    expect(relationOf(c, a, b)).toBeNull();
    // Im Pool gibt es von allem etwas.
    const all = relationsAmong(c, humanClub(c).squad.concat(c.clubs[1].squad, c.clubs[2].squad));
    expect(all.length).toBeGreaterThan(2);
  });

  it('friends in the lineup pass better, rivals worse', () => {
    const c = createCareer({ seed: 82 });
    const [a, b] = humanClub(c).squad;
    const mk = () => [a, b].map((idx) => ({ poolIndex: idx, attrs: { ...playerOf(c, idx).attrs } }));
    setRelation(c, a, b, 'kumpel');
    const friends = applyChemistry(c, [a, b], mk());
    setRelation(c, a, b, 'rivalen');
    const rivals = applyChemistry(c, [a, b], mk());
    expect(friends[0].attrs.passing).toBeGreaterThan(rivals[0].attrs.passing);
    expect(chemistry(c, [a, b]).score).toBe(-1);
    // Und im echten Spiel kommt die Chemie an.
    expect(prepareMatch(c, humanFixture(c), { human: true, duration: 5 }).match.players.length).toBeGreaterThan(0);
  });

  it('after hearing his dream you can support it – he becomes loyal', () => {
    const c = createCareer({ seed: 83 });
    const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
    c.players[idx].dossier = 2;
    expect(canSupportDream(c, idx)).toBe(false);
    talk(c, idx, 'listen'); // Kapitel 3: der Traum
    expect(canSupportDream(c, idx)).toBe(true);
    const before = absenceFactor(c, idx);
    const cash = c.cash;
    expect(typeof supportDream(c, idx)).toBe('string');
    expect(c.cash).toBe(cash - 30);
    expect(absenceFactor(c, idx)).toBeLessThan(before);
    expect(canSupportDream(c, idx)).toBe(false);
  });

  it('every social event can happen and resolves with every option', () => {
    for (const [id, def] of Object.entries(SOCIAL_EVENTS)) {
      for (let choice = 0; choice < def.options.length; choice++) {
        const c = createCareer({ seed: 84 + choice });
        c.round = 3;
        const [a, b] = humanClub(c).squad.filter((i) => i !== c.coach.idx);
        if (id === 'rivalen_zoff') setRelation(c, a, b, 'rivalen');
        if (id === 'alte_geschichte') c.flags.pastLink = { a, b, kind: choice % 2 ? 'schulfreund' : 'mobber', round: 0 };
        const ctx = def.needs(c, createRng(choice + 1));
        expect(ctx, id).toBeTruthy();
        c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
        expect(c.week.event.text.length).toBeGreaterThan(20);
        expect(typeof resolveEvent(c, choice), `${id}/${choice}`).toBe('string');
      }
    }
  });

  it('decisions have many possible outcomes – up to players leaving the club', () => {
    const results = new Set();
    let left = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const c = createCareer({ seed: 200 + seed });
      c.round = 3;
      const [a, b] = humanClub(c).squad.filter((i) => i !== c.coach.idx);
      const def = SOCIAL_EVENTS.freundin_ausgespannt;
      const size = humanClub(c).squad.length;
      c.week.event = { id: 'freundin_ausgespannt', ctx: { a, b }, text: def.text(c, { a, b }), options: def.options.map((o) => o.label), choice: null, result: null };
      c.round = 3 + seed; // anderer Zufall je Durchlauf
      results.add(resolveEvent(c, 0).slice(0, 30));
      if (humanClub(c).squad.length < size) left++;
    }
    expect(results.size).toBeGreaterThanOrEqual(4);
    expect(left).toBeGreaterThan(0);
  });
});
