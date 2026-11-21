// Kleine Geschichten im Spiel (Gameplay 2.0, Punkt 34): Anlässe vor dem Anpfiff für Laufschrift, Ticker und Kommentar.
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, humanClub, prepareMatch, recordResult, seasonOver, simulateSync } from '../src/career/career.js';
import { STORY, trackScoring } from '../src/career/storylines.js';
import { createCommentator, goalStoryLine } from '../src/sim/commentary.js';

describe('Kleine Geschichten', () => {
  it('Flaute und Serie werden nach jedem Spiel fortgeschrieben', () => {
    const rec = {};
    trackScoring(rec, 0);
    trackScoring(rec, 0);
    expect(rec).toEqual({ dry: 2, run: 0 });
    trackScoring(rec, 2);
    trackScoring(rec, 1);
    expect(rec).toEqual({ dry: 0, run: 2 });
  });

  it('eine Saison: Anlässe kommen, stimmen mit den Zahlen überein und ändern kein Ergebnis', () => {
    const c = createCareer({ seed: 3434 });
    const me = humanClub(c).id;
    const kinds = new Set();
    let games = 0;
    let withStories = 0;
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 240 });
        const ours = f.home === me || f.away === me;
        if (ours) {
          games++;
          const m = p.match;
          const team = m.teams.findIndex((t) => t.name === humanClub(c).name);
          expect(m.stories.length).toBeLessThanOrEqual(STORY.max);
          if (m.stories.length) withStories++;
          for (const s of m.stories) {
            kinds.add(s.kind);
            expect(s.text.length).toBeGreaterThan(10);
            if (s.playerId == null) continue;
            const pl = m.players.find((x) => x.id === s.playerId);
            expect(pl).toBeTruthy();
            const rec = c.players[pl.poolIndex];
            if (s.kind === 'dry') expect(rec.dry).toBeGreaterThanOrEqual(STORY.dry);
            if (s.kind === 'run') expect(rec.run).toBeGreaterThanOrEqual(STORY.run);
            if (s.kind === 'debut') expect((rec.total?.apps ?? 0) + rec.apps).toBe(0);
            if (['dry', 'run', 'debut', 'apps', 'goalmark', 'exclub'].includes(s.kind)) expect(pl.team).toBe(team);
          }
          // Gleiches Spiel ohne Geschichten: gleiches Ergebnis (nur Text).
          const twin = prepareMatch(c, f, { duration: 240 });
          twin.match.stories = [];
          for (const pl of twin.match.players) delete pl.story;
          simulateSync(twin);
          simulateSync(p);
          expect(p.match.score).toEqual(twin.match.score);
        } else simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    expect(games).toBeGreaterThan(5);
    expect(withStories).toBeGreaterThan(games / 3);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  }, 120000);

  it('Kommentar: Anlass beim ersten Tor, Laufschrift-Zeilen zum Anpfiff im Ticker', () => {
    expect(goalStoryLine({ story: { dry: 5 } }, 1)).toMatch(/5/);
    expect(goalStoryLine({ story: { dry: 5 } }, 2)).toBe('');
    expect(goalStoryLine({ story: { debut: true } })).toMatch(/Debüt|debut/);
    expect(goalStoryLine({ story: { goalMark: 25 } })).toMatch(/25/);
    expect(goalStoryLine({})).toBe('');
    const c = createCareer({ seed: 3435 });
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    const p = prepareMatch(c, f, { duration: 240 });
    p.match.stories = [{ kind: 'wins', text: 'Drei Siege in Folge – hält die Serie?' }];
    const com = createCommentator(p.match, 1);
    const lines = com.feed([]) ?? [];
    const all = JSON.stringify(lines) + JSON.stringify(com.lines ?? com.log ?? []);
    expect(all).toMatch(/Drei Siege in Folge/);
  });
});
