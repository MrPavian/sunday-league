import { tr } from '../core/i18n.js';
import { SURFACES } from './surfaces.js';

// Spielstätten (Simulationsteil). Koordinaten in Metern: x = Längsrichtung
// (Torlinien bei ±halfLength), z = Breite, y = Höhe. Team 0 spielt Richtung +x.
//
// boundary: 'walls' – Ball prallt ab (Autos, Hauswände), kein Aus
//           'lines' – Seiten-/Torauslinien mit Einwurf, Ecke, Abstoß
// goalType: 'open'  – Jacken/Taschen, "Kopfhöhe vom Torwart" als Grenze
//           'frame' – echtes Tor mit Pfosten und Latte
export const PARKING_LOT = {
  id: 'parkplatz',
  name: tr('Parkplatz am Getränkemarkt', 'Drinks Market Car Park'),
  format: 5,
  halfLength: 18,
  halfWidth: 11, // Stoßstangen der parkenden Autos
  wallX: 20.4, // Hauswand / Zaun hinter den Toren
  goalHalfWidth: 1.6,
  goalHeight: 1.9,
  goalType: 'open',
  boundary: 'walls',
  carRule: true, // Ans Auto geschossen → Ball für die anderen
  surface: SURFACES.asphalt,
};

export const BACKYARD = {
  id: 'hinterhof',
  name: tr('Hinterhof Lindenstraße', 'Lindenstraße Backyard'),
  format: 4,
  halfLength: 12,
  halfWidth: 7, // Hauswände
  wallX: 12.3,
  goalHalfWidth: 1.1, // Garagentor bzw. Kreidetor an der Wand
  goalHeight: 2.1,
  goalType: 'open',
  boundary: 'walls',
  carRule: false,
  surface: SURFACES.concrete,
};

export const PARK = {
  id: 'park',
  name: tr('Stadtpark an der Kastanienallee', 'Kastanienallee Park'),
  format: 5,
  halfLength: 17,
  halfWidth: 11, // gedachte Linie zwischen den Hütchen
  wallX: 26,
  fenceZ: 18,
  goalHalfWidth: 1.5, // Rucksack bis Hütchen
  goalHeight: 1.8,
  goalType: 'open',
  boundary: 'lines',
  carRule: false,
  surface: SURFACES.parkGrass,
};

export const ASH_PITCH = {
  id: 'ascheplatz',
  name: tr('Sportplatz Am Kanal', 'Am Kanal Ground'),
  format: 5,
  halfLength: 20, // Kleinfeld quer auf dem großen Platz
  halfWidth: 13,
  wallX: 23.4, // Ballfangzaun
  fenceZ: 17,
  goalHalfWidth: 2.5, // Jugendtor 5 × 2 m
  goalHeight: 2.0,
  goalType: 'frame',
  boundary: 'lines',
  carRule: false,
  surface: SURFACES.ash,
};

export const LAWN_PITCH = {
  id: 'rasenplatz',
  name: tr('Sportplatz Waldesruh', 'Waldesruh Ground'),
  format: 7,
  halfLength: 26, // 7er-Feld quer auf dem Großfeld
  halfWidth: 17,
  wallX: 30,
  fenceZ: 21,
  goalHalfWidth: 2.5, // 5 × 2 m
  goalHeight: 2.0,
  goalType: 'frame',
  boundary: 'lines',
  carRule: false,
  referee: true,
  surface: SURFACES.grass,
};

// Kreisliga A: 9 gegen 9 „von Sechzehner zu Sechzehner" auf dem Großfeld – etwa 70 × 50 m,
// Tore 5 × 2 m (DFB-Maße für das 9er-Feld).
export const NINE_PITCH = {
  id: 'sportplatz',
  name: tr('Sportanlage Kanalwiese', 'Kanalwiese Sports Ground'),
  format: 9,
  halfLength: 35,
  halfWidth: 25,
  wallX: 39,
  fenceZ: 29,
  goalHalfWidth: 2.5,
  goalHeight: 2.0,
  goalType: 'frame',
  boundary: 'lines',
  carRule: false,
  referee: true,
  penaltyDistance: 8, // DFB-9er: Strafstoß aus 8 m
  surface: SURFACES.grass,
};

// Bezirksliga: das echte Großfeld, 105 × 68 m, Tore 7,32 × 2,44 m, Elfmeter aus 11 m – und Abseits.
export const BIG_PITCH = {
  id: 'grossfeld',
  name: tr('Stadion am Kanal', 'Canal Stadium'),
  format: 11,
  halfLength: 52.5,
  halfWidth: 34,
  wallX: 57,
  fenceZ: 38,
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  goalType: 'frame',
  boundary: 'lines',
  carRule: false,
  referee: true,
  offside: true,
  penaltyDistance: 11,
  surface: SURFACES.grass,
};

