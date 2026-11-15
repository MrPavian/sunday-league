// Transfermarkt sichtbarer (vom Nutzer: Transfers zu versteckt, 2026-11-15): Zähler für neue Gerüchte und Angebote.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { markRumorsSeen, transferNews, tstate } from '../src/career/transfers.js';

describe('Transfermarkt-Zähler', () => {
  it('neue Gerüchte zählen, bis man in den Reiter schaut; Angebote zählen immer', () => {
    const c = createCareer({ seed: 2 });
    c.week ??= {};
    c.week.rumors = [{ idx: 1 }, { idx: 2 }];
    expect(transferNews(c).fresh).toBe(2);
    markRumorsSeen(c);
    expect(transferNews(c).fresh).toBe(0);
    c.week.rumors.push({ idx: 3 });
    tstate(c).offers.push({ id: 1 });
    const n = transferNews(c);
    expect(n.fresh).toBe(2);
    expect(n.offers).toBe(1);
    expect(n.rumors).toBe(3);
  });
});
