// Einsteiger-Hinweise: Jedes System wird einmal erklärt – genau in der Woche, in der
// es zum ersten Mal auftaucht. Höchstens ein Hinweis pro Woche, damit der Chat der
// Chat bleibt.
import { tr } from '../core/i18n.js';
import { styleFit } from '../sim/fit.js';
import { STYLES } from '../sim/tactics.js';
import { humanClub, nextPitch, playerOf } from './career.js';
import { relationOf } from './relations.js';

const BAD = ['rivalen', 'feinde'];

const TIPS = [
  {
    id: 'welcome',
    when: (c) => c.season === 1 && c.round === 0,
    text: () => tr('Willkommen im Verein! Hier im Chat sagen die Jungs für Sonntag zu oder ab. Wer absagt, den kannst du unten noch mal anschreiben.', 'Welcome to the club! This is where the lads say yes or no for Sunday. Anyone who drops out, you can chase up below.'),
  },
  {
    id: 'goal',
    when: (c) => !!c.goal && c.goal.season === c.season,
    text: () => tr('Der Vorstand hat euch ein Saisonziel gesetzt. Zur Winterpause gibt es ein Zwischenzeugnis, am Saisonende die Abrechnung – mit Folgen für Stimmung und Kasse.', 'The board has set you a season target. There is a half-term report at the winter break and a reckoning at the end – it affects mood and money.'),
  },
  {
    id: 'event',
    when: (c) => !!c.week.event,
    text: () => tr('Oben wartet eine Entscheidung. Danach zeigen kleine Marken, was sie bewirkt hat – Stimmung, Form, Kasse, Beziehungen.', 'A decision is waiting at the top. Afterwards, small tags show what it changed – mood, form, money, relationships.'),
  },
  {
    id: 'clublife',
    when: (c) => c.week.event?.story === 'Vereinsleben',
    text: () => tr('Vereinsleben: Beitrag, Förderverein, Nachbarn und Kassenwart wirken dauerhaft – Woche für Woche in der Kasse und in der Stimmung. Den Stand siehst du im Tab „Verein".', 'Club life: fees, supporters, neighbours and the treasurer have lasting effects – week by week on the kitty and the mood. Check the “Club” tab for the current state.'),
  },
  {
    id: 'press',
    when: (c) => c.week.chat.some((m) => m.press && m.text.startsWith('Kreisblatt')),
    text: () => tr('Jeder Gegner hat einen Trainer mit eigener Art. Nach fairen Spielen gibt es Handschlag – manchmal will dann einer zu euch wechseln. Nach Rudelbildung wird das Rückspiel hitzig.', 'Every opponent has a manager with his own ways. Fair games end in handshakes – and sometimes one of their players wants to join you. After a melee, the return fixture gets heated.'),
  },
  {
    id: 'banter',
    when: (c) => c.week.chat.some((m) => m.banter),
    text: () => tr('Die Sprüche im Chat wirken: Lob hebt die Form, Sticheleien können Freundschaften stiften oder Streit auslösen.', 'The banter matters: praise lifts form, digs can build friendships or start feuds.'),
  },
  {
    id: 'fit',
    when: (c) => {
      const pitch = nextPitch(c);
      return !!pitch && Object.keys(STYLES).some((s) => styleFit(s, pitch).reasons.length);
    },
    text: () => tr('Sonntag herrschen besondere Bedingungen. In der Aufstellung zeigt ▲ oder ▼, welcher Spielstil zu Platz und Wetter passt – und welche Berufe dazu passen.', 'Sunday brings special conditions. In the line-up, ▲ or ▼ shows which play style suits the pitch and weather – and which jobs fit it.'),
  },
  {
    id: 'rivals',
    when: (c) => {
      const sq = humanClub(c).squad;
      return sq.some((a) => sq.some((b) => a < b && BAD.includes(relationOf(c, a, b))));
    },
    text: () => tr('In eurem Kader gibt es Streithähne. Die spielen sich im Spiel seltener an – das siehst du als Einblendung. Kumpels dagegen suchen sich.', 'There are feuding players in your squad. They pass to each other less in matches – you will see it pop up. Mates, on the other hand, look for each other.'),
  },
  {
    id: 'memory',
    when: (c) => c.week.chat.some((m) => m.memory),
    text: () => tr('Der Verein vergisst nichts: Ex-Spieler, Angstgegner und alte Rechnungen tauchen wieder auf – und landen in der Chronik.', 'The club never forgets: former players, bogeymen and old scores come back around – and end up in the chronicle.'),
  },
  {
    id: 'hot',
    when: (c) => humanClub(c).squad.some((idx) => (c.players[idx]?.form ?? 0) >= 0.3),
    text: (c) => {
      const idx = humanClub(c).squad.find((i) => (c.players[i]?.form ?? 0) >= 0.3);
      const name = playerOf(c, idx).name.split(' ')[0];
      return tr(`${name} ist gerade in Topform. Im Spiel erkennst du heiße Spieler an der kleinen Flamme.`, `${name} is in top form right now. In matches, players on a hot streak carry a little flame.`);
    },
  },
  {
    id: 'rumors',
    when: (c) => c.round >= 2 && (c.week.rumors ?? []).length > 0,
    text: () => tr('Unter „Transfers" stehen Gerüchte. Erst beobachten lassen, dann ansprechen – jede Woche hast du nur ein paar Aktionen.', 'Rumours appear under “Transfers”. Scout first, then make an approach – you only get a few actions each week.'),
  },
  {
    id: 'museum',
    when: (c) => (c.history ?? []).length >= 1,
    text: () => tr('Die erste Saison ist Geschichte. Im Museum sammeln sich Titel, Rekorde, Legenden und eure alten Trikots.', 'Your first season is history. The museum collects trophies, records, legends and your old kits.'),
  },
];

export const TIP_IDS = TIPS.map((t) => t.id);

// Am Ende von startWeek: den ersten passenden, noch nicht gezeigten Hinweis oben einfügen.
export function weeklyTip(c) {
  if (!c.week || c.tipsOff) return null;
  c.tipsSeen ??= {};
  for (const tip of TIPS) {
    if (c.tipsSeen[tip.id]) continue;
    let ok = false;
    try {
      ok = tip.when(c);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    c.tipsSeen[tip.id] = { season: c.season, round: c.round };
    const msg = { from: null, text: tip.text(c), time: 'Mo 08:00', tip: tip.id };
    c.week.chat.unshift(msg);
    return msg;
  }
  return null;
}
