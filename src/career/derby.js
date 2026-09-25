// Derbys: Jede Liga hat einen echten Stadtrivalen. In der Derby-Woche kocht
// die Gruppe, am Spieltag kommen doppelt so viele Zuschauer, der Schiri zückt
// schneller Karten – und das Ergebnis schlägt doppelt auf die Stimmung.
import { book } from './finances.js';
import { addRumor, clubById, humanClub, humanFixture, leagueOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { outcome, first, sitOut, trait } from './outcomes.js';
import { pubState } from './pub.js';
import { chronicle } from './sagas.js';
import { tr } from '../core/i18n.js';

export const derbyOf = (c) => leagueOf(c).derby ?? null;
export const derbyRivalId = (c) => derbyOf(c)?.club ?? null;

export function isDerbyFixture(c, f) {
  const rival = derbyRivalId(c);
  const me = humanClub(c).id;
  return !!f && !!rival && ((f.home === me && f.away === rival) || (f.away === me && f.home === rival));
}
export const derbyThisWeek = (c) => isDerbyFixture(c, humanFixture(c));

// Nach dem Derby: Bilanz, doppelte Stimmung, ab und zu ein Chronik-Eintrag.
export function derbyResult(c, gf, ga) {
  const d = (c.derbyRecord ??= { w: 0, d: 0, l: 0 });
  const name = derbyOf(c).name;
  if (gf > ga) {
    d.w++;
    adjustMood(c, 0.15);
    if (gf - ga >= 3) chronicle(c, tr(`${name}: ${gf}:${ga}-Kantersieg gegen ${clubById(c, derbyRivalId(c)).name}. Die Stadt gehört uns.`, `${name}: a ${gf}-${ga} thrashing of ${clubById(c, derbyRivalId(c)).name}. The town belongs to us.`));
  } else if (gf < ga) {
    d.l++;
    adjustMood(c, -0.12);
  } else d.d++;
}

const opp = (c) => clubById(c, derbyRivalId(c));
const hothead = (c) => humanClub(c).squad.find((idx) => trait(c, idx, 'meckerer') || trait(c, idx, 'hart_im_nehmen'));

export const DERBY_EVENTS = {
  derby_woche: {
    weight: 80,
    needs: (c) => (derbyThisWeek(c) ? { club: derbyRivalId(c) } : null),
    text: (c) => {
      const d = c.derbyRecord;
      const bilanz = d && d.w + d.d + d.l ? tr(` Bisherige Bilanz: ${d.w} Siege, ${d.d} Remis, ${d.l} Niederlagen.`, ` Record so far: ${d.w} wins, ${d.d} draws, ${d.l} defeats.`) : '';
      return tr(`${derbyOf(c).name}! Sonntag gegen ${opp(c).name}. Deren Trainer im Kreisblatt: „Die sind eine Thekenmannschaft mit Ball."${bilanz}`, `${derbyOf(c).name}! Sunday against ${opp(c).name}. Their manager in the Kreisblatt: "They're a pub team with a ball."${bilanz}`);
    },
    options: [
      {
        label: tr('Kampfansage zurück – im Kreisblatt', 'Fire back – in the Kreisblatt'),
        effect: outcome([
          { w: 3, run: (c) => { adjustMood(c, 0.12); for (const idx of humanClub(c).squad) adjustForm(c, idx, 0.2); return tr('Die Gruppe explodiert vor Vorfreude. Jeder will spielen, keiner sagt ab.', 'The group explodes with anticipation. Everyone wants to play, nobody drops out.'); } },
          { w: 2, run: (c) => ((pubState(c).intel = { club: derbyRivalId(c), mods: { stamina: 0.04, tackling: 0.03 } }), tr('Die Antwort hängt jetzt in deren Kabine. Die sind heiß – vielleicht zu heiß für euch.', 'Your reply is now pinned up in their dressing room. They are fired up – maybe too fired up for you.')) },
          { w: 1.5, run: (c) => ((c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, 2)), adjustMood(c, 0.06), tr('Das Kreisblatt macht eine Doppelseite draus. Am Sonntag kommt die halbe Stadt.', 'The Kreisblatt makes a double-page spread of it. Sunday, half the town turns up.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.05), tr('Nachts haben die euer Tor pink angemalt. Die Jungs lachen – und wollen Rache auf dem Platz.', 'Overnight they painted your goal pink. The lads laugh – and want revenge on the pitch.')) },
          { w: (c) => (hothead(c) != null ? 1 : 0), run: (c) => { const h = hothead(c); sitOut(c, h); return tr(`${first(c, h)} hat auf Facebook nachgelegt – mit Worten, die der Verband nicht lustig findet. Eine Woche gesperrt, ausgerechnet fürs Derby.`, `${first(c, h)} piled on on Facebook – with words the league does not find funny. A one-week ban, right for the derby.`); } },
          { w: 0.6, run: (c) => (book(c, tr('Verbandsstrafe: Derby-Provokation', 'League fine: derby provocation'), -20), adjustMood(c, 0.08), tr('Der Kreis findet die Kampfansage „unsportlich": 20 € Strafe. Die Kabine findet sie großartig.', 'The league finds the challenge "unsporting": €20 fine. The dressing room thinks it is brilliant.')) },
        ]),
      },
      {
        label: tr('Ruhig bleiben – auf dem Platz antworten', 'Stay calm – answer on the pitch'),
        effect: outcome([
          { w: 3, run: (c) => { for (const idx of humanClub(c).squad) adjustForm(c, idx, 0.15); return tr('Die Jungs sind fokussiert. Kein Wort nach außen, nur Training.', 'The lads are focused. Not a word to the outside world, just training.'); } },
          { w: 2, run: (c) => (adjustMood(c, -0.05), tr('Ein paar finden, du hättest zurückschießen müssen. „Lassen wir uns das gefallen?"', 'A few think you should have hit back. "Are we just going to take that?"')) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Deren Trainer entschuldigt sich öffentlich. Sein Vorstand hat ihm den Kopf gewaschen.', 'Their manager apologises publicly. His committee gave him an earful.')) },
          { w: 1, run: () => tr('Nichts passiert. Die Ruhe vor dem Sturm.', 'Nothing happens. The calm before the storm.') },
        ]),
      },
      {
        label: tr('Nach dem Spiel gemeinsames Grillen anbieten', 'Offer a joint barbecue after the match'),
        effect: outcome([
          { w: 3, run: (c) => ((c.week.derbyFair = true), adjustMood(c, 0.05), tr('Die nehmen an. Sonntag wird es fair – danach gibt es Würstchen für beide Mannschaften.', 'They accept. Sunday stays fair – afterwards there are sausages for both teams.')) },
          { w: 2, run: (c) => (adjustMood(c, -0.08), tr('Die lachen euch aus: „Grillen? Wir grillen euch auf dem Platz."', 'They laugh at you: "Barbecue? We\'ll grill you on the pitch."')) },
          { w: 1, run: (c, ctx, rng) => (addRumor(c, rng, tr('Nach eurem Angebot meldet sich einer von drüben: „Ich hab die Nase voll bei denen, {first} hier. Nehmt ihr mich?"', 'After your offer, one of theirs gets in touch: "I\'ve had enough of that lot, {first} here. Will you take me?"')) ? tr('Einer von deren Spielern meldet sich privat bei dir. Er will wechseln – steht jetzt bei den Transfers.', 'One of their players messages you privately. He wants to switch – he is now on the transfer list.') : tr('Die sagen weder ja noch nein.', 'They say neither yes nor no.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die beiden Wirte streiten jetzt, wer grillen darf. Das Derby hat ein Vorspiel.', 'The two landlords are now arguing over who gets to do the grilling. The derby has a warm-up act.')) },
        ]),
      },
    ],
  },
};
