// Vereinsleben: Ereignisse in der Chatgruppe mit Entscheidungen und Folgen,
// Teamstimmung, Tagesform und mehrwöchige Geschichten.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { getPool, humanClub, joinSquad, playerOf, releasePlayer } from './career.js';
import { advanceStories, arcsOf, STORY_STARTS, storyDecision } from './stories.js';
import { CRISES, PERSONAL_EVENTS } from './personal.js';
import { SAGA_EVENTS } from './sagas.js';
import { SOCIAL_EVENTS } from './social.js';
import { DERBY_EVENTS, derbyThisWeek } from './derby.js';
import { INJURY_EVENTS } from './injuries.js';
import { LIFE_EVENTS } from './life.js';
import { ACADEMY_EVENTS } from './academy.js';
import { SPONSOR_EVENTS } from './sponsors.js';
import { applyTwist } from './twists.js';
import { canLose, joinRival, leaveTeam, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { setRelation } from './relations.js';

const EVENT_CHANCE = 0.65; // pro Woche
const NO_REPEAT = 4; // Wochen, bevor dasselbe Ereignis wiederkommen darf

// --- Stimmung & Form -------------------------------------------------------------

export const clamp1 = (v) => Math.max(-1, Math.min(1, v));
export const mood = (career) => career.mood ?? 0;
export function adjustMood(career, d) {
  career.mood = clamp1(mood(career) + d);
}
// Anzeige der Stimmung (moodLabel bleibt der interne Schlüssel, z. B. für CSS-Klassen).
export const moodText = (v) => tr({ super: 'super', gut: 'gut', okay: 'okay', angespannt: 'angespannt', mies: 'mies' }, { super: 'great', gut: 'good', okay: 'okay', angespannt: 'tense', mies: 'awful' })[moodLabel(v)];

export function moodLabel(v) {
  if (v >= 0.45) return 'super';
  if (v >= 0.15) return 'gut';
  if (v > -0.15) return 'okay';
  if (v > -0.45) return 'angespannt';
  return 'mies';
}

// Tagesform eines Spielers (-1 … +1) für den nächsten Spieltag.
export function adjustForm(career, idx, d) {
  const rec = career.players[idx];
  if (rec) rec.form = clamp1((rec.form ?? 0) + d);
}

// Wirkung der Form auf die Werte im Match: ±8 %.
export function applyForm(p, rec, teamMood = 0) {
  const f = (rec?.form ?? 0) + teamMood * 0.3;
  if (!f) return p;
  for (const k of ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling']) p.attrs[k] = Math.max(0.05, Math.min(0.98, p.attrs[k] * (1 + 0.08 * f)));
  return p;
}

// Ende der Woche: Form und Stimmung klingen ab, Teamchemie-Typen heben die Laune.
export function weeklyMood(career) {
  const club = humanClub(career);
  const chemists = club.squad.filter((idx) => playerOf(career, idx).traits.includes('teamchemie')).length;
  career.mood = clamp1(mood(career) * 0.88 + Math.min(0.06, chemists * 0.02));
  for (const idx of club.squad) {
    const rec = career.players[idx];
    if (!rec) continue;
    rec.form = (rec.form ?? 0) * 0.5;
    if (rec.grumpy > 0) rec.grumpy--;
  }
  if (career.flags?.pressWeeks > 0) career.flags.pressWeeks--;
}

// Ergebnis schlägt auf die Laune.
export function resultMood(career, goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) adjustMood(career, 0.1);
  else if (goalsFor < goalsAgainst) adjustMood(career, -0.07);
}

// Absage-Faktor aus Stimmung und Frust eines Spielers.
export function absenceFactor(career, idx) {
  const rec = career.players[idx];
  return (1 - mood(career) * 0.3) * (rec?.grumpy > 0 ? 1.8 : 1) * (rec?.absenceMul ?? (rec?.movedAway ? 3 : 1)) * (rec?.loyal ? 0.8 : 1);
}

// --- Hilfen für die Ereignisse -----------------------------------------------------

const first = (career, idx) => playerOf(career, idx).name.split(' ')[0];
const squad = (career) => humanClub(career).squad;
const say = (career, from, text, time = 'Sa 11:20') => career.week.chat.push({ from, text, time });

function pickSubject(career, rng, filter = () => true) {
  const list = squad(career).filter((idx) => filter(idx, playerOf(career, idx), career.players[idx]));
  return list.length ? rng.pick(list) : null;
}

// --- Die Ereignisse ------------------------------------------------------------------
// needs(career, rng) → Kontext oder null (dann passt das Ereignis gerade nicht).
// options[i].effect(career, ctx, rng) → Ergebnistext.

export const EVENTS = {
  vereinsheim: {
    weight: 3,
    needs: () => ({}),
    text: () => tr('Freitagabend im Vereinsheim? Die Zapfanlage ist frisch gereinigt.', 'Friday night at the clubhouse? The beer taps have just been cleaned.'),
    options: [
      {
        label: tr('Freibier – ich zahl die erste Runde (40 €)', 'Free beer – first round is on me (€40)'),
        effect: outcome([
          {
            w: 4,
            run: (c, ctx, rng) => {
              book(c, tr('Freibier im Vereinsheim', 'Free beer at the clubhouse'), -40);
              adjustMood(c, 0.25);
              const hung = [...squad(c)].sort(() => rng.next() - 0.5).slice(0, 2);
              for (const idx of hung) adjustForm(c, idx, -0.6);
              return tr(`Legendärer Abend. ${hung.map((i) => first(c, i)).join(' und ')} sind Sonntag noch nicht ganz nüchtern.`, `Legendary night. ${hung.map((i) => first(c, i)).join(' and ')} are still not quite sober on Sunday.`);
            },
          },
          { w: 2, run: (c) => (book(c, tr('Freibier im Vereinsheim', 'Free beer at the clubhouse'), -40), adjustMood(c, 0.18), tr('Schöner Abend, alle um Mitternacht zu Hause. Fast schon verdächtig vernünftig.', 'Nice evening, everyone home by midnight. Almost suspiciously sensible.')) },
          {
            w: 1.5,
            run: (c, ctx, rng) => {
              book(c, tr('Freibier im Vereinsheim', 'Free beer at the clubhouse'), -65);
              adjustMood(c, 0.2);
              const s = rng.pick(squad(c));
              return tr(`Aus einer Runde wurden sieben. 65 € weg, und ${first(c, s)} hat auf dem Tisch „Atemlos" gesungen. Es gibt Videos.`, `One round became seven. €65 gone, and ${first(c, s)} sang Schlager standing on the table. There are videos.`);
            },
          },
          {
            w: 1,
            run: (c, ctx, rng) => {
              book(c, tr('Freibier im Vereinsheim', 'Free beer at the clubhouse'), -40);
              const [a, b] = [...squad(c)].sort(() => rng.next() - 0.5);
              c.players[b].grumpy = 2;
              adjustMood(c, 0.05);
              return tr(`Um eins geraten ${first(c, a)} und ${first(c, b)} über eine alte Schiri-Entscheidung aneinander. ${first(c, b)} geht wütend nach Hause.`, `At one in the morning ${first(c, a)} and ${first(c, b)} fall out over an old refereeing decision. ${first(c, b)} storms off home.`);
            },
          },
          {
            w: (c) => (canLose(c) ? 0.4 : 0),
            run: (c, ctx, rng) => {
              book(c, tr('Freibier im Vereinsheim', 'Free beer at the clubhouse'), -40);
              const s = rng.pick(squad(c).filter((i) => !isCoach(c, i)));
              adjustMood(c, 0.1);
              if (leaveTeam(c, s)) return tr(`Der Abend eskaliert. ${first(c, s)} beleidigt den Wirt, fliegt raus – und schreibt am Sonntag: „Ich hör auf. War eh nichts für mich."`, `The night gets out of hand. ${first(c, s)} insults the landlord, gets thrown out – and writes on Sunday: "I'm quitting. It was never my thing anyway."`);
              return tr('Der Abend eskaliert kurz, dann entschuldigt sich jeder bei jedem.', 'Things get out of hand briefly, then everyone apologises to everyone.');
            },
          },
        ]),
      },
      {
        label: tr('Jeder zahlt selbst', 'Everyone pays for themselves'),
        effect: outcome([
          { w: 4, run: (c) => (adjustMood(c, 0.08), tr('Gemütliche Runde, alle pünktlich zu Hause.', 'Cosy evening, everyone home on time.')) },
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Nur fünf Leute da. Die fünf hatten es nett.', 'Only five people there. The five had a nice time.')) },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, 0.3); return tr(`${first(c, s)} erzählt den ganzen Abend von seinem Urlaub und ist Sonntag top motiviert.`, `${first(c, s)} talks about his holiday all evening and is fired up for Sunday.`); } },
          { w: 1, run: (c) => (book(c, tr('Spende vom Tresen', 'Donation from the bar'), 15), adjustMood(c, 0.05), tr('Ein Gast am Tresen findet euch sympathisch und wirft 15 € in die Mannschaftskasse.', 'A guest at the bar likes you lot and drops €15 into the team kitty.')) },
        ]),
      },
      {
        label: tr('Diese Woche nicht', 'Not this week'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.05), tr('Ein paar sind enttäuscht – „früher war mehr los".', 'A few are disappointed – "there used to be more going on".')) },
          { w: 2, run: () => tr('Die Jungs gehen trotzdem, ohne dich. Hat keiner gemerkt.', 'The lads go anyway, without you. Nobody noticed.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].grumpy = 1; return tr(`${first(c, s)} hatte extra seinen Geburtstag dort geplant. Jetzt ist er sauer.`, `${first(c, s)} had planned his birthday there. Now he is sulking.`); } },
        ]),
      },
    ],
  },

  arbeitseinsatz: {
    weight: 2,
    needs: () => ({}),
    text: () => tr('Der Platz sieht aus wie ein Acker. Samstag Arbeitseinsatz: Löcher stopfen, Linien ziehen, Tore streichen?', 'The pitch looks like a ploughed field. Work party on Saturday: fill holes, paint lines, paint the goals?'),
    options: [
      {
        label: tr('Alle antreten, ich bring Brötchen mit', 'Everyone turns up, I\'ll bring rolls'),
        effect: outcome([
          {
            w: 4,
            run: (c) => {
              adjustMood(c, 0.12);
              for (const idx of squad(c)) adjustForm(c, idx, -0.15);
              book(c, tr('Brötchen für den Arbeitseinsatz', 'Rolls for the work party'), -10);
              if ((c.level ?? 1) > 1) book(c, tr('Rabatt Platzmiete für den Arbeitseinsatz', 'Pitch rent discount for the work party'), 20);
              return tr('Der Platz glänzt, die Truppe ist zusammengewachsen – aber alle haben Muskelkater.', 'The pitch is gleaming, the team has grown closer – but everyone is aching.');
            },
          },
          { w: 2, run: (c) => (book(c, tr('Brötchen für den Arbeitseinsatz', 'Rolls for the work party'), -10), adjustMood(c, 0.06), tr('Halbe Mannschaft da, halbe Arbeit gemacht. Die Tore sind jetzt zur Hälfte weiß.', 'Half the team there, half the work done. The goals are now half white.')) },
          {
            w: 1,
            run: (c, ctx, rng) => {
              book(c, tr('Brötchen für den Arbeitseinsatz', 'Rolls for the work party'), -10);
              const s = rng.pick(squad(c));
              c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks, 1);
              sitOut(c, s);
              return tr(`${first(c, s)} ist die Leiter runtergefallen. Nichts gebrochen, aber Sonntag fällt er aus.`, `${first(c, s)} fell off the ladder. Nothing broken, but he misses Sunday.`);
            },
          },
          { w: 1, run: (c) => (book(c, tr('Brötchen für den Arbeitseinsatz', 'Rolls for the work party'), -10), book(c, tr('Farbe vom Baumarkt gesponsert', 'Paint sponsored by the DIY store'), 25), adjustMood(c, 0.1), tr('Der Baumarkt hat die Farbe gesponsert, als er von der Aktion gehört hat. 25 € gespart.', 'The DIY store sponsored the paint when they heard about it. €25 saved.')) },
          { w: 0.7, run: (c) => (book(c, tr('Brötchen für den Arbeitseinsatz', 'Rolls for the work party'), -10), adjustMood(c, 0.15), tr('Beim Umgraben habt ihr eine Zeitkapsel von 1987 gefunden. Mit Mannschaftsfoto. Die Frisuren!', 'While digging you found a time capsule from 1987. With a team photo. The haircuts!')) },
        ]),
      },
      {
        label: tr('Wer Lust hat, kommt', 'Whoever fancies it comes'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.03), tr('Drei Mann und ein Rasenmäher. Immerhin.', 'Three men and a lawnmower. Better than nothing.')) },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].loyal = true; return tr(`Nur ${first(c, s)} kommt – und macht alles allein. Er verdient einen Orden.`, `Only ${first(c, s)} comes – and does everything on his own. He deserves a medal.`); } },
          { w: 1, run: () => tr('Keiner kommt. Der Platzwart macht es allein und erzählt es jedem.', 'Nobody comes. The groundsman does it alone and tells everyone.') },
        ]),
      },
      {
        label: tr('Lassen wir', 'Let\'s not'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.04), tr('Der Platzwart schüttelt den Kopf.', 'The groundsman shakes his head.')) },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, -0.3); return tr(`${first(c, s)} knickt im Maulwurfshügel um. Leicht, aber ärgerlich.`, `${first(c, s)} turns his ankle in a molehill. Minor, but annoying.`); } },
          { w: 1, run: () => tr('Der Nachbarverein hat es fotografiert und in seine Gruppe gestellt: „Kartoffelacker FC".', 'The club next door took a photo and posted it in their group: "Potato Field FC".') },
        ]),
      },
    ],
  },

  streit: {
    weight: 2,
    needs: (c, rng) => {
      const a = pickSubject(c, rng, (idx) => !isCoach(c, idx));
      const b = pickSubject(c, rng, (idx) => idx !== a && !isCoach(c, idx));
      return a != null && b != null ? { a, b } : null;
    },
    text: (c, ctx) => tr(`Zoff in der Gruppe: ${first(c, ctx.a)} wirft ${first(c, ctx.b)} vor, „immer nur zu labern und nie zu laufen". Es fliegen Sprachnachrichten.`, `Trouble in the group: ${first(c, ctx.a)} accuses ${first(c, ctx.b)} of "all talk and no running". Voice messages are flying.`),
    options: [
      {
        label: tr('Beide anrufen und schlichten', 'Ring them both and mediate'),
        effect: outcome([
          { w: 4, run: (c) => (adjustMood(c, 0.08), tr('Handschlag beim Bäcker. Erledigt.', 'Handshake at the bakery. Sorted.')) },
          { w: 2, run: (c, ctx) => ((c.players[ctx.b].grumpy = 2), tr(`${first(c, ctx.b)} ist immer noch angefressen und sagt diese Woche lieber ab.`, `${first(c, ctx.b)} is still sulking and drops out this week.`)) },
          { w: 1.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), tr('Das Gespräch dauert zwei Stunden. Am Ende gehen sie zusammen ein Bier trinken. Jetzt sind sie Kumpels.', 'The talk takes two hours. In the end they go for a beer together. Now they are mates.')) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), tr('Du hörst dir beide Seiten an. Jetzt sind beide sauer – auch auf dich. Und aufeinander sowieso.', 'You hear both sides. Now both are angry – with you too. And with each other anyway.')) },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} hat genug: „Mit dem spiel ich nicht mehr." Er ist raus aus der Gruppe.`, `${first(c, ctx.b)} has had enough: "I'm not playing with him any more." He has left the group.`) : tr('Fast wäre einer gegangen. Fast.', 'Someone almost left. Almost.')) },
        ]),
      },
      {
        label: tr('Beide 10 € in die Kasse', '€10 each into the kitty'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Strafe: Streit in der Gruppe', 'Fine: squabbling in the group'), 20), adjustMood(c, -0.08), tr('Ruhe ist. Begeistert ist keiner.', 'Peace and quiet. Nobody is thrilled.')) },
          { w: 1.5, run: (c) => (book(c, tr('Strafe: Streit in der Gruppe', 'Fine: squabbling in the group'), 20), adjustMood(c, 0.04), tr('Gezahlt, gelacht, vergessen. Einer schlägt vor, den Strafenkatalog zu erweitern.', 'Paid, laughed, forgotten. Someone suggests extending the fines list.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Strafe: Streit in der Gruppe', 'Fine: squabbling in the group'), 10), (c.players[ctx.a].grumpy = 3), tr(`${first(c, ctx.a)} weigert sich zu zahlen: „Ich hab doch recht!" Nur 10 € in der Kasse.`, `${first(c, ctx.a)} refuses to pay: "But I'm right!" Only €10 in the kitty.`)) },
          { w: (c) => (canLose(c) ? 0.4 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? tr(`${first(c, ctx.a)} zahlt – und tritt aus. „Für 10 € lass ich mich nicht erziehen."`, `${first(c, ctx.a)} pays – and quits. "I'm not being disciplined for a tenner."`) : tr('Beide zahlen. Zähneknirschend.', 'Both pay. Through gritted teeth.')) },
        ]),
      },
      {
        label: tr('Raushalten', 'Stay out of it'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustMood(c, -0.12), sitOut(c, ctx.b), tr(`${first(c, ctx.b)} hat die Gruppe auf stumm geschaltet und kommt Sonntag nicht.`, `${first(c, ctx.b)} has muted the group and does not turn up on Sunday.`)) },
          { w: 2, run: (c) => (adjustMood(c, -0.03), tr('Nach zwei Tagen redet keiner mehr darüber.', 'After two days nobody mentions it any more.')) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, -0.06), tr('Die Sache gärt weiter. Die beiden gehen sich jetzt aus dem Weg.', 'It keeps simmering. The two now avoid each other.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), tr(`Im Training geht es weiter. ${first(c, ctx.b)} grätscht ${first(c, ctx.a)} weg – eine Woche Pause.`, `It carries on at training. ${first(c, ctx.b)} scythes down ${first(c, ctx.a)} – a week out.`)) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? tr(`Ohne Trainer, der eingreift, zieht ${first(c, ctx.b)} die Konsequenz und geht.`, `With no manager stepping in, ${first(c, ctx.b)} draws his conclusions and leaves.`) : tr('Es kracht, aber keiner geht.', 'It blows up, but nobody leaves.')) },
        ]),
      },
    ],
  },

  nachbar: {
    weight: 2,
    needs: () => ({}),
    text: () => tr('Der Nachbar vom Hinterhof hat drei Bälle einbehalten. „Die krieg ich erst wieder, wenn das Geballer aufhört!"', 'The neighbour by the backyard has kept three balls. "You\'re not getting them back until the banging stops!"'),
    options: [
      {
        label: tr('Neue Bälle kaufen (30 €)', 'Buy new balls (€30)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Neue Bälle', 'New balls'), -30), tr('Neue Bälle, gleicher Nachbar.', 'New balls, same neighbour.')) },
          { w: 1, run: (c) => (book(c, tr('Neue Bälle (Sonderangebot)', 'New balls (special offer)'), -18), tr('Sonderangebot beim Sportgeschäft. Nur 18 €.', 'Special offer at the sports shop. Only €18.')) },
          { w: 1, run: (c) => (book(c, tr('Neue Bälle', 'New balls'), -30), adjustMood(c, -0.04), tr('Die neuen Bälle sind steinhart. Alle meckern über das Material.', 'The new balls are rock hard. Everyone moans about the quality.')) },
        ]),
      },
      {
        label: tr('Klingeln und eine Flasche Wein mitbringen (8 €)', 'Ring the doorbell with a bottle of wine (€8)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Flasche Wein für den Nachbarn', 'Bottle of wine for the neighbour'), -8), adjustMood(c, 0.04), tr('Der Nachbar ist eigentlich ganz nett. Bälle zurück, und er kommt Sonntag gucken.', 'The neighbour is actually quite nice. Balls back, and he comes to watch on Sunday.')) },
          { w: 2, run: (c) => (book(c, tr('Flasche Wein für den Nachbarn', 'Bottle of wine for the neighbour'), -8), book(c, tr('Neue Bälle', 'New balls'), -30), tr('Tür bleibt zu. Also doch neue Bälle.', 'The door stays shut. New balls it is.')) },
          { w: 1, run: (c) => (book(c, tr('Flasche Wein für den Nachbarn', 'Bottle of wine for the neighbour'), -8), book(c, tr('Spende vom Nachbarn', 'Donation from the neighbour'), 20), adjustMood(c, 0.06), tr('Er hat früher selbst gespielt, 1974 Kreismeister. Bälle zurück und 20 € für die Kasse.', 'He used to play himself, district champion in 1974. Balls back and €20 for the kitty.')) },
          { w: 1, run: (c) => (book(c, tr('Flasche Wein für den Nachbarn', 'Bottle of wine for the neighbour'), -8), adjustMood(c, -0.03), tr('Er nimmt den Wein, behält die Bälle und droht mit dem Ordnungsamt.', 'He takes the wine, keeps the balls and threatens to call the council.')) },
        ]),
      },
      {
        label: tr('Mit alten Bällen weiterspielen', 'Carry on with the old balls'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.05), tr('Die Pille eiert. Alle meckern.', 'The ball wobbles. Everyone moans.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die alte Lederkugel von 1998 wird zum Kult. Jeder will mal damit schießen.', 'The old 1998 leather ball becomes a cult object. Everyone wants a shot with it.')) },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, -0.3); return tr(`Der Ball platzt beim Schuss von ${first(c, s)}. Er nimmt es persönlich.`, `The ball bursts when ${first(c, s)} shoots. He takes it personally.`); } },
        ]),
      },
    ],
  },

  presse: {
    weight: 1,
    needs: (c) => (c.flags?.pressWeeks ? null : {}),
    text: () => tr('Das Kreisblatt will ein Porträt über den Verein machen – mit Mannschaftsfoto und allem.', 'The District Gazette wants to run a feature on the club – with a team photo and everything.'),
    options: [
      {
        label: tr('Gerne! Alle in Trikot zum Foto', 'Happy to! Everyone in kit for the photo'),
        effect: outcome([
          { w: 4, run: (c) => ((c.flags.pressWeeks = 4), adjustMood(c, 0.1), tr('Halbe Seite im Kreisblatt! Mehr Zuschauer in den nächsten Wochen – ein Ex-Profi würde den Rummel aber meiden.', 'Half a page in the Gazette! More spectators in the coming weeks – though an ex-pro would avoid the fuss.')) },
          { w: 1.5, run: (c) => ((c.flags.pressWeeks = 4), adjustMood(c, -0.04), tr('Auf dem Foto hat einer die Augen zu und einer steht im falschen Trikot. Der Artikel ist trotzdem nett.', 'In the photo one has his eyes shut and one is in the wrong shirt. The article is nice anyway.')) },
          { w: 1, run: (c, ctx, rng) => { c.flags.pressWeeks = 5; const s = rng.pick(squad(c)); adjustForm(c, s, 0.5); return tr(`Das Kreisblatt macht ${first(c, s)} zum „Gesicht des Vereins". Er kauft zehn Exemplare.`, `The Gazette makes ${first(c, s)} "the face of the club". He buys ten copies.`); } },
          { w: 1, run: (c) => ((c.flags.pressWeeks = 3), book(c, tr('Anfrage nach Artikel: Spende', 'Enquiry after the article: donation'), 30), tr('Nach dem Artikel ruft eine Firma an und spendet 30 €.', 'After the article a company calls and donates €30.')) },
          { w: 0.7, run: (c) => ((c.flags.pressWeeks = 2), adjustMood(c, -0.08), tr('Die Überschrift: „Die Chaoten vom Hinterhof". Der Reporter fand das witzig. Ihr nicht.', 'The headline: "The Backyard Shambles". The reporter found it funny. You did not.')) },
        ]),
      },
      { label: tr('Lieber nicht', 'Rather not'), effect: outcome([{ w: 3, run: () => tr('Wir bleiben der Geheimtipp.', 'We stay the best-kept secret.') }, { w: 1, run: () => tr('Das Kreisblatt schreibt stattdessen über den Nachbarverein. Die zeigen den Artikel überall rum.', 'The Gazette writes about the club next door instead. They show the article to everyone.') }, { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Ein paar Spieler hätten gern mal in der Zeitung gestanden.', 'A few players would have liked to be in the paper.')) }]) },
    ],
  },

  kater: {
    weight: 3,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx) => c.week.availability[idx] === 'yes' && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat Samstag in den Geburtstag reingefeiert. Laut Story bis 4 Uhr.`, `${first(c, ctx.s)} partied into his birthday on Saturday. Until 4am, according to his story.`),
    options: [
      {
        label: tr('Trotzdem spielen lassen', 'Let him play anyway'),
        effect: outcome([
          { w: 4, run: (c, ctx) => (adjustForm(c, ctx.s, -0.8), tr(`${first(c, ctx.s)} läuft Sonntag auf Restalkohol.`, `${first(c, ctx.s)} runs on leftover alcohol on Sunday.`)) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), tr(`Wider Erwarten ist ${first(c, ctx.s)} hellwach. „Das Adrenalin", sagt er.`, `Against all expectations ${first(c, ctx.s)} is wide awake. "Adrenaline," he says.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), tr(`${first(c, ctx.s)} verschläft komplett. Handy aus. Sonntag ohne ihn.`, `${first(c, ctx.s)} sleeps right through. Phone off. Sunday without him.`)) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.6), adjustMood(c, 0.05), tr(`${first(c, ctx.s)} übergibt sich in der Halbzeit hinters Tor. Die Kabine hat eine neue Geschichte.`, `${first(c, ctx.s)} throws up behind the goal at half-time. The dressing room has a new story.`)) },
        ]),
      },
      {
        label: tr('Erste Halbzeit auf die Bank', 'Bench him for the first half'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), tr(`${first(c, ctx.s)} kommt zur zweiten Halbzeit – mit Sonnenbrille.`, `${first(c, ctx.s)} comes on for the second half – in sunglasses.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), (c.players[ctx.s].grumpy = 1), tr(`${first(c, ctx.s)} findet das übertrieben und schmollt auf der Bank.`, `${first(c, ctx.s)} thinks that is over the top and sulks on the bench.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), adjustForm(c, ctx.s, 0.4), tr(`${first(c, ctx.s)} will sich rehabilitieren und kommt wie ein Tier aus der Kabine.`, `${first(c, ctx.s)} wants to make amends and comes out of the dressing room like an animal.`)) },
        ]),
      },
      {
        label: tr('5 € in die Kasse, Thema durch', '€5 into the kitty, end of story'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr(`Strafe: Kater ${first(c, ctx.s)}`, `Fine: hangover ${first(c, ctx.s)}`), 5), adjustForm(c, ctx.s, -0.5), tr('Gezahlt, gelacht, gespielt.', 'Paid, laughed, played.')) },
          { w: 1, run: (c, ctx) => (book(c, tr(`Strafe: Kater ${first(c, ctx.s)}`, `Fine: hangover ${first(c, ctx.s)}`), 25), tr(`${first(c, ctx.s)} zahlt freiwillig 25 € – für alle, die auch auf der Party waren.`, `${first(c, ctx.s)} voluntarily pays €25 – for everyone who was at the party too.`)) },
          { w: 1, run: (c, ctx) => (book(c, tr(`Strafe: Kater ${first(c, ctx.s)}`, `Fine: hangover ${first(c, ctx.s)}`), 5), adjustMood(c, -0.03), tr('Jetzt wollen alle wissen, warum sie nicht eingeladen waren.', 'Now everyone wants to know why they were not invited.')) },
        ]),
      },
    ],
  },

  bankfrust: {
    weight: 3,
    needs: (c, rng) => {
      if (c.round < 3) return null;
      const s = pickSubject(c, rng, (idx, p, rec) => rec.apps <= Math.floor(c.round / 3) && !rec.grumpy && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} schreibt privat: „Warum spiel ich eigentlich nie? Dann kann ich sonntags auch ausschlafen."`, `${first(c, ctx.s)} messages you privately: "Why do I never play? I might as well have a lie-in on Sundays."`),
    options: [
      {
        label: tr('Einsatz am Sonntag versprechen', 'Promise him a game on Sunday'),
        effect: outcome([
          { w: 4, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustForm(c, ctx.s, 0.4), tr(`${first(c, ctx.s)} ist motiviert. Du solltest dein Versprechen halten.`, `${first(c, ctx.s)} is motivated. You had better keep your promise.`)) },
          { w: 1, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustForm(c, ctx.s, 0.8), tr(`${first(c, ctx.s)} trainiert die ganze Woche wie ein Besessener. Halt dein Versprechen!`, `${first(c, ctx.s)} trains like a man possessed all week. Keep your promise!`)) },
          { w: 1, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustMood(c, -0.05), tr(`Das spricht sich rum. Jetzt wollen noch zwei andere auch ein Versprechen.`, `Word gets round. Now two others want a promise too.`)) },
        ]),
      },
      {
        label: tr('Ehrlich sein: Die anderen sind besser', 'Be honest: the others are better'),
        effect: outcome([
          { w: 2, run: () => tr('Er schluckt, bleibt aber. Respekt.', 'He swallows hard, but stays. Respect.') },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), tr('Er nimmt es sportlich: „Dann zeig ich es euch halt im Training." Und das tut er.', 'He takes it well: "Then I\'ll show you in training." And he does.')) },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr('Er hat es verstanden – und sich einen anderen Verein gesucht.', 'He got the message – and found himself another club.') : tr('Er überlegt zu gehen, bleibt dann aber.', 'He considers leaving, but stays.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), (c.players[ctx.s].absenceMul = 1.5), tr('Er bleibt, kommt aber nur noch, wenn er Lust hat.', 'He stays, but only comes when he feels like it.')) },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (c.flags.derbyRival && joinRival(c, ctx.s, c.flags.derbyRival) ? tr(`Schlimmer geht's nicht: ${first(c, ctx.s)} unterschreibt ausgerechnet beim Derby-Rivalen.`, `It could not be worse: ${first(c, ctx.s)} signs for your derby rivals of all clubs.`) : tr('Er schluckt, bleibt aber.', 'He swallows hard, but stays.')) },
        ]),
      },
      {
        label: tr('Nicht reagieren', 'Don\'t reply'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].grumpy = 3), tr(`${first(c, ctx.s)} ist beleidigt und sagt öfter ab.`, `${first(c, ctx.s)} is offended and drops out more often.`)) },
          { w: 1, run: () => tr('Er fragt nie wieder. Du weißt nicht, ob das gut ist.', 'He never asks again. You are not sure if that is good.') },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`Keine Antwort ist auch eine Antwort. ${first(c, ctx.s)} verlässt die Gruppe.`, `No answer is an answer too. ${first(c, ctx.s)} leaves the group.`) : tr('Er grummelt.', 'He grumbles.')) },
        ]),
      },
    ],
  },

  trikots_eingelaufen: {
    weight: 1,
    needs: () => ({}),
    text: () => tr('Katastrophe: Wer hat die Trikots auf 90 Grad gewaschen? Die passen jetzt der F-Jugend.', 'Disaster: who washed the shirts at 90 degrees? Now they fit the under-8s.'),
    options: [
      {
        label: tr('Neuer Satz (60 €)', 'New set (€60)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Neuer Trikotsatz nach Waschunfall', 'New kit after washing accident'), -60), tr('Neuer Satz bestellt. Waschzettel hängt jetzt in der Kabine.', 'New set ordered. Washing instructions now hang in the dressing room.')) },
          { w: 1, run: (c) => (book(c, tr('Neuer Trikotsatz nach Waschunfall', 'New kit after washing accident'), -60), book(c, tr('Alte Trikots an die F-Jugend verkauft', 'Old shirts sold to the under-8s'), 20), tr('Die F-Jugend kauft die alten Trikots für 20 €. Passen perfekt.', 'The under-8s buy the old shirts for €20. Perfect fit.')) },
          { w: 1, run: (c) => (book(c, tr('Neuer Trikotsatz (Expresslieferung)', 'New kit (express delivery)'), -85), tr('Nur noch mit Expresszuschlag lieferbar. 85 €.', 'Only available with an express surcharge. €85.')) },
        ]),
      },
      {
        label: tr('Wir spielen in Leibchen', 'We play in training bibs'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.06), tr('Sieht aus wie Training. Fühlt sich auch so an.', 'Looks like training. Feels like it too.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die neonorangen Leibchen werden zum Glücksbringer. Keiner will sie mehr hergeben.', 'The neon orange bibs become a lucky charm. Nobody wants to give them back.')) },
          { w: 1, run: (c) => (book(c, tr('Verbandsstrafe: falsche Spielkleidung', 'FA fine: wrong kit'), (c.level ?? 1) > 1 ? -15 : 0), (c.level ?? 1) > 1 ? tr('Der Schiri notiert es im Spielbericht: 15 € Strafe.', 'The referee notes it in his report: €15 fine.') : tr('Der Gegner lacht, spielt aber trotzdem.', 'The opposition laughs, but plays anyway.')) },
        ]),
      },
    ],
  },

  tombola: {
    weight: 1,
    needs: () => ({}),
    text: () => tr('Die Bäckerei hat bei ihrer Tombola für euch gesammelt.', 'The bakery collected for you at its raffle.'),
    options: [
      {
        label: tr('Danke!', 'Thanks!'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(25, 60); book(c, tr('Tombola der Bäckerei', 'Bakery raffle'), n); return tr(`${n} € für die Kasse.`, `€${n} for the kitty.`); } },
          { w: 1, run: (c) => (book(c, tr('Tombola der Bäckerei', 'Bakery raffle'), 12), tr('Nur 12 € – aber ein Gutschein für 30 Brötchen.', 'Only €12 – but a voucher for 30 bread rolls.')) },
          { w: 1, run: (c) => (book(c, tr('Tombola der Bäckerei', 'Bakery raffle'), 90), adjustMood(c, 0.05), tr('Rekord! 90 €. Die Bäckerin will jetzt Trikotsponsor werden.', 'Record! €90. The baker now wants to be shirt sponsor.')) },
        ]),
      },
    ],
  },

  kind_im_park: {
    weight: 1,
    needs: (c) => {
      const pool = getPool();
      const taken = new Set([...c.clubs.flatMap((x) => x.squad), ...(c.youth?.prospects ?? [])]);
      const kid = pool.everyone().find((p) => playerOf(c, p.poolIndex).age <= 17 && !taken.has(p.poolIndex) && p.tier !== 'ok');
      return kid ? { kid: kid.poolIndex } : null;
    },
    text: (c, ctx) => tr(`Ein Junge aus der Nachbarschaft, ${first(c, ctx.kid)}, schaut jede Woche zu und kickt danach allein weiter. Richtig gut.`, `A lad from the neighbourhood, ${first(c, ctx.kid)}, watches every week and keeps kicking on his own afterwards. Really good.`),
    options: [
      {
        label: tr('In die A-Jugend holen', 'Bring him into the U19s'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (addProspect(c, ctx.kid), tr(`${first(c, ctx.kid)} ist jetzt in der A-Jugend. Die Eltern haben zugestimmt.`, `${first(c, ctx.kid)} is now in the U19s. His parents agreed.`)) },
          { w: 1, run: (c, ctx) => (addProspect(c, ctx.kid), adjustForm(c, ctx.kid, 0.5), tr(`${first(c, ctx.kid)} bringt gleich zwei Freunde mit zum Probetraining. Einer davon bleibt vielleicht auch.`, `${first(c, ctx.kid)} brings two friends along to the trial. One of them might stay too.`)) },
          { w: 1, run: () => tr('Die Eltern sagen nein: „Erst das Abitur." Er kommt trotzdem jeden Sonntag gucken.', 'His parents say no: "School exams first." He still comes to watch every Sunday.') },
          { w: 0.6, run: (c, ctx) => (c.flags.derbyRival ? tr(`Zu spät: Der Derby-Rivale hat ihn letzte Woche schon angesprochen. ${first(c, ctx.kid)} spielt jetzt dort.`, `Too late: your derby rivals approached him last week. ${first(c, ctx.kid)} plays there now.`) : tr('Zu spät, ein anderer Verein war schneller.', 'Too late, another club was quicker.')) },
        ]),
      },
      { label: tr('Er soll erstmal Schule machen', 'He should focus on school first'), effect: outcome([{ w: 3, run: () => tr('Vielleicht später.', 'Maybe later.') }, { w: 1, run: () => tr('Die Mutter bedankt sich. Du bekommst einen Kuchen.', 'His mother thanks you. You get a cake.') }, { w: 1, run: () => tr('Er ist enttäuscht und kommt nicht mehr gucken.', 'He is disappointed and stops coming to watch.') }]) },
    ],
  },

  allueren: {
    weight: 2,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx, p) => ['dorfstar', 'superstar', 'legende'].includes(p.tier) && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} will die Kapitänsbinde, nur noch vorne spielen und findet, dass die anderen „mal mehr laufen könnten".`, `${first(c, ctx.s)} wants the captain's armband, to play only up front, and thinks the others "could run a bit more".`),
    options: [
      {
        label: tr('Nachgeben – er ist unser Bester', 'Give in – he is our best player'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), adjustMood(c, -0.12), tr('Er blüht auf. Der Rest der Truppe verdreht die Augen.', 'He blossoms. The rest of the squad rolls their eyes.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.7), adjustMood(c, 0.03), tr('Er nimmt die Rolle ernst und reißt alle mit. Überraschend.', 'He takes the role seriously and carries everyone with him. Surprising.')) },
          { w: 1, run: (c, ctx, rng) => { const other = rng.pick(squad(c).filter((i) => i !== ctx.s && !isCoach(c, i))); setRelation(c, ctx.s, other, 'rivalen'); adjustMood(c, -0.1); return tr(`Der bisherige Kapitän ${first(c, other)} fühlt sich übergangen. Die beiden reden nicht mehr miteinander.`, `The old captain ${first(c, other)} feels passed over. The two no longer speak.`); } },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx, rng) => { const other = rng.pick(squad(c).filter((i) => i !== ctx.s && !isCoach(c, i))); return leaveTeam(c, other) ? tr(`${first(c, other)} hat genug vom Starkult und geht.`, `${first(c, other)} has had enough of the star treatment and leaves.`) : tr('Ein paar murren.', 'A few grumble.'); } },
        ]),
      },
      {
        label: tr('Klartext: Hier ist jeder gleich', 'Straight talk: everyone is equal here'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.08), tr('Er knurrt, bleibt aber – und läuft jetzt auch mal zurück.', 'He growls, but stays – and now even tracks back.')) },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? (adjustMood(c, 0.05), tr('Er ist weg. Die Stimmung ist trotzdem besser.', 'He is gone. The mood is better anyway.')) : tr('Er knurrt, bleibt aber.', 'He growls, but stays.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 3), tr('Er bleibt, spielt aber mit angezogener Handbremse.', 'He stays, but plays with the handbrake on.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustMood(c, 0.1), tr('Er denkt drüber nach und entschuldigt sich vor der ganzen Mannschaft. Großer Moment.', 'He thinks about it and apologises in front of the whole team. Big moment.')) },
          { w: (c) => (canLose(c) && c.flags.derbyRival ? 0.5 : 0), run: (c, ctx) => (joinRival(c, ctx.s, c.flags.derbyRival) ? tr(`${first(c, ctx.s)} wechselt noch am selben Abend zum Derby-Rivalen. Das nächste Derby wird heiß.`, `${first(c, ctx.s)} joins your derby rivals that same evening. The next derby will be heated.`) : tr('Er knurrt.', 'He growls.')) },
        ]),
      },
      {
        label: tr('Kompromiss: Kapitän ja, sonst nichts', 'Compromise: captain yes, nothing else'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), tr('Halb zufrieden. Mal sehen, wie lange.', 'Half satisfied. We\'ll see for how long.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), adjustMood(c, 0.03), tr('Die Binde tut ihm gut. Er fängt an, sich um die Jungen zu kümmern.', 'The armband suits him. He starts looking after the youngsters.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.06), tr('Der Rest der Truppe findet, der Kompromiss ist ein Einknicken.', 'The rest of the squad thinks the compromise is caving in.')) },
        ]),
      },
    ],
  },

  sommerfest: {
    weight: 30, // nur an Spieltag 4 möglich – dann fast immer
    needs: (c) => (c.round === 4 && !c.flags.summerfest ? {} : null),
    text: () => tr('Sommerfest steht an! Wie groß soll es werden?', 'The summer party is coming up! How big should it be?'),
    options: [
      {
        label: tr('Richtig groß: Hüpfburg, Grill, Tombola (50 €)', 'Really big: bouncy castle, barbecue, raffle (€50)'),
        effect: outcome([
          {
            w: 3,
            run: (c, ctx, rng) => {
              c.flags.summerfest = true;
              book(c, tr('Sommerfest: Hüpfburg & Grill', 'Summer party: bouncy castle & barbecue'), -50);
              const income = rng.int(80, 170);
              book(c, tr('Sommerfest: Einnahmen', 'Summer party: takings'), income);
              adjustMood(c, 0.15);
              return tr(`Tolles Fest, ${income} € eingenommen.`, `Great party, €${income} taken.`);
            },
          },
          {
            w: 1,
            run: (c) => {
              c.flags.summerfest = true;
              book(c, tr('Sommerfest: Hüpfburg & Grill', 'Summer party: bouncy castle & barbecue'), -50);
              book(c, tr('Sommerfest: Einnahmen', 'Summer party: takings'), 120);
              const p = getPool().everyone().find((q) => q.tier === 'gut' && !c.clubs.some((x) => x.squad.includes(q.poolIndex)) && q.poolIndex % 7 === c.round);
              if (p && joinSquad(c, p.poolIndex, tr('War beim Sommerfest – ich will mitspielen!', 'I was at the summer party – I want to play!'))) return tr(`120 € eingenommen, und ${p.name} will mitspielen!`, `€120 taken, and ${p.name} wants to play!`);
              return tr('120 € eingenommen. Und die Hüpfburg hat überlebt.', '€120 taken. And the bouncy castle survived.');
            },
          },
          { w: 1, run: (c) => ((c.flags.summerfest = true), book(c, tr('Sommerfest: Hüpfburg & Grill', 'Summer party: bouncy castle & barbecue'), -50), book(c, tr('Sommerfest: Einnahmen', 'Summer party: takings'), 40), adjustMood(c, 0.05), tr('Um drei kommt der Regen. 40 € eingenommen, die Hüpfburg schwimmt.', 'At three the rain comes. €40 taken, the bouncy castle is afloat.')) },
          { w: 0.7, run: (c) => ((c.flags.summerfest = true), book(c, tr('Sommerfest: Hüpfburg & Grill', 'Summer party: bouncy castle & barbecue'), -50), book(c, tr('Sommerfest: Einnahmen', 'Summer party: takings'), 210), adjustMood(c, 0.2), tr('Das Fest des Jahres. 210 €, und der Bürgermeister hat ein Grußwort gehalten.', 'The party of the year. €210, and the mayor gave a speech.')) },
          { w: 0.5, run: (c) => ((c.flags.summerfest = true), book(c, tr('Sommerfest: Hüpfburg & Grill', 'Summer party: bouncy castle & barbecue'), -50), book(c, tr('Sommerfest: Schaden am Grill', 'Summer party: barbecue damage'), -30), adjustMood(c, 0.08), tr('Der Grill fängt Feuer. Die Feuerwehr kommt, isst mit und bleibt bis zum Schluss. 30 € Schaden.', 'The barbecue catches fire. The fire brigade comes, eats with you and stays until the end. €30 of damage.')) },
        ]),
      },
      { label: tr('Klein: Grill und Kasten Bier', 'Small: barbecue and a crate of beer'), effect: outcome([{ w: 3, run: (c) => ((c.flags.summerfest = true), book(c, tr('Sommerfest (klein)', 'Summer party (small)'), 30), adjustMood(c, 0.06), tr('Gemütlich. 30 € übrig.', 'Cosy. €30 left over.')) }, { w: 1, run: (c) => ((c.flags.summerfest = true), book(c, tr('Sommerfest (klein)', 'Summer party (small)'), 70), adjustMood(c, 0.1), tr('Klein, aber fein – und viel mehr Leute als gedacht. 70 € übrig.', 'Small but perfect – and many more people than expected. €70 left over.')) }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, 0.02), tr('Nach zwei Stunden ist das Bier alle. Plus minus null.', 'After two hours the beer runs out. Breaks even.')) }]) },
      { label: tr('Fällt dieses Jahr aus', 'Cancelled this year'), effect: outcome([{ w: 3, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.1), tr('Die Spielerfrauen sind enttäuscht.', 'The players\' partners are disappointed.')) }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.03), tr('Die Spieler organisieren selbst was im Park. Ohne dich.', 'The players organise something in the park themselves. Without you.')) }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.15), tr('Der Derby-Rivale feiert ein riesiges Fest. Alle gehen dahin.', 'Your derby rivals throw a huge party. Everyone goes there.')) }]) },
    ],
  },

  firmenturnier: {
    weight: 1,
    needs: (c) => (c.sponsors?.length ? { sponsor: c.sponsors[0].name } : null),
    text: (c, ctx) => tr(`${ctx.sponsor} lädt zum Firmen-Kleinfeldturnier am Samstag ein.`, `${ctx.sponsor} invites you to its company five-a-side tournament on Saturday.`),
    options: [
      {
        label: tr('Hinfahren und gewinnen', 'Go and win it'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr(`Turniersieg bei ${ctx.sponsor}`, `Tournament win at ${ctx.sponsor}`), 40), adjustMood(c, 0.1), tr('Turniersieg! 40 € Preisgeld.', 'Tournament win! €40 prize money.')) },
          { w: 2, run: () => tr('Im Halbfinale raus. Aber die Bratwurst war gut.', 'Out in the semi-final. But the bratwurst was good.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].injuryWeeks = 1; sitOut(c, s); return tr(`Im Finale verdreht sich ${first(c, s)} den Knöchel. Sonntag fehlt er.`, `In the final ${first(c, s)} twists his ankle. He misses Sunday.`); } },
          { w: 1, run: (c, ctx) => (book(c, tr(`Sonderprämie von ${ctx.sponsor}`, `Special bonus from ${ctx.sponsor}`), 80), adjustMood(c, 0.12), tr(`Turniersieg, und der Chef von ${ctx.sponsor} verdoppelt das Preisgeld: 80 €!`, `Tournament win, and the boss of ${ctx.sponsor} doubles the prize money: €80!`)) },
          { w: 0.6, run: (c, ctx) => (adjustMood(c, -0.05), tr(`Ihr verliert gegen die Buchhaltung von ${ctx.sponsor}. Das wird noch lange erzählt.`, `You lose to the accounts department of ${ctx.sponsor}. That will be talked about for a long time.`)) },
        ]),
      },
      { label: tr('Absagen – Sonntag ist wichtiger', 'Decline – Sunday matters more'), effect: outcome([{ w: 3, run: () => tr('Der Sponsor ist etwas enttäuscht.', 'The sponsor is a bit disappointed.') }, { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Der Sponsor versteht es: „Liga geht vor. Gefällt mir."', 'The sponsor understands: "League comes first. I like that."')) }, { w: 1, run: (c) => (c.sponsors?.[0] && (c.sponsors[0].weekly = Math.max(1, c.sponsors[0].weekly - 2)), tr('Der Sponsor kürzt die Wochenrate um 2 €. „Man sieht sich ja nie."', 'The sponsor cuts the weekly payment by €2. "We never see you anyway."')) }]) },
    ],
  },

  schiri_beschwerde: {
    weight: 1,
    needs: (c) => ((c.level ?? 1) > 1 ? {} : null),
    text: () => tr('Der Schiri vom letzten Spiel hat sich beim Kreis beschwert: „Unsportliches Meckern".', 'The referee from the last match has complained to the district FA: "unsporting dissent".'),
    options: [
      { label: tr('Offizielle Entschuldigung schreiben', 'Write an official apology'), effect: outcome([{ w: 3, run: (c) => (adjustMood(c, -0.03), tr('Akzeptiert. Die Jungs finden es peinlich.', 'Accepted. The lads find it embarrassing.')) }, { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Der Schiri antwortet persönlich und kommt mal zum Training als Gast. Netter Kerl.', 'The referee replies personally and comes to training as a guest. Nice bloke.')) }, { w: 1, run: (c) => (book(c, tr('Verbandsstrafe trotz Entschuldigung', 'FA fine despite apology'), -10), tr('Die Entschuldigung kommt an, die Strafe trotzdem: 10 €.', 'The apology lands, the fine does too: €10.')) }]) },
      { label: tr('Verbandsstrafe zahlen (25 €)', 'Pay the FA fine (€25)'), effect: outcome([{ w: 3, run: (c) => (book(c, tr('Verbandsstrafe', 'FA fine'), -25), tr('Bezahlt. Einer schlägt vor, das Meckern teurer zu machen.', 'Paid. Someone suggests making dissent more expensive.')) }, { w: 1, run: (c) => (book(c, tr('Verbandsstrafe', 'FA fine'), -25), adjustMood(c, 0.04), tr('Die Mannschaft legt zusammen. Solidarität!', 'The team chips in together. Solidarity!')) }, { w: 1, run: (c) => (book(c, tr('Verbandsstrafe + Gebühr', 'FA fine + fee'), -40), tr('Mit Bearbeitungsgebühr: 40 €. Bürokratie.', 'With an admin fee: €40. Bureaucracy.')) }]) },
    ],
  },
};

function addProspect(c, idx) {
  if (!c.youth.prospects.includes(idx)) c.youth.prospects.push(idx);
  c.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
}

// --- Mehrwöchige Geschichten ------------------------------------------------------------

// Läuft zu Wochenbeginn: bringt laufende Geschichten weiter.
export function advanceArcs(career) {
  advanceStories(career, createRng((career.seed * 5 + career.season * 71 + career.round * 29 + 1) >>> 0));
  // Gebrochenes Versprechen aus dem Bankfrust?
  const pr = career.flags?.promise;
  if (pr && career.round > pr.round) {
    if ((career.players[pr.idx]?.lastApp ?? -1) < pr.round) {
      adjustMood(career, -0.1);
      if (career.players[pr.idx]) career.players[pr.idx].grumpy = 3;
      if (squad(career).includes(pr.idx)) say(career, pr.idx, tr('Versprochen ist versprochen, dachte ich. Egal.', 'A promise is a promise, I thought. Whatever.'), 'Mo 08:15');
    }
    career.flags.promise = null;
  }
}

// Zu Wochenbeginn höchstens ein Ereignis ziehen.
export function rollWeekEvent(career) {
  career.flags ??= {};
  career.eventLog ??= [];
  const rng = createRng((career.seed * 7 + career.season * 131 + career.round * 17 + 3) >>> 0);
  if (career.week.event) return null; // eine Geschichte verlangt schon eine Entscheidung
  const urgent = derbyThisWeek(career) || career.flags?.injuryNews || career.flags?.invalid;
  if (!rng.chance(EVENT_CHANCE) && !urgent) return null; // Derby, Diagnose & Co. kommen immer
  const recent = new Set(career.eventLog.filter((e) => e.season === career.season && career.round - e.round < NO_REPEAT).map((e) => e.id));
  const candidates = [];
  const storySeason = new Set(career.eventLog.filter((e) => e.season === career.season).map((e) => e.id));
  const storiesFull = arcsOf(career).length >= 3;
  for (const [id, ev] of [...Object.entries(EVENTS), ...Object.entries(STORY_STARTS), ...Object.entries(PERSONAL_EVENTS), ...Object.entries(SAGA_EVENTS), ...Object.entries(SOCIAL_EVENTS), ...Object.entries(DERBY_EVENTS), ...Object.entries(INJURY_EVENTS), ...Object.entries(LIFE_EVENTS), ...Object.entries(ACADEMY_EVENTS), ...Object.entries(SPONSOR_EVENTS)]) {
    if (recent.has(id)) continue;
    if (STORY_STARTS[id] && (storiesFull || storySeason.has(id))) continue; // jede Geschichte höchstens einmal pro Saison
    const ctx = ev.needs(career, rng);
    if (ctx) candidates.push({ id, ev, ctx });
  }
  if (!candidates.length) return null;
  let r = rng.next() * candidates.reduce((s, c) => s + c.ev.weight, 0);
  // In der Derbywoche geht es um nichts anderes (bisher konnte ein Zufallsereignis dazwischenfunken).
  const chosen = (derbyThisWeek(career) && candidates.find((c) => c.id === 'derby_woche')) || candidates.find((c) => (r -= c.ev.weight) < 0) || candidates[0];
  const event = { id: chosen.id, ctx: chosen.ctx, text: chosen.ev.text(career, chosen.ctx), options: chosen.ev.options.map((o) => o.label), choice: null, result: null, story: STORY_STARTS[chosen.id] ? 'Neue Geschichte' : PERSONAL_EVENTS[chosen.id] ? 'Privat' : SAGA_EVENTS[chosen.id] ? 'Vereinsgeschichte' : null };
  career.week.event = event;
  career.eventLog.push({ id: chosen.id, season: career.season, round: career.round });
  if (career.eventLog.length > 40) career.eventLog.shift();
  return event;
}

const eventDef = (career, id) =>
  EVENTS[id] ?? STORY_STARTS[id] ?? PERSONAL_EVENTS[id] ?? SAGA_EVENTS[id] ?? SOCIAL_EVENTS[id] ?? DERBY_EVENTS[id] ?? INJURY_EVENTS[id] ?? LIFE_EVENTS[id] ?? ACADEMY_EVENTS[id] ?? SPONSOR_EVENTS[id] ?? CRISES[id] ?? storyDecision(career, id);

// Feste Etiketten über dem Ereignis (Geschichten haben eigene Namen).
const STORY_TAGS = { 'Neue Geschichte': 'New story', Privat: 'Private', Vereinsgeschichte: 'Club history' };
export const storyTag = (t) => tr(t, STORY_TAGS[t] ?? t);

// Text und Antworten eines Ereignisses in der aktuellen Sprache – so passt die Anzeige
// auch nach einem Sprachwechsel. Geschichten-Entscheidungen behalten ihren Text.
export function eventView(career, e) {
  const def = e.id.startsWith('story:') ? null : eventDef(career, e.id);
  if (!def?.text) return { text: e.text, options: e.options };
  try {
    return { text: def.text(career, e.ctx ?? {}), options: def.options.map((o) => o.label) };
  } catch {
    return { text: e.text, options: e.options };
  }
}

export function resolveEvent(career, choice) {
  const e = career.week?.event;
  if (!e || e.choice !== null) return null;
  const def = eventDef(career, e.id);
  const option = def?.options[choice];
  if (!option) return null;
  const rng = createRng((career.seed * 13 + career.round * 7 + choice + e.id.length) >>> 0);
  e.choice = choice;
  e.result = option.effect(career, e.ctx, rng);
  // Geschichten & private Ereignisse: Grundwirkung plus zufällige Wendung.
  const story = e.id.startsWith('story:') ? e.id.slice(6).split('-') : null;
  const key = story ? story[0] : e.id;
  const subject = story ? Number(story[1]) : e.ctx?.s ?? e.ctx?.idx ?? null;
  const twist = applyTwist(career, key, subject, createRng((career.seed * 31 + career.round * 11 + choice * 5 + career.season) >>> 0));
  if (twist) e.result = `${e.result} ${twist}`;
  return e.result;
}

// Unbeantwortet bis zum Spieltag? Dann nimmt sich die Gruppe die letzte Option.
export function autoResolve(career) {
  const e = career.week?.event;
  if (e && e.choice === null) resolveEvent(career, e.options.length - 1);
}

