// Zehnte Namensauflage (ROADMAP 11.17 Punkt 10, „Englische Namensliste erweitern“): neue englische Karrieren bekommen mehr
// Vor- und Nachnamen in jeder Herkunftsgruppe. Gewichte (Zensus 2021) und Aufbau wie Auflage 5 (origins_en.js), damit nur die
// Namen breiter streuen. Alte englische Spielstände behalten Auflage 5.
// Quellen:
//  - Vornamen nach Jahrgang: ONS, „Baby names in England and Wales“ (Jungennamen, Top 100 je Jahr 1996–2023) und
//    „Top 100 baby names in England and Wales: historical data“ (Jahrzehnte 1954–1994),
//    https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/bulletins/babynamesenglandandwales
//  - Nachnamen: häufigste Nachnamen in Großbritannien (englische Wikipedia, „List of most common surnames in Europe“, Abschnitt
//    United Kingdom, nach ONS-Auszählung), dazu regionale englische, walisische und schottische Namen.
//  - Herkunftsgruppen: verbreitete Namen der jeweiligen Gemeinschaften in England (keine echten Fußballer: origins.js notPro).
import { ORIGINS_EN, LOCAL_FIRST_EN } from './origins_en.js';

const FIRST_MORE = {
  young: ['Noah', 'Leo', 'Archie', 'Freddie', 'Theo', 'Oscar', 'Arthur', 'Henry', 'Max', 'Finley', 'Harvey', 'Toby', 'Dylan', 'Riley', 'Logan', 'Bailey', 'Owen', 'Joel', 'Louis', 'Zach', 'Aaron', 'Kian', 'Jayden', 'Rhys', 'Cameron', 'Declan', 'Morgan', 'Elliot', 'Ellis', 'Billy', 'Frankie', 'Ollie', 'Alex', 'Nathan', 'Tom', 'Joe', 'Will', 'Isaac', 'Reuben', 'Jude'],
  mid: ['Anthony', 'Gareth', 'Robert', 'Shaun', 'Martin', 'Gavin', 'Damian', 'Kevin', 'Ashley', 'Nicholas', 'Jonathan', 'Ben', 'Adam', 'Tom', 'Danny', 'Liam', 'Russell', 'Glen', 'Barry', 'Mike', 'Tony', 'Stephen', 'Philip', 'Kerry', 'Marc', 'Warren', 'Aaron', 'Luke', 'Ryan', 'Matt', 'Justin', 'Jody', 'Nathan', 'Gregg', 'Lloyd', 'Danny', 'Ross', 'Owen', 'Dale', 'Leigh'],
  old: ['John', 'Peter', 'Robert', 'Stephen', 'Michael', 'Richard', 'Andrew', 'Christopher', 'Kenneth', 'Roy', 'Dennis', 'Bernard', 'Frank', 'Norman', 'Stan', 'Ron', 'Eddie', 'Vince', 'Rodney', 'Howard', 'Neville', 'Reg', 'Sid', 'Ken', 'Bob', 'Frank', 'Jim', 'Lenny', 'Wilf', 'Cyril', 'Dougie', 'Harold'],
};

const GB_LAST_MORE = [
  'Hudson', 'Bird', 'Hayes', 'Day', 'Armstrong', 'Hunter', 'Chambers', 'Stone', 'Andrews', 'Reynolds',
  'Booth', 'Cunningham', 'Saunders', 'Pearce', 'Rose', 'Graham', 'Lane', 'Wells', 'Kennedy', 'Gibson',
  'Fisher', 'Thomas', 'Owen', 'Price', 'Griffiths', 'Pritchard', 'Rees', 'Vaughan', 'Llewellyn', 'Bevan',
  'Ross', 'Paterson', 'Reid', 'Robertson', 'Henderson', 'Duncan', 'Ferguson', 'Kerr', 'Sinclair', 'Munro',
  'Riley', 'Holt', 'Bates', 'Newton', 'Barlow', 'Pollard', 'Whitehead', 'Hindle', 'Clegg', 'Butterworth',
  'Ashworth', 'Greenwood', 'Townsend', 'Bamford', 'Proctor', 'Duckworth', 'Openshaw', 'Entwistle', 'Pilling', 'Cartwright',
  'Woodward', 'Fowler', 'Gardner', 'Lambert', 'Page', 'Sharp', 'Mills', 'Holloway', 'Tucker', 'Hammond',
  'Slater', 'Nash', 'Coles', 'Draper', 'Fuller', 'Goddard', 'Kemp', 'Lister', 'Mellor', 'Naylor',
  'Ogden', 'Parsons', 'Quinlan', 'Rhodes', 'Stubbs', 'Thornton', 'Varley', 'Wainwright', 'Yates', 'Whitworth',
];

