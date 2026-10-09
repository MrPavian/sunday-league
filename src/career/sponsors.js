// Sponsoren: Bäcker, Döner, Bestatter. Jeder hat eine Eigenart, eine Beziehung
// zum Verein (0–100) und ein Saisonziel. Man kann nachverhandeln, verlängern,
// verärgern – und manchmal will der Chef, dass sein Sohn mitspielt. Verträge laufen 1–3 Saisons,
// jeder Sponsor hat je Saison einen Wunsch (sponsorwish.js), der Verein kann ablehnen und kündigen.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub, playerOf, table } from './career.js';
import { adjustMood } from './events.js';
import { book, KIT_COST } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { BRANCHEN, newWish, WISH_PENALTY, WISHES, wishCost, wishLabel } from './sponsorwish.js';

export { BRANCHEN, WISHES, wishCost, wishLabel };

// Eigenarten: treu (bleibt auch in schlechten Zeiten), ehrgeizig (zahlt mehr,
// will Erfolg), knauserig (wenig Geld, harte Verhandlung), großzügig (Extras).
export const TRAITS = {
  treu: { name: tr('treu', 'loyal'), pay: 0.9, win: 2, loss: -1, haggle: 0.5 },
  ehrgeizig: { name: tr('ehrgeizig', 'ambitious'), pay: 1.25, win: 5, loss: -5, haggle: 0.45 },
  knauserig: { name: tr('knauserig', 'tight-fisted'), pay: 0.8, win: 2, loss: -3, haggle: 0.25 },
  grosszuegig: { name: tr('großzügig', 'generous'), pay: 1.1, win: 3, loss: -1, haggle: 0.65 },
};

