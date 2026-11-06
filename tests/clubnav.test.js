import { describe, expect, it } from 'vitest';
import { areaOfTab, CLUB_AREAS, Clubhouse, resolveTab } from '../src/ui/Clubhouse.js';
import { ICON_NAMES } from '../src/ui/ds.js';

// UI 2.0: Vereinsheim mit höchstens zwei Ebenen (Bereich → Tab). Kein Bildschirm darf beim
// Umbau verloren gehen: jeder tab_*-Bildschirm gehört genau einem Bereich.
describe('Vereinsheim-Navigation', () => {
  const screens = Object.getOwnPropertyNames(Clubhouse.prototype).filter((n) => n.startsWith('tab_')).map((n) => n.slice(4));

  it('jeder bisherige Tab ist genau einem Bereich zugeordnet, jeder Bereichs-Tab existiert', () => {
    // Flaches Menü (2026-11-06): 17 bisherige + Anlage, Vereinsleben, Trikot & Wappen, Du, Teams. Die alten Namen (Verein,
    // Präsidium, Jugend, Frauen, Alte Herren) sind Teile neuer Reiter und führen über resolveTab dorthin.
    expect(screens.length).toBe(22);
    const ALIASES = ['club', 'office', 'youth', 'women', 'oldboys'];
    for (const t of screens) expect(CLUB_AREAS.filter((a) => a.tabs.includes(ALIASES.includes(t) ? resolveTab(t).tab : t))).toHaveLength(1);
    for (const t of ALIASES) expect(CLUB_AREAS.some((a) => a.tabs.includes(t))).toBe(false);
    for (const a of CLUB_AREAS) expect(a.tabs.length).toBeLessThanOrEqual(6); // am Handy ein Raster mit höchstens zwei Zeilen
    for (const a of CLUB_AREAS) for (const t of a.tabs) if (t !== 'home') expect(screens).toContain(t);
  });

  it('zwei Ebenen: Bereiche haben Tabs, aber keine weiteren Unterebenen; jedes Bereichs-Icon existiert', () => {
    expect(CLUB_AREAS.length).toBeLessThanOrEqual(6);
    for (const a of CLUB_AREAS) {
      expect(Array.isArray(a.tabs)).toBe(true);
      for (const t of a.tabs) expect(typeof t).toBe('string');
      expect(ICON_NAMES).toContain(a.icon);
    }
    expect(areaOfTab('cup').id).toBe('season');
    expect(areaOfTab('chat').id).toBe('phone');
    expect(areaOfTab('unbekannt').id).toBe('home');
    expect(areaOfTab('oldboys').id).toBe('team');
    expect(areaOfTab('office').id).toBe('club');
    expect(resolveTab('club', 'wappen').tab).toBe('kit');
  });
});
