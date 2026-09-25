// Ex-Profis: fiktive Archetypen, keine echten Personen. Alle sind nach der
// Karriere zurück in die Heimat gezogen und wollen einfach nur kicken.
// Stärken sind Weltklasse, Tempo und Puste sind … Ruhestand.
export const LEGEND_ARCHETYPES = [
  {
    id: 'abwehrturm',
    title: 'Der Abwehrturm',
    role: 'def',
    attrs: { pace: 0.46, stamina: 0.42, technique: 0.74, passing: 0.8, shooting: 0.55, tackling: 0.93, heading: 0.94, keeping: 0.2 },
    traits: ['ex_profi', 'kopfball', 'anfuehrer'],
    look: { height: 1.1, belly: 0.35 },
    story: (c) =>
      `${c.years} Jahre Bundesliga bei ${c.club}, sogar ein paar Länderspiele. Ein Kreuzbandriss zu viel – jetzt wohnt er wieder im Heimatort, ist die Ruhe selbst und will sonntags einfach kicken. Ohne Kameras.`,
  },
  {
    id: 'zehner',
    title: 'Der Zehner',
    role: 'mid',
    attrs: { pace: 0.42, stamina: 0.36, technique: 0.96, passing: 0.95, shooting: 0.78, tackling: 0.35, heading: 0.45, keeping: 0.2 },
    traits: ['ex_profi', 'gutes_auge', 'ballsicher'],
    look: { height: 0.96, belly: 0.25 },
    story: (c) =>
      `Spielmacher bei ${c.club}, zwei Pokalsiege. Der Ball klebt ihm noch immer am Fuß – nur mit dem Laufen hat er's nicht mehr so.`,
  },
  {
    id: 'knipser',
    title: 'Der Knipser',
    role: 'fwd',
    attrs: { pace: 0.52, stamina: 0.4, technique: 0.8, passing: 0.62, shooting: 0.96, tackling: 0.3, heading: 0.82, keeping: 0.2 },
    traits: ['ex_profi', 'hammer'],
    look: { height: 1.02, belly: 0.4 },
    story: (c) =>
      `Über ${c.goals} Profitore für ${c.club}. Trifft immer noch aus jeder Lage – läuft aber nur noch, wenn es sich lohnt.`,
  },
  {
    id: 'torwart',
    title: 'Die Torwartlegende',
    role: 'gk',
    attrs: { pace: 0.4, stamina: 0.5, technique: 0.6, passing: 0.7, shooting: 0.5, tackling: 0.4, heading: 0.5, keeping: 0.95 },
    traits: ['ex_profi', 'anfuehrer'],
    look: { height: 1.08, belly: 0.3 },
    story: (c) =>
      `Stand über ${c.games} Mal für ${c.club} im Tor. Brüllt immer noch die ganze Abwehr zusammen – und hält, was zu halten ist.`,
  },
  {
    id: 'staubsauger',
    title: 'Der Staubsauger',
    role: 'mid',
    attrs: { pace: 0.66, stamina: 0.93, technique: 0.7, passing: 0.78, shooting: 0.5, tackling: 0.88, heading: 0.6, keeping: 0.2 },
    traits: ['ex_profi', 'pferdelunge', 'hart_im_nehmen'],
    look: { height: 0.98, belly: 0.1 },
    story: (c) =>
      `${c.years} Jahre Sechser bei ${c.club}. Rennt auch mit Anfang 40 noch alle in Grund und Boden. Macht nebenbei Marathon.`,
  },
  {
    id: 'fluegelflitzer',
    title: 'Der Flügelflitzer',
    role: 'fwd',
    attrs: { pace: 0.72, stamina: 0.55, technique: 0.88, passing: 0.8, shooting: 0.7, tackling: 0.3, heading: 0.4, keeping: 0.2 },
    traits: ['ex_profi', 'schnell'],
    look: { height: 0.94, belly: 0.15 },
    story: (c) =>
      `Früher der schnellste Mann bei ${c.club}. Die Hüfte sagt inzwischen Nein, aber auf den ersten zehn Metern ist er immer noch weg.`,
  },
];
