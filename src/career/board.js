// Saisonziel vom Vorstand: vor der Saison eine Ansage (je nach Kaderstärke im
// Vergleich zur Liga), zur Winterpause ein Zwischenzeugnis, am Ende die Bilanz –
// mit Folgen für Stimmung und Kasse.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf, table } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { chronicle } from './sagas.js';

const BOARD = tr('Vorstand (Erwin)', 'Chairman (Erwin)');

export const GOALS = {
  aufstieg: { name: tr('Aufstieg', 'Promotion'), text: tr('Oben mitspielen, am besten aufsteigen.', 'Challenge at the top, ideally go up.') },
  obere: { name: tr('Obere Tabellenhälfte', 'Top half'), text: tr('Obere Tabellenhälfte. Mehr verlangt keiner.', 'Top half of the table. Nobody asks for more.') },
  erhalt: { name: tr('Nicht Letzter werden', 'Avoid finishing last'), text: tr('Bloß nicht Letzter werden. Und Spaß haben.', 'Just do not finish bottom. And have fun.') },
};

const strength = (c, club) => {
  const r = club.squad.map((idx) => playerOf(c, idx)?.rating ?? 40).sort((a, b) => b - a).slice(0, 7);
  return r.reduce((s, x) => s + x, 0) / Math.max(1, r.length);
};

// Zielplatz: ab welchem Platz gilt das Ziel als erreicht?
export function targetPos(c, type) {
  const n = c.clubs.length;
  return type === 'aufstieg' ? 2 : type === 'obere' ? Math.ceil(n / 2) : n - 1;
}

export function setSeasonGoal(c) {
  const me = humanClub(c);
  const ranked = [...c.clubs].sort((a, b) => strength(c, b) - strength(c, a));
  const rank = ranked.findIndex((x) => x.id === me.id) + 1;
  const n = c.clubs.length;
  const type = rank <= 2 ? 'aufstieg' : rank <= Math.ceil(n / 2) ? 'obere' : 'erhalt';
  c.goal = { season: c.season, type, target: targetPos(c, type), rank, mid: false };
  c.week?.chat.splice(1, 0, { from: null, text: `${BOARD}: ${tr('Saisonziel', 'Season target')} – ${GOALS[type].text} ${tr(`Laut Papier seid ihr die Nummer ${rank} der Liga.`, `On paper you are number ${rank} in the league.`)}`, time: 'Mo 08:30', press: true });
  return c.goal;
}

const posNow = (c) => table(c).findIndex((r) => r.club.human) + 1;

// Zur Halbzeit der Saison: Zwischenzeugnis.
export function midSeasonReport(c) {
  const g = c.goal;
  if (!g || g.season !== c.season || g.mid || c.round < Math.floor(c.fixtures.length / 2)) return null;
  g.mid = true;
  const pos = posNow(c);
  const level = c.level ?? 1;
  let text;
  if (pos <= g.target - 2 || (pos === 1 && g.target > 1)) {
    adjustMood(c, 0.06);
    book(c, tr('Vorstand spendiert neue Bälle', 'Board pays for new balls'), 20 * level);
    text = tr(`Zwischenzeugnis: Platz ${pos} – besser als erwartet! Der Vorstand spendiert neue Bälle.`, `Half-term report: place ${pos} – better than expected! The board buys new balls.`);
  } else if (pos <= g.target) text = tr(`Zwischenzeugnis: Platz ${pos}, alles im Plan. Weitermachen.`, `Half-term report: place ${pos}, on track. Keep going.`);
  else {
    adjustMood(c, -0.04);
    text = tr(`Zwischenzeugnis: Platz ${pos}. Das Ziel war ein anderes. Der Vorstand „macht sich Gedanken".`, `Half-term report: place ${pos}. That was not the plan. The board is "thinking about things".`);
  }
  c.week?.chat.splice(1, 0, { from: null, text: `${BOARD}: ${text}`, time: 'Mo 08:30', press: true });
  return text;
}

// Saisonende: Ziel erreicht? Liefert eine Notiz für die neue Saison.
export function seasonGoalVerdict(c, pos) {
  const g = c.goal;
  if (!g || g.season !== c.season) return null;
  const level = c.level ?? 1;
  let text;
  if (pos <= g.target - 3 || (g.type !== 'aufstieg' && pos <= 2)) {
    adjustMood(c, 0.12);
    book(c, tr('Prämie vom Vorstand', 'Board bonus'), 80 * level);
    text = tr(`Saisonziel (${GOALS[g.type].name}) weit übertroffen: Platz ${pos}! Der Vorstand zahlt eine Prämie und schmeißt eine Runde.`, `Season target (${GOALS[g.type].name}) smashed: place ${pos}! The board pays a bonus and buys a round.`);
  } else if (pos <= g.target) {
    adjustMood(c, 0.05);
    book(c, tr('Prämie vom Vorstand', 'Board bonus'), 30 * level);
    text = tr(`Saisonziel (${GOALS[g.type].name}) erreicht: Platz ${pos}. Kleine Prämie.`, `Season target (${GOALS[g.type].name}) reached: place ${pos}. A small bonus.`);
  } else {
    adjustMood(c, -0.08);
    text = tr(`Saisonziel (${GOALS[g.type].name}) verfehlt: Platz ${pos}. Beim Sommerfest wird getuschelt.`, `Season target (${GOALS[g.type].name}) missed: place ${pos}. People whisper at the summer party.`);
  }
  chronicle(c, text);
  return text;
}
