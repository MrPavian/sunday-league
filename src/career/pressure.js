// Vorstand und Erfolgsdruck (ROADMAP 11.13 „Stuhl wackelt bei Negativserie“, Nutzerentscheide 2026-11-05, nur neue Karrieren):
//  - Rückhalt (0–100): Der Vorstand misst jedes Ligaspiel am Saisonziel (board.js). Wie stark ein Ergebnis zählt, wächst mit der
//    Liga: in der Freizeitliga gar nicht, in den Kreisligen kaum, ab der Landesliga deutlich, in Regionalliga und 3. Liga hart.
//  - Unter 40: Warnung. Unter 25: Ultimatum – aus den nächsten drei Ligaspielen vier Punkte. Klappt es nicht, ist der Trainer
//    entlassen und bekommt Angebote anderer Vereine der Liga (clubchange.js); die Karriere geht dort weiter.
//  - Als Präsident (personal.js isPresident) machen die Mitglieder Druck: Unter 25 kommt ein Misstrauensantrag. Knapp verloren
//    (Rückhalt noch mindestens 12): Der eingestellte Trainer muss gehen, man bleibt Präsident und holt einen neuen. Deutlich
//    verloren oder der zweite verlorene Antrag binnen zwei Saisons: abgewählt – Angebote anderer Vereine, als Trainer.
//  - Saisonende: Ziel erreicht, übertroffen oder verfehlt, Auf- und Abstieg verschieben den Rückhalt.
// Alle Zahlen sind Spielwerte (keine Quelle zur Geduld von Vorständen), gemessen mit scripts/pressure-audit.mjs.
import { tr } from '../core/i18n.js';
import { clubById, humanClub, seasonOver, table } from './career.js';
import { chronicle } from './sagas.js';
import { isPresident } from './personal.js';
import { forceOutHired } from './president.js';

export const PRESSURE = [0, 0, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9]; // Gewicht je Stufe 1–10
export const TRUST = {
  start: 60, // neue Karriere
  newClub: 55, // nach einem Vereinswechsel
  warn: 40,
  ultimatum: 25,
  games: 3, // Ultimatum: so viele Ligaspiele …
  need: 4, // … und so viele Punkte daraus
  after: 40, // Rückhalt nach bestandenem Ultimatum oder knapp verlorenem Antrag
  perPoint: 4, // je Punkt über/unter der Erwartung (× Gewicht der Liga)
  summerFire: 5, // im Sommer: darunter sofort entlassen, sonst Ultimatum zum Saisonstart
  streak: 3, // ab so vielen Niederlagen in Folge zusätzlich …
  streakHit: 3, // … so viel weniger je Spiel (× Gewicht)
  voteNarrow: 12, // Misstrauensantrag: darüber knapp verloren
  voteMemory: 2, // zweiter verlorener Antrag binnen so vielen Saisons: abgewählt
  goal: 10, // Saisonziel erreicht
  smash: 20, // weit übertroffen
  miss: 15, // verfehlt (× Gewicht)
  promoted: 15,
  relegated: 20, // (× Gewicht)
  offers: 3,
};
// Erwartete Punkte je Ligaspiel nach Saisonziel (board.js GOALS).
export const EXPECT = { aufstieg: 1.7, obere: 1.3, erhalt: 0.9 };

const BOARD = () => tr('Vorstand (Erwin)', 'Chairman (Erwin)');
const MEMBERS = () => tr('Mitglieder', 'Members');
const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x27d4eb2f);
const clamp = (v) => Math.max(0, Math.min(100, v));
const on = (c) => !!c?.pressure;
export const weight = (c) => PRESSURE[Math.max(1, Math.min(PRESSURE.length - 1, c.level ?? 1))] ?? 0;

export function board(c) {
  c.board ??= { trust: TRUST.start, warned: false, ultimatum: null, losses: 0, votes: [], fired: null };
  return c.board;
}
export const trustOf = (c) => (on(c) ? Math.round(board(c).trust) : null);
export const firedState = (c) => (on(c) ? board(c).fired : null);
export const trustLabel = (v) => (v >= 70 ? tr('fest im Sattel', 'firmly in the saddle') : v >= TRUST.warn ? tr('ordentlich', 'solid') : v >= TRUST.ultimatum ? tr('wackelt', 'wobbling') : tr('am Ende', 'at the end'));

