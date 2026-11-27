// Spielintelligenz (AFS Phase 6b, Entscheidung E6): Antizipation, Übersicht, Stellungsspiel. Werte 0…1 wie alle Fähigkeiten,
// Spielwerte ohne reale Messgröße. Fehler-Modell (Nutzerentscheid 2026-11-27, nach zwei Messungen „um die Mitte“ ohne Vorteil):
// Die Engine ließ jeden Spieler bisher fehlerfrei lesen und stehen. Ein starker Wert (ab MIND_FX.hi) spielt wie bisher, ein schwacher
// macht Fehler – Schwäche w = (hi − Wert) / (hi − lo), begrenzt auf 0…1.
//   Antizipation – startet später zum freien Ball (ai.js reachSpot, ANTICIPATE) und schaltet beim Steilpass später um (actions.js)
//   Übersicht    – übersieht den Steilpass oder den freien Mitspieler öfter (ai.js aiDecide)
//   Stellungsspiel – wird vom Ball angezogen und verlässt seinen Raum/Mann; braucht nach Ballverlust länger zurück (ai.js updateTactics)
// Die Stärke (generator.js ratePlayer) rechnet sie nicht ein (Nutzerentscheid: erst messen). Sie steigen nicht mit dem Niveau
// (niveau.js liftsAttr): oberhalb von hi gibt es keinen weiteren Vorteil.
import { clamp } from '../core/math.js';
import { createRng } from '../core/rng.js';

// Schalter der Schicht: aus = keine Fehler (Verhalten wie vor Phase 6b). Standard aus (Nutzerentscheid 2026-11-27): drei Messungen
// ohne Vorteil für bessere Werte; die Zonendeckung der Engine ist der offene Punkt (docs/ADVANCED-FOOTBALL-SYSTEM-06B-MIND.md).
// Aus wirkt auch auf die Entwicklung (career.js developPlayers): die Werte bleiben, wie sie hergeleitet sind.
export const MIND = { on: false };
export const MIND_KEYS = ['anticipation', 'vision', 'positioning'];
export const MIND_SET = new Set(MIND_KEYS);
export const MIND_DEFAULT = 0.5;

// Wirkung (Spielwerte, gewählt – nicht gemessen; Messung in docs/ADVANCED-FOOTBALL-SYSTEM-06B-MIND.md):
//   hi, lo – ab hi keine Fehler, bei lo und darunter volle Schwäche
//   react  – Reaktionszeit bei Abprallern: ANTICIPATE.react + react · w (0,2 s → bis 0,45 s)
//   read   – Schrecksekunde der Abwehr beim Steilpass: m.pass.react + read · (Mittel w der Verteidiger)
//   see    – Chance, den offenen Steilpass zu sehen: · (1 − see · w)
//   open   – Chance, den freien Mitspieler vorn zu sehen: · (1 − open · w)
//   pull   – Ziel gegen den Ball (zone/mark) rückt um pull · w des Wegs zum Ball
//   caught – Zeit nach Ballverlust, die er aus dem Spiel ist (CAUGHT_TIME): · (1 + caught · w)
export const MIND_FX = { hi: 0.75, lo: 0.15, react: 0.25, read: 0.3, see: 0.6, open: 0.5, pull: 0.3, caught: 0.6 };

// Wert im Spiel: Schicht aus, alte Spielstände und Testfiguren ohne Wert → Mitte.
export const mindOf = (p, k) => (MIND.on ? p?.attrs?.[k] ?? MIND_DEFAULT : MIND_DEFAULT);
// Schwäche 0…1 (0 = fehlerfrei wie vor Phase 6b); Schicht aus → 0.
export const mindWeak = (p, k) => (MIND.on ? clamp((MIND_FX.hi - mindOf(p, k)) / (MIND_FX.hi - MIND_FX.lo), 0, 1) : 0);

// Stabiler Zufall aus Aussehen und Alter (FNV-1a) – ohne den Zufallsstrom des Spiels oder des Pools zu berühren. Ohne Namen
// (Nutzerentscheid 2026-11-27): eine neue Namens-Auflage ändert die Werte nicht (tests/names_origin.test.js).
function hashOf(p) {
  const look = p.look ?? {};
  const s = `mind|${p.age ?? 0}|${look.skin ?? 0}|${look.hair ?? 0}|${Math.round((look.height ?? 1) * 1000)}|${Math.round((look.belly ?? 0) * 1000)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

// Herleitung (Spielwert): verwandte Werte, Erfahrung, stabiler Zufall.
//   verwandt: Antizipation ½ Zweikampf + ½ Technik, Übersicht 0,6 Passen + 0,4 Technik, Stellungsspiel 0,6 Zweikampf + 0,4 Kopfball;
//             Anteil REL der Abweichung vom Pool-Mittel REL_MEAN (gemessen am Standardpool, scripts/afs-mind.mjs)
//   Erfahrung: +AGE je Jahr um AGE_MID (18…34 begrenzt; Mitte nahe dem Pool-Mittel) – Spielverständnis wächst mit den Jahren, baut nicht ab
//   Zufall: ±0,08 (1 sigma) je Wert
const REL = 0.5;
const AGE = 0.006;
const AGE_MID = 28;
export const REL_MEAN = { anticipation: 0.449, vision: 0.456, positioning: 0.442 };
const related = (a, k) => (k === 'anticipation' ? 0.5 * a.tackling + 0.5 * a.technique : k === 'vision' ? 0.6 * a.passing + 0.4 * a.technique : 0.6 * a.tackling + 0.4 * a.heading);

export function deriveMind(p) {
  const a = p.attrs ?? {};
  const rng = createRng(hashOf(p));
  const age = clamp(p.age ?? AGE_MID, 18, 34) - AGE_MID;
  const out = {};
  for (const k of MIND_KEYS) {
    const rel = related({ tackling: a.tackling ?? 0.5, technique: a.technique ?? 0.5, passing: a.passing ?? 0.5, heading: a.heading ?? 0.5 }, k);
    out[k] = clamp(MIND_DEFAULT + REL * (Math.min(1, rel) - REL_MEAN[k]) + AGE * age + rng.gauss() * 0.08, 0.08, 0.92);
  }
  return out;
}

// Fehlende Werte nachtragen (alte Spielstände, handgebaute Figuren). Gibt true zurück, wenn etwas geändert wurde.
export function ensureMind(p) {
  if (!p?.attrs || MIND_KEYS.every((k) => p.attrs[k] != null)) return false;
  const d = deriveMind(p);
  for (const k of MIND_KEYS) p.attrs[k] ??= d[k];
  return true;
}
// Werte neu ableiten (Alter/Name/Aussehen wurden nach dem Würfeln überschrieben, wie bei deriveStrength).
export const withMind = (p) => ({ ...p.attrs, ...deriveMind(p) });
