// Die Freizeitliga Kanalbezirk – fünf Gegner mit typischen Hobbyliga-Namen.
// tiers verschiebt die Kaderstärke (stärkere Vereine haben mehr "Gute").
import { tr } from '../core/i18n.js';
export const LEAGUE_NAME = tr('Freizeitliga Kanalbezirk', 'Canal District Sunday League');

export const AI_CLUBS = [
  {
    id: 'kiosk',
    name: tr('FC Kiosk 04', "Corner Shop FC"),
    short: tr('K04', 'CSF'),
    venue: 'parkplatz',
    kit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020, pattern: 'streifen', second: 0x1c1c1c },
    keeperKit: { shirt: 0x7a3fa0, shorts: 0x1c1c1c, socks: 0x7a3fa0 },
    tiers: { ok: 0.5, gut: 0.35, stark: 0.13, dorfstar: 0.02 },
  },
  {
    id: 'doener',
    name: tr('Dynamo Döner', "Dynamo Kebab"),
    short: tr('DYN', 'DYN'),
    venue: 'hinterhof',
    kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xc8352f, pattern: 'brustring', second: 0xf2efe6 },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.6, gut: 0.3, stark: 0.09, dorfstar: 0.01 },
  },
  {
    id: 'lindenhof',
    name: tr('Alte Herren Lindenhof', "Lindenhof Old Boys"),
    short: tr('AHL', 'LOB'),
    venue: 'ascheplatz',
    kit: { shirt: 0x2e6b3a, shorts: 0x1d2b20, socks: 0x2e6b3a, pattern: 'ringel', second: 0xf2efe6 },
    keeperKit: { shirt: 0xd8d0c0, shorts: 0x1c1c1c, socks: 0xd8d0c0 },
    tiers: { ok: 0.45, gut: 0.35, stark: 0.15, dorfstar: 0.05 },
  },
  {
    id: 'kanal',
    name: tr('Kicker vom Kanal', "Canal Street Kickers"),
    short: tr('KVK', 'CSK'),
    venue: 'park',
    kit: { shirt: 0x2f6fb5, shorts: 0x1d2b44, socks: 0xf2efe6, pattern: 'haelften', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.55, gut: 0.33, stark: 0.1, dorfstar: 0.02 },
  },
  {
    id: 'laterne',
    name: tr('Rote Laterne 1998', "Red Lantern 1998"),
    short: tr('RL98', 'RL98'),
    venue: 'ascheplatz',
    kit: { shirt: 0x8c2f2f, shorts: 0x2a2a2a, socks: 0x2a2a2a, pattern: 'nadel', second: 0xd8d0c0 },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.68, gut: 0.27, stark: 0.05 },
  },
];

export const HUMAN_CLUB_DEFAULT = {
  id: 'du',
  name: tr('SV Sonntagsschuss', "Sunday Shots FC"),
  short: tr('SVS', 'SSF'),
  venue: 'hinterhof',
  kit: { shirt: 0xf2efe6, shorts: 0x1d2b44, socks: 0xf2efe6 },
  keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
  tiers: { ok: 0.6, gut: 0.32, stark: 0.08 },
};