export const SPONSORS = [
  { id: 'krume', branche: 'lebensmittel', color: 0xc98a3a, name: tr('Bäckerei Krume', "Crumbs Bakery"), line: tr('Frische Brötchen nach dem Spiel inklusive.', 'Fresh rolls after the match included.'), trait: 'treu', boss: tr('Bäckermeister Krume', 'Krume the baker') },
  { id: 'vollgas', branche: 'auto', color: 0xd8322a, name: tr('Fahrschule Vollgas', "Full Throttle Driving School"), line: tr('Wer einen Führerschein braucht, weiß Bescheid.', 'Anyone needing a driving licence knows where to go.'), trait: 'ehrgeizig', boss: tr('Fahrlehrer Rolf', 'Rolf the driving instructor') },
  { id: 'sultan', branche: 'gastro', color: 0xe0a020, name: tr('Döner Sultan', "Sultan Kebabs"), line: tr('Mannschaftsdöner nach jedem Heimsieg.', 'Team kebab after every home win.'), trait: 'grosszuegig', boss: tr('Murat vom Sultan', 'Murat from the Sultan') },
  { id: 'brenner', branche: 'auto', color: 0x1d4f9c, name: tr('Autohaus Brenner', "Brenner Motors"), line: tr('Fährt auch mal den Bus zum Auswärtsspiel.', 'Sometimes drives the minibus to away games.'), trait: 'ehrgeizig', boss: tr('Autohändler Brenner', 'Brenner the car dealer') },
  { id: 'physio', branche: 'gesundheit', color: 0x3aa39a, name: tr('Physio am Markt', "Market Square Physio"), line: tr('Tapen vor dem Spiel zum Vereinspreis.', 'Pre-match strapping at a club discount.'), trait: 'treu', boss: tr('Physiotherapeutin Sandra', 'Sandra the physio') },
  { id: 'schnittig', branche: 'koerper', color: 0xc04a8a, name: tr('Friseur Schnittig', "Sharp Cuts Hair"), line: tr('Frisur sitzt, auch nach 90 Minuten.', 'Hair stays put, even after 90 minutes.'), trait: 'grosszuegig', boss: tr('Friseurin Jacqueline', 'Jacqueline the hairdresser') },
  { id: 'kowalski', branche: 'handwerk', color: 0x8c3a2a, name: tr('Dachdeckerei Kowalski', "Kowalski Roofing"), line: tr('Hält dicht – wie unsere Abwehr (hoffentlich).', 'Watertight – like our defence (hopefully).'), trait: 'knauserig', boss: tr('Dachdecker Kowalski', 'Kowalski the roofer') },
  { id: 'hoffmann', branche: 'getraenke', color: 0x2e7d3a, name: tr('Getränke Hoffmann', "Hoffmann Drinks"), line: tr('Die Kiste nach dem Spiel geht aufs Haus.', 'The crate after the match is on the house.'), trait: 'grosszuegig', boss: tr('Getränke-Hoffmann', 'Hoffmann from the drinks market') },
  { id: 'enzo', branche: 'gastro', color: 0x2f8f3f, name: tr('Pizzeria Da Enzo', "Pizzeria Da Enzo"), line: tr('Nach dem Auswärtssieg eine Familienpizza.', 'A family pizza after every away win.'), trait: 'treu', boss: 'Enzo' },
  { id: 'blum', branche: 'handwerk', color: 0x2f6fb5, name: tr('Sanitär Blum', "Blum Plumbing"), line: tr('Repariert auch die Duschen im Vereinsheim. Irgendwann.', 'Also fixes the clubhouse showers. Eventually.'), trait: 'knauserig', boss: tr('Installateur Blum', 'Blum the plumber') },
  { id: 'muckibude', branche: 'freizeit', color: 0x1c1c1c, name: tr('Fitnessstudio Muckibude', "Muscle Shed Gym"), line: tr('Für die Bauchmuskeln, die man unter dem Trikot nicht sieht.', 'For the abs nobody can see under the shirt.'), trait: 'ehrgeizig', boss: tr('Studioleiter Dragan', 'Dragan the gym manager') },
  { id: 'kalle', branche: 'handel', color: 0xe8742a, name: tr('Kiosk Kalle', "Kalle's Kiosk"), line: tr('Lotto, Zigaretten, Zeitung, Spielberichte.', 'Lottery, cigarettes, papers, match reports.'), trait: 'treu', boss: 'Kalle' },
  { id: 'ruhe', branche: 'dienst', color: 0x3a3a44, name: tr('Bestattungen Ruhe', "Rest Easy Funerals"), line: tr('Wir holen jeden ab. Auch nach dem Abstieg.', 'We collect everyone. Even after relegation.'), trait: 'knauserig', boss: tr('Herr Ruhe', 'Mr Ruhe') },
  { id: 'funke', branche: 'handwerk', color: 0xf0c020, name: tr('Elektro Funke', "Sparks Electrical"), line: tr('Macht das Flutlicht an. Wenn es eins gäbe.', 'Turns the floodlights on. If there were any.'), trait: 'treu', boss: tr('Elektromeister Funke', 'Funke the electrician') },
  { id: 'wolf', branche: 'lebensmittel', color: 0xb0302c, name: tr('Metzgerei Wurst-Wolf', "Wolf the Butcher"), line: tr('Bratwurst zum Sonderpreis am Grill.', 'Discount bratwurst at the barbecue.'), trait: 'grosszuegig', boss: tr('Metzger Wolf', 'Wolf the butcher') },
  { id: 'klein', branche: 'finanzen', color: 0x1d3a6b, name: tr('Versicherungsbüro Klein', "Klein Insurance"), line: tr('Versichert alles. Außer Luftlöcher.', 'Insures everything. Except air shots.'), trait: 'ehrgeizig', boss: tr('Versicherungsmakler Klein', 'Klein the insurance broker') },
  { id: 'blitzblank', branche: 'auto', color: 0x4fa3e0, name: tr('Autowaschanlage Blitzblank', "Sparkle Car Wash"), line: tr('Die Trikots waschen wir nicht. Die Autos schon.', "We don't wash the kits. The cars, yes."), trait: 'treu', boss: tr('Waschanlagen-Uwe', 'Uwe from the car wash') },
  { id: 'schrauber', branche: 'auto', color: 0x5a5a58, name: tr('Kfz-Werkstatt Schrauber', "Spanner Garage"), line: tr('TÜV-Termin nach dem Abpfiff.', 'MOT appointment right after the final whistle.'), trait: 'knauserig', boss: tr('Meister Schrauber', 'Schrauber the mechanic') },
  { id: 'lindenwirt', branche: 'gastro', color: 0x6b4f2a, name: tr('Gasthof Zur Linde', "The Linden Tree Inn"), line: tr('Das Schnitzel nach dem Spiel ist größer als der Teller.', 'The post-match schnitzel is bigger than the plate.'), trait: 'grosszuegig', boss: tr('Lindenwirtin Gerda', 'Gerda from the Linde inn') },
  { id: 'fliesen', branche: 'handwerk', color: 0x8a9096, name: tr('Fliesen Fugenfrei', "Gapless Tiling"), line: tr('Sauber verlegt – wie unsere Viererkette.', 'Laid neatly – like our back four.'), trait: 'knauserig', boss: tr('Fliesenleger Norbert', 'Norbert the tiler') },
  { id: 'optik', branche: 'gesundheit', color: 0x2a2a6b, name: tr('Optik Scharfblick', "Sharp Sight Opticians"), line: tr('Gratis Sehtest für den Schiri.', 'Free eye test for the referee.'), trait: 'ehrgeizig', boss: tr('Optikerin Frau Weiß', 'Mrs Weiß the optician') },
  { id: 'eisdiele', branche: 'gastro', color: 0xf09ab0, name: tr('Eiscafé Venezia', "Venezia Ice Cream"), line: tr('Nach jedem Heimsieg eine Kugel. Nach dem Aufstieg drei.', 'One scoop after every home win. Three after promotion.'), trait: 'grosszuegig', boss: 'Signora Lucia' },
  { id: 'handy', branche: 'handel', color: 0x6b4f8c, name: tr('Handy-Doktor Çelik', "Çelik Phone Doctor"), line: tr('Display gesprungen? Grätsche vermasselt? Beides reparierbar.', 'Cracked screen? Botched a slide tackle? Both fixable.'), trait: 'ehrgeizig', boss: tr('Handy-Doktor Emre', 'Emre the phone doctor') },
  { id: 'gruenzeug', branche: 'handwerk', color: 0x5cc46a, name: tr('Gartenbau Grünzeug', "Greenery Landscaping"), line: tr('Mäht den Platz. Manchmal sogar vor dem Spiel.', 'Mows the pitch. Sometimes even before kick-off.'), trait: 'treu', boss: tr('Gärtner Hansi', 'Hansi the gardener') },
  { id: 'taxi', branche: 'auto', color: 0xe8c020, name: tr('Taxi Tempo', "Tempo Taxis"), line: tr('Heimweg nach der Weihnachtsfeier zum Vereinstarif.', 'Home from the Christmas party at the club rate.'), trait: 'treu', boss: tr('Taxi-Kemal', 'Kemal the cabbie') },
  { id: 'nagelstudio', branche: 'koerper', color: 0xd06aa0, name: tr('Nagelstudio Glamour', "Glamour Nails"), line: tr('Die Torwarthandschuhe halten jetzt noch besser.', 'Now the keeper gloves grip even better.'), trait: 'grosszuegig', boss: tr('Studio-Chefin Mandy', 'Mandy from the nail bar') },
  { id: 'baustoffe', branche: 'bau', color: 0xc8352f, name: tr('Baustoffe Brockmann', "Brockmann Builders"), line: tr('Sand für den Strafraum liefern wir kostenlos.', 'Free sand for the penalty area.'), trait: 'ehrgeizig', boss: tr('Baustoffhändler Brockmann', 'Brockmann the builders merchant') },
  { id: 'hofladen', branche: 'lebensmittel', color: 0x9a6b4f, name: tr('Hofladen Kuhglück', "Happy Cow Farm Shop"), line: tr('Frische Milch für die Halbzeit. Bitte nicht mischen.', 'Fresh milk at half-time. Please do not mix.'), trait: 'treu', boss: tr('Bäuerin Anke', 'Anke the farmer') },
  { id: 'tattoo', branche: 'koerper', color: 0x1c1c1c, name: tr('Tattoo Nadelwerk', "Needlework Tattoo"), line: tr('Meisterschaft? Wir stechen das Datum.', 'Champions? We will ink the date.'), trait: 'ehrgeizig', boss: tr('Tätowierer Rocco', 'Rocco the tattooist') },
  { id: 'reisebuero', branche: 'freizeit', color: 0x2f9fd0, name: tr('Reisebüro Fernweh', "Wanderlust Travel"), line: tr('Die Abschlussfahrt planen wir. Mallorca oder Harz.', 'We plan the end-of-season trip. Majorca or the Harz.'), trait: 'grosszuegig', boss: tr('Reiseberaterin Petra', 'Petra the travel agent') },
  { id: 'imbiss', branche: 'gastro', color: 0xe0b020, name: tr('Imbiss Currywurst-Kalle', "Kalle's Chippy"), line: tr('Pommes Schranke für jeden Torschützen.', 'Chips with mayo and ketchup for every scorer.'), trait: 'grosszuegig', boss: tr('Imbiss-Kalle', 'Kalle from the chip shop') },
  { id: 'solar', branche: 'energie', color: 0x2e6b3a, name: tr('Solar Sonnenschein', "Sunshine Solar"), line: tr('Irgendwann bekommt das Vereinsheim Solarzellen. Versprochen.', 'Someday the clubhouse gets solar panels. Promise.'), trait: 'ehrgeizig', boss: tr('Energieberater Dr. Sonne', 'Dr Sonne the energy adviser') },
  { id: 'zahnarzt', branche: 'gesundheit', color: 0x8ad0e8, name: tr('Zahnarztpraxis Dr. Biss', "Dr Bite Dental"), line: tr('Für die Zahnlücke nach dem Kopfballduell.', 'For the gap after that aerial duel.'), trait: 'knauserig', boss: tr('Dr. Biss', 'Dr Biss') },
  { id: 'schluessel', branche: 'handwerk', color: 0x8c2f2f, name: tr('Schlüsseldienst Sesam', "Open Sesame Locksmiths"), line: tr('Wieder den Kabinenschlüssel vergessen? Wir kommen.', 'Forgot the dressing-room key again? We are on our way.'), trait: 'knauserig', boss: tr('Schlüssel-Heinz', 'Heinz the locksmith') },
  { id: 'fahrrad', branche: 'handel', color: 0x3a8ad0, name: tr('Fahrradladen Speiche', "Spoke Bike Shop"), line: tr('Für alle, die ohne Führerschein zum Training kommen.', 'For everyone who cycles to training without a licence.'), trait: 'treu', boss: tr('Fahrradhändlerin Ines', 'Ines from the bike shop') },
  { id: 'bestpreis', branche: 'getraenke', color: 0xe8742a, name: tr('Getränkemarkt Bestpreis', "Best Price Off-Licence"), line: tr('Zwei Kisten zum Preis von anderthalb.', 'Two crates for the price of one and a half.'), trait: 'knauserig', boss: tr('Marktleiter Jürgen', 'Jürgen the store manager') },
  { id: 'moebel', branche: 'handel', color: 0x4a3222, name: tr('Möbel Gemütlich', "Cosy Furniture"), line: tr('Neue Bänke für die Auswechselspieler. Gepolstert.', 'New benches for the subs. Cushioned.'), trait: 'grosszuegig', boss: tr('Möbelhändler Gemütlich', 'Gemütlich the furniture dealer') },
  { id: 'hundesalon', branche: 'koerper', color: 0xb08850, name: tr('Hundesalon Wuff', "Woof Dog Grooming"), line: tr('Auch der Vereinshund hat ein Recht auf eine gute Frisur.', 'The club dog deserves a good haircut too.'), trait: 'treu', boss: tr('Hundefriseurin Babsi', 'Babsi the dog groomer') },
  { id: 'computer', branche: 'handel', color: 0x1d2b44, name: tr('PC-Service Bytefix', "Bytefix PC Repairs"), line: tr('Richtet die Vereins-Homepage ein. Seit 2019.', 'Setting up the club website. Since 2019.'), trait: 'ehrgeizig', boss: tr('IT-Kevin', 'Kevin from IT') },
  { id: 'kuechen', branche: 'handwerk', color: 0xf2efe6, name: tr('Küchenstudio Kochlöffel', "Wooden Spoon Kitchens"), line: tr('Die Vereinsheim-Küche wird endlich neu. Irgendwann.', 'The clubhouse kitchen is finally getting redone. Eventually.'), trait: 'knauserig', boss: tr('Küchenplaner Siggi', 'Siggi the kitchen planner') },
  { id: 'schneiderei', branche: 'handwerk', color: 0x8a5a9a, name: tr('Änderungsschneiderei Nadelöhr', 'Eye of the Needle Alterations'), line: tr('Kürzt die Hosen der Neuen, die immer zu lang sind.', "Takes up the new lads' shorts, which are always too long."), trait: 'treu', boss: tr('Schneiderin Frau Yilmaz', 'Mrs Yilmaz the seamstress') },
  { id: 'steuer', branche: 'finanzen', color: 0x4a5a6a, name: tr('Steuerbüro Paragraf', 'Paragraph Accountants'), line: tr('Macht die Vereinsbuchhaltung. Seufzt dabei.', 'Does the club accounts. Sighs while doing it.'), trait: 'knauserig', boss: tr('Steuerberater Herr Dahl', 'Mr Dahl the accountant') },
  { id: 'blumen', branche: 'handel', color: 0xd04a6a, name: tr('Blumen Fleur', 'Fleur Florist'), line: tr('Der Strauß für die Spielerfrauen am Muttertag ist gesichert.', "Mother's Day bouquets for the partners: sorted."), trait: 'treu', boss: tr('Floristin Heike', 'Heike the florist') },
  { id: 'apotheke', branche: 'gesundheit', color: 0x2f9a4a, name: tr('Löwen-Apotheke', 'Lion Pharmacy'), line: tr('Eisspray und Magnesium zum Selbstkostenpreis.', 'Freeze spray and magnesium at cost price.'), trait: 'treu', boss: tr('Apotheker Dr. Löwe', 'Dr Lowe the pharmacist') },
  { id: 'tierarzt', branche: 'gesundheit', color: 0x5aa05a, name: tr('Tierarztpraxis Pfote', 'Paws Vets'), line: tr('Der Vereinshund wird kostenlos geimpft.', 'The club dog gets its jabs for free.'), trait: 'grosszuegig', boss: tr('Tierärztin Dr. Wiese', 'Dr Wiese the vet') },
  { id: 'reinigung', branche: 'dienst', color: 0x6aa6d8, name: tr('Reinigung Frischwind', 'Fresh Breeze Dry Cleaners'), line: tr('Die Trikots kommen zurück, als wäre nie gegrätscht worden.', 'The kits come back as if nobody ever slid in.'), trait: 'knauserig', boss: tr('Frau Blitz von der Reinigung', 'Mrs Blitz from the dry cleaners') },
  { id: 'maler', branche: 'handwerk', color: 0xe0d040, name: tr('Malerbetrieb Pinselstrich', 'Brushstroke Decorators'), line: tr('Die Linien auf dem Platz zieht er nicht. Die Kabine streicht er.', "He won't paint the pitch lines. He'll do the dressing room."), trait: 'ehrgeizig', boss: tr('Malermeister Heiko', 'Heiko the decorator') },
  { id: 'sonnenstudio', branche: 'koerper', color: 0xf09020, name: tr('Sonnenstudio Bräune', 'Golden Glow Tanning'), line: tr('Im Februar sieht die Mannschaft aus wie nach dem Mallorca-Trip.', 'In February the squad looks like it just got back from Magaluf.'), trait: 'grosszuegig', boss: tr('Studiochefin Mandy', 'Mandy from the tanning salon') },
  { id: 'umzug', branche: 'dienst', color: 0x2a5a8a, name: tr('Umzüge Muskelkraft', 'Muscle Power Removals'), line: tr('Wer umzieht, bekommt die halbe Mannschaft als Träger.', 'Moving house? Half the team turns up to carry.'), trait: 'ehrgeizig', boss: tr('Umzugsunternehmer Dragan', 'Dragan from the removals firm') },
  { id: 'schornstein', branche: 'handwerk', color: 0x1c1c1c, name: tr('Schornsteinfeger Glück', 'Lucky Sweep Chimneys'), line: tr('Bringt Glück. Steht so auf dem Transporter.', 'Brings luck. It says so on the van.'), trait: 'treu', boss: tr('Schornsteinfegermeister Ole', 'Ole the chimney sweep') },
  { id: 'imker', branche: 'lebensmittel', color: 0xe0a830, name: tr('Imkerei Summsumm', 'Buzz Buzz Honey'), line: tr('Ein Glas Honig für jeden, der im Winter nicht krank wird.', 'A jar of honey for anyone who stays healthy all winter.'), trait: 'knauserig', boss: tr('Imker Bernd', 'Bernd the beekeeper') },
  { id: 'bowling', branche: 'freizeit', color: 0x9a2ac8, name: tr('Bowlingcenter Strike', 'Strike Bowling'), line: tr('Weihnachtsfeier auf Bahn 3 und 4 ist gebucht.', 'Christmas do on lanes 3 and 4: booked.'), trait: 'ehrgeizig', boss: tr('Bowlingwirt Kalle', 'Kalle from the bowling alley') },
  // Größere Firmen aus der Region: fragen erst ab höheren Ligen an (from = Ligastufe).
  { id: 'stadtwerke', branche: 'energie', color: 0x1a6ab0, name: tr('Stadtwerke Kanalstadt', 'Canal Town Utilities'), line: tr('Strom fürs Flutlicht – und eine Rechnung, die man lesen kann.', 'Power for the floodlights – and a bill you can actually read.'), trait: 'treu', boss: tr('Pressesprecherin der Stadtwerke', 'the utilities press officer'), from: 3 },
  { id: 'bezirksbank', branche: 'finanzen', color: 0xd81e1e, name: tr('Bezirksbank Kanal', 'Canal District Bank'), line: tr('Fördert den Breitensport. Steht so im Geschäftsbericht.', 'Supports grassroots sport. It says so in the annual report.'), trait: 'treu', boss: tr('Filialleiter Herr Kemper', 'Mr Kemper the branch manager'), from: 3 },
  { id: 'brauerei', branche: 'getraenke', color: 0xb07a20, name: tr('Brauerei Kanaltaler', 'Canalside Brewery'), line: tr('Das Freibier nach dem Aufstieg ist vertraglich zugesichert.', 'Free beer after promotion is in the contract.'), trait: 'grosszuegig', boss: tr('Braumeister Ludger', 'Ludger the brewmaster'), from: 3 },
  { id: 'spedition', branche: 'auto', color: 0x2a4a2a, name: tr('Spedition Overkamp', 'Overkamp Haulage'), line: tr('Der Mannschaftsbus ist ein ausgemusterter Lkw. Mit Sitzen.', 'The team bus is a retired lorry. With seats.'), trait: 'ehrgeizig', boss: tr('Spediteur Overkamp', 'Overkamp the haulier'), from: 3 },
  { id: 'baumarkt', branche: 'bau', color: 0xe86a10, name: tr('Baumarkt Hammerhart', 'Hammer Hard DIY'), line: tr('Neue Tornetze, Farbe für die Kabine, ein Werkzeugkasten für den Platzwart.', 'New goal nets, paint for the dressing room, a toolbox for the groundsman.'), trait: 'knauserig', boss: tr('Marktleiter Schröder', 'Schröder the store manager'), from: 4 },
  { id: 'autobahn', branche: 'auto', color: 0x2a6ac8, name: tr('Autohof an der A2', 'Junction 2 Services'), line: tr('Die Bandenwerbung sieht man von der Autobahn. Theoretisch.', 'You can see the boards from the motorway. Theoretically.'), trait: 'ehrgeizig', boss: tr('Autohof-Betreiber Kuhlmann', 'Kuhlmann who runs the services'), from: 4 },
  { id: 'klinik', branche: 'gesundheit', color: 0x4ab0b0, name: tr('Sportklinik am Park', 'Parkside Sports Clinic'), line: tr('MRT innerhalb einer Woche statt in drei Monaten.', 'MRI within a week instead of three months.'), trait: 'grosszuegig', boss: tr('Chefarzt Dr. Brandes', 'Dr Brandes the consultant'), from: 4 },
  { id: 'landmaschinen', branche: 'bau', color: 0x3a8a2a, name: tr('Landmaschinen Hof & Feld', 'Farm & Field Machinery'), line: tr('Leiht für den Platz eine Walze, die eigentlich für Äcker gebaut ist.', 'Lends a roller for the pitch that was really built for fields.'), trait: 'knauserig', boss: tr('Landmaschinenhändler Wübbe', 'Wubbe the machinery dealer'), from: 4 },
];
// Wer fragt in dieser Liga an? Kleine Betriebe immer, große Firmen erst weiter oben.
export const sponsorsFor = (level) => SPONSORS.filter((s) => (s.from ?? 1) <= level);
export const sponsorDef = (id) => SPONSORS.find((s) => s.id === id);
// Chef und Werbespruch immer in der aktuellen Sprache, auch bei gespeicherten Verträgen.
export const bossOf = (s) => sponsorDef(s?.id)?.boss ?? s?.boss ?? '';
export const lineOf = (s) => sponsorDef(s?.id)?.line ?? s?.line ?? '';
// Markenfarbe für den Trikotaufdruck; unbekannte Sponsoren bekommen eine aus dem Namen.
export function sponsorColor(s) {
  const known = sponsorDef(s?.id)?.color ?? s?.color;
  if (known != null) return known;
  let h = 0;
  for (const ch of String(s?.name ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [0xc8352f, 0x2f6fb5, 0x2e7d3a, 0xe0a020, 0x6b4f8c, 0x1c1c1c][h % 6];
}
// Der Sponsor, der vorne auf dem Trikot steht (falls es einen gibt).
export const shirtSponsor = (career) => career?.sponsors?.find((s) => s.slot === 'trikot') ?? null;
// Ärmel und Bande: im Spiel sichtbar (kitPaint.js bzw. die Banden der Spielorte), siehe sponsorShown().
export const sleeveSponsor = (career) => career?.sponsors?.find((s) => s.slot === 'aermel') ?? null;
export const bandeSponsor = (career) => career?.sponsors?.find((s) => s.slot === 'bande') ?? null;
// Was die Spielorte zusätzlich zeigen: Bandenwerbung des Bandenpartners, Namen des Sportplatzes.
export function venueExtras(career) {
  const b = bandeSponsor(career);
  const arena = arenaOf(career);
  if (!b && !arena) return null;
  return { bande: b ? { id: b.id, name: b.name, color: sponsorColor(b) } : null, arena };
}

export const SLOTS = tr(
  { trikot: 'Trikotsponsor', bande: 'Bandenpartner', ball: 'Spielballpate', aermel: 'Ärmelsponsor' },
  { trikot: 'shirt sponsor', bande: 'advertising board', ball: 'match ball sponsor', aermel: 'sleeve sponsor' },
);
const SLOT_PAY = { trikot: [8, 14], bande: [4, 8], ball: [2, 4], aermel: [5, 9] };
export const slotsFor = (level) => (level > 1 ? ['trikot', 'aermel', 'bande', 'ball'] : ['trikot', 'bande', 'ball']);

// Saisonziele der Sponsoren mit Bonus bei Erfüllung.
const GOALS = [
  { type: 'wins', n: [3, 5] },
  { type: 'goals', n: [12, 20] },
  { type: 'rank', n: [2, 3] },
  { type: 'fair', n: [6, 10] },
];
const GOAL_TEXT = {
  wins: (n) => tr(`mindestens ${n} Siege`, `at least ${n} wins`),
  goals: (n) => tr(`mindestens ${n} eigene Tore`, `at least ${n} goals scored`),
  rank: (n) => tr(`am Ende unter den ersten ${n}`, `finish in the top ${n}`),
  fair: (n) => tr(`höchstens ${n} Gelbe Karten`, `no more than ${n} yellow cards`),
};
export const goalText = (goal) => GOAL_TEXT[goal?.type]?.(goal.n) ?? goal?.text ?? '';

export function relLabel(v) {
  if (v >= 80) return tr('begeistert', 'delighted');
  if (v >= 60) return tr('zufrieden', 'happy');
  if (v >= 40) return tr('abwartend', 'wait-and-see');
  if (v >= 20) return tr('skeptisch', 'sceptical');
  return tr('verärgert', 'annoyed');
}

export function adjustRel(s, d) {
  if (s) s.rel = Math.max(0, Math.min(100, Math.round((s.rel ?? 50) + d)));
}

function makeOffer(rng, sp, slot, level, extra = {}) {
  const goal = rng.pick(GOALS);
  const n = rng.int(goal.n[0], goal.n[1]);
  const scale = level > 4 ? 6 : level > 3 ? 4 : level > 2 ? 3 : level > 1 ? 2 : 1;
  const [lo, hi] = SLOT_PAY[slot];
  const weekly = Math.max(1, Math.round(rng.int(lo, hi) * scale * TRAITS[sp.trait].pay));
  return { ...sp, slot, weekly, goal: { type: goal.type, n, text: GOAL_TEXT[goal.type](n) }, bonus: rng.int(4, 8) * 10 * scale, rel: 50, seasons: 0, ...extra };
}

// --- Sperrliste -----------------------------------------------------------------------
// Wer im Streit gegangen ist oder abgelehnt wurde, taucht eine Weile nicht mehr auf – dann verjährt es.
// Eintrag: { id, until } = in Angeboten bis vor Saison `until` gesperrt. Alte Spielstände hatten nur IDs
// (nie verfallend, der Pool schrumpfte): Sie bekommen beim Laden eine Frist ab der laufenden Saison.
export const BAN_SEASONS = 3; // gewählt, nicht gemessen: zwei volle Angebotsrunden ohne den Sponsor, in der dritten darf er wiederkommen
export function liveBans(career) {
  const season = career.season ?? 1;
  career.sponsorBans = (career.sponsorBans ?? [])
    .map((b) => (typeof b === 'string' ? { id: b, until: season + BAN_SEASONS } : b))
    .filter((b) => b.until > season);
  return career.sponsorBans;
}
export function banSponsor(career, id, seasons = BAN_SEASONS) {
  career.sponsorBans = [...liveBans(career).filter((b) => b.id !== id), { id, until: (career.season ?? 1) + seasons }];
}

// Vertragsdaten von Sponsoren nachrüsten (alte Stände, Sponsoren aus Ereignissen): Laufzeit, Wunsch, Branche.
export function normalizeSponsors(career) {
  liveBans(career);
  for (const s of career.sponsors ?? []) {
    const def = sponsorDef(s.id);
    s.term ??= 1;
    s.left ??= 1;
    s.branche ??= def?.branche;
    s.wish ??= newWish(def ?? s, career.season);
  }
  return career;
}

// --- Laufzeiten ----------------------------------------------------------------------
// Je länger die Bindung, desto weniger pro Woche. Gewählt, nicht gemessen: Eine Verlängerung nach gutem Jahr bringt
// bis zu +25 % (Ziel erreicht +15 %, begeistert +10 %, siehe closeSponsors). Wer sich bindet, verzichtet auf diese
// Aufschläge – der Abschlag bleibt darunter: 2 Saisons −8 %, 3 Saisons −15 %.
export const TERM_MUL = { 1: 1, 2: 0.92, 3: 0.85 };
export const TERMS = [1, 2, 3];
// Auf 10 Cent gerundet, damit der Abschlag auch bei kleinen Beträgen (2–3 € in der untersten Liga) sichtbar bleibt.
export const termWeekly = (o, term) => Math.max(1, Math.round(o.weekly * (TERM_MUL[term] ?? 1) * 10) / 10);
const TERM_P = { treu: 0.9, grosszuegig: 0.75, ehrgeizig: 0.55, knauserig: 0.35 };
// Wie wahrscheinlich bindet sich der Sponsor so lange? Gewählt: Eigenart, Stimmung zum Verein, Stammkunde.
export function termChance(o, term) {
  if (term <= 1) return 1;
  const p2 = (TERM_P[o.trait] ?? 0.5) + ((o.rel ?? 50) - 50) / 200 + (o.renew ? 0.1 : 0);
  return Math.max(0.05, Math.min(0.95, term === 2 ? p2 : p2 - 0.3));
}
// Ob er zusagt, ist festgelegt (Seed, Saison, Angebot) – Neuladen ändert das Ergebnis nicht.
export function termWilling(career, o, term, i = 0) {
  if (term <= 1) return true;
  const rng = createRng((career.seed * 53 + career.season * 19 + i * 5 + o.id.length * 7 + term) >>> 0);
  return rng.next() < termChance(o, term);
}

// Angebote vor Saisonbeginn: Verlängerungen zuerst, dann neue Interessenten.
export function makeOffers(career, level) {
  const rng = createRng(career.seed + career.season * 31 + 5);
  career.offersSeason = career.season;
  normalizeSponsors(career);
  const taken = new Set(career.sponsors.map((s) => s.slot));
  const renewals = (career.renewals ?? []).filter((r) => !taken.has(r.slot));
  career.renewals = [];
  const banned = new Set(liveBans(career).map((b) => b.id));
  const used = new Set([...career.sponsors.map((s) => s.id), ...renewals.map((r) => r.id)]);
  // Konkurrenzklausel: Wer sie hat, duldet keinen aus der eigenen Branche daneben.
  const shut = new Set(career.sponsors.filter((s) => s.exclusive).map((s) => s.branche));
  const offers = [...renewals];
  for (const slot of slotsFor(level)) {
    if (taken.has(slot)) continue;
    const n = renewals.some((r) => r.slot === slot) ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const open = sponsorsFor(level).filter((s) => !used.has(s.id) && !(shut.has(s.branche) && !career.sponsors.some((x) => x.id === s.id)));
      // Reicht der Pool nicht (lange Karriere, viele Sperren), dürfen auch Gesperrte wieder fragen – Plätze bleiben besetzbar.
      const pool = open.filter((s) => !banned.has(s.id));
      const pick = pool.length ? pool : open;
      if (!pick.length) break;
      const sp = rng.pick(pick);
      used.add(sp.id);
      offers.push(makeOffer(rng, sp, slot, level));
    }
  }
  career.offers = offers;
  if (career.arena && ![...career.sponsors, ...offers].some((s) => s.id === career.arena.id)) career.arena = null; // Namensgeber nicht mehr dabei
}

// Unterschreiben. term = Laufzeit in Saisons (1–3); wer sich nicht so lange binden will, lehnt ab (Hinweis in sponsorNote).
export function acceptSponsor(career, i, term = 1) {
  const o = career.offers[i];
  if (!o || career.round !== 0 || career.sponsors.some((s) => s.slot === o.slot)) return false;
  if (!TERM_MUL[term]) term = 1;
  if (!termWilling(career, o, term, i)) {
    o.refused = [...new Set([...(o.refused ?? []), term, ...(term === 2 ? [3] : [])])];
    career.sponsorNote = tr(`${bossOf(o)} schüttelt den Kopf: ${term} Jahre Bindung – das ist ihm zu lang. Ein Jahr geht.`, `${bossOf(o)} shakes his head: ${term} years is too long for him. One year is fine.`);
    return false;
  }
  const def = sponsorDef(o.id) ?? o;
  const { refused, ...rest } = o;
  career.sponsors.push({ ...rest, weekly: termWeekly(o, term), term, left: term, branche: def.branche, wish: newWish(def, career.season), since: o.since ?? career.season });
  career.offers = career.offers.filter((x) => x.slot !== o.slot);
  career.sponsorNote = null;
  if (o.renew) chronicle(career, tr(`${o.name} verlängert als ${SLOTS[o.slot]} – ${o.seasons + 1}. Saison zusammen.`, `${o.name} renews as ${SLOTS[o.slot]} – season ${o.seasons + 1} together.`));
  if (term > 1) chronicle(career, tr(`${o.name} bindet sich für ${term} Saisons als ${SLOTS[o.slot]}.`, `${o.name} commits for ${term} seasons as ${SLOTS[o.slot]}.`));
  return true;
}

// Angebot ablehnen: weg, und der Sponsor fragt nächste Saison nicht gleich wieder (eine Runde Pause).
export function declineOffer(career, i) {
  const o = career.offers[i];
  if (!o || career.round !== 0) return false;
  career.offers = career.offers.filter((x) => x !== o);
  banSponsor(career, o.id, 2);
  career.sponsorNote = o.renew
    ? tr(`${bossOf(o)} nimmt die Absage zur Verlängerung mit Fassung: „Man sieht sich."`, `${bossOf(o)} takes the refusal to renew calmly: "See you around."`)
    : tr(`Du sagst ${o.name} ab. ${bossOf(o)}: „Schade, schade."`, `You turn ${o.name} down. ${bossOf(o)}: "Pity, that."`);
  return true;
}

// Spieltage, die dieser Vertrag noch läuft (laufende Saison + gebuchte Folgesaisons).
export function weeksLeft(career, s) {
  const season = career.fixtures?.length ?? 10;
  return Math.max(0, season - career.round) + Math.max(0, (s.left ?? 1) - 1) * season;
}
// Vertragsstrafe bei eigener Kündigung. Gewählt, nicht gemessen: die Hälfte der noch ausstehenden Wochenzahlungen.
export const PENALTY_SHARE = 0.5;
export const cancelCost = (career, s) => Math.round(s.weekly * weeksLeft(career, s) * PENALTY_SHARE);
// Eigene Kündigung: Strafe aus der Kasse, die anderen Sponsoren sind verunsichert, der Sponsor ist lange raus.
export function cancelSponsor(career, i) {
  const s = career.sponsors[i];
  if (!s) return false;
  const cost = cancelCost(career, s);
  career.sponsors = career.sponsors.filter((x) => x !== s);
  if (cost) book(career, tr(`Vertragsstrafe ${s.name}`, `Contract penalty ${s.name}`), -cost);
  banSponsor(career, s.id);
  if (career.arena?.id === s.id) career.arena = null;
  for (const o of career.sponsors) adjustRel(o, -6); // spricht sich im Ort herum
  chronicle(career, tr(`Der Verein kündigt ${s.name} als ${SLOTS[s.slot]} – das Kreisblatt berichtet.`, `The club terminates ${s.name} as ${SLOTS[s.slot]} – the District Gazette reports it.`));
  // Vor der Saison darf ein anderer einspringen.
  if (career.round === 0) {
    const level = career.level ?? 1;
    const used = new Set([...career.sponsors.map((x) => x.id), ...career.offers.map((x) => x.id), s.id]);
    const banned = new Set(liveBans(career).map((b) => b.id));
    const open = sponsorsFor(level).filter((x) => !used.has(x.id));
    const pool = open.filter((x) => !banned.has(x.id));
    const rng = createRng((career.seed + career.season * 37 + i * 11) >>> 0);
    const pick = pool.length ? pool : open;
    if (pick.length) career.offers.push(makeOffer(rng, rng.pick(pick), s.slot, level));
  }
  career.sponsorNote = cost
    ? tr(`${bossOf(s)} nimmt die ${cost} € Vertragsstrafe und geht. „Das merkt man sich im Ort."`, `${bossOf(s)} takes the €${cost} penalty and goes. "People in town will remember that."`)
    : tr(`${bossOf(s)} geht grußlos. „Das merkt man sich im Ort."`, `${bossOf(s)} leaves without a word. "People in town will remember that."`);
  return true;
}

// Wunsch des Sponsors selbst erfüllen (Autogrammstunde, Foto, Aufkleber, Rabatt, Jugendcamp).
export function fulfillWish(career, i) {
  const s = career.sponsors[i];
  const w = WISHES[s?.wish?.kind];
  if (!s || !w || w.kind !== 'tat' || s.wish.done) return false;
  const cost = wishCost(s.wish, s.weekly);
  if (cost > 0 && career.cash < cost) return 'nocash';
  if (cost > 0) book(career, `${w.label} (${s.name})`, -cost);
  s.wish.done = true;
  adjustRel(s, w.rel);
  adjustMood(career, w.mood);
  if (w.press) career.flags.pressWeeks = Math.max(career.flags.pressWeeks ?? 0, w.press);
  career.sponsorNote = tr(`${bossOf(s)} freut sich über: ${w.label}.`, `${bossOf(s)} is pleased about: ${w.label}.`);
  return true;
}

// Nachverhandeln: Wer gut dasteht, bekommt mehr. Wer zu hoch pokert, verliert das Angebot.
export function negotiate(career, i) {
  const o = career.offers[i];
  if (!o || o.negotiated || career.round !== 0) return null;
  const rng = createRng((career.seed * 41 + career.season * 17 + i * 7 + o.id.length) >>> 0);
  const last = career.history?.at(-1);
  const standing = 0.5 * (career.mood ?? 0) + (last ? (last.pos <= 2 ? 0.2 : last.pos >= 5 ? -0.15 : 0) : 0) + (o.renew ? 0.15 : 0);
  const p = Math.max(0.1, Math.min(0.85, TRAITS[o.trait].haggle + standing));
  const boss = bossOf(o);
  o.negotiated = true;
  const run = outcome([
    { w: p * 3, run: () => ((o.weekly = Math.round(o.weekly * 1.3)), tr(`${boss} lacht: „Ihr habt Mumm." ${o.weekly} € pro Spieltag – 30 % mehr.`, `${boss} laughs: "You've got guts." €${o.weekly} per matchday – 30 % more.`)) },
    { w: 2, run: () => ((o.weekly = Math.round(o.weekly * 1.1 + 0.5)), tr(`Zäh, aber es geht was: ${o.weekly} € pro Spieltag.`, `Hard going, but there's some movement: €${o.weekly} per matchday.`)) },
    { w: 1.5, run: () => ((o.bonus = Math.round(o.bonus * 1.5)), (o.weekly = Math.max(1, o.weekly - 1)), tr(`${boss} bietet was anderes an: weniger pro Woche, aber ${o.bonus} € Bonus bei ${goalText(o.goal)}.`, `${boss} offers something different: less per week, but a €${o.bonus} bonus for ${goalText(o.goal)}.`)) },
    { w: (1 - p) * 3, run: () => tr(`${boss} schüttelt den Kopf: „Mehr ist nicht drin." Das Angebot steht trotzdem.`, `${boss} shakes his head: "That's as far as I go." The offer still stands.`) },
    {
      w: (1 - p) * (o.trait === 'knauserig' ? 2.5 : 1.2),
      run: (c) => {
        c.offers = c.offers.filter((x) => x !== o);
        return tr(`${boss} steht auf: „Dann eben nicht." Das Angebot ist weg.`, `${boss} stands up: "Suit yourselves." The offer is gone.`);
      },
    },
    { w: o.trait === 'grosszuegig' ? 1 : 0.3, run: () => ((o.weekly += 2), (o.bonus += 20), (o.rel = 65), tr(`${boss} spendiert eine Runde und legt drauf: ${o.weekly} € pro Spieltag, ${o.bonus} € Bonus. „Für den Verein!"`, `${boss} buys a round and adds more: €${o.weekly} per matchday, €${o.bonus} bonus. "For the club!"`)) },
  ]);
  const text = run(career, {}, rng);
  career.sponsorNote = text;
  return text;
}

// Jede Woche: Geld (wer verärgert ist, zahlt schleppend) und ein wachsames Auge aufs Ergebnis.
export function paySponsors(career) {
  normalizeSponsors(career);
  const nagRound = Math.floor((career.fixtures?.length ?? 10) * 0.6);
  for (const s of career.sponsors) {
    // Mitten in der Saison erinnert er an seinen Wunsch – wer ihn weiter ignoriert, verliert Wohlwollen.
    if (s.wish && !s.wish.done && !s.nagged && career.round >= nagRound) {
      s.nagged = true;
      adjustRel(s, -3);
      career.week?.chat.push({ from: null, text: tr(`${bossOf(s)} (${s.name}) fragt nach: ${wishLabel(s.wish)} – das stand doch im Gespräch.`, `${bossOf(s)} (${s.name}) asks: ${wishLabel(s.wish)} – we did talk about that.`), time: 'Fr 17:00' });
    }
    if (s.pause > 0) {
      s.pause--;
      continue;
    }
    if ((s.rel ?? 50) < 20 && ((career.round + s.id.length) % 3 === 0)) {
      s.owed = (s.owed ?? 0) + s.weekly;
      continue; // „Kommt nächste Woche, versprochen."
    }
    book(career, `${s.name} (${SLOTS[s.slot]})`, s.weekly + (s.owed ?? 0));
    s.owed = 0;
  }
  // Wer ganz unten ist, kündigt mitten in der Saison – außer ein mehrjähriger Vertrag bindet ihn (dafür gibt es den Abschlag).
  const gone = career.sponsors.filter((s) => (s.rel ?? 50) <= 5 && (s.left ?? 1) <= 1);
  for (const s of gone) {
    career.sponsors = career.sponsors.filter((x) => x !== s);
    banSponsor(career, s.id);
    career.week?.chat.push({ from: null, text: tr(`${s.name} kündigt den Vertrag als ${SLOTS[s.slot]}. ${bossOf(s)}: „So nicht."`, `${s.name} cancels the ${SLOTS[s.slot]} deal. ${bossOf(s)}: "Not like this."`), time: 'Fr 17:00' });
  }
}

// Nach jedem eigenen Spiel: Sieg freut, Niederlage ärgert – und Prämien werden fällig.
export function sponsorResult(career, gf, ga, home = false) {
  const prem = career.flags?.sponsorPremium;
  for (const s of career.sponsors) {
    const t = TRAITS[s.trait] ?? TRAITS.treu;
    adjustRel(s, gf > ga ? t.win : gf < ga ? t.loss : 0);
    countWish(career, s, gf, ga, home);
  }
  if (prem && prem.round === career.round) {
    const s = career.sponsors.find((x) => x.id === prem.id);
    if (gf > ga) {
      book(career, tr(`Siegprämie ${prem.name}`, `Win bonus ${prem.name}`), prem.amount);
      adjustRel(s, 5);
    } else if (prem.double) {
      book(career, tr(`Doppelt oder nichts verloren (${prem.name})`, `Double or nothing lost (${prem.name})`), -Math.round(prem.amount / 2));
      adjustRel(s, -4);
    } else adjustRel(s, -3);
    career.flags.sponsorPremium = null;
  }
}

// Wünsche, die sich im Spielverlauf erfüllen (Heimsiege, ohne Gegentor, viele Tore): zählen, bei Erreichen belohnen.
function countWish(career, s, gf, ga, home) {
  const wish = s.wish;
  const w = WISHES[wish?.kind];
  if (!w || w.kind !== 'spiel' || wish.done) return;
  const hit = (wish.kind === 'heim' && home && gf > ga) || (wish.kind === 'nullzu' && ga === 0) || (wish.kind === 'tore3' && gf >= 3);
  if (!hit) return;
  wish.count++;
  if (wish.count < wish.n) return;
  wish.done = true;
  adjustRel(s, w.rel);
  adjustMood(career, w.mood);
  career.week?.chat.push({ from: null, text: tr(`${bossOf(s)} (${s.name}) strahlt: ${wishLabel(wish)} – geschafft! Er lässt sich nicht lumpen.`, `${bossOf(s)} (${s.name}) beams: ${wishLabel(wish)} – done! He is not stingy about it.`), time: 'So 18:00' });
}

export function goalReached(goal, { wins, goals, rank, cards }) {
  if (goal.type === 'wins') return wins >= goal.n;
  if (goal.type === 'goals') return goals >= goal.n;
  if (goal.type === 'rank') return rank <= goal.n;
  if (goal.type === 'fair') return cards <= goal.n;
  return false;
}

// Wie steht es gerade ums Saisonziel?
export function goalProgress(career, goal) {
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human);
  const own = rows[pos];
  if (goal.type === 'wins') return tr(`${own.w} / ${goal.n} Siege`, `${own.w} / ${goal.n} wins`);
  if (goal.type === 'goals') return tr(`${own.gf} / ${goal.n} Tore`, `${own.gf} / ${goal.n} goals`);
  if (goal.type === 'rank') return tr(`aktuell Platz ${pos + 1}`, `currently ${pos + 1}.`);
  if (goal.type === 'fair') return tr(`${career.seasonCards ?? 0} / ${goal.n} Gelbe`, `${career.seasonCards ?? 0} / ${goal.n} yellows`);
  return '';
}

