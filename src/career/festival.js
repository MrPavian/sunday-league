// Vereinsfest (ROADMAP 11.9): einmal pro Saison, im Sommer nach dem letzten Spieltag. Der Vorstand plant die
// Bausteine (Stände, Torwand, Hüpfburg …), jeder kostet Geld und braucht Ehrenamtliche; das Wetter spielt mit.
// Danach gibt es einen Kreisblatt-Bericht: Besucher, Einnahmen, Stimmung, neue Fördermitglieder, Sponsoren.
// Alles ist deterministisch (Seed aus Spielstand und Saison) – dieselbe Planung ergibt dasselbe Fest.
//
// Zahlen sind Spielwerte, keine Messwerte (erfunden, damit die Wirtschaft stimmt): geeicht mit
// `node scripts/longrun.mjs 8 4242 --bot --fest`, Ziel: ein ordentliches Fest bringt auf Stufe 1 nur ein kleines Plus
// (die Wirkung liegt in Stimmung, Mitgliedern und Sponsoren), ein schlecht geplantes kostet etwas Geld.
import { tr, euroFmt } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { salesMul } from './facilities.js';
import { humanClub, playerOf, seasonOver } from './career.js';
import { clubLife } from './clublife.js';
import { chronicle } from './sagas.js';
import { isCoach } from './personal.js';
import { adjustRel } from './sponsors.js';
import { WEATHER, weatherOn } from './weather.js';

// Bausteine. cost: Einkauf bzw. Miete vorab (Stufe 1), crew: Ehrenamtliche, appeal: lockt Besucher (Summe wirkt auf die
// Besucherzahl), spend: Umsatz je Besucher im Schnitt, wet: Anteil, der bei Regen/Sturm wegfällt (1 = fällt ganz aus).
export const FEST_PARTS = {
  grill: { name: tr('Grill & Getränkestand', 'Barbecue & drinks stall'), icon: 'grill', cost: 45, crew: 3, appeal: 0.05, spend: 2.2, wet: 0.35, blurb: tr('Bratwurst, Steak, Bier und Limo. Der Klassiker.', 'Bratwurst, steak, beer and lemonade. The classic.') },
  kuchen: { name: tr('Kuchenbuffet', 'Cake buffet'), icon: 'kuchen', cost: 15, crew: 2, appeal: 0.03, spend: 0.7, wet: 0.2, blurb: tr('Spenden der Mütter, Preis nach Gefühl.', 'Donated by the mums, priced by feel.') },
  tombola: { name: tr('Tombola', 'Raffle'), icon: 'tombola', cost: 35, crew: 2, appeal: 0.04, spend: 1.1, wet: 0.3, blurb: tr('Preise von Gönnern, Lose zu 50 Cent.', 'Prizes from patrons, tickets at 50 cents.') },
  torwand: { name: tr('Torwandschießen', 'Target-wall shooting'), icon: 'torwand', cost: 10, crew: 1, appeal: 0.06, spend: 0.35, wet: 0.5, blurb: tr('Drei Schuss für einen Euro. Unten rechts zählt doppelt.', 'Three shots for a euro. Bottom right counts double.') },
  elfer: { name: tr('Elfmeterkönig', 'Penalty king'), icon: 'elfer', cost: 10, crew: 2, appeal: 0.08, spend: 0.35, wet: 0.6, blurb: tr('Jeder gegen den Torwart. Der Kader schaut zu – und zittert.', 'Everyone against the keeper. The squad watches – and trembles.') },
  huepfburg: { name: tr('Hüpfburg', 'Bouncy castle'), icon: 'huepfburg', cost: 40, crew: 1, appeal: 0.1, spend: 0.15, wet: 1, kids: true, blurb: tr('Miete vom Verleih. Bei Sturm bleibt sie zu.', 'Rented. Stays shut in a gale.') },
  kinderturnier: { name: tr('Kinderturnier', 'Kids\' tournament'), icon: 'kinder', cost: 20, crew: 3, appeal: 0.12, spend: 0.2, wet: 0.6, kids: true, blurb: tr('Medaillen, Trinkpäckchen, die Jugend spielt.', 'Medals, drink pouches, the youth teams play.') },
};
export const FEST_ORDER = Object.keys(FEST_PARTS);

