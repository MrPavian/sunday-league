// "Wer kann Sonntag?" – Nachrichten in der Mannschaftsgruppe.
export const SHIFT_JOBS = ['Pflegekraft', 'Schichtarbeiter', 'Busfahrer', 'Bäcker', 'Lagerist', 'Paketbote'];
export const TRAVEL_JOBS = ['Elektriker', 'Dachdecker', 'Versicherungsmakler', 'IT-Admin'];

export const YES = [
  'Bin dabei!',
  'Klar. Wer bringt die Bälle?',
  'Dabei, komme mit dem Rad.',
  'Jo. Hat jemand noch Stutzen für mich?',
  'Bin da. Diesmal auch pünktlich, versprochen.',
  'Safe dabei.',
  'Komme, aber nur wenn ich nicht wieder ins Tor muss.',
  'Bin dabei, bringe Kuchen von Oma mit.',
];

const NO_BY_JOB = {
  shift: ['Hab Spätschicht, sorry.', 'Muss Sonntag Dienst schieben.', 'Frühschicht bis 14 Uhr, klappt nicht.'],
  travel: ['Bin auf Montage in Dortmund.', 'Muss zum Kunden, sorry Leute.', 'Bin erst Montag wieder da.'],
  Student: ['Klausurphase. Leider.', 'Muss Hausarbeit schreiben (angeblich).'],
  Frührentner: ['Kegeln mit dem Verein, das geht vor.', 'Bin mit meiner Frau im Harz.'],
};

export const NO_GENERIC = [
  'Hochzeit von der Cousine.',
  'Kinder haben Geburtstag, keine Chance.',
  'Bin krank. Wirklich!',
  'Schwiegereltern kommen. Mehr sag ich nicht.',
  'Umzug von nem Kumpel, hab zugesagt.',
  'Rücken.',
];

export const LATE = [
  'Komme zur zweiten Halbzeit, hab vorher noch Taufe.',
  'Schaffe es erst zur Pause, stellt mich auf die Bank.',
  'Bin später da, muss den Kleinen noch zum Handball bringen.',
];

export const INJURED = ['Knie ist noch offen von letzter Woche. Setze aus.', 'Das Knie… nächste Woche wieder.'];

export const NUDGE_YES = ['Na gut, ich tausch die Schicht.', 'Okay okay, ich komm. Aber nur weil du es bist.', 'Überredet. Aber ich spiel nicht hinten!'];
export const NUDGE_NO = ['Geht echt nicht, sorry.', 'Nee, wirklich nicht. Nächste Woche!', 'Lass gut sein, ich kann nicht.'];

export function noReasons(profession) {
  if (SHIFT_JOBS.includes(profession)) return NO_BY_JOB.shift;
  if (TRAVEL_JOBS.includes(profession)) return NO_BY_JOB.travel;
  if (profession.startsWith('Student')) return NO_BY_JOB.Student;
  return NO_BY_JOB[profession] ?? NO_GENERIC;
}

// Wie wahrscheinlich sagt jemand ab? Schichtarbeit & Montage machen's schwer.
export function absenceChance(profession) {
  if (SHIFT_JOBS.includes(profession)) return 0.28;
  if (TRAVEL_JOBS.includes(profession)) return 0.22;
  return 0.14;
}

// Gerüchteküche – woher man von neuen Leuten hört.
export const RUMOR_SOURCES = {
  ok: [
    (p) => `${p.first} aus der Nachbarschaft kickt manchmal im Park mit. Soll ganz okay sein.`,
    (p) => `Ein Arbeitskollege, ${p.first}, hätte wohl Lust auf Sonntags-Kick.`,
    (p) => `${p.first} hat im Kiosk gefragt, ob noch jemand Leute sucht.`,
    (p) => `Der Mitbewohner von einem aus der Gruppe, ${p.first}, würde gern mal mitspielen.`,
  ],
  gut: [
    (p) => `Beim Bäcker erzählen sie, ${p.name} sucht einen Verein – war früher mal in der B-Klasse.`,
    (p) => `${p.name} hat beim Firmenlauf alle abgehängt. Kickt angeblich auch.`,
    (p) => `${p.name} ist gerade hergezogen und fragt in der Nachbarschaftsgruppe nach einem Verein.`,
    (p) => `Beim Sommerfest der Kita hat ${p.name} beim Elfmeterschießen alles versenkt.`,
  ],
  stark: [
    (p) => `${p.name} ist neu im Viertel. Man hört, er war beim alten Verein Stammspieler.`,
    (p) => `Im Kiosk sagen sie, ${p.name} hat früher Bezirksliga gespielt.`,
    (p) => `${p.name} spielt dienstags Hallenfußball mit den Schichtleuten – und macht alle nass.`,
  ],
  dorfstar: [
    (p) => `Im Vereinsheim flüstert man: ${p.name} hat Stress bei seinem Verein. Der trifft angeblich, wie er will.`,
    (p) => `${p.name}? Den kennt hier jeder. Soll gerade vereinslos sein.`,
  ],
  superstar: [(p) => `Unglaublich, aber wahr: ${p.name} soll mal richtig hoch gespielt haben – und jetzt hier wohnen!`],
  legende: [(p) => `GERÜCHT: Ein ehemaliger Profi ist ins Neubaugebiet gezogen. „${p.title}"? Im Supermarkt hat ihn jemand erkannt.`],
};

export const JOIN_TEXT = ['Bin dabei. Wann ist Training?', 'Okay, ich komm vorbei. Wer hat die Trikots?', 'Klingt gut. Gibt es danach Bier?'];
export const DECLINE_TEXT = {
  default: ['Danke, aber ich bleib bei meinen Jungs.', 'Sonntags ist Familientag, sorry.', 'Vielleicht nächste Saison.'],
  legende: ['Vielleicht nächste Saison. Erstmal ankommen.', 'Ich will einfach nur kicken – bei euch ist mir zu viel Trubel.'],
  superstar: ['Nur wenn ich um 15 Uhr wieder zu Hause bin. Ach, das klappt eh nicht.', 'Ich überleg es mir. Meldet euch nächste Woche nochmal.'],
};
export const FAREWELL = ['Danke für alles, Männer. Man sieht sich im Vereinsheim.', 'War schön mit euch. Ich komm zum Sommerfest!'];
