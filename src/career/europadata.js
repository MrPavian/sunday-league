// Europapokal (ROADMAP 11.17 #13) – nur Daten und Texte, keine Logik (pokal.js und europa.js lesen hier).
// Alles erfunden: Wettbewerbsnamen, Vereine und Städte. Die Länder sind echt, die Orte nicht.
import { tr } from '../core/i18n.js';

// Die Namen der drei Wettbewerbe stehen NUR hier. Nie den Namen eines echten Wettbewerbs verwenden.
// eu1 = oberster Wettbewerb, eu2 = zweiter, eu3 = dritter (Aufbau wie die drei europäischen Vereinswettbewerbe seit 2024/25).
export const EURO_KINDS = ['eu1', 'eu2', 'eu3'];
export const EURO_NAMES = {
  eu1: tr('Sternenliga', 'Star League'),
  eu2: tr('Kontinentalpokal', 'Continental Cup'),
  eu3: tr('Grenzlandpokal', 'Borderland Cup'),
};

// Startplätze aus der 1. Liga (6 Vereine im Spiel). Vom Nutzer entschieden (2026-11-08): drei Wettbewerbe – Platz 1–2 im obersten,
// Platz 3 im zweiten, Platz 4 im dritten. In echt hat Deutschland vier Plätze im obersten Wettbewerb bei 18 Vereinen; hier anteilig.
// Echte Qualifikationsrunden gibt es nicht: alle starten direkt in der Ligaphase (vereinfacht).
export const EURO_QUAL = { 1: 'eu1', 2: 'eu1', 3: 'eu2', 4: 'eu3' };

// Prämien in Euro, wie im UEFA-Rundschreiben Nr. 32/2025 („Distribution to clubs from the 2025/26 UEFA Champions League,
// UEFA Europa League, UEFA Conference League and 2025 UEFA Super Cup“, 16.06.2025), Abschnitte 1.1.2, 1.2 und 1.3:
// start = Startgeld (equal share), win/draw = je Spiel der Ligaphase, share = ein Anteil der Platzierungsprämie (Platz 36 = 1 Anteil,
// Platz 1 = 36 Anteile), top8/top16 = Zuschlag für Platz 1–8 bzw. 9–16, po/r16/qf/sf/f = Erreichen von Play-offs, Achtel-, Viertel-,
// Halbfinale und Finale, winner = Zuschlag für den Sieger.
// Nicht nachgebildet: die „value pillar“ (Marktanteile und Zehnjahreswertung – im Spiel gibt es keine Koeffizienten) und die
// Umverteilung nicht ausgezahlter Remis-Prämien auf die Platzierungsprämie.
export const EURO_PRIZES = {
  eu1: { start: 18620000, win: 2100000, draw: 700000, share: 275000, top8: 2000000, top16: 1000000, po: 1000000, r16: 11000000, qf: 12500000, sf: 15000000, f: 18500000, winner: 6500000 },
  eu2: { start: 4310000, win: 450000, draw: 150000, share: 75000, top8: 600000, top16: 300000, po: 300000, r16: 1750000, qf: 2500000, sf: 4200000, f: 7000000, winner: 6000000 },
  eu3: { start: 3170000, win: 400000, draw: 133000, share: 28000, top8: 400000, top16: 200000, po: 200000, r16: 800000, qf: 1300000, sf: 2500000, f: 4000000, winner: 3000000 },
};

// Stärke der ausländischen Teilnehmer (Mittel, Streuung; Ø Wertung der besten 11 wie pokal.js). Spielwert, hergeleitet aus der
// Leiter der Profiligen (PRO_TARGET, niveau.js: 2. Liga 171, 1. Liga 186, 15 Punkte je Liga): Im obersten Wettbewerb spielen
// die Spitzenvereine der großen Ligen (etwas über dem Schnitt der 1. Liga), im dritten viele Vereine aus kleineren Ländern
// (etwa 2.-Liga-Niveau), der zweite liegt dazwischen. Stärkemodell 1/2 (alte Spielstände): Erstligist 96,5 (FIELD_STRENGTH).
export const EURO_STRENGTH = { eu1: [188, 7], eu2: [178, 6], eu3: [170, 6] };
export const EURO_STRENGTH_OLD = { eu1: [97.5, 1.2], eu2: [96.5, 1], eu3: [95.5, 1] };
// Welche Stärkeklassen (tier, 1 = Spitze) welcher Wettbewerb zieht.
export const EURO_TIERS = { eu1: [1, 2, 3], eu2: [2, 3, 4], eu3: [3, 4, 5] };

