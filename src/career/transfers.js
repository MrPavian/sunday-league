// Transfermarkt (ROADMAP 11.9, „Kader“): Spieler von Nachbarvereinen holen, eigene abgeben, Wechsel zwischen CPU-Vereinen,
// Leihe. Hängt über hooks.js ein (create, migrate, startWeek, nextSeason); Regeln und Quellen stehen in transferrules.js.
//
// Aufbau auf dem Vorhandenen:
//  - Werben/Gespräch: recruiting.js (Motive, Rumfragen, zwei Argumente) – das Gespräch mit einem Spieler eines anderen
//    Vereins ist dasselbe Gespräch wie auf der Gerüchteküche; die Anfrage beim Verein (Freigabe) kommt davor.
//  - Abgänge: dieselben Wege wie poaching.js (releasePlayer, rememberNewClub, flags.poached); Angebote für Wechselwillige
//    ersetzen dort nicht den Abwerbeversuch, sondern werden mit ihm abgestimmt (siehe inTransfers/noteDeparture).
//  - Nachbarvereine: die CPU-Vereine der eigenen Liga plus „Nachbarliga“-Vereine (eine Liga darüber und darunter). Letztere
//    gibt es nur hier: je Saison neu gezogen (ligagerecht über tiers, takenIndices schließt sie aus dem Pool aus).
//  - CPU-Wechsel: nur in den Wechselfristen, Kaderstärke bleibt ligagerecht (Zugang muss in die Stufen des neuen Vereins
//    passen, der abgebende Verein holt Ersatz seiner Stufen aus dem Pool, der aufnehmende lässt seinen Schwächsten ziehen).
// Alle Zufälle laufen über eigene, aus Saison/Fenster abgeleitete Ströme – nichts verschiebt die bestehenden Würfe.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { LEAGUES } from './clubs.js';
import { book } from './finances.js';
import { askAround, knownMotives, pickArgument, startTalk } from './recruiting.js';
import { clubById, getPool, humanClub, joinSquad, maxSquad, MIN_SQUAD, playerOf, recruitChance, releasePlayer, squadPicker, SQUAD_SHAPES, takenIndices } from './career.js';
import { tierWeightsFor } from '../data/tiers.js';
import { coachAway, isCoach } from './personal.js';
import { adjustMood } from './events.js';
import { rememberNewClub } from './memory.js';
import { chronicle } from './sagas.js';
import { EXTRA_STEPS, handgeldOk, HANDGELD_STEPS, importanceIn, MAX_REQUESTS, nextWindow, releaseChance, trainingFee, waitGames, windowAt, windowKey, winterFee } from './transferrules.js';

