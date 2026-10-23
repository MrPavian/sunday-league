// Dossiers: Was man über einen Spieler erfährt, wenn man ihm am Tresen zuhört.
// Jeder Spieler bekommt deterministisch (aus seiner Pool-Nummer) je einen Satz
// Herkunft, Familie, Traum und Geheimnis. p = { first, age, profession, position, origin } (dossierFacts).
// Herkunftssätze passen zur Herkunft des Namens (origins.js): Wer Müller heißt, erzählt nicht von Anatolien;
// Positionssätze zur Position (der Torwart schießt nicht „öfter aufs Tor“).
import { tr } from '../core/i18n.js';

// Was die Dossier-Sätze über einen Spieler wissen: aus playerOf und der Herkunft seines Nachnamens.
export const dossierFacts = (p, origin = null) => ({ first: p.name.split(' ')[0], age: p.age, profession: p.profession, position: p.position, origin });

// Woher die Familie kommt – je Herkunftsgruppe (Gruppen aus origins.js und origins_en.js). Ohne Eintrag (z. B. deutsch,
// britisch) nimmt der Platz einen allgemeinen Satz.
const ORIGIN_LINES = {
  tr: tr('Die Eltern kamen aus Anatolien, der Onkel hat in der Türkei in der dritten Liga gespielt. Das erwähnt er ungefähr jedes zweite Training.', 'Parents came from Anatolia; the uncle played third division in Turkey. Comes up about every other training session.'),
  pl: tr('Ist in Polen geboren, mit sechs hergezogen. Kann auf zwei Sprachen fluchen, und tut das auch.', 'Born in Poland, moved here at six. Can swear in two languages, and does.'),
  ruhr: tr('Der Uropa kam als Bergmann aus Masuren ins Ruhrgebiet. Vom Polnischen ist nur der Nachname übrig – und die Liebe zum Bolzplatz hinter der Zeche.', 'His great-grandfather came to the Ruhr from Masuria as a miner. All that is left of the Polish is the surname – and a love for the kickabout patch behind the pit.'),
  russ: tr('Ist als Kind mit der Familie aus Kasachstan gekommen. Die Oma kocht für jedes Heimspiel Pelmeni für die halbe Mannschaft.', 'Came over from Kazakhstan with his family as a kid. His grandma makes pelmeni for half the team before every home game.'),
  yu: tr('Die Eltern kamen in den Neunzigern vom Balkan. Der Vater steht bei jedem Spiel am Zaun und gibt Anweisungen in zwei Sprachen.', 'His parents came over from the Balkans in the nineties. His dad stands at the fence every game, shouting instructions in two languages.'),
  it: tr('Der Opa kam als Gastarbeiter aus Kalabrien und hat später die Eisdiele am Markt aufgemacht. Nach Siegen gibt es dort Spaghetti-Eis aufs Haus.', 'His grandad came from Calabria as a guest worker and later opened the ice-cream parlour on the market square. After a win it is free ice cream.'),
  gr: tr('Die Familie kommt aus der Gegend um Thessaloniki. Der Vater hat die Taverne gleich neben dem Sportplatz.', 'The family comes from around Thessaloniki. His dad runs the taverna right next to the ground.'),
  pt: tr('Die Eltern kamen aus der Nähe von Porto. Im Sommer fährt die ganze Familie runter, deswegen fehlt er jedes Jahr in der Vorbereitung.', 'His parents came from near Porto. Every summer the whole family drives down, which is why he misses pre-season every year.'),
  ar: tr('Ist zweisprachig aufgewachsen – zu Hause Arabisch, auf dem Bolzplatz Deutsch. Fluchen kann er in beiden.', 'Grew up bilingual – Arabic at home, the local lingo on the kickabout patch. Can swear in both.'),
  wa: tr('Die Familie kam aus Westafrika. Der große Bruder hat dort auf Sand gespielt und lacht über jeden, der sich über den Ascheplatz beschwert.', 'The family came from West Africa. His big brother played on sand back there and laughs at anyone who moans about the ash pitch.'),
  ie: tr('Die Familie kommt aus Irland. Zu Hause lief eher Gaelic Football, er hat sich trotzdem für das runde Leder entschieden.', 'The family is Irish. Gaelic football was the thing at home, but he chose the round ball anyway.'),
  eu: tr('Ist erst als Teenager hergezogen. Spricht inzwischen besser Englisch als mancher hier, flucht aber in der Muttersprache.', 'Only moved here as a teenager. Speaks better English than half the locals by now, but swears in his mother tongue.'),
  in: tr('Die Großeltern kamen aus Indien. Eigentlich sollte er Cricket spielen – der Vater hat es ihm bis heute nicht ganz verziehen.', 'His grandparents came from India. He was supposed to play cricket – his dad has never quite forgiven him.'),
  pk: tr('Die Familie kam aus Pakistan. Der Onkel organisiert jeden Sommer ein Turnier im Park, er ist seit Jahren Torschützenkönig.', 'The family came from Pakistan. His uncle runs a tournament in the park every summer, and he has been top scorer for years.'),
  bd: tr('Die Eltern kamen aus Bangladesch. Der Laden der Familie ist sonntags zu – damit alle beim Spiel zuschauen können.', 'His parents came from Bangladesh. The family shop shuts on Sundays so everyone can watch him play.'),
  af: tr('Die Familie kam aus Afrika, er ist hier geboren. Der Vater war drüben ein guter Stürmer und erinnert ihn bei jeder Gelegenheit daran.', 'The family came from Africa; he was born here. His dad was a decent striker back home and reminds him at every opportunity.'),
  cb: tr('Die Großeltern kamen aus der Karibik. Bei Heimspielen bringt die Tante Jerk Chicken für die dritte Halbzeit mit.', 'His grandparents came from the Caribbean. At home games his aunt brings jerk chicken for the third half.'),
  cn: tr('Die Eltern kamen aus Hongkong und haben ein Restaurant. Mannschaftsessen nach dem Aufstieg: dort, ganz klar.', 'His parents came from Hong Kong and run a restaurant. Team dinner after promotion: there, obviously.'),
};
const originLine = (p) => ORIGIN_LINES[p.origin] ?? null;
const gk = (p) => p.position === 'gk';

