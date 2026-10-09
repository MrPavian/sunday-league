// Ereignisse für die dünnen Saisonphasen (Messung `scripts/events-audit.mjs`): Training in Saisonmitte und -ende,
// Ehrenamt in Saisonmitte und -ende, Schiedsrichter in der untersten Liga (Stufe 1, Freizeitliga ohne Schiri auf dem
// Platz) und das Saisonziel zu Beginn und zur Mitte. 14 Ereignisse, davon zwei Ketten:
//   jugendleiter_ueberlastet → jugendleiter_bilanz · schiri_kurs → schiri_pruefung (nur Stufe 1).
// Wirkungsgrößen wie bei den vorhandenen Ereignissen (localevents.js, seasonevents.js): Stimmung ±0,02 … 0,12,
// Tagesform ±0,1 … 0,5, Fitness ±0,05 … 0,1, Kasse ±15 … 90 €, Förderverein ±1 … 2, Absage 1 Woche.
// Spielbericht: Verspätungen laufen über sitOut(…, 'late') und lateOr (ab Stufe 4 wird daraus „fehlt“);
// Gesperrte werden nie gezogen (some() filtert isBanned).
// Je Saison höchstens einmal (Merker c.flags.lev); Ketten stehen in c.flags.chain und verfallen mit der Saison.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf, table } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { adjustFitness } from './fitness.js';
import { hasFacility } from './facilities.js';
import { first, outcome, sitOut } from './outcomes.js';
import { lateOr } from './spielbericht.js';
import { adjustEnergy } from './personal.js';
import { setRelation } from './relations.js';
import { GOALS, targetPos } from './board.js';
import { POKALE, pokalOf } from './pokal.js';
import { isBanned } from './suspensions.js';
import { doneThisSeason, dueLink, followUp, hurt, level, local, neighbors, opponentName, rounds, some, squad, startChain, supporters, team } from './localevents.js';

// Saisonphase wie in der Messung: 0 Anfang, 1 Mitte, 2 Ende (je ein Drittel der Spieltage).
const phase = (c) => Math.min(2, Math.floor((c.round / rounds(c)) * 3));
const ready = (c) => squad(c).filter((i) => !isBanned(c, i) && !(c.players[i]?.injuryWeeks > 0) && !(c.players[i]?.awayWeeks > 0));
const pickReady = (c, rng, filter = () => true) => {
  const list = ready(c).filter(filter);
  return list.length ? rng.pick(list) : null;
};
const GOAL_ORDER = ['erhalt', 'obere', 'aufstieg'];
// Der Vorstand stuft das Saisonziel um eine Stufe um; liefert false, wenn es nicht weiter geht.
function shiftGoal(c, d) {
  const g = c.goal;
  const i = GOAL_ORDER.indexOf(g.type) + d;
  if (!g || i < 0 || i >= GOAL_ORDER.length) return false;
  g.type = GOAL_ORDER[i];
  g.target = targetPos(c, g.type);
  return true;
}
const goalType = (c) => c.goal?.type;
const myPos = (c) => table(c).findIndex((r) => r.club.human) + 1;
const goalLive = (c) => !!c.goal && c.goal.season === c.season;
const cupSoon = (c) => {
  for (const kind of ['kreis', 'bezirk', 'bund']) {
    const cup = pokalOf(c, kind);
    if (cup && !cup.done && !cup.out && cup.rounds[cup.round] >= c.round && cup.rounds[cup.round] - c.round <= 4) return POKALE[kind].name;
  }
  return null;
};