export { HANDGELD_STEPS, EXTRA_STEPS, MAX_REQUESTS };

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x3c6ef372);
const strHash = (s) => [...String(s)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const freshRecord = () => ({ apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, posXp: {} });
const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
const LOG_MAX = 40;
const NEIGHBOR_CLUBS = 3; // je Nachbarliga (Spielwert)
const MAX_LOANS = 2; // Leihspieler gleichzeitig im Kader (Spielwert)
const LOAN_FEE = 50; // Aufwandsersatz an den Verleiher je Leihe (Spielwert)

// --- Zustand ----------------------------------------------------------------------------------------------------

export function tstate(c) {
  const t = (c.transfers ??= {});
  t.v ??= 1;
  t.neighbors ??= []; // Vereine der Nachbarligen: { id, name, short, level, tiers, squad, neighbor: true }
  t.neighborKey ??= null; // „Saison:Liga“, für die sie gezogen wurden
  t.listed ??= []; // eigene Spieler auf der Transferliste
  t.offers ??= []; // Angebote anderer Vereine für eigene Spieler
  t.deals ??= {}; // Verhandlungen um Spieler fremder Vereine (idx → Handel)
  t.used ??= {}; // Freigabe-Anfragen je Periode
  t.opened ??= {}; // Perioden, in denen die CPU-Wechsel und Angebote schon gelaufen sind
  t.rel ??= {}; // Verhältnis zu den anderen Vereinen, −3 … +3
  t.log ??= []; // Meldungen (Kreisblatt) für den Reiter
  t.loans ??= []; // Leihen: { idx, from, to, season, dir: 'in'|'out' }
  t.pending ??= []; // Abwerbungen außerhalb der Fristen, fällig zur nächsten Wechselperiode: { idx, club, season, round }
  t.nextOffer ??= 1;
  t.stats ??= { in: 0, out: 0, cpu: 0, paid: 0, received: 0, loans: 0 };
  return t;
}

// Verein (auch Nachbarliga) nach Kennung.
export const anyClub = (c, id) => clubById(c, id) ?? tstate(c).neighbors.find((n) => n.id === id) ?? null;
// Alle fremden Vereine, die als Quelle/Ziel in Frage kommen: eigene Liga zuerst.
export const otherClubs = (c) => [...c.clubs.filter((x) => !x.human).map((x) => ({ club: x, level: c.level ?? 1, neighbor: false })), ...tstate(c).neighbors.map((n) => ({ club: n, level: n.level, neighbor: true }))];
const levelOf = (c, club) => (club.neighbor ? club.level : c.level ?? 1);
const clubOfPlayer = (c, idx) => otherClubs(c).find((x) => x.club.squad.includes(idx)) ?? null;
const rel = (c, id) => tstate(c).rel[id] ?? 0;
const addRel = (c, id, d) => {
  const t = tstate(c);
  t.rel[id] = Math.max(-3, Math.min(3, (t.rel[id] ?? 0) + d));
};
const isDerby = (c, club) => club.id === c.flags?.derbyRival;
const ratingOf = (c) => (idx) => playerOf(c, idx).rating;
const positionOf = (c) => (idx) => playerOf(c, idx).position;
const sticky = (c, idx) => (c.nemesis?.[idx] ?? 0) >= 2 || !!c.formers?.[idx] || !!c.joinedFrom?.[idx];
export const clubRating = (c, club) => (club.squad.length ? club.squad.reduce((s, i) => s + playerOf(c, i).rating, 0) / club.squad.length : 0);

// Wer steht in einer Verhandlung, auf der Liste oder hat ein Angebot? poaching.js lässt solche Spieler in Ruhe.
export function inTransfers(c, idx) {
  const t = c.transfers;
  return !!t && (t.listed.includes(idx) || t.offers.some((o) => o.idx === idx) || t.loans.some((l) => l.idx === idx) || !!t.pending?.some((x) => x.idx === idx));
}

// --- Meldungen und Dorfgespräch ---------------------------------------------------------------------------------

function pushLog(c, kind, text) {
  const t = tstate(c);
  t.log.push({ season: c.season, round: c.round, kind, text });
  if (t.log.length > LOG_MAX) t.log.splice(0, t.log.length - LOG_MAX);
}
// Kreisblatt-Meldung: in den Chat der Woche und ins Protokoll.
function press(c, text, kind = 'news') {
  pushLog(c, kind, text);
  c.week?.chat.push({ from: null, text, time: 'Mo 08:10', press: true });
}
// Ein Spieler aus dem Kader kommentiert (nie der Neue selbst, nie du).
function talk(c, rng, lines, except = []) {
  const week = c.week;
  if (!week) return;
  const who = humanClub(c).squad.filter((i) => !isCoach(c, i) && !except.includes(i));
  if (!who.length) return;
  week.chat.push({ from: rng.pick(who), text: rng.pick(lines), time: 'Sa 19:40' });
}

// --- Nachbarligen ----------------------------------------------------------------------------------------------

function genNeighbors(c) {
  const t = tstate(c);
  const key = `${c.season}:${c.level ?? 1}`;
  // Alte Nachbarn gehen; wer inzwischen anderswo steht (Ehemalige, Pokalgäste …), bleibt unberührt – ihr Datensatz gehört nicht uns.
  t.neighbors = [];
  const rng = createRng(hashSeed(c.seed, c.season, c.level ?? 1, 6101));
  const used = takenIndices(c);
  const pick = squadPicker(rng, used);
  for (const lv of [(c.level ?? 1) - 1, (c.level ?? 1) + 1]) {
    const league = LEAGUES[lv];
    if (!league) continue;
    const defs = [...league.clubs];
    for (let k = 0; k < NEIGHBOR_CLUBS && defs.length; k++) {
      const def = defs.splice(Math.floor(rng.next() * defs.length), 1)[0];
      try {
        t.neighbors.push({ id: `n:${def.id}`, name: def.name, short: def.short, level: lv, tiers: def.tiers, squad: pick(def.tiers, SQUAD_SHAPES[league.squadShape]), neighbor: true });
      } catch {
        // Pool für die Stufen erschöpft – dann gibt es diesen Nachbarn eben nicht
      }
    }
  }
  t.neighborKey = key;
}
export function ensureNeighbors(c) {
  const t = tstate(c);
  if (t.neighborKey !== `${c.season}:${c.level ?? 1}`) genNeighbors(c);
}

// --- Wechselfrist und Markt ------------------------------------------------------------------------------------

export function windowInfo(c) {
  const t = tstate(c);
  const kind = windowAt(c);
  const key = kind ? windowKey(c, kind) : null;
  const used = key ? t.used[key] ?? 0 : 0;
  return { kind, open: !!kind, key, used, left: Math.max(0, MAX_REQUESTS - used), next: nextWindow(c), wait: waitGames(c) };
}

// Wie wichtig ist der Spieler in seinem Verein (0–1)?
export const importanceOf = (c, club, idx) => importanceIn(club.squad, idx, ratingOf(c), positionOf(c));

// Alle Spieler fremder Vereine, mit allem, was die Liste anzeigt.
export function marketList(c, { scope = 'all', pos = 'all', sort = 'rating' } = {}) {
  const t = tstate(c);
  const rows = [];
  for (const { club, level, neighbor } of otherClubs(c)) {
    if (scope === 'own' && neighbor) continue;
    if (scope === 'neighbor' && !neighbor) continue;
    for (const idx of club.squad) {
      const p = playerOf(c, idx);
      if (pos !== 'all' && p.position !== pos) continue;
      rows.push({ idx, p, club, clubId: club.id, clubName: club.name, level, neighbor, importance: importanceOf(c, club, idx), deal: t.deals[idx] ?? null, loan: t.loans.find((l) => l.idx === idx) ?? null });
    }
  }
  const by = { rating: (a, b) => b.p.rating - a.p.rating, age: (a, b) => a.p.age - b.p.age, club: (a, b) => a.clubName.localeCompare(b.clubName) || b.p.rating - a.p.rating };
  return rows.sort(by[sort] ?? by.rating);
}

// Gebühr, die der abgebende Verein verlangt (Ausbildungsentschädigung), für uns als Käufer.
export function priceOf(c, idx, kind = windowAt(c) ?? 'summer') {
  const src = clubOfPlayer(c, idx);
  if (!src) return 0;
  const p = playerOf(c, idx);
  const base = trainingFee(src.level, c.level ?? 1, { age: p.age });
  return kind === 'winter' ? winterFee(base, importanceOf(c, src.club, idx)) : base;
}

// --- Spieler eines anderen Vereins holen -----------------------------------------------------------------------

// Schritt 1: Anfrage beim Verein (Freigabe). extra = freiwillige Zugabe an den Verein, nur im Winter (frei verhandelbar).
export function askClub(c, idx, extra = 0) {
  const t = tstate(c);
  const info = windowInfo(c);
  if (!info.open) return 'window';
  if (t.deals[idx]) return 'busy';
  if (info.left <= 0) return 'limit';
  const src = clubOfPlayer(c, idx);
  if (!src) return 'gone';
  if (humanClub(c).squad.length >= maxSquad(c)) return 'full';
  if (info.kind === 'summer') extra = 0; // im Sommer sind die Beträge festgeschrieben
  if (!EXTRA_STEPS.includes(extra)) return 'extra';
  const fee = priceOf(c, idx, info.kind);
  if (c.cash < fee + extra) return 'cash';
  const imp = importanceOf(c, src.club, idx);
  const chance = releaseChance({ importance: imp, derby: isDerby(c, src.club), rel: rel(c, src.club.id), kind: info.kind, extra });
  const rng = createRng(hashSeed(c.seed, c.season, strHash(info.key), idx, 6102));
  const ok = rng.chance(chance);
  t.used[info.key] = (t.used[info.key] ?? 0) + 1;
  t.deals[idx] = { idx, status: 'open', club: src.club.id, key: info.key, kind: info.kind, decision: ok ? 'ja' : 'nein', fee, extra, handgeld: 0, known: [], talk: null, scouted: true, reply: null, season: c.season, round: c.round };
  return ok ? 'ja' : 'nein';
}

export function setHandgeld(c, idx, value) {
  const d = tstate(c).deals[idx];
  if (!d || d.status !== 'open' || d.talk || !handgeldOk(value)) return false;
  d.handgeld = value;
  return true;
}
export const askAroundDeal = (c, idx) => askAround(c, tstate(c).deals[idx], coachAway(c));
export function talkDeal(c, idx) {
  const d = tstate(c).deals[idx];
  if (!d || !windowAt(c)) return false;
  return startTalk(c, d, coachAway(c), humanClub(c).squad.length >= maxSquad(c));
}

// Grundchance, dass der Spieler wechseln will (vor den Argumenten). Spielwerte um recruitChance (tier, Tabelle, Stimmung).
export function playerChance(c, d) {
  const src = anyClub(c, d.club);
  const imp = src ? importanceOf(c, src, d.idx) : 0.5;
  let ch = recruitChance(c, { idx: d.idx, scouted: true });
  ch -= 0.12 * imp; // Leistungsträger gehen ungern
  if (src && isDerby(c, src)) ch -= 0.08;
  ch += (d.handgeld / 150) * 0.15; // Handgeld: 150 € ≈ +15 Prozentpunkte
  if (d.decision === 'nein') ch -= 0.1; // ohne Freigabe muss er sich abmelden und wartet
  return Math.max(0.05, Math.min(0.9, ch));
}

export function argueDeal(c, idx, arg) {
  const t = tstate(c);
  const d = t.deals[idx];
  if (!d) return null;
  return pickArgument(c, d, arg, { player: playerOf(c, idx), idx, baseChance: playerChance(c, d), join: () => completeSigning(c, d) });
}

// Der Spieler sagt zu: Verein, Geld, Wartefrist, Dorfgespräch.
function completeSigning(c, d) {
  const t = tstate(c);
  const src = anyClub(c, d.club);
  const idx = d.idx;
  const me = humanClub(c);
  if (!src || !src.squad.includes(idx) || me.squad.length >= maxSquad(c)) return false;
  const free = d.decision === 'ja';
  const owed = free ? d.fee + d.extra : 0; // ohne Freigabe: Wartefrist statt Entschädigung
  if (c.cash < owed + d.handgeld) return false;
  const pos = playerOf(c, idx).position;
  src.squad = src.squad.filter((x) => x !== idx);
  if (!joinSquad(c, idx, tr('Bin dabei!', 'I am in!'))) {
    src.squad.push(idx);
    return false;
  }
  const rec = c.players[idx];
  rec.since = c.season;
  rec.sinceKind = d.kind;
  const name = playerOf(c, idx).name;
  if (owed > 0) {
    book(c, tr(`Ausbildungsentschädigung an ${src.name}`, `Training compensation to ${src.name}`), -owed);
    t.stats.paid += owed;
  }
  if (d.handgeld > 0) {
    book(c, tr(`Handgeld ${name.split(' ')[0]}`, `Signing-on money ${name.split(' ')[0]}`), -d.handgeld);
    t.stats.paid += d.handgeld;
  }
  refill(c, src, pos, createRng(hashSeed(c.seed, c.season, c.round, idx, 6103)));
  t.stats.in++;
  const rng = createRng(hashSeed(c.seed, c.season, c.round, idx, 6104));
  if (free) {
    pushLog(c, 'in', tr(`${name} wechselt von ${src.name} zu uns${owed ? ` (Ausbildungsentschädigung ${owed} €)` : ''}.`, `${name} moves from ${src.name} to us${owed ? ` (training compensation €${owed})` : ''}.`));
    press(c, tr(`Kreisblatt: ${name} wechselt von ${src.name} zu ${me.name}.${owed ? ` Der Verein bekommt ${owed} € Ausbildungsentschädigung.` : ''}`, `District Gazette: ${name} moves from ${src.name} to ${me.name}.${owed ? ` The club receives €${owed} in training compensation.` : ''}`));
    addRel(c, src.id, 0);
    talk(c, rng, [tr(`Ey, ${first(c, idx)} von ${src.short}? Der kann was.`, `Hey, ${first(c, idx)} from ${src.short}? He can play.`), tr(`Bei ${src.short} haben sie ihn ungern gehen lassen, hab ich gehört.`, `I heard ${src.short} did not want to let him go.`), tr('Wer hat ihn überredet – der Wirt oder das Handgeld?', 'Who talked him round – the landlord or the signing-on money?')], [idx]);
  } else {
    const games = waitGames(c);
    rec.ban = { games, reason: 'wartefrist', round: c.round, season: c.season };
    if (c.week) c.week.availability[idx] = 'no';
    addRel(c, src.id, -2);
    pushLog(c, 'in', tr(`${name} wechselt ohne Freigabe von ${src.name} zu uns – Wartefrist ${games} Spiele.`, `${name} moves from ${src.name} to us without release – waiting period ${games} games.`));
    press(c, tr(`Kreisblatt: Ärger bei ${src.name}: ${name} hat sich ohne Freigabe abgemeldet und geht zu ${me.name}. Pflichtspiele erst nach sechs Monaten (${games} Spieltage).`, `District Gazette: trouble at ${src.name}: ${name} deregistered without a release and joins ${me.name}. Competitive games only after six months (${games} match days).`));
    adjustMood(c, -0.02);
    talk(c, rng, [tr('Ohne Freigabe? Da gibt es Ärger mit denen.', 'Without a release? That will cause trouble with them.'), tr('Sechs Monate Sperre – und wir zahlen ihn trotzdem mit Bier.', 'Six months banned – and we still pay him in beer.')], [idx]);
  }
  if (isDerby(c, src)) press(c, tr(`Beim Derby-Rivalen ${src.name} kocht es: ${first(c, idx)} geht zum Nachbarn.`, `It is boiling at your derby rivals ${src.name}: ${first(c, idx)} is off to the neighbours.`));
  chronicle(c, tr(`Neuzugang ${name} von ${src.name}.`, `New signing ${name} from ${src.name}.`));
  return true;
}

// Ersatz für einen Abgang aus dem Pool, passend zu den Stufen des Vereins (ligagerecht).
function refill(c, club, position, rng) {
  try {
    const [inn] = squadPicker(rng, takenIndices(c))(club.tiers, [position]);
    club.squad.push(inn);
    if (!club.neighbor) c.players[inn] ??= freshRecord();
    return inn;
  } catch {
    return null; // Pool für diese Position erschöpft – dann bleibt der Kader kleiner
  }
}

// Ein Spieler kommt zu einem fremden Verein; der Schwächste (möglichst auf seiner Position) geht, damit die Kader nicht wachsen.
function absorb(c, club, idx) {
  const pos = playerOf(c, idx).position;
  club.squad.push(idx);
  if (!club.neighbor) c.players[idx] = freshRecord();
  const others = club.squad.filter((x) => x !== idx && !sticky(c, x));
  const cands = others.filter((x) => playerOf(c, x).position === pos);
  const pool = cands.length ? cands : others;
  if (!pool.length) return null;
  const out = pool.sort((a, b) => playerOf(c, a).rating - playerOf(c, b).rating)[0];
  club.squad = club.squad.filter((x) => x !== out);
  if (!club.neighbor) delete c.players[out];
  return out;
}

// --- Eigene Spieler abgeben --------------------------------------------------------------------------------------

export function listPlayer(c, idx, on = true) {
  const t = tstate(c);
  if (!humanClub(c).squad.includes(idx) || isCoach(c, idx)) return false;
  t.listed = t.listed.filter((x) => x !== idx);
  if (on) t.listed.push(idx);
  else t.offers = t.offers.filter((o) => o.idx !== idx || o.wish);
  return true;
}

// Beim Öffnen einer Wechselfrist: Vereine melden sich für Gelistete und für Wechselwillige.
function makeOffers(c, kind, key) {
  const t = tstate(c);
  const me = humanClub(c);
  const rng = createRng(hashSeed(c.seed, c.season, kind === 'summer' ? 1 : 2, 6105));
  const clubs = otherClubs(c);
  const add = (idx, wish) => {
    const p = playerOf(c, idx);
    const rec = c.players[idx];
    const fits = clubs
      .filter(({ club }) => club.tiers?.[p.tier] > 0 && p.rating >= clubRating(c, club) - 4 && club.squad.length)
      .sort(() => rng.next() - 0.5)
      .slice(0, wish ? 1 : 2);
    const imp = importanceIn(me.squad, idx, ratingOf(c), positionOf(c));
    let made = 0;
    for (const { club, level } of fits) {
      if (!rng.chance(wish ? 0.7 : 0.75)) continue;
      const base = trainingFee(c.level ?? 1, level, { age: p.age, seasonsAtClub: rec?.seasons?.length ?? 0, recent: recentJoin(c, idx, kind) });
      t.offers.push({ id: t.nextOffer++, idx, club: club.id, key, kind, base, fee: kind === 'winter' ? winterFee(base, imp) : base, wish, counter: false });
      made++;
    }
    return made;
  };
  for (const idx of t.listed) if (me.squad.includes(idx)) add(idx, false);
  // Wechselwillige (grummeln oder sitzen draußen) bekommen von sich aus Angebote – höchstens eins je Periode.
  const played = c.fixtures.slice(0, c.round).length;
  const wishers = me.squad.filter((i) => !isCoach(c, i) && !t.listed.includes(i) && c.flags?.poached?.[i] !== c.season && ((c.players[i]?.grumpy ?? 0) > 0 || (played >= 3 && (c.players[i]?.playShare ?? c.players[i]?.apps ?? 9) <= played * 0.35)));
  if (wishers.length && rng.chance(0.5)) add(rng.pick(wishers), true);
}

// --- Abwerbung außerhalb der Wechselperiode (poaching.js) ---------------------------------------------------------
// Vereinswechsel gibt es nur in den Wechselperioden (transferrules.js). Sagt ein Spieler während der Saison einem anderen
// Verein zu, wird das vorgemerkt: Er spielt bis dahin weiter bei uns, zur nächsten Periode kommt das Angebot des Vereins
// wie jedes andere – Freigabe gegen Ausbildungsentschädigung oder verweigern (dann ist er sauer, siehe declineOffer).
export function planDeparture(c, idx, clubId) {
  const t = tstate(c);
  if (!humanClub(c).squad.includes(idx) || t.pending.some((x) => x.idx === idx)) return false;
  t.pending.push({ idx, club: clubId, season: c.season, round: c.round });
  return true;
}
function duePending(c, kind, key) {
  const t = tstate(c);
  const me = humanClub(c);
  for (const x of t.pending) {
    const club = anyClub(c, x.club); // nach Auf-/Abstieg kann der Verein weg sein – dann verfällt die Zusage
    if (!club || !me.squad.includes(x.idx) || t.offers.some((o) => o.idx === x.idx && o.club === x.club)) continue;
    const p = playerOf(c, x.idx);
    const base = trainingFee(c.level ?? 1, levelOf(c, club), { age: p.age, seasonsAtClub: c.players[x.idx]?.seasons?.length ?? 0, recent: recentJoin(c, x.idx, kind) });
    const imp = importanceIn(me.squad, x.idx, ratingOf(c), positionOf(c));
    t.offers.push({ id: t.nextOffer++, idx: x.idx, club: club.id, key, kind, base, fee: kind === 'winter' ? winterFee(base, imp) : base, wish: true, poached: true, counter: false });
  }
  t.pending = [];
}

function recentJoin(c, idx, kind) {
  const rec = c.players[idx];
  if (rec?.since == null) return false;
  const joined = rec.since * 12 + (rec.sinceKind === 'winter' ? 6 : 0);
  const now = c.season * 12 + (kind === 'winter' ? 6 : 0);
  return now - joined < 18;
}

// Gebühr, die wir bei einem Abgang bekommen (Beispiel: Anzeige vorab).
export function offerFor(c, id) {
  return tstate(c).offers.find((o) => o.id === id) ?? null;
}

export function acceptOffer(c, id) {
  const t = tstate(c);
  const o = offerFor(c, id);
  if (!o || !windowAt(c) || o.key !== windowKey(c)) return 'window';
  const club = anyClub(c, o.club);
  const me = humanClub(c);
  if (!club || !me.squad.includes(o.idx)) return 'gone';
  if (me.squad.length - 1 < MIN_SQUAD) return 'squad';
  const name = playerOf(c, o.idx).name;
  const p = playerOf(c, o.idx);
  if (!releasePlayer(c, o.idx)) return 'squad';
  rememberNewClub(c, o.idx, club.id);
  absorb(c, club, o.idx);
  ((c.flags ??= {}).poached ??= {})[o.idx] = c.season; // poaching.js: dieses Jahr kein zweiter Versuch
  if (o.fee > 0) {
    book(c, tr(`Ausbildungsentschädigung von ${club.name}`, `Training compensation from ${club.name}`), o.fee);
    t.stats.received += o.fee;
  }
  t.stats.out++;
  addRel(c, club.id, 1);
  t.listed = t.listed.filter((x) => x !== o.idx);
  t.offers = t.offers.filter((x) => x.idx !== o.idx);
  noteDeparture(c, o.idx, club, { name, fee: o.fee, p });
  return 'ok';
}

// Meldung für jeden Abgang an einen fremden Verein – auch die von poaching.js (joinRival).
export function noteDeparture(c, idx, club, { name = playerOf(c, idx).name, fee = 0 } = {}) {
  if (!club) return;
  tstate(c);
  const rng = createRng(hashSeed(c.seed, c.season, c.round, idx, 6106));
  pushLog(c, 'out', tr(`${name} wechselt zu ${club.name}${fee ? ` (${fee} € Ausbildungsentschädigung)` : ''}.`, `${name} moves to ${club.name}${fee ? ` (€${fee} training compensation)` : ''}.`));
  press(c, tr(`Kreisblatt: ${name} verlässt ${humanClub(c).name} und spielt künftig für ${club.name}.${fee ? ` Entschädigung: ${fee} €.` : ''}`, `District Gazette: ${name} leaves ${humanClub(c).name} and will play for ${club.name}.${fee ? ` Compensation: €${fee}.` : ''}`));
  talk(c, rng, [tr(`${first(c, idx)} bei ${club.short}? Dem schenken die nichts.`, `${first(c, idx)} at ${club.short}? They will not give him an inch.`), tr('Wer holt jetzt die Kiste Bier für die dritte Halbzeit?', 'Who fetches the crate of beer for the third half now?'), tr('Hoffentlich spielt er nicht ausgerechnet gegen uns gut.', 'Let us hope he does not play well against us of all teams.')], [idx]);
}

// Freigabe verweigern: Wer weg wollte, ist sauer; bei einem Angebot, das wir selbst ausgelöst haben (Liste), passiert nichts.
export function declineOffer(c, id) {
  const t = tstate(c);
  const o = offerFor(c, id);
  if (!o) return false;
  t.offers = t.offers.filter((x) => x.id !== id);
  const club = anyClub(c, o.club);
  const rec = c.players[o.idx];
  if (o.wish && rec) {
    rec.grumpy = 3;
    adjustMood(c, -0.02);
    c.week?.chat.push({ from: o.idx, text: tr('Ihr haltet mich fest? Super. Dann kickt halt ohne Laune.', 'You are holding me back? Great. Then play without my enthusiasm.'), time: 'Sa 18:30' });
  }
  if (club) addRel(c, club.id, -1);
  return true;
}

// Winter: ein höherer Betrag ist frei verhandelbar – der Verein geht mit, oder er zieht zurück.
export function counterOffer(c, id) {
  const o = offerFor(c, id);
  if (!o || o.kind !== 'winter' || o.counter || o.base <= 0) return false;
  const rng = createRng(hashSeed(c.seed, c.season, o.id, 6107));
  o.counter = true;
  if (rng.chance(0.5)) o.fee = Math.round(o.fee * 1.5);
  else tstate(c).offers = tstate(c).offers.filter((x) => x.id !== id);
  return true;
}

// --- Wechsel zwischen CPU-Vereinen ------------------------------------------------------------------------------

// Je Periode ein paar Wechsel zwischen den Vereinen einer Gruppe (eigene Liga bzw. Nachbarligen).
function cpuTransfers(c, kind) {
  const t = tstate(c);
  const rng = createRng(hashSeed(c.seed, c.season, kind === 'summer' ? 1 : 2, 6108));
  const groups = [c.clubs.filter((x) => !x.human).map((club) => ({ club, level: c.level ?? 1 })), t.neighbors.map((club) => ({ club, level: club.level }))];
  const own = groups[0];
  for (const group of groups) {
    const moves = Math.max(group === own ? 1 : 0, Math.round(group.length * (kind === 'summer' ? 0.4 : 0.25)));
    for (let m = 0; m < moves && group.length > 1; m++) {
      const clubs = group.map((g) => g.club);
      const to = pickWeighted(rng, clubs, (cl) => Math.max(1, clubRating(c, cl) - 30));
      const from = rng.pick(clubs.filter((x) => x !== to));
      const ranks = [...from.squad].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating);
      const avgTo = clubRating(c, to);
      const cands = ranks.slice(2).filter((i) => !sticky(c, i) && playerOf(c, i).age <= 36 && to.tiers?.[playerOf(c, i).tier] > 0 && playerOf(c, i).rating <= avgTo + 12);
      if (!cands.length) continue;
      const idx = rng.pick(cands);
      const p = playerOf(c, idx);
      from.squad = from.squad.filter((x) => x !== idx);
      absorb(c, to, idx);
      refill(c, from, p.position, rng);
      t.stats.cpu++;
      const line = tr(`${p.name} (${p.age}) wechselt von ${from.name} zu ${to.name}.`, `${p.name} (${p.age}) moves from ${from.name} to ${to.name}.`);
      if (group === own) press(c, tr(`Kreisblatt: ${line}`, `District Gazette: ${line}`));
      else pushLog(c, 'cpu', line);
    }
  }
}
function pickWeighted(rng, list, weight) {
  const ws = list.map(weight);
  let r = rng.next() * ws.reduce((a, b) => a + b, 0);
  return list.find((_, i) => (r -= ws[i]) < 0) ?? list[0];
}

