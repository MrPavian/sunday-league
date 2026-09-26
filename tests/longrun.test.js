import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, migrateCareer, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';

// Eine ganze Saison mit allen Spielen, nach jedem Spieltag gespeichert und geladen –
// wie im echten Spiel. Fängt Abstürze, Wiederholungen und ausufernde Werte.
function playSeason(c, check) {
  while (!seasonOver(c)) {
    check?.(c);
    for (const f of currentFixtures(c)) {
      const p = prepareMatch(c, f, { duration: 240 });
      simulateSync(p);
      recordResult(c, f, p);
    }
    finishRound(c);
    c = migrateCareer(JSON.parse(JSON.stringify(c)));
  }
  return c;
}

describe('long run', () => {
  it('a full season with every match, saved and loaded each week', () => {
    let c = createCareer({ seed: 9001 });
    const dups = [];
    c = playSeason(c, (x) => {
      const texts = (x.week?.chat ?? []).map((m) => m.text);
      dups.push(...texts.filter((t, i) => texts.indexOf(t) !== i));
    });
    expect(dups).toEqual([]);
    for (const v of Object.values(c.feuds ?? {})) expect(Math.abs(v)).toBeLessThanOrEqual(3);
    expect(c.goal).toBeTruthy();
    const res = nextSeason(c);
    expect(res).toBeTruthy();
    expect(c.week?.chat.length).toBeGreaterThan(0);
  }, 60000);

  it('an old save without the new memory fields keeps running', () => {
    const c = createCareer({ seed: 9002 });
    for (const k of ['formers', 'nemesis', 'joinedFrom', 'feuds', 'meetings', 'pendingNews', 'pendingDefector', 'goal', 'kitHistory', 'crestHistory']) delete c[k];
    let old = migrateCareer(JSON.parse(JSON.stringify(c)));
    for (let r = 0; r < 3; r++) {
      for (const f of currentFixtures(old)) {
        const p = prepareMatch(old, f, { duration: 240 });
        simulateSync(p);
        recordResult(old, f, p);
      }
      finishRound(old);
    }
    expect(old.round).toBe(3);
  }, 30000);
});
