// Zweite Mannschaft (reserve.js, ROADMAP 11.17 Punkt 4).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { canRegister, registerReserve, reserveCap, reserveMatchday, RESERVE_ROUNDS, RESERVE_START, reserveSeasonEnd, reserveSquad, reserveTable, withdrawReserve } from '../src/career/reserve.js';

const career = (level = 9) => {
  const c = createCareer({ seed: 12 });
  c.level = level;
  c.cash = 100000;
  return c;
};
const deps = (c, used = []) => ({ playerOf, squad: humanClub(c).squad, prospects: c.youth?.prospects ?? [], usedFirst: new Set(used) });

describe('Zweite Mannschaft', () => {
  it('erst ab der Regionalliga; beginnt in der untersten Klasse', () => {
    expect(canRegister(career(8))).toBe(false);
    const c = career(9);
    expect(registerReserve(c)).toBe(true);
    expect(c.reserve.level).toBe(RESERVE_START);
    expect(c.reserve.teams).toHaveLength(16);
    expect(registerReserve(c)).toBe(false);
    expect(withdrawReserve(c)).toBe(true);
    expect(c.reserve).toBe(null);
  });

  it('DFB-Regel: höchstens eine Liga unter der Ersten, Zweite eines Drittligisten nicht in der Regionalliga', () => {
    expect(reserveCap(9)).toBe(8);
    expect(reserveCap(10)).toBe(8);
    expect(reserveCap(11)).toBe(9);
    expect(reserveCap(12)).toBe(10);
  });

  it('wer bei der Ersten gespielt hat, spielt nicht in der Zweiten', () => {
    const c = career(9);
    const squad = humanClub(c).squad;
    const used = squad.slice(0, 5);
    const eleven = reserveSquad(c, deps(c, used));
    expect(eleven.some((x) => used.includes(x.idx))).toBe(false);
  });

  it('eine ganze Saison: Tabelle vollständig, Einsätze zählen, Kosten gebucht, Saisonende mit Platz', () => {
    const c = career(9);
    registerReserve(c);
    const used = humanClub(c).squad.slice(0, 5); // neue Karriere: 10 Spieler im Kader
    const cash = c.cash;
    for (let r = 0; r < RESERVE_ROUNDS; r++) expect(reserveMatchday(c, deps(c, used))).toMatch(/Zweite|Reserves/);
    expect(reserveMatchday(c, deps(c, used))).toBe(null); // Saison vorbei
    const table = reserveTable(c.reserve);
    expect(table.every((t) => t.w + t.d + t.l === RESERVE_ROUNDS)).toBe(true);
    const total = table.reduce((s, t) => s + t.gf - t.ga, 0);
    expect(total).toBe(0);
    expect(c.cash).toBeLessThan(cash);
    const reserveIdx = humanClub(c).squad.find((idx) => !used.includes(idx));
    expect(c.players[reserveIdx].apps2).toBeGreaterThan(0);
    const note = reserveSeasonEnd(c, 9);
    expect(note).toMatch(/Platz|finished/);
    expect(c.reserve.round).toBe(0);
    expect(c.reserve.history).toHaveLength(1);
  });

  it('Aufstieg bis zur Grenze, dann verwehrt; nach Abstieg der Ersten Rückstufung', () => {
    const c = career(9);
    registerReserve(c);
    c.reserve.level = 8;
    c.reserve.teams.find((t) => t.own).p = 999;
    expect(reserveSeasonEnd(c, 9)).toMatch(/darf sie nicht|may not go up/);
    expect(c.reserve.level).toBe(8);
    expect(reserveSeasonEnd(c, 8)).toMatch(/Rückstufung|moved down/); // Erste jetzt Oberliga → Zweite höchstens Verbandsliga
    expect(c.reserve.level).toBe(7);
  });

  it('ohne freie Kaderspieler spielen die eigenen Amateure der Zweiten – kein Nichtantreten', () => {
    const c = career(9);
    registerReserve(c);
    const all = [...humanClub(c).squad, ...(c.youth?.prospects ?? [])];
    expect(reserveMatchday(c, deps(c, all))).toMatch(/Zweite Mannschaft gegen|Reserves v/);
    expect(c.reserve.teams.find((t) => t.own).str).toBeGreaterThan(40);
  });
});
