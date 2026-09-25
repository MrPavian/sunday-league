// Ereignisse aus dem Beziehungsnetz und den Dossiers. Jede Antwort hat mehrere
// mögliche Ausgänge – vom Happy End bis dazu, dass einer den Verein verlässt
// oder rausfliegt.
import { DOSSIER, dossierIndex, RUMOR_CHAT } from '../data/backstories.js';
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { derbyRivalId } from './derby.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, joinRival, leaveTeam, outcome, sitOut, trait } from './outcomes.js';
import { isCoach } from './personal.js';
import { relationOf, relationsAmong, relationsOfPlayer, setRelation } from './relations.js';
import { tr } from '../core/i18n.js';

const regulars = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && !playerOf(c, idx).custom);
const partnerWord = (c, idx) => (playerOf(c, idx).age >= 29 ? tr('Frau', 'wife') : tr('Freundin', 'girlfriend'));
const kumpelsOf = (c, idx) => relationsOfPlayer(c, idx).filter((r) => r.type === 'kumpel' || r.type === 'schulfreunde').map((r) => r.other);

export const SOCIAL_EVENTS = {
  rivalen_zoff: {
    weight: 3,
    needs: (c, rng) => {
      const pairs = relationsAmong(c, regulars(c)).filter((p) => p.type === 'rivalen' || p.type === 'feinde');
      return pairs.length ? { ...rng.pick(pairs) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.a)} und ${first(c, ctx.b)} geraten beim Abschlussspiel aneinander. Wieder mal. Einer schubst, der andere schreit.`, `${first(c, ctx.a)} and ${first(c, ctx.b)} clash during the closing five-a-side. Again. One shoves, the other shouts.`),
    options: [
      {
        label: tr('Aussprache am Tresen (Runde 15 €)', 'Talk it out at the bar (round of drinks, €15)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr('Versöhnungsrunde', 'Peace-making round'), -15), setRelation(c, ctx.a, ctx.b, null), adjustMood(c, 0.05), tr('Nach dem dritten Bier umarmen sie sich. Keine Kumpels, aber der Streit ist beigelegt.', 'After the third beer they hug it out. Not mates, but the feud is over.')) },
          { w: 2, run: (c) => (book(c, tr('Versöhnungsrunde', 'Peace-making round'), -15), tr('Sie reden, trinken, schweigen. Das wird so schnell nichts mehr.', 'They talk, drink, go quiet. This will not be fixed any time soon.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Versöhnungsrunde', 'Peace-making round'), -15), setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), tr('Es stellt sich raus: Alles ein Missverständnis von vor drei Jahren. Jetzt sind sie Kumpels.', 'Turns out it was all a misunderstanding from three years ago. Now they are mates.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Versöhnungsrunde + Glasschaden', 'Peace-making round + broken glass'), -35), setRelation(c, ctx.a, ctx.b, 'feinde'), adjustMood(c, -0.06), tr('Beim vierten Bier fliegt ein Glas. 20 € Schaden, und aus Rivalen werden Erzfeinde.', 'A glass flies during the fourth beer. €20 in damage, and rivals become sworn enemies.')) },
          { w: (c) => (canLose(c) ? 0.7 : 0), run: (c, ctx) => (book(c, tr('Versöhnungsrunde', 'Peace-making round'), -15), leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} steht auf: „Ich hab's versucht." Er kommt nicht wieder.`, `${first(c, ctx.b)} stands up: "I tried." He does not come back.`) : tr('Es knallt, aber alle bleiben.', 'It kicks off, but everyone stays.')) },
        ]),
      },
      {
        label: tr('Beide eine Halbzeit auf die Bank', 'Both benched for a half'),
        effect: outcome([
          {
            w: 3,
            run: (c, ctx) => {
              for (const idx of [ctx.a, ctx.b]) {
                c.players[idx].grumpy = 2;
                sitOut(c, idx, 'late');
              }
              adjustMood(c, 0.03);
              return tr('Ansage vor versammelter Mannschaft. Die beiden sitzen Sonntag zur ersten Halbzeit draußen – nebeneinander.', 'A word in front of the whole squad. Both of them sit out the first half on Sunday – side by side.');
            },
          },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), setRelation(c, ctx.a, ctx.b, null), tr('Auf der Bank fangen sie an zu reden. Nach dem Spiel lachen sie zusammen über den Schiri.', 'On the bench they start talking. After the game they are laughing together about the ref.')) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b), tr(`${first(c, ctx.b)} findet die Strafe unfair und kommt gar nicht erst.`, `${first(c, ctx.b)} thinks the punishment is unfair and does not turn up at all.`)) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? tr(`${first(c, ctx.a)} lässt sich das nicht bieten: „Such dir einen anderen Deppen." Weg.`, `${first(c, ctx.a)} will not stand for it: "Find yourself another mug." Gone.`) : tr('Beide murren.', 'Both sulk.')) },
        ]),
      },
      {
        label: tr('Sollen sie das unter sich klären', 'Let them sort it out themselves'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.04), tr('Die Kabine ist geteilt. Die einen halten zu dem einen, die anderen zum anderen.', 'The dressing room is split. Some back one, some back the other.')) },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 2), sitOut(c, ctx.a), tr(`Beim nächsten Training kracht es richtig. ${first(c, ctx.a)} hat eine Platzwunde – zwei Wochen raus.`, `It properly kicks off at the next training session. ${first(c, ctx.a)} has a gash – out for two weeks.`)) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, null), tr('Sie klären es tatsächlich unter sich. Wie, will keiner wissen.', 'They actually do sort it out themselves. Nobody wants to know how.')) },
          {
            w: (c) => (canLose(c, 2) ? 0.5 : 0),
            run: (c, ctx) => {
              const gone = [ctx.a, ctx.b].filter((i) => leaveTeam(c, i));
              adjustMood(c, -0.1);
              return gone.length ? tr(`Am Ende gehen ${gone.map((i) => first(c, i)).join(' und ')}. Die Kabine ist leiser – und leerer.`, `In the end ${gone.map((i) => first(c, i)).join(' and ')} leave. The dressing room is quieter – and emptier.`) : tr('Es brodelt weiter.', 'It keeps simmering.');
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 0.4 : 0), run: (c, ctx) => (joinRival(c, ctx.b, derbyRivalId(c)) ? tr(`${first(c, ctx.b)} wechselt zum Derby-Rivalen. „Da hab ich wenigstens meine Ruhe."`, `${first(c, ctx.b)} moves to the derby rival. "At least I'll get some peace there."`) : tr('Es brodelt weiter.', 'It keeps simmering.')) },
        ]),
      },
    ],
  },

  freundin_ausgespannt: {
    weight: 1.2,
    needs: (c, rng) => {
      const list = regulars(c);
      if (c.round < 2 || list.length < 4) return null;
      for (let i = 0; i < 10; i++) {
        const a = rng.pick(list);
        const b = rng.pick(list);
        if (a !== b && relationOf(c, a, b) !== 'feinde') return { a, b };
      }
      return null;
    },
    text: (c, ctx) => tr(`Die Bombe platzt beim Grillen: ${first(c, ctx.a)} ist seit zwei Wochen mit der ${partnerWord(c, ctx.b)} von ${first(c, ctx.b)} zusammen. ${first(c, ctx.b)} hat es als Letzter erfahren.`, `The bomb drops at the barbecue: ${first(c, ctx.a)} has been seeing ${first(c, ctx.b)}'s ${partnerWord(c, ctx.b)} for two weeks. ${first(c, ctx.b)} was the last to find out.`),
    options: [
      {
        label: tr('Beide an einen Tisch holen', 'Sit them both down together'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, -0.04), tr('Keine Schlägerei, keine Tränen. Aber die beiden werden sich nie wieder einen Ball zuspielen, wenn es nicht sein muss.', 'No punches, no tears. But those two will never pass to each other again unless they have to.')) },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} hält es keine Minute aus: „Mit dem in einer Kabine? Nie." Er ist raus.`, `${first(c, ctx.b)} cannot stand it for a minute: "Share a changing room with him? Never." He is out.`) : tr('Knapp. Aber beide bleiben.', 'It was close. But both stay.')) },
          {
            w: 1.5,
            run: (c, ctx) => {
              for (const i of [ctx.a, ctx.b]) {
                c.players[i].grumpy = 3;
                sitOut(c, i);
              }
              setRelation(c, ctx.a, ctx.b, 'feinde');
              adjustMood(c, -0.1);
              return tr('Das Gespräch endet mit einem Faustschlag. Beide fehlen Sonntag, und die Kabine redet über nichts anderes.', 'The talk ends with a punch. Both miss Sunday, and it is all the dressing room talks about.');
            },
          },
          { w: 1.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'feinde'), adjustForm(c, ctx.b, -0.8), tr(`${first(c, ctx.b)} sagt kaum was. Sein Spiel bricht komplett ein.`, `${first(c, ctx.b)} barely says a word. His form collapses completely.`)) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? tr(`${first(c, ctx.a)} zieht selbst die Konsequenz: „Ich will das Team nicht kaputtmachen." Er geht – mit ihr.`, `${first(c, ctx.a)} draws his own conclusion: "I don't want to wreck this team." He leaves – with her.`) : tr('Beide bleiben. Irgendwie.', 'Both stay. Somehow.')) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, null), adjustMood(c, 0.05), tr(`Überraschung: ${first(c, ctx.b)} ist erleichtert. „Ich wollte eh Schluss machen. Viel Glück, Alter." Die Kabine ist sprachlos.`, `Surprise: ${first(c, ctx.b)} is relieved. "I was going to end it anyway. Good luck, mate." The dressing room is speechless.`)) },
          { w: 0.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.08), tr('Nach zwei Stunden lachen beide. Fußball ist ihnen wichtiger als alles andere. Seltsame Freundschaft.', 'After two hours both are laughing. Football matters more to them than anything else. Strange friendship.')) },
        ]),
      },
      {
        label: tr('Der Verursacher fliegt raus', 'The culprit gets the boot'),
        effect: outcome([
          { w: (c) => (canLose(c) ? 3 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? (adjustForm(c, ctx.b, 0.4), (c.players[ctx.b].loyal = true), tr(`${first(c, ctx.a)} ist raus. ${first(c, ctx.b)} dankt es dir mit Treue – und einer Wut im Bauch, die Sonntag dem Gegner gilt.`, `${first(c, ctx.a)} is out. ${first(c, ctx.b)} repays you with loyalty – and a fury he saves for Sunday's opponent.`)) : tr('Er bleibt, weil sonst keiner mehr da wäre.', 'He stays, because otherwise there would be nobody left.')) },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a), adjustMood(c, -0.12), tr(`${first(c, ctx.a)} ist raus. Die halbe Mannschaft findet, du hättest dich raushalten sollen. „Privatsache!"`, `${first(c, ctx.a)} is out. Half the squad thinks you should have stayed out of it. "It's personal!"`)) },
          {
            w: (c, ctx) => (canLose(c, 2) && kumpelsOf(c, ctx.a).length ? 1 : 0),
            run: (c, ctx) => {
              const buddy = kumpelsOf(c, ctx.a)[0];
              leaveTeam(c, ctx.a);
              const also = leaveTeam(c, buddy);
              return tr(`${first(c, ctx.a)} fliegt – und ${also ? `sein Kumpel ${first(c, buddy)} geht aus Solidarität gleich mit.` : 'sein Kumpel überlegt, mitzugehen.'}`, `${first(c, ctx.a)} gets the boot – and ${also ? `his mate ${first(c, buddy)} leaves in solidarity right away.` : 'his mate is thinking about leaving too.'}`);
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 1 : 0), run: (c, ctx) => (joinRival(c, ctx.a, derbyRivalId(c)) ? tr(`${first(c, ctx.a)} fliegt – und unterschreibt zwei Tage später beim Derby-Rivalen. Das nächste Derby wird ein Krieg.`, `${first(c, ctx.a)} gets the boot – and signs for the derby rival two days later. The next derby will be a war.`) : tr('Er bleibt vorerst.', 'He stays for now.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].grumpy = 3), setRelation(c, ctx.a, ctx.b, 'feinde'), tr(`${first(c, ctx.a)} weigert sich zu gehen: „Das ist mein Verein seit zehn Jahren." Jetzt spielen zwei Erzfeinde in einem Team.`, `${first(c, ctx.a)} refuses to leave: "I've been a member of this club for ten years." Now two sworn enemies play in one team.`)) },
        ]),
      },
      {
        label: tr('Privatsache – raushalten', 'Personal matter – stay out of it'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'feinde'), adjustMood(c, -0.05), tr('Die beiden sind Erzfeinde. Im Training passt keiner dem anderen den Ball zu.', 'The two become sworn enemies. In training neither will pass to the other.')) },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} verlässt die Gruppe ohne ein Wort. Nur ein Daumen nach unten.`, `${first(c, ctx.b)} leaves the group chat without a word. Just a thumbs-down.`) : tr('Beide bleiben.', 'Both stay.')) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.b, 0.5), setRelation(c, ctx.a, ctx.b, 'rivalen'), tr(`${first(c, ctx.b)} lässt seine Wut auf dem Platz. Er spielt wie entfesselt.`, `${first(c, ctx.b)} takes it out on the pitch. He plays like a man possessed.`)) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), setRelation(c, ctx.a, ctx.b, 'feinde'), tr(`Im Training grätscht ${first(c, ctx.b)} ${first(c, ctx.a)} von hinten um. Eine Woche Pause – und ein Riesenknall.`, `In training ${first(c, ctx.b)} scythes ${first(c, ctx.a)} down from behind. A week out – and a massive row.`)) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), tr('Die Zeit heilt. Nach ein paar Wochen nicken sie sich wieder zu.', 'Time heals. After a few weeks they are nodding at each other again.')) },
          { w: 0.5, run: (c, ctx) => (adjustMood(c, -0.03), tr(`Drei Wochen später ist sie zurück bei ${first(c, ctx.b)}. Jetzt ist ${first(c, ctx.a)} der Blamierte.`, `Three weeks later she is back with ${first(c, ctx.b)}. Now ${first(c, ctx.a)} is the one left with egg on his face.`)) },
        ]),
      },
    ],
  },

  alte_geschichte: {
    weight: 50,
    needs: (c) => {
      const pl = c.flags?.pastLink;
      if (!pl || c.round < pl.round || !humanClub(c).squad.includes(pl.a) || !humanClub(c).squad.includes(pl.b)) return null;
      return { ...pl };
    },
    text: (c, ctx) =>
      ctx.kind === 'mobber'
        ? tr(`${first(c, ctx.b)} schreibt dir privat: „Weißt du, wer der Neue ist? ${first(c, ctx.a)} hat mich in der sechsten Klasse jeden Tag in den Mülleimer gesteckt. Jeden Tag."`, `${first(c, ctx.b)} messages you privately: "Do you know who the new guy is? ${first(c, ctx.a)} stuffed me in the bin every day in Year 8. Every single day."`)
        : tr(`${first(c, ctx.a)} und ${first(c, ctx.b)} waren zusammen auf der Gesamtschule – damals das Sturmduo der Schulmannschaft. Die Gruppe ist voll mit alten Fotos.`, `${first(c, ctx.a)} and ${first(c, ctx.b)} went to school together – back then they were the school team's strike partnership. The group chat fills up with old photos.`),
    options: [
      {
        label: tr('Aussprache mit beiden', 'Talk it out with both'),
        effect: outcome([
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 2 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, 0.02), tr(`${first(c, ctx.a)} entschuldigt sich. Nach 20 Jahren. ${first(c, ctx.b)} nimmt es an – halbwegs.`, `${first(c, ctx.a)} apologises. After 20 years. ${first(c, ctx.b)} accepts it – sort of.`)) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1.5 : 0), run: (c, ctx) => (clearPast(c), (c.players[ctx.b].grumpy = 3), tr(`${first(c, ctx.a)} lacht: „Das war doch Spaß damals." ${first(c, ctx.b)} steht auf und geht.`, `${first(c, ctx.a)} laughs: "It was just a laugh back then." ${first(c, ctx.b)} gets up and leaves.`)) },
          { w: (c, ctx) => (ctx.kind === 'mobber' && canLose(c) ? 1 : 0), run: (c, ctx) => (clearPast(c), leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} kann das nicht: „Entweder er oder ich." Du hast nicht schnell genug geantwortet. Er ist weg.`, `${first(c, ctx.b)} cannot do it: "Him or me." You did not answer fast enough. He is gone.`) : tr('Beide bleiben, mit Abstand.', 'Both stay, keeping their distance.')) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, null), (c.players[ctx.b].loyal = true), adjustMood(c, 0.08), tr(`Überraschend ehrliches Gespräch. ${first(c, ctx.a)} hatte es damals zu Hause selbst schwer. Die beiden reden jetzt normal miteinander.`, `Surprisingly honest conversation. ${first(c, ctx.a)} had it rough at home back then too. The two are now on normal terms.`)) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 0.5 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), tr('Es wird ein langer Abend. Am Ende liegen sich beide in den Armen. Keiner in der Kabine glaubt es.', 'It turns into a long evening. By the end they are hugging it out. Nobody in the dressing room believes it.')) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 3 : 0), run: (c, ctx) => (clearPast(c), adjustForm(c, ctx.a, 0.4), adjustForm(c, ctx.b, 0.4), tr('Das alte Sturmduo ist zurück. Sie finden sich auf dem Platz blind.', 'The old strike partnership is back. They find each other on the pitch with their eyes closed.')) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c, ctx) => (clearPast(c), sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), tr('Das Wiedersehen wird Samstagnacht ausgiebig gefeiert. Sonntag kommen beide erst zur zweiten Halbzeit.', 'The reunion is thoroughly celebrated on Saturday night. Sunday, both turn up only for the second half.')) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'rivalen'), tr('Beim dritten Bier kommt raus, wer damals wem die Freundin ausgespannt hat. Plötzlich ist die Stimmung weg.', 'By the third beer it comes out who stole whose girlfriend back then. Suddenly the mood is gone.')) },
        ]),
      },
      {
        label: tr('Den Neuen gleich wieder wegschicken', 'Send the new guy packing straight away'),
        effect: outcome([
          {
            w: (c) => (canLose(c) ? 3 : 0),
            run: (c, ctx) => {
              clearPast(c);
              if (!leaveTeam(c, ctx.a)) return tr('Dafür ist der Kader zu dünn.', 'The squad is too thin for that.');
              if (ctx.kind === 'mobber') {
                c.players[ctx.b].loyal = true;
                return tr(`${first(c, ctx.a)} ist wieder weg. ${first(c, ctx.b)} wird dir das nie vergessen.`, `${first(c, ctx.a)} is gone again. ${first(c, ctx.b)} will never forget this.`);
              }
              adjustMood(c, -0.1);
              c.players[ctx.b].grumpy = 3;
              return tr(`Ausgerechnet der Schulfreund. ${first(c, ctx.b)} versteht die Welt nicht mehr.`, `Of all people, the old school friend. ${first(c, ctx.b)} does not understand the world any more.`);
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 1 : 0), run: (c, ctx) => (clearPast(c), joinRival(c, ctx.a, derbyRivalId(c)) ? tr(`${first(c, ctx.a)} geht – direkt zum Derby-Rivalen. „Die wollen mich wenigstens."`, `${first(c, ctx.a)} leaves – straight to the derby rival. "At least they want me."`) : tr('Er bleibt vorerst.', 'He stays for now.')) },
          { w: 1, run: (c) => (clearPast(c), adjustMood(c, -0.06), tr('Die Mannschaft findet das hart. „Man gibt doch jedem eine Chance."', 'The squad thinks it is harsh. "Everyone deserves a chance."')) },
        ]),
      },
      {
        label: tr('Nicht einmischen', 'Stay out of it'),
        effect: outcome([
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 3 : 0), run: (c, ctx) => (clearPast(c), adjustForm(c, ctx.b, -0.5), tr(`${first(c, ctx.b)} geht dem Neuen aus dem Weg. Er ist nicht mehr er selbst.`, `${first(c, ctx.b)} avoids the new guy. He is not himself any more.`)) },
          { w: (c, ctx) => (ctx.kind === 'mobber' && canLose(c) ? 1.5 : 0), run: (c, ctx) => (clearPast(c), leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} verlässt den Verein. Die Erinnerungen sind stärker als der Fußball.`, `${first(c, ctx.b)} leaves the club. The memories are stronger than the football.`) : tr('Er bleibt, aber es brodelt.', 'He stays, but it is simmering.')) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1 : 0), run: (c, ctx) => (clearPast(c), (c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), tr(`Im Training revanchiert sich ${first(c, ctx.b)} mit einer Grätsche. Späte Rache, eine Woche Pause für ${first(c, ctx.a)}.`, `In training ${first(c, ctx.b)} gets his revenge with a tackle. Late payback, a week out for ${first(c, ctx.a)}.`)) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 3 : 0), run: (c) => (clearPast(c), tr('Die beiden sind unzertrennlich. Fahrgemeinschaft, Kabinenplatz, Bier danach.', 'The two are inseparable. Car share, lockers next to each other, beer afterwards.')) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c) => (clearPast(c), adjustMood(c, 0.05), tr('Die alten Schulgeschichten sind der Renner in der Kabine.', 'The old school stories are the hit of the dressing room.')) },
        ]),
      },
    ],
  },

  geheimnis_auf: {
    weight: 2,
    needs: (c, rng) => {
      if (c.round < 2) return null;
      const list = regulars(c).filter((idx) => (c.players[idx]?.dossier ?? 0) < 4);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => {
      const p = playerOf(c, ctx.s);
      const secret = DOSSIER.geheimnis[dossierIndex(ctx.s, 3, DOSSIER.geheimnis.length)]({ first: first(c, ctx.s), age: p.age, profession: p.profession });
      return RUMOR_CHAT[ctx.s % RUMOR_CHAT.length](first(c, ctx.s), secret);
    },
    options: [
      {
        label: tr('Öffentlich zu ihm halten', 'Publicly back him'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.3), tr(`„Jeder hat seine Geschichte. Thema durch." ${first(c, ctx.s)} schreibt dir privat: „Danke, Trainer."`, `"Everyone has a story. Subject closed." ${first(c, ctx.s)} messages you privately: "Thanks, boss."`)) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, 0.06), tr('Nach deiner Nachricht erzählen plötzlich alle ihre peinlichsten Geschichten. Die Gruppe war nie lustiger.', 'After your message everyone suddenly shares their most embarrassing stories. The group chat has never been funnier.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, -0.03), tr('Ein paar finden, du nimmst ihn zu sehr in Schutz.', 'A few think you are being too protective of him.')) },
        ]),
      },
      {
        label: tr('Mitlachen', 'Join in the laughing'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].grumpy = 3), adjustMood(c, 0.03), tr(`Die Gruppe lacht. ${first(c, ctx.s)} lacht nicht mit.`, `The group laughs. ${first(c, ctx.s)} does not laugh along.`)) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, 0.06), tr(`${first(c, ctx.s)} lacht am lautesten. Er hat Humor, der Mann.`, `${first(c, ctx.s)} laughs loudest. The man has a sense of humour.`)) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => ((c.players[ctx.s].dossier = 4), leaveTeam(c, ctx.s) ? tr(`Das war zu viel. ${first(c, ctx.s)} verlässt die Gruppe – und den Verein.`, `That was too much. ${first(c, ctx.s)} leaves the group chat – and the club.`) : tr('Er schmollt.', 'He sulks.')) },
        ]),
      },
      {
        label: tr('Nichts dazu sagen', 'Say nothing about it'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), tr('Nach einem Tag redet keiner mehr drüber. Fast keiner.', 'After a day nobody talks about it any more. Almost nobody.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].grumpy = 1), tr(`${first(c, ctx.s)} hätte sich gewünscht, dass du was sagst.`, `${first(c, ctx.s)} wishes you had said something.`)) },
          {
            w: 1,
            run: (c, ctx, rng) => {
              c.players[ctx.s].dossier = 4;
              const others = regulars(c).filter((i) => i !== ctx.s);
              const other = others.length ? rng.pick(others) : null;
              if (other != null) setRelation(c, ctx.s, other, 'rivalen');
              return tr(`Es kommt raus, dass ${other != null ? first(c, other) : 'einer'} das Gerücht gestreut hat. Die beiden sind durch miteinander.`, `It comes out that ${other != null ? first(c, other) : 'someone'} spread the rumour. The two are done with each other.`);
            },
          },
        ]),
      },
    ],
  },

  neue_freunde: {
    weight: 2,
    needs: (c, rng) => {
      const list = regulars(c);
      for (let i = 0; i < 12 && list.length > 1; i++) {
        const a = rng.pick(list);
        const b = rng.pick(list);
        if (a !== b && relationOf(c, a, b) === null) return { a, b };
      }
      return null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.a)} und ${first(c, ctx.b)} fahren seit ein paar Wochen zusammen zum Training. Jetzt waren sie auch zusammen beim Grillen.`, `${first(c, ctx.a)} and ${first(c, ctx.b)} have been carpooling to training for a few weeks now. Now they turned up to the barbecue together too.`),
    options: [
      {
        label: tr('Schön zu sehen', 'Nice to see'),
        effect: outcome([
          { w: 4, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), tr('Aus Mitspielern werden Kumpels. Auf dem Platz finden sie sich blind.', 'Teammates become mates. On the pitch they find each other with their eyes closed.')) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.05), tr('Die beiden organisieren gleich einen Mannschaftsabend. Alle kommen.', 'The two go and organise a team night out. Everyone comes.')) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), tr('Beim Grillen wurde es spät. Sonntag kommen beide zur zweiten Halbzeit.', 'The barbecue ran late. Sunday, both turn up for the second half.')) },
          { w: (c, ctx) => (trait(c, ctx.a, 'meckerer') || trait(c, ctx.b, 'meckerer') ? 1 : 0.3), run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), tr('Die Fahrgemeinschaft endet im Streit über die Musik im Auto. Jetzt fahren sie getrennt – und reden nicht mehr.', 'The car share ends in an argument over the music. Now they drive separately – and do not talk.')) },
        ]),
      },
    ],
  },
};

function clearPast(c) {
  if (c.flags) c.flags.pastLink = null;
}
