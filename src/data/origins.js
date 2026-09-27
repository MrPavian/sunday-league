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

function pickOrigin(rng) {
  let r = rng.next() * Object.values(ORIGINS).reduce((s, o) => s + o.w, 0);
  for (const [id, o] of Object.entries(ORIGINS)) if ((r -= o.w) < 0) return id;
  return 'de';
}

function firstFor(origin, rng, age) {
  const o = ORIGINS[origin] ?? ORIGINS.de;
  if (!o.first?.length) return germanFirst(rng, age);
  const share = age <= 27 && o.youngGerman != null ? o.youngGerman : o.germanFirst ?? 0;
  return rng.chance(share) ? germanFirst(rng, age) : rng.pick(o.first);
}

// Ein ganzer Name, passend zum Alter – mit Herkunft, damit das Aussehen dazu passen kann.
export function personIdentity(rng, age = 30) {
  const origin = pickOrigin(rng);
  const last = rng.pick(ORIGINS[origin].last);
  return { name: `${firstFor(origin, rng, age)} ${last}`, origin };
}
export const personName = (rng, age = 30) => personIdentity(rng, age).name;

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
};
const LOOK_GROUP = { de: 'de', pl: 'pl', ruhr: 'pl', russ: 'pl', tr: 'tr', yu: 'yu', it: 'south', gr: 'south', pt: 'south', ar: 'ar', wa: 'wa' };
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
export function originOf(last) {
  for (const [id, o] of Object.entries(ORIGINS)) if (o.last.includes(last)) return id;
  return 'de';
}

// Vorname, der zum Nachnamen passt – z. B. für den Sohn der Vereinslegende.
export const firstNameFor = (last, rng, age = 17) => firstFor(originOf(last), rng, age);

// Nur Nachname (Kapitänin des Frauenteams, Trainer des Gegners …).
export const lastName = (rng) => rng.pick(ORIGINS[pickOrigin(rng)].last);
