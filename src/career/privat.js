// Privatleben des Trainers (ROADMAP 11.17 Punkt 17, Nutzerwunsch 2026-11-10): eigenes Geld, Ausgaben mit Wirkung auf Auftreten,
// Trainertypus und Stellung, dazu Familienereignisse (Partner kennenlernen, zusammenziehen, heiraten, Kinder, Krise, Trennung,
// Pflege der Eltern, Trauerfall). Nur für selbst angelegte Trainer (coach.relation); alte Spielstände ohne diese Angabe bleiben
// wie bisher.
//
// EINKOMMEN (je Saison, in gleichen Teilen je Spieltag aufs private Konto):
//  - Was vom eigenen Beruf übrig bleibt: 3000 € (hergeleitet: rund 10 % Sparquote bei gut 2500 € netto im Monat – Größenordnung
//    der Angaben des Statistischen Bundesamts, nicht nachgeschlagen), bis einschließlich Oberliga.
//  - Vom Verein: Bezirksliga 3000 € (Übungsleiterfreibetrag nach § 3 Nr. 26 EStG, 3000 € im Jahr seit 2021 – so viel darf ein Verein
//    steuerfrei zahlen); Landes-, Verbands-, Oberliga 4800 / 7200 / 12 000 € (Spielwerte, keine belastbare Quelle);
//    Regionalliga 35 000 € (einzige gefundene Zahl, kuechenfibel.de ohne Methodik – schwache Quelle); 3. Liga 150 000 €,
//    2. Liga 400 000 € (Spielwerte, Quellen widersprechen sich); 1. Liga 1,4 Mio. € (Schätzungen der Bild für 2025/26: Spanne
//    0,84 bis 7 Mio. €, 16 von 18 Trainern siebenstellig; 1,4 Mio. € ist ein Wert aus dieser Liste).
//  - Das Gehalt wird NICHT zusätzlich aus der Vereinskasse gebucht: Die laufenden Kosten des Spielbetriebs (finances.js) sind je
//    Liga bereits als Ganzes angesetzt bzw. aus dem Personalaufwand hergeleitet – der Trainer steckt darin.
//  - Im Präsidium (president.js): nur der eigene Beruf, das Amt ist ein Ehrenamt.
//
// AUSGABEN (alle Preise Spielwerte in der Größenordnung des echten Lebens): Wohnen, Auto, Kleidung je fünf Stufen (eine davon
// besitzt man), Luxus einzeln, dazu Spenden an den Verein. Beim Wechsel der Stufe gibt es einen Teil des alten Preises zurück
// (Wohnen 80 %, Auto 50 %, Kleidung nichts). Unterhalt je Saison. Ist das Konto im Minus, kann man nichts kaufen, und zu Hause
// hängt der Haussegen schief.
//
// WIRKUNG (Spielwerte):
//  - Auftreten = Summe der Stufen. Jede Liga hat ein übliches Maß (EXPECT). Passt es (0 bis +2), stärkt das in den Profiligen
//    die Stellung beim Vorstand und den Ruf (natcoach.js coachRep). Deutlich drüber im Amateurverein: Die Kabine tuschelt
//    (Stimmung). Deutlich drunter im Profifußball: Die Presse spottet, der Vorstand rümpft die Nase (Vertrauen).
//  - Wohnen ab Stufe 1: zu Hause ist es entspannter (Geduld der Familie). Auto ab Stufe 1: weniger Lauferei (Energie).
//  - Trainertypus: ergibt sich aus dem Verhalten (nicht wählbar) und wirkt einmal je Saison.
//
// GEHALT VERHANDELN (Spielwerte, 2026-11-11): Wo der Verein zahlt (ab Bezirksliga), kommt einmal je Saison das Gespräch mit dem
// Vorstand. Das Ergebnis ist ein Faktor auf das übliche Gehalt der Liga (0,7 bis 1,5). Ob eine Forderung durchgeht, hängt am
// Vertrauen des Vorstands; eine abgelehnte Forderung kostet Vertrauen, ein Verzicht bringt welches. Ein Verein, der im Sommer um
// dich geworben hat, zahlt von sich aus 10 % mehr; nach einer Entlassung fängt man beim Üblichen an. Wie das Gehalt selbst wird
// auch der Aufschlag nicht aus der Vereinskasse gebucht (siehe oben).
//
// UMZUG (Spielwerte, 2026-11-11): Ein Wechsel zu einem Verein ab der Regionalliga oder in eine andere Liga ab der Verbandsliga
// ist zu weit zum täglichen Fahren. Du pendelst zunächst (Zweitwohnung: Kosten je Saison, zehrt an Kraft und Familie), bis du
// umziehst: Grundkosten plus 5 % vom Wert des eigenen Zuhauses (Nebenkosten für Verkauf und Neukauf). Der Umzug verlangt der
// Familie etwas ab (Partnerin oder Partner, jedes Schulkind). Wechsel in den Ligen darunter bleiben in der Gegend.
import { tr } from '../core/i18n.js';
import { book } from './finances.js';
import { playerOf } from './career.js';
import { adjustEnergy, adjustPatience, isPresident, RED, sendAway, setRelation } from './personal.js';
import { board, trustOf } from './pressure.js';
import { diff } from './difficulty.js';

export const PAY = {
  job: 3000,
  jobUntil: 8,
  club: { 5: 3000, 6: 4800, 7: 7200, 8: 12000, 9: 35000, 10: 150000, 11: 400000, 12: 1400000 },
};
// Übliches Auftreten je Liga (Summe der Stufen).
export const EXPECT = (level) => (level >= 12 ? 10 : level === 11 ? 8 : level === 10 ? 6 : level === 9 ? 4 : level >= 5 ? 2 : 0);

export const SAVER_MIN = 20000;
export const SALARY = { from: 5, min: 0.7, max: 1.5, ask: 0.2, fair: 0.1, waive: 0.1, summer: 1.1 };
export const MOVE = { farFrom: 9, stateFrom: 7, base: 3000, homeShare: 0.05, second: 6000, partner: -8, school: -4 };

