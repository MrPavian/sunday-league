// Alltag der Spieler: Schichtdienst, Montage, Stress im Job, Beförderung,
// kranke Kinder, Elternzeit, Nebenjob, Trennung. Wer welches Ereignis bekommen
// kann, hängt von Beruf, Alter und Lebenslage ab.
import { tr } from '../core/i18n.js';
import { jobName } from '../data/names.js';
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { SHIFT_JOBS, TRAVEL_JOBS } from './chat.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, leaveTeam, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { startStory } from './stories.js';

const STUDENT = /^(Student|Schüler|Azubi|FSJ)/;
const NO_JOB = /^(Student|Schüler|Azubi|FSJ|Frührentner|Arbeitssuchend|Privatier)/;
const regulars = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && !playerOf(c, idx).custom);
function pick(c, rng, filter) {
  const list = regulars(c).filter((idx) => filter(playerOf(c, idx), c.players[idx]));
  return list.length ? { s: rng.pick(list) } : null;
}
const away = (c, idx, weeks, reason) => {
  const rec = c.players[idx];
  rec.awayWeeks = Math.max(rec.awayWeeks ?? 0, weeks);
  rec.awayReason = reason;
  sitOut(c, idx);
};
const mul = (c, idx, f) => (c.players[idx].absenceMul = Math.max(0.3, Math.min(3, (c.players[idx].absenceMul ?? 1) * f)));
const two = (c, rng, not) => regulars(c).filter((i) => i !== not).sort(() => rng.next() - 0.5).slice(0, 2);
const ON_JOB = () => tr('Bin auf Montage.', 'Away on a job.');

