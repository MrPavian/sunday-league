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

export const PRESS_FROM = 9; // Regionalliga
const level = (c) => c.level ?? 1;
const on = (c) => level(c) >= PRESS_FROM && !isPresident(c) && !(c.coach?.awayWeeks > 0);
const once = (c, id) => (c.eventLog ?? []).some((e) => e.id === id && e.season === c.season);
const half = (c) => `${c.season}:${(c.round ?? 0) < (c.fixtures?.length ?? 0) / 2 ? 1 : 2}`;
const trust = (c, d) => {
  if (c.board) c.board.trust = Math.max(0, Math.min(100, c.board.trust + d)); // Rückhalt im Vorstand (pressure.js)
};
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
};
