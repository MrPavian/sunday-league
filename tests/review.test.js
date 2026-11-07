import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { seasonReview } from '../src/career/review.js';
import { reviewPageHTML } from '../src/ui/reviewpage.js';

describe('season special', () => {
  it('sums up the season and lands in the archive at the season change', () => {
    const c = createCareer({ seed: 8080 });
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 240 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    const r = seasonReview(c);
    expect(r.headline.length).toBeGreaterThan(5);
    expect(r.pos).toBeGreaterThanOrEqual(1);
    const labels = r.items.map((i) => i.label);
    expect(labels).toContain('Torjäger');
    expect(labels.some((l) => l === 'Höchster Sieg' || l === 'Bitterste Pleite')).toBe(true);
    // Teilbare Seite: Tabelle, alle Spiele und Kader, eigenständig ohne Skript und Netz.
    expect(r.table).toHaveLength(c.clubs.length);
    expect(r.table.filter((t) => t.mine)).toHaveLength(1);
    expect(r.table.findIndex((t) => t.mine) + 1).toBe(r.pos);
    expect(r.results.length).toBe(r.table.find((t) => t.mine).w + r.table.find((t) => t.mine).d + r.table.find((t) => t.mine).l);
    expect(r.squad.length).toBeGreaterThan(5);
    const html = reviewPageHTML(r, { crest: '<svg></svg>' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toMatch(/<script|https?:\/\//);
    expect(html).toContain(r.squad[0].name.replace(/&/g, '&amp;'));
    expect((html.match(/<tr class="mine">/g) ?? []).length).toBe(1);
    // Alte Sonderhefte ohne Tabelle: nur die Abschnitte fehlen.
    const old = reviewPageHTML({ ...r, table: undefined, results: undefined, squad: undefined });
    expect(old).toContain(r.headline.replace(/&/g, '&amp;'));
    expect(old).not.toContain('<table>');
    nextSeason(c);
    expect(c.reviews).toHaveLength(1);
    expect(c.reviews[0].table).toHaveLength(r.table.length);
    expect(c.reviews[0].squad.length).toBeGreaterThan(5);
    expect(c.reviews[0]).toMatchObject({ season: 1, headline: r.headline, pos: r.pos });
  }, 60000);
});
