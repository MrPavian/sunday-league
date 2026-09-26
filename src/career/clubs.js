// Die Freizeitliga Kanalbezirk – fünf Gegner mit typischen Hobbyliga-Namen.
// tiers verschiebt die Kaderstärke (stärkere Vereine haben mehr "Gute").
import { tr } from '../core/i18n.js';
export const LEAGUE_NAME = tr('Freizeitliga Kanalbezirk', 'Kanalbezirk Rec League');

export const AI_CLUBS = [
  {
    id: 'kiosk',
    name: 'FC Kiosk 04',
    short: 'K04',
    venue: 'parkplatz',
    kit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020, pattern: 'streifen', second: 0x1c1c1c },
    keeperKit: { shirt: 0x7a3fa0, shorts: 0x1c1c1c, socks: 0x7a3fa0 },
    tiers: { ok: 0.5, gut: 0.35, stark: 0.13, dorfstar: 0.02 },
  },
  {
    id: 'doener',
    name: 'Dynamo Döner',
    short: 'DYN',
    venue: 'hinterhof',
    kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xc8352f, pattern: 'brustring', second: 0xf2efe6 },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.6, gut: 0.3, stark: 0.09, dorfstar: 0.01 },
  },
  {
    id: 'lindenhof',
    name: 'Alte Herren Lindenhof',
    short: 'AHL',
    venue: 'ascheplatz',
    kit: { shirt: 0x2e6b3a, shorts: 0x1d2b20, socks: 0x2e6b3a, pattern: 'ringel', second: 0xf2efe6 },
    keeperKit: { shirt: 0xd8d0c0, shorts: 0x1c1c1c, socks: 0xd8d0c0 },
    tiers: { ok: 0.45, gut: 0.35, stark: 0.15, dorfstar: 0.05 },
  },
  {
    id: 'kanal',
    name: 'Kicker vom Kanal',
    short: 'KVK',
    venue: 'park',
    kit: { shirt: 0x2f6fb5, shorts: 0x1d2b44, socks: 0xf2efe6, pattern: 'haelften', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.55, gut: 0.33, stark: 0.1, dorfstar: 0.02 },
  },
  {
    id: 'laterne',
    name: 'Rote Laterne 1998',
    short: 'RL98',
    venue: 'ascheplatz',
    kit: { shirt: 0x8c2f2f, shorts: 0x2a2a2a, socks: 0x2a2a2a, pattern: 'nadel', second: 0xd8d0c0 },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.68, gut: 0.27, stark: 0.05 },
  },
];

export const HUMAN_CLUB_DEFAULT = {
  id: 'du',
  name: 'SV Sonntagsschuss',
  short: 'SVS',
  venue: 'hinterhof',
  kit: { shirt: 0xf2efe6, shorts: 0x1d2b44, socks: 0xf2efe6 },
  keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
  tiers: { ok: 0.6, gut: 0.32, stark: 0.08 },
};

// Kreisklasse C: 7 gegen 7, mit Schiri, auf Rasen und Asche.
export const KC_CLUBS = [
  {
    id: 'bwk',
    name: 'SV Blau-Weiß Kanalbezirk',
    short: 'BWK',
    venue: 'rasenplatz',
    kit: { shirt: 0x2f6fb5, shorts: 0xf2efe6, socks: 0x2f6fb5, pattern: 'schaerpe', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.35, gut: 0.4, stark: 0.2, dorfstar: 0.05 },
  },
  {
    id: 'eichenkamp',
    name: 'TuS Eichenkamp 1908',
    short: 'TUS',
    venue: 'ascheplatz',
    kit: { shirt: 0x2e6b3a, shorts: 0xf2efe6, socks: 0x2e6b3a, pattern: 'karo', second: 0xf2efe6 },
    keeperKit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c },
    tiers: { ok: 0.3, gut: 0.4, stark: 0.22, dorfstar: 0.07, superstar: 0.01 },
  },
  {
    id: 'hafenau',
    name: 'FC Germania Hafenau II',
    short: 'GHA',
    venue: 'rasenplatz',
    kit: { shirt: 0xc8352f, shorts: 0x1c1c1c, socks: 0x1c1c1c, pattern: 'chevron', second: 0x1c1c1c },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.4, gut: 0.38, stark: 0.18, dorfstar: 0.04 },
  },
  {
    id: 'muehlental',
    name: 'SpVgg Mühlental',
    short: 'SPV',
    venue: 'ascheplatz',
    kit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a, pattern: 'seiten', second: 0x1c1c1c },
    keeperKit: { shirt: 0x7a3fa0, shorts: 0x1c1c1c, socks: 0x7a3fa0 },
    tiers: { ok: 0.38, gut: 0.4, stark: 0.17, dorfstar: 0.05 },
  },
  {
    id: 'djk',
    name: 'DJK Sankt Martin',
    short: 'DJK',
    venue: 'ascheplatz',
    kit: { shirt: 0xd8d0c0, shorts: 0x2c4f8a, socks: 0x2c4f8a, pattern: 'schulter', second: 0x2c4f8a },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.45, gut: 0.38, stark: 0.14, dorfstar: 0.03 },
  },
];

