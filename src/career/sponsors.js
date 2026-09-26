// Sponsoren: Bäcker, Döner, Bestatter. Jeder hat eine Eigenart, eine Beziehung
// zum Verein (0–100) und ein Saisonziel. Man kann nachverhandeln, verlängern,
// verärgern – und manchmal will der Chef, dass sein Sohn mitspielt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub, playerOf, table } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';

// Eigenarten: treu (bleibt auch in schlechten Zeiten), ehrgeizig (zahlt mehr,
// will Erfolg), knauserig (wenig Geld, harte Verhandlung), großzügig (Extras).
export const TRAITS = {
  treu: { name: tr('treu', 'loyal'), pay: 0.9, win: 2, loss: -1, haggle: 0.5 },
  ehrgeizig: { name: tr('ehrgeizig', 'ambitious'), pay: 1.25, win: 5, loss: -5, haggle: 0.45 },
  knauserig: { name: tr('knauserig', 'tight-fisted'), pay: 0.8, win: 2, loss: -3, haggle: 0.25 },
  grosszuegig: { name: tr('großzügig', 'generous'), pay: 1.1, win: 3, loss: -1, haggle: 0.65 },
};

export const SPONSORS = [
  { id: 'krume', color: 0xc98a3a, name: 'Bäckerei Krume', line: tr('Frische Brötchen nach dem Spiel inklusive.', 'Fresh rolls after the match included.'), trait: 'treu', boss: tr('Bäckermeister Krume', 'Krume the baker') },
  { id: 'vollgas', color: 0xd8322a, name: 'Fahrschule Vollgas', line: tr('Wer einen Führerschein braucht, weiß Bescheid.', 'Anyone needing a driving licence knows where to go.'), trait: 'ehrgeizig', boss: tr('Fahrlehrer Rolf', 'Rolf the driving instructor') },
  { id: 'sultan', color: 0xe0a020, name: 'Döner Sultan', line: tr('Mannschaftsdöner nach jedem Heimsieg.', 'Team kebab after every home win.'), trait: 'grosszuegig', boss: tr('Murat vom Sultan', 'Murat from the Sultan') },
  { id: 'brenner', color: 0x1d4f9c, name: 'Autohaus Brenner', line: tr('Fährt auch mal den Bus zum Auswärtsspiel.', 'Sometimes drives the minibus to away games.'), trait: 'ehrgeizig', boss: tr('Autohändler Brenner', 'Brenner the car dealer') },
  { id: 'physio', color: 0x3aa39a, name: 'Physio am Markt', line: tr('Tapen vor dem Spiel zum Vereinspreis.', 'Pre-match strapping at a club discount.'), trait: 'treu', boss: tr('Physiotherapeutin Sandra', 'Sandra the physio') },
  { id: 'schnittig', color: 0xc04a8a, name: 'Friseur Schnittig', line: tr('Frisur sitzt, auch nach 90 Minuten.', 'Hair stays put, even after 90 minutes.'), trait: 'grosszuegig', boss: tr('Friseurin Jacqueline', 'Jacqueline the hairdresser') },
  { id: 'kowalski', color: 0x8c3a2a, name: 'Dachdeckerei Kowalski', line: tr('Hält dicht – wie unsere Abwehr (hoffentlich).', 'Watertight – like our defence (hopefully).'), trait: 'knauserig', boss: tr('Dachdecker Kowalski', 'Kowalski the roofer') },
  { id: 'hoffmann', color: 0x2e7d3a, name: 'Getränke Hoffmann', line: tr('Die Kiste nach dem Spiel geht aufs Haus.', 'The crate after the match is on the house.'), trait: 'grosszuegig', boss: tr('Getränke-Hoffmann', 'Hoffmann from the drinks market') },
  { id: 'enzo', color: 0x2f8f3f, name: 'Pizzeria Da Enzo', line: tr('Nach dem Auswärtssieg eine Familienpizza.', 'A family pizza after every away win.'), trait: 'treu', boss: 'Enzo' },
  { id: 'blum', color: 0x2f6fb5, name: 'Sanitär Blum', line: tr('Repariert auch die Duschen im Vereinsheim. Irgendwann.', 'Also fixes the clubhouse showers. Eventually.'), trait: 'knauserig', boss: tr('Installateur Blum', 'Blum the plumber') },
  { id: 'muckibude', color: 0x1c1c1c, name: 'Fitnessstudio Muckibude', line: tr('Für die Bauchmuskeln, die man unter dem Trikot nicht sieht.', 'For the abs nobody can see under the shirt.'), trait: 'ehrgeizig', boss: tr('Studioleiter Dragan', 'Dragan the gym manager') },
  { id: 'kalle', color: 0xe8742a, name: 'Kiosk Kalle', line: tr('Lotto, Zigaretten, Zeitung, Spielberichte.', 'Lottery, cigarettes, papers, match reports.'), trait: 'treu', boss: 'Kalle' },
  { id: 'ruhe', color: 0x3a3a44, name: 'Bestattungen Ruhe', line: tr('Wir holen jeden ab. Auch nach dem Abstieg.', 'We collect everyone. Even after relegation.'), trait: 'knauserig', boss: tr('Herr Ruhe', 'Mr Ruhe') },
  { id: 'funke', color: 0xf0c020, name: 'Elektro Funke', line: tr('Macht das Flutlicht an. Wenn es eins gäbe.', 'Turns the floodlights on. If there were any.'), trait: 'treu', boss: tr('Elektromeister Funke', 'Funke the electrician') },
  { id: 'wolf', color: 0xb0302c, name: 'Metzgerei Wurst-Wolf', line: tr('Bratwurst zum Sonderpreis am Grill.', 'Discount bratwurst at the barbecue.'), trait: 'grosszuegig', boss: tr('Metzger Wolf', 'Wolf the butcher') },
  { id: 'klein', color: 0x1d3a6b, name: 'Versicherungsbüro Klein', line: tr('Versichert alles. Außer Luftlöcher.', 'Insures everything. Except air shots.'), trait: 'ehrgeizig', boss: tr('Versicherungsmakler Klein', 'Klein the insurance broker') },
  { id: 'blitzblank', color: 0x4fa3e0, name: 'Autowaschanlage Blitzblank', line: tr('Die Trikots waschen wir nicht. Die Autos schon.', "We don't wash the kits. The cars, yes."), trait: 'treu', boss: tr('Waschanlagen-Uwe', 'Uwe from the car wash') },
  { id: 'schrauber', color: 0x5a5a58, name: 'Kfz-Werkstatt Schrauber', line: tr('TÜV-Termin nach dem Abpfiff.', 'MOT appointment right after the final whistle.'), trait: 'knauserig', boss: tr('Meister Schrauber', 'Schrauber the mechanic') },
  { id: 'lindenwirt', color: 0x6b4f2a, name: 'Gasthof Zur Linde', line: tr('Das Schnitzel nach dem Spiel ist größer als der Teller.', 'The post-match schnitzel is bigger than the plate.'), trait: 'grosszuegig', boss: tr('Lindenwirtin Gerda', 'Gerda from the Linde inn') },
  { id: 'fliesen', color: 0x8a9096, name: 'Fliesen Fugenfrei', line: tr('Sauber verlegt – wie unsere Viererkette.', 'Laid neatly – like our back four.'), trait: 'knauserig', boss: tr('Fliesenleger Norbert', 'Norbert the tiler') },
  { id: 'optik', color: 0x2a2a6b, name: 'Optik Scharfblick', line: tr('Gratis Sehtest für den Schiri.', 'Free eye test for the referee.'), trait: 'ehrgeizig', boss: tr('Optikerin Frau Weiß', 'Mrs Weiß the optician') },
  { id: 'eisdiele', color: 0xf09ab0, name: 'Eiscafé Venezia', line: tr('Nach jedem Heimsieg eine Kugel. Nach dem Aufstieg drei.', 'One scoop after every home win. Three after promotion.'), trait: 'grosszuegig', boss: 'Signora Lucia' },
  { id: 'handy', color: 0x6b4f8c, name: 'Handy-Doktor Çelik', line: tr('Display gesprungen? Grätsche vermasselt? Beides reparierbar.', 'Cracked screen? Botched a slide tackle? Both fixable.'), trait: 'ehrgeizig', boss: tr('Handy-Doktor Emre', 'Emre the phone doctor') },
  { id: 'gruenzeug', color: 0x5cc46a, name: 'Gartenbau Grünzeug', line: tr('Mäht den Platz. Manchmal sogar vor dem Spiel.', 'Mows the pitch. Sometimes even before kick-off.'), trait: 'treu', boss: tr('Gärtner Hansi', 'Hansi the gardener') },
  { id: 'taxi', color: 0xe8c020, name: 'Taxi Tempo', line: tr('Heimweg nach der Weihnachtsfeier zum Vereinstarif.', 'Home from the Christmas party at the club rate.'), trait: 'treu', boss: tr('Taxi-Kemal', 'Kemal the cabbie') },
  { id: 'nagelstudio', color: 0xd06aa0, name: 'Nagelstudio Glamour', line: tr('Die Torwarthandschuhe halten jetzt noch besser.', 'Now the keeper gloves grip even better.'), trait: 'grosszuegig', boss: tr('Studio-Chefin Mandy', 'Mandy from the nail bar') },
  { id: 'baustoffe', color: 0xc8352f, name: 'Baustoffe Brockmann', line: tr('Sand für den Strafraum liefern wir kostenlos.', 'Free sand for the penalty area.'), trait: 'ehrgeizig', boss: tr('Baustoffhändler Brockmann', 'Brockmann the builders merchant') },
  { id: 'hofladen', color: 0x9a6b4f, name: 'Hofladen Kuhglück', line: tr('Frische Milch für die Halbzeit. Bitte nicht mischen.', 'Fresh milk at half-time. Please do not mix.'), trait: 'treu', boss: tr('Bäuerin Anke', 'Anke the farmer') },
  { id: 'tattoo', color: 0x1c1c1c, name: 'Tattoo Nadelwerk', line: tr('Meisterschaft? Wir stechen das Datum.', 'Champions? We will ink the date.'), trait: 'ehrgeizig', boss: tr('Tätowierer Rocco', 'Rocco the tattooist') },
  { id: 'reisebuero', color: 0x2f9fd0, name: 'Reisebüro Fernweh', line: tr('Die Abschlussfahrt planen wir. Mallorca oder Harz.', 'We plan the end-of-season trip. Majorca or the Harz.'), trait: 'grosszuegig', boss: tr('Reiseberaterin Petra', 'Petra the travel agent') },
  { id: 'imbiss', color: 0xe0b020, name: 'Imbiss Currywurst-Kalle', line: tr('Pommes Schranke für jeden Torschützen.', 'Chips with mayo and ketchup for every scorer.'), trait: 'grosszuegig', boss: tr('Imbiss-Kalle', 'Kalle from the chip shop') },
  { id: 'solar', color: 0x2e6b3a, name: 'Solar Sonnenschein', line: tr('Irgendwann bekommt das Vereinsheim Solarzellen. Versprochen.', 'Someday the clubhouse gets solar panels. Promise.'), trait: 'ehrgeizig', boss: tr('Energieberater Dr. Sonne', 'Dr Sonne the energy adviser') },
  { id: 'zahnarzt', color: 0x8ad0e8, name: 'Zahnarztpraxis Dr. Biss', line: tr('Für die Zahnlücke nach dem Kopfballduell.', 'For the gap after that aerial duel.'), trait: 'knauserig', boss: tr('Dr. Biss', 'Dr Biss') },
  { id: 'schluessel', color: 0x8c2f2f, name: 'Schlüsseldienst Sesam', line: tr('Wieder den Kabinenschlüssel vergessen? Wir kommen.', 'Forgot the dressing-room key again? We are on our way.'), trait: 'knauserig', boss: tr('Schlüssel-Heinz', 'Heinz the locksmith') },
  { id: 'fahrrad', color: 0x3a8ad0, name: 'Fahrradladen Speiche', line: tr('Für alle, die ohne Führerschein zum Training kommen.', 'For everyone who cycles to training without a licence.'), trait: 'treu', boss: tr('Fahrradhändlerin Ines', 'Ines from the bike shop') },
  { id: 'bestpreis', color: 0xe8742a, name: 'Getränkemarkt Bestpreis', line: tr('Zwei Kisten zum Preis von anderthalb.', 'Two crates for the price of one and a half.'), trait: 'knauserig', boss: tr('Marktleiter Jürgen', 'Jürgen the store manager') },
  { id: 'moebel', color: 0x4a3222, name: 'Möbel Gemütlich', line: tr('Neue Bänke für die Auswechselspieler. Gepolstert.', 'New benches for the subs. Cushioned.'), trait: 'grosszuegig', boss: tr('Möbelhändler Gemütlich', 'Gemütlich the furniture dealer') },
  { id: 'hundesalon', color: 0xb08850, name: 'Hundesalon Wuff', line: tr('Auch der Vereinshund hat ein Recht auf eine gute Frisur.', 'The club dog deserves a good haircut too.'), trait: 'treu', boss: tr('Hundefriseurin Babsi', 'Babsi the dog groomer') },
  { id: 'computer', color: 0x1d2b44, name: 'PC-Service Bytefix', line: tr('Richtet die Vereins-Homepage ein. Seit 2019.', 'Setting up the club website. Since 2019.'), trait: 'ehrgeizig', boss: tr('IT-Kevin', 'Kevin from IT') },
  { id: 'kuechen', color: 0xf2efe6, name: 'Küchenstudio Kochlöffel', line: tr('Die Vereinsheim-Küche wird endlich neu. Irgendwann.', 'The clubhouse kitchen is finally getting redone. Eventually.'), trait: 'knauserig', boss: tr('Küchenplaner Siggi', 'Siggi the kitchen planner') },
];
export const sponsorDef = (id) => SPONSORS.find((s) => s.id === id);
// Chef und Werbespruch immer in der aktuellen Sprache, auch bei gespeicherten Verträgen.
export const bossOf = (s) => sponsorDef(s?.id)?.boss ?? s?.boss ?? '';
export const lineOf = (s) => sponsorDef(s?.id)?.line ?? s?.line ?? '';
// Markenfarbe für den Trikotaufdruck; unbekannte Sponsoren bekommen eine aus dem Namen.
export function sponsorColor(s) {
  const known = sponsorDef(s?.id)?.color ?? s?.color;
  if (known != null) return known;
  let h = 0;
  for (const ch of String(s?.name ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [0xc8352f, 0x2f6fb5, 0x2e7d3a, 0xe0a020, 0x6b4f8c, 0x1c1c1c][h % 6];
}
// Der Sponsor, der vorne auf dem Trikot steht (falls es einen gibt).
export const shirtSponsor = (career) => career?.sponsors?.find((s) => s.slot === 'trikot') ?? null;

export const SLOTS = tr(
  { trikot: 'Trikotsponsor', bande: 'Bandenpartner', ball: 'Spielballpate', aermel: 'Ärmelsponsor' },
  { trikot: 'shirt sponsor', bande: 'advertising board', ball: 'match ball sponsor', aermel: 'sleeve sponsor' },
);
const SLOT_PAY = { trikot: [8, 14], bande: [4, 8], ball: [2, 4], aermel: [5, 9] };
export const slotsFor = (level) => (level > 1 ? ['trikot', 'aermel', 'bande', 'ball'] : ['trikot', 'bande', 'ball']);

// Saisonziele der Sponsoren mit Bonus bei Erfüllung.
const GOALS = [
  { type: 'wins', n: [3, 5] },
  { type: 'goals', n: [12, 20] },
  { type: 'rank', n: [2, 3] },
  { type: 'fair', n: [6, 10] },
];
const GOAL_TEXT = {
  wins: (n) => tr(`mindestens ${n} Siege`, `at least ${n} wins`),
  goals: (n) => tr(`mindestens ${n} eigene Tore`, `at least ${n} goals scored`),
  rank: (n) => tr(`am Ende unter den ersten ${n}`, `finish in the top ${n}`),
  fair: (n) => tr(`höchstens ${n} Gelbe Karten`, `no more than ${n} yellow cards`),
};
export const goalText = (goal) => GOAL_TEXT[goal?.type]?.(goal.n) ?? goal?.text ?? '';

export function relLabel(v) {
  if (v >= 80) return tr('begeistert', 'delighted');
  if (v >= 60) return tr('zufrieden', 'happy');
  if (v >= 40) return tr('abwartend', 'wait-and-see');
  if (v >= 20) return tr('skeptisch', 'sceptical');
  return tr('verärgert', 'annoyed');
}

export function adjustRel(s, d) {
  if (s) s.rel = Math.max(0, Math.min(100, Math.round((s.rel ?? 50) + d)));
}

function makeOffer(rng, sp, slot, level, extra = {}) {
  const goal = rng.pick(GOALS);
  const n = rng.int(goal.n[0], goal.n[1]);
  const scale = level > 2 ? 3 : level > 1 ? 2 : 1;
  const [lo, hi] = SLOT_PAY[slot];
  const weekly = Math.max(1, Math.round(rng.int(lo, hi) * scale * TRAITS[sp.trait].pay));
  return { ...sp, slot, weekly, goal: { type: goal.type, n, text: GOAL_TEXT[goal.type](n) }, bonus: rng.int(4, 8) * 10 * scale, rel: 50, seasons: 0, ...extra };
}

// Angebote vor Saisonbeginn: Verlängerungen zuerst, dann neue Interessenten.
export function makeOffers(career, level) {
  const rng = createRng(career.seed + career.season * 31 + 5);
  career.offersSeason = career.season;
  const taken = new Set(career.sponsors.map((s) => s.slot));
  const renewals = (career.renewals ?? []).filter((r) => !taken.has(r.slot));
  career.renewals = [];
  const used = new Set([...career.sponsors.map((s) => s.id), ...renewals.map((r) => r.id), ...(career.sponsorBans ?? [])]);
  const offers = [...renewals];
  for (const slot of slotsFor(level)) {
    if (taken.has(slot)) continue;
    const n = renewals.some((r) => r.slot === slot) ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const pool = SPONSORS.filter((s) => !used.has(s.id));
      if (!pool.length) break;
      const sp = rng.pick(pool);
      used.add(sp.id);
      offers.push(makeOffer(rng, sp, slot, level));
    }
  }
  career.offers = offers;
}

export function acceptSponsor(career, i) {
  const o = career.offers[i];
  if (!o || career.round !== 0 || career.sponsors.some((s) => s.slot === o.slot)) return false;
  career.sponsors.push({ ...o, since: o.since ?? career.season });
  career.offers = career.offers.filter((x) => x.slot !== o.slot);
  if (o.renew) chronicle(career, tr(`${o.name} verlängert als ${SLOTS[o.slot]} – ${o.seasons + 1}. Saison zusammen.`, `${o.name} renews as ${SLOTS[o.slot]} – season ${o.seasons + 1} together.`));
  return true;
}

// Nachverhandeln: Wer gut dasteht, bekommt mehr. Wer zu hoch pokert, verliert das Angebot.
export function negotiate(career, i) {
  const o = career.offers[i];
  if (!o || o.negotiated || career.round !== 0) return null;
  const rng = createRng((career.seed * 41 + career.season * 17 + i * 7 + o.id.length) >>> 0);
  const last = career.history?.at(-1);
  const standing = 0.5 * (career.mood ?? 0) + (last ? (last.pos <= 2 ? 0.2 : last.pos >= 5 ? -0.15 : 0) : 0) + (o.renew ? 0.15 : 0);
  const p = Math.max(0.1, Math.min(0.85, TRAITS[o.trait].haggle + standing));
  const boss = bossOf(o);
  o.negotiated = true;
  const run = outcome([
    { w: p * 3, run: () => ((o.weekly = Math.round(o.weekly * 1.3)), tr(`${boss} lacht: „Ihr habt Mumm." ${o.weekly} € pro Spieltag – 30 % mehr.`, `${boss} laughs: "You've got guts." €${o.weekly} per matchday – 30 % more.`)) },
    { w: 2, run: () => ((o.weekly = Math.round(o.weekly * 1.1 + 0.5)), tr(`Zäh, aber es geht was: ${o.weekly} € pro Spieltag.`, `Hard going, but there's some movement: €${o.weekly} per matchday.`)) },
    { w: 1.5, run: () => ((o.bonus = Math.round(o.bonus * 1.5)), (o.weekly = Math.max(1, o.weekly - 1)), tr(`${boss} bietet was anderes an: weniger pro Woche, aber ${o.bonus} € Bonus bei ${goalText(o.goal)}.`, `${boss} offers something different: less per week, but a €${o.bonus} bonus for ${goalText(o.goal)}.`)) },
    { w: (1 - p) * 3, run: () => tr(`${boss} schüttelt den Kopf: „Mehr ist nicht drin." Das Angebot steht trotzdem.`, `${boss} shakes his head: "That's as far as I go." The offer still stands.`) },
    {
      w: (1 - p) * (o.trait === 'knauserig' ? 2.5 : 1.2),
      run: (c) => {
        c.offers = c.offers.filter((x) => x !== o);
        return tr(`${boss} steht auf: „Dann eben nicht." Das Angebot ist weg.`, `${boss} stands up: "Suit yourselves." The offer is gone.`);
      },
    },
    { w: o.trait === 'grosszuegig' ? 1 : 0.3, run: () => ((o.weekly += 2), (o.bonus += 20), (o.rel = 65), tr(`${boss} spendiert eine Runde und legt drauf: ${o.weekly} € pro Spieltag, ${o.bonus} € Bonus. „Für den Verein!"`, `${boss} buys a round and adds more: €${o.weekly} per matchday, €${o.bonus} bonus. "For the club!"`)) },
  ]);
  const text = run(career, {}, rng);
  career.sponsorNote = text;
  return text;
}

// Jede Woche: Geld (wer verärgert ist, zahlt schleppend) und ein wachsames Auge aufs Ergebnis.
export function paySponsors(career) {
  for (const s of career.sponsors) {
    if (s.pause > 0) {
      s.pause--;
      continue;
    }
    if ((s.rel ?? 50) < 20 && ((career.round + s.id.length) % 3 === 0)) {
      s.owed = (s.owed ?? 0) + s.weekly;
      continue; // „Kommt nächste Woche, versprochen."
    }
    book(career, `${s.name} (${SLOTS[s.slot]})`, s.weekly + (s.owed ?? 0));
    s.owed = 0;
  }
  // Wer ganz unten ist, kündigt mitten in der Saison.
  const gone = career.sponsors.filter((s) => (s.rel ?? 50) <= 5);
  for (const s of gone) {
    career.sponsors = career.sponsors.filter((x) => x !== s);
    career.sponsorBans = [...(career.sponsorBans ?? []), s.id];
    career.week?.chat.push({ from: null, text: tr(`${s.name} kündigt den Vertrag als ${SLOTS[s.slot]}. ${bossOf(s)}: „So nicht."`, `${s.name} cancels the ${SLOTS[s.slot]} deal. ${bossOf(s)}: "Not like this."`), time: 'Fr 17:00' });
  }
}

// Nach jedem eigenen Spiel: Sieg freut, Niederlage ärgert – und Prämien werden fällig.
export function sponsorResult(career, gf, ga) {
  const prem = career.flags?.sponsorPremium;
  for (const s of career.sponsors) {
    const t = TRAITS[s.trait] ?? TRAITS.treu;
    adjustRel(s, gf > ga ? t.win : gf < ga ? t.loss : 0);
  }
  if (prem && prem.round === career.round) {
    const s = career.sponsors.find((x) => x.id === prem.id);
    if (gf > ga) {
      book(career, tr(`Siegprämie ${prem.name}`, `Win bonus ${prem.name}`), prem.amount);
      adjustRel(s, 5);
    } else if (prem.double) {
      book(career, tr(`Doppelt oder nichts verloren (${prem.name})`, `Double or nothing lost (${prem.name})`), -Math.round(prem.amount / 2));
      adjustRel(s, -4);
    } else adjustRel(s, -3);
    career.flags.sponsorPremium = null;
  }
}

export function goalReached(goal, { wins, goals, rank, cards }) {
  if (goal.type === 'wins') return wins >= goal.n;
  if (goal.type === 'goals') return goals >= goal.n;
  if (goal.type === 'rank') return rank <= goal.n;
  if (goal.type === 'fair') return cards <= goal.n;
  return false;
}

// Wie steht es gerade ums Saisonziel?
export function goalProgress(career, goal) {
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human);
  const own = rows[pos];
  if (goal.type === 'wins') return tr(`${own.w} / ${goal.n} Siege`, `${own.w} / ${goal.n} wins`);
  if (goal.type === 'goals') return tr(`${own.gf} / ${goal.n} Tore`, `${own.gf} / ${goal.n} goals`);
  if (goal.type === 'rank') return tr(`aktuell Platz ${pos + 1}`, `currently ${pos + 1}.`);
  if (goal.type === 'fair') return tr(`${career.seasonCards ?? 0} / ${goal.n} Gelbe`, `${career.seasonCards ?? 0} / ${goal.n} yellows`);
  return '';
}

