// Wendungen: Geschichten, Langzeit-Ereignisse und private Entscheidungen behalten
// ihre Grundwirkung (damit Mehrwochen-Geschichten sauber weiterlaufen), bekommen
// aber je Antwort eine zufällige Zusatzwendung – mal nichts, mal Glück, mal Knall.
// s = beteiligter Spieler (kann fehlen).
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, inSquad, joinRival, leaveTeam, outcome, sitOut } from './outcomes.js';
import { adjustEnergy, adjustPatience } from './personal.js';

const has = (c, s) => s != null && inSquad(c, s);
const rival = (c) => c.flags?.derbyRival ?? null;

const T = {
  // --- Lebensgeschichten ---
  vater: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), `${first(c, s)} ist so glücklich, dass er im Training über den Platz fliegt.`) : '') },
    { w: 1, run: (c) => (book(c, 'Spende der Großeltern', 20), 'Die frischgebackenen Großeltern spenden 20 € für die Mannschaftskasse.') },
    { w: 0.8, run: (c, s) => (has(c, s) ? (sitOut(c, s), 'Die Schwiegermutter zieht für zwei Wochen ein. Er muss sonntags „helfen".') : '') },
    { w: 0.6, run: (c) => (adjustMood(c, 0.05), 'Die Mannschaft sammelt für einen Kinderwagen. Ein paar fangen an, über eigene Kinder nachzudenken.') },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? `Nach ein paar Wochen kommt die Nachricht: ${first(c, s)} hört auf. „Die Familie geht jetzt vor."` : '') },
  ],
  umzug: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.3), 'Die Autobahn frisst ihn auf. Er ist müde.') : '') },
    { w: 0.8, run: (c) => (book(c, 'Tankgutschein vom Sponsor', 15), 'Der Sponsor legt einen Tankgutschein drauf.') },
    { w: 0.6, run: (c, s) => (has(c, s) ? ((c.players[s].loyal = true), 'Er schreibt: „Egal wie weit – das hier bleibt mein Verein."') : '') },
    { w: (c) => (canLose(c) && rival(c) ? 0.3 : 0), run: (c, s) => (has(c, s) && joinRival(c, s, rival(c)) ? `Unfassbar: In der neuen Stadt wohnt er genau neben dem Derby-Rivalen. ${first(c, s)} spielt jetzt dort.` : '') },
    { w: (c) => (canLose(c) ? 0.3 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? `Nach ein paar Wochen gibt ${first(c, s)} auf. Zu weit, zu viel.` : '') },
  ],
  jobverlust: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), 'Er hat jetzt Zeit zum Joggen und ist so fit wie seit Jahren nicht.') : '') },
    { w: 0.8, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.4), (c.players[s].grumpy = 2), 'Er grübelt viel und ist schnell gereizt.') : '') },
    { w: 0.7, run: (c) => (adjustMood(c, 0.05), 'Die Mannschaft legt für ihn zusammen. Er weiß nicht, was er sagen soll.') },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? `${first(c, s)} findet einen Job – in einer anderen Stadt. Er ist weg.` : '') },
  ],
  comeback: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), 'Die Geschichte macht die Runde. Ein Comeback-Kind, das wollen alle sehen.') },
    { w: 0.8, run: (c) => (book(c, 'Physio-Nachzahlung', -15), 'Die Physio-Rechnung ist höher als gedacht: 15 € nachzahlen.') },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.4), 'Er trainiert wie besessen. Der Hunger ist zurück.') : '') },
    { w: 0.5, run: (c, s) => (has(c, s) ? ((c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks ?? 0, 2)), sitOut(c, s), 'Das Knie meldet sich. Zwei Wochen Pause – Geduld.') : '') },
  ],
  abschluss: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, -0.3), 'Er schläft im Moment vier Stunden pro Nacht.') : '') },
    { w: 0.8, run: (c) => (adjustMood(c, 0.04), 'Die halbe Mannschaft hilft beim Korrekturlesen. Einer findet 40 Kommafehler.') },
    { w: 0.5, run: (c, s) => (has(c, s) ? ((c.players[s].loyal = true), '„Ohne euch hätte ich das nie durchgezogen."') : '') },
    { w: (c) => (canLose(c) ? 0.25 : 0), run: (c, s) => (has(c, s) && leaveTeam(c, s) ? `Direkt nach dem Abschluss: Auslandsjahr in Australien. ${first(c, s)} ist weg.` : '') },
  ],
  hochzeit: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), 'Die ganze Mannschaft ist eingeladen. Die Tanzfläche wird eure.') },
    { w: 0.8, run: (c) => (book(c, 'Hochzeit: Mannschaft zahlt für die Band mit', -20), 'Die Mannschaft legt für die Band zusammen – 20 € aus der Kasse.') },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), 'Er ist so verliebt, dass er sogar das Laufen genießt.') : '') },
    { w: 0.5, run: (c, s, rng) => { const list = humanClub(c).squad.filter((i) => i !== s); if (!list.length) return ''; const x = rng.pick(list); sitOut(c, x); return `Beim Junggesellenabschied verliert ${first(c, x)} seinen Ausweis – und fehlt Sonntag, weil er ihn in Hamburg sucht.`; } },
  ],
  bruder: [
    { w: 1, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.3), 'Er brennt aufs Duell.') : '') },
    { w: 0.7, run: (c) => (adjustMood(c, 0.04), 'Die Mutter strickt zwei Schals – halb eure Farben, halb die des Gegners.') },
    { w: 0.4, run: (c, s) => (has(c, s) ? ((c.players[s].grumpy = 2), 'Beim Familienessen gab es Streit. Er ist schlecht gelaunt.') : '') },
  ],

  // --- Privat (Spielertrainer) ---
  familienwochenende: [
    { w: 1, run: (c) => (adjustPatience(c, 5), 'Die Kinder malen dir ein Bild: du mit Pfeife. Es hängt jetzt im Vereinsheim.') },
    { w: 0.8, run: (c) => (adjustEnergy(c, 4), 'Ein Wochenende ohne Fußball tut dir selbst gut.') },
    { w: 0.6, run: (c) => (adjustMood(c, -0.03), 'Ohne dich an der Seitenlinie war die Mannschaft ziemlich planlos.') },
  ],
  hochzeitstag: [
    { w: 1, run: (c) => (adjustPatience(c, 4), 'Sie erzählt es ihren Freundinnen. Du stehst gut da.') },
    { w: 0.6, run: (c) => (adjustEnergy(c, 3), 'Ein Abend ohne Handy. Erholsamer als gedacht.') },
    { w: 0.4, run: (c) => (adjustPatience(c, -5), 'Beim Essen klingelt das Handy – der Kapitän, wegen der Aufstellung.') },
  ],
  chef_samstag: [
    { w: 1, run: (c) => (adjustEnergy(c, -3), 'Die Woche war lang.') },
    { w: 0.6, run: (c) => (book(c, 'Chef: Bälle aus dem Lager', 15), 'Im Lager findest du einen Karton alter Werbebälle. Der Chef sagt: „Nimm mit."') },
    { w: 0.5, run: (c) => (adjustPatience(c, -4), 'Zu Hause findet man die Überstunden weniger lustig.') },
  ],
  chef_sponsor: [
    { w: 1, run: (c) => (adjustMood(c, 0.03), 'Die Jungs finden deinen Chef jetzt super.') },
    { w: 0.5, run: (c) => (book(c, 'Chef: Werbebanner', 20), 'Er will dafür ein Banner am Platz. 20 € extra.') },
  ],
  muede: [
    { w: 1, run: (c) => (adjustPatience(c, 3), 'Deine Partnerin ist froh, dass du auf dich hörst.') },
    { w: 0.6, run: (c) => (adjustMood(c, -0.02), 'Die Jungs merken, dass du nicht ganz da bist.') },
    { w: 0.4, run: (c) => (adjustEnergy(c, 6), 'Ein langer Spaziergang, und plötzlich ist der Kopf wieder frei.') },
  ],
  vorstand_kasse: [
    { w: 1, run: (c) => (adjustEnergy(c, -2), 'Die erste Vorstandssitzung dauert drei Stunden.') },
    { w: 0.6, run: (c) => (book(c, 'Alte Rechnung in der Kasse gefunden', 25), 'In einer Schublade findet ihr 25 €, die seit 2019 niemand verbucht hat.') },
    { w: 0.4, run: (c) => (book(c, 'Fehlbetrag in der alten Kasse', -20), 'Beim Nachzählen fehlen 20 €. Keiner will es gewesen sein.') },
  ],
  kind_kickt: [
    { w: 1, run: (c) => (adjustPatience(c, 3), 'Das Strahlen beim ersten Training vergisst du nie.') },
    { w: 0.6, run: (c) => (book(c, 'Schienbeinschoner für die Jugend', -10), 'Neue Schienbeinschoner. Das Kind will sie auch zum Schlafen anziehen.') },
  ],
  angebot: [
    { w: 1, run: (c) => (adjustMood(c, 0.03), 'Die Geschichte spricht sich in der ganzen Liga rum.') },
    { w: 0.5, run: (c) => (adjustPatience(c, -5), 'Zu Hause fragt man sich, warum du das Geld nicht genommen hast.') },
    { w: 0.5, run: (c) => (adjustEnergy(c, 5), 'Irgendwie gibt dir die Anfrage neue Energie. Man will dich!') },
  ],
  familienkrise: [
    { w: 1, run: () => '' },
    { w: 0.7, run: (c) => (adjustMood(c, -0.05), 'Ohne dich zerfällt die Kabine ein bisschen.') },
    { w: 0.5, run: (c) => (adjustMood(c, 0.04), 'Der Kapitän hält den Laden erstaunlich gut zusammen.') },
  ],
  burnout: [
    { w: 1, run: () => '' },
    { w: 0.7, run: (c) => (adjustMood(c, -0.05), 'Die Mannschaft ist verunsichert.') },
    { w: 0.5, run: (c) => (adjustMood(c, 0.05), 'Die Jungs schicken dir jeden Tag ein Video vom Training. Sie vermissen dich.') },
  ],

  // --- Langzeit ---
  platz_verkauf: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), 'Die halbe Stadt redet über euren Platz.') },
    { w: 0.6, run: (c) => (book(c, 'Spende der Anwohner', 30), 'Die Anwohner wollen auch keine Wohnungen: 30 € Spende.') },
    { w: 0.5, run: (c) => (adjustEnergy(c, -4), 'Die Sache frisst viel Zeit – Briefe, Termine, Stadtrat.') },
    { w: (c) => (canLose(c) ? 0.2 : 0), run: (c, s, rng) => { const x = rng.pick(humanClub(c).squad); return leaveTeam(c, x) ? `${first(c, x)} glaubt nicht mehr an den Verein und wechselt.` : ''; } },
  ],
  jubilaeum: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), 'Ehemalige von vor 20 Jahren kommen vorbei. Es wird viel erzählt und noch mehr gelacht.') },
    { w: 0.6, run: (c) => (book(c, 'Jubiläumsspende der Sparkasse', 50), 'Die Sparkasse überreicht einen Scheck: 50 €.') },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), 'Ein Gründungsmitglied hält eine 40-minütige Rede. Das Bier wird warm.') },
  ],
  fusion: [
    { w: 1, run: (c) => (adjustMood(c, -0.03), 'Ein paar Alte drohen mit Austritt.') },
    { w: 0.6, run: (c) => (adjustMood(c, 0.04), 'Die Jungen freuen sich auf neue Mitspieler.') },
    { w: (c) => (canLose(c) ? 0.3 : 0), run: (c, s, rng) => { const x = rng.pick(humanClub(c).squad); return leaveTeam(c, x) ? `${first(c, x)} ist gegen die Fusion und tritt aus.` : ''; } },
  ],
  frauen: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), 'Das Kreisblatt schreibt einen Artikel darüber.') },
    { w: 0.6, run: (c) => (book(c, 'Spende für das Frauenteam', 30), 'Eine Firma spendet 30 € für die Frauen.') },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), 'Zwei Alte am Stammtisch murren. Der Rest ignoriert sie.') },
  ],
  frauen_platz: [
    { w: 1, run: () => '' },
    { w: 0.6, run: (c) => (adjustMood(c, 0.03), 'Nach dem Training grillen beide Teams zusammen.') },
    { w: 0.4, run: (c) => (adjustEnergy(c, -2), 'Der Belegungsplan braucht drei Anläufe.') },
  ],
  profi_scout: [
    { w: 1, run: (c) => (adjustMood(c, 0.04), 'Die ganze Jugend träumt jetzt vom Profivertrag.') },
    { w: 0.6, run: (c) => (book(c, 'Trikotverkauf nach Profi-Nachricht', 25), 'Plötzlich wollen alle ein Vereinstrikot. 25 € Umsatz.') },
  ],
  profi_rueckkehr: [
    { w: 1, run: (c) => (adjustMood(c, 0.05), 'Zum ersten Training kommen 30 Zuschauer.') },
    { w: 0.6, run: (c, s) => (has(c, s) ? (adjustForm(c, s, 0.5), 'Er ist heiß wie nie.') : '') },
    { w: 0.4, run: (c) => (adjustMood(c, -0.03), 'Ein paar Stammspieler fürchten um ihren Platz.') },
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
