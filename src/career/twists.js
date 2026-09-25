// Wendungen: Geschichten, Langzeit-Ereignisse und private Entscheidungen behalten
// ihre Grundwirkung (damit Mehrwochen-Geschichten sauber weiterlaufen), bekommen
// aber je Antwort eine zufällige Zusatzwendung – mal nichts, mal Glück, mal Knall.
// s = beteiligter Spieler (kann fehlen).
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, inSquad, joinRival, leaveTeam, outcome, sitOut } from './outcomes.js';
import { adjustEnergy, adjustPatience } from './personal.js';
import { tr } from '../core/i18n.js';

const has = (c, s) => s != null && inSquad(c, s);
const rival = (c) => c.flags?.derbyRival ?? null;

const T = {
  // --- Lebensgeschichten ---
  vater: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), tr(`${first(c, s)} ist so glücklich, dass er im Training über den Platz fliegt.`, `${first(c, s)} is so happy he flies around the pitch in training.`)) : '') },
    { w: 1, run: (c) => (book(c, tr('Spende der Großeltern', 'Donation from the grandparents'), 20), tr('Die frischgebackenen Großeltern spenden 20 € für die Mannschaftskasse.', 'The brand-new grandparents donate €20 to the team kitty.')) },
    { w: 0.8, run: (c, s) => (has(c, s) ? (sitOut(c, s), tr('Die Schwiegermutter zieht für zwei Wochen ein. Er muss sonntags „helfen".', 'The mother-in-law moves in for two weeks. He has to "help out" on Sundays.')) : '') },
    { w: 0.6, run: (c) => (adjustMood(c, 0.05), tr('Die Mannschaft sammelt für einen Kinderwagen. Ein paar fangen an, über eigene Kinder nachzudenken.', 'The team collects money for a pram. A few start thinking about kids of their own.')) },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? tr(`Nach ein paar Wochen kommt die Nachricht: ${first(c, s)} hört auf. „Die Familie geht jetzt vor."`, `A few weeks later the news arrives: ${first(c, s)} is quitting. "Family comes first now."`) : '') },
  ],
  umzug: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.3), tr('Die Autobahn frisst ihn auf. Er ist müde.', 'The motorway wears him out. He is tired.')) : '') },
    { w: 0.8, run: (c) => (book(c, tr('Tankgutschein vom Sponsor', 'Fuel voucher from the sponsor'), 15), tr('Der Sponsor legt einen Tankgutschein drauf.', 'The sponsor chips in with a fuel voucher.')) },
    { w: 0.6, run: (c, s) => (has(c, s) ? ((c.players[s].loyal = true), tr('Er schreibt: „Egal wie weit – das hier bleibt mein Verein."', 'He writes: "No matter the distance – this stays my club."')) : '') },
    { w: (c) => (canLose(c) && rival(c) ? 0.3 : 0), run: (c, s) => (has(c, s) && joinRival(c, s, rival(c)) ? tr(`Unfassbar: In der neuen Stadt wohnt er genau neben dem Derby-Rivalen. ${first(c, s)} spielt jetzt dort.`, `Unbelievable: in the new town he lives right next to the derby rival. ${first(c, s)} plays there now.`) : '') },
    { w: (c) => (canLose(c) ? 0.3 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? tr(`Nach ein paar Wochen gibt ${first(c, s)} auf. Zu weit, zu viel.`, `A few weeks later ${first(c, s)} gives up. Too far, too much.`) : '') },
  ],
  jobverlust: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), tr('Er hat jetzt Zeit zum Joggen und ist so fit wie seit Jahren nicht.', 'He now has time to go jogging and is fitter than he has been in years.')) : '') },
    { w: 0.8, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.4), (c.players[s].grumpy = 2), tr('Er grübelt viel und ist schnell gereizt.', 'He broods a lot and is quick to snap.')) : '') },
    { w: 0.7, run: (c) => (adjustMood(c, 0.05), tr('Die Mannschaft legt für ihn zusammen. Er weiß nicht, was er sagen soll.', 'The team has a whip-round for him. He does not know what to say.')) },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? tr(`${first(c, s)} findet einen Job – in einer anderen Stadt. Er ist weg.`, `${first(c, s)} finds a job – in another town. He is gone.`) : '') },
  ],
  comeback: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die Geschichte macht die Runde. Ein Comeback-Kind, das wollen alle sehen.', 'The story does the rounds. A comeback kid, everyone wants to see that.')) },
    { w: 0.8, run: (c) => (book(c, tr('Physio-Nachzahlung', 'Physio top-up payment'), -15), tr('Die Physio-Rechnung ist höher als gedacht: 15 € nachzahlen.', 'The physio bill is higher than expected: €15 to make up.')) },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.4), tr('Er trainiert wie besessen. Der Hunger ist zurück.', 'He trains like a man possessed. The hunger is back.')) : '') },
    { w: 0.5, run: (c, s) => (has(c, s) ? ((c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks ?? 0, 2)), sitOut(c, s), tr('Das Knie meldet sich. Zwei Wochen Pause – Geduld.', 'The knee makes itself known. Two weeks out – patience.')) : '') },
  ],
  abschluss: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.3), tr('Er schläft im Moment vier Stunden pro Nacht.', 'He is currently getting four hours of sleep a night.')) : '') },
    { w: 0.8, run: (c) => (adjustMood(c, 0.04), tr('Die halbe Mannschaft hilft beim Korrekturlesen. Einer findet 40 Kommafehler.', 'Half the team helps with proofreading. One finds 40 comma errors.')) },
    { w: 0.5, run: (c, s) => (has(c, s) ? ((c.players[s].loyal = true), tr('„Ohne euch hätte ich das nie durchgezogen."', '"Without you lot I would never have got through this."')) : '') },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? tr(`Direkt nach dem Abschluss: Auslandsjahr in Australien. ${first(c, s)} ist weg.`, `Straight after graduating: a gap year in Australia. ${first(c, s)} is gone.`) : '') },
  ],
  hochzeit: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), tr('Die ganze Mannschaft ist eingeladen. Die Tanzfläche wird eure.', 'The whole team is invited. The dance floor is yours.')) },
    { w: 0.8, run: (c) => (book(c, tr('Hochzeit: Mannschaft zahlt für die Band mit', 'Wedding: team chips in for the band'), -20), tr('Die Mannschaft legt für die Band zusammen – 20 € aus der Kasse.', 'The team chips in for the band – €20 from the kitty.')) },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), tr('Er ist so verliebt, dass er sogar das Laufen genießt.', 'He is so in love he even enjoys the running.')) : '') },
    { w: 0.5, run: (c, s, rng) => { const list = humanClub(c).squad.filter((i) => i !== s); if (!list.length) return ''; const x = rng.pick(list); sitOut(c, x); return tr(`Beim Junggesellenabschied verliert ${first(c, x)} seinen Ausweis – und fehlt Sonntag, weil er ihn in Hamburg sucht.`, `At the stag do ${first(c, x)} loses his ID – and misses Sunday because he is off looking for it in Hamburg.`); } },
  ],
  bruder: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), tr('Er brennt aufs Duell.', 'He is itching for the showdown.')) : '') },
    { w: 0.7, run: (c) => (adjustMood(c, 0.04), tr('Die Mutter strickt zwei Schals – halb eure Farben, halb die des Gegners.', 'Their mother knits two scarves – half your colours, half the opponent\'s.')) },
    { w: 0.4, run: (c, s) => (has(c, s) ? ((c.players[s].grumpy = 2), tr('Beim Familienessen gab es Streit. Er ist schlecht gelaunt.', 'There was a row at the family dinner. He is in a foul mood.')) : '') },
  ],

  // --- Privat (Spielertrainer) ---
  familienwochenende: [
    { w: 1, run: (c) => (adjustPatience(c, 5), tr('Die Kinder malen dir ein Bild: du mit Pfeife. Es hängt jetzt im Vereinsheim.', 'The kids draw you a picture: you with a pipe. It now hangs in the clubhouse.')) },
    { w: 0.8, run: (c) => (adjustEnergy(c, 4), tr('Ein Wochenende ohne Fußball tut dir selbst gut.', 'A weekend without football does you good too.')) },
    { w: 0.6, run: (c) => (adjustMood(c, -0.03), tr('Ohne dich an der Seitenlinie war die Mannschaft ziemlich planlos.', 'Without you on the touchline the team was fairly clueless.')) },
  ],
  hochzeitstag: [
    { w: 1, run: (c) => (adjustPatience(c, 4), tr('Sie erzählt es ihren Freundinnen. Du stehst gut da.', 'She tells her friends. You come out of it looking good.')) },
    { w: 0.6, run: (c) => (adjustEnergy(c, 3), tr('Ein Abend ohne Handy. Erholsamer als gedacht.', 'An evening without your phone. More restful than expected.')) },
    { w: 0.4, run: (c) => (adjustPatience(c, -5), tr('Beim Essen klingelt das Handy – der Kapitän, wegen der Aufstellung.', 'Your phone rings during dinner – the captain, about the line-up.')) },
  ],
  chef_samstag: [
    { w: 1, run: (c) => (adjustEnergy(c, -3), tr('Die Woche war lang.', 'The week was long.')) },
    { w: 0.6, run: (c) => (book(c, tr('Chef: Bälle aus dem Lager', 'Boss: balls from the storeroom'), 15), tr('Im Lager findest du einen Karton alter Werbebälle. Der Chef sagt: „Nimm mit."', 'In the storeroom you find a box of old promo balls. Your boss says: "Take them."')) },
    { w: 0.5, run: (c) => (adjustPatience(c, -4), tr('Zu Hause findet man die Überstunden weniger lustig.', 'At home the overtime goes down less well.')) },
  ],
  chef_sponsor: [
    { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die Jungs finden deinen Chef jetzt super.', 'The lads now think your boss is great.')) },
    { w: 0.5, run: (c) => (book(c, tr('Chef: Werbebanner', 'Boss: advertising banner'), 20), tr('Er will dafür ein Banner am Platz. 20 € extra.', 'In return he wants a banner at the pitch. €20 extra.')) },
  ],
  muede: [
    { w: 1, run: (c) => (adjustPatience(c, 3), tr('Deine Partnerin ist froh, dass du auf dich hörst.', 'Your partner is glad you are listening to yourself.')) },
    { w: 0.6, run: (c) => (adjustMood(c, -0.02), tr('Die Jungs merken, dass du nicht ganz da bist.', 'The lads notice you are not quite all there.')) },
    { w: 0.4, run: (c) => (adjustEnergy(c, 6), tr('Ein langer Spaziergang, und plötzlich ist der Kopf wieder frei.', 'A long walk, and suddenly your head clears.')) },
  ],
  vorstand_kasse: [
    { w: 1, run: (c) => (adjustEnergy(c, -2), tr('Die erste Vorstandssitzung dauert drei Stunden.', 'The first committee meeting drags on for three hours.')) },
    { w: 0.6, run: (c) => (book(c, tr('Alte Rechnung in der Kasse gefunden', 'Old cash found in the kitty'), 25), tr('In einer Schublade findet ihr 25 €, die seit 2019 niemand verbucht hat.', 'In a drawer you find €25 that nobody has recorded since 2019.')) },
    { w: 0.4, run: (c) => (book(c, tr('Fehlbetrag in der alten Kasse', 'Shortfall in the old kitty'), -20), tr('Beim Nachzählen fehlen 20 €. Keiner will es gewesen sein.', 'On recount €20 is missing. Nobody will admit to it.')) },
  ],
  kind_kickt: [
    { w: 1, run: (c) => (adjustPatience(c, 3), tr('Das Strahlen beim ersten Training vergisst du nie.', 'You will never forget the beaming face at the first training session.')) },
    { w: 0.6, run: (c) => (book(c, tr('Schienbeinschoner für die Jugend', 'Shin pads for the kid'), -10), tr('Neue Schienbeinschoner. Das Kind will sie auch zum Schlafen anziehen.', 'New shin pads. The kid wants to wear them to bed too.')) },
  ],
  angebot: [
    { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die Geschichte spricht sich in der ganzen Liga rum.', 'The story does the rounds of the whole league.')) },
    { w: 0.5, run: (c) => (adjustPatience(c, -5), tr('Zu Hause fragt man sich, warum du das Geld nicht genommen hast.', 'At home they wonder why you did not take the money.')) },
    { w: 0.5, run: (c) => (adjustEnergy(c, 5), tr('Irgendwie gibt dir die Anfrage neue Energie. Man will dich!', 'Somehow the offer gives you new energy. Someone wants you!')) },
  ],
  familienkrise: [
    { w: 1, run: () => '' },
    { w: 0.7, run: (c) => (adjustMood(c, -0.05), tr('Ohne dich zerfällt die Kabine ein bisschen.', 'Without you the dressing room falls apart a little.')) },
    { w: 0.5, run: (c) => (adjustMood(c, 0.04), tr('Der Kapitän hält den Laden erstaunlich gut zusammen.', 'The captain holds the shop together surprisingly well.')) },
  ],
  burnout: [
    { w: 1, run: () => '' },
    { w: 0.7, run: (c) => (adjustMood(c, -0.05), tr('Die Mannschaft ist verunsichert.', 'The team is unsettled.')) },
    { w: 0.5, run: (c) => (adjustMood(c, 0.05), tr('Die Jungs schicken dir jeden Tag ein Video vom Training. Sie vermissen dich.', 'The lads send you a video from training every day. They miss you.')) },
  ],

  // --- Langzeit ---
  platz_verkauf: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die halbe Stadt redet über euren Platz.', 'Half the town is talking about your pitch.')) },
    { w: 0.6, run: (c) => (book(c, tr('Spende der Anwohner', 'Donation from the neighbours'), 30), tr('Die Anwohner wollen auch keine Wohnungen: 30 € Spende.', 'The neighbours do not want flats there either: €30 donation.')) },
    { w: 0.5, run: (c) => (adjustEnergy(c, -4), tr('Die Sache frisst viel Zeit – Briefe, Termine, Stadtrat.', 'The whole business eats up a lot of time – letters, appointments, council meetings.')) },
    { w: (c) => (canLose(c) ? 0.2 : 0), run: (c, s, rng) => { const x = rng.pick(humanClub(c).squad); return leaveTeam(c, x) ? tr(`${first(c, x)} glaubt nicht mehr an den Verein und wechselt.`, `${first(c, x)} no longer believes in the club and moves on.`) : ''; } },
  ],
  jubilaeum: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), tr('Ehemalige von vor 20 Jahren kommen vorbei. Es wird viel erzählt und noch mehr gelacht.', 'Old boys from 20 years ago drop by. There is a lot of storytelling and even more laughing.')) },
    { w: 0.6, run: (c) => (book(c, tr('Jubiläumsspende der Sparkasse', 'Anniversary donation from the savings bank'), 50), tr('Die Sparkasse überreicht einen Scheck: 50 €.', 'The savings bank presents a cheque: €50.')) },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), tr('Ein Gründungsmitglied hält eine 40-minütige Rede. Das Bier wird warm.', 'A founding member gives a 40-minute speech. The beer goes warm.')) },
  ],
  fusion: [
    { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Ein paar Alte drohen mit Austritt.', 'A few old-timers threaten to quit.')) },
    { w: 0.6, run: (c) => (adjustMood(c, 0.04), tr('Die Jungen freuen sich auf neue Mitspieler.', 'The younger players look forward to new teammates.')) },
    { w: (c) => (canLose(c) ? 0.3 : 0), run: (c, s, rng) => { const x = rng.pick(humanClub(c).squad); return leaveTeam(c, x) ? tr(`${first(c, x)} ist gegen die Fusion und tritt aus.`, `${first(c, x)} is against the merger and quits.`) : ''; } },
  ],
  frauen: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Das Kreisblatt schreibt einen Artikel darüber.', 'The Kreisblatt writes an article about it.')) },
    { w: 0.6, run: (c) => (book(c, tr('Spende für das Frauenteam', 'Donation for the women\'s team'), 30), tr('Eine Firma spendet 30 € für die Frauen.', 'A company donates €30 to the women\'s team.')) },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), tr('Zwei Alte am Stammtisch murren. Der Rest ignoriert sie.', 'Two old-timers at the regulars\' table grumble. Everyone else ignores them.')) },
  ],
  frauen_platz: [
    { w: 1, run: () => '' },
    { w: 0.6, run: (c) => (adjustMood(c, 0.03), tr('Nach dem Training grillen beide Teams zusammen.', 'After training both teams barbecue together.')) },
    { w: 0.4, run: (c) => (adjustEnergy(c, -2), tr('Der Belegungsplan braucht drei Anläufe.', 'The pitch booking schedule takes three attempts.')) },
  ],
  profi_scout: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die ganze Jugend träumt jetzt vom Profivertrag.', 'Every junior now dreams of a professional contract.')) },
    { w: 0.6, run: (c) => (book(c, tr('Trikotverkauf nach Profi-Nachricht', 'Shirt sales after the pro news'), 25), tr('Plötzlich wollen alle ein Vereinstrikot. 25 € Umsatz.', 'Suddenly everyone wants a club shirt. €25 in sales.')) },
  ],
  profi_rueckkehr: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), tr('Zum ersten Training kommen 30 Zuschauer.', '30 spectators turn up to the first training session.')) },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.5), tr('Er ist heiß wie nie.', 'He is fired up like never before.')) : '') },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), tr('Ein paar Stammspieler fürchten um ihren Platz.', 'A few regulars fear for their place in the team.')) },
  ],
};

// Nach der Grundwirkung einer Entscheidung: eine Wendung dazu (oder keine).
export function applyTwist(c, key, s, rng) {
  const list = T[key];
  if (!list) return '';
  const wrapped = [{ w: 1.6, run: () => '' }, ...list.map((t) => ({ w: t.w, run: (cc, ctx, r) => t.run(cc, s, r) }))];
  try {
    return outcome(wrapped)(c, {}, rng) || '';
  } catch {
    return '';
  }
}
export const hasTwists = (key) => !!T[key];
export { playerOf };
