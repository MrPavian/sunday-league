import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { newsPages } from '../src/ui/EndScreen.js';

// UI 3.0 Phase 7: Das Kreisblatt nach dem Abpfiff hat Seiten statt einer langen Wand.
// Inhalt wie vorher (Ergebnis, Tore, Vorfälle, Statistik, Noten, „Dein Spiel"), nur verteilt.
function finished(opts = {}) {
  const m = createMatch({ seed: 7, pitch: PITCHES.ascheplatz, human: false, duration: 60, ...opts });
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    m.events.length = 0;
  }
  return m;
}

describe('Kreisblatt mit Seiten', () => {
  it('Titelseite, Spielbericht, Statistik & Noten – mit Ergebnis, Toren und Noten', () => {
    const m = finished();
    const pages = newsPages(m);
    expect(pages.map((p) => p.id).slice(0, 3)).toEqual(['front', 'report', 'stats']);
    expect(pages[0].html).toContain(`${m.score[0]} : ${m.score[1]}`);
    expect(pages[0].html).toContain(m.teams[0].name);
    // Torschützen stehen im Spielbericht – je Tor ein Eintrag (oder der Hinweis „Keine Tore")
    const goalItems = (pages[1].html.match(/<li class="t[01]">/g) ?? []).length;
    expect(goalItems).toBe(m.stats.goals.length);
    if (!m.stats.goals.length) expect(pages[1].html).toMatch(/Keine Tore|No goals/);
    expect(pages[2].html).toContain('class="stats"');
    expect(pages[2].html).toContain('class="grade"');
  }, 60_000);

  it('„Dein Spiel" als eigene Seite, wenn es eine Analyse gibt; jede Seite hat eine Beschriftung', () => {
    const m = finished();
    m.manager = true;
    m.coachTeam = 0;
    const pages = newsPages(m);
    if (m.log) expect(pages.at(-1).id).toBe('review');
    for (const p of pages) expect(p.label.length).toBeGreaterThan(0);
  }, 60_000);
});
