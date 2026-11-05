import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { weeklyMood } from '../src/career/events.js';
import { busyFor, HOST_LEVEL, NLZ_RETURN_SEASON, TEEN_EVENTS } from '../src/career/teenlife.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };

// Ein Kader mit genau einem jungen Spieler im passenden Alter.
function withYoung(age, seed = 5) {
  const c = createCareer({ seed });
  const club = humanClub(c);
  const idx = club.squad.find((i) => i !== c.coach?.idx);
  for (const i of club.squad) playerOf(c, i).age = i === idx ? age : 30;
  c.round = 6;
  return { c, idx };
}

describe('Jugend abseits des Platzes', () => {
  it('Abiklausuren: nur 17 bis 19, Freistellen macht ihn vier Wochen seltener verfügbar, danach normal', () => {
    const { c, idx } = withYoung(18);
    const ctx = TEEN_EVENTS.abiklausuren.needs(c, yes);
    expect(ctx.s).toBe(idx);
    TEEN_EVENTS.abiklausuren.options[0].effect(c, ctx, yes);
    expect(c.players[idx].absenceMul).toBe(3);
    expect(TEEN_EVENTS.abiklausuren.needs(c, yes)).toBeNull(); // Abi gibt es einmal
    c.round += 4;
    weeklyMood(c);
    expect(c.players[idx].absenceMul).toBeUndefined();
    const old = withYoung(25).c;
    expect(TEEN_EVENTS.abiklausuren.needs(old, yes)).toBeNull();
  });

  it('erste Liebe und später Liebeskummer', () => {
    const { c, idx } = withYoung(19);
    const ctx = TEEN_EVENTS.erste_liebe.needs(c, yes);
    TEEN_EVENTS.erste_liebe.options[1].effect(c, ctx, yes);
    expect(c.players[idx].inLove).toBeTruthy();
    expect(TEEN_EVENTS.liebeskummer.needs(c, yes)).toBeNull(); // noch zu früh
    c.round += 6;
    const k = TEEN_EVENTS.liebeskummer.needs(c, yes);
    expect(k.s).toBe(idx);
    TEEN_EVENTS.liebeskummer.options[2].effect(c, k, yes);
    expect(c.players[idx].grumpy).toBeGreaterThan(0);
    expect(TEEN_EVENTS.liebeskummer.needs(c, yes)).toBeNull();
  });

  it('andere Interessen: bei klarer Ansage kann er aufhören', () => {
    const { c, idx } = withYoung(17);
    const ctx = TEEN_EVENTS.andere_interessen.needs(c, yes);
    expect(TEEN_EVENTS.andere_interessen.text(c, ctx)).toContain(playerOf(c, idx).name.split(' ')[0]);
    const quit = { ...yes, next: () => 0.99 }; // letzter Ausgang
    TEEN_EVENTS.andere_interessen.options[1].effect(c, ctx, quit);
    expect(humanClub(c).squad).not.toContain(idx);
  });

  it('Gastfamilie erst ab der Verbandsliga und nur für Neue von außerhalb', () => {
    const { c, idx } = withYoung(18);
    c.players[idx].since = c.season;
    c.level = HOST_LEVEL - 1;
    expect(TEEN_EVENTS.gastfamilie.needs(c, yes)).toBeNull();
    c.level = HOST_LEVEL;
    const ctx = TEEN_EVENTS.gastfamilie.needs(c, yes);
    expect(ctx.s).toBe(idx);
    TEEN_EVENTS.gastfamilie.options[2].effect(c, ctx, yes);
    expect(c.players[idx].absenceMul).toBe(1.6);
    c.round += 4;
    expect(TEEN_EVENTS.heimweh.needs(c, yes)?.s).toBe(idx);
  });

  it('Internat: ein Kind aus dem Leistungszentrum kann zurückkommen (rund ein Viertel je Saison)', () => {
    expect(NLZ_RETURN_SEASON).toBe(0.25);
    const c = createCareer({ seed: 5 });
    const kid = { ...c.youth.kids[0] };
    c.youth.kids = c.youth.kids.slice(1);
    c.youth.nlz = [{ name: kid.name, club: 'FC Rheinstadt 1899', season: c.season, age: 13, amount: 5000, kid }];
    const ctx = TEEN_EVENTS.internat_heimweh.needs(c, yes);
    expect(ctx.name).toBe(kid.name);
    const n = c.youth.kids.length;
    TEEN_EVENTS.internat_heimweh.options[0].effect(c, ctx, yes);
    expect(c.youth.kids.length).toBe(n + 1);
    expect(TEEN_EVENTS.internat_heimweh.needs(c, yes)).toBeNull();
  });

  it('Kinder 12–15: andere Interessen, gehen lassen kann das Kind kosten', () => {
    const c = createCareer({ seed: 5 });
    for (const k of c.youth.kids) k.age = 9;
    c.youth.kids[0].age = 13;
    const ctx = TEEN_EVENTS.kind_interessen.needs(c, yes);
    expect(ctx.k).toBe(c.youth.kids[0].id);
    const n = c.youth.kids.length;
    TEEN_EVENTS.kind_interessen.options[2].effect(c, ctx, yes);
    expect(c.youth.kids.length).toBe(n - 1);
  });

  it('busyFor ohne Spielerdatensatz tut nichts', () => {
    const c = createCareer({ seed: 5 });
    expect(() => busyFor(c, 99999, 2, 3)).not.toThrow();
  });
});
