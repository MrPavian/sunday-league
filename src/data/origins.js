import { LOCAL_FIRST_EN, LOOK_GROUP_EN, ORIGINS_EN } from './origins_en.js';
import { PRO_NAMES } from './pronames.js';
import { REGION_NAMES, TIMELESS } from './regionalnames.js';

// Stimmige Namen: Erst wird die Herkunft gewürfelt, dann passen Vor- und Nachname
// zueinander – so wie in einer echten Kreisliga-Mannschaft im Ruhrgebiet oder in
// Bremen. Deutsche Vornamen hängen vom Jahrgang ab (der 45-Jährige heißt Torsten,
// der 19-Jährige Leon). Mischungen gibt es dort, wo sie häufig sind: deutsche
// Vornamen bei polnischen Nachnamen und bei Russlanddeutschen.

// Deutsche Vornamen nach Generation (Alter zum Spielbeginn).
const DE_FIRST = {
  young: ['Leon', 'Finn', 'Luca', 'Jonas', 'Tim', 'Niklas', 'Lukas', 'Jannik', 'Marvin', 'Justin', 'Noah', 'Elias', 'Ben', 'Paul', 'Felix', 'Moritz', 'Max', 'Nils', 'Jan', 'Tom', 'Julian', 'Lennart', 'Henrik', 'Malte', 'Ole', 'Hannes', 'Till', 'Mats', 'Jonathan', 'Maximilian', 'Kevin', 'Dominik', 'Robin', 'Fabian', 'Philipp'],
  mid: ['Dennis', 'Kevin', 'Marco', 'Sascha', 'Tobias', 'Patrick', 'Florian', 'Christian', 'Daniel', 'Sebastian', 'Marcel', 'Timo', 'Stefan', 'Michael', 'Jan', 'Björn', 'Nico', 'Marcus', 'Benjamin', 'Dominik', 'Pascal', 'Sven', 'Martin', 'Alexander', 'Philipp', 'Mario', 'René', 'Steffen', 'Oliver', 'Kai', 'Lars', 'Mirko', 'Maik', 'Hendrik', 'Johannes', 'Fabian', 'David', 'Matthias'],
  old: ['Torsten', 'Jens', 'Sven', 'Dirk', 'Frank', 'Uwe', 'Holger', 'Thorsten', 'Carsten', 'Heiko', 'Olaf', 'Ralf', 'Volker', 'Ingo', 'Detlef', 'Andreas', 'Thomas', 'Markus', 'Matthias', 'Jörg', 'Rüdiger', 'Bernd', 'Guido', 'Axel', 'Peter', 'Klaus', 'Jürgen', 'Michael', 'Stefan', 'Rainer', 'Bodo', 'Knut', 'Henning', 'Arne', 'Achim', 'Norbert'],
};
const DE_LAST = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
  'Lehmann', 'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber', 'Kaiser',
  'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Schubert', 'Vogel',
  'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger', 'Winkler', 'Roth', 'Beck', 'Lorenz', 'Baumann',
  'Franke', 'Albrecht', 'Schuster', 'Simon', 'Ludwig', 'Böhm', 'Winter', 'Kraus', 'Martin', 'Schumacher',
  'Krämer', 'Vogt', 'Stein', 'Jäger', 'Otto', 'Sommer', 'Groß', 'Seidel', 'Heinrich', 'Brandt',
  'Haas', 'Schreiber', 'Graf', 'Schulte', 'Dietrich', 'Ziegler', 'Kuhn', 'Kühn', 'Pohl', 'Engel',
  'Horn', 'Busch', 'Bergmann', 'Thomas', 'Voigt', 'Sauer', 'Arnold', 'Wolff', 'Pfeiffer', 'Brinkmann',
  'Hesse', 'Kuhlmann', 'Tiedemann', 'Janßen', 'Hinrichs', 'Oltmanns', 'Kötter', 'Rademacher', 'Evers', 'Wessels',
  'Wittkamp', 'Terhorst', 'Brüggemann', 'Stratmann', 'Böckmann', 'Diekmann', 'Niehaus', 'Overbeck', 'Kemper', 'Hölscher',
];

