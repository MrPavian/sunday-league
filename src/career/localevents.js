// Ereignisse für die dünnen Stellen des Vereinsalltags (Messung `scripts/events-audit.mjs`, ROADMAP 11.5):
// Presse, Wetter, Schiri-Nachwuchs, Leihen, Fans, Training, Gegner-Spionage, Platzwart, Vereinsheim-Wirt, Familie.
// 20 Ereignisse, davon fünf Ketten mit einem Folge-Ereignis Wochen später:
//   reporter_woche → reportage_erscheint · leihanfrage → leihe_rueckkehr · fanclub_gruendung → fanclub_bus ·
//   platzwart_ruhestand → platzwart_nachfolge · wirt_kuendigt → wirt_neu.
// Wirkungsgrößen wie bei den vorhandenen Ereignissen: Stimmung ±0,02 … 0,12, Tagesform ±0,1 … 0,6,
// Kasse ±12 … 150 €, Förderverein ±1 … 3, Absage 1 Woche (Leihe 3), „angefressen" 1–2 Wochen.
// Spielbericht (ab Stufe 4 gibt es kein „kommt später" mehr): Verspätungen laufen über sitOut(…, 'late')
// (wird dort zu 'no') und die Texte über lateOr.
// Je Saison höchstens einmal (Merker c.flags.lev); Ketten stehen in c.flags.chain und verfallen mit der Saison.
import { tr } from '../core/i18n.js';
import { clubById, humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { adjustFitness } from './fitness.js';
import { travelMul } from './facilities.js';
import { canLose, first, leaveTeam, outcome, sitOut } from './outcomes.js';
import { lateOr } from './spielbericht.js';
import { adjustEnergy, isCoach } from './personal.js';
import { setRelation } from './relations.js';
import { isBanned } from './suspensions.js';
import { clampN, clubLife } from './clublife.js';

const level = (c) => c.level ?? 1;
const rounds = (c) => c.fixtures?.length ?? 10;
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));
const team = (c, d) => humanClub(c).squad.forEach((i) => adjustForm(c, i, d));
const hurt = (c, idx, weeks = 1) => {
  if (!c.players[idx]) return;
  c.players[idx].injuryWeeks = Math.max(c.players[idx].injuryWeeks ?? 0, weeks);
  sitOut(c, idx);
};
const supporters = (c, d) => (clubLife(c).supporters = Math.max(0, clubLife(c).supporters + d));
const neighbors = (c, d) => (clubLife(c).neighbors = clampN(clubLife(c).neighbors + d));
const some = (c, rng, n) => {
  const pool = squad(c).filter((i) => !isBanned(c, i)); // Gesperrte nicht für „kommt zu spät / fehlt“ ziehen
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return out;
};
// Der Gegner dieser Woche und ob wir auswärts spielen.
const fixtureOf = (c) => c.fixtures?.[c.round]?.find((f) => f.home === humanClub(c).id || f.away === humanClub(c).id) ?? null;
const opponentName = (c) => {
  const f = fixtureOf(c);
  return f ? clubById(c, f.home === humanClub(c).id ? f.away : f.home)?.name ?? null : null;
};
const isAway = (c) => fixtureOf(c)?.away === humanClub(c).id;

// --- Merker: einmal je Saison, Ketten ---------------------------------------------------
const doneThisSeason = (c, id) => c.flags?.lev?.[id] === c.season;
const markDone = (c, id) => {
  c.flags ??= {};
  (c.flags.lev ??= {})[id] = c.season;
};
const SPAN = 4; // Wochen, in denen ein Folge-Ereignis nach seinem Termin noch kommen darf
const links = (c) => ((c.flags ??= {}).chain ??= {});
const startChain = (c, id, delay, data = {}) => {
  links(c)[id] = { season: c.season, due: c.round + delay, ...data };
};
const dueLink = (c, id, span = SPAN) => {
  const l = c.flags?.chain?.[id];
  return l && l.season === c.season && c.round >= l.due && c.round <= l.due + span ? l : null;
};
const endChain = (c, id) => {
  if (c.flags?.chain) delete c.flags.chain[id];
};
const early = (c) => c.round >= 1 && c.round <= rounds(c) - 5; // so viel Platz, dass das Folge-Ereignis noch kommt

// Einmal je Saison: gemerkt wird beim Entscheiden (auch beim automatischen Entscheiden am Spieltag).
function local(id, def) {
  return { ...def, options: def.options.map((o) => ({ ...o, effect: (c, ctx, rng) => (markDone(c, id), o.effect(c, ctx, rng)) })) };
}
// Folge-Ereignis: kommt in der Woche, in der die Kette fällig ist; die Entscheidung beendet die Kette.
function followUp(id, def) {
  return { ...def, weight: 1, followUp: true, options: def.options.map((o) => ({ ...o, effect: (c, ctx, rng) => (endChain(c, id), o.effect(c, ctx, rng)) })) };
}

const lowerHalf = (c, rng) => {
  const list = squad(c).filter((i) => !(c.players[i]?.injuryWeeks > 0) && !(c.players[i]?.awayWeeks > 0) && !isBanned(c, i));
  list.sort((a, b) => playerOf(c, a).rating - playerOf(c, b).rating);
  const pool = list.slice(0, Math.max(1, Math.ceil(list.length / 2)));
  return pool.length ? rng.pick(pool) : null;
};

