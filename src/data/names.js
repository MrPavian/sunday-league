import { getLang } from '../core/i18n.js';

// Erste Auflage der Namen: Alte Spielstände würfeln ihre Spieler damit, damit
// aus dem Kowalski von gestern nicht plötzlich ein anderer wird.
const FIRST_V1 = [
  'Dennis', 'Kevin', 'Marco', 'Sascha', 'Jens', 'Torsten', 'Mehmet', 'Lukas', 'Jonas', 'Tobias',
  'Sven', 'Dirk', 'Ali', 'Niklas', 'Florian', 'Patrick', 'Andreas', 'Björn', 'Emre', 'Stefan',
  'Timo', 'Marcel', 'Oliver', 'Jan', 'Kai', 'René', 'Luca', 'Daniel', 'Piotr', 'Nico',
];
const LAST_V1 = [
  'Müller', 'Schmitz', 'Kowalski', 'Yılmaz', 'Becker', 'Hoffmann', 'Wagner', 'Schulte', 'Krüger', 'Lange',
  'Fischer', 'Brandt', 'Demir', 'Wolf', 'Neumann', 'Kaya', 'Richter', 'Hartmann', 'Vogel', 'Peters',
];

export const FIRST_NAMES = [
  ...FIRST_V1,
  'Maik', 'Ronny', 'Mirko', 'Holger', 'Uwe', 'Frank', 'Thorsten', 'Carsten', 'Heiko', 'Olaf',
  'Rüdiger', 'Detlef', 'Ingo', 'Volker', 'Ralf', 'Guido', 'Axel', 'Hendrik', 'Malte', 'Lars',
  'Moritz', 'Felix', 'Leon', 'Finn', 'Paul', 'Max', 'Ben', 'Elias', 'Noah', 'Tim',
  'Philipp', 'Christian', 'Michael', 'Thomas', 'Markus', 'Matthias', 'Sebastian', 'Benedikt', 'Johannes', 'Fabian',
  'Justin', 'Kevin-Pascal', 'Jannik', 'Marvin', 'Dustin', 'Pascal', 'Sandro', 'Nils', 'Robin', 'Dominik',
  'Burak', 'Can', 'Serkan', 'Onur', 'Volkan', 'Cem', 'Murat', 'Hakan', 'Tolga', 'Yusuf',
  'Kamil', 'Tomasz', 'Łukasz', 'Marek', 'Pawel', 'Dariusz', 'Artur', 'Dmitri', 'Sergej', 'Viktor',
  'Andrej', 'Waldemar', 'Eugen', 'Goran', 'Dragan', 'Nikola', 'Milan', 'Zoran', 'Adnan', 'Edin',
  'Giuseppe', 'Salvatore', 'Antonio', 'Enzo', 'Vincenzo', 'Dimitrios', 'Kostas', 'Nikos', 'João', 'Rui',
  'Karim', 'Samir', 'Omar', 'Bilal', 'Hamza', 'Kofi', 'Kwame', 'Moussa', 'Ibrahim', 'Ousmane',
  'Mats', 'Ole', 'Jesper', 'Henning', 'Knut', 'Arne', 'Hannes', 'Janosch', 'Till', 'Bodo',
];

export const LAST_NAMES = [
  ...LAST_V1,
  'Schneider', 'Meyer', 'Weber', 'Schulz', 'Koch', 'Bauer', 'Klein', 'Schröder', 'Zimmermann', 'Braun',
  'Hofmann', 'Schmitt', 'Werner', 'Krause', 'Meier', 'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler',
  'Herrmann', 'König', 'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Scholz', 'Möller', 'Weiß',
  'Jung', 'Hahn', 'Keller', 'Schubert', 'Vogt', 'Friedrich', 'Günther', 'Frank', 'Berger', 'Winkler',
  'Roth', 'Beck', 'Lorenz', 'Baumann', 'Franke', 'Albrecht', 'Schuster', 'Simon', 'Ludwig', 'Böhm',
  'Winter', 'Kraus', 'Martin', 'Schumacher', 'Krämer', 'Stein', 'Jäger', 'Otto', 'Sommer', 'Groß',
  'Brinkmann', 'Hesse', 'Kuhlmann', 'Tiedemann', 'Janßen', 'Hinrichs', 'Oltmanns', 'Pohl', 'Kötter', 'Rademacher',
  'Nowak', 'Wiśniewski', 'Lewandowski', 'Zieliński', 'Kamiński', 'Mazur', 'Grabowski', 'Nowicki', 'Schimanski', 'Wróbel',
  'Öztürk', 'Aydın', 'Çelik', 'Şahin', 'Arslan', 'Doğan', 'Koç', 'Kılıç', 'Aksoy', 'Polat',
  'Petrović', 'Jovanović', 'Hodžić', 'Kovačević', 'Babić', 'Ivanov', 'Popov', 'Schneider-Wiens', 'Fast', 'Friesen',
  'Rossi', 'Esposito', 'Russo', 'Romano', 'Papadopoulos', 'Georgiou', 'Ferreira', 'Silva', 'Santos', 'Costa',
  'Haddad', 'Mansour', 'El-Amrani', 'Benali', 'Traoré', 'Diallo', 'Mensah', 'Boateng', 'Okafor', 'Ndiaye',
];


