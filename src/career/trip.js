// Die Saisonabschlussfahrt als kleine Geschichte: Ziel wählen, drei Etappen,
// jede Entscheidung würfelt aus mehreren Ausgängen. Was auf Mallorca passiert,
// bleibt auf Mallorca – außer in der Vereinschronik.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome } from './outcomes.js';
import { adjustEnergy, adjustPatience, isCoach } from './personal.js';
import { setRelation } from './relations.js';
import { chronicle } from './sagas.js';

// Punkte für die Fahrt: Am Ende entscheidet die Summe, wie die Stimmung in die neue Saison geht.
const score = (c, d) => (c.trip.score += d);
const hurt = (c, idx, weeks, label) => {
  if (!c.players[idx]) return;
  c.players[idx].injuryWeeks = Math.max(c.players[idx].injuryWeeks ?? 0, weeks);
  c.players[idx].injury = { label };
};

export const DESTINATIONS = {
  kegeltour: {
    name: tr('Kegeltour ins Sauerland', 'Bowling trip to the Sauerland'),
    cost: 120,
    desc: tr('Zwei Tage, eine Kegelbahn, ein Gasthof mit Doppelzimmern und Etagendusche.', 'Two days, one bowling alley, a country inn with double rooms and a shared shower.'),
    stages: [
      {
        text: (c, x) => tr(`Samstag, 8 Uhr, Bahnhof. ${first(c, x.a)} hat einen Bollerwagen mit drei Kästen dabei. Der Zug fährt um 8:12.`, `Saturday, 8am, station. ${first(c, x.a)} has brought a handcart with three crates. The train leaves at 8:12.`),
        options: [
          { label: tr('Bollerwagen mit in den Zug', 'Handcart onto the train'), effect: outcome([{ w: 3, run: (c) => (score(c, 1), tr('Der Schaffner drückt ein Auge zu. Das Abteil singt bis Siegen.', 'The conductor turns a blind eye. The carriage sings all the way to Siegen.')) }, { w: 1, run: (c) => (score(c, -1), book(c, tr('Bußgeld Zugbegleiter', 'Fine from the conductor'), -40), tr('40 € Strafe wegen „Ruhestörung in Tateinheit mit Schlager".', '€40 fine for "disturbing the peace in combination with Schlager music".')) }, { w: 1, run: (c, x) => (score(c, 1), setRelation(c, x.a, x.b, 'kumpel'), tr(`${first(c, x.a)} und ${first(c, x.b)} teilen sich den letzten Sitzplatz – auf dem Bollerwagen. Seitdem unzertrennlich.`, `${first(c, x.a)} and ${first(c, x.b)} share the last seat – on the handcart. Inseparable ever since.`)) }]) },
          { label: tr('Kästen bleiben am Bahnhof', 'Crates stay at the station'), effect: outcome([{ w: 3, run: (c) => (score(c, 0), tr('Vernünftig. Am Zielbahnhof gibt es einen Kiosk.', 'Sensible. There is a kiosk at the other end.')) }, { w: 1, run: (c, x) => (score(c, -1), (c.players[x.a] && (c.players[x.a].grumpy = 2)), tr(`${first(c, x.a)} redet den ganzen Tag nicht mit dir.`, `${first(c, x.a)} does not speak to you all day.`)) }, { w: 1, run: (c) => (score(c, 1), tr('Ein Obdachloser freut sich über drei Kästen. Die Jungs finden das eine gute Tat.', 'A homeless man is delighted with three crates. The lads call it a good deed.')) }]) },
        ],
      },
      {
        text: (c, x) => tr(`Kegelabend im Gasthof „Zur Klaue". Der Wirt schlägt einen Wettkampf gegen den örtlichen Kegelclub vor. Einsatz: die Zeche.`, `Bowling night at the "Zur Klaue" inn. The landlord suggests a match against the local bowling club. Stake: the bar bill.`),
        options: [
          { label: tr('Wette annehmen', 'Take the bet'), effect: outcome([{ w: 2, run: (c) => (score(c, 2), book(c, tr('Zeche gewonnen', 'Bar bill won'), 60), tr('Gewonnen! Die Kegelbrüder zahlen die Zeche – 60 € gespart.', 'Won! The bowlers pay the bill – €60 saved.')) }, { w: 2, run: (c) => (score(c, 0), book(c, tr('Zeche verloren', 'Bar bill lost'), -60), tr('Die Kegelbrüder sind Profis. 60 € für die Zeche.', 'The bowlers are pros. €60 for the bill.')) }, { w: 1, run: (c, x) => (score(c, 1), hurt(c, x.b, 1, tr('Kegelfinger', 'bowling finger')), tr(`${first(c, x.b)} bleibt mit dem Finger in der Kugel stecken. Die Feuerwehr kommt. Es ist der beste Abend des Jahres.`, `${first(c, x.b)} gets his finger stuck in the ball. The fire brigade comes. It is the best night of the year.`)) }]) },
          { label: tr('Nur unter uns kegeln', 'Just bowl among ourselves'), effect: outcome([{ w: 3, run: (c) => (score(c, 1), tr('Gemütlich. Der Torwart gewinnt, weil er als Einziger nüchtern ist.', 'Cosy. The keeper wins because he is the only sober one.')) }, { w: 1, run: (c, x) => (score(c, -1), setRelation(c, x.a, x.d, 'rivalen'), tr(`${first(c, x.a)} und ${first(c, x.d)} streiten über eine Pumpe. Seitdem reden sie nur noch über den Kapitän miteinander.`, `${first(c, x.a)} and ${first(c, x.d)} argue over a gutter ball. Since then they only talk through the captain.`)) }]) },
        ],
      },
      {
        text: (c, x) => tr(`Sonntagmorgen. Der Gasthof hat Frühstück bis 9 Uhr. Es ist 9:40. ${first(c, x.d)} fehlt.`, `Sunday morning. Breakfast at the inn is until 9. It is 9:40. ${first(c, x.d)} is missing.`),
        options: [
          { label: tr('Alle suchen gemeinsam', 'Everyone searches together'), effect: outcome([{ w: 3, run: (c, x) => (score(c, 1), tr(`${first(c, x.d)} liegt im Kegelbahn-Lager auf den Pins und schläft. Foto fürs Vereinsheim.`, `${first(c, x.d)} is asleep on the pins in the bowling alley store room. Photo for the clubhouse.`)) }, { w: 1, run: (c, x) => (score(c, 2), setRelation(c, x.d, x.b, 'kumpel'), tr(`${first(c, x.d)} hat bei einer Familie im Dorf übernachtet und bringt Kuchen mit. Legende.`, `${first(c, x.d)} spent the night with a family in the village and brings cake. Legend.`)) }, { w: 1, run: (c) => (score(c, -1), book(c, tr('Sammeltaxi nach Hause (Zug verpasst)', 'Shared taxi home (missed the train)'), -45), tr('Die Suche dauert so lange, dass ihr den Zug verpasst. 45 € Sammeltaxi.', 'The search takes so long you miss the train. €45 for a shared taxi.')) }]) },
          { label: tr('Der findet schon heim', 'He will find his way home'), effect: outcome([{ w: 2, run: (c, x) => (score(c, 0), tr(`${first(c, x.d)} ist schon zu Hause. Er ist um 5 Uhr mit dem Milchwagen gefahren.`, `${first(c, x.d)} is already home. He left at 5am on the milk lorry.`)) }, { w: 1, run: (c, x) => (score(c, -2), (c.players[x.d] && (c.players[x.d].grumpy = 3)), tr(`${first(c, x.d)} ist sauer: „Keiner hat mich gesucht." Er hat nicht ganz unrecht.`, `${first(c, x.d)} is fuming: "Nobody looked for me." He has a point.`)) }]) },
        ],
      },
    ],
  },
  harz: {
    name: tr('Hüttenwochenende im Harz', 'Cabin weekend in the Harz'),
    cost: 250,
    desc: tr('Eine Hütte, ein Kamin, eine Wanderung, die keiner machen will.', 'A cabin, a fireplace, a hike nobody wants to do.'),
    stages: [
      {
        text: (c, x) => tr(`Anreise im Konvoi. ${first(c, x.a)} fährt vorne und schwört auf sein Navi. Nach zwei Stunden steht ihr vor einem Steinbruch.`, `Travelling in convoy. ${first(c, x.a)} leads and swears by his satnav. After two hours you are standing in front of a quarry.`),
        options: [
          { label: tr('Dem Navi vertrauen', 'Trust the satnav'), effect: outcome([{ w: 2, run: (c) => (score(c, 1), tr('Irgendwann ist die Hütte da. Nach vier Stunden und drei Dörfern mit Blasmusik.', 'Eventually you reach the cabin. After four hours and three villages with brass bands.')) }, { w: 1, run: (c) => (score(c, -1), book(c, tr('Abschleppdienst (Feldweg)', 'Tow truck (farm track)'), -50), tr('Ein Auto sitzt im Feldweg fest. 50 € Abschleppdienst.', 'A car gets stuck on a farm track. €50 for the tow truck.')) }, { w: 1, run: (c, x) => (score(c, 2), tr(`Unterwegs findet ihr eine Dorfkirmes. ${first(c, x.a)} gewinnt einen Riesenteddy. Er fährt mit.`, `On the way you find a village fair. ${first(c, x.a)} wins a giant teddy. It comes along.`)) }]) },
          { label: tr('Den Förster fragen', 'Ask the forester'), effect: outcome([{ w: 3, run: (c) => (score(c, 1), tr('Der Förster zeigt den Weg und kommt abends auf ein Bier vorbei.', 'The forester shows you the way and drops by for a beer in the evening.')) }, { w: 1, run: (c, x) => (score(c, 0), (c.players[x.a] && (c.players[x.a].grumpy = 1)), tr(`${first(c, x.a)} ist gekränkt, dass keiner seinem Navi glaubt.`, `${first(c, x.a)} is hurt that nobody believes his satnav.`)) }]) },
        ],
      },
      {
        text: (c, x) => tr(`Samstag: Die geplante Wanderung zum Brocken, 14 Kilometer. ${first(c, x.b)} fragt, ob man nicht einfach die Bimmelbahn nehmen kann.`, `Saturday: the planned hike up the Brocken, 14 kilometres. ${first(c, x.b)} asks whether you could just take the little steam train.`),
        options: [
          { label: tr('Alle wandern – Teambuilding!', 'Everyone hikes – team building!'), effect: outcome([{ w: 2, run: (c) => (score(c, 2), adjustEnergy(c, 5), tr('Oben auf dem Brocken: Nebel, Wind, Gipfelschnaps. Keiner sieht was, alle sind glücklich.', 'At the top of the Brocken: fog, wind, summit schnapps. Nobody can see a thing, everyone is happy.')) }, { w: 1.5, run: (c, x) => (score(c, 0), hurt(c, x.b, 2, tr('Blasen an beiden Füßen', 'blisters on both feet')), tr(`${first(c, x.b)} läuft in neuen Schuhen. Zwei Wochen Blasen – er humpelt in die Vorbereitung.`, `${first(c, x.b)} walks in new boots. Two weeks of blisters – he limps into pre-season.`)) }, { w: 1, run: (c, x) => (score(c, 1), setRelation(c, x.b, x.d, 'kumpel'), tr(`${first(c, x.b)} und ${first(c, x.d)} bleiben als Letzte zurück und reden zum ersten Mal richtig. Jetzt Kumpels.`, `${first(c, x.b)} and ${first(c, x.d)} fall behind at the back and talk properly for the first time. Mates now.`)) }, { w: 0.6, run: (c) => (score(c, -2), tr('Gewitter auf halber Strecke. Nass bis auf die Knochen, und die Laune ist im Keller.', 'Thunderstorm halfway up. Soaked to the bone, and spirits are rock bottom.')) }]) },
          { label: tr('Bimmelbahn und Bratwurst', 'Steam train and bratwurst'), effect: outcome([{ w: 3, run: (c) => (score(c, 1), tr('Oben in 40 Minuten, Bratwurst in 41. Ein perfekter Tag.', 'At the top in 40 minutes, bratwurst in 41. A perfect day.')) }, { w: 1, run: (c) => (score(c, 0), book(c, tr('Brockenbahn für alle', 'Brocken railway for everyone'), -60), tr('Die Bahn kostet mehr als gedacht. 60 € aus der Kasse.', 'The train costs more than expected. €60 from the kitty.')) }]) },
        ],
      },
      {
        text: () => tr('Letzter Abend am Kamin. Jemand holt die Gitarre raus. Dann wird es ernst: Wer hält die Rede auf die Saison?', 'Last night by the fire. Someone gets the guitar out. Then it gets serious: who gives the speech about the season?'),
        options: [
          { label: tr('Du hältst die Rede', 'You give the speech'), effect: outcome([{ w: 3, run: (c) => (score(c, 2), adjustMood(c, 0.05), tr('Du sprichst über Zusammenhalt und die Pfostenschüsse der Hinrunde. Zwei weinen. Einer tut so, als wäre es der Rauch.', 'You talk about sticking together and all the shots off the post in the first half of the season. Two of them cry. One pretends it is the smoke.')) }, { w: 1, run: (c) => (score(c, 0), tr('Die Rede ist zu lang. Irgendwann schläft der Torwart.', 'The speech is too long. At some point the keeper falls asleep.')) }, { w: 1, run: (c) => (score(c, 1), adjustPatience(c, 5), tr('Du rufst zu Hause an und erzählst es der Familie. Sie findet die Rede auch gut.', 'You ring home and tell the family. They like the speech too.')) }]) },
          { label: tr('Der Kapitän soll', 'The captain should do it'), effect: outcome([{ w: 2, run: (c, x) => (score(c, 1), tr(`${first(c, x.a)} redet kurz und trifft genau den Ton. Standing Ovations im Kaminzimmer.`, `${first(c, x.a)} keeps it short and strikes exactly the right note. Standing ovation by the fire.`)) }, { w: 1, run: (c, x) => (score(c, -1), setRelation(c, x.a, x.b, 'rivalen'), tr(`${first(c, x.a)} rechnet in der Rede mit ${first(c, x.b)} ab. Das Kaminfeuer ist das Wärmste im Raum.`, `${first(c, x.a)} settles scores with ${first(c, x.b)} in the speech. The fire is the warmest thing in the room.`)) }, { w: 1, run: (c) => (score(c, 2), tr('Statt einer Rede gibt es ein Lied. Es wird die neue Vereinshymne.', 'Instead of a speech there is a song. It becomes the new club anthem.')) }]) },
        ],
      },
    ],
  },
  mallorca: {
    name: tr('Mallorca, Ballermann', 'Mallorca, Ballermann'),
    cost: 450,
    desc: tr('Vier Tage Playa de Palma. Gleiche T-Shirts, Spitznamen auf dem Rücken, wenig Schlaf.', 'Four days at Playa de Palma. Matching T-shirts, nicknames on the back, little sleep.'),
    stages: [
      {
        text: (c, x) => tr(`Flughafen, 5 Uhr früh. ${first(c, x.a)} hat für alle T-Shirts drucken lassen: vorne das Vereinswappen, hinten Spitznamen. Deiner lautet „Taktikfuchs (angeblich)".`, `Airport, 5am. ${first(c, x.a)} has had T-shirts printed for everyone: club crest on the front, nicknames on the back. Yours says "Tactical Genius (allegedly)".`),
        options: [
          { label: tr('Stolz anziehen', 'Wear it proudly'), effect: outcome([{ w: 3, run: (c) => (score(c, 1), tr('Die ganze Reihe 23 bis 27 trägt das Shirt. Die Stewardess will auch eins.', 'Rows 23 to 27 are all wearing the shirt. The flight attendant wants one too.')) }, { w: 1, run: (c, x) => (score(c, -1), (c.players[x.b] && (c.players[x.b].grumpy = 2)), tr(`${first(c, x.b)} findet seinen Spitznamen „Luftloch-Larry" gar nicht lustig.`, `${first(c, x.b)} does not find his nickname "Air-shot Larry" funny at all.`)) }, { w: 1, run: (c) => (score(c, 2), (c.flags.pressWeeks = 2), tr('Das Kreisblatt druckt das Gruppenfoto. Titel: „Die fliegen hoch".', 'The District Gazette prints the group photo. Headline: "Flying high".')) }]) },
          { label: tr('Nur im Koffer lassen', 'Leave it in the suitcase'), effect: outcome([{ w: 2, run: (c, x) => (score(c, -1), tr(`${first(c, x.a)} ist enttäuscht. 120 € für T-Shirts, die keiner trägt.`, `${first(c, x.a)} is disappointed. €120 on T-shirts nobody wears.`)) }, { w: 1, run: (c) => (score(c, 0), tr('Am zweiten Tag tragen sie doch alle. Es gibt keine sauberen mehr.', 'By day two they are all wearing them anyway. There are no clean clothes left.')) }]) },
        ],
      },
      {
        text: (c, x) => tr(`Tag zwei am Strand. Eine Gruppe aus Castrop fordert euch zum Beachsoccer heraus. Einsatz: eine Runde Sangria-Eimer. ${first(c, x.d)} hat Sonnenbrand und keine Lust.`, `Day two at the beach. A group from Castrop challenges you to beach soccer. Stake: a round of sangria buckets. ${first(c, x.d)} is sunburnt and not in the mood.`),
        options: [
          { label: tr('Annehmen – für die Ehre', 'Accept – for the honour'), effect: outcome([{ w: 2, run: (c) => (score(c, 2), adjustMood(c, 0.05), tr('Sieg im Sand! Die Castroper zahlen und singen euer Vereinslied mit. Falsch, aber laut.', 'Victory in the sand! The Castrop lot pay up and sing your club song along. Wrong, but loud.')) }, { w: 1.5, run: (c) => (score(c, 0), book(c, tr('Sangria-Eimer für Castrop', 'Sangria buckets for Castrop'), -45), tr('Verloren. 45 € für Sangria-Eimer. Die Castroper sind nett, das macht es nicht besser.', 'Lost. €45 for sangria buckets. The Castrop lot are nice, which does not make it better.')) }, { w: 1, run: (c, x) => (score(c, -1), hurt(c, x.d, 3, tr('Sonnenstich', 'sunstroke')), tr(`${first(c, x.d)} spielt doch mit und bekommt einen Sonnenstich. Er fehlt zum Saisonstart.`, `${first(c, x.d)} plays after all and gets sunstroke. He misses the start of the season.`)) }, { w: 0.8, run: (c, x) => (score(c, 2), setRelation(c, x.d, x.a, 'kumpel'), tr(`${first(c, x.d)} steht im Tor, hält alles und verbrüdert sich mit ${first(c, x.a)}. Der Sonnenbrand ist vergessen.`, `${first(c, x.d)} goes in goal, saves everything and bonds with ${first(c, x.a)}. The sunburn is forgotten.`)) }]) },
          { label: tr('Absagen, Liegestuhl', 'Decline, sunlounger'), effect: outcome([{ w: 3, run: (c) => (score(c, 0), tr('Ein ruhiger Tag. Es ist die einzige Stunde Schlaf der ganzen Reise.', 'A quiet day. It is the only hour of sleep on the whole trip.')) }, { w: 1, run: (c) => (score(c, -1), adjustMood(c, -0.03), tr('Die Castroper erzählen überall, ihr hättet gekniffen.', 'The Castrop lot tell everyone you bottled it.')) }]) },
        ],
      },
      {
        text: (c, x) => tr(`Letzte Nacht. Um 3 Uhr ruft ${first(c, x.b)} an: Er ist im falschen Hotel, ohne Schuhe, mit einem Strohhut, den er nicht kennt.`, `Last night. At 3am ${first(c, x.b)} calls: he is in the wrong hotel, without shoes, wearing a straw hat he does not recognise.`),
        options: [
          { label: tr('Rettungsmission mit dem Taxi', 'Rescue mission by taxi'), effect: outcome([{ w: 3, run: (c, x) => (score(c, 2), setRelation(c, x.b, x.a, 'kumpel'), tr(`Ihr findet ${first(c, x.b)} an der Hotelbar, mit Strohhut und drei neuen Freunden aus Holland. Die Geschichte wird jedes Jahr erzählt.`, `You find ${first(c, x.b)} at the hotel bar, with the straw hat and three new friends from Holland. The story gets told every year.`)) }, { w: 1, run: (c) => (score(c, 0), book(c, tr('Taxi (Nachtzuschlag, Umweg)', 'Taxi (night rate, detour)'), -35), tr('35 € Taxi, und er war am Ende doch im richtigen Hotel – nur im falschen Stockwerk.', '€35 on a taxi, and in the end he was in the right hotel after all – just on the wrong floor.')) }, { w: 1, run: (c) => (score(c, -1), adjustPatience(c, -8), tr('Du kommst um 6 Uhr ins Bett, um 7 geht der Flieger. Zu Hause bist du zwei Tage nicht ansprechbar.', 'You get to bed at 6am, the flight is at 7. At home you are useless for two days.')) }]) },
          { label: tr('Er ist erwachsen', 'He is a grown-up'), effect: outcome([{ w: 2, run: (c, x) => (score(c, 0), tr(`${first(c, x.b)} schafft es irgendwie zum Flughafen. Barfuß. Mit Strohhut.`, `${first(c, x.b)} somehow makes it to the airport. Barefoot. In the straw hat.`)) }, { w: 1, run: (c, x) => (score(c, -2), book(c, tr('Umbuchung Rückflug', 'Rebooked return flight'), -90), tr(`${first(c, x.b)} verpasst den Flieger. Umbuchung 90 € – der Verein streckt es vor, die Sünderkartei merkt es sich.`, `${first(c, x.b)} misses the flight. Rebooking €90 – the club lends him the money, the hall of shame remembers.`)) }, { w: 1, run: (c, x) => (score(c, 1), tr(`${first(c, x.b)} ist schon am Gate, frisch geduscht, und fragt, wo ihr wart.`, `${first(c, x.b)} is already at the gate, freshly showered, asking where you have been.`)) }]) },
        ],
      },
    ],
  },
};