// Kreisklasse C: 7 gegen 7, mit Schiri, auf Rasen und Asche.
export const KC_CLUBS = [
  {
    id: 'bwk',
    name: tr('SV Blau-Weiß Kanalbezirk', "Canal District Blues"),
    short: tr('BWK', 'CDB'),
    venue: 'rasenplatz',
    kit: { shirt: 0x2f6fb5, shorts: 0xf2efe6, socks: 0x2f6fb5, pattern: 'schaerpe', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.35, gut: 0.4, stark: 0.2, dorfstar: 0.05 },
  },
  {
    id: 'eichenkamp',
    name: tr('TuS Eichenkamp 1908', "Oakfield Athletic 1908"),
    short: tr('TUS', 'OAK'),
    venue: 'ascheplatz',
    kit: { shirt: 0x2e6b3a, shorts: 0xf2efe6, socks: 0x2e6b3a, pattern: 'karo', second: 0xf2efe6 },
    keeperKit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c },
    tiers: { ok: 0.3, gut: 0.4, stark: 0.22, dorfstar: 0.07, superstar: 0.01 },
  },
  {
    id: 'hafenau',
    name: tr('FC Germania Hafenau II', "Harbourside United Reserves"),
    short: tr('GHA', 'HUR'),
    venue: 'rasenplatz',
    kit: { shirt: 0xc8352f, shorts: 0x1c1c1c, socks: 0x1c1c1c, pattern: 'chevron', second: 0x1c1c1c },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.4, gut: 0.38, stark: 0.18, dorfstar: 0.04 },
  },
  {
    id: 'muehlental',
    name: tr('SpVgg Mühlental', "Millvale Rovers"),
    short: tr('SPV', 'MIL'),
    venue: 'ascheplatz',
    kit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a, pattern: 'seiten', second: 0x1c1c1c },
    keeperKit: { shirt: 0x7a3fa0, shorts: 0x1c1c1c, socks: 0x7a3fa0 },
    tiers: { ok: 0.38, gut: 0.4, stark: 0.17, dorfstar: 0.05 },
  },
  {
    id: 'djk',
    name: tr('DJK Sankt Martin', "St Martin's Celtic"),
    short: tr('DJK', 'STM'),
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
    name: tr('SC Viktoria Oststadt', "Eastgate Victoria"),
    short: tr('VIK', 'EGV'),
    venue: 'rasenplatz',
    kit: { shirt: 0x6a2c8c, shorts: 0xf2efe6, socks: 0x6a2c8c, pattern: 'streifen', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.25, gut: 0.4, stark: 0.26, dorfstar: 0.08, superstar: 0.01 },
  },
  {
    id: 'eintracht',
    name: tr('Eintracht Weserau', "Riverside Albion"),
    short: tr('EWE', 'RSA'),
    venue: 'rasenplatz',
    kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xc8352f, pattern: 'schaerpe', second: 0x1c1c1c },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.28, gut: 0.4, stark: 0.24, dorfstar: 0.07, superstar: 0.01 },
  },
  {
    id: 'grunwald',
    name: tr('TuS Grünwald 1911', "Greenwood Town 1911"),
    short: tr('TGW', 'GWT'),
    venue: 'ascheplatz',
    kit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57, pattern: 'ringel', second: 0x1c1c1c },
    keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
    tiers: { ok: 0.3, gut: 0.42, stark: 0.21, dorfstar: 0.07 },
  },
  {
    id: 'hansa',
    name: tr('SV Hansa Möwenkap', "Gull Point Wanderers"),
    short: tr('HMK', 'GPW'),
    venue: 'rasenplatz',
    kit: { shirt: 0x1d3b6e, shorts: 0x1d3b6e, socks: 0xf2efe6, pattern: 'brustring', second: 0xe0b020 },
    keeperKit: { shirt: 0xd8d0c0, shorts: 0x1c1c1c, socks: 0xd8d0c0 },
    tiers: { ok: 0.32, gut: 0.4, stark: 0.21, dorfstar: 0.06, superstar: 0.01 },
  },
  {
    id: 'reserve',
    name: tr('Borussia Nordhafen III', "North Docks Thirds"),
    short: tr('BN3', 'ND3'),
    venue: 'rasenplatz',
    kit: { shirt: 0xe0c020, shorts: 0x1c1c1c, socks: 0xe0c020, pattern: 'nadel', second: 0x1c1c1c },
    keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
    tiers: { ok: 0.35, gut: 0.4, stark: 0.2, dorfstar: 0.05 },
  },
];

