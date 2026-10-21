// Platz und Anlage (ROADMAP 11.9): Zustand des eigenen Platzes (Verschleiß, Pflege, Platzsperre), der Pachtvertrag mit der
// Gemeinde (Verlängerung, Langzeitpacht, Kauf) und die Wirkung auf Spiel und Darstellung.
//
// Zustand cond 0..1 (1 = gepflegt, so spielt die Engine heute) und Linien chalk 0..1 (1 = frisch gezogen).
// Alle Zahlen hier sind Spielwerte (auf die Kasse des Spiels geeicht, scripts/longrun.mjs --bot), keine Messwerte.
// Anhaltspunkte aus der Wirklichkeit für die Pacht (Vertragsentwürfe und Ratsvorlagen von Gemeinden):
//  - Pachtzeit 5 Jahre, Pacht für die Sportplatznutzung 180 € im Monat (Gemeinde Siek, Ratsinfo,
//    https://amtsiek.de/allris/wicket/resource/org.apache.wicket.Application/doc257727.pdf) → Laufzeit PACHT_SEASONS = 5;
//  - Verträge über 25 Jahre ohne Pachtzins unter der Bedingung der Nutzung als Sportplatz (Pfaffenhofen,
//    https://www.pfaffenhofen-wuertt.de/ris/V_20250715_155636_32.pdf) → die Langzeitpacht (LANGPACHT_SEASONS);
//  - der Verein übernimmt Verkehrssicherungspflicht und Pflege (Egelsbach, pachtfrei,
//    https://rim.ekom21.de/egelsbach/sdnetrim/UGhVM0hpd2NXNFdFcExjZQ7N2SCX1irLvZwzRxrBUPtTQCmz4DZUhz0S9bg-ysIe/Anlage_Pachtvertrag.pdf)
//    → gepflegter Platz = Nachlass bei der Verlängerung, verwahrloster = Aufschlag.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { adjustMood } from './events.js';
import { hasFacility } from './facilities.js';
import { book } from './finances.js';
import { humanClub } from './career.js';
import { matchDate } from './calendar.js';
import { chronicle } from './sagas.js';
import { monthOf } from './weather.js';

// --- Untergrund -----------------------------------------------------------------------------------------------------
// 'rasen' (Rasenplatz, Sportanlage, Großfeld), 'asche' (Ascheplatz, z. B. als Notlösung nach dem Platzverkauf),
// 'kunst' (Kunstrasen gebaut), 'none' (Hinterhof, Park, Parkplatz: kein Platz, den man pflegen könnte).
const GRASS_VENUES = ['rasenplatz', 'sportplatz', 'grossfeld'];
export function groundKind(c) {
  const v = humanClub(c)?.venue;
  if (v === 'ascheplatz') return hasFacility(c, 'kunstrasen') ? 'kunst' : 'asche';
  if (GRASS_VENUES.includes(v)) return hasFacility(c, 'kunstrasen') ? 'kunst' : 'rasen';
  return 'none';
}
export const hasGround = (c) => groundKind(c) !== 'none';

export function platz(c) {
  c.platz ??= {};
  const p = c.platz;
  p.cond ??= 1;
  p.chalk ??= 1;
  p.week ??= 0; // zählt die Wochen für Sperrfristen der Pflege
  p.done ??= {}; // Pflege dieser Woche: { aktion: true }
  p.last ??= {}; // letzte Woche je Aktion (Sperrfrist)
  p.helpers ??= 0; // Ehrenamtliche Einsätze diese Woche
  p.avg ??= { sum: 0, n: 0 };
  p.lastAvg ??= null;
  p.sperren ??= 0;
  p.lastSperre ??= -9; // Spieltag der letzten Platzsperre (nie zwei hintereinander)
  p.vertrag ??= null;
  p.angebot ??= null;
  return p;
}

// Zustand in Worten.
export function conditionLabel(cond) {
  if (cond >= 0.85) return tr('gepflegt', 'well kept');
  if (cond >= 0.65) return tr('ordentlich', 'decent');
  if (cond >= 0.45) return tr('abgespielt', 'worn');
  if (cond >= 0.25) return tr('Acker', 'ploughed field');
  return tr('Kartoffelacker', 'potato field');
}

