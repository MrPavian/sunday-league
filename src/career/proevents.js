// Ereignisse für Oberliga, Regionalliga und 3. Liga (vom Nutzer gewünscht, 2026-11-05: „Erweiterung der Ereignisse auch in
// höheren Ligen, angepasst an die Liga und Professionalität“). Unten kümmert sich der Trainer um Bierkasse und Platzwart, oben um
// Presse, Berater, Fernsehen und Verbandsstrafen. Beträge wachsen mit einem mittleren Heimspiel der Liga (finances.js homeUnit);
// alle Anteile und Beträge sind Spielwerte. Nur neue Karrieren erreichen die Stufen 9 und 10.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book, homeUnit } from './finances.js';
import { first, leaveTeam, outcome, sitOut } from './outcomes.js';
import { adjustEnergy, isCoach } from './personal.js';
import { contractOf, isPro } from './contracts.js';
import { adjustRel } from './sponsors.js';

const level = (c) => c.level ?? 1;
const unit = (c) => homeUnit(level(c));
const money = (c, f) => Math.max(50, Math.round((unit(c) * f) / 50) * 50);
const eur = (v) => v.toLocaleString('de-DE');
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));
const once = (c, id) => (c.eventLog ?? []).some((e) => e.id === id && e.season === c.season);
const trust = (c, d) => {
  if (c.board) c.board.trust = Math.max(0, Math.min(100, c.board.trust + d)); // Rückhalt im Vorstand (pressure.js)
};
// Ergebnis des letzten eigenen Ligaspiels: 1 Sieg, 0 Remis, -1 Niederlage, null ohne Spiel.
function lastResult(c) {
  const me = humanClub(c).id;
  const f = (c.fixtures[c.round - 1] ?? []).find((x) => x.result && (x.home === me || x.away === me));
  if (!f) return null;
  const [a, b] = f.home === me ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
  return Math.sign(a - b);
}