export const LIFE_EVENTS = {
  schicht_tausch: {
    weight: 3,
    needs: (c, rng) => pick(c, rng, (p) => SHIFT_JOBS.includes(p.profession)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} (${playerOf(c, ctx.s).profession}) hat Sonntag Frühschicht bekommen. Tauschen geht nur, wenn einer einspringt.`, `${first(c, ctx.s)} (${jobName(playerOf(c, ctx.s).profession)}) has been given the early shift on Sunday. He can only swap if someone covers for him.`),
    options: [
      {
        label: tr('Dem Kollegen einen Kasten spendieren (12 €)', 'Buy his colleague a crate (€12)'),
        effect: outcome([
          { w: 4, run: (c, ctx) => (book(c, tr('Kasten für den Schichttausch', 'Crate for the shift swap'), -12), sitOut(c, ctx.s, 'yes'), tr('Der Kollege tauscht. Für einen Kasten macht man das.', 'The colleague swaps. For a crate, you do that.')) },
          { w: 2, run: (c, ctx) => (book(c, tr('Kasten für den Schichttausch', 'Crate for the shift swap'), -12), sitOut(c, ctx.s, 'late'), tr('Tausch klappt halb: Er kommt direkt nach der Schicht, zur zweiten Halbzeit.', 'Half a swap: he comes straight from his shift, for the second half.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Kasten für den Schichttausch', 'Crate for the shift swap'), -12), sitOut(c, ctx.s, 'yes'), tr('Der Kollege tauscht – und fragt, ob er mal mittrainieren darf. Kickt wohl ganz ordentlich.', 'The colleague swaps – and asks if he can join training. Apparently he can play a bit.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Kasten für den Schichttausch', 'Crate for the shift swap'), -12), (c.players[ctx.s].grumpy = 1), tr('Der Schichtleiter merkt den Deal und gibt ihm eine Abmahnung. Er spielt, aber mit schlechtem Gewissen.', 'The shift manager notices the deal and gives him a warning. He plays, but with a guilty conscience.')) },
        ]),
      },
      {
        label: tr('Ich ruf seinen Chef an', 'I\'ll ring his boss'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 0.6), sitOut(c, ctx.s, 'yes'), tr('Der Chef spielt selbst Altherren. Ab jetzt hat er sonntags fast immer frei.', 'The boss plays veterans\' football himself. From now on he nearly always has Sundays off.')) },
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), sitOut(c, ctx.s), tr(`Der Chef ist genervt, und ${first(c, ctx.s)} peinlich berührt: „Wie alt bin ich, zwölf?"`, `The boss is annoyed, and ${first(c, ctx.s)} is mortified: "What am I, twelve?"`)) },
          { w: 1, run: (c, ctx) => (book(c, tr('Spende vom Chef', 'Donation from the boss'), 20), sitOut(c, ctx.s, 'yes'), tr('Der Chef findet das Engagement gut: Frei für Sonntag und 20 € für die Kasse.', 'The boss likes the commitment: Sunday off and €20 for the kitty.')) },
          { w: 1, run: (c, ctx) => (mul(c, ctx.s, 1.8), sitOut(c, ctx.s), tr('Schlechte Idee. Er wird zur Strafe in die Wochenendschicht versetzt.', 'Bad idea. He is moved onto weekend shifts as punishment.')) },
          { w: 0.5, run: (c, ctx) => (startStory(c, 'jobverlust', ctx.s, { help: false }), Object.assign(c.players[ctx.s], { job: 'Arbeitssuchend', absenceMul: 0.3 }), tr(`Das Gespräch eskaliert. Am Montag ist ${first(c, ctx.s)} seinen Job los. Er hat jetzt sehr viel Zeit.`, `The call gets out of hand. On Monday ${first(c, ctx.s)} loses his job. He now has an awful lot of time.`)) },
        ]),
      },
      {
        label: tr('Dann fehlt er halt', 'Then he misses it'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), tr('Er arbeitet. Einer weniger am Sonntag.', 'He works. One fewer on Sunday.')) },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), tr('Er organisiert selbst einen Tausch und kommt zur zweiten Halbzeit.', 'He sorts out a swap himself and comes for the second half.')) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), (c.players[ctx.s].grumpy = 1), tr('Er hatte gehofft, du setzt dich für ihn ein.', 'He had hoped you would stand up for him.')) },
          { w: 0.6, run: (c, ctx) => (sitOut(c, ctx.s, 'yes'), mul(c, ctx.s, 0.8), tr('Er meldet sich krank und spielt. Du hast nichts gesehen.', 'He calls in sick and plays. You saw nothing.')) },
        ]),
      },
    ],
  },

  montage: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p, r) => TRAVEL_JOBS.includes(p.profession) && !(r.awayWeeks > 0)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} muss auf Montage – ${['nach Norwegen', 'nach Oberbayern', 'auf eine Bohrinsel', 'nach Dubai'][ctx.s % 4]}. Drei Wochen, sagt der Chef.`, `${first(c, ctx.s)} has to go away on a job – ${['to Norway', 'to Upper Bavaria', 'to an oil rig', 'to Dubai'][ctx.s % 4]}. Three weeks, says the boss.`),
    options: [
      {
        label: tr('Gute Reise – wir halten deinen Platz frei', 'Safe travels – we\'ll keep your place'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 3, tr('Bin auf Montage. Schickt mir die Ergebnisse!', 'Away on a job. Send me the results!')), (c.players[ctx.s].loyal = true), tr('Er fährt beruhigt. Zurück kommt er als Treuester von allen.', 'He leaves reassured. He comes back the most loyal of them all.')) },
          { w: 2, run: (c, ctx) => (away(c, ctx.s, 5, tr('Montage verlängert. Ich dreh durch.', 'Job extended. I\'m going mad.')), tr('Aus drei Wochen werden fünf. Die Firma hat verlängert.', 'Three weeks become five. The company extended it.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 2, tr('Bin auf Montage, nächste Woche zurück.', 'Away on a job, back next week.')), tr('Schneller fertig als gedacht – nur zwei Wochen.', 'Finished faster than expected – only two weeks.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, ON_JOB()), book(c, tr('Spende eines Montage-Kollegen', 'Donation from a work colleague'), 25), tr('Auf Montage erzählt er so viel vom Verein, dass ein Kollege 25 € spendet.', 'On the job he talks so much about the club that a colleague donates €25.')) },
          { w: 0.7, run: (c, ctx) => (away(c, ctx.s, 3, ON_JOB()), adjustForm(c, ctx.s, -0.6), tr('Er kommt mit fünf Kilo mehr zurück. „Das Kantinenessen war zu gut."', 'He comes back five kilos heavier. "The canteen food was too good."')) },
        ]),
      },
      {
        label: tr('Kannst du das nicht tauschen?', 'Can\'t you swap it?'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (away(c, ctx.s, 3, tr('Montage. Tauschen ging nicht.', 'Away on a job. Couldn\'t swap.')), (c.players[ctx.s].grumpy = 2), tr('„Das ist mein Job, Trainer." Er fährt – und ist sauer.', '"It\'s my job, gaffer." He goes – and he\'s annoyed.')) },
          { w: 1.5, run: () => tr('Er tauscht tatsächlich mit einem Kollegen. Der Chef findet es komisch, aber okay.', 'He actually swaps with a colleague. The boss finds it odd, but fine.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 1, tr('Nur eine Woche weg.', 'Only away for a week.')), tr('Er handelt es auf eine Woche runter.', 'He negotiates it down to one week.')) },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`${first(c, ctx.s)} hat keine Lust mehr auf den Spagat zwischen Job und Verein. Er hört auf.`, `${first(c, ctx.s)} is tired of juggling job and club. He quits.`) : tr('Er fährt.', 'He goes.')) },
        ]),
      },
      {
        label: tr('Alles klar, bis dann', 'All right, see you then'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 3, ON_JOB()), tr('Drei Wochen ohne ihn.', 'Three weeks without him.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 4, tr('Montage dauert länger.', 'The job is taking longer.')), tr('Vier Wochen. Und er meldet sich kaum.', 'Four weeks. And he barely gets in touch.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, ON_JOB()), adjustForm(c, ctx.s, 0.4), tr('Er trainiert dort im Hotel-Fitnessraum und kommt fitter zurück als vorher.', 'He trains in the hotel gym and comes back fitter than before.')) },
        ]),
      },
    ],
  },

  job_stress: {
    weight: 2.5,
    needs: (c, rng) => pick(c, rng, (p, r) => !NO_JOB.test(p.profession) && p.age >= 22 && !(r.awayWeeks > 0)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} ist durch: Überstunden, Deadline, Chef im Nacken. „Ich weiß nicht, ob ich Sonntag den Kopf frei hab."`, `${first(c, ctx.s)} is fried: overtime, deadlines, the boss breathing down his neck. "I don't know if my head will be clear on Sunday."`),
    options: [
      {
        label: tr('Nimm dir eine Woche frei vom Fußball', 'Take a week off football'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 1, tr('Brauche eine Pause, nächste Woche wieder da.', 'Need a break, back next week.')), adjustForm(c, ctx.s, 0.5), tr('Eine Woche Ruhe, dann ist er wieder da – erholt.', 'A week of rest, then he is back – refreshed.')) },
          { w: 1.5, run: (c, ctx) => (away(c, ctx.s, 1, tr('Pause.', 'Break.')), (c.players[ctx.s].loyal = true), tr('„Danke, dass du das verstehst." Er meint es ernst.', '"Thanks for understanding." He means it.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 1, tr('Pause.', 'Break.')), (c.players[ctx.s].grumpy = 1), tr('Er fühlt sich aussortiert. „Ich hab doch nur gesagt, dass ich gestresst bin."', 'He feels dropped. "I only said I was stressed."')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, tr('Ich bin krankgeschrieben. Burnout, sagt der Arzt.', 'I\'m signed off sick. Burnout, the doctor says.')), tr('Aus einer Woche werden drei. Der Arzt hat ihn krankgeschrieben.', 'One week becomes three. The doctor has signed him off.')) },
        ]),
      },
      {
        label: tr('Fußball ist der beste Ausgleich!', 'Football is the best way to unwind!'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), tr('Auf dem Platz vergisst er alles. Genau das hat er gebraucht.', 'On the pitch he forgets everything. Exactly what he needed.')) },
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.5), tr('Er ist da, aber nicht bei der Sache. Zweimal geht das Handy in der Halbzeit.', 'He is there, but his mind is elsewhere. His phone goes twice at half-time.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, tr('Ich kann gerade nicht. Sorry.', 'I just can\'t right now. Sorry.')), tr('Im Training bricht er zusammen, Kreislauf. Drei Wochen Pause.', 'He collapses at training, circulation problems. Three weeks out.')) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`${first(c, ctx.s)} muss Prioritäten setzen. Der Fußball ist raus.`, `${first(c, ctx.s)} has to set priorities. Football is out.`) : tr('Er macht weiter, irgendwie.', 'He carries on, somehow.')) },
          { w: 0.8, run: (c, ctx) => (adjustForm(c, ctx.s, 0.8), tr(`${first(c, ctx.s)} lässt den ganzen Frust raus – Sonntag spielt er wie nie.`, `${first(c, ctx.s)} lets all his frustration out – on Sunday he plays like never before.`)) },
        ]),
      },
      {
        label: tr('Das muss er selbst wissen', 'That\'s up to him'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (mul(c, ctx.s, 1.4), tr('Er kommt seltener. Der Job frisst ihn auf.', 'He comes less often. The job is eating him up.')) },
          { w: 1.5, run: () => tr('Die Deadline ist vorbei, alles wieder normal.', 'The deadline passes, everything back to normal.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 4, tr('Krankgeschrieben.', 'Signed off sick.')), tr('Er klappt zusammen. Vier Wochen krankgeschrieben.', 'He burns out. Signed off for four weeks.')) },
        ]),
      },
    ],
  },

  befoerderung: {
    weight: 1.5,
    needs: (c, rng) => pick(c, rng, (p) => !NO_JOB.test(p.profession) && p.age >= 25),
    text: (c, ctx) => tr(`${first(c, ctx.s)} ist befördert worden! Teamleiter. Mehr Geld, mehr Verantwortung – und weniger Zeit?`, `${first(c, ctx.s)} has been promoted! Team leader. More money, more responsibility – and less time?`),
    options: [
      {
        label: tr('Glückwunsch – die Runde geht auf dich!', 'Congratulations – the round is on you!'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.08), tr('Er gibt eine Runde aus und strahlt den ganzen Abend.', 'He buys a round and beams all evening.')) },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.5), adjustMood(c, 0.04), tr('Schöner Abend. Aber ab jetzt hat er öfter Termine am Wochenende.', 'Nice evening. But from now on he has more weekend commitments.')) },
          { w: 1, run: (c) => (book(c, tr('Neuer Sponsor: Firma des Beförderten', 'New sponsor: the promoted player\'s company'), 40), adjustMood(c, 0.06), tr('Als Teamleiter hat er jetzt ein Budget – und die Firma sponsert euch mit 40 €.', 'As team leader he now has a budget – and the company sponsors you with €40.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), adjustMood(c, -0.04), tr('Er hält sich jetzt für was Besseres. Beim Training erklärt er allen „Prozesse".', 'He now thinks he is a cut above. At training he explains "processes" to everyone.')) },
        ]),
      },
      {
        label: tr('Hoffentlich bleibt noch Zeit für uns', 'Hopefully there is still time for us'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].loyal = true), tr('„Für euch immer." Er lässt den Sonntag im Kalender blocken.', '"Always for you lot." He blocks out Sundays in his calendar.')) },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.7), tr('Ehrliche Antwort: „Weniger als früher."', 'Honest answer: "Less than before."')) },
          { w: 1, run: (c, ctx) => (startStory(c, 'umzug', ctx.s, { city: tr('der Zentrale', 'head office') }), (c.players[ctx.s].absenceMul = 3), tr('Die Beförderung hat einen Haken: Die Stelle ist in der Zentrale, 90 km weg.', 'The promotion has a catch: the job is at head office, 90 km away.')) },
        ]),
      },
    ],
  },

  kind_krank: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 27 && p.age <= 48),
    text: (c, ctx) => tr(`Bei ${first(c, ctx.s)} zu Hause geht Magen-Darm rum. Beide Kinder, die Frau – und er fühlt sich auch schon komisch.`, `A stomach bug is going round ${first(c, ctx.s)}'s house. Both kids, his wife – and he is already feeling funny too.`),
    options: [
      {
        label: tr('Bleib bloß zu Hause!', 'Stay at home, for goodness\' sake!'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), tr('Er bleibt zu Hause. Richtig so.', 'He stays at home. Quite right.')) },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), tr('Sonntagfrüh sind alle wieder fit. Er kommt zur zweiten Halbzeit.', 'By Sunday morning everyone is fine again. He comes for the second half.')) },
          { w: 1, run: (c, ctx, rng) => { for (const i of two(c, rng, ctx.s)) sitOut(c, i); sitOut(c, ctx.s); return tr('Zu spät: Beim Training am Donnerstag hat er schon zwei angesteckt.', 'Too late: he already infected two at Thursday training.'); } },
        ]),
      },
      {
        label: tr('Kommst du trotzdem? Wir sind knapp.', 'Can you come anyway? We are short.'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.7), tr('Er kommt, bleich wie die Wand. Nach 20 Minuten muss er in die Büsche.', 'He comes, white as a sheet. After 20 minutes he has to dash into the bushes.')) },
          { w: 2, run: (c, ctx, rng) => { const sick = two(c, rng, ctx.s); for (const i of sick) sitOut(c, i); return tr(`Er kommt – und steckt ${sick.map((i) => first(c, i)).join(' und ')} an. Die fehlen dann nächste Woche.`, `He comes – and infects ${sick.map((i) => first(c, i)).join(' and ')}. They miss next week.`); } },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), sitOut(c, ctx.s), tr('Seine Frau nimmt ihm das Handy weg: „Du spinnst wohl." Er ist sauer – auf dich.', 'His wife takes his phone away: "Are you mad?" He is annoyed – with you.')) },
          { w: 1, run: () => tr('Er kommt, und ihm geht es blendend. Glück gehabt.', 'He comes and feels great. Lucky.') },
        ]),
      },
      {
        label: tr('Gute Besserung an alle', 'Get well soon, everyone'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), tr('Er fehlt. Die Gruppe schickt Genesungs-Memes.', 'He misses it. The group sends get-well memes.')) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.03), tr('Die Spielerfrauen organisieren eine Suppe für die Familie. Schöne Geste.', 'The players\' partners organise soup for the family. Lovely gesture.')) },
          { w: 1, run: (c, ctx) => sitOut(c, ctx.s, 'late') ?? tr('Er kommt zur zweiten Halbzeit, mit Wärmflasche.', 'He comes for the second half, with a hot-water bottle.') },
        ]),
      },
    ],
  },

  elternzeit: {
    weight: 1.2,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 26 && p.age <= 42 && !NO_JOB.test(p.profession)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} nimmt zwei Monate Elternzeit. „Endlich mal Zeit!", sagt er. Seine Frau lacht.`, `${first(c, ctx.s)} is taking two months of parental leave. "Finally some time!" he says. His wife laughs.`),
    options: [
      {
        label: tr('Super – dann hast du ja Zeit fürs Training!', 'Great – then you have time for training!'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 0.6), adjustForm(c, ctx.s, 0.3), tr('Er ist tatsächlich öfter da – mit Babyphone in der Tasche.', 'He really is around more – with the baby monitor in his pocket.')) },
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.4), tr('Das Baby schläft nicht, er auch nicht. Er kommt, aber im Halbschlaf.', 'The baby does not sleep, and neither does he. He comes, but half asleep.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, tr('Elternzeit heißt Eltern-Zeit, sagt meine Frau.', 'Parental leave means parent time, says my wife.')), tr('Seine Frau hat eine andere Vorstellung von Elternzeit. Drei Wochen Fußballverbot.', 'His wife has a different idea of parental leave. Three weeks\' football ban.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.06), tr('Er bringt das Baby zu jedem Heimspiel mit. Das Kind hat jetzt ein Mini-Trikot.', 'He brings the baby to every home game. The little one now has a mini kit.')) },
        ]),
      },
      {
        label: tr('Genieß die Zeit mit der Familie', 'Enjoy the time with your family'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].loyal = true), tr('Er rechnet dir das hoch an.', 'He really appreciates it.')) },
          { w: 1, run: (c, ctx) => (mul(c, ctx.s, 1.3), tr('Er genießt – und kommt seltener.', 'He enjoys it – and comes less often.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Er schickt jeden Sonntag ein Foto: Baby im Vereinsschal vor dem Liveticker.', 'Every Sunday he sends a photo: baby in a club scarf in front of the live ticker.')) },
        ]),
      },
    ],
  },

  nebenjob: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p) => STUDENT.test(p.profession)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} braucht Geld und hat einen Nebenjob angenommen – sonntags im Café. „Sorry, Miete muss sein."`, `${first(c, ctx.s)} needs money and has taken a side job – Sundays at a café. "Sorry, rent has to be paid."`),
    options: [
      {
        label: tr('Die Kasse gibt ihm einen Zuschuss (30 €)', 'The kitty gives him a grant (€30)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr(`Zuschuss für ${first(c, ctx.s)}`, `Grant for ${first(c, ctx.s)}`), -30), (c.players[ctx.s].loyal = true), tr('Er kündigt den Sonntagsdienst. „Ihr seid die Besten."', 'He quits the Sunday shift. "You lot are the best."')) },
          { w: 1.5, run: (c, ctx) => (book(c, tr(`Zuschuss für ${first(c, ctx.s)}`, `Grant for ${first(c, ctx.s)}`), -30), mul(c, ctx.s, 1.5), tr('Er nimmt das Geld – und arbeitet trotzdem jeden zweiten Sonntag.', 'He takes the money – and still works every other Sunday.')) },
          { w: 1, run: (c, ctx) => (book(c, tr(`Zuschuss für ${first(c, ctx.s)}`, `Grant for ${first(c, ctx.s)}`), -30), adjustMood(c, -0.06), tr('Jetzt wollen drei andere auch einen Zuschuss. Die Kabine diskutiert über Gerechtigkeit.', 'Now three others want a grant too. The dressing room debates fairness.')) },
        ]),
      },
      {
        label: tr('Ich hör mich nach einem anderen Job um', 'I\'ll ask around for another job'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (Object.assign(c.players[ctx.s], { job: `Aushilfe bei ${c.sponsors?.[0]?.name ?? 'der Bäckerei Krume'}`, absenceMul: 1 }), tr('Ein Sponsor sucht eine Aushilfe unter der Woche. Passt perfekt.', 'A sponsor is looking for weekday help. Perfect fit.')) },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.8), tr('Nichts gefunden. Er bleibt im Café.', 'Nothing found. He stays at the café.')) },
          { w: 1, run: (c, ctx) => (Object.assign(c.players[ctx.s], { job: 'Aushilfe im Vereinsheim' }), book(c, tr('Aushilfe im Vereinsheim', 'Clubhouse helper'), -10), tr('Er jobbt jetzt im Vereinsheim – und zapft nach dem Spiel.', 'He now works at the clubhouse – and pulls pints after the game.')) },
        ]),
      },
      {
        label: tr('Schade, aber verständlich', 'A shame, but understandable'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (mul(c, ctx.s, 2), tr('Er fehlt jetzt öfter.', 'He misses more games now.')) },
          { w: 1, run: () => tr('Nach zwei Wochen schmeißt er den Job. „Der Chef war ein Tyrann."', 'After two weeks he quits the job. "The boss was a tyrant."') },
          { w: (c) => (canLose(c) ? 0.7 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`${first(c, ctx.s)} hat keine Zeit mehr. Er verabschiedet sich.`, `${first(c, ctx.s)} has no time left. He says goodbye.`) : tr('Er fehlt öfter.', 'He misses more games.')) },
        ]),
      },
    ],
  },

  trennung: {
    weight: 1,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 28),
    text: (c, ctx) => tr(`${first(c, ctx.s)} lebt in Trennung. Er schläft gerade auf dem Sofa eines Kumpels und redet mit niemandem darüber.`, `${first(c, ctx.s)} has separated from his partner. He is sleeping on a mate's sofa and not talking to anyone about it.`),
    options: [
      {
        label: tr('Für ihn da sein – Gespräch unter vier Augen', 'Be there for him – a one-to-one chat'),
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.2), tr('Er redet zum ersten Mal darüber. Danach geht es ihm etwas besser.', 'He talks about it for the first time. Afterwards he feels a little better.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.4), tr('Er will nicht reden. Aber er weiß jetzt, dass du da bist.', 'He does not want to talk. But now he knows you are there.')) },
          { w: 1, run: (c, ctx) => (startStory(c, 'umzug', ctx.s, { city: tr('seiner Heimatstadt', 'his home town') }), (c.players[ctx.s].absenceMul = 3), tr('Er zieht zurück zu seinen Eltern – 80 km weg. Er will trotzdem weiterspielen.', 'He moves back in with his parents – 80 km away. He still wants to keep playing.')) },
        ]),
      },
      {
        label: tr('Ablenkung: Mannschaftsabend!', 'Distraction: team night out!'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Mannschaftsabend', 'Team night out'), -25), adjustMood(c, 0.1), tr('Der Abend tut allen gut. Er lacht zum ersten Mal seit Wochen.', 'The evening does everyone good. He laughs for the first time in weeks.')) },
          { w: 1.5, run: (c, ctx) => (book(c, tr('Mannschaftsabend', 'Team night out'), -25), adjustForm(c, ctx.s, -0.6), tr('Er trinkt zu viel und erzählt allen alles. Sonntag ist er nicht zu gebrauchen.', 'He drinks too much and tells everyone everything. On Sunday he is useless.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Mannschaftsabend', 'Team night out'), -25), adjustForm(c, ctx.s, 0.7), tr('Am Sonntag spielt er wie befreit. Zwei Tore, danach heult er in der Kabine.', 'On Sunday he plays like a man set free. Two goals, then he cries in the dressing room.')) },
        ]),
      },
      {
        label: tr('Nicht ansprechen – er meldet sich schon', 'Don\'t mention it – he\'ll come to you'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, -0.5), tr('Er spielt, aber er ist nicht er selbst.', 'He plays, but he is not himself.')) },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 2, tr('Brauch mal Abstand von allem.', 'Need some distance from everything.')), tr('Er taucht zwei Wochen ab.', 'He disappears for two weeks.')) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`${first(c, ctx.s)} zieht einen Schlussstrich unter alles – auch unter den Fußball.`, `${first(c, ctx.s)} draws a line under everything – football included.`) : tr('Er bleibt, still.', 'He stays, quietly.')) },
          { w: 1, run: () => tr('Nach ein paar Wochen ist er wieder ganz der Alte. Menschen sind erstaunlich.', 'After a few weeks he is his old self again. People are amazing.') },
        ]),
      },
    ],
  },
};