// Kreisliga A: 9 gegen 9 auf dem halben Großfeld, alle auf Rasen – die Liga, in der man sich kennt.
export const KA_CLUBS = [
  {
    id: 'wacker',
    name: tr('SV Wacker Kanalbezirk', "Canal District Rangers"),
    short: tr('WKB', 'CDR'),
    venue: 'sportplatz',
    kit: { shirt: 0x1d3b6e, shorts: 0x1d3b6e, socks: 0xf2efe6, pattern: 'streifen', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.12, gut: 0.36, stark: 0.36, dorfstar: 0.13, superstar: 0.03 },
  },
  {
    id: 'schleuse',
    name: tr('SG Eintracht Schleusenhof', "Lockside United"),
    short: tr('SGE', 'LSU'),
    venue: 'sportplatz',
    kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xc8352f, pattern: 'haelften', second: 0x1c1c1c },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.15, gut: 0.38, stark: 0.33, dorfstar: 0.11, superstar: 0.03 },
  },
  {
    id: 'germania',
    name: tr('FC Germania Hafenviertel', "Harbour Quarter FC"),
    short: tr('FCG', 'HQF'),
    venue: 'sportplatz',
    kit: { shirt: 0xf2efe6, shorts: 0x1c1c1c, socks: 0x1c1c1c, pattern: 'brustring', second: 0x1c1c1c },
    keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
    tiers: { ok: 0.18, gut: 0.4, stark: 0.3, dorfstar: 0.1, superstar: 0.02 },
  },
  {
    id: 'brueckendorf',
    name: tr('SpVgg Rot-Weiß Brückendorf', "Bridgend Reds"),
    short: tr('RWB', 'BRR'),
    venue: 'sportplatz',
    kit: { shirt: 0xb02a2a, shorts: 0xb02a2a, socks: 0xf2efe6, pattern: 'chevron', second: 0xf2efe6 },
    keeperKit: { shirt: 0x2f6fb5, shorts: 0x1c1c1c, socks: 0x2f6fb5 },
    tiers: { ok: 0.18, gut: 0.4, stark: 0.3, dorfstar: 0.1, superstar: 0.02 },
  },
  {
    id: 'uferstadt',
    name: tr('TSV 1898 Uferstadt', "Bankside 1898"),
    short: tr('TSV', 'B98'),
    venue: 'sportplatz',
    kit: { shirt: 0x2e8b57, shorts: 0xf2efe6, socks: 0x2e8b57, pattern: 'ringel', second: 0xf2efe6 },
    keeperKit: { shirt: 0x6a2c8c, shorts: 0x1c1c1c, socks: 0x6a2c8c },
    tiers: { ok: 0.15, gut: 0.38, stark: 0.33, dorfstar: 0.11, superstar: 0.03 },
  },
];

// Bezirksliga: 11 gegen 11 auf dem Großfeld, mit Abseits – hier wird Geld bezahlt.
export const BZ_CLUBS = [
  {
    id: 'hafen',
    name: tr('FC Hafen 1905', "Harbour FC 1905"),
    short: tr('FCH', 'HFC'),
    venue: 'grossfeld',
    kit: { shirt: 0x1d3b6e, shorts: 0xf2efe6, socks: 0x1d3b6e, pattern: 'streifen', second: 0xf2efe6 },
    keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
    tiers: { ok: 0.04, gut: 0.24, stark: 0.4, dorfstar: 0.23, superstar: 0.08, legende: 0.01 },
  },
  {
    id: 'borussia',
    name: tr('Borussia Kanalstadt', "Canaltown Borough"),
    short: tr('BKS', 'CTB'),
    venue: 'grossfeld',
    kit: { shirt: 0xe0c020, shorts: 0x1c1c1c, socks: 0xe0c020, pattern: 'brustring', second: 0x1c1c1c },
    keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
    tiers: { ok: 0.05, gut: 0.27, stark: 0.4, dorfstar: 0.21, superstar: 0.07 },
  },
  {
    id: 'sportfreunde',
    name: tr('Sportfreunde Werftstraße', "Shipyard Lane Social"),
    short: tr('SFW', 'SLS'),
    venue: 'grossfeld',
    kit: { shirt: 0x2e8b57, shorts: 0x2e8b57, socks: 0xf2efe6, pattern: 'schulter', second: 0xf2efe6 },
    keeperKit: { shirt: 0xc8352f, shorts: 0x1c1c1c, socks: 0xc8352f },
    tiers: { ok: 0.07, gut: 0.3, stark: 0.38, dorfstar: 0.19, superstar: 0.06 },
  },
  {
    id: 'olympia',
    name: tr('SC Olympia Neustadt', "Newtown Olympic"),
    short: tr('SCO', 'NTO'),
    venue: 'grossfeld',
    kit: { shirt: 0xf2efe6, shorts: 0x1d3b6e, socks: 0xf2efe6, pattern: 'schaerpe', second: 0x1d3b6e },
    keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
    tiers: { ok: 0.07, gut: 0.3, stark: 0.38, dorfstar: 0.19, superstar: 0.06 },
  },
  {
    id: 'alemannia',
    name: tr('SV Alemannia Deichtor', "Dykegate Alliance"),
    short: tr('SVA', 'DGA'),
    venue: 'grossfeld',
    kit: { shirt: 0xb02a2a, shorts: 0xf2efe6, socks: 0xb02a2a, pattern: 'karo', second: 0xf2efe6 },
    keeperKit: { shirt: 0x2f6fb5, shorts: 0x1c1c1c, socks: 0x2f6fb5 },
    tiers: { ok: 0.05, gut: 0.27, stark: 0.4, dorfstar: 0.21, superstar: 0.07 },
  },
];