// --- Pflege ---------------------------------------------------------------------------------------------------------
// gain: Zustandsgewinn, cost: Preis beim Lohnunternehmer/Fachbetrieb (Spielwerte), gap: Wochen Sperrfrist.
export const CARE = {
  maehen: { kinds: ['rasen'], gain: 0.04, cost: 6, gap: 1, name: tr('Mähen', 'Mowing'), desc: tr('Kurzer Schnitt, dichte Narbe.', 'Short cut, dense sward.') },
  kreide: { kinds: ['rasen', 'asche'], chalk: true, cost: 8, gap: 1, name: tr('Kreide nachziehen', 'Re-mark the lines'), desc: tr('Frische Linien – sonst gibt es Ärger mit dem Schiri.', 'Fresh lines – or the referee complains.') },
  waessern: { kinds: ['rasen'], gain: 0.03, cost: 3, gap: 1, dry: true, name: tr('Wässern', 'Watering'), desc: tr('Nur bei trockenem Wetter sinnvoll.', 'Only useful in dry weather.') },
  nachsaeen: { kinds: ['rasen'], gain: 0.12, cost: 25, gap: 3, name: tr('Nachsäen', 'Re-seeding'), desc: tr('Kahle Stellen vor den Toren: alle 3 Wochen.', 'Bare patches in front of the goals: every 3 weeks.') },
  abziehen: { kinds: ['asche'], gain: 0.2, cost: 10, gap: 1, name: tr('Platz abziehen', 'Drag the pitch'), desc: tr('Der Ascheplatz wird mit der Schleppe glatt gezogen.', 'The cinder pitch is levelled with the drag.') },
};
export const HELPER_EFFECT = 0.7; // Ehrenamtliche arbeiten, aber nicht wie ein Profi (ohne Platzwart)
export const HELPER_SLOTS = 2; // so viele Einsätze mit Ehrenamtlichen pro Woche

const DRY_NO = ['regen', 'schnee', 'frost'];
export const weatherId = (c) => c.week?.weather?.id ?? 'sonne';

// Warum nicht? null = möglich.
export function careBlock(c, action, mode = 'helfer') {
  const def = CARE[action];
  const p = platz(c);
  if (!def) return 'unknown';
  if (!def.kinds.includes(groundKind(c))) return 'ground';
  if (p.done[action]) return 'done';
  if (p.week - (p.last[action] ?? -99) < def.gap && def.gap > 1) return 'gap';
  if (def.chalk ? p.chalk >= 0.98 : p.cond >= 0.995) return 'fine';
  if (def.dry && DRY_NO.includes(weatherId(c))) return 'weather';
  if (mode === 'helfer' && p.helpers >= HELPER_SLOTS) return 'helpers';
  if (mode !== 'helfer' && c.cash < def.cost) return 'cash';
  return null;
}

export function care(c, action, mode = 'helfer') {
  if (careBlock(c, action, mode) !== null) return null;
  const def = CARE[action];
  const p = platz(c);
  const eff = mode === 'helfer' ? (c.staff?.platzwart ? 1 : HELPER_EFFECT) : 1;
  if (mode !== 'helfer') book(c, tr(`Platzpflege: ${def.name} (Fachbetrieb)`, `Pitch care: ${def.name} (contractor)`), -def.cost);
  else p.helpers++;
  if (def.chalk) p.chalk = Math.min(1, p.chalk + eff);
  else p.cond = Math.min(1, p.cond + def.gain * eff);
  p.done[action] = true;
  p.last[action] = p.week;
  return def.name;
}

// --- Verschleiß (jede Woche) ----------------------------------------------------------------------------------------
export const WEAR = {
  training: 0.02, // Trainingsabend auf dem Hauptplatz
  trainingSpared: 0.004, // mit zweitem Platz
  homeMatch: 0.05,
  rain: 0.015, // Regenwoche
  rainMatch: 0.04, // Regen am Heimspieltag: Stollen im Matsch
  frost: 0.01,
  heat: 0.015,
  ashRain: 0.02, // Asche matscht bei Regen mehr
  growth: 0.012, // Wachstum im Frühjahr und Herbst
  kunst: 0.1, // Kunstrasen nutzt sich kaum ab (Faktor)
  chalkWeek: 0.12, // Linien verblassen
  chalkRain: 0.12,
  chalkMatch: 0.05,
};
export const SUMMER_RECOVERY = 0.2; // Sommerpause: die Narbe schließt sich
const GROW_MONTHS = [3, 4, 5, 6, 8, 9, 10];

