import { PITCHES } from '../../sim/pitch.js';
import { buildAshPitch } from './ashPitch.js';
import { buildBackyard } from './backyard.js';
import { buildLawn } from './lawn.js';
import { buildPark } from './park.js';
import { buildParkingLot } from './parkingLot.js';

// Spielorte: Simulationsdaten + Szenenaufbau + Text fürs Auswahlmenü.
export const VENUES = [
  {
    id: 'hinterhof',
    pitch: PITCHES.hinterhof,
    build: buildBackyard,
    tagline: '4 gegen 4 zwischen Mülltonnen. Garagentor gegen Kreidetor, Oma guckt zu.',
  },
  {
    id: 'parkplatz',
    pitch: PITCHES.parkplatz,
    build: buildParkingLot,
    tagline: 'Jackentore auf Asphalt. Wer ans Auto schießt, gibt den Ball ab.',
  },
  {
    id: 'park',
    pitch: PITCHES.park,
    build: buildPark,
    tagline: 'Holprige Wiese, Rucksack-Tore, Hunde am Spielfeldrand. Einwurf bei den Hütchen.',
  },
  {
    id: 'ascheplatz',
    pitch: PITCHES.ascheplatz,
    build: buildAshPitch,
    tagline: 'Richtige Tore mit Netz. Asche im Knie inklusive.',
  },
  {
    id: 'rasenplatz',
    pitch: PITCHES.rasenplatz,
    build: buildLawn,
    tagline: 'Kreisklasse! Rasen, Tribüne, Banden – und ein Schiri.',
  },
];

export const venueById = (id) => VENUES.find((v) => v.id === id) ?? VENUES[1];
