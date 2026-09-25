// Die Saisonabschlussfahrt als kleine Geschichte: Ziel wählen, drei Etappen,
// jede Entscheidung würfelt aus mehreren Ausgängen. Was auf Mallorca passiert,
// bleibt auf Mallorca – außer in der Vereinschronik.
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
    name: 'Kegeltour ins Sauerland',
    cost: 120,
    desc: 'Zwei Tage, eine Kegelbahn, ein Gasthof mit Doppelzimmern und Etagendusche.',
    stages: [
      {
        text: (c, x) => `Samstag, 8 Uhr, Bahnhof. ${first(c, x.a)} hat einen Bollerwagen mit drei Kästen dabei. Der Zug fährt um 8:12.`,
        options: [
          { label: 'Bollerwagen mit in den Zug', effect: outcome([{ w: 3, run: (c) => (score(c, 1), 'Der Schaffner drückt ein Auge zu. Das Abteil singt bis Siegen.') }, { w: 1, run: (c) => (score(c, -1), book(c, 'Bußgeld Zugbegleiter', -40), '40 € Strafe wegen „Ruhestörung in Tateinheit mit Schlager".') }, { w: 1, run: (c, x) => (score(c, 1), setRelation(c, x.a, x.b, 'kumpel'), `${first(c, x.a)} und ${first(c, x.b)} teilen sich den letzten Sitzplatz – auf dem Bollerwagen. Seitdem unzertrennlich.`) }]) },
          { label: 'Kästen bleiben am Bahnhof', effect: outcome([{ w: 3, run: (c) => (score(c, 0), 'Vernünftig. Am Zielbahnhof gibt es einen Kiosk.') }, { w: 1, run: (c, x) => (score(c, -1), (c.players[x.a] && (c.players[x.a].grumpy = 2)), `${first(c, x.a)} redet den ganzen Tag nicht mit dir.`) }, { w: 1, run: (c) => (score(c, 1), 'Ein Obdachloser freut sich über drei Kästen. Die Jungs finden das eine gute Tat.') }]) },
        ],
      },
      {
        text: (c, x) => `Kegelabend im Gasthof „Zur Klaue". Der Wirt schlägt einen Wettkampf gegen den örtlichen Kegelclub vor. Einsatz: die Zeche.`,
        options: [
          { label: 'Wette annehmen', effect: outcome([{ w: 2, run: (c) => (score(c, 2), book(c, 'Zeche gewonnen', 60), 'Gewonnen! Die Kegelbrüder zahlen die Zeche – 60 € gespart.') }, { w: 2, run: (c) => (score(c, 0), book(c, 'Zeche verloren', -60), 'Die Kegelbrüder sind Profis. 60 € für die Zeche.') }, { w: 1, run: (c, x) => (score(c, 1), hurt(c, x.b, 1, 'Kegelfinger'), `${first(c, x.b)} bleibt mit dem Finger in der Kugel stecken. Die Feuerwehr kommt. Es ist der beste Abend des Jahres.`) }]) },
          { label: 'Nur unter uns kegeln', effect: outcome([{ w: 3, run: (c) => (score(c, 1), 'Gemütlich. Der Torwart gewinnt, weil er als Einziger nüchtern ist.') }, { w: 1, run: (c, x) => (score(c, -1), setRelation(c, x.a, x.d, 'rivalen'), `${first(c, x.a)} und ${first(c, x.d)} streiten über eine Pumpe. Seitdem reden sie nur noch über den Kapitän miteinander.`) }]) },
        ],
      },
      {
        text: (c, x) => `Sonntagmorgen. Der Gasthof hat Frühstück bis 9 Uhr. Es ist 9:40. ${first(c, x.d)} fehlt.`,
        options: [
          { label: 'Alle suchen gemeinsam', effect: outcome([{ w: 3, run: (c, x) => (score(c, 1), `${first(c, x.d)} liegt im Kegelbahn-Lager auf den Pins und schläft. Foto fürs Vereinsheim.`) }, { w: 1, run: (c, x) => (score(c, 2), setRelation(c, x.d, x.b, 'kumpel'), `${first(c, x.d)} hat bei einer Familie im Dorf übernachtet und bringt Kuchen mit. Legende.`) }, { w: 1, run: (c) => (score(c, -1), book(c, 'Sammeltaxi nach Hause (Zug verpasst)', -45), 'Die Suche dauert so lange, dass ihr den Zug verpasst. 45 € Sammeltaxi.') }]) },
          { label: 'Der findet schon heim', effect: outcome([{ w: 2, run: (c, x) => (score(c, 0), `${first(c, x.d)} ist schon zu Hause. Er ist um 5 Uhr mit dem Milchwagen gefahren.`) }, { w: 1, run: (c, x) => (score(c, -2), (c.players[x.d] && (c.players[x.d].grumpy = 3)), `${first(c, x.d)} ist sauer: „Keiner hat mich gesucht." Er hat nicht ganz unrecht.`) }]) },
        ],
      },
    ],
  },
  harz: {
    name: 'Hüttenwochenende im Harz',
    cost: 250,
    desc: 'Eine Hütte, ein Kamin, eine Wanderung, die keiner machen will.',
    stages: [
      {
        text: (c, x) => `Anreise im Konvoi. ${first(c, x.a)} fährt vorne und schwört auf sein Navi. Nach zwei Stunden steht ihr vor einem Steinbruch.`,
        options: [
          { label: 'Dem Navi vertrauen', effect: outcome([{ w: 2, run: (c) => (score(c, 1), 'Irgendwann ist die Hütte da. Nach vier Stunden und drei Dörfern mit Blasmusik.') }, { w: 1, run: (c) => (score(c, -1), book(c, 'Abschleppdienst (Feldweg)', -50), 'Ein Auto sitzt im Feldweg fest. 50 € Abschleppdienst.') }, { w: 1, run: (c, x) => (score(c, 2), `Unterwegs findet ihr eine Dorfkirmes. ${first(c, x.a)} gewinnt einen Riesenteddy. Er fährt mit.`) }]) },
          { label: 'Den Förster fragen', effect: outcome([{ w: 3, run: (c) => (score(c, 1), 'Der Förster zeigt den Weg und kommt abends auf ein Bier vorbei.') }, { w: 1, run: (c, x) => (score(c, 0), (c.players[x.a] && (c.players[x.a].grumpy = 1)), `${first(c, x.a)} ist gekränkt, dass keiner seinem Navi glaubt.`) }]) },
        ],
      },
      {
        text: (c, x) => `Samstag: Die geplante Wanderung zum Brocken, 14 Kilometer. ${first(c, x.b)} fragt, ob man nicht einfach die Bimmelbahn nehmen kann.`,
        options: [
          { label: 'Alle wandern – Teambuilding!', effect: outcome([{ w: 2, run: (c) => (score(c, 2), adjustEnergy(c, 5), 'Oben auf dem Brocken: Nebel, Wind, Gipfelschnaps. Keiner sieht was, alle sind glücklich.') }, { w: 1.5, run: (c, x) => (score(c, 0), hurt(c, x.b, 2, 'Blasen an beiden Füßen'), `${first(c, x.b)} läuft in neuen Schuhen. Zwei Wochen Blasen – er humpelt in die Vorbereitung.`) }, { w: 1, run: (c, x) => (score(c, 1), setRelation(c, x.b, x.d, 'kumpel'), `${first(c, x.b)} und ${first(c, x.d)} bleiben als Letzte zurück und reden zum ersten Mal richtig. Jetzt Kumpels.`) }, { w: 0.6, run: (c) => (score(c, -2), 'Gewitter auf halber Strecke. Nass bis auf die Knochen, und die Laune ist im Keller.') }]) },
          { label: 'Bimmelbahn und Bratwurst', effect: outcome([{ w: 3, run: (c) => (score(c, 1), 'Oben in 40 Minuten, Bratwurst in 41. Ein perfekter Tag.') }, { w: 1, run: (c) => (score(c, 0), book(c, 'Brockenbahn für alle', -60), 'Die Bahn kostet mehr als gedacht. 60 € aus der Kasse.') }]) },
        ],
      },
      {
        text: () => 'Letzter Abend am Kamin. Jemand holt die Gitarre raus. Dann wird es ernst: Wer hält die Rede auf die Saison?',
        options: [
          { label: 'Du hältst die Rede', effect: outcome([{ w: 3, run: (c) => (score(c, 2), adjustMood(c, 0.05), 'Du sprichst über Zusammenhalt und die Pfostenschüsse der Hinrunde. Zwei weinen. Einer tut so, als wäre es der Rauch.') }, { w: 1, run: (c) => (score(c, 0), 'Die Rede ist zu lang. Irgendwann schläft der Torwart.') }, { w: 1, run: (c) => (score(c, 1), adjustPatience(c, 5), 'Du rufst zu Hause an und erzählst es der Familie. Sie findet die Rede auch gut.') }]) },
          { label: 'Der Kapitän soll', effect: outcome([{ w: 2, run: (c, x) => (score(c, 1), `${first(c, x.a)} redet kurz und trifft genau den Ton. Standing Ovations im Kaminzimmer.`) }, { w: 1, run: (c, x) => (score(c, -1), setRelation(c, x.a, x.b, 'rivalen'), `${first(c, x.a)} rechnet in der Rede mit ${first(c, x.b)} ab. Das Kaminfeuer ist das Wärmste im Raum.`) }, { w: 1, run: (c) => (score(c, 2), 'Statt einer Rede gibt es ein Lied. Es wird die neue Vereinshymne.') }]) },
        ],
      },
    ],
  },
  mallorca: {
    name: 'Mallorca, Ballermann',
    cost: 450,
    desc: 'Vier Tage Playa de Palma. Gleiche T-Shirts, Spitznamen auf dem Rücken, wenig Schlaf.',
    stages: [
      {
        text: (c, x) => `Flughafen, 5 Uhr früh. ${first(c, x.a)} hat für alle T-Shirts drucken lassen: vorne das Vereinswappen, hinten Spitznamen. Deiner lautet „Taktikfuchs (angeblich)".`,
        options: [
          { label: 'Stolz anziehen', effect: outcome([{ w: 3, run: (c) => (score(c, 1), 'Die ganze Reihe 23 bis 27 trägt das Shirt. Die Stewardess will auch eins.') }, { w: 1, run: (c, x) => (score(c, -1), (c.players[x.b] && (c.players[x.b].grumpy = 2)), `${first(c, x.b)} findet seinen Spitznamen „Luftloch-Larry" gar nicht lustig.`) }, { w: 1, run: (c) => (score(c, 2), (c.flags.pressWeeks = 2), 'Das Kreisblatt druckt das Gruppenfoto. Titel: „Die fliegen hoch".') }]) },
          { label: 'Nur im Koffer lassen', effect: outcome([{ w: 2, run: (c, x) => (score(c, -1), `${first(c, x.a)} ist enttäuscht. 120 € für T-Shirts, die keiner trägt.`) }, { w: 1, run: (c) => (score(c, 0), 'Am zweiten Tag tragen sie doch alle. Es gibt keine sauberen mehr.') }]) },
        ],
      },
      {
        text: (c, x) => `Tag zwei am Strand. Eine Gruppe aus Castrop fordert euch zum Beachsoccer heraus. Einsatz: eine Runde Sangria-Eimer. ${first(c, x.d)} hat Sonnenbrand und keine Lust.`,
        options: [
          { label: 'Annehmen – für die Ehre', effect: outcome([{ w: 2, run: (c) => (score(c, 2), adjustMood(c, 0.05), 'Sieg im Sand! Die Castroper zahlen und singen euer Vereinslied mit. Falsch, aber laut.') }, { w: 1.5, run: (c) => (score(c, 0), book(c, 'Sangria-Eimer für Castrop', -45), 'Verloren. 45 € für Sangria-Eimer. Die Castroper sind nett, das macht es nicht besser.') }, { w: 1, run: (c, x) => (score(c, -1), hurt(c, x.d, 3, 'Sonnenstich'), `${first(c, x.d)} spielt doch mit und bekommt einen Sonnenstich. Er fehlt zum Saisonstart.`) }, { w: 0.8, run: (c, x) => (score(c, 2), setRelation(c, x.d, x.a, 'kumpel'), `${first(c, x.d)} steht im Tor, hält alles und verbrüdert sich mit ${first(c, x.a)}. Der Sonnenbrand ist vergessen.`) }]) },
          { label: 'Absagen, Liegestuhl', effect: outcome([{ w: 3, run: (c) => (score(c, 0), 'Ein ruhiger Tag. Es ist die einzige Stunde Schlaf der ganzen Reise.') }, { w: 1, run: (c) => (score(c, -1), adjustMood(c, -0.03), 'Die Castroper erzählen überall, ihr hättet gekniffen.') }]) },
        ],
      },
      {
        text: (c, x) => `Letzte Nacht. Um 3 Uhr ruft ${first(c, x.b)} an: Er ist im falschen Hotel, ohne Schuhe, mit einem Strohhut, den er nicht kennt.`,
        options: [
          { label: 'Rettungsmission mit dem Taxi', effect: outcome([{ w: 3, run: (c, x) => (score(c, 2), setRelation(c, x.b, x.a, 'kumpel'), `Ihr findet ${first(c, x.b)} an der Hotelbar, mit Strohhut und drei neuen Freunden aus Holland. Die Geschichte wird jedes Jahr erzählt.`) }, { w: 1, run: (c) => (score(c, 0), book(c, 'Taxi (Nachtzuschlag, Umweg)', -35), '35 € Taxi, und er war am Ende doch im richtigen Hotel – nur im falschen Stockwerk.') }, { w: 1, run: (c) => (score(c, -1), adjustPatience(c, -8), 'Du kommst um 6 Uhr ins Bett, um 7 geht der Flieger. Zu Hause bist du zwei Tage nicht ansprechbar.') }]) },
          { label: 'Er ist erwachsen', effect: outcome([{ w: 2, run: (c, x) => (score(c, 0), `${first(c, x.b)} schafft es irgendwie zum Flughafen. Barfuß. Mit Strohhut.`) }, { w: 1, run: (c, x) => (score(c, -2), book(c, 'Umbuchung Rückflug', -90), `${first(c, x.b)} verpasst den Flieger. Umbuchung 90 € – der Verein streckt es vor, die Sünderkartei merkt es sich.`) }, { w: 1, run: (c, x) => (score(c, 1), `${first(c, x.b)} ist schon am Gate, frisch geduscht, und fragt, wo ihr wart.`) }]) },
        ],
      },
    ],
  },
};

