// Eintrittspreise selbst festlegen und Dauerkarten (ROADMAP 11.17 Punkt 3, 2026-11-06). Ab der Bezirksliga (dort gibt es Eintritt).
// Ohne eigene Einstellung (career.tickets fehlt) bleibt alles wie bisher: Ligapreis, keine Dauerkarten.
//  - Preise als Faktor zum Ligapreis (finances.js ENTRY_BY_LEVEL), 50 % bis 200 % (Spielwert).
//  - Sitzplätze ab dem Drittliga-Stadion, eigener Preis. Anteil der Sitzplätze aus den Ausbauten (hergeleitet): Drittliga-Stadion
//    2000 von 5001, Arena 3000 von 15 000 (Zulassung 2. Liga: 3000 überdachte Sitzplätze), Sitzplatzausbau 8000 von 15 000, Großarena
//    gleicher Anteil (Spielwert). Sitzplatz-Ligapreis = 1,8 × Stehplatz – hergeleitet aus Tageskarten 3 € / 5 € (BVB-Frauen,
//    Regionalliga 2026/27) und 5 € / 10 € (BVB U23, 3. Liga). Der Ligapreis bleibt der Schnitt je Zuschauer wie bisher.
//  - Nachfrage: Zuschauer × (Preis/Ligapreis)^−e, unter dem Ligapreis e = 0,5, darüber e = 1,5 (Spielwerte: Studien finden einen
//    Preiseinfluss auf den Stadionbesuch, aber keinen belastbaren Wert, z. B. Wicker u. a. 2017, Applied Economics 49). So lohnt
//    sich teurer nur, wenn das Stadion ohnehin voll ist.
//  - Dauerkarten: zum Saisonstart (oder beim Einschalten für die restlichen Heimspiele) verkauft, Geld sofort. Anteil an den
//    erwarteten Zuschauern: 1. Liga 55 %, 2. Liga 57 % (Anteil der Dauerkarten an allen verkauften Tickets 2025/26, Ligaverband laut
//    Sky); 3. Liga 45 %, Regionalliga 35 %, Bezirksliga bis Oberliga 15 % (Spielwerte, keine Zahl gefunden). Rabatt 20 % auf die
//    Tageskarte (Spielwert, keine Quelle). Dauerkarten-Inhaber kommen auch bei Regen; 15 % bleiben trotzdem weg (Spielwert).
import { tr } from '../core/i18n.js';
import { book, entryFee, listPrice, meanFans } from './finances.js';
import { capacity, fansMul, hasFacility } from './facilities.js';
import { humanClub } from './career.js';

export const TICKETS = {
  from: 5,
  min: 0.5,
  max: 2,
  step: 0.1,
  eBelow: 0.5,
  eAbove: 1.5,
  seatMul: 1.8,
  dkShare: { 5: 0.15, 6: 0.15, 7: 0.15, 8: 0.15, 9: 0.35, 10: 0.45, 11: 0.57, 12: 0.55 },
  dkDiscount: 0.2,
  noShow: 0.15,
};
const SEATS = [['grossarena', 8000 / 15000], ['sitzplatz8000', 8000 / 15000], ['arena', 3000 / 15000], ['drittliga', 2000 / 5001]];
export const seatShare = (c) => SEATS.find(([id]) => hasFacility(c, id))?.[1] ?? 0;
export const ticketsOn = (c, level = c.level ?? 1) => level >= TICKETS.from;
const clamp = (f) => Math.round(Math.max(TICKETS.min, Math.min(TICKETS.max, f)) * 10) / 10;

// Preisfaktoren (1 = Ligapreis) und daraus: Verhältnis des Mischpreises zum Ligapreis.
export function priceRatio(c) {
  const t = c.tickets;
  if (!t) return 1;
  const s = seatShare(c);
  return (1 - s) * (t.stand ?? 1) + s * (t.seat ?? 1);
}
export const demandMul = (r) => (r === 1 ? 1 : r < 1 ? r ** -TICKETS.eBelow : r ** -TICKETS.eAbove);

// Preise in Euro (Liste, wie auf dem Aushang): Stehplatz und Sitzplatz.
export function prices(c, level = c.level ?? 1) {
  const s = seatShare(c);
  const p0 = listPrice(level) / (1 + (TICKETS.seatMul - 1) * s); // Stehplatz so, dass der Schnitt dem Ligapreis entspricht
  const t = c.tickets ?? {};
  const half = (v) => Math.max(0.5, Math.round(v * 2) / 2); // Aushang auf 50 Cent gerundet (abgerechnet wird der genaue Faktor)
  return { stand: half(p0 * (t.stand ?? 1)), seat: s ? half(p0 * TICKETS.seatMul * (t.seat ?? 1)) : null, seats: s };
}

// Für die Heimspiel-Abrechnung (finances.js matchFinances): Nachfrage-Faktor, Eintritt je zahlendem Zuschauer, Dauerkarten im Stadion.
export function gateOf(c, level = c.level ?? 1) {
  if (!c.tickets || !ticketsOn(c, level)) return { mul: 1, perFan: entryFee(level), dk: 0 };
  const r = priceRatio(c);
  const sold = c.tickets.sold?.season === c.season ? c.tickets.sold.n : 0;
  return { mul: demandMul(r), perFan: +(entryFee(level) * r).toFixed(2), dk: Math.round(sold * (1 - TICKETS.noShow)) };
}

const homeGamesLeft = (c) => {
  const me = humanClub(c).id;
  return c.fixtures.slice(c.round ?? 0).filter((round) => round.some((f) => f.home === me && !f.result)).length;
};

// Dauerkarten verkaufen (Saisonstart oder Einschalten): Geld für die restlichen Heimspiele sofort.
export function sellSeasonTickets(c) {
  const t = c.tickets;
  const level = c.level ?? 1;
  if (!t?.dk || !ticketsOn(c, level) || t.sold?.season === c.season) return null;
  const games = homeGamesLeft(c);
  if (!games) return null;
  const r = priceRatio(c);
  const expected = Math.min(capacity(c), meanFans(level) * fansMul(c) * demandMul(r));
  const n = Math.round(expected * (TICKETS.dkShare[Math.min(12, level)] ?? 0.15));
  if (!n) return null;
  const perGame = entryFee(level) * r * (1 - TICKETS.dkDiscount);
  const amount = Math.round(n * perGame * games);
  t.sold = { season: c.season, n, games, amount };
  book(c, tr(`Dauerkarten (${n} Stück, ${games} Heimspiele)`, `Season tickets (${n}, ${games} home games)`), amount);
  return t.sold;
}

// Einstellungen aus dem Vereinsheim.
export function setPrice(c, kind, delta) {
  if (!ticketsOn(c)) return false;
  c.tickets ??= { stand: 1, seat: 1, dk: false };
  if (kind === 'seat' && !seatShare(c)) return false;
  c.tickets[kind] = clamp((c.tickets[kind] ?? 1) + delta);
  return true;
}
export function setSeasonTickets(c, on) {
  if (!ticketsOn(c)) return false;
  c.tickets ??= { stand: 1, seat: 1, dk: false };
  c.tickets.dk = !!on;
  if (on) sellSeasonTickets(c);
  return true;
}

// Hook (hooks.js): zur neuen Saison die Dauerkarten verkaufen.
export function nextSeason(c) {
  sellSeasonTickets(c);
}