// Besucher-Grundwert und Kostenfaktor je Liga (Index = Stufe). Ein Dorffest in der Freizeitliga ist klein.
const BASE_VISITORS = [0, 50, 70, 90, 120, 160];
const COST_MUL = [0, 1, 1.3, 1.6, 2, 2.6];
const SPEND_MUL = 0.9; // Umsatz je Besucher insgesamt, zum Eichen
const level = (c) => Math.min(5, Math.max(1, c.level ?? 1));
export const partCost = (c, id) => Math.round(FEST_PARTS[id].cost * COST_MUL[level(c)]);

// --- Zustand -----------------------------------------------------------------------------------------
// c.festival: { season, status: 'none' | 'planned' | 'done' | 'skipped', plan: [ids], report, history: [{season, visitors, net}] }
export function initFestival(c) {
  c.festival ??= { season: 0, status: 'none', plan: [], report: null, history: [] };
  c.festival.history ??= [];
  c.cups ??= {};
  return c;
}
export function festivalOf(c) {
  initFestival(c);
  const f = c.festival;
  return f.season === c.season ? f : { season: c.season, status: 'none', plan: [], report: null, history: f.history };
}
const touch = (c) => {
  const f = initFestival(c).festival;
  if (f.season !== c.season) Object.assign(f, { season: c.season, status: 'none', plan: [], report: null });
  return f;
};
// Das Fest steigt im Sommer (nach dem letzten Spieltag); geplant wird es jederzeit.
export const festivalDue = (c) => seasonOver(c) && festivalOf(c).status !== 'done' && festivalOf(c).status !== 'skipped';

// Ehrenamtliche: ein harter Kern, dazu Kader, Förderverein, Wirt und Platzwart.
export function volunteers(c) {
  const squad = humanClub(c).squad.filter((i) => !isCoach(c, i)).length;
  const l = clubLife(c);
  return 3 + Math.floor(squad * 0.6) + Math.min(6, l.supporters ?? 0) + (c.staff?.wirt ? 2 : 0) + (c.staff?.platzwart ? 1 : 0);
}
export const crewNeeded = (plan) => plan.reduce((s, id) => s + (FEST_PARTS[id]?.crew ?? 0), 0);
export const planCost = (c, plan) => plan.reduce((s, id) => s + (FEST_PARTS[id] ? partCost(c, id) : 0), 0);

export function festivalPlan(c, ids) {
  const f = touch(c);
  if (f.status === 'done' || f.status === 'skipped') return false;
  f.plan = FEST_ORDER.filter((id) => ids.includes(id)); // feste Reihenfolge: gleiche Wahl, gleiches Fest
  f.status = f.plan.length ? 'planned' : 'none';
  return true;
}
export function festivalToggle(c, id) {
  const f = touch(c);
  if (!FEST_PARTS[id]) return false;
  return festivalPlan(c, f.plan.includes(id) ? f.plan.filter((x) => x !== id) : [...f.plan, id]);
}
export function festivalSkip(c) {
  const f = touch(c);
  if (f.status === 'done') return false;
  f.status = 'skipped';
  return true;
}

// --- Vorschau (ohne Würfel): was erwartet den Vorstand? -----------------------------------------------
export function festivalPreview(c, plan = festivalOf(c).plan) {
  const need = crewNeeded(plan);
  const have = volunteers(c);
  const appeal = plan.reduce((s, id) => s + FEST_PARTS[id].appeal, 0);
  const visitors = Math.round(BASE_VISITORS[level(c)] * (0.55 + appeal));
  const spend = plan.reduce((s, id) => s + FEST_PARTS[id].spend, 0) * (plan.includes('grill') ? salesMul(c) : 1);
  return { need, have, short: Math.max(0, need - have), cost: planCost(c, plan), visitors, expectedIncome: Math.round(visitors * spend * SPEND_MUL), cash: c.cash };
}