// Kreisklasse B: 7 gegen 7, stärkere Gegner, mehr Zuschauer – hier wird's ernst.
export const KB_CLUBS = [
  {
    id: 'viktoria',
    name: 'SC Viktoria Oststadt',
    short: 'VIK',
    venue: 'rasenplatz',
    kit: { shirt: 0x6a2c8c, shorts: 0xf2efe6, socks: 0x6a2c8c, pattern: 'streifen', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.25, gut: 0.4, stark: 0.26, dorfstar: 0.08, superstar: 0.01 },
  },
  {
    id: 'eintracht',
    name: 'Eintracht Weserau',
    short: 'EWE',
    venue: 'rasenplatz',
    kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xc8352f, pattern: 'schaerpe', second: 0x1c1c1c },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.28, gut: 0.4, stark: 0.24, dorfstar: 0.07, superstar: 0.01 },
  },
  {
    id: 'grunwald',
    name: 'TuS Grünwald 1911',
    short: 'TGW',
    venue: 'ascheplatz',
    kit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57, pattern: 'ringel', second: 0x1c1c1c },
    keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
    tiers: { ok: 0.3, gut: 0.42, stark: 0.21, dorfstar: 0.07 },
  },
  {
    id: 'hansa',
    name: 'SV Hansa Möwenkap',
    short: 'HMK',
    venue: 'rasenplatz',
    kit: { shirt: 0x1d3b6e, shorts: 0x1d3b6e, socks: 0xf2efe6, pattern: 'brustring', second: 0xe0b020 },
    keeperKit: { shirt: 0xd8d0c0, shorts: 0x1c1c1c, socks: 0xd8d0c0 },
    tiers: { ok: 0.32, gut: 0.4, stark: 0.21, dorfstar: 0.06, superstar: 0.01 },
  },
  {
    id: 'reserve',
    name: 'Borussia Nordhafen III',
    short: 'BN3',
    venue: 'rasenplatz',
    kit: { shirt: 0xe0c020, shorts: 0x1c1c1c, socks: 0xe0c020, pattern: 'nadel', second: 0x1c1c1c },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.35, gut: 0.4, stark: 0.2, dorfstar: 0.05 },
  },
];

export const MAX_LEVEL = 3;

export const LEAGUES = {
  1: { level: 1, name: LEAGUE_NAME, referee: false, format: null, humanVenue: 'hinterhof', clubs: AI_CLUBS, squadShape: 'small', maxSquad: 12, derby: { club: 'kanal', name: tr('Kanal-Derby', 'Canal Derby') } },
  2: { level: 2, name: tr('Kreisklasse C Kanalbezirk', 'Kanalbezirk District League C'), referee: true, format: 7, humanVenue: 'rasenplatz', clubs: KC_CLUBS, squadShape: 'large', maxSquad: 16, derby: { club: 'bwk', name: tr('Bezirks-Derby', 'District Derby') } },
  3: { level: 3, name: tr('Kreisklasse B Kanalbezirk', 'Kanalbezirk District League B'), referee: true, format: 7, humanVenue: 'rasenplatz', clubs: KB_CLUBS, squadShape: 'large', maxSquad: 16, derby: { club: 'viktoria', name: tr('Stadtderby', 'City Derby') } },
};
