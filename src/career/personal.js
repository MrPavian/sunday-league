// Die persönliche Ebene: Du bist Spielertrainer mit Job und Familie. Zwei Werte
// halten alles zusammen – die Geduld deiner Familie und deine Ehrenamts-Energie.
// Wer beides verheizt, fällt ein paar Wochen aus.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { addCustomPlayer, getPool, humanClub, maxSquad, playerOf } from './career.js';
import { generatePlayer, ratePlayer } from '../sim/generator.js';
import { adjustMood } from './events.js';

const FAMILIES = [
  { text: 'verheiratet, zwei Kinder', kids: 2, partner: 'Deine Frau' },
  { text: 'verheiratet, ein Kind', kids: 1, partner: 'Deine Frau' },
  { text: 'in einer Beziehung, ein Kind', kids: 1, partner: 'Deine Partnerin' },
  { text: 'Freundin, keine Kinder', kids: 0, partner: 'Deine Freundin' },
];
const OFFER_CLUBS = ['TuS Grünwald 1911 (Kreisliga A)', 'SpVgg Eichenhain (Bezirksliga)', 'FC Viktoria Oststadt (Kreisliga A)'];
const MONEY_JOBS = /Steuer|Bank|Versicherung|Buchhalt|Sachbearbeit|Controller/;

const clamp100 = (v) => Math.max(0, Math.min(100, Math.round(v)));
export const coachOf = (c) => c.coach ?? null;
export const coachAway = (c) => (c.coach?.awayWeeks ?? 0) > 0;
export const trainingLocked = (c) => coachAway(c) || (c.coach?.noTraining ?? 0) > 0;
export const isCoach = (c, idx) => idx != null && c.coach?.idx === idx;

export function adjustPatience(c, d) {
  if (c.coach) c.coach.patience = clamp100(c.coach.patience + d);
}
export function adjustEnergy(c, d) {
  if (c.coach) c.coach.energy = clamp100(c.coach.energy + d);
}

export function patienceLabel(v) {
  if (v >= 70) return 'entspannt';
  if (v >= 45) return 'geht so';
  if (v >= 20) return 'angespannt';
  return 'kurz vorm Knall';
}
export function energyLabel(v) {
  if (v >= 70) return 'voller Tatendrang';
  if (v >= 45) return 'okay';
  if (v >= 20) return 'müde';
  return 'ausgebrannt';
}

// Spielertypen für den eigenen Avatar.
export const STYLES = {
  knipser: { role: 'fwd', name: 'Knipser', desc: 'Steht vorne und macht die Dinger rein.', mods: { shooting: 0.12, technique: 0.03, tackling: -0.05, stamina: -0.03 }, trait: 'hammer' },
  wuehler: { role: 'fwd', name: 'Wühler', desc: 'Schnell, kopfballstark, nervt jeden Verteidiger.', mods: { pace: 0.1, heading: 0.08, technique: -0.04 }, trait: 'kopfball' },
  spielmacher: { role: 'mid', name: 'Spielmacher', desc: 'Sieht den Pass, den sonst keiner sieht.', mods: { passing: 0.12, technique: 0.08, pace: -0.05 }, trait: 'gutes_auge' },
  dauerlaeufer: { role: 'mid', name: 'Dauerläufer', desc: 'Läuft 90 Minuten, auch wenn es nur 60 sind.', mods: { stamina: 0.14, tackling: 0.05, shooting: -0.04 }, trait: 'pferdelunge' },
  ausputzer: { role: 'def', name: 'Ausputzer', desc: 'Klärt alles. Notfalls auf den Parkplatz.', mods: { tackling: 0.12, heading: 0.06, technique: -0.05 }, trait: 'hart_im_nehmen' },
  libero: { role: 'def', name: 'Libero', desc: 'Organisiert hinten und spielt den ersten Ball.', mods: { passing: 0.08, tackling: 0.06, technique: 0.04, pace: -0.06 }, trait: 'anfuehrer' },
  torwart: { role: 'gk', name: 'Torwart', desc: 'Einer muss ja. Und du hältst wirklich gern.', mods: { keeping: 0.12 }, trait: null },
};
export const RELATIONS = { single: 'Single', beziehung: 'In einer Beziehung', verheiratet: 'Verheiratet' };
const PARTNER = { single: 'Deine Mutter', beziehung: 'Deine Partnerin', verheiratet: 'Deine Frau' };

