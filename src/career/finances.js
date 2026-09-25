// Mannschaftskasse, Strafenkatalog, Sponsoren und die Saisonabschlussfahrt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { closeSponsors, paySponsors } from './sponsors.js';
import { fansMul, salesMul } from './facilities.js';
import { tripSpirit } from './trip.js';
export { bookTrip } from './trip.js';

export const START_CASH = 100;
export const KIT_COST = 60;
export const TRIP_COST = 250;
export const MEMBER_FEE = 3; // pro Spieler und Spieltag

// Der Strafenkatalog – hängt laminiert in der Kabine.
export const FINES = [
  { id: 'whiff', label: tr('Luftloch', 'Air shot'), amount: 1 },
  { id: 'car', label: tr('Ans Auto geschossen', 'Hit a car'), amount: 2 },
  { id: 'late', label: tr('Zu spät / erst zur 2. Halbzeit', 'Late / only for the 2nd half'), amount: 5 },
  { id: 'yellow', label: tr('Gelbe Karte', 'Yellow card'), amount: 5 },
  { id: 'ownGoal', label: tr('Eigentor (Runde für alle)', 'Own goal (round for everyone)'), amount: 10 },
  { id: 'red', label: tr('Gelb-Rot', 'Second yellow'), amount: 15 },
];
const FINE = Object.fromEntries(FINES.map((f) => [f.id, f.amount]));

export { acceptSponsor, goalReached, makeOffers, SLOTS, SPONSORS } from './sponsors.js';

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
  if (fines > 0) book(career, tr('Strafen eingesammelt', 'Fines collected'), fines);
  // Vorfälle: Wer Gastgeber ist, zahlt den Ersatzball.
  if (homeHuman) for (const inc of m.incidents ?? []) if (inc.cost) book(career, tr('Neuer Ball (Nachbar gibt ihn nicht raus)', 'New ball (the neighbour kept the old one)'), -inc.cost);

  if (homeHuman) {
    const rng = createRng(career.seed + career.season * 97 + career.round * 13);
    const press = (career.flags?.pressWeeks > 0 ? 1.4 : 1) * (m.derby ? 1.8 : 1); // Kreisblatt-Porträt, Derby
    const weatherFans = { sonne: 1.2, hitze: 0.9, regen: 0.6, wind: 0.85, nebel: 0.8, frost: 0.7, schnee: 0.5 }[career.week?.weather?.id] ?? 1;
    const fans = Math.round((level > 1 ? rng.int(20, 45) : rng.int(5, 14)) * press * weatherFans * fansMul(career));
    career.flags ??= {};
    career.flags.fans = { round: career.round, n: fans }; // für die Unterschriftenlisten
    const wirt = (career.staff?.wirt ? 1.3 : 1) * salesMul(career); // Wirt, Grill & Theke
    book(career, tr(`Getränkeverkauf (${fans} Zuschauer)${career.staff?.wirt ? ` – Wirt ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – mit Grill' : ''}`, `Drinks sales (${fans} spectators)${career.staff?.wirt ? ` – bar manager ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – with barbecue' : ''}`), Math.round(fans * 2.5 * wirt));
    if (level > 1) {
      book(career, tr('Schiri-Gebühr', 'Referee fee'), -20);
      book(career, career.staff?.platzwart ? tr('Platzmiete (Platzwart macht vieles selbst)', 'Pitch rent (groundsman does a lot himself)') : tr('Platzmiete Waldesruh', 'Pitch rent Waldesruh'), career.staff?.platzwart ? -7.5 : -15);
    }
  }
}

// Jede Woche: Mitgliedsbeiträge und Sponsorengeld.
export function weeklyFinances(career) {
  const human = career.clubs.find((c) => c.human);
  book(career, tr(`Mitgliedsbeiträge (${human.squad.length} × ${MEMBER_FEE} €)`, `Membership fees (${human.squad.length} × €${MEMBER_FEE})`), human.squad.length * MEMBER_FEE);
  paySponsors(career);
}

// Saisonende: Boni auszahlen, Verträge laufen aus, Stimmung aus der Fahrt übernehmen.
export function closeSeasonFinances(career, summary) {
  closeSponsors(career, summary);
  career.fines = {};
  career.seasonCards = 0;
  career.spirit = tripSpirit(career);
  career.tripBooked = false;
}