// Fortschritt zum Saisonziel als Zahl für die Anzeige: { cur, n, pct, ok, text }.
export function goalStatus(career, goal) {
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human);
  const own = rows[pos];
  const cur = goal.type === 'wins' ? own.w : goal.type === 'goals' ? own.gf : goal.type === 'rank' ? pos + 1 : career.seasonCards ?? 0;
  const ok = goal.type === 'rank' || goal.type === 'fair' ? cur <= goal.n : cur >= goal.n;
  // Balken: bei „mindestens" Anteil am Ziel, bei „höchstens"/„Platz" voll, solange es noch passt.
  const pct = goal.type === 'rank' || goal.type === 'fair' ? (ok ? 100 : 0) : Math.min(100, Math.round((cur / Math.max(1, goal.n)) * 100));
  return { cur, n: goal.n, pct, ok, text: goalProgress(career, goal) };
}

// Saisonende: Bonus, Wunsch-Bilanz; Mehrjahresverträge laufen weiter, wer zufrieden ist, bietet sonst die Verlängerung an.
export function closeSponsors(career, summary) {
  career.renewals = [];
  normalizeSponsors(career);
  const notes = [];
  const keep = [];
  for (const s of career.sponsors) {
    const reached = goalReached(s.goal, summary);
    if (reached) {
      book(career, `${tr('Bonus', 'Bonus')} ${s.name}: ${goalText(s.goal)}`, s.bonus);
      adjustRel(s, 15);
    } else adjustRel(s, -10);
    if (s.wish && !s.wish.done) {
      adjustRel(s, -WISH_PENALTY);
      notes.push(tr(`${bossOf(s)} (${s.name}) hat nicht vergessen: ${wishLabel(s.wish)} – daraus wurde nichts.`, `${bossOf(s)} (${s.name}) has not forgotten: ${wishLabel(s.wish)} – nothing came of it.`));
    }
    if ((s.left ?? 1) > 1) {
      // Bindung läuft weiter: gleiche Wochenzahlung, neues Ziel, neuer Wunsch.
      const rng = createRng((career.seed + career.season * 17 + s.id.length) >>> 0);
      const fresh = makeOffer(rng, sponsorDef(s.id) ?? s, s.slot, career.level ?? 1);
      const { nagged, ...rest } = s;
      keep.push({ ...rest, left: s.left - 1, seasons: (s.seasons ?? 0) + 1, goal: fresh.goal, bonus: fresh.bonus, wish: newWish(sponsorDef(s.id) ?? s, career.season + 1), pause: 0 });
      continue;
    }
    const loyal = s.trait === 'treu' ? 10 : 0;
    if ((s.rel ?? 50) + loyal >= 55) {
      const rng = createRng((career.seed + career.season * 13 + s.id.length) >>> 0);
      const raise = 1 + (reached ? 0.15 : 0) + ((s.rel ?? 50) >= 80 ? 0.1 : 0);
      const fresh = makeOffer(rng, sponsorDef(s.id) ?? s, s.slot, career.level ?? 1);
      career.renewals.push({ ...fresh, weekly: Math.max(fresh.weekly, Math.round(s.weekly * raise)), rel: Math.min(100, (s.rel ?? 50) + 5), seasons: (s.seasons ?? 0) + 1, since: s.since ?? career.season, renew: true });
    } else if ((s.rel ?? 50) < 30) notes.push(tr(`${s.name} verlängert nicht. ${bossOf(s)}: „War nett. War aber auch nicht gut."`, `${s.name} will not renew. ${bossOf(s)}: "It was nice. It just wasn't any good."`));
  }
  career.sponsors = keep;
  career.offers = [];
  career.sponsorNotes = notes;
  return notes;
}