export function familyText(relation, children = []) {
  const n = children.length;
  const kids = n === 0 ? 'keine Kinder' : n === 1 ? `ein Kind (${children[0].name})` : `${n} Kinder (${children.map((k) => k.name).join(', ')})`;
  return `${RELATIONS[relation] ?? 'Single'}, ${kids}`;
}

const clampAttr = (v) => Math.max(0.08, Math.min(0.92, v));

// Dein Spieler aus den Angaben im Editor. Deterministisch über den Seed.
export function createCoachPlayer(input, seed = 1) {
  const style = STYLES[input.style] ?? STYLES.spielmacher;
  const rng = createRng((seed * 131 + 7) >>> 0);
  const p = generatePlayer(rng, { role: style.role, tier: 'gut' });
  const age = Math.max(18, Math.min(55, Math.round(input.age ?? 32)));
  for (const [k, v] of Object.entries(style.mods)) p.attrs[k] = clampAttr(p.attrs[k] + v);
  // Das Alter: schneller mit 20, abgeklärter mit 40.
  p.attrs.pace = clampAttr(p.attrs.pace - Math.max(0, age - 30) * 0.012 + Math.max(0, 25 - age) * 0.01);
  p.attrs.stamina = clampAttr(p.attrs.stamina - Math.max(0, age - 33) * 0.01);
  p.attrs.technique = clampAttr(p.attrs.technique + Math.min(Math.max(age - 20, 0), 12) * 0.004);
  const look = { ...p.look, belly: age > 28 ? rng.next() * 0.7 : rng.next() * 0.25 };
  for (const k of ['skin', 'hair', 'bald', 'beard']) if (input.look?.[k] !== undefined) look[k] = input.look[k];
  const player = {
    ...p,
    name: `${input.first} ${input.last}`.trim(),
    age,
    profession: input.profession || 'Angestellter',
    position: style.role,
    style: input.style,
    backstory: null,
    traits: style.trait ? [style.trait] : [],
    look,
    custom: 'coach',
  };
  player.rating = ratePlayer(player);
  return player;
}

// Ein Kind, das irgendwann selbst kickt: ein bisschen Talent vom Papa, der Rest ist Glück.
function createKidPlayer(child, coach, parent, age, seed) {
  const rng = createRng((seed * 977 + child.name.length * 31 + age) >>> 0);
  // Wer in der eigenen Jugend gut gefördert wurde, bringt das Talent mit.
  const tier = child.talent != null ? (child.talent >= 0.9 ? 'dorfstar' : child.talent >= 0.72 ? 'stark' : child.talent >= 0.5 ? 'gut' : 'ok') : rng.pick(['ok', 'gut', 'gut', 'stark']);
  const role = rng.chance(0.5) ? STYLES[coach.style]?.role ?? 'mid' : rng.pick(['def', 'mid', 'fwd']);
  const p = generatePlayer(rng, { role: role === 'gk' ? 'gk' : role, tier });
  const player = {
    ...p,
    name: `${child.name} ${coach.last}`.trim(),
    age,
    profession: age <= 18 ? 'Schüler' : 'Azubi',
    position: role,
    backstory: `Hat auf dem Vereinsplatz laufen gelernt. Der Papa ist der Trainer – das hört er oft genug.`,
    look: { ...p.look, skin: parent.look.skin, hair: rng.chance(0.6) ? parent.look.hair : p.look.hair, bald: false, beard: false },
    custom: 'kid',
  };
  player.rating = ratePlayer(player);
  return player;
}

export const childAge = (c, child) => child.age + ((c.season ?? 1) - 1);

