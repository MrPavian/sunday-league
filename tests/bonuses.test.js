import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { BONUS, bonusesOf, crownStars, finishRound, innateBonuses, isStar, knownBonuses, starFans } from '../src/career/bonuses.js';
import { MONTH } from '../src/career/awards.js';
import { BONUS_SIM, clutch, clutchAim } from '../src/sim/bonus.js';

const fresh = (seed = 7) => {
  const c = createCareer({ seed });
  c.week ??= { chat: [] };
  c.week.chat ??= [];
  return c;
};
const own = (c) => humanClub(c).squad.filter((i) => i !== c.coach?.idx);

describe('Verdeckte Boni: Vergabe', () => {
  it('Weltklasse etwa jeder Hundertste, Führungsspieler seltener als jeder Zehnte, nur im Stärkemodell 3', () => {
    const c = fresh();
    expect(c.strength).toBeGreaterThanOrEqual(3);
    const n = { weltklasse: 0, fuehrung: 0 };
    for (let i = 0; i < 20000; i++) for (const id of innateBonuses(c, i)) n[id]++;
    expect(n.weltklasse / 20000).toBeGreaterThan(0.006);
    expect(n.weltklasse / 20000).toBeLessThan(0.014);
    expect(n.fuehrung / 20000).toBeGreaterThan(BONUS.fuehrungShare * 0.8);
    expect(n.fuehrung / 20000).toBeLessThan(0.1);
    const old = { ...c, strength: 1 };
    for (let i = 0; i < 2000; i++) expect(bonusesOf(old, i)).toEqual([]);
  });

  it('fest je Karriere und Spieler', () => {
    const a = fresh(11);
    const b = fresh(11);
    for (let i = 0; i < 500; i++) expect(innateBonuses(a, i)).toEqual(innateBonuses(b, i));
  });
});

describe('Star der Liga', () => {
  it('das Kreisblatt kürt die drei stärksten Spieler der Liga; nach einem Ligawechsel ist der Titel weg', () => {
    const c = fresh();
    const top = crownStars(c);
    expect(top).toHaveLength(BONUS.stars);
    const all = c.clubs.flatMap((club) => club.squad).map((i) => playerOf(c, i).rating).sort((x, y) => y - x);
    expect(top.map((t) => t.rating)).toEqual(all.slice(0, BONUS.stars));
    expect(isStar(c, top[0].idx)).toBe(true);
    expect(bonusesOf(c, top[0].idx)).toContain('star');
    expect(knownBonuses(c, top[0].idx)).toContain('star'); // öffentlich
    c.level = (c.level ?? 1) + 1;
    expect(isStar(c, top[0].idx)).toBe(false);
  });

  it('gekürt wird nach dem ersten Monat, mit Meldung im Chat', () => {
    const c = fresh();
    c.round = MONTH - 1;
    finishRound(c);
    expect(c.flags?.stars).toBeUndefined();
    c.round = MONTH;
    finishRound(c);
    expect(c.flags.stars.ids).toHaveLength(BONUS.stars);
    expect(c.week.chat.some((m) => /Stars der Liga|stars of the league/.test(m.text))).toBe(true);
  });

  it('ein eigener Star bringt Zuschauer und wird nach zwei Spieltagen auf der Bank sauer', () => {
    const c = fresh();
    const idx = own(c)[0];
    c.flags = { ...(c.flags ?? {}), stars: { season: c.season, level: c.level ?? 1, ids: [idx] } };
    expect(starFans(c)).toBeCloseTo(1 + 0.1);
    const rec = c.players[idx];
    rec.grumpy = 0;
    rec.recent = [];
    c.round = MONTH + 1;
    finishRound(c);
    expect(rec.grumpy).toBe(0);
    c.round++;
    finishRound(c);
    expect(rec.grumpy).toBe(2);
    expect(c.week.chat.some((m) => /Star dieser Liga|star of this league/.test(m.text))).toBe(true);
  });
});

describe('Entdecken', () => {
  it('Weltklasse und Führungsspieler wirken verborgen und zeigen sich nach einigen Einsätzen – mit Co-Trainer früher', () => {
    let c;
    let idx;
    for (let seed = 1; seed < 200 && idx == null; seed++) {
      c = fresh(seed);
      idx = own(c).find((i) => innateBonuses(c, i).includes('fuehrung'));
    }
    expect(idx).toBeDefined();
    const rec = c.players[idx];
    expect(knownBonuses(c, idx)).not.toContain('fuehrung');
    rec.apps = BONUS.seenApps.fuehrung - BONUS.coachHelps;
    c.round = 1;
    finishRound(c);
    expect(knownBonuses(c, idx)).not.toContain('fuehrung');
    c.staff = { ...(c.staff ?? {}), cotrainer: { name: 'Test' } };
    finishRound(c);
    expect(knownBonuses(c, idx)).toContain('fuehrung');
    expect(c.week.chat.some((m) => /Führungsspieler|team leader/.test(m.text))).toBe(true);
  });
});

describe('Verdeckte Boni im Spiel', () => {
  const m = (time, score) => ({ time, duration: 100, score });
  it('Weltklasse ist nur in engen Schlussphasen genauer', () => {
    const wk = { bonus: ['weltklasse'] };
    expect(clutch(m(80, [1, 1]))).toBe(true);
    expect(clutch(m(80, [3, 1]))).toBe(false);
    expect(clutch(m(50, [0, 0]))).toBe(false);
    expect(clutchAim(m(90, [0, 1]), wk)).toBe(BONUS_SIM.clutchAim);
    expect(clutchAim(m(90, [0, 1]), {})).toBe(1);
    expect(clutchAim(m(30, [0, 1]), wk)).toBe(1);
  });
});
