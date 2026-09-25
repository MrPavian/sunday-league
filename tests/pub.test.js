import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, humanFixture, prepareMatch } from '../src/career/career.js';
import { askWirt, buyRound, dossier, playDart, pubState, setTactic, talk, TACTICS } from '../src/career/pub.js';

const mate = (c) => humanClub(c).squad.find((i) => i !== c.coach.idx);

describe('Stammkneipe', () => {
  it('two actions per week: a round lifts the mood and costs money', () => {
    const c = createCareer({ seed: 71 });
    const cash = c.cash;
    const mood = c.mood;
    expect(buyRound(c)).toContain('Runde');
    expect(c.cash).toBeLessThan(cash);
    expect(c.mood).toBeGreaterThan(mood);
    expect(pubState(c).actions).toBe(1);
    buyRound(c);
    expect(buyRound(c)).toBeNull(); // genug für diese Woche
  });

  it('listening tells a player\'s story chapter by chapter', () => {
    const c = createCareer({ seed: 72 });
    const idx = mate(c);
    expect(dossier(c, idx).every((f) => !f.known)).toBe(true);
    const res = talk(c, idx, 'listen');
    expect(res).toContain(dossier(c, idx)[0].text.slice(0, 20)); // steht so im Protokoll
    expect(dossier(c, idx)[0].known).toBe(true);
    expect(dossier(c, idx)[1].known).toBe(false);
    expect(talk(c, c.coach.idx, 'listen')).toBeNull(); // mit dir selbst redest du nicht
  });

  it('the beer-mat tactic and the landlord\'s tip change the next match', () => {
    const c = createCareer({ seed: 73 });
    const pace = (m, team) => m.players.filter((p) => p.team === team).reduce((s, p) => s + p.attrs.tackling, 0);
    const base = prepareMatch(c, humanFixture(c), { human: true, duration: 5 }).match;
    setTactic(c, 'beton');
    const tactic = prepareMatch(c, humanFixture(c), { human: true, duration: 5 }).match;
    expect(pace(tactic, 0)).toBeGreaterThan(pace(base, 0));
    expect(TACTICS.beton.mods.tackling).toBeGreaterThan(0);

    const d = createCareer({ seed: 74 });
    const rumors = d.week.rumors.length;
    const res = askWirt(d);
    expect(typeof res).toBe('string');
    expect(d.week.rumors.length > rumors || !!pubState(d).intel).toBe(true);
  });

  it('darts against Opa Heinz: the loser pays', () => {
    const c = createCareer({ seed: 75 });
    const cash = c.cash;
    playDart(c, 0);
    expect(c.cash).toBe(cash - 15);
    const d = createCareer({ seed: 75 });
    const cash2 = d.cash;
    playDart(d, 180);
    expect(d.cash).toBe(cash2);
    expect(pubState(d).dart.you).toBe(180);
  });
});
