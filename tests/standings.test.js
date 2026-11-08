import { describe, expect, it } from 'vitest';
import { rankTable } from '../src/core/standings.js';

const row = (id, pts, gf, ga) => ({ id, pts, gf, ga });
const ids = (list) => list.map((r) => r.id);

describe('Tabelle bei Punktgleichheit', () => {
  it('DFB: Tordifferenz vor Toren vor direktem Vergleich', () => {
    const rows = [row('a', 10, 8, 5), row('b', 10, 9, 5), row('c', 10, 12, 8), row('d', 12, 1, 9)];
    // b und c: gleiche Differenz (+4), c hat mehr Tore. a hat schlechtere Differenz.
    expect(ids(rankTable(rows, []))).toEqual(['d', 'c', 'b', 'a']);
  });

  it('DFB: bei gleicher Differenz und gleichen Toren entscheidet der direkte Vergleich, dann Auswärtstore', () => {
    const rows = [row('a', 10, 8, 5), row('b', 10, 8, 5)];
    const won = [{ home: 'a', away: 'b', hg: 1, ag: 0 }, { home: 'b', away: 'a', hg: 1, ag: 1 }];
    expect(ids(rankTable(rows, won))).toEqual(['a', 'b']);
    // Gesamtergebnis 2:2, b hat auswärts zwei Tore, a eins.
    const away = [{ home: 'a', away: 'b', hg: 0, ag: 2 }, { home: 'b', away: 'a', hg: 0, ag: 1 }, { home: 'b', away: 'x', hg: 0, ag: 0 }];
    // Direkter Vergleich: a 1 Auswärtstor, b 2 → b vorn.
    expect(ids(rankTable(rows, away, { fallback: (x, y) => x.id.localeCompare(y.id) }))).toEqual(['b', 'a']);
  });

  it('DFB: ganz gleich → fester Ersatzwert statt Entscheidungsspiel', () => {
    const rows = [row('b', 3, 2, 2), row('a', 3, 2, 2)];
    expect(ids(rankTable(rows, [], { fallback: (x, y) => x.id.localeCompare(y.id) }))).toEqual(['a', 'b']);
  });

  it('WM/EM: direkter Vergleich vor der Tordifferenz', () => {
    const rows = [row('a', 6, 3, 3), row('b', 6, 7, 2)];
    const m = [{ home: 'a', away: 'b', hg: 1, ag: 0 }];
    expect(ids(rankTable(rows, m, { mode: 'h2h' }))).toEqual(['a', 'b']);
    expect(ids(rankTable(rows, m, { mode: 'dfb' }))).toEqual(['b', 'a']);
  });

  it('WM/EM: drei Punktgleiche – erst die kleine Tabelle, Rest nach Gesamtwerten', () => {
    const rows = [row('a', 4, 4, 4), row('b', 4, 5, 3), row('c', 4, 3, 3)];
    const m = [
      { home: 'a', away: 'b', hg: 1, ag: 1 },
      { home: 'b', away: 'c', hg: 1, ag: 1 },
      { home: 'c', away: 'a', hg: 1, ag: 1 },
    ];
    // Untereinander alle gleich → Tordifferenz gesamt: b +2, c 0, a 0; dann Tore: a 4 vor c 3.
    expect(ids(rankTable(rows, m, { mode: 'h2h' }))).toEqual(['b', 'a', 'c']);
  });
});
