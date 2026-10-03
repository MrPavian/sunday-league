// Ereignisse, die es erst weiter oben gibt: Sportgericht, Kreispokal, Eintritt, die ersten Fans,
// Aufwandsentschädigung. Bisher hingen nur zwei Ereignisse an der Liga (Langlauf über 14 Saisons),
// in der Bezirksliga fühlte sich die Woche deshalb an wie im Hinterhof.
// Stufen: 3 = Kreisklasse B, 4 = Kreisliga A, 5 = Bezirksliga.
import { tr } from '../core/i18n.js';
import { humanClub } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { POKALE, pokalClub, pokalOf, roundName, roundTies } from './pokal.js';

const mark = (c, ctx) => {
  const tie = pokalOf(c, ctx.kind).ties[ctx.i];
  tie.offered = true;
  return tie;
};

const level = (c) => c.level ?? 1;
const from = (n, extra = () => ({})) => (c, rng) => (level(c) >= n ? extra(c, rng) : null);
const squad = (c) => humanClub(c).squad;
const anyone = (c, rng) => (squad(c).length ? { s: rng.pick(squad(c)) } : null);

// DFB-Spielordnung § 8: Amateur bleibt, wer neben belegten Auslagen höchstens 249,99 € im Monat
// pauschal bekommt; ab 250 € ist man Vertragsspieler (mit schriftlichem Vertrag).
export const AMATEUR_MAX_MONTH = 249.99;

