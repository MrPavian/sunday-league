// Langzeit-Geschichten über mehrere Saisons: der Platz soll verkauft werden,
// Jubiläum mit Festschrift, Fusion mit dem Nachbarn, die erste Frauenmannschaft
// und das Jugendtalent, das Profi wird – und irgendwann zurückkommt.
import { createRng } from '../core/rng.js';
import { LAST_NAMES } from '../data/names.js';
import { PITCHES } from '../sim/pitch.js';
import { book } from './finances.js';
import { clubById, humanClub, joinSquad, maxSquad, playerOf, table } from './career.js';
import { adjustMood } from './events.js';
import { adjustEnergy } from './personal.js';

export const FIRST_YEAR = 2026; // Saison 1 = 2026/27
export const FOUNDED = 2004; // SV Sonntagsschuss, gegründet in einer Kneipe am Kanal
const WOMEN_NAMES = ['Lena', 'Sarah', 'Julia', 'Ayşe', 'Marie', 'Katrin', 'Nina', 'Jessica', 'Anna', 'Sandra', 'Melanie', 'Leonie', 'Selin', 'Janine', 'Vanessa'];
const PRO_CLUBS = ['SV Hafenstadt 09 (2. Liga)', 'FC Mittelland (3. Liga)', 'Rot-Weiß Nordkreis (2. Liga)'];
const NEW_CLUBS = [
  { name: 'SC Neustart', short: 'SCN', kit: { shirt: 0x6a3fa0, shorts: 0xf2efe6, socks: 0x6a3fa0 } },
  { name: 'Eintracht Hafenviertel', short: 'EHV', kit: { shirt: 0x2aa3a0, shorts: 0x1c1c1c, socks: 0x2aa3a0 } },
  { name: 'BSG Stadtwerke', short: 'BSG', kit: { shirt: 0xe07a2a, shorts: 0x1d2b44, socks: 0xe07a2a } },
];
// Wenn der eigene Platz weg ist: Ausweichplatz je Liga.
const FALLBACK = { hinterhof: 'parkplatz', rasenplatz: 'ascheplatz', parkplatz: 'park', park: 'parkplatz', ascheplatz: 'park' };
const SIGNATURE_TARGET = 700;

export const yearOf = (c, season = c.season) => FIRST_YEAR + season - 1;
export const clubAge = (c) => yearOf(c) - (c.founded ?? FOUNDED);
const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];

export function initSagas(c) {
  c.founded ??= FOUNDED;
  c.saga ??= { chronicle: [], pros: [], homeLost: {} };
  return c.saga;
}

export function chronicle(c, text) {
  initSagas(c).chronicle.push({ season: c.season, text });
}

const lastAiClub = (c) => {
  const rows = table(c);
  const last = rows[rows.length - 1];
  return last && !last.club.human && last.played > 0 ? last.club : null;
};

