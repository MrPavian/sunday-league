// Englische Namen für Karrieren auf Englisch (Namensauflage 5): eine Sunday-League-Mannschaft in
// einer englischen Stadt. Herkunft gewichtet nach dem Zensus 2021 für England und Wales (ONS, Ethnic
// group, 29.11.2022): White British 74,4 %, White Other 6,2 %, Indian 3,1 %, Pakistani 2,7 %,
// Black African 2,5 %, Mixed 2,9 %, Bangladeshi 1,1 %, Black Caribbean 1,0 %, White Irish 0,9 %,
// Chinese 0,7 %, Arab 0,6 %. Häufigste Nachnamen zuerst (Smith, Jones, Taylor, Brown, Williams …).
// Vornamen nach Jahrgang wie bei den deutschen: Gary und Steve bei den Älteren, Callum und Tyler bei den Jüngeren.

const GB_FIRST = {
  young: ['Jack', 'Harry', 'Charlie', 'George', 'Oliver', 'Alfie', 'Jacob', 'Joshua', 'Josh', 'Callum', 'Connor', 'Kyle', 'Tyler', 'Liam', 'Ryan', 'Jordan', 'Lewis', 'Reece', 'Kieran', 'Jake', 'Brandon', 'Mason', 'Ethan', 'Luke', 'Sam', 'Ben', 'Adam', 'Tom', 'Joe', 'Dan', 'Alex', 'Max', 'Owen', 'Harvey', 'Jamie', 'Ellis', 'Bradley', 'Declan'],
  mid: ['Daniel', 'Matthew', 'Christopher', 'Chris', 'Andrew', 'James', 'David', 'Mark', 'Paul', 'Lee', 'Craig', 'Darren', 'Wayne', 'Steven', 'Scott', 'Jason', 'Richard', 'Michael', 'Carl', 'Neil', 'Dean', 'Stuart', 'Simon', 'Jamie', 'Rob', 'Ricky', 'Danny', 'Gareth', 'Ashley', 'Jonathan', 'Nick', 'Martin', 'Ross', 'Shaun', 'Ian', 'Glenn'],
  old: ['Gary', 'Steve', 'Kevin', 'Paul', 'Mark', 'Ian', 'Keith', 'Colin', 'Trevor', 'Nigel', 'Graham', 'Barry', 'Terry', 'Tony', 'Dave', 'Phil', 'Martin', 'Pete', 'Alan', 'Clive', 'Derek', 'Roger', 'Mick', 'Brian', 'Geoff', 'Malcolm', 'Les', 'Ray', 'Bob', 'Kenny', 'Stan', 'Frank', 'Roy', 'Dennis'],
};

const GB_LAST = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright',
  'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke',
  'Harris', 'Lewis', 'Edwards', 'Hughes', 'Turner', 'Hill', 'Moore', 'Cooper', 'King', 'Baker',
  'Harrison', 'Morgan', 'Patel', 'Allen', 'Ward', 'Martin', 'Scott', 'Mitchell', 'Clark', 'Young',
  'Watson', 'Morris', 'Parker', 'Bennett', 'Cook', 'Bell', 'Phillips', 'Shaw', 'Lee', 'Carter',
  'Murray', 'Richardson', 'Collins', 'Holmes', 'Ellis', 'Barker', 'Atkinson', 'Mason', 'Marshall', 'Webb',
  'Rogers', 'Gray', 'Kelly', 'Stevens', 'Dixon', 'Russell', 'Pearson', 'Fletcher', 'Chapman', 'Foster',
  'Matthews', 'Spencer', 'Hunt', 'Lloyd', 'Butler', 'Powell', 'Simpson', 'Barnes', 'Fox', 'Lawrence',
  'Payne', 'Jenkins', 'Stewart', 'Hart', 'Knight', 'Sutton', 'Dawson', 'Holland', 'Bradley', 'Lowe',
  'Hodgson', 'Kirk', 'Pickering', 'Whittaker', 'Gallagher', 'McDonald', 'Fraser', 'Hamilton', 'Burns', 'Wilkinson',
  'Briggs', 'Haworth', 'Ackroyd', 'Sykes', 'Bairstow', 'Pennington', 'Crowther', 'Hargreaves', 'Ramsbottom', 'Lightfoot',
];

