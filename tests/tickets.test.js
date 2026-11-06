// Eintrittspreise und Dauerkarten (tickets.js): ohne Einstellung wie bisher; Preis wirkt auf Zuschauer und Kasse;
// Sitzplätze ab dem Drittliga-Stadion; Dauerkarten bringen Geld zum Saisonstart und volle Ränge bei Regen.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, prepareMatch, recordResult, seasonOver } from '../src/career/career.js';
import { entryFee } from '../src/career/finances.js';
import { facilities } from '../src/career/facilities.js';
import { demandMul, gateOf, prices, priceRatio, seatShare, sellSeasonTickets, setPrice, setSeasonTickets, TICKETS, ticketsOn } from '../src/career/tickets.js';

const at = (level, seed = 8) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};

describe('Eintrittspreise', () => {
  it('ohne Einstellung genau wie bisher; erst ab der Bezirksliga', () => {
    const c = at(6);
    expect(gateOf(c)).toEqual({ mul: 1, perFan: entryFee(6), dk: 0 });
    expect(ticketsOn(at(4))).toBe(false);
    expect(setPrice(at(4), 'stand', 0.1)).toBe(false);
    expect(prices(c).stand).toBeCloseTo(5, 5); // Landesliga: 5 € Aushang
  });
  it('teurer: weniger Zuschauer, mehr je Karte; billiger: mehr Zuschauer; Grenzen 50–200 %', () => {
    const c = at(6);
    setPrice(c, 'stand', 0.5);
    expect(priceRatio(c)).toBeCloseTo(1.5);
    const g = gateOf(c);
    expect(g.mul).toBeLessThan(1);
    expect(g.perFan).toBeCloseTo(entryFee(6) * 1.5, 1);
    for (let i = 0; i < 20; i++) setPrice(c, 'stand', 0.1);
    expect(c.tickets.stand).toBe(TICKETS.max);
    for (let i = 0; i < 40; i++) setPrice(c, 'stand', -0.1);
    expect(c.tickets.stand).toBe(TICKETS.min);
    expect(demandMul(0.5)).toBeGreaterThan(1);
    // Über dem Ligapreis sinkt die Kasse aus dem Eintritt (ohne volles Stadion): Elastizität über 1.
    expect(1.5 * demandMul(1.5)).toBeLessThan(1);
  });
  it('Sitzplätze erst mit Drittliga-Stadion; der Schnitt bleibt beim Ligapreis', () => {
    const c = at(10);
    expect(seatShare(c)).toBe(0);
    expect(setPrice(c, 'seat', 0.1)).toBe(false);
    facilities(c).built.drittliga = 1;
    const p = prices(c);
    expect(p.seats).toBeCloseTo(2000 / 5001, 5);
    expect(Math.abs(p.seat / p.stand - TICKETS.seatMul)).toBeLessThan(0.1); // Aushang auf 50 Cent gerundet
    expect(Math.abs((1 - p.seats) * p.stand + p.seats * p.seat - 15)).toBeLessThan(0.5); // 3. Liga: 15 € im Schnitt
  });
  it('Heimspiel: der Preis landet in der Kasse', () => {
    const run = (factor) => {
      const c = createCareer({ seed: 12 });
      c.level = 6;
      if (factor) {
        setPrice(c, 'stand', factor - 1);
      }
      const f = c.fixtures[c.round].find((x) => x.home === humanClub(c).id) ?? c.fixtures[c.round + 1]?.find((x) => x.home === humanClub(c).id);
      if (!f) return null;
      const p = prepareMatch(c, f, { duration: 30 });
      p.match.phase = 'ended';
      recordResult(c, f, p);
      return c.ledger.find((e) => /Eintritt|Gate/.test(e.text));
    };
    const base = run(0);
    const dear = run(1.5);
    if (base && dear) {
      const n = (e) => Number(/\((\d+)/.exec(e.text)[1]);
      expect(n(dear)).toBeLessThanOrEqual(n(base));
      expect(dear.amount / n(dear)).toBeGreaterThan(base.amount / n(base));
    }
  });
});

describe('Dauerkarten', () => {
  it('Verkauf zum Einschalten für die restlichen Heimspiele, nur einmal je Saison; Rabatt auf die Tageskarte', () => {
    const c = at(6);
    const cash = c.cash;
    expect(setSeasonTickets(c, true)).toBe(true);
    const s = c.tickets.sold;
    expect(s.n).toBeGreaterThan(0);
    expect(s.games).toBeGreaterThan(0);
    expect(c.cash - cash).toBe(s.amount);
    expect(s.amount).toBe(Math.round(s.n * entryFee(6) * (1 - TICKETS.dkDiscount) * s.games));
    expect(sellSeasonTickets(c)).toBeNull(); // schon verkauft
    expect(gateOf(c).dk).toBe(Math.round(s.n * (1 - TICKETS.noShow)));
  });
  it('neue Saison: wieder verkauft', async () => {
    const { nextSeason } = await import('../src/career/career.js');
    const c = at(6);
    setSeasonTickets(c, true);
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
      finishRound(c);
    }
    nextSeason(c);
    if (ticketsOn(c)) expect(c.tickets.sold.season).toBe(c.season);
  });
});