export const DOSSIER_ORDER = ['herkunft', 'familie', 'traum', 'geheimnis'];
// Welcher Satz eines Kapitels zu welchem Spieler gehört.
export const dossierIndex = (idx, i, len = 10) => (idx * (i + 3) + i * 7) % len;
export const DOSSIER_LABELS = tr(
  { herkunft: 'Herkunft', familie: 'Familie', traum: 'Traum', geheimnis: 'Geheimnis' },
  { herkunft: 'Origin', familie: 'Family', traum: 'Dream', geheimnis: 'Secret' },
);

export const DOSSIER = {
  herkunft: tr(
    [
      (p) => `${p.first} ist im Kanalviertel aufgewachsen, drei Straßen vom Platz entfernt. Der erste Ball war ein zusammengeknüllter Einkaufsbeutel.`,
      (p) => `Kam mit zwölf aus dem Ruhrgebiet her. Redet heute noch vom Bolzplatz hinter der Zeche.`,
      (p) => `${p.first} ist auf einem Bauernhof groß geworden. Hat als Kind gegen die Scheunenwand geschossen, bis das Tor schief hing.`,
      (p) => originLine(p) ?? `Ist in einer alten Zechensiedlung groß geworden. Gespielt wurde auf der Straße, bis die Laternen angingen.`,
      () => `Stammt aus einem Dorf, das so klein ist, dass man für ein Elf-gegen-elf zwei Nachbarorte brauchte.`,
      (p) => originLine(p) ?? `${p.first} ist als Kind dreimal umgezogen. Der Fußballverein war jedes Mal das Erste, was die Familie gesucht hat.`,
      () => `War als Kind im Internat. Fußball war das Einzige, was dort Spaß gemacht hat.`,
      (p) => `${p.first} hat die halbe Kindheit im Kleingarten der Oma verbracht – das Gartentor war das Tor.`,
      () => `Wuchs in einem Hochhaus auf, der Käfig im Hof war sein Wohnzimmer. Daher auch die Technik auf engem Raum.`,
      () => `Kommt von der Küste. Findet, dass hier im Binnenland viel zu wenig Wind weht.`,
    ],
    [
      (p) => `${p.first} grew up by the canal, three streets from the pitch. The first ball was a crumpled-up carrier bag.`,
      (p) => `Moved here from the Ruhr at twelve. Still talks about the kickabout patch behind the old colliery.`,
      (p) => `${p.first} grew up on a farm. Used to shoot at the barn wall as a kid until the door hung crooked.`,
      (p) => originLine(p) ?? `Grew up on an old pit estate. Played in the street until the lamps came on.`,
      () => `Comes from a village so small you needed two neighbouring towns to make up eleven-a-side.`,
      (p) => originLine(p) ?? `${p.first} moved house three times as a kid. Every time, the football club was the first thing the family looked for.`,
      () => `Was at boarding school as a kid. Football was the only thing worth showing up for.`,
      (p) => `${p.first} spent half his childhood in Grandma's allotment – the garden gate was the goal.`,
      () => `Grew up in a tower block; the cage in the courtyard was his living room. Hence the close control.`,
      () => `From the coast. Reckons it's far too still inland round here.`,
    ],
  ),
  familie: tr(
    [
      (p) => `Hat drei ältere Schwestern. „Deswegen halte ich jeden Zweikampf aus."`,
      () => `Der Vater war Schiedsrichter in der Kreisliga. Er meckert trotzdem bei jeder Entscheidung.`,
      () => `Wohnt noch bei den Eltern. Die Mutter wäscht die Trikots der halben Mannschaft mit.`,
      () => `Ist frisch getrennt. Fußball ist gerade das Einzige, was sich normal anfühlt.`,
      () => `Seine Frau ist der größte Fan am Spielfeldrand. Lauter als alle anderen zusammen.`,
      (p) => (gk(p) ? `Hat eine kleine Tochter, die bei jeder Parade „Papaaa!" ruft. Er wirft sich seitdem nach jedem Ball.` : `Hat eine kleine Tochter, die bei jedem Tor „Papaaa!" ruft. Er schießt seitdem öfter aufs Tor.`),
      () => `Der Bruder hat früher besser gespielt als er. Ist aber schon mit 19 wegen Knie aufgehört.`,
      () => `Pflegt nebenbei die kranke Oma. Deswegen muss er manchmal früher los.`,
      (p) => `Die Familie hält eigentlich zum Handball. ${p.first} ist das schwarze Schaf.`,
      () => `Ist Einzelkind und findet deswegen, dass die Mannschaft seine Familie ist.`,
    ],
    [
      (p) => `Has three older sisters. "That's why I can take any tackle."`,
      () => `His dad used to referee in the district league. Still moans at every decision.`,
      () => `Still lives with his parents. His mum washes half the team's kit as well.`,
      () => `Newly single. Football's about the only thing that feels normal right now.`,
      () => `His wife is the biggest fan on the touchline. Louder than everyone else put together.`,
      (p) => (gk(p) ? `Has a little daughter who shouts "Daddyyy!" at every save. He's been diving for everything ever since.` : `Has a little daughter who shouts "Daddyyy!" at every goal. He's been shooting more ever since.`),
      () => `His brother used to be the better player. Packed it in at nineteen with a bad knee though.`,
      () => `Looks after his poorly grandma on the side, so he sometimes has to leave early.`,
      (p) => `The family are really a handball lot. ${p.first} is the black sheep.`,
      () => `An only child, so he reckons the team is his family.`,
    ],
  ),
  traum: tr(
    [
      (p) => (gk(p) ? `Will einmal im Leben ein Tor schießen – als Torwart, per Abstoß über den ganzen Platz. Übt heimlich nach dem Training.` : `Will einmal im Leben ein Tor per Fallrückzieher schießen. Übt heimlich auf der Matratze.`),
      (p) => `Träumt davon, später den Verein zu übernehmen – als Vorsitzender, mit Anzug und allem.`,
      () => `Will mit der Mannschaft einmal zum Auswärtsspiel nach Mallorca. Egal gegen wen.`,
      (p) => `Möchte irgendwann eine eigene Werkstatt aufmachen – ${p.profession === 'Dachdecker' ? 'eine Dachdeckerei' : 'irgendwas mit Holz'}.`,
      () => `Will einmal gegen eine Profimannschaft spielen. Und sei es beim Freundschaftsspiel im Sommer.`,
      () => `Träumt vom Aufstieg in die Kreisliga A. Hat schon ein Banner gemalt.`,
      () => `Will Jugendtrainer werden, „damit die Kleinen es besser haben als wir damals".`,
      () => `Möchte einmal eine Saison ohne Gelbe Karte schaffen. Bisher hat es nie geklappt.`,
      () => `Will nach Kanada auswandern. Seit zehn Jahren. Nächstes Jahr bestimmt.`,
      (p) => `Möchte mit 40 noch spielen. ${p.age >= 36 ? 'Das wird knapp.' : 'Er rechnet schon rückwärts.'}`,
    ],
    [
      (p) => (gk(p) ? `Wants to score a goal once in his life – as a keeper, a goal kick the length of the pitch. Practises in secret after training.` : `Wants to score an overhead kick once in his life. Practises in secret on the mattress.`),
      (p) => `Dreams of running the club one day – as chairman, suit and all.`,
      () => `Wants an away trip to Majorca with the team someday. Doesn't care who against.`,
      (p) => `Wants to open his own workshop someday – ${p.profession === 'Dachdecker' ? 'a roofing firm' : 'something with wood'}.`,
      () => `Wants to play against a professional side once. Even a friendly in the summer would do.`,
      () => `Dreams of promotion to the district league. Already painted a banner.`,
      () => `Wants to become a youth coach, "so the little ones have it better than we did".`,
      () => `Wants a whole season without a yellow card. Never managed it yet.`,
      () => `Wants to emigrate to Canada. Ten years running. Definitely next year.`,
      (p) => `Wants to still be playing at 40. ${p.age >= 36 ? "It's going to be close." : "He's already counting backwards."}`,
    ],
  ),
  geheimnis: tr(
    [
      () => `Hat einmal ein Probetraining bei einem Zweitligisten verschlafen. Wirklich verschlafen. Erzählt es niemandem.`,
      (p) => (gk(p) ? `Hat panische Angst vor dem Elfmeterschießen – als Torwart. Er schaut beim Anlauf heimlich weg.` : `Hat panische Angst vor Elfmetern. Deshalb humpelt er immer genau dann „leicht".`),
      () => `War früher beim Gegner vom Kanal. Ist wegen einer Wette gewechselt – die er verloren hat.`,
      () => `Trägt seit 15 Jahren dieselben Schienbeinschoner. Aberglaube. Sie riechen entsprechend.`,
      () => `Hat die Mannschaftskasse vor Jahren mal „geliehen" und heimlich zurückgezahlt. Mit Zinsen.`,
      () => `Kann eigentlich gar nicht schwimmen. Deswegen fehlt er bei jedem Ausflug an den See.`,
      () => `Schreibt heimlich Gedichte. Eins über den Ascheplatz hat er beim Stadtfest vorgelesen – unter anderem Namen.`,
      () => `Ist eigentlich Fan vom großen Rivalen aus der Stadt. Die Bettwäsche verrät ihn.`,
      () => `Hat mal einen Schiri-Lehrgang angefangen und nach dem ersten Tag abgebrochen: „Zu viel Verantwortung."`,
      () => `Spielt nur mit, weil er vor Jahren einem sterbenden Freund versprochen hat, nie mit dem Kicken aufzuhören.`,
    ],
    [
      () => `Once slept through a trial at a second-division club. Properly slept through it. Never tells a soul.`,
      (p) => (gk(p) ? `Is terrified of shoot-outs – as a goalkeeper. He secretly looks away during the run-up.` : `Is terrified of penalties. That's why he always develops a slight limp right on cue.`),
      () => `Used to play for the rivals across the canal. Switched over a lost bet.`,
      () => `Has worn the same shin pads for fifteen years. Superstition. They smell the part.`,
      () => `"Borrowed" from the club kitty years ago and paid it back in secret. With interest.`,
      () => `Actually can't swim, which is why he skips every trip to the lake.`,
      () => `Secretly writes poetry. Read one about the ash pitch at the town festival – under a different name.`,
      () => `Is actually a fan of the big rivals in town. His bedding gives him away.`,
      () => `Started a referee course once and quit after day one: "too much responsibility."`,
      () => `Only still plays because he promised a dying mate years ago never to stop.`,
    ],
  ),
};