// Dein Avatar. Mit Angaben aus dem Editor wird er genau so angelegt,
// ohne (Tests, alte Spielstände) ein solider Hobbykicker aus dem Pool.
export function initCoach(career, input = null) {
  if (career.coach) return career.coach;
  const club = humanClub(career);
  if (input) {
    const player = createCoachPlayer(input, career.seed);
    const idx = addCustomPlayer(career, player);
    const relation = RELATIONS[input.relation] ? input.relation : 'single';
    const children = (input.children ?? []).slice(0, 3).map((k) => ({ name: k.name || 'Kind', age: Math.max(0, Math.min(25, Math.round(k.age ?? 5))), sex: k.sex === 'w' ? 'w' : 'm', idx: null }));
    career.coach = {
      idx,
      custom: true,
      first: input.first,
      last: input.last,
      style: input.style,
      relation,
      partner: PARTNER[relation],
      children,
      kids: children.length,
      family: familyText(relation, children),
      patience: relation === 'single' ? 85 : 75,
      energy: 80,
      awayWeeks: 0,
      noTraining: 0,
      flags: {},
    };
    club.squad.push(idx);
    career.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    childrenGrowUp(career);
    return career.coach;
  }
  const rng = createRng((career.seed * 97 + 13) >>> 0);
  const pool = getPool();
  const taken = new Set([...career.clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? [])]);
  let idx = null;
  if (club.squad.length < maxSquad(career)) {
    for (let i = 0; i < 400 && idx === null; i++) {
      const p = pool.get(rng.int(0, pool.size - 1));
      if (!taken.has(p.poolIndex) && p.tier === 'gut' && p.age >= 30 && p.age <= 38) idx = p.poolIndex;
    }
  }
  const family = rng.pick(FAMILIES);
  career.coach = { idx, family: family.text, kids: family.kids, partner: family.partner, patience: 75, energy: 80, awayWeeks: 0, noTraining: 0, flags: {} };
  if (idx !== null) {
    club.squad.push(idx);
    career.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  }
  return career.coach;
}

// Jede Saison werden die Kinder älter. Söhne kommen mit 16 in die A-Jugend
// (ab 20 direkt in den Kader), Töchter spielen im Frauenteam, sobald es eins gibt.
export function childrenGrowUp(c) {
  const k = c.coach;
  if (!k?.children?.length) return [];
  const notes = [];
  const parent = k.idx != null ? playerOf(c, k.idx) : null;
  for (const child of k.children) {
    const age = childAge(c, child);
    if (child.sex === 'w') {
      if (age >= 16 && !child.inFrauen && c.saga?.frauen) {
        child.inFrauen = true;
        c.saga.frauen.strength = Math.min(0.9, c.saga.frauen.strength + 0.05);
        c.saga.chronicle?.push({ season: c.season, text: `${child.name} ${k.last ?? ''} (${age}), Tochter des Trainers, spielt jetzt im Frauenteam.` });
        notes.push(`${child.name} (${age}) spielt ab sofort im Frauenteam. Die Kapitänin ist begeistert.`);
      }
      continue;
    }
    if (child.idx != null || age < 16 || !parent) continue;
    // Ein eigener Spieler entsteht erst, wenn er alt genug ist. Das Alter
    // wird auf Saison 1 zurückgerechnet, weil playerOf jede Saison ein Jahr draufschlägt.
    const player = createKidPlayer(child, k, parent, age - ((c.season ?? 1) - 1), c.seed);
    const idx = addCustomPlayer(c, player);
    child.idx = idx;
    c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    if (age <= 19 && c.youth) {
      c.youth.prospects.push(idx);
      notes.push(`Dein Sohn ${child.name} (${age}) spielt jetzt in der A-Jugend. Stärke ${playerOf(c, idx).rating} – der Jugendtrainer grinst.`);
    } else if (humanClub(c).squad.length < maxSquad(c)) {
      humanClub(c).squad.push(idx);
      c.players[idx].fromYouth = true;
      notes.push(`Dein Sohn ${child.name} (${age}) ist jetzt fest im Kader. Vater und Sohn in einer Mannschaft!`);
    }
  }
  return notes;
}

export function coachName(c) {
  const k = c.coach;
  return k?.idx != null ? playerOf(c, k.idx).name : 'Du';
}

const missingStaff = (c) => ['cotrainer', 'wirt', 'platzwart'].filter((r) => !c.staff?.[r]).length;