// Nur für den überregionalen Pokal (nicht in PITCHES, damit sie in Einstellungen und Freundschaftsspielen nicht auftauchen):
// derselbe Rasen wie das Großfeld (base), anderer Rahmen. Zusatztribüne: Stahlrohrtribüne am eigenen Platz.
// Stadion: größeres Stadion in der Nähe mit Rängen rundum und Flutlicht.
export const STADIUM = { ...BIG_PITCH, id: 'stadion', base: 'grossfeld', name: tr('Kanal-Arena', 'Canal Arena') };
export const BIG_PITCH_STANDS = { ...BIG_PITCH, id: 'grossfeld_tribuene', base: 'grossfeld', extraStand: true };
export const BUND_PITCHES = { stadion: STADIUM, grossfeld_tribuene: BIG_PITCH_STANDS };

const HALL_GOAL_DEPTH = 1.0;
export const HALL = {
  goalDepth: HALL_GOAL_DEPTH,
  id: 'halle',
  name: tr('Sporthalle Kanalschule', 'Kanalschule Sports Hall'),
  format: 5,
  halfLength: 18,
  halfWidth: 9.5, // Bande
  // Bande direkt hinter den Toren: Torlinie + Tortiefe (goalDepth, unten) + halbe Bandendicke (0,06). Die Netztiefe ist die der
  // Darstellung (render/venues/hall.js, 1,0 m); die IHF-Richtlinie zum Handballtor nennt hinter der Torlinie oben 0,9 m und unten 1,1 m
  // (je ±0,1 m, Rules of the Game 2005/2010, Tor Regel 1:2: https://www2.handball.ee/est/info/rules_ofthe_game_01.08.05.pdf), 1,0 m liegt
  // in der Toleranz (Strandhandball: 0,8 m oben, 1,0 m unten). Netzrückseite liegt an der Bandeninnenseite: kein Streifen dahinter.
  wallX: 18 + HALL_GOAL_DEPTH + 0.06,
  goalHalfWidth: 1.5, // Handballtor 3 × 2 m
  goalHeight: 2.0,
  goalType: 'frame',
  boundary: 'walls',
  carRule: false,
  referee: true,
  // Hallencup: vorwiegend flach gespielt, hoch nur vorm Tor (sonst flöge der Ball dauernd über die Bande).
  // shotNear: Abstand zur Torlinie (m), bis zu dem ein Schuss hoch gehen darf; shotVy: höchste Steigung (m/s)
  // eines Schusses weiter weg. Werte gewählt, nicht gemessen (Messung: scripts/flat-audit.mjs).
  // shotBoost: 1.28Schusstempo-Faktor, aimBoost: Streuungs-Faktor (< 1 = genauer). Die Flachschüsse waren zu leicht zu halten
  // (Tore je Spiel 2,18 -> 1,48); Werte gewählt und mit scripts/flat-audit.mjs nachgemessen.
  flatPlay: { shotNear: 8, shotVy: 0.8, shotBoost: 1.2, aimBoost: 0.7 },
  // Bandenspiel der KI: Die Bande als Mitspieler (Pass, Doppelpass mit der Bande, Abpraller). blockLane: Abstand (m) eines
  // Gegners zur Passlinie, ab dem der direkte Weg als zugestellt gilt; clearLane: so frei muss der Weg über die Bande sein;
  // maxDetour: Umweg gegenüber der Luftlinie (Faktor) und maxLen: längster Weg (m). Gewählt, gemessen mit scripts/board-audit.mjs.
  boardPlay: { blockLane: 1.3, clearLane: 1.1, maxDetour: 1.8, maxLen: 20, shotBlockLane: 0.9 },
  // Fangnetz hinter den Toren (Bande bis height, Breite Tor + je margin), lehnt oben um lean (m je m Höhe) zum Feld:
  // Der Ball prallt nicht ab, sondern bleibt hängen und fällt. Maße gewählt, nicht gemessen.
  catchNet: { height: 4.5, margin: 2, boardHeight: 0.9, lean: 0.2 },
  surface: SURFACES.hall,
};

export const PITCHES = { parkplatz: PARKING_LOT, hinterhof: BACKYARD, park: PARK, ascheplatz: ASH_PITCH, rasenplatz: LAWN_PITCH, sportplatz: NINE_PITCH, grossfeld: BIG_PITCH, halle: HALL };
