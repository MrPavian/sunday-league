// Jugend und junge Spieler abseits des Platzes: Schule, Ausbildung, erste Liebe, andere Interessen, Führerschein,
// Internat im Leistungszentrum und Gastfamilien (Nutzerwunsch 2026-11-04). Alles kann auf die Laune drücken – beim Spieler
// (grummelt, sagt öfter ab) und im Team; daraus kann mehr werden (Stimmung, siehe Konzept Spielerstärke 12.8).
//
// Häufigkeiten und Wirkungen sind Spielwerte. Belegt ist nur die Rückkehr aus dem Internat: In Internaten und
// Auswahlmannschaften wird jährlich etwa ein Viertel der Spieler ausgetauscht (Studie TU Kaiserslautern 2013, zitiert bei
// Correctiv, „Niemand nennt es Geschäft“, 2018) – hier: je Saison rund 25 % Chance, dass ein Kind im Internat zurück will.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { canLose, first, leaveTeam, outcome, sitOut } from './outcomes.js';
import { adjustEnergy, isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { graduate } from './academy.js';

export const NLZ_RETURN_SEASON = 0.25; // Quelle oben
export const HOST_LEVEL = 7; // Gastfamilien ab der Verbandsliga (Nutzerentscheid)

// Junge Spieler im Kader (ohne dich), passend gefiltert; einer per Zufall.
const youngPick = (c, rng, test) => {
  const list = humanClub(c).squad.filter((idx) => c.players[idx] && !isCoach(c, idx) && test(playerOf(c, idx), c.players[idx], idx));
  return list.length ? { s: list[Math.floor(rng.next() * list.length)] } : null;
};
const rec = (c, ctx) => c.players[ctx.s] ?? {};
// Weniger Zeit für den Fußball – für eine Weile (events.js weeklyMood setzt es danach zurück).
export function busyFor(c, idx, mul, weeks) {
  const r = c.players[idx];
  if (!r) return;
  r.absenceMul = mul;
  r.absenceUntil = { season: c.season, round: (c.round ?? 0) + weeks };
}
const grumpy = (c, idx, w) => {
  if (c.players[idx]) c.players[idx].grumpy = Math.max(c.players[idx].grumpy ?? 0, w);
};
const once = (c, ctx, key) => ((c.players[ctx.s][key] = c.season), null);
const doneThisSeason = (r, key, c) => r[key] === c.season;

export const TEEN_EVENTS = {
  abiklausuren: {
    weight: 1.2,
    needs: (c, rng) => youngPick(c, rng, (p, r) => p.age >= 17 && p.age <= 19 && !doneThisSeason(r, 'abi', c) && (r.abiDone ?? 0) < 1 && (c.round ?? 0) >= 6),
    text: (c, ctx) => tr(`${first(c, ctx.s)} schreibt in drei Wochen Abi. Seine Mutter fragt, ob er bis dahin vom Training freigestellt werden kann.`, `${first(c, ctx.s)} sits his final school exams in three weeks. His mother asks whether he can be excused from training until then.`),
    options: [
      { label: tr('Freistellen – Schule geht vor', 'Excuse him – school comes first'), effect: (c, ctx) => (once(c, ctx, 'abi'), (rec(c, ctx).abiDone = 1), busyFor(c, ctx.s, 3, 4), adjustMood(c, 0.01), tr(`${first(c, ctx.s)} fehlt vier Wochen. Die Mutter ist dankbar, er schreibt dir nach jeder Klausur.`, `${first(c, ctx.s)} misses four weeks. His mother is grateful, and he texts you after every exam.`)) },
      {
        label: tr('Lerngruppe in der Kabine – Training light', 'Study group in the dressing room – light training'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (once(c, ctx, 'abi'), (rec(c, ctx).abiDone = 1), busyFor(c, ctx.s, 1.5, 4), adjustEnergy(c, -3), adjustMood(c, 0.03), tr('Der Torwart ist Lehrer und hilft in Mathe. Er kommt seltener, aber er kommt – und die anderen finden das stark.', 'The keeper is a teacher and helps with maths. He comes less often, but he comes – and the others respect it.')) },
          { w: 1, run: (c, ctx) => (once(c, ctx, 'abi'), (rec(c, ctx).abiDone = 1), busyFor(c, ctx.s, 2, 4), adjustForm(c, ctx.s, -0.2), tr('Halb lernen, halb kicken klappt nicht. Er ist müde und unkonzentriert.', 'Half studying, half playing does not work. He is tired and unfocused.')) },
        ]),
      },
      {
        label: tr('„Sonntag brauchen wir dich."', '"We need you on Sunday."'),
        effect: outcome([
          { w: 1, run: (c, ctx) => (once(c, ctx, 'abi'), (rec(c, ctx).abiDone = 1), adjustForm(c, ctx.s, -0.2), tr('Er spielt – und lernt nachts. Man sieht es ihm an.', 'He plays – and studies at night. It shows.')) },
          { w: 2, run: (c, ctx) => (once(c, ctx, 'abi'), (rec(c, ctx).abiDone = 1), grumpy(c, ctx.s, 3), busyFor(c, ctx.s, 3, 4), adjustMood(c, -0.02), tr('Die Mutter ruft zurück: „Dann eben gar nicht." Er fehlt trotzdem – und ist sauer auf dich.', 'The mother calls back: "Then not at all." He misses the games anyway – and is cross with you.')) },
        ]),
      },
    ],
  },

  ausbildung: {
    weight: 1,
    needs: (c, rng) => youngPick(c, rng, (p, r) => p.age >= 16 && p.age <= 19 && !r.apprentice && (c.round ?? 0) <= 4),
    text: (c, ctx) => tr(`${first(c, ctx.s)} fängt eine Ausbildung an – Schichtdienst, auch mal samstags. „Dienstags schaffe ich das Training nicht mehr."`, `${first(c, ctx.s)} is starting an apprenticeship – shift work, Saturdays too sometimes. "I cannot make Tuesday training any more."`),
    options: [
      { label: tr('Training für ihn verschieben (Kraft)', 'Rearrange training for him (energy)'), effect: (c, ctx) => ((rec(c, ctx).apprentice = c.season), adjustEnergy(c, -4), busyFor(c, ctx.s, 1.2, 10), adjustForm(c, ctx.s, 0.2), tr('Ein zweiter Termin am Donnerstag für die Schichtarbeiter. Er ist begeistert, ein paar andere kommen auch.', 'A second session on Thursdays for the shift workers. He is delighted, and a few others come too.')) },
      { label: tr('Mit dem Ausbildungsbetrieb reden', 'Talk to his employer'), effect: outcome([
        { w: 2, run: (c, ctx) => ((rec(c, ctx).apprentice = c.season), busyFor(c, ctx.s, 1.1, 10), tr('Der Chef war selbst Kicker: Sonntags hat er frei.', 'The boss used to play himself: he gets Sundays off.')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).apprentice = c.season), busyFor(c, ctx.s, 1.8, 10), tr('„Hier wird gearbeitet." Er wird oft fehlen.', '"This is a place of work." He will miss a lot.')) },
      ]) },
      { label: tr('Akzeptieren', 'Accept it'), effect: (c, ctx) => ((rec(c, ctx).apprentice = c.season), busyFor(c, ctx.s, 1.6, 10), tr('Er kommt, wann er kann. Das ist nicht oft.', 'He comes when he can. That is not often.')) },
    ],
  },

  erste_liebe: {
    weight: 1,
    needs: (c, rng) => youngPick(c, rng, (p, r) => p.age >= 16 && p.age <= 21 && r.inLove == null),
    text: (c, ctx) => tr(`${first(c, ctx.s)} ist frisch verliebt. Im Training grinst er, beim Abschlussspiel schaut er dauernd zum Zaun.`, `${first(c, ctx.s)} has fallen in love. He grins all through training and keeps looking towards the fence during the practice match.`),
    options: [
      { label: tr('Freuen – und die neue Liebe zum Heimspiel einladen', 'Be happy for him – invite his new love to the home game'), effect: outcome([
        { w: 2, run: (c, ctx) => ((rec(c, ctx).inLove = { season: c.season, round: c.round ?? 0 }), adjustForm(c, ctx.s, 0.4), adjustMood(c, 0.02), tr('Sonntag steht jemand Besonderes am Zaun – und er spielt, als ginge es um sein Leben.', 'On Sunday someone special is at the fence – and he plays as if his life depended on it.')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).inLove = { season: c.season, round: c.round ?? 0 }), sitOut(c, ctx.s), tr('Sonntag ist er nicht da. Ausflug an den See. Die Gruppe kommentiert ausgiebig.', 'He is not there on Sunday. Trip to the lake. The group chat has plenty to say.')) },
      ]) },
      { label: tr('Ermahnen: Kopf beim Fußball', 'Have a word: head in the game'), effect: outcome([
        { w: 1, run: (c, ctx) => ((rec(c, ctx).inLove = { season: c.season, round: c.round ?? 0 }), adjustForm(c, ctx.s, 0.1), tr('Er nickt brav. Und grinst weiter.', 'He nods dutifully. And keeps grinning.')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).inLove = { season: c.season, round: c.round ?? 0 }), grumpy(c, ctx.s, 2), tr('„Was geht dich das an?" Er ist beleidigt.', '"What has it got to do with you?" He takes offence.')) },
      ]) },
    ],
  },

  liebeskummer: {
    weight: 1.5,
    needs: (c, rng) => youngPick(c, rng, (p, r) => r.inLove && !r.inLove.over && (c.season > r.inLove.season || (c.round ?? 0) - r.inLove.round >= 6) && rng.chance(0.4)),
    text: (c, ctx) => tr(`Schluss. ${first(c, ctx.s)} hat Liebeskummer, sitzt in der Kabine und starrt aufs Handy.`, `It is over. ${first(c, ctx.s)} is heartbroken, sits in the dressing room staring at his phone.`),
    options: [
      { label: tr('Mannschaftsabend organisieren', 'Organise a team night out'), effect: (c, ctx) => ((rec(c, ctx).inLove.over = true), adjustEnergy(c, -3), book(c, tr('Mannschaftsabend', 'Team night out'), -40), adjustMood(c, 0.05), adjustForm(c, ctx.s, 0.1), tr('Pizza, Kicker, Karaoke. Um zwei singt er lauter als alle anderen.', 'Pizza, table football, karaoke. By two in the morning he is singing louder than anyone.')) },
      { label: tr('Unter vier Augen reden', 'Have a quiet word'), effect: outcome([
        { w: 2, run: (c, ctx) => ((rec(c, ctx).inLove.over = true), tr('Er redet sich alles von der Seele. Sonntag ist er da – leise, aber da.', 'He gets it all off his chest. On Sunday he is there – quiet, but there.')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).inLove.over = true), adjustForm(c, ctx.s, -0.3), busyFor(c, ctx.s, 1.8, 3), tr('Er hört zu, aber es kommt nicht an. Die nächsten Wochen ist er kaum da.', 'He listens, but it does not sink in. He is hardly around for the next few weeks.')) },
      ]) },
      { label: tr('Das wird schon', 'He will get over it'), effect: (c, ctx) => ((rec(c, ctx).inLove.over = true), adjustForm(c, ctx.s, -0.4), grumpy(c, ctx.s, 2), tr('Er spielt wie ein Schatten. Die anderen sagen, du hättest mal fragen können.', 'He plays like a ghost. The others say you could at least have asked.')) },
    ],
  },

  andere_interessen: {
    weight: 1,
    needs: (c, rng) => {
      const pick = youngPick(c, rng, (p, r) => p.age >= 16 && p.age <= 21 && !doneThisSeason(r, 'hobby', c));
      return pick ? { ...pick, what: Math.floor(rng.next() * 4) } : null;
    },
    text: (c, ctx) => {
      const n = first(c, ctx.s);
      return [
        tr(`${n} spielt jetzt in einer Band. Proben sind dienstags – genau wie das Training.`, `${n} has joined a band. Rehearsals are on Tuesdays – just like training.`),
        tr(`${n} zockt nachts online und kommt morgens kaum hoch. Beim Lauftraining hängt er hinten.`, `${n} games online all night and can barely get up. He trails at the back on runs.`),
        tr(`${n} geht lieber ins Fitnessstudio als zum Lauftraining. „Pumpen ist auch Sport."`, `${n} would rather go to the gym than to running sessions. "Lifting is sport too."`),
        tr(`${n} ist jedes Wochenende auf Partys. Sonntags um elf ist er nicht ganz da.`, `${n} is out partying every weekend. At eleven on Sunday morning he is not all there.`),
      ][ctx.what % 4];
    },
    options: [
      { label: tr('Gespräch: beides geht, aber Absprachen', 'Talk: both can work, with clear rules'), effect: outcome([
        { w: 2, run: (c, ctx) => (once(c, ctx, 'hobby'), busyFor(c, ctx.s, 1.2, 8), tr('Ihr findet eine Lösung. Er kommt etwas seltener, aber ausgeschlafen.', 'You find a way. He comes a bit less often, but well rested.')) },
        { w: 1, run: (c, ctx) => (once(c, ctx, 'hobby'), busyFor(c, ctx.s, 1.7, 8), tr('Er verspricht viel. Halten tut er wenig.', 'He promises a lot. He keeps little of it.')) },
      ]) },
      { label: tr('Klare Ansage: Fußball oder das', 'Straight talk: football or that'), effect: outcome([
        { w: 2, run: (c, ctx) => (once(c, ctx, 'hobby'), adjustForm(c, ctx.s, 0.2), tr('Er entscheidet sich für den Fußball – und zieht im Training an.', 'He chooses football – and steps it up in training.')) },
        { w: 1, run: (c, ctx) => (once(c, ctx, 'hobby'), grumpy(c, ctx.s, 3), adjustMood(c, -0.02), tr('Er bleibt, aber er fühlt sich erpresst. In der Kabine wird getuschelt.', 'He stays, but he feels blackmailed. There is whispering in the dressing room.')) },
        { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => { const n = first(c, ctx.s); once(c, ctx, 'hobby'); return leaveTeam(c, ctx.s) ? tr(`${n} entscheidet sich – gegen den Fußball. Er meldet sich ab.`, `${n} makes his choice – against football. He quits.`) : tr('Er bleibt. Knapp.', 'He stays. Just about.'); } },
      ]) },
      { label: tr('Laufen lassen', 'Let it be'), effect: (c, ctx) => (once(c, ctx, 'hobby'), busyFor(c, ctx.s, 1.5, 8), tr('Er kommt, wenn es passt. Das passt nicht oft.', 'He comes when it suits him. It does not suit him often.')) },
    ],
  },

  fuehrerschein: {
    weight: 0.8,
    needs: (c, rng) => youngPick(c, rng, (p, r) => p.age >= 17 && p.age <= 19 && !r.license),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat den Führerschein bestanden und bietet an, zum Auswärtsspiel zu fahren. Mit dem Auto seiner Mutter.`, `${first(c, ctx.s)} has passed his driving test and offers to drive to the away game. In his mum's car.`),
    options: [
      { label: tr('Gern – drei Leute fahren bei ihm mit', 'Sure – three of the lads ride with him'), effect: outcome([
        { w: 4, run: (c, ctx) => ((rec(c, ctx).license = true), adjustMood(c, 0.03), busyFor(c, ctx.s, Math.min(rec(c, ctx).absenceMul ?? 1, 0.9), 99), tr('Laute Musik, pünktlich da. Er ist jetzt Teil der Fahrgemeinschaft.', 'Loud music, on time. He is part of the car pool now.')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).license = true), book(c, tr('Delle im Auto – Zuschuss aus der Kasse', 'Dent in the car – contribution from the kitty'), -50), tr('Beim Einparken am Sportplatz: eine Delle. Die Mannschaft legt zusammen, die Kasse gibt 50 € dazu.', 'Parking at the ground: a dent. The team chips in, the kitty adds €50.')) },
      ]) },
      { label: tr('Lieber mit den Erfahrenen', 'Better with the experienced drivers'), effect: (c, ctx) => ((rec(c, ctx).license = true), grumpy(c, ctx.s, 1), tr('Er ist ein bisschen beleidigt. „Ich kann fahren!"', 'He is a bit offended. "I can drive!"')) },
    ],
  },

  // Kinder (12–15): Pubertät, erste Schwärmerei, andere Hobbys – der Spaß am Fußball (joy) steht auf dem Spiel.
  kind_interessen: {
    weight: 1,
    needs: (c, rng) => {
      const list = (c.youth?.kids ?? []).filter((k) => k.age >= 12 && k.age <= 15 && k.hobbySeason !== c.season);
      if (!list.length) return null;
      const k = list[Math.floor(rng.next() * list.length)];
      return { k: k.id, what: Math.floor(rng.next() * 3) };
    },
    text: (c, ctx) => {
      const n = kidName(c, ctx);
      return [
        tr(`${n} kommt seit Wochen unregelmäßig. Die Eltern sagen: Handball im Nachbarort, da spielen die Freunde.`, `${n} has been turning up irregularly for weeks. The parents say: handball in the next village, that is where the friends play.`),
        tr(`${n} ist verknallt und will nur noch dort hin, wo der Schwarm ist – und der ist nicht beim Fußball.`, `${n} has a crush and only wants to be wherever the crush is – and that is not football.`),
        tr(`${n} findet Fußball plötzlich „peinlich". Lieber mit den anderen am Handy hängen.`, `${n} suddenly finds football "embarrassing". Would rather hang out on the phone with the others.`),
      ][ctx.what % 3];
    },
    options: [
      { label: tr('Mit dem Kind reden – was macht Spaß?', 'Talk to the kid – what is fun?'), effect: outcome([
        { w: 2, run: (c, ctx) => (kidMark(c, ctx), kidJoy(c, ctx, 0.1), tr('Ein ehrliches Gespräch, dann darf das Kind beim Training mal Kapitän sein. Es bleibt.', 'An honest chat, then the kid gets to be captain at training for once. They stay.')) },
        { w: 1, run: (c, ctx) => (kidMark(c, ctx), kidJoy(c, ctx, -0.05), tr('Höflich zugehört, aber das Herz ist woanders.', 'Listened politely, but the heart is elsewhere.')) },
      ]) },
      { label: tr('Beides erlauben – Fußball nur noch einmal die Woche', 'Allow both – football once a week'), effect: (c, ctx) => (kidMark(c, ctx), kidJoy(c, ctx, 0.05), tr('Kompromiss. Weniger Training, aber mit Freude.', 'A compromise. Less training, but happy.')) },
      { label: tr('Gehen lassen', 'Let them go'), effect: outcome([
        { w: 1, run: (c, ctx) => { const n = kidName(c, ctx); c.youth.kids = c.youth.kids.filter((k) => k.id !== ctx.k); return tr(`${n} hört auf. Der Jugendtrainer seufzt.`, `${n} stops coming. The youth coach sighs.`); } },
        { w: 1, run: (c, ctx) => (kidMark(c, ctx), kidJoy(c, ctx, 0.1), tr('Nach drei Wochen ist das Kind wieder da: „Handball ist doof."', 'Three weeks later the kid is back: "Handball is rubbish."')) },
      ]) },
    ],
  },

  // Internat im Leistungszentrum: Kinder, die aus der eigenen Jugend ins NLZ gewechselt sind (academy.js nlzTrial).
  internat_heimweh: {
    weight: 2,
    needs: (c, rng) => {
      const rounds = Math.max(1, c.fixtures?.length ?? 14);
      const list = (c.youth?.nlz ?? []).filter((e) => e.kid && !e.settled && !e.back && c.season - e.season <= 3);
      for (const e of list) if (rng.chance(NLZ_RETURN_SEASON / rounds / 0.65)) return { name: e.name, club: e.club };
      return null;
    },
    text: (c, ctx) => tr(`Die Eltern von ${ctx.name.split(' ')[0]} rufen an: Im Internat beim ${ctx.club} läuft es nicht. Heimweh, kaum Einsatzzeit, nachts Anrufe. Das Kind will zurück zu euch.`, `${ctx.name.split(' ')[0]}'s parents call: things are not going well at the ${ctx.club} boarding academy. Homesick, hardly any game time, phone calls at night. The kid wants to come back to you.`),
    options: [
      { label: tr('Zurückholen – hier ist Platz', 'Bring them back – there is room here'), effect: (c, ctx, rng) => welcomeBack(c, ctx, rng) },
      { label: tr('Mut machen: noch ein halbes Jahr durchziehen', 'Encourage them: stick it out another six months'), effect: outcome([
        { w: 2, run: (c, ctx) => (settle(c, ctx), adjustMood(c, 0.03), chronicle(c, tr(`${ctx.name} beißt sich im Internat des ${ctx.club} durch.`, `${ctx.name} sticks it out at the ${ctx.club} academy.`)), tr('Es wird besser. Ein halbes Jahr später steht das Kind in der Startelf – und schickt euch ein Foto im Trikot.', 'It gets better. Six months later the kid is in the starting eleven – and sends you a photo in the shirt.')) },
        { w: 1, run: (c, ctx, rng) => welcomeBack(c, ctx, rng, tr('Es hilft nichts. Nach Weihnachten kommt das Kind trotzdem heim. ', 'It does not help. After Christmas the kid comes home anyway. ')) },
      ]) },
      { label: tr('Das müssen die Eltern entscheiden', 'That is for the parents to decide'), effect: outcome([
        { w: 1, run: (c, ctx) => (settle(c, ctx), tr('Die Eltern lassen es weiterlaufen. Von euch hört das Kind nichts mehr.', 'The parents let it run on. The kid hears nothing more from you.')) },
        { w: 1, run: (c, ctx, rng) => welcomeBack(c, ctx, rng, tr('Die Eltern holen das Kind heim. ', 'The parents bring the kid home. ')) },
      ]) },
    ],
  },

  // Ab der Verbandsliga holt der Verein auch junge Leute von weiter weg – die brauchen eine Bleibe.
  gastfamilie: {
    weight: 1.5,
    needs: (c, rng) => ((c.level ?? 1) < HOST_LEVEL ? null : youngPick(c, rng, (p, r) => p.age <= 19 && r.since === c.season && !r.fromYouth && r.host == null)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) kommt von weit her und pendelt jeden Tag über eine Stunde. Seine Eltern fragen, ob der Verein eine Gastfamilie kennt.`, `${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) comes from far away and commutes over an hour every day. His parents ask whether the club knows a host family.`),
    options: [
      { label: tr('Gastfamilie im Verein suchen (Kraft)', 'Find a host family in the club (energy)'), effect: (c, ctx) => ((rec(c, ctx).host = { season: c.season, round: c.round ?? 0, how: 'familie' }), adjustEnergy(c, -5), busyFor(c, ctx.s, 0.8, 99), adjustMood(c, 0.03), tr('Der Kassenwart hat ein Zimmer frei. Sonntags gibt es Braten, und er gehört schnell dazu.', 'The treasurer has a spare room. Sunday roast included, and he soon fits right in.')) },
      { label: tr('Fahrdienst organisieren (60 €)', 'Organise lifts (€60)'), effect: (c, ctx) => ((rec(c, ctx).host = { season: c.season, round: c.round ?? 0, how: 'fahrt' }), book(c, tr(`Fahrdienst ${first(c, ctx.s)}`, `Lifts for ${first(c, ctx.s)}`), -60), busyFor(c, ctx.s, 1, 99), tr('Zwei Rentner aus dem Verein fahren abwechselnd. Er ist dankbar, aber abends lange unterwegs.', 'Two pensioners from the club take turns driving. He is grateful, but he gets home late.')) },
      { label: tr('Das muss er selbst lösen', 'He has to sort that out himself'), effect: (c, ctx) => ((rec(c, ctx).host = { season: c.season, round: c.round ?? 0, how: 'pendeln' }), busyFor(c, ctx.s, 1.6, 99), grumpy(c, ctx.s, 1), tr('Er pendelt weiter. Müde, oft zu spät – und er fragt sich, warum er hergekommen ist.', 'He keeps commuting. Tired, often late – and wondering why he came.')) },
    ],
  },

  heimweh: {
    weight: 1.5,
    needs: (c, rng) => youngPick(c, rng, (p, r) => r.host && !r.host.done && (c.round ?? 0) - r.host.round >= 4 && rng.chance(r.host.how === 'familie' ? 0.2 : 0.5)),
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat Heimweh. Freunde und Familie sind zu Hause. Er überlegt, zurückzugehen.`, `${first(c, ctx.s)} is homesick. His friends and family are back home. He is thinking about going back.`),
    options: [
      { label: tr('Jedes zweite Wochenende heim – auch wenn er mal fehlt', 'Home every other weekend – even if he misses a game'), effect: (c, ctx) => ((rec(c, ctx).host.done = true), busyFor(c, ctx.s, 1.4, 12), adjustForm(c, ctx.s, 0.2), tr('Er fährt freitags heim und kommt montags gut gelaunt zurück. Ab und zu fehlt er sonntags.', 'He goes home on Fridays and comes back on Mondays in good spirits. Now and then he misses a Sunday.')) },
      { label: tr('Die Mannschaft soll sich kümmern', 'Ask the team to look after him'), effect: outcome([
        { w: 2, run: (c, ctx) => ((rec(c, ctx).host.done = true), adjustMood(c, 0.04), tr('Grillabend, Kinoabend, Fahrgemeinschaft. Nach drei Wochen sagt er: „Ihr seid jetzt meine Jungs."', 'Barbecue, cinema night, car pool. After three weeks he says: "You are my lads now."')) },
        { w: 1, run: (c, ctx) => ((rec(c, ctx).host.done = true), grumpy(c, ctx.s, 3), tr('Die anderen geben sich Mühe, aber es reicht nicht. Er zählt die Tage bis zur Winterpause.', 'The others try, but it is not enough. He counts the days to the winter break.')) },
      ]) },
      { label: tr('Ziehen lassen, wenn er will', 'Let him go if he wants'), effect: outcome([
        { w: 1, run: (c, ctx) => ((rec(c, ctx).host.done = true), adjustForm(c, ctx.s, 0.1), tr('Dass du ihn nicht festhältst, beruhigt ihn. Er bleibt – vorerst.', 'Knowing you will not hold him back calms him down. He stays – for now.')) },
        { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => { const n = first(c, ctx.s); return leaveTeam(c, ctx.s) ? tr(`${n} geht zurück nach Hause. Zum Abschied gibt es ein signiertes Trikot.`, `${n} goes back home. He gets a signed shirt as a farewell.`) : tr('Er bleibt.', 'He stays.'); } },
      ]) },
    ],
  },
};