const JOBS_V1 = [
  'Paketbote', 'Zahnarzt', 'Azubi Kfz-Mechatroniker', 'Frührentner', 'Grundschullehrer', 'Student (12. Semester)',
  'Dachdecker', 'Barista', 'Pflegekraft', 'IT-Admin', 'Busfahrer', 'Bäcker', 'Versicherungsmakler',
  'Lagerist', 'Elektriker', 'Hausmeister', 'Streetworker', 'Friseur', 'Schichtarbeiter', 'Steuerberater',
];
const JOBS_V2 = [
  ...JOBS_V1,
  'Metzger', 'Tischler', 'Landwirt', 'Fliesenleger', 'Postbote', 'Rettungssanitäter', 'Feuerwehrmann', 'Taxifahrer',
  'Gebäudereiniger', 'Maurer', 'Bankkaufmann', 'Immobilienmakler', 'Kioskbesitzer', 'Fitnesstrainer', 'Tätowierer',
  'DJ', 'Handyladen-Betreiber', 'Pizzabäcker', 'Sozialarbeiter', 'Doktorand', 'Lokführer', 'Gabelstaplerfahrer',
  'Hochzeitsfotograf', 'Schornsteinfeger', 'Kranführer', 'Winzer', 'Pfarrer', 'Kellner', 'Zugbegleiter', 'Webdesigner',
];
// Dritte Auflage: noch mehr Berufe, viele davon mit Bonus (siehe data/jobs.js).
export const PROFESSIONS = [
  ...JOBS_V2,
  'Fahrradkurier', 'Pizzabote', 'Sportlehrer', 'Förster', 'Gerüstbauer', 'Müllwerker', 'Türsteher', 'Hufschmied',
  'Uhrmacher', 'Goldschmied', 'Fluglotse', 'Schlagzeuger', 'Bademeister', 'Sicherheitsmann', 'Verkäufer im Getränkemarkt',
  'Bierbrauer', 'Fahrlehrer', 'Physiotherapeut', 'Tierarzt', 'Orthopädietechniker', 'Glaser', 'Zimmermann', 'Baggerfahrer',
  'Stuckateur', 'Optiker', 'Straßenbahnfahrer', 'Gemüsehändler', 'Bestatter', 'Influencer', 'Zollbeamter',
  'Gerichtsvollzieher', 'Soldat', 'Musiklehrer', 'Hörgeräteakustiker', 'Kommunalpolitiker', 'Heizungsbauer', 'Polizist', 'Koch', 'Softwareentwickler',
];

// Welche Namensauflage eine Karriere benutzt (1 = alte Spielstände).
export const NAME_EDITIONS = {
  1: { first: FIRST_V1, last: LAST_V1, jobs: JOBS_V1 },
  2: { first: FIRST_NAMES, last: LAST_NAMES, jobs: JOBS_V2 },
  3: { first: FIRST_NAMES, last: LAST_NAMES, jobs: PROFESSIONS },
};
export const NAME_EDITION = 3;

export const SKIN_TONES = [0xf1d0b5, 0xe6b894, 0xd29f7a, 0xb57c55, 0x8d5a3b, 0x6b4128];
export const HAIR_COLORS = [0x2a1d14, 0x4a3222, 0x7a5230, 0xb08850, 0x1a1a1a, 0x8a8a8a, 0xa0522d];

