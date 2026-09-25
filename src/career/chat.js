// "Wer kann Sonntag?" – Nachrichten in der Mannschaftsgruppe.
const SHIFT_JOBS = ['Pflegekraft', 'Schichtarbeiter', 'Busfahrer', 'Bäcker', 'Lagerist', 'Paketbote'];
const TRAVEL_JOBS = ['Elektriker', 'Dachdecker', 'Versicherungsmakler', 'IT-Admin'];

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