// --- Ausrichten ---------------------------------------------------------------------------------------
const WEATHER_FEST = { sonne: 1.15, hitze: 0.9, regen: 0.6, wind: 0.85 };

// Eine Zeile pro Baustein, in fester Reihenfolge. crewShare: Anteil der benötigten Helfer, den der Baustein bekommt.
function staff(plan, crew) {
  let left = crew;
  const out = {};
  for (const id of plan) {
    const need = FEST_PARTS[id].crew;
    const got = Math.max(0, Math.min(need, left));
    left -= got;
    out[id] = got / need;
  }
  return out;
}

// Kleine Geschichten, die ein Fest begleiten: id, Bedingung, Wirkung auf das Ergebnis (r) und Text.
// r: { mul: {baustein: Faktor}, cash, mood, neighbors, press, rel, crewLoss, closed:[ids] }
const STORIES = [
  { id: 'wurst_aus', w: 3, when: (x) => x.plan.includes('grill') && x.visitors >= BASE_VISITORS[level(x.c)] * 0.8, apply: (r) => (r.mul.grill = (r.mul.grill ?? 1) * 0.72, r.mood -= 0.02), text: () => tr('Um halb drei ist die Bratwurst aus. Der Grillmeister schickt einen Jugendlichen zur Tankstelle, die Schlange wird trotzdem lang und die Stimmung grillig.', 'By half past two the bratwurst has run out. The grill master sends a teenager to the petrol station, the queue grows long and moods get sizzling.') },
  { id: 'regen_schirme', w: 2, when: (x) => x.weather === 'regen', apply: (r) => (r.mood -= 0.01), text: () => tr('Der Himmel macht auf, alle rücken unter das Vordach des Vereinsheims. Eng, laut, gemütlich – und der Kaffee geht weg wie nichts.', 'The heavens open and everyone squeezes under the clubhouse awning. Tight, loud, cosy – and the coffee sells like crazy.') },
  { id: 'helfer_weg', w: 3, when: (x) => crewNeeded(x.plan) >= 4, apply: (r, x, rng) => (r.crewLoss = rng.int(1, 2)), text: (r) => tr(`${r.crewLoss} Ehrenamtliche fallen kurzfristig aus – Erkältung, Hochzeit, „hab ich nicht gewusst". Die anderen springen ein, wo sie können.`, `${r.crewLoss} volunteers drop out at short notice – a cold, a wedding, “nobody told me”. The others fill in where they can.`) },
  { id: 'huepfburg_luft', w: 2, when: (x) => x.plan.includes('huepfburg') && x.weather !== 'regen', apply: (r) => (r.cash -= 15, r.mul.huepfburg = 0.5), text: () => tr('Die Hüpfburg verliert um drei Uhr die Luft. Der Verleih berechnet 15 € für den Schaden, die Kinder machen daraus ein Spiel: Wer wird zuletzt eingefaltet?', 'The bouncy castle goes flat at three. The rental firm charges €15 for the damage, and the kids turn it into a game: who gets folded in last?') },
  { id: 'tombola_vorsitz', w: 2, when: (x) => x.plan.includes('tombola'), apply: (r) => (r.mood += 0.03), text: () => tr('Der Hauptgewinn der Tombola, ein Gutschein vom Gartencenter, geht ausgerechnet an den Vorsitzenden. Er will ihn sofort zurückgeben – das Publikum buht fröhlich.', 'The raffle’s top prize, a garden centre voucher, goes to the chairman of all people. He wants to hand it straight back – the crowd boos cheerfully.') },
  { id: 'nachbar_laut', w: 2, when: (x) => x.plan.includes('grill') || x.plan.includes('huepfburg'), apply: (r) => (r.neighbors -= 1), text: () => tr('Eine Nachbarin beschwert sich über Lärm und Bratengeruch. Der Schriftführer bringt ihr einen Teller Kuchen. Sie nimmt ihn, bleibt aber misstrauisch.', 'A neighbour complains about the noise and the smell of frying. The secretary brings her a plate of cake. She takes it but stays suspicious.') },
  { id: 'nachbar_lieb', w: 2, when: (x) => x.plan.includes('kinderturnier') || x.plan.includes('kuchen'), apply: (r) => (r.neighbors += 1), text: () => tr('Die halbe Nachbarschaft kommt vorbei, bringt Salate mit und bleibt bis zum Aufräumen. Man kennt sich wieder.', 'Half the neighbourhood drops by, brings salads and stays until the tidying up. People know each other again.') },
  { id: 'sponsor_gast', w: 2, when: (x) => x.c.sponsors?.length > 0, apply: (r) => (r.rel += 4), text: (r, x) => tr(`${x.c.sponsors[0].name} schaut mit der Familie vorbei, isst zwei Bratwürste und fragt beiläufig, wie es mit der Trikotwerbung weitergeht.`, `${x.c.sponsors[0].name} drops by with the family, eats two bratwursts and casually asks how the shirt deal is going.`) },
  { id: 'foto', w: 2, when: (x) => x.success >= 0.6, apply: (r) => (r.press = 3), text: () => tr('Ein Fotograf vom Kreisblatt knipst die Hüpfburg, die Torwand und den Vorsitzenden mit Bratwurst. Alle drei kommen groß ins Blatt.', 'A District Gazette photographer snaps the bouncy castle, the target wall and the chairman with a bratwurst. All three make a big spread.') },
  { id: 'elfer_drama', w: 2, when: (x) => x.plan.includes('elfer'), apply: (r) => (r.mood += 0.02), text: (r, x) => tr(`Elfmeterkönig-Finale: ${x.king} gegen den Vorsitzenden im Tor. Er verschießt oben drüber, der Ball landet im Salat. Gelächter bis zur Siegerehrung.`, `Penalty king final: ${x.king} against the chairman in goal. He blazes it over the bar and the ball lands in the salad. Laughter until the awards.`) },
];