export const TRIP_DEFAULT = 'harz';

export function bookTrip(c, dest = TRIP_DEFAULT) {
  const d = DESTINATIONS[dest];
  if (!d || c.tripBooked || c.cash < d.cost) return false;
  book(c, `Saisonabschlussfahrt gebucht: ${d.name}`, -d.cost);
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

export const tripVerdict = (s) => (s >= 4 ? 'legendär' : s >= 2 ? 'gelungen' : s >= 0 ? 'ganz okay' : 'eher zum Vergessen');

function finishTrip(c) {
  const t = c.trip;
  const d = DESTINATIONS[t.dest];
  t.verdict = tripVerdict(t.score);
  adjustMood(c, Math.max(-0.1, Math.min(0.15, t.score * 0.03)));
  const best = [...t.log].sort((x, y) => y.text.length - x.text.length)[0];
  chronicle(c, `Saisonabschlussfahrt: ${d.name} – ${t.verdict}. ${best ? best.text.split('.')[0] + '.' : ''}`);
}

// Saisonwechsel ohne Klicken: Die Gruppe entscheidet (immer die letzte Option).
export function autoTrip(c) {
  if (!tripDest(c)) return;
  tripState(c);
  while (c.trip.stage < 3) tripChoose(c, DESTINATIONS[c.trip.dest].stages[c.trip.stage].options.length - 1);
}

// Wie die Fahrt in die neue Saison wirkt: gelungen = weniger Absagen.
export const tripSpirit = (c) => (tripDest(c) && c.trip?.stage >= 3 && c.trip.score >= 0 ? 1 : 0);
