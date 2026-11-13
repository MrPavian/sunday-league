// Zurufe in wechselnden Worten (sim/coach.js calls): vier Fassungen je Zuruf, die erste ist die Beschriftung des Knopfs.
import { describe, expect, it } from 'vitest';
import { SHOUTS } from '../src/sim/coach.js';

describe('Zurufe mit Abwechslung', () => {
  it('jeder Zuruf hat vier verschiedene Fassungen, beginnend mit der Knopfbeschriftung', () => {
    for (const [id, s] of Object.entries(SHOUTS)) {
      expect(s.calls, id).toHaveLength(4);
      expect(new Set(s.calls).size, id).toBe(4);
      expect(s.calls[0], id).toBe(s.label);
      for (const t of s.calls) expect(t.endsWith('!'), `${id}: ${t}`).toBe(true);
    }
  });
});