const T = (de, en) => ({ de, en });
export const GOODS = {
  home: {
    label: T('Wohnen', 'Home'),
    back: 0.8,
    tiers: [
      { name: T('Mietwohnung', 'Rented flat'), price: 0, upkeep: 0 },
      { name: T('Eigentumswohnung', 'Own flat'), price: 250000, upkeep: 3000 },
      { name: T('Reihenhaus', 'Terraced house'), price: 450000, upkeep: 5000 },
      { name: T('Einfamilienhaus mit Garten', 'Detached house with garden'), price: 800000, upkeep: 8000 },
      { name: T('Villa am Stadtrand', 'Villa on the edge of town'), price: 3000000, upkeep: 30000 },
    ],
  },
  car: {
    label: T('Auto', 'Car'),
    back: 0.5,
    tiers: [
      { name: T('Fahrrad und Mitfahrgelegenheit', 'Bike and lifts from team-mates'), price: 0, upkeep: 0 },
      { name: T('Gebrauchter Kombi', 'Used estate car'), price: 8000, upkeep: 1500 },
      { name: T('Neuer Mittelklassewagen', 'New mid-range car'), price: 35000, upkeep: 2500 },
      { name: T('Oberklasse-Limousine', 'Executive saloon'), price: 90000, upkeep: 5000 },
      { name: T('Sportwagen', 'Sports car'), price: 220000, upkeep: 10000 },
    ],
  },
  wear: {
    label: T('Kleidung', 'Clothes'),
    back: 0,
    tiers: [
      { name: T('Alter Trainingsanzug', 'Old tracksuit'), price: 0, upkeep: 0 },
      { name: T('Vereinsjacke und ordentliche Schuhe', 'Club jacket and decent shoes'), price: 300, upkeep: 0 },
      { name: T('Anzug von der Stange', 'Off-the-peg suit'), price: 1500, upkeep: 200 },
      { name: T('Maßanzug', 'Tailored suit'), price: 6000, upkeep: 800 },
      { name: T('Designer-Garderobe', 'Designer wardrobe'), price: 30000, upkeep: 4000 },
    ],
  },
};
export const LUX = {
  uhr: { name: T('Schweizer Uhr', 'Swiss watch'), price: 12000, upkeep: 0, glanz: 1 },
  boot: { name: T('Motorboot am See', 'Motorboat on the lake'), price: 150000, upkeep: 8000, glanz: 2 },
  ferienhaus: { name: T('Ferienhaus am Meer', 'Holiday home by the sea'), price: 600000, upkeep: 15000, glanz: 3 },
};
// Fernreise: einmal je Saison, nichts zum Besitzen – Erholung für alle.
export const TRIP = { price: 8000, patience: 12, energy: 10 };
export const DONATE = { share: 0.1, min: 100, mood: 0.02, trust: 1 };
export const WEDDING = { small: 500, big: 15000 };
export const HELP = { counselling: 800, holiday: 3000, care: 2400 };

const name = (x) => tr(x.de, x.en);
export const goodName = (kind, tier) => name(GOODS[kind].tiers[tier].name);
export const luxName = (id) => name(LUX[id].name);
export const kindLabel = (kind) => name(GOODS[kind].label);

// Nur selbst angelegte Trainer haben ein Privatleben mit Konto (alte Spielstände ohne coach.relation bleiben, wie sie sind).
export const privatOn = (c) => !!c.coach?.relation;
export function privat(c) {
  const k = c.coach;
  if (!privatOn(c)) return null;
  k.privat ??= { wallet: 0, own: { home: 0, car: 0, wear: 0 }, lux: [], donated: 0, earned: 0, tripSeason: 0, heavy: true };
  // Bestehende Beziehung aus dem Trainer-Editor: Der Mensch an deiner Seite bekommt einen Namen (fest je Spielstand).
  if (k.relation !== 'single' && !k.partnerName) {
    k.partnerSex ??= 'w';
    const list = k.partnerSex === 'm' ? NAMES_M : NAMES_W;
    k.partnerName = list[Math.abs((c.seed ?? 0) * 7 + 3) % list.length];
    k.flags.together ??= true;
  }
  return k.privat;
}

// Einkommen je Saison.
export function seasonIncome(c) {
  const level = c.level ?? 1;
  const job = level <= PAY.jobUntil ? PAY.job : 0;
  if (isPresident(c)) return PAY.job;
  return job + Math.round((PAY.club[Math.min(12, level)] ?? 0) * salaryFactor(c));
}
// Ausgehandelter Faktor auf das übliche Gehalt der Liga (1 = üblich).
export const salaryFactor = (c) => c.coach?.privat?.salary ?? 1;
export const clubPays = (c) => privatOn(c) && !isPresident(c) && (c.level ?? 1) >= SALARY.from;
const weeks = (c) => Math.max(1, c.fixtures?.length ?? 1);
export const weeklyIncome = (c) => Math.round(seasonIncome(c) / weeks(c));

export function glanz(c) {
  const p = privat(c);
  if (!p) return 0;
  return p.own.home + p.own.car + p.own.wear + p.lux.reduce((s, id) => s + (LUX[id]?.glanz ?? 0), 0);
}
// Abstand zum Üblichen der Liga und was das heißt.
export function auftreten(c) {
  const level = c.level ?? 1;
  const diff = glanz(c) - EXPECT(level);
  const kind = diff >= 3 && level <= 8 ? 'protz' : diff <= -4 && level >= 9 ? 'schlicht' : diff >= 0 && diff <= 2 && level >= 9 ? 'passend' : 'neutral';
  return { diff, kind, glanz: glanz(c), expect: EXPECT(level) };
}
export const auftretenText = (c) =>
  ({
    protz: tr('Für diese Liga ganz schön dick aufgetragen – in der Kabine wird getuschelt.', 'Rather flashy for this league – there is whispering in the dressing room.'),
    schlicht: tr('Für einen Profitrainer sehr bescheiden – die Presse spottet, der Vorstand rümpft die Nase.', 'Very modest for a professional manager – the press mocks, the board turns up its nose.'),
    passend: tr('Passt ins Bild: So stellt man sich den Trainer dieses Vereins vor.', 'Fits the picture: this is how people imagine this club\'s manager.'),
    neutral: tr('Unauffällig.', 'Unremarkable.'),
  })[auftreten(c).kind];
// Bonus auf den Ruf (natcoach.js coachRep).
export const statusBonus = (c) => (privatOn(c) && auftreten(c).kind === 'passend' ? 3 : 0);