// Länder (echt) mit Grundklasse (Spielwert, grob nach der Stärke der Ligen) und erfundenen Vereinen. Die ersten drei Vereine
// eines Landes gehören zur Grundklasse, die übrigen eine Klasse tiefer.
const COUNTRIES = [
  ['eng', tr('England', 'England'), 1, ['Thornmere Rovers', 'Kestrelford United', 'Harrowdale City', 'Wexbridge Athletic', 'Coldbrook Town']],
  ['esp', tr('Spanien', 'Spain'), 1, ['Real Montaviña', 'Atlético Sierraclara', 'Deportivo Valdeoro', 'CD Puertolumbre', 'UD Castrellana']],
  ['ita', tr('Italien', 'Italy'), 1, ['AC Montevalle', 'Sportiva Borgoriva', 'US Castelnero', 'FC Lagofiorito', 'Atletico Rocciabella']],
  ['fra', tr('Frankreich', 'France'), 1, ['Olympique Valmoreau', 'AS Saint-Brévin', 'Stade Clairmont-sur-Lys', 'FC Rochebelle', 'RC Montauvin']],
  ['por', tr('Portugal', 'Portugal'), 2, ['SC Vilamar', 'FC Pedralva', 'CD Monteserra']],
  ['ned', tr('Niederlande', 'Netherlands'), 2, ['SV Dijkhaven', 'FC Veldrecht', 'VV Zandmeer']],
  ['bel', tr('Belgien', 'Belgium'), 2, ['KV Oostbrugge', 'Royal Sint-Aldeke', 'FC Merelbos']],
  ['tur', tr('Türkei', 'Türkiye'), 3, ['Karakaya SK', 'Yeşilova Spor', 'Denizkent FK']],
  ['cze', tr('Tschechien', 'Czechia'), 3, ['FK Horní Lesov', 'SK Vranov nad Brodem', 'FC Kamenná Ves']],
  ['gre', tr('Griechenland', 'Greece'), 3, ['Asteras Kalopolis', 'Thyella Neapoli Ano', 'AO Limnakion']],
  ['aut', tr('Österreich', 'Austria'), 3, ['SV Bergtal', 'FC Almwiesen', 'SK Seehof']],
  ['sco', tr('Schottland', 'Scotland'), 3, ['Glenmuir FC', 'Inverlochy Thistle', 'Ardcraig Rovers']],
  ['sui', tr('Schweiz', 'Switzerland'), 3, ['FC Talwil', 'BSC Rheinegg', 'FC Lac-Bleu']],
  ['nor', tr('Norwegen', 'Norway'), 3, ['Fjordvik IL', 'Nordstrand FK', 'Bjørkdal BK']],
  ['den', tr('Dänemark', 'Denmark'), 3, ['Søholm BK', 'FC Kystby', 'Vestermark IF']],
  ['cro', tr('Kroatien', 'Croatia'), 4, ['NK Kamenovac', 'HNK Primorje Jug', 'NK Zelengaj']],
  ['srb', tr('Serbien', 'Serbia'), 4, ['FK Brdovac', 'FK Rečni Grad', 'OFK Lipovica']],
  ['pol', tr('Polen', 'Poland'), 4, ['KS Brzozów Górny', 'Wisłoka Nowogród', 'Polonia Jeziorno']],
  ['swe', tr('Schweden', 'Sweden'), 4, ['Sjövik IF', 'Granås BK', 'Älvdala FF']],
  ['hun', tr('Ungarn', 'Hungary'), 4, ['Tiszafalva FC', 'Hegyvár SE', 'Dunakert TE']],
  ['ukr', tr('Ukraine', 'Ukraine'), 4, ['FK Stepove', 'FK Dniprove Pole', 'FK Lisovyi Kut']],
  ['rou', tr('Rumänien', 'Romania'), 4, ['FC Valea Verde', 'CS Muntenița', 'Dacia Râușor']],
];
export const EURO_COUNTRY = Object.fromEntries([['ger', tr('Deutschland', 'Germany')], ...COUNTRIES.map(([id, name]) => [id, name])]);

// Kürzel aus den Anfangsbuchstaben (ohne Vereinsform), höchstens drei.
const FORMS = new Set(['FC', 'AC', 'AS', 'SC', 'SV', 'CD', 'UD', 'US', 'RC', 'KV', 'VV', 'SK', 'FK', 'AO', 'BSC', 'IL', 'BK', 'IF', 'NK', 'HNK', 'OFK', 'KS', 'FF', 'SE', 'TE', 'CS', 'Real', 'Royal', 'Sportiva', 'Atlético', 'Atletico', 'Deportivo', 'Olympique', 'Stade', 'Spor']);
const shortOf = (name) => {
  const words = name.replace(/-/g, ' ').split(' ').filter((w) => w && !FORMS.has(w) && w[0] === w[0].toUpperCase());
  const s = words.length >= 3 ? words.slice(0, 3).map((w) => w[0]).join('') : words.length === 2 ? words[0].slice(0, 2) + words[1][0] : words[0].slice(0, 3);
  return s.replace(/Ø/g, 'O').replace(/ø/g, 'o').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 3);
};
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Alle ausländischen Vereine: { id, name, short, country, tier }.
export const EURO_POOL = COUNTRIES.flatMap(([country, , tier, clubs]) => clubs.map((name, i) => ({ id: `eu-${country}-${slug(name)}`, name, short: shortOf(name), country, tier: tier + (i >= 3 ? 1 : 0) })));