const post = (c, text) => c.week?.chat.splice(1, 0, { from: null, text, time: 'Mo 08:25', press: true });

// Punkte des eigenen Ligaspiels, das eben gespielt wurde (c.round ist schon weitergezählt).
function lastPoints(c) {
  const me = humanClub(c).id;
  const f = (c.fixtures[c.round - 1] ?? []).find((x) => x.result && (x.home === me || x.away === me));
  if (!f) return null;
  const [a, b] = f.home === me ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
  return a > b ? 3 : a === b ? 1 : 0;
}

// Angebote anderer Vereine: eher aus der unteren Tabellenhälfte (die suchen einen neuen Trainer), fest je Saison und Spieltag.
export function makeOffers(c, exclude) {
  const rows = table(c).filter((r) => !r.club.human && r.club.id !== exclude);
  const lower = rows.slice(Math.floor(rows.length / 3));
  const pool = (lower.length ? lower : rows).map((r) => r.club.id);
  const order = pool.map((id) => ({ id, h: hash(c.seed ?? 0, c.season ?? 1, c.round ?? 0, [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0)) })).sort((x, y) => x.h - y.h);
  return order.slice(0, TRUST.offers).map((x) => x.id);
}

function fire(c, reason) {
  const b = board(c);
  const club = humanClub(c);
  b.ultimatum = null;
  b.fired = { season: c.season, round: c.round, reason, from: club.id, offers: makeOffers(c, club.id) };
  const text = reason === 'president'
    ? tr(`Außerordentliche Mitgliederversammlung: Du bist als Präsident abgewählt. ${b.fired.offers.length} Vereine haben schon angerufen.`, `Extraordinary general meeting: you have been voted out as president. ${b.fired.offers.length} clubs have already called.`)
    : tr(`${BOARD()}: „Wir trennen uns. Danke für alles.“ Du bist entlassen. ${b.fired.offers.length} Vereine haben schon angerufen.`, `${BOARD()}: "We are parting ways. Thanks for everything." You have been sacked. ${b.fired.offers.length} clubs have already called.`);
  post(c, text);
  chronicle(c, reason === 'president' ? tr('Der Präsident wird von den Mitgliedern abgewählt.', 'The president is voted out by the members.') : tr('Der Trainer wird entlassen.', 'The manager is sacked.'));
  (c.pendingNews ??= []).push(tr(`Kreisblatt: ${club.name} trennt sich von ${reason === 'president' ? 'seinem Präsidenten' : 'seinem Trainer'}.`, `District Gazette: ${club.name} part ways with their ${reason === 'president' ? 'president' : 'manager'}.`));
}

// Misstrauensantrag gegen den Präsidenten.
function vote(c) {
  const b = board(c);
  const recent = b.votes.some((s) => (c.season ?? 1) - s < TRUST.voteMemory);
  b.votes.push(c.season ?? 1);
  if (b.trust >= TRUST.voteNarrow && !recent) {
    const h = forceOutHired(c);
    b.trust = TRUST.after;
    b.warned = false;
    post(c, tr(`Misstrauensantrag der Mitglieder – knapp verloren. Du bleibst Präsident, aber ${h ? `${h.name} muss als Trainer gehen` : 'ein neuer Trainer muss her'}. Such dir einen neuen.`, `Members' motion of no confidence – narrowly lost. You stay president, but ${h ? `${h.name} has to go as manager` : 'a new manager is needed'}. Find a new one.`));
    chronicle(c, tr('Misstrauensantrag der Mitglieder: Der Trainer muss gehen, der Präsident bleibt.', 'Members’ motion of no confidence: the manager goes, the president stays.'));
    return;
  }
  fire(c, 'president');
}

function crisis(c) {
  const b = board(c);
  if (isPresident(c)) return vote(c);
  const left = (c.fixtures?.length ?? 0) - (c.round ?? 0);
  if (left < TRUST.games) return; // zu spät in der Saison – entschieden wird im Sommer (nextSeason)
  b.ultimatum = { left: TRUST.games, pts: 0, need: TRUST.need };
  post(c, tr(`${BOARD()}: „So geht es nicht weiter.“ Ultimatum: aus den nächsten ${TRUST.games} Ligaspielen ${TRUST.need} Punkte – sonst ist Schluss.`, `${BOARD()}: "It cannot go on like this." Ultimatum: ${TRUST.need} points from the next ${TRUST.games} league games – or it is over.`));
}

