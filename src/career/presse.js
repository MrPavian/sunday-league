// Pressekonferenz ab der Regionalliga (ROADMAP 11.18 Punkt 11, 2026-11-12). Vor und nach wichtigen Spielen stellt die Presse
// Fragen; die Antworten wirken auf Kabine (Stimmung), Vorstand (Rückhalt) und – bei einer großen Ansage – auf das nächste Spiel:
// Wer den Mund voll nimmt, wird eine Woche später daran gemessen (pk_nachfrage). Die ältere „pressekonferenz" nach einer
// Niederlage (proevents.js, ab der Oberliga) bleibt. Alle Wirkungen sind Spielwerte in der Größe der übrigen Ereignisse
// (Stimmung ±0,02 … 0,05, Rückhalt ±1 … 2).
import { tr } from '../core/i18n.js';
import { clubById, humanClub, humanFixture, playerOf, table } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { first, outcome } from './outcomes.js';
import { isCoach, isPresident } from './personal.js';
import { clubLife } from './clublife.js';
import { POKALE, pokalOf } from './pokal.js';
import { typus } from './privat.js';

export const PRESS_FROM = 9; // Regionalliga
const level = (c) => c.level ?? 1;
const on = (c) => level(c) >= PRESS_FROM && !isPresident(c) && !(c.coach?.awayWeeks > 0);
const once = (c, id) => (c.eventLog ?? []).some((e) => e.id === id && e.season === c.season);
const half = (c) => `${c.season}:${(c.round ?? 0) < (c.fixtures?.length ?? 0) / 2 ? 1 : 2}`;
const trust = (c, d) => {
  if (c.board) c.board.trust = Math.max(0, Math.min(100, c.board.trust + d)); // Rückhalt im Vorstand (pressure.js)
};
// Fans (ROADMAP 11.18 Punkt 11, 2026-11-15): Mitglieder im Förderverein, je 1 € pro Woche (clublife.js). Spielwerte ±1 … 3.
const fans = (c, d) => (clubLife(c).supporters = Math.max(0, clubLife(c).supporters + d));
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));
// Ergebnisse der letzten eigenen Ligaspiele, jüngstes zuerst: 1 Sieg, 0 Remis, −1 Niederlage.
export function recentResults(c, n = 5) {
  const me = humanClub(c).id;
  const out = [];
  for (let r = (c.round ?? 0) - 1; r >= 0 && out.length < n; r--) {
    const f = (c.fixtures[r] ?? []).find((x) => x.result && (x.home === me || x.away === me));
    if (!f) continue;
    const [a, b] = f.home === me ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
    out.push(Math.sign(a - b));
  }
  return out;
}
const winStreak = (c) => { const r = recentResults(c); let n = 0; while (n < r.length && r[n] === 1) n++; return n; };
const posOf = (c, id) => table(c).findIndex((r) => r.club.id === id) + 1;
// Nächster Gegner in der Liga, wenn er (oder man selbst) oben steht: ein Spitzenspiel.
function topGame(c) {
  const f = humanFixture(c);
  if (!f || (c.round ?? 0) < 3) return null;
  const me = humanClub(c).id;
  const opp = clubById(c, f.home === me ? f.away : f.home);
  if (!opp) return null;
  const mine = posOf(c, me);
  const theirs = posOf(c, opp.id);
  return mine <= 4 && theirs <= 4 ? { opp: opp.id, name: opp.name, mine, theirs } : null;
}
const flag = (c) => (c.flags ??= {});