export const SAGA_EVENTS = {
  platz_verkauf: {
    weight: 20,
    needs: (c) => {
      const s = initSagas(c);
      if (c.season < 2 || s.platz || s.platzDone || c.round < 1 || c.round > 3) return null;
      return { venue: PITCHES[humanClub(c).venue].name };
    },
    text: (c, ctx) => `Kreisblatt, Seite 3: Die Stadt prüft den Verkauf von „${ctx.venue}" an einen Investor. Geplant: 40 Eigentumswohnungen.`,
    options: [
      {
        label: 'Bürgerinitiative starten',
        effect: (c) => {
          c.saga.platz = { campaign: true, signatures: 0, target: SIGNATURE_TARGET, season: c.season };
          adjustEnergy(c, -10);
          adjustMood(c, 0.05);
          chronicle(c, 'Bürgerinitiative „Unser Platz bleibt!" gegründet.');
          return `Listen liegen beim Bäcker und im Vereinsheim. Ziel: ${SIGNATURE_TARGET} Unterschriften bis Saisonende. Jedes Heimspiel bringt Leute.`;
        },
      },
      {
        label: 'Pacht selbst übernehmen (300 €)',
        effect: (c) => {
          if (c.cash < 300) {
            c.saga.platz = { campaign: true, signatures: 0, target: SIGNATURE_TARGET, season: c.season };
            return 'Dafür reicht die Kasse nicht. Also doch: Bürgerinitiative. Listen liegen aus.';
          }
          book(c, 'Pacht für den Platz übernommen', -300);
          c.saga.platzDone = true;
          chronicle(c, 'Pacht für den Platz übernommen – der Verkauf ist vom Tisch.');
          return 'Der Verein pachtet den Platz langfristig. Der Investor sucht sich was anderes.';
        },
      },
      {
        label: 'Abwarten – wird schon nicht so kommen',
        effect: (c) => ((c.saga.platz = { campaign: false, season: c.season }), 'Vielleicht verläuft es im Sand. Vielleicht auch nicht.'),
      },
    ],
  },

  jubilaeum: {
    weight: 50,
    needs: (c) => {
      const s = initSagas(c);
      const age = clubAge(c);
      return age >= 20 && age % 5 === 0 && c.round >= 2 && !(s.jubilees ?? []).includes(c.season) ? { age } : null;
    },
    text: (c, ctx) => `${ctx.age} Jahre ${humanClub(c).name}! Gegründet ${c.founded} am Stammtisch. Wie feiern wir?`,
    options: [
      {
        label: 'Große Feier mit Altherrenspiel (80 €)',
        effect: (c, ctx, rng) => {
          jubilee(c, ctx);
          book(c, 'Jubiläum: Festzelt & Grill', -80);
          const income = rng.int(120, 240);
          book(c, 'Jubiläum: Einnahmen', income);
          adjustMood(c, 0.2);
          return `Riesenfest! Die Ehemaligen spielen gegen die aktuelle Mannschaft. ${income} € eingenommen, die Festschrift liegt im Vereinsheim.`;
        },
      },
      { label: 'Festschrift drucken lassen (40 €)', effect: (c, ctx) => (jubilee(c, ctx), book(c, 'Festschrift gedruckt', -40), adjustMood(c, 0.08), 'Die Festschrift ist da – mit allen Saisons, Rekorden und Geschichten. Im Verein-Tab nachzulesen.') },
      { label: 'Klein im Vereinsheim', effect: (c, ctx) => (jubilee(c, ctx), adjustMood(c, 0.04), 'Ein Kasten, eine Rede, ein Foto. Die Chronik gibt es trotzdem.') },
    ],
  },

  fusion: {
    weight: 10,
    needs: (c) => {
      const s = initSagas(c);
      if (c.season < 2 || s.fusion || s.fused || c.round < c.fixtures.length - 3) return null;
      const club = lastAiClub(c);
      return club ? { club: club.id } : null;
    },
    text: (c, ctx) => `Beim ${clubById(c, ctx.club).name} gehen die Lichter aus: noch sieben Leute, keiner will Trainer sein. Der Vorstand fragt, ob ihr zur neuen Saison fusioniert.`,
    options: [
      {
        label: 'Fusion zur neuen Saison',
        effect: (c, ctx) => {
          c.saga.fusion = { club: ctx.club };
          adjustMood(c, -0.05);
          return 'Handschlag unter Vorständen. Die Besten von drüben kommen im Sommer. Ein paar Traditionalisten murren.';
        },
      },
      { label: 'Wir bleiben eigenständig', effect: () => 'Abgelehnt. Der Nachbar sucht weiter.' },
    ],
  },

  frauen: {
    weight: 3,
    needs: (c) => {
      const s = initSagas(c);
      return c.season >= 2 && !s.frauen && c.round >= 2 && s.frauenAsked !== c.season ? {} : null;
    },
    text: () => 'Beim Grillen nach dem Spiel: Ein paar Freundinnen und Schwestern der Spieler wollen selbst kicken. „Warum gibt es hier eigentlich kein Frauenteam?"',
    options: [
      {
        label: 'Frauenteam gründen (Trikots 60 €)',
        effect: (c, ctx, rng) => {
          const captain = `${rng.pick(WOMEN_NAMES)} ${rng.pick(LAST_NAMES)}`;
          book(c, 'Trikots fürs Frauenteam', -60);
          c.saga.frauen = { founded: c.season, captain, strength: 0.35, seasons: [] };
          adjustMood(c, 0.08);
          chronicle(c, `Gründung der ersten Frauenmannschaft, Kapitänin ${captain}.`);
          return `Gegründet! Kapitänin ist ${captain}. Nächste Saison geht es in der Frauen-Kreisliga los.`;
        },
      },
      { label: 'Vielleicht nächste Saison', effect: (c) => ((c.saga.frauenAsked = c.season), 'Schade, sagen sie. Das Thema kommt wieder.') },
    ],
  },

  frauen_platz: {
    weight: 2,
    needs: (c) => {
      const s = initSagas(c);
      return s.frauen && s.frauen.founded < c.season && c.round >= 3 && s.frauen.askedPitch !== c.season ? {} : null;
    },
    text: (c) => `${c.saga.frauen.captain}: „Wir wollen dienstags trainieren. Genau dann, wenn ihr den Platz habt."`,
    options: [
      { label: 'Platz teilen – jeder eine Hälfte', effect: (c) => ((c.saga.frauen.askedPitch = c.season), (c.saga.frauen.strength += 0.05), adjustEnergy(c, -5), adjustMood(c, 0.02), 'Enger, aber es geht. Einer eurer Stürmer schaut neidisch rüber, wie gut die passen.') },
      { label: 'Ihr bekommt den Donnerstag', effect: (c) => ((c.saga.frauen.askedPitch = c.season), (c.saga.frauen.strength += 0.02), 'Donnerstag ist okay. Flutlicht gibt es aber nur bis 20 Uhr.') },
      { label: 'Wir waren zuerst da', effect: (c) => ((c.saga.frauen.askedPitch = c.season), (c.saga.frauen.strength -= 0.03), adjustMood(c, -0.03), 'Die Frauen trainieren im Park. Ein paar eurer Spieler finden das peinlich.') },
    ],
  },

  profi_scout: {
    weight: 40,
    needs: (c) => {
      const s = initSagas(c);
      const idx = s.scoutTarget;
      return idx != null && humanClub(c).squad.includes(idx) && c.round <= 3 ? { s: idx, club: PRO_CLUBS[idx % PRO_CLUBS.length] } : null;
    },
    text: (c, ctx) => `Ein Scout vom ${ctx.club} stand beim letzten Spiel am Zaun. Sie wollen ${playerOf(c, ctx.s).name} (${playerOf(c, ctx.s).age}) zum Probetraining – aus eurer eigenen Jugend!`,
    options: [
      { label: 'Viel Glück! (Ausbildungsentschädigung 250 €)', effect: (c, ctx, rng) => goPro(c, ctx, rng, 250) },
      {
        label: '„Bleib doch bei uns …"',
        effect: (c, ctx, rng) => {
          if (rng.chance(0.5)) {
            c.saga.scoutTarget = null;
            adjustMood(c, 0.05);
            return `${first(c, ctx.s)} bleibt: „Hier sind meine Kumpels." Die Kabine feiert ihn.`;
          }
          return `${goPro(c, ctx, rng, 100)} Die Entschädigung fällt kleiner aus – ihr habt gezögert.`;
        },
      },
    ],
  },

  profi_rueckkehr: {
    weight: 40,
    needs: (c) => {
      const pro = initSagas(c).pros.find((p) => !p.back && p.returnSeason <= c.season);
      return pro && c.round <= 4 ? { s: pro.idx } : null;
    },
    text: (c, ctx) => {
      const pro = c.saga.pros.find((p) => p.idx === ctx.s);
      return `Nachricht von ${pro.name}: „Vertrag beim ${pro.club} ist durch, das Knie auch ein bisschen. Darf ich wieder bei euch kicken? Da hat alles angefangen."`;
    },
    options: [
      {
        label: 'Willkommen zurück!',
        effect: (c, ctx) => {
          const pro = c.saga.pros.find((p) => p.idx === ctx.s);
          if (humanClub(c).squad.length >= maxSquad(c)) return 'Der Kader ist gerade voll. Er wartet, bis ein Platz frei wird.';
          joinSquad(c, ctx.s, 'Wieder zu Hause. Wer holt die Bälle?');
          const rec = c.players[ctx.s];
          rec.addTraits = ['ex_profi'];
          rec.delta = { pace: 0.08, stamina: 0.1, technique: 0.15, passing: 0.15, shooting: 0.12, tackling: 0.1 };
          pro.back = true;
          adjustMood(c, 0.15);
          chronicle(c, `${pro.name} kehrt nach der Profikarriere zurück zum Verein.`);
          return `${pro.name} ist zurück – mit Profi-Erfahrung und einer Geschichte für jede Kabinenrunde.`;
        },
      },
    ],
  },
};

