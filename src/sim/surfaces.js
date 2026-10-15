// Untergründe bestimmen Ballphysik und Zweikampfverhalten. Auf harten Böden
// grätscht niemand freiwillig – wer es trotzdem tut, holt sich was.
import { tr } from '../core/i18n.js';
export const SURFACES = {
  asphalt: {
    id: 'asphalt',
    name: tr('Asphalt', 'tarmac'),
    hard: true,
    rollFriction: 0.55, // exponentielle Abbremsung pro Sekunde
    rollDecel: 0.45, // konstante Abbremsung m/s²
    // Rückprallzahl e (Höhe aus 2 m ≈ e² · 2 m). Vorher 0,55 (gemessen 0,57 m); Beton liegt real bei e ≈ 0,825 / 1,35 m
    // (FIFA-Test, Colino et al. 2020, Sensors 20(6):1688, https://pmc.ncbi.nlm.nih.gov/articles/PMC7146741). Asphalt ist etwas
    // weicher als Beton – ohne eigene Quelle bewusst darunter gesetzt (0,72 → rund 1,0 m aus 2 m, Mess­wert mech-audit phys).
    bounce: 0.72,
    bumpiness: 0.04, // Chance pro Ballkontakt, dass der Ball verspringt
    slideDamp: 7, // Grätsche kommt kaum ins Rutschen
    scrapeChance: 0.7,
    scrapeLabel: tr('Schürfwunde', 'graze'),
  },
  concrete: {
    id: 'concrete',
    name: tr('Betonplatten', 'paving slabs'),
    hard: true,
    rollFriction: 0.5,
    rollDecel: 0.4,
    // Vorher 0,6 (gemessen 0,68 m aus 2 m). Real: Beton e ≈ 0,825 / 1,35 m (Colino et al. 2020, a. a. O.); 0,78 bleibt bewusst
    // darunter, weil der Ball im Spiel auch Fugen und Schmutz trifft (rund 1,15 m aus 2 m).
    bounce: 0.78,
    bumpiness: 0.06, // Fugen
    slideDamp: 7.5,
    scrapeChance: 0.75,
    scrapeLabel: tr('Schürfwunde', 'graze'),
  },
  ash: {
    id: 'ash',
    name: tr('Asche', 'cinders'),
    hard: true,
    rollFriction: 0.8,
    rollDecel: 0.7,
    bounce: 0.45,
    bumpiness: 0.1,
    slideDamp: 4.5,
    scrapeChance: 0.55,
    scrapeLabel: tr('Asche im Knie', 'cinders in the knee'),
  },
  grass: {
    id: 'grass',
    name: tr('Rasen', 'grass'),
    hard: false,
    rollFriction: 0.7,
    rollDecel: 0.6,
    bounce: 0.5,
    bumpiness: 0.07,
    slideDamp: 2.5,
    scrapeChance: 0,
    scrapeLabel: null,
  },
  parkGrass: {
    id: 'parkGrass',
    name: tr('Parkwiese', 'park lawn'),
    hard: false,
    rollFriction: 0.95, // langes Gras bremst
    rollDecel: 0.8,
    bounce: 0.45,
    bumpiness: 0.14, // Maulwurfshügel & Buckel
    slideDamp: 2.8,
    scrapeChance: 0,
    scrapeLabel: null,
  },
  hall: {
    id: 'hall',
    name: tr('Hallenboden', 'hall floor'),
    hard: true,
    rollFriction: 0.42, // glatt – der Ball läuft und läuft
    rollDecel: 0.35,
    // Futsal-Ball: erster Aufprall aus 2 m zwischen 50 und 65 cm (IFAB/FA Futsal-Regel 2,
    // https://www.thefa.com/football-rules-governance/lawsandrules/laws/futsal/law-2---the-ball). Vorher 0,68 (gemessen 0,87 m);
    // 0,55 trifft die Mitte der Spanne (mech-audit phys: rund 0,57 m).
    bounce: 0.55,
    bumpiness: 0.005,
    slideDamp: 3.2, // man rutscht weit – und verbrennt sich
    scrapeChance: 0.45,
    scrapeLabel: tr('Hallenbrand', 'floor burn'),
  },
  artificial: {
    id: 'artificial',
    name: tr('Kunstrasen', 'artificial turf'),
    hard: false,
    rollFriction: 0.45,
    rollDecel: 0.4,
    bounce: 0.6,
    bumpiness: 0.01,
    slideDamp: 2.2,
    scrapeChance: 0.15,
    scrapeLabel: tr('Kunstrasen-Verbrennung', 'turf burn'),
  },
};
