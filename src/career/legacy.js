// Karriereende und Nachfolge: Irgendwann knirschen die Knie – dann bist du nur
// noch Trainer. Und irgendwann (mit 60, 70 oder 80) übernimmt jemand anderes:
// dein Kind, der Co-Trainer, der alte Kapitän oder jemand ganz Neues. Der
// Spielstand endet nie, der Verein schreibt einfach eine neue Ära.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { FIRST_NAMES } from '../data/names.js';
import { hasTrait } from '../data/traits.js';
import { addCustomPlayer, humanClub, maxSquad, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { adjustEnergy, adjustPatience, childAge, createCoachPlayer, familyText, partnerOf, RELATIONS, STYLES } from './personal.js';
import { roleName } from './youth.js';
import { chronicle } from './sagas.js';

const GIRL_NAMES = ['Lena', 'Mia', 'Emma', 'Hannah', 'Lea', 'Sophie', 'Marie', 'Elif', 'Zoe', 'Paula', 'Clara', 'Nele'];
const PARTNER = tr({ single: 'Deine Mutter', beziehung: 'Deine Partnerin', verheiratet: 'Deine Frau' }, { single: 'Your mum', beziehung: 'Your partner', verheiratet: 'Your wife' });
const PLAYER_END = 50; // spätestens dann entscheidet der Körper
const COACH_END = 80; // spätestens dann entscheidet die Familie

export function legacy(c) {
  c.legacy ??= { eras: [], decided: 0, choosing: false, notes: [], honorary: [] };
  return c.legacy;
}

export const coachAge = (c) => (c.coach?.idx != null ? playerOf(c, c.coach.idx).age : null);
export const coachPlaying = (c) => c.coach?.idx != null && humanClub(c).squad.includes(c.coach.idx);
const coachFirst = (c) => (c.coach?.idx != null ? playerOf(c, c.coach.idx).name.split(' ')[0] : 'Trainer');

// Du hängst die Schuhe an den Nagel: raus aus dem Kader, Trainer bleibst du.
export function hangUpBoots(c) {
  const k = c.coach;
  const club = humanClub(c);
  if (!coachPlaying(c)) return false;
  club.squad = club.squad.filter((x) => x !== k.idx);
  if (c.week) {
    delete c.week.availability[k.idx];
    if (c.week.lineup) c.week.lineup = c.week.lineup.map((x) => (x === k.idx ? null : x));
  }
  const rec = c.players[k.idx];
  k.playerCareer = { apps: (rec?.total?.apps ?? 0) + (rec?.apps ?? 0), goals: (rec?.total?.goals ?? 0) + (rec?.goals ?? 0), age: coachAge(c) };
  k.farewellTour = false;
  chronicle(c, tr(`${playerOf(c, k.idx).name} beendet mit ${k.playerCareer.age} die Spielerlaufbahn (${k.playerCareer.apps} Spiele, ${k.playerCareer.goals} Tore) und bleibt Trainer.`, `${playerOf(c, k.idx).name} ends his playing career at ${k.playerCareer.age} (${k.playerCareer.apps} games, ${k.playerCareer.goals} goals) and stays on as manager.`));
  return true;
}

// Die Entscheidungen am Saisonende. Jede Antwort würfelt aus mehreren Folgen.
const retireOutcomes = (extra = []) =>
  outcome([
    { w: 3, run: (c) => (hangUpBoots(c), adjustMood(c, 0.06), tr('Letztes Heimspiel, letzte Ecke, letzter Applaus. Die Jungs tragen dich vom Platz. Ab jetzt: nur noch Trainer.', 'Last home game, last corner, last applause. The lads carry you off the pitch. From now on: manager only.')) },
    { w: 2, run: (c) => (hangUpBoots(c), adjustPatience(c, 15), tr('Zu Hause wird gefeiert: endlich keine Eisbeutel mehr im Tiefkühlfach. Die Familie ist erleichtert.', 'Celebrations at home: finally no more ice packs in the freezer. The family is relieved.')) },
    { w: 2, run: (c) => (hangUpBoots(c), book(c, tr('Abschiedsspiel (Spenden)', 'Farewell match (donations)'), 60), adjustMood(c, 0.04), tr('Abschiedsspiel gegen die Alten Herren. 60 € in der Spendendose, du triffst per Elfmeter – der Keeper hat sich extra fallen lassen.', 'Farewell match against the old boys. €60 in the collection tin, you score a penalty – the keeper dived the wrong way on purpose.')) },
    { w: 1.5, run: (c) => (hangUpBoots(c), chronicle(c, tr('Die Fußballschuhe des Trainers hängen jetzt über der Theke im Vereinsheim.', 'The manager\'s boots now hang above the bar in the clubhouse.')), tr('Deine Schuhe hängen jetzt im Vereinsheim über der Theke. Der Wirt hat sie mit Heißkleber befestigt.', 'Your boots now hang above the clubhouse bar. The landlord stuck them up with a glue gun.')) },
    { w: 1, run: (c) => (hangUpBoots(c), (c.coach.flags.comebackItch = true), tr('Zwei Wochen lang fühlt es sich richtig an. Dann siehst du die Jungs beim Training und es juckt in den Füßen …', 'For two weeks it feels right. Then you watch the lads train and your feet start itching …')) },
    { w: 1, run: (c) => (hangUpBoots(c), adjustEnergy(c, 12), tr('Ohne eigene Trainingseinheiten hast du plötzlich Zeit für Taktik. Und für Mittagsschlaf.', 'Without training yourself you suddenly have time for tactics. And for naps.')) },
    ...extra,
  ]);

const PROMPTS = {
  schuhe: {
    title: tr('Schuhe an den Nagel?', 'Hang up your boots?'),
    text: (c) => tr(`Du bist ${coachAge(c)}. Die Knie knirschen beim Aufstehen, der Sprint zum Ball dauert gefühlt länger als früher der Weg zum Auswärtsspiel. Spielst du nächste Saison noch selbst?`, `You are ${coachAge(c)}. Your knees creak when you get up, and sprinting to the ball feels longer than the drive to away games used to. Are you still playing next season?`),
    options: [
      {
        label: tr('Weiterspielen – eine geht noch', 'Keep playing – one more season'),
        effect: outcome([
          { w: 3, run: () => tr('Die Knie halten. Vorerst. Du kaufst dir trotzdem eine Bandage.', 'The knees hold. For now. You buy a knee brace anyway.') },
          { w: 2, run: (c) => (adjustPatience(c, -8), tr(`${c.coach.partner ?? 'Deine Familie'} verdreht die Augen: „Noch eine Saison mit Eisbeuteln im Gefrierfach."`, `${partnerOf(c) ?? 'Your family'} rolls their eyes: "Another season of ice packs in the freezer."`)) },
          { w: 1.5, run: (c) => ((c.players[c.coach.idx].injuryWeeks = 3), (c.players[c.coach.idx].injury = { label: tr('Zerrung', 'strain') }), tr('Gleich im ersten Vorbereitungsspiel zwickt es in der Wade. Drei Wochen Pause – zum Auftakt schaust du zu.', 'Straight away in the first pre-season game your calf twinges. Three weeks out – you watch the opening games.')) },
          { w: 1, run: (c) => ((c.players[c.coach.idx].delta ??= {}), (c.players[c.coach.idx].delta.stamina = (c.players[c.coach.idx].delta.stamina ?? 0) + 0.04), tr('Im Sommer sechs Kilo abgenommen. Die Jungs erkennen dich kaum wieder.', 'Lost six kilos over the summer. The lads barely recognise you.')) },
          { w: 1.5, run: (c) => (adjustMood(c, 0.05), tr('Die Jungs feiern es: „Ohne dich geht es nicht, Trainer."', 'The lads love it: "We can\'t do it without you, gaffer."')) },
          { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Einer aus der A-Jugend murmelt: „Der nimmt mir den Platz weg." Laut genug, dass du es hörst.', 'One of the U19 lads mutters: "He\'s taking my place." Loud enough for you to hear.')) },
        ]),
      },
      {
        label: tr('Eine letzte Saison – als Abschiedstour', 'One last season – as a farewell tour'),
        effect: outcome([
          { w: 3, run: (c) => ((c.coach.farewellTour = true), adjustMood(c, 0.08), tr('Abschiedstour angekündigt! Die Jungs wollen dir jedes Spiel zu einem Fest machen.', 'Farewell tour announced! The lads want to make every game a party for you.')) },
          { w: 2, run: (c) => ((c.coach.farewellTour = true), (c.flags.pressWeeks = 2), tr('Das Kreisblatt bringt es groß: „Das letzte Jahr einer Legende". Mehr Zuschauer zum Saisonstart.', 'The District Gazette runs it big: "A legend\'s final year". More spectators at the start of the season.')) },
          { w: 1, run: (c) => ((c.coach.farewellTour = true), adjustPatience(c, 10), tr('Die Familie zählt schon die Spiele rückwärts. Mit einem Kalender am Kühlschrank.', 'The family is already counting down the games. With a calendar on the fridge.')) },
        ]),
      },
      { label: tr('Schuhe an den Nagel – ab jetzt nur Trainer', 'Hang up the boots – manager only from now on'), effect: retireOutcomes() },
    ],
  },
  koerper: {
    title: tr('Der Körper entscheidet', 'Your body decides'),
    text: (c) => tr(`${coachAge(c)} Jahre. Der Orthopäde schaut sich das Röntgenbild an und schweigt lange. Dann sagt er: „Trainer sein ist auch schön."`, `${coachAge(c)} years old. The orthopaedist looks at the X-ray and says nothing for a long time. Then: "Being a manager is nice too."`),
    options: [
      { label: tr('Ein allerletztes Abschiedsspiel', 'One very last farewell match'), effect: retireOutcomes([{ w: 2, run: (c) => (hangUpBoots(c), adjustMood(c, 0.1), tr('Abschiedsspiel mit allen Ehemaligen. Nach zehn Minuten bist du platt, nach zwanzig gewechselt und nach neunzig heiser vom Singen.', 'Farewell match with all the old players. After ten minutes you are shattered, after twenty subbed off, and after ninety hoarse from singing.')) }]) },
      { label: tr('Einsehen und aufhören', 'Accept it and stop'), effect: retireOutcomes() },
    ],
  },
  abschied: {
    title: tr('Ende der Abschiedstour', 'End of the farewell tour'),
    text: (c) => tr(`Die Abschiedstour ist vorbei. ${coachFirst(c)}, es wird Zeit.`, `The farewell tour is over. ${coachFirst(c)}, it is time.`),
    options: [{ label: tr('Abschied feiern', 'Celebrate the farewell'), effect: retireOutcomes([{ w: 2, run: (c) => (hangUpBoots(c), adjustMood(c, 0.12), book(c, tr('Abschiedsfeier (Spenden abzüglich Fass)', 'Farewell party (donations minus the keg)'), 20), tr('Die Abschiedsfeier geht bis zum Morgen. Irgendwer hat ein Banner gemalt. Es ist krumm, aber du heulst trotzdem.', 'The farewell party goes on until morning. Someone painted a banner. It is wonky, but you cry anyway.')) }]) }],
  },
  amt: {
    title: tr('Noch ein Jahr an der Seitenlinie?', 'Another year on the touchline?'),
    text: (c) => tr(`Du bist ${coachAge(c)}. Die Jungs könnten deine Enkel sein, manche sind es fast. Machst du weiter, oder suchst du einen Nachfolger?`, `You are ${coachAge(c)}. The lads could be your grandchildren – some almost are. Do you carry on, or look for a successor?`),
    options: [
      {
        label: tr('Weitermachen, solange die Stimme reicht', 'Carry on as long as your voice holds'),
        effect: outcome([
          { w: 3, run: () => tr('Die Pfeife hängt um den Hals, die Stimme trägt bis zum Parkplatz. Weiter geht es.', 'The whistle round your neck, your voice carries to the car park. On we go.') },
          { w: 2, run: (c) => (adjustPatience(c, -10), tr(`${c.coach.partner ?? 'Die Familie'}: „Wir wollten doch mal im Sommer verreisen. Nicht zum Trainingslager."`, `${partnerOf(c) ?? 'The family'}: "We wanted to go on holiday one summer. Not to a training camp."`)) },
          { w: 1.5, run: (c) => (adjustEnergy(c, 15), tr('Die jungen Spieler halten dich jung. Du lernst sogar, was ein „Sixpack-Selfie" ist.', 'The young players keep you young. You even learn what a "six-pack selfie" is.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.05), tr('Zwei aus der Mannschaft finden deine Methoden „etwas 1985". Du findest ihre Frisuren schlimmer.', 'Two of the team find your methods "a bit 1985". You find their haircuts worse.')) },
          { w: 1, run: (c) => ((c.coach.flags.healthScare = true), tr('Beim Warmmachen wird dir schwindelig. Der Arzt sagt: nichts Ernstes. Aber du sollst es ruhiger angehen.', 'You feel dizzy during the warm-up. The doctor says: nothing serious. But you should take it easier.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.06), chronicle(c, tr(`Der Trainer macht mit ${coachAge(c)} weiter. Das Kreisblatt nennt ihn „das Urgestein".`, `The manager carries on at ${coachAge(c)}. The District Gazette calls him "the old stalwart".`)), tr('Das Kreisblatt nennt dich „das Urgestein". Du schneidest den Artikel aus.', 'The District Gazette calls you "the old stalwart". You cut the article out.')) },
        ]),
      },
      {
        label: tr('Einen Nachfolger suchen', 'Look for a successor'),
        succession: true,
        effect: outcome([
          { w: 3, run: () => tr('Die Nachricht verbreitet sich schneller als jedes Transfergerücht. Wer wird es?', 'The news spreads faster than any transfer rumour. Who will it be?') },
          { w: 1, run: (c) => (adjustMood(c, -0.04), tr('Am Tresen wird geweint. Nicht nur vom Wirt.', 'There are tears at the bar. Not just the landlord\'s.')) },
          { w: 1, run: (c) => (adjustPatience(c, 20), tr('Zu Hause wird schon der Wohnwagen-Katalog aufgeschlagen.', 'At home the caravan catalogue is already open.')) },
        ]),
      },
    ],
  },
  gesundheit: {
    title: tr('Der Arzt hat gesprochen', 'The doctor has spoken'),
    text: (c) => tr(`Nach dem Schwindelanfall die Nachuntersuchung. ${coachAge(c)} Jahre, Blutdruck wie ein Derby in der Nachspielzeit. „Weniger Aufregung", sagt der Arzt. Er war noch nie beim Derby.`, `The check-up after the dizzy spell. ${coachAge(c)} years old, blood pressure like a derby in stoppage time. "Less excitement," says the doctor. He has never been to a derby.`),
    options: [
      {
        label: tr('Trotzdem weitermachen', 'Carry on anyway'),
        effect: outcome([
          { w: 3, run: (c) => ((c.coach.flags.healthScare = false), tr('Du versprichst, dich beim Schiri nicht mehr aufzuregen. Das hält bis zum ersten Spieltag.', 'You promise not to get worked up at the referee any more. That lasts until the first matchday.')) },
          { w: 1.5, run: (c) => (adjustPatience(c, -20), tr('Zu Hause gibt es ein ernstes Gespräch. Sehr ernst.', 'There is a serious talk at home. Very serious.')) },
          { w: 1, run: (c) => ((c.coach.flags.forceEnd = true), tr('Deine Familie stellt ein Ultimatum: Eine Saison noch, dann ist Schluss.', 'Your family issues an ultimatum: one more season, then that\'s it.')) },
        ]),
      },
      { label: tr('Einen Nachfolger suchen', 'Look for a successor'), succession: true, effect: outcome([{ w: 1, run: () => tr('Vernünftig. Der Verein bedankt sich – und fängt an zu suchen.', 'Sensible. The club thanks you – and starts looking.') }]) },
    ],
  },
  ruhestand: {
    title: tr('Zeit für den Ruhestand', 'Time to retire'),
    text: (c) => tr(`Du bist ${coachAge(c)}. ${c.coach.flags.forceEnd ? 'Das Ultimatum ist abgelaufen.' : 'Ein halbes Leben an der Seitenlinie.'} Es wird Zeit, das Amt zu übergeben.`, `You are ${coachAge(c)}. ${c.coach.flags.forceEnd ? 'The ultimatum has run out.' : 'Half a lifetime on the touchline.'} It is time to hand over the job.`),
    options: [{ label: tr('Nachfolger bestimmen', 'Choose a successor'), succession: true, effect: outcome([{ w: 2, run: () => tr('Ein letztes Mal rufst du die Mannschaft zusammen. Dann sagst du es.', 'One last time you call the team together. Then you tell them.') }, { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Die Jungs sind still. Einer fängt an zu klatschen, dann alle.', 'The lads go quiet. One starts clapping, then all of them.')) }]) }],
  },
};

// Welche Frage steht an diesem Saisonende an?
export function legacyPromptId(c) {
  const L = legacy(c);
  const k = c.coach;
  if (!k || k.idx == null || L.decided === c.season || L.choosing) return null;
  const age = coachAge(c);
  const rng = createRng((c.seed * 53 + c.season * 7 + 3) >>> 0);
  if (coachPlaying(c)) {
    if (k.farewellTour) return 'abschied';
    if (age >= PLAYER_END) return 'koerper';
    if (age >= 45 || (age >= 40 && (rng.chance(0.5) || playerOf(c, k.idx).rating < 32))) return 'schuhe';
    return null;
  }
  if (age >= COACH_END || k.flags.forceEnd) return 'ruhestand';
  if (k.flags.healthScare) return 'gesundheit';
  if (age >= 70 || (age >= 62 && age % 2 === 0)) return 'amt';
  return null;
}

export function legacyPrompt(c) {
  const id = legacyPromptId(c);
  if (!id) return null;
  const p = PROMPTS[id];
  return { id, title: p.title, text: p.text(c), options: p.options.map((o) => o.label) };
}

export function resolveLegacy(c, choice) {
  const id = legacyPromptId(c);
  const option = id && PROMPTS[id].options[choice];
  if (!option) return null;
  const L = legacy(c);
  L.decided = c.season;
  const text = option.effect(c, {}, createRng((c.seed * 17 + c.season * 5 + choice) >>> 0));
  if (option.succession) L.choosing = true;
  L.last = { season: c.season, title: PROMPTS[id].title, text };
  return text;
}

// Freiwillig abtreten geht immer im Sommer.
export function stepDown(c) {
  const L = legacy(c);
  if (!c.coach) return false;
  L.decided = c.season;
  L.choosing = true;
  L.last = { season: c.season, title: tr('Rücktritt', 'Stepping down'), text: tr('Du hast dich entschieden: Es ist Zeit für jemand Neuen.', 'You have decided: it is time for someone new.') };
  return true;
}

// --- Nachfolge -----------------------------------------------------------------

const totalApps = (c, idx) => (c.players[idx]?.total?.apps ?? 0) + (c.players[idx]?.apps ?? 0);

export function successionCandidates(c) {
  const k = c.coach;
  const out = [];
  const club = humanClub(c);
  for (const child of k?.children ?? []) {
    const age = childAge(c, child);
    if (age < 23) continue;
    const plays = child.idx != null && club.squad.includes(child.idx);
    out.push({ type: 'kind', child: child.name, name: `${child.name} ${k.last ?? ''}`.trim(), age, desc: tr(`${child.sex === 'w' ? 'Tochter' : 'Sohn'}${plays ? ', spielt im Kader – wird Spielertrainer' : ''}. Familientradition: Die Mannschaft kennt ${child.sex === 'w' ? 'sie' : 'ihn'} seit dem Kinderwagen.`, `${child.sex === 'w' ? 'Daughter' : 'Son'}${plays ? ', plays in the squad – becomes player-manager' : ''}. Family tradition: the team has known ${child.sex === 'w' ? 'her' : 'him'} since the pram.`) });
  }
  const co = c.staff?.cotrainer;
  if (co && co.idx !== k?.idx) out.push({ type: 'cotrainer', idx: co.idx, name: co.name, age: co.idx != null ? playerOf(c, co.idx).age : null, desc: tr('Dein Co-Trainer. Kennt jede Macke der Mannschaft und jeden Schlüssel zum Geräteraum.', 'Your assistant. Knows every quirk of the team and every key to the equipment room.') });
  const vets = club.squad
    .filter((idx) => idx !== k?.idx && !c.players[idx]?.fromYouth && playerOf(c, idx).age >= 29)
    .map((idx) => ({ idx, score: totalApps(c, idx) + (hasTrait(playerOf(c, idx), 'anfuehrer') ? 25 : 0) + (hasTrait(playerOf(c, idx), 'ex_profi') ? 15 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  for (const v of vets) {
    const p = playerOf(c, v.idx);
    out.push({ type: 'kapitaen', idx: v.idx, name: p.name, age: p.age, desc: tr(`${totalApps(c, v.idx) ? `${totalApps(c, v.idx)} Spiele für den Verein` : 'Gehört seit Jahren zum Kader'}${hasTrait(p, 'anfuehrer') ? ', geborener Anführer' : ''}. Wird Spielertrainer.`, `${totalApps(c, v.idx) ? `${totalApps(c, v.idx)} games for the club` : 'Part of the squad for years'}${hasTrait(p, 'anfuehrer') ? ', a born leader' : ''}. Becomes player-manager.`) });
  }
  const alum = [...(c.alumni ?? [])].reverse().find((a) => a.idx !== co?.idx && a.idx !== k?.idx && a.idx != null && (c.custom?.[a.idx] || a.idx < 900000));
  if (alum) out.push({ type: 'ehemaliger', idx: alum.idx, name: alum.name, age: alum.age + (c.season - alum.season), desc: tr(`Vereinslegende${alum.apps ? ` (${alum.apps} Spiele, ${alum.goals} Tore)` : ''}, heute ${alum.role}.`, `Club legend${alum.apps ? ` (${alum.apps} games, ${alum.goals} goals)` : ''}, now ${roleName(alum.role)}.`) });
  out.push({ type: 'neu', name: tr('Neuen Trainer anlegen', 'Create a new manager'), desc: tr('Jemand ganz Neues übernimmt – du legst Namen, Alter, Familie und Spielertyp fest.', 'Someone completely new takes over – you choose name, age, family and player type.') });
  return out;
}

// Neue Familie für den Nachfolger – damit die Dynastie weitergehen kann.
function randomFamily(rng, age, last, season) {
  const relation = age < 26 ? rng.pick(['single', 'beziehung']) : rng.pick(['single', 'beziehung', 'verheiratet', 'verheiratet']);
  const n = relation === 'single' ? (rng.chance(0.2) ? 1 : 0) : rng.pick([0, 1, 1, 2]);
  const children = [];
  for (let i = 0; i < n; i++) {
    const sex = rng.chance(0.5) ? 'w' : 'm';
    const kidAge = rng.int(0, Math.max(0, Math.min(12, age - 22)));
    // childAge rechnet mit (Saison - 1) – das Alter auf Saison 1 zurückrechnen.
    children.push({ name: rng.pick(sex === 'w' ? GIRL_NAMES : FIRST_NAMES), age: kidAge - (season - 1), sex, idx: null });
  }
  return { relation, children, last };
}

function coachRecord(c, { idx, first, last, style, relation, children }) {
  return {
    idx,
    custom: true,
    first,
    last,
    style,
    relation,
    partner: PARTNER[relation],
    children,
    kids: children.length,
    family: familyText(relation, children.map((k) => ({ ...k, name: k.name }))),
    patience: 80,
    energy: 85,
    awayWeeks: 0,
    noTraining: 0,
    flags: {},
    since: c.season + 1,
    generation: legacy(c).eras.length + 1,
  };
}

// Die Ära endet: Chronik, Ehrenamt, und der neue Mensch an der Seitenlinie.
export function succeed(c, cand, input = null) {
  const L = legacy(c);
  const old = c.coach;
  const club = humanClub(c);
  const oldName = old?.idx != null ? playerOf(c, old.idx).name : tr('Der alte Trainer', 'The old manager');
  const since = old?.since ?? 1;
  const tenure = (c.history ?? []).filter((h) => h.season >= since);
  const titles = tenure.filter((h) => h.pos === 1).length;
  L.eras.push({ name: oldName, from: since, to: c.season, seasons: c.season - since + 1, titles, age: coachAge(c), successor: cand.type === 'neu' ? input ? `${input.first} ${input.last}`.trim() : '?' : cand.name, how: cand.type });
  L.honorary.push(oldName);
  chronicle(c, tr(`Ende einer Ära: ${oldName} tritt nach ${c.season - since + 1} Saisons${titles ? ` und ${titles} ${titles === 1 ? 'Meisterschaft' : 'Meisterschaften'}` : ''} ab und wird Ehrenpräsident.`, `End of an era: ${oldName} steps down after ${c.season - since + 1} seasons${titles ? ` and ${titles} ${titles === 1 ? 'title' : 'titles'}` : ''} and becomes honorary president.`));
  if (old?.idx != null && club.squad.includes(old.idx)) club.squad = club.squad.filter((x) => x !== old.idx);
  const rng = createRng((c.seed * 71 + c.season * 13 + L.eras.length) >>> 0);
  let rec;
  if (cand.type === 'neu') {
    const player = createCoachPlayer(input, (c.seed + c.season * 7919) >>> 0);
    const age = player.age;
    player.age = age - (c.season - 1); // playerOf schlägt pro Saison ein Jahr drauf
    const idx = addCustomPlayer(c, player);
    c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    const relation = RELATIONS[input.relation] ? input.relation : 'single';
    const children = (input.children ?? []).slice(0, 3).map((k) => ({ name: k.name || 'Kind', age: Math.max(0, Math.min(25, Math.round(k.age ?? 5))) - (c.season - 1), sex: k.sex === 'w' ? 'w' : 'm', idx: null }));
    rec = coachRecord(c, { idx, first: input.first, last: input.last, style: input.style, relation, children });
    if (age <= 45 && club.squad.length < maxSquad(c)) club.squad.push(idx);
  } else if (cand.type === 'kind') {
    const child = old.children.find((k) => k.name === cand.child);
    let idx = child.idx;
    if (idx == null) {
      const player = createCoachPlayer({ first: child.name, last: old.last ?? '', age: Math.min(55, cand.age), style: rng.pick(Object.keys(STYLES)), profession: rng.pick(['Erzieherin', 'Polizistin', 'Lehrerin', 'Physiotherapeutin', 'Ingenieurin']) }, (c.seed + child.name.length * 31) >>> 0);
      player.age = cand.age - (c.season - 1);
      idx = addCustomPlayer(c, player);
      c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
      child.idx = idx;
    }
    const fam = randomFamily(rng, cand.age, old.last ?? '', c.season);
    rec = coachRecord(c, { idx, first: child.name, last: old.last ?? '', style: playerOf(c, idx).style ?? null, relation: fam.relation, children: fam.children });
    old.children = old.children.filter((k) => k !== child);
    chronicle(c, tr(`${cand.name} tritt in die Fußstapfen und übernimmt das Traineramt – die ${L.eras.length + 1}. Generation an der Seitenlinie.`, `${cand.name} follows in the family footsteps and takes over as manager – generation no. ${L.eras.length + 1} on the touchline.`));
  } else {
    const p = playerOf(c, cand.idx);
    const [first, ...rest] = p.name.split(' ');
    const fam = randomFamily(rng, p.age, rest.join(' '), c.season);
    rec = coachRecord(c, { idx: cand.idx, first, last: rest.join(' '), style: null, relation: fam.relation, children: fam.children });
    if (cand.type === 'cotrainer' && c.staff) c.staff.cotrainer = null;
    if (!c.players[cand.idx]) c.players[cand.idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  }
  c.coach = rec;
  L.choosing = false;
  L.notes.push(tr(`Neue Ära: ${playerOf(c, rec.idx).name} (${playerOf(c, rec.idx).age}) ist der neue Trainer. ${oldName} sitzt ab jetzt als Ehrenpräsident mit Stammplatz am Tresen.`, `New era: ${playerOf(c, rec.idx).name} (${playerOf(c, rec.idx).age}) is the new manager. ${oldName} is now honorary president with a regular stool at the bar.`));
  adjustMood(c, cand.type === 'kind' ? 0.08 : cand.type === 'neu' ? -0.02 : 0.04);
  return rec;
}

// Saisonwechsel ohne Entscheidung (Autoplay, Tests): die vernünftige Wahl.
export function legacySeasonEnd(c) {
  const id = legacyPromptId(c);
  if (id) {
    const age = coachAge(c);
    const choice = id === 'schuhe' ? (age >= 46 ? 2 : 0) : id === 'amt' ? (age >= 72 ? 1 : 0) : id === 'gesundheit' ? 1 : 0;
    resolveLegacy(c, choice);
  }
  const L = legacy(c);
  if (L.choosing) {
    const cands = successionCandidates(c).filter((x) => x.type !== 'neu');
    if (cands.length) succeed(c, cands[0]);
    else succeed(c, { type: 'neu', name: '' }, { first: 'Uwe', last: 'Neumann', age: 45, relation: 'verheiratet', profession: 'Hausmeister', style: 'libero', children: [] });
  }
  const notes = L.notes;
  L.notes = [];
  return notes;
}