// Wochenende vorbei: was hat die Woche gekostet?
export function weeklyPersonal(c) {
  const k = c.coach;
  if (!k) return;
  const w = c.week;
  // Leer gelaufen (auch durch Entscheidungen unter der Woche)? Dann knallt es nächste Woche.
  const crisisNow = () => (k.awayWeeks > 0 ? null : k.patience <= 0 ? 'familienkrise' : k.energy <= 0 ? 'burnout' : null);
  k.pendingCrisis ??= crisisNow();
  if (k.awayWeeks > 0) {
    k.awayWeeks--;
    adjustPatience(c, 8);
    adjustEnergy(c, 12);
  } else {
    const scouting = Math.max(0, 2 - (w?.actions ?? 2));
    const sunday = k.flags.familyAtGames ? 1.5 : 3;
    adjustPatience(c, 4 - sunday - (w?.training ? 2 : 0) - scouting);
    // In der Kreisklasse kommt Papierkram dazu: Spielberichte, Passwesen, Schiri-Ansetzung.
    adjustEnergy(c, 1 - 1.5 - missingStaff(c) - (w?.training ? 1.5 : 0) - (k.flags.kasse ? 2 : 0) - ((c.level ?? 1) > 1 ? 1 : 0));
  }
  if (k.noTraining > 0) k.noTraining--;
  k.pendingCrisis ??= crisisNow();
}

// Sommerpause: Familie und Akku laden auf. Wer Meister wird, bekommt Angebote.
export function seasonPersonal(c, pos) {
  const k = c.coach;
  if (!k) return;
  adjustPatience(c, 25);
  adjustEnergy(c, 20);
  k.awayWeeks = 0;
  k.noTraining = 0;
  if (pos === 1) c.flags.offerFrom = OFFER_CLUBS[(c.season + c.seed) % OFFER_CLUBS.length];
}

// Zu Wochenbeginn: Krisen gehen vor. Die Folgen gelten sofort für diese Woche.
export function personalWeek(c) {
  const k = c.coach;
  if (!k || !c.week) return;
  const crisis = k.pendingCrisis;
  k.pendingCrisis = null;
  if (crisis === 'familienkrise') k.patience = Math.max(k.patience, 35);
  if (crisis === 'burnout') k.energy = Math.max(k.energy, 45);
  if (crisis) {
    k.awayWeeks = 2;
    const def = CRISES[crisis];
    c.week.event = { id: crisis, ctx: {}, text: def.text(c), options: def.options.map((o) => o.label), choice: null, result: null, story: 'Privat' };
  }
  if (coachAway(c) && k.idx != null && c.week.availability[k.idx] !== undefined) c.week.availability[k.idx] = 'no';
  if (coachAway(c)) c.week.lineup = null;
}

const sendAway = (c, weeks = 1) => {
  c.coach.awayWeeks = Math.max(c.coach.awayWeeks, weeks);
  if (c.week) c.week.lineup = null;
  if (c.coach.idx != null && c.week?.availability[c.coach.idx] !== undefined) c.week.availability[c.coach.idx] = 'no';
};

export const CRISES = {
  familienkrise: {
    text: (c) => `${c.coach.partner}: „So geht das nicht weiter. Jedes Wochenende Fußball, jeden Abend WhatsApp mit der Mannschaft." Die nächsten zwei Wochen gehörst du der Familie.`,
    options: [{ label: 'Verstanden.', effect: () => 'Der Kapitän übernimmt. Du hast das Handy aus – fast immer.' }],
  },
  burnout: {
    text: () => 'Du wachst nachts auf und denkst an Aufstellungen. Der Hausarzt schreibt dich zwei Wochen krank: „Auch vom Ehrenamt."',
    options: [{ label: 'Okay …', effect: () => 'Zwei Wochen ohne Verein. Der Co-Trainer und der Kapitän halten den Laden am Laufen.' }],
  },
};