// --- Vereinslose Spieler ----------------------------------------------------------------------------------------
// Wer keinem Verein angehört, braucht weder Freigabe noch Wechselperiode – Vereinslose kann man jederzeit holen. Die Suche
// zeigt je Woche eine Handvoll, von denen man gehört hat (ligagerechte Stufen wie die Tipps vom Wirt); „Ansprechen“ setzt
// ihn auf die Gerüchteküche, dort läuft das Werben wie gewohnt (Aktionen, Gespräch, Zusage).
const FREE_LIST = 12; // Spielwert: so viele Vereinslose je Woche in der Suche
export function freeAgents(c) {
  if (!c.week) return [];
  const taken = takenIndices(c);
  const weights = tierWeightsFor(c.level, 'wirt');
  const byTier = {};
  for (const p of getPool().everyone()) if (weights[p.tier] > 0 && !taken.has(p.poolIndex)) (byTier[p.tier] ??= []).push(p.poolIndex);
  const tiers = Object.keys(byTier);
  if (!tiers.length) return [];
  const rng = createRng(hashSeed(c.seed, c.season, c.round, 6110));
  const out = [];
  for (let k = 0; k < FREE_LIST * 4 && out.length < FREE_LIST; k++) {
    const idx = rng.pick(byTier[pickWeighted(rng, tiers, (id) => weights[id])]);
    if (!out.includes(idx)) out.push(idx);
  }
  return out;
}
export function approachFree(c, idx) {
  const w = c.week;
  if (!w || takenIndices(c).has(idx)) return 'gone';
  if (w.rumors.some((r) => r.idx === idx)) return 'busy';
  if (humanClub(c).squad.length >= maxSquad(c)) return 'full';
  const p = playerOf(c, idx);
  const rng = createRng(hashSeed(c.seed, c.season, c.round, idx, 6111));
  const spread = 5 + Math.floor(rng.next() * 4);
  const shift = Math.floor(rng.next() * spread);
  const name = p.name.split(' ')[0];
  w.rumors.push({ idx, source: tr(`${name} ist vereinslos – über die Spielersuche gefunden. Er darf sofort spielen.`, `${name} is without a club – found through the player search. He could play straight away.`), scouted: false, status: 'open', range: [p.rating - shift, p.rating - shift + spread], reply: null, season: c.season, until: c.round + 2, free: true });
  return 'ok';
}