// Eine Woche abrechnen. Gibt Chatzeilen für die neue Woche zurück.
export function weeklyPlatz(c) {
  const p = platz(c);
  const notes = [];
  const kind = groundKind(c);
  ensureVertrag(c);
  const w = c.week?.weather;
  const f = c.week ? c.fixtures?.[c.round]?.find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id) : null;
  const home = !!f && f.home === humanClub(c).id;
  if (kind !== 'none') {
    // Platzwart: mäht und zieht ab, ohne dass man ihn fragt.
    if (c.staff?.platzwart) {
      if (kind === 'rasen' && !p.done.maehen) p.cond = Math.min(1, p.cond + CARE.maehen.gain);
      if (kind === 'asche' && !p.done.abziehen) p.cond = Math.min(1, p.cond + CARE.abziehen.gain);
    }
    const rain = w?.id === 'regen';
    let wear = hasFacility(c, 'trainingsplatz') ? WEAR.trainingSpared : WEAR.training;
    if (home) wear += WEAR.homeMatch + (rain ? WEAR.rainMatch : 0);
    if (rain) wear += WEAR.rain + (kind === 'asche' ? WEAR.ashRain : 0);
    if (w?.id === 'schnee' || w?.id === 'frost') wear += WEAR.frost;
    if (w?.id === 'hitze') wear += WEAR.heat;
    if (kind === 'kunst') wear *= WEAR.kunst;
    const grow = kind === 'rasen' && GROW_MONTHS.includes(monthOf(c)) && w?.id !== 'frost' && w?.id !== 'schnee' ? WEAR.growth : 0;
    p.cond = Math.max(0.05, Math.min(1, p.cond - wear + grow));
    if (kind !== 'kunst') {
      const fade = WEAR.chalkWeek + (rain ? WEAR.chalkRain : 0) + (home ? WEAR.chalkMatch : 0);
      p.chalk = Math.max(0, p.chalk - fade);
    } else p.chalk = 1;
  }
  p.avg.sum += p.cond;
  p.avg.n++;
  p.week++;
  p.done = {};
  p.helpers = 0;
  // Eigentum: Grundsteuer und Unterhalt wöchentlich.
  const v = p.vertrag;
  if (v?.typ === 'eigen') book(c, tr('Grundsteuer und Unterhalt Sportplatz', 'Property tax and upkeep, sports ground'), -(c.staff?.platzwart ? EIGEN_WEEKLY / 2 : EIGEN_WEEKLY));
  if (kind !== 'none' && kind !== 'kunst') {
    if (p.cond < 0.4 && c.week) notes.push(tr('Der Platz ist ein Acker. Wer pflegt den eigentlich? Kümmert sich mal jemand um den Rasen?', 'The pitch is a ploughed field. Who actually looks after it? Will somebody see to the grass?'));
    else if (p.chalk < 0.25) notes.push(tr('Die Linien sind fast weg. Der Schiri hat schon gefragt, wo das Spielfeld aufhört.', 'The lines are nearly gone. The referee has already asked where the pitch ends.'));
  }
  return notes;
}

// Sommerpause und neue Saison. Gibt Chatzeilen zurück (Verlängerungsangebot der Gemeinde).
export function platzNewSeason(c) {
  const p = platz(c);
  const notes = [];
  p.lastAvg = p.avg.n ? p.avg.sum / p.avg.n : null;
  p.avg = { sum: 0, n: 0 };
  p.cond = Math.min(1, p.cond + SUMMER_RECOVERY);
  p.chalk = 1;
  p.lastSperre = -9;
  p.week = 0;
  p.done = {};
  p.helpers = 0;
  ensureVertrag(c);
  const v = p.vertrag;
  if (v && v.typ !== 'eigen') {
    if (c.season > v.bis) {
      // Nicht reagiert: stillschweigende Verlängerung um eine Saison, mit Aufschlag.
      v.bis = c.season;
      v.mul = round2(v.mul * 1.15);
      p.angebot = null;
      notes.push(tr('Der Pachtvertrag ist ausgelaufen, ohne dass jemand reagiert hat: Die Gemeinde verlängert stillschweigend um ein Jahr – mit 15 % Aufschlag.', 'The lease ran out and nobody reacted: the council quietly extends it by a year – with a 15 % surcharge.'));
    }
    if (c.season >= v.bis && !p.angebot) {
      p.angebot = makeAngebot(c);
      notes.push(angebotText(p.angebot));
    }
  }
  return notes;
}

