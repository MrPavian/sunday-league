// "Wer kann Sonntag?" – Nachrichten in der Mannschaftsgruppe.
// Jede Liste ist in beiden Sprachen gleich lang, damit der Zufall gleich bleibt.
import { tr } from '../core/i18n.js';

export const SHIFT_JOBS = ['Pflegekraft', 'Schichtarbeiter', 'Busfahrer', 'Bäcker', 'Lagerist', 'Paketbote'];
export const TRAVEL_JOBS = ['Elektriker', 'Dachdecker', 'Versicherungsmakler', 'IT-Admin'];

export const YES = tr(
  [
    'Bin dabei!',
    'Klar. Wer bringt die Bälle?',
    'Dabei, komme mit dem Rad.',
    'Jo. Hat jemand noch Stutzen für mich?',
    'Bin da. Diesmal auch pünktlich, versprochen.',
    'Safe dabei.',
    'Komme, aber nur wenn ich nicht wieder ins Tor muss.',
    'Bin dabei, bringe Kuchen von Oma mit.',
  ],
  [
    'I’m in!',
    'Sure. Who’s bringing the balls?',
    'In, coming on the bike.',
    'Yep. Anyone got spare socks for me?',
    'I’ll be there. On time this time, promise.',
    'Definitely in.',
    'Coming, but only if I don’t have to go in goal again.',
    'I’m in, bringing Grandma’s cake.',
  ],
);

const NO_BY_JOB = tr(
  {
    shift: ['Hab Spätschicht, sorry.', 'Muss Sonntag Dienst schieben.', 'Frühschicht bis 14 Uhr, klappt nicht.'],
    travel: ['Bin auf Montage in Dortmund.', 'Muss zum Kunden, sorry Leute.', 'Bin erst Montag wieder da.'],
    Student: ['Klausurphase. Leider.', 'Muss Hausarbeit schreiben (angeblich).'],
    Frührentner: ['Kegeln mit dem Verein, das geht vor.', 'Bin mit meiner Frau im Harz.'],
  },
  {
    shift: ['Late shift, sorry.', 'Working Sunday.', 'Early shift until 2pm, can’t make it.'],
    travel: ['I’m on a job in Dortmund.', 'Got to see a customer, sorry lads.', 'Not back until Monday.'],
    Student: ['Exam season. Sadly.', 'Got an essay to write (apparently).'],
    Frührentner: ['Bowling club, that comes first.', 'Away in the Harz with the wife.'],
  },
);

export const NO_GENERIC = tr(
  [
    'Hochzeit von der Cousine.',
    'Kinder haben Geburtstag, keine Chance.',
    'Bin krank. Wirklich!',
    'Schwiegereltern kommen. Mehr sag ich nicht.',
    'Umzug von nem Kumpel, hab zugesagt.',
    'Rücken.',
  ],
  [
    'My cousin’s wedding.',
    'Kids’ birthday party, no chance.',
    'I’m ill. Really!',
    'The in-laws are coming. That’s all I’m saying.',
    'Helping a mate move house, promised him.',
    'My back.',
  ],
);

export const LATE = tr(
  [
    'Komme zur zweiten Halbzeit, hab vorher noch Taufe.',
    'Schaffe es erst zur Pause, stellt mich auf die Bank.',
    'Bin später da, muss den Kleinen noch zum Handball bringen.',
  ],
  [
    'I’ll come for the second half, got a christening first.',
    'Won’t make it until half-time, put me on the bench.',
    'I’ll be late, got to take the little one to handball first.',
  ],
);

export const INJURED = tr(
  ['Knie ist noch offen von letzter Woche. Setze aus.', 'Das Knie… nächste Woche wieder.'],
  ['Knee is still raw from last week. Sitting this one out.', 'The knee… back next week.'],
);

