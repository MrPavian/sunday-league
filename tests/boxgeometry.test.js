import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boxGeometry } from '../src/render/PlayerModel.js';

// Phase E: Die Körperteile entstehen aus einer skalierten Einheitsbox statt je Teil aus einer
// neuen BoxGeometry. Das muss bitgleich sein – sonst ändern sich Figuren sichtbar.
describe('boxGeometry', () => {
  const sizes = [[1, 1, 1], [0.135, 0.08, 0.15], [0.1, 0.07, 0.02], [0.3171, 0.0123, 0.9], [2.5, 0.001, 1e-4]];
  for (let i = 0; i < 40; i++) sizes.push([0.01 + ((i * 37) % 97) / 131, 0.01 + ((i * 53) % 89) / 173, 0.01 + ((i * 71) % 83) / 199]);
  it('entspricht BoxGeometry(w, h, d).toNonIndexed() exakt', () => {
    for (const [w, h, d] of sizes) {
      const ref = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      const g = boxGeometry(w, h, d);
      for (const k of ['position', 'normal', 'uv']) {
        expect(g.attributes[k].itemSize).toBe(ref.attributes[k].itemSize);
        expect(Array.from(g.attributes[k].array)).toEqual(Array.from(ref.attributes[k].array));
      }
      expect(g.index).toBeNull();
    }
  });
  it('liefert je Aufruf eigene Puffer (Teile werden danach verschoben)', () => {
    const a = boxGeometry(1, 2, 3);
    const b = boxGeometry(1, 2, 3);
    a.translate(1, 0, 0);
    expect(b.attributes.position.array[0]).not.toBe(a.attributes.position.array[0]);
  });
});