// Zwei weitere Vereine je Liga für die große Staffel (8 Teams, 14 Spieltage).
export const EXTRA_CLUBS = {
  1: [
    {
      id: 'grillchill',
      name: tr('Grill & Chill 09', "Grill & Chill 09"),
      short: tr('G09', 'G09'),
      venue: 'hinterhof',
      kit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0xe8742a, pattern: 'brustring', second: 0xe8742a },
      keeperKit: { shirt: 0x4fa3e0, shorts: 0x1c1c1c, socks: 0x4fa3e0 },
      tiers: { ok: 0.62, gut: 0.3, stark: 0.07, dorfstar: 0.01 },
    },
    {
      id: 'intermailand',
      name: tr('Inter Mailänder Straße', "Inter Milan Road"),
      short: tr('IMS', 'IMR'),
      venue: 'parkplatz',
      kit: { shirt: 0x1d3b6e, shorts: 0x1c1c1c, socks: 0x1d3b6e, pattern: 'streifen', second: 0x1c1c1c },
      keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
      tiers: { ok: 0.5, gut: 0.36, stark: 0.12, dorfstar: 0.02 },
    },
  ],
  2: [
    {
      id: 'brueckenfeld',
      name: tr('SC Rot-Weiß Brückenfeld', "Bridgefield Red Star"),
      short: tr('RWB', 'BRS'),
      venue: 'rasenplatz',
      kit: { shirt: 0xc8352f, shorts: 0xf2efe6, socks: 0xf2efe6, pattern: 'haelften', second: 0xf2efe6 },
      keeperKit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c },
      tiers: { ok: 0.4, gut: 0.38, stark: 0.18, dorfstar: 0.04 },
    },
    {
      id: 'kanalhafen',
      name: tr('FV Kanalhafen 1920', "Canal Basin 1920"),
      short: tr('FVK', 'CB20'),
      venue: 'ascheplatz',
      kit: { shirt: 0x4fa3e0, shorts: 0x1d2b44, socks: 0x4fa3e0, pattern: 'ringel', second: 0xf2efe6 },
      keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a },
      tiers: { ok: 0.42, gut: 0.38, stark: 0.16, dorfstar: 0.04 },
    },
  ],
  3: [
    {
      id: 'deichwacht',
      name: tr('VfL Deichwacht', "Seawall Sporting"),
      short: tr('VFL', 'SWS'),
      venue: 'rasenplatz',
      kit: { shirt: 0x2e8b57, shorts: 0xf2efe6, socks: 0x2e8b57, pattern: 'schaerpe', second: 0xf2efe6 },
      keeperKit: { shirt: 0x6a2c8c, shorts: 0x1c1c1c, socks: 0x6a2c8c },
      tiers: { ok: 0.3, gut: 0.4, stark: 0.23, dorfstar: 0.06, superstar: 0.01 },
    },
    {
      id: 'postsv',
      name: tr('Post SV Oststadt', "Eastgate Royal Mail"),
      short: tr('PSV', 'ERM'),
      venue: 'ascheplatz',
      kit: { shirt: 0xe0c020, shorts: 0x1d3b6e, socks: 0x1d3b6e, pattern: 'schulter', second: 0x1d3b6e },
      keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
      tiers: { ok: 0.33, gut: 0.41, stark: 0.2, dorfstar: 0.06 },
    },
  ],
  4: [
    {
      id: 'pumpwerk',
      name: tr('DJK Grün-Weiß Pumpwerk', "Pumphouse Greens"),
      short: tr('DJK', 'PHG'),
      venue: 'sportplatz',
      kit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0xf2efe6, pattern: 'seiten', second: 0xf2efe6 },
      keeperKit: { shirt: 0xc8352f, shorts: 0x1c1c1c, socks: 0xc8352f },
      tiers: { ok: 0.18, gut: 0.4, stark: 0.3, dorfstar: 0.1, superstar: 0.02 },
    },
    {
      id: 'treidelpfad',
      name: tr('VfL Treidelpfad 08', "Towpath Wanderers 08"),
      short: tr('V08', 'TW08'),
      venue: 'sportplatz',
      kit: { shirt: 0xe0c020, shorts: 0x1c1c1c, socks: 0xe0c020, pattern: 'schulter', second: 0x1c1c1c },
      keeperKit: { shirt: 0x2f6fb5, shorts: 0x1c1c1c, socks: 0x2f6fb5 },
      tiers: { ok: 0.15, gut: 0.38, stark: 0.33, dorfstar: 0.11, superstar: 0.03 },
    },
  ],
  5: [
    {
      id: 'lotsen',
      name: tr('TuS Lotsenhaus', "Pilot House Rovers"),
      short: tr('TUL', 'PHR'),
      venue: 'grossfeld',
      kit: { shirt: 0x6a2c8c, shorts: 0xf2efe6, socks: 0x6a2c8c, pattern: 'nadel', second: 0xf2efe6 },
      keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 },
      tiers: { ok: 0.07, gut: 0.3, stark: 0.38, dorfstar: 0.19, superstar: 0.06 },
    },
    {
      id: 'fortunadeich',
      name: tr('Fortuna Deichhausen', "Dykehouse Fortune"),
      short: tr('FOR', 'DHF'),
      venue: 'grossfeld',
      kit: { shirt: 0xc8352f, shorts: 0x1c1c1c, socks: 0xc8352f, pattern: 'haelften', second: 0x1c1c1c },
      keeperKit: { shirt: 0x2e8b57, shorts: 0x1c1c1c, socks: 0x2e8b57 },
      tiers: { ok: 0.05, gut: 0.27, stark: 0.4, dorfstar: 0.21, superstar: 0.07 },
    },
  ],
};