function jubilee(c, ctx) {
  const s = initSagas(c);
  s.jubilees = [...(s.jubilees ?? []), c.season];
  s.festschrift = { age: ctx.age, season: c.season };
  chronicle(c, `${ctx.age} Jahre Verein gefeiert, Festschrift erschienen.`);
}

function goPro(c, ctx, rng, money) {
  const s = c.saga;
  const p = playerOf(c, ctx.s);
  const club = humanClub(c);
  club.squad = club.squad.filter((x) => x !== ctx.s);
  if (c.week) delete c.week.availability[ctx.s];
  delete c.players[ctx.s];
  book(c, `Ausbildungsentschädigung ${p.name}`, money);
  s.pros.push({ idx: ctx.s, name: p.name, club: ctx.club, season: c.season, returnSeason: c.season + 3 + rng.int(0, 2), back: false, news: false });
  s.scoutTarget = null;
  adjustMood(c, 0.1);
  chronicle(c, `${p.name} aus der eigenen Jugend unterschreibt beim ${ctx.club}.`);
  return `${p.name} unterschreibt beim ${ctx.club}! ${money} € Ausbildungsentschädigung für die Kasse.`;
}

// Jede Woche: Unterschriften sammeln, Zwischenstände in die Gruppe.
export function sagaWeek(c) {
  const s = initSagas(c);
  const pl = s.platz;
  if (pl?.campaign && pl.season === c.season) {
    const fans = c.flags?.fans?.round === c.round ? c.flags.fans.n : 0;
    pl.signatures += 15 + fans * 9 + Math.round((c.mood ?? 0) * 20);
  }
}