// Trainertypus aus dem Verhalten.
export const TYPES = {
  wohltaeter: { name: T('Wohltäter', 'Benefactor'), desc: T('Gibt viel an den Verein zurück. Die Mannschaft und der Vorstand rechnen dir das hoch an.', 'Gives a lot back to the club. Team and board think highly of you for it.') },
  lebemann: { name: T('Lebemann', 'Bon vivant'), desc: T('Lebt gern und zeigt es. Du tankst auf – zu Hause findet man es manchmal zu viel.', 'Enjoys life and shows it. You recharge – at home it is sometimes a bit much.') },
  sparfuchs: { name: T('Sparfuchs', 'Saver'), desc: T('Das Konto ist voll, gekauft wird nichts. Zu Hause schläft man ruhig.', 'The account is full, nothing gets bought. They sleep soundly at home.') },
  geschaeft: { name: T('Geschäftsmann', 'Businessman'), desc: T('Anzug, Limousine, fester Händedruck. Der Vorstand fühlt sich verstanden.', 'Suit, saloon, firm handshake. The board feels understood.') },
  familie: { name: T('Familienmensch', 'Family person'), desc: T('Haus, Kinder, und die Familie steht hinter dir. Das gibt Ruhe.', 'House, children, and the family behind you. That brings calm.') },
  boden: { name: T('Bodenständig', 'Down to earth'), desc: T('Einer von uns. Die Kabine mag das.', 'One of us. The dressing room likes that.') },
};
export function typus(c) {
  const p = privat(c);
  if (!p) return null;
  const k = c.coach;
  const luxG = p.lux.reduce((s, id) => s + (LUX[id]?.glanz ?? 0), 0);
  if (p.earned > 0 && p.donated >= 0.2 * p.earned && p.donated >= 500) return 'wohltaeter';
  if (luxG >= 3 || auftreten(c).diff >= 3) return 'lebemann';
  if (p.own.wear >= 3 && p.own.car >= 3) return 'geschaeft';
  if (p.own.home >= 2 && (k.children ?? []).length >= 1 && k.patience >= 60) return 'familie';
  // Sparfuchs erst mit einem wirklich vollen Konto: Gemessen (balance-audit.mjs, 2026-11-12) galt vorher fast jeder als Sparfuchs,
  // der unten noch gar nichts kaufen konnte (10 von 12 Saisons je Karriere). Jetzt mindestens 20 000 € (Spielwert).
  if (glanz(c) === 0 && p.wallet >= Math.max(SAVER_MIN, 2 * seasonIncome(c)) && p.earned >= 2 * PAY.job) return 'sparfuchs';
  return 'boden';
}
export const typusName = (id) => name(TYPES[id].name);
export const typusDesc = (id) => name(TYPES[id].desc);

const trust = (c, d) => {
  if (trustOf(c) == null) return;
  const b = board(c);
  b.trust = Math.max(0, Math.min(100, b.trust + d));
};
const mood = (c, d) => (c.mood = Math.max(-1, Math.min(1, (c.mood ?? 0) + d)));
const news = (c, text) => (c.pendingNews ??= []).push(text);

// --- Kaufen ---------------------------------------------------------------------------------------------------------
export function priceOf(c, kind, tier) {
  const p = privat(c);
  const g = GOODS[kind];
  if (!p || !g?.tiers[tier] || tier === p.own[kind]) return null;
  const refund = Math.round(g.tiers[p.own[kind]].price * g.back);
  return { price: g.tiers[tier].price, refund, net: g.tiers[tier].price - refund };
}
export function buy(c, kind, tier) {
  const p = privat(c);
  const cost = priceOf(c, kind, tier);
  if (!cost || (cost.net > 0 && p.wallet < cost.net)) return false;
  p.wallet -= cost.net;
  p.own[kind] = tier;
  return true;
}
export function buyLux(c, id) {
  const p = privat(c);
  const x = LUX[id];
  if (!p || !x || p.lux.includes(id) || p.wallet < x.price) return false;
  p.wallet -= x.price;
  p.lux.push(id);
  return true;
}
export function sellLux(c, id) {
  const p = privat(c);
  if (!p || !p.lux.includes(id)) return false;
  p.lux = p.lux.filter((x) => x !== id);
  p.wallet += Math.round(LUX[id].price * 0.5);
  return true;
}
export const tripOpen = (c) => !!privat(c) && privat(c).tripSeason !== c.season && privat(c).wallet >= TRIP.price;
export function takeTrip(c) {
  if (!tripOpen(c)) return false;
  const p = privat(c);
  p.wallet -= TRIP.price;
  p.tripSeason = c.season;
  adjustPatience(c, TRIP.patience);
  adjustEnergy(c, TRIP.energy);
  return true;
}
export const donateAmount = (c) => {
  const p = privat(c);
  return p && p.wallet >= DONATE.min ? Math.max(DONATE.min, Math.round((p.wallet * DONATE.share) / 100) * 100) : 0;
};
export function donate(c) {
  const p = privat(c);
  const amount = donateAmount(c);
  if (!amount) return 0;
  p.wallet -= amount;
  p.donated += amount;
  book(c, tr('Spende des Trainers', 'Donation from the manager'), amount);
  if (p.donateSeason !== c.season) {
    p.donateSeason = c.season; // Dank gibt es einmal je Saison, nicht je Klick
    mood(c, DONATE.mood);
    trust(c, DONATE.trust);
  }
  return amount;
}
// Partnerin oder Partner: frei wählbar, jederzeit umstellbar (der Name wechselt mit).
export function setPartnerSex(c, sex) {
  const k = c.coach;
  if (!privat(c) || k.relation === 'single' || (sex !== 'w' && sex !== 'm') || k.partnerSex === sex) return false;
  const list = sex === 'm' ? NAMES_M : NAMES_W;
  k.partnerName = list[Math.abs((c.seed ?? 0) * 7 + 3) % list.length];
  setRelation(c, k.relation, sex);
  return true;
}
export function setHeavy(c, on) {
  const p = privat(c);
  if (p) p.heavy = !!on;
}
export const upkeep = (c) => {
  const p = privat(c);
  if (!p) return 0;
  return Object.keys(GOODS).reduce((s, kind) => s + GOODS[kind].tiers[p.own[kind]].upkeep, 0) + p.lux.reduce((s, id) => s + (LUX[id]?.upkeep ?? 0), 0) + (p.commute ? MOVE.second : 0);
};

