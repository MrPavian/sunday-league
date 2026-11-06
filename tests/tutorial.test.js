// Wählbares Tutorial (ui/Tutorial.js): Rundgang durchs Vereinsheim und Hinweise am ersten Spieltag.
import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { CLUB_AREAS } from '../src/ui/Clubhouse.js';
import { CLUB_STEPS, MATCH_STEPS, startTutorial, stopTutorial, tutorialActive } from '../src/ui/Tutorial.js';

describe('Tutorial', () => {
  it('Rundgang: jeder Schritt führt auf einen Reiter, den es gibt, mit Ziel, Titel und Text', () => {
    const tabs = CLUB_AREAS.flatMap((a) => a.tabs);
    const steps = CLUB_STEPS();
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) {
      expect(tabs).toContain(s.tab);
      expect(s.target && s.title && s.text).toBeTruthy();
    }
    expect(steps[0].tab).toBe('home');
    expect(steps.at(-1).target).toBe('.coach-play'); // endet beim Anpfiff
  });
  it('Spieltag: erst nach dem Anpfiff, Lagekarte nur mit Karte, zum Schluss die Halbzeit', () => {
    const [first, ...rest] = MATCH_STEPS();
    expect(first.when({ phase: 'play', time: 0 })).toBe(false);
    expect(first.when({ phase: 'play', time: 5 })).toBe(true);
    const card = rest.find((s) => s.id === 'card');
    expect(card.when({ coachCard: null })).toBe(false);
    expect(card.when({ coachCard: { t: 3 } })).toBe(true);
    const half = rest.at(-1);
    expect(half.id).toBe('half');
    expect(half.when({ phase: 'play' })).toBe(false);
    expect(half.when({ phase: 'halftime' })).toBe(true);
  });
  it('Zustand: aus, Angebot, gestartet, Teil fertig, ganz beendet – übersteht Speichern und Laden', () => {
    const c = createCareer({ seed: 3 });
    expect(tutorialActive(c, 'club')).toBe(false);
    c.tutorial = { offer: true };
    expect(tutorialActive(c, 'club')).toBe(false);
    startTutorial(c);
    expect(tutorialActive(c, 'club') && tutorialActive(c, 'match')).toBe(true);
    stopTutorial(c, 'club');
    expect([tutorialActive(c, 'club'), tutorialActive(c, 'match')]).toEqual([false, true]);
    const copy = JSON.parse(JSON.stringify(c));
    expect(tutorialActive(copy, 'match')).toBe(true);
    stopTutorial(c);
    expect(c.tutorial).toEqual({ club: 'done', match: 'done' });
    startTutorial(c); // in den Einstellungen neu gestartet: von vorn
    expect(c.tutorial).toEqual({ club: 0, match: 0 });
  });
});