const MORE = {
  ie: { last: ['Kavanagh', 'Nolan', 'Duffy', 'Lynch', 'Healy', 'Fitzgerald', "O'Neill", 'McGrath', 'Hennessy', 'Moran'], first: ['Shane', 'Colm', 'Aidan', 'Oisin', 'Rory', 'Donal', 'Tadhg', 'Brendan'] },
  eu: { last: ['Kamiński', 'Zieliński', 'Szymański', 'Woźniak', 'Constantin', 'Stan', 'Moldovan', 'Costa', 'Pereira', 'Jankauskas', 'Bērziņš', 'Novák', 'Ricci', 'Kovács'], first: ['Jakub', 'Piotr', 'Michał', 'Bartosz', 'Florin', 'Cosmin', 'Adrian', 'Gabriel', 'Diogo', 'Rafael', 'Lukas', 'Dovydas', 'Matteo'] },
  in: { last: ['Bhatt', 'Desai', 'Joshi', 'Grewal', 'Johal', 'Rai', 'Thakkar', 'Parmar', 'Mann', 'Atwal'], first: ['Ajay', 'Manpreet', 'Sukhdeep', 'Rahul', 'Aman', 'Jaskaran', 'Deepak', 'Varun', 'Hardeep'] },
  pk: { last: ['Rashid', 'Aslam', 'Bashir', 'Saeed', 'Nawaz', 'Qureshi', 'Siddiqui', 'Mirza'], first: ['Adnan', 'Haris', 'Junaid', 'Saqib', 'Umar', 'Nadeem', 'Shoaib', 'Ayaan'] },
  bd: { last: ['Begum', 'Khan', 'Ali', 'Kabir', 'Haque', 'Sarker'], first: ['Rahim', 'Sabbir', 'Ashik', 'Imran', 'Nayeem', 'Rubel'] },
  af: { last: ['Ogunleye', 'Eze', 'Danso', 'Appiah', 'Mensah-Bonsu', 'Okoro', 'Ibrahim', 'Warsame', 'Hassan', 'Afolabi'], first: ['Chidi', 'Segun', 'Kwabena', 'Ade', 'Obinna', 'Daniel', 'Joseph', 'Michael', 'Mohamed'] },
  cb: { last: ['Brown', 'Williams', 'Johnson', 'Phillips', 'Lewis', 'Daley', 'Forbes', 'Powell'], first: ['Leroy', 'Clive', 'Desmond', 'Trevor', 'Jerome', 'Shaquille', 'Kemoy', 'Romario'] },
  cn: { last: ['Ho', 'Yip', 'Tang', 'Chan', 'Ng', 'Leung'], first: ['Jian', 'Bo', 'Lei', 'Feng'] },
  ar: { last: ['Abbas', 'Najjar', 'Aziz', 'Fadel', 'Karam', 'Sabbagh'], first: ['Ali', 'Hassan', 'Mustafa', 'Adam', 'Bilal', 'Ibrahim'] },
};

const uniq = (list) => [...new Set(list)];
export const LOCAL_FIRST_EN_10 = Object.fromEntries(Object.entries(LOCAL_FIRST_EN).map(([k, v]) => [k, uniq([...v, ...FIRST_MORE[k]])]));
export const ORIGINS_EN_10 = Object.fromEntries(
  Object.entries(ORIGINS_EN).map(([id, o]) => {
    if (id === 'gb') return [id, { ...o, last: uniq([...o.last, ...GB_LAST_MORE]) }];
    if (id === 'mix') return [id, { ...o, last: uniq([...o.last, ...GB_LAST_MORE.slice(0, 40)]) }];
    const m = MORE[id];
    return [id, m ? { ...o, last: uniq([...o.last, ...m.last]), first: uniq([...(o.first ?? []), ...(m.first ?? [])]) } : o];
  }),
);