// --- Pachtvertrag ---------------------------------------------------------------------------------------------------
export const PACHT_SEASONS = 5; // Pachtzeit 5 Jahre (Siek)
export const LANGPACHT_SEASONS = 10; // Spielwert; reale Verträge laufen bis 25 Jahre (Pfaffenhofen)
export const PACHT_PER_MATCH = 15; // € je Heimspiel (Spielwert, war schon vor dem Vertrag so); 5 Heimspiele ≈ Jahrespacht 75 €
export const LANGPACHT_DISCOUNT = 0.8; // Langzeitpacht: 20 % billiger
export const LANGPACHT_FEE = 150; // einmalige Bearbeitungsgebühr, Spielwert
export const EIGEN_WEEKLY = 2; // Grundsteuer + Unterhalt je Woche, Spielwert
export const MIN_TERM = 3; // Bauen nur mit mindestens so vielen Saisons Restlaufzeit (inkl. laufender)

const round2 = (x) => Math.round(x * 100) / 100;

export function ensureVertrag(c) {
  const p = platz(c);
  if ((c.level ?? 1) >= 2 && !p.vertrag) p.vertrag = { typ: 'pacht', von: c.season, bis: c.season + PACHT_SEASONS - 1, mul: 1 };
  return p.vertrag;
}
export const vertrag = (c) => platz(c).vertrag;
export const landState = (c) => (platz(c).vertrag?.typ === 'eigen' ? 'eigen' : 'pacht');
export function termLeft(c) {
  const v = platz(c).vertrag;
  return !v ? 0 : v.typ === 'eigen' ? Infinity : Math.max(0, v.bis - c.season + 1);
}
export const landOk = (c) => hasGround(c) && termLeft(c) >= MIN_TERM;

// Gebühr je Heimspiel (null = es wird nichts abgerechnet, z. B. Eigentum). Ohne Platzwart voll, mit Platzwart die Hälfte.
export function rentPerMatch(c) {
  const v = ensureVertrag(c);
  if (v?.typ === 'eigen') return 0;
  const base = PACHT_PER_MATCH * (v?.mul ?? 1) * (v?.typ === 'langpacht' ? LANGPACHT_DISCOUNT : 1);
  return c.staff?.platzwart ? base / 2 : base;
}
export const homeMatchesPerSeason = (c) => Math.floor((c.fixtures?.length ?? 10) / 2);
export const rentPerSeason = (c) => rentPerMatch(c) * homeMatchesPerSeason(c);

// Kaufpreis (Spielwert; wächst mit der Liga, weil der Platz größer wird).
export const purchasePrice = (c) => 900 + 300 * Math.max(0, (c.level ?? 2) - 2);

function makeAngebot(c) {
  const p = platz(c);
  const rng = createRng((c.seed * 53 + c.season * 17 + 5) >>> 0);
  const avg = p.lastAvg ?? 0.7;
  const kind = avg >= 0.75 ? 'lob' : avg < 0.45 ? 'erhoehung' : rng.chance(0.2) ? 'erhoehung' : 'normal';
  const mul = round2(p.vertrag.mul * { lob: 0.92, normal: 1.05, erhoehung: 1.2 }[kind]);
  return { kind, mul, season: c.season };
}
export const angebotText = (a) =>
  ({
    lob: tr('Brief von der Gemeinde: Der Pachtvertrag läuft aus. Man lobt den gepflegten Platz und bietet die Verlängerung zu besseren Konditionen an.', 'Letter from the council: the lease is expiring. They praise the well-kept pitch and offer to renew on better terms.'),
    normal: tr('Brief von der Gemeinde: Der Pachtvertrag läuft aus. Man bietet die Verlängerung an, mit dem üblichen kleinen Aufschlag.', 'Letter from the council: the lease is expiring. They offer to renew with the usual small increase.'),
    erhoehung: tr('Brief von der Gemeinde: Der Pachtvertrag läuft aus. Wegen der Haushaltslage (und weil der Platz schon besser aussah) soll die Pacht um 20 % steigen.', 'Letter from the council: the lease is expiring. Because of the budget (and because the pitch has looked better) the rent is to go up 20 %.'),
  })[a.kind];