export const TRIP_DEFAULT = 'harz';

export function bookTrip(c, dest = TRIP_DEFAULT) {
  const d = DESTINATIONS[dest];
  if (!d || c.tripBooked || c.cash < d.cost) return false;
  book(c, tr(`Saisonabschlussfahrt gebucht: ${d.name}`, `End-of-season trip booked: ${d.name}`), -d.cost);
  c.tripBooked = dest;
  c.trip = null;
  return true;
}

const tripDest = (c) => (typeof c.tripBooked === 'string' ? c.tripBooked : c.tripBooked ? TRIP_DEFAULT : null);

// Die Fahrt beginnt, sobald die Saison vorbei ist.
export function tripState(c) {
  const dest = tripDest(c);
  if (!dest) return null;
  if (!c.trip || c.trip.season !== c.season) {
    const rng = createRng((c.seed * 61 + c.season * 19 + 5) >>> 0);
    const list = humanClub(c).squad.filter((idx) => !isCoach(c, idx));
    const pick = () => list.splice(rng.int(0, list.length - 1), 1)[0];
    const a = pick();
    const b = pick();
    const d = pick() ?? b;
    c.trip = { dest, season: c.season, stage: 0, score: 0, log: [], cast: { a, b, d } };
  }
  return c.trip;
}