// --- Leihe -----------------------------------------------------------------------------------------------------

// Eine Saison, hin und zurück: bis zum nächsten Saisonwechsel. Ohne Ausbildungsentschädigung, mit kleinem Aufwandsersatz.
export const loansIn = (c) => tstate(c).loans.filter((l) => l.dir === 'in');
export const loansOut = (c) => tstate(c).loans.filter((l) => l.dir === 'out');

export function loanIn(c, idx) {
  const t = tstate(c);
  const kind = windowAt(c);
  if (!kind) return 'window';
  const found = clubOfPlayer(c, idx);
  const me = humanClub(c);
  if (!found) return 'gone';
  const src = found; // { club, level, neighbor }
  if (me.squad.length >= maxSquad(c)) return 'full';
  if (loansIn(c).length >= MAX_LOANS) return 'limit';
  if (c.cash < LOAN_FEE) return 'cash';
  if (t.loans.some((l) => l.idx === idx)) return 'busy';
  const imp = importanceOf(c, src.club, idx);
  // Verleihen fällt leichter als Abgeben: nur Ersatzleute und Stammspieler (Spielwert: 0,2 Punkte mehr als die Freigabe).
  const ch = Math.min(0.95, releaseChance({ importance: imp, derby: isDerby(c, src.club), rel: rel(c, src.club.id), kind: 'summer' }) + 0.2) * (imp >= 0.85 ? 0.5 : 1);
  const rng = createRng(hashSeed(c.seed, c.season, strHash(windowKey(c, kind)), idx, 6109));
  if (!rng.chance(ch)) return 'nein';
  src.club.squad = src.club.squad.filter((x) => x !== idx);
  if (!joinSquad(c, idx, tr('Bin dabei – für eine Saison!', 'I am in – for one season!'))) {
    src.club.squad.push(idx);
    return 'full';
  }
  c.players[idx].since = c.season;
  c.players[idx].loan = { from: src.club.id, season: c.season };
  t.loans.push({ idx, from: src.club.id, to: 'du', season: c.season, dir: 'in' });
  book(c, tr(`Leihe: Aufwandsersatz an ${src.club.name}`, `Loan: expenses to ${src.club.name}`), -LOAN_FEE);
  t.stats.paid += LOAN_FEE;
  t.stats.loans++;
  const name = playerOf(c, idx).name;
  pushLog(c, 'loan', tr(`${name} kommt für eine Saison von ${src.club.name} (Leihe).`, `${name} joins from ${src.club.name} for one season (loan).`));
  press(c, tr(`Kreisblatt: ${src.club.name} leiht ${name} für eine Saison an ${me.name} aus.`, `District Gazette: ${src.club.name} lend ${name} to ${me.name} for one season.`));
  return 'ok';
}

