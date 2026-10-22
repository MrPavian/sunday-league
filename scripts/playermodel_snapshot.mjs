// Schnappschuss der Spielerfiguren neu schreiben – nur, wenn sich Figuren (Geometrie, Posen) gewollt ändern.
import { writeFileSync } from 'node:fs';
import { playerSnapshot } from '../tests/playermodel_snapshot.js';
const snap = playerSnapshot();
writeFileSync(new URL('../tests/fixtures/playermodel.json', import.meta.url), JSON.stringify(snap, null, 1) + '\n');
console.log(`${Object.keys(snap.models).length} Figuren, ${Object.keys(snap.anims).length} Bewegungsabläufe geschrieben`);
