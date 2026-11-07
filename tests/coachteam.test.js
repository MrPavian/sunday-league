// Trainerteam ab der Regionalliga (coachteam.js, ROADMAP 11.17 Punkt 5).
import { describe, expect, it } from 'vitest';
import { createCareer, developPlayers, humanClub, playerOf } from '../src/career/career.js';
import {
  hireTeam,
  keeperGrowthMul,
  MINIJOB,
  releaseTeam,
  teamCandidates,
  teamInjuryChanceMul,
  teamInjuryWeeksMul,
  teamRecoveryBonus,
  teamSalary,
  weeklyPay,
  weeklyTeam,
} from '../src/career/coachteam.js';

const career = (level = 9, cash = 100000, seed = 31) => {
  const c = createCareer({ seed });
  c.level = level;
  c.cash = cash;
  return c;
};

describe('Trainerteam', () => {
  it('Gehälter: Regionalliga Minijob, 3. Liga Median, Erfahrung kostet mehr', () => {
    expect(teamSalary(9, 'physio', 1)).toBe(MINIJOB); // Regionalliga: höchstens die Minijob-Grenze
    expect(teamSalary(9, 'physio', 0.4)).toBeLessThan(MINIJOB);
    expect(teamSalary(10, 'athletik', 0.5)).toBe(3030);
    expect(teamSalary(10, 'physio', 0.5)).toBe(3450);
    expect(teamSalary(12, 'torwart', 0.5)).toBeGreaterThan(teamSalary(11, 'torwart', 0.5));
    expect(teamSalary(10, 'torwart', 1)).toBeGreaterThan(teamSalary(10, 'torwart', 0.4));
    const [cheap, pro] = teamCandidates(career(10), 'torwart');
    expect(cheap.quality).toBeLessThan(pro.quality);
    expect(cheap.salary).toBeLessThan(pro.salary);
  });

  it('erst ab der Regionalliga, und nur mit Geld für den ersten Monat', () => {
    expect(hireTeam(career(8), 'physio', 0)).toBe(false);
    expect(hireTeam(career(9, 100), 'physio', 0)).toBe(false);
    const c = career(9);
    expect(hireTeam(c, 'physio', 1)).toBe(true);
    expect(c.coachTeam.physio.name).toBeTruthy();
    expect(releaseTeam(c, 'physio')).toBe(true);
    expect(c.coachTeam.physio).toBe(null);
  });

  it('Wirkung nur mit Trainerteam; ohne bleibt alles wie vorher', () => {
    const c = career(10);
    expect([keeperGrowthMul(c), teamInjuryChanceMul(c), teamInjuryWeeksMul(c), teamRecoveryBonus(c)]).toEqual([1, 1, 1, 0]);
    for (const role of ['torwart', 'athletik', 'physio']) hireTeam(c, role, 1);
    expect(keeperGrowthMul(c)).toBeGreaterThan(1.13);
    expect(teamInjuryChanceMul(c)).toBeLessThan(0.94);
    expect(teamInjuryWeeksMul(c)).toBeLessThan(0.9);
    expect(teamRecoveryBonus(c)).toBeGreaterThan(0);
    c.level = 8; // nach dem Abstieg wirkt nichts mehr
    expect(keeperGrowthMul(c)).toBe(1);
  });

  it('wöchentlich: Gehalt geht ab; leere Kasse oder Abstieg unter die Regionalliga – die Person geht', () => {
    const c = career(10);
    hireTeam(c, 'athletik', 0);
    const pay = weeklyPay(teamSalary(10, 'athletik', c.coachTeam.athletik.quality));
    const before = c.cash;
    expect(weeklyTeam(c)).toHaveLength(0);
    expect(before - c.cash).toBe(pay);
    c.cash = 1;
    expect(weeklyTeam(c)).toHaveLength(1);
    expect(c.coachTeam.athletik).toBe(null);
    hireTeam(Object.assign(c, { cash: 100000 }), 'physio', 0);
    c.level = 8;
    expect(weeklyTeam(c)).toHaveLength(1);
    expect(c.coachTeam.physio).toBe(null);
  });

  it('Torwarttrainer: Torhüter entwickeln sich in der Saison stärker als ohne', () => {
    const gain = (withCoach) => {
      const c = career(9, 100000, 1); // Seed 1: 19-jähriger Torwart im Kader
      if (withCoach) {
        c.coachTeam = { torwart: { name: 'T', age: 45, quality: 1, since: 1 } };
      }
      const keepers = humanClub(c).squad.filter((idx) => playerOf(c, idx).position === 'gk');
      expect(keepers.some((idx) => playerOf(c, idx).age <= 21)).toBe(true);
      developPlayers(c);
      return keepers.reduce((s, idx) => s + Object.values(c.players[idx].delta ?? {}).reduce((a, b) => a + b, 0), 0);
    };
    expect(gain(true)).toBeGreaterThan(gain(false));
  });
});