export const PERSONAL_EVENTS = {
  familienwochenende: {
    weight: 3,
    needs: (c) => (c.coach && !coachAway(c) && c.coach.patience < 60 ? {} : null),
    text: (c) =>
      c.coach.relation === 'single'
        ? `${c.coach.partner}: „Sonntag ist Omas 80. Geburtstag. Du kommst, und zwar pünktlich."`
        : c.coach.kids > 0
          ? `${c.coach.partner}: „Sonntag ist Sommerfest in der Kita. Du hast es versprochen."`
          : `${c.coach.partner}: „Sonntag hab ich Karten fürs Konzert in der Stadt. Für uns beide."`,
    options: [
      { label: 'Familie geht vor – Sonntag bin ich raus', effect: (c) => (sendAway(c, 1), adjustPatience(c, 20), 'Der Kapitän stellt auf. Du machst Fotos und schickst heimlich Nachrichten.') },
      { label: 'Nur zur 2. Halbzeit kommen', effect: (c) => (adjustPatience(c, 8), c.coach.idx != null && c.week.availability[c.coach.idx] === 'yes' && (c.week.availability[c.coach.idx] = 'late'), 'Kompromiss. Du kommst in der Pause, noch mit Glitzer im Gesicht.') },
      { label: 'Fußball geht vor', effect: (c) => (adjustPatience(c, -12), 'Die Stimmung zu Hause ist … frostig.') },
    ],
  },
  hochzeitstag: {
    weight: 1,
    needs: (c) => (c.coach && (c.coach.relation ? c.coach.relation === 'verheiratet' : !c.coach.family.startsWith('Freundin')) && !c.flags.anniversary ? {} : null),
    text: () => 'Kurzer Blick in den Kalender: Übermorgen ist Hochzeitstag.',
    options: [
      { label: 'Tisch beim Italiener reservieren', effect: (c) => ((c.flags.anniversary = true), adjustPatience(c, 12), 'Schöner Abend. Du hast nur zweimal aufs Handy geschaut.') },
      {
        label: '„Hab ich natürlich nicht vergessen …"',
        effect: (c, ctx, rng) => {
          c.flags.anniversary = true;
          if (rng.chance(0.5)) return adjustPatience(c, 4), 'Tankstellen-Blumen. Kam trotzdem gut an.';
          adjustPatience(c, -15);
          return 'Du hast es vergessen. Sie nicht.';
        },
      },
    ],
  },
  chef_samstag: {
    weight: 2,
    needs: (c) => (c.coach?.idx != null && !c.coach.flags.bossAsked ? {} : null),
    text: (c) => `Dein Chef (du bist ${playerOf(c, c.coach.idx).profession}): „Kannst du Samstag Inventur machen? Wäre echt wichtig."`,
    options: [
      { label: 'Klar, Chef', effect: (c) => ((c.coach.flags.bossAsked = true), (c.coach.flags.bossFavor = true), adjustEnergy(c, -8), adjustPatience(c, -4), 'Samstag weg. Aber der Chef ist dir was schuldig.') },
      { label: 'Samstag ist heilig', effect: (c) => ((c.coach.flags.bossAsked = true), 'Er guckt komisch, sagt aber nichts.') },
    ],
  },
  chef_sponsor: {
    weight: 3,
    needs: (c) => (c.coach?.flags.bossFavor && !c.coach.flags.bossPaid ? {} : null),
    text: () => 'Dein Chef: „Ich hab gehört, ihr braucht neue Bälle. Die Firma legt was dazu – für die Inventur neulich."',
    options: [{ label: 'Danke!', effect: (c) => ((c.coach.flags.bossPaid = true), book(c, 'Spende vom Chef', 40), '40 € für die Kasse. Beziehungen muss man haben.') }],
  },
  muede: {
    weight: 4,
    needs: (c) => (c.coach && !coachAway(c) && c.coach.energy < 35 ? {} : null),
    text: (c) => `${c.coach.partner}: „Du siehst müde aus. Du machst da echt alles alleine, oder?"`,
    options: [
      { label: 'Training zwei Wochen abgeben', effect: (c) => ((c.coach.noTraining = 2), adjustEnergy(c, 20), 'Kein Open Training die nächsten zwei Wochen. Tut gut.') },
      { label: 'Wochenende an der See', effect: (c) => (sendAway(c, 1), adjustEnergy(c, 30), adjustPatience(c, 15), 'Möwen statt Mannschaftschat. Sonntag stellt der Kapitän auf.') },
      { label: 'Zähne zusammenbeißen', effect: (c) => (adjustEnergy(c, -3), 'Geht schon. Irgendwie.') },
    ],
  },
  vorstand_kasse: {
    weight: 1,
    needs: (c) => (c.coach && !c.coach.flags.kasseAsked && c.round >= 2 ? {} : null),
    text: () => 'Der Kassenwart hört auf. Auf der Vorstandssitzung schauen plötzlich alle dich an.',
    options: [
      {
        label: 'Einen Spieler fragen',
        effect: (c) => {
          c.coach.flags.kasseAsked = true;
          const idx = humanClub(c).squad.find((i) => i !== c.coach.idx && MONEY_JOBS.test(playerOf(c, i).profession));
          if (idx != null) return `${playerOf(c, idx).name.split(' ')[0]} (${playerOf(c, idx).profession}) macht es. Endlich mal einer vom Fach.`;
          c.coach.flags.kasse = true;
          adjustEnergy(c, -5);
          return 'Keiner will. Am Ende landet der Ordner doch bei dir.';
        },
      },
      { label: 'Na gut, ich mach das', effect: (c) => ((c.coach.flags.kasseAsked = true), (c.coach.flags.kasse = true), adjustMood(c, 0.03), 'Noch ein Posten. Der Ordner ist dick.') },
      { label: 'Auf keinen Fall', effect: (c) => ((c.coach.flags.kasseAsked = true), adjustMood(c, -0.02), 'Betretenes Schweigen. Der zweite Vorsitzende macht es widerwillig.') },
    ],
  },
  kind_kickt: {
    weight: 1,
    needs: (c) => {
      const k = c.coach;
      if (!k || k.flags.kidAsked || !(k.kids > 0)) return null;
      const child = (k.children ?? []).find((ch) => childAge(c, ch) >= 5 && childAge(c, ch) <= 15);
      if (k.children?.length && !child) return null;
      return { child: child ? `${child.sex === 'w' ? 'Deine Tochter' : 'Dein Sohn'} ${child.name} (${childAge(c, child)})` : 'Dein Kind' };
    },
    text: (c, ctx) => `${ctx?.child ?? 'Dein Kind'} am Frühstückstisch: „Darf ich auch Fußball spielen? Bei euch?"`,
    options: [
      {
        label: 'Klar – ab in die Jugend!',
        effect: (c) => {
          c.coach.flags.kidAsked = true;
          c.coach.flags.familyAtGames = true;
          adjustPatience(c, 10);
          if (c.youth?.coach) c.youth.coach.quality = Math.min(1, c.youth.coach.quality + 0.05);
          return 'Jetzt kommt die ganze Familie sonntags mit. Der Jugendtrainer freut sich über Verstärkung beim Aufbauen.';
        },
      },
      { label: 'Wie wär\'s mit Tennis?', effect: (c) => ((c.coach.flags.kidAsked = true), 'Enttäuschtes Gesicht. Vielleicht nächstes Jahr.') },
    ],
  },
  angebot: {
    weight: 40,
    needs: (c) => (c.flags.offerFrom && c.round <= 3 ? { club: c.flags.offerFrom } : null),
    text: (c, ctx) => `Anruf vom ${ctx.club}: Sie suchen einen Trainer und haben von eurem Titel gehört. „Wir zahlen auch was."`,
    options: [
      { label: 'Bleiben – das ist mein Verein', effect: (c) => ((c.flags.offerFrom = null), adjustMood(c, 0.15), 'Du hast abgesagt. Als es rumgeht, gibt die Mannschaft einen aus.') },
      {
        label: 'Beim Vorstand pokern',
        effect: (c) => {
          c.flags.offerFrom = null;
          book(c, 'Vorstand: Zuschuss, damit der Trainer bleibt', 100);
          adjustMood(c, -0.05);
          return 'Der Vorstand legt 100 € in die Kasse. Ein paar Spieler finden das Geschacher uncool.';
        },
      },
    ],
  },
};
