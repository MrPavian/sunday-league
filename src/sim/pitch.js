import { SURFACES } from './surfaces.js';

// Spielstätten. Koordinaten in Metern: x = Längsrichtung (Tore bei ±halfLength),
// z = Breite, y = Höhe. Team 0 spielt Richtung +x.
export const PARKING_LOT = {
  id: 'parkplatz',
  name: 'Parkplatz am Getränkemarkt',
  halfLength: 18, // Torlinie
  halfWidth: 11, // Stoßstangen der parkenden Autos
  wallX: 20.4, // Hauswand / Zaun hinter den Toren
  goalHalfWidth: 1.6, // Jackentore
  goalHeight: 1.9, // "Kopfhöhe vom Torwart"
  surface: SURFACES.asphalt,
};