export const NUDGE_YES = tr(
  ['Na gut, ich tausch die Schicht.', 'Okay okay, ich komm. Aber nur weil du es bist.', 'Überredet. Aber ich spiel nicht hinten!'],
  ['Fine, I’ll swap my shift.', 'Okay okay, I’ll come. But only because it’s you.', 'You’ve talked me into it. But I’m not playing at the back!'],
);
export const NUDGE_NO = tr(
  ['Geht echt nicht, sorry.', 'Nee, wirklich nicht. Nächste Woche!', 'Lass gut sein, ich kann nicht.'],
  ['Really can’t, sorry.', 'No, honestly not. Next week!', 'Leave it, I can’t.'],
);

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
    (p) => tr(`${p.first} aus der Nachbarschaft kickt manchmal im Park mit. Soll ganz okay sein.`, `${p.first} from round the corner sometimes plays in the park. Supposed to be all right.`),
    (p) => tr(`Ein Arbeitskollege, ${p.first}, hätte wohl Lust auf Sonntags-Kick.`, `A colleague, ${p.first}, fancies a Sunday kickabout.`),
    (p) => tr(`${p.first} hat im Kiosk gefragt, ob noch jemand Leute sucht.`, `${p.first} asked at the corner shop if anyone needs players.`),
    (p) => tr(`Der Mitbewohner von einem aus der Gruppe, ${p.first}, würde gern mal mitspielen.`, `The flatmate of someone in the group, ${p.first}, would like a game.`),
  ],
  gut: [
    (p) => tr(`Beim Bäcker erzählen sie, ${p.name} sucht einen Verein – war früher mal in der B-Klasse.`, `At the bakery they say ${p.name} is looking for a club – used to play in League B.`),
    (p) => tr(`${p.name} hat beim Firmenlauf alle abgehängt. Kickt angeblich auch.`, `${p.name} left everyone behind at the company fun run. Apparently plays football too.`),
    (p) => tr(`${p.name} ist gerade hergezogen und fragt in der Nachbarschaftsgruppe nach einem Verein.`, `${p.name} has just moved here and is asking the neighbourhood group about a club.`),
    (p) => tr(`Beim Sommerfest der Kita hat ${p.name} beim Elfmeterschießen alles versenkt.`, `At the nursery summer fair ${p.name} scored every penalty.`),
  ],
  stark: [
    (p) => tr(`${p.name} ist neu im Viertel. Man hört, er war beim alten Verein Stammspieler.`, `${p.name} is new in the area. Word is he was a regular at his old club.`),
    (p) => tr(`Im Kiosk sagen sie, ${p.name} hat früher Bezirksliga gespielt.`, `At the corner shop they say ${p.name} used to play county league.`),
    (p) => tr(`${p.name} spielt dienstags Hallenfußball mit den Schichtleuten – und macht alle nass.`, `${p.name} plays indoor football with the shift workers on Tuesdays – and runs rings round them.`),
  ],
  dorfstar: [
    (p) => tr(`Im Vereinsheim flüstert man: ${p.name} hat Stress bei seinem Verein. Der trifft angeblich, wie er will.`, `They’re whispering at the clubhouse: ${p.name} has fallen out with his club. Supposedly scores at will.`),
    (p) => tr(`${p.name}? Den kennt hier jeder. Soll gerade vereinslos sein.`, `${p.name}? Everyone round here knows him. Supposed to be without a club right now.`),
  ],
  superstar: [(p) => tr(`Unglaublich, aber wahr: ${p.name} soll mal richtig hoch gespielt haben – und jetzt hier wohnen!`, `Unbelievable but true: ${p.name} is supposed to have played at a really high level – and now lives here!`)],
  legende: [(p) => tr(`GERÜCHT: Ein ehemaliger Profi ist ins Neubaugebiet gezogen. „${p.title}"? Im Supermarkt hat ihn jemand erkannt.`, `RUMOUR: a former pro has moved onto the new estate. "${p.title}"? Someone recognised him at the supermarket.`)],
};

export const JOIN_TEXT = tr(
  ['Bin dabei. Wann ist Training?', 'Okay, ich komm vorbei. Wer hat die Trikots?', 'Klingt gut. Gibt es danach Bier?'],
  ['I’m in. When’s training?', 'Okay, I’ll come along. Who has the shirts?', 'Sounds good. Is there beer afterwards?'],
);
export const DECLINE_TEXT = tr(
  {
    default: ['Danke, aber ich bleib bei meinen Jungs.', 'Sonntags ist Familientag, sorry.', 'Vielleicht nächste Saison.'],
    legende: ['Vielleicht nächste Saison. Erstmal ankommen.', 'Ich will einfach nur kicken – bei euch ist mir zu viel Trubel.'],
    superstar: ['Nur wenn ich um 15 Uhr wieder zu Hause bin. Ach, das klappt eh nicht.', 'Ich überleg es mir. Meldet euch nächste Woche nochmal.'],
  },
  {
    default: ['Thanks, but I’m staying with my lads.', 'Sunday is family day, sorry.', 'Maybe next season.'],
    legende: ['Maybe next season. Settling in first.', 'I just want to play – there’s too much fuss at your place.'],
    superstar: ['Only if I’m home by 3pm. Oh, that won’t work anyway.', 'I’ll think about it. Get back to me next week.'],
  },
);
export const FAREWELL = tr(
  ['Danke für alles, Männer. Man sieht sich im Vereinsheim.', 'War schön mit euch. Ich komm zum Sommerfest!'],
  ['Thanks for everything, lads. See you at the clubhouse.', 'It was great with you. I’ll come to the summer party!'],
);
