// Ereignisse für Bereiche, in denen die Zählung (ROADMAP 11.18 Punkt 8, 2026-11-14) Lücken fand: Zweite Mannschaft (keines),
// Frauenteam (nur die Gründung), Nationalteam (keines) und Fans (7 von 216, fast alle erst ab der Oberliga). Gezählt wurden die
// ziehbaren Ereignisse nach Bedingung und Text. Gezogen werden sie nur, wenn es den Bereich gibt. Beträge und Wirkungen sind Spielwerte.
// Eingetragen in events.js (eventPacks), hinten, damit der Zufall der bestehenden Pakete gleich bleibt.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { reserveOf } from './reserve.js';
import { women } from './women.js';
import { chronicle } from './sagas.js';
import { natCoachOf, quitNatCoach } from './natcoach.js';
import { natCups, nationName } from './nationalteams.js';

const first = (n) => n.split(' ')[0];
const reserveRunning = (c) => !!reserveOf(c) && (reserveOf(c).round ?? 0) >= 3;
const womenRunning = (c) => (women(c)?.squad?.length ?? 0) >= 11 && !!women(c)?.league;
// Spieler, die in der Zweiten Spielpraxis sammeln (mindestens drei Einsätze dort).
const reservePlayers = (c) => humanClub(c).squad.filter((idx) => (c.players[idx]?.apps2 ?? 0) >= 3);
// Eigene Spieler, die gerade für ihr Land nominiert sind (Turnier oder Qualifikation, nur Profiligen).
function nominated(c) {
  const squad = new Set(humanClub(c).squad);
  const out = new Map();
  for (const t of [...natCups(c).filter((x) => !x.done), ...(c.natQuali?.comps ?? [])]) for (const [nid, list] of Object.entries(t.own ?? {})) for (const idx of list) if (squad.has(idx)) out.set(idx, nid);
  return [...out].map(([idx, nid]) => ({ idx, nid }));
}
const lv = (c) => c.level ?? 1;
// Die Fan-Ereignisse sind für Amateurvereine gedacht (Beträge im Hunderter-Bereich); ab der Regionalliga gibt es eigene (fanprotest).
const AMATEUR_MAX = 8;
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
  // Nationaltrainer im Nebenamt: Der Vorstand sorgt sich um den Verein.
  nat_doppelamt: {
    weight: 1,
    needs: (c) => (natCoachOf(c) ? { nid: natCoachOf(c) } : null),
    text: (c, ctx) => tr(`Der Vorstand bittet zum Gespräch: Seit du auch ${nationName(ctx.nid)} betreust, sieht man dich dienstags kaum noch auf dem Platz.`, `The board asks for a word: since you also took charge of ${nationName(ctx.nid)}, you are hardly seen at Tuesday training.`),
    options: [
      { label: tr('Der Co-Trainer übernimmt dienstags', 'The assistant takes Tuesdays'), effect: (c) => (adjustMood(c, -0.01), tr('Der Vorstand nickt. Die Mannschaft merkt den Unterschied – nicht jeder findet ihn schlecht.', 'The board nods. The team notices the difference – not everyone minds.')) },
      { label: tr('Versprechen, wieder öfter da zu sein', 'Promise to be around more'), effect: outcome([
        { w: 2, run: () => tr('Du hältst Wort. Zwei Wochen lang bist du um sechs am Platz, bevor alle anderen da sind.', 'You keep your word. For two weeks you are at the ground at six, before anyone else.') },
        { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Dann kommt die nächste Länderspielreise. Im Vorstand fällt das Wort „Teilzeittrainer“.', 'Then comes the next international trip. On the board, the word "part-timer" is heard.')) },
      ]) },
      { label: tr('Das Amt beim Land niederlegen', 'Step down from the national job'), effect: (c, ctx) => (quitNatCoach(c), adjustMood(c, 0.03), tr(`Du rufst beim Verband von ${nationName(ctx.nid)} an und bedankst dich. Der Verein bekommt seinen Trainer ganz zurück.`, `You ring the ${nationName(ctx.nid)} federation and thank them. The club gets its coach back in full.`)) },
    ],
  },
  // Ein nominierter Spieler will lieber im Abstiegskampf helfen. Abstellen muss der Verein trotzdem: Vereine sind verpflichtet,
  // Spieler für Länderspiele im internationalen Spielkalender abzustellen (FIFA, Reglement bezüglich Status und Transfer von
  // Spielern, Anhang 1, Art. 1).
  nat_absage: {
    weight: 1,
    needs: (c, rng) => {
      const list = lv(c) >= 9 ? nominated(c) : [];
      return list.length ? rng.pick(list) : null;
    },
    text: (c, ctx) => tr(`${playerOf(c, ctx.idx).name} ist für ${nationName(ctx.nid)} nominiert und fragt dich leise, ob er absagen soll. „Ihr braucht mich hier doch.“`, `${playerOf(c, ctx.idx).name} has been called up by ${nationName(ctx.nid)} and quietly asks whether he should withdraw. "You need me here."`),
    options: [
      { label: tr('„Fahr hin – das ist eine Ehre.“', '"Go – it is an honour."'), effect: (c) => (adjustMood(c, 0.03), tr('Er fährt mit breiter Brust. In der Kabine hängt sein Foto im Nationaltrikot.', 'He goes with his chest out. His photo in the national shirt hangs in the dressing room.')) },
      { label: tr('„Wenn du absagen willst, rede ich mit dem Verband.“', '"If you want to withdraw, I will talk to the federation."'), effect: (c) => (adjustMood(c, -0.03), tr('Der Verband erinnert dich freundlich an die Abstellungspflicht. Er fährt doch – und fragt sich, warum du ihn behalten wolltest.', 'The federation politely reminds you that clubs must release players. He goes after all – and wonders why you wanted to keep him.')) },
    ],
  },
  // Nach dem Länderspiel: ein Trikot zum Tauschen.
  nat_trikot: {
    weight: 0.7,
    needs: (c, rng) => {
      const list = lv(c) >= 9 ? nominated(c) : [];
      return list.length ? rng.pick(list) : null;
    },
    text: (c, ctx) => tr(`${playerOf(c, ctx.idx).name} kommt von ${nationName(ctx.nid)} zurück, mit dem getauschten Trikot des gegnerischen Kapitäns im Gepäck.`, `${playerOf(c, ctx.idx).name} returns from ${nationName(ctx.nid)} with the opposing captain's swapped shirt in his bag.`),
    options: [
      { label: tr('Im Vereinsheim aufhängen', 'Hang it in the clubhouse'), effect: (c) => (adjustMood(c, 0.02), tr('Es hängt jetzt über dem Tresen. Die Jugend bleibt davor stehen.', 'It now hangs above the bar. The youngsters stop to look at it.')) },
      { label: tr('Für die Jugend versteigern', 'Auction it for the youth teams'), effect: (c) => (book(c, tr('Versteigerung Länderspieltrikot', 'International shirt auction'), 80), tr('Der Bäcker bietet am längsten mit. 80 € gehen an die Jugendabteilung.', 'The baker bids longest. €80 goes to the youth section.')) },
    ],
  },
  // Fans: Choreografie zum Heimspiel.
  fan_choreo: {
    weight: 1,
    needs: (c) => (lv(c) >= 3 && lv(c) <= AMATEUR_MAX ? {} : null),
    text: () => tr('Ein paar Fans wollen zum nächsten Heimspiel eine Choreografie machen: Pappen in Vereinsfarben über die ganze Tribüne. Sie bitten um 60 € für Material.', 'Some fans want to do a display at the next home game: cards in club colours across the whole stand. They ask for €60 for materials.'),
    options: [
      { label: tr('Geld geben (60 €)', 'Give the money (€60)'), effect: outcome([
        { w: 3, run: (c) => (book(c, tr('Material Fan-Choreografie', 'Fan display materials'), -60), adjustMood(c, 0.04), tr('Beim Einlaufen ist die Tribüne ein einziges Farbenmeer. Die Spieler haben Gänsehaut.', 'As the teams come out the stand is a sea of colour. The players get goosebumps.')) },
        { w: 1, run: (c) => (book(c, tr('Material Fan-Choreografie', 'Fan display materials'), -60), tr('Der Wind nimmt die Hälfte der Pappen mit. Man erkennt trotzdem etwas – vielleicht das Wappen.', 'The wind takes half the cards. You can still make something out – perhaps the crest.')) },
      ]) },
      { label: tr('Sollen sie selbst sammeln', 'Let them raise it themselves'), effect: outcome([
        { w: 1, run: () => tr('Sie sammeln am Bierstand. Die Choreo kommt zwei Spiele später, kleiner, aber mit Herz.', 'They collect at the beer stand. The display comes two games later, smaller but heartfelt.') },
        { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Die Fans sind enttäuscht. Auf der Tribüne hängt ein Laken: „Kein Geld für Pappe?“', 'The fans are disappointed. A bedsheet hangs from the stand: "No money for cardboard?"')) },
      ]) },
    ],
  },
  // Fans: Die Zaunfahne ist weg (die Busfahrt zum Auswärtsspiel gibt es schon als fanclub_bus in localevents.js).
  fan_zaunfahne: {
    weight: 1,
    needs: (c) => (lv(c) >= 4 && lv(c) <= AMATEUR_MAX ? {} : null),
    text: () => tr('Die große Zaunfahne der Fans ist über Nacht aus dem Vereinsheim verschwunden. Im Netz taucht ein Foto auf: Sie hängt beim Nachbarverein in der Kneipe – verkehrt herum.', 'The fans\' big fence banner disappeared from the clubhouse overnight. A photo turns up online: it hangs upside down in the neighbouring club\'s pub.'),
    options: [
      { label: tr('Beim Nachbarverein anrufen', 'Ring the neighbouring club'), effect: outcome([
        { w: 2, run: (c) => (adjustMood(c, 0.02), tr('Deren Vorsitzender ist peinlich berührt. Die Fahne kommt am Sonntag zurück, mit einer Kiste Bier als Entschuldigung.', 'Their chairman is embarrassed. The banner comes back on Sunday with a crate of beer by way of apology.')) },
        { w: 1, run: (c) => (adjustMood(c, -0.02), tr('„Keine Ahnung, wovon du redest.“ Die Fahne bleibt verschwunden, das nächste Duell wird hitzig.', '"No idea what you mean." The banner stays missing and the next meeting will be heated.')) },
      ]) },
      { label: tr('Eine neue Fahne bezahlen (80 €)', 'Pay for a new banner (€80)'), effect: (c) => (book(c, tr('Neue Zaunfahne', 'New fence banner'), -80), adjustMood(c, 0.02), tr('Die neue ist größer als die alte. Die Fans nennen sie „die Antwort“.', 'The new one is bigger than the old. The fans call it "the answer".')) },
      { label: tr('Mit Humor nehmen', 'Take it with humour'), effect: () => tr('Der Verein postet ein Foto vom leeren Zaun: „Vermisst. Hört auf den Namen Fahne.“ Halb der Kreis lacht mit.', 'The club posts a photo of the empty fence: "Missing. Answers to the name Banner." Half the district laughs along.') },
    ],
  },
  // Fans: Bengalo beim Heimspiel, das Sportgericht verhängt eine Geldstrafe.
  fan_pyro: {
    weight: 0.7,
    needs: (c) => (lv(c) >= 5 && lv(c) <= AMATEUR_MAX ? { fine: 50 * lv(c) } : null),
    text: (c, ctx) => tr(`Beim letzten Heimspiel hat einer auf der Tribüne ein Bengalo gezündet. Das Sportgericht verhängt ${ctx.fine} € Strafe gegen den Verein.`, `At the last home game someone lit a flare in the stand. The disciplinary court fines the club €${ctx.fine}.`),
    options: [
      { label: tr('Zahlen und den Täter mit Hausverbot belegen', 'Pay and ban the culprit'), effect: (c, ctx) => (book(c, tr('Strafe Pyrotechnik', 'Pyrotechnics fine'), -ctx.fine), tr('Der Täter ist schnell gefunden. Die anderen Fans finden das Hausverbot hart, aber gerecht.', 'The culprit is soon found. The other fans think the ban harsh but fair.')) },
      { label: tr('Zahlen und mit den Fans reden', 'Pay and talk to the fans'), effect: outcome([
        { w: 2, run: (c, ctx) => (book(c, tr('Strafe Pyrotechnik', 'Pyrotechnics fine'), -ctx.fine), adjustMood(c, 0.01), tr('Im Fanclub wird lange geredet. Am Ende sammeln sie die Hälfte der Strafe und geben sie dem Verein.', 'There is a long talk at the supporters\' club. In the end they collect half the fine and give it to the club.')) },
        { w: 1, run: (c, ctx) => (book(c, tr('Strafe Pyrotechnik', 'Pyrotechnics fine'), -ctx.fine), tr('Man nickt sich zu, ändert sich aber wenig. Beim nächsten Derby riecht es wieder nach Rauch.', 'Everyone nods, but little changes. At the next derby there is the smell of smoke again.')) },
      ]) },
    ],
  },
};