export const leagueClubs = (league, size = 6) => [...league.clubs, ...(size >= 8 ? EXTRA_CLUBS[league.level] ?? [] : [])];

export const MAX_LEVEL = 5;

export const LEAGUES = {
  1: { level: 1, name: LEAGUE_NAME, referee: false, format: null, humanVenue: 'hinterhof', clubs: AI_CLUBS, squadShape: 'small', maxSquad: 12, derby: { club: 'kanal', name: tr('Kanal-Derby', 'Canal Derby') } },
  2: { level: 2, name: tr('Kreisklasse C Kanalbezirk', 'Canal District Division Three'), referee: true, format: 7, humanVenue: 'rasenplatz', clubs: KC_CLUBS, squadShape: 'large', maxSquad: 16, derby: { club: 'bwk', name: tr('Bezirks-Derby', 'District Derby') } },
  3: { level: 3, name: tr('Kreisklasse B Kanalbezirk', 'Canal District Division Two'), referee: true, format: 7, humanVenue: 'rasenplatz', clubs: KB_CLUBS, squadShape: 'large', maxSquad: 16, derby: { club: 'viktoria', name: tr('Stadtderby', 'City Derby') } },
  4: { level: 4, name: tr('Kreisliga A Kanalbezirk', 'Canal District Premier Division'), referee: true, format: 9, humanVenue: 'sportplatz', clubs: KA_CLUBS, squadShape: 'xl', maxSquad: 18, derby: { club: 'wacker', name: tr('Kanal-Klassiker', 'Canal Classic') } },
  5: { level: 5, name: tr('Bezirksliga Kanal', 'County Senior League'), referee: true, format: 11, humanVenue: 'grossfeld', clubs: BZ_CLUBS, squadShape: 'xxl', maxSquad: 22, derby: { club: 'hafen', name: tr('Hafen-Derby', 'Harbour Derby') } },
};