// Eigenen Spieler für eine Saison verleihen (Ersatzleute, die bei uns kaum spielen): ein CPU-Verein mit Bedarf nimmt ihn.
export function loanOut(c, idx) {
  const t = tstate(c);
  const kind = windowAt(c);
  if (!kind) return 'window';
  const me = humanClub(c);
  if (!me.squad.includes(idx) || isCoach(c, idx)) return 'gone';
  if (me.squad.length - 1 < MIN_SQUAD) return 'squad';
  if (t.loans.some((l) => l.idx === idx)) return 'busy';
  const p = playerOf(c, idx);
  const rng = createRng(hashSeed(c.seed, c.season, strHash(windowKey(c, kind)), idx, 6110));
  const clubs = otherClubs(c).filter(({ club }) => club.tiers?.[p.tier] > 0 && club.squad.length);
  if (!clubs.length) return 'nein';
  const { club } = rng.pick(clubs);
  const name = p.name;
  if (!releasePlayer(c, idx)) return 'squad';
  rememberNewClub(c, idx, club.id); // als „Ehemaliger“ geführt: bleibt bei der Konkurrenz stehen (aiTurnover lässt ihn in Ruhe)
  club.squad.push(idx);
  if (!club.neighbor) c.players[idx] = freshRecord();
  t.loans.push({ idx, from: 'du', to: club.id, season: c.season, dir: 'out' });
  t.listed = t.listed.filter((x) => x !== idx);
  t.stats.loans++;
  pushLog(c, 'loan', tr(`${name} spielt eine Saison auf Leihbasis bei ${club.name}.`, `${name} spends a season on loan at ${club.name}.`));
  press(c, tr(`Kreisblatt: ${me.name} verleiht ${name} für eine Saison an ${club.name}.`, `District Gazette: ${me.name} lend ${name} to ${club.name} for one season.`));
  return 'ok';
}