export const LOCAL_EVENTS = {
  // === Presse: Kreisblatt-Reporter begleitet eine Woche ==========================================
  reporter_woche: local('reporter_woche', {
    weight: 3,
    needs: (c) => (early(c) && !doneThisSeason(c, 'reporter_woche') ? {} : null),
    text: () => tr('Ein junger Reporter vom Kreisblatt will den Verein eine Woche lang begleiten: Training, Spieltag, Vereinsheim. „Ungeschönt", sagt er und klopft auf seinen Notizblock.', 'A young reporter from the district paper wants to follow the club for a week: training, matchday, clubhouse. "Warts and all," he says, tapping his notebook.'),
    options: [
      {
        label: tr('Alles zeigen: Training, Kabine, Vereinsheim', 'Show him everything: training, dressing room, clubhouse'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.08), startChain(c, 'reportage_erscheint', 2, { tone: 1 }), tr('Dienstag am Zaun, Donnerstag in der Kabine, Freitag am Tresen. Alle benehmen sich – fast alle.', 'Tuesday at the fence, Thursday in the dressing room, Friday at the bar. Everyone behaves – nearly everyone.')) },
          { w: 2, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); adjustForm(c, s, 0.3); startChain(c, 'reportage_erscheint', 2, { tone: 1 }); return tr(`Er fotografiert ${first(c, s)} beim Torschusstraining im Regen. „Das wird das Titelbild." ${first(c, s)} steht den ganzen Tag gerade.`, `He photographs ${first(c, s)} at shooting practice in the rain. "That's the cover." ${first(c, s)} stands up straight all day.`); } },
          { w: 1.5, run: (c) => (adjustMood(c, -0.05), startChain(c, 'reportage_erscheint', 2, { tone: -1 }), tr('Er schreibt mit, was in der Kabine gesagt wird. Alles. Auch das über den Schiri.', 'He writes down what is said in the dressing room. All of it. Including what was said about the ref.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); c.players[s].grumpy = 1; startChain(c, 'reportage_erscheint', 2, { tone: 0 }); return tr(`Er fragt ${first(c, s)}, was er hier verdient. „Verdienen? Ich zahl hier!" Das Gespräch wird wörtlich mitgeschrieben.`, `He asks ${first(c, s)} what he earns here. "Earn? I pay to be here!" Every word goes in the notebook.`); } },
        ]),
      },
      {
        label: tr('Nur das Training – die Kabine bleibt zu', 'Training only – the dressing room stays shut'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.03), startChain(c, 'reportage_erscheint', 2, { tone: 0 }), tr('Brav, sachlich, ein bisschen langweilig. Er lobt den Rasen und fragt zweimal nach dem Wirt.', 'Polite, factual, a little dull. He praises the grass and asks twice about the landlord.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.03), startChain(c, 'reportage_erscheint', 2, { tone: -1 }), tr('Die verschlossene Kabinentür macht ihn erst richtig neugierig. „Was versteckt ihr da drin?"', 'The locked dressing-room door makes him properly curious. "What are you hiding in there?"')) },
          { w: 1, run: (c) => (team(c, 0.08), startChain(c, 'reportage_erscheint', 2, { tone: 1 }), tr('Er sieht, wie ernst im Training gearbeitet wird, und ist beeindruckt: „Das ist echter Fußball." Die Jungs wachsen um einen Zentimeter.', 'He sees how seriously the training is taken and is impressed: "That is proper football." The lads grow an inch.')) },
        ]),
      },
      {
        label: tr('Absagen – wir sind kein Zirkus', 'Decline – we are not a circus'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.02), tr('Er schreibt dann eben über den Gegner. Zwei Spalten, mit Foto.', 'He writes about the opposition instead. Two columns, with a photo.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die Spieler finden es gut: „Erst Ergebnisse, dann Reporter."', 'The players like it: "Results first, reporters later."')) },
          { w: 1, run: (c) => (startChain(c, 'reportage_erscheint', 2, { tone: -1 }), adjustMood(c, -0.03), tr('Er schreibt trotzdem – über „verschlossene Vereinsführung". Fünf Zeilen, aber im Fettdruck.', 'He writes anyway – about a "secretive club leadership". Five lines, but in bold.')) },
        ]),
      },
    ],
  }),

  reportage_erscheint: followUp('reportage_erscheint', {
    needs: (c) => {
      const l = dueLink(c, 'reportage_erscheint');
      return l ? { tone: l.tone } : null;
    },
    text: (c, ctx) =>
      ctx.tone > 0
        ? tr('Die Reportage ist da: eine ganze Seite, Foto vom Training, Überschrift „Sonntagsfußball mit Herz". Der Vorsitzende hat sie schon dreimal laut vorgelesen.', 'The feature is out: a full page, a photo from training, headline "Sunday football with heart". The chairman has already read it out loud three times.')
        : ctx.tone < 0
          ? tr('Die Reportage ist da: Überschrift „Kabinengeflüster". Zitate, aus dem Zusammenhang gerissen. Der Wirt hat die Zeitung vorsorglich versteckt.', 'The feature is out: headline "Dressing-room whispers". Quotes taken out of context. The landlord has hidden the paper as a precaution.')
          : tr('Die Reportage ist da: nett, sachlich, zwei Fehler im Namen des Torwarts. Mitte der Zeitung, neben der Anzeige vom Gartencenter.', 'The feature is out: nice, factual, two mistakes in the keeper\'s name. In the middle of the paper, next to the garden-centre advert.'),
    options: [
      {
        label: tr('Aufhängen und feiern', 'Pin it up and celebrate'),
        effect: outcome([
          { w: (c, ctx) => (ctx.tone > 0 ? 4 : ctx.tone === 0 ? 2 : 0.5), run: (c) => (adjustMood(c, 0.1), supporters(c, 1), tr('Die Seite hängt laminiert im Vereinsheim, neben dem Pokal von 1987. Ein Förderer meldet sich.', 'The page hangs laminated in the clubhouse, next to the 1987 trophy. A new supporter signs up.')) },
          { w: 1, run: (c) => (supporters(c, 2), adjustMood(c, 0.05), tr('Zwei neue Fördermitglieder: „Wir haben das Bild vom Torwart gesehen."', 'Two new supporters: "We saw the photo of the keeper."')) },
          { w: (c, ctx) => (ctx.tone < 0 ? 3 : 0.6), run: (c) => (adjustMood(c, -0.06), tr('Aufhängen war ein Fehler: Der Gegner kopiert die Überschrift für sein Plakat.', 'Pinning it up was a mistake: the opposition copy the headline for their poster.')) },
        ]),
      },
      {
        label: tr('Leserbrief schreiben (Richtigstellung)', 'Write a letter to the editor (correction)'),
        effect: outcome([
          { w: (c, ctx) => (ctx.tone < 0 ? 3 : 1), run: (c) => (adjustMood(c, 0.05), tr('Abgedruckt, zwei Zeilen. Der Reporter ruft persönlich an und entschuldigt sich.', 'Printed, two lines. The reporter rings personally to apologise.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.03), tr('Der Leserbrief erscheint direkt neben einer Anzeige für Rasenmäher. Die Leute lachen.', 'The letter appears right next to an advert for lawnmowers. People laugh.')) },
          { w: 1, run: (c) => (book(c, tr('Kreisblatt: Anzeigenrabatt', 'District paper: advert discount'), 15), tr('Die Redaktion bietet 15 € Rabatt auf die nächste Anzeige an. Man kennt sich jetzt.', 'The paper offers €15 off the next advert. You know each other now.')) },
        ]),
      },
      {
        label: tr('Nicht kommentieren', 'No comment'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustMood(c, ctx.tone > 0 ? 0.04 : ctx.tone < 0 ? -0.02 : 0.01), tr('Am Montag ist es Fischpapier. Am Dienstag weiß keiner mehr, worum es ging.', 'By Monday it is chip paper. By Tuesday nobody remembers what it was about.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); adjustForm(c, s, 0.2); return tr(`${first(c, s)} schneidet seinen Namen aus und klebt ihn an den Spind. „Stand in der Zeitung."`, `${first(c, s)} cuts out his name and sticks it on his locker. "Was in the paper."`); } },
        ]),
      },
    ],
  }),

  // === Wetter ======================================================================================
  sturmwarnung: local('sturmwarnung', {
    weight: 7,
    needs: (c) => (c.week?.weather?.id === 'wind' && c.round >= 1 && !doneThisSeason(c, 'sturmwarnung') ? {} : null),
    text: () => tr('Der Wetterdienst warnt für Sonntag vor Sturmböen. Der Platzwart hat die Tore festgebunden und die Eckfahnen eingesammelt. „Wenn das so weitergeht, fliegt der Ball nach Holland."', 'The weather service warns of gales on Sunday. The groundsman has tied the goals down and collected the corner flags. "If this carries on, the ball will end up in Holland."'),
    options: [
      {
        label: tr('Wir spielen – die Eckfahnen bleiben im Schrank', 'We play – the corner flags stay in the cupboard'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.04), tr('Jeder Abstoß fliegt zehn Meter zu weit. Alle haben Spaß, der Torwart weniger.', 'Every goal kick flies ten metres too far. Everyone has fun, the keeper less so.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); hurt(c, s); return tr(`${first(c, s)} verdreht sich beim Kampf mit einem Flugball den Knöchel.`, `${first(c, s)} twists his ankle fighting a swirling ball.`); } },
          { w: 1, run: (c) => (book(c, tr('Sturmschaden an der Bande', 'Storm damage to the advertising boards'), -25), tr('Die Werbebande legt sich um und rutscht aufs Feld. Reparatur: 25 €.', 'The advertising boards fall over and slide onto the pitch. Repairs: €25.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); sitOut(c, s, 'late'); return lateOr(c, tr(`${first(c, s)} steht hinter einem umgestürzten Baum auf der Landstraße und kommt erst zur zweiten Halbzeit.`, `${first(c, s)} is stuck behind a fallen tree on the country road and only arrives for the second half.`), tr(`${first(c, s)} steht hinter einem umgestürzten Baum auf der Landstraße. Der Spielbericht ist zu – er sieht von draußen zu.`, `${first(c, s)} is stuck behind a fallen tree on the country road. The match report is closed – he watches from outside.`)); } },
        ]),
      },
      {
        label: tr('Beim Gegner anrufen und Verlegung vorschlagen', 'Ring the opposition and suggest a postponement'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.03), tr('Der Gegner lehnt ab: „Wir sind auch nicht aus Zucker." Immerhin: Ihr habt gefragt.', 'The opposition refuse: "We are not made of sugar either." At least you asked.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); adjustMood(c, -0.04); sitOut(c, s); return tr(`Der Kreis erlaubt die Verlegung auf Mittwochabend. ${first(c, s)} kann da nicht – Spätschicht.`, `The district allows the match to move to Wednesday evening. ${first(c, s)} can't make it – late shift.`); } },
          { w: 1, run: (c) => (adjustMood(c, -0.05), tr('Der Schiri entscheidet kurz vor dem Anpfiff: Es wird gespielt. Die Anfrage war nur peinlich.', 'The ref decides shortly before kick-off: the game is on. The request was just embarrassing.')) },
        ]),
      },
      {
        label: tr('Alles sichern: Zelt, Bierwagen, Bande (30 €)', 'Secure everything: tent, beer wagon, boards (€30)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Sturmsicherung', 'Storm-proofing'), -30), adjustMood(c, 0.05), tr('Nichts fliegt weg. Der Wirt bedankt sich mit einer Runde.', 'Nothing blows away. The landlord thanks you with a round.')) },
          { w: 1.5, run: (c) => (book(c, tr('Sturmsicherung', 'Storm-proofing'), -30), book(c, tr('Glühwein bei Sturm', 'Mulled wine in the gale'), 40), tr('Es kommen nur die Hartgesottenen – die kaufen Glühwein. 40 € Umsatz.', 'Only the hard-core fans turn up – they buy mulled wine. €40 takings.')) },
          { w: 1, run: (c) => (book(c, tr('Sturmsicherung', 'Storm-proofing'), -30), neighbors(c, 1), tr('Euer Zelt hält. Ihr sichert auch den Gartenzaun des Nachbarn. Er bringt Kuchen.', 'Your tent holds. You secure the neighbour\'s garden fence too. He brings cake.')) },
        ]),
      },
    ],
  }),

  schneeschippen: local('schneeschippen', {
    weight: 7,
    needs: (c) => (['schnee', 'frost'].includes(c.week?.weather?.id) && c.round >= 1 && !doneThisSeason(c, 'schneeschippen') ? { snow: c.week.weather.id === 'schnee' } : null),
    text: (c, ctx) => (ctx.snow ? tr('Über Nacht ist Schnee gefallen. Der Platz ist weiß, die Linien sind weg, und der Kapitän fragt am Telefon: „Und jetzt?"', 'It snowed overnight. The pitch is white, the lines are gone, and the captain asks on the phone: "Now what?"') : tr('Der Platz ist über Nacht steinhart gefroren. Die Pfützen im Strafraum sind jetzt Eisflächen, und der Kapitän fragt am Telefon: „Und jetzt?"', 'The pitch froze solid overnight. The puddles in the box are ice rinks now, and the captain asks on the phone: "Now what?"')),
    options: [
      {
        label: tr('Alle zum Räumen – Glühwein hinterher (15 €)', 'Everyone clears the pitch – mulled wine after (€15)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Glühwein nach dem Räumen', 'Mulled wine after the clear-up'), -15), adjustMood(c, 0.1), team(c, -0.1), tr('Eine Stunde räumen, dann Glühwein. Der Platz ist frei, die Truppe verschworen, die Rücken krumm.', 'An hour of clearing, then mulled wine. The pitch is clear, the squad close-knit, the backs bent.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); book(c, tr('Glühwein nach dem Räumen', 'Mulled wine after the clear-up'), -15); hurt(c, s); return tr(`${first(c, s)} rutscht auf der Eisplatte hinterm Tor aus und fällt auf die Schulter.`, `${first(c, s)} slips on the ice patch behind the goal and lands on his shoulder.`); } },
          { w: 1, run: (c) => (book(c, tr('Glühwein nach dem Räumen', 'Mulled wine after the clear-up'), -15), supporters(c, 1), adjustMood(c, 0.05), tr('Ein Rentner kommt mit Traktor und Schneeschild vorbei. Er will bloß „was tun". Er wird Fördermitglied.', 'A pensioner turns up with a tractor and snow plough. He just wants "something to do". He becomes a supporter.')) },
        ]),
      },
      {
        label: tr('Orangener Ball, Spiel im Schnee – ein Event daraus machen (12 €)', 'Orange ball, play in the snow – make an event of it (€12)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Orangene Bälle', 'Orange balls'), -12), adjustMood(c, 0.08), tr('Ein Foto vom Eckball im Schneetreiben kommt ins Kreisblatt. Das Bild wird häufiger kopiert als jedes Tor.', 'A photo of the corner in the snowstorm makes the district paper. It gets copied more often than any goal.')) },
          { w: 1.5, run: (c) => (book(c, tr('Orangene Bälle', 'Orange balls'), -12), team(c, 0.1), tr('Alle spielen wie die Kinder. Zwei Fehlpässe pro Minute, aber niemand ärgert sich.', 'Everybody plays like kids. Two misplaced passes a minute, but nobody minds.')) },
          { w: 1, run: (c) => (book(c, tr('Orangene Bälle', 'Orange balls'), -12), book(c, tr('Schaulustige: Eintritt', 'Curious spectators: gate'), 35), tr('Im Dorfchat und am Kiosk spricht sich das herum: 35 € mehr an der Kasse.', 'Word spreads in the village chat and at the kiosk: €35 more at the gate.')) },
        ]),
      },
      {
        label: tr('Training in die Halle verlegen (25 €)', 'Move training into the hall (€25)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Hallenmiete', 'Hall rental'), -25), team(c, 0.1), tr('Hallenfußball mit Banden. Mehr Technik, mehr Gejammer, am Ende kein Muskelkater.', 'Indoor football off the boards. More technique, more moaning, no sore muscles in the end.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); book(c, tr('Hallenmiete', 'Hall rental'), -25); hurt(c, s); return tr(`Der Hallenboden ist glatt wie ein Spiegel: ${first(c, s)} reißt sich ein Band an.`, `The hall floor is slick as glass: ${first(c, s)} strains a ligament.`); } },
          { w: 1, run: (c) => (book(c, tr('Hallenmiete', 'Hall rental'), -25), adjustMood(c, -0.04), tr('Die Handballer haben die Halle doppelt gebucht. Die Hälfte der Zeit trainiert ihr auf dem Parkplatz.', 'The handball team double-booked the hall. Half the session is on the car park.')) },
        ]),
      },
    ],
  }),

  // === Schiri-Nachwuchs im eigenen Verein ===========================================================
  schiri_neuling: local('schiri_neuling', {
    weight: 2.7,
    needs: (c, rng) => {
      if (level(c) < 2 || doneThisSeason(c, 'schiri_neuling')) return null;
      const list = squad(c).filter((i) => playerOf(c, i).age <= 24);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) hat im Winter den Schiedsrichter-Neulingskurs gemacht und würde für den Verein pfeifen. Der Kreis verlangt einen Schiri je Verein, sonst gibt es Strafen. Aber ${first(c, ctx.s)} spielt ja selbst bei euch.`, `${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) did the beginners' referee course over the winter and would referee for the club. The district wants a referee per club or there are fines. But ${first(c, ctx.s)} plays for you himself.`),
    options: [
      {
        label: tr('Pfeifen lassen – er spielt trotzdem weiter', 'Let him referee – he keeps playing too'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustMood(c, 0.03), adjustFitness(c, ctx.s, -0.08), tr('Der Kreis zählt ihn für euer Soll. Samstags pfeift er die F-Jugend, sonntags spielt er – und schläft montags im Stehen.', 'The district counts him towards your quota. He referees the under-8s on Saturdays, plays on Sundays – and sleeps standing up on Mondays.')) },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), tr('Ein Vater brüllt ihn bei der F-Jugend an: „Das war nie Abseits!" Er kommt mit hängenden Schultern zum Training.', 'A father shouts at him at the under-8s: "That was never offside!" He turns up at training with drooping shoulders.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.2), tr('Der Schiri-Obmann des Kreises schenkt ihm eine Pfeife. Er trägt sie jetzt auch beim Training um den Hals und fühlt sich ernst genommen.', 'The district referees\' officer gives him a whistle. He wears it round his neck at training too and feels taken seriously.')) },
          { w: 0.8, run: (c, ctx) => (sitOut(c, ctx.s), tr('Der Kreis setzt ihn ausgerechnet am Spieltag zu einem anderen Spiel an. Er fehlt im Kader.', 'The district assigns him to another match on your matchday, of all days. He is missing from the squad.')) },
        ]),
      },
      {
        label: tr('Nur Jugendspiele, der Sonntag bleibt frei', 'Youth matches only, Sunday stays free'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.04), tr('Er pfeift samstags und spielt sonntags. Die Eltern bringen ihm sogar einen Kaffee mit.', 'He referees on Saturdays and plays on Sundays. The parents even bring him a coffee.')) },
          { w: 1, run: (c) => (book(c, tr('Kreis: Schiri-Soll erfüllt', 'District: referee quota met'), 20), tr('Der Kreis erkennt ihn für das Schiri-Soll an und erlässt 20 € Gebühr.', 'The district credits him against the referee quota and waives a €20 fee.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr('Wer Spiele leitet, liest sie besser: Er steht auf dem Platz plötzlich dort, wo der Ball hinkommt.', 'Anyone who runs matches reads them better: suddenly he stands where the ball is going.')) },
        ]),
      },
      {
        label: tr('Kein Interesse – Strafe zahlen (30 €)', 'Not interested – pay the fine (€30)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Kreis: Strafe fehlender Schiri', 'District: fine for missing referee'), -30), tr('Bezahlt. Das Geld wäre für Trikotwäsche gewesen.', 'Paid. The money was meant for washing the kit.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Kreis: Strafe fehlender Schiri', 'District: fine for missing referee'), -30), (c.players[ctx.s].grumpy = 2), tr(`${first(c, ctx.s)} fühlt sich nicht ernst genommen. „Ich hätte das echt gern gemacht."`, `${first(c, ctx.s)} feels he isn't taken seriously. "I really would have liked to do it."`)) },
          { w: 1, run: (c) => (book(c, tr('Kreis: Strafe fehlender Schiri', 'District: fine for missing referee'), -30), adjustMood(c, 0.02), tr('Die Mannschaft legt für die Strafe zusammen: „Lieber zahlen als eigene Leute pfeifen sehen."', 'The squad chips in for the fine: "Better to pay than watch our own lot referee."')) },
        ]),
      },
    ],
  }),

  // === Wechsel: Leihe an den Nachbarverein ==========================================================
  leihanfrage: local('leihanfrage', {
    weight: 3,
    needs: (c, rng) => {
      if (!early(c) || doneThisSeason(c, 'leihanfrage') || !canLose(c, 1)) return null;
      const s = lowerHalf(c, rng);
      return s == null ? null : { s };
    },
    text: (c, ctx) => tr(`Der Nachbarverein hat drei Verletzte und fragt, ob ${first(c, ctx.s)} drei Wochen aushelfen darf. „Bei euch kommt er eh selten dran", sagt deren Trainer – freundlich, aber ohne Umwege.`, `The neighbouring club have three injured players and ask whether ${first(c, ctx.s)} can help out for three weeks. "He rarely plays for you anyway," says their coach – friendly, but straight to the point.`),
    options: [
      {
        label: tr('Ausleihen – drei Wochen', 'Lend him out – three weeks'),
        effect: (c, ctx, rng) => {
          const rec = c.players[ctx.s];
          rec.awayWeeks = Math.max(rec.awayWeeks ?? 0, 3);
          rec.awayReason = tr('Hilft beim Nachbarverein aus.', 'Helping out at the neighbouring club.');
          sitOut(c, ctx.s);
          startChain(c, 'leihe_rueckkehr', 3, { s: ctx.s });
          return outcome([
            { w: 3, run: () => (book(c, tr('Leihgebühr vom Nachbarverein', 'Loan fee from the neighbouring club'), 30), tr('30 € Leihgebühr und ein Kasten dazu. Er packt seine Tasche und winkt zum Abschied.', '€30 loan fee and a crate on top. He packs his bag and waves goodbye.')) },
            { w: 2, run: () => (adjustMood(c, 0.04), tr('Der Nachbartrainer revanchiert sich mit dem Angebot, mal gemeinsam zu trainieren. Man versteht sich.', 'The neighbouring coach offers a joint training session in return. You get on.')) },
            { w: 1, run: () => tr(`Schon am Samstag schreibt ${first(c, ctx.s)} ins Chatfenster: „Hier hat die Kabine Fußbodenheizung!" Das ist kein gutes Zeichen.`, `On Saturday ${first(c, ctx.s)} is already messaging: "They have underfloor heating in the dressing room!" That is not a good sign.`) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Nur dieses Wochenende', 'Just this weekend'),
        effect: (c, ctx, rng) => {
          const rec = c.players[ctx.s];
          rec.awayWeeks = Math.max(rec.awayWeeks ?? 0, 1);
          rec.awayReason = tr('Spielt am Wochenende beim Nachbarverein.', 'Playing for the neighbouring club this weekend.');
          sitOut(c, ctx.s);
          return outcome([
            { w: 3, run: () => (adjustForm(c, ctx.s, 0.4), tr('Ein Spiel mehr, ein Tor mehr: Er kommt mit Selbstvertrauen zurück.', 'One more match, one more goal: he comes back full of confidence.')) },
            { w: 1.5, run: () => (book(c, tr('Spesen vom Nachbarverein', 'Expenses from the neighbouring club'), 15), tr('Der Nachbarverein zahlt 15 € Spesen. Die Kasse sagt danke.', 'The neighbouring club pay €15 expenses. The kitty says thanks.')) },
            { w: 1, run: () => ((c.players[ctx.s].grumpy = 1), tr('Er wird dort als Rechtsverteidiger aufgestellt und hasst es. Ihr seid schuld.', 'They play him at right-back and he hates it. You are to blame.')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Nein – wir brauchen jeden Mann', 'No – we need every man'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} hört, dass ihr ihn nicht hergebt, und läuft im Training auffällig lange mit.`, `${first(c, ctx.s)} hears that you won't let him go and stays out unusually long at training.`)) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.02), neighbors(c, -1), tr('Der Nachbarverein ist sauer: „Beim Derby denkt ihr dann an uns."', 'The neighbouring club are annoyed: "Remember us at the derby."')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), tr(`${first(c, ctx.s)} erfährt, dass er „unverzichtbar" ist. Der Trainer des Nachbarvereins hat das sicher so nicht gemeint.`, `${first(c, ctx.s)} learns he is "indispensable". The neighbouring coach surely did not mean it that way.`)) },
        ]),
      },
    ],
  }),

  leihe_rueckkehr: followUp('leihe_rueckkehr', {
    needs: (c) => {
      const l = dueLink(c, 'leihe_rueckkehr');
      return l && humanClub(c).squad.includes(l.s) ? { s: l.s } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} ist zurück vom Nachbarverein: drei Spiele, ein Tor – und er schwärmt von deren Kabine mit Fußbodenheizung und dem Trainer, der „zuhört".`, `${first(c, ctx.s)} is back from the neighbouring club: three games, one goal – and he raves about their dressing room with underfloor heating and the coach who "listens".`),
    options: [
      {
        label: tr('Sofort wieder in die Startelf', 'Straight back into the starting eleven'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.4), tr('Frisch und selbstbewusst: Er spielt, als hätte er nie gefehlt.', 'Fresh and confident: he plays as if he had never been away.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.6), adjustMood(c, 0.04), tr('Er bedankt sich mit einer Grätsche, bei der der Platzwart applaudiert.', 'He says thanks with a slide tackle that the groundsman applauds.')) },
          { w: 1, run: (c, ctx) => (hurt(c, ctx.s), tr('Zu früh, zu viel: Im ersten Training zwickt der Oberschenkel.', 'Too early, too much: his thigh twinges in the first training session.')) },
        ]),
      },
      {
        label: tr('Erst mal ankommen lassen – Bank', 'Let him settle in first – bench'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), adjustForm(c, ctx.s, -0.1), tr('Auf der Bank schmollt er. „Beim Nachbarn war ich Stammspieler."', 'On the bench he sulks. "At the neighbours I was a regular."')) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.1), tr('Er nimmt es sportlich und wärmt sich eine Stunde lang auf.', 'He takes it in his stride and warms up for an hour.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tr('Die Mannschaft findet es fair: „Wer wegfährt, muss sich wieder anstellen."', 'The squad thinks it fair: "If you leave, you queue again."')) },
        ]),
      },
      {
        label: tr('Fragen, ob er dort bleiben will', 'Ask whether he wants to stay there'),
        effect: outcome([
          { w: (c) => (canLose(c) ? 2 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? (adjustMood(c, -0.03), tr(`${first(c, ctx.s)} will beim Nachbarverein bleiben. Fair gesagt, fair gegangen – beim Abschied bekommt er einen Schal.`, `${first(c, ctx.s)} wants to stay at the neighbouring club. Fairly said, fairly gone – he gets a scarf as a leaving present.`)) : tr('Er murrt, bleibt aber.', 'He grumbles, but stays.')) },
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustMood(c, 0.05), tr(`„Ich spiele für euch", sagt ${first(c, ctx.s)} – und meint es.`, `"I play for you," says ${first(c, ctx.s)} – and he means it.`)) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die ehrliche Frage kommt gut an. Er bleibt, und der Kapitän lädt ihn zum Bier ein.', 'The honest question goes down well. He stays, and the captain invites him for a beer.')) },
        ]),
      },
    ],
  }),

  // === Fans: Fanclub, Altherren-Block =================================================================
  fanclub_gruendung: local('fanclub_gruendung', {
    weight: 3,
    needs: (c) => (early(c) && !c.flags?.fanclub && !doneThisSeason(c, 'fanclub_gruendung') ? {} : null),
    text: () => tr('Fünf Stammgäste vom Zaun wollen einen Fanclub gründen. Name: „Zaunkönige". Sie brauchen einen Raum im Vereinsheim und einen Vereinsstempel für die Satzung.', 'Five regulars from the fence want to found a fan club. Name: "The Fence Kings". They need a room in the clubhouse and the club stamp for their constitution.'),
    options: [
      {
        label: tr('Gründung im Vereinsheim, Schals auf Vereinskosten (40 €)', 'Founding in the clubhouse, scarves on the club (€40)'),
        effect: (c, ctx, rng) => {
          c.flags.fanclub = { season: c.season };
          startChain(c, 'fanclub_bus', 3);
          book(c, tr('Fanclub: Schals', 'Fan club: scarves'), -40);
          return outcome([
            { w: 3, run: () => (supporters(c, 2), adjustMood(c, 0.08), tr('Zwölf Mitglieder am ersten Abend. Der Schal ist zwei Meter lang, die Satzung vier Seiten.', 'Twelve members on the first evening. The scarf is two metres long, the constitution four pages.')) },
            { w: 1.5, run: () => (supporters(c, 3), adjustMood(c, 0.1), tr('Der Wirt spendiert das erste Fass. Am Ende sind es zwanzig Mitglieder und ein Chorleiter.', 'The landlord donates the first barrel. In the end there are twenty members and a choirmaster.')) },
            { w: 1, run: () => (supporters(c, 1), adjustMood(c, -0.03), tr('Streit um den Vorsitz: Zwei treten schon vor der Gründung wieder aus. Die Schals sind trotzdem schön.', 'Quarrel over the chairmanship: two resign before the club even exists. The scarves are nice anyway.')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Gerne – aber ohne Geld von uns', 'Gladly – but without money from us'),
        effect: (c, ctx, rng) => {
          c.flags.fanclub = { season: c.season };
          startChain(c, 'fanclub_bus', 3);
          return outcome([
            { w: 3, run: () => (supporters(c, 1), adjustMood(c, 0.04), tr('Sie nähen die Schals selbst. Einer ist grün, zwei sind rot, und niemand sagt etwas.', 'They sew the scarves themselves. One is green, two are red, and nobody says anything.')) },
            { w: 1.5, run: () => (supporters(c, 1), book(c, tr('Fanclub: Spendenbüchse', 'Fan club: collection tin'), 25), tr('Sie stellen eine Spendenbüchse auf: 25 € für die Mannschaftskasse in der ersten Woche.', 'They put out a collection tin: €25 for the team kitty in the first week.')) },
            { w: 1, run: () => (supporters(c, 2), tr('Im Gegenzug wollen sie einen Stehtisch am Zaun. Der Platzwart schraubt ihn selbst fest.', 'In return they want a standing table at the fence. The groundsman bolts it down himself.')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Lieber nicht – wir sind kein Zirkus', 'Better not – we are not a circus'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.03), tr('Sie stehen weiter am Zaun, nur ohne Schal. Es ist jetzt etwas stiller.', 'They keep standing at the fence, just without scarves. It is a bit quieter now.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.06), tr('Sie gründen trotzdem – als „Zaunkönige gegen die Vereinsführung". Das Banner hängt gut sichtbar.', 'They found it anyway – as "Fence Kings Against The Board". The banner is hung where everyone can see it.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Der Fanclub des Gegners hört davon und lädt die Fünf zum Auswärtsspiel ein. Verräter!', 'The opposition fan club hear about it and invite the five to the away game. Traitors!')) },
        ]),
      },
    ],
  }),

  fanclub_bus: followUp('fanclub_bus', {
    needs: (c) => {
      const l = dueLink(c, 'fanclub_bus', 6);
      const club = opponentName(c);
      return l && isAway(c) && club ? { club } : null;
    },
    text: (c, ctx) => tr(`Auswärtsspiel bei ${ctx.club}: Die Zaunkönige wollen mit einem gemieteten Bus mitfahren – 24 Plätze, 120 €. Ob der Verein die Hälfte übernimmt?`, `Away at ${ctx.club}: the Fence Kings want to travel with a hired coach – 24 seats, €120. Will the club pay half?`),
    options: [
      {
        label: tr('Die Hälfte zahlen (60 €)', 'Pay half (€60)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Fanbus: Anteil', 'Fan coach: share'), -60), team(c, 0.1), adjustMood(c, 0.1), tr('Auswärts klingt es wie ein Heimspiel. Die Mannschaft läuft sich warm, als würde ein Chor singen.', 'Away from home it sounds like a home game. The team warms up as if a choir were singing.')) },
          { w: 1.5, run: (c) => (book(c, tr('Fanbus: Anteil', 'Fan coach: share'), -60), supporters(c, 2), tr('Zehn weitere Leute steigen unterwegs zu. Zwei von ihnen werden Fördermitglieder.', 'Ten more people hop on along the way. Two of them become supporters.')) },
          { w: 1, run: (c) => (book(c, tr('Fanbus: Anteil', 'Fan coach: share'), -60), adjustMood(c, 0.03), tr('Der Bus bleibt an der Raststätte stehen. Sie verpassen die ersten 45 Minuten, singen aber umso lauter.', 'The coach gets stuck at a service station. They miss the opening 45 minutes but sing all the louder.')) },
        ]),
      },
      {
        label: tr('Selbst zahlen lassen – wir stellen den Wimpel', 'Let them pay – we provide the pennant'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.04), tr('Jeder zahlt 5 € und singt. Der Wimpel hängt am Rückspiegel und wird zum Maskottchen.', 'Everyone pays €5 and sings. The pennant hangs from the rear-view mirror and becomes a mascot.')) },
          { w: 1, run: (c) => (supporters(c, 1), tr('Sie zahlen selbst und sind stolz darauf. Ein weiteres Mitglied kommt dazu.', 'They pay for themselves and are proud of it. One more member joins.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Nur sechs Fans fahren mit. Das Echo auf der Gegengerade ist dünn.', 'Only six fans travel. The echo from the far touchline is thin.')) },
        ]),
      },
      {
        label: tr('Privatautos müssen reichen', 'Private cars will have to do'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.04), tr('Die Autos verteilen sich: Vier Fans finden den Platz nie und sehen sich das Spiel in einem Biergarten an.', 'The cars scatter: four fans never find the ground and watch the game in a beer garden.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tr('Fahrgemeinschaften, Gesang aus dem Fenster. Einer wird zum Dauerfahrer und verlangt Kilometergeld.', 'Car shares, singing out of the windows. One becomes a permanent driver and demands mileage.')) },
          { w: 1, run: (c) => (supporters(c, -1), tr('Einer fühlt sich nicht wertgeschätzt und tritt wieder aus.', 'One feels unappreciated and resigns.')) },
        ]),
      },
    ],
  }),

  altherren_ultras: local('altherren_ultras', {
    weight: 1.4,
    needs: (c) => (c.round >= 1 && !doneThisSeason(c, 'altherren_ultras') ? {} : null),
    text: () => tr('Die Altherren haben sich hinter das Tor gestellt: zwölf Mann über vierzig, ein Bollerwagen mit Kasten, zwei Trommelstöcke ohne Trommel. Der Torwart des Gegners fragt, ob das ernst gemeint ist.', 'The veterans have taken up position behind the goal: twelve men over forty, a trolley with a crate, two drumsticks without a drum. The opposition keeper asks whether this is serious.'),
    options: [
      {
        label: tr('Offiziell machen: Fanblock „Ü40" (Schals 20 €)', 'Make it official: "Over-40s" block (scarves €20)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Fanblock Ü40: Schals', 'Over-40s block: scarves'), -20), supporters(c, 1), adjustMood(c, 0.08), tr('Der lauteste Block der Liga – nach Lebensjahren geordnet. Es gibt eine Pausenregelung für die Hüfte.', 'The loudest block in the league – ordered by age. There is a break rule for hips.')) },
          { w: 1.5, run: (c) => (book(c, tr('Fanblock Ü40: Schals', 'Over-40s block: scarves'), -20), team(c, 0.1), tr('Sie singen jedes Lied durch, auch das mit den 14 Strophen. Die Mannschaft läuft vor Verlegenheit schneller.', 'They sing every song through, even the one with 14 verses. The team runs faster out of embarrassment.')) },
          { w: 1, run: (c) => (book(c, tr('Fanblock Ü40: Schals', 'Over-40s block: scarves'), -20), neighbors(c, -1), adjustMood(c, 0.04), tr('Nach dem Abpfiff wird bis zehn Uhr gesungen. Die Nachbarn zählen mit.', 'After the final whistle they sing until ten. The neighbours are counting.')) },
        ]),
      },
      {
        label: tr('Bitten, die Lautstärke zu senken', 'Ask them to keep it down'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.03), tr('Sie gehen beleidigt zum Bollerwagen und singen auf dem Parkplatz weiter.', 'They go off in a huff to the trolley and carry on singing in the car park.')) },
          { w: 1.5, run: (c) => (neighbors(c, 1), tr('Die Nachbarn atmen auf. Einer schickt eine Flasche Wein.', 'The neighbours breathe a sigh of relief. One sends over a bottle of wine.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tr('Sie stimmen zu – und singen nur noch bei Toren. Das wirkt umso besser.', 'They agree – and only sing after goals. That works all the better.')) },
        ]),
      },
      {
        label: tr('Mitsingen!', 'Join in!'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.1), tr('Du singst die zweite Strophe falsch und wirst dafür gefeiert. Die Mannschaft lacht sich warm.', 'You get the second verse wrong and are cheered for it. The team laughs itself warm.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -3), adjustMood(c, 0.06), tr('Am Montag bist du heiser. Die Familie fragt, ob du zu viel gejubelt hast.', 'On Monday you are hoarse. The family asks whether you cheered too much.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); adjustForm(c, s, 0.3); return tr(`Der Vater von ${first(c, s)} steht im Block und hat ein Plakat gemalt. ${first(c, s)} spielt, als gäbe es kein Morgen.`, `${first(c, s)}'s father is in the block and has painted a banner. ${first(c, s)} plays as if there were no tomorrow.`); } },
        ]),
      },
    ],
  }),

  // === Training ============================================================================================
  waldlauf: local('waldlauf', {
    weight: 2.6,
    needs: (c) => (c.round >= 3 && !['schnee', 'frost'].includes(c.week?.weather?.id) && !doneThisSeason(c, 'waldlauf') ? {} : null),
    text: () => tr('Der Kapitän schlägt vor, am Dienstag statt Platztraining einen Waldlauf zu machen: acht Kilometer, Frischluft, null Rasenschaden. „Und danach Bratwurst."', 'The captain suggests a forest run on Tuesday instead of pitch training: eight kilometres, fresh air, no damage to the turf. "And sausages afterwards."'),
    options: [
      {
        label: tr('Waldlauf, acht Kilometer', 'Forest run, eight kilometres'),
        effect: outcome([
          { w: 3, run: (c) => (team(c, 0.12), tr('Alle atmen tief durch, und es riecht nach Tannen. Am Ende sind sogar die Raucher stolz.', 'Everybody breathes deeply, and it smells of pine. By the end even the smokers are proud.')) },
          { w: 1.5, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); hurt(c, s); return tr(`${first(c, s)} stolpert über eine Wurzel und knickt um. Wurzeln gehören nicht zum Taktikplan.`, `${first(c, s)} trips over a root and goes over on his ankle. Roots are not part of the tactics.`); } },
          { w: 1, run: (c) => (team(c, -0.1), tr('Der Waldboden ist rutschig, drei Mann kommen schlammig zurück und der Rest leicht verärgert.', 'The forest floor is slippery, three men come back muddy and the rest slightly annoyed.')) },
          { w: 1, run: (c, ctx, rng) => { const [a, b] = some(c, rng, 2); if (b != null) setRelation(c, a, b, 'kumpel'); return b != null ? tr(`${first(c, a)} und ${first(c, b)}, die sich sonst nicht ausstehen können, laufen die letzten drei Kilometer nebeneinander. Danach reden sie.`, `${first(c, a)} and ${first(c, b)}, who normally can't stand each other, run the last three kilometres side by side. Afterwards they talk.`) : tr('Alle laufen allein und reden nicht.', 'Everyone runs alone and nobody talks.'); } },
        ]),
      },
      {
        label: tr('Intervalle am Platz – keine Experimente', 'Intervals on the pitch – no experiments'),
        effect: outcome([
          { w: 2, run: (c) => (team(c, 0.06), tr('Zehn mal vierzig Meter. Es tut weh, es wirkt, und keiner verirrt sich.', 'Ten times forty metres. It hurts, it works, and nobody gets lost.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Das Stöhnen ist bis zum Parkplatz zu hören. Der Platzwart spendiert Kaffee aus Mitleid.', 'The groaning can be heard from the car park. The groundsman buys coffee out of pity.')) },
          { w: 1, run: (c, ctx, rng) => { const [s] = some(c, rng, 1); adjustForm(c, s, 0.3); return tr(`${first(c, s)} gewinnt jeden Sprint und ist danach für drei Tage unausstehlich. Aber topfit.`, `${first(c, s)} wins every sprint and is unbearable for three days afterwards. But in top shape.`); } },
        ]),
      },
      {
        label: tr('Lockeres Auslaufen, danach Grillen (20 €)', 'Gentle jog, then a barbecue (€20)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Grillen nach dem Training', 'Barbecue after training'), -20), adjustMood(c, 0.1), tr('Fünf Minuten laufen, zwei Stunden Wurst. Die Stimmung ist bestens, die Waage weniger.', 'Five minutes of jogging, two hours of sausage. The mood is great, the scales less so.')) },
          { w: 1, run: (c, ctx, rng) => { book(c, tr('Grillen nach dem Training', 'Barbecue after training'), -20); for (const s of some(c, rng, 2)) adjustForm(c, s, -0.15); return tr('Zwei übertreiben es mit der dritten Wurst und sind am Sonntag eher gemütlich unterwegs.', 'Two overdo it with the third sausage and are rather leisurely on Sunday.'); } },
          { w: 1, run: (c) => (book(c, tr('Grillen nach dem Training', 'Barbecue after training'), -20), supporters(c, 1), tr('Passanten fragen, ob sie mitgrillen dürfen. Eine Familie zahlt 5 € und wird Fördermitglied.', 'Passers-by ask whether they can join the barbecue. A family pays €5 and becomes supporters.')) },
        ]),
      },
    ],
  }),

  // === Gegner: Spion am Zaun ==============================================================================
  rivalen_spion: local('rivalen_spion', {
    weight: 2.2,
    needs: (c) => {
      const club = opponentName(c);
      return c.round >= 1 && club && !doneThisSeason(c, 'rivalen_spion') ? { club } : null;
    },
    text: (c, ctx) => tr(`Beim Dienstagtraining steht ein Mann im Parka am Zaun und notiert. Der Torwart schwört, er habe ihn schon bei ${ctx.club} gesehen: der Co-Trainer.`, `At Tuesday training a man in a parka stands at the fence taking notes. The keeper swears he has seen him at ${ctx.club} before: their assistant coach.`),
    options: [
      {
        label: tr('Falsche Aufstellung üben – Verwirrspiel', 'Rehearse a fake line-up – mind games'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (team(c, 0.1), adjustMood(c, 0.06), tr(`Der Mann notiert eifrig. Am Sonntag stellt sich ${ctx.club} auf das Falsche ein – und fragt sich bis zur Pause, wer hier wen deckt.`, `The man takes eager notes. On Sunday ${ctx.club} prepare for the wrong thing – and wonder until half-time who is marking whom.`)) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.02), tr('Der Mann war nur ein Vater, der einen Platz für seinen Sohn sucht. Er schaut jetzt sehr verwirrt.', 'The man was just a father looking for a team for his son. He looks very confused now.')) },
          { w: 1, run: (c) => (team(c, -0.1), tr('Die Täuschung funktioniert so gut, dass auch ihr nicht mehr wisst, wer wo steht.', 'The deception works so well that even you no longer know who stands where.')) },
        ]),
      },
      {
        label: tr('Freundlich ansprechen: Kaffee und Kuchen', 'Approach him politely: coffee and cake'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.04), tr('Er ist peinlich berührt und geht. Den Kuchen nimmt er mit.', 'He is embarrassed and leaves. He takes the cake with him.')) },
          { w: 1.5, run: (c, ctx) => (team(c, 0.05), tr(`Er bleibt zum Kaffee und erzählt, dass ${ctx.club} hinten wackelt. Ob das ein Trick ist, weiß keiner.`, `He stays for coffee and tells you ${ctx.club} are shaky at the back. Whether that is a trick, nobody knows.`)) },
          { w: 1, run: (c) => (book(c, tr('Kuchen-Tausch mit dem Gegner', 'Cake swap with the opposition'), 12), tr('Er bietet an, eure Zettel zu tauschen: Er bekommt den Plan, ihr 12 € für den Kuchen.', 'He offers to swap notes: he gets your plan, you get €12 for the cake.')) },
        ]),
      },
      {
        label: tr('Ignorieren – sollen sie ruhig gucken', 'Ignore him – let them look'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Die Mannschaft nimmt es locker: „Sollen sie. Wir haben eh keinen Plan."', 'The team takes it lightly: "Let them. We have no plan anyway."')) },
          { w: 1, run: (c) => (team(c, -0.1), adjustMood(c, -0.04), tr('Am Sonntag kennt der Gegner jeden Eckball. Ihr schaut euch fragend an.', 'On Sunday the opposition know every corner routine. You look at each other.')) },
          { w: 1, run: (c) => (book(c, tr('Sichtschutz am Zaun', 'Screen along the fence'), -18), adjustMood(c, 0.03), tr('Ein Spieler baut mit Bauzaunplane einen Sichtschutz. 18 €, aber das Geheimnis bleibt im Verein.', 'A player puts up a screen with builders\' sheeting. €18, but the secret stays in the club.')) },
        ]),
      },
    ],
  }),

  // === Platzwart: Ruhestand und Nachfolge ======================================================================
  platzwart_ruhestand: local('platzwart_ruhestand', {
    weight: 3,
    needs: (c) => (early(c) && !doneThisSeason(c, 'platzwart_ruhestand') ? {} : null),
    text: () => tr('Walter, seit 31 Jahren Platzwart, kündigt zum Saisonende an: die Knie. „Ich hab den Rasen länger gepflegt als meine Ehe." Er fragt, wer seine Mähmaschine übernimmt.', 'Walter, groundsman for 31 years, announces he is stopping at the end of the season: his knees. "I\'ve looked after this grass longer than my marriage." He asks who is taking over his mower.'),
    options: [
      {
        label: tr('Verabschiedung mit Festakt (40 €)', 'Farewell ceremony (€40)'),
        effect: (c, ctx, rng) => {
          startChain(c, 'platzwart_nachfolge', 2);
          book(c, tr('Verabschiedung Platzwart', 'Groundsman farewell'), -40);
          return outcome([
            { w: 3, run: () => (adjustMood(c, 0.1), tr('Der Bürgermeister, sechzig Gäste, ein Stück Rasen im Rahmen als Geschenk. Walter weint, der Wirt auch.', 'The mayor, sixty guests, a piece of turf in a frame as a present. Walter cries, the landlord too.')) },
            { w: 1.5, run: () => (supporters(c, 1), adjustMood(c, 0.06), tr('Walter spendet seine alte Mähmaschine dem Verein – und wird Fördermitglied.', 'Walter donates his old mower to the club – and becomes a supporter.')) },
            { w: 1, run: () => (adjustMood(c, 0.12), tr('Die Alten erzählen Geschichten von 1993, als der Platz einen Meter unter Wasser stand. Der Abend wird legendär.', 'The old boys tell stories from 1993, when the pitch was a metre under water. The evening becomes legendary.')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Nachfolger suchen – Aushang am Vereinsheim', 'Look for a successor – notice at the clubhouse'),
        effect: (c, ctx, rng) => {
          startChain(c, 'platzwart_nachfolge', 2);
          return outcome([
            { w: 3, run: () => (adjustMood(c, 0.02), tr('Der Aushang hängt neben dem Dartplan. Walter korrigiert die Rechtschreibung mit Kugelschreiber.', 'The notice hangs next to the darts list. Walter corrects the spelling with a ballpoint pen.')) },
            { w: 1.5, run: () => tr('Walter hängt den Aushang selbst auf – mit falscher Telefonnummer. Zwei Tage lang ruft ein Zahnarzt zurück.', 'Walter puts up the notice himself – with the wrong phone number. For two days a dentist keeps calling back.') },
            { w: 1, run: () => (adjustMood(c, 0.04), tr('Zwei Bewerber stehen schon am ersten Tag vor der Tür. Beide haben einen eigenen Rasenmäher.', 'Two applicants are at the door on the very first day. Both have their own lawnmower.')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Bitten, noch ein Jahr zu bleiben (Aufwandsentschädigung 60 €)', 'Ask him to stay another year (expenses €60)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Platzwart: Aufwandsentschädigung', 'Groundsman: expenses'), -60), adjustMood(c, 0.05), tr('Er bleibt. Knurrend, aber er bleibt. Der Rasen sieht aus wie immer: perfekt.', 'He stays. Grumbling, but he stays. The grass looks as it always does: perfect.')) },
          { w: 1, run: (c) => (book(c, tr('Platzwart: Aufwandsentschädigung', 'Groundsman: expenses'), -60), tr('Er bleibt, will freitags aber nicht mehr mähen. Samstags schon. Mit dem Ohrenschutz.', 'He stays, but no longer wants to mow on Fridays. Saturdays, yes. With ear defenders.')) },
          { w: 1, run: (c) => (book(c, tr('Platzwart: Aufwandsentschädigung', 'Groundsman: expenses'), -60), adjustMood(c, -0.05), tr('Die Knie machen einen Strich durch die Rechnung: Vier Wochen fällt er aus, und der Rasen wächst bis zu den Knöcheln.', 'His knees spoil the plan: he is out for four weeks and the grass grows up to the ankles.')) },
        ]),
      },
    ],
  }),

  platzwart_nachfolge: followUp('platzwart_nachfolge', {
    needs: (c) => (dueLink(c, 'platzwart_nachfolge') ? {} : null),
    text: () => tr('Zwei Bewerber für Walters Posten: Dieter (66, Rentner, hat einen Traktor und strenge Ansichten über Maulwürfe) und Max (19, Student, hat einen Mähroboter und ein Profil in den sozialen Netzwerken).', 'Two applicants for Walter\'s job: Dieter (66, pensioner, owns a tractor and has strong views on moles) and Max (19, student, owns a robot mower and a social-media profile).'),
    options: [
      {
        label: tr('Dieter nehmen – Erfahrung', 'Take Dieter – experience'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.05), tr('Dieter mäht Streifen, so gerade, dass der Linienrichter neidisch wird. Walter schaut jeden Tag zu und kommentiert.', 'Dieter mows stripes so straight the linesman gets jealous. Walter watches every day and comments.')) },
          { w: 1, run: (c) => (neighbors(c, -1), tr('Dieter mäht samstags um sieben. Die Nachbarn rufen an, und Dieter ruft zurück: „Rasen kennt keinen Feierabend."', 'Dieter mows at seven on Saturdays. The neighbours ring, and Dieter rings back: "Grass knows no closing time."')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Dieter und Walter streiten, wer mähen darf. Zum Schluss mähen sie zu zweit, im Abstand von drei Metern.', 'Dieter and Walter argue over who gets to mow. In the end they mow together, three metres apart.')) },
        ]),
      },
      {
        label: tr('Max nehmen – Mähroboter (120 €)', 'Take Max – robot mower (€120)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Mähroboter', 'Robot mower'), -120), adjustMood(c, 0.08), tr('Der Roboter schnurrt nachts über den Platz. Der Rasen ist so kurz wie nie, und Walter schaut misstrauisch.', 'The robot purrs across the pitch at night. The grass is shorter than ever, and Walter watches suspiciously.')) },
          { w: 1.5, run: (c) => (book(c, tr('Mähroboter', 'Robot mower'), -120), book(c, tr('Mähroboter: Teich-Bergung', 'Robot mower: pond rescue'), -30), tr('Der Roboter fährt in den Ententeich hinterm Tor. Das Bergen kostet 30 €, die Enten sind stinksauer.', 'The robot drives into the duck pond behind the goal. The rescue costs €30, and the ducks are furious.')) },
          { w: 1, run: (c) => (book(c, tr('Mähroboter', 'Robot mower'), -120), supporters(c, 2), tr('Max filmt das Training und stellt es ins Netz. Zwei neue Fördermitglieder: „Wir haben euch gesehen."', 'Max films training and puts it online. Two new supporters: "We saw you."')) },
        ]),
      },
      {
        label: tr('Beide: Dieter mäht, Max filmt (40 €)', 'Both: Dieter mows, Max films (€40)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Platzwart-Team', 'Groundskeeping team'), -40), adjustMood(c, 0.1), tr('Die beiden streiten ab Tag eins. Der Rasen ist perfekt, das Training wird gefilmt, und die Kabine liebt es.', 'The two argue from day one. The grass is perfect, training is filmed, and the dressing room loves it.')) },
          { w: 1, run: (c) => (book(c, tr('Platzwart-Team', 'Groundskeeping team'), -40), adjustMood(c, -0.03), tr('Zu viele Köche: Dieter und Max mähen am selben Abend in verschiedene Richtungen. Das Muster erinnert an Schach.', 'Too many cooks: Dieter and Max mow in different directions on the same evening. The pattern looks like chess.')) },
          { w: 1, run: (c) => (book(c, tr('Platzwart-Team', 'Groundskeeping team'), -40), supporters(c, 1), tr('Die beiden werden unzertrennlich: Dieter bringt Max das Mähen bei und Max Dieter das Filmen.', 'The two become inseparable: Dieter teaches Max how to mow and Max teaches Dieter how to film.')) },
        ]),
      },
    ],
  }),

  kunstrasen_petition: local('kunstrasen_petition', {
    weight: 2.7,
    needs: (c) => (level(c) >= 2 && c.round >= 1 && !doneThisSeason(c, 'kunstrasen_petition') ? {} : null),
    text: () => tr('Die Eltern der Jugend haben eine Petition gestartet: „Kunstrasen für unseren Platz – auch im Winter spielen". 214 Unterschriften. Sie wollen, dass der Verein sie im Gemeinderat einreicht.', 'The youth parents have started a petition: "Artificial turf for our pitch – play all winter". 214 signatures. They want the club to submit it to the council.'),
    options: [
      {
        label: tr('Einreichen und selbst im Gemeinderat vortragen', 'Submit it and present it to the council yourself'),
        effect: outcome([
          { w: 2, run: (c) => (adjustEnergy(c, -4), adjustMood(c, 0.06), supporters(c, 1), tr('Der Rat beschließt einen Prüfauftrag. Das dauert nur drei bis sieben Jahre. Die Eltern sind trotzdem stolz.', 'The council orders a feasibility study. That only takes three to seven years. The parents are proud anyway.')) },
          { w: 1.5, run: (c) => (adjustEnergy(c, -4), book(c, tr('Gemeinde: Zuschuss Platzpflege', 'Council: pitch maintenance grant'), 150), tr('„Kunstrasen ist zu teuer – aber Naturrasen fördern wir." 150 € Zuschuss für die Platzpflege.', '"Artificial turf is too expensive – but we support natural grass." €150 grant for pitch maintenance.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -4), neighbors(c, -1), adjustMood(c, -0.03), tr('Die Nachbarn sind dagegen: Mikroplastik, Flutlicht, Lärm. Es wird eine lange Sitzung.', 'The neighbours are against it: microplastics, floodlights, noise. It turns into a long meeting.')) },
        ]),
      },
      {
        label: tr('Unterschriften weitersammeln, selbst raushalten', 'Keep collecting signatures, stay out of it'),
        effect: outcome([
          { w: 2, run: (c) => (supporters(c, 2), tr('Die Eltern ziehen es durch: 412 Unterschriften am Ende. Zwei von ihnen treten in den Förderverein ein.', 'The parents see it through: 412 signatures in the end. Two of them join the supporters\' club.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Die Eltern fühlen sich allein gelassen. Beim nächsten Kuchenverkauf fehlt die Hälfte.', 'The parents feel left on their own. Half of them are missing at the next cake sale.')) },
          { w: 1, run: (c) => (book(c, tr('Spendenaktion Kunstrasen', 'Artificial turf fundraiser'), 40), tr('Die Eltern machen eine Spendenaktion: 40 € für die Vereinskasse als „Anschubfinanzierung".', 'The parents run a fundraiser: €40 for the club as "seed money".')) },
        ]),
      },
      {
        label: tr('Naturrasen ist Fußball – nein danke', 'Natural grass is football – no thanks'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Die Alten am Zaun nicken: „Endlich sagt es einer." Walter schickt eine Postkarte.', 'The old boys at the fence nod: "At last someone says it." Walter sends a postcard.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.06), tr('Die Eltern wenden sich ab. Auf dem Spielplatz heißt es: „Der Trainer will uns im Matsch halten."', 'The parents turn away. On the playground they say: "The coach wants to keep us in the mud."')) },
          { w: 1, run: (c) => (neighbors(c, 1), tr('Die Nachbarn freuen sich über den Erhalt der Wiese. Einer bringt Pflaumenkuchen.', 'The neighbours are glad the meadow stays. One brings plum cake.')) },
        ]),
      },
    ],
  }),

  // === Vereinsheim: Wirt kündigt, neuer Wirt =====================================================================
  wirt_kuendigt: local('wirt_kuendigt', {
    weight: 3,
    needs: (c) => (early(c) && !doneThisSeason(c, 'wirt_kuendigt') ? {} : null),
    text: () => tr('Der Wirt des Vereinsheims kündigt zum Monatsende. „Zehn Bier am Sonntag reichen nicht für eine Familie." Ab Montag steht hinter der Theke niemand mehr.', 'The landlord of the clubhouse gives notice at the end of the month. "Ten pints on a Sunday don\'t feed a family." From Monday there is nobody behind the bar.'),
    options: [
      {
        label: tr('Pacht drei Monate erlassen (60 €)', 'Waive the rent for three months (€60)'),
        effect: (c, ctx, rng) => {
          startChain(c, 'wirt_neu', 3, { how: 'bleibt' });
          book(c, tr('Pacht erlassen', 'Rent waived'), -60);
          return outcome([
            { w: 3, run: () => (adjustMood(c, 0.06), tr('Er bleibt. Die Zapfanlage wird gefeiert, als wäre sie neu.', 'He stays. The tap system is celebrated as if it were new.')) },
            { w: 1, run: () => (adjustMood(c, 0.03), tr('Er bleibt, murmelt aber, dass er „nicht für Gottes Lohn" Frikadellen brät.', 'He stays, but mutters that he will not fry meatballs "for love alone".')) },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Die Mannschaft stellt sich hinter die Theke', 'The squad takes turns behind the bar'),
        effect: (c, ctx, rng) => {
          startChain(c, 'wirt_neu', 3, { how: 'selbst' });
          return outcome([
            { w: 2, run: () => (adjustMood(c, 0.04), tr('Schichtplan an der Kühlschranktür. Der Torwart ist ein erstaunlich guter Zapfer.', 'Rota on the fridge door. The keeper is a surprisingly good barman.')) },
            { w: 1.5, run: () => (book(c, tr('Thekenkasse: Differenz', 'Bar till: shortfall'), -15), tr('Die Strichliste ist ein Rätsel: Am Sonntag fehlen 15 € und zwei Kisten.', 'The tally sheet is a mystery: on Sunday €15 and two crates are missing.')) },
            { w: 1, run: (c2, ctx2, rng2) => { for (const s of some(c, rng, 2)) adjustForm(c, s, -0.3); return tr('Zwei stehen die ganze Nacht hinter der Theke und sind am Sonntag eher Beobachter als Spieler.', 'Two stand behind the bar all night and are more spectators than players on Sunday.'); } },
          ])(c, ctx, rng);
        },
      },
      {
        label: tr('Gehen lassen und neu ausschreiben', 'Let him go and advertise the lease'),
        effect: (c, ctx, rng) => {
          startChain(c, 'wirt_neu', 3, { how: 'neu' });
          return outcome([
            { w: 2, run: () => (adjustMood(c, -0.04), tr('Das Vereinsheim bleibt zu. Freitags gibt es Bier aus dem Kofferraum.', 'The clubhouse stays shut. On Fridays there is beer from the boot of a car.')) },
            { w: 1, run: () => (adjustMood(c, 0.02), tr('Ein Interessent steht schon in der Tür, bevor der Aushang hängt. Man kennt sich im Dorf.', 'An applicant is at the door before the notice is even up. Everybody knows everybody in the village.')) },
            { w: 1, run: () => (book(c, tr('Anzeige: Pächter gesucht', 'Advert: tenant wanted'), -20), tr('Die Anzeige im Kreisblatt kostet 20 €. Dafür schreibt eine Bäckerin zurück.', 'The advert in the district paper costs €20. A baker writes back.')) },
          ])(c, ctx, rng);
        },
      },
    ],
  }),

  wirt_neu: followUp('wirt_neu', {
    needs: (c) => {
      const l = dueLink(c, 'wirt_neu');
      return l ? { how: l.how } : null;
    },
    text: (c, ctx) =>
      ctx.how === 'bleibt'
        ? tr('Der Wirt hat die Pacht-Pause genutzt, um Wünsche zu sammeln: Öffnungszeiten bis 23 Uhr, ein Fernseher für die Konferenz am Samstag, neue Gläser. „Dann bleib ich."', 'The landlord used the rent break to collect wishes: opening until 11pm, a telly for the Saturday football round-up, new glasses. "Then I\'ll stay."')
        : ctx.how === 'selbst'
          ? tr('Der Thekendienst läuft seit drei Wochen. Die Strichliste ist ein Rätsel, Dienstag fehlten zwei Kisten, und der Kassierer will wieder einen richtigen Wirt.', 'The bar rota has run for three weeks. The tally sheet is a mystery, two crates went missing on Tuesday, and the treasurer wants a proper landlord again.')
          : tr('Zwei Interessenten fürs Vereinsheim: ein Paar aus dem Nachbarort (Imbisserfahrung, will Schnitzel anbieten) und ein Ex-Torwart (will Fußballabende mit Leinwand). Wer?', 'Two applicants for the clubhouse: a couple from the next village (snack-bar experience, wants to serve schnitzel) and an ex-keeper (wants football evenings with a big screen). Who?'),
    options: [
      {
        label: tr('Großzügig sein (50 €)', 'Be generous (€50)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Vereinsheim: Renovierung', 'Clubhouse: refit'), -50), adjustMood(c, 0.1), tr('Neue Gläser, neuer Anstrich, die Theke blinkt. Am ersten Abend ist das Heim voll bis zur Tür.', 'New glasses, fresh paint, a blinking bar. On the first evening the clubhouse is full to the door.')) },
          { w: 1.5, run: (c) => (book(c, tr('Vereinsheim: Renovierung', 'Clubhouse: refit'), -50), supporters(c, 1), adjustMood(c, 0.06), tr('Zur Eröffnung sind die Altherren eingeladen. Einer tritt am selben Abend in den Förderverein ein.', 'The veterans are invited to the opening. One joins the supporters\' club the same evening.')) },
          { w: 1, run: (c) => (book(c, tr('Vereinsheim: Renovierung', 'Clubhouse: refit'), -50), adjustMood(c, 0.12), team(c, -0.1), tr('Die Eröffnung zieht sich bis drei Uhr. Am Sonntag riecht die Kabine nach Schnitzel.', 'The opening drags on until three. On Sunday the dressing room smells of schnitzel.')) },
        ]),
      },
      {
        label: tr('Verhandeln, auf Augenhöhe', 'Negotiate as equals'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.05), tr('Man einigt sich in einer Stunde und drei Bier. Handschlag, kein Vertrag, so läuft das hier.', 'You agree in an hour and three pints. Handshake, no contract, that is how it works here.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.02), tr('Der Streit um die Zapfanlage dauert eine Woche. Das Bier gibt es solange nur aus Flaschen.', 'The dispute over the taps lasts a week. Until then the beer comes in bottles only.')) },
          { w: 1, run: (c) => (book(c, tr('Pachtvorschuss', 'Rent advance'), 25), tr('Er zahlt 25 € Pachtvorschuss, damit die Sache „schnell geklärt" ist.', 'He pays €25 as a rent advance so the matter is "settled quickly".')) },
        ]),
      },
      {
        label: tr('Hart bleiben', 'Hold firm'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.06), tr('Der Wirt schmollt, das Heim bleibt noch eine Woche dunkel. Auf dem Parkplatz spricht man darüber.', 'The landlord sulks, the clubhouse stays dark for another week. People talk about it in the car park.')) },
          { w: 1, run: (c) => (book(c, tr('Pacht erhöht', 'Rent increased'), 30), tr('Die Pacht steigt, er zahlt knurrend. Die 30 € sind eine Entschädigung für die Zeit ohne Theke.', 'The rent goes up, he pays through gritted teeth. The €30 makes up for the time without a bar.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Überraschung: Hart bleiben beeindruckt. „Endlich ein Verein, der weiß, was er will."', 'Surprise: holding firm impresses. "At last a club that knows what it wants."')) },
        ]),
      },
    ],
  }),

  // === Familie und Privates ==========================================================================================
  vater_sohn: local('vater_sohn', {
    weight: 2.5,
    needs: (c, rng) => {
      if (doneThisSeason(c, 'vater_sohn')) return null;
      const list = squad(c).filter((i) => playerOf(c, i).age >= 35);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) bringt seinen Sohn mit zum Training: 17, schmal und – wie der Vater sagt – „schneller als ich in dem Alter". Ob der Junge mittrainieren darf? Zwei Generationen in einer Kabine.`, `${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) brings his son to training: 17, wiry and – as his father says – "faster than I was at that age". Can the lad train with the squad? Two generations in one dressing room.`),
    options: [
      {
        label: tr('Sohn mittrainieren lassen', 'Let the son train with the squad'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.4), adjustMood(c, 0.05), tr('Papa läuft wie lange nicht, um vor dem Jungen nicht blöd dazustehen.', 'Dad runs like he hasn\'t for ages so as not to look silly in front of the lad.')) },
          { w: 1.5, run: (c, ctx) => (hurt(c, ctx.s), tr('Papa will mithalten und zerrt sich den Oberschenkel. Der Sohn trägt die Tasche.', 'Dad tries to keep up and pulls a thigh muscle. The son carries the bag.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustMood(c, 0.06), tr('Der Junge ist besser als Papa und sagt es auch. Papa grinst den ganzen Abend und bleibt dem Verein ewig treu.', 'The lad is better than Dad and says so. Dad grins all evening and stays loyal to the club for ever.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tr('Die Alten ziehen den Jungen auf: Spitzname „Bubi". Er nimmt es mit Humor und holt Kaffee.', 'The old boys tease the lad: nickname "Sonny". He takes it with humour and fetches the coffee.')) },
        ]),
      },
      {
        label: tr('Probetraining in der A-Jugend', 'Trial with the U19s'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Der Jugendtrainer ist begeistert. „Den hat uns der Himmel geschickt – oder zumindest der Papa."', 'The youth coach is delighted. "Sent to us by heaven – or at least by his dad."')) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} steht am Spielfeldrand und feuert an. Danach trainiert er konzentrierter als sonst.`, `${first(c, ctx.s)} stands on the touchline cheering. Afterwards he trains more intently than usual.`)) },
          { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Der Nachbarverein fragt auch schon nach dem Jungen. Der Papa fühlt sich plötzlich sehr wichtig.', 'The neighbouring club are already asking about the lad too. Dad suddenly feels very important.')) },
        ]),
      },
      {
        label: tr('Erst Schule, dann Fußball', 'School first, football second'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), tr(`${first(c, ctx.s)} ist angefressen: „Ich hab ihm das Tor schon gezeigt!"`, `${first(c, ctx.s)} is miffed: "I've already shown him the goal!"`)) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tr('Die Mutter schickt eine Dankeskarte. Auf dem Umschlag ein Herz in Vereinsfarben.', 'The mother sends a thank-you card. On the envelope a heart in club colours.')) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} nimmt sich vor, dem Jungen zu zeigen, wie man's macht, und trainiert wie ein Besessener.`, `${first(c, ctx.s)} resolves to show the lad how it's done and trains like a man possessed.`)) },
        ]),
      },
    ],
  }),

  spieler_vater: local('spieler_vater', {
    weight: 2.2,
    needs: (c, rng) => {
      if (doneThisSeason(c, 'spieler_vater')) return null;
      const list = squad(c).filter((i) => playerOf(c, i).age >= 20 && playerOf(c, i).age <= 40 && !playerOf(c, i).custom);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} wird bald Papa: Der Termin ist „irgendwann dieses Wochenende", sagt er und starrt auf sein Handy. „Wenn es losgeht, bin ich weg."`, `${first(c, ctx.s)} is about to become a dad: the due date is "any time this weekend", he says, staring at his phone. "When it starts, I'm gone."`),
    options: [
      {
        label: tr('Sonntag frei – Familie geht vor', 'Sunday off – family comes first'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.1), tr('Es wird ein Mädchen. Die Mannschaft schickt Strampler mit Vereinswappen. Das Wappen ist größer als das Baby.', 'It is a girl. The team sends a romper suit with the club crest. The crest is bigger than the baby.')) },
          { w: 1.5, run: (c, ctx) => (sitOut(c, ctx.s), tr('Das Baby lässt sich Zeit. Er sitzt den ganzen Sonntag zu Hause und starrt aufs Handy.', 'The baby takes its time. He sits at home all Sunday staring at his phone.')) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), (c.players[ctx.s].loyal = true), tr(`${first(c, ctx.s)} vergisst die Freistellung nie. Der Sohn bekommt den Vereinsschal in die Wiege gelegt.`, `${first(c, ctx.s)} never forgets being given the time off. The son gets the club scarf in his cradle.`)) },
        ]),
      },
      {
        label: tr('Spielen – Handy auf Laut', 'Play – phone on loud'),
        effect: outcome([
          { w: 2.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), tr('Das Handy bleibt stumm. Er spielt, als hätte er einen Doppelwecker im Kopf.', 'The phone stays quiet. He plays as if he had a double alarm clock in his head.')) },
          { w: 2, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), lateOr(c, tr(`Mitten in der ersten Halbzeit klingelt das Handy. ${first(c, ctx.s)} verschwindet im Auto und kommt zur zweiten Halbzeit strahlend zurück: „Ein Junge!"`, `In the middle of the first half the phone rings. ${first(c, ctx.s)} vanishes in the car and returns for the second half, beaming: "A boy!"`), tr(`${first(c, ctx.s)} verlässt schon vor dem Anpfiff den Platz, weil das Handy klingelt. Der Spielbericht ist zu: Er fehlt, strahlt aber am Telefon.`, `${first(c, ctx.s)} leaves before kick-off because the phone rings. The match report is closed: he is missing, but beams down the phone.`))) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), adjustFitness(c, ctx.s, -0.1), tr('Das Kind kam Samstagnacht. Er steht übernächtigt auf dem Platz, strahlt und trifft aus Versehen.', 'The baby arrived on Saturday night. He stands on the pitch sleepless, beaming, and scores by accident.')) },
        ]),
      },
      {
        label: tr('Wetten auf Geburtstermin und Gewicht (2 € pro Kopf)', 'Betting on birth date and weight (€2 a head)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Babywette', 'Baby sweepstake'), 18), adjustMood(c, 0.08), tr('Neun Mitspieler wetten. Der Kassierer gewinnt, und die Mannschaft verlangt Prüfung der Unterlagen.', 'Nine teammates place bets. The treasurer wins, and the squad demands an audit.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Babywette', 'Baby sweepstake'), 18), adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} tippt als Einziger auf Sonntag, 14:30 Uhr – und hat Recht. 18 € gehen als Geschenk an ihn.`, `${first(c, ctx.s)} is the only one to bet on Sunday, 2:30pm – and is right. The €18 goes to him as a gift.`)) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), tr('Die Wette wird zum Dauerthema im Chat. Das Baby ist noch nicht da, aber es hat schon 61 Namen.', 'The bet becomes a standing topic in the chat. The baby has not arrived yet, but already has 61 names.')) },
        ]),
      },
    ],
  }),

  fahrgemeinschaft_bruch: local('fahrgemeinschaft_bruch', {
    weight: 2.7,
    needs: (c, rng) => {
      const club = opponentName(c);
      if (!club || !isAway(c) || doneThisSeason(c, 'fahrgemeinschaft_bruch') || squad(c).length < 6) return null;
      return { club, s: rng.pick(squad(c)) };
    },
    text: (c, ctx) => tr(`Auswärts bei ${ctx.club}: Das Auto von ${first(c, ctx.s)} liegt mit Getriebeschaden in der Werkstatt. Die Fahrgemeinschaft – vier Mann – hat damit kein Fahrzeug mehr.`, `Away at ${ctx.club}: ${first(c, ctx.s)}'s car is in the garage with a gearbox failure. The car share – four men – is left without a vehicle.`),
    options: [
      {
        label: tr('Kleinbus mieten (60 €)', 'Hire a minibus (€60)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Kleinbus gemietet', 'Minibus hired'), -Math.round(60 * travelMul(c))), adjustMood(c, 0.05), tr('Alle sind da, alle pünktlich. Der Kleinbus riecht nach Fußball und alten Brötchen.', 'Everyone is there, everyone on time. The minibus smells of football and old bread rolls.')) },
          { w: 1.5, run: (c, ctx, rng) => { book(c, tr('Kleinbus gemietet', 'Minibus hired'), -Math.round(60 * travelMul(c))); const [s] = some(c, rng, 1); sitOut(c, s, 'late'); return lateOr(c, tr(`Das Navi schickt den Bus in den falschen Ort. ${first(c, s)} kommt erst zur zweiten Halbzeit, die anderen zur Halbzeitpause.`, `The sat nav sends the bus to the wrong village. ${first(c, s)} arrives for the second half, the others at half-time.`), tr(`Das Navi schickt den Bus in den falschen Ort. ${first(c, s)} ist erst nach der Freigabe des Spielberichts da und fehlt.`, `The sat nav sends the bus to the wrong village. ${first(c, s)} arrives after the match report closes and is missing.`)); } },
          { w: 1, run: (c) => (book(c, tr('Kleinbus gemietet', 'Minibus hired'), -Math.round(60 * travelMul(c))), book(c, tr('Vermieter schenkt Kasten', 'Rental firm gifts a crate'), 12), tr('Der Vermieter ist Fan des Gegners und gibt euch trotzdem einen Kasten zurück. Das sei „Sportsgeist".', 'The rental firm owner is an opposition fan and still gives a crate back. That is "sportsmanship".')) },
        ]),
      },
      {
        label: tr('Neue Fahrgemeinschaften per Chat', 'New car shares through the chat'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tr('Der Chat läuft heiß, aber es klappt: Jeder fährt mit jemandem. Zwei sitzen zum ersten Mal im selben Auto.', 'The chat runs hot but it works: everyone rides with someone. Two sit in the same car for the first time.')) },
          { w: 2, run: (c, ctx, rng) => { const [a, b] = some(c, rng, 2); if (a != null) sitOut(c, a, 'late'); if (b != null) sitOut(c, b, 'late'); return lateOr(c, tr(`${first(c, a)} und ${first(c, b)} suchen noch einen Parkplatz und kommen zur zweiten Halbzeit.`, `${first(c, a)} and ${first(c, b)} are still looking for a parking space and arrive for the second half.`), tr(`${first(c, a)} und ${first(c, b)} suchen zu lange einen Parkplatz. Der Spielbericht ist zu: Beide fehlen.`, `${first(c, a)} and ${first(c, b)} spend too long looking for a parking space. The match report is closed: both are missing.`)); } },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Fünf Autos, jeder einzeln, die Anreise ist ein Konvoi aus Missverständnissen.', 'Five cars, everyone alone, the journey is a convoy of misunderstandings.')) },
        ]),
      },
      {
        label: tr('Ich fahre selbst und sammle sie ein', 'I\'ll drive myself and pick them up'),
        effect: outcome([
          { w: 3, run: (c) => (adjustEnergy(c, -6), adjustMood(c, 0.08), tr('Fünf Mann im Kombi, Gesang bis zur Autobahnabfahrt. Du bist erledigt, die Mannschaft verschworen.', 'Five men in the estate car, singing until the motorway exit. You are shattered, the team close-knit.')) },
          { w: 1.5, run: (c, ctx, rng) => { adjustEnergy(c, -6); const [s] = some(c, rng, 1); sitOut(c, s, 'late'); return lateOr(c, tr(`Stau vor der Ausfahrt: ${first(c, s)} kommt erst zur zweiten Halbzeit auf den Platz.`, `A tailback before the exit: ${first(c, s)} only gets onto the pitch for the second half.`), tr(`Stau vor der Ausfahrt: ${first(c, s)} ist zu spät für den Spielbericht und sieht vom Zaun aus zu.`, `A tailback before the exit: ${first(c, s)} is too late for the match report and watches from the fence.`)); } },
          { w: 1, run: (c) => (adjustEnergy(c, -6), book(c, tr('Sprit für den Kombi', 'Fuel for the estate car'), -15), tr('Der Kombi säuft wie ein Fass. Auf der Rückfahrt tankt ihr zusammen, die Quittung bleibt bei dir.', 'The estate drinks like a fish. On the way back you refuel together; the receipt stays with you.')) },
        ]),
      },
    ],
  }),
};

// Gibt es ein fälliges Folge-Ereignis? Dann kommt es diese Woche sicher (siehe rollWeekEvent).
export function chainDue(c) {
  return Object.entries(LOCAL_EVENTS).some(([id, ev]) => ev.followUp && ev.needs(c, { next: () => 0.5, pick: (l) => l[0] }));
}
