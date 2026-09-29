import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { clubScene } from '../src/ui/ClubScene.js';
import { CLUB_AREAS } from '../src/ui/Clubhouse.js';

// UI 3.0 Phase 2: Jedes Objekt im Vereinsheim führt dorthin, wohin auch die Leiste führt.
describe('Vereinsheim-Szene', () => {
  it('jedes Objekt ist ein Knopf mit Ziel, Beschriftung und Wert; Ziele sind echte Tabs', () => {
    const c = createCareer({ seed: 9 });
    const html = clubScene(c);
    const tabs = [...html.matchAll(/data-action="tab" data-value="([a-z]+)"/g)].map((m) => m[1]);
    const known = CLUB_AREAS.flatMap((a) => a.tabs);
    expect(tabs.length).toBeGreaterThanOrEqual(9);
    for (const t of tabs) expect(known).toContain(t);
    expect(html).toContain('data-action="onSettings"');
    for (const m of html.matchAll(/<button class="cs-obj[^>]*aria-label="([^"]*)"/g)) expect(m[1].length).toBeGreaterThan(3);
    expect(html).toMatch(/So\., \d+\. Aug\./); // nächster Termin aus dem Kalender
  });
});