// Ohne „Ehemaliger“-Eintrag aus dem Kader nehmen (Leihe ist kein Abschied).
function dropQuietly(c, idx) {
  const me = humanClub(c);
  me.squad = me.squad.filter((x) => x !== idx);
  delete c.players[idx];
  if (c.week) {
    delete c.week.availability[idx];
    if (c.week.lineup) c.week.lineup = c.week.lineup.map((x) => (x === idx ? null : x));
  }
}
const holderOf = (c, idx) => otherClubs(c).find((x) => x.club.squad.includes(idx))?.club ?? null;

// Saisonwechsel: alle Leihen enden. Leihspieler gehen zurück, eigene kommen wieder. Läuft im ersten startWeek der neuen
// Saison, damit der Wochenchat schon stimmt.
function endLoans(c) {
  const t = tstate(c);
  const me = humanClub(c);
  const keep = [];
  for (const l of t.loans) {
    if (l.season >= c.season) {
      keep.push(l);
      continue;
    }
    const name = playerOf(c, l.idx).name;
    if (l.dir === 'in') {
      if (!me.squad.includes(l.idx)) continue; // zwischendurch weg (Karriereende o. Ä.)
      const back = anyClub(c, l.from);
      dropQuietly(c, l.idx);
      if (back && !holderOf(c, l.idx)) {
        back.squad.push(l.idx);
        if (!back.neighbor) c.players[l.idx] = freshRecord();
      }
      pushLog(c, 'loan', tr(`${name} ist von der Leihe zurück bei ${back?.name ?? 'seinem Verein'}.`, `${name} is back at ${back?.name ?? 'his club'} after his loan.`));
      c.week?.chat.push({ from: null, text: tr(`${name} geht nach der Leihe zurück zu ${back?.name ?? 'seinem Verein'}. Danke für die Saison!`, `${name} returns to ${back?.name ?? 'his club'} after the loan. Thanks for the season!`), time: 'Mo 08:12' });
    } else {
      const holder = holderOf(c, l.idx);
      if (me.squad.includes(l.idx) || (!holder && takenIndices(c).has(l.idx))) continue; // schon bei uns oder anderswo untergekommen
      if (me.squad.length >= maxSquad(c)) {
        if (holder) keep.push({ ...l, season: c.season }); // Kader voll: noch eine Saison dort
        continue;
      }
      if (holder) holder.squad = holder.squad.filter((x) => x !== l.idx);
      if (c.formers) delete c.formers[l.idx];
      joinSquad(c, l.idx, tr('Bin zurück aus der Leihe.', 'Back from my loan.'));
      pushLog(c, 'loan', tr(`${name} ist von der Leihe zurück bei uns.`, `${name} is back with us after his loan.`));
    }
  }
  t.loans = keep;
}