// Verlängern (nur mit offenem Angebot): 5 Saisons zum Angebotspreis.
export function renew(c) {
  const p = platz(c);
  if (!p.angebot || !p.vertrag) return null;
  p.vertrag = { typ: 'pacht', von: c.season, bis: c.season + PACHT_SEASONS - 1, mul: p.angebot.mul };
  p.angebot = null;
  return tr(`Pachtvertrag um ${PACHT_SEASONS} Jahre verlängert.`, `Lease renewed for ${PACHT_SEASONS} years.`);
}
// Langzeitpacht: 10 Saisons, 20 % billiger, einmalige Gebühr. Jederzeit, solange gepachtet (zum Angebotspreis, falls offen).
export function longLease(c) {
  const p = platz(c);
  const v = p.vertrag;
  if (!v || v.typ === 'eigen' || c.cash < LANGPACHT_FEE) return null;
  book(c, tr('Gebühr Langzeitpacht Sportplatz', 'Fee for long-term lease, sports ground'), -LANGPACHT_FEE);
  p.vertrag = { typ: 'langpacht', von: c.season, bis: c.season + LANGPACHT_SEASONS - 1, mul: p.angebot?.mul ?? v.mul };
  p.angebot = null;
  chronicle(c, tr(`Langzeitpacht für den Sportplatz: ${LANGPACHT_SEASONS} Jahre Planungssicherheit.`, `Long-term lease for the ground: ${LANGPACHT_SEASONS} years of security.`));
  return tr('Langzeitpacht unterschrieben.', 'Long-term lease signed.');
}
// Kauf des Grundstücks: keine Pacht mehr (dafür Grundsteuer), baut ohne Genehmigungsgebühr, die Gemeinde kann nicht kündigen.
export function buyGround(c) {
  const p = platz(c);
  const v = p.vertrag;
  const price = purchasePrice(c);
  if (!v || v.typ === 'eigen' || !hasGround(c) || c.cash < price) return null;
  book(c, tr('Kauf des Sportplatz-Grundstücks', 'Purchase of the sports ground'), -price);
  p.vertrag = { typ: 'eigen', von: c.season, bis: 9999, mul: 1 };
  p.angebot = null;
  adjustMood(c, 0.06);
  chronicle(c, tr('Der Verein kauft das Grundstück: Der Platz gehört jetzt uns.', 'The club buys the land: the pitch is ours now.'));
  return tr('Gekauft! Der Platz gehört dem Verein.', 'Bought! The pitch belongs to the club.');
}

// --- Platzsperre ----------------------------------------------------------------------------------------------------
// Regeln (Spielwerte, angelehnt an die Praxis, dass Platzverein/Schiedsrichter einen unbespielbaren Platz sperren):
//  - nur beim eigenen Heimspiel auf Rasen oder Asche (Kunstrasen und ein zweiter Platz zum Ausweichen sind immun);
//  - Regen sperrt unter Zustand 0,45, Schnee unter 0,7, Frost unter 0,6;
//  - nie zwei Spieltage hintereinander und nicht an den letzten beiden Spieltagen der Saison;
//  - das Spiel wird am Mittwoch danach nachgeholt (NACHHOL_TAG Tage nach dem Sonntag): weniger Zuschauer (×0,7),
//    mehr Absagen (×1,25, mit Flutlicht ×1,1), Schiri-Aufschlag 10 €. Alternativ „Trotzdem spielen": der Platz leidet.
export const SPERRE_AB = { regen: 0.45, schnee: 0.7, frost: 0.6 };
export const NACHHOL_TAG = 3;
export const NACHHOL_FANS = 0.7;
export const NACHHOL_REF = 10;
export const nachholAbsence = (c) => (hasFacility(c, 'flutlicht') ? 1.1 : 1.25);
export const FORCE_DAMAGE = 0.12;

export function sperreReason(c, weather, fixture) {
  const p = platz(c);
  const kind = groundKind(c);
  if (kind === 'none' || kind === 'kunst' || !weather || !fixture) return null;
  if (fixture.home !== humanClub(c).id) return null;
  if (c.round >= c.fixtures.length - 2) return null;
  if (c.round - p.lastSperre <= 1) return null;
  if (hasFacility(c, 'trainingsplatz')) return null;
  const th = SPERRE_AB[weather.id];
  return th && p.cond < th ? weather.id : null;
}
export function sperreCheck(c, weather, fixture) {
  const reason = sperreReason(c, weather, fixture);
  if (!reason) return null;
  const p = platz(c);
  p.lastSperre = c.round;
  p.sperren++;
  return { reason };
}
export const sperreText = (reason) =>
  ({
    regen: tr('Platzsperre! Nach dem Dauerregen ist der Rasen nur noch Schlamm – die Gemeinde sperrt den Platz. Das Spiel wird am Mittwoch nachgeholt.', 'Pitch closed! After the downpours the grass is just mud – the council shuts the ground. The game is replayed on Wednesday.'),
    schnee: tr('Platzsperre! Schnee auf dem abgespielten Rasen – gesperrt. Nachholspiel am Mittwoch.', 'Pitch closed! Snow on the worn grass – shut. Replay on Wednesday.'),
    frost: tr('Platzsperre! Der Platz ist hart gefroren und der Rasen kaputt – gesperrt. Nachholspiel am Mittwoch.', 'Pitch closed! The pitch is frozen solid and the turf is shot – shut. Replay on Wednesday.'),
  })[reason];

