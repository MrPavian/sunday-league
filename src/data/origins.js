import { LOCAL_FIRST_EN, LOOK_GROUP_EN, ORIGINS_EN } from './origins_en.js';

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
      return { name: `${firstFor(origin, rng, age)} ${last}`, origin };
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
const EN_SET = nameSet(ORIGINS_EN, LOCAL_FIRST_EN, 'gb');

// Welcher Satz gerade gilt, hängt an der Namensauflage der Karriere (career.js, setNameEdition) –
// nicht an der Sprache: Eine deutsche Karriere behält ihre Namen auch auf Englisch.
let SET = DE_SET;
// locale: 'de' (Auflage 4 und älter), 'de6' (Auflage 6, mehr Namen), 'en' (Auflage 5).
export const setNameLocale = (locale) => {
  SET = locale === 'en' ? EN_SET : locale === 'de6' ? DE_SET_MORE : DE_SET;
};
export const nameLocale = () => (SET === EN_SET ? 'en' : 'de');

// Feste Sätze für den Spielerpool (Auflage 4 deutsch, 5 englisch).
export const personIdentityDE = DE_SET.identity;
export const personIdentityEN = EN_SET.identity;
export const personIdentityDE6 = DE_SET_MORE.identity;

// Ein ganzer Name, passend zum Alter – mit Herkunft, damit das Aussehen dazu passen kann.
export const personIdentity = (rng, age = 30) => SET.identity(rng, age);
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
export function hairIndex(rng, origin, age) {
  const grey = age >= 40 ? Math.min(0.85, (age - 38) * 0.04) : 0;
  return rng.chance(grey) ? 5 : weighted(rng, HAIR_W[LOOK_GROUP[origin] ?? 'de']);
}

// Herkunft eines Nachnamens (für Kinder, Söhne, Verwandte).
export const originOf = (last) => SET.originOf(last);

// Vorname, der zum Nachnamen passt – z. B. für den Sohn der Vereinslegende.
export const firstNameFor = (last, rng, age = 17) => SET.firstNameFor(last, rng, age);

// Nur Nachname (Kapitänin des Frauenteams, Trainer des Gegners …).
export const lastName = (rng) => SET.lastName(rng);