export const PHASE_EVENTS = {
  // === Training, Saisonmitte und -ende ==============================================================
  platz_unter_wasser: local('platz_unter_wasser', {
    weight: 6,
    needs: (c) => (phase(c) === 1 && !doneThisSeason(c, 'platz_unter_wasser') ? {} : null),
    text: () => tr('Nach drei Tagen Dauerregen steht der halbe Trainingsplatz unter Wasser. Im Torraum paddeln zwei Enten, und der Platzwart hält eine Pumpe in der Hand, die zuletzt 1998 gelaufen ist.', 'After three days of steady rain half the training pitch is under water. Two ducks are paddling in the goalmouth, and the groundsman is holding a pump that last worked in 1998.'),
    options: [
      {
        label: tr('Schulturnhalle mieten (30 €)', 'Hire the school gym (€30)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Turnhalle gemietet', 'Gym hired'), -30), team(c, 0.08), tr('Hallenfußball mit Minitoren und Kastenbänken. Alle haben Spaß, der Hausmeister zählt die Bälle nach.', 'Indoor football with mini goals and vaulting benches. Everyone has fun, the caretaker counts the balls afterwards.')) },
          { w: 1.5, run: (c, ctx, rng) => { book(c, tr('Turnhalle gemietet', 'Gym hired'), -30); const s = pickReady(c, rng); if (s != null) hurt(c, s); return tr('Auf dem glatten Hallenboden rutscht einer weg und landet auf der Matte. Zum Glück nur eine Zerrung.', 'On the slippery gym floor someone slides away and lands on the mat. Luckily only a strain.'); } },
          { w: 1, run: (c) => (book(c, tr('Turnhalle gemietet', 'Gym hired'), -30), adjustMood(c, -0.03), tr('Die Halle ist doppelt gebucht: Nebenan übt der Seniorentanzkreis. Ihr trainiert zu Walzermusik.', 'The hall is double-booked: the seniors\' dance circle is next door. You train to waltz music.')) },
        ]),
      },
      {
        label: tr('Trotzdem trainieren – Wasserschlacht', 'Train anyway – water fight'),
        effect: outcome([
          { w: 2.5, run: (c) => (adjustMood(c, 0.08), team(c, -0.05), tr('Grätschen über zwanzig Meter, ein Torwart wie eine Robbe. Danach heiße Dusche und Gelächter.', 'Slides over twenty metres, a keeper like a seal. Afterwards a hot shower and laughter.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) hurt(c, s); return tr(`${s != null ? first(c, s) : 'Einer'} bleibt im Matsch hängen und knickt um. Der Platz kostet euch einen Mann.`, `${s != null ? first(c, s) : 'Someone'} gets stuck in the mud and goes over on his ankle. The pitch costs you a man.`); } },
          { w: 1, run: (c) => (team(c, -0.12), tr('Der Ball bleibt in jeder Pfütze stehen. Nach zehn Minuten ist das Training ein Moorspaziergang.', 'The ball stops dead in every puddle. After ten minutes the session is a walk across a bog.')) },
        ]),
      },
      {
        label: tr('Absagen und Pumpen leihen (25 €)', 'Cancel and borrow pumps (€25)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Pumpen vom Bauhof', 'Pumps from the council depot'), -25), adjustMood(c, 0.03), tr('Der Bauhof schickt zwei Pumpen und drei Männer, die zuschauen. Zum Wochenende ist der Platz wieder bespielbar.', 'The council depot sends two pumps and three men who watch. By the weekend the pitch is playable again.')) },
          { w: 1, run: (c) => (book(c, tr('Pumpen vom Bauhof', 'Pumps from the council depot'), -25), neighbors(c, -1), tr('Das Abpumpen flutet den Garten der Nachbarn. Sie ziehen ihren Gartenzwerg demonstrativ ins Trockene.', 'The pumping floods the neighbours\' garden. They pointedly carry their garden gnome to higher ground.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Die Pumpe von 1998 läuft nicht. Niemand ist überrascht, der Platzwart am wenigsten.', 'The 1998 pump will not start. Nobody is surprised, the groundsman least of all.')) },
        ]),
      },
    ],
  }),

  flutlicht_dunkel: local('flutlicht_dunkel', {
    weight: 4.5,
    needs: (c) => (phase(c) >= 1 && !doneThisSeason(c, 'flutlicht_dunkel') ? { lights: hasFacility(c, 'flutlicht') } : null),
    text: (c, ctx) =>
      ctx.lights
        ? tr('Um halb sechs ist es stockdunkel. Das Flutlicht brennt, aber am Strafraum flackert eine Lampe wie in einem Gruselfilm. „Da hinten sieht man den Ball erst, wenn er im Netz liegt", sagt der Torwart.', 'By half past five it is pitch dark. The floodlights are on, but one lamp by the box flickers like in a horror film. "Back there you only see the ball when it is in the net," says the keeper.')
        : tr('Um halb sechs ist es stockdunkel, und ihr habt kein Flutlicht. Der Kapitän trainiert im Schein der Autoscheinwerfer auf dem Parkplatz am Spielfeldrand. „Wie bei den Profis, nur ärmer."', 'By half past five it is pitch dark, and you have no floodlights. The captain is training in the glow of car headlights parked along the touchline. "Like the pros, only poorer."'),
    options: [
      {
        label: tr('Stirnlampen und Leuchtbälle (25 €)', 'Head torches and glow balls (€25)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Stirnlampen und Leuchtbälle', 'Head torches and glow balls'), -25), adjustMood(c, 0.07), tr('Zwanzig Lichtpunkte tanzen über den Rasen. Der Nachbar filmt es für sein Wohnzimmer.', 'Twenty points of light dance across the grass. A neighbour films it for his living room.')) },
          { w: 1.5, run: (c, ctx, rng) => { book(c, tr('Stirnlampen und Leuchtbälle', 'Head torches and glow balls'), -25); const [a, b] = some(c, rng, 2); if (b != null) { adjustForm(c, a, -0.3); adjustForm(c, b, -0.3); } return tr('Zwei Stirnlampen prallen beim Kopfballduell aufeinander. Glas, Gelächter und Kopfschmerzen.', 'Two head torches collide in a heading duel. Glass, laughter and headaches.'); } },
          { w: 1, run: (c) => (book(c, tr('Stirnlampen und Leuchtbälle', 'Head torches and glow balls'), -25), team(c, 0.1), tr('Wer im Dunkeln den Ball trifft, trifft ihn am Sonntag erst recht. Das Training sitzt.', 'Anyone who hits the ball in the dark will certainly hit it on Sunday. The session pays off.')) },
        ]),
      },
      {
        label: (c) => (hasFacility(c, 'flutlicht') ? tr('Alles anschalten und trainieren (Strom 15 €)', 'Switch everything on and train (power €15)') : tr('Strahler beim Schützenverein leihen (20 €)', 'Borrow spotlights from the shooting club (€20)')),
        effect: outcome([
          { w: 3, run: (c) => (book(c, hasFacility(c, 'flutlicht') ? tr('Flutlicht-Strom', 'Floodlight power') : tr('Strahler geliehen', 'Spotlights borrowed'), hasFacility(c, 'flutlicht') ? -15 : -20), team(c, 0.07), tr('Volle Beleuchtung, volle Konzentration. Der Torwart darf wieder Fehler machen, die er sehen kann.', 'Full lighting, full concentration. The keeper may again make mistakes he can actually see.')) },
          { w: 1, run: (c) => (book(c, hasFacility(c, 'flutlicht') ? tr('Flutlicht-Strom', 'Floodlight power') : tr('Strahler geliehen', 'Spotlights borrowed'), hasFacility(c, 'flutlicht') ? -15 : -20), neighbors(c, -1), tr('Die Lampen leuchten bis in die Schlafzimmer gegenüber. Ein Nachbar kommt im Schlafanzug zum Zaun.', 'The lamps shine right into the bedrooms opposite. A neighbour comes to the fence in his pyjamas.')) },
          { w: 1, run: (c) => (book(c, tr('Sicherung durchgebrannt', 'Blown fuse'), -30), adjustMood(c, -0.02), tr('Alle Lampen gleichzeitig: Die Sicherung fliegt, und ihr trainiert die zweite Hälfte im Mondlicht. 30 € für den Elektriker.', 'All lamps at once: the fuse blows, and you train the second half by moonlight. €30 for the electrician.')) },
        ]),
      },
      {
        label: tr('Früher anfangen – wer nicht kann, kommt später', 'Start earlier – whoever cannot make it comes later'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Um vier ist noch Licht. Die Schichtarbeiter kommen ab fünf dazu und sind zur Hälfte der Einheit bereit.', 'At four there is still daylight. The shift workers join from five and are ready for the second half of the session.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.05), tr('Nur sechs Mann haben um vier Zeit. Der Rest murrt: „Arbeit zählt wohl nicht."', 'Only six men are free at four. The rest grumble: "Work obviously does not count."')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) sitOut(c, s, 'late'); return s != null ? lateOr(c, tr(`${first(c, s)} verpasst den Schichtwechsel und sitzt am Sonntag erst zur zweiten Halbzeit auf der Bank.`, `${first(c, s)} misses the shift change and only reaches the bench for the second half on Sunday.`), tr(`${first(c, s)} verpasst den Schichtwechsel, und der Spielbericht ist zu: Er fehlt am Sonntag.`, `${first(c, s)} misses the shift change, and the match report is closed: he is missing on Sunday.`)) : tr('Alle kommen pünktlich.', 'Everyone arrives on time.'); } },
        ]),
      },
    ],
  }),

  fitness_app: local('fitness_app', {
    weight: 4.5,
    needs: (c, rng) => {
      if (phase(c) !== 1 || doneThisSeason(c, 'fitness_app')) return null; // Saisonmitte
      const s = pickReady(c, rng, (i) => playerOf(c, i).age <= 31);
      return s != null ? { s } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat eine Fitness-App aufs Handy geladen und misst seitdem alles: Schritte, Puls, Schlaf. „Ich habe diese Woche 84 Prozent Erholung", verkündet er in der Kabine. Die Alten hören mit zusammengekniffenen Augen zu.`, `${first(c, ctx.s)} has put a fitness app on his phone and now tracks everything: steps, pulse, sleep. "I had 84 per cent recovery this week," he announces in the dressing room. The old boys listen with narrowed eyes.`),
    options: [
      {
        label: tr('Alle sollen sie nutzen', 'Everyone should use it'),
        effect: outcome([
          { w: 2.5, run: (c) => (team(c, 0.1), adjustMood(c, -0.02), tr('Plötzlich rennt jeder nach dem Training noch eine Runde, damit die App grün wird. Das Murren hört man trotzdem.', 'Suddenly everyone runs one more lap after training to turn the app green. You can still hear the grumbling.')) },
          { w: 1.5, run: (c, ctx) => (adjustFitness(c, ctx.s, 0.06), adjustForm(c, ctx.s, 0.3), tr(`${first(c, ctx.s)} gewinnt die interne Schrittwertung deutlich und geht seitdem nur noch zu Fuß einkaufen.`, `${first(c, ctx.s)} clearly wins the internal step ranking and has since gone shopping on foot only.`)) },
          { w: 1, run: (c, ctx, rng) => { const [o] = some(c, rng, 1); if (o != null && o !== ctx.s) c.players[o].grumpy = 1; return tr('Der Stürmer sieht seinen Ruhepuls und seinen Bierkonsum im selben Diagramm. Er löscht die App und redet zwei Tage nicht.', 'The striker sees his resting pulse and his beer intake in the same chart. He deletes the app and does not speak for two days.'); } },
        ]),
      },
      {
        label: tr('Freiwillig – wer mag, darf', 'Voluntary – whoever fancies it'),
        effect: outcome([
          { w: 2.5, run: (c, ctx) => (adjustFitness(c, ctx.s, 0.05), adjustMood(c, 0.03), tr(`${first(c, ctx.s)} und zwei Mitstreiter vergleichen jeden Dienstag ihre Werte. Der Rest nimmt die Wurst.`, `${first(c, ctx.s)} and two fellow enthusiasts compare their figures every Tuesday. The rest take the sausage.`)) },
          { w: 1.5, run: (c, ctx, rng) => { const [o] = some(c, rng, 1); if (o != null && o !== ctx.s) setRelation(c, ctx.s, o, 'kumpel'); return tr('Er überredet den Kapitän zu einem gemeinsamen Morgenlauf. Seitdem sind die beiden ein Team.', 'He talks the captain into a joint morning run. Since then the two have been a pair.'); } },
          { w: 1, run: (c) => (adjustMood(c, 0.01), tr('Niemand außer ihm schaut je wieder in die App. Er postet trotzdem stolz seinen Wochenbericht.', 'Nobody but him ever opens the app again. He proudly posts his weekly report anyway.')) },
        ]),
      },
      {
        label: tr('Verbieten – am Sonntag zählt der Ball', 'Ban it – on Sunday it is the ball that counts'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.04), tr('Die Alten applaudieren. Sonntag gewinnt, wer Fußball spielt, nicht wer Schritte zählt.', 'The old boys applaud. On Sunday it is whoever plays football who wins, not whoever counts steps.')) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, -0.3), (c.players[ctx.s].grumpy = 1), tr(`${first(c, ctx.s)} fühlt sich ausgebremst und läuft heimlich weiter. Mit schlechtem Gewissen.`, `${first(c, ctx.s)} feels held back and keeps tracking in secret. With a guilty conscience.`)) },
          { w: 1, run: (c, ctx) => (adjustFitness(c, ctx.s, -0.05), tr('Ohne App läuft er zu viel und zu schnell. Am Wochenende hat er schwere Beine.', 'Without the app he runs too much and too fast. By the weekend his legs are heavy.')) },
        ]),
      },
    ],
  }),

  elfmeter_training: local('elfmeter_training', {
    weight: 6,
    needs: (c) => {
      if (phase(c) < 1 || doneThisSeason(c, 'elfmeter_training')) return null;
      const cup = cupSoon(c);
      return cup ? { cup } : null;
    },
    text: (c, ctx) => tr(`${ctx.cup} steht bald an. „Wenn es ins Elfmeterschießen geht, will ich nicht wieder losen müssen", sagt der Kapitän. Die Frage ist, wie ihr übt: ernsthaft, locker oder mit Wettbewerb.`, `The ${ctx.cup} is coming up. "If it goes to penalties I do not want to draw lots again," says the captain. The question is how you practise: seriously, casually or as a contest.`),
    options: [
      {
        label: tr('Ernsthaft: Schütze und Reihenfolge festlegen', 'Seriously: fix takers and order'),
        effect: outcome([
          { w: 3, run: (c) => (team(c, 0.1), tr('Fünf feste Schützen, eine Reihenfolge auf einem Zettel am Spind. Das Gefühl, vorbereitet zu sein, ist schon die halbe Miete.', 'Five fixed takers, an order on a slip taped to the locker. Feeling prepared is half the battle.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) { adjustForm(c, s, -0.4); c.players[s].grumpy = 1; } return tr(`${s != null ? first(c, s) : 'Einer'} ballert fünf von fünf in den Fanzaun und steht danach lange allein am Punkt. Die Stimmung leidet mit.`, `${s != null ? first(c, s) : 'One of them'} blasts five out of five into the fan fence and then stands alone on the spot for a long while. The mood suffers with him.`); } },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) adjustForm(c, s, 0.4); return tr(`${s != null ? first(c, s) : 'Der Torwart'} hält zwei Strafstöße hintereinander und läuft jubelnd durch den Strafraum.`, `${s != null ? first(c, s) : 'The keeper'} saves two penalties in a row and runs around the box celebrating.`); } },
        ]),
      },
      {
        label: tr('Locker: jeder darf mal, Bier für den Verlierer', 'Casually: everyone has a go, beer for the loser'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Bier für den Strafstoß-Verlierer', 'Beer for the penalty loser'), -12), adjustMood(c, 0.09), tr('Der Linksverteidiger verliert und zahlt. Es wird der Abend des Jahres, auch ohne Pokalsieg.', 'The left-back loses and pays. It becomes the evening of the year, even without a cup win.')) },
          { w: 1.5, run: (c, ctx, rng) => { book(c, tr('Bier für den Strafstoß-Verlierer', 'Beer for the penalty loser'), -12); const [a, b] = some(c, rng, 2); if (b != null) setRelation(c, a, b, 'rivalen'); return tr('Zwei streiten, ob der Ball im Tor war. Der Streit dauert länger als das Training.', 'Two argue over whether the ball was in. The argument lasts longer than the session.'); } },
          { w: 1, run: (c) => (book(c, tr('Bier für den Strafstoß-Verlierer', 'Beer for the penalty loser'), -12), team(c, 0.05), tr('Nebenbei übt die ganze Truppe Anlauf und Nervenstärke. Sieht lässig aus, wirkt trotzdem.', 'On the side the whole squad practises run-ups and nerves. Looks casual, works anyway.')) },
        ]),
      },
      {
        label: tr('Gar nicht – wir gewinnen in der regulären Zeit', 'Not at all – we win in normal time'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.04), tr('Die Mannschaft lacht, nickt und trainiert Standards. Selbstvertrauen ist auch eine Methode.', 'The squad laughs, nods and trains set pieces. Confidence is a method too.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.04), tr('Ein Ersatzspieler bringt ungefragt Hütchen und Zettel mit. „Nur zur Sicherheit." Die Spannung steigt trotzdem.', 'A reserve brings cones and a slip of paper unasked. "Just to be safe." The tension rises regardless.')) },
          { w: 1, run: (c) => (team(c, 0.06), tr('Die Ansage zieht: Wer so locker ist, will offenbar nicht verlieren. Das Training wird scharf.', 'The message lands: anyone this relaxed clearly does not plan to lose. Training gets sharp.')) },
        ]),
      },
    ],
  }),

  // === Ehrenamt, Saisonmitte und -ende ==============================================================
  kassenwart_belege: local('kassenwart_belege', {
    weight: 4.5,
    needs: (c) => (phase(c) === 2 && !doneThisSeason(c, 'kassenwart_belege') ? { gap: (c.clubLife?.missing ?? 0) > 0 } : null),
    text: (c, ctx) =>
      ctx.gap
        ? tr('Der Kassenwart stellt einen Schuhkarton auf den Tisch. Darin: Quittungen, ein Bierdeckel mit „Platzmiete?" und ein Zettel, auf dem die Summen nicht ganz stimmen. In drei Wochen kommt die Prüfung des Kreises.', 'The treasurer puts a shoebox on the table. Inside: receipts, a beer mat marked "pitch rent?" and a slip whose totals do not quite add up. The district audit arrives in three weeks.')
        : tr('Der Kassenwart stellt einen Schuhkarton auf den Tisch. Darin: Quittungen, ein Bierdeckel mit „Platzmiete?" und ein Rest Kuchen. In drei Wochen kommt die Prüfung des Kreises. „Ordnung ist die halbe Prüfung", sagt er und schaut verzweifelt.', 'The treasurer puts a shoebox on the table. Inside: receipts, a beer mat marked "pitch rent?" and a piece of leftover cake. The district audit arrives in three weeks. "Order is half the audit," he says and looks desperate.'),
    options: [
      {
        label: tr('Abends gemeinsam sortieren', 'Sort it together in the evening'),
        effect: outcome([
          { w: 3, run: (c) => (adjustEnergy(c, -5), book(c, tr('Vergessene Einnahme gefunden', 'Forgotten income found'), 40), tr('Drei Stunden Belege, zwei Kannen Kaffee, und tief unten liegt ein ungebuchter Umschlag mit 40 €. Der Kassenwart weint fast.', 'Three hours of receipts, two pots of coffee, and deep down lies an unbooked envelope with €40. The treasurer nearly cries.')) },
          { w: 1.5, run: (c) => (adjustEnergy(c, -5), adjustMood(c, 0.05), tr('Ihr ordnet bis Mitternacht. Danach ist der Karton ein Ordner mit Register, und der Kassenwart trägt ihn wie einen Pokal.', 'You sort until midnight. Afterwards the box is a folder with tabs, and the treasurer carries it like a trophy.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -5), adjustMood(c, -0.03), tr('Um elf stellt sich heraus, dass drei Monate Kontoauszüge fehlen. Der Abend endet im Streit über Papier.', 'At eleven it turns out three months of bank statements are missing. The evening ends in an argument about paper.')) },
        ]),
      },
      {
        label: tr('Steuerberater-Neffen holen (40 €)', 'Call in the tax adviser\'s nephew (€40)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Steuerberater-Neffe', 'Tax adviser\'s nephew'), -40), adjustMood(c, 0.04), tr('Der Neffe studiert im sechsten Semester, ist schnell wie ein Scanner und lacht nie. Nach zwei Stunden steht alles.', 'The nephew is in his sixth semester, fast as a scanner and never laughs. After two hours it is all done.')) },
          { w: 1.5, run: (c) => (book(c, tr('Steuerberater-Neffe', 'Tax adviser\'s nephew'), -40), book(c, tr('Rückerstattung gefunden', 'Refund found'), 60), tr('Er findet eine Rückerstattung, die seit zwei Jahren niemand abgeholt hat: 60 €. Der Kassenwart will ihn adoptieren.', 'He finds a refund nobody has claimed for two years: €60. The treasurer wants to adopt him.')) },
          { w: 1, run: (c) => (book(c, tr('Steuerberater-Neffe', 'Tax adviser\'s nephew'), -40), tr('Der Neffe erklärt eine Stunde lang, was ihr alles falsch macht. Danach ist die Kasse sauber, die Stimmung aber leicht angeknackst.', 'The nephew explains for an hour everything you do wrong. Afterwards the books are clean, but the mood is slightly bruised.')) },
        ]),
      },
      {
        label: tr('Karton abgeben und hoffen', 'Hand over the box and hope'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Der Prüfer blättert, nickt, trinkt Kaffee. „So chaotisch wie jeder Verein." Er geht mit einem Stück Kuchen.', 'The auditor flicks through, nods, drinks coffee. "As chaotic as every club." He leaves with a piece of cake.')) },
          { w: 1.5, run: (c) => (book(c, tr('Kreis: Strafgebühr Buchführung', 'District: bookkeeping penalty'), -50), adjustMood(c, -0.04), tr('Der Prüfer findet den Bierdeckel mit „Platzmiete?" und verlangt 50 € für die Zettelwirtschaft.', 'The auditor finds the beer mat marked "pitch rent?" and asks €50 for the paper chaos.')) },
          { w: 1, run: (c) => (supporters(c, 1), tr('Der Prüfer ist selbst Vereinsmensch, lobt die Ehrenamtlichen und meldet sich als Fördermitglied an.', 'The auditor is a club man himself, praises the volunteers and signs up as a supporter.')) },
        ]),
      },
    ],
  }),

  platzwart_krank: local('platzwart_krank', {
    weight: 4.5,
    needs: (c) => (phase(c) === 1 && !doneThisSeason(c, 'platzwart_krank') ? {} : null),
    text: () => tr('Der Platzwart liegt mit Rücken im Bett, und der Rasen wächst. Am Wochenende ist Heimspiel, die Linien sind verblasst, und die Eckfahnen lehnen im Schuppen. Er ruft an: „Ihr schafft das schon. Der Mäher springt nur nicht an, wenn man ihn anbrüllt."', 'The groundsman is in bed with a bad back, and the grass keeps growing. There is a home game at the weekend, the lines have faded, and the corner flags are leaning in the shed. He rings: "You will manage. The mower only fails to start if you shout at it."'),
    options: [
      {
        label: tr('Selbst mähen und Linien ziehen', 'Mow and mark the lines yourself'),
        effect: outcome([
          { w: 3, run: (c) => (adjustEnergy(c, -6), adjustMood(c, 0.06), tr('Zwei Stunden Mähen, eine Stunde Linien. Der Platz sieht aus, als hätte ihn ein Schachspieler gezeichnet. Der Platzwart schickt vom Bett ein Daumen-hoch.', 'Two hours of mowing, one of marking. The pitch looks as though a chess player drew it. The groundsman sends a thumbs-up from bed.')) },
          { w: 1.5, run: (c) => (adjustEnergy(c, -6), neighbors(c, -1), tr('Du mähst um 7 Uhr früh. Die Nachbarn öffnen ihre Fenster und schließen sie wieder, laut.', 'You mow at 7 in the morning. The neighbours open their windows and close them again, loudly.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -6), adjustMood(c, -0.03), tr('Die Linien laufen schief. Das Spielfeld ist an einer Ecke vier Meter breiter, und der Gegner stellt es fest.', 'The lines run crooked. The pitch is four metres wider in one corner, and the opposition notice.')) },
        ]),
      },
      {
        label: tr('Zwei Spieler als Aushilfs-Platzwarte', 'Two players as stand-in groundskeepers'),
        effect: outcome([
          { w: 2.5, run: (c, ctx, rng) => { for (const s of some(c, rng, 2)) { adjustFitness(c, s, -0.07); adjustForm(c, s, 0.1); } adjustMood(c, 0.04); return tr('Zwei Freiwillige schieben den Mäher und sind danach bereit für alles. Die Kabine feiert sie als „Greenkeeper des Monats".', 'Two volunteers push the mower and are ready for anything afterwards. The dressing room hails them as "greenkeepers of the month".'); } },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) hurt(c, s); return tr('Einer rutscht auf dem nassen Gras aus und verstaucht sich die Hand am Mäher. Gute Besserung.', 'One slips on the wet grass and sprains his hand on the mower. Get well soon.'); } },
          { w: 1, run: (c, ctx, rng) => { for (const s of some(c, rng, 2)) adjustForm(c, s, -0.2); return tr('Die beiden mähen kreuz und quer, bis aus dem Rasen ein Muster wird. Beim Abendtraining finden sie ihre Beine nicht mehr.', 'The two mow criss-cross until the grass forms a pattern. At evening training they cannot find their legs any more.'); } },
        ]),
      },
      {
        label: tr('Lohnmäher beauftragen (50 €)', 'Hire a contractor (€50)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Lohnmäher', 'Contract mower'), -50), adjustMood(c, 0.03), tr('Der Lohnunternehmer kommt mit Traktor und Gerät, in vierzig Minuten fertig. Der Rasen ist perfekt, der Platzwart eingeschnappt.', 'The contractor arrives with a tractor and kit, done in forty minutes. The grass is perfect, the groundsman a bit sulky.')) },
          { w: 1, run: (c) => (book(c, tr('Lohnmäher', 'Contract mower'), -50), book(c, tr('Lohnmäher: Maulwurfhügel', 'Contract mower: molehills'), -20), tr('Der Traktor findet drei Maulwurfhügel und eine vergrabene Spielzeugkiste. Die Kiste ist kostenlos, die Reparatur 20 € teuer.', 'The tractor finds three molehills and a buried toy box. The box is free, the repair costs €20.')) },
          { w: 1, run: (c) => (book(c, tr('Lohnmäher', 'Contract mower'), -50), supporters(c, 1), tr('Der Lohnunternehmer ist Fan, sieht sich das Spiel an und wird Fördermitglied. „Platz gemäht, Verein gemocht."', 'The contractor is a fan, watches the game and becomes a supporter. "Pitch mown, club liked."')) },
        ]),
      },
    ],
  }),

  jugendleiter_ueberlastet: local('jugendleiter_ueberlastet', {
    weight: 4.5,
    needs: (c) => (phase(c) === 1 && c.round <= rounds(c) - 4 && !doneThisSeason(c, 'jugendleiter_ueberlastet') ? {} : null),
    text: () => tr('Jugendleiter Torsten sieht grau aus. Acht Mannschaften, ein Kleinbus, achtzig Kinder, zwölf Elternchats. „Wenn mir noch einer schreibt, wo die Torwarthandschuhe sind, schmeiße ich hin." Er lacht, aber nicht richtig.', 'Youth leader Torsten looks grey. Eight teams, one minibus, eighty children, twelve parents\' chats. "If one more person messages me about the keeper gloves, I quit." He laughs, but not properly.'),
    options: [
      {
        label: tr('Eltern einspannen – Aushang und Helferliste', 'Rope in the parents – notice and helpers\' list'),
        effect: (c, ctx, rng) => outcome([
          { w: 3, run: () => (startChain(c, 'jugendleiter_bilanz', 2, { tone: 1 }), supporters(c, 1), tr('Sieben Eltern tragen sich ein, eine Mutter übernimmt die Handschuhe. Torsten schläft zum ersten Mal seit Wochen durch.', 'Seven parents sign up, one mother takes over the gloves. Torsten sleeps through for the first time in weeks.')) },
          { w: 1.5, run: () => (startChain(c, 'jugendleiter_bilanz', 2, { tone: 0 }), tr('Alle versprechen etwas, niemand kommt. Die Liste hängt am Vereinsheim und wächst nur durch Edding-Herzchen.', 'Everyone promises something, nobody comes. The list hangs at the clubhouse and only grows through felt-tip hearts.')) },
          { w: 1, run: () => (startChain(c, 'jugendleiter_bilanz', 2, { tone: -1 }), adjustMood(c, -0.03), tr('Ein Vater übernimmt die Kasse und korrigiert gleich den Spielplan. Torsten und er reden nur noch per Chat.', 'One father takes over the till and promptly corrects the fixture list. Torsten and he now only talk by message.')) },
        ])(c, ctx, rng),
      },
      {
        label: tr('Selbst anpacken – du fährst den Kleinbus', 'Muck in yourself – you drive the minibus'),
        effect: (c, ctx, rng) => outcome([
          { w: 3, run: () => (adjustEnergy(c, -6), startChain(c, 'jugendleiter_bilanz', 2, { tone: 1 }), adjustMood(c, 0.04), tr('Samstag fährst du die D-Jugend zum Turnier. Zwölf Kinder, ein Lied, 140 Kilometer. Torsten umarmt dich am Parkplatz.', 'On Saturday you drive the under-12s to a tournament. Twelve children, one song, 140 kilometres. Torsten hugs you in the car park.')) },
          { w: 1.5, run: () => (adjustEnergy(c, -6), startChain(c, 'jugendleiter_bilanz', 2, { tone: 0 }), tr('Du verfährst dich zweimal. Die Kinder verlangen anschließend einen Navi-Schein.', 'You get lost twice. The children afterwards demand a satnav licence.')) },
          { w: 1, run: () => (adjustEnergy(c, -6), startChain(c, 'jugendleiter_bilanz', 2, { tone: -1 }), adjustMood(c, -0.03), tr('Der Kleinbus bleibt auf der Autobahn liegen. Die Mannschaft sitzt zwei Stunden am Seitenstreifen, bis der Abschleppdienst kommt.', 'The minibus breaks down on the motorway. The team sits on the hard shoulder for two hours until the recovery truck arrives.')) },
        ])(c, ctx, rng),
      },
      {
        label: tr('Aufwandsentschädigung erhöhen (40 €)', 'Raise the expenses allowance (€40)'),
        effect: (c, ctx, rng) => outcome([
          { w: 2, run: () => (book(c, tr('Jugendleiter: Aufwandsentschädigung', 'Youth leader: expenses'), -40), startChain(c, 'jugendleiter_bilanz', 2, { tone: 1 }), adjustMood(c, 0.04), tr('Torsten kauft vom Geld eine Thermoskanne für den Kleinbus. „Endlich erkennt mich jemand an."', 'Torsten buys a thermos flask for the minibus with the money. "Finally someone appreciates me."')) },
          { w: 1.5, run: () => (book(c, tr('Jugendleiter: Aufwandsentschädigung', 'Youth leader: expenses'), -40), startChain(c, 'jugendleiter_bilanz', 2, { tone: 0 }), tr('Er nimmt das Geld, sagt danke und kommt dann trotzdem Montag nicht. „Das Geld ändert nichts an den Elternchats."', 'He takes the money, says thanks, and still does not turn up on Monday. "Money does not change the parents\' chats."')) },
          { w: 1, run: () => (book(c, tr('Jugendleiter: Aufwandsentschädigung', 'Youth leader: expenses'), -40), startChain(c, 'jugendleiter_bilanz', 2, { tone: -1 }), neighbors(c, -1), tr('Die anderen Ehrenamtlichen hören davon und stehen mit offenen Händen vor der Tür. Der Platzwart schweigt demonstrativ.', 'The other volunteers hear about it and stand at the door with open hands. The groundsman is pointedly silent.')) },
        ])(c, ctx, rng),
      },
    ],
  }),

  jugendleiter_bilanz: followUp('jugendleiter_bilanz', {
    needs: (c) => {
      const l = dueLink(c, 'jugendleiter_bilanz');
      return l ? { tone: l.tone } : null;
    },
    text: (c, ctx) =>
      ctx.tone > 0
        ? tr('Torsten steht strahlend vor dir: Die Helferliste trägt, der Kleinbus läuft, und die F-Jugend hat gestern ihr erstes Tor gefeiert wie einen Weltmeistertitel. „Ich mache weiter. Aber ich brauche ein Dankeschön, das man essen kann."', 'Torsten stands in front of you beaming: the helpers\' list works, the minibus runs, and the under-8s celebrated their first goal yesterday like a world title. "I am staying on. But I need a thank-you you can eat."')
        : ctx.tone < 0
          ? tr('Torsten steht mit Kündigungsbrief vor dir. Handschriftlich, zwei Seiten. „Ich liebe die Kinder, aber nicht den Rest." Hinter ihm lungert der Wirt, der den Brief schon gelesen hat.', 'Torsten stands in front of you with a resignation letter. Handwritten, two pages. "I love the kids, but not the rest." Behind him the landlord lingers, having already read the letter.')
          : tr('Torsten ist müde, aber da. Nichts hat sich geändert, nur sein Kaffeekonsum. „Eine Sache noch", sagt er und zieht eine Liste hervor. „Ich bräuchte Hilfe, sonst wird das nichts bis zum Sommer."', 'Torsten is tired, but there. Nothing has changed except his coffee intake. "One more thing," he says, pulling out a list. "I need help, or it will not work out by summer."'),
    options: [
      {
        label: tr('Kuchen und Blumen aus der Vereinskasse (20 €)', 'Cake and flowers from the club kitty (€20)'),
        effect: outcome([
          { w: (c, ctx) => (ctx.tone > 0 ? 3 : 1.5), run: (c) => (book(c, tr('Dank für den Jugendleiter', 'Thanks for the youth leader'), -20), adjustMood(c, 0.08), tr('Torsten bekommt einen Marmorkuchen so groß wie ein Fußball. Die Kinder singen. Er weint in die Sahne.', 'Torsten gets a marble cake as big as a football. The kids sing. He cries into the cream.')) },
          { w: 1, run: (c) => (book(c, tr('Dank für den Jugendleiter', 'Thanks for the youth leader'), -20), supporters(c, 1), tr('Eine Mutter fotografiert die Szene, stellt sie ins Netz und tritt als Fördermitglied ein.', 'A mother photographs the scene, posts it online and joins as a supporter.')) },
          { w: (c, ctx) => (ctx.tone < 0 ? 2 : 0.4), run: (c) => (book(c, tr('Dank für den Jugendleiter', 'Thanks for the youth leader'), -20), adjustMood(c, -0.02), tr('Zu spät: Er nimmt den Kuchen, isst ihn mit zwei Kindern, bleibt aber bei seiner Kündigung.', 'Too late: he takes the cake, eats it with two kids, but keeps his resignation.')) },
        ]),
      },
      {
        label: tr('Zeit lassen – nächste Saison reden wir', 'Give him time – we talk next season'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.02), tr('Torsten nickt, faltet den Brief und steckt ihn ein. „Dann schauen wir im Sommer." Er lächelt, wieder fast richtig.', 'Torsten nods, folds the letter and pockets it. "Let us see in summer, then." He smiles, almost properly again.')) },
          { w: (c, ctx) => (ctx.tone < 0 ? 2 : 0.8), run: (c) => (adjustMood(c, -0.05), tr('Die Jugend merkt, dass etwas nicht stimmt. Zwei Eltern fragen nach, drei Kinder bleiben dem Training fern.', 'The youth sense that something is wrong. Two parents ask, three kids miss training.')) },
          { w: 1, run: (c) => (supporters(c, 1), tr('Ein Elternpaar übernimmt kurzerhand die Fahrdienste. „Sagt Bescheid, wenn ihr was braucht."', 'A pair of parents promptly takes over the lifts. "Let us know if you need anything."')) },
        ]),
      },
      {
        label: tr('Aufgaben verteilen – drei Gruppenleiter ernennen', 'Delegate – appoint three group leaders'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) adjustForm(c, s, 0.2); adjustMood(c, 0.05); return tr('Drei Gruppenleiter, drei Zettel, kein Chaos mehr. Ein Spieler aus dem Kader übernimmt eine Gruppe und blüht auf.', 'Three group leaders, three slips, no chaos any more. A player from the squad takes over a group and blossoms.'); } },
          { w: 1.5, run: (c) => (adjustMood(c, -0.03), tr('Die Gruppenleiter streiten, wer welche Kinder bekommt. Am Ende hat Torsten wieder alles.', 'The group leaders argue over who gets which kids. In the end Torsten has everything again.')) },
          { w: 1, run: (c) => (supporters(c, 2), tr('Die Aufgabenverteilung macht Schule. Zwei Mütter bringen unaufgefordert Kuchen und ihre Männer.', 'The new division of labour catches on. Two mothers bring cake and their husbands, unasked.')) },
        ]),
      },
    ],
  }),

  helfer_abschluss: local('helfer_abschluss', {
    weight: 4.5,
    needs: (c) => (phase(c) === 2 && !doneThisSeason(c, 'helfer_abschluss') ? {} : null),
    text: () => tr('Zum Saisonabschluss soll es ein großes Fest geben: Grill, Hüpfburg, Tombola. Nur Helfer fehlen. Auf der Liste stehen vier Namen, einer davon ist der Wirt, einer der Hund des Wirts.', 'A big party is planned for the end of the season: barbecue, bouncy castle, raffle. Only helpers are missing. The list has four names, one of them the landlord, one the landlord\'s dog.'),
    options: [
      {
        label: tr('Spieler packen mit an – Aufbau am Freitag', 'Players pitch in – set-up on Friday'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.08), team(c, -0.05), tr('Zwanzig Männer schleppen Bänke, bauen Zelte auf, streiten über den Grill. Abends sitzt man zusammen, dreckig und stolz.', 'Twenty men carry benches, put up tents, argue about the barbecue. By evening everyone sits together, dirty and proud.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) hurt(c, s); return tr(`${s != null ? first(c, s) : 'Einer'} hebt eine Biertisch-Garnitur falsch an. Rücken. Das Fest läuft ohne ihn weiter.`, `${s != null ? first(c, s) : 'Someone'} lifts a beer-table set the wrong way. Back trouble. The party goes on without him.`); } },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) { sitOut(c, s, 'late'); return lateOr(c, tr(`${first(c, s)} baut bis zum frühen Morgen auf und kommt am Sonntag erst zur zweiten Halbzeit.`, `${first(c, s)} builds until the early hours and only arrives for the second half on Sunday.`), tr(`${first(c, s)} baut bis zum frühen Morgen auf. Der Spielbericht ist am Sonntag zu: Er fehlt.`, `${first(c, s)} builds until the early hours. The match report is closed on Sunday: he is missing.`)); } return tr('Alle sind pünktlich.', 'Everyone is on time.'); } },
        ]),
      },
      {
        label: tr('Eltern und Jugend fragen – Kuchen gegen Hüpfburg', 'Ask parents and youth – cake in exchange for a bouncy castle'),
        effect: outcome([
          { w: 3, run: (c) => (supporters(c, 1), adjustMood(c, 0.05), tr('Zehn Kuchen, zwölf Helfer und ein Vater, der die Hüpfburg alleine aufbläst. Der Verein ist ein Dorf.', 'Ten cakes, twelve helpers and a father who inflates the bouncy castle alone. The club is a village.')) },
          { w: 1.5, run: (c) => (book(c, tr('Hüpfburg: Reparatur', 'Bouncy castle: repair'), -25), tr('Die Hüpfburg bekommt ein Loch. Sie landet kurz auf dem Vereinsheim-Dach. Das Flicken kostet 25 €.', 'The bouncy castle gets a hole. It briefly lands on the clubhouse roof. Patching costs €25.')) },
          { w: 1, run: (c) => (book(c, tr('Kuchenverkauf', 'Cake sale'), 45), tr('Der Kuchen verkauft sich so gut, dass die Kasse 45 € mehr hat als geplant. Die Muffins gehen weg wie nichts.', 'The cake sells so well that the till has €45 more than planned. The muffins vanish like nothing.')) },
        ]),
      },
      {
        label: tr('Catering bestellen (90 €)', 'Order catering (€90)'),
        effect: outcome([
          { w: 2.5, run: (c) => (book(c, tr('Catering Saisonabschluss', 'Season-end catering'), -90), adjustMood(c, 0.06), tr('Der Caterer liefert Würstchen, Salate und eine Soße, die niemand identifizieren kann. Alle sind satt, niemand müde.', 'The caterer delivers sausages, salads and a sauce nobody can identify. Everyone is full, nobody tired.')) },
          { w: 1.5, run: (c) => (book(c, tr('Catering Saisonabschluss', 'Season-end catering'), -90), supporters(c, 1), tr('Ein Gast fragt, wer das alles bezahlt. Der Wirt sagt: „Der Verein." Er tritt auf der Stelle ein.', 'A guest asks who is paying for all this. The landlord says: "The club." He joins on the spot.')) },
          { w: 1, run: (c) => (book(c, tr('Catering Saisonabschluss', 'Season-end catering'), -90), adjustMood(c, -0.03), tr('Die Lieferung kommt zwei Stunden zu spät. Das Fest beginnt mit Chips und endet mit Nudeln.', 'The delivery arrives two hours late. The party starts with crisps and ends with pasta.')) },
        ]),
      },
    ],
  }),

  // === Schiri, unterste Liga (Stufe 1: Freizeitliga, kein Schiri auf dem Platz) ====================
  selbst_pfeifen: local('selbst_pfeifen', {
    weight: 4,
    needs: (c, rng) => {
      if (level(c) !== 1 || c.round < 1 || doneThisSeason(c, 'selbst_pfeifen')) return null;
      const club = opponentName(c);
      const s = pickReady(c, rng);
      return club && s != null ? { club, s } : null;
    },
    text: (c, ctx) => tr(`Gegen ${ctx.club} gibt es wie immer in der Freizeitliga keinen Schiri. Der gegnerische Kapitän ruft an: „Wer pfeift diesmal? Beim letzten Mal haben wir uns zehn Minuten wegen einer Rückgabe angeschrien."`, `Against ${ctx.club} there is, as always in the casual league, no referee. The opposing captain rings: "Who whistles this time? Last time we shouted at each other for ten minutes over a back-pass."`),
    options: [
      {
        label: tr('Einer von uns pfeift (er spielt nicht mit)', 'One of ours whistles (he does not play)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.03), tr(`${first(c, ctx.s)} pfeift in der Wechselkleidung, mit der Trillerpfeife aus dem Kindergarten. Beide Seiten sind überrascht, wie fair es zugeht.`, `${first(c, ctx.s)} whistles in a spare kit, with a toy whistle from the nursery. Both sides are surprised at how fair it is.`)) },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, -0.04), (c.players[ctx.s].grumpy = 1), tr(`Nach dem Spiel wird ${first(c, ctx.s)} von beiden Seiten angeblafft: „Das war nie Abseits!" Er schwört, nie wieder zu pfeifen.`, `After the game ${first(c, ctx.s)} is shouted at by both sides: "That was never offside!" He swears never to whistle again.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustForm(c, ctx.s, 0.3), tr(`${first(c, ctx.s)} liest das Spiel vom Rand aus so gut, dass er am Montag verkündet, nächstes Mal selbst Regeln büffeln zu wollen.`, `${first(c, ctx.s)} reads the game so well from the side that on Monday he announces he wants to study the rules next time.`)) },
        ]),
      },
      {
        label: tr('Jeder pfeift seine eigene Hälfte', 'Each side whistles its own half'),
        effect: outcome([
          { w: 2.5, run: (c) => (adjustMood(c, 0.04), tr('Es läuft erstaunlich zivil. Jeder gibt in seiner Hälfte zu, was er verbockt hat. Am Ende ist es fast zu nett.', 'It goes remarkably civilly. Everyone admits in his own half what he messed up. In the end it is almost too nice.')) },
          { w: 1.5, run: (c, ctx) => (adjustMood(c, -0.05), adjustForm(c, ctx.s, -0.2), tr('Streit um Abseits an der Mittellinie: Beide Hälften pfeifen zugleich, der Ball bleibt zehn Minuten ungespielt.', 'Argument about offside on the halfway line: both sides whistle at the same time, the ball goes unplayed for ten minutes.')) },
          { w: 1, run: (c, ctx, rng) => { const [a, b] = some(c, rng, 2); if (b != null) setRelation(c, a, b, 'rivalen'); return tr('Zwei von euch reklamieren immer lauter. Beim Auslaufen sagen sie sich Dinge, die man am Abend nicht mehr zurücknimmt.', 'Two of you protest ever louder. While warming down they say things that cannot be taken back by evening.'); } },
        ]),
      },
      {
        label: tr('Münzwurf bei jedem Streit', 'Coin toss for every dispute'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.05), tr('Zweiundzwanzig Münzwürfe, kein Streit länger als zehn Sekunden. Der Gegner nimmt die Idee mit.', 'Twenty-two coin tosses, no argument longer than ten seconds. The opposition take the idea home with them.')) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), tr(`${first(c, ctx.s)} gewinnt alle sechs Münzwürfe und erzielt sein erstes Tor per Abseitsentscheidung. „Das war ein gutes Los."`, `${first(c, ctx.s)} wins all six coin tosses and scores his first goal thanks to an offside call. "That was a good draw."`)) },
          { w: 1, run: (c) => (book(c, tr('Münze verloren', 'Coin lost'), -2), adjustMood(c, -0.02), tr('Die Münze rollt in den Gulli. Das Spiel geht danach mit einem Bierdeckel weiter. Sein Kopf ist Kopf, seine Zahl ist Zahl.', 'The coin rolls down the drain. The game continues with a beer mat. Its head is heads, its tail is tails.')) },
        ]),
      },
    ],
  }),

  dorf_schiri: local('dorf_schiri', {
    weight: 4.5,
    needs: (c) => (level(c) === 1 && phase(c) === 1 && !doneThisSeason(c, 'dorf_schiri') ? {} : null),
    text: () => tr('Herr Brandt (71), früher Schiri in der Kreisliga, steht am Zaun, mit Mantel, Mütze und einer Pfeife an der Schnur. „Ihr habt in der Freizeitliga keinen Unparteiischen. Ich kann das umsonst machen. Ich habe nur Hunger auf eine Wurst und Ruhe vor meiner Frau."', 'Mr Brandt (71), once a district-league referee, stands at the fence in coat, cap and a whistle on a string. "You have no official in the casual league. I can do it for nothing. I only hunger for a sausage and some peace from my wife."'),
    options: [
      {
        label: tr('Gern – Fahrtkosten 10 € und Wurst frei', 'Gladly – €10 travel and a free sausage'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Schiri aus dem Dorf: Fahrtkosten', 'Village referee: travel'), -10), adjustMood(c, 0.07), team(c, 0.06), tr('Zum ersten Mal pfeift jemand, der die Regeln kennt. Beide Seiten spielen ruhiger, nur der Torwart meckert.', 'For the first time someone whistles who knows the rules. Both sides play more calmly, only the keeper complains.')) },
          { w: 1.5, run: (c) => (book(c, tr('Schiri aus dem Dorf: Fahrtkosten', 'Village referee: travel'), -10), supporters(c, 1), tr('Herr Brandt pfeift mit Herz, erzählt in der Halbzeit alte Geschichten und wird sofort Fördermitglied.', 'Mr Brandt whistles with heart, tells old stories at half-time and immediately becomes a supporter.')) },
          { w: 1, run: (c, ctx, rng) => { book(c, tr('Schiri aus dem Dorf: Fahrtkosten', 'Village referee: travel'), -10); const [s] = some(c, rng, 1); if (s != null) { c.players[s].grumpy = 1; adjustForm(c, s, -0.2); } return tr('Er gibt dem Stürmer wegen Meckerns Gelb. Der Stürmer: „Das gibt es hier gar nicht." Brandt: „Jetzt schon."', 'He shows the striker a yellow for dissent. The striker: "That does not exist here." Brandt: "It does now."'); } },
        ]),
      },
      {
        label: tr('Danke, wir regeln das selbst', 'Thanks, we handle it ourselves'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.02), tr('Brandt nickt, zieht die Mütze und bleibt trotzdem als Zuschauer am Zaun. Sein Gesicht beim ersten Abseits kostet mehr als jedes Eintrittsgeld.', 'Brandt nods, tips his cap and stays on as a spectator at the fence. His face at the first offside is worth more than any entry fee.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.03), neighbors(c, -1), tr('Er geht beleidigt. Im Dorf hört man bald: „Die da oben brauchen keinen Schiri, die wissen alles."', 'He leaves offended. Soon the village hears: "Those lot up there do not need a referee, they know it all."')) },
          { w: 1, run: (c) => (supporters(c, 1), tr('Er fühlt sich trotzdem eingeladen, kommt jeden Sonntag und verteilt Hinweise aus dem Zuschauerraum. Fördermitglied wird er auch.', 'He feels invited anyway, comes every Sunday and hands out tips from the stands. He becomes a supporter too.')) },
        ]),
      },
      {
        label: tr('Nur zu Spitzenspielen und Derbys', 'Only for top games and derbies'),
        effect: outcome([
          { w: 2.5, run: (c) => (adjustMood(c, 0.04), tr('Der Kompromiss gefällt allen. Brandt erscheint nur, wenn es um etwas geht, und erwähnt es jedes Mal ausführlich.', 'The compromise pleases everyone. Brandt only shows up when something is at stake, and mentions it at length every time.')) },
          { w: 1.5, run: (c) => (book(c, tr('Schiri aus dem Dorf: Fahrtkosten', 'Village referee: travel'), -10), team(c, 0.05), tr('Bei seinem ersten Einsatz pfeift er konsequent und liefert dem Gegner einen Platzverweis wegen Beleidigung. Die Gäste schlucken.', 'On his first outing he whistles consistently and sends off an opposition player for abuse. The visitors swallow hard.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Der Gegner will keinen Schiri aus dem Dorf des Heimvereins. „Kennen wir doch, der pfeift für euch." Das Spiel wird zäh.', 'The opposition do not want a referee from the home club\'s village. "We know how it goes, he whistles for you." The game gets sticky.')) },
        ]),
      },
    ],
  }),

  kreis_schiri: local('kreis_schiri', {
    weight: 4.5,
    needs: (c) => {
      if (level(c) !== 1 || phase(c) < 1 || doneThisSeason(c, 'kreis_schiri')) return null;
      const club = opponentName(c);
      if (!club || myPos(c) > 3) return null;
      return { club };
    },
    text: (c, ctx) => tr(`Der Kreis schickt erstmals einen echten Schiedsrichter zum Spitzenspiel gegen ${ctx.club}. „Wegen der Tabellenlage", heißt es in der Mail. Er hat Schwarz an, eine Gelbe Karte in der Brusttasche und einen Wochenendplan, der seine Spielleitungen schätzt.`, `The district is sending a proper referee for the first time to the top game against ${ctx.club}. "Because of the table," says the e-mail. He wears black, has a yellow card in his breast pocket and a weekend plan that values his officiating.`),
    options: [
      {
        label: tr('Empfang mit Kaffee und Kuchen (15 €)', 'Reception with coffee and cake (€15)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Kaffee für den Schiri', 'Coffee for the referee'), -15), adjustMood(c, 0.06), tr('Der Schiri erzählt in der Kabine zwei Regelkunde-Anekdoten und pfeift später genauso freundlich wie streng. Der Gegner meckert über den Kuchen.', 'The referee tells two rules anecdotes in the dressing room and later whistles as kindly as he is strict. The opposition complain about the cake.')) },
          { w: 1.5, run: (c) => (book(c, tr('Kaffee für den Schiri', 'Coffee for the referee'), -15), supporters(c, 1), tr('Der Schiri fragt, wo er sich einschreiben kann. Er wird Fördermitglied, pfeift aber weiter neutral.', 'The referee asks where he can sign up. He becomes a supporter, but carries on whistling neutrally.')) },
          { w: 1, run: (c) => (book(c, tr('Kaffee für den Schiri', 'Coffee for the referee'), -15), adjustMood(c, -0.04), tr('Der Gegner wittert Bestechung. Der Kapitän ruft den Kreis an, und der Schiri nimmt seinen Kaffee nur noch aus dem Automaten.', 'The opposition smell a bribe. The captain rings the district, and the referee now only drinks coffee from the vending machine.')) },
        ]),
      },
      {
        label: tr('Regelkunde-Abend für die Mannschaft', 'Rules evening for the squad'),
        effect: outcome([
          { w: 2.5, run: (c) => (team(c, 0.1), tr('Zwei Stunden Abseits, Rückpass und Handspiel mit Bierdeckeln. Wer danach noch den Ball in die Hand nimmt, tut es mit Absicht.', 'Two hours of offside, back-pass and handball with beer mats. Anyone who still picks the ball up afterwards does it on purpose.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [a, b] = some(c, rng, 2); if (b != null) setRelation(c, a, b, 'kumpel'); adjustMood(c, 0.04); return tr('Beim Rollenspiel „Schiri und Stürmer" lachen zwei so laut, dass sie danach nur noch zusammen herumstehen.', 'In the role play "referee and striker" two laugh so loudly that from then on they stand around together.'); } },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Die Hälfte kommt nicht, die andere Hälfte kennt die Regeln schon. Der Abend endet im Streit, ob eine Wiederholung zählt.', 'Half do not come, the other half already know the rules. The evening ends in a row over whether a replay counts.')) },
        ]),
      },
      {
        label: tr('Beschweren – wir pfeifen immer selbst', 'Complain – we always whistle ourselves'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.02), tr('Der Kreis antwortet höflich und unverändert. Der Schiri kommt trotzdem, mit einem Lächeln.', 'The district replies politely and unchanged. The referee comes anyway, with a smile.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.05), neighbors(c, -1), tr('Die Beschwerde macht die Runde. Im Dorf heißt es: „Die haben Angst vor einer Gelben Karte."', 'The complaint does the rounds. In the village they say: "They are scared of a yellow card."')) },
          { w: 1, run: (c) => (book(c, tr('Kreis: Bearbeitungsgebühr', 'District: processing fee'), -20), tr('Die Beschwerde kostet 20 € Bearbeitungsgebühr. „Wer sich beschwert, zahlt."', 'The complaint costs a €20 processing fee. "Whoever complains, pays."')) },
        ]),
      },
    ],
  }),

  // === Saisonziel: Anfang und Mitte ================================================================
  ziel_nachverhandeln: local('ziel_nachverhandeln', {
    weight: 8,
    needs: (c) => (phase(c) === 0 && c.round >= 1 && goalLive(c) && !c.goal.mid && !doneThisSeason(c, 'ziel_nachverhandeln') ? { type: c.goal.type } : null),
    text: (c, ctx) => tr(`Vorstand Erwin hat das Saisonziel „${GOALS[ctx.type].name}" ausgegeben und fragt jetzt am Vereinsheim nach, wie ihr es seht. „Ich bin offen. Nicht unbedingt für Änderungen, aber offen."`, `Chairman Erwin has set the season target "${GOALS[ctx.type].name}" and now asks at the clubhouse how you see it. "I am open. Not necessarily to changes, but open."`),
    options: [
      {
        label: tr('Mehr wagen: Ziel eine Stufe höher', 'Dare more: target one step higher'),
        effect: outcome([
          { w: 3, if: (c) => goalType(c) !== 'aufstieg', run: (c) => (shiftGoal(c, 1), adjustMood(c, 0.06), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Erwin klopft dir auf die Schulter. „Dann sind wir uns einig. Ich schreibe es auf einen Bierdeckel."`, `New target: ${GOALS[c.goal.type].name}. Erwin pats you on the shoulder. "Then we agree. I will write it on a beer mat."`)) },
          { w: 1.5, if: (c) => goalType(c) !== 'aufstieg', run: (c) => (shiftGoal(c, 1), team(c, 0.08), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Die Mannschaft liest es am Schwarzen Brett und steht am nächsten Training eine halbe Stunde früher da.`, `New target: ${GOALS[c.goal.type].name}. The squad read it on the notice board and arrive half an hour early at the next training.`)) },
          { w: 1, if: (c) => goalType(c) !== 'aufstieg', run: (c) => (shiftGoal(c, 1), adjustMood(c, -0.04), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Ein Verteidiger murmelt: „Wer hat das beschlossen?" Erwin: „Der, der morgen früh aufsteht."`, `New target: ${GOALS[c.goal.type].name}. A defender mumbles: "Who decided that?" Erwin: "The one who gets up early tomorrow."`)) },
          { w: 1, if: (c) => goalType(c) === 'aufstieg', run: (c) => (adjustMood(c, 0.03), tr('Höher als der Aufstieg geht es nicht. Erwin schmunzelt: „Meisterschaft ohne Aufstieg gibt es leider nicht."', 'There is nothing higher than promotion. Erwin smiles: "A championship without promotion, sadly, does not exist."')) },
        ]),
      },
      {
        label: tr('Tiefer stapeln: Ziel eine Stufe tiefer', 'Lower the bar: target one step lower'),
        effect: outcome([
          { w: 3, if: (c) => goalType(c) !== 'erhalt', run: (c) => (shiftGoal(c, -1), adjustMood(c, 0.03), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Die Mannschaft atmet auf. Erwin seufzt, notiert es aber.`, `New target: ${GOALS[c.goal.type].name}. The squad breathe out. Erwin sighs, but writes it down.`)) },
          { w: 1.5, if: (c) => goalType(c) !== 'erhalt', run: (c) => (shiftGoal(c, -1), adjustMood(c, -0.04), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Der Vorstand fragt, ob du dir den Kader überhaupt angesehen hast.`, `New target: ${GOALS[c.goal.type].name}. The board asks whether you have actually looked at the squad.`)) },
          { w: 1, if: (c) => goalType(c) !== 'erhalt', run: (c) => (shiftGoal(c, -1), book(c, tr('Vorstand: Verständnis-Spende', 'Board: donation of understanding'), 25), tr(`Neues Ziel: ${GOALS[c.goal.type].name}. Erwin zeigt Verständnis und spendet 25 € für Bälle: „Dann bitte aber auch wirklich einhalten."`, `New target: ${GOALS[c.goal.type].name}. Erwin shows understanding and donates €25 for balls: "But then please really stick to it."`)) },
          { w: 1, if: (c) => goalType(c) === 'erhalt', run: (c) => (adjustMood(c, -0.02), tr('Tiefer geht es nicht. Erwin schaut dich an, als hättest du die Saison gerade abgesagt.', 'There is nothing lower. Erwin looks at you as though you had just cancelled the season.')) },
        ]),
      },
      {
        label: tr('Beim Ziel bleiben', 'Stay with the target'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Handschlag, Bier, kein Wort mehr dazu. So mag der Vorstand es.', 'Handshake, beer, no further word. The board likes it like that.')) },
          { w: 1.5, run: (c) => (team(c, 0.05), tr('Du bestätigst das Ziel vor der Mannschaft. Es klingt nach Plan, und die Truppe nimmt es an.', 'You confirm the target in front of the squad. It sounds like a plan, and the lads take it on.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Erwin kommt trotzdem jede Woche mit einer Rechnung vorbei, wie viel Punkte noch fehlen. Er hat eine Excel-Tabelle.', 'Erwin turns up every week anyway with a sum of how many points are still missing. He has a spreadsheet.')) },
        ]),
      },
    ],
  }),

  ziel_zwischenbilanz: local('ziel_zwischenbilanz', {
    weight: 7,
    needs: (c) => {
      if (phase(c) !== 1 || !goalLive(c) || doneThisSeason(c, 'ziel_zwischenbilanz')) return null;
      const pos = myPos(c);
      const target = c.goal.target;
      return { pos, state: pos <= target - 2 ? 'vorn' : pos <= target ? 'plan' : 'hinten' };
    },
    text: (c, ctx) =>
      ctx.state === 'vorn'
        ? tr(`Platz ${ctx.pos}, das Saisonziel längst im Blick: Erwin hat die Zahlen bei der Zwischenbilanz dreimal nachgerechnet. „Das ist besser, als ich dachte. Müssen wir das Ziel anheben?"`, `Place ${ctx.pos}, the season target already in sight: Erwin checked the half-term figures three times. "That is better than I thought. Should we raise the target?"`)
        : ctx.state === 'plan'
          ? tr(`Platz ${ctx.pos}, genau im Plan. Erwin ist zufrieden, aber unruhig: „Nichts ändern, nichts wagen. Das hält uns auf Platz ${ctx.pos}."`, `Place ${ctx.pos}, right on plan. Erwin is satisfied, but restless: "Change nothing, risk nothing. That keeps us in place ${ctx.pos}."`)
          : tr(`Platz ${ctx.pos}, das Saisonziel rückt weg. Erwin hat die Zwischenbilanz laminiert und an die Kabinentür gehängt. „Damit jeder sie sieht."`, `Place ${ctx.pos}, the season target is slipping away. Erwin has laminated the half-term figures and hung them on the dressing-room door. "So that everyone sees them."`),
    options: [
      {
        label: tr('Kabinenansprache', 'Dressing-room speech'),
        effect: outcome([
          { w: (c, ctx) => (ctx.state === 'hinten' ? 3 : 2), run: (c) => (team(c, 0.1), tr('Du sprichst fünf Minuten, ohne Zettel. Danach schlägt keiner mehr die Tür zu, und der Torwart klatscht als Erster.', 'You speak for five minutes without notes. Afterwards nobody slams the door, and the keeper is first to clap.')) },
          { w: 1.5, run: (c) => (adjustMood(c, 0.05), tr('Die Ansprache dauert zu lang, aber der Schlusssatz sitzt. „Das hängen wir uns an die Wand."', 'The speech goes on too long, but the last sentence lands. "We will put that on the wall."')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); if (s != null) c.players[s].grumpy = 1; adjustMood(c, -0.02); return tr('Du nennst keinen Namen, aber alle schauen auf den Stürmer. Er schaut zurück.', 'You name nobody, but everyone looks at the striker. He looks back.'); } },
        ]),
      },
      {
        label: tr('Mit dem Vorstand sprechen: Ziel anpassen', 'Talk to the board: adjust the target'),
        effect: outcome([
          { w: (c, ctx) => (ctx.state === 'vorn' ? 4 : 0), if: (c) => goalType(c) !== 'aufstieg', run: (c) => (shiftGoal(c, 1), adjustMood(c, 0.07), tr(`Das Ziel wird angehoben: ${GOALS[c.goal.type].name}. Erwin schreibt es auf eine Serviette und unterschreibt zweimal.`, `The target is raised: ${GOALS[c.goal.type].name}. Erwin writes it on a napkin and signs twice.`)) },
          { w: (c, ctx) => (ctx.state === 'hinten' ? 4 : 0), if: (c) => goalType(c) !== 'erhalt', run: (c) => (shiftGoal(c, -1), adjustMood(c, 0.03), tr(`Das Ziel wird gesenkt: ${GOALS[c.goal.type].name}. Erwin murrt, aber die Mannschaft darf wieder frei spielen.`, `The target is lowered: ${GOALS[c.goal.type].name}. Erwin grumbles, but the squad may play freely again.`)) },
          { w: (c, ctx) => (ctx.state === 'plan' ? 3 : 0.5), run: (c) => (adjustMood(c, 0.02), tr('Ihr redet eine Stunde, am Ende bleibt alles, wie es ist. Gutes Gefühl trotzdem, für beide.', 'You talk for an hour, in the end everything stays as it is. A good feeling anyway, for both.')) },
        ]),
      },
      {
        label: tr('Nichts ändern – Training wie immer', 'Change nothing – training as usual'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.02), tr('Die Mannschaft arbeitet sachlich weiter. Erwin nickt vom Zaun aus, als hätte er den Plan entworfen.', 'The squad work on calmly. Erwin nods from the fence as though he had drawn up the plan.')) },
          { w: 1.5, run: (c) => (team(c, -0.05), tr('Routine macht müde. Im Training gähnen mehr als sonst, und der Platzwart merkt es sogar am Mähen.', 'Routine makes you tired. More people yawn in training than usual, and the groundsman even notices it from his mowing.')) },
          { w: 1, run: (c) => (book(c, tr('Vorstand: Motivationsprämie', 'Board: motivation bonus'), 25), tr('Der Vorstand honoriert die Ruhe mit 25 € und einem Satz, den Erwin sich seit Wochen überlegt hat.', 'The board rewards the calm with €25 and a sentence Erwin has been working on for weeks.')) },
        ]),
      },
    ],
  }),
};

// Gibt es ein fälliges Folge-Ereignis dieser Datei? (Sonst kommt es nicht in seiner Woche, siehe rollWeekEvent.)
export function phaseChainDue(c) {
  return Object.values(PHASE_EVENTS).some((ev) => ev.followUp && ev.needs(c, { next: () => 0.5, pick: (l) => l[0] }));
}
