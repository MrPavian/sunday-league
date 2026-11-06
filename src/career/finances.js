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
import { starFans } from './bonuses.js';
import { isPro, payroll } from './contracts.js';
import { gateOf } from './tickets.js';
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
    const press = (career.flags?.pressWeeks > 0 ? 1.4 : 1) * (m.derby ? 1.8 : 1) * starFans(career); // Kreisblatt-Porträt, Derby, Stars der Liga (bonuses.js)
    const wf = { sonne: 1.2, hitze: 0.9, regen: 0.6, wind: 0.85, nebel: 0.8, frost: 0.7, schnee: 0.5 }[career.week?.weather?.id] ?? 1;
    const weatherFans = roofRelief(career) && wf < 1 ? 1 - (1 - wf) / 2 : wf; // Tribünendach: die Wetterbremse halbiert sich
    const pe = homeMatchEffects(career); // Platzsperre/Nachholspiel, Acker, Linien
    const gate = gateOf(career, level); // eigene Eintrittspreise und Dauerkarten (tickets.js); ohne Einstellung wie bisher
    const base = Math.round((level > 5 ? rng.int(...UPPER_FANS[Math.min(TOP_FIN, level)]) : level > 4 ? rng.int(80, 200) : level > 3 ? rng.int(45, 90) : level > 2 ? rng.int(30, 60) : level > 1 ? rng.int(18, 40) : rng.int(5, 14)) * press * weatherFans * fansMul(career) * pe.fans * gate.mul);
    const bv = prepared.bund ? BUND_VENUES[prepared.bund.venue] : null; // überregionaler Pokal: Spielort bestimmt die Kulisse
    const dk = bv ? 0 : Math.min(gate.dk, capacity(career)); // Dauerkarten-Inhaber kommen auch bei schlechtem Wetter
    const fans = bv ? prepared.match.crowd : Math.max(dk, Math.min(base, capacity(career))); // Bundespokal: die angezeigte Zuschauerzahl des Spiels wird abgerechnet
    career.flags ??= {};
    career.flags.fans = { round: career.round, n: fans }; // für die Unterschriftenlisten
    if (!bv) recordGate(career, base, fans, (prepared.humanIsAway ? prepared.home : prepared.away)?.name ?? ''); // Zuschauerstatistik (attendance.js)
    const wirt = (career.staff?.wirt ? 1.3 : 1) * salesMul(career, career.week?.weather?.id); // Wirt, Grill & Theke, Biergarten
    const wirt0 = bv ? bv.theke : 1; // im Stadion bleibt das meiste Geschäft beim Betreiber
    book(career, tr(`Getränkeverkauf (${fans} Zuschauer)${career.staff?.wirt ? ` – Wirt ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – mit Grill' : ''}`, `Drinks sales (${fans} spectators)${career.staff?.wirt ? ` – bar manager ${career.staff.wirt.name.split(' ')[0]}` : ''}${salesMul(career) > 1 ? ' – with barbecue' : ''}`), Math.round(fans * 2.5 * wirt * wirt0));
    // Bezirksliga: Eintritt (3 € – Kinder und Mitglieder frei, daher im Schnitt etwas weniger).
    if (bv) book(career, tr(`Eintrittsanteil ${BUND_GATE_SHARE * 100} % (${fans} Zuschauer)`, `Gate share ${BUND_GATE_SHARE * 100} % (${fans} spectators)`), Math.round(fans * ENTRY_FEE * BUND_GATE_SHARE));
    else if (level > 4 && dk) book(career, tr(`Eintritt (${fans - dk} Tageskarten, ${dk} Dauerkarten)`, `Gate money (${fans - dk} day tickets, ${dk} season tickets)`), Math.round((fans - dk) * gate.perFan));
    else if (level > 4) book(career, tr(`Eintritt (${fans} Zuschauer)`, `Gate money (${fans} spectators)`), Math.round(fans * gate.perFan));
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
const MEAN_FANS = [0, 9.5, 29, 45, 67.5, 140, 217.5, 295, 370, 1367, 9620, 28886, 39490]; // Mitte der Spannen in matchFinances (5–14, 18–40, 30–60, 45–90, 80–200, UPPER_FANS)
export const TOP_FIN = MEAN_FANS.length - 1; // höchste Stufe mit eigenen Werten (1. Liga)
export const homeUnit = (level) => Math.round(MEAN_FANS[Math.min(TOP_FIN, Math.max(1, level))] * (2.5 + (level > 4 ? entryFee(level) : 0)));

// Stufen 6–8 (Landesliga, Verbandsliga, Oberliga). Belegt ist nur die Oberliga: Oberliga Westfalen im Schnitt 298, 352 und
// 462 Zuschauer je Spiel (2022/23–2024/25, Infoboxen der Saisonartikel in der deutschen Wikipedia, abgerufen 2026-10-29),
// Mittel ≈ 370. Für die 6. und 7. Liga fand sich kein Ligaschnitt – die Mitte ist HERGELEITET (Nutzerentscheid 2026-10-29):
// gleichmäßig zwischen Bezirksliga (140) und Oberliga (370); die Spanne wie in der Bezirksliga ±43 % um die Mitte.
// Profiligen (Konzept Profiligen 2): Regionalliga 2023/24 im Schnitt 940 (Nord), 945 (Bayern) und 2217 (West) Zuschauer je Spiel
// (Saisonartikel „Fußball-Regionalliga Nord/Bayern/West 2023/24“, deutsche Wikipedia, abgerufen 2026-11-05), Mittel 1367;
// 3. Liga 2023/24: 9620 je Spiel („3. Fußball-Liga 2023/24“, ebenda). Spanne wie oben ±43 % um die Mitte.
// 2. Liga 2023/24: 28 886 je Spiel, 1. Liga („Bundesliga“) 39 490 („2. Fußball-Bundesliga 2023/24“, „Fußball-Bundesliga 2023/24“,
// deutsche Wikipedia, abgerufen 2026-11-05). Spanne wie oben ±43 %.
export const UPPER_FANS = { 6: [125, 310], 7: [170, 420], 8: [210, 530], 9: [780, 1955], 10: [5485, 13755], 11: [16465, 41307], 12: [22509, 56471] };
// Kosten und Erträge der Stufen 6–8, die nur bis zur Bezirksliga eingestellt waren (Kosten, Sponsoren, Feste, Turniere):
// mit der Zuschauerzahl hochgerechnet (hergeleitet, siehe oben), z. B. Oberliga 370 / 140 ≈ 2,6 × Bezirksliga.
export const upperScale = (level) => MEAN_FANS[Math.min(TOP_FIN, Math.max(5, level))] / MEAN_FANS[5];

// Ab der Kreisklasse kostet der Spielbetrieb: Verband, Versicherung, Trikotwäsche –
// und die guten Leute wollen Fahrgeld. Wer oben mitspielen will, muss rechnen. Stufen 6–10: 150 € × upperScale (hergeleitet;
// in den Profiligen stehen dafür Ordner, Stadion, Verwaltung).
// 2. und 1. Liga HERGELEITET aus dem DFL-Wirtschaftsreport 2025 (Saison 2023/24, Summen aller 18 Klubs, Tsd. €): Spielbetrieb,
// Medien, Werbung und Merchandising abzüglich Personal Spielbetrieb, je Klub ÷ 34 Spieltage – so wirtschaftet ein Ligamittlerer
// ohne Transfers und übrige Erträge etwa ausgeglichen. 2. Liga (273 421 + 288 271 + 216 538 + 96 430 − 296 909) / 18 / 34 ≈ 944 000 €,
// 1. Liga (598 974 + 1 702 707 + 1 146 103 + 285 436 − 1 721 994) / 18 / 34 ≈ 3 286 000 €. Darin stecken Verwaltung, Nachwuchs,
// Stadion und alles Übrige, was das Spiel nicht einzeln führt.
export const OPS_COST = [0, 0, 40, 70, 100, 150, 233, 316, 396, 1465, 10307, 944000, 3286000];
// Schiedsrichter-Spesen je Heimspiel (der Gastgeber zahlt), Stufen wie im Verband Westfalen, Saison 2025/26: Kreisliga 27 €,
// Bezirksliga 35 €, Landesliga 45 € + 2 × 35 € Assistenten, Westfalenliga 50 € + 2 × 40 €, Oberliga 75 € + 2 × 50 €
// (Kreisschiedsrichterausschuss Paderborn, https://www.flvw-kreis-paderborn.de/data/downloads/SR_Spesen_Kreis_PB_01.07.2025.pdf).
// Andere Verbände zahlen ähnlich (Bezirksliga 30–62 €, Oberliga 60–100 € für den Schiri). Annahme ohne Quelle: Assistenten erst
// ab der Landesliga. Fahrtkosten (0,30 €/km) fehlen, die Entfernungen kennt das Spiel nicht. Vorher pauschal 20–80 €.
// Regionalliga 400 € und 3. Liga 900 € (Schiri und zwei Assistenten) sind Spielwerte – keine Spesenordnung gefunden.
const REF_FEE = [0, 0, 27, 27, 27, 35, 115, 130, 175, 400, 900, 2500, 5000]; // 2./1. Liga: Spielwerte (das Gespann zahlt dort der Ligaverband, im Spiel der Gastgeber)
export const refFee = (level) => REF_FEE[Math.min(TOP_FIN, Math.max(1, level))];
export const FAHRGELD = { stark: 3, dorfstar: 6, superstar: 10, legende: 12 };
export const ENTRY_FEE = 2.2; // 3 € Eintritt, Kinder und Mitglieder frei
// Eintritt je Stufe (je Zuschauer, mit demselben Abschlag für Kinder und Mitglieder: 2,2 / 3). Landesliga 5 € (Rheinpfalz,
// 11.07.2015: bisher 4 €, Einigung auf 5 € vorgeschlagen; https://www.rheinpfalz.de/lokal/ludwigshafen_artikel,-frauen-m%C3%BCssen-k%C3%BCnftig-mehr-zahlen-_arid,375801.html).
// Verbandsliga 6 € und Oberliga 7 € HERGELEITET (je Stufe ein Euro mehr; kein Beleg gefunden).
// Regionalliga 11 € HERGELEITET aus zwei Stehplatzpreisen: 8 € (BSG Chemie Leipzig nach dem Aufstieg 2017, Sachsen Fernsehen) und
// 14,50 € (Stuttgarter Kickers, Stuttgarter Zeitung). 3. Liga 15 € HERGELEITET: kein Ligaschnitt gefunden; die 2. Bundesliga nimmt im
// Schnitt 12,55 € je Stehplatz und 24,70 € je Karte (2024/25, bundesliga.com „Ticketrekord“), die 3. Liga liegt darunter.
// 2. Liga 39 € und 1. Liga 64 € HERGELEITET: Erlöse aus dem Spielbetrieb je Klub (DFL-Wirtschaftsreport 2025: 273,4 Mio. € bzw.
// 599,0 Mio. € für 18 Klubs) ÷ 17 Heimspiele ÷ Zuschauerschnitt ≈ 30,90 € bzw. 49,60 € je Zuschauer, abzüglich der Theke (2,50 €)
// und mit dem Abschlag oben zurückgerechnet. Darin stecken Logen und Business-Plätze; der reine Ticketschnitt der 2. Liga lag
// 2024/25 bei 24,70 € (bundesliga.com).
const ENTRY_BY_LEVEL = { 6: 5, 7: 6, 8: 7, 9: 11, 10: 15, 11: 39, 12: 64 };
export const listPrice = (level) => ENTRY_BY_LEVEL[level] ?? 3; // Aushangpreis Stehplatz/Schnitt (Bezirksliga 3 €), tickets.js
export const meanFans = (level) => MEAN_FANS[Math.min(TOP_FIN, Math.max(1, level))];
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
  if (isPro(career)) {
    // Profiligen (contracts.js): Gehälter statt Aufwandsentschädigung, in der 3. Liga dazu das Fernsehgeld.
    const pay = payroll(career);
    if (pay.round) book(career, tr(`Gehälter (${pay.n} Vertragsspieler)`, `Wages (${pay.n} contracted players)`), -pay.round);
    const tv = TV_MONEY[career.level];
    if (tv) book(career, tr('Fernsehgeld', 'TV money'), tv);
    const mk = MARKETING[career.level];
    if (mk) book(career, tr('Vermarktung (Werbung, Fanartikel, Catering)', 'Marketing (advertising, merchandise, catering)'), mk);
    return;
  }
  const fg = fahrgeld(career);
  if (fg.total) book(career, fg.ae ? tr(`Aufwandsentschädigung für ${fg.n} Spieler`, `Expenses for ${fg.n} players`) : tr(`Fahrgeld für ${fg.n} gute Leute`, `Travel money for ${fg.n} good players`), -fg.total);
}
// Fernsehgeld je Spieltag: 3. Liga rund 1,31 Mio. € je Klub und Saison (DFB, Medienvertrag ab 2023/24) ÷ 38 Spieltage (HERGELEITET,
// wie die Gehälter in contracts.js). Regionalliga: kein nennenswertes Fernsehgeld (Spielwert 0, keine Zahl gefunden).
// 2. und 1. Liga: Medienerlöse je Klub (DFL-Wirtschaftsreport 2025, Saison 2023/24: 288,3 bzw. 1702,7 Mio. € für 18 Klubs) ÷ 34.
export const TV_MONEY = { 10: Math.round(1310000 / 38), 11: Math.round(288271000 / 18 / 34), 12: Math.round(1702707000 / 18 / 34) };
// Vermarktung in der 3. Liga je Spieltag: SPIELWERT. Echte Drittligisten nehmen im Schnitt 16,2 Mio. € ein (DFB-Saisonreport
// 2023/24), nur ein Teil davon über Fernsehen und Eintritt; ihre übrigen Kosten außer den Gehältern bildet das Spiel nicht ab.
// Eingestellt, dass ein Verein mit dem Kader eines Ligamittleren und dem Drittliga-Stadion etwa ausgeglichen wirtschaftet
// (scripts/pro-audit.mjs, Seed 5: ohne −368 000 € je Saison, mit +72 000 €; der stärkste Kader der Liga −591 000 €).
// 2. und 1. Liga HERGELEITET: Werbung und Merchandising je Klub (DFL-Wirtschaftsreport 2025: 216,5 + 96,4 bzw. 1146,1 + 285,4 Mio. €
// für 18 Klubs) ÷ 34 Spieltage.
export const MARKETING = { 10: 40000, 11: Math.round((216538000 + 96430000) / 18 / 34), 12: Math.round((1146103000 + 285436000) / 18 / 34) };

// Saisonende: Boni auszahlen, Verträge laufen aus, Stimmung aus der Fahrt übernehmen.
export function closeSeasonFinances(career, summary) {
  closeSponsors(career, summary);
  career.fines = {};
  career.seasonCards = 0;
  career.spirit = tripSpirit(career);
  career.tripBooked = false;
}