// --- Hooks (hooks.js) ------------------------------------------------------------------------------------------

function purge(c) {
  const t = tstate(c);
  const me = humanClub(c);
  const key = windowAt(c) ? windowKey(c) : null;
  t.listed = t.listed.filter((i) => me.squad.includes(i));
  t.offers = t.offers.filter((o) => o.key === key && me.squad.includes(o.idx));
  for (const [idx, d] of Object.entries(t.deals)) if (d.key !== key || d.status !== 'open') delete t.deals[idx];
  for (const k of Object.keys(t.used)) if (!k.startsWith(`${c.season}:`)) delete t.used[k];
  for (const k of Object.keys(t.opened)) if (!k.startsWith(`${c.season}:`)) delete t.opened[k];
}

export function create(c) {
  tstate(c);
}
export function migrate(c) {
  tstate(c);
  ensureNeighbors(c);
}
export function startWeek(c) {
  const t = tstate(c);
  const w = c.week;
  if (!w) return;
  ensureNeighbors(c);
  endLoans(c);
  purge(c);
  const kind = windowAt(c);
  if (!kind) return;
  const key = windowKey(c, kind);
  w.chat.splice(1, 0, { from: null, text: kind === 'summer' ? tr('Wechselperiode I läuft (bis 31. August): Wechsel sind jetzt möglich – Reiter Transfers.', 'Transfer period I is open (until 31 August): moves are possible now – Transfers tab.') : tr('Winterpause, Wechselperiode II läuft (Januar): Wechsel sind jetzt möglich – Reiter Transfers.', 'Winter break, transfer period II is open (January): moves are possible now – Transfers tab.'), time: 'Mo 08:00' });
  if (t.opened[key]) return;
  t.opened[key] = true;
  const firstWeek = c.season === 1 && c.round === 0; // der Gründungssommer: die Liga ist gerade erst entstanden
  if (!firstWeek) cpuTransfers(c, kind);
  makeOffers(c, kind, key);
  duePending(c, kind, key);
  for (const o of t.offers.filter((x) => x.key === key)) {
    const club = anyClub(c, o.club);
    if (!club) continue;
    const text = o.poached ? tr(`Wie besprochen: Ich will zu ${club.name}. Die haben jetzt offiziell angefragt – gebt ihr mich frei?`, `As we discussed: I want to join ${club.name}. They have now asked officially – will you release me?`) : tr(`${club.name} hat angefragt – ${o.wish ? 'ich würde gern hören, was ihr sagt.' : 'bin gespannt, was ihr sagt.'}`, `${club.name} have been in touch – ${o.wish ? 'I would like to hear what you say.' : 'curious what you say.'}`);
    c.week.chat.push({ from: o.idx, text, time: 'Mo 09:30' });
  }
}
export function nextSeason(c) {
  purge(c);
}
