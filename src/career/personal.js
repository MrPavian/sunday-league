// Die persönliche Ebene: Du bist Spielertrainer mit Job und Familie. Zwei Werte
// halten alles zusammen – die Geduld deiner Familie und deine Ehrenamts-Energie.
// Wer beides verheizt, fällt ein paar Wochen aus.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { getPool, humanClub, maxSquad, playerOf } from './career.js';
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

// Dein Avatar: ein solider Hobbykicker Anfang, Mitte dreißig aus dem Pool.
export function initCoach(career) {
  if (career.coach) return career.coach;
  const rng = createRng((career.seed * 97 + 13) >>> 0);
  const club = humanClub(career);
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
      c.coach.kids > 0
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
    needs: (c) => (c.coach && !c.coach.family.startsWith('Freundin') && !c.flags.anniversary ? {} : null),
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
    needs: (c) => (c.coach?.kids > 0 && !c.coach.flags.kidAsked ? {} : null),
    text: () => 'Dein Kind am Frühstückstisch: „Darf ich auch Fußball spielen? Bei euch?"',
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
