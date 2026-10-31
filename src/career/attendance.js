// Zuschauer und Tribünen (ROADMAP „Verein, Kader, Wirtschaft“: Tribünen ausbauen – Zuschauerzahl und Einnahmen). Die Ausbaustufen
// (Stehstufen bis Stadion) und ihre Wirkung stehen in facilities.js; hier wird mitgeschrieben, was bei Heimspielen passiert:
// Saisonschnitt, Rekord, Auslastung, ausverkaufte Spiele und wie viele draußen bleiben mussten (Nachfrage über dem
// Fassungsvermögen, finances.js matchFinances). Daraus: Hinweis, welcher Ausbau als Nächstes hilft, und der Eintritt, der
// dabei entgangen ist (ab Bezirksliga, entryFee). Keine neuen Zahlen und kein Zufall – nur Buchführung über die bestehende Rechnung.
import { tr } from '../core/i18n.js';
import { capacity, FACILITIES, hasFacility, STAND_TIERS } from './facilities.js';
import { entryFee } from './finances.js';

const SEASONS_KEPT = 10;
const st = (c) => (c.gate ??= { season: c.season, games: 0, total: 0, max: 0, soldOut: 0, turnedAway: 0, record: null, seasons: [] });

function roll(c) {
  const g = st(c);
  if (g.season === c.season) return g;
  if (g.games) g.seasons = [...g.seasons, { season: g.season, games: g.games, avg: Math.round(g.total / g.games), max: g.max, soldOut: g.soldOut, turnedAway: g.turnedAway }].slice(-SEASONS_KEPT);
  Object.assign(g, { season: c.season, games: 0, total: 0, max: 0, soldOut: 0, turnedAway: 0, lostEntry: 0 });
  return g;
}

// Der nächste Tribünenausbau, der mehr Platz bringt (oder null).
export function nextStand(c) {
  const cap = capacity(c);
  const up = [...STAND_TIERS].reverse().find(([id, , n]) => n > cap && !hasFacility(c, id) && (FACILITIES[id].minLevel ?? 1) <= (c.level ?? 1));
  return up ? { id: up[0], name: FACILITIES[up[0]].name, capacity: up[2] } : null;
}

// Aus matchFinances: demand = so viele wären gekommen, fans = so viele waren drin.
export function recordGate(c, demand, fans, oppName = '') {
  const g = roll(c);
  const cap = capacity(c);
  g.games++;
  g.total += fans;
  g.max = Math.max(g.max, fans);
  const away = Math.max(0, demand - fans);
  if (away > 0) {
    g.soldOut++;
    g.turnedAway += away;
    if ((c.level ?? 1) > 4) g.lostEntry = Math.round((g.lostEntry ?? 0) + away * entryFee(c.level));
    const up = nextStand(c);
    const hint = up ? tr(` Mit „${up.name}“ wäre Platz für ${up.capacity}.`, ` With “${up.name}” there would be room for ${up.capacity}.`) : '';
    (c.pendingNews ??= []).push(tr(`Ausverkauft! ${fans} Zuschauer${oppName ? ` gegen ${oppName}` : ''}, ${away} mussten draußen bleiben.${hint}`, `Sold out! ${fans} spectators${oppName ? ` against ${oppName}` : ''}, ${away} had to stay outside.${hint}`));
  }
  if (!g.record || fans > g.record.n) {
    const first = !g.record;
    g.record = { n: fans, season: c.season, opp: oppName };
    if (!first && fans >= 20) (c.pendingNews ??= []).push(tr(`Zuschauerrekord: ${fans} beim Heimspiel${oppName ? ` gegen ${oppName}` : ''}.`, `Attendance record: ${fans} at the home game${oppName ? ` against ${oppName}` : ''}.`));
  }
  return { cap, away };
}

// Für die Anzeige unter Verein → Tribünen.
export function gateStats(c) {
  const g = c.gate;
  if (!g) return null;
  const cur = g.season === c.season ? g : { games: 0, total: 0, max: 0, soldOut: 0, turnedAway: 0, lostEntry: 0 };
  const cap = capacity(c);
  const avg = cur.games ? Math.round(cur.total / cur.games) : 0;
  return { games: cur.games, avg, max: cur.max, soldOut: cur.soldOut, turnedAway: cur.turnedAway, lostEntry: cur.lostEntry ?? 0, cap, load: cur.games ? Math.round((avg / cap) * 100) : 0, record: g.record, seasons: g.seasons, next: nextStand(c) };
}