// Das Fest. Gibt den Bericht zurück (auch in c.festival.report). Nur einmal je Saison.
export function holdFestival(c) {
  const f = touch(c);
  if (!seasonOver(c) || f.status === 'done' || f.status === 'skipped') return null;
  const plan = f.plan.length ? f.plan : [];
  if (!plan.length) return null;
  const rng = createRng((c.seed * 83 + c.season * 307 + plan.length * 13 + 29) >>> 0);
  const month = 6; // Juni/Juli: Sommertabelle des Wetters
  const wid = weatherOn(c, month, c.season * 5 + 3);
  const lv = level(c);
  const appeal = plan.reduce((s, id) => s + FEST_PARTS[id].appeal, 0);
  const visitors = Math.max(8, Math.round(BASE_VISITORS[lv] * (0.55 + appeal) * (WEATHER_FEST[wid] ?? 1) * (0.88 + rng.next() * 0.24)));
  const cost = planCost(c, plan);
  const king = chooseKing(c, rng);
  const ctx = { c, plan, visitors, weather: wid, king: king.name, success: 0.5 };
  // Geschichten ziehen (höchstens zwei), bevor die Einnahmen berechnet werden.
  const r = { mul: {}, cash: 0, mood: 0, neighbors: 0, press: 0, rel: 0, crewLoss: 0 };
  const stories = [];
  const pool = STORIES.filter((s) => s.when(ctx));
  const n = rng.chance(0.55) ? 2 : 1;
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let t = rng.next() * total;
    const k = pool.findIndex((x) => (t -= x.w) < 0);
    const [s] = pool.splice(Math.max(0, k), 1);
    s.apply(r, ctx, rng);
    stories.push(s);
  }
  const have = Math.max(0, volunteers(c) - r.crewLoss);
  const crew = staff(plan, have);
  const wet = wid === 'regen' || wid === 'wind';
  const lines = plan.map((id) => {
    const p = FEST_PARTS[id];
    const share = crew[id];
    const rain = wet ? 1 - p.wet : 1;
    const sales = id === 'grill' ? salesMul(c) : 1;
    const income = Math.round(visitors * p.spend * SPEND_MUL * share * rain * sales * (r.mul[id] ?? 1) * (0.92 + rng.next() * 0.16));
    return { id, cost: partCost(c, id), income, crew: Math.round(share * 100) / 100, closed: wet && p.wet >= 1 };
  });
  const income = lines.reduce((s, l) => s + l.income, 0);
  const net = Math.round((income - cost + r.cash) * 100) / 100;
  // Wie gut lief es? Besucher gegenüber dem Erwartbaren, Helfer, Wetter.
  const crewShare = crewNeeded(plan) ? Math.min(1, have / crewNeeded(plan)) : 1;
  const success = Math.max(0, Math.min(1, (visitors / (BASE_VISITORS[lv] * 0.9)) * 0.5 + crewShare * 0.3 + (net > 0 ? 0.2 : 0.05)));
  ctx.success = success;
  const photo = STORIES.find((s) => s.id === 'foto');
  if (!stories.includes(photo) && success >= 0.75 && rng.chance(0.4)) (photo.apply(r, ctx, rng), stories.push(photo));

  // Buchungen
  book(c, tr('Vereinsfest: Einkauf und Miete', 'Club festival: supplies and rental'), -cost);
  book(c, tr(`Vereinsfest: Einnahmen (${visitors} Besucher)`, `Club festival: takings (${visitors} visitors)`), income);
  if (r.cash) book(c, tr('Vereinsfest: Schaden', 'Club festival: damage'), r.cash);

  // Wirkung auf Verein: Stimmung, Mitglieder (Förderverein), Nachbarn, Sponsoren, Presse.
  const l = clubLife(c);
  const kids = plan.filter((id) => FEST_PARTS[id].kids).length;
  const members = Math.min(4, Math.round((visitors / 45) * (0.4 + kids * 0.35 + success * 0.4) * (0.7 + rng.next() * 0.6)));
  l.supporters = Math.max(0, (l.supporters ?? 0) + members);
  l.neighbors = Math.max(-3, Math.min(3, (l.neighbors ?? 0) + r.neighbors + (success >= 0.7 && !r.neighbors ? 1 : 0)));
  adjustMood(c, 0.04 + success * 0.1 + r.mood);
  let sponsorsUp = 0;
  for (const s of c.sponsors ?? []) if (success >= 0.5 || r.rel) (adjustRel(s, 2 + r.rel + (plan.includes('tombola') ? 1 : 0)), sponsorsUp++);
  c.flags ??= {};
  if (r.press) c.flags.pressWeeks = Math.max(c.flags.pressWeeks ?? 0, r.press);

  const report = {
    season: c.season,
    weather: wid,
    weatherName: WEATHER[wid]?.name ?? wid,
    visitors,
    lines,
    cost,
    income,
    damage: -r.cash,
    net,
    crewHave: have,
    crewNeed: crewNeeded(plan),
    members,
    sponsorsUp,
    neighbors: r.neighbors,
    mood: Math.round((0.04 + success * 0.1 + r.mood) * 100) / 100,
    king: lines.some((l) => (l.id === 'elfer' || l.id === 'torwand') && l.crew > 0) ? { idx: king.idx, name: king.name, kind: lines.some((l) => l.id === 'elfer' && l.crew > 0) ? 'elfer' : 'torwand' } : null,
    stories: stories.map((s) => s.text(r, ctx)),
    storyIds: stories.map((s) => s.id),
    success: Math.round(success * 100) / 100,
  };
  if (report.king && king.idx != null) adjustForm(c, king.idx, 0.4); // Elfmeterkönig / Torwandsieger hat Rückenwind
  report.headline = headline(report);
  report.body = kreisblatt(c, report);
  f.status = 'done';
  f.report = report;
  f.history.push({ season: c.season, visitors, net, members });
  if (f.history.length > 12) f.history.splice(0, f.history.length - 12);
  chronicle(c, tr(`Vereinsfest bei ${report.weatherName}: ${visitors} Besucher, ${net >= 0 ? 'plus' : 'minus'} ${euroFmt(Math.abs(net))}.`, `Club festival (${report.weatherName.toLowerCase()} weather): ${visitors} visitors, ${net >= 0 ? 'profit' : 'loss'} ${euroFmt(Math.abs(net))}.`));
  return report;
}

