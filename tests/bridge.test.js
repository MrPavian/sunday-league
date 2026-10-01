import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, playerOf } from '../src/career/career.js';
import { ACADEMY_EVENTS } from '../src/career/academy.js';
import { MAX_UP, NERVOUS_FORM, PATE_AGE, pateBonus, pateCandidates, pateOf, READY_FORM, REIFE_WEEKS, reifeOf, setPate, toggleTrainUp, trainingUp, youthFactor } from '../src/career/bridge.js';
import { developYouth, promoteProspect } from '../src/career/youth.js';
import { relationOf } from '../src/career/relations.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };

// Karriere mit drei A-Jugendlichen und Platz im Kader.
function career(seed = 3) {
  const c = createCareer({ seed });
  const used = new Set(c.clubs.flatMap((x) => x.squad));
  for (let i = 0; c.youth.prospects.length < 3 && i < 5000; i++) {
    if (used.has(i) || c.youth.prospects.includes(i)) continue;
    if (playerOf(c, i)?.age <= 18) {
      c.youth.prospects.push(i);
      c.players[i] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    }
  }
  while (humanClub(c).squad.length > 10) humanClub(c).squad.pop();
  return c;
}

describe('Brücke A-Jugend → Erste: Mittrainieren', () => {
  it(`höchstens ${MAX_UP} trainieren mit; nach ${REIFE_WEEKS} Wochen kennen sie das Tempo`, () => {
    const c = career();
    const [a, b, d] = c.youth.prospects;
    expect(toggleTrainUp(c, a)).toBe(true);
    expect(toggleTrainUp(c, b)).toBe(true);
    expect(toggleTrainUp(c, d)).toBe(false);
    expect(trainingUp(c)).toEqual([a, b]);
    for (let w = 0; w < REIFE_WEEKS; w++) finishRound(c);
    expect(reifeOf(c, a)).toBe(1);
    expect(reifeOf(c, d)).toBe(0);
  });

  it('wer mittrainiert, entwickelt sich schneller (ganze Saison: +50 %)', () => {
    const c = career();
    const [a, b] = c.youth.prospects;
    toggleTrainUp(c, a);
    c.players[a].upWeeks = 10;
    expect(youthFactor(c, a, 10)).toBeCloseTo(1.5, 5);
    expect(youthFactor(c, b, 10)).toBe(1);
    developYouth(c, (idx) => youthFactor(c, idx, 10));
    expect(c.players[a].delta.passing).toBeCloseTo(c.players[b].delta.passing * 1.5, 5);
  });

  it('Hochziehen: mit Reife gleich in Form, ohne Reife nervös', () => {
    const c = career();
    const [a, b] = c.youth.prospects;
    c.players[a].reife = 1;
    expect(promoteProspect(c, a, 16)).toBe(true);
    expect(promoteProspect(c, b, 16)).toBe(true);
    expect(c.players[a].form).toBe(READY_FORM);
    expect(c.players[b].form).toBe(NERVOUS_FORM);
  });
});

describe('Brücke A-Jugend → Erste: Paten', () => {
  it(`nur erfahrene Spieler ab ${PATE_AGE}, jeder nur für einen; der Pate bringt Entwicklung`, () => {
    const c = career();
    const cands = pateCandidates(c);
    expect(cands.length).toBeGreaterThan(0);
    for (const m of cands) expect(playerOf(c, m).age).toBeGreaterThanOrEqual(PATE_AGE);
    const [a, b] = c.youth.prospects;
    expect(setPate(c, a, cands[0])).toBe(true);
    expect(pateCandidates(c)).not.toContain(cands[0]);
    expect(setPate(c, b, cands[0])).toBe(false);
    expect(pateBonus(c, a)).toBeGreaterThan(0.05);
    expect(youthFactor(c, a, 10)).toBeGreaterThan(1);
  });

  it('beim Hochziehen sind die beiden „Pate & Schützling"', () => {
    const c = career();
    const [a] = c.youth.prospects;
    const m = pateCandidates(c)[0];
    setPate(c, a, m);
    promoteProspect(c, a, 16);
    expect(relationOf(c, a, m)).toBe('pate');
    expect(pateOf(c, a)).toBeNull();
  });

  it('verlässt der Pate den Kader, ist die Patenschaft vorbei', () => {
    const c = career();
    const [a] = c.youth.prospects;
    const m = pateCandidates(c)[0];
    setPate(c, a, m);
    humanClub(c).squad = humanClub(c).squad.filter((i) => i !== m);
    finishRound(c);
    expect(pateOf(c, a)).toBeNull();
  });
});

describe('Ereignisse der Brücke', () => {
  it('Grätsche im Training: „gehört dazu" macht reifer – oder schüchtert ein', () => {
    const c = career();
    const [a] = c.youth.prospects;
    toggleTrainUp(c, a);
    const ctx = ACADEMY_EVENTS.mittraining_graetsche.needs(c, yes);
    expect(ctx?.p).toBe(a);
    expect(playerOf(c, ctx.o).age).toBeGreaterThanOrEqual(30);
    ACADEMY_EVENTS.mittraining_graetsche.options[1].effect(c, ctx, yes);
    expect(reifeOf(c, a)).toBeCloseTo(0.15, 5);
  });

  it('der Pate meint, er ist so weit: Hochziehen klappt, wenn Platz ist', () => {
    const c = career();
    const [a] = c.youth.prospects;
    setPate(c, a, pateCandidates(c)[0]);
    c.players[a].reife = 0.6;
    const ctx = ACADEMY_EVENTS.pate_meint.needs(c, yes);
    expect(ctx).toEqual({ p: a, m: pateOf(c, a) });
    ACADEMY_EVENTS.pate_meint.options[0].effect(c, ctx, yes);
    expect(humanClub(c).squad).toContain(a);
  });
});