// --- Hooks ------------------------------------------------------------------------------------------------------------
export function create(c) {
  if (on(c)) board(c);
}

export function finishRound(c) {
  if (!on(c)) return;
  const b = board(c);
  if (b.fired) return;
  const w = weight(c);
  const pts = lastPoints(c);
  if (!w || pts == null) return;
  if (b.ultimatum) {
    const u = b.ultimatum;
    u.pts += pts;
    u.left--;
    if (u.pts >= u.need) {
      b.ultimatum = null;
      b.trust = Math.max(b.trust, TRUST.after);
      b.warned = false;
      post(c, tr(`${BOARD()}: „Ultimatum erfüllt. Weiter so.“`, `${BOARD()}: "Ultimatum met. Keep it up."`));
    } else if (u.left <= 0) fire(c, 'coach');
    return;
  }
  b.losses = pts === 0 ? (b.losses ?? 0) + 1 : 0;
  const exp = EXPECT[c.goal?.type] ?? EXPECT.obere;
  b.trust = clamp(b.trust + (pts - exp) * TRUST.perPoint * w - (b.losses >= TRUST.streak ? TRUST.streakHit * w : 0));
  // Saisonende: Ziel erreicht?
  if (seasonOver(c) && c.goal?.season === c.season) {
    const pos = table(c).findIndex((r) => r.club.human) + 1;
    const g = c.goal;
    b.trust = clamp(b.trust + (pos <= g.target - 3 || (g.type !== 'aufstieg' && pos <= 2) ? TRUST.smash : pos <= g.target ? TRUST.goal : -TRUST.miss * w));
  }
  if (b.trust < TRUST.ultimatum) return crisis(c);
  if (b.trust < TRUST.warn && !b.warned) {
    b.warned = true;
    post(c, isPresident(c)
      ? tr(`${MEMBERS()}: Im Vereinsheim wird gemurrt. Noch ein paar Niederlagen, und es gibt einen Misstrauensantrag.`, `${MEMBERS()}: there is grumbling in the clubhouse. A few more defeats and there will be a motion of no confidence.`)
      : tr(`${BOARD()}: „Wir müssen reden. Die Ergebnisse passen nicht zum Ziel.“`, `${BOARD()}: "We need to talk. The results do not match the target."`));
  } else if (b.trust >= TRUST.warn + 10) b.warned = false;
}

// Saisonwechsel: Auf- und Abstieg zählen; wer im Sommer unter der Grenze steht, muss gehen (bzw. stellt sich dem Antrag).
export function nextSeason(c, summary) {
  if (!on(c)) return;
  const b = board(c);
  if (b.fired) return;
  const w = PRESSURE[Math.max(1, Math.min(PRESSURE.length - 1, (c.level ?? 1) - (summary?.promoted ? 1 : summary?.relegated ? -1 : 0)))] ?? 0;
  if (summary?.promoted) b.trust = clamp(b.trust + TRUST.promoted);
  if (summary?.relegated) b.trust = clamp(b.trust - TRUST.relegated * w);
  b.ultimatum = null;
  b.losses = 0;
  if (w && b.trust < TRUST.ultimatum) {
    if (isPresident(c)) vote(c);
    else if (b.trust < TRUST.summerFire) fire(c, 'coach');
    else {
      b.ultimatum = { left: TRUST.games, pts: 0, need: TRUST.need };
      post(c, tr(`${BOARD()}: „Letzte Chance.“ Ultimatum zum Saisonstart: aus den ersten ${TRUST.games} Ligaspielen ${TRUST.need} Punkte.`, `${BOARD()}: "Last chance." Ultimatum for the start of the season: ${TRUST.need} points from the first ${TRUST.games} league games.`));
    }
  }
}

export const offerClubs = (c) => (firedState(c)?.offers ?? []).map((id) => clubById(c, id)).filter(Boolean);