// Elfmeterkönig: wer am besten schießt (mit etwas Tagesform), aus dem Kader ohne Trainer.
function chooseKing(c, rng) {
  const pool = humanClub(c).squad.filter((i) => !isCoach(c, i));
  const scored = pool.map((idx) => ({ idx, name: playerOf(c, idx).name, v: (playerOf(c, idx).attrs?.shooting ?? playerOf(c, idx).rating / 100) + rng.next() * 0.25 })).sort((a, b) => b.v - a.v);
  return scored[0] ?? { idx: null, name: tr('der Kapitän', 'the captain'), v: 0 };
}

const headline = (r) =>
  r.net >= 40 ? tr('Dorffest mit Rekordkasse', 'Village fest with a record till')
    : r.weather === 'regen' ? tr('Vereinsfest im Regen – gefeiert wurde trotzdem', 'Club festival in the rain – they celebrated anyway')
      : r.visitors >= 100 ? tr('Halb Kanalstadt beim Vereinsfest', 'Half of Kanalstadt at the club festival')
        : tr('Vereinsfest am Sportplatz', 'Club festival at the ground');

// Der Artikel im Kreisblatt: aus den Zahlen, ohne weitere Würfel.
function kreisblatt(c, r) {
  const club = humanClub(c).name;
  const names = r.lines.map((l) => FEST_PARTS[l.id].name).join(', ');
  const parts = [
    tr(`${r.visitors} Besucher feierten bei ${r.weatherName} das Vereinsfest des ${club}. Im Programm: ${names}.`, `${r.visitors} visitors celebrated ${club}'s club festival in ${r.weatherName.toLowerCase()} weather. On the programme: ${names}.`),
    r.king ? tr(`${r.king.kind === 'elfer' ? 'Elfmeterkönig' : 'Torwandsieger'} wurde ${r.king.name}.`, `${r.king.name} was crowned ${r.king.kind === 'elfer' ? 'penalty king' : 'target-wall champion'}.`) : '',
    r.members ? tr(`${r.members} Gäste traten dem Förderverein bei.`, `${r.members} guests joined the supporters' club.`) : '',
    r.crewNeed > r.crewHave ? tr(`Mit ${r.crewHave} Ehrenamtlichen statt der geplanten ${r.crewNeed} blieb mancher Stand zeitweise dicht.`, `With ${r.crewHave} volunteers instead of the planned ${r.crewNeed}, some stalls stayed shut for a while.`) : tr(`${r.crewHave} Ehrenamtliche hielten die Stände am Laufen.`, `${r.crewHave} volunteers kept the stalls running.`),
    ...r.stories,
    tr(`Unterm Strich: ${r.net >= 0 ? 'ein Plus' : 'ein Minus'} von ${euroFmt(Math.abs(r.net))} in der Vereinskasse.`, `Bottom line: ${r.net >= 0 ? 'a profit' : 'a loss'} of ${euroFmt(Math.abs(r.net))} for the club kitty.`),
  ];
  return parts.filter(Boolean).join(' ');
}
