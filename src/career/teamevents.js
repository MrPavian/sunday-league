// Ereignisse rund um die Zweite Mannschaft und das Frauenteam (ROADMAP 11.18 Punkt 8). Die Zählung der Ereignisse je Bereich
// (2026-11-14, ziehbare Ereignisse nach ihrer Bedingung) fand für die Zweite keines und für das Frauenteam zwei (nur die
// Gründung). Gezogen werden sie nur, wenn es die Mannschaft gibt. Beträge und Wirkungen sind Spielwerte.
// Eingetragen in events.js (eventPacks), hinten, damit der Zufall der bestehenden Pakete gleich bleibt.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { reserveOf } from './reserve.js';
import { women } from './women.js';
import { chronicle } from './sagas.js';

const first = (n) => n.split(' ')[0];
const reserveRunning = (c) => !!reserveOf(c) && (reserveOf(c).round ?? 0) >= 3;
const womenRunning = (c) => (women(c)?.squad?.length ?? 0) >= 11 && !!women(c)?.league;
// Spieler, die in der Zweiten Spielpraxis sammeln (mindestens drei Einsätze dort).
const reservePlayers = (c) => humanClub(c).squad.filter((idx) => (c.players[idx]?.apps2 ?? 0) >= 3);
const bump = (p, d) => (p.rating = Math.max(25, Math.min(95, Math.round(p.rating + d))));

