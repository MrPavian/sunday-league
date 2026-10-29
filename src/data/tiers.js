// Spielerklassen im Pool. weight = relative Häufigkeit, range = Bereich der
// Grundattribute, traits = Wahrscheinlichkeiten für 0/1/2/3 Besonderheiten.
import { tr } from '../core/i18n.js';
export const TIERS = [
  {
    id: 'ok',
    name: 'OK',
    desc: tr('Kickt halt mit. Solide, wenn er nicht gerade Spätschicht hat.', 'Just plays along. Solid, unless he is on the late shift.'),
    color: '#9aa3ab',
    weight: 0.55,
    range: [0.22, 0.5],
    traits: [0.7, 0.27, 0.03, 0],
    age: [17, 44],
  },
  {
    id: 'gut',
    name: tr('Gut', 'Good'),
    desc: tr('Stammspieler in jeder Kreisklasse.', 'A regular in any district league.'),
    color: '#6fbf73',
    weight: 0.28,
    range: [0.34, 0.6],
    traits: [0.55, 0.37, 0.08, 0],
    age: [18, 40],
  },
  {
    id: 'stark',
    name: tr('Stark', 'Strong'),
    desc: tr('Leistungsträger. Um den bauen andere Teams ihr Spiel.', 'Key player. Other teams build their game around him.'),
    color: '#4fa3e0',
    weight: 0.12,
    range: [0.45, 0.7],
    traits: [0.35, 0.45, 0.2, 0],
    age: [19, 38],
  },
  {
    id: 'dorfstar',
    name: tr('Dorfstar', 'Village star'),
    desc: tr('Den kennt im Ort jeder. Torschützenkönig, Vereinsikone, Stammgast im Vereinsheim.', 'Everyone in town knows him. Top scorer, club icon, regular at the clubhouse bar.'),
    color: '#b57be0',
    weight: 0.042,
    range: [0.56, 0.78],
    traits: [0.1, 0.5, 0.35, 0.05],
    age: [21, 38],
  },
  {
    id: 'superstar',
    name: 'Superstar',
    desc: tr('Hat mal höher gespielt – Oberliga, Regionalliga, Jugend eines Profivereins.', 'Used to play higher up – semi-pro leagues or a pro club academy.'),
    color: '#f0b429',
    weight: 0.0076,
    range: [0.66, 0.86],
    traits: [0, 0.35, 0.5, 0.15],
    age: [25, 39],
  },
  {
    id: 'legende',
    name: tr('Ex-Profi', 'Ex-pro'),
    desc: tr('Karriere vorbei, will einfach nur kicken. Superselten.', 'Career over, just wants to play. Super rare.'),
    color: '#ff6b5a',
    weight: 0.0004,
    range: null, // kommt aus dem Archetyp
    traits: null,
    age: [32, 42],
  },
];

export const tierById = (id) => TIERS.find((t) => t.id === id);

export function rollTier(rng, weights = null) {
  const list = TIERS.map((t) => ({ t, w: weights?.[t.id] ?? t.weight }));
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total;
  for (const { t, w } of list) {
    if ((r -= w) < 0) return t;
  }
  return TIERS[0];
}

// --- Zuzug nach Liga-Stufe ----------------------------------------------------------------
// Wer neu zum Verein stößt (Gerüchte, Wirt, Probetraining, Ereignisse), soll zur Liga passen: unten
// überwiegend ok/gut, Top-Leute selten, Superstar und Ex-Profi erst weiter oben. Mit jedem Aufstieg
// verschiebt sich die Verteilung nach oben. EINE Tabelle für alle Wege; die Wege unterscheiden sich
// nur durch ARRIVAL_SOURCES. Alle Zahlen sind erfundene Spielwerte (angelehnt an die Gegnerkader in
// clubs.js, Zuzug im Schnitt etwas schwächer als die Gegner), keine Realwerte. Gemessen mit
// scripts/stufen-audit.mjs.
export const ARRIVAL_BASE = {
  1: { ok: 0.55, gut: 0.35, stark: 0.092, dorfstar: 0.008, superstar: 0, legende: 0 },
  2: { ok: 0.42, gut: 0.39, stark: 0.15, dorfstar: 0.035, superstar: 0.005, legende: 0 },
  3: { ok: 0.31, gut: 0.4, stark: 0.21, dorfstar: 0.07, superstar: 0.01, legende: 0 },
  4: { ok: 0.26, gut: 0.36, stark: 0.23, dorfstar: 0.1, superstar: 0.035, legende: 0.007 }, // wie bisher
  5: { ok: 0.14, gut: 0.33, stark: 0.3, dorfstar: 0.16, superstar: 0.06, legende: 0.01 }, // wie bisher
  // Stufen 6–8 HERGELEITET (Nutzerentscheid 2026-10-29): Stufe 5 plus ein, zwei bzw. drei Drittel des Unterschieds zwischen den
  // Gegnerkadern der Bezirks- und der Oberliga (clubs.js BZ_CLUBS → OL_CLUBS) – Zuzug bleibt so etwas schwächer als die Gegner.
  6: { ok: 0.123, gut: 0.28, stark: 0.303, dorfstar: 0.197, superstar: 0.084, legende: 0.013 },
  7: { ok: 0.106, gut: 0.23, stark: 0.307, dorfstar: 0.233, superstar: 0.109, legende: 0.015 },
  8: { ok: 0.09, gut: 0.18, stark: 0.31, dorfstar: 0.269, superstar: 0.133, legende: 0.018 },
};
// floor: schwächere Stufen entfallen; lift: je Stufe über dem floor (bzw. über ok) mal lift;
// hi: höchste erlaubte Stufe dieses Wegs, egal in welcher Liga.
export const ARRIVAL_SOURCES = {
  geruecht: {}, // Gerüchteküche und Werben
  wirt: { floor: 'gut', lift: 1.5, hi: 'dorfstar' }, // Tipp vom Wirt / Überläufer: eher die Besseren
  probetraining: { hi: 'superstar' }, // Open Training: wer eben vorbeikommt
  kind: { floor: 'gut', hi: 'stark' }, // Talent aus der Nachbarschaft (Ereignis)
  comeback: { floor: 'gut', hi: 'dorfstar' }, // Rückkehrer nach Verletzungspause
};

// Gewichte (Summe 1, alle sechs Stufen als Schlüssel) für einen Zuzug in dieser Liga-Stufe auf diesem Weg.
export function tierWeightsFor(level, source = 'geruecht') {
  const base = ARRIVAL_BASE[Math.max(1, Math.min(8, level || 1))];
  const s = ARRIVAL_SOURCES[source] ?? {};
  const ids = TIERS.map((t) => t.id);
  const lo = s.floor ? ids.indexOf(s.floor) : 0;
  const hi = s.hi ? ids.indexOf(s.hi) : ids.length - 1;
  const w = {};
  let sum = 0;
  ids.forEach((id, i) => {
    w[id] = i >= lo && i <= hi ? base[id] * (s.lift ?? 1) ** (i - lo) : 0;
    sum += w[id];
  });
  if (!sum) w[ids[Math.max(lo, 0)]] = sum = 1; // Notfall: nie leer
  for (const id of ids) w[id] /= sum;
  return w;
}
