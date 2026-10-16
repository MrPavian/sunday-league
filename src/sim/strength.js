// Körper („strength"): Wert 0…1 wie alle Fähigkeiten, ein Spielwert ohne reale Messgröße.
// Er entscheidet Schulterduelle, Abschirmen im Stehen, Festhalten und Kopfballduelle; die Technik bleibt der
// Hauptfaktor beim Dribbeln. Alle Wirkungen sind um den Mittelwert 0,5 gebaut (Differenzen bzw. 0,5 als Mitte):
// ein Spiel unter Durchschnittsleuten verschiebt sich dadurch kaum, nur Stärkere gegen Schwächere merken es.
import { clamp } from '../core/math.js';
import { createRng } from '../core/rng.js';

export const STRENGTH_DEFAULT = 0.5;

// Alle Fähigkeitsschlüssel (Reihenfolge der Anzeige). Der Würfelfluss des Generators bleibt bei den acht alten
// (siehe generator.js ROLL_ATTRS): ein neuer Schlüssel in der Schleife würde den Zufallsstrom des Pools verschieben.
export const ATTR_KEYS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping', 'strength'];

// Wirkung des Körpers. Spielwerte, gewählt – nicht gemessen; die Wirkung der Summe auf Tore, Ballwechsel usw. steht im
// Messbericht (docs/agent/pingpong-audit-2026-10.md, Abschnitt „Körper“). Spreizung der Werte im Pool: Mittel 0,50, 1 sigma 0,10
// (gemessen am Standardpool, 25.000 Spieler); ein Unterschied von 0,2 zwischen zwei Spielern ist also schon deutlich.
export const STRENGTH_FX = {
  // Klauchance bei Berührung (shielded): + duel * (Körper Angreifer − Körper Ballführer). 0,4 → bei Diff 0,2: ±0,08.
  duel: 0.4,
  // Abschirmen im Stehen (carrier.shielding): vorher fest 0,2, jetzt base + perStrength * Körper (bei 0,5 wieder 0,2;
  // Körper 0,3 → 0,12, Körper 0,7 → 0,28). Hier ist der Körper der Hauptfaktor, nicht die Technik.
  shieldBase: 0.0,
  shieldPerStrength: 0.4,
  // Stochern (tackles.js): + poke * (Körper Stocherer − Körper Ballführer); Abschirmen des Ballführers 0,25 → base + per * Körper.
  poke: 0.3,
  pokeShieldBase: 0.0,
  pokeShieldPerStrength: 0.5,
  // Festhalten (holding.js): Tempo des Gehaltenen = heldBase − held * (Körper Halter − Körper Gehaltener), begrenzt.
  heldBase: 0.45,
  held: 0.2,
  heldMin: 0.3,
  heldMax: 0.6,
  // Kopfballduell mit Gegner im Nacken (actions.js headerTouch): Faktor = HEAD_DUEL.factor + head * (Körper − Körper des Deckers).
  head: 0.3,
};

// Ping-Pong-Bremse (docs/agent/pingpong-audit-2026-10.md, Abschnitt 3, Varianten A und B). Prototypwerte des Audits,
// nicht aus einer Quelle: 0,6 s Sperre für den Verlierer (A) und 0,6 s Schutz des Gewinners mit halber Klauchance (B).
export const PINGPONG = {
  loserLock: 0.6, // s: wer den Ball per Berührung verliert, darf ihn so lange nicht per Berührung zurückholen (A)
  winnerProtect: 0.6, // s: der neue Ballführer ist so lange geschützt (B)
  protectedStealMul: 0.5, // Faktor auf die Klauchance während des Schutzes (B)
  tackleLock: 0, // s: Verlierer eines gewonnenen Stochern/einer Grätsche (Variante C, siehe Messbericht)
};

// Körper eines Spielers im Spiel; alte Spielstände und Testfiguren ohne Wert bekommen die Mitte.
export const strengthOf = (p) => p?.attrs?.strength ?? STRENGTH_DEFAULT;

// Stabiler Zufall aus Name und Aussehen (FNV-1a), ohne den Zufallsstrom des Spiels zu berühren.
function hashOf(p) {
  const look = p.look ?? {};
  const s = `${p.name ?? ''}|${look.skin ?? 0}|${look.hair ?? 0}|${Math.round((look.height ?? 1) * 1000)}|${Math.round((look.belly ?? 0) * 1000)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

// Position: Abwehr und Sturm etwas kräftiger (Zweikämpfe, Kopfbälle, Ball halten), Mittelfeld neutral.
const POSITION_BONUS = { def: 0.05, fwd: 0.02, gk: 0.02, mid: 0 };

// Körper aus dem, was ein Spieler schon hat (Größe, Bauch, Alter, Position) plus ein stabiler Zufall.
// Dieselbe Funktion erzeugt den Wert bei neuen Spielern und rüstet alte Spielstände nach – ohne Zufallsstrom, also
// deterministisch aus Name und Aussehen.
//   Größe:  look.height 0,93…1,07 → ±0,06 (größer = mehr Hebel und Masse)
//   Bauch:  look.belly 0…0,9 → bis +0,07 (mehr Masse hält den Gegner weg; Tempo/Ausdauer bleiben davon unberührt)
//   Alter:  unter 24 noch nicht ausgewachsen (−0,015 je Jahr), ab 33 langsam abbauend (−0,008 je Jahr)
//   Zufall: ±0,08 (1 sigma); Mitte 0,48, damit der Pool im Mittel bei 0,5 liegt (gemessen, siehe Messbericht)
export function deriveStrength(p) {
  const look = p.look ?? {};
  const age = p.age ?? 27;
  const ageTerm = age < 24 ? -0.015 * (24 - age) : age > 32 ? -0.008 * (age - 32) : 0;
  const noise = createRng(hashOf(p)).gauss() * 0.08;
  const v = 0.48 + 0.9 * ((look.height ?? 1) - 1) + 0.08 * (look.belly ?? 0.2) + (POSITION_BONUS[p.position] ?? 0) + ageTerm + noise;
  return clamp(v, 0.08, 0.92);
}

// Fehlenden Körper nachtragen (alte Spielstände, handgebaute Figuren). Gibt true zurück, wenn etwas geändert wurde.
export function ensureStrength(p) {
  if (!p?.attrs || p.attrs.strength != null) return false;
  p.attrs.strength = deriveStrength(p);
  return true;
}