// --- Vereinswechsel: neuer Vertrag, und ist es zu weit zum Fahren? ---------------------------------------------------------
// Aus clubchange.js (freshStart), wenn der neue Verein schon steht.
export function clubChanged(c, oldLevel, reason) {
  const p = privat(c);
  if (!p) return;
  p.salary = reason === 'summer' ? SALARY.summer : 1;
  const level = c.level ?? 1;
  if (level >= MOVE.farFrom || (level !== oldLevel && Math.max(level, oldLevel) >= MOVE.stateFrom)) {
    p.commute = true;
    p.moveAsk = true;
  }
}
const schoolKids = (c) => (c.coach.children ?? []).filter((ch) => { const a = ch.age + ((c.season ?? 1) - 1); return a >= 6 && a <= 17; }).length;
export const moveCost = (c) => {
  const p = privat(c);
  return p ? MOVE.base + Math.round(GOODS.home.tiers[p.own.home].price * MOVE.homeShare) : 0;
};
// Umziehen an den neuen Arbeitsort (Ereignis oder Knopf unter „Privat“).
export function moveHome(c) {
  const p = privat(c);
  if (!p?.commute || p.wallet < moveCost(c)) return false;
  p.wallet -= moveCost(c);
  p.commute = false;
  p.moveAsk = false;
  if (c.coach.relation !== 'single' && c.coach.flags?.together !== false) adjustPatience(c, MOVE.partner + MOVE.school * schoolKids(c));
  return true;
}

// --- Wochen- und Saisonlauf ----------------------------------------------------------------------------------------------
// Nach jedem Spieltag (career.js finishRound).
export function weeklyPrivat(c) {
  const p = privat(c);
  if (!p) return;
  const pay = weeklyIncome(c);
  p.wallet += pay;
  p.earned += pay;
  const r = c.round ?? 0;
  if (p.own.home >= 1 && r % 2 === 0) adjustPatience(c, 1);
  if (p.own.car >= 1 && r % 2 === 1) adjustEnergy(c, 1);
  if (p.wallet < 0 && r % 2 === 0) adjustPatience(c, -2);
  if (p.commute) r % 2 === 0 ? adjustEnergy(c, -1) : c.coach.relation !== 'single' && adjustPatience(c, -1);
  const a = auftreten(c);
  if (a.kind === 'protz' && r % 4 === 3) {
    mood(c, -0.02);
    if (p.newsSeason !== c.season) (p.newsSeason = c.season), news(c, tr('In der Kabine wird getuschelt: „Der Trainer lässt es sich ja gut gehen …“', 'Whispering in the dressing room: "The gaffer is doing all right for himself …"'));
  } else if (a.kind === 'schlicht' && r % 4 === 3) {
    trust(c, -1);
    if (p.newsSeason !== c.season) (p.newsSeason = c.season), news(c, tr('Die Presse spottet über den Auftritt des Trainers: „Profifußball sieht anders aus.“', 'The press mocks the manager\'s appearance: "This is not what professional football looks like."'));
  } else if (a.kind === 'passend' && r % 6 === 5) trust(c, 1);
}

// Zum Saisonwechsel (career.js nach seasonPersonal): Unterhalt, Wirkung des Typus.
export function seasonPrivat(c) {
  const p = privat(c);
  if (!p) return null;
  const cost = upkeep(c);
  p.wallet -= cost;
  const t = typus(c);
  if (t === 'wohltaeter') mood(c, 0.05), trust(c, 2);
  else if (t === 'lebemann') adjustEnergy(c, 6), adjustPatience(c, -6);
  else if (t === 'sparfuchs') adjustPatience(c, 4);
  else if (t === 'geschaeft') trust(c, 3);
  else if (t === 'familie') adjustPatience(c, 8);
  else mood(c, 0.03);
  p.lastType = t;
  return { cost, type: t };
}

