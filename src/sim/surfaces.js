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
    bounce: 0.55,
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
    bounce: 0.6,
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
    bounce: 0.68,
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
