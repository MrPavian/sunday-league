// Schiedsrichter mit Gesicht (src/career/referees.js): fester Stamm je Ebene, gleicher Name und Gesicht im Spiel, nicht zweimal
// hintereinander derselbe, Bilanz mit dem eigenen Verein, Freizeitliga ohne Schiri.
import { describe, expect, it } from 'vitest';
import { createCareer, humanFixture, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { BANDS, bandOf, history, pool, refereeFor, refereeLine } from '../src/career/referees.js';
import { REF_TRAITS } from '../src/sim/referee.js';

describe('Schiedsrichter mit Gesicht', () => {
  it('Freizeitliga ohne Schiri; ab Kreisklasse ein fester Stamm je Ebene, gleich bei gleichem Spielstand', () => {
    const c = createCareer({ seed: 21 });
    expect(refereeFor(c)).toBeNull();
    expect(refereeLine(c)).toBe('');
    c.level = 2;
    const a = pool(c).map((r) => r.name);
    expect(a).toHaveLength(BANDS.kreis.size);
    expect(new Set(pool(c).map((r) => r.id)).size).toBe(a.length);
    for (const r of pool(c)) expect(REF_TRAITS[r.trait]).toBeTruthy();
    const d = createCareer({ seed: 21 });
    d.level = 2;
    expect(pool(d).map((r) => r.name)).toEqual(a);
    expect(bandOf(4)).toBe('kreis');
    expect(bandOf(5)).toBe('bezirk');
    expect(bandOf(8)).toBe('verband');
    expect(pool(c, 'verband')).toHaveLength(BANDS.verband.size);
  });

  it('nie zweimal hintereinander derselbe; über eine Saison pfeifen mehrere', () => {
    const c = createCareer({ seed: 22 });
    c.level = 3;
    const ids = Array.from({ length: 20 }, (_, r) => refereeFor(c, r).id);
    for (let r = 1; r < ids.length; r++) expect(ids[r]).not.toBe(ids[r - 1]);
    expect(new Set(ids).size).toBeGreaterThan(3);
  });

  it('das eigene Spiel bekommt den Stamm-Schiri samt Gesicht, danach steht die Bilanz', () => {
    const c = createCareer({ seed: 23 });
    c.level = 2;
    const r = refereeFor(c);
    const f = humanFixture(c);
    const prepared = prepareMatch(c, f, { duration: 30 });
    const m = prepared.match;
    if (m.referee.refId) {
      expect(m.referee.name).toBe(r.name);
      expect(m.referee.trait).toBe(r.trait);
      expect(m.referee.look.skin).toBe(r.look.skin);
    } else expect(m.referee.trait).toBe('zuschauer'); // Schiri nicht gekommen (matchday.js)
    simulateSync(prepared);
    recordResult(c, f, prepared);
    if (m.referee.refId) {
      const h = history(c, r.id);
      expect(h.g).toBe(1);
      expect(h.w + h.d + h.l).toBe(1);
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(refereeLine({ ...c, round: c.round })).toContain(r.name);
    }
  }, 60000);
});