// --- Ereignisse rund um die Sponsoren -------------------------------------------------

// Namensrechte am Sportplatz: "Krume-Arena" steht am Vereinsheim, in der Kasse und in der Chronik.
const ARENA_BRAND = { physio: 'Physio', gruenzeug: 'Grünzeug', nagelstudio: 'Glamour', hofladen: 'Kuhglück', tattoo: 'Nadelwerk', reisebuero: 'Fernweh', imbiss: 'Currywurst', zahnarzt: 'Biss', schluessel: 'Sesam', moebel: 'Gemütlich', hundesalon: 'Wuff', computer: 'Bytefix', kuechen: 'Kochlöffel', schneiderei: 'Nadelöhr', steuer: 'Paragraf', blumen: 'Fleur', apotheke: 'Löwen', tierarzt: 'Pfote', reinigung: 'Frischwind', maler: 'Pinselstrich', sonnenstudio: 'Bräune', umzug: 'Muskelkraft', schornstein: 'Glück', imker: 'Summsumm', bowling: 'Strike', brauerei: 'Kanaltaler', spedition: 'Overkamp', baumarkt: 'Hammerhart', autobahn: 'Autohof', klinik: 'Sportklinik', landmaschinen: 'Hof & Feld', enzo: 'Da Enzo', fliesen: 'Fugenfrei', optik: 'Scharfblick', eisdiele: 'Venezia', handy: 'Handy-Doktor', fahrrad: 'Speiche', baustoffe: 'Brockmann', lindenwirt: 'Linde', solar: 'Sonnenschein', taxi: 'Tempo', vollgas: 'Vollgas' };
export const arenaName = (id) => `${ARENA_BRAND[id] ?? id.charAt(0).toUpperCase() + id.slice(1)}-Arena`;
// Der Name, solange der Namensgeber noch Sponsor ist (sonst fällt er weg).
export function arenaOf(career) {
  const a = career.arena;
  if (!a) return null;
  const here = (list) => (list ?? []).some((s) => s.id === a.id);
  return here(career.sponsors) || (career.round === 0 && (here(career.offers) || here(career.renewals))) ? a.name : null;
}
function nameArena(c, s, amount, name) {
  c.arena = { id: s.id, name, since: c.season };
  book(c, tr(`Namensrechte ${name}`, `Naming rights ${name}`), Math.max(0, Math.round(amount)));
  chronicle(c, tr(`Der Sportplatz heißt jetzt „${name}" – ${s.name} sichert sich die Namensrechte.`, `The ground is now called "${name}" – ${s.name} has secured the naming rights.`));
}
// Sponsor ohne Strafe entfernen (Skandalklausel o. Ä.) und eine Weile sperren.
function dropSponsor(c, s) {
  c.sponsors = c.sponsors.filter((x) => x !== s);
  banSponsor(c, s.id);
  if (c.arena?.id === s.id) c.arena = null;
}