// Opa Heinz, seit 1971 jeden Sonntag am Zaun, weiß alles besser.
export const HEINZ = tr(
  [
    '„Früher hat man den Ball gestoppt. Mit der Brust. Heute nur noch mit dem Handy."',
    '„Ein Tor ist ein Tor. Auch wenn es mit dem Knie war."',
    '„Asche im Knie ist wie ein Tattoo – nur ehrlicher."',
    '„Der Schiri pfeift, wie er frühstückt. Und heute hatte er nix."',
    '„Wer sonntags um zehn noch Restalkohol hat, gehört auf die Bank. Oder ins Tor."',
    '„Taktik ist, wenn der Dicke hinten bleibt."',
    '„Wir hatten 1978 auch nur neun Mann. Und haben 4:3 gewonnen. Glaube ich."',
    '„Pressing heißt: alle laufen hin, keiner kommt an."',
    '„Die Jugend von heute trinkt Wasser in der Halbzeit. Unglaublich."',
    '„Ein Trainer, der nicht meckert, hat schon aufgegeben."',
    '„Das Runde muss ins Eckige. Und das Bier in den Bauch."',
    '„Einmal hab ich einen Ball bis auf die Autobahn geschossen. Den suchen die heute noch."',
  ],
  [
    '"In my day you stopped the ball. With your chest. Nowadays it\'s all phone."',
    '"A goal is a goal. Even off the knee."',
    '"Cinders in the knee are like a tattoo – only more honest."',
    '"The ref whistles the way he has breakfast. And today he had none."',
    '"Anyone still half-cut on a Sunday at ten belongs on the bench. Or in goal."',
    '"Tactics is when the fat lad stays back."',
    '"We only had nine men in 1978 too. Won 4-3. I think."',
    '"Pressing means everyone runs at him and nobody gets there."',
    '"Kids these days drink water at half-time. Unbelievable."',
    '"A manager who doesn\'t moan has already given up."',
    '"The round thing goes in the square thing. And the beer goes in the belly."',
    '"Once I hit a shot clean onto the motorway. Still looking for it, probably."',
  ],
);