export const ORIGINS_EN = {
  gb: { w: 0.744, last: GB_LAST },
  ie: {
    w: 0.009,
    last: ['Murphy', 'Kelly', "O'Brien", 'Byrne', 'Ryan', "O'Sullivan", 'Walsh', 'Doyle', 'McCarthy', 'Gallagher', "O'Connor", 'Brennan', 'Quinn', 'Flanagan', 'Dunne', 'Keane'],
    first: ['Sean', 'Conor', 'Ciaran', 'Padraig', 'Niall', 'Eoin', 'Cian', 'Darragh', 'Declan', 'Ronan', 'Fergal', 'Kieran'],
    localFirst: 0.55,
  },
  eu: {
    w: 0.062,
    last: ['Kowalski', 'Nowak', 'Wiśniewski', 'Lewandowski', 'Popescu', 'Ionescu', 'Dumitru', 'Silva', 'Santos', 'Ferreira', 'Kazlauskas', 'Petrauskas', 'Rossi', 'Esposito', 'Horváth', 'Ozols'],
    first: ['Tomasz', 'Łukasz', 'Paweł', 'Kamil', 'Mateusz', 'Andrei', 'Mihai', 'Bogdan', 'Ionuț', 'João', 'Tiago', 'Rui', 'Tomas', 'Mantas', 'Luca', 'Marco'],
    localFirst: 0.25,
  },
  in: {
    w: 0.031,
    last: ['Patel', 'Singh', 'Sharma', 'Gill', 'Sandhu', 'Mistry', 'Kumar', 'Shah', 'Chauhan', 'Dhillon', 'Bains', 'Sidhu'],
    first: ['Raj', 'Arjun', 'Vikram', 'Rohan', 'Sunil', 'Ravi', 'Amit', 'Harpreet', 'Jaspal', 'Gurdeep', 'Sanjay', 'Nikhil', 'Kiran', 'Dev'],
    localFirst: 0.12,
  },
  pk: {
    w: 0.027,
    last: ['Khan', 'Hussain', 'Ahmed', 'Ali', 'Iqbal', 'Mahmood', 'Akhtar', 'Butt', 'Malik', 'Shah', 'Riaz', 'Javed'],
    first: ['Imran', 'Bilal', 'Usman', 'Adeel', 'Zain', 'Hamza', 'Faisal', 'Asif', 'Kamran', 'Tariq', 'Sajid', 'Waqas', 'Danyal', 'Rizwan'],
    localFirst: 0.05,
  },
  bd: {
    w: 0.011,
    last: ['Miah', 'Rahman', 'Uddin', 'Islam', 'Hossain', 'Ahmed', 'Chowdhury', 'Alam'],
    first: ['Shahid', 'Rakib', 'Sohel', 'Jamal', 'Rashid', 'Abdul', 'Mamun', 'Shakil', 'Tanvir', 'Farhan'],
    localFirst: 0.05,
  },
  af: {
    w: 0.025,
    last: ['Okafor', 'Adeyemi', 'Mensah', 'Boateng', 'Osei', 'Okonkwo', 'Adebayo', 'Owusu', 'Abdi', 'Mohamed', 'Nwosu', 'Asante'],
    first: ['Chinedu', 'Kwame', 'Tunde', 'Emeka', 'Kofi', 'Yaw', 'Abdi', 'Femi', 'Kelechi', 'Emmanuel', 'Samuel', 'Godfrey'],
    localFirst: 0.45,
  },
  cb: {
    w: 0.01,
    last: ['Campbell', 'Thompson', 'Clarke', 'Francis', 'Grant', 'Reid', 'Morgan', 'Bailey', 'Gordon', 'Henry', 'Richards', 'Samuels'],
    first: ['Marcus', 'Jermaine', 'Tyrone', 'Leon', 'Andre', 'Dwayne', 'Kemar', 'Delroy', 'Winston', 'Rohan', 'Courtney', 'Errol'],
    localFirst: 0.6,
  },
  // Mixed: meist englische Vor- und Nachnamen, beim Aussehen alles dazwischen.
  mix: { w: 0.029, last: GB_LAST.slice(0, 60) },
  cn: {
    w: 0.007,
    last: ['Chen', 'Wong', 'Li', 'Wang', 'Liu', 'Zhang', 'Cheung', 'Lam'],
    first: ['Wei', 'Jun', 'Hao', 'Ming', 'Kai', 'Chun'],
    localFirst: 0.6,
  },
  ar: {
    w: 0.006,
    last: ['Haddad', 'Mansour', 'Khalil', 'Saleh', 'Nasser', 'Hamdan'],
    first: ['Karim', 'Omar', 'Youssef', 'Samir', 'Tarek', 'Rami'],
    localFirst: 0.2,
  },
};
export const LOCAL_FIRST_EN = GB_FIRST;
// Aussehen: Gruppen wie in origins.js (de ≈ britisch, pl ≈ Osteuropa, south, ar, wa) plus Südasien, Karibik, Mixed, Ostasien.
export const LOOK_GROUP_EN = { gb: 'de', ie: 'de', eu: 'pl', in: 'sa', pk: 'sa', bd: 'sa', af: 'wa', cb: 'cb', mix: 'mix', cn: 'ea', ar: 'ar' };