// Herkunftsgruppen: Gewicht, Nachnamen, Vornamen und wie oft der Vorname deutsch ist.
export const ORIGINS = {
  de: { w: 0.66, last: DE_LAST },
  pl: {
    w: 0.07,
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Lewandowski', 'Zieliński', 'Kamiński', 'Mazur', 'Grabowski', 'Nowicki', 'Wróbel', 'Kowalczyk', 'Wójcik', 'Kaczmarek', 'Szymański', 'Dąbrowski', 'Pawlak', 'Michalski', 'Król', 'Jankowski', 'Wieczorek'],
    first: ['Tomasz', 'Łukasz', 'Marek', 'Paweł', 'Dariusz', 'Piotr', 'Krzysztof', 'Kamil', 'Artur', 'Jakub', 'Mateusz', 'Adam', 'Michał', 'Bartosz', 'Robert'],
    germanFirst: 0.55, // „Dennis Kowalski" – im Ruhrgebiet ganz normal
  },
  // Ruhrpott-Polen der dritten, vierten Generation: deutscher Vorname, eingedeutschter Nachname.
  ruhr: {
    w: 0.03,
    last: ['Szepanski', 'Przybylski', 'Jablonski', 'Kaminski', 'Pawlowski', 'Sobczak', 'Kowalewski', 'Wisniewski', 'Marzinek', 'Czerwinski'],
    first: [],
    germanFirst: 1,
  },
  tr: {
    w: 0.09,
    last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Aksoy', 'Erdem', 'Güneş', 'Korkmaz', 'Yıldız'],
    first: ['Mehmet', 'Emre', 'Burak', 'Can', 'Serkan', 'Onur', 'Volkan', 'Cem', 'Murat', 'Hakan', 'Tolga', 'Yusuf', 'Ali', 'Mustafa', 'Kerem', 'Deniz', 'Furkan', 'Ömer', 'Selim', 'Tarık', 'Eren', 'Baran', 'Oğuz', 'Kaan'],
    germanFirst: 0.04,
  },
  // Russlanddeutsche: oft deutsche Nachnamen, Vornamen aus der alten Heimat – die Jüngeren heißen längst Kevin.
  russ: {
    w: 0.05,
    last: ['Friesen', 'Fast', 'Wiens', 'Penner', 'Dyck', 'Klassen', 'Janzen', 'Neufeld', 'Braun', 'Schmidt', 'Hildebrandt', 'Ivanov', 'Petrov', 'Smirnov', 'Popov', 'Kuznetsov', 'Wolkow', 'Lebedew'],
    first: ['Waldemar', 'Eugen', 'Dmitri', 'Sergej', 'Andrej', 'Viktor', 'Artur', 'Alexander', 'Juri', 'Vitali', 'Anatoli', 'Roman', 'Maxim', 'Igor', 'Oleg', 'Nikolai'],
    germanFirst: 0.35,
    youngGerman: 0.7, // unter 28 meist deutscher Vorname
  },
  yu: {
    w: 0.04,
    last: ['Petrović', 'Jovanović', 'Nikolić', 'Marković', 'Kovačević', 'Babić', 'Hodžić', 'Horvat', 'Knežević', 'Popović', 'Begić', 'Mehmedović', 'Perić', 'Pavlović', 'Ilić'],
    first: ['Goran', 'Dragan', 'Nikola', 'Milan', 'Zoran', 'Adnan', 'Edin', 'Luka', 'Marko', 'Ivan', 'Dario', 'Stefan', 'Emir', 'Damir', 'Mirza', 'Nemanja'],
    germanFirst: 0.1,
  },
  it: {
    w: 0.03,
    last: ['Rossi', 'Esposito', 'Russo', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Lombardi', 'Moretti', 'Caruso'],
    first: ['Giuseppe', 'Salvatore', 'Antonio', 'Enzo', 'Vincenzo', 'Marco', 'Luca', 'Alessandro', 'Francesco', 'Matteo', 'Gianluca', 'Davide', 'Fabio', 'Roberto', 'Angelo'],
    germanFirst: 0.2,
  },
  gr: {
    w: 0.015,
    last: ['Papadopoulos', 'Georgiou', 'Nikolaidis', 'Christodoulou', 'Konstantinidis', 'Dimitriou', 'Pappas', 'Ioannidis'],
    first: ['Dimitrios', 'Kostas', 'Nikos', 'Giorgos', 'Christos', 'Vasilis', 'Stavros', 'Panagiotis'],
    germanFirst: 0.1,
  },
  pt: {
    w: 0.012,
    last: ['Ferreira', 'Silva', 'Santos', 'Costa', 'Oliveira', 'Pereira', 'Rodrigues', 'Martins'],
    first: ['João', 'Rui', 'Tiago', 'Nuno', 'Pedro', 'Ricardo', 'Bruno', 'Diogo'],
    germanFirst: 0.15,
  },
  ar: {
    w: 0.02,
    last: ['Haddad', 'Mansour', 'El-Amrani', 'Benali', 'Khalil', 'Saleh', 'Hamdan', 'Nasser', 'Ahmadi', 'Rahimi'],
    first: ['Karim', 'Samir', 'Omar', 'Bilal', 'Hamza', 'Youssef', 'Mohamed', 'Amir', 'Tarek', 'Rami', 'Nabil', 'Jamal'],
    germanFirst: 0.05,
  },
  wa: {
    w: 0.01,
    last: ['Traoré', 'Diallo', 'Mensah', 'Boateng', 'Okafor', 'Ndiaye', 'Owusu', 'Asante', 'Koné', 'Adeyemi'],
    first: ['Kofi', 'Kwame', 'Moussa', 'Ibrahim', 'Ousmane', 'Jerome', 'Emmanuel', 'Samuel', 'Daniel', 'David'],
    germanFirst: 0.15,
  },
};

const generation = (age) => (age <= 27 ? 'young' : age <= 40 ? 'mid' : 'old');
export const germanFirst = (rng, age = 30) => rng.pick(DE_FIRST[generation(age)]);

// Echte Fußballer (pronames.js) bekommen einen anderen Nachnamen derselben Herkunft – fest aus dem Namen gerechnet, ohne weitere
// Zufallszahl: Der Spielerpool wird aus dem Seed erzeugt, alle anderen Spieler alter Spielstände bleiben so, wie sie sind.
function notPro(first, last, lasts) {
  if (!PRO_NAMES.has(`${first} ${last}`)) return last;
  const h = [...`${first} ${last}`].reduce((x, ch) => (Math.imul(x ^ ch.charCodeAt(0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);
  for (let k = 0; k < lasts.length; k++) {
    const alt = lasts[(h + k) % lasts.length];
    if (alt !== last && !PRO_NAMES.has(`${first} ${alt}`)) return alt;
  }
  return last;
}

// Ein Namenssatz: Herkunftsgruppen und die „einheimischen" Vornamen nach Jahrgang. Deutsch (Auflage 4)
// zieht die Zufallszahlen genau wie früher – alte Spielstände behalten ihre Spieler.
function nameSet(origins, local, fallback) {
  const localFirst = (rng, age) => rng.pick(local[generation(age)]);
  const pickOrigin = (rng) => {
    let r = rng.next() * Object.values(origins).reduce((s, o) => s + o.w, 0);
    for (const [id, o] of Object.entries(origins)) if ((r -= o.w) < 0) return id;
    return fallback;
  };
  const firstFor = (origin, rng, age) => {
    const o = origins[origin] ?? origins[fallback];
    if (!o.first?.length) return localFirst(rng, age);
    const share = age <= 27 && (o.youngGerman ?? o.youngLocal) != null ? o.youngGerman ?? o.youngLocal : o.germanFirst ?? o.localFirst ?? 0;
    return rng.chance(share) ? localFirst(rng, age) : rng.pick(o.first);
  };
  const originOf = (last) => {
    for (const [id, o] of Object.entries(origins)) if (o.last.includes(last)) return id;
    return fallback;
  };
  return {
    identity(rng, age = 30) {
      const origin = pickOrigin(rng);
      const last = rng.pick(origins[origin].last);
      const first = firstFor(origin, rng, age);
      return { name: `${first} ${notPro(first, last, origins[origin].last)}`, origin };
    },
    originOf,
    firstNameFor: (last, rng, age = 17) => firstFor(originOf(last), rng, age),
    lastName: (rng) => rng.pick(origins[pickOrigin(rng)].last),
  };
}
const DE_SET = nameSet(ORIGINS, DE_FIRST, 'de');
// Sechste Auflage (neue deutsche Karrieren): mehr Vor- und Nachnamen, damit sich über viele Saisons
// weniger wiederholt. Gleiche Herkunftsgewichte, gleich viele Zufallszahlen je Name wie Auflage 4.
const DE_FIRST_MORE = {
  young: [...DE_FIRST.young, 'Mika', 'Luis', 'Emil', 'Anton', 'Theo', 'Leonard', 'Jakob', 'Vincent', 'Linus', 'Bennet', 'Lasse', 'Silas', 'Jona', 'Erik', 'Joel', 'Marlon', 'Colin', 'Dustin', 'Yannick', 'Steven'],
  mid: [...DE_FIRST.mid, 'Andre', 'Carsten', 'Christoph', 'Enrico', 'Frank', 'Jens', 'Jörn', 'Kay', 'Marc', 'Mike', 'Ronny', 'Sandro', 'Thilo', 'Torben', 'Ulf', 'Benny', 'Danny', 'Ricardo'],
  old: [...DE_FIRST.old, 'Hartmut', 'Werner', 'Manfred', 'Wolfgang', 'Dieter', 'Günter', 'Harald', 'Lothar', 'Reinhard', 'Gerd', 'Horst', 'Helmut', 'Siegfried', 'Eckhard', 'Wilfried', 'Ulrich', 'Bernhard', 'Winfried', 'Hans-Jürgen', 'Karl-Heinz'],
};
export const DE_LAST_MORE = [
  ...DE_LAST,
  'Kruse', 'Brüning', 'Hartwig', 'Schwab', 'Ebert', 'Pape', 'Wilke', 'Lindner', 'Heinz', 'Thiel', 'Kaufmann', 'Walther', 'Büttner', 'Ritter', 'Reuter', 'Hoppe', 'Witt', 'Grimm', 'Sander', 'Bock',
  'Petersen', 'Jansen', 'Christiansen', 'Lorenzen', 'Thomsen', 'Ahrens', 'Behrens', 'Hinz', 'Kunze', 'Seifert', 'Ulrich', 'Heller', 'Nagel', 'Mohr', 'Kraft', 'Kurz', 'Baum', 'Funk', 'Sturm', 'Blank',
  'Steffens', 'Tewes', 'Plückebaum', 'Schulte-Döinghaus', 'Kampmann', 'Hülsmann', 'Wienhold', 'Steinkamp', 'Rehbein', 'Hagedorn', 'Wehrmann', 'Feldkamp', 'Möllenbeck', 'Brockhoff', 'Uhlenbrock', 'Dreyer', 'Gieseler', 'Klöckner', 'Pöppelmann', 'Tönnies',
];
const DE_SET_MORE = nameSet({ ...ORIGINS, de: { ...ORIGINS.de, last: DE_LAST_MORE } }, DE_FIRST_MORE, 'de');
// Siebte Auflage (neue deutsche Karrieren, vom Nutzer gewünscht 2026-10-23): Vor- und Nachname passen zur Herkunft –
// kein „Max El-Amrani“ mehr. Deutsche Vornamen bleiben nur, wo sie typisch sind: Polen im Ruhrgebiet, Ruhrpott-Polen,
// Russlanddeutsche. Gleich viele Zufallszahlen je Name wie Auflage 6: Werte und Aussehen bleiben gleich, nur „Körper“
// hängt auch am Namen (strength.js) und weicht bei etwa 2 % der Spieler ab (die mit neuem Vornamen).
const STRICT = { germanFirst: 0 };
const ORIGINS_STRICT = Object.fromEntries(Object.entries(ORIGINS).map(([id, o]) => [id, ['pl', 'ruhr', 'russ', 'de'].includes(id) ? o : { ...o, ...STRICT }]));
const DE_SET_STRICT = nameSet({ ...ORIGINS_STRICT, de: { ...ORIGINS.de, last: DE_LAST_MORE } }, DE_FIRST_MORE, 'de');
const EN_SET = nameSet(ORIGINS_EN, LOCAL_FIRST_EN, 'gb');

// Welcher Satz gerade gilt, hängt an der Namensauflage der Karriere (career.js, setNameEdition) –
// nicht an der Sprache: Eine deutsche Karriere behält ihre Namen auch auf Englisch.
let SET = DE_SET;
// locale: 'de' (Auflage 4 und älter), 'de6' (Auflage 6, mehr Namen), 'de7' (Auflage 7, Namen passend zur Herkunft), 'en' (Auflage 5).
export const setNameLocale = (locale) => {
  SET = locale === 'en' ? EN_SET : locale === 'de7' ? DE_SET_STRICT : locale === 'de6' ? DE_SET_MORE : DE_SET;
};
export const nameLocale = () => (SET === EN_SET ? 'en' : 'de');

// Feste Sätze für den Spielerpool (Auflage 4 deutsch, 5 englisch).
export const personIdentityDE = DE_SET.identity;
export const personIdentityEN = EN_SET.identity;
export const personIdentityDE6 = DE_SET_MORE.identity;
export const personIdentityDE7 = DE_SET_STRICT.identity;

// Ein ganzer Name, passend zum Alter – mit Herkunft, damit das Aussehen dazu passen kann.
// Regionale Namen (regionalnames.js): Bundesland der Karriere, null = keine (ohne Verband, englische Namen, alte Spielstände).
let REGION = null;
export const setNameRegion = (land) => {
  REGION = REGION_NAMES[land] ? land : null;
};
export const nameRegion = () => REGION;
// Anteile sind Spielwerte (keine Quelle nennt sie): gut jeder Dritte mit deutschem Nachnamen trägt einen Namen, der für das
// Bundesland typisch ist; jeder Achte einen der dort besonders häufigen Vornamen (Ältere nur zeitlose, regionalnames.js).
export const REGION_LAST_SHARE = 0.35;
export const REGION_FIRST_SHARE = 0.12;
const mix = (h) => {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
const strHash = (str) => [...str].reduce((x, ch) => (Math.imul(x ^ ch.charCodeAt(0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);
// Name passend zur Region – fest je Person (key) und Bundesland, ohne Zufallsstrom: Werte, Aussehen und „Körper“ (der am
// ursprünglichen Namen hängt) bleiben gleich. Nur deutsche Nachnamen (Herkunft „de“) werden regional; echte Fußballer nie.
export function regionalize(name, age, key, land = REGION) {
  const region = REGION_NAMES[land];
  if (!region || !name) return name;
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  if (!last || DE_SET_STRICT.originOf(last) !== 'de') return name;
  const h = mix((key >>> 0) ^ strHash(land));
  const newLast = (h % 10000) / 10000 < REGION_LAST_SHARE ? region.last[mix(h ^ 0x51ed27) % region.last.length] : last;
  const firsts = generation(age) === 'young' ? region.first : region.first.filter((f) => TIMELESS.has(f)); // Ältere: keine Modenamen
  const newFirst = firsts.length && (mix(h ^ 0x2b7e15) % 10000) / 10000 < REGION_FIRST_SHARE ? firsts[mix(h ^ 0x9d2c56) % firsts.length] : first;
  if (newFirst === newLast) return name; // kein „Paul Paul“ (Thomas, Paul, Martin … sind auch Nachnamen)
  const out = `${newFirst} ${newLast}`;
  return PRO_NAMES.has(out) ? name : out;
}

export const personIdentity = (rng, age = 30) => {
  const id = SET.identity(rng, age);
  return REGION && SET !== EN_SET ? { ...id, name: regionalize(id.name, age, strHash(`${id.name}:${age}`)) } : id;
};
export const personName = (rng, age = 30) => personIdentity(rng, age).name;

// Mädchennamen (Töchter, Frauenteam, Jugend): deutsch aus der Liste der jeweiligen Stelle (unverändert),
// englisch aus dieser.
const GIRLS_EN = ['Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Grace', 'Lily', 'Freya', 'Ellie', 'Chloe', 'Sophie', 'Poppy', 'Evie', 'Aisha', 'Priya'];
export const girlName = (rng, germanList) => rng.pick(nameLocale() === 'en' ? GIRLS_EN : germanList);

// Aussehen nach Herkunft – nur als Wahrscheinlichkeit, mit viel Überlappung: Der Name
// sagt nicht alles (Jonas Becker kann genauso gut einen ghanaischen Vater haben).
// Hauttöne von sehr hell bis sehr dunkel, Reihenfolge wie SKIN_TONES in names.js.
const SKIN_W = {
  de: [0.3, 0.38, 0.18, 0.08, 0.04, 0.02],
  pl: [0.35, 0.4, 0.18, 0.05, 0.01, 0.01],
  tr: [0.05, 0.25, 0.4, 0.25, 0.04, 0.01],
  yu: [0.15, 0.4, 0.33, 0.1, 0.01, 0.01],
  south: [0.08, 0.32, 0.38, 0.18, 0.03, 0.01],
  ar: [0.03, 0.15, 0.35, 0.35, 0.1, 0.02],
  wa: [0, 0.01, 0.04, 0.15, 0.4, 0.4],
  // Englische Gruppen (origins_en.js): Südasien, Karibik, Mixed, Ostasien.
  sa: [0.02, 0.1, 0.3, 0.4, 0.15, 0.03],
  cb: [0, 0.02, 0.08, 0.25, 0.4, 0.25],
  mix: [0.1, 0.25, 0.3, 0.25, 0.08, 0.02],
  ea: [0.3, 0.45, 0.2, 0.05, 0, 0],
};
// Haarfarben wie HAIR_COLORS: dunkelbraun, braun, hellbraun, blond, schwarz, grau, rot.
// Grau kommt nicht aus der Herkunft, sondern mit dem Alter.
const HAIR_W = {
  de: [0.18, 0.3, 0.24, 0.2, 0.04, 0, 0.04],
  pl: [0.18, 0.3, 0.24, 0.22, 0.03, 0, 0.03],
  tr: [0.45, 0.15, 0.03, 0.01, 0.36, 0, 0],
  yu: [0.4, 0.3, 0.1, 0.05, 0.15, 0, 0],
  south: [0.45, 0.22, 0.06, 0.02, 0.25, 0, 0],
  ar: [0.45, 0.15, 0.03, 0.01, 0.36, 0, 0],
  wa: [0.1, 0.02, 0, 0, 0.88, 0, 0],
  sa: [0.4, 0.1, 0.02, 0, 0.48, 0, 0],
  cb: [0.15, 0.05, 0, 0, 0.8, 0, 0],
  mix: [0.35, 0.25, 0.1, 0.05, 0.22, 0, 0.03],
  ea: [0.15, 0.05, 0, 0, 0.8, 0, 0],
};
const LOOK_GROUP = { de: 'de', pl: 'pl', ruhr: 'pl', russ: 'pl', tr: 'tr', yu: 'yu', it: 'south', gr: 'south', pt: 'south', ar: 'ar', wa: 'wa', ...LOOK_GROUP_EN };
function weighted(rng, weights) {
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i;
  return 0;
}
export const skinIndex = (rng, origin) => weighted(rng, SKIN_W[LOOK_GROUP[origin] ?? 'de']);
// Ab etwa 40 wird es grau – mit 45 bei gut jedem Vierten, mit 55 bei den meisten.
export const greyChance = (age) => (age >= 40 ? Math.min(0.85, (age - 38) * 0.04) : 0);
export function hairIndex(rng, origin, age) {
  return rng.chance(greyChance(age)) ? 5 : weighted(rng, HAIR_W[LOOK_GROUP[origin] ?? 'de']);
}
// Älter werden (vom Nutzer gemeldet: Porträts alterten nicht): Wer beim Würfeln (Alter age0) nicht grau war, wird es bis zum
// Alter age mit (greyChance(age) − greyChance(age0)) / (1 − greyChance(age0)) – so passt der Anteil Grauer in jedem Alter zur
// selben Kurve. Fest je Person (key), ohne den Zufallsstrom des Spiels zu berühren; einmal grau, bleibt grau.
const GREY = 0x8a8a8a; // wie HAIR_COLORS[5] (names.js)
export function agedLook(look, age0, age, key) {
  if (!look || !(age > age0) || look.hair === GREY) return look;
  const p0 = greyChance(age0);
  const p = greyChance(age);
  if (p <= p0) return look;
  let h = Math.imul((key >>> 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  const u = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  return u < (p - p0) / (1 - p0) ? { ...look, hair: GREY } : look;
}

// Herkunft eines Nachnamens (für Kinder, Söhne, Verwandte).
export const originOf = (last) => SET.originOf(last);

// Vorname, der zum Nachnamen passt – z. B. für den Sohn der Vereinslegende.
export const firstNameFor = (last, rng, age = 17) => SET.firstNameFor(last, rng, age);

// Nur Nachname (Kapitänin des Frauenteams, Trainer des Gegners …).
export const lastName = (rng) => SET.lastName(rng);
