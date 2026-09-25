// Alltag der Spieler: Schichtdienst, Montage, Stress im Job, Beförderung,
// kranke Kinder, Elternzeit, Nebenjob, Trennung. Wer welches Ereignis bekommen
// kann, hängt von Beruf, Alter und Lebenslage ab.
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

export const LIFE_EVENTS = {
  schicht_tausch: {
    weight: 3,
    needs: (c, rng) => pick(c, rng, (p) => SHIFT_JOBS.includes(p.profession)),
    text: (c, ctx) => `${first(c, ctx.s)} (${playerOf(c, ctx.s).profession}) hat Sonntag Frühschicht bekommen. Tauschen geht nur, wenn einer einspringt.`,
    options: [
      {
        label: 'Dem Kollegen einen Kasten spendieren (12 €)',
        effect: outcome([
          { w: 4, run: (c, ctx) => (book(c, 'Kasten für den Schichttausch', -12), sitOut(c, ctx.s, 'yes'), 'Der Kollege tauscht. Für einen Kasten macht man das.') },
          { w: 2, run: (c, ctx) => (book(c, 'Kasten für den Schichttausch', -12), sitOut(c, ctx.s, 'late'), 'Tausch klappt halb: Er kommt direkt nach der Schicht, zur zweiten Halbzeit.') },
          { w: 1, run: (c, ctx) => (book(c, 'Kasten für den Schichttausch', -12), sitOut(c, ctx.s, 'yes'), 'Der Kollege tauscht – und fragt, ob er mal mittrainieren darf. Kickt wohl ganz ordentlich.') },
          { w: 1, run: (c, ctx) => (book(c, 'Kasten für den Schichttausch', -12), (c.players[ctx.s].grumpy = 1), 'Der Schichtleiter merkt den Deal und gibt ihm eine Abmahnung. Er spielt, aber mit schlechtem Gewissen.') },
        ]),
      },
      {
        label: 'Ich ruf seinen Chef an',
        effect: outcome([
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 0.6), sitOut(c, ctx.s, 'yes'), 'Der Chef spielt selbst Altherren. Ab jetzt hat er sonntags fast immer frei.') },
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), sitOut(c, ctx.s), `Der Chef ist genervt, und ${first(c, ctx.s)} peinlich berührt: „Wie alt bin ich, zwölf?"`) },
          { w: 1, run: (c, ctx) => (book(c, 'Spende vom Chef', 20), sitOut(c, ctx.s, 'yes'), 'Der Chef findet das Engagement gut: Frei für Sonntag und 20 € für die Kasse.') },
          { w: 1, run: (c, ctx) => (mul(c, ctx.s, 1.8), sitOut(c, ctx.s), 'Schlechte Idee. Er wird zur Strafe in die Wochenendschicht versetzt.') },
          { w: 0.5, run: (c, ctx) => (startStory(c, 'jobverlust', ctx.s, { help: false }), Object.assign(c.players[ctx.s], { job: 'Arbeitssuchend', absenceMul: 0.3 }), `Das Gespräch eskaliert. Am Montag ist ${first(c, ctx.s)} seinen Job los. Er hat jetzt sehr viel Zeit.`) },
        ]),
      },
      {
        label: 'Dann fehlt er halt',
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), 'Er arbeitet. Einer weniger am Sonntag.') },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), 'Er organisiert selbst einen Tausch und kommt zur zweiten Halbzeit.') },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), (c.players[ctx.s].grumpy = 1), 'Er hatte gehofft, du setzt dich für ihn ein.') },
          { w: 0.6, run: (c, ctx) => (sitOut(c, ctx.s, 'yes'), mul(c, ctx.s, 0.8), 'Er meldet sich krank und spielt. Du hast nichts gesehen.') },
        ]),
      },
    ],
  },

  montage: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p, r) => TRAVEL_JOBS.includes(p.profession) && !(r.awayWeeks > 0)),
    text: (c, ctx) => `${first(c, ctx.s)} muss auf Montage – ${['nach Norwegen', 'nach Oberbayern', 'auf eine Bohrinsel', 'nach Dubai'][ctx.s % 4]}. Drei Wochen, sagt der Chef.`,
    options: [
      {
        label: 'Gute Reise – wir halten deinen Platz frei',
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 3, 'Bin auf Montage. Schickt mir die Ergebnisse!'), (c.players[ctx.s].loyal = true), 'Er fährt beruhigt. Zurück kommt er als Treuester von allen.') },
          { w: 2, run: (c, ctx) => (away(c, ctx.s, 5, 'Montage verlängert. Ich dreh durch.'), 'Aus drei Wochen werden fünf. Die Firma hat verlängert.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 2, 'Bin auf Montage, nächste Woche zurück.'), 'Schneller fertig als gedacht – nur zwei Wochen.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, 'Bin auf Montage.'), book(c, 'Spende eines Montage-Kollegen', 25), 'Auf Montage erzählt er so viel vom Verein, dass ein Kollege 25 € spendet.') },
          { w: 0.7, run: (c, ctx) => (away(c, ctx.s, 3, 'Bin auf Montage.'), adjustForm(c, ctx.s, -0.6), 'Er kommt mit fünf Kilo mehr zurück. „Das Kantinenessen war zu gut."') },
        ]),
      },
      {
        label: 'Kannst du das nicht tauschen?',
        effect: outcome([
          { w: 2, run: (c, ctx) => (away(c, ctx.s, 3, 'Montage. Tauschen ging nicht.'), (c.players[ctx.s].grumpy = 2), '„Das ist mein Job, Trainer." Er fährt – und ist sauer.') },
          { w: 1.5, run: () => 'Er tauscht tatsächlich mit einem Kollegen. Der Chef findet es komisch, aber okay.' },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 1, 'Nur eine Woche weg.'), 'Er handelt es auf eine Woche runter.') },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? `${first(c, ctx.s)} hat keine Lust mehr auf den Spagat zwischen Job und Verein. Er hört auf.` : 'Er fährt.') },
        ]),
      },
      {
        label: 'Alles klar, bis dann',
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 3, 'Bin auf Montage.'), 'Drei Wochen ohne ihn.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 4, 'Montage dauert länger.'), 'Vier Wochen. Und er meldet sich kaum.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, 'Bin auf Montage.'), adjustForm(c, ctx.s, 0.4), 'Er trainiert dort im Hotel-Fitnessraum und kommt fitter zurück als vorher.') },
        ]),
      },
    ],
  },

  job_stress: {
    weight: 2.5,
    needs: (c, rng) => pick(c, rng, (p, r) => !NO_JOB.test(p.profession) && p.age >= 22 && !(r.awayWeeks > 0)),
    text: (c, ctx) => `${first(c, ctx.s)} ist durch: Überstunden, Deadline, Chef im Nacken. „Ich weiß nicht, ob ich Sonntag den Kopf frei hab."`,
    options: [
      {
        label: 'Nimm dir eine Woche frei vom Fußball',
        effect: outcome([
          { w: 3, run: (c, ctx) => (away(c, ctx.s, 1, 'Brauche eine Pause, nächste Woche wieder da.'), adjustForm(c, ctx.s, 0.5), 'Eine Woche Ruhe, dann ist er wieder da – erholt.') },
          { w: 1.5, run: (c, ctx) => (away(c, ctx.s, 1, 'Pause.'), (c.players[ctx.s].loyal = true), '„Danke, dass du das verstehst." Er meint es ernst.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 1, 'Pause.'), (c.players[ctx.s].grumpy = 1), 'Er fühlt sich aussortiert. „Ich hab doch nur gesagt, dass ich gestresst bin."') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, 'Ich bin krankgeschrieben. Burnout, sagt der Arzt.'), 'Aus einer Woche werden drei. Der Arzt hat ihn krankgeschrieben.') },
        ]),
      },
      {
        label: 'Fußball ist der beste Ausgleich!',
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), 'Auf dem Platz vergisst er alles. Genau das hat er gebraucht.') },
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.5), 'Er ist da, aber nicht bei der Sache. Zweimal geht das Handy in der Halbzeit.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, 'Ich kann gerade nicht. Sorry.'), 'Im Training bricht er zusammen, Kreislauf. Drei Wochen Pause.') },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? `${first(c, ctx.s)} muss Prioritäten setzen. Der Fußball ist raus.` : 'Er macht weiter, irgendwie.') },
          { w: 0.8, run: (c, ctx) => (adjustForm(c, ctx.s, 0.8), `${first(c, ctx.s)} lässt den ganzen Frust raus – Sonntag spielt er wie nie.`) },
        ]),
      },
      {
        label: 'Das muss er selbst wissen',
        effect: outcome([
          { w: 3, run: (c, ctx) => (mul(c, ctx.s, 1.4), 'Er kommt seltener. Der Job frisst ihn auf.') },
          { w: 1.5, run: () => 'Die Deadline ist vorbei, alles wieder normal.' },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 4, 'Krankgeschrieben.'), 'Er klappt zusammen. Vier Wochen krankgeschrieben.') },
        ]),
      },
    ],
  },

  befoerderung: {
    weight: 1.5,
    needs: (c, rng) => pick(c, rng, (p) => !NO_JOB.test(p.profession) && p.age >= 25),
    text: (c, ctx) => `${first(c, ctx.s)} ist befördert worden! Teamleiter. Mehr Geld, mehr Verantwortung – und weniger Zeit?`,
    options: [
      {
        label: 'Glückwunsch – die Runde geht auf dich!',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.08), 'Er gibt eine Runde aus und strahlt den ganzen Abend.') },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.5), adjustMood(c, 0.04), 'Schöner Abend. Aber ab jetzt hat er öfter Termine am Wochenende.') },
          { w: 1, run: (c) => (book(c, 'Neuer Sponsor: Firma des Beförderten', 40), adjustMood(c, 0.06), 'Als Teamleiter hat er jetzt ein Budget – und die Firma sponsert euch mit 40 €.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), adjustMood(c, -0.04), 'Er hält sich jetzt für was Besseres. Beim Training erklärt er allen „Prozesse".') },
        ]),
      },
      {
        label: 'Hoffentlich bleibt noch Zeit für uns',
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].loyal = true), '„Für euch immer." Er lässt den Sonntag im Kalender blocken.') },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.7), 'Ehrliche Antwort: „Weniger als früher."') },
          { w: 1, run: (c, ctx) => (startStory(c, 'umzug', ctx.s, { city: 'der Zentrale' }), (c.players[ctx.s].absenceMul = 3), 'Die Beförderung hat einen Haken: Die Stelle ist in der Zentrale, 90 km weg.') },
        ]),
      },
    ],
  },

  kind_krank: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 27 && p.age <= 48),
    text: (c, ctx) => `Bei ${first(c, ctx.s)} zu Hause geht Magen-Darm rum. Beide Kinder, die Frau – und er fühlt sich auch schon komisch.`,
    options: [
      {
        label: 'Bleib bloß zu Hause!',
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), 'Er bleibt zu Hause. Richtig so.') },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), 'Sonntagfrüh sind alle wieder fit. Er kommt zur zweiten Halbzeit.') },
          { w: 1, run: (c, ctx, rng) => { for (const i of two(c, rng, ctx.s)) sitOut(c, i); sitOut(c, ctx.s); return 'Zu spät: Beim Training am Donnerstag hat er schon zwei angesteckt.'; } },
        ]),
      },
      {
        label: 'Kommst du trotzdem? Wir sind knapp.',
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.7), 'Er kommt, bleich wie die Wand. Nach 20 Minuten muss er in die Büsche.') },
          { w: 2, run: (c, ctx, rng) => { const sick = two(c, rng, ctx.s); for (const i of sick) sitOut(c, i); return `Er kommt – und steckt ${sick.map((i) => first(c, i)).join(' und ')} an. Die fehlen dann nächste Woche.`; } },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), sitOut(c, ctx.s), 'Seine Frau nimmt ihm das Handy weg: „Du spinnst wohl." Er ist sauer – auf dich.') },
          { w: 1, run: () => 'Er kommt, und ihm geht es blendend. Glück gehabt.' },
        ]),
      },
      {
        label: 'Gute Besserung an alle',
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), 'Er fehlt. Die Gruppe schickt Genesungs-Memes.') },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.03), 'Die Spielerfrauen organisieren eine Suppe für die Familie. Schöne Geste.') },
          { w: 1, run: (c, ctx) => sitOut(c, ctx.s, 'late') ?? 'Er kommt zur zweiten Halbzeit, mit Wärmflasche.' },
        ]),
      },
    ],
  },

  elternzeit: {
    weight: 1.2,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 26 && p.age <= 42 && !NO_JOB.test(p.profession)),
    text: (c, ctx) => `${first(c, ctx.s)} nimmt zwei Monate Elternzeit. „Endlich mal Zeit!", sagt er. Seine Frau lacht.`,
    options: [
      {
        label: 'Super – dann hast du ja Zeit fürs Training!',
        effect: outcome([
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 0.6), adjustForm(c, ctx.s, 0.3), 'Er ist tatsächlich öfter da – mit Babyphone in der Tasche.') },
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, -0.4), 'Das Baby schläft nicht, er auch nicht. Er kommt, aber im Halbschlaf.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 3, 'Elternzeit heißt Eltern-Zeit, sagt meine Frau.'), 'Seine Frau hat eine andere Vorstellung von Elternzeit. Drei Wochen Fußballverbot.') },
          { w: 1, run: (c) => (adjustMood(c, 0.06), 'Er bringt das Baby zu jedem Heimspiel mit. Das Kind hat jetzt ein Mini-Trikot.') },
        ]),
      },
      {
        label: 'Genieß die Zeit mit der Familie',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].loyal = true), 'Er rechnet dir das hoch an.') },
          { w: 1, run: (c, ctx) => (mul(c, ctx.s, 1.3), 'Er genießt – und kommt seltener.') },
          { w: 1, run: (c) => (adjustMood(c, 0.04), 'Er schickt jeden Sonntag ein Foto: Baby im Vereinsschal vor dem Liveticker.') },
        ]),
      },
    ],
  },

  nebenjob: {
    weight: 2,
    needs: (c, rng) => pick(c, rng, (p) => STUDENT.test(p.profession)),
    text: (c, ctx) => `${first(c, ctx.s)} braucht Geld und hat einen Nebenjob angenommen – sonntags im Café. „Sorry, Miete muss sein."`,
    options: [
      {
        label: 'Die Kasse gibt ihm einen Zuschuss (30 €)',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, `Zuschuss für ${first(c, ctx.s)}`, -30), (c.players[ctx.s].loyal = true), 'Er kündigt den Sonntagsdienst. „Ihr seid die Besten."') },
          { w: 1.5, run: (c, ctx) => (book(c, `Zuschuss für ${first(c, ctx.s)}`, -30), mul(c, ctx.s, 1.5), 'Er nimmt das Geld – und arbeitet trotzdem jeden zweiten Sonntag.') },
          { w: 1, run: (c, ctx) => (book(c, `Zuschuss für ${first(c, ctx.s)}`, -30), adjustMood(c, -0.06), 'Jetzt wollen drei andere auch einen Zuschuss. Die Kabine diskutiert über Gerechtigkeit.') },
        ]),
      },
      {
        label: 'Ich hör mich nach einem anderen Job um',
        effect: outcome([
          { w: 2, run: (c, ctx) => (Object.assign(c.players[ctx.s], { job: `Aushilfe bei ${c.sponsors?.[0]?.name ?? 'der Bäckerei Krume'}`, absenceMul: 1 }), 'Ein Sponsor sucht eine Aushilfe unter der Woche. Passt perfekt.') },
          { w: 2, run: (c, ctx) => (mul(c, ctx.s, 1.8), 'Nichts gefunden. Er bleibt im Café.') },
          { w: 1, run: (c, ctx) => (Object.assign(c.players[ctx.s], { job: 'Aushilfe im Vereinsheim' }), book(c, 'Aushilfe im Vereinsheim', -10), 'Er jobbt jetzt im Vereinsheim – und zapft nach dem Spiel.') },
        ]),
      },
      {
        label: 'Schade, aber verständlich',
        effect: outcome([
          { w: 3, run: (c, ctx) => (mul(c, ctx.s, 2), 'Er fehlt jetzt öfter.') },
          { w: 1, run: () => 'Nach zwei Wochen schmeißt er den Job. „Der Chef war ein Tyrann."' },
          { w: (c) => (canLose(c) ? 0.7 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? `${first(c, ctx.s)} hat keine Zeit mehr. Er verabschiedet sich.` : 'Er fehlt öfter.') },
        ]),
      },
    ],
  },

  trennung: {
    weight: 1,
    needs: (c, rng) => pick(c, rng, (p) => p.age >= 28),
    text: (c, ctx) => `${first(c, ctx.s)} lebt in Trennung. Er schläft gerade auf dem Sofa eines Kumpels und redet mit niemandem darüber.`,
    options: [
      {
        label: 'Für ihn da sein – Gespräch unter vier Augen',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.2), 'Er redet zum ersten Mal darüber. Danach geht es ihm etwas besser.') },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.4), 'Er will nicht reden. Aber er weiß jetzt, dass du da bist.') },
          { w: 1, run: (c, ctx) => (startStory(c, 'umzug', ctx.s, { city: 'seiner Heimatstadt' }), (c.players[ctx.s].absenceMul = 3), 'Er zieht zurück zu seinen Eltern – 80 km weg. Er will trotzdem weiterspielen.') },
        ]),
      },
      {
        label: 'Ablenkung: Mannschaftsabend!',
        effect: outcome([
          { w: 2, run: (c) => (book(c, 'Mannschaftsabend', -25), adjustMood(c, 0.1), 'Der Abend tut allen gut. Er lacht zum ersten Mal seit Wochen.') },
          { w: 1.5, run: (c, ctx) => (book(c, 'Mannschaftsabend', -25), adjustForm(c, ctx.s, -0.6), 'Er trinkt zu viel und erzählt allen alles. Sonntag ist er nicht zu gebrauchen.') },
          { w: 1, run: (c, ctx) => (book(c, 'Mannschaftsabend', -25), adjustForm(c, ctx.s, 0.7), 'Am Sonntag spielt er wie befreit. Zwei Tore, danach heult er in der Kabine.') },
        ]),
      },
      {
        label: 'Nicht ansprechen – er meldet sich schon',
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, -0.5), 'Er spielt, aber er ist nicht er selbst.') },
          { w: 1, run: (c, ctx) => (away(c, ctx.s, 2, 'Brauch mal Abstand von allem.'), 'Er taucht zwei Wochen ab.') },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? `${first(c, ctx.s)} zieht einen Schlussstrich unter alles – auch unter den Fußball.` : 'Er bleibt, still.') },
          { w: 1, run: () => 'Nach ein paar Wochen ist er wieder ganz der Alte. Menschen sind erstaunlich.' },
        ]),
      },
    ],
  },
};
