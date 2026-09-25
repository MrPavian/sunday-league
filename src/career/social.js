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

const regulars = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && !playerOf(c, idx).custom);
const partnerWord = (c, idx) => (playerOf(c, idx).age >= 29 ? 'Frau' : 'Freundin');
const kumpelsOf = (c, idx) => relationsOfPlayer(c, idx).filter((r) => r.type === 'kumpel' || r.type === 'schulfreunde').map((r) => r.other);

export const SOCIAL_EVENTS = {
  rivalen_zoff: {
    weight: 3,
    needs: (c, rng) => {
      const pairs = relationsAmong(c, regulars(c)).filter((p) => p.type === 'rivalen' || p.type === 'feinde');
      return pairs.length ? { ...rng.pick(pairs) } : null;
    },
    text: (c, ctx) => `${first(c, ctx.a)} und ${first(c, ctx.b)} geraten beim Abschlussspiel aneinander. Wieder mal. Einer schubst, der andere schreit.`,
    options: [
      {
        label: 'Aussprache am Tresen (Runde 15 €)',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, 'Versöhnungsrunde', -15), setRelation(c, ctx.a, ctx.b, null), adjustMood(c, 0.05), 'Nach dem dritten Bier umarmen sie sich. Keine Kumpels, aber der Streit ist beigelegt.') },
          { w: 2, run: (c) => (book(c, 'Versöhnungsrunde', -15), 'Sie reden, trinken, schweigen. Das wird so schnell nichts mehr.') },
          { w: 1, run: (c, ctx) => (book(c, 'Versöhnungsrunde', -15), setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), 'Es stellt sich raus: Alles ein Missverständnis von vor drei Jahren. Jetzt sind sie Kumpels.') },
          { w: 1, run: (c, ctx) => (book(c, 'Versöhnungsrunde + Glasschaden', -35), setRelation(c, ctx.a, ctx.b, 'feinde'), adjustMood(c, -0.06), 'Beim vierten Bier fliegt ein Glas. 20 € Schaden, und aus Rivalen werden Erzfeinde.') },
          { w: (c) => (canLose(c) ? 0.7 : 0), run: (c, ctx) => (book(c, 'Versöhnungsrunde', -15), leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} steht auf: „Ich hab's versucht." Er kommt nicht wieder.` : 'Es knallt, aber alle bleiben.') },
        ]),
      },
      {
        label: 'Beide eine Halbzeit auf die Bank',
        effect: outcome([
          {
            w: 3,
            run: (c, ctx) => {
              for (const idx of [ctx.a, ctx.b]) {
                c.players[idx].grumpy = 2;
                sitOut(c, idx, 'late');
              }
              adjustMood(c, 0.03);
              return 'Ansage vor versammelter Mannschaft. Die beiden sitzen Sonntag zur ersten Halbzeit draußen – nebeneinander.';
            },
          },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), setRelation(c, ctx.a, ctx.b, null), 'Auf der Bank fangen sie an zu reden. Nach dem Spiel lachen sie zusammen über den Schiri.') },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b), `${first(c, ctx.b)} findet die Strafe unfair und kommt gar nicht erst.`) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? `${first(c, ctx.a)} lässt sich das nicht bieten: „Such dir einen anderen Deppen." Weg.` : 'Beide murren.') },
        ]),
      },
      {
        label: 'Sollen sie das unter sich klären',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.04), 'Die Kabine ist geteilt. Die einen halten zu dem einen, die anderen zum anderen.') },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 2), sitOut(c, ctx.a), `Beim nächsten Training kracht es richtig. ${first(c, ctx.a)} hat eine Platzwunde – zwei Wochen raus.`) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, null), 'Sie klären es tatsächlich unter sich. Wie, will keiner wissen.') },
          {
            w: (c) => (canLose(c, 2) ? 0.5 : 0),
            run: (c, ctx) => {
              const gone = [ctx.a, ctx.b].filter((i) => leaveTeam(c, i));
              adjustMood(c, -0.1);
              return gone.length ? `Am Ende gehen ${gone.map((i) => first(c, i)).join(' und ')}. Die Kabine ist leiser – und leerer.` : 'Es brodelt weiter.';
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 0.4 : 0), run: (c, ctx) => (joinRival(c, ctx.b, derbyRivalId(c)) ? `${first(c, ctx.b)} wechselt zum Derby-Rivalen. „Da hab ich wenigstens meine Ruhe."` : 'Es brodelt weiter.') },
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
    text: (c, ctx) => `Die Bombe platzt beim Grillen: ${first(c, ctx.a)} ist seit zwei Wochen mit der ${partnerWord(c, ctx.b)} von ${first(c, ctx.b)} zusammen. ${first(c, ctx.b)} hat es als Letzter erfahren.`,
    options: [
      {
        label: 'Beide an einen Tisch holen',
        effect: outcome([
          { w: 2, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, -0.04), 'Keine Schlägerei, keine Tränen. Aber die beiden werden sich nie wieder einen Ball zuspielen, wenn es nicht sein muss.') },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} hält es keine Minute aus: „Mit dem in einer Kabine? Nie." Er ist raus.` : 'Knapp. Aber beide bleiben.') },
          {
            w: 1.5,
            run: (c, ctx) => {
              for (const i of [ctx.a, ctx.b]) {
                c.players[i].grumpy = 3;
                sitOut(c, i);
              }
              setRelation(c, ctx.a, ctx.b, 'feinde');
              adjustMood(c, -0.1);
              return 'Das Gespräch endet mit einem Faustschlag. Beide fehlen Sonntag, und die Kabine redet über nichts anderes.';
            },
          },
          { w: 1.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'feinde'), adjustForm(c, ctx.b, -0.8), `${first(c, ctx.b)} sagt kaum was. Sein Spiel bricht komplett ein.`) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? `${first(c, ctx.a)} zieht selbst die Konsequenz: „Ich will das Team nicht kaputtmachen." Er geht – mit ihr.` : 'Beide bleiben. Irgendwie.') },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, null), adjustMood(c, 0.05), `Überraschung: ${first(c, ctx.b)} ist erleichtert. „Ich wollte eh Schluss machen. Viel Glück, Alter." Die Kabine ist sprachlos.`) },
          { w: 0.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.08), 'Nach zwei Stunden lachen beide. Fußball ist ihnen wichtiger als alles andere. Seltsame Freundschaft.') },
        ]),
      },
      {
        label: 'Der Verursacher fliegt raus',
        effect: outcome([
          { w: (c) => (canLose(c) ? 3 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? (adjustForm(c, ctx.b, 0.4), (c.players[ctx.b].loyal = true), `${first(c, ctx.a)} ist raus. ${first(c, ctx.b)} dankt es dir mit Treue – und einer Wut im Bauch, die Sonntag dem Gegner gilt.`) : 'Er bleibt, weil sonst keiner mehr da wäre.') },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a), adjustMood(c, -0.12), `${first(c, ctx.a)} ist raus. Die halbe Mannschaft findet, du hättest dich raushalten sollen. „Privatsache!"`) },
          {
            w: (c, ctx) => (canLose(c, 2) && kumpelsOf(c, ctx.a).length ? 1 : 0),
            run: (c, ctx) => {
              const buddy = kumpelsOf(c, ctx.a)[0];
              leaveTeam(c, ctx.a);
              const also = leaveTeam(c, buddy);
              return `${first(c, ctx.a)} fliegt – und ${also ? `sein Kumpel ${first(c, buddy)} geht aus Solidarität gleich mit.` : 'sein Kumpel überlegt, mitzugehen.'}`;
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 1 : 0), run: (c, ctx) => (joinRival(c, ctx.a, derbyRivalId(c)) ? `${first(c, ctx.a)} fliegt – und unterschreibt zwei Tage später beim Derby-Rivalen. Das nächste Derby wird ein Krieg.` : 'Er bleibt vorerst.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].grumpy = 3), setRelation(c, ctx.a, ctx.b, 'feinde'), `${first(c, ctx.a)} weigert sich zu gehen: „Das ist mein Verein seit zehn Jahren." Jetzt spielen zwei Erzfeinde in einem Team.`) },
        ]),
      },
      {
        label: 'Privatsache – raushalten',
        effect: outcome([
          { w: 3, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'feinde'), adjustMood(c, -0.05), 'Die beiden sind Erzfeinde. Im Training passt keiner dem anderen den Ball zu.') },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} verlässt die Gruppe ohne ein Wort. Nur ein Daumen nach unten.` : 'Beide bleiben.') },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.b, 0.5), setRelation(c, ctx.a, ctx.b, 'rivalen'), `${first(c, ctx.b)} lässt seine Wut auf dem Platz. Er spielt wie entfesselt.`) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), setRelation(c, ctx.a, ctx.b, 'feinde'), `Im Training grätscht ${first(c, ctx.b)} ${first(c, ctx.a)} von hinten um. Eine Woche Pause – und ein Riesenknall.`) },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), 'Die Zeit heilt. Nach ein paar Wochen nicken sie sich wieder zu.') },
          { w: 0.5, run: (c, ctx) => (adjustMood(c, -0.03), `Drei Wochen später ist sie zurück bei ${first(c, ctx.b)}. Jetzt ist ${first(c, ctx.a)} der Blamierte.`) },
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
        ? `${first(c, ctx.b)} schreibt dir privat: „Weißt du, wer der Neue ist? ${first(c, ctx.a)} hat mich in der sechsten Klasse jeden Tag in den Mülleimer gesteckt. Jeden Tag."`
        : `${first(c, ctx.a)} und ${first(c, ctx.b)} waren zusammen auf der Gesamtschule – damals das Sturmduo der Schulmannschaft. Die Gruppe ist voll mit alten Fotos.`,
    options: [
      {
        label: 'Aussprache mit beiden',
        effect: outcome([
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 2 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, 0.02), `${first(c, ctx.a)} entschuldigt sich. Nach 20 Jahren. ${first(c, ctx.b)} nimmt es an – halbwegs.`) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1.5 : 0), run: (c, ctx) => (clearPast(c), (c.players[ctx.b].grumpy = 3), `${first(c, ctx.a)} lacht: „Das war doch Spaß damals." ${first(c, ctx.b)} steht auf und geht.`) },
          { w: (c, ctx) => (ctx.kind === 'mobber' && canLose(c) ? 1 : 0), run: (c, ctx) => (clearPast(c), leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} kann das nicht: „Entweder er oder ich." Du hast nicht schnell genug geantwortet. Er ist weg.` : 'Beide bleiben, mit Abstand.') },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, null), (c.players[ctx.b].loyal = true), adjustMood(c, 0.08), `Überraschend ehrliches Gespräch. ${first(c, ctx.a)} hatte es damals zu Hause selbst schwer. Die beiden reden jetzt normal miteinander.`) },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 0.5 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), 'Es wird ein langer Abend. Am Ende liegen sich beide in den Armen. Keiner in der Kabine glaubt es.') },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 3 : 0), run: (c, ctx) => (clearPast(c), adjustForm(c, ctx.a, 0.4), adjustForm(c, ctx.b, 0.4), 'Das alte Sturmduo ist zurück. Sie finden sich auf dem Platz blind.') },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c, ctx) => (clearPast(c), sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), 'Das Wiedersehen wird Samstagnacht ausgiebig gefeiert. Sonntag kommen beide erst zur zweiten Halbzeit.') },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c, ctx) => (clearPast(c), setRelation(c, ctx.a, ctx.b, 'rivalen'), 'Beim dritten Bier kommt raus, wer damals wem die Freundin ausgespannt hat. Plötzlich ist die Stimmung weg.') },
        ]),
      },
      {
        label: 'Den Neuen gleich wieder wegschicken',
        effect: outcome([
          {
            w: (c) => (canLose(c) ? 3 : 0),
            run: (c, ctx) => {
              clearPast(c);
              if (!leaveTeam(c, ctx.a)) return 'Dafür ist der Kader zu dünn.';
              if (ctx.kind === 'mobber') {
                c.players[ctx.b].loyal = true;
                return `${first(c, ctx.a)} ist wieder weg. ${first(c, ctx.b)} wird dir das nie vergessen.`;
              }
              adjustMood(c, -0.1);
              c.players[ctx.b].grumpy = 3;
              return `Ausgerechnet der Schulfreund. ${first(c, ctx.b)} versteht die Welt nicht mehr.`;
            },
          },
          { w: (c) => (canLose(c) && derbyRivalId(c) ? 1 : 0), run: (c, ctx) => (clearPast(c), joinRival(c, ctx.a, derbyRivalId(c)) ? `${first(c, ctx.a)} geht – direkt zum Derby-Rivalen. „Die wollen mich wenigstens."` : 'Er bleibt vorerst.') },
          { w: 1, run: (c) => (clearPast(c), adjustMood(c, -0.06), 'Die Mannschaft findet das hart. „Man gibt doch jedem eine Chance."') },
        ]),
      },
      {
        label: 'Nicht einmischen',
        effect: outcome([
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 3 : 0), run: (c, ctx) => (clearPast(c), adjustForm(c, ctx.b, -0.5), `${first(c, ctx.b)} geht dem Neuen aus dem Weg. Er ist nicht mehr er selbst.`) },
          { w: (c, ctx) => (ctx.kind === 'mobber' && canLose(c) ? 1.5 : 0), run: (c, ctx) => (clearPast(c), leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} verlässt den Verein. Die Erinnerungen sind stärker als der Fußball.` : 'Er bleibt, aber es brodelt.') },
          { w: (c, ctx) => (ctx.kind === 'mobber' ? 1 : 0), run: (c, ctx) => (clearPast(c), (c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), `Im Training revanchiert sich ${first(c, ctx.b)} mit einer Grätsche. Späte Rache, eine Woche Pause für ${first(c, ctx.a)}.`) },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 3 : 0), run: (c) => (clearPast(c), 'Die beiden sind unzertrennlich. Fahrgemeinschaft, Kabinenplatz, Bier danach.') },
          { w: (c, ctx) => (ctx.kind === 'schulfreund' ? 1 : 0), run: (c) => (clearPast(c), adjustMood(c, 0.05), 'Die alten Schulgeschichten sind der Renner in der Kabine.') },
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
        label: 'Öffentlich zu ihm halten',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.3), `„Jeder hat seine Geschichte. Thema durch." ${first(c, ctx.s)} schreibt dir privat: „Danke, Trainer."`) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, 0.06), 'Nach deiner Nachricht erzählen plötzlich alle ihre peinlichsten Geschichten. Die Gruppe war nie lustiger.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, -0.03), 'Ein paar finden, du nimmst ihn zu sehr in Schutz.') },
        ]),
      },
      {
        label: 'Mitlachen',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].grumpy = 3), adjustMood(c, 0.03), `Die Gruppe lacht. ${first(c, ctx.s)} lacht nicht mit.`) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), adjustMood(c, 0.06), `${first(c, ctx.s)} lacht am lautesten. Er hat Humor, der Mann.`) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => ((c.players[ctx.s].dossier = 4), leaveTeam(c, ctx.s) ? `Das war zu viel. ${first(c, ctx.s)} verlässt die Gruppe – und den Verein.` : 'Er schmollt.') },
        ]),
      },
      {
        label: 'Nichts dazu sagen',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), 'Nach einem Tag redet keiner mehr drüber. Fast keiner.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].dossier = 4), (c.players[ctx.s].grumpy = 1), `${first(c, ctx.s)} hätte sich gewünscht, dass du was sagst.`) },
          {
            w: 1,
            run: (c, ctx, rng) => {
              c.players[ctx.s].dossier = 4;
              const others = regulars(c).filter((i) => i !== ctx.s);
              const other = others.length ? rng.pick(others) : null;
              if (other != null) setRelation(c, ctx.s, other, 'rivalen');
              return `Es kommt raus, dass ${other != null ? first(c, other) : 'einer'} das Gerücht gestreut hat. Die beiden sind durch miteinander.`;
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
    text: (c, ctx) => `${first(c, ctx.a)} und ${first(c, ctx.b)} fahren seit ein paar Wochen zusammen zum Training. Jetzt waren sie auch zusammen beim Grillen.`,
    options: [
      {
        label: 'Schön zu sehen',
        effect: outcome([
          { w: 4, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), 'Aus Mitspielern werden Kumpels. Auf dem Platz finden sie sich blind.') },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.05), 'Die beiden organisieren gleich einen Mannschaftsabend. Alle kommen.') },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), sitOut(c, ctx.a, 'late'), sitOut(c, ctx.b, 'late'), 'Beim Grillen wurde es spät. Sonntag kommen beide zur zweiten Halbzeit.') },
          { w: (c, ctx) => (trait(c, ctx.a, 'meckerer') || trait(c, ctx.b, 'meckerer') ? 1 : 0.3), run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), 'Die Fahrgemeinschaft endet im Streit über die Musik im Auto. Jetzt fahren sie getrennt – und reden nicht mehr.') },
        ]),
      },
    ],
  },
};

function clearPast(c) {
  if (c.flags) c.flags.pastLink = null;
}