export function tripStage(c) {
  const t = tripState(c);
  if (!t || t.stage >= 3) return null;
  const st = DESTINATIONS[t.dest].stages[t.stage];
  return { n: t.stage + 1, text: st.text(c, t.cast), options: st.options.map((o) => o.label) };
}

export function tripChoose(c, choice) {
  const t = tripState(c);
  if (!t || t.stage >= 3) return null;
  const st = DESTINATIONS[t.dest].stages[t.stage];
  const opt = st.options[choice];
  if (!opt) return null;
  const rng = createRng((c.seed * 37 + c.season * 11 + t.stage * 5 + choice) >>> 0);
  const text = opt.effect(c, t.cast, rng);
  t.log.push({ q: st.text(c, t.cast), a: opt.label, text });
  t.stage++;
  if (t.stage >= 3) finishTrip(c);
  return text;
}

export const tripVerdict = (s) => (s >= 4 ? tr('legendär', 'legendary') : s >= 2 ? tr('gelungen', 'a success') : s >= 0 ? tr('ganz okay', 'all right') : tr('eher zum Vergessen', 'best forgotten'));

function finishTrip(c) {
  const t = c.trip;
  const d = DESTINATIONS[t.dest];
  t.verdict = tripVerdict(t.score);
  adjustMood(c, Math.max(-0.1, Math.min(0.15, t.score * 0.03)));
  const best = [...t.log].sort((x, y) => y.text.length - x.text.length)[0];
  chronicle(c, `${tr('Saisonabschlussfahrt', 'End-of-season trip')}: ${d.name} – ${t.verdict}. ${best ? best.text.split('.')[0] + '.' : ''}`);
}

// Saisonwechsel ohne Klicken: Die Gruppe entscheidet (immer die letzte Option).
export function autoTrip(c) {
  if (!tripDest(c)) return;
  tripState(c);
  while (c.trip.stage < 3) tripChoose(c, DESTINATIONS[c.trip.dest].stages[c.trip.stage].options.length - 1);
}

// Wie die Fahrt in die neue Saison wirkt: gelungen = weniger Absagen.
export const tripSpirit = (c) => (tripDest(c) && c.trip?.stage >= 3 && c.trip.score >= 0 ? 1 : 0);
