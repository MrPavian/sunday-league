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

export const HALL = {
  id: 'halle',
  name: tr('Sporthalle Kanalschule', 'Kanalschule Sports Hall'),
  format: 5,
  halfLength: 18,
  halfWidth: 9.5, // Bande
  wallX: 19.3, // Bande hinter den Toren
  goalHalfWidth: 1.5, // Handballtor 3 × 2 m
  goalHeight: 2.0,
  goalType: 'frame',
  boundary: 'walls',
  carRule: false,
  referee: true,
  surface: SURFACES.hall,
};

export const PITCHES = { parkplatz: PARKING_LOT, hinterhof: BACKYARD, park: PARK, ascheplatz: ASH_PITCH, rasenplatz: LAWN_PITCH, halle: HALL };
