// Vereinsleben rund ums Vereinsheim: Mitgliederversammlung und Beitrag,
// Förderverein, Nachbarn, Kassenprüfung, Stromnachzahlung fürs Flutlicht,
// Flohmarkt und Weihnachtsfeier. Kleine Entscheidungen mit dauerhaften Folgen:
// Der Beitrag läuft jede Woche mit, Fördermitglieder zahlen, verärgerte Nachbarn
// rufen irgendwann das Ordnungsamt.
import { tr } from '../core/i18n.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { hasFacility } from './facilities.js';
import { humanClub, playerOf } from './career.js';
import { first, leaveTeam, outcome } from './outcomes.js';
import { adjustEnergy, isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { adjustRel } from './sponsors.js';

export function clubLife(c) {
  c.clubLife ??= { fee: 0, supporters: 0, neighbors: 0, treasurer: null, missing: 0, done: {} };
  return c.clubLife;
}
const once = (c, key) => clubLife(c).done[key] === c.season;
const mark = (c, key) => (clubLife(c).done[key] = c.season);
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));
export const clampN = (v) => Math.max(-3, Math.min(3, v));
const neighbors = (c, d) => (clubLife(c).neighbors = clampN(clubLife(c).neighbors + d));
const supporters = (c, d) => (clubLife(c).supporters = Math.max(0, clubLife(c).supporters + d));

// Beitrag: −1 (Sozialtarif), 0, +1 (erhöht) Euro pro Spieler und Spieltag.
export const feeDelta = (c) => c.clubLife?.fee ?? 0;
export const FEE_NAMES = tr({ '-1': 'gesenkt', 0: 'normal', 1: 'erhöht' }, { '-1': 'reduced', 0: 'normal', 1: 'raised' });
export const neighborText = (v) =>
  v >= 2 ? tr('Nachbarn lieben euch', 'neighbours love you') : v >= 1 ? tr('Nachbarn freundlich', 'neighbours friendly') : v <= -2 ? tr('Nachbarn stinksauer', 'neighbours furious') : v <= -1 ? tr('Nachbarn genervt', 'neighbours annoyed') : tr('Nachbarn neutral', 'neighbours neutral');

// Jede Woche: Förderverein zahlt, der Beitrag wirkt auf die Stimmung, der
// unehrliche Kassenwart greift heimlich in die Kasse.
export function clubLifeWeek(c) {
  const l = clubLife(c);
  if (l.supporters > 0) book(c, tr(`Förderverein (${l.supporters} × 1 €)`, `Supporters' club (${l.supporters} × €1)`), l.supporters);
  if (l.fee > 0) adjustMood(c, -0.01);
  else if (l.fee < 0) adjustMood(c, 0.008);
  const t = l.treasurer;
  if (t && !t.honest && humanClub(c).squad.includes(t.idx) && (c.round + t.idx) % 3 === 0) {
    const x = 4 + ((c.round * 7 + t.idx) % 5);
    l.missing += x;
    c.cash -= x; // fällt erst bei der Kassenprüfung auf
  }
  if (t && !humanClub(c).squad.includes(t.idx)) l.treasurer = null;
}

// Wer sich um die Kasse kümmert – vom bestehenden Vorstands-Ereignis gesetzt.
export function appointTreasurer(c, idx, rng) {
  const job = playerOf(c, idx).profession;
  const trusty = /Bank|Steuer|Buchhalt|Versicherung|Beamt|Verwaltung/.test(job);
  clubLife(c).treasurer = { idx, honest: rng.chance(trusty ? 0.92 : 0.8), since: c.season };
  clubLife(c).missing = 0;
}