export const LEAGUE_EVENTS = {
  sportgericht: {
    weight: 1,
    needs: from(3, anyone),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat am Sonntag Rot gesehen. Das Sportgericht lädt zur Verhandlung am Dienstagabend – im Nebenzimmer einer Gaststätte.`, `${first(c, ctx.s)} was sent off on Sunday. The disciplinary panel has called a hearing for Tuesday evening – in the back room of a pub.`),
    options: [
      {
        label: tr('Hingehen, mit Zeugen', 'Attend, with witnesses'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr(`Drei Mitspieler sagen aus, das Video vom Handy zeigt den Schubser vorher. Nur eine Verwarnung. ${first(c, ctx.s)} darf spielen.`, `Three teammates give evidence, the phone video shows the shove beforehand. Just a warning. ${first(c, ctx.s)} can play.`)) },
          { w: 2, run: (c, ctx) => (sitOut(c, ctx.s), book(c, tr('Sportgericht: Gebühr', 'Disciplinary panel: fee'), -20), tr(`Ein Spiel Sperre und 20 € Gebühr. Die Zeugen haben sich gegenseitig widersprochen.`, `One-match ban and a €20 fee. The witnesses contradicted each other.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.04), tr(`Gesperrt – aber die Mannschaft fand den Auftritt großartig. „Wie im Fernsehen."`, `Banned – but the team loved the performance. "Just like on telly."`)) },
        ]),
      },
      {
        label: tr('Schriftlich Stellung nehmen', 'Send a written statement'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), book(c, tr('Sportgericht: Gebühr', 'Disciplinary panel: fee'), -15), tr('Ein Spiel Sperre, 15 € Gebühr. Geht schnell, tut weh.', 'One-match ban, €15 fee. Quick, but it stings.')) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), tr(`Der Brief kommt zu spät an. Ein Spiel Sperre, ${first(c, ctx.s)} schimpft auf die Post.`, `The letter arrives too late. One-match ban, ${first(c, ctx.s)} blames the post.`)) },
        ]),
      },
      {
        label: tr('Strafe annehmen', 'Accept the punishment'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), tr(`${first(c, ctx.s)} sitzt die Sperre ab. Keine Gebühr, kein Dienstagabend im Nebenzimmer.`, `${first(c, ctx.s)} serves the ban. No fee, no Tuesday night in the back room.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustForm(c, ctx.s, -0.2), tr(`${first(c, ctx.s)} fühlt sich im Stich gelassen: „Ihr hättet wenigstens fragen können."`, `${first(c, ctx.s)} feels let down: "You could at least have asked."`)) },
        ]),
      },
    ],
  },

  spielverlegung: {
    weight: 1,
    needs: from(3),
    text: () => tr('Der Gegner beantragt eine Spielverlegung auf Mittwoch, 19:30 Uhr: „Bei uns ist Schützenfest." Ihr müsstet zustimmen.', 'The opposition want the match moved to Wednesday, 7:30pm: "It\'s our village fete." You would have to agree.'),
    options: [
      { label: tr('Zustimmen', 'Agree'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, -0.04), tr('Mittwochabend nach der Arbeit. Drei kommen direkt von der Baustelle.', 'Wednesday evening after work. Three come straight from the building site.')) }, { w: 1, run: (c) => (adjustMood(c, 0.04), book(c, tr('Dankeschön vom Gegner', 'Thank-you from the opposition'), 30), tr('Der Gegner bedankt sich mit einem Gutschein fürs Schützenfest. 30 € für die Kasse.', 'The opposition say thanks with a voucher for the fete. €30 for the kitty.')) }]) },
      { label: tr('Ablehnen – Sonntag ist Sonntag', 'Refuse – Sunday is Sunday'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.03), tr('Abgelehnt. Die Jungs nicken: Sonntag gehört dem Fußball.', 'Refused. The lads nod: Sunday belongs to football.')) }, { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Der Gegner kommt mit der halben Mannschaft und schlechter Laune. Das Spiel wird ruppig.', 'The opposition turn up with half a team and a bad mood. It gets rough.')) }]) },
    ],
  },

  // Hängt am echten Pokallos: Heimrecht gegen einen Höherklassigen – der will lieber bei sich spielen.
  pokal_los: {
    weight: 3,
    needs: (c) => {
      const me = humanClub(c).id;
      for (const kind of ['kreis', 'bezirk']) {
        const cup = pokalOf(c, kind);
        if (!cup || cup.done || cup.out) continue;
        const tie = roundTies(cup).find((t) => !t.result && !t.offered && t.home === me && cup.levels[t.away] > cup.levels[me]);
        if (tie && cup.rounds[cup.round] >= c.round) return { kind, i: cup.ties.indexOf(tie), opp: pokalClub(c, cup, tie.away).name, cup: POKALE[kind].name, round: roundName(cup) };
      }
      return null;
    },
    text: (c, ctx) => tr(`${ctx.cup}, ${ctx.round}: Ihr habt Heimrecht gegen ${ctx.opp} gezogen. Deren Kassierer ruft an: Gegen 150 € würden sie gern bei sich spielen – „mehr Zuschauer, besserer Platz".`, `${ctx.cup}, ${ctx.round}: you have drawn a home tie against ${ctx.opp}. Their treasurer calls: for €150 they would like to host – "more spectators, better pitch".`),
    options: [
      { label: tr('Heimrecht behalten', 'Keep home advantage'), effect: outcome([{ w: 2, run: (c, ctx) => (mark(c, ctx), adjustMood(c, 0.05), tr('Ihr bleibt zu Hause. Der Platzwart mäht extra kurz, die Bude bestellt doppelt Würste.', 'You stay at home. The groundsman cuts the grass extra short, the stand orders twice the sausages.')) }, { w: 1, run: (c, ctx) => (mark(c, ctx), adjustMood(c, 0.08), tr('„Hier spielt ihr nach unseren Regeln." Die Mannschaft freut sich auf den Abend.', '"Here you play by our rules." The team is looking forward to the evening.')) }]) },
      { label: tr('Verkaufen, 150 € nehmen', 'Sell it, take the €150'), effect: outcome([{ w: 1, run: (c, ctx) => {
        const tie = mark(c, ctx);
        [tie.home, tie.away] = [tie.away, tie.home];
        book(c, tr('Heimrecht verkauft', 'Home tie sold'), 150);
        adjustMood(c, -0.04);
        return tr(`150 € für die Kasse. Gespielt wird jetzt bei ${ctx.opp} – auf deren großem Platz.`, `€150 for the kitty. The tie is now at ${ctx.opp} – on their big pitch.`);
      } }]) },
    ],
  },

  eintritt: {
    weight: 1,
    needs: from(4),
    text: () => tr('Der Kassierer will am Eingang einen Euro mehr Eintritt nehmen. „Die anderen in der Kreisliga A nehmen das auch."', 'The treasurer wants to charge a euro more at the gate. "Everyone else in the Premier Division does."'),
    options: [
      { label: tr('Eintritt erhöhen', 'Raise the price'), effect: outcome([{ w: 2, run: (c) => (book(c, tr('Eintritt: höherer Preis', 'Gate: higher price'), 60), tr('60 € mehr an den nächsten Spieltagen. Opa Kurt zahlt aus Prinzip in Münzen.', '€60 more over the next matchdays. Old Kurt pays in coins on principle.')) }, { w: 1, run: (c) => (book(c, tr('Eintritt: höherer Preis', 'Gate: higher price'), 20), adjustMood(c, -0.04), tr('Ein paar Stammzuschauer schauen jetzt vom Zaun hinter dem Tor zu. Umsonst.', 'A few regulars now watch from the fence behind the goal. For free.')) }]) },
      { label: tr('Bleibt wie es ist', 'Keep it as it is'), effect: outcome([{ w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die Rentner am Geländer sind dankbar und bringen Kuchen mit.', 'The pensioners on the rail are grateful and bring cake.')) }]) },
    ],
  },

  trommler: {
    weight: 1,
    needs: from(4),
    text: () => tr('Drei Jugendliche stehen seit zwei Wochen mit Trommel und selbstgemalter Fahne hinter dem Tor. Jetzt fragen sie, ob sie ein Banner an den Zaun hängen dürfen.', 'For two weeks three teenagers have stood behind the goal with a drum and a homemade flag. Now they ask if they can hang a banner on the fence.'),
    options: [
      { label: tr('Klar! Und Freibier für die Fans', 'Of course! And a free drink for the fans'), effect: outcome([{ w: 3, run: (c) => (adjustMood(c, 0.08), book(c, tr('Limo für die Fans', 'Pop for the fans'), -10), tr('Limo statt Bier – sie sind 15. Das Banner: „Kanal-Ultras seit 2 Wochen".', 'Pop instead of beer – they are 15. The banner: "Canal Ultras for 2 weeks".')) }, { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die Trommel ist beim Elfmeter des Gegners lauter als der Schiri. Der Gegner verschießt.', 'The drum is louder than the referee during the opposition penalty. They miss.')) }]) },
      { label: tr('Banner ja, Trommel nein', 'Banner yes, drum no'), effect: outcome([{ w: 2, run: () => tr('Die Nachbarn sind froh. Die Jungs trommeln jetzt auf einem Eimer. Leiser.', 'The neighbours are relieved. The lads now drum on a bucket. Quieter.') }, { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Beleidigt. Nächste Woche stehen sie beim Gegner.', 'Offended. Next week they stand with the opposition.')) }]) },
    ],
  },

  stadionsprecher: {
    weight: 0.8,
    needs: from(4, anyone),
    text: () => tr('Ein Rentner aus der Nachbarschaft bietet sich als Stadionsprecher an. Er hat eine eigene Anlage. Und sehr viele Meinungen.', 'A pensioner from down the road offers to be the stadium announcer. He has his own PA. And a lot of opinions.'),
    options: [
      { label: tr('Mikrofon frei', 'Hand him the mic'), effect: outcome([{ w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), tr(`Er kündigt jeden Spieler einzeln an. ${first(c, ctx.s)} bekommt einen Spitznamen und spielt wie verwandelt.`, `He announces every player by name. ${first(c, ctx.s)} gets a nickname and plays like a new man.`)) }, { w: 1, run: (c) => (book(c, tr('Verbandsstrafe: Durchsage', 'FA fine: tannoy remark'), -15), tr('Seine Durchsage über den Schiri landet im Spielbericht. 15 € Strafe.', 'His tannoy remark about the referee goes in the match report. €15 fine.')) }]) },
      { label: tr('Danke, lieber nicht', 'Thanks, but no'), effect: outcome([{ w: 1, run: () => tr('Er steht trotzdem jeden Sonntag am Geländer und kommentiert. Halt ohne Anlage.', 'He still stands at the rail every Sunday commentating. Just without the PA.') }]) },
    ],
  },

  videoanalyse: {
    weight: 0.8,
    needs: from(4, anyone),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat die letzten Spiele mit dem Handy vom Tribünendach gefilmt und will vor dem Training Videoanalyse machen. Mit Beamer im Vereinsheim.`, `${first(c, ctx.s)} has filmed the last few matches on his phone from the stand roof and wants to do video analysis before training. With a projector in the clubhouse.`),
    options: [
      { label: tr('Machen wir', "Let's do it"), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.04), tr('Man sieht vor allem, wie oft die Viererkette eine Dreierkette ist. Lehrreich.', 'Mostly you see how often the back four is a back three. Educational.')) }, { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Zwanzig Minuten Zeitlupe vom eigenen Fehlpass. Einer verlässt beleidigt den Raum.', 'Twenty minutes of slow motion of your own misplaced pass. Someone storms out.')) }]) },
      { label: tr('Lieber auf den Platz', 'Rather get out on the pitch'), effect: outcome([{ w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.1), tr(`${first(c, ctx.s)} zeigt die Videos jetzt in der Chatgruppe. Mit Kommentaren.`, `${first(c, ctx.s)} now posts the videos in the group chat. With commentary.`)) }]) },
    ],
  },

  testspiel_profi: {
    weight: 0.7,
    needs: from(4),
    text: () => tr('Die U23 eines Profivereins sucht in der Winterpause einen Testspielgegner. Sie zahlen die Schiris und bringen eigene Bälle mit.', 'The under-23s of a professional club need a friendly opponent in the winter break. They pay the referees and bring their own balls.'),
    options: [
      { label: tr('Zusagen', 'Accept'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.06), tr('0:7. Aber alle haben ein Foto mit einem, der schon mal auf der Bank in der Bundesliga saß.', 'Lost 7-0. But everyone has a photo with a lad who once sat on a Bundesliga bench.')) }, { w: 1, run: (c) => (adjustMood(c, -0.05), tr('0:11 und zwei Zerrungen. Die Profis waren nett, aber sehr schnell.', 'Lost 11-0 and two strains. The pros were nice, but very fast.')) }]) },
      { label: tr('Absagen', 'Decline'), effect: outcome([{ w: 1, run: () => tr('Lieber ein Testspiel gegen den Nachbarort. Da gewinnt man wenigstens manchmal.', 'Rather a friendly against the next village. At least you win sometimes.') }]) },
    ],
  },

  ae_forderung: {
    weight: 1,
    needs: from(5, anyone),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat ein Angebot aus der Landesliga und will mehr Aufwandsentschädigung. Erlaubt sind für Amateure höchstens 249,99 € im Monat (DFB-Spielordnung § 8) – er will genau das.`, `${first(c, ctx.s)} has an offer from a higher league and wants more expenses. Amateurs may get at most €249.99 a month (DFB rules § 8) – that is exactly what he wants.`),
    options: [
      { label: tr('Zahlen, bis zur Grenze', 'Pay it, up to the limit'), effect: outcome([{ w: 3, run: (c, ctx) => (book(c, tr('Aufwandsentschädigung: Erhöhung', 'Expenses: increase'), -100), adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} bleibt. Die anderen fragen sich, was sie verdienen.`, `${first(c, ctx.s)} stays. The others wonder what they are getting.`)) }, { w: 1, run: (c, ctx) => (book(c, tr('Aufwandsentschädigung: Erhöhung', 'Expenses: increase'), -100), adjustMood(c, -0.06), tr('Am nächsten Tag stehen drei weitere vor der Tür des Kassierers.', 'The next day three more are at the treasurer\'s door.')) }]) },
      { label: tr('Nein – hier spielt man wegen der Jungs', 'No – you play here for the lads'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.04), tr('Er bleibt. Grummelnd, aber er bleibt.', 'He stays. Grumbling, but he stays.')) }, { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), tr(`${first(c, ctx.s)} meldet sich diese Woche krank. Beim Probetraining drüben, sagt man.`, `${first(c, ctx.s)} calls in sick this week. At a trial over there, rumour has it.`)) }]) },
    ],
  },

  ordnerdienst: {
    weight: 0.8,
    needs: from(5),
    text: () => tr('Zum Spitzenspiel verlangt der Kreis einen Ordnerdienst mit Warnwesten. Ihr habt zwei Westen und den Platzwart.', 'For the top-of-the-table clash the FA requires stewards in hi-vis vests. You have two vests and the groundsman.'),
    options: [
      { label: tr('Westen kaufen, Eltern fragen', 'Buy vests, ask the parents'), effect: outcome([{ w: 3, run: (c) => (book(c, tr('Warnwesten', 'Hi-vis vests'), -25), adjustMood(c, 0.03), tr('Acht Ordner, alle stolz. Einer weist den Bus des Gegners auf den Fahrradweg ein.', 'Eight stewards, all proud. One directs the away coach onto the cycle path.')) }]) },
      { label: tr('Spieler machen das selbst', 'The players do it themselves'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, -0.04), tr('Wer nicht spielt, steht mit Weste am Eingang. Die Ersatzbank ist beleidigt.', 'Whoever is not playing stands at the gate in a vest. The bench is offended.')) }, { w: 1, run: (c) => (book(c, tr('Verbandsstrafe: Ordnerdienst', 'FA fine: stewarding'), -50), tr('Der Beobachter des Kreises zählt nach: zu wenige. 50 € Strafe.', 'The FA observer counts: too few. €50 fine.')) }]) },
    ],
  },
};
