// Mannschaftskasse, Strafenkatalog, Sponsoren und die Saisonabschlussfahrt.
import { createRng } from '../core/rng.js';

export const START_CASH = 100;
export const KIT_COST = 60;
export const TRIP_COST = 250;
export const MEMBER_FEE = 3; // pro Spieler und Spieltag

// Der Strafenkatalog – hängt laminiert in der Kabine.
export const FINES = [
  { id: 'whiff', label: 'Luftloch', amount: 1 },
  { id: 'car', label: 'Ans Auto geschossen', amount: 2 },
  { id: 'late', label: 'Zu spät / erst zur 2. Halbzeit', amount: 5 },
  { id: 'yellow', label: 'Gelbe Karte', amount: 5 },
  { id: 'ownGoal', label: 'Eigentor (Runde für alle)', amount: 10 },
  { id: 'red', label: 'Gelb-Rot', amount: 15 },
];
const FINE = Object.fromEntries(FINES.map((f) => [f.id, f.amount]));

export const SPONSORS = [
  { id: 'krume', name: 'Bäckerei Krume', line: 'Frische Brötchen nach dem Spiel inklusive.' },
  { id: 'vollgas', name: 'Fahrschule Vollgas', line: 'Wer einen Führerschein braucht, weiß Bescheid.' },
  { id: 'sultan', name: 'Döner Sultan', line: 'Mannschaftsdöner nach jedem Heimsieg.' },
  { id: 'brenner', name: 'Autohaus Brenner', line: 'Fährt auch mal den Bus zum Auswärtsspiel.' },
  { id: 'physio', name: 'Physio am Markt', line: 'Tapen vor dem Spiel zum Vereinspreis.' },
  { id: 'schnittig', name: 'Friseur Schnittig', line: 'Frisur sitzt, auch nach 90 Minuten.' },
  { id: 'kowalski', name: 'Dachdeckerei Kowalski', line: 'Hält dicht – wie unsere Abwehr (hoffentlich).' },
  { id: 'hoffmann', name: 'Getränke Hoffmann', line: 'Die Kiste nach dem Spiel geht aufs Haus.' },
];

// Saisonziele der Sponsoren mit Bonus bei Erfüllung.
const GOALS = [
  { type: 'wins', n: [3, 5], text: (n) => `mindestens ${n} Siege` },
  { type: 'goals', n: [12, 20], text: (n) => `mindestens ${n} eigene Tore` },
  { type: 'rank', n: [2, 3], text: (n) => `am Ende unter den ersten ${n}` },
  { type: 'fair', n: [6, 10], text: (n) => `höchstens ${n} Gelbe Karten` },
];

export const SLOTS = { trikot: 'Trikotsponsor', bande: 'Bandenpartner' };

export function initFinances(career) {
  career.cash ??= START_CASH;
  career.ledger ??= [];
  career.sponsors ??= [];
  career.offers ??= [];
  career.fines ??= {};
  career.seasonCards ??= 0;
  career.spirit ??= 0;
  career.tripBooked ??= false;
  return career;
}

export function book(career, text, amount) {
  career.cash = Math.round((career.cash + amount) * 100) / 100;
  career.ledger.push({ season: career.season, round: career.round + 1, text, amount });
  if (career.ledger.length > 60) career.ledger.splice(0, career.ledger.length - 60);
}

