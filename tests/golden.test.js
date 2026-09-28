import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint, GOLDEN_CASES } from './golden.js';

// Schutz beim Umbau: Ohne Trainerbefehle spielt die Engine exakt wie vorher.
// Gewollte Verhaltensänderung? Dann `node scripts/golden.mjs` und im Commit begründen.
const golden = JSON.parse(readFileSync(new URL('./fixtures/golden.json', import.meta.url)));

describe('golden fingerprints', () => {
  for (const c of GOLDEN_CASES) {
    it(`unchanged: ${c.join(' ')}`, () => {
      expect(fingerprint(c)).toEqual(golden[c.join(':')]);
    });
  }
});
