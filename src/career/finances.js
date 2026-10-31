// Mannschaftskasse, Strafenkatalog, Sponsoren und die Saisonabschlussfahrt.
import { recordGate } from './attendance.js';
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { closeSponsors, normalizeSponsors, paySponsors } from './sponsors.js';
import { capacity, fansMul, roofRelief, salesMul, travelMul } from './facilities.js';
import { homeMatchEffects, rentPerMatch } from './platz.js';
import { playerOf } from './career.js';
import { tripSpirit } from './trip.js';
import { BUND_GATE_SHARE, BUND_VENUES } from './bundespokal.js';
export { bookTrip } from './trip.js';

export const START_CASH = 100;
export const KIT_COST = 60;
export const MEMBER_FEE = 3; // pro Spieler und Spieltag

// Der Strafenkatalog – hängt laminiert in der Kabine.
export const FINES = [
  { id: 'whiff', label: tr('Luftloch', 'Air shot'), amount: 1 },
  { id: 'car', label: tr('Ans Auto geschossen', 'Hit a car'), amount: 2 },
  { id: 'late', label: tr('Zu spät / erst zur 2. Halbzeit', 'Late / only for the 2nd half'), strict: tr('Zu spät (nicht auf dem Spielbericht)', 'Late (not on the match report)'), amount: 5 },
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
  normalizeSponsors(career);
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
  if (!homeHuman) awayTravel(career, fixture);
  if (!homeHuman && prepared.bund) {
    // Auswärts beim Profi: Anteil am Eintritt des großen Stadions (Getränke behält der Gastgeber).
    const fansA = prepared.match.crowd; // die Zahl, die im Stadion angezeigt wird
    book(career, tr(`Eintrittsanteil ${BUND_GATE_SHARE * 100} % (${fansA} Zuschauer im Stadion)`, `Gate share ${BUND_GATE_SHARE * 100} % (${fansA} spectators in the stadium)`), Math.round(fansA * ENTRY_FEE * BUND_GATE_SHARE));
  }
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
    const wf = { sonne: 1.2, hitze: 0.9, regen: 0.6, wind: 0.85, nebel: 0.8, frost: 0.7, schnee: 0.5 }[career.week?.weather?.id] ?? 1;
    const weatherFans = roofRelief(career) && wf < 1 ? 1 - (1 - wf) / 2 : wf; // Tribünendach: die Wetterbremse halbiert sich
    const pe = homeMatchEffects(career); // Platzsperre/Nachholspiel, Acker, Linien
    const base = Math.round((level > 5 ? rng.int(...UPPER_FANS[Math.min(8, level)]) : level > 4 ? rng.int(80, 200) : level > 3 ? rng.int(45, 90) : level > 2 ? rng.int(30, 60) : level > 1 ? rng.int(18, 40) : rng.int(5, 14)) * press * weatherFans * fansMul(career) * pe.fans);
    const bv = prepared.bund ? BUND_VENUES[prepared.bund.venue] : null; // überregionaler Pokal: Spielort bestimmt die Kulisse
    const fans = bv ? prepared.match.crowd : Math.min(base, capacity(career)); // Bundespokal: die angezeigte Zuschauerzahl des Spiels wird abgerechnet
    career.flags ??= {};
    career.flags.fans = { round: career.round, n: fans }; // für die Unterschriftenlisten
    if (!bv) recordGate(career, base, fans, (prepared.humanIsAway ? prepared.home : prepared.away)?.name ?? ''); // Zuschauerstatistik (attendance.js)
    const wirt = (career.staff?.wirt ? 1.3 : 1) * salesMul(career, career.week?.weather?.id); // Wirt, Grill & Theke, Biergarten
    const wirt0 = bv ? bv.theke : 1; // im Stadion bleibt das meiste Geschäft beim Betreiber
    book(career, tr(`Getränkeverkauf (${fans} Zuschauer)${career.staff?.wirt ? ` – Wirt ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – mit Grill' : ''}`, `Drinks sales (${fans} spectators)${career.staff?.wirt ? ` – bar manager ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – with barbecue' : ''}`), Math.round(fans * 2.5 * wirt * wirt0));
    // Bezirksliga: Eintritt (3 € – Kinder und Mitglieder frei, daher im Schnitt etwas weniger).
    if (bv) book(career, tr(`Eintrittsanteil ${BUND_GATE_SHARE * 100} % (${fans} Zuschauer)`, `Gate share ${BUND_GATE_SHARE * 100} % (${fans} spectators)`), Math.round(fans * ENTRY_FEE * BUND_GATE_SHARE));
    else if (level > 4) book(career, tr(`Eintritt (${fans} Zuschauer)`, `Gate money (${fans} spectators)`), Math.round(fans * entryFee(level)));
    if (level > 1) {
      book(career, tr('Schiri-Gebühr', 'Referee fee'), -refFee(level));
      // Tribüne oder Stadion kosten ihre eigene Miete (bundevents.js) – dann keine zusätzliche Platzmiete.
      // Pachtvertrag mit der Gemeinde (platz.js): Standard 15 €, mit Platzwart die Hälfte, Langzeitpacht 20 % billiger, Eigentum 0.
      const rent = rentPerMatch(career);
      if (!(bv && bv.rentUnits > 0) && rent > 0) book(career, career.staff?.platzwart ? tr('Platzmiete (Platzwart macht vieles selbst)', 'Pitch rent (groundsman does a lot himself)') : tr('Platzmiete Waldesruh', 'Pitch rent Waldesruh'), -rent);
    }
    for (const [text, amount] of pe.book) book(career, text, amount);
  }
}

// Durchschnittliche Einnahmen eines Heimspiels der Stufe (mittlere Zuschauerzahl × Theke, ab Bezirksliga plus Eintritt):
// Maßeinheit für Prämien und Mieten im überregionalen Pokal (bundespokal.js).
const MEAN_FANS = [0, 9.5, 29, 45, 67.5, 140, 217.5, 295, 370]; // Mitte der Spannen in matchFinances (5–14, 18–40, 30–60, 45–90, 80–200, UPPER_FANS)
export const homeUnit = (level) => Math.round(MEAN_FANS[Math.min(8, Math.max(1, level))] * (2.5 + (level > 4 ? entryFee(level) : 0)));

// Stufen 6–8 (Landesliga, Verbandsliga, Oberliga). Belegt ist nur die Oberliga: Oberliga Westfalen im Schnitt 298, 352 und
// 462 Zuschauer je Spiel (2022/23–2024/25, Infoboxen der Saisonartikel in der deutschen Wikipedia, abgerufen 2026-10-29),
// Mittel ≈ 370. Für die 6. und 7. Liga fand sich kein Ligaschnitt – die Mitte ist HERGELEITET (Nutzerentscheid 2026-10-29):
// gleichmäßig zwischen Bezirksliga (140) und Oberliga (370); die Spanne wie in der Bezirksliga ±43 % um die Mitte.
export const UPPER_FANS = { 6: [125, 310], 7: [170, 420], 8: [210, 530] };
// Kosten und Erträge der Stufen 6–8, die nur bis zur Bezirksliga eingestellt waren (Kosten, Sponsoren, Feste, Turniere):
// mit der Zuschauerzahl hochgerechnet (hergeleitet, siehe oben), z. B. Oberliga 370 / 140 ≈ 2,6 × Bezirksliga.
export const upperScale = (level) => MEAN_FANS[Math.min(8, Math.max(5, level))] / MEAN_FANS[5];

// Ab der Kreisklasse kostet der Spielbetrieb: Verband, Versicherung, Trikotwäsche –
// und die guten Leute wollen Fahrgeld. Wer oben mitspielen will, muss rechnen. Stufen 6–8: 150 € × upperScale.
export const OPS_COST = [0, 0, 40, 70, 100, 150, 233, 316, 396];
// Schiedsrichter-Spesen je Heimspiel (der Gastgeber zahlt), Stufen wie im Verband Westfalen, Saison 2025/26: Kreisliga 27 €,
// Bezirksliga 35 €, Landesliga 45 € + 2 × 35 € Assistenten, Westfalenliga 50 € + 2 × 40 €, Oberliga 75 € + 2 × 50 €
// (Kreisschiedsrichterausschuss Paderborn, https://www.flvw-kreis-paderborn.de/data/downloads/SR_Spesen_Kreis_PB_01.07.2025.pdf).
// Andere Verbände zahlen ähnlich (Bezirksliga 30–62 €, Oberliga 60–100 € für den Schiri). Annahme ohne Quelle: Assistenten erst
// ab der Landesliga. Fahrtkosten (0,30 €/km) fehlen, die Entfernungen kennt das Spiel nicht. Vorher pauschal 20–80 €.
const REF_FEE = [0, 0, 27, 27, 27, 35, 115, 130, 175];
export const refFee = (level) => REF_FEE[Math.min(8, Math.max(1, level))];
export const FAHRGELD = { stark: 3, dorfstar: 6, superstar: 10, legende: 12 };
export const ENTRY_FEE = 2.2; // 3 € Eintritt, Kinder und Mitglieder frei
// Eintritt je Stufe (je Zuschauer, mit demselben Abschlag für Kinder und Mitglieder: 2,2 / 3). Landesliga 5 € (Rheinpfalz,
// 11.07.2015: bisher 4 €, Einigung auf 5 € vorgeschlagen; https://www.rheinpfalz.de/lokal/ludwigshafen_artikel,-frauen-m%C3%BCssen-k%C3%BCnftig-mehr-zahlen-_arid,375801.html).
// Verbandsliga 6 € und Oberliga 7 € HERGELEITET (je Stufe ein Euro mehr; kein Beleg gefunden).
const ENTRY_BY_LEVEL = { 6: 5, 7: 6, 8: 7 };
export const entryFee = (level) => (ENTRY_BY_LEVEL[level] ? +((ENTRY_BY_LEVEL[level] * ENTRY_FEE) / 3).toFixed(2) : ENTRY_FEE);

// Bezirksliga: Aufwandsentschädigung statt Fahrgeld (je Woche). Recherche: etwa die Hälfte
// der Spieler wird bezahlt, typisch 100–250 € im Monat; mehr als 250 € im Monat erlaubt der
// DFB für Amateure nicht (≈ 58 € je Woche).
export const AE_WEEK = { stark: 25, dorfstar: 40, superstar: 55, legende: 58 };
export function fahrgeld(career) {
  const level = career.level ?? 1;
  const human = career.clubs.find((c) => c.human);
  if (level >= 5) {
    let total = 0;
    let n = 0;
    for (const idx of human.squad) {
      if (career.coach?.idx === idx) continue;
      const pay = AE_WEEK[playerOf(career, idx).tier] ?? 0;
      if (pay) {
        total += pay;
        n++;
      }
    }
    return { total: Math.round(total), n, ae: true };
  }
  const mul = level >= 4 ? 2.6 : level >= 3 ? 2 : level === 2 ? 1.2 : 0;
  if (!mul) return { total: 0, n: 0 };
  let total = 0;
  let n = 0;
  for (const idx of human.squad) {
    if (career.coach?.idx === idx) continue;
    const pay = FAHRGELD[playerOf(career, idx).tier] ?? 0;
    if (pay) {
      total += pay * mul;
      n++;
    }
  }
  return { total: Math.round(total), n };
}

// Auswärts: Sprit für die Fahrgemeinschaften (mit Vereinsbus die Hälfte).
export function awayTravel(career, fixture) {
  const level = career.level ?? 1;
  const human = career.clubs.find((c) => c.human);
  if (level < 2 || fixture.away !== human.id) return;
  book(career, tr('Auswärtsfahrt (Sprit)', 'Away trip (fuel)'), -Math.round((level === 2 ? 10 : level === 3 ? 20 : level === 4 ? 25 : 35) * travelMul(career)));
}

// Jede Woche: Mitgliedsbeiträge und Sponsorengeld.
export function weeklyFinances(career) {
  const human = career.clubs.find((c) => c.human);
  const fee = MEMBER_FEE + (career.clubLife?.fee ?? 0); // Beschluss der Jahreshauptversammlung
  book(career, tr(`Mitgliedsbeiträge (${human.squad.length} × ${fee} €)`, `Membership fees (${human.squad.length} × €${fee})`), human.squad.length * fee);
  paySponsors(career);
  const ops = OPS_COST[career.level ?? 1] ?? 0;
  if (ops) book(career, tr('Spielbetrieb (Verband, Versicherung, Trikotwäsche)', 'Running the team (league fees, insurance, kit washing)'), -ops);
  const fg = fahrgeld(career);
  if (fg.total) book(career, fg.ae ? tr(`Aufwandsentschädigung für ${fg.n} Spieler`, `Expenses for ${fg.n} players`) : tr(`Fahrgeld für ${fg.n} gute Leute`, `Travel money for ${fg.n} good players`), -fg.total);
}

// Saisonende: Boni auszahlen, Verträge laufen aus, Stimmung aus der Fahrt übernehmen.
export function closeSeasonFinances(career, summary) {
  closeSponsors(career, summary);
  career.fines = {};
  career.seasonCards = 0;
  career.spirit = tripSpirit(career);
  career.tripBooked = false;
}