const mates = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));
const pickSponsor = (c, rng, f = () => true) => {
  const list = (c.sponsors ?? []).filter(f);
  return list.length ? rng.pick(list) : null;
};
const sp = (c, ctx) => c.sponsors?.find((s) => s.id === ctx.id);
const withSponsor = (fn) => (c, ctx, rng) => {
  const s = sp(c, ctx);
  return s ? fn(c, ctx, rng, s, bossOf(s)) : tr('Der Sponsor hat sich inzwischen erledigt.', 'The sponsor has since dropped out anyway.');
};

export const SPONSOR_EVENTS = {
  sponsor_fototermin: {
    weight: 1.2,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      if (!s || c.round < 1) return null;
      const star = [...mates(c)].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0];
      return star != null ? { id: s.id, name: s.name, star } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} will ein Werbefoto für das Schaufenster. Am liebsten mit ${first(c, ctx.star)}, „dem Guten".`, `${ctx.name} wants an advertising photo for the shop window. Ideally with ${first(c, ctx.star)}, "the good one".`),
    options: [
      {
        label: tr('Den Star hinschicken', 'Send the star'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), tr(`${first(c, ctx.star)} lächelt wie ein Profi. Das Foto hängt jetzt neben den Mettbrötchen.`, `${first(c, ctx.star)} smiles like a pro. The photo now hangs next to the sausage rolls.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), (c.players[ctx.star].grumpy = 2), tr(`${first(c, ctx.star)} macht es, murrt aber: „Ich bin Fußballer, kein Model."`, `${first(c, ctx.star)} does it, but grumbles: "I'm a footballer, not a model."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), book(c, tr(`Honorar Fotoshooting ${s.name}`, `Photo shoot fee ${s.name}`), 25), tr('Das Foto kommt so gut an, dass es 25 € Honorar gibt.', 'The photo goes down so well there is a €25 fee.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -5), adjustMood(c, -0.03), tr(`${first(c, ctx.star)} vergisst den Termin. ${boss} hat umsonst die Deko aufgebaut.`, `${first(c, ctx.star)} forgets the appointment. ${boss} set up the decorations for nothing.`))) },
          { w: 0.8, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 8), (c.flags.pressWeeks = 2), tr('Das Kreisblatt druckt das Werbefoto nach. Mehr Zuschauer am Sonntag.', 'The District Gazette reprints the photo. More spectators on Sunday.'))) },
        ]),
      },
      {
        label: tr('Die ganze Mannschaft kommt', 'The whole team goes'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.05), tr('Mannschaftsfoto im Laden. Einer steht mit dem Kopf im Regal, alle lachen.', 'Team photo in the shop. One of them has his head in the shelves, everyone laughs.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 6), book(c, tr('Brötchen und Kaffee für alle (auf Vereinskosten)', 'Rolls and coffee for everyone (on the club)'), -15), tr('Hinterher gibt es Kaffee – leider auf Vereinskosten.', 'Coffee afterwards – sadly on the club.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -4), tr('Nur vier kommen. Das Foto sieht aus wie ein Kegelclub.', 'Only four turn up. The photo looks like a bowling club.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 18), adjustMood(c, 0.04), tr(`${boss} ist so gerührt, dass er Trikots für die Jugend spendiert.`, `${boss} is so touched he donates shirts for the youth teams.`))) },
        ]),
      },
      { label: tr('Keine Zeit, wir sind Fußballer', 'No time, we are footballers'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -8), tr(`${boss} ist beleidigt. Die Brötchen sind am Sonntag etwas kleiner.`, `${boss} is offended. The rolls are a bit smaller on Sunday.`))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), tr('Der Sponsor nimmt stattdessen seinen Hund aufs Foto. Kommt super an.', 'The sponsor puts his dog in the photo instead. Goes down a treat.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), tr(`Beim nächsten Heimspiel fehlt ${s.name} auf der Tribüne. Absichtlich.`, `At the next home game ${s.name} is missing from the stand. On purpose.`))) }]) },
    ],
  },

  sponsor_sohn: {
    weight: 0.9,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s), son: rng.pick(tr(['Kevin-Pascal', 'Justin', 'Maximilian', 'Jannik', 'Leon'], ['Tyler-Jay', 'Brandon', 'Jayden', 'Kai', 'Liam'])) } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} ruft an: Sein Sohn ${ctx.son} (19) will unbedingt mitspielen. „Er ist wirklich talentiert. Sagt seine Mutter."`, `${ctx.boss} calls: his son ${ctx.son} (19) is desperate to play. "He's really talented. His mother says so."`),
    options: [
      {
        label: tr('Er darf am Sonntag ran', 'He can play on Sunday'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), adjustMood(c, -0.05), tr(`${ctx.son} spielt zwanzig Minuten und stolpert über den Ball. Der Vater filmt alles. Die Mannschaft verdreht die Augen.`, `${ctx.son} plays twenty minutes and trips over the ball. His father films everything. The team rolls its eyes.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), adjustMood(c, 0.04), tr(`${ctx.son} ist tatsächlich brauchbar! Keiner hat es geglaubt, am wenigsten er selbst.`, `${ctx.son} is actually decent! Nobody believed it, least of all him.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), book(c, tr(`Spende ${s.name} (stolzer Vater)`, `Donation ${s.name} (proud father)`), 50), tr(`${ctx.son} schießt ein Tor, gegen einen Torwart mit Grippe. Der Vater spendet 50 €.`, `${ctx.son} scores a goal against a keeper with flu. His father donates €50.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -6), adjustMood(c, -0.06), tr(`${ctx.son} beschwert sich beim Papa über „das Niveau". ${boss} ruft wieder an.`, `${ctx.son} complains to his dad about "the standard". ${boss} calls again.`))) },
        ]),
      },
      {
        label: tr('Erst mal Probetraining', 'A trial session first'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), tr(`${ctx.son} kommt, schwitzt, kommt nicht wieder. Alle sind zufrieden.`, `${ctx.son} comes, sweats, never comes back. Everyone is happy.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), adjustMood(c, 0.03), tr(`${ctx.son} ist nett und bringt Kuchen mit. Kein Fußballer, aber jetzt Betreuer am Getränkewagen.`, `${ctx.son} is nice and brings cake. No footballer, but now he runs the drinks trolley.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -10), tr(`${ctx.son} erzählt zu Hause, er sei „gemobbt" worden. Er hat nur einen Ball an den Kopf bekommen.`, `${ctx.son} tells them at home he was "bullied". He just took a ball to the head.`))) },
        ]),
      },
      {
        label: tr('Ehrlich absagen – bei uns spielt, wer trainiert', 'Say no honestly – here, whoever trains plays'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), adjustMood(c, 0.06), tr('Die Mannschaft rechnet dir das hoch an. Der Sponsor weniger.', 'The team respects you for it. The sponsor less so.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 2), tr(`${boss} brummt: „Hätte ich an Ihrer Stelle auch gemacht."`, `${boss} grunts: "I'd have done the same in your shoes."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -30), adjustMood(c, 0.04), tr(`${boss} ist tief beleidigt und spricht von „Konsequenzen". Die Brötchen sind jetzt richtig klein.`, `${boss} is deeply offended and talks about "consequences". The rolls are really small now.`))) },
        ]),
      },
    ],
  },

  sponsor_konkurrenz: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => (x.slot === 'trikot' || x.slot === 'aermel') && (x.left ?? 1) <= 1); // gebundene Verträge sind tabu
      if (!s || c.round < 3) return null;
      const used = new Set([...c.sponsors.map((x) => x.id), ...liveBans(c).map((b) => b.id)]);
      const pool = sponsorsFor(c.level ?? 1).filter((x) => !used.has(x.id));
      if (!pool.length) return null;
      const rival = rng.pick(pool);
      return { id: s.id, name: s.name, rival: rival.id, rivalName: rival.name, offer: Math.round(s.weekly * 1.4 + 2) };
    },
    text: (c, ctx) => tr(`${ctx.rivalName} will auf euer Trikot – und bietet ${ctx.offer} € pro Spieltag. Aktuell steht dort ${ctx.name}.`, `${ctx.rivalName} wants to be on your shirt – and offers €${ctx.offer} per matchday. Right now it says ${ctx.name}.`),
    options: [
      {
        label: tr('Wechseln – Geld ist Geld', 'Switch – money is money'),
        effect: outcome([
          {
            w: 3,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              banSponsor(c, s.id);
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 55, seasons: 0, since: c.season });
              chronicle(c, tr(`Trikotwechsel mitten in der Saison: ${def.name} ersetzt ${s.name}.`, `Shirt change mid-season: ${def.name} replaces ${s.name}.`));
              return tr(`Neue Trikots mit ${def.name}. ${boss} grüßt dich nicht mehr beim Bäcker.`, `New shirts with ${def.name}. ${boss} no longer says hello at the bakery.`);
            }),
          },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              banSponsor(c, s.id);
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 40, seasons: 0, since: c.season });
              book(c, tr('Neue Trikots beflocken lassen', 'New shirt printing'), -30);
              adjustMood(c, -0.04);
              return tr('Gewechselt – aber die neuen Trikots muss der Verein beflocken lassen (30 €). Und die Jungs mochten die alten.', 'Switched – but the club has to pay for the new printing (€30). And the lads liked the old ones.');
            }),
          },
        ]),
      },
      {
        label: tr('Als Druckmittel nutzen', 'Use it as leverage'),
        effect: outcome([
          { w: 2.5, run: withSponsor((c, ctx, rng, s, boss) => ((s.weekly = Math.round((s.weekly + ctx.offer) / 2)), adjustRel(s, -5), tr(`${boss} zieht zähneknirschend nach: ${s.weekly} € pro Spieltag.`, `${boss} grudgingly matches it halfway: €${s.weekly} per matchday.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => ((s.weekly = ctx.offer), adjustRel(s, 5), tr(`${boss}: „Was die können, kann ich schon lange." ${s.weekly} € pro Spieltag.`, `${boss}: "Anything they can do, I can do better." €${s.weekly} per matchday.`))) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              banSponsor(c, s.id);
              return tr(`Verzockt. ${boss} steigt beleidigt aus, und ${ctx.rivalName} hat inzwischen den Nachbarverein gefunden. Der Platz ist leer.`, `Overplayed. ${boss} pulls out in a huff, and ${ctx.rivalName} has since found the club next door. The slot is empty.`);
            }),
          },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -15), tr(`${boss} bleibt beim alten Betrag und ist jetzt dauerhaft eingeschnappt.`, `${boss} sticks to the old amount and is now permanently sulking.`))) },
        ]),
      },
      { label: tr('Treu bleiben', 'Stay loyal'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 15), tr(`${boss} erfährt davon und ist gerührt. „Das vergess ich euch nicht."`, `${boss} hears about it and is touched. "I won't forget that."`))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 20), (s.bonus += 20), tr(`${boss} legt 20 € auf den Saisonbonus drauf. Treue lohnt sich.`, `${boss} adds €20 to the season bonus. Loyalty pays.`))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), tr('Ob er es je erfährt? Egal. Man bleibt sich treu.', 'Will he ever find out? Doesn\'t matter. You stay loyal.'))) }]) },
    ],
  },

  sponsor_pleite: {
    weight: 0.35,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait !== 'grosszuegig');
      return s && c.round >= 3 ? { id: s.id, name: s.name, boss: bossOf(s) } : null;
    },
    text: (c, ctx) => tr(`Schlechte Nachrichten: ${ctx.name} steckt in Schwierigkeiten. ${ctx.boss} fragt, ob er die nächsten Wochen aussetzen darf.`, `Bad news: ${ctx.name} is in trouble. ${ctx.boss} asks if he can skip payments for the next few weeks.`),
    options: [
      {
        label: tr('Die Mannschaft kauft dort ein – Rettungsaktion', 'The team shops there – rescue mission'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 30), adjustMood(c, 0.06), chronicle(c, tr(`Rettungsaktion für ${s.name}: Die ganze Mannschaft kauft eine Woche nur dort ein.`, `Rescue mission for ${s.name}: the whole team shops only there for a week.`)), tr(`Eine Woche lang kauft die ganze Mannschaft bei ${s.name}. ${boss} weint fast. Der Laden bleibt offen.`, `For a whole week the team shops at ${s.name}. ${boss} almost cries. The shop stays open.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 25), (s.weekly = Math.max(1, s.weekly - 2)), tr('Der Laden überlebt, zahlt aber erst mal 2 € weniger. Ehrensache.', 'The shop survives, but pays €2 less for now. Only right.'))) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              return tr(`Es reicht leider nicht. ${s.name} schließt. ${boss} schenkt dem Verein zum Abschied das Ladenschild – es hängt jetzt im Vereinsheim.`, `Sadly it's not enough. ${s.name} closes. ${boss} gives the club the shop sign as a farewell – it now hangs in the clubhouse.`);
            }),
          },
        ]),
      },
      {
        label: tr('Aussetzen lassen', 'Let him pause payments'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => ((s.pause = 3), adjustRel(s, 20), tr('Drei Wochen ohne Geld. Dafür ein Sponsor fürs Leben.', 'Three weeks without money. But a sponsor for life.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 25), (s.bonus += 30), tr(`${boss} berappelt sich schneller als gedacht und legt 30 € auf den Bonus. „Das vergess ich euch nie."`, `${boss} recovers faster than expected and adds €30 to the bonus. "I'll never forget that."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (c.sponsors = c.sponsors.filter((x) => x !== s), tr('Aus drei Wochen werden zehn, dann ist der Laden zu. Immerhin im Guten.', 'Three weeks become ten, then the shop closes. At least on good terms.'))) },
        ]),
      },
      {
        label: tr('Vertrag ist Vertrag', 'A contract is a contract'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s, boss) => (book(c, tr(`Letzte Rate ${s.name}`, `Final payment ${s.name}`), s.weekly * 2), (c.sponsors = c.sponsors.filter((x) => x !== s)), banSponsor(c, s.id), adjustMood(c, -0.04), tr(`${boss} zahlt zwei Raten und kündigt. Im Ort redet man darüber.`, `${boss} pays two instalments and cancels. The whole town is talking about it.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -25), tr(`${boss} zahlt weiter, mit zusammengebissenen Zähnen.`, `${boss} keeps paying, through gritted teeth.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => ((c.sponsors = c.sponsors.filter((x) => x !== s)), adjustMood(c, -0.08), tr('Der Anwalt des Sponsors meldet sich. Kein Geld, dafür viel Ärger.', 'The sponsor\'s lawyer gets in touch. No money, lots of trouble.'))) },
        ]),
      },
    ],
  },

  sponsor_praemie: {
    weight: 1,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait === 'ehrgeizig' || x.trait === 'grosszuegig');
      return s && !c.flags?.sponsorPremium ? { id: s.id, name: s.name, boss: bossOf(s), amount: (c.level ?? 1) > 1 ? 60 : 40 } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} ist heiß auf Sonntag: „Wenn ihr gewinnt, gibt es ${ctx.amount} € Siegprämie!"`, `${ctx.boss} is fired up for Sunday: "Win and there's a €${ctx.amount} bonus!"`),
    options: [
      { label: tr('Angenommen!', 'Deal!'), effect: outcome([{ w: 3, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), tr('Prämie angenommen. Die Jungs trainieren plötzlich freiwillig.', 'Bonus accepted. Suddenly the lads are training voluntarily.')) }, { w: 1, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), adjustMood(c, 0.04), tr('Die Gruppe rechnet schon aus, wie viele Kästen das sind.', 'The group is already working out how many crates that is.')) }]) },
      { label: tr('Doppelt oder nichts', 'Double or nothing'), effect: outcome([{ w: 2, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount * 2, round: c.round, double: true }), tr(`„Doppelt oder nichts – und bei Niederlage zahlt ihr die Hälfte." Es geht um ${ctx.amount * 2} €.`, `"Double or nothing – and if you lose, you pay half." €${ctx.amount * 2} at stake.`)) }, { w: 1, run: (c, ctx) => (adjustRel(sp(c, ctx), -3), (c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), tr(`${ctx.boss} winkt ab: „Übertreibt es nicht." Es bleibt bei ${ctx.amount} €.`, `${ctx.boss} waves it off: "Don't push it." It stays at €${ctx.amount}.`)) }]) },
      { label: tr('Danke, wir spielen auch so', 'Thanks, we\'ll play anyway'), effect: outcome([{ w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), tr('Der Sponsor ist irritiert, aber einverstanden.', 'The sponsor is puzzled, but fine with it.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 4), adjustMood(c, 0.02), tr(`${boss}: „Ehrenamt pur. Respekt."`, `${boss}: "Pure amateur spirit. Respect."`))) }]) },
    ],
  },

  sponsor_werbespot: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s) } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} dreht einen Werbespot fürs Lokalradio-Internet. Die Mannschaft soll „authentisch jubeln". 30 € Gage.`, `${ctx.name} is shooting an ad for the local radio's website. The team is supposed to "celebrate authentically". €30 fee.`),
    options: [
      {
        label: tr('Machen wir!', 'We\'re in!'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustRel(s, 10), tr('Zwölf Takes, bis der Jubel echt aussieht. Beim dreizehnten war er echt, weil Feierabend war.', 'Twelve takes until the celebration looks real. The thirteenth was real, because it was home time.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustRel(s, 15), (c.flags.pressWeeks = 3), tr('Der Spot geht im Ort herum. Plötzlich kennt euch jeder – mehr Zuschauer!', 'The ad does the rounds in town. Suddenly everyone knows you – more spectators!'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustMood(c, -0.05), tr('Im Spot sieht man nur den Trainer beim Stolpern. Der Clip wird im Gegnerlager rauf und runter gespielt.', 'All you see in the ad is the manager tripping over. The clip is played on repeat by the opposition.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2); return (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), tr(`${first(c, s2)} zerrt sich beim Torjubel für die Kamera. Sonntag fehlt er.`, `${first(c, s2)} pulls a muscle celebrating for the camera. He misses Sunday.`)); }) },
        ]),
      },
      { label: tr('Nein, wir sind doch keine Schauspieler', 'No, we are not actors'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -6), tr('Der Sponsor dreht mit seinen Azubis. Die jubeln, als hätten sie noch nie einen Ball gesehen.', 'The sponsor shoots it with his apprentices. They celebrate as if they had never seen a ball.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -1), tr(`${boss} versteht es. „Dann eben mein Dackel."`, `${boss} understands. "My dachshund it is, then."`))) }]) },
    ],
  },

  sponsor_feier: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s ? { id: s.id, name: s.name, boss: bossOf(s), years: 10 + rng.int(0, 8) * 5 } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} feiert ${ctx.years}-jähriges Jubiläum – Samstagabend, und die Mannschaft ist eingeladen.`, `${ctx.name} is celebrating ${ctx.years} years in business – Saturday night, and the team is invited.`),
    options: [
      {
        label: tr('Alle hin, wir feiern mit', 'Everyone goes, we party too'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.06), tr('Freibier, Musik vom Band, die Jungs singen das Vereinslied. Der Sponsor ist entzückt.', 'Free beer, music off a playlist, the lads sing the club song. The sponsor is delighted.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2, 'late'); return (adjustRel(s, 10), tr(`Wurde lang. ${first(c, s2)} kommt Sonntag erst zur zweiten Halbzeit.`, `It was a late one. ${first(c, s2)} only turns up for the second half on Sunday.`)); }) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), tr('Einer hält eine Rede über den Sponsor. Leider die ehrliche Version.', 'Someone gives a speech about the sponsor. Unfortunately the honest version.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 18), book(c, tr(`Spende von ${s.name} (Jubiläumslaune)`, `Donation from ${s.name} (anniversary mood)`), 40), tr(`Um Mitternacht zückt ${boss} das Portemonnaie: 40 € für die Mannschaftskasse.`, `At midnight ${boss} gets his wallet out: €40 for the team kitty.`))) },
        ]),
      },
      { label: tr('Du gehst allein, die Jungs schlafen', 'You go alone, the lads sleep'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), c.coach && (c.coach.patience = Math.max(0, c.coach.patience - 5)), tr('Du stehst allein am Stehtisch. Der Sponsor freut sich trotzdem. Die Familie weniger.', 'You stand alone at a high table. The sponsor is pleased anyway. The family less so.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 9), tr(`Du tanzt mit der Frau von ${boss}. Man redet noch Wochen darüber.`, `You dance with ${boss}'s wife. People talk about it for weeks.`))) }]) },
      { label: tr('Absagen, Sonntag ist Spieltag', 'Decline, Sunday is matchday'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -7), tr('Der Sponsor schickt ein Foto vom leeren Mannschaftstisch.', 'The sponsor sends a photo of the empty team table.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -1), tr(`${boss}: „Verstehe. Hauptsache, ihr gewinnt."`, `${boss}: "I understand. As long as you win."`))) }]) },
    ],
  },

  // --- Gespräche mit den Sponsoren (zweite Runde) ------------------------------------------
  // Größen wie bei den Ereignissen oben: Zufriedenheit ±3…±30, Stimmung ±0,02…0,08, Geld 15–90 €.

  sponsor_abend: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s), n: c.sponsors.length } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} schlägt einen Sponsorenabend im Vereinsheim vor: ${ctx.n > 1 ? 'alle Geldgeber an einen Tisch' : 'er bringt Freunde aus dem Ort mit'}. „Man muss sich zeigen."`, `${ctx.boss} suggests a sponsors' evening in the clubhouse: ${ctx.n > 1 ? 'all the backers around one table' : 'he brings friends from town'}. "You have to be seen."`),
    options: [
      {
        label: tr('Großer Abend mit Buffet (40 €)', 'Big evening with a buffet (€40)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Sponsorenabend (Buffet)', 'Sponsors\' evening (buffet)'), -40), c.sponsors.forEach((s) => adjustRel(s, 10)), adjustMood(c, 0.05), tr('Die Chefs tauschen Visitenkarten, der Obmann hält eine kurze Rede. Alle gehen zufrieden heim.', 'The bosses swap business cards, the chairman keeps his speech short. Everyone goes home happy.')) },
          { w: 1.5, run: (c) => (book(c, tr('Sponsorenabend (Buffet)', 'Sponsors\' evening (buffet)'), -40), c.sponsors.forEach((s) => adjustRel(s, 6)), (c.sponsors[0].weekly += 1), tr(`Beim dritten Bier gibt ${bossOf(c.sponsors[0])} einen Euro pro Spieltag dazu. Handschlag genügt.`, `On the third beer ${bossOf(c.sponsors[0])} adds a euro per matchday. A handshake will do.`)) },
          { w: 1, run: (c) => (book(c, tr('Sponsorenabend (Buffet)', 'Sponsors\' evening (buffet)'), -40), c.sponsors.forEach((s) => adjustRel(s, -3)), tr('Die Rede des Obmanns dauert fünfzig Minuten. Das Buffet ist kalt, bevor sie fertig ist.', 'The chairman\'s speech lasts fifty minutes. The buffet is cold before he finishes.')) },
        ]),
      },
      {
        label: tr('Bescheiden: Bier und Bratwurst vom Grill (15 €)', 'Modest: beer and bratwurst from the grill (€15)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Sponsorenabend (Grill)', 'Sponsors\' evening (grill)'), -15), c.sponsors.forEach((s) => adjustRel(s, 6)), adjustMood(c, 0.03), tr('Rauch, Bier, Vereinslieder. So mögen sie es im Ort.', 'Smoke, beer, club songs. That is how they like it in town.')) },
          { w: 1.5, run: (c) => (book(c, tr('Sponsorenabend (Grill)', 'Sponsors\' evening (grill)'), -15), c.sponsors.forEach((s) => adjustRel(s, 3)), tr('Nett, aber niemand erinnert sich später daran.', 'Nice, but nobody remembers it later.')) },
          { w: 1, run: (c, ctx, rng) => { const s2 = rng.pick(mates(c)); sitOut(c, s2, 'late'); return (book(c, tr('Sponsorenabend (Grill)', 'Sponsors\' evening (grill)'), -15), c.sponsors.forEach((s) => adjustRel(s, 5)), tr(`${first(c, s2)} hatte Zapfdienst und kommt Sonntag erst zur zweiten Halbzeit.`, `${first(c, s2)} was on the taps and only arrives for the second half on Sunday.`)); } },
        ]),
      },
      {
        label: tr('Absagen – das Vereinsheim ist nicht hergerichtet', 'Decline – the clubhouse is not ready'),
        effect: outcome([
          { w: 3, run: (c) => (c.sponsors.forEach((s) => adjustRel(s, -4)), tr('Man hört es im Ort: „Die haben es nicht so mit Gästen."', 'It gets round town: "They are not great with guests."')) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -10), tr(`${boss}: „Dann eben nicht." Er lädt jetzt den Nachbarverein ein.`, `${boss}: "Suit yourselves." He is inviting the neighbouring club instead.`))) },
        ]),
      },
    ],
  },

  sponsor_aufstellung: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      if (!s || c.round < 3) return null;
      const star = [...mates(c)].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0];
      return star != null ? { id: s.id, name: s.name, boss: bossOf(s), star } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} meint, wer so viel zahlt, dürfe auch mitreden: „Setzt ${first(c, ctx.star)} doch mal auf die Bank, der läuft mir zu wenig."`, `${ctx.boss} reckons whoever pays this much gets a say: "Put ${first(c, ctx.star)} on the bench for once, he doesn't run enough for me."`),
    options: [
      {
        label: tr('Er darf mitreden', 'Let him have a say'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), adjustMood(c, -0.06), (c.players[ctx.star].grumpy = 3), tr(`${first(c, ctx.star)} erfährt davon und ist tagelang gekränkt. Der Sponsor ist begeistert.`, `${first(c, ctx.star)} hears about it and sulks for days. The sponsor is delighted.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 15), (s.bonus += 20), adjustMood(c, -0.03), tr(`${boss} fühlt sich ernst genommen und legt 20 € auf den Bonus. In der Kabine wird getuschelt.`, `${boss} feels taken seriously and adds €20 to the bonus. There is whispering in the dressing room.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 8), adjustMood(c, -0.08), tr(`${boss} kommt zur Aufstellung ins Vereinsheim und redet zwei Stunden. Die Mannschaft rollt mit den Augen.`, `${boss} turns up at the line-up meeting and talks for two hours. The team rolls its eyes.`))) },
        ]),
      },
      {
        label: tr('Zuhören, aber du entscheidest', 'Listen, but you decide'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 4), tr('Du nickst, notierst etwas und stellst auf, wie du es für richtig hältst. Er merkt es nicht.', 'You nod, jot something down and pick the side you think is right. He does not notice.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 8), tr(`${first(c, ctx.star)} spielt Sonntag und läuft sich die Lunge aus dem Leib. Der Sponsor sieht es und schweigt.`, `${first(c, ctx.star)} plays on Sunday and runs his lungs out. The sponsor sees it and says nothing.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), tr('Er merkt es doch. „Ich habe es ja gesagt." Er sagt es noch dreimal.', 'He notices after all. "I told you so." He says it three more times.'))) },
        ]),
      },
      {
        label: tr('Ablehnen – die Aufstellung ist Trainersache', 'Refuse – the line-up is the coach\'s business'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), adjustMood(c, 0.06), tr('Die Mannschaft erfährt davon und klopft dir auf die Schulter. Der Sponsor schmollt.', 'The team hears of it and slaps you on the back. The sponsor sulks.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -5), adjustMood(c, 0.04), tr(`${boss} brummt: „Prinzipien. Gut. Aber ich beobachte das."`, `${boss} grunts: "Principles. Fine. But I am watching this."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -25), (s.pause = 2), tr(`${boss} ist gekränkt und überweist zwei Wochen lang nicht. „Aus Versehen."`, `${boss} is offended and skips the next two transfers. "By accident."`))) },
        ]),
      },
    ],
  },

  sponsor_namensrecht: {
    weight: 0.55,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.slot === 'trikot' || x.slot === 'aermel');
      if (!s || c.round < 4 || arenaOf(c)) return null;
      return { id: s.id, name: s.name, boss: bossOf(s), arena: arenaName(s.id), amount: Math.max(30, s.weekly * 5) };
    },
    text: (c, ctx) => tr(`${ctx.boss} will dem Sportplatz seinen Namen geben: „${ctx.arena}". Dafür gibt es ${ctx.amount} € – und das Schild am Vereinsheim malt er selbst.`, `${ctx.boss} wants to put his name on the ground: "${ctx.arena}". That is worth €${ctx.amount} – and he paints the sign on the clubhouse himself.`),
    options: [
      {
        label: tr('Verkaufen', 'Sell it'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (nameArena(c, s, ctx.amount, ctx.arena), adjustRel(s, 10), adjustMood(c, -0.03), tr(`Das Kreisblatt meldet: Der Platz heißt jetzt ${ctx.arena}. Die Alten schimpfen, die Kasse klingelt.`, `The District Gazette reports: the ground is now called ${ctx.arena}. The old boys grumble, the till rings.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (nameArena(c, s, ctx.amount, ctx.arena), adjustRel(s, 10), adjustMood(c, 0.03), (c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, 2)), tr(`${ctx.arena}: Das Schild kommt gut an. Die Jüngeren finden es modern, im Ort wird darüber geredet.`, `${ctx.arena}: the sign goes down well. The younger ones find it modern, the town talks about it.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (nameArena(c, s, ctx.amount - 25, ctx.arena), adjustRel(s, 5), tr(`Der Verband bemängelt das Schild, ein neues kostet 25 €. Der Name bleibt: ${ctx.arena}.`, `The league objects to the sign, a new one costs €25. The name stays: ${ctx.arena}.`))) },
        ]),
      },
      {
        label: tr('Mehr verlangen', 'Ask for more'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (nameArena(c, s, Math.round(ctx.amount * 1.5), ctx.arena), adjustRel(s, -4), adjustMood(c, -0.03), tr(`${Math.round(ctx.amount * 1.5)} € – ${bossOf(s)} schluckt, unterschreibt aber. Der Platz heißt jetzt ${ctx.arena}.`, `€${Math.round(ctx.amount * 1.5)} – ${bossOf(s)} gulps but signs. The ground is now called ${ctx.arena}.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -8), tr(`${boss} zieht das Angebot zurück: „Dann nicht." Der Platz behält seinen Namen.`, `${boss} withdraws the offer: "Then not." The ground keeps its name.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (nameArena(c, s, ctx.amount * 2, ctx.arena), adjustRel(s, 5), tr(`Das Doppelte! ${bossOf(s)} will unbedingt auf das Schild. Der Platz heißt ${ctx.arena}.`, `Double! ${bossOf(s)} badly wants that sign. The ground is called ${ctx.arena} now.`))) },
        ]),
      },
      {
        label: tr('Nein – der Platz behält seinen Namen', 'No – the ground keeps its name'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -5), adjustMood(c, 0.04), tr('Die Fans loben dich im Kreisblatt-Leserbrief: „Endlich einer mit Rückgrat."', 'The fans praise you in a letter to the Gazette: "At last, someone with a backbone."'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -10), tr(`${boss} nimmt es persönlich: „Dann halt kein Geld von mir für das Schild."`, `${boss} takes it personally: "Then no money from me for the sign."`))) },
        ]),
      },
    ],
  },

  sponsor_trikotsatz: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.slot === 'trikot' || x.slot === 'aermel');
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s), cost: KIT_COST } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} bietet an, einen kompletten neuen Trikotsatz zu stiften (Wert ${ctx.cost} €). „Mit meinem Logo, versteht sich – ein bisschen größer."`, `${ctx.boss} offers to donate a complete new set of shirts (worth €${ctx.cost}). "With my logo, of course – slightly bigger."`),
    options: [
      {
        label: tr('Dankend annehmen', 'Gladly accept'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Trikotsatz gestiftet (${s.name})`, `Shirt set donated (${s.name})`), ctx.cost), adjustRel(s, 8), adjustMood(c, 0.05), tr('Frische Trikots riechen nach neuem Anfang. Die Jungs sind aufgekratzt wie vor dem ersten Spiel.', 'Fresh shirts smell like a new beginning. The lads are as excited as before their first game.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Trikotsatz gestiftet (${s.name})`, `Shirt set donated (${s.name})`), ctx.cost), adjustRel(s, 12), adjustMood(c, 0.02), tr('Das Logo ist wirklich groß. Aber die Trikots sitzen, und der Sponsor strahlt.', 'The logo really is big. But the shirts fit, and the sponsor beams.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Trikotsatz gestiftet (${s.name})`, `Shirt set donated (${s.name})`), ctx.cost), adjustRel(s, 6), adjustMood(c, -0.03), tr('Die Hälfte der Trikots ist zu groß geliefert. Es sieht aus wie ein Kinderfasching.', 'Half the shirts arrive too big. It looks like a kids\' carnival.'))) },
        ]),
      },
      {
        label: tr('Lieber das Geld für die Jugend', 'Take the money for the youth instead'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Spende für die Jugend (${s.name})`, `Donation for the youth (${s.name})`), Math.round(ctx.cost / 2)), adjustRel(s, 4), adjustMood(c, 0.03), tr('Der Sponsor spendet die Hälfte in bar. Die Jugend bekommt neue Bälle.', 'The sponsor donates half in cash. The youth get new balls.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -4), tr(`${boss} wollte eigentlich sein Logo sehen. „Auch gut."`, `${boss} really wanted to see his logo. "Fine, then."`))) },
        ]),
      },
      {
        label: tr('Verzichten – wir behalten die alten', 'Pass – we keep the old ones'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -3), adjustMood(c, 0.02), tr('Tradition! Die alten Trikots dürfen noch eine Saison riechen.', 'Tradition! The old shirts may smell for one more season.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -9), tr(`${boss} fühlt sich zurückgewiesen: „Mein Logo ist wohl nicht gut genug."`, `${boss} feels rejected: "My logo is not good enough, then."`))) },
        ]),
      },
    ],
  },

  sponsor_klausel: {
    weight: 0.6,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => !x.exclusive && x.branche);
      if (!s || c.round < 2) return null;
      const rival = sponsorsFor(c.level ?? 1).filter((x) => x.branche === s.branche && x.id !== s.id && !c.sponsors.some((y) => y.id === x.id));
      return rival.length ? { id: s.id, name: s.name, boss: bossOf(s), rival: rng.pick(rival).name, branche: BRANCHEN[s.branche] } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} hat gehört, dass ${ctx.rival} sich für euch interessiert. Er verlangt eine Konkurrenzklausel: kein zweiter Betrieb aus der Branche ${ctx.branche} als Sponsor.`, `${ctx.boss} has heard that ${ctx.rival} is interested in the club. He wants an exclusivity clause: no second ${ctx.branche} business as a sponsor.`),
    options: [
      {
        label: tr('Klausel unterschreiben', 'Sign the clause'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => ((s.exclusive = true), (s.weekly = Math.ceil(s.weekly * 1.15)), adjustRel(s, 10), tr(`Unterschrieben. Dafür zahlt er 15 % mehr: ${s.weekly} € pro Spieltag. Aus dieser Branche kommt keiner mehr dazu.`, `Signed. He pays 15 % more for it: €${s.weekly} per matchday. Nobody else from that line of business will join.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => ((s.exclusive = true), (s.bonus += 20), adjustRel(s, 10), tr('Unterschrieben, dazu 20 € mehr Bonus. Das Kleingedruckte liest niemand.', 'Signed, plus €20 more bonus. Nobody reads the small print.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => ((s.exclusive = true), book(c, tr('Pflichtgetränke vom Sponsor im Vereinsheim', 'Compulsory sponsor drinks in the clubhouse'), -20), adjustRel(s, 5), tr('Im Kleingedruckten steht, dass das Vereinsheim nur noch seine Ware ausschenkt. Das kostet 20 € Umstellung.', 'The small print says the clubhouse may only serve his goods. Switching costs €20.'))) },
        ]),
      },
      {
        label: tr('Handschlag – ohne Papier', 'A handshake – no paperwork'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 4), tr('Er schlägt ein. Bindend ist das nicht, aber freundlich.', 'He shakes on it. Not binding, but friendly.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 8), tr(`${boss} strahlt: „Ein Mann, ein Wort!"`, `${boss} beams: "A man of his word!"`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -10), tr('Er will es schriftlich. „Mündlich verkaufen die auch Gebrauchtwagen."', 'He wants it in writing. "People sell used cars on a handshake, too."'))) },
        ]),
      },
      {
        label: tr('Ablehnen – wir nehmen, wen wir wollen', 'Refuse – we take who we like'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), tr('Er murrt, bleibt aber. Wer sonst soll das Geld sonst bringen?', 'He grumbles but stays. Who else would bring the money?'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -15), adjustMood(c, 0.02), tr('Er knallt den Hörer auf. Die Mannschaft findet gut, dass sich keiner vorschreiben lässt.', 'He slams the phone down. The team likes that nobody dictates to the club.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -3), tr('Er versteht das, ehrlich. Er hätte es auch versucht.', 'He understands, honestly. He would have tried it too.'))) },
        ]),
      },
    ],
  },

  sponsor_skandal: {
    weight: 0.45,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 3 ? { id: s.id, name: s.name, boss: bossOf(s), case: rng.int(0, 2) } : null;
    },
    text: (c, ctx) =>
      [
        tr(`Im Kreisblatt steht: Bei ${ctx.name} hat die Behörde einen Mangel nach dem anderen gefunden. ${ctx.boss} bestreitet alles.`, `The District Gazette reports: the authorities found one defect after another at ${ctx.name}. ${ctx.boss} denies everything.`),
        tr(`Ehemalige Mitarbeiter packen im Kreisblatt aus: Bei ${ctx.name} werde unbezahlt Überstunden gemacht. ${ctx.boss} spricht von „Rufmord".`, `Former staff tell the District Gazette that people at ${ctx.name} work unpaid overtime. ${ctx.boss} calls it "character assassination".`),
        tr(`Das Kreisblatt wirft ${ctx.name} Preisabsprachen im Ort vor. Das Logo prangt auf eurer Brust.`, `The District Gazette accuses ${ctx.name} of price fixing in town. Their logo is on your chest.`),
      ][ctx.case % 3],
    options: [
      {
        label: tr('Zu ihm halten', 'Stand by him'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 25), adjustMood(c, -0.04), tr('Du verteidigst ihn öffentlich. Die Fans murren, er vergisst es dir nicht.', 'You defend him publicly. The fans grumble, he will not forget it.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 30), tr('Die Sache verläuft im Sand. Er schickt dir Kuchen.', 'It all fizzles out. He sends you a cake.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), adjustMood(c, -0.08), (c.flags.pressWeeks = 0), tr('Am Sonntag pfeifen ein paar Zuschauer beim Blick aufs Trikot. Er ist trotzdem dankbar.', 'On Sunday a few spectators whistle at the sight of the shirt. He is grateful anyway.'))) },
        ]),
      },
      {
        label: tr('Logo abkleben, bis es sich legt', 'Tape over the logo until it blows over'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => ((s.pause = 2), adjustRel(s, -5), adjustMood(c, 0.02), tr('Zwei Wochen Pause, zwei Wochen Klebeband. Danach spricht niemand mehr davon.', 'Two weeks off, two weeks of tape. After that nobody mentions it.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 5), tr(`${boss} schätzt die Diskretion: „Das vergesse ich nicht."`, `${boss} appreciates the discretion: "I won't forget that."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), tr('Er hört vom Klebeband und fühlt sich vorverurteilt.', 'He hears about the tape and feels he has been judged in advance.'))) },
        ]),
      },
      {
        label: tr('Fristlos trennen (Skandalklausel)', 'Part ways at once (scandal clause)'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (dropSponsor(c, s), adjustMood(c, 0.05), c.sponsors.forEach((o) => adjustRel(o, 4)), tr(`${s.name} ist raus, ohne Strafe. Die anderen Sponsoren registrieren, dass der Verein auf seinen Ruf achtet.`, `${s.name} is out, no penalty. The other sponsors note that the club looks after its reputation.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (dropSponsor(c, s), book(c, tr(`Anwaltskosten ${s.name}`, `Legal fees ${s.name}`), -30), tr('Er schaltet einen Anwalt ein. Die Skandalklausel hält, der Anwalt kostet 30 €.', 'He calls in a lawyer. The scandal clause holds, the lawyer costs €30.'))) },
        ]),
      },
    ],
  },

  sponsor_treue: {
    weight: 0.6,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => (x.seasons ?? 0) >= 1 || c.round >= 4); // Stammsponsor, oder zumindest zur Saisonhälfte dabei
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s), years: (s.seasons ?? 0) + 1, left: s.left ?? 1 } : null;
    },
    text: (c, ctx) =>
      ctx.years > 1
        ? tr(`${ctx.name} ist jetzt schon ${ctx.years} Jahre dabei. ${ctx.boss} wird sentimental: „Länger als manche Ehe."`, `${ctx.name} has been with you for ${ctx.years} years now. ${ctx.boss} gets sentimental: "Longer than some marriages."`)
        : tr(`Halbzeit der ersten gemeinsamen Saison mit ${ctx.name}. ${ctx.boss} wird sentimental: „Fühlt sich an, als wären wir schon ewig dabei."`, `Half-time of the first season together with ${ctx.name}. ${ctx.boss} gets sentimental: "Feels like we've been in this forever."`),
    options: [
      {
        label: tr('Ehrung im Vereinsheim (20 €)', 'Honour him in the clubhouse (€20)'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Ehrung ${s.name}`, `Honouring ${s.name}`), -20), adjustRel(s, 15), adjustMood(c, 0.05), chronicle(c, tr(`${s.name} wird für ${ctx.years} Jahre Treue geehrt.`, `${s.name} is honoured for ${ctx.years} years of loyalty.`)), tr('Urkunde, Applaus, ein Ehrenplatz am Stammtisch. Er hat feuchte Augen.', 'A certificate, applause, a seat of honour at the regulars\' table. He has tears in his eyes.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Ehrung ${s.name}`, `Honouring ${s.name}`), -20), adjustRel(s, 20), (s.bonus += 30), tr('Die Rede rührt ihn so, dass er den Bonus um 30 € erhöht.', 'The speech moves him so much he raises the bonus by €30.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Ehrung ${s.name}`, `Honouring ${s.name}`), -20), adjustRel(s, 10), adjustMood(c, -0.02), tr('Die Urkunde hat seinen Namen falsch geschrieben. Er lacht tapfer.', 'The certificate has his name spelled wrong. He laughs bravely.'))) },
        ]),
      },
      {
        label: tr('Vertrag um eine Saison verlängern', 'Extend the contract by one season'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s, boss) => ((s.left ?? 1) >= 3 ? (adjustRel(s, 5), tr(`${boss}: „Länger geht nicht – bin doch schon bis zum Schluss dabei."`, `${boss}: "It cannot go longer – I'm already in until the end."`)) : ((s.left = (s.left ?? 1) + 1), (s.term = Math.max(s.term ?? 1, s.left)), adjustRel(s, 8), tr(`Handschlag: ${s.name} bleibt eine Saison länger – zum alten Preis.`, `Handshake: ${s.name} stays one season longer – at the old price.`)))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => ((s.left ?? 1) >= 3 ? adjustRel(s, 5) : ((s.left = (s.left ?? 1) + 1), (s.term = Math.max(s.term ?? 1, s.left)), (s.weekly += 1), adjustRel(s, 8)), tr('Er verlängert und legt einen Euro Treuebonus pro Spieltag drauf.', 'He extends and adds a euro per matchday as a loyalty bonus.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -3), tr('Er will erst mit seiner Frau reden. Die entscheidet im Betrieb alles.', 'He wants to talk to his wife first. She decides everything in the business.'))) },
        ]),
      },
      { label: tr('Danke sagen, Alltag geht weiter', 'Say thanks and carry on'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 2), tr('Ein Händedruck und ein Kasten Sprudel. Mehr Aufwand braucht es nicht.', 'A handshake and a crate of lemonade. It takes no more effort than that.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -6), tr('„Ach so." Er hatte mehr erwartet.', '"Oh, I see." He had expected more.'))) }]) },
    ],
  },

  sponsor_jugend: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s) } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} möchte ein Jugendturnier „präsentiert von ${ctx.name}" auf eurem Platz veranstalten. ${ctx.boss}: „Die Kleinen sind unsere Kunden von morgen."`, `${ctx.name} would like to hold a youth tournament "presented by ${ctx.name}" on your ground. ${ctx.boss}: "The little ones are tomorrow's customers."`),
    options: [
      {
        label: tr('Turnier ausrichten (35 €)', 'Host the tournament (€35)'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Jugendturnier (${s.name})`, `Youth tournament (${s.name})`), -35), book(c, tr('Kuchenverkauf Jugendturnier', 'Cake sale at the youth tournament'), 45), adjustRel(s, 15), adjustMood(c, 0.06), (c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, 2)), tr('Dreißig Kinder, ein Wimpelmeer, Kuchen ohne Ende. Das Kreisblatt bringt ein Foto, am Sonntag kommen mehr Leute.', 'Thirty kids, a sea of pennants, endless cake. The Gazette runs a photo, more people come on Sunday.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Jugendturnier (${s.name})`, `Youth tournament (${s.name})`), -35), adjustRel(s, 18), adjustMood(c, 0.05), tr('Die Eltern sind begeistert, der Sponsor verteilt Gutscheine. Zwei Talente fragen nach dem Probetraining.', 'The parents are delighted, the sponsor hands out vouchers. Two talents ask about a trial session.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Jugendturnier (${s.name})`, `Youth tournament (${s.name})`), -35), adjustRel(s, 5), adjustMood(c, -0.03), tr('Es regnet in Strömen, das Turnier wird zur Schlammschlacht. Die Kinder lieben es, die Eltern weniger.', 'It pours, the tournament turns into a mud bath. The kids love it, the parents less so.'))) },
        ]),
      },
      {
        label: tr('Nur Bälle und Leibchen annehmen', 'Just take balls and bibs'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Sachspende ${s.name} (Jugend)`, `Donation in kind ${s.name} (youth)`), 20), adjustRel(s, 6), tr('Zehn Bälle, zwanzig Leibchen. Kein Aufwand, aber auch kein Zeitungsfoto.', 'Ten balls, twenty bibs. No effort, but no newspaper photo either.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 2), tr('Die Bälle kommen ohne Luft. Er schickt eine Pumpe hinterher.', 'The balls arrive without air. He sends a pump after them.'))) },
        ]),
      },
      {
        label: tr('Keine Zeit', 'No time'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -7), adjustMood(c, -0.02), tr('Der Sponsor veranstaltet das Turnier beim Nachbarverein. Die Eltern merken es sich.', 'The sponsor holds the tournament at the neighbouring club. The parents take note.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -2), tr(`${boss} nickt: „Nächstes Jahr dann." Ohne Groll.`, `${boss} nods: "Next year, then." No hard feelings.`))) },
        ]),
      },
    ],
  },
};