export function sagaChat(c) {
  const pl = c.saga?.platz;
  if (pl?.campaign && pl.season === c.season && c.round > 0 && c.round % 3 === 0 && c.week) {
    c.week.chat.splice(1, 0, { from: null, text: `Bürgerinitiative: ${pl.signatures} von ${pl.target} Unterschriften. ${pl.signatures >= pl.target ? 'Geschafft – jetzt nur nicht nachlassen!' : 'Jedes Heimspiel zählt!'}`, time: 'Mo 09:30' });
  }
}

// Saisonende: Geschichten auflösen, die über den Sommer entschieden werden.
// Gibt Notizen für die Chatgruppe der neuen Saison zurück.
export function sagaSeasonEnd(c, { level }) {
  const s = initSagas(c);
  const rng = createRng((c.seed * 131 + c.season * 7) >>> 0);
  const notes = [];
  const human = humanClub(c);

  const pl = s.platz;
  if (pl && pl.season === c.season && !s.platzDone) {
    const saved = pl.campaign ? pl.signatures >= pl.target : rng.chance(0.5);
    s.platzDone = true;
    if (saved) {
      adjustMood(c, 0.15);
      chronicle(c, pl.campaign ? `Platz gerettet – ${pl.signatures} Unterschriften!` : 'Der Platzverkauf ist geplatzt – Glück gehabt.');
      notes.push(pl.campaign ? `Der Stadtrat hat entschieden: Der Platz bleibt! ${pl.signatures} Unterschriften haben gewirkt.` : 'Der Investor ist abgesprungen. Der Platz bleibt – diesmal.');
    } else {
      const lost = human.venue;
      const next = FALLBACK[lost] ?? 'park';
      s.homeLost[level] = next;
      adjustMood(c, -0.15);
      chronicle(c, `Abschied von „${PITCHES[lost].name}". Neue Heimat: ${PITCHES[next].name}.`);
      notes.push(`Der Platz ist verkauft. Die Bagger kommen im Herbst. Neue Heimat: ${PITCHES[next].name}.`);
    }
  }

  const fr = s.frauen;
  if (fr && fr.founded < c.season) {
    const pos = Math.max(1, Math.min(8, Math.round(8 - fr.strength * 8 + rng.range(-1.5, 1.5))));
    fr.seasons.push({ season: c.season, pos });
    fr.strength = Math.min(0.9, fr.strength + 0.05);
    notes.push(`Frauen: ${pos}. Platz in der Frauen-Kreisliga.${pos === 1 ? ' MEISTER!' : ''}`);
    if (pos === 1) chronicle(c, `Die Frauen werden Meister der Kreisliga (Kapitänin ${fr.captain}).`);
  }

  for (const p of s.pros) {
    if (!p.back && !p.news && c.season > p.season) {
      p.news = true;
      notes.push(`Aus der Zeitung: ${p.name} hat beim ${p.club} sein erstes Profitor geschossen! Im Vereinsheim hängt der Artikel.`);
    }
  }

  // Wer aus der eigenen Jugend kommt und richtig gut ist, fällt Scouts auf.
  const talents = human.squad.filter((idx) => c.players[idx]?.fromYouth && playerOf(c, idx).age <= 22 && playerOf(c, idx).rating >= 54);
  s.scoutTarget = talents.length && rng.chance(0.45) ? talents.sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0] : null;
  return notes;
}