export const PRESS_EVENTS = {
  // Vor dem Spitzenspiel: Ansage oder Understatement?
  pk_spitzenspiel: {
    weight: 4,
    needs: (c) => {
      if (!on(c) || flag(c).pkTop === half(c) || flag(c).pkBoast) return null;
      const g = topGame(c);
      return g ? { opp: g.opp, name: g.name, mine: g.mine, theirs: g.theirs } : null;
    },
    text: (c, ctx) => tr(`Pressekonferenz vor dem Spitzenspiel gegen ${ctx.name} (${ctx.theirs}. gegen ${ctx.mine}.). Die Kameras laufen: „Trainer, ist das am Wochenende schon eine Vorentscheidung?“`, `Press conference before the top-of-the-table game against ${ctx.name} (${ctx.theirs}${ctx.theirs === 1 ? 'st' : ctx.theirs === 2 ? 'nd' : ctx.theirs === 3 ? 'rd' : 'th'} against ${ctx.mine}${ctx.mine === 1 ? 'st' : ctx.mine === 2 ? 'nd' : ctx.mine === 3 ? 'rd' : 'th'}). The cameras are rolling: "Coach, is this weekend already decisive?"`),
    options: [
      {
        label: tr('„Wir fahren dahin, um zu gewinnen.“', '"We are going there to win."'),
        effect: (c, ctx) => ((flag(c).pkTop = half(c)), (flag(c).pkBoast = { round: c.round, name: ctx.name }), adjustMood(c, 0.04), tr('Die Schlagzeile steht. In der Kabine hängt sie am nächsten Morgen an der Tür – die Jungs grinsen. Jetzt muss geliefert werden.', 'The headline is written. Next morning it is pinned to the dressing-room door – the lads grin. Now you have to deliver.')),
      },
      {
        label: tr('„Der Gegner ist Favorit, wir können nur überraschen.“', '"They are favourites, we can only spring a surprise."'),
        effect: outcome([
          { w: 3, run: (c) => ((flag(c).pkTop = half(c)), trust(c, 1), tr('Der Druck liegt beim Gegner. Der Vorstand mag es, wenn du den Ball flach hältst.', 'The pressure is on the opposition. The board likes it when you keep expectations low.')) },
          { w: 1, run: (c) => ((flag(c).pkTop = half(c)), adjustMood(c, -0.03), tr('In der Kabine kommt das nicht gut an: „Glaubt der Trainer nicht an uns?“', 'It does not go down well in the dressing room: "Does the gaffer not believe in us?"')) },
        ]),
      },
      {
        label: tr('„Wir schauen nur auf uns.“', '"We only look at ourselves."'),
        effect: (c) => ((flag(c).pkTop = half(c)), tr('Die Reporter klappen die Blöcke zu. Kein Zitat, kein Ärger.', 'The reporters close their notebooks. No quote, no trouble.')),
      },
    ],
  },
  // Eine Woche nach der großen Ansage: geliefert oder nicht?
  pk_nachfrage: {
    weight: 30,
    followUp: true,
    needs: (c) => {
      const b = flag(c).pkBoast;
      if (!b || (c.round ?? 0) <= b.round) return null;
      const r = recentResults(c, 1)[0];
      return r == null ? null : { result: r, name: b.name };
    },
    text: (c, ctx) => (ctx.result === 1
      ? tr(`Nach dem Sieg gegen ${ctx.name} hält dir ein Reporter die Zeitung von letzter Woche hin: „Sie haben es angekündigt.“`, `After the win against ${ctx.name} a reporter holds up last week's paper: "You called it."`)
      : tr(`„Wir fahren dahin, um zu gewinnen“ – nach dem Spiel gegen ${ctx.name} liest dir ein Reporter deinen Satz von letzter Woche vor.`, `"We are going there to win" – after the game against ${ctx.name} a reporter reads your line from last week back to you.`)),
    options: [
      {
        label: tr('Dazu stehen', 'Stand by it'),
        effect: (c, ctx) => {
          delete flag(c).pkBoast;
          if (ctx.result === 1) return adjustMood(c, 0.04), trust(c, 2), tr('„Ich sage, was ich denke – und die Mannschaft hat es umgesetzt.“ Vorstand und Kabine sind stolz.', '"I say what I think – and the team delivered." Board and dressing room are proud.');
          trust(c, ctx.result === 0 ? -1 : -2);
          return tr('„Ich würde es wieder sagen.“ Respekt in der Kabine, Stirnrunzeln im Vorstand.', '"I would say it again." Respect in the dressing room, frowns on the board.');
        },
      },
      {
        label: tr('Kleinere Brötchen backen', 'Eat humble pie'),
        effect: (c, ctx) => {
          delete flag(c).pkBoast;
          if (ctx.result === 1) return trust(c, 1), tr('„Ein Spiel, mehr nicht.“ Der Vorstand schätzt die Ruhe.', '"One game, nothing more." The board appreciates the calm.');
          adjustMood(c, -0.03);
          return tr('„Vielleicht war das zu forsch.“ Die Presse hat ihre Schlagzeile, die Kabine senkt die Köpfe.', '"Perhaps that was too bold." The press has its headline, heads drop in the dressing room.');
        },
      },
    ],
  },
  // Nach drei Siegen in Folge: Wohin geht die Reise?
  pk_serie: {
    weight: 3,
    needs: (c) => (on(c) && winStreak(c) >= 3 && !once(c, 'pk_serie') ? { n: winStreak(c) } : null),
    text: (c, ctx) => tr(`${ctx.n} Siege in Folge. Auf der Pressekonferenz will es einer genau wissen: „Trainer, reden wir jetzt über ganz oben?“`, `${ctx.n} wins in a row. At the press conference someone wants a straight answer: "Coach, are we talking about the very top now?"`),
    options: [
      {
        label: tr('„Warum nicht? Wir nehmen alles mit.“', '"Why not? We will take whatever comes."'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.05), tr('Die Kabine hört es gern. Die Fans auch – am Sonntag ist das Stadion voller.', 'The dressing room likes hearing it. So do the fans – the ground is fuller on Sunday.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), trust(c, -2), tr('Der Sportdirektor ruft an: „Solche Ziele gibt der Verein aus, nicht der Trainer.“', 'The sporting director calls: "The club sets targets like that, not the manager."')) },
        ]),
      },
      { label: tr('„Wir denken von Spiel zu Spiel.“', '"We take it one game at a time."'), effect: (c) => (trust(c, 1), tr('Der älteste Satz des Fußballs. Der Vorstand ist zufrieden, die Reporter gähnen.', 'The oldest line in football. The board is content, the reporters yawn.')) },
      {
        label: tr('Die Mannschaft loben, einen Namen nennen', 'Praise the team and name a name'),
        effect: (c, ctx, rng) => {
          const list = squad(c);
          if (!list.length) return adjustMood(c, 0.03), tr('„Das ist das Verdienst der ganzen Mannschaft.“', '"That is down to the whole team."');
          const best = [...list].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating).slice(0, 5);
          const idx = rng.pick(best);
          adjustForm(c, idx, 0.3);
          adjustMood(c, 0.02);
          return tr(`„Was ${first(c, idx)} gerade spielt, ist überragend.“ ${first(c, idx)} wächst noch ein Stück – zwei andere fragen sich, warum nicht sie.`, `"What ${first(c, idx)} is doing right now is outstanding." ${first(c, idx)} grows a little more – two others wonder why it was not them.`);
        },
      },
    ],
  },
  // Personalfrage: Warum sitzt der Publikumsliebling draußen?
  pk_personal: {
    weight: 2,
    needs: (c, rng) => {
      if (!on(c) || (c.round ?? 0) < 4 || once(c, 'pk_personal')) return null;
      const list = squad(c).filter((i) => (c.players[i]?.grumpy ?? 0) > 0);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`Pressekonferenz. Eine Reporterin hakt nach: „${playerOf(c, ctx.s).name} wirkt unzufrieden. Spielt er bei Ihnen noch eine Rolle?“`, `Press conference. A reporter presses the point: "${playerOf(c, ctx.s).name} looks unhappy. Does he still have a part to play for you?"`),
    options: [
      { label: tr('Sich vor den Spieler stellen', 'Back the player'), effect: (c, ctx) => ((c.players[ctx.s].grumpy = 0), adjustForm(c, ctx.s, 0.2), tr(`„${first(c, ctx.s)} ist ein wichtiger Teil dieser Mannschaft.“ Am nächsten Tag trainiert er wie ausgewechselt.`, `"${first(c, ctx.s)} is an important part of this team." Next day he trains like a different man.`)) },
      {
        label: tr('Ehrlich sein: Leistung entscheidet', 'Be honest: performance decides'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustMood(c, 0.03), tr(`„Bei mir spielt, wer im Training überzeugt.“ Die Kabine nickt – ${first(c, ctx.s)} schweigt.`, `"With me, whoever convinces in training plays." The dressing room nods – ${first(c, ctx.s)} says nothing.`)) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = (c.players[ctx.s].grumpy ?? 0) + 2), adjustMood(c, -0.02), tr(`${first(c, ctx.s)} liest es in der Zeitung und ist bedient. Das Thema ist nicht vorbei.`, `${first(c, ctx.s)} reads it in the paper and has had enough. This is not over.`)) },
        ]),
      },
      { label: tr('„Interna bleiben intern.“', '"Internal matters stay internal."'), effect: () => tr('Die Reporterin notiert: „Trainer weicht aus.“ Mehr passiert nicht.', 'The reporter notes: "Manager dodges the question." Nothing more comes of it.') },
    ],
  },
  // Abstiegskampf: im letzten Drittel der Saison auf einem der letzten drei Plätze.
  pk_abstieg: {
    weight: 4,
    needs: (c) => {
      if (!on(c) || once(c, 'pk_abstieg')) return null;
      const n = c.fixtures?.length ?? 0;
      if ((c.round ?? 0) < (2 * n) / 3) return null;
      const t = table(c);
      const pos = posOf(c, humanClub(c).id);
      return pos > t.length - 3 ? { pos, of: t.length } : null;
    },
    text: (c, ctx) => tr(`Platz ${ctx.pos} von ${ctx.of}, noch eine Handvoll Spiele. Die erste Frage auf der Pressekonferenz: „Trainer, glauben Sie selbst noch an den Klassenerhalt?“`, `${ctx.pos}th of ${ctx.of}, a handful of games left. First question at the press conference: "Coach, do you still believe you can stay up?"`),
    options: [
      { label: tr('„Wir bleiben drin. Punkt.“', '"We are staying up. Full stop."'), effect: outcome([
        { w: 2, run: (c) => (fans(c, 2), adjustMood(c, 0.04), tr('Die Fans hängen den Satz als Banner an den Zaun. Zwei treten in den Förderverein ein.', 'The fans hang the line on the fence as a banner. Two join the supporters\' club.')) },
        { w: 1, run: (c) => (trust(c, -1), adjustMood(c, 0.02), tr('Im Vorstand fragt einer, ob du dir das gut überlegt hast. Die Kabine findet es stark.', 'Someone on the board asks if you have thought that through. The dressing room loves it.')) },
      ]) },
      { label: tr('„Jeder muss sich jetzt hinterfragen, ich zuerst.“', '"Everyone has to look at themselves now, me first."'), effect: (c) => (trust(c, 2), adjustMood(c, -0.02), tr('Der Vorstand nickt anerkennend. Ein paar Spieler fühlen sich angegriffen.', 'The board nods in approval. A few players feel targeted.')) },
      { label: tr('„Mit etwas Glück stünden wir woanders.“', '"With a bit of luck we would be elsewhere."'), effect: (c) => (trust(c, -1), fans(c, -1), tr('Die Zeitung titelt „Pech-Trainer“. Am Zaun wird gemurrt.', 'The paper runs "The unlucky coach". There is grumbling at the fence.')) },
    ],
  },
  // Pokal: Die nächste Pokalrunde steht in den nächsten Wochen an.
  pk_pokal: {
    weight: 3,
    needs: (c) => {
      if (!on(c)) return null;
      for (const kind of ['bund', 'bezirk', 'kreis']) {
        const cup = pokalOf(c, kind);
        if (!cup || cup.done || cup.out) continue;
        const at = cup.rounds?.[cup.round];
        if (at != null && at >= c.round && at - c.round <= 2 && flag(c).pkCup !== `${c.season}:${kind}:${cup.round}`) return { kind, round: cup.round, cup: POKALE[kind].name };
      }
      return null;
    },
    text: (c, ctx) => tr(`Vor der nächsten Runde im ${ctx.cup} will ein Reporter wissen: „Pokal oder Liga – was ist Ihnen wichtiger?“`, `Before the next round of the ${ctx.cup} a reporter wants to know: "Cup or league – which matters more to you?"`),
    options: [
      { label: tr('„Der Pokal hat seine eigenen Gesetze. Wir wollen weiter.“', '"The cup has its own rules. We want to go through."'), effect: (c, ctx) => ((flag(c).pkCup = `${c.season}:${ctx.kind}:${ctx.round}`), fans(c, 1), adjustMood(c, 0.02), tr('Die Fans planen schon die Auswärtsfahrt zur nächsten Runde.', 'The fans are already planning the away trip to the next round.')) },
      { label: tr('„Die Liga geht vor. Ich werde rotieren.“', '"The league comes first. I will rotate."'), effect: (c, ctx) => ((flag(c).pkCup = `${c.season}:${ctx.kind}:${ctx.round}`), trust(c, 1), fans(c, -1), tr('Der Vorstand ist einverstanden. Am Zaun sagt einer: „Pokal ist doch das Schönste.“', 'The board agrees. At the fence someone says: "But the cup is the best bit."')) },
    ],
  },
  // Auftreten: Die Presse fragt nach dem Trainer selbst – je nach Trainertypus (privat.js).
  pk_auftreten: {
    weight: 2,
    needs: (c) => {
      if (!on(c) || once(c, 'pk_auftreten')) return null;
      const t = typus(c);
      return t === 'lebemann' || t === 'geschaeft' || t === 'wohltaeter' || t === 'sparfuchs' ? { t } : null;
    },
    text: (c, ctx) => ({
      lebemann: tr('„Trainer, man sieht Sie öfter in teuren Restaurants als auf dem Trainingsplatz“, sagt ein Reporter und grinst.', '"Coach, you are seen in expensive restaurants more often than on the training pitch," says a reporter, grinning.'),
      geschaeft: tr('„Anzug, Limousine – sind Sie Trainer oder Geschäftsführer?“, fragt ein Reporter.', '"Suit, saloon car – are you a coach or a managing director?" a reporter asks.'),
      wohltaeter: tr('„Es heißt, Sie stecken einen Teil Ihres Gehalts in den Verein. Stimmt das?“', '"They say you put part of your salary into the club. Is that true?"'),
      sparfuchs: tr('„Man sagt, Sie fahren noch das Auto, mit dem Sie in der Kreisliga angefangen haben?“', '"They say you still drive the car you started with in the district league?"'),
    })[ctx.t],
    options: [
      { label: tr('Mit Humor antworten', 'Answer with humour'), effect: outcome([
        { w: 2, run: (c) => (fans(c, 1), tr('Der Saal lacht. Das Zitat macht die Runde, die Fans mögen es.', 'The room laughs. The quote does the rounds and the fans like it.')) },
        { w: 1, run: (c) => (trust(c, -1), tr('Der Witz kommt schief an. Im Vorstand findet man ihn nicht lustig.', 'The joke lands badly. The board does not find it funny.')) },
      ]) },
      { label: tr('„Privat ist privat.“', '"Private is private."'), effect: (c, ctx) => (ctx.t === 'wohltaeter' ? (trust(c, 1), tr('Gerade die Zurückhaltung kommt gut an. Im Vorstand weiß man es ohnehin.', 'The modesty goes down well. The board knows anyway.')) : tr('Die Reporter notieren es und fragen nach der Aufstellung.', 'The reporters note it down and ask about the line-up.')) },
      { label: tr('„Über Fußball rede ich gern, darüber nicht.“', '"I will talk football, not that."'), effect: (c, ctx) => ((ctx.t === 'lebemann' ? fans(c, -1) : null), tr('Kurze Stille. Dann die nächste Frage zum Wochenende.', 'A brief silence. Then the next question about the weekend.')) },
    ],
  },
};
