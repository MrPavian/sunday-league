// Stufen für Vereinswerte (AFS Phase 4, gemeinsam genutzt von Anzeige und KI-Kern): deutlich mehr / im Schnitt / deutlich
// weniger als ein Vergleichswert, aus der Streuung je Spiel (Phase 3, docs/ADVANCED-FOOTBALL-SYSTEM-03-VALIDATION.md
// Abschnitt 2: Basis-SD, Rasenplatz und Großfeld gemittelt) und der Zahl der Spiele.
//   passPct – Passquote einer Mannschaft, ab 8 Spielen; SD 0,065 je Spiel
//   packing – überspielte Gegner je angekommenem Pass, Streuung relativ zum Mittel 0,2 je Spiel
//   xg      – xG einer Mannschaft je Spiel, Streuung relativ 0,45 je Spiel
//   tilt    – Feldvorteil (Anteil am Ballbesitz im letzten Drittel), SD 0,12 je Spiel
//   clubMin – vorher keine Stufen (Spielwert)
export const LEVELS = { passPctMin: 8, sdPassPct: 0.065, relPacking: 0.2, relXg: 0.45, sdTilt: 0.12, clubMin: 3, z: 1.96 };

// z-Wert eines Saisonmittels gegen den Vergleichswert (null ohne Daten).
export function zScore(value, ref, sdPerMatch, n) {
  if (value == null || ref == null || !(n > 0) || !(sdPerMatch > 0)) return null;
  return (value - ref) / (sdPerMatch / Math.sqrt(n));
}
export function level(value, ref, sdPerMatch, n) {
  const z = zScore(value, ref, sdPerMatch, n);
  return z == null ? null : z >= LEVELS.z ? 'more' : z <= -LEVELS.z ? 'less' : 'avg';
}