// Saisonende: Bonus, und wer zufrieden ist, bietet die Verlängerung an.
export function closeSponsors(career, summary) {
  career.renewals = [];
  const notes = [];
  for (const s of career.sponsors) {
    const reached = goalReached(s.goal, summary);
    if (reached) {
      book(career, `${tr('Bonus', 'Bonus')} ${s.name}: ${goalText(s.goal)}`, s.bonus);
      adjustRel(s, 15);
    } else adjustRel(s, -10);
    const loyal = s.trait === 'treu' ? 10 : 0;
    if ((s.rel ?? 50) + loyal >= 55) {
      const rng = createRng((career.seed + career.season * 13 + s.id.length) >>> 0);
      const raise = 1 + (reached ? 0.15 : 0) + ((s.rel ?? 50) >= 80 ? 0.1 : 0);
      const fresh = makeOffer(rng, sponsorDef(s.id) ?? s, s.slot, career.level ?? 1);
      career.renewals.push({ ...fresh, weekly: Math.max(fresh.weekly, Math.round(s.weekly * raise)), rel: Math.min(100, (s.rel ?? 50) + 5), seasons: (s.seasons ?? 0) + 1, since: s.since ?? career.season, renew: true });
    } else if ((s.rel ?? 50) < 30) notes.push(tr(`${s.name} verlängert nicht. ${bossOf(s)}: „War nett. War aber auch nicht gut."`, `${s.name} will not renew. ${bossOf(s)}: "It was nice. It just wasn't any good."`));
  }
  career.sponsors = [];
  career.offers = [];
  career.sponsorNotes = notes;
  return notes;
}