// Tipps vom Wirt über den nächsten Gegner (wirken auf dessen Werte).
export const INTEL = tr(
  [
    { text: (o) => `„Der Torwart vom ${o} schiebt die ganze Woche Nachtschicht. Der sieht Sonntag doppelt."`, mods: { keeping: -0.07 } },
    { text: (o) => `„Beim ${o} haben sie diese Woche nur einmal trainiert. Die pumpen nach 20 Minuten."`, mods: { stamina: -0.06 } },
    { text: (o) => `„Der Stürmer vom ${o} hat Stress mit der Freundin. Der trifft gerade nicht mal das Klo."`, mods: { shooting: -0.06 } },
    { text: (o) => `„Beim ${o} fehlt der Abwehrchef, Hochzeit vom Cousin. Hinten ist da alles offen."`, mods: { tackling: -0.06 } },
  ],
  [
    { text: (o) => `"The ${o} keeper's been on night shifts all week. He'll see double on Sunday."`, mods: { keeping: -0.07 } },
    { text: (o) => `"${o} only trained once this week. They'll be gasping after twenty minutes."`, mods: { stamina: -0.06 } },
    { text: (o) => `"The ${o} striker's having girlfriend trouble. Can't hit a barn door right now."`, mods: { shooting: -0.06 } },
    { text: (o) => `"${o}'s missing their defensive chief, cousin's wedding. Wide open at the back."`, mods: { tackling: -0.06 } },
  ],
);