const kidOf = (c, ctx) => (c.youth?.kids ?? []).find((k) => k.id === ctx.k);
const kidName = (c, ctx) => kidOf(c, ctx)?.name.split(' ')[0] ?? tr('Das Kind', 'The kid');
const kidMark = (c, ctx) => {
  const k = kidOf(c, ctx);
  if (k) k.hobbySeason = c.season;
};
const kidJoy = (c, ctx, d) => {
  const k = kidOf(c, ctx);
  if (k) k.joy = Math.max(0, Math.min(1, (k.joy ?? 0.5) + d));
};

// Kind kommt aus dem Internat zurück: bis 15 wieder in die Jugend, ab 16 in die A-Jugend.
function welcomeBack(c, ctx, rng, pre = '') {
  const e = (c.youth?.nlz ?? []).find((x) => x.name === ctx.name && x.club === ctx.club);
  if (!e?.kid) return pre;
  e.back = c.season;
  const age = e.age + (c.season - e.season);
  const kid = { ...e.kid, age, joy: Math.max(0.2, (e.kid.joy ?? 0.5) - 0.15), banUntil: null };
  const nm = ctx.name.split(' ')[0];
  if (age <= 15) c.youth.kids.push(kid);
  else graduate(c, kid, rng);
  adjustMood(c, 0.02);
  chronicle(c, tr(`${ctx.name} kommt aus dem Internat des ${ctx.club} zurück in die eigene Jugend.`, `${ctx.name} returns from the ${ctx.club} academy to the club's own youth section.`));
  return pre + tr(`${nm} ist zurück. Beim ersten Training stehen alle alten Freunde am Zaun.`, `${nm} is back. At the first training session all the old friends are at the fence.`);
}
function settle(c, ctx) {
  const e = (c.youth?.nlz ?? []).find((x) => x.name === ctx.name && x.club === ctx.club);
  if (e) e.settled = c.season;
}
