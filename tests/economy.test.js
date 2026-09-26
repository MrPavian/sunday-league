import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';
import { fahrgeld, OPS_COST } from '../src/career/finances.js';
import { FACILITIES, travelMul } from '../src/career/facilities.js';

describe('economy and league churn', () => {
  it('rival squads change over the summer', () => {
    const c = createCareer({ seed: 3131 });
    const before = c.clubs.filter((x) => !x.human).map((x) => [...x.squad]);
    while (!seasonOver(c)) finishRound(c);
    nextSeason(c);
    const after = c.clubs.filter((x) => !x.human).map((x) => x.squad);
    const changed = after.filter((sq, i) => sq.some((idx) => !before[i].includes(idx))).length;
    expect(changed).toBe(after.length); // jeder Verein hat mindestens einen neuen
    for (const [i, sq] of after.entries()) expect(sq.length).toBe(before[i].length);
    for (const sq of after) for (const idx of sq) expect(c.players[idx]).toBeTruthy();
  });

  it('higher leagues cost money: running costs, travel money, away trips', () => {
    const c = createCareer({ seed: 3132 });
    expect(OPS_COST[1]).toBe(0);
    expect(fahrgeld(c).total).toBe(0); // Freizeitliga: keiner will Geld
    c.level = 3;
    const cash = c.cash;
    finishRound(c);
    const lines = c.ledger.filter((l) => l.amount < 0).map((l) => l.text).join(' | ');
    expect(lines).toContain('Spielbetrieb');
    expect(c.cash).toBeLessThan(cash + humanClub(c).squad.length * 3 + 200);
  });

  it('the minibus halves travel costs and the youth centre needs the ball machine', () => {
    const c = createCareer({ seed: 3133 });
    expect(travelMul(c)).toBe(1);
    c.facilities = { built: { vereinsbus: 1 }, building: null };
    expect(travelMul(c)).toBe(0.5);
    expect(FACILITIES.jugendhaus.needs).toContain('ballmaschine');
  });
});