// --- Ereignisse rund um die Sponsoren -------------------------------------------------

const mates = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));
const pickSponsor = (c, rng, f = () => true) => {
  const list = (c.sponsors ?? []).filter(f);
  return list.length ? rng.pick(list) : null;
};
const sp = (c, ctx) => c.sponsors?.find((s) => s.id === ctx.id);
const withSponsor = (fn) => (c, ctx, rng) => {
  const s = sp(c, ctx);
  return s ? fn(c, ctx, rng, s, bossOf(s)) : tr('Der Sponsor hat sich inzwischen erledigt.', 'The sponsor has since dropped out anyway.');
};

export const SPONSOR_EVENTS = {
  sponsor_fototermin: {
    weight: 1.2,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      if (!s || c.round < 1) return null;
      const star = [...mates(c)].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0];
      return star != null ? { id: s.id, name: s.name, star } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} will ein Werbefoto für das Schaufenster. Am liebsten mit ${first(c, ctx.star)}, „dem Guten".`, `${ctx.name} wants an advertising photo for the shop window. Ideally with ${first(c, ctx.star)}, "the good one".`),
    options: [
      {
        label: tr('Den Star hinschicken', 'Send the star'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), tr(`${first(c, ctx.star)} lächelt wie ein Profi. Das Foto hängt jetzt neben den Mettbrötchen.`, `${first(c, ctx.star)} smiles like a pro. The photo now hangs next to the sausage rolls.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), (c.players[ctx.star].grumpy = 2), tr(`${first(c, ctx.star)} macht es, murrt aber: „Ich bin Fußballer, kein Model."`, `${first(c, ctx.star)} does it, but grumbles: "I'm a footballer, not a model."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), book(c, tr(`Honorar Fotoshooting ${s.name}`, `Photo shoot fee ${s.name}`), 25), tr('Das Foto kommt so gut an, dass es 25 € Honorar gibt.', 'The photo goes down so well there is a €25 fee.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -5), adjustMood(c, -0.03), tr(`${first(c, ctx.star)} vergisst den Termin. ${boss} hat umsonst die Deko aufgebaut.`, `${first(c, ctx.star)} forgets the appointment. ${boss} set up the decorations for nothing.`))) },
          { w: 0.8, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 8), (c.flags.pressWeeks = 2), tr('Das Kreisblatt druckt das Werbefoto nach. Mehr Zuschauer am Sonntag.', 'The District Gazette reprints the photo. More spectators on Sunday.'))) },
        ]),
      },
      {
        label: tr('Die ganze Mannschaft kommt', 'The whole team goes'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.05), tr('Mannschaftsfoto im Laden. Einer steht mit dem Kopf im Regal, alle lachen.', 'Team photo in the shop. One of them has his head in the shelves, everyone laughs.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 6), book(c, tr('Brötchen und Kaffee für alle (auf Vereinskosten)', 'Rolls and coffee for everyone (on the club)'), -15), tr('Hinterher gibt es Kaffee – leider auf Vereinskosten.', 'Coffee afterwards – sadly on the club.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -4), tr('Nur vier kommen. Das Foto sieht aus wie ein Kegelclub.', 'Only four turn up. The photo looks like a bowling club.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 18), adjustMood(c, 0.04), tr(`${boss} ist so gerührt, dass er Trikots für die Jugend spendiert.`, `${boss} is so touched he donates shirts for the youth teams.`))) },
        ]),
      },
      { label: tr('Keine Zeit, wir sind Fußballer', 'No time, we are footballers'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -8), tr(`${boss} ist beleidigt. Die Brötchen sind am Sonntag etwas kleiner.`, `${boss} is offended. The rolls are a bit smaller on Sunday.`))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), tr('Der Sponsor nimmt stattdessen seinen Hund aufs Foto. Kommt super an.', 'The sponsor puts his dog in the photo instead. Goes down a treat.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), tr(`Beim nächsten Heimspiel fehlt ${s.name} auf der Tribüne. Absichtlich.`, `At the next home game ${s.name} is missing from the stand. On purpose.`))) }]) },
    ],
  },

  sponsor_sohn: {
    weight: 0.9,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s), son: rng.pick(['Kevin-Pascal', 'Justin', 'Maximilian', 'Jannik', 'Leon']) } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} ruft an: Sein Sohn ${ctx.son} (19) will unbedingt mitspielen. „Er ist wirklich talentiert. Sagt seine Mutter."`, `${ctx.boss} calls: his son ${ctx.son} (19) is desperate to play. "He's really talented. His mother says so."`),
    options: [
      {
        label: tr('Er darf am Sonntag ran', 'He can play on Sunday'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), adjustMood(c, -0.05), tr(`${ctx.son} spielt zwanzig Minuten und stolpert über den Ball. Der Vater filmt alles. Die Mannschaft verdreht die Augen.`, `${ctx.son} plays twenty minutes and trips over the ball. His father films everything. The team rolls its eyes.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), adjustMood(c, 0.04), tr(`${ctx.son} ist tatsächlich brauchbar! Keiner hat es geglaubt, am wenigsten er selbst.`, `${ctx.son} is actually decent! Nobody believed it, least of all him.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), book(c, tr(`Spende ${s.name} (stolzer Vater)`, `Donation ${s.name} (proud father)`), 50), tr(`${ctx.son} schießt ein Tor, gegen einen Torwart mit Grippe. Der Vater spendet 50 €.`, `${ctx.son} scores a goal against a keeper with flu. His father donates €50.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -6), adjustMood(c, -0.06), tr(`${ctx.son} beschwert sich beim Papa über „das Niveau". ${boss} ruft wieder an.`, `${ctx.son} complains to his dad about "the standard". ${boss} calls again.`))) },
        ]),
      },
      {
        label: tr('Erst mal Probetraining', 'A trial session first'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), tr(`${ctx.son} kommt, schwitzt, kommt nicht wieder. Alle sind zufrieden.`, `${ctx.son} comes, sweats, never comes back. Everyone is happy.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), adjustMood(c, 0.03), tr(`${ctx.son} ist nett und bringt Kuchen mit. Kein Fußballer, aber jetzt Betreuer am Getränkewagen.`, `${ctx.son} is nice and brings cake. No footballer, but now he runs the drinks trolley.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -10), tr(`${ctx.son} erzählt zu Hause, er sei „gemobbt" worden. Er hat nur einen Ball an den Kopf bekommen.`, `${ctx.son} tells them at home he was "bullied". He just took a ball to the head.`))) },
        ]),
      },
      {
        label: tr('Ehrlich absagen – bei uns spielt, wer trainiert', 'Say no honestly – here, whoever trains plays'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), adjustMood(c, 0.06), tr('Die Mannschaft rechnet dir das hoch an. Der Sponsor weniger.', 'The team respects you for it. The sponsor less so.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 2), tr(`${boss} brummt: „Hätte ich an Ihrer Stelle auch gemacht."`, `${boss} grunts: "I'd have done the same in your shoes."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -30), adjustMood(c, 0.04), tr(`${boss} ist tief beleidigt und spricht von „Konsequenzen". Die Brötchen sind jetzt richtig klein.`, `${boss} is deeply offended and talks about "consequences". The rolls are really small now.`))) },
        ]),
      },
    ],
  },

  sponsor_konkurrenz: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.slot === 'trikot' || x.slot === 'aermel');
      if (!s || c.round < 3) return null;
      const used = new Set([...c.sponsors.map((x) => x.id), ...(c.sponsorBans ?? [])]);
      const pool = SPONSORS.filter((x) => !used.has(x.id));
      if (!pool.length) return null;
      const rival = rng.pick(pool);
      return { id: s.id, name: s.name, rival: rival.id, rivalName: rival.name, offer: Math.round(s.weekly * 1.4 + 2) };
    },
    text: (c, ctx) => tr(`${ctx.rivalName} will auf euer Trikot – und bietet ${ctx.offer} € pro Spieltag. Aktuell steht dort ${ctx.name}.`, `${ctx.rivalName} wants to be on your shirt – and offers €${ctx.offer} per matchday. Right now it says ${ctx.name}.`),
    options: [
      {
        label: tr('Wechseln – Geld ist Geld', 'Switch – money is money'),
        effect: outcome([
          {
            w: 3,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 55, seasons: 0, since: c.season });
              chronicle(c, tr(`Trikotwechsel mitten in der Saison: ${def.name} ersetzt ${s.name}.`, `Shirt change mid-season: ${def.name} replaces ${s.name}.`));
              return tr(`Neue Trikots mit ${def.name}. ${boss} grüßt dich nicht mehr beim Bäcker.`, `New shirts with ${def.name}. ${boss} no longer says hello at the bakery.`);
            }),
          },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 40, seasons: 0, since: c.season });
              book(c, tr('Neue Trikots beflocken lassen', 'New shirt printing'), -30);
              adjustMood(c, -0.04);
              return tr('Gewechselt – aber die neuen Trikots muss der Verein beflocken lassen (30 €). Und die Jungs mochten die alten.', 'Switched – but the club has to pay for the new printing (€30). And the lads liked the old ones.');
            }),
          },
        ]),
      },
      {
        label: tr('Als Druckmittel nutzen', 'Use it as leverage'),
        effect: outcome([
          { w: 2.5, run: withSponsor((c, ctx, rng, s, boss) => ((s.weekly = Math.round((s.weekly + ctx.offer) / 2)), adjustRel(s, -5), tr(`${boss} zieht zähneknirschend nach: ${s.weekly} € pro Spieltag.`, `${boss} grudgingly matches it halfway: €${s.weekly} per matchday.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => ((s.weekly = ctx.offer), adjustRel(s, 5), tr(`${boss}: „Was die können, kann ich schon lange." ${s.weekly} € pro Spieltag.`, `${boss}: "Anything they can do, I can do better." €${s.weekly} per matchday.`))) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              return tr(`Verzockt. ${boss} steigt beleidigt aus, und ${ctx.rivalName} hat inzwischen den Nachbarverein gefunden. Der Platz ist leer.`, `Overplayed. ${boss} pulls out in a huff, and ${ctx.rivalName} has since found the club next door. The slot is empty.`);
            }),
          },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -15), tr(`${boss} bleibt beim alten Betrag und ist jetzt dauerhaft eingeschnappt.`, `${boss} sticks to the old amount and is now permanently sulking.`))) },
        ]),
      },
      { label: tr('Treu bleiben', 'Stay loyal'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 15), tr(`${boss} erfährt davon und ist gerührt. „Das vergess ich euch nicht."`, `${boss} hears about it and is touched. "I won't forget that."`))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 20), (s.bonus += 20), tr(`${boss} legt 20 € auf den Saisonbonus drauf. Treue lohnt sich.`, `${boss} adds €20 to the season bonus. Loyalty pays.`))) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), tr('Ob er es je erfährt? Egal. Man bleibt sich treu.', 'Will he ever find out? Doesn\'t matter. You stay loyal.'))) }]) },
    ],
  },

  sponsor_pleite: {
    weight: 0.35,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait !== 'grosszuegig');
      return s && c.round >= 3 ? { id: s.id, name: s.name, boss: bossOf(s) } : null;
    },
    text: (c, ctx) => tr(`Schlechte Nachrichten: ${ctx.name} steckt in Schwierigkeiten. ${ctx.boss} fragt, ob er die nächsten Wochen aussetzen darf.`, `Bad news: ${ctx.name} is in trouble. ${ctx.boss} asks if he can skip payments for the next few weeks.`),
    options: [
      {
        label: tr('Die Mannschaft kauft dort ein – Rettungsaktion', 'The team shops there – rescue mission'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 30), adjustMood(c, 0.06), chronicle(c, tr(`Rettungsaktion für ${s.name}: Die ganze Mannschaft kauft eine Woche nur dort ein.`, `Rescue mission for ${s.name}: the whole team shops only there for a week.`)), tr(`Eine Woche lang kauft die ganze Mannschaft bei ${s.name}. ${boss} weint fast. Der Laden bleibt offen.`, `For a whole week the team shops at ${s.name}. ${boss} almost cries. The shop stays open.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 25), (s.weekly = Math.max(1, s.weekly - 2)), tr('Der Laden überlebt, zahlt aber erst mal 2 € weniger. Ehrensache.', 'The shop survives, but pays €2 less for now. Only right.'))) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s, boss) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              return tr(`Es reicht leider nicht. ${s.name} schließt. ${boss} schenkt dem Verein zum Abschied das Ladenschild – es hängt jetzt im Vereinsheim.`, `Sadly it's not enough. ${s.name} closes. ${boss} gives the club the shop sign as a farewell – it now hangs in the clubhouse.`);
            }),
          },
        ]),
      },
      {
        label: tr('Aussetzen lassen', 'Let him pause payments'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => ((s.pause = 3), adjustRel(s, 20), tr('Drei Wochen ohne Geld. Dafür ein Sponsor fürs Leben.', 'Three weeks without money. But a sponsor for life.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 25), (s.bonus += 30), tr(`${boss} berappelt sich schneller als gedacht und legt 30 € auf den Bonus. „Das vergess ich euch nie."`, `${boss} recovers faster than expected and adds €30 to the bonus. "I'll never forget that."`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (c.sponsors = c.sponsors.filter((x) => x !== s), tr('Aus drei Wochen werden zehn, dann ist der Laden zu. Immerhin im Guten.', 'Three weeks become ten, then the shop closes. At least on good terms.'))) },
        ]),
      },
      {
        label: tr('Vertrag ist Vertrag', 'A contract is a contract'),
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s, boss) => (book(c, tr(`Letzte Rate ${s.name}`, `Final payment ${s.name}`), s.weekly * 2), (c.sponsors = c.sponsors.filter((x) => x !== s)), (c.sponsorBans = [...(c.sponsorBans ?? []), s.id]), adjustMood(c, -0.04), tr(`${boss} zahlt zwei Raten und kündigt. Im Ort redet man darüber.`, `${boss} pays two instalments and cancels. The whole town is talking about it.`))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -25), tr(`${boss} zahlt weiter, mit zusammengebissenen Zähnen.`, `${boss} keeps paying, through gritted teeth.`))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => ((c.sponsors = c.sponsors.filter((x) => x !== s)), adjustMood(c, -0.08), tr('Der Anwalt des Sponsors meldet sich. Kein Geld, dafür viel Ärger.', 'The sponsor\'s lawyer gets in touch. No money, lots of trouble.'))) },
        ]),
      },
    ],
  },

  sponsor_praemie: {
    weight: 1,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait === 'ehrgeizig' || x.trait === 'grosszuegig');
      return s && !c.flags?.sponsorPremium ? { id: s.id, name: s.name, boss: bossOf(s), amount: (c.level ?? 1) > 1 ? 60 : 40 } : null;
    },
    text: (c, ctx) => tr(`${ctx.boss} ist heiß auf Sonntag: „Wenn ihr gewinnt, gibt es ${ctx.amount} € Siegprämie!"`, `${ctx.boss} is fired up for Sunday: "Win and there's a €${ctx.amount} bonus!"`),
    options: [
      { label: tr('Angenommen!', 'Deal!'), effect: outcome([{ w: 3, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), tr('Prämie angenommen. Die Jungs trainieren plötzlich freiwillig.', 'Bonus accepted. Suddenly the lads are training voluntarily.')) }, { w: 1, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), adjustMood(c, 0.04), tr('Die Gruppe rechnet schon aus, wie viele Kästen das sind.', 'The group is already working out how many crates that is.')) }]) },
      { label: tr('Doppelt oder nichts', 'Double or nothing'), effect: outcome([{ w: 2, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount * 2, round: c.round, double: true }), tr(`„Doppelt oder nichts – und bei Niederlage zahlt ihr die Hälfte." Es geht um ${ctx.amount * 2} €.`, `"Double or nothing – and if you lose, you pay half." €${ctx.amount * 2} at stake.`)) }, { w: 1, run: (c, ctx) => (adjustRel(sp(c, ctx), -3), (c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), tr(`${ctx.boss} winkt ab: „Übertreibt es nicht." Es bleibt bei ${ctx.amount} €.`, `${ctx.boss} waves it off: "Don't push it." It stays at €${ctx.amount}.`)) }]) },
      { label: tr('Danke, wir spielen auch so', 'Thanks, we\'ll play anyway'), effect: outcome([{ w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), tr('Der Sponsor ist irritiert, aber einverstanden.', 'The sponsor is puzzled, but fine with it.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 4), adjustMood(c, 0.02), tr(`${boss}: „Ehrenamt pur. Respekt."`, `${boss}: "Pure amateur spirit. Respect."`))) }]) },
    ],
  },

  sponsor_werbespot: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: bossOf(s) } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} dreht einen Werbespot fürs Lokalradio-Internet. Die Mannschaft soll „authentisch jubeln". 30 € Gage.`, `${ctx.name} is shooting an ad for the local radio's website. The team is supposed to "celebrate authentically". €30 fee.`),
    options: [
      {
        label: tr('Machen wir!', 'We\'re in!'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustRel(s, 10), tr('Zwölf Takes, bis der Jubel echt aussieht. Beim dreizehnten war er echt, weil Feierabend war.', 'Twelve takes until the celebration looks real. The thirteenth was real, because it was home time.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustRel(s, 15), (c.flags.pressWeeks = 3), tr('Der Spot geht im Ort herum. Plötzlich kennt euch jeder – mehr Zuschauer!', 'The ad does the rounds in town. Suddenly everyone knows you – more spectators!'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), adjustMood(c, -0.05), tr('Im Spot sieht man nur den Trainer beim Stolpern. Der Clip wird im Gegnerlager rauf und runter gespielt.', 'All you see in the ad is the manager tripping over. The clip is played on repeat by the opposition.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2); return (book(c, tr(`Gage Werbespot ${s.name}`, `Ad fee ${s.name}`), 30), tr(`${first(c, s2)} zerrt sich beim Torjubel für die Kamera. Sonntag fehlt er.`, `${first(c, s2)} pulls a muscle celebrating for the camera. He misses Sunday.`)); }) },
        ]),
      },
      { label: tr('Nein, wir sind doch keine Schauspieler', 'No, we are not actors'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -6), tr('Der Sponsor dreht mit seinen Azubis. Die jubeln, als hätten sie noch nie einen Ball gesehen.', 'The sponsor shoots it with his apprentices. They celebrate as if they had never seen a ball.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -1), tr(`${boss} versteht es. „Dann eben mein Dackel."`, `${boss} understands. "My dachshund it is, then."`))) }]) },
    ],
  },

  sponsor_feier: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s ? { id: s.id, name: s.name, boss: bossOf(s), years: 10 + rng.int(0, 8) * 5 } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} feiert ${ctx.years}-jähriges Jubiläum – Samstagabend, und die Mannschaft ist eingeladen.`, `${ctx.name} is celebrating ${ctx.years} years in business – Saturday night, and the team is invited.`),
    options: [
      {
        label: tr('Alle hin, wir feiern mit', 'Everyone goes, we party too'),
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.06), tr('Freibier, Musik vom Band, die Jungs singen das Vereinslied. Der Sponsor ist entzückt.', 'Free beer, music off a playlist, the lads sing the club song. The sponsor is delighted.'))) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2, 'late'); return (adjustRel(s, 10), tr(`Wurde lang. ${first(c, s2)} kommt Sonntag erst zur zweiten Halbzeit.`, `It was a late one. ${first(c, s2)} only turns up for the second half on Sunday.`)); }) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), tr('Einer hält eine Rede über den Sponsor. Leider die ehrliche Version.', 'Someone gives a speech about the sponsor. Unfortunately the honest version.'))) },
          { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 18), book(c, tr(`Spende von ${s.name} (Jubiläumslaune)`, `Donation from ${s.name} (anniversary mood)`), 40), tr(`Um Mitternacht zückt ${boss} das Portemonnaie: 40 € für die Mannschaftskasse.`, `At midnight ${boss} gets his wallet out: €40 for the team kitty.`))) },
        ]),
      },
      { label: tr('Du gehst allein, die Jungs schlafen', 'You go alone, the lads sleep'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), c.coach && (c.coach.patience = Math.max(0, c.coach.patience - 5)), tr('Du stehst allein am Stehtisch. Der Sponsor freut sich trotzdem. Die Familie weniger.', 'You stand alone at a high table. The sponsor is pleased anyway. The family less so.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, 9), tr(`Du tanzt mit der Frau von ${boss}. Man redet noch Wochen darüber.`, `You dance with ${boss}'s wife. People talk about it for weeks.`))) }]) },
      { label: tr('Absagen, Sonntag ist Spieltag', 'Decline, Sunday is matchday'), effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -7), tr('Der Sponsor schickt ein Foto vom leeren Mannschaftstisch.', 'The sponsor sends a photo of the empty team table.'))) }, { w: 1, run: withSponsor((c, ctx, rng, s, boss) => (adjustRel(s, -1), tr(`${boss}: „Verstehe. Hauptsache, ihr gewinnt."`, `${boss}: "I understand. As long as you win."`))) }]) },
    ],
  },
};
