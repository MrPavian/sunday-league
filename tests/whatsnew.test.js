import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHANGELOG, NEWEST_ID } from '../src/data/changelog.js';
import { checkWhatsNew, markSeen, seenId, SEEN_KEY, whatsNewAction } from '../src/ui/whatsnew.js';

const memory = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => (d[k] = String(v)), d };
};

describe('Was ist neu: einmal nach einem Update', () => {
  it('neuer Spieler: kein Fenster, Version wird still gemerkt', () => {
    expect(whatsNewAction({ stored: null, isNewPlayer: true })).toBe('silent');
    const st = memory();
    expect(checkWhatsNew({ isNewPlayer: true, storage: st })).toBe(false);
    expect(st.d[SEEN_KEY]).toBe(NEWEST_ID);
  });

  it('ältere gemerkte Version (oder Bestandsspieler ohne Eintrag): Fenster, danach nicht mehr', () => {
    const st = memory({ [SEEN_KEY]: '2026-09-25' });
    expect(checkWhatsNew({ storage: st })).toBe(true);
    expect(seenId(st)).toBe(NEWEST_ID);
    expect(checkWhatsNew({ storage: st })).toBe(false);
    expect(checkWhatsNew({ storage: memory() })).toBe(true);
  });

  it('gleiche Version: kein Fenster', () => {
    expect(whatsNewAction({ stored: NEWEST_ID })).toBe('none');
    expect(checkWhatsNew({ storage: memory({ [SEEN_KEY]: NEWEST_ID }) })).toBe(false);
  });

  it('kaputter Speicher wirft nicht', () => {
    const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
    expect(() => checkWhatsNew({ storage: bad })).not.toThrow();
    expect(() => markSeen(NEWEST_ID, bad)).not.toThrow();
  });
});

describe('Änderungsprotokoll ist konsistent', () => {
  const headings = (file) => [...readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').matchAll(/^## (\d{4}-\d{2}-\d{2}(?:-\d+)?) – (.+)$/gm)].map((m) => [m[1], m[2]]);
  it('Daten, CHANGELOG.md und CHANGELOG.en.md haben dieselben Lieferungen und Titel', () => {
    expect(headings('CHANGELOG.md')).toEqual(CHANGELOG.map((e) => [e.id, e.de.title]));
    expect(headings('CHANGELOG.en.md')).toEqual(CHANGELOG.map((e) => [e.id, e.en.title]));
  });
  it('neueste zuerst, 2 bis 5 Highlights, in beiden Sprachen', () => {
    const ids = CHANGELOG.map((e) => e.id);
    expect(ids).toEqual([...ids].sort().reverse());
    for (const e of CHANGELOG) {
      expect(e.de.items.length).toBeGreaterThanOrEqual(2);
      expect(e.de.items.length).toBeLessThanOrEqual(5);
      expect(e.en.items.length).toBe(e.de.items.length);
    }
  });
});
