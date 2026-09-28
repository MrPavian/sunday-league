// Neue Fingerabdrücke schreiben – nur, wenn sich das Verhalten gewollt ändert.
import { writeFileSync } from 'node:fs';
import { fingerprint, GOLDEN_CASES } from '../tests/golden.js';
const out = Object.fromEntries(GOLDEN_CASES.map((c) => [c.join(':'), fingerprint(c)]));
writeFileSync(new URL('../tests/fixtures/golden.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.entries(out).map(([k, v]) => `${k} ${v.score.join(':')} events ${v.events}`).join('\n'));
