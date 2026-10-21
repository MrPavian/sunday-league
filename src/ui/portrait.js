// Kleines Pixel-Porträt für Trainer-Bewerber und das Präsidium (nur Hautfarbe, Haare, Glatze, Bart – wie im Editor).
import { esc, hex } from './ds.js';

// look: { skin, hair, bald, beard } mit Farben als Zahl (names.js: SKIN_TONES, HAIR_COLORS). shirt: Jackenfarbe.
export function portraitSVG(look = {}, { size = 64, shirt = 0x2f6fb5, label = '' } = {}) {
  const skin = hex(look.skin ?? 0xe6b894);
  const hair = hex(look.hair ?? 0x4a3222);
  const dark = '#1c1c1c';
  const r = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const parts = [
    r(3, 19, 18, 5, hex(shirt)), // Schultern
    r(10, 16, 4, 4, skin), // Hals
    r(7, 5, 10, 12, skin), // Kopf
    !look.bald ? r(7, 3, 10, 4, hair) + r(6, 5, 1, 5, hair) + r(17, 5, 1, 5, hair) : r(6, 9, 1, 3, hair) + r(17, 9, 1, 3, hair), // Haare bzw. Haarkranz
    r(9, 10, 2, 2, dark) + r(13, 10, 2, 2, dark), // Augen
    r(10, 14, 4, 1, '#8a4a3a'), // Mund
    look.beard ? r(7, 13, 10, 4, hair) + r(10, 14, 4, 1, '#8a4a3a') : '',
  ];
  return `<svg class="portrait" viewBox="0 0 24 24" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}">${parts.join('')}</svg>`;
}
