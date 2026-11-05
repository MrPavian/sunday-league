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
// Profiligen über der Oberliga (Regionalliga 9 bis 1. Liga 12): 15 Punkte je Liga, Konzept Abschnitt 10, Spielwerte (pokal.js).
export const PRO_TARGET = { 9: 141, 10: 156, 11: 171, 12: 186 };
// Aufschlag je Niveau 1–10; Niveau 9 und 10 (Regionalliga, 3. Liga) gibt es nur für Spieler, die ein Profiverein holt (career.proNiv,
// Konzept Profiligen) – der Pool selbst bleibt bei 1–8.
export const NIVEAU_LIFT = [...NIVEAU_TARGET, PRO_TARGET[9], PRO_TARGET[10]].map((t, i) => (i === 0 ? 0 : t - NIVEAU_BASE));
export const TOP_NIVEAU = NIVEAU_LIFT.length;
// Wirkung eines Stärkepunkts in der Engine je Niveau der Partie (mittlere Stärke m), gemessen (Konzept 12.5, pokal.js quickSlope):
// 0,051 (Niveau 1 gg 2, Ø 64), 0,049 (4 gg 5, Ø 89), 0,033 (7 gg 8, Ø 128); dazwischen linear, darunter und darüber konstant.
export const SLOPE = { low: 0.05, high: 0.033, from: 89, to: 128 };
export const slopeAt = (m) => (m <= SLOPE.from ? SLOPE.low : m >= SLOPE.to ? SLOPE.high : SLOPE.low - ((m - SLOPE.from) / (SLOPE.to - SLOPE.from)) * (SLOPE.low - SLOPE.high));
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

// Welche Werte der Aufschlag hebt: Feldspieler alle Technikwerte außer dem Torwartspiel (sonst stellte die Aufstellung einen
// Verteidiger ins Tor, position.test), Torhüter nur ihre eigenen (Torwartspiel, Passen, Technik).
const GK_LIFT = new Set(['keeping', 'passing', 'technique']);
const liftsAttr = (pos, k) => !PHYS_ATTRS.has(k) && (pos === 'gk' ? GK_LIFT.has(k) : k !== 'keeping');

// Spieler im neuen Modell: Technikwerte um den Aufschlag seines Niveaus angehoben, Stärke ohne Deckel. Pool-Spieler sind fest –
// das Ergebnis wird je Spieler zwischengespeichert (playerOf ruft es sehr oft; ohne Speicher liefen Tests in Zeitüberschreitung).
const liftCache = new WeakMap();
const proCache = new WeakMap();
export function lifted(p, niveau) {
  if (niveau == null) {
    let q = liftCache.get(p);
    if (!q) liftCache.set(p, (q = liftNow(p, niveauOf(p.poolIndex))));
    return q;
  }
  return liftNow(p, niveau);
}
// Wie lifted, mit festem Niveau und Speicher (Profispieler, playerOf).
export function liftedAt(p, niveau) {
  let m = proCache.get(p);
  if (!m) proCache.set(p, (m = new Map()));
  let q = m.get(niveau);
  if (!q) m.set(niveau, (q = liftNow(p, niveau)));
  return q;
}
function liftNow(p, niveau) {
  const lift = NIVEAU_LIFT[Math.max(1, Math.min(TOP_NIVEAU, niveau)) - 1];
  if (!lift) return { ...p, niveau, rating: ratePlayer(p, Infinity) };
  const d = lift / (100 * techShare(p.position));
  const attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, liftsAttr(p.position, k) ? v + d : v]));
  const q = { ...p, attrs, niveau };
  q.rating = ratePlayer(q, Infinity);
  return q;
}