export const CLUBLIFE_EVENTS = {
  mitgliederversammlung: {
    weight: 6,
    calendar: (c) => c.round >= 1, // fester Termin im Vereinskalender
    needs: (c) => (c.round >= 1 && c.round <= 3 && !once(c, 'jhv') ? {} : null),
    text: (c) => tr(`Jahreshauptversammlung im Vereinsheim. Punkt 4 der Tagesordnung: der Beitrag (derzeit ${FEE_NAMES[feeDelta(c)]}). Die Kasse zeigt ${Math.round(c.cash)} €.`, `Annual general meeting at the clubhouse. Item 4 on the agenda: membership fees (currently ${FEE_NAMES[feeDelta(c)]}). The kitty shows €${Math.round(c.cash)}.`),
    options: [
      {
        label: tr('Beitrag erhöhen (+1 € pro Spieltag)', 'Raise the fee (+€1 per matchday)'),
        effect: outcome([
          { w: 3, run: (c) => (mark(c, 'jhv'), (clubLife(c).fee = Math.min(1, feeDelta(c) + 1)), adjustMood(c, -0.06), tr('Knappe Mehrheit, lange Gesichter. „Früher hat das Bier 1,50 gekostet."', 'A narrow majority, long faces. "Beer used to cost 1.50."')) },
          { w: 1.5, run: (c) => (mark(c, 'jhv'), (clubLife(c).fee = Math.min(1, feeDelta(c) + 1)), adjustMood(c, -0.02), supporters(c, 1), tr('Angenommen. Opa Heinz tritt aus Solidarität gleich dem Förderverein bei.', 'Passed. Grandpa Heinz joins the supporters\' club in solidarity.')) },
          { w: 1, run: (c) => (mark(c, 'jhv'), adjustMood(c, -0.04), tr('Abgelehnt, 7 zu 5. Der Kassenwart seufzt hörbar.', 'Voted down, 7 to 5. The treasurer sighs audibly.')) },
        ]),
      },
      {
        label: tr('Alles bleibt, wie es ist', 'Leave everything as it is'),
        effect: outcome([
          { w: 3, run: (c) => (mark(c, 'jhv'), adjustMood(c, 0.02), tr('Nach 40 Minuten ist alles durch. Rekord. Danach Schnitzel für alle.', 'Done in 40 minutes. A record. Schnitzel for everyone afterwards.')) },
          { w: 1, run: (c) => (mark(c, 'jhv'), book(c, tr('Antrag: neue Tornetze', 'Motion: new goal nets'), -25), adjustMood(c, 0.04), tr('Unter „Verschiedenes" wird spontan ein Antrag auf neue Tornetze angenommen. 25 € weg, aber die Netze sind schön.', 'Under "any other business" a motion for new goal nets passes. €25 gone, but the nets are lovely.')) },
        ]),
      },
      {
        label: tr('Beitrag senken (−1 €)', 'Cut the fee (−€1)'),
        effect: outcome([
          { w: 3, run: (c) => (mark(c, 'jhv'), (clubLife(c).fee = Math.max(-1, feeDelta(c) - 1)), adjustMood(c, 0.08), tr('Einstimmig! Einer beantragt, dass du öfter Versammlungen leitest.', 'Unanimous! Someone moves that you chair more meetings.')) },
          { w: 1, run: (c) => (mark(c, 'jhv'), (clubLife(c).fee = Math.max(-1, feeDelta(c) - 1)), adjustMood(c, 0.05), tr('Beschlossen. Der Kassenwart schreibt eine sehr lange Mail an den Vorstand.', 'Passed. The treasurer writes a very long e-mail to the committee.')) },
        ]),
      },
    ],
  },

  trainingslager: {
    weight: 5,
    calendar: () => true,
    needs: (c) => (c.round === 0 && !once(c, 'lager') ? { cost: 120 * (c.level ?? 1) + 30 } : null),
    text: (c, ctx) => tr(`Saisonvorbereitung: Die Sportschule hätte am langen Wochenende noch Zimmer frei – Vollpension, Rasenplatz, Kraftraum. ${ctx.cost} € für die ganze Mannschaft.`, `Pre-season: the sports school has rooms free on the long weekend – full board, grass pitch, gym. €${ctx.cost} for the whole squad.`),
    options: [
      { label: tr('Ab in die Sportschule', 'Off to the sports school'), effect: (c, ctx, rng) => {
        mark(c, 'lager');
        book(c, tr('Trainingslager Sportschule', 'Training camp at the sports school'), -ctx.cost);
        for (const idx of humanClub(c).squad) {
          const rec = c.players[idx];
          if (!rec) continue;
          rec.delta ??= {};
          for (const k of ['stamina', 'passing', 'technique']) rec.delta[k] = (rec.delta[k] ?? 0) + 0.008;
          adjustForm(c, idx, 0.15);
        }
        adjustMood(c, 0.08);
        const s = rng.pick(squad(c));
        return tr(`Drei Tage Laufen, Taktik, Kartenspielen bis Mitternacht. Alle kommen fitter zurück – ${first(c, s)} mit einem Muskelkater, über den er noch in Wochen redet.`, `Three days of running, tactics and cards until midnight. Everyone comes back fitter – ${first(c, s)} with aching muscles he will talk about for weeks.`);
      } },
      { label: tr('Wochenende am Baggersee (40 €)', 'A weekend at the lake (€40)'), effect: (c) => (mark(c, 'lager'), book(c, tr('Mannschaftswochenende am Baggersee', 'Team weekend at the lake'), -40), adjustMood(c, 0.07), tr('Zelte, Grill, ein Ball und viel zu wenig Schlaf. Sportlich null, fürs Team Gold.', 'Tents, a barbecue, one ball and far too little sleep. Nothing for fitness, gold for the team.')) },
      { label: tr('Kein Trainingslager', 'No training camp'), effect: (c) => (mark(c, 'lager'), tr('Vorbereitung auf dem eigenen Platz. Günstig und ein bisschen öde.', 'Pre-season on your own pitch. Cheap and a bit dull.')) },
    ],
  },

  kassenpruefung: {
    weight: 3,
    calendar: (c) => c.round >= (c.fixtures?.length ?? 10) - 3,
    needs: (c) => {
      const t = c.clubLife?.treasurer;
      return t && c.round >= 5 && !once(c, 'pruefung') && humanClub(c).squad.includes(t.idx) ? { idx: t.idx } : null;
    },
    text: (c, ctx) => tr(`Kassenprüfung. Die zwei Rentner vom Vorstand sitzen mit Lupe über den Belegen von Kassenwart ${first(c, ctx.idx)}.`, `The annual audit. The two pensioners from the committee pore over treasurer ${first(c, ctx.idx)}'s receipts with a magnifying glass.`),
    options: [
      {
        label: tr('Gründlich prüfen lassen', 'Let them audit thoroughly'),
        effect: (c, ctx, rng) => {
          mark(c, 'pruefung');
          const l = clubLife(c);
          if (l.treasurer.honest || l.missing === 0) {
            adjustMood(c, 0.04);
            return tr(`Alles auf den Cent. ${first(c, ctx.idx)} bekommt Applaus und eine Flasche Korn.`, `Correct to the cent. ${first(c, ctx.idx)} gets a round of applause and a bottle of schnapps.`);
          }
          const sum = l.missing;
          return outcome([
            { w: 2, run: () => (book(c, tr('Rückzahlung vom Kassenwart', 'Repayment from the treasurer'), sum), (l.missing = 0), (l.treasurer = null), (c.players[ctx.idx].grumpy = 3), adjustMood(c, -0.05), tr(`Es fehlen ${sum} €. ${first(c, ctx.idx)} zahlt alles zurück, gibt das Amt ab und redet zwei Wochen mit keinem.`, `€${sum} is missing. ${first(c, ctx.idx)} pays it all back, gives up the post and does not speak to anyone for two weeks.`)) },
            { w: 1, run: () => ((l.missing = 0), (l.treasurer = null), adjustMood(c, -0.08), leaveTeam(c, ctx.idx) ? tr(`Es fehlen ${sum} €. ${first(c, ctx.idx)} tritt noch am Abend aus. Das Geld ist weg, der Spieler auch.`, `€${sum} is missing. ${first(c, ctx.idx)} quits that same evening. The money is gone, and so is he.`) : tr(`Es fehlen ${sum} €. ${first(c, ctx.idx)} verspricht, es zurückzuzahlen. Irgendwann.`, `€${sum} is missing. ${first(c, ctx.idx)} promises to pay it back. At some point.`)) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Ach, der macht das schon', 'Oh, he knows what he is doing'),
        effect: (c, ctx) => {
          mark(c, 'pruefung');
          adjustMood(c, 0.02);
          return clubLife(c).treasurer.honest ? tr('Unterschrift drunter, ab zum Bier. Passt schon.', 'Signed off, off to the bar. It will be fine.') : tr(`Unterschrift drunter. ${first(c, ctx.idx)} wirkt sehr erleichtert. Verdächtig erleichtert.`, `Signed off. ${first(c, ctx.idx)} looks very relieved. Suspiciously relieved.`);
        },
      },
    ],
  },

  flohmarkt: {
    weight: 1.2,
    needs: (c) => (!once(c, 'floh') && c.round >= 3 ? {} : null),
    text: () => tr('Der Keller vom Vereinsheim quillt über: alte Trikots von 1994, drei kaputte Tornetze, eine Kiste Wimpel. Der Vorstand will entrümpeln.', 'The clubhouse cellar is overflowing: old shirts from 1994, three broken goal nets, a box of pennants. The committee wants a clear-out.'),
    options: [
      { label: tr('Flohmarkt mit Kuchenstand', 'Flea market with a cake stall'), effect: outcome([
        { w: 3, run: (c) => (mark(c, 'floh'), adjustEnergy(c, -2), book(c, tr('Vereinsflohmarkt', 'Club flea market'), 65), neighbors(c, 1), supporters(c, 1), tr('Die Trikots von 1994 sind plötzlich „Retro" und gehen für 8 € das Stück weg. 65 € in der Kasse.', 'The 1994 shirts are suddenly "retro" and go for €8 each. €65 in the kitty.')) },
        { w: 1, run: (c) => (mark(c, 'floh'), adjustEnergy(c, -2), book(c, tr('Vereinsflohmarkt', 'Club flea market'), 20), tr('Viel Kuchen verkauft, wenig Wimpel. 20 € und ein voller Bauch.', 'Lots of cake sold, few pennants. €20 and a full stomach.')) },
      ]) },
      { label: tr('Alles an einen Händler verkaufen', 'Sell the lot to a dealer'), effect: (c) => (mark(c, 'floh'), book(c, tr('Kellerinhalt an Händler', 'Cellar contents to a dealer'), 25), adjustMood(c, -0.02), tr('25 € für alles. Einer entdeckt später sein altes Meistertrikot bei eBay – für 60 €.', '€25 for the lot. Someone later spots his old title-winning shirt on eBay – for €60.')) },
      { label: tr('Behalten – das ist Vereinsgeschichte!', 'Keep it – this is club history!'), effect: (c) => (mark(c, 'floh'), adjustMood(c, 0.03), chronicle(c, tr('Die alten Wimpel hängen jetzt im Vereinsheim.', 'The old pennants now hang in the clubhouse.')), tr('Die Wimpel kommen an die Wand. Opa Heinz erzählt zu jedem eine Geschichte.', 'The pennants go up on the wall. Grandpa Heinz has a story for each one.')) },
    ],
  },

  nachbarn: {
    weight: 1.6,
    needs: (c) => (!once(c, 'nachbarn') && (hasFacility(c, 'flutlicht') || hasFacility(c, 'grill') || hasFacility(c, 'tribuene') || (c.clubLife?.neighbors ?? 0) < 0) ? {} : null),
    text: () => tr('Frau Köhler aus Nummer 12 klingelt: Das Gegröle nach dem Training, das Licht, die Autos auf dem Gehweg. „So geht das nicht weiter."', 'Mrs Köhler from number 12 rings the bell: the shouting after training, the lights, the cars on the pavement. "This cannot go on."'),
    options: [
      { label: tr('Mit einer Kiste Bier vorbeigehen (15 €)', 'Drop round with a crate of beer (€15)'), effect: outcome([
        { w: 3, run: (c) => (mark(c, 'nachbarn'), book(c, tr('Friedensangebot an die Nachbarn', 'Peace offering to the neighbours'), -15), neighbors(c, 2), tr('Herr Köhler trinkt Bier. Frau Köhler nicht, lächelt aber. Frieden.', 'Mr Köhler drinks beer. Mrs Köhler does not, but smiles. Peace.')) },
        { w: 1, run: (c) => (mark(c, 'nachbarn'), book(c, tr('Friedensangebot an die Nachbarn', 'Peace offering to the neighbours'), -15), neighbors(c, 1), supporters(c, 1), tr('Herr Köhler war früher Libero. Er tritt dem Förderverein bei.', 'Mr Köhler used to be a sweeper. He joins the supporters\' club.')) },
      ]) },
      { label: tr('Nachbarn zum Heimspiel einladen', 'Invite the neighbours to a home game'), effect: outcome([
        { w: 2, run: (c) => (mark(c, 'nachbarn'), neighbors(c, 1), adjustMood(c, 0.02), tr('Sie kommen tatsächlich, mit Klappstühlen. Nach dem 1:0 klatscht sogar Frau Köhler.', 'They actually come, with folding chairs. After the 1-0 even Mrs Köhler claps.')) },
        { w: 1, run: (c) => (mark(c, 'nachbarn'), neighbors(c, -1), tr('Sie kommen, bekommen einen Ball an den Kopf und gehen wieder.', 'They come, get hit by a ball and leave again.')) },
      ]) },
      { label: tr('Ignorieren, das ist ein Sportplatz', 'Ignore it, this is a sports ground'), effect: (c) => (mark(c, 'nachbarn'), neighbors(c, -1), adjustMood(c, 0.02), tr('Die Jungs finden die Haltung gut. Frau Köhler schreibt sich Kennzeichen auf.', 'The lads like the attitude. Mrs Köhler writes down number plates.')) },
    ],
  },

  ordnungsamt: {
    weight: 4,
    needs: (c) => ((c.clubLife?.neighbors ?? 0) <= -2 && !once(c, 'amt') ? {} : null),
    text: () => tr('Post vom Ordnungsamt: mehrere Beschwerden wegen Lärm und Falschparkern. Man bittet um eine Stellungnahme – oder 80 € Verwarnungsgeld.', 'A letter from the council: several complaints about noise and parking. They request a statement – or an €80 fine.'),
    options: [
      { label: tr('Zahlen und Ruhe haben (80 €)', 'Pay and be done with it (€80)'), effect: (c) => (mark(c, 'amt'), book(c, tr('Verwarnungsgeld Ordnungsamt', 'Council fine'), -80), neighbors(c, 1), tr('Bezahlt. Ab sofort Training nur bis 21 Uhr, sagt der Vorstand.', 'Paid. From now on training ends at 9pm, says the committee.')) },
      { label: tr('Stellungnahme schreiben und Ruhezeiten einführen', 'Write a statement and bring in quiet hours'), effect: outcome([
        { w: 2, run: (c) => (mark(c, 'amt'), neighbors(c, 2), adjustMood(c, -0.03), tr('Ruhezeiten, Parkordnung, Schild am Tor. Das Amt stellt ein. Die Jungs maulen.', 'Quiet hours, parking rules, a sign on the gate. The council drops it. The lads grumble.')) },
        { w: 1, run: (c) => (mark(c, 'amt'), book(c, tr('Verwarnungsgeld Ordnungsamt', 'Council fine'), -40), neighbors(c, 1), tr('Das Amt halbiert das Verwarnungsgeld. Immerhin.', 'The council halves the fine. Better than nothing.')) },
      ]) },
    ],
  },

  flutlicht_strom: {
    weight: 1.5,
    needs: (c) => (hasFacility(c, 'flutlicht') && !once(c, 'strom') && c.round >= 3 ? {} : null),
    text: () => tr('Die Stromabrechnung ist da. Das Flutlicht hat mehr gezogen als gedacht: 120 € Nachzahlung.', 'The electricity bill has arrived. The floodlights used more than expected: €120 extra to pay.'),
    options: [
      { label: tr('Aus der Kasse zahlen', 'Pay from the kitty'), effect: (c) => (mark(c, 'strom'), book(c, tr('Stromnachzahlung Flutlicht', 'Floodlight electricity bill'), -120), tr('Bezahlt. Der Kassenwart dreht ab jetzt nach dem Training persönlich das Licht aus.', 'Paid. From now on the treasurer switches the lights off personally after training.')) },
      { label: tr('Umlage: jeder legt 10 € drauf', 'Everyone chips in €10'), effect: outcome([
        { w: 2, run: (c) => (mark(c, 'strom'), book(c, tr('Umlage Flutlicht', 'Floodlight levy'), -120 + squad(c).length * 10), adjustMood(c, -0.06), tr('Gezahlt wird, gemault auch. „Dann spielen wir halt im Dunkeln."', 'They pay, and they moan. "Then we will just play in the dark."')) },
        { w: 1, run: (c, ctx, rng) => { mark(c, 'strom'); book(c, tr('Umlage Flutlicht', 'Floodlight levy'), -120 + (squad(c).length - 2) * 10); const s = rng.pick(squad(c)); c.players[s].grumpy = 2; adjustMood(c, -0.05); return tr(`Zwei zahlen nicht. ${first(c, s)} hält einen Vortrag über Energiepreise.`, `Two do not pay. ${first(c, s)} gives a lecture on energy prices.`); } },
      ]) },
      { label: tr('Einen Sponsor fragen', 'Ask a sponsor'), effect: (c) => {
        mark(c, 'strom');
        const s = (c.sponsors ?? []).slice().sort((a, b) => (b.rel ?? 50) - (a.rel ?? 50))[0];
        if (!s) return (book(c, tr('Stromnachzahlung Flutlicht', 'Floodlight electricity bill'), -120), tr('Kein Sponsor da, den man fragen könnte. Die Kasse zahlt.', 'No sponsor to ask. The kitty pays.'));
        if ((s.rel ?? 50) >= 55) return (adjustRel(s, -6), tr(`${s.name} übernimmt die Rechnung. „Aber dann hängt unser Banner auch am Mast."`, `${s.name} covers the bill. "But then our banner goes on the mast."`));
        return (adjustRel(s, -10), book(c, tr('Stromnachzahlung Flutlicht', 'Floodlight electricity bill'), -60), tr(`${s.name} gibt die Hälfte – und ist hörbar genervt.`, `${s.name} pays half – and is audibly annoyed.`));
      } },
    ],
  },

  foerderverein: {
    weight: 1.4,
    needs: (c) => ((c.clubLife?.supporters ?? 0) < 12 && c.round >= 3 && !once(c, 'werben') ? {} : null),
    text: (c) => tr(`Der Förderverein hat ${clubLife(c).supporters} Mitglieder. Jedes zahlt 1 € pro Woche. Der zweite Vorsitzende will werben.`, `The supporters' club has ${clubLife(c).supporters} members. Each pays €1 a week. The vice-chairman wants to recruit.`),
    options: [
      { label: tr('Flyer drucken und verteilen (10 €)', 'Print and hand out flyers (€10)'), effect: outcome([
        { w: 3, run: (c) => (mark(c, 'werben'), book(c, tr('Flyer Förderverein', 'Supporters\' club flyers'), -10), supporters(c, 3), tr('Drei neue Fördermitglieder, darunter der Bäcker von gegenüber.', 'Three new supporters, including the baker across the road.')) },
        { w: 1, run: (c) => (mark(c, 'werben'), book(c, tr('Flyer Förderverein', 'Supporters\' club flyers'), -10), supporters(c, 1), tr('Ein neues Mitglied. Die restlichen Flyer liegen im Kofferraum.', 'One new member. The rest of the flyers are in the boot.')) },
      ]) },
      { label: tr('Tag der offenen Tür', 'Open day'), effect: outcome([
        { w: 2, run: (c) => (mark(c, 'werben'), adjustEnergy(c, -4), supporters(c, 5), adjustMood(c, 0.04), neighbors(c, 1), tr('Kinderschminken, Torwandschießen, Kaffee und Kuchen. Fünf neue Fördermitglieder.', 'Face painting, a shooting wall, coffee and cake. Five new supporters.')) },
        { w: 1, run: (c) => (mark(c, 'werben'), adjustEnergy(c, -4), supporters(c, 2), tr('Es kommen hauptsächlich Eltern der A-Jugend. Zwei treten trotzdem bei.', 'Mostly U19 parents turn up. Two join anyway.')) },
      ]) },
      { label: tr('Kein Stress, lass mal', 'No stress, leave it'), effect: (c) => (mark(c, 'werben'), tr('Der zweite Vorsitzende nickt enttäuscht.', 'The vice-chairman nods, disappointed.')) },
    ],
  },

  putzdienst: {
    weight: 1.2,
    needs: (c) => (c.round >= 2 && !once(c, 'putz') ? {} : null),
    text: () => tr('Die Kabine sieht aus wie nach einem Abstiegskampf: Schlammsocken, leere Flaschen, ein Schienbeinschoner unbekannter Herkunft.', 'The dressing room looks like the aftermath of a relegation battle: muddy socks, empty bottles, a shin pad of unknown origin.'),
    options: [
      { label: tr('Putzplan mit Namen aushängen', 'Put up a cleaning rota with names'), effect: outcome([
        { w: 3, run: (c) => (mark(c, 'putz'), adjustMood(c, -0.02), tr('Es funktioniert. Meistens. Einer tauscht grundsätzlich.', 'It works. Mostly. One of them always swaps.')) },
        { w: 1, run: (c, ctx, rng) => { mark(c, 'putz'); const s = rng.pick(squad(c)); c.players[s].grumpy = 1; return tr(`${first(c, s)} fühlt sich bloßgestellt: „Ich war letzte Woche gar nicht da!"`, `${first(c, s)} feels called out: "I was not even there last week!"`); } },
      ]) },
      { label: tr('Wer Dreck macht, zahlt 2 € in die Kasse', 'Whoever makes a mess pays €2 into the kitty'), effect: (c) => (mark(c, 'putz'), book(c, tr('Kabinenstrafen', 'Dressing room fines'), 16), adjustMood(c, -0.01), tr('Nach einer Woche sind 16 € drin und die Kabine ist sauber. Kapitalismus.', 'After a week there is €16 in the tin and the room is clean. Capitalism.')) },
      { label: tr('Selbst putzen, mit gutem Beispiel voran', 'Clean it yourself, lead by example'), effect: (c) => (mark(c, 'putz'), adjustEnergy(c, -3), adjustMood(c, 0.05), tr('Du schrubbst zwei Stunden. Die Jungs sind beeindruckt und ein bisschen beschämt.', 'You scrub for two hours. The lads are impressed and a little ashamed.')) },
    ],
  },

  einbruch: {
    weight: 0.5,
    needs: (c) => (c.round >= 3 && !once(c, 'einbruch') ? {} : null),
    text: () => tr('Einbruch im Vereinsheim! Weg sind: zwölf Bälle, die Musikbox und – warum auch immer – die Eckfahnen.', 'Break-in at the clubhouse! Gone: twelve balls, the speaker and – for whatever reason – the corner flags.'),
    options: [
      { label: tr('Versicherung anrufen', 'Call the insurance'), effect: outcome([
        { w: 2, run: (c) => (mark(c, 'einbruch'), book(c, tr('Einbruch: Selbstbeteiligung', 'Break-in: excess'), -25), tr('Die Versicherung zahlt, bis auf 25 € Selbstbeteiligung. Und drei Formulare.', 'The insurance pays, apart from a €25 excess. And three forms.')) },
        { w: 1, run: (c) => (mark(c, 'einbruch'), book(c, tr('Einbruch: Ersatz', 'Break-in: replacements'), -90), tr('Die Police ist seit 2009 abgelaufen. Hat keiner gemerkt. 90 € für Ersatz.', 'The policy expired in 2009. Nobody noticed. €90 for replacements.')) },
      ]) },
      { label: tr('Spendenaufruf in der Nachbarschaft', 'Appeal for donations in the neighbourhood'), effect: outcome([
        { w: (c) => 2 + Math.max(0, clubLife(c).neighbors), run: (c) => (mark(c, 'einbruch'), book(c, tr('Spenden nach dem Einbruch', 'Donations after the break-in'), 40), supporters(c, 2), adjustMood(c, 0.05), tr('Die Nachbarschaft hält zusammen: Bälle, 40 € und zwei neue Fördermitglieder.', 'The neighbourhood pulls together: balls, €40 and two new supporters.')) },
        { w: (c) => 1 + Math.max(0, -clubLife(c).neighbors), run: (c) => (mark(c, 'einbruch'), book(c, tr('Einbruch: Ersatz', 'Break-in: replacements'), -60), tr('Frau Köhler kommentiert unter dem Aufruf: „Vielleicht war es ja ein Fan." Kaum Spenden.', 'Mrs Köhler comments under the appeal: "Maybe it was a fan." Hardly any donations.')) },
      ]) },
    ],
  },

  zapfanlage: {
    weight: 1,
    needs: (c) => ((hasFacility(c, 'grill') || c.staff?.wirt) && !once(c, 'zapf') ? {} : null),
    text: (c) => tr(`Die Zapfanlage streikt. ${c.staff?.wirt ? `${c.staff.wirt.name.split(' ')[0]} hinter der Theke ist ratlos.` : 'Hinter der Theke herrscht Ratlosigkeit.'} Heimspiel am Sonntag.`, `The beer tap has packed up. ${c.staff?.wirt ? `${c.staff.wirt.name.split(' ')[0]} behind the bar is at a loss.` : 'Nobody behind the bar knows what to do.'} Home game on Sunday.`),
    options: [
      { label: tr('Fachfirma rufen (90 €)', 'Call a technician (€90)'), effect: (c) => (mark(c, 'zapf'), book(c, tr('Reparatur Zapfanlage', 'Beer tap repair'), -90), tr('Läuft wieder. Der Techniker bleibt zum Probetrinken.', 'Working again. The technician stays for a test pint.')) },
      { label: tr('Selbst reparieren', 'Fix it yourselves'), effect: outcome([
        { w: 2, run: (c, ctx, rng) => { mark(c, 'zapf'); const s = rng.pick(squad(c)); adjustMood(c, 0.04); return tr(`${first(c, s)} ist Hobbyschrauber. Nach einer Stunde zapft es wieder. Held der Woche.`, `${first(c, s)} is a keen tinkerer. An hour later it is pouring again. Hero of the week.`); } },
        { w: 1, run: (c) => (mark(c, 'zapf'), book(c, tr('Reparatur Zapfanlage (nach Selbstversuch)', 'Beer tap repair (after DIY attempt)'), -140), tr('Nach dem Selbstversuch steht die Theke unter Wasser. Die Fachfirma wird teurer.', 'After the DIY attempt the bar is flooded. The technician costs more now.')) },
      ]) },
      { label: tr('Sonntag gibt es Flaschenbier', 'Bottled beer on Sunday'), effect: (c) => (mark(c, 'zapf'), adjustMood(c, -0.03), tr('Flaschenbier. Die Alten am Zaun reden von einem Kulturverlust.', 'Bottled beer. The old boys at the fence speak of a cultural loss.')) },
    ],
  },

  weihnachtsfeier: {
    weight: 5,
    calendar: () => true,
    needs: (c) => {
      const half = Math.floor((c.fixtures?.length ?? 10) / 2);
      return c.round >= half - 1 && c.round <= half && !once(c, 'xmas') ? {} : null;
    },
    text: () => tr('Weihnachtsfeier steht an. Wichteln mit 5-€-Grenze ist gesetzt. Aber wo?', 'The Christmas party is coming up. Secret Santa with a €5 limit is a given. But where?'),
    options: [
      { label: tr('Im Vereinsheim mit Buffet (40 €)', 'At the clubhouse with a buffet (€40)'), effect: outcome([
        { w: 3, run: (c) => (mark(c, 'xmas'), book(c, tr('Weihnachtsfeier', 'Christmas party'), -40), adjustMood(c, 0.1), tr('Kartoffelsalat in fünf Varianten. Einer wichtelt ein Trikot des Derby-Rivalen. Großes Gelächter.', 'Potato salad in five varieties. Someone gives a shirt of the derby rivals as Secret Santa. Much laughter.')) },
        { w: 1, run: (c, ctx, rng) => { mark(c, 'xmas'); book(c, tr('Weihnachtsfeier', 'Christmas party'), -40); const s = rng.pick(squad(c)); adjustForm(c, s, -0.3); adjustMood(c, 0.08); return tr(`Schöner Abend. ${first(c, s)} verträgt den Glühwein nicht und verschläft das nächste Training.`, `Lovely evening. ${first(c, s)} cannot handle the mulled wine and oversleeps the next training session.`); } },
      ]) },
      { label: tr('Bowling mit allen (60 €)', 'Bowling with everyone (€60)'), effect: (c) => (mark(c, 'xmas'), book(c, tr('Weihnachtsfeier: Bowling', 'Christmas party: bowling'), -60), adjustMood(c, 0.12), tr('Der Torwart ist auch beim Bowling nicht zu schlagen. Die Stimmung ist bestens.', 'The keeper is unbeatable at bowling too. Spirits are high.')) },
      { label: tr('Ausfallen lassen', 'Skip it'), effect: (c) => (mark(c, 'xmas'), adjustMood(c, -0.08), tr('Keine Weihnachtsfeier. Im Chat werden traurige Tannenbaum-Emojis gepostet.', 'No Christmas party. Sad Christmas tree emojis appear in the chat.')) },
    ],
  },

  ehrung: {
    weight: 1.5,
    needs: (c) => {
      const honored = new Set(c.clubLife?.honored ?? []);
      const a = (c.alumni ?? []).find((x) => x.idx != null && !honored.has(x.idx) && (x.apps ?? 0) >= 30 && c.season > x.season);
      return a ? { idx: a.idx, name: a.name, apps: a.apps } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} hat ${ctx.apps} Spiele für den Verein gemacht und steht seit dem Abschied jeden Sonntag am Zaun. Der Vorstand schlägt eine Ehrung vor.`, `${ctx.name} played ${ctx.apps} games for the club and has stood at the fence every Sunday since retiring. The committee suggests honouring him.`),
    options: [
      { label: tr('Ehrennadel und Foto an die Wand (10 €)', 'Badge of honour and a photo on the wall (€10)'), effect: (c, ctx) => {
        clubLife(c).honored = [...(clubLife(c).honored ?? []), ctx.idx];
        book(c, tr(`Ehrung ${ctx.name}`, `Honouring ${ctx.name}`), -10);
        supporters(c, 1);
        adjustMood(c, 0.06);
        chronicle(c, tr(`${ctx.name} erhält die Ehrennadel des Vereins.`, `${ctx.name} receives the club's badge of honour.`));
        return tr(`Beim Heimspiel gibt es Applaus. ${ctx.name.split(' ')[0]} hat Tränen in den Augen und tritt dem Förderverein bei.`, `Applause at the home game. ${ctx.name.split(' ')[0]} has tears in his eyes and joins the supporters' club.`);
      } },
      { label: tr('Später mal', 'Maybe later'), effect: (c, ctx) => ((clubLife(c).honored = [...(clubLife(c).honored ?? []), ctx.idx]), tr('Wird vertagt. Er steht trotzdem jeden Sonntag am Zaun.', 'Postponed. He still stands at the fence every Sunday.')) },
    ],
  },
};
