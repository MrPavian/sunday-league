// Derbys: Jede Liga hat einen echten Stadtrivalen. In der Derby-Woche kocht
// die Gruppe, am Spieltag kommen doppelt so viele Zuschauer, der Schiri zückt
// schneller Karten – und das Ergebnis schlägt doppelt auf die Stimmung.
import { book } from './finances.js';
import { addRumor, clubById, humanClub, humanFixture, leagueOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { outcome, first, sitOut, trait } from './outcomes.js';
import { pubState } from './pub.js';
import { chronicle } from './sagas.js';

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
    if (gf - ga >= 3) chronicle(c, `${name}: ${gf}:${ga}-Kantersieg gegen ${clubById(c, derbyRivalId(c)).name}. Die Stadt gehört uns.`);
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
      const bilanz = d && d.w + d.d + d.l ? ` Bisherige Bilanz: ${d.w} Siege, ${d.d} Remis, ${d.l} Niederlagen.` : '';
      return `${derbyOf(c).name}! Sonntag gegen ${opp(c).name}. Deren Trainer im Kreisblatt: „Die sind eine Thekenmannschaft mit Ball."${bilanz}`;
    },
    options: [
      {
        label: 'Kampfansage zurück – im Kreisblatt',
        effect: outcome([
          { w: 3, run: (c) => { adjustMood(c, 0.12); for (const idx of humanClub(c).squad) adjustForm(c, idx, 0.2); return 'Die Gruppe explodiert vor Vorfreude. Jeder will spielen, keiner sagt ab.'; } },
          { w: 2, run: (c) => ((pubState(c).intel = { club: derbyRivalId(c), mods: { stamina: 0.04, tackling: 0.03 } }), 'Die Antwort hängt jetzt in deren Kabine. Die sind heiß – vielleicht zu heiß für euch.') },
          { w: 1.5, run: (c) => ((c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, 2)), adjustMood(c, 0.06), 'Das Kreisblatt macht eine Doppelseite draus. Am Sonntag kommt die halbe Stadt.') },
          { w: 1, run: (c) => (adjustMood(c, 0.05), 'Nachts haben die euer Tor pink angemalt. Die Jungs lachen – und wollen Rache auf dem Platz.') },
          { w: (c) => (hothead(c) != null ? 1 : 0), run: (c) => { const h = hothead(c); sitOut(c, h); return `${first(c, h)} hat auf Facebook nachgelegt – mit Worten, die der Verband nicht lustig findet. Eine Woche gesperrt, ausgerechnet fürs Derby.`; } },
          { w: 0.6, run: (c) => (book(c, 'Verbandsstrafe: Derby-Provokation', -20), adjustMood(c, 0.08), 'Der Kreis findet die Kampfansage „unsportlich": 20 € Strafe. Die Kabine findet sie großartig.') },
        ]),
      },
      {
        label: 'Ruhig bleiben – auf dem Platz antworten',
        effect: outcome([
          { w: 3, run: (c) => { for (const idx of humanClub(c).squad) adjustForm(c, idx, 0.15); return 'Die Jungs sind fokussiert. Kein Wort nach außen, nur Training.'; } },
          { w: 2, run: (c) => (adjustMood(c, -0.05), 'Ein paar finden, du hättest zurückschießen müssen. „Lassen wir uns das gefallen?"') },
          { w: 1, run: (c) => (adjustMood(c, 0.04), 'Deren Trainer entschuldigt sich öffentlich. Sein Vorstand hat ihm den Kopf gewaschen.') },
          { w: 1, run: () => 'Nichts passiert. Die Ruhe vor dem Sturm.' },
        ]),
      },
      {
        label: 'Nach dem Spiel gemeinsames Grillen anbieten',
        effect: outcome([
          { w: 3, run: (c) => ((c.week.derbyFair = true), adjustMood(c, 0.05), 'Die nehmen an. Sonntag wird es fair – danach gibt es Würstchen für beide Mannschaften.') },
          { w: 2, run: (c) => (adjustMood(c, -0.08), 'Die lachen euch aus: „Grillen? Wir grillen euch auf dem Platz."') },
          { w: 1, run: (c, ctx, rng) => (addRumor(c, rng, 'Nach eurem Angebot meldet sich einer von drüben: „Ich hab die Nase voll bei denen, {first} hier. Nehmt ihr mich?"') ? 'Einer von deren Spielern meldet sich privat bei dir. Er will wechseln – steht jetzt bei den Transfers.' : 'Die sagen weder ja noch nein.') },
          { w: 1, run: (c) => (adjustMood(c, 0.03), 'Die beiden Wirte streiten jetzt, wer grillen darf. Das Derby hat ein Vorspiel.') },
        ]),
      },
    ],
  },
};