// Fusion zum Saisonwechsel: die Besten von drüben kommen, der Nachbar wird ersetzt.
export function applyFusion(c, clubs, pickSquad, freshRecord) {
  const s = initSagas(c);
  const f = s.fusion;
  if (!f) return { clubs, notes: [] };
  s.fusion = null;
  const old = clubs.find((x) => x.id === f.club);
  if (!old) return { clubs, notes: [] };
  const human = clubs.find((x) => x.human);
  const best = [...old.squad].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating);
  const joined = [];
  for (const idx of best) {
    if (human.squad.length >= maxSquad(c) || joined.length >= 3) break;
    human.squad.push(idx);
    c.players[idx] = freshRecord();
    joined.push(idx);
  }
  for (const idx of old.squad) if (!joined.includes(idx)) delete c.players[idx];
  const fresh = NEW_CLUBS[c.season % NEW_CLUBS.length];
  const replacement = { ...old, id: `neu${c.season}`, name: fresh.name, short: fresh.short, kit: fresh.kit, squad: pickSquad(old.tiers) };
  for (const idx of replacement.squad) c.players[idx] = freshRecord();
  s.fused = true;
  chronicle(c, `Fusion mit ${old.name}. Neu dabei: ${joined.map((i) => playerOf(c, i).name).join(', ') || 'niemand'}.`);
  const notes = [`Fusion vollzogen: Von ${old.name} kommen ${joined.map((i) => playerOf(c, i).name).join(', ') || 'leider niemand'}. Neu in der Liga: ${fresh.name}.`];
  return { clubs: clubs.map((x) => (x.id === old.id ? replacement : x)), notes };
}

// Die Festschrift/Chronik: alles, was der Spielstand über die Vereinsgeschichte weiß.
export function chronicleData(c) {
  const s = initSagas(c);
  const human = humanClub(c);
  const seasons = (c.history ?? []).map((h) => ({ ...h, year: `${yearOf(c, h.season)}/${String(yearOf(c, h.season) + 1).slice(2)}` }));
  const people = [
    ...human.squad.map((idx) => ({ name: playerOf(c, idx).name, apps: (c.players[idx]?.total?.apps ?? 0) + (c.players[idx]?.apps ?? 0), goals: (c.players[idx]?.total?.goals ?? 0) + (c.players[idx]?.goals ?? 0), active: true })),
    ...(c.alumni ?? []).map((a) => ({ name: a.name, apps: a.apps, goals: a.goals, active: false })),
  ];
  const topApps = [...people].sort((a, b) => b.apps - a.apps).slice(0, 3);
  const topGoals = [...people].sort((a, b) => b.goals - a.goals).slice(0, 3);
  return { name: human.name, founded: c.founded ?? FOUNDED, age: clubAge(c), seasons, topApps, topGoals, events: s.chronicle, frauen: s.frauen, pros: s.pros, festschrift: s.festschrift };
}
