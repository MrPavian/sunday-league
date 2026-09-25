import { tr } from '../../core/i18n.js';
import { PITCHES } from '../../sim/pitch.js';
import { buildAshPitch } from './ashPitch.js';
import { buildBackyard } from './backyard.js';
import { buildLawn } from './lawn.js';
import { buildPark } from './park.js';
import { buildParkingLot } from './parkingLot.js';
import { buildHall } from './hall.js';

// Spielorte: Simulationsdaten + Szenenaufbau + Text fürs Auswahlmenü.
export const VENUES = [
  {
    id: 'hinterhof',
    pitch: PITCHES.hinterhof,
    build: buildBackyard,
    tagline: tr('4 gegen 4 zwischen Mülltonnen. Garagentor gegen Kreidetor, Oma guckt zu.', '4 v 4 between the bins. Garage door against a chalk goal, Grandma is watching.'),
  },
  {
    id: 'parkplatz',
    pitch: PITCHES.parkplatz,
    build: buildParkingLot,
    tagline: tr('Jackentore auf Asphalt. Wer ans Auto schießt, gibt den Ball ab.', 'Jumpers for goalposts on tarmac. Hit a car and you lose the ball.'),
  },
  {
    id: 'park',
    pitch: PITCHES.park,
    build: buildPark,
    tagline: tr('Holprige Wiese, Rucksack-Tore, Hunde am Spielfeldrand. Einwurf bei den Hütchen.', 'Bumpy grass, rucksack goals, dogs on the touchline. Throw-ins at the cones.'),
  },
  {
    id: 'ascheplatz',
    pitch: PITCHES.ascheplatz,
    build: buildAshPitch,
    tagline: tr('Richtige Tore mit Netz. Asche im Knie inklusive.', 'Proper goals with nets. Cinders in your knees included.'),
  },
  {
    id: 'rasenplatz',
    pitch: PITCHES.rasenplatz,
    build: buildLawn,
    tagline: tr('Kreisklasse! Rasen, Tribüne, Banden – und ein Schiri.', 'District league! Grass, a stand, advertising boards – and a referee.'),
  },
  {
    id: 'halle',
    pitch: PITCHES.halle,
    build: buildHall,
    tagline: tr('Winter in der Sporthalle: Bande, Handballtore, glatter Boden. Grätschen brennt.', 'Winter in the sports hall: boards, handball goals, slippery floor. Slide tackles burn.'),
  },
];

export const venueById = (id) => VENUES.find((v) => v.id === id) ?? VENUES[1];
