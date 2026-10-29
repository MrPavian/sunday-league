// Preise für Saisonabschlussfahrt und Trainingslager je Person (vom Nutzer gewünscht, ROADMAP 11.10: nach Teilnehmerzahl,
// Liga und Professionalität staffeln). Wie im echten Amateurfußball zahlt jeder seinen Teil selbst; der Verein gibt einen
// Zuschuss, den der Nutzer in der Kasse festlegt (Nutzerentscheid 2026-10-29).
//
// Preise je Person (abgerufen 2026-10-29, Anbieter- und Portalangaben, je nach Termin teurer):
//  - Kegeltour, 2 Nächte mit Essen und Bahn: 99–120 € (https://www.verwoehnwochenende.de/kurzurlaub/thema/kegelreisen-und-bowling) → 110 €
//  - Hütte im Harz, Selbstversorger: 16–39 € je Nacht (https://www.gruppenhaus.de/andreashuette-sankt-andreasberg-hs2295.html,
//    https://www.gruppenhaus.de/gaestehaus-harzluft-sankt-andreasberg-hs11996.html) → 2 Nächte à 27,50 € = 55 €
//  - Mallorca, 4 Tage mit Flug und Hotel: 400–550 € (https://www.red-holiday.de/mannschaftsfahrt-nach-mallorca/,
//    https://air-mallorca.de/gruppenreisen-an-den-ballermann) → 450 €
//  - Sportschule des Verbands, Vollpension: ab 50 € je Nacht (FLVW, SportCentrum Kaiserau, Sommer 2026,
//    https://flvw.de/de/exklusiv-fuer-vereine-sommer-trainingslager-2026-im-sportcentrum-kaiserau.htm; NFV Barsinghausen
//    38–64,50 €) → 2 Nächte à 50 € = 100 €
//  - Trainingslager in Belek (Türkei), 5–6 Tage mit Flug, All-inclusive, Plätze: 719–949 € (https://www.soccatours.com/fussball-trainingslager/tuerkei/belek/limak-atlantis-deluxe,
//    …/club-mega-saray, …/hotel-bellis-deluxe) → 800 €
import { humanClub } from './career.js';
import { isCoach } from './personal.js';

export const PER_PERSON = { kegeltour: 110, harz: 55, mallorca: 450, sportschule: 100, belek: 800 };
// Zuschuss des Vereins (Anteil am Preis), wählbar in der Kasse. Standard: ein Viertel (Spielwert).
export const SHARES = [0, 0.25, 0.5, 0.75, 1];
export const tripShare = (c) => c.tripShare ?? 0.25;
export const setTripShare = (c, s) => {
  if (SHARES.includes(s)) c.tripShare = s;
};
// Wer mitfährt, hängt am Eigenanteil (Spielwert, keine Quelle): ohne Eigenanteil alle, je 100 € Eigenanteil 10 % weniger,
// mindestens 40 % der Mannschaft.
export const joinRate = (own) => Math.max(0.4, Math.min(1, 1 - own / 1000));

// Kosten einer Fahrt: Teilnehmer, Preis je Person, Anteil des Vereins und der Spieler.
export function travelCost(c, key) {
  const per = PER_PERSON[key];
  const players = humanClub(c).squad.filter((idx) => !isCoach(c, idx)).length;
  const share = tripShare(c);
  const own = Math.round(per * (1 - share));
  const people = Math.max(1, Math.round(players * joinRate(own)));
  return { per, own, share, people, players, club: Math.round(per * share * people) };
}
