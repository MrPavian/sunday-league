// Niveau je Spieler (docs/KONZEPT-SPIELERSTAERKE.md 12.5, Nutzerentscheid 2026-10-31): Zusätzlich zur Klasse (OK bis Ex-Profi) hat
// jeder Pool-Spieler ein festes Niveau 1–8 (Freizeitliga bis Oberliga). Im neuen Stärkemodell (Kennung strength: 3) steigen seine
// Technikwerte so, dass seine Stärke genau um den Aufschlag seines Niveaus wächst; Tempo, Ausdauer und Körper bleiben (echte m/s).
// Das Niveau kommt aus einem eigenen Zufall über die Pool-Nummer – die Pool-Spieler selbst bleiben unverändert.
// Ziele, Aufschläge und Anteile sind Spielwerte (unten kleinere Abstände, Nutzerentscheid 2026-10-29/30).
import { createRng } from '../core/rng.js';
import { RATING_WEIGHTS, ratePlayer } from './generator.js';
import { PHYS_ATTRS } from './skill.js';

export const NIVEAU_TARGET = [51, 57, 64, 73, 84, 97, 111, 126]; // Ligamittel der besten n je Niveau 1–8
export const NIVEAU_BASE = 51.5; // heutiges Mittel der Freizeitliga (gemessen, Konzept 12.5) – darauf setzen die Aufschläge auf
export const NIVEAU_LIFT = NIVEAU_TARGET.map((t, i) => (i === 0 ? 0 : t - NIVEAU_BASE));
export const NIVEAU_SHARE = [0.3, 0.22, 0.16, 0.12, 0.08, 0.06, 0.04, 0.02]; // Anteil im Pool, wie eine Pyramide (Spielwert)

const hash = (i) => (Math.imul((i + 1) ^ 0x5bd1e995, 0x9e3779b1) + 0x2545f491) >>> 0;
const cache = new Map();
export function niveauOf(poolIndex) {
  if (cache.has(poolIndex)) return cache.get(poolIndex);
  const u = createRng(hash(poolIndex)).next();
  let acc = 0;
  let n = NIVEAU_SHARE.length;
  for (let i = 0; i < NIVEAU_SHARE.length; i++) {
    acc += NIVEAU_SHARE[i];
    if (u < acc) {
      n = i + 1;
      break;
    }
  }
  cache.set(poolIndex, n);
  return n;
}

// Anteil der Technikwerte an der Stärke je Position (Gewichte ohne Tempo, Ausdauer, Körper).
const techShare = (pos) => Object.entries(RATING_WEIGHTS[pos] ?? RATING_WEIGHTS.mid).reduce((s, [k, w]) => s + (PHYS_ATTRS.has(k) ? 0 : w), 0);

// Spieler im neuen Modell: Technikwerte um den Aufschlag seines Niveaus angehoben, Stärke ohne Deckel.
export function lifted(p, niveau = niveauOf(p.poolIndex)) {
  const lift = NIVEAU_LIFT[Math.max(1, Math.min(8, niveau)) - 1];
  if (!lift) return { ...p, niveau, rating: ratePlayer(p, Infinity) };
  const d = lift / (100 * techShare(p.position));
  const attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, PHYS_ATTRS.has(k) ? v : v + d]));
  const q = { ...p, attrs, niveau };
  q.rating = ratePlayer(q, Infinity);
  return q;
}