export const PRO_EVENTS = {
  pressekonferenz: {
    weight: 2,
    needs: (c) => (level(c) >= 8 && c.round >= 2 && lastResult(c) === -1 && !once(c, 'pressekonferenz') ? {} : null),
    text: () => tr('Pressekonferenz nach der Niederlage. Ein Reporter der Lokalzeitung, ganz vorne: „Herr Trainer, wie lange wollen Sie sich das noch anschauen?“', 'Press conference after the defeat. A local paper reporter, front row: "Coach, how much longer are you going to watch this?"'),
    options: [
      { label: tr('Sachlich bleiben', 'Stay factual'), effect: outcome([{ w: 3, run: (c) => (trust(c, 2), tr('Ruhig, Zahlen, Fakten. Der Vorstand nickt am Fernseher.', 'Calm, numbers, facts. The board nods at the TV.')) }, { w: 1, run: () => tr('Langweilig, schreibt die Zeitung. Aber nichts, was hängen bleibt.', 'Boring, writes the paper. But nothing that sticks.') }]) },
      { label: tr('Zurückschießen', 'Fire back'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.05), tr('„Fragen Sie das nächste Woche nochmal.“ Die Kabine feiert den Satz.', '"Ask me again next week." The dressing room loves it.')) }, { w: 2, run: (c) => (trust(c, -4), tr('Die Schlagzeile am Montag: „Trainer dünnhäutig“. Der Vorstand ruft an.', 'Monday\'s headline: "Thin-skinned coach". The board calls.')) }]) },
      { label: tr('Mit einem Witz antworten', 'Answer with a joke'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, 0.03), tr('Der Saal lacht, die Frage ist vergessen.', 'The room laughs, the question is forgotten.')) }, { w: 1, run: (c) => (trust(c, -2), tr('Niemand lacht. Im Netz wird der Ausschnitt geteilt.', 'Nobody laughs. The clip is shared online.')) }]) },
    ],
  },

  berater: {
    weight: 2,
    needs: (c, rng) => {
      if (!isPro(c) || c.round < 2 || once(c, 'berater')) return null;
      const list = squad(c).filter((i) => contractOf(c, i) && playerOf(c, i).rating >= 130);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`Der Berater von ${first(c, ctx.s)} meldet sich: „Mein Klient spielt eine starke Saison. Wir erwarten 20 % mehr – sonst hören wir uns um.“ Aktuell: ${eur(contractOf(c, ctx.s).salary)} € im Monat.`, `${first(c, ctx.s)}'s agent calls: "My client is having a strong season. We expect 20 % more – or we start listening." Currently: €${eur(contractOf(c, ctx.s).salary)} a month.`),
    options: [
      { label: tr('Zahlen', 'Pay up'), effect: (c, ctx) => { const k = contractOf(c, ctx.s); k.salary = Math.round((k.salary * 1.2) / 50) * 50; adjustForm(c, ctx.s, 0.2); return tr(`Neues Gehalt: ${eur(k.salary)} € im Monat. ${first(c, ctx.s)} grinst im Training.`, `New wage: €${eur(k.salary)} a month. ${first(c, ctx.s)} grins in training.`); } },
      { label: tr('Ablehnen', 'Refuse'), effect: outcome([{ w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), tr(`${first(c, ctx.s)} ist sauer, der Berater „prüft Optionen“.`, `${first(c, ctx.s)} is sulking, the agent is "exploring options".`)) }, { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.1), tr(`${first(c, ctx.s)} winkt ab: „Mein Berater redet viel. Ich will hier spielen.“`, `${first(c, ctx.s)} shrugs: "My agent talks a lot. I want to play here."`)) }]) },
      { label: tr('Nach dem Saisonende reden', 'Talk after the season'), effect: outcome([{ w: 2, run: () => tr('Der Berater willigt ein. Vorerst.', 'The agent agrees. For now.') }, { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.2), tr(`${first(c, ctx.s)} fühlt sich hingehalten.`, `${first(c, ctx.s)} feels strung along.`)) }]) },
    ],
  },

  fanprotest: {
    weight: 1,
    needs: (c) => (level(c) >= 9 && c.round >= 3 && !once(c, 'fanprotest') ? {} : null),
    text: () => tr('In der Kurve hängt ein Banner: „Fußball muss bezahlbar bleiben!“ Die Ultras kündigen an, beim nächsten Heimspiel 15 Minuten zu schweigen.', 'A banner hangs in the stand: "Football must stay affordable!" The ultras announce 15 minutes of silence at the next home game.'),
    options: [
      { label: tr('Zum Fandialog einladen', 'Invite to a fan meeting'), effect: (c) => (adjustEnergy(c, -6), adjustMood(c, 0.03), tr('Zwei Stunden im Vereinsheim, viele Meinungen, eine Einigung: Stehplatz-Dauerkarten bleiben, wie sie sind.', 'Two hours in the clubhouse, many opinions, one agreement: standing season tickets stay as they are.')) },
      { label: tr('Rabatt für Schüler und Rentner', 'Discount for pupils and pensioners'), effect: (c) => { const v = money(c, 0.25); book(c, tr('Rabattaktion Eintritt', 'Ticket discount'), -v); adjustMood(c, 0.04); return tr(`Kostet ${eur(v)} € in dieser Saison – die Kurve applaudiert.`, `Costs €${eur(v)} this season – the stand applauds.`); } },
      { label: tr('Aussitzen', 'Sit it out'), effect: outcome([{ w: 2, run: (c) => (adjustMood(c, -0.04), tr('Eine Viertelstunde Stille. Die Mannschaft hört jeden eigenen Fehlpass.', 'A quarter of an hour of silence. The team hears every misplaced pass.')) }, { w: 1, run: () => tr('Die Aktion verläuft im Sande.', 'The protest fizzles out.') }]) },
    ],
  },

  pyro: {
    weight: 1,
    needs: (c) => (level(c) >= 9 && c.round >= 2 && !once(c, 'pyro') ? { fine: level(c) >= 10 ? 6000 : 1500 } : null),
    text: (c, ctx) => tr(`Pyrotechnik im eigenen Block beim letzten Spiel. Der Verband schickt den Bescheid: ${eur(ctx.fine)} € Geldstrafe.`, `Pyrotechnics in your own block at the last game. The association sends the notice: a €${eur(ctx.fine)} fine.`),
    options: [
      { label: tr('Zahlen', 'Pay'), effect: (c, ctx) => (book(c, tr('Verbandsstrafe Pyrotechnik', 'Association fine: pyrotechnics'), -ctx.fine), tr('Bezahlt. Der Kassenwart seufzt.', 'Paid. The treasurer sighs.')) },
      { label: tr('Einspruch einlegen', 'Appeal'), effect: outcome([{ w: 1, run: (c, ctx) => (book(c, tr('Verbandsstrafe Pyrotechnik (halbiert)', 'Association fine: pyrotechnics (halved)'), -Math.round(ctx.fine / 2)), tr('Teilerfolg: Die Strafe wird halbiert.', 'Partial success: the fine is halved.')) }, { w: 2, run: (c, ctx) => (book(c, tr('Verbandsstrafe Pyrotechnik und Verfahrenskosten', 'Association fine: pyrotechnics plus costs'), -Math.round(ctx.fine * 1.1)), tr('Abgelehnt – dazu kommen die Verfahrenskosten.', 'Rejected – plus the costs of the procedure.')) }]) },
      { label: tr('Fanprojekt mitfinanzieren', 'Co-fund a fan project'), effect: (c, ctx) => (book(c, tr('Fanprojekt (statt Teil der Strafe)', 'Fan project (instead of part of the fine)'), -Math.round(ctx.fine * 0.7)), adjustMood(c, 0.02), tr('Der Verband rechnet einen Teil an, das Geld geht in Sozialarbeit mit den Fans.', 'The association counts part of it, the money goes into social work with the fans.')) },
    ],
  },

  vip_abend: {
    weight: 1,
    needs: (c, rng) => (level(c) >= 8 && c.sponsors?.length && c.round >= 2 && !once(c, 'vip_abend') ? { sp: rng.pick(c.sponsors).id } : null),
    text: () => tr('Die Sponsoren laden zum VIP-Abend in den Business-Bereich: Häppchen, Händeschütteln, ein paar Worte vom Trainer zur Lage.', 'The sponsors invite you to the VIP evening in the business area: canapés, handshakes, a few words from the coach about the situation.'),
    options: [
      { label: tr('Hingehen und reden', 'Go and speak'), effect: (c, ctx) => (adjustEnergy(c, -8), adjustRel(c.sponsors.find((s) => s.id === ctx.sp), 6), tr('Drei Stunden Smalltalk. Die Sponsoren sind begeistert, du bist erledigt.', 'Three hours of small talk. The sponsors are delighted, you are wiped out.')) },
      { label: tr('Den Co-Trainer schicken', 'Send the assistant'), effect: (c, ctx) => (adjustRel(c.sponsors.find((s) => s.id === ctx.sp), 2), tr('Er macht das ordentlich. Ein Sponsor fragt trotzdem, wo du warst.', 'He does a decent job. One sponsor still asks where you were.')) },
      { label: tr('Absagen, Videoanalyse', 'Decline, video analysis'), effect: (c, ctx) => (adjustRel(c.sponsors.find((s) => s.id === ctx.sp), -5), tr('Die Analyse ist gut. Die Stimmung im Business-Bereich weniger.', 'The analysis is good. The mood in the business area less so.')) },
    ],
  },

  social_media: {
    weight: 1,
    needs: (c, rng) => (level(c) >= 8 && c.round >= 1 && !once(c, 'social_media') && squad(c).length ? { s: rng.pick(squad(c)) } : null),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat ein Video vom nächsten Gegner gepostet – mit Lachsmileys. Es hat 40 000 Aufrufe. Deren Kapitän hat es geteilt: „Bis Samstag.“`, `${first(c, ctx.s)} has posted a video of the next opponent – with laughing emojis. It has 40,000 views. Their captain shared it: "See you Saturday."`),
    options: [
      { label: tr('Löschen lassen, Geldstrafe', 'Have it deleted, fine'), effect: (c, ctx) => (adjustForm(c, ctx.s, -0.1), tr(`Gelöscht. ${first(c, ctx.s)} zahlt in die Mannschaftskasse.`, `Deleted. ${first(c, ctx.s)} pays into the team kitty.`)) },
      { label: tr('Unter vier Augen reden', 'Talk in private'), effect: outcome([{ w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, 0.1), tr('Er versteht es und entschuldigt sich öffentlich.', 'He understands and apologises publicly.')) }, { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.1), tr('Er findet, das sei doch „nur Spaß“ gewesen.', 'He thinks it was "only a joke".')) }]) },
      { label: tr('Lachen – gibt Feuer', 'Laugh – it adds fire'), effect: outcome([{ w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die Kabine ist heiß auf Samstag.', 'The dressing room is fired up for Saturday.')) }, { w: 1, run: (c) => (trust(c, -3), tr('Der Vorstand findet das gar nicht lustig.', 'The board does not find it funny at all.')) }]) },
    ],
  },

  rasenheizung: {
    weight: 2,
    needs: (c) => (level(c) >= 10 && ['frost', 'schnee'].includes(c.week?.weather?.id) && !once(c, 'rasenheizung') ? { cost: money(c, 0.12) } : null),
    text: (c, ctx) => tr(`Frost. Die Rasenheizung schafft nur zwei Drittel des Platzes – an der Eckfahne ist der Boden hart wie Beton. Die Reparatur über Nacht kostet ${eur(ctx.cost)} €.`, `Frost. The undersoil heating only manages two thirds of the pitch – by the corner flag the ground is hard as concrete. An overnight repair costs €${eur(ctx.cost)}.`),
    options: [
      { label: tr('Reparieren lassen', 'Have it repaired'), effect: (c, ctx) => (book(c, tr('Rasenheizung Notdienst', 'Undersoil heating emergency call-out'), -ctx.cost), tr('Am Morgen ist alles grün und weich.', 'By morning everything is green and soft.')) },
      { label: tr('Mit Planen abdecken', 'Cover it with sheets'), effect: outcome([{ w: 1, run: () => tr('Funktioniert. Fast.', 'It works. Almost.') }, { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); sitOut(c, s); return tr(`${first(c, s)} knickt an der harten Stelle um und fällt aus.`, `${first(c, s)} turns his ankle on the hard patch and is out.`); } }]) },
    ],
  },

  talent_angebot: {
    weight: 1,
    needs: (c, rng) => {
      if (level(c) < 9 || c.round < 2 || once(c, 'talent_angebot')) return null;
      const young = squad(c).filter((i) => playerOf(c, i).age <= 21);
      if (!young.length) return null;
      const s = young.sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0];
      return { s, fee: money(c, level(c) >= 10 ? 2.5 : 6), club: rng.pick(tr(['ein Zweitligist aus dem Westen', 'ein Zweitligist aus dem Norden', 'ein Erstligist mit großem Nachwuchszentrum'], ['a second-division club from the west', 'a second-division club from the north', 'a top-flight club with a big academy'])) };
    },
    text: (c, ctx) => tr(`${ctx.club} will ${playerOf(c, ctx.s).name} (${playerOf(c, ctx.s).age}) – und bietet ${eur(ctx.fee)} € Ablöse.`, `${ctx.club} want ${playerOf(c, ctx.s).name} (${playerOf(c, ctx.s).age}) – and offer €${eur(ctx.fee)} in transfer fees.`),
    options: [
      { label: tr('Annehmen', 'Accept'), effect: (c, ctx) => { const name = playerOf(c, ctx.s).name; if (!leaveTeam(c, ctx.s)) return tr('Der Kader ist zu dünn – ihr könnt ihn nicht abgeben.', 'The squad is too thin – you cannot let him go.'); book(c, tr(`Ablöse für ${name}`, `Transfer fee for ${name}`), ctx.fee); return tr('Er geht mit Tränen in den Augen und einem großen Vertrag. Die Kasse jubelt.', 'He leaves with tears in his eyes and a big contract. The kitty cheers.'); } },
      { label: tr('Ablehnen – er ist unsere Zukunft', 'Refuse – he is our future'), effect: outcome([{ w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr('Er bleibt – und spielt, als wolle er sich bedanken.', 'He stays – and plays as if to say thank you.')) }, { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), tr('Er wollte gehen. Jetzt ist er sauer.', 'He wanted to go. Now he is sulking.')) }]) },
    ],
  },

  tv_anstoss: {
    weight: 1,
    needs: (c) => (level(c) >= 10 && c.round >= 1 && !once(c, 'tv_anstoss') ? { bonus: money(c, 0.15) } : null),
    text: (c, ctx) => tr(`Das Fernsehen verlegt euer nächstes Heimspiel auf Montag, 19 Uhr. Dafür gibt es ${eur(ctx.bonus)} € extra. Die Fans sind empört: „Montags arbeiten wir!“`, `TV moves your next home game to Monday, 7pm. That brings an extra €${eur(ctx.bonus)}. The fans are outraged: "We work on Mondays!"`),
    options: [
      { label: tr('Annehmen', 'Accept'), effect: (c, ctx) => (book(c, tr('Fernsehgeld Montagsspiel', 'TV money for the Monday game'), ctx.bonus), adjustMood(c, -0.02), tr('Geld da, Kurve halb leer.', 'Money in, stand half empty.')) },
      { label: tr('Öffentlich protestieren', 'Protest publicly'), effect: (c) => (adjustMood(c, 0.04), trust(c, -2), tr('Die Fans feiern dich. Der Termin bleibt trotzdem Montag.', 'The fans celebrate you. The date stays Monday anyway.')) },
    ],
  },

  dopingkontrolle: {
    weight: 1,
    needs: (c, rng) => (level(c) >= 9 && c.round >= 2 && !once(c, 'dopingkontrolle') && squad(c).length ? { s: rng.pick(squad(c)) } : null),
    text: (c, ctx) => tr(`Unangemeldete Dopingkontrolle beim Training. ${first(c, ctx.s)} hat seinen Aufenthaltsort nicht eingetragen und war beim letzten Termin nicht zu Hause.`, `Unannounced doping control at training. ${first(c, ctx.s)} did not register his whereabouts and was not at home for the last test.`),
    options: [
      { label: tr('Mit ihm die Meldung nachholen', 'Help him file the report'), effect: (c, ctx) => (adjustEnergy(c, -3), tr(`Eine Verwarnung, mehr nicht. ${first(c, ctx.s)} trägt jetzt jeden Abend ein, wo er ist.`, `A warning, nothing more. ${first(c, ctx.s)} now logs his whereabouts every evening.`)) },
      { label: tr('Das soll er selbst klären', 'Let him sort it out'), effect: outcome([{ w: 3, run: () => tr('Er klärt es. Verwarnung.', 'He sorts it out. A warning.') }, { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), tr(`Zweiter Verstoß – ${first(c, ctx.s)} wird für ein Spiel gesperrt.`, `Second offence – ${first(c, ctx.s)} is banned for one game.`)) }]) },
    ],
  },

  livestream: {
    weight: 1,
    needs: (c) => (level(c) === 9 && !once(c, 'livestream') && c.round >= 1 ? { fee: money(c, 0.4) } : null),
    text: (c, ctx) => tr(`Ein Streaming-Anbieter will eure Heimspiele live zeigen, mit eigenem Kommentator. Er zahlt ${eur(ctx.fee)} € für die Saison.`, `A streaming provider wants to show your home games live, with their own commentator. They pay €${eur(ctx.fee)} for the season.`),
    options: [
      { label: tr('Unterschreiben', 'Sign'), effect: (c, ctx) => (book(c, tr('Übertragungsrechte (Stream)', 'Broadcast rights (stream)'), ctx.fee), tr('Die Kamera steht ab Sonntag auf dem Tribünendach.', 'From Sunday the camera stands on the stand roof.')) },
      { label: tr('Ablehnen – die Leute sollen ins Stadion kommen', 'Refuse – people should come to the ground'), effect: (c) => (adjustMood(c, 0.02), tr('Der Vorstand findet das romantisch, der Kassenwart weniger.', 'The board finds it romantic, the treasurer less so.')) },
    ],
  },
};
