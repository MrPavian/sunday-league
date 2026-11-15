// Erreichbarkeit (ROADMAP 11.18 Punkt 2): Diese Ereignisse kamen in der Zählung (scripts/events-count.mjs) nie vor. Die Zählung spielt
// ohne Spielerentwicklung, Jugend und Unruhe; hier wird je Ereignis der Zustand hergestellt, den es braucht, und geprüft, dass es
// dann kommen kann.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { UNREST_EVENTS } from '../src/career/unrest.js';
import { POACH_EVENTS } from '../src/career/poaching.js';
import { TIGER_EVENTS, tigerOf } from '../src/career/tiger.js';
import { SAGA_EVENTS } from '../src/career/sagas.js';

const yes = { chance: () => true, next: () => 0, pick: (l) => l[0], int: (a) => a, range: (a) => a };
const fresh = () => createCareer({ seed: 21 });

describe('Erreichbarkeit seltener Ereignisse', () => {
  it('Grüppchen und Mannschaftsrat: bei Unruhe und mieser Stimmung', () => {
    const c = fresh();
    c.round = 5;
    c.mood = -0.3;
    for (const idx of humanClub(c).squad.slice(0, 2)) c.players[idx] = { ...(c.players[idx] ?? {}), grumpy: 3 };
    expect(UNREST_EVENTS.grueppchen.needs(c, yes)).not.toBe(null);
    c.flags.unrest = { stage: 1, round: 4, season: c.season };
    expect(UNREST_EVENTS.mannschaftsrat.needs(c, yes)).not.toBe(null);
  });

  it('Erster Profivertrag: junger Spieler ab Stärke 68', () => {
    const c = fresh();
    const idx = humanClub(c).squad.find((i) => playerOf(c, i).age <= 21) ?? humanClub(c).squad[0];
    c.players[idx] = { ...(c.players[idx] ?? {}), delta: { pace: 3, stamina: 3, technique: 3, passing: 3, shooting: 3, tackling: 3 } };
    const p = playerOf(c, idx);
    if (p.age > 21 || p.rating < 68) return expect.fail(`Testaufbau: Alter ${p.age}, Stärke ${p.rating}`);
    expect(POACH_EVENTS.profivertrag.needs(c, yes)).not.toBe(null);
  });

  it('Tim schläft ein: nach einem 0:0', () => {
    const c = fresh();
    const me = humanClub(c).id;
    c.round = 1;
    const f = c.fixtures[0].find((x) => x.home === me || x.away === me);
    f.result = { home: 0, away: 0 };
    Object.assign(tigerOf(c), { wk: 6, gap: 0 }); // Tim ist seit ein paar Wochen da
    expect(TIGER_EVENTS.tiger_schlaf.needs(c, yes)).not.toBe(null);
  });

  it('Profi-Scout und Rückkehr: mit Talent aus der eigenen Jugend', () => {
    const c = fresh();
    c.round = 2;
    c.saga = { ...(c.saga ?? {}), scoutTarget: humanClub(c).squad[3] };
    expect(SAGA_EVENTS.profi_scout.needs(c, yes)).not.toBe(null);
  });
});
