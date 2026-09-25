// Ex-Profis: fiktive Archetypen, keine echten Personen. Alle sind nach der
// Karriere zurück in die Heimat gezogen und wollen einfach nur kicken.
// Stärken sind Weltklasse, Tempo und Puste sind … Ruhestand.
import { tr } from '../core/i18n.js';
export const LEGEND_ARCHETYPES = [
  {
    id: 'abwehrturm',
    title: tr('Der Abwehrturm', 'The Defensive Tower'),
    role: 'def',
    attrs: { pace: 0.46, stamina: 0.42, technique: 0.74, passing: 0.8, shooting: 0.55, tackling: 0.93, heading: 0.94, keeping: 0.2 },
    traits: ['ex_profi', 'kopfball', 'anfuehrer'],
    look: { height: 1.1, belly: 0.35 },
    story: (c) =>
      tr(`${c.years} Jahre Bundesliga bei ${c.club}, sogar ein paar Länderspiele. Ein Kreuzbandriss zu viel – jetzt wohnt er wieder im Heimatort, ist die Ruhe selbst und will sonntags einfach kicken. Ohne Kameras.`, `${c.years} years in the Bundesliga with ${c.club}, even a few caps. One cruciate ligament too many – now he lives in his home town again, calm as anything, and just wants to play on Sundays. No cameras.`),
  },
  {
    id: 'zehner',
    title: tr('Der Zehner', 'The Number Ten'),
    role: 'mid',
    attrs: { pace: 0.42, stamina: 0.36, technique: 0.96, passing: 0.95, shooting: 0.78, tackling: 0.35, heading: 0.45, keeping: 0.2 },
    traits: ['ex_profi', 'gutes_auge', 'ballsicher'],
    look: { height: 0.96, belly: 0.25 },
    story: (c) =>
      tr(`Spielmacher bei ${c.club}, zwei Pokalsiege. Der Ball klebt ihm noch immer am Fuß – nur mit dem Laufen hat er's nicht mehr so.`, `Playmaker at ${c.club}, two cup wins. The ball still sticks to his foot – it's just the running he's not so keen on any more.`),
  },
  {
    id: 'knipser',
    title: tr('Der Knipser', 'The Poacher'),
    role: 'fwd',
    attrs: { pace: 0.52, stamina: 0.4, technique: 0.8, passing: 0.62, shooting: 0.96, tackling: 0.3, heading: 0.82, keeping: 0.2 },
    traits: ['ex_profi', 'hammer'],
    look: { height: 1.02, belly: 0.4 },
    story: (c) =>
      tr(`Über ${c.goals} Profitore für ${c.club}. Trifft immer noch aus jeder Lage – läuft aber nur noch, wenn es sich lohnt.`, `Over ${c.goals} professional goals for ${c.club}. Still scores from anywhere – but only runs when it's worth it.`),
  },
  {
    id: 'torwart',
    title: tr('Die Torwartlegende', 'The Goalkeeping Legend'),
    role: 'gk',
    attrs: { pace: 0.4, stamina: 0.5, technique: 0.6, passing: 0.7, shooting: 0.5, tackling: 0.4, heading: 0.5, keeping: 0.95 },
    traits: ['ex_profi', 'anfuehrer'],
    look: { height: 1.08, belly: 0.3 },
    story: (c) =>
      tr(`Stand über ${c.games} Mal für ${c.club} im Tor. Brüllt immer noch die ganze Abwehr zusammen – und hält, was zu halten ist.`, `Kept goal for ${c.club} over ${c.games} times. Still bellows at the whole defence – and saves whatever can be saved.`),
  },
  {
    id: 'staubsauger',
    title: tr('Der Staubsauger', 'The Hoover'),
    role: 'mid',
    attrs: { pace: 0.66, stamina: 0.93, technique: 0.7, passing: 0.78, shooting: 0.5, tackling: 0.88, heading: 0.6, keeping: 0.2 },
    traits: ['ex_profi', 'pferdelunge', 'hart_im_nehmen'],
    look: { height: 0.98, belly: 0.1 },
    story: (c) =>
      tr(`${c.years} Jahre Sechser bei ${c.club}. Rennt auch mit Anfang 40 noch alle in Grund und Boden. Macht nebenbei Marathon.`, `${c.years} years as a holding midfielder at ${c.club}. Still runs everyone into the ground in his early forties. Does marathons on the side.`),
  },
  {
    id: 'fluegelflitzer',
    title: tr('Der Flügelflitzer', 'The Wing Wizard'),
    role: 'fwd',
    attrs: { pace: 0.72, stamina: 0.55, technique: 0.88, passing: 0.8, shooting: 0.7, tackling: 0.3, heading: 0.4, keeping: 0.2 },
    traits: ['ex_profi', 'schnell'],
    look: { height: 0.94, belly: 0.15 },
    story: (c) =>
      tr(`Früher der schnellste Mann bei ${c.club}. Die Hüfte sagt inzwischen Nein, aber auf den ersten zehn Metern ist er immer noch weg.`, `Used to be the fastest man at ${c.club}. His hip says no these days, but over the first ten metres he's still gone.`),
  },
];
