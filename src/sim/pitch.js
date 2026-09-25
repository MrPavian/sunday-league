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
  name: 'Parkplatz am Getränkemarkt',
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