export const TEAM_EVENTS = {
  // Zweite: Einer spielt sich dort in den Vordergrund.
  zweite_empfehlung: {
    weight: 1.2,
    needs: (c, rng) => {
      if (!reserveRunning(c)) return null;
      const list = reservePlayers(c);
      return list.length ? { idx: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`Der Trainer der Zweiten ruft an: ${playerOf(c, ctx.idx).name} sei bei ihnen der Beste auf dem Platz, Woche für Woche. „Der gehört nach oben.“`, `The reserves' coach rings: ${playerOf(c, ctx.idx).name} is their best player, week after week. "He belongs upstairs."`),
    options: [
      { label: tr('Am Wochenende in den Kader der Ersten', 'Into the first-team squad this weekend'), effect: (c, ctx) => (adjustMood(c, 0.03), tr(`${first(playerOf(c, ctx.idx).name)} sitzt am Samstag auf der Bank der Ersten und grinst die ganze Zeit.`, `${first(playerOf(c, ctx.idx).name)} is on the first-team bench on Saturday, grinning the whole time.`)) },
      { label: tr('Noch ein paar Wochen in der Zweiten lassen', 'Leave him in the reserves a few more weeks'), effect: outcome([
        { w: 2, run: () => tr('Er nickt und macht weiter. Der Trainer der Zweiten ist froh, ihn zu behalten.', 'He nods and carries on. The reserves\' coach is glad to keep him.') },
        { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Er fühlt sich übersehen und lässt es im Training jeden spüren.', 'He feels overlooked and makes everyone feel it in training.')) },
      ]) },
    ],
  },
  // Zweite: Zu wenige Leute am Sonntag.
  zweite_personalnot: {
    weight: 1,
    needs: (c) => (reserveRunning(c) ? {} : null),
    text: () => tr('Sonntag spielt die Zweite, und es haben nur neun zugesagt. Der Betreuer fragt, was er machen soll.', 'The reserves play on Sunday and only nine have said yes. The kit man asks what to do.'),
    options: [
      { label: tr('A-Jugendliche aushelfen lassen', 'Let under-19s help out'), effect: outcome([
        { w: 3, run: (c) => (adjustMood(c, 0.02), tr('Zwei Achtzehnjährige springen ein und spielen, als ginge es um die Meisterschaft.', 'Two eighteen-year-olds step in and play as if the title were at stake.')) },
        { w: 1, run: () => tr('Die Jungs kommen, aber einer hat die Schienbeinschoner vergessen. Mit Pappe geht es auch.', 'The lads turn up, but one forgot his shin pads. Cardboard will do.') },
      ]) },
      { label: tr('Die Alten Herren fragen', 'Ask the old boys'), effect: outcome([
        { w: 2, run: () => tr('Zwei Alte Herren sagen zu. Einer spielt 90 Minuten, der andere die erste Halbzeit und den Grill.', 'Two old boys say yes. One plays 90 minutes, the other the first half and the barbecue.') },
        { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Keiner hat Zeit. Die Zweite spielt zu zehnt und verliert deutlich.', 'Nobody is free. The reserves play with ten and lose heavily.')) },
      ]) },
      { label: tr('Spiel absagen (Strafe 50 €)', 'Call the match off (€50 fine)'), effect: (c) => (book(c, tr('Spielabsage Zweite Mannschaft', 'Reserves match called off'), -50), adjustMood(c, -0.02), tr('Der Staffelleiter schickt die Rechnung, die Spieler der Zweiten maulen.', 'The league secretary sends the bill and the reserves grumble.')) },
    ],
  },
  // Zweite: Der Trainer der Zweiten will mehr Trainingszeit.
  zweite_trainingszeit: {
    weight: 0.8,
    needs: (c) => (reserveRunning(c) ? {} : null),
    text: () => tr('Der Trainer der Zweiten möchte einen festen Trainingsabend auf dem Hauptplatz. Bisher trainiert seine Mannschaft auf dem halben Nebenplatz.', 'The reserves\' coach wants a fixed training night on the main pitch. So far his side trains on half the side pitch.'),
    options: [
      { label: tr('Dienstag gehört der Zweiten', 'Tuesday belongs to the reserves'), effect: (c) => (adjustMood(c, -0.01), tr('Die Zweite ist dankbar. In der Ersten murmelt einer was von Rasenschonung.', 'The reserves are grateful. In the first team someone mutters about saving the grass.')) },
      { label: tr('Flutlicht auf dem Nebenplatz reparieren (120 €)', 'Fix the side-pitch floodlight (€120)'), effect: (c) => (book(c, tr('Flutlicht Nebenplatz', 'Side-pitch floodlight'), -120), tr('Jetzt sieht die Zweite auch im November, wohin sie passt.', 'Now the reserves can see where they pass even in November.')) },
      { label: tr('Geht nicht', 'Not possible'), effect: (c) => (adjustMood(c, -0.02), tr('Der Trainer der Zweiten legt auf. Am Wochenende stellt er sich nicht an den Grill.', 'The reserves\' coach hangs up. At the weekend he does not do the barbecue.')) },
    ],
  },
  // Frauen: Ein Betrieb aus dem Ort will nur das Frauenteam unterstützen.
  frauen_sponsor: {
    weight: 1,
    needs: (c) => (womenRunning(c) ? { amount: 150 + 50 * (women(c).level ?? 0) } : null),
    text: (c, ctx) => tr(`Eine Physiotherapie-Praxis aus dem Ort will das Frauenteam unterstützen: ${ctx.amount} € für die Saison, dafür ihr Logo auf den Trainingsanzügen.`, `A local physio practice wants to back the women's team: €${ctx.amount} for the season, with its logo on the tracksuits.`),
    options: [
      { label: tr('Gern', 'Gladly'), effect: (c, ctx) => (book(c, tr('Sponsor Frauenteam', "Women's team sponsor"), ctx.amount), tr('Die Trainingsanzüge kommen nach zwei Wochen. Die Praxis hat sogar einen Termin-Rabatt für alle draufgelegt.', 'The tracksuits arrive after two weeks. The practice has even added an appointment discount for everyone.')) },
      { label: tr('Nur, wenn es für den ganzen Verein gilt', 'Only if it covers the whole club'), effect: outcome([
        { w: 1, run: (c, ctx) => (book(c, tr('Sponsor Physio-Praxis', 'Physio practice sponsor'), ctx.amount), tr('Die Praxis willigt ein. Die Frauen finden es trotzdem schade, dass ihr Logo verschwindet.', 'The practice agrees. The women still think it a pity their logo is gone.')) },
        { w: 1, run: () => tr('Die Praxis winkt ab: Sie wollte gezielt die Frauen fördern. Das Geld geht an den Nachbarverein.', 'The practice declines: it wanted to back the women specifically. The money goes to the neighbouring club.') },
      ]) },
    ],
  },
  // Frauen: Streit um die Platzzeit.
  frauen_platzzeit: {
    weight: 1,
    needs: (c) => (womenRunning(c) ? { coach: women(c).coach?.name ?? tr('Die Trainerin', 'The coach') } : null),
    text: (c, ctx) => tr(`${ctx.coach} beschwert sich: Ihr Team trainiert immer erst um 20:30 Uhr, wenn die Herren fertig sind. Sie will den Donnerstag um 18:30 Uhr.`, `${ctx.coach} complains: her team only ever trains at 8.30 pm, after the men have finished. She wants Thursday at 6.30 pm.`),
    options: [
      { label: tr('Donnerstag gehört den Frauen', 'Thursday belongs to the women'), effect: (c) => {
        // Besser trainiert: Die drei Schwächsten im Kader legen zu.
        for (const p of [...women(c).squad].sort((a, b) => a.rating - b.rating).slice(0, 3)) bump(p, 1);
        adjustMood(c, -0.02);
        return tr('Die Frauen kommen jetzt vollzählig zum Training. Die Herren trainieren donnerstags später und murren.', 'The women now turn up in full to training. The men train later on Thursdays and grumble.');
      } },
      { label: tr('Platz teilen: jede Mannschaft eine Hälfte', 'Share the pitch: half each'), effect: outcome([
        { w: 2, run: () => tr('Es wird eng, aber es geht. Nach zwei Wochen spielen beide Teams am Ende zusammen ein Abschlussspiel.', 'It gets tight, but it works. After two weeks both sides play a closing game together at the end.') },
        { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Ein verirrter Ball pro Minute. Nach einer Woche reden die Trainer nicht mehr miteinander.', 'One stray ball per minute. After a week the coaches are no longer speaking.')) },
      ]) },
      { label: tr('Bleibt, wie es ist', 'It stays as it is'), effect: (c) => {
        const w = women(c);
        const p = [...w.squad].sort((a, b) => b.rating - a.rating)[0];
        bump(p, -2);
        return tr(`${first(p.name)}, die Beste im Team, überlegt laut, zum Nachbarverein zu gehen. Sie trainiert lustlos.`, `${first(p.name)}, the best in the team, wonders aloud about joining the neighbours. She trains half-heartedly.`);
      } },
    ],
  },
  // Frauen: Eine Spielerin wird in die Verbandsauswahl berufen.
  frauen_auswahl: {
    weight: 0.7,
    needs: (c, rng) => {
      if (!womenRunning(c)) return null;
      const w = women(c);
      const top = [...w.squad].sort((a, b) => b.rating - a.rating).slice(0, 3);
      return { id: rng.pick(top).id };
    },
    text: (c, ctx) => {
      const p = women(c).squad.find((x) => x.id === ctx.id);
      return tr(`Post vom Verband: ${p.name} ist zum Sichtungslehrgang der Verbandsauswahl eingeladen.`, `Letter from the FA: ${p.name} is invited to the regional squad's trial camp.`);
    },
    options: [
      { label: tr('Fahrt bezahlen und groß ankündigen (40 €)', 'Pay the travel and announce it (€40)'), effect: (c, ctx) => {
        const p = women(c).squad.find((x) => x.id === ctx.id);
        if (p) bump(p, 1);
        book(c, tr('Fahrt Verbandsauswahl', 'Regional squad travel'), -40);
        adjustMood(c, 0.02);
        chronicle(c, tr(`${p?.name ?? 'Eine Spielerin'} zum Lehrgang der Verbandsauswahl eingeladen.`, `${p?.name ?? 'A player'} invited to the regional squad camp.`));
        return tr('Das Kreisblatt bringt ein Foto. Im Vereinsheim hängt es am nächsten Tag neben dem Mannschaftsbild.', 'The gazette runs a photo. The next day it hangs in the clubhouse next to the team picture.');
      } },
      { label: tr('Glückwunsch ausrichten', 'Pass on congratulations'), effect: (c, ctx) => {
        const p = women(c).squad.find((x) => x.id === ctx.id);
        return tr(`${first(p?.name ?? '')} fährt mit dem Zug hin und kommt mit vielen Ideen zurück.`, `${first(p?.name ?? '')} takes the train there and comes back full of ideas.`);
      } },
    ],
  },
};
