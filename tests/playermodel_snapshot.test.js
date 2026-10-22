// Spielerfigur eingefroren: Geometrie, Knochen, Trikotmalerei und Posen über viele Eingaben (tests/playermodel_snapshot.js).
// Meldet jede Änderung an Figuren. Bei GEWOLLTER Änderung: `node scripts/playermodel_snapshot.mjs` schreibt tests/fixtures/playermodel.json neu
// (wie scripts/golden.mjs) – im Commit begründen, welche Figuren/Bewegungen sich ändern.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { playerSnapshot } from './playermodel_snapshot.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/playermodel.json', import.meta.url), 'utf8'));
const snap = playerSnapshot();

describe('Spielerfigur: Schnappschuss', () => {
  it('Exporte und Konstanten bleiben', () => {
    expect(snap.exports).toEqual(golden.exports);
    expect(snap.constants).toBe(golden.constants);
    expect(snap.misc).toEqual(golden.misc);
  });

  it('Geometrie, Knochen und Trikot jeder Figur bleiben', () => {
    expect(Object.keys(snap.models)).toEqual(Object.keys(golden.models));
    for (const [name, m] of Object.entries(snap.models)) expect(m, name).toEqual(golden.models[name]);
    expect(snap.atlas).toEqual(golden.atlas);
  });

  it('Posen bleiben über alle Bewegungsabläufe', () => {
    expect(Object.keys(snap.anims)).toEqual(Object.keys(golden.anims));
    for (const [name, a] of Object.entries(snap.anims)) expect(a, name).toEqual(golden.anims[name]);
  });
});
