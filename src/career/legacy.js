// Karriereende und Nachfolge: Irgendwann knirschen die Knie – dann bist du nur
// noch Trainer. Und irgendwann (mit 60, 70 oder 80) übernimmt jemand anderes:
// dein Kind, der Co-Trainer, der alte Kapitän oder jemand ganz Neues. Der
// Spielstand endet nie, der Verein schreibt einfach eine neue Ära.
import { createRng } from '../core/rng.js';
import { FIRST_NAMES } from '../data/names.js';
import { hasTrait } from '../data/traits.js';
import { addCustomPlayer, humanClub, maxSquad, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { adjustEnergy, adjustPatience, childAge, createCoachPlayer, familyText, RELATIONS, STYLES } from './personal.js';
import { chronicle } from './sagas.js';

const GIRL_NAMES = ['Lena', 'Mia', 'Emma', 'Hannah', 'Lea', 'Sophie', 'Marie', 'Elif', 'Zoe', 'Paula', 'Clara', 'Nele'];
const PARTNER = { single: 'Deine Mutter', beziehung: 'Deine Partnerin', verheiratet: 'Deine Frau' };
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
  chronicle(c, `${playerOf(c, k.idx).name} beendet mit ${k.playerCareer.age} die Spielerlaufbahn (${k.playerCareer.apps} Spiele, ${k.playerCareer.goals} Tore) und bleibt Trainer.`);
  return true;
}

// Die Entscheidungen am Saisonende. Jede Antwort würfelt aus mehreren Folgen.
const retireOutcomes = (extra = []) =>
  outcome([
    { w: 3, run: (c) => (hangUpBoots(c), adjustMood(c, 0.06), 'Letztes Heimspiel, letzte Ecke, letzter Applaus. Die Jungs tragen dich vom Platz. Ab jetzt: nur noch Trainer.') },
    { w: 2, run: (c) => (hangUpBoots(c), adjustPatience(c, 15), 'Zu Hause wird gefeiert: endlich keine Eisbeutel mehr im Tiefkühlfach. Die Familie ist erleichtert.') },
    { w: 2, run: (c) => (hangUpBoots(c), book(c, 'Abschiedsspiel (Spenden)', 60), adjustMood(c, 0.04), 'Abschiedsspiel gegen die Alten Herren. 60 € in der Spendendose, du triffst per Elfmeter – der Keeper hat sich extra fallen lassen.') },
    { w: 1.5, run: (c) => (hangUpBoots(c), chronicle(c, 'Die Fußballschuhe des Trainers hängen jetzt über der Theke im Vereinsheim.'), 'Deine Schuhe hängen jetzt im Vereinsheim über der Theke. Der Wirt hat sie mit Heißkleber befestigt.') },
    { w: 1, run: (c) => (hangUpBoots(c), (c.coach.flags.comebackItch = true), 'Zwei Wochen lang fühlt es sich richtig an. Dann siehst du die Jungs beim Training und es juckt in den Füßen …') },
    { w: 1, run: (c) => (hangUpBoots(c), adjustEnergy(c, 12), 'Ohne eigene Trainingseinheiten hast du plötzlich Zeit für Taktik. Und für Mittagsschlaf.') },
    ...extra,
  ]);

