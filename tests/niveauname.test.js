import { describe, expect, it } from 'vitest';
import { niveauLevel, niveauName, niveauText } from '../src/career/verband.js';
import { NIVEAU_TARGET, PRO_TARGET } from '../src/sim/niveau.js';

describe('Anzeige Stärke · Niveau', () => {
  it('ordnet jede Zielstärke ihrer eigenen Liga zu, die Grenze liegt in der Mitte', () => {
    const t = [...NIVEAU_TARGET, ...Object.values(PRO_TARGET)];
    t.forEach((r, i) => expect(niveauLevel(r)).toBe(i + 1));
    expect(niveauLevel(0)).toBe(1);
    expect(niveauLevel(300)).toBe(12);
    expect(niveauLevel((97 + 111) / 2)).toBe(7);
    expect(niveauLevel((97 + 111) / 2 - 0.01)).toBe(6);
  });
  it('zeigt Ligennamen nur im neuen Stärkemodell', () => {
    expect(niveauName({ strength: 1 }, 100)).toBeNull();
    expect(niveauText({ strength: 2 }, 100)).toBe('');
    expect(niveauName({ strength: 3 }, 51)).toBe(niveauName({ strength: 3 }, 0));
    expect(niveauName({ strength: 3 }, 186)).not.toContain('Kanal');
    expect(niveauName({ strength: 3, verband: 'westfalen' }, 111)).toBe('Westfalenliga');
    expect(niveauText({ strength: 3, verband: 'westfalen' }, 105, true)).toMatch(/etwa Westfalenliga$/);
  });
});