// Traum unterstützen: passend zum jeweiligen Traum (gleiche Reihenfolge wie DOSSIER.traum).
export const DREAM_SUPPORT = tr(
  [
    (n, p) => (p && gk(p) ? `Ihr übt zwei Abende weite Abstöße. Beim zehnten springt der Ball über den Kasten am anderen Ende – ${n} jubelt wie beim Aufstieg.` : `Ihr übt zwei Abende Fallrückzieher auf der Weitsprunggrube. ${n} landet dreimal im Sand – beim vierten Mal sitzt er.`),
    (n) => `Du nimmst ${n} mit zur Vorstandssitzung. Er sagt dreimal was Kluges und bekommt einen Schlüssel fürs Vereinsheim.`,
    (n) => `Du legst schon mal eine Mallorca-Kasse an. ${n} wirft als Erster 20 € rein und grinst seitdem.`,
    (n) => `Du stellst ${n} dem Sponsor vor. Der hat noch eine alte Werkbank übrig – der erste Schritt.`,
    (n) => `Du schreibst die Reserve vom großen Stadtverein an. Im Sommer gibt's ein Testspiel – ${n} hat schon Gänsehaut.`,
    (n) => `Ihr malt das Aufstiegsbanner zusammen fertig. Es hängt jetzt in der Kabine. ${n} schaut jedes Training drauf.`,
    (n) => `${n} darf ab jetzt beim Jugendtraining mithelfen. Die Kleinen lieben ihn.`,
    (n) => `Du bastelst ${n} einen „Fairplay-Pokal" aus einer Kaffeetasse. Er steht jetzt auf seinem Schreibtisch.`,
    (n) => `Ihr schaut zusammen Flüge nach Kanada. ${n} bucht natürlich nicht – aber er weiß jetzt, dass ihr ihn vermissen würdet.`,
    (n) => `Du versprichst ${n} einen Einsatz im Spiel nach seinem 40. Geburtstag. Egal gegen wen, egal wie es steht.`,
  ],
  [
    (n, p) => (p && gk(p) ? `You spend two evenings practising long goal kicks. On the tenth one the ball bounces over the far goal – ${n} celebrates like it was promotion.` : `You spend two evenings practising overhead kicks into the long-jump pit. ${n} lands in the sand three times – nails it on the fourth.`),
    (n) => `You bring ${n} along to the committee meeting. He says something sensible three times and gets a key to the clubhouse.`,
    (n) => `You start a Majorca fund. ${n} is first to chip in €20 and hasn't stopped grinning since.`,
    (n) => `You introduce ${n} to the sponsor, who's got an old workbench spare – a start.`,
    (n) => `You write to the reserves of the big city club. There's a friendly in the summer – ${n} already has goosebumps.`,
    (n) => `You finish painting the promotion banner together. It's hanging in the changing room now. ${n} looks at it every session.`,
    (n) => `${n} gets to help out with youth training from now on. The kids love him.`,
    (n) => `You knock ${n} up a "fair play trophy" out of a coffee mug. It's on his desk now.`,
    (n) => `You look up flights to Canada together. ${n} doesn't book, obviously – but now he knows you'd miss him.`,
    (n) => `You promise ${n} a runout in the match after his 40th birthday. Whoever it's against, whatever the score.`,
  ],
);

export const RUMOR_CHAT = tr(
  [
    (n, s) => `Jemand hat was in die Gruppe geschrieben. Über ${n}: „${s}"`,
    (n, s) => `In der Kabine wird getuschelt. Angeblich: ${s} Gemeint ist ${n}.`,
  ],
  [
    (n, s) => `Someone's posted something in the group chat. About ${n}: "${s}"`,
    (n, s) => `There's whispering in the changing room. Apparently: ${s} They mean ${n}.`,
  ],
);