// „Trotzdem spielen": hebt die Sperre auf, der Platz leidet.
export function playAnyway(c) {
  const w = c.week;
  if (!w?.postponed) return null;
  w.postponed = null;
  const p = platz(c);
  p.cond = Math.max(0.05, p.cond - FORCE_DAMAGE);
  p.lastSperre = -9;
  return tr('Gespielt wird trotzdem – der Platz zerfurcht.', 'We play anyway – the pitch gets churned up.');
}

// Mittwoch nach dem Spieltag (für Kalender und Spielkarte).
export function nachholDate(c, round = c.round) {
  const d = matchDate(c, round);
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + NACHHOL_TAG));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
export function nachholLabel(c, round = c.round) {
  const d = nachholDate(c, round);
  const m = tr(['', 'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'], ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])[d.month];
  return tr(`Mi., ${d.day}. ${m}`, `Wed ${d.day} ${m}`);
}

// Auswirkung auf die Heimspiel-Kasse. text: Hinweis für die Buchung.
export function homeMatchEffects(c) {
  const p = platz(c);
  const out = { fans: 1, book: [] };
  if (c.week?.postponed) {
    out.fans *= NACHHOL_FANS;
    out.book.push([tr('Nachholspiel unter der Woche: Schiri-Aufschlag', 'Midweek replay: referee surcharge'), -NACHHOL_REF]);
  }
  // Ein Platz, der aussieht wie ein Acker, hält Leute fern.
  if (groundKind(c) !== 'none' && p.cond < 0.35) out.fans *= 0.9;
  if (groundKind(c) !== 'none' && groundKind(c) !== 'kunst' && p.chalk < 0.2) out.book.push([tr('Ordnungsgeld: Linien nicht erkennbar', 'Fine: lines not visible'), -10]);
  return out;
}

// --- Wirkung auf das Spiel und die Darstellung ----------------------------------------------------------------------
// Bei Zustand 1,0 und Linien 1,0 kommt derselbe Platz zurück (Golden und alle Standardwerte unverändert).
// Nur für Heimspiele des eigenen Vereins. Abgenutzt: mehr Unebenheit (bis ×1,8 bei Zustand 0,2), etwas mehr Rollwiderstand.
export const BUMP_PER_WEAR = 1.0;
export const ROLL_PER_WEAR = 0.1;
export function applyPlatz(pitch, c, home) {
  if (!home?.human || !pitch || pitch.id === 'halle') return pitch;
  const p = platz(c);
  const kind = groundKind(c);
  const stand = hasFacility(c, 'sitzplaetze') && (pitch.base ?? pitch.id) === 'grossfeld'; // nur Großfeld: dort liegt die Tribüne im Grafik-Budget (grossfeld_tribuene)
  const worn = kind === 'rasen' || kind === 'asche' ? 1 - p.cond : 0;
  const faded = kind === 'rasen' || kind === 'asche' ? 1 - p.chalk : 0;
  if (worn <= 0.0001 && faded <= 0.0001 && !stand) return pitch;
  const out = { ...pitch };
  if (worn > 0.0001 && pitch.surface) {
    const s = pitch.surface;
    out.surface = { ...s, name: `${s.name} (${tr('abgespielt', 'worn')})`, bumpiness: s.bumpiness * (1 + BUMP_PER_WEAR * worn), rollDecel: s.rollDecel * (1 + ROLL_PER_WEAR * worn) };
    out.worn = round2(worn);
  }
  if (faded > 0.0001) out.fade = round2(faded);
  if (stand) out.extraStand = true; // dieselbe Stahlrohrtribüne wie im überregionalen Pokal (keine zusätzlichen Draw Calls)
  return out;
}

// Zahlen für die Oberfläche.
export function platzInfo(c) {
  const p = platz(c);
  const v = ensureVertrag(c);
  return { kind: groundKind(c), cond: p.cond, chalk: p.chalk, label: conditionLabel(p.cond), vertrag: v, angebot: p.angebot, left: termLeft(c), perMatch: rentPerMatch(c), perSeason: rentPerSeason(c), price: purchasePrice(c), sperren: p.sperren };
}