// --- Familienereignisse ---------------------------------------------------------------------------------------------
const K = (c) => c.coach;
const ok = (c) => privatOn(c) && !(K(c).awayWeeks > 0);
const coachAge = (c) => (K(c).idx != null ? playerOf(c, K(c).idx)?.age ?? 40 : 40);
const partnerName = (c) => K(c).partnerName ?? '';
const pay = (c, amount) => (privat(c).wallet -= amount);
const can = (c, amount) => privat(c).wallet >= amount;
const eur = (n) => tr(`${n.toLocaleString('de-DE')} €`, `€${n.toLocaleString('en-GB')}`);
const clubPay = (c) => Math.round((PAY.club[Math.min(12, c.level ?? 1)] ?? 0) * salaryFactor(c));
const pct = (c) => { const d = Math.round((salaryFactor(c) - 1) * 100); return `${d > 0 ? '+' : '−'}${Math.abs(d)} %`; };
// Forderung an den Vorstand: Die Aussicht steigt mit dem Vertrauen (ab `from` Punkten, voll bei 50 mehr; Spielwerte).
export const raiseChance = (c, from) => Math.max(0.1, Math.min(0.9, ((trustOf(c) ?? 50) - from) / 50));
function negotiate(c, rng, step, from, penalty) {
  const p = privat(c);
  p.salaryAsked = c.season;
  if (salaryFactor(c) >= SALARY.max) return tr('„Mehr als das zahlt in dieser Liga niemand.“ Es bleibt, wie es ist.', '"Nobody in this league pays more than that." It stays as it is.');
  if (!rng.chance(raiseChance(c, from))) return trust(c, penalty), tr('Der Vorstand winkt ab: „Dafür sehen wir im Moment keinen Anlass.“ Die Stimmung im Raum ist danach kühler.', 'The board waves it off: "We see no reason for that at the moment." The mood in the room is cooler afterwards.');
  p.salary = Math.min(SALARY.max, Math.round((salaryFactor(c) + step) * 100) / 100);
  return tr(`Kurzes Zögern, dann ein Nicken. Neues Gehalt: ${eur(clubPay(c))} je Saison.`, `A brief hesitation, then a nod. New salary: ${eur(clubPay(c))} per season.`);
}
const NAMES_W = ['Anna', 'Lena', 'Marie', 'Sophie', 'Julia', 'Katrin', 'Nina', 'Sandra', 'Miriam', 'Aylin', 'Elif', 'Jana'];
const NAMES_M = ['Jan', 'Tobias', 'Daniel', 'Markus', 'Stefan', 'Florian', 'Emre', 'Lukas', 'Philipp', 'Deniz', 'Marco', 'Sven'];
const KIDS_W = ['Emma', 'Mia', 'Lina', 'Ella', 'Ida', 'Leni', 'Mila', 'Frieda'];
const KIDS_M = ['Noah', 'Paul', 'Emil', 'Finn', 'Theo', 'Anton', 'Leo', 'Jonas'];
const meet = (c, sex, rng) => {
  const k = K(c);
  k.partnerName = rng.pick(sex === 'm' ? NAMES_M : NAMES_W);
  setRelation(c, 'beziehung', sex);
  k.relSeason = c.season;
  k.flags.together = false;
  adjustPatience(c, 10);
  return tr(`Aus dem Kaffee wird ein langer Abend. ${k.partnerName} und du – das passt.`, `Coffee turns into a long evening. ${k.partnerName} and you – it just fits.`);
};
const child = (c, rng) => {
  const k = K(c);
  const sex = rng.chance(0.5) ? 'w' : 'm';
  const taken = new Set((k.children ?? []).map((x) => x.name));
  const pool = (sex === 'w' ? KIDS_W : KIDS_M).filter((n) => !taken.has(n));
  const kid = { name: rng.pick(pool.length ? pool : KIDS_W), age: 1 - (c.season ?? 1), sex, idx: null }; // heute 0 Jahre (childAge zählt die Saisons dazu)
  k.children = [...(k.children ?? []), kid];
  k.kids = k.children.length;
  k.flags.babySeason = c.season;
  setRelation(c, k.relation, k.partnerSex); // Familienzeile neu schreiben
  return kid;
};
const split = (c) => {
  const k = K(c);
  const p = privat(c);
  const married = k.relation === 'verheiratet';
  // Vereinfachter Ausgleich (Spielwert): Nach einer Ehe geht die Hälfte des Kontos, sonst nichts.
  const cost = married && p.wallet > 0 ? Math.round(p.wallet / 2) : 0;
  p.wallet -= cost;
  k.exName = k.partnerName;
  k.partnerName = null;
  setRelation(c, 'single', null);
  k.flags.together = false;
  k.krisen = 0;
  k.splits = (k.splits ?? 0) + 1;
  k.patience = 60;
  adjustEnergy(c, -15);
  return { cost, married };
};