// Nach dem Spiel: Strafen für die eigenen Leute, Heimspiel-Einnahmen und -Kosten.
export function matchFinances(career, fixture, prepared, level) {
  const human = career.clubs.find((c) => c.human);
  const homeHuman = fixture.home === human.id;
  if (!homeHuman && fixture.away !== human.id) return;
  const m = prepared.match;
  const team = m.humanTeam !== null ? 0 : homeHuman ? 0 : 1;
  let fines = 0;
  const players = [...m.players, ...m.bench[0], ...m.bench[1], ...m.sentOff].filter((p) => p.team === team && career.players[p.poolIndex]);
  for (const p of players) {
    const s = m.stats.players[p.id];
    if (!s) continue;
    const f = s.whiffs * FINE.whiff + s.cars * FINE.car + s.ownGoals * FINE.ownGoal + s.yellow * FINE.yellow + s.red * FINE.red + (p.late ? FINE.late : 0);
    if (f > 0) {
      career.fines[p.poolIndex] = (career.fines[p.poolIndex] ?? 0) + f;
      fines += f;
    }
  }
  career.seasonCards += m.stats.teams[team].yellow;
  if (fines > 0) book(career, 'Strafen eingesammelt', fines);

  if (homeHuman) {
    const rng = createRng(career.seed + career.season * 97 + career.round * 13);
    const press = career.flags?.pressWeeks > 0 ? 1.4 : 1; // nach dem Kreisblatt-Porträt kommen mehr
    const fans = Math.round((level > 1 ? rng.int(20, 45) : rng.int(5, 14)) * press);
    const wirt = career.staff?.wirt ? 1.3 : 1;
    book(career, `Getränkeverkauf (${fans} Zuschauer)${wirt > 1 ? ` – Wirt ${career.staff.wirt.name.split(' ')[0]}` : ''}`, Math.round(fans * 2.5 * wirt));
    if (level > 1) {
      book(career, 'Schiri-Gebühr', -20);
      book(career, career.staff?.platzwart ? 'Platzmiete (Platzwart macht vieles selbst)' : 'Platzmiete Waldesruh', career.staff?.platzwart ? -7.5 : -15);
    }
  }
}

// Jede Woche: Mitgliedsbeiträge und Sponsorengeld.
export function weeklyFinances(career) {
  const human = career.clubs.find((c) => c.human);
  book(career, `Mitgliedsbeiträge (${human.squad.length} × ${MEMBER_FEE} €)`, human.squad.length * MEMBER_FEE);
  for (const s of career.sponsors) book(career, `${s.name} (${SLOTS[s.slot]})`, s.weekly);
}

// Angebote vor Saisonbeginn für freie Plätze.
export function makeOffers(career, level) {
  const rng = createRng(career.seed + career.season * 31 + 5);
  const taken = new Set(career.sponsors.map((s) => s.slot));
  const used = new Set(career.sponsors.map((s) => s.id));
  const offers = [];
  for (const slot of Object.keys(SLOTS)) {
    if (taken.has(slot)) continue;
    for (let k = 0; k < 2; k++) {
      const pool = SPONSORS.filter((s) => !used.has(s.id));
      const sp = rng.pick(pool);
      used.add(sp.id);
      const goal = rng.pick(GOALS);
      const n = rng.int(goal.n[0], goal.n[1]);
      const scale = level > 1 ? 2 : 1;
      const weekly = (slot === 'trikot' ? rng.int(8, 14) : rng.int(4, 8)) * scale;
      offers.push({ ...sp, slot, weekly, goal: { type: goal.type, n, text: goal.text(n) }, bonus: rng.int(4, 8) * 10 * scale });
    }
  }
  career.offers = offers;
}

export function acceptSponsor(career, i) {
  const o = career.offers[i];
  if (!o || career.round !== 0 || career.sponsors.some((s) => s.slot === o.slot)) return false;
  career.sponsors.push(o);
  career.offers = career.offers.filter((x) => x.slot !== o.slot);
  return true;
}

export function goalReached(goal, { wins, goals, rank, cards }) {
  if (goal.type === 'wins') return wins >= goal.n;
  if (goal.type === 'goals') return goals >= goal.n;
  if (goal.type === 'rank') return rank <= goal.n;
  if (goal.type === 'fair') return cards <= goal.n;
  return false;
}

// Saisonende: Boni auszahlen, Verträge laufen aus, Stimmung aus der Fahrt übernehmen.
export function closeSeasonFinances(career, summary) {
  for (const s of career.sponsors) {
    if (goalReached(s.goal, summary)) book(career, `Bonus ${s.name}: ${s.goal.text}`, s.bonus);
  }
  career.sponsors = [];
  career.offers = [];
  career.fines = {};
  career.seasonCards = 0;
  career.spirit = career.tripBooked ? 1 : 0;
  career.tripBooked = false;
}

export function bookTrip(career) {
  if (career.tripBooked || career.cash < TRIP_COST) return false;
  book(career, 'Saisonabschlussfahrt gebucht', -TRIP_COST);
  career.tripBooked = true;
  return true;
}