const PROMPTS = {
  schuhe: {
    title: 'Schuhe an den Nagel?',
    text: (c) => `Du bist ${coachAge(c)}. Die Knie knirschen beim Aufstehen, der Sprint zum Ball dauert gefühlt länger als früher der Weg zum Auswärtsspiel. Spielst du nächste Saison noch selbst?`,
    options: [
      {
        label: 'Weiterspielen – eine geht noch',
        effect: outcome([
          { w: 3, run: () => 'Die Knie halten. Vorerst. Du kaufst dir trotzdem eine Bandage.' },
          { w: 2, run: (c) => (adjustPatience(c, -8), `${c.coach.partner ?? 'Deine Familie'} verdreht die Augen: „Noch eine Saison mit Eisbeuteln im Gefrierfach."`) },
          { w: 1.5, run: (c) => ((c.players[c.coach.idx].injuryWeeks = 3), (c.players[c.coach.idx].injury = { label: 'Zerrung' }), 'Gleich im ersten Vorbereitungsspiel zwickt es in der Wade. Drei Wochen Pause – zum Auftakt schaust du zu.') },
          { w: 1, run: (c) => ((c.players[c.coach.idx].delta ??= {}), (c.players[c.coach.idx].delta.stamina = (c.players[c.coach.idx].delta.stamina ?? 0) + 0.04), 'Im Sommer sechs Kilo abgenommen. Die Jungs erkennen dich kaum wieder.') },
          { w: 1.5, run: (c) => (adjustMood(c, 0.05), 'Die Jungs feiern es: „Ohne dich geht es nicht, Trainer."') },
          { w: 1, run: (c) => (adjustMood(c, -0.04), 'Einer aus der A-Jugend murmelt: „Der nimmt mir den Platz weg." Laut genug, dass du es hörst.') },
        ]),
      },
      {
        label: 'Eine letzte Saison – als Abschiedstour',
        effect: outcome([
          { w: 3, run: (c) => ((c.coach.farewellTour = true), adjustMood(c, 0.08), 'Abschiedstour angekündigt! Die Jungs wollen dir jedes Spiel zu einem Fest machen.') },
          { w: 2, run: (c) => ((c.coach.farewellTour = true), (c.flags.pressWeeks = 2), 'Das Kreisblatt bringt es groß: „Das letzte Jahr einer Legende". Mehr Zuschauer zum Saisonstart.') },
          { w: 1, run: (c) => ((c.coach.farewellTour = true), adjustPatience(c, 10), 'Die Familie zählt schon die Spiele rückwärts. Mit einem Kalender am Kühlschrank.') },
        ]),
      },
      { label: 'Schuhe an den Nagel – ab jetzt nur Trainer', effect: retireOutcomes() },
    ],
  },
  koerper: {
    title: 'Der Körper entscheidet',
    text: (c) => `${coachAge(c)} Jahre. Der Orthopäde schaut sich das Röntgenbild an und schweigt lange. Dann sagt er: „Trainer sein ist auch schön."`,
    options: [
      { label: 'Ein allerletztes Abschiedsspiel', effect: retireOutcomes([{ w: 2, run: (c) => (hangUpBoots(c), adjustMood(c, 0.1), 'Abschiedsspiel mit allen Ehemaligen. Nach zehn Minuten bist du platt, nach zwanzig gewechselt und nach neunzig heiser vom Singen.') }]) },
      { label: 'Einsehen und aufhören', effect: retireOutcomes() },
    ],
  },
  abschied: {
    title: 'Ende der Abschiedstour',
    text: (c) => `Die Abschiedstour ist vorbei. ${coachFirst(c)}, es wird Zeit.`,
    options: [{ label: 'Abschied feiern', effect: retireOutcomes([{ w: 2, run: (c) => (hangUpBoots(c), adjustMood(c, 0.12), book(c, 'Abschiedsfeier (Spenden abzüglich Fass)', 20), 'Die Abschiedsfeier geht bis zum Morgen. Irgendwer hat ein Banner gemalt. Es ist krumm, aber du heulst trotzdem.') }]) }],
  },
  amt: {
    title: 'Noch ein Jahr an der Seitenlinie?',
    text: (c) => `Du bist ${coachAge(c)}. Die Jungs könnten deine Enkel sein, manche sind es fast. Machst du weiter, oder suchst du einen Nachfolger?`,
    options: [
      {
        label: 'Weitermachen, solange die Stimme reicht',
        effect: outcome([
          { w: 3, run: () => 'Die Pfeife hängt um den Hals, die Stimme trägt bis zum Parkplatz. Weiter geht es.' },
          { w: 2, run: (c) => (adjustPatience(c, -10), `${c.coach.partner ?? 'Die Familie'}: „Wir wollten doch mal im Sommer verreisen. Nicht zum Trainingslager."`) },
          { w: 1.5, run: (c) => (adjustEnergy(c, 15), 'Die jungen Spieler halten dich jung. Du lernst sogar, was ein „Sixpack-Selfie" ist.') },
          { w: 1.5, run: (c) => (adjustMood(c, -0.05), 'Zwei aus der Mannschaft finden deine Methoden „etwas 1985". Du findest ihre Frisuren schlimmer.') },
          { w: 1, run: (c) => ((c.coach.flags.healthScare = true), 'Beim Warmmachen wird dir schwindelig. Der Arzt sagt: nichts Ernstes. Aber du sollst es ruhiger angehen.') },
          { w: 1, run: (c) => (adjustMood(c, 0.06), chronicle(c, `Der Trainer macht mit ${coachAge(c)} weiter. Das Kreisblatt nennt ihn „das Urgestein".`), 'Das Kreisblatt nennt dich „das Urgestein". Du schneidest den Artikel aus.') },
        ]),
      },
      {
        label: 'Einen Nachfolger suchen',
        succession: true,
        effect: outcome([
          { w: 3, run: () => 'Die Nachricht verbreitet sich schneller als jedes Transfergerücht. Wer wird es?' },
          { w: 1, run: (c) => (adjustMood(c, -0.04), 'Am Tresen wird geweint. Nicht nur vom Wirt.') },
          { w: 1, run: (c) => (adjustPatience(c, 20), 'Zu Hause wird schon der Wohnwagen-Katalog aufgeschlagen.') },
        ]),
      },
    ],
  },
  gesundheit: {
    title: 'Der Arzt hat gesprochen',
    text: (c) => `Nach dem Schwindelanfall die Nachuntersuchung. ${coachAge(c)} Jahre, Blutdruck wie ein Derby in der Nachspielzeit. „Weniger Aufregung", sagt der Arzt. Er war noch nie beim Derby.`,
    options: [
      {
        label: 'Trotzdem weitermachen',
        effect: outcome([
          { w: 3, run: (c) => ((c.coach.flags.healthScare = false), 'Du versprichst, dich beim Schiri nicht mehr aufzuregen. Das hält bis zum ersten Spieltag.') },
          { w: 1.5, run: (c) => (adjustPatience(c, -20), 'Zu Hause gibt es ein ernstes Gespräch. Sehr ernst.') },
          { w: 1, run: (c) => ((c.coach.flags.forceEnd = true), 'Deine Familie stellt ein Ultimatum: Eine Saison noch, dann ist Schluss.') },
        ]),
      },
      { label: 'Einen Nachfolger suchen', succession: true, effect: outcome([{ w: 1, run: () => 'Vernünftig. Der Verein bedankt sich – und fängt an zu suchen.' }]) },
    ],
  },
  ruhestand: {
    title: 'Zeit für den Ruhestand',
    text: (c) => `Du bist ${coachAge(c)}. ${c.coach.flags.forceEnd ? 'Das Ultimatum ist abgelaufen.' : 'Ein halbes Leben an der Seitenlinie.'} Es wird Zeit, das Amt zu übergeben.`,
    options: [{ label: 'Nachfolger bestimmen', succession: true, effect: outcome([{ w: 2, run: () => 'Ein letztes Mal rufst du die Mannschaft zusammen. Dann sagst du es.' }, { w: 1, run: (c) => (adjustMood(c, -0.03), 'Die Jungs sind still. Einer fängt an zu klatschen, dann alle.') }]) }],
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
  L.last = { season: c.season, title: 'Rücktritt', text: 'Du hast dich entschieden: Es ist Zeit für jemand Neuen.' };
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
    out.push({ type: 'kind', child: child.name, name: `${child.name} ${k.last ?? ''}`.trim(), age, desc: `${child.sex === 'w' ? 'Tochter' : 'Sohn'}${plays ? ', spielt im Kader – wird Spielertrainer' : ''}. Familientradition: Die Mannschaft kennt ${child.sex === 'w' ? 'sie' : 'ihn'} seit dem Kinderwagen.` });
  }
  const co = c.staff?.cotrainer;
  if (co && co.idx !== k?.idx) out.push({ type: 'cotrainer', idx: co.idx, name: co.name, age: co.idx != null ? playerOf(c, co.idx).age : null, desc: 'Dein Co-Trainer. Kennt jede Macke der Mannschaft und jeden Schlüssel zum Geräteraum.' });
  const vets = club.squad
    .filter((idx) => idx !== k?.idx && !c.players[idx]?.fromYouth && playerOf(c, idx).age >= 29)
    .map((idx) => ({ idx, score: totalApps(c, idx) + (hasTrait(playerOf(c, idx), 'anfuehrer') ? 25 : 0) + (hasTrait(playerOf(c, idx), 'ex_profi') ? 15 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  for (const v of vets) {
    const p = playerOf(c, v.idx);
    out.push({ type: 'kapitaen', idx: v.idx, name: p.name, age: p.age, desc: `${totalApps(c, v.idx) ? `${totalApps(c, v.idx)} Spiele für den Verein` : 'Gehört seit Jahren zum Kader'}${hasTrait(p, 'anfuehrer') ? ', geborener Anführer' : ''}. Wird Spielertrainer.` });
  }
  const alum = [...(c.alumni ?? [])].reverse().find((a) => a.idx !== co?.idx && a.idx !== k?.idx && a.idx != null && (c.custom?.[a.idx] || a.idx < 900000));
  if (alum) out.push({ type: 'ehemaliger', idx: alum.idx, name: alum.name, age: alum.age + (c.season - alum.season), desc: `Vereinslegende${alum.apps ? ` (${alum.apps} Spiele, ${alum.goals} Tore)` : ''}, heute ${alum.role}.` });
  out.push({ type: 'neu', name: 'Neuen Trainer anlegen', desc: 'Jemand ganz Neues übernimmt – du legst Namen, Alter, Familie und Spielertyp fest.' });
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
  const oldName = old?.idx != null ? playerOf(c, old.idx).name : 'Der alte Trainer';
  const since = old?.since ?? 1;
  const tenure = (c.history ?? []).filter((h) => h.season >= since);
  const titles = tenure.filter((h) => h.pos === 1).length;
  L.eras.push({ name: oldName, from: since, to: c.season, seasons: c.season - since + 1, titles, age: coachAge(c), successor: cand.type === 'neu' ? input ? `${input.first} ${input.last}`.trim() : '?' : cand.name, how: cand.type });
  L.honorary.push(oldName);
  chronicle(c, `Ende einer Ära: ${oldName} tritt nach ${c.season - since + 1} Saisons${titles ? ` und ${titles} ${titles === 1 ? 'Meisterschaft' : 'Meisterschaften'}` : ''} ab und wird Ehrenpräsident.`);
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
    chronicle(c, `${cand.name} tritt in die Fußstapfen und übernimmt das Traineramt – die ${L.eras.length + 1}. Generation an der Seitenlinie.`);
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
  L.notes.push(`Neue Ära: ${playerOf(c, rec.idx).name} (${playerOf(c, rec.idx).age}) ist der neue Trainer. ${oldName} sitzt ab jetzt als Ehrenpräsident mit Stammplatz am Tresen.`);
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
