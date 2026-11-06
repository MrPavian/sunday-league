// Vereinsgelände (ROADMAP 11.17 Punkt 16): sechs neue Bereiche mit je drei Stufen. Ohne Ausbau bleibt alles wie vorher;
// jeder Ausbau wirkt an seiner Stelle; das NLZ ist ab der 2. Liga Pflicht für die Zulassung.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { buildBlock, FACILITIES, FACILITY_GROUPS, facilities, fanshopIncome, fansMul, growthMul, injuryChanceMul, injuryWeeksMul, recoveryBonus, sponsorMul, surroundMul, videoSteps, youthExtra, youthGrowthMul } from '../src/career/facilities.js';
import { licenseNeeds } from '../src/career/license.js';

const NEW = ['training', 'team', 'medizin', 'buero', 'jugend', 'umfeld'];
const at = (level, pro = level >= 9) => {
  const c = createCareer({ seed: 5 });
  c.level = level;
  if (pro) c.pro = true;
  return c;
};
const give = (c, ...ids) => {
  for (const id of ids) facilities(c).built[id] = 1;
  return c;
};

describe('Vereinsgelände', () => {
  it('sechs neue Bereiche mit je drei Stufen; jede Voraussetzung gibt es', () => {
    for (const g of NEW) {
      expect(FACILITY_GROUPS.some((x) => x.id === g)).toBe(true);
      expect(Object.values(FACILITIES).filter((d) => d.group === g).length).toBeGreaterThanOrEqual(3);
    }
    for (const d of Object.values(FACILITIES)) for (const n of d.needs ?? []) expect(FACILITIES[n]).toBeTruthy();
  });
  it('ohne Ausbau: alle Wirkungen neutral', () => {
    const c = at(6);
    expect([growthMul(c), injuryChanceMul(c), injuryWeeksMul(c), sponsorMul(c), surroundMul(c)]).toEqual([1, 1, 1, 1, 1]);
    expect([recoveryBonus(c), videoSteps(c), youthExtra(c), fanshopIncome(c, 200)]).toEqual([0, 0, 0, 0]);
    expect(youthGrowthMul(c)).toBe(1);
    expect(fansMul(c)).toBe(1);
  });
  it('voll ausgebaut: spürbar, aber höchstens etwa ein Fünftel je Bereich', () => {
    const c = give(at(12), ...Object.keys(FACILITIES).filter((id) => NEW.includes(FACILITIES[id].group)));
    expect(growthMul(c)).toBeGreaterThan(1.1);
    expect(growthMul(c)).toBeLessThan(1.2);
    expect(injuryWeeksMul(c)).toBeCloseTo(0.729, 3);
    expect(injuryChanceMul(c)).toBeCloseTo(0.857, 3);
    expect(sponsorMul(c)).toBeGreaterThan(1.15);
    expect(sponsorMul(c)).toBeLessThan(1.2);
    expect(surroundMul(c)).toBeLessThan(1.2);
    expect(recoveryBonus(c)).toBeCloseTo(0.05, 5);
    expect(videoSteps(c)).toBe(1);
    expect(youthExtra(c)).toBe(3); // Jugendhaus, Internat, NLZ
  });
  it('Stufen nach Liga: oben erst mit der Liga, unten mit Ehrenamt', () => {
    expect(buildBlock(at(1), 'behandlungsraum')).toBe('level');
    expect(buildBlock(at(2), 'behandlungsraum')).toBeNull();
    expect(buildBlock(give(at(5), 'behandlungsraum'), 'physio')).toBe('level');
    expect(buildBlock(at(6), 'physio')).toBe('needs');
    expect(buildBlock(give(at(9), 'jugendhaus', 'schulkoop', 'internat'), 'nlz')).toBe('level');
    expect(buildBlock(give(at(10), 'jugendhaus', 'schulkoop', 'internat'), 'nlz')).toBeNull();
  });
  it('Fanshop: Einnahmen je Zuschauer, in den Profiligen halb (Fanartikel stecken dort in der Vermarktung)', () => {
    expect(fanshopIncome(give(at(6), 'fanshop'), 200)).toBe(120);
    expect(fanshopIncome(give(at(10), 'fanshop'), 10000)).toBe(3000);
  });
  it('NLZ: Pflicht für die Zulassung zur 2. und 1. Liga, nicht für die 3. Liga', () => {
    expect(licenseNeeds(at(9), 10).some((x) => x.id === 'nlz')).toBe(false);
    const c = at(10);
    const need = licenseNeeds(c, 11).find((x) => x.id === 'nlz');
    expect(need.ok).toBe(false);
    give(c, 'nlz');
    expect(licenseNeeds(c, 11).find((x) => x.id === 'nlz').ok).toBe(true);
  });
  it('alter Spielstand schon in der 2. Liga: das NLZ gilt als vorhanden', () => {
    const c = at(11);
    expect(licenseNeeds(c, 12).find((x) => x.id === 'nlz').ok).toBe(true);
  });
});
