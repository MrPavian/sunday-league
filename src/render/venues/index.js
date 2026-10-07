import { tr } from '../../core/i18n.js';
import { BUND_PITCHES, PITCHES } from '../../sim/pitch.js';
import { buildAshPitch } from './ashPitch.js';
import { buildBackyard } from './backyard.js';
import { buildLawn } from './lawn.js';
import { buildPark } from './park.js';
import { buildParkingLot } from './parkingLot.js';
import { buildHall } from './hall.js';
import { buildStadium } from './stadium.js';

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
    id: 'sportplatz',
    pitch: PITCHES.sportplatz,
    build: buildLawn,
    tagline: tr('Kreisliga A: 9 gegen 9 von Sechzehner zu Sechzehner, Flutlicht, Würstchenbude.', 'Kreisliga A: 9 v 9 from box to box, floodlights, sausage stand.'),
  },
  {
    id: 'grossfeld',
    pitch: PITCHES.grossfeld,
    build: buildLawn,
    tagline: tr('Bezirksliga: 11 gegen 11 auf dem Großfeld, mit Abseits und kleinem Stadion.', 'Bezirksliga: 11 v 11 on a full-size pitch, with offside and a small stadium.'),
  },
  {
    id: 'halle',
    pitch: PITCHES.halle,
    build: buildHall,
    tagline: tr('Winter in der Sporthalle: Bande, Handballtore, glatter Boden. Grätschen brennt.', 'Winter in the sports hall: boards, handball goals, slippery floor. Slide tackles burn.'),
  },
  // Nur für den überregionalen Pokal (hidden: nicht im Menü).
  {
    id: 'grossfeld_tribuene',
    hidden: true,
    pitch: BUND_PITCHES.grossfeld_tribuene,
    build: buildLawn,
    tagline: tr('Großfeld mit Stahlrohrtribüne für den Profibesuch.', 'Full-size pitch with a scaffold stand for the professional visitors.'),
  },
  {
    id: 'stadion',
    hidden: true,
    pitch: BUND_PITCHES.stadion,
    build: buildStadium,
    tagline: tr('Das große Stadion in der Nähe: Ränge rundum, Flutlicht.', 'The big stadium nearby: stands all round, floodlights.'),
  },
];

export const venueById = (id) => VENUES.find((v) => v.id === id) ?? VENUES[1];
