// Feste Rückennummern (career/numbers.js): ab der Kreisklasse C, klassische Vergabe, Tausch, Sperre für Legenden mit Ablauf.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf, teamForMatch } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { LEGEND_EVENTS, clubLegends } from '../src/career/legends.js';
import { museum } from '../src/career/museum.js';
import * as nr from '../src/career/numbers.js';

const league = (seed = 3) => {
  const c = createCareer({ seed });
  c.level = nr.NUMBERS_FROM;
  return c;
};
const squad = (c) => humanClub(c).squad;

describe('Feste Rückennummern', () => {
  it('unterhalb der Kreisklasse C gibt es keine', () => {
    const c = createCareer({ seed: 3 });
    c.level = 1;
    expect(nr.numberOf(c, squad(c)[0])).toBe(null);
    expect(nr.setNumber(c, squad(c)[0], 7)).toBe(false);
  });

  it('jeder bekommt eine eigene Nummer, der Torwart die 1, und sie bleibt', () => {
    const c = league();
    const first = squad(c).map((i) => nr.numberOf(c, i));
    expect(new Set(first).size).toBe(first.length);
    const gk = squad(c).find((i) => playerOf(c, i).position === 'gk');
    if (gk != null) expect(nr.numberOf(c, gk)).toBe(1);
    const fwd = squad(c).find((i) => playerOf(c, i).position === 'fwd');
    if (fwd != null) expect([9, 7, 11]).toContain(nr.numberOf(c, fwd));
    expect(squad(c).map((i) => nr.numberOf(c, i))).toEqual(first);
  });

  it('ändern: freie Nummer nehmen, vergebene tauschen, Unsinn ablehnen', () => {
    const c = league();
    const [a, b] = squad(c);
    const [na, nb] = [nr.numberOf(c, a), nr.numberOf(c, b)];
    expect(nr.setNumber(c, a, 77)).toBe(true);
    expect(nr.numberOf(c, a)).toBe(77);
    expect(nr.setNumber(c, a, nb)).toBe(true);
    expect(nr.numberOf(c, a)).toBe(nb);
    expect(nr.numberOf(c, b)).toBe(77);
    for (const bad of [0, 100, 2.5, 'x']) expect(nr.setNumber(c, a, bad)).toBe(false);
    expect(na).not.toBe(77);
  });

  it('im Spiel trägt die eigene Mannschaft ihre Nummern, der Gegner keine festen', () => {
    const c = league();
    const club = humanClub(c);
    const team = teamForMatch(c, club, 7, Object.fromEntries(club.squad.map((i) => [i, true])), createRng(1));
    const mine = team.players.filter((p) => club.squad.includes(p.poolIndex));
    expect(mine.length).toBeGreaterThan(0);
    for (const p of mine) expect(p.shirtNo).toBe(nr.numberOf(c, p.poolIndex));
    const other = c.clubs.find((x) => !x.human);
    const opp = teamForMatch(c, other, 7, Object.fromEntries(other.squad.map((i) => [i, true])), createRng(1));
    expect(opp.players.every((p) => p.shirtNo == null)).toBe(true);
  });

  it('Legende: Nummer sperren, sie wird nicht mehr vergeben; Freigabe von Hand nach der Frist, von selbst nach dem Ablauf', () => {
    const c = league();
    const idx = squad(c)[1];
    const n = nr.numberOf(c, idx);
    c.alumni = [{ idx: 9001, name: 'Kalle Brömmel', age: 38, apps: 120, goals: 12, season: c.season, role: null, number: 44 }];
    const ev = LEGEND_EVENTS.legende_abschied;
    const ctx = ev.needs(c);
    expect(ctx.number).toBe(44);
    const opt = ev.options[2];
    expect(typeof opt.effect(c, ctx, createRng(1))).toBe('string');
    expect(clubLegends(c)[0]).toMatchObject({ honour: 'nummer', number: 44 });
    expect(nr.retiredNumbers(c).map((r) => r.n)).toEqual([44]);
    expect(nr.setNumber(c, idx, 44)).toBe(false);
    expect(nr.numberOf(c, idx)).toBe(n);
    expect(museum(c).retired[0]).toMatchObject({ n: 44, canRelease: false });
    expect(nr.releaseNumber(c, 44)).toBe(false); // noch in der Frist
    c.season += nr.RETIRE_MIN;
    expect(museum(c).retired[0].canRelease).toBe(true);
    expect(nr.releaseNumber(c, 44)).toBe(true);
    expect(nr.setNumber(c, idx, 44)).toBe(true);

    // Ablauf von selbst
    nr.setNumber(c, idx, n);
    nr.retireNumber(c, 55, 'Kalle Brömmel');
    c.season += nr.RETIRE_MAX - 1;
    nr.nextSeason(c);
    expect(nr.retiredNumbers(c)).toHaveLength(1);
    c.season += 1;
    nr.nextSeason(c);
    expect(nr.retiredNumbers(c)).toHaveLength(0);
    expect(c.pendingNews.some((t) => t.includes('55'))).toBe(true);
  });

  it('wer die Nummer einer frisch gesperrten Legende trägt, bekommt eine neue', () => {
    const c = league();
    const idx = squad(c)[2];
    const n = nr.numberOf(c, idx);
    expect(nr.retireNumber(c, n, 'Alte Legende')).toBe(true);
    expect(nr.numberOf(c, idx)).not.toBe(n);
    expect(nr.retireNumber(c, n, 'Noch einer')).toBe(false);
  });

  it('ohne feste Nummer kommt bei „Nummer sperren“ das Trikot an die Wand', () => {
    const c = createCareer({ seed: 3 });
    c.alumni = [{ idx: 9001, name: 'Kalle Brömmel', age: 38, apps: 120, goals: 12, season: c.season, role: null }];
    const ev = LEGEND_EVENTS.legende_abschied;
    ev.options[2].effect(c, ev.needs(c), createRng(1));
    expect(clubLegends(c)[0].honour).toBe('trikot');
    expect(nr.retiredNumbers(c)).toHaveLength(0);
  });
});
