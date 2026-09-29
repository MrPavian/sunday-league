import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { button, haptic, hapticsOn, HAPTICS, segmented, setHaptics, tabs, versus } from '../src/ui/ds.js';

// Designsystem (UI 2.0): Bausteine liefern einheitliches Markup; Vibration dezent und abschaltbar.
describe('Designsystem', () => {
  let store;
  beforeEach(() => {
    store = new Map();
    globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  });
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('Knopf: Klassen, Zustand und Aktionen; Text wird maskiert', () => {
    const b = button('Spielen', { kind: 'primary big', action: 'onPlay', value: 'x"y' });
    expect(b).toContain('class="ui-btn primary big"');
    expect(b).toContain('data-action="onPlay"');
    expect(b).toContain('data-value="x&quot;y"');
    expect(button('An', { kind: 'toggle', pressed: true })).toContain('aria-pressed="true"');
    expect(button('Aus', { disabled: true })).toMatch(/ disabled/);
    expect(button('Post', { badge: 3 })).toContain('<span class="ui-badge">3</span>');
  });

  it('Tabs und Segment-Regler markieren genau einen Eintrag als aktiv', () => {
    const t = tabs([['a', 'Kader'], ['b', 'Aufstellung', 2]], 'b');
    expect(t.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(t).toContain('data-value="b"');
    const s = segmented('press', [['tief', 'Tief'], ['mittel', 'Mittel'], ['hoch', 'Hoch']], 'hoch');
    expect(s.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(s).toContain('data-group="press"');
    // Kein Wert gewählt: keiner aktiv (es gibt keine erfundene Zwischenstufe).
    expect(segmented('press', [['tief', 'Tief']], null).match(/aria-pressed="true"/g)).toBeNull();
  });

  it('Vergleichszeile ist nur mit Aktion ein Knopf', () => {
    expect(versus(14, 'Schüsse', 9)).toMatch(/^<div class="ui-vs">/);
    expect(versus(14, 'Schüsse', 9, { action: 'stat', value: 'shots' })).toMatch(/^<button[^>]*data-action="stat"/);
  });

  it('Vibration: standardmäßig dezent an, abschaltbar, ohne Gerät kein Fehler', () => {
    const calls = [];
    const nav = { vibrate: (p) => calls.push(p) };
    expect(hapticsOn()).toBe(true);
    expect(haptic('message', nav)).toBe(true);
    expect(calls[0]).toEqual(HAPTICS.message);
    // dezent: kein Impuls länger als 20 ms
    for (const p of Object.values(HAPTICS)) for (const ms of [p].flat().filter((_, i) => i % 2 === 0)) expect(ms).toBeLessThanOrEqual(20);
    setHaptics(false);
    expect(hapticsOn()).toBe(false);
    expect(haptic('tap', nav)).toBe(false);
    expect(calls).toHaveLength(1);
    setHaptics(true);
    expect(haptic('tap', {})).toBe(false); // Gerät ohne Vibration
  });
});