export const PRIVAT_EVENTS = {
  priv_kennenlernen: {
    weight: 2,
    needs: (c) => (ok(c) && K(c).relation === 'single' && K(c).flags.metSeason !== c.season && (c.round ?? 0) >= 2 ? {} : null),
    text: () => tr('Nach dem Training bleibst du noch an der Theke hängen. Jemand setzt sich neben dich, ihr kommt ins Gespräch – und merkt erst spät, wie spät es ist. „Kaffee am Samstag?“', 'After training you linger at the bar. Someone sits down next to you, you get talking – and only notice late how late it is. "Coffee on Saturday?"'),
    options: [
      { label: tr('Gern – sie heißt …', 'Gladly – her name is …'), effect: (c, ctx, rng) => ((K(c).flags.metSeason = c.season), meet(c, 'w', rng)) },
      { label: tr('Gern – er heißt …', 'Gladly – his name is …'), effect: (c, ctx, rng) => ((K(c).flags.metSeason = c.season), meet(c, 'm', rng)) },
      { label: tr('Samstag ist Abschlusstraining', 'Saturday is the final training session'), effect: (c) => ((K(c).flags.metSeason = c.season), tr('Du winkst ab. Auf dem Heimweg fragst du dich kurz, ob das klug war.', 'You wave it off. On the way home you briefly wonder whether that was wise.')) },
    ],
  },
  priv_zusammenziehen: {
    weight: 2,
    needs: (c) => (ok(c) && K(c).relation === 'beziehung' && K(c).partnerName && !K(c).flags.together && K(c).flags.moveAsked !== c.season && ((c.season ?? 1) > (K(c).relSeason ?? 0) || (c.round ?? 0) >= 6) ? {} : null),
    text: (c) => tr(`${partnerName(c)}: „Zwei Wohnungen, zwei Zahnbürsten, ständig die Fahrerei. Wollen wir nicht zusammenziehen?“`, `${partnerName(c)}: "Two flats, two toothbrushes, all that driving. Shall we move in together?"`),
    options: [
      { label: tr('Ja, machen wir', 'Yes, let\'s'), effect: (c) => ((K(c).flags.together = true), adjustPatience(c, 12), adjustEnergy(c, -4), tr('Ein Wochenende Kartons schleppen – die halbe Mannschaft hilft. Danach ist es euer Zuhause.', 'A weekend of carrying boxes – half the team helps. After that it is your home.')) },
      { label: tr('Lass uns noch warten', 'Let\'s wait a little'), effect: (c) => ((K(c).flags.moveAsked = c.season), adjustPatience(c, -6), tr('Ein kurzes Nicken. Das Thema ist nicht vom Tisch.', 'A brief nod. The subject is not off the table.')) },
    ],
  },
  priv_hochzeit: {
    weight: 2,
    needs: (c) => (ok(c) && K(c).relation === 'beziehung' && K(c).flags.together && (c.season ?? 1) > (K(c).relSeason ?? 0) && K(c).flags.weddingAsked !== c.season && K(c).patience >= 40 ? {} : null),
    text: (c) => tr(`Ihr sitzt abends auf dem Balkon. ${partnerName(c)} sieht dich an: „Sag mal … wollen wir eigentlich heiraten?“`, `You are sitting on the balcony in the evening. ${partnerName(c)} looks at you: "Tell me … shall we actually get married?"`),
    options: [
      {
        label: () => tr(`Standesamt, danach Grillen im Vereinsheim (${eur(WEDDING.small)})`, `Registry office, then a barbecue at the clubhouse (${eur(WEDDING.small)})`),
        effect: (c) => (pay(c, WEDDING.small), setRelation(c, 'verheiratet', K(c).partnerSex), (K(c).weddingSeason = c.season), adjustPatience(c, 15), mood(c, 0.03), tr('Die Mannschaft steht Spalier, der Platzwart hat den Rasen extra gemäht. Schöner hätte es nicht sein können.', 'The team forms a guard of honour, the groundsman has mown the grass specially. It could not have been nicer.')),
      },
      {
        label: () => tr(`Großes Fest mit allen (${eur(WEDDING.big)})`, `A big party with everyone (${eur(WEDDING.big)})`),
        effect: (c) => {
          if (!can(c, WEDDING.big)) return (K(c).flags.weddingAsked = c.season), tr('Du rechnest nach: Das gibt das Konto nicht her. Ihr vertagt die Planung.', 'You do the sums: the account will not stretch to that. You postpone the planning.');
          pay(c, WEDDING.big);
          setRelation(c, 'verheiratet', K(c).partnerSex);
          K(c).weddingSeason = c.season;
          adjustPatience(c, 25);
          mood(c, 0.04);
          return tr('Hundertzwanzig Gäste, eine Band, die halbe Liga auf der Tanzfläche. Davon reden sie noch in Jahren.', 'A hundred and twenty guests, a band, half the league on the dance floor. They will talk about it for years.');
        },
      },
      { label: tr('Noch nicht', 'Not yet'), effect: (c) => ((K(c).flags.weddingAsked = c.season), adjustPatience(c, -10), tr('Stille. Dann: „Okay.“ Es klingt nicht wie okay.', 'Silence. Then: "Okay." It does not sound like okay.')) },
    ],
  },
  priv_nachwuchs: {
    weight: 1,
    needs: (c) => (ok(c) && K(c).relation !== 'single' && K(c).flags.together !== false && (K(c).children ?? []).length < 3 && coachAge(c) <= 45 && (c.season ?? 1) >= (K(c).flags.babySeason ?? -9) + 2 && (c.season ?? 1) > (K(c).relSeason ?? 0) ? {} : null),
    text: (c) => tr(`${partnerName(c) || 'Zu Hause'}: „Setz dich mal. Wir werden Eltern.“ In ein paar Wochen ist es so weit.`, `${partnerName(c) || 'At home'}: "Sit down for a moment. We are going to be parents." In a few weeks the time will come.`),
    options: [
      { label: tr('Zwei Wochen ganz für die Familie', 'Two weeks entirely for the family'), effect: (c, ctx, rng) => { const kid = child(c, rng); sendAway(c, 2); adjustPatience(c, 20); return tr(`${kid.name} ist da. Du bist zwei Wochen raus – und hast selten etwas so wenig bereut.`, `${kid.name} has arrived. You are out for two weeks – and have rarely regretted anything so little.`); } },
      { label: tr('Dabei sein, aber sonntags an der Linie stehen', 'Be there, but stand on the touchline on Sundays'), effect: (c, ctx, rng) => { const kid = child(c, rng); adjustEnergy(c, -12); adjustPatience(c, -6); return tr(`${kid.name} ist da. Du schläfst kaum, stehst trotzdem am Platz – und zu Hause merkt man es.`, `${kid.name} has arrived. You barely sleep, still stand at the pitch – and at home they notice.`); } },
    ],
  },
  priv_einschulung: {
    weight: 3,
    needs: (c) => {
      if (!ok(c)) return null;
      const i = (K(c).children ?? []).findIndex((ch) => ch.age + ((c.season ?? 1) - 1) === 6 && !ch.school);
      return i >= 0 ? { child: i } : null;
    },
    text: (c, ctx) => tr(`${K(c).children[ctx.child].name} wird eingeschult – mit Schultüte, Aufregung und einer Feier am Dienstagabend. Dienstag ist Training.`, `${K(c).children[ctx.child].name} starts school – with a school cone, excitement and a celebration on Tuesday evening. Tuesday is training.`),
    options: [
      { label: tr('Natürlich bin ich da', 'Of course I will be there'), effect: (c, ctx) => ((K(c).children[ctx.child].school = true), (K(c).noTraining = Math.max(K(c).noTraining ?? 0, 1)), adjustPatience(c, 10), tr('Das Training fällt aus. Das Foto mit der Schultüte hängt ab jetzt am Kühlschrank.', 'Training is cancelled. The photo with the school cone now hangs on the fridge.')) },
      { label: tr('Training geht vor', 'Training comes first'), effect: (c, ctx) => ((K(c).children[ctx.child].school = true), adjustPatience(c, -12), tr('Du kommst, als die Feier vorbei ist. Das merkt sich jemand.', 'You arrive when the celebration is over. Someone will remember that.')) },
    ],
  },
  priv_pubertaet: {
    weight: 2,
    needs: (c) => {
      if (!ok(c)) return null;
      const i = (K(c).children ?? []).findIndex((ch) => { const a = ch.age + ((c.season ?? 1) - 1); return a >= 13 && a <= 15 && !ch.teen; });
      return i >= 0 ? { child: i } : null;
    },
    text: (c, ctx) => tr(`${K(c).children[ctx.child].name} knallt die Tür: „Du bist ja sowieso nie da! Immer nur dein blöder Verein!“`, `${K(c).children[ctx.child].name} slams the door: "You are never here anyway! It is always your stupid club!"`),
    options: [
      { label: tr('Klopfen, hinsetzen, zuhören', 'Knock, sit down, listen'), effect: (c, ctx) => ((K(c).children[ctx.child].teen = true), adjustEnergy(c, -5), adjustPatience(c, 8), tr('Es dauert bis Mitternacht. Am Ende verabredet ihr einen festen Abend in der Woche.', 'It takes until midnight. In the end you agree on a fixed evening every week.')) },
      { label: tr('„So redest du nicht mit mir!“', '"You do not talk to me like that!"'), effect: (c, ctx, rng) => ((K(c).children[ctx.child].teen = true), rng.chance(0.3) ? (adjustPatience(c, 2), tr('Erst Funkstille, dann eine gemurmelte Entschuldigung. Diesmal ging es gut.', 'First silence, then a mumbled apology. This time it went well.')) : (adjustPatience(c, -8), tr('Drei Tage Schweigen am Küchentisch.', 'Three days of silence at the kitchen table.'))) },
    ],
  },
  priv_krise: {
    weight: 3,
    needs: (c) => (ok(c) && K(c).relation !== 'single' && K(c).partnerName && K(c).patience < diff(c).familyCrisis && K(c).flags.krisenRound !== `${c.season}:${Math.floor((c.round ?? 0) / 6)}` ? {} : null),
    text: (c) => tr(`${partnerName(c)}: „Wir reden nur noch über Termine. Ich weiß nicht mehr, wann wir zuletzt etwas zusammen gemacht haben.“`, `${partnerName(c)}: "We only ever talk about schedules. I do not remember when we last did something together."`),
    options: [
      { label: () => tr(`Paarberatung (${eur(HELP.counselling)})`, `Couples counselling (${eur(HELP.counselling)})`), effect: (c) => { K(c).flags.krisenRound = `${c.season}:${Math.floor((c.round ?? 0) / 6)}`; if (!can(c, HELP.counselling)) return adjustPatience(c, 4), tr('Dafür reicht das Geld gerade nicht. Ihr redet stattdessen einen Abend lang – immerhin.', 'There is not enough money for that right now. Instead you talk for an evening – it is a start.'); pay(c, HELP.counselling); adjustPatience(c, 15); K(c).krisen = Math.max(0, (K(c).krisen ?? 0) - 1); return tr('Sechs Termine. Unbequem, aber es hilft.', 'Six sessions. Uncomfortable, but it helps.'); } },
      { label: () => tr(`Eine Woche gemeinsam weg (${eur(HELP.holiday)})`, `A week away together (${eur(HELP.holiday)})`), effect: (c) => { K(c).flags.krisenRound = `${c.season}:${Math.floor((c.round ?? 0) / 6)}`; if (!can(c, HELP.holiday)) return adjustPatience(c, 4), tr('Dafür reicht das Geld gerade nicht. Ihr fahrt einen Tag an den See – immerhin.', 'There is not enough money for that right now. You spend a day at the lake – it is a start.'); pay(c, HELP.holiday); sendAway(c, 1); adjustPatience(c, 25); K(c).krisen = 0; return tr('Eine Woche ohne Aufstellungen. Ihr kommt als Paar zurück.', 'A week without line-ups. You come back as a couple.'); } },
      { label: tr('Das wird schon wieder', 'It will sort itself out'), effect: (c) => ((K(c).flags.krisenRound = `${c.season}:${Math.floor((c.round ?? 0) / 6)}`), (K(c).krisen = (K(c).krisen ?? 0) + 1), adjustPatience(c, -5), tr('Es wird nicht von selbst wieder.', 'It does not sort itself out.')) },
    ],
  },
  priv_trennung: {
    weight: 4,
    heavy: true,
    needs: (c) => (ok(c) && privat(c).heavy && K(c).relation !== 'single' && K(c).partnerName && (K(c).krisen ?? 0) >= 2 && K(c).patience < RED ? {} : null),
    text: (c) => tr(`${partnerName(c)} hat einen Koffer gepackt. „Ich habe lange gewartet, dass sich etwas ändert. Ich kann so nicht weitermachen.“`, `${partnerName(c)} has packed a suitcase. "I have waited a long time for something to change. I cannot go on like this."`),
    options: [
      { label: tr('Um die Beziehung kämpfen – zwei Wochen nur für euch', 'Fight for the relationship – two weeks just for the two of you'), effect: (c) => (sendAway(c, 2), (K(c).patience = Math.max(K(c).patience, 40)), (K(c).krisen = 1), tr('Du sagst alles ab. Es ist kein Neuanfang, aber eine Chance.', 'You cancel everything. It is not a fresh start, but it is a chance.')) },
      {
        label: tr('Es ist vorbei', 'It is over'),
        effect: (c) => {
          const r = split(c);
          mood(c, -0.02);
          return r.married ? tr(`Ihr trennt euch, später folgt die Scheidung.${r.cost ? ` Vom Konto geht die Hälfte (${eur(r.cost)}).` : ''} Die Kinder sehen euch beide. Es dauert, bis sich das Leben neu sortiert.`, `You separate, and the divorce follows later.${r.cost ? ` Half of the account goes (${eur(r.cost)}).` : ''} The children see you both. It takes time for life to settle again.`) : tr('Ihr trennt euch. Es dauert, bis sich das Leben neu sortiert.', 'You separate. It takes time for life to settle again.');
        },
      },
    ],
  },
  priv_umzug: {
    weight: 6,
    needs: (c) => (ok(c) && privat(c).moveAsk && privat(c).commute ? {} : null),
    text: (c) => (K(c).relation !== 'single' && K(c).flags.together !== false
      ? tr(`Der neue Verein liegt zu weit weg, um jeden Tag zu fahren. ${partnerName(c) || 'Zu Hause'} fragt: „Und wir? Ziehen wir mit – oder sehen wir dich nur noch am Wochenende?“`, `The new club is too far away to drive every day. ${partnerName(c) || 'At home'} they ask: "And us? Do we move too – or will we only see you at weekends?"`)
      : tr('Der neue Verein liegt zu weit weg, um jeden Tag zu fahren. Ziehst du um – oder nimmst du dir ein Zimmer am Platz und fährst am Wochenende heim?', 'The new club is too far away to drive every day. Do you move – or take a room near the ground and drive home at weekends?')),
    options: [
      {
        label: (c) => tr(`Umziehen (${eur(moveCost(c))})`, `Move (${eur(moveCost(c))})`),
        effect: (c) => {
          const family = K(c).relation !== 'single' && K(c).flags.together !== false;
          const kids = schoolKids(c);
          if (!moveHome(c)) return (privat(c).moveAsk = false), tr('Das Konto gibt den Umzug noch nicht her. Du pendelst erst einmal – umziehen kannst du später unter „Privat“.', 'The account will not stretch to the move yet. You commute for now – you can move later under "Private life".');
          return family
            ? kids ? tr('Kartons, Abschiede, neue Schule. Es dauert, bis alle angekommen sind – aber ihr seid zusammen.', 'Boxes, goodbyes, a new school. It takes a while for everyone to settle – but you are together.') : tr('Kartons, Abschiede, eine neue Stadt. Es dauert, bis ihr angekommen seid – aber ihr seid zusammen.', 'Boxes, goodbyes, a new town. It takes a while to settle – but you are together.')
            : tr('Zwei Fahrten mit dem Transporter, dann bist du da. Der Weg zum Platz dauert jetzt zehn Minuten.', 'Two trips with the van and you are there. The way to the ground now takes ten minutes.');
        },
      },
      { label: () => tr(`Pendeln, Zweitwohnung am Platz (${eur(MOVE.second)} je Saison)`, `Commute, second flat near the ground (${eur(MOVE.second)} per season)`), effect: (c) => ((privat(c).moveAsk = false), tr('Montags hin, samstags zurück. Die Autobahn kennst du bald auswendig. Umziehen kannst du jederzeit unter „Privat“.', 'There on Mondays, back on Saturdays. You will soon know the motorway by heart. You can move at any time under "Private life".')) },
    ],
  },
  priv_gehalt: {
    weight: 2,
    needs: (c) => (ok(c) && clubPays(c) && trustOf(c) != null && (c.round ?? 0) >= 4 && privat(c).salaryAsked !== c.season ? {} : null),
    text: (c) => tr(`Der Vorstand bittet zum Gespräch über deinen Vertrag. Bisher bekommst du ${eur(clubPay(c))} je Saison vom Verein${salaryFactor(c) !== 1 ? ` (${pct(c)} zum Üblichen der Liga)` : ''}. „Wie stellen Sie sich das vor?“`, `The board asks for a talk about your contract. So far you get ${eur(clubPay(c))} per season from the club${salaryFactor(c) !== 1 ? ` (${pct(c)} against the usual in this league)` : ''}. "What do you have in mind?"`),
    options: [
      { label: tr('Deutlich mehr fordern (+20 %)', 'Demand considerably more (+20 %)'), effect: (c, ctx, rng) => negotiate(c, rng, SALARY.ask, 40, -3) },
      { label: tr('Maßvoll mehr fordern (+10 %)', 'Ask for a moderate rise (+10 %)'), effect: (c, ctx, rng) => negotiate(c, rng, SALARY.fair, 25, -1) },
      { label: tr('Alles bleibt, wie es ist', 'Everything stays as it is'), effect: (c) => ((privat(c).salaryAsked = c.season), tr('Ein Handschlag, fertig. Der Vertrag läuft weiter.', 'A handshake, done. The contract carries on.')) },
      {
        label: tr('Dem Verein zuliebe verzichten (−10 %)', 'Take a cut for the club\'s sake (−10 %)'),
        effect: (c) => {
          const p = privat(c);
          p.salaryAsked = c.season;
          if (salaryFactor(c) <= SALARY.min) return tr('Noch weniger geht nicht, sagt selbst der Kassenwart. Es bleibt, wie es ist.', 'Even the treasurer says it cannot go any lower. It stays as it is.');
          p.salary = Math.max(SALARY.min, Math.round((salaryFactor(c) - SALARY.waive) * 100) / 100);
          trust(c, 3);
          mood(c, 0.02);
          return tr(`Der Vorstand ist sichtlich beeindruckt, und in der Kabine spricht es sich herum. Neues Gehalt: ${eur(clubPay(c))} je Saison.`, `The board is visibly impressed, and word gets round the dressing room. New salary: ${eur(clubPay(c))} per season.`);
        },
      },
    ],
  },
  priv_pflege: {
    weight: 1,
    needs: (c) => (ok(c) && coachAge(c) >= 40 && !K(c).flags.care && (c.season ?? 1) >= 2 ? {} : null),
    text: () => tr('Deine Mutter ist gestürzt. Nichts Schlimmes, sagt der Arzt – aber allein kommt sie zu Hause nicht mehr zurecht.', 'Your mother has had a fall. Nothing serious, says the doctor – but she can no longer manage at home on her own.'),
    options: [
      { label: tr('Ich kümmere mich selbst', 'I will look after her myself'), effect: (c) => ((K(c).flags.care = true), adjustEnergy(c, -12), adjustPatience(c, 5), tr('Dreimal die Woche fährst du nach dem Training noch vorbei. Es zehrt, aber es fühlt sich richtig an.', 'Three times a week you drop by after training. It is draining, but it feels right.')) },
      { label: () => tr(`Einen Pflegedienst bezahlen (${eur(HELP.care)})`, `Pay for a care service (${eur(HELP.care)})`), effect: (c) => { K(c).flags.care = true; if (!can(c, HELP.care)) return adjustEnergy(c, -12), tr('Das Geld reicht nicht. Also machst du es selbst.', 'There is not enough money. So you do it yourself.'); pay(c, HELP.care); adjustPatience(c, 3); return tr('Der Pflegedienst kommt täglich. Du besuchst sie sonntags nach dem Spiel.', 'The care service comes every day. You visit her on Sundays after the match.'); } },
      { label: tr('Die Geschwister sollen ran', 'My siblings should step up'), effect: (c) => ((K(c).flags.care = true), adjustPatience(c, -6), tr('Sie machen es. Begeistert sind sie nicht, und das lassen sie dich wissen.', 'They do it. They are not thrilled, and they let you know.')) },
    ],
  },
  priv_trauer: {
    weight: 1,
    heavy: true,
    needs: (c) => (ok(c) && privat(c).heavy && !K(c).flags.grief && (c.season ?? 1) >= 3 && coachAge(c) >= 38 ? {} : null),
    text: () => tr('Ein Anruf am frühen Morgen: Dein Vater ist in der Nacht gestorben.', 'A phone call early in the morning: your father died during the night.'),
    options: [
      { label: tr('Eine Woche bei der Familie sein', 'Spend a week with the family'), effect: (c) => ((K(c).flags.grief = true), sendAway(c, 1), adjustPatience(c, 10), mood(c, 0.03), tr('Die Mannschaft schickt einen Kranz und spielt mit Trauerflor. Du bist da, wo du jetzt hingehörst.', 'The team sends a wreath and plays in black armbands. You are where you belong right now.')) },
      { label: tr('Weitermachen – der Platz lenkt ab', 'Carry on – the pitch is a distraction'), effect: (c) => ((K(c).flags.grief = true), adjustEnergy(c, -10), mood(c, 0.03), tr('Du stehst am Sonntag an der Linie. Die Mannschaft spielt mit Trauerflor. Abends holt es dich ein.', 'You stand on the touchline on Sunday. The team plays in black armbands. In the evening it catches up with you.')) },
    ],
  },
};