// Berufe bleiben intern deutsch (Absagen, Ereignisse und Geschichten hängen daran)
// und werden nur für die Anzeige übersetzt.
export const JOB_EN = {
  Paketbote: 'parcel courier', Zahnarzt: 'dentist', 'Azubi Kfz-Mechatroniker': 'apprentice car mechanic', Frührentner: 'early retiree',
  Grundschullehrer: 'primary school teacher', 'Student (12. Semester)': 'student (12th semester)', Dachdecker: 'roofer', Barista: 'barista',
  Pflegekraft: 'care worker', 'IT-Admin': 'IT admin', Busfahrer: 'bus driver', Bäcker: 'baker', Versicherungsmakler: 'insurance broker',
  Lagerist: 'warehouse worker', Elektriker: 'electrician', Hausmeister: 'caretaker', Streetworker: 'youth worker', Friseur: 'hairdresser',
  Schichtarbeiter: 'shift worker', Steuerberater: 'tax adviser', Mechatroniker: 'mechatronics technician', Polizist: 'police officer',
  Koch: 'cook', Landschaftsgärtner: 'landscape gardener', Erzieher: 'nursery teacher', Vertriebler: 'sales rep', Angestellter: 'office worker',
  'Schüler (Abi-Jahrgang)': 'pupil (final year)', 'Azubi Elektriker': 'apprentice electrician', 'FSJ im Altenheim': 'volunteer year at a care home',
  Schüler: 'pupil', Azubi: 'apprentice', 'Student (1. Semester)': 'student (1st semester)', 'Azubi Bürokaufmann': 'apprentice office clerk',
  Privatier: 'man of leisure', 'Hat eine Fußballschule': 'runs a football school', 'Teilhaber im Autohaus': 'partner at a car dealership',
  'Gelegentlich TV-Experte': 'occasional TV pundit', Arbeitssuchend: 'job-seeking', 'Aushilfe im Vereinsheim': 'helping out at the clubhouse',
  Lagerlogistiker: 'logistics worker', 'Fahrer beim Getränkehandel': 'driver for a drinks wholesaler', 'Verkäufer im Baumarkt': 'DIY store salesman',
  Sachbearbeiter: 'clerk', 'Junior-Ingenieur': 'junior engineer', 'Trainee bei der Sparkasse': 'trainee at the savings bank',
  Softwareentwickler: 'software developer', Referendar: 'trainee teacher', Erzieherin: 'nursery teacher', Polizistin: 'police officer',
  Lehrerin: 'teacher', Physiotherapeutin: 'physiotherapist', Ingenieurin: 'engineer',
  Metzger: 'butcher', Tischler: 'carpenter', Landwirt: 'farmer', Fliesenleger: 'tiler', Postbote: 'postman', Rettungssanitäter: 'paramedic',
  Feuerwehrmann: 'firefighter', Taxifahrer: 'taxi driver', Gebäudereiniger: 'cleaner', Maurer: 'bricklayer', Bankkaufmann: 'bank clerk',
  Immobilienmakler: 'estate agent', Kioskbesitzer: 'kiosk owner', Fitnesstrainer: 'personal trainer', Tätowierer: 'tattoo artist', DJ: 'DJ',
  'Handyladen-Betreiber': 'runs a phone shop', Pizzabäcker: 'pizza chef', Sozialarbeiter: 'social worker', Doktorand: 'PhD student',
  Lokführer: 'train driver', Gabelstaplerfahrer: 'forklift driver', Hochzeitsfotograf: 'wedding photographer', Schornsteinfeger: 'chimney sweep',
  Kranführer: 'crane operator', Winzer: 'winemaker', Pfarrer: 'vicar', Kellner: 'waiter', Zugbegleiter: 'train conductor', Webdesigner: 'web designer',
  Fahrradkurier: 'bike courier', Pizzabote: 'pizza delivery driver', Sportlehrer: 'PE teacher', Förster: 'forester', Gerüstbauer: 'scaffolder',
  Müllwerker: 'bin man', Türsteher: 'bouncer', Hufschmied: 'farrier', Uhrmacher: 'watchmaker', Goldschmied: 'goldsmith', Fluglotse: 'air traffic controller',
  Schlagzeuger: 'drummer', Bademeister: 'lifeguard', Sicherheitsmann: 'security guard', 'Verkäufer im Getränkemarkt': 'drinks store clerk',
  Bierbrauer: 'brewer', Fahrlehrer: 'driving instructor', Physiotherapeut: 'physiotherapist', Tierarzt: 'vet', Orthopädietechniker: 'orthopaedic technician',
  Glaser: 'glazier', Zimmermann: 'carpenter', Baggerfahrer: 'digger driver', Stuckateur: 'plasterer', Optiker: 'optician', Straßenbahnfahrer: 'tram driver',
  Gemüsehändler: 'greengrocer', Bestatter: 'undertaker', Influencer: 'influencer', Zollbeamter: 'customs officer', Gerichtsvollzieher: 'bailiff',
  Soldat: 'soldier', Musiklehrer: 'music teacher', Hörgeräteakustiker: 'hearing aid technician', Kommunalpolitiker: 'local councillor', Heizungsbauer: 'heating engineer',
};

export function jobName(job) {
  if (!job || getLang() !== 'en') return job;
  if (JOB_EN[job]) return JOB_EN[job];
  const temp = job.match(/^Aushilfe bei (?:der )?(.+)$/);
  if (temp) return `temp job at ${temp[1]}`;
  return job;
}

// Englisch eingegebener Beruf (Trainer-Editor) → interner deutscher Name, falls bekannt.
export function jobKey(job) {
  const t = (job ?? '').trim().toLowerCase();
  const hit = Object.entries(JOB_EN).find(([, en]) => en === t);
  return hit ? hit[0] : job;
}
export const jobChoices = (list) => list.map((j) => jobName(j));
