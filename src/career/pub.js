// Stammkneipe „Zum Anstoß": einmal pro Woche mit der Mannschaft am Tresen.
// Zwei Aktionen: eine Runde ausgeben, Einzelgespräche (dabei erfährt man die
// Geschichten der Leute), Taktik auf dem Bierdeckel, den Wirt ausfragen oder
// eine Runde Dart um die nächste Runde.
import { createRng } from '../core/rng.js';
import { DOSSIER, DOSSIER_ORDER, dossierIndex, DREAM_SUPPORT, HEINZ, INTEL } from '../data/backstories.js';
import { book } from './finances.js';
import { addRumor, clubById, humanClub, humanFixture, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { adjustEnergy, adjustPatience, coachAway, isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { tr, euroFmt } from '../core/i18n.js';

export const PUB_NAME = tr('Zum Anstoß', 'The Kick-Off');
export const PUB_ACTIONS = 2;
export const ROUND_PRICE = 2.5; // pro Nase

export const TACTICS = {
  pressing: { name: tr('Hoch pressen', 'High press'), desc: tr('Alle vorne drauf. Kostet Kraft.', 'Everyone piles forward. Costs stamina.'), mods: { pace: 0.03, tackling: 0.03, stamina: -0.05 } },
  beton: { name: tr('Hinten dicht', 'Park the bus'), desc: tr('Erst mal kein Gegentor. Vorne passiert wenig.', 'No conceding, first of all. Not much happens up front.'), mods: { tackling: 0.05, heading: 0.03, shooting: -0.04 } },
  kurzpass: { name: tr('Kurzpass-Zauber', 'Tiki-taka magic'), desc: tr('Flach spielen, hoch gewinnen.', 'Keep it on the deck, win big.'), mods: { passing: 0.05, technique: 0.03, heading: -0.03 } },
  brechstange: { name: tr('Lang und hoch', 'Long and high'), desc: tr('Ball nach vorne, der Große macht das schon.', 'Ball forward, the big lad will sort it out.'), mods: { heading: 0.05, shooting: 0.03, passing: -0.04 } },
};

const seedOf = (c, extra) => (c.seed * 7919 + c.season * 613 + c.round * 37 + extra) >>> 0;
const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
export const wirtName = (c) => (c.staff?.wirt ? c.staff.wirt.name.split(' ')[0] : tr('Kalle', 'Kalle'));

export function pubState(c) {
  if (!c.week) return null;
  c.week.pub ??= { actions: PUB_ACTIONS, log: [], tactic: null, intel: null, heinz: HEINZ[(c.season * 11 + c.round * 5) % HEINZ.length] };
  return c.week.pub;
}

export const pubOpen = (c) => !!c.week && !coachAway(c);

function spend(c, text) {
  const pub = pubState(c);
  pub.actions--;
  pub.log.push(text);
  adjustPatience(c, -2); // noch ein Abend nicht zu Hause
  return text;
}

const canAct = (c) => pubOpen(c) && pubState(c).actions > 0;

// Dossier: welche Kapitel es gibt und welche schon erzählt wurden.
export function dossier(c, idx) {
  const p = playerOf(c, idx);
  const facts = { first: p.name.split(' ')[0], age: p.age, profession: p.profession };
  const known = c.players[idx]?.dossier ?? 0;
  return DOSSIER_ORDER.map((kind, i) => {
    const list = DOSSIER[kind];
    const text = list[dossierIndex(idx, i, list.length)](facts);
    return { kind, text, known: i < known };
  });
}

// Wer seinen Traum kennt, kann ihm helfen. Kostet Geld und Kraft, bindet ihn an den Verein.
export const DREAM_COST = 30;
export const canSupportDream = (c, idx) => pubOpen(c) && (c.players[idx]?.dossier ?? 0) >= 3 && !c.players[idx]?.dreamDone;
export function supportDream(c, idx) {
  if (!canSupportDream(c, idx) || c.cash < DREAM_COST) return null;
  const rec = c.players[idx];
  const name = first(c, idx);
  book(c, tr(`Traum von ${name} unterstützt`, `Supported ${name}'s dream`), -DREAM_COST);
  adjustEnergy(c, -5);
  adjustForm(c, idx, 0.6);
  adjustMood(c, 0.05);
  rec.dreamDone = true;
  rec.loyal = true;
  const text = DREAM_SUPPORT[dossierIndex(idx, 2, DREAM_SUPPORT.length)](name);
  chronicle(c, tr(`${playerOf(c, idx).name}: ein Traum wird wahr. ${text}`, `${playerOf(c, idx).name}: a dream comes true. ${text}`));
  pubState(c).log.push(text);
  return text;
}

export function buyRound(c) {
  if (!canAct(c)) return null;
  const n = humanClub(c).squad.length;
  const cost = Math.round(n * ROUND_PRICE);
  book(c, tr(`Runde in der „${PUB_NAME}"`, `Round at "${PUB_NAME}"`), -cost);
  adjustMood(c, 0.08);
  return spend(c, tr(`Du gibst eine Runde aus (${euroFmt(cost)}). ${wirtName(c)} zapft, die Stimmung steigt.`, `You buy a round (${euroFmt(cost)}). ${wirtName(c)} pulls the pints, spirits rise.`));
}

// Einzelgespräch. tone: listen (erzählt etwas), cheer (Form), straight (Klartext, riskant).
export function talk(c, idx, tone) {
  if (!canAct(c) || !humanClub(c).squad.includes(idx) || isCoach(c, idx)) return null;
  const rec = c.players[idx];
  const name = first(c, idx);
  const rng = createRng(seedOf(c, idx % 997));
  if (tone === 'listen') {
    const facts = dossier(c, idx);
    const next = facts.find((f) => !f.known);
    adjustForm(c, idx, 0.2);
    if (!next) return spend(c, tr(`${name} und du reden über alte Spiele. Mehr gibt es gerade nicht zu erzählen – aber es tut beiden gut.`, `${name} and you talk about old matches. There's not much left to tell right now – but it does you both good.`));
    rec.dossier = (rec.dossier ?? 0) + 1;
    if (next.kind === 'geheimnis') adjustMood(c, 0.02);
    return spend(c, tr(`Am Tresen mit ${name}: ${next.text}`, `At the bar with ${name}: ${next.text}`));
  }
  if (tone === 'cheer') {
    adjustForm(c, idx, 0.45);
    const wasGrumpy = rec.grumpy > 0;
    rec.grumpy = 0;
    return spend(c, wasGrumpy ? tr(`Du klopfst ${name} auf die Schulter. Der Ärger ist verflogen.`, `You pat ${name} on the shoulder. The grudge is forgotten.`) : tr(`„Du bist wichtig für uns." ${name} grinst in sein Bier.`, `"You matter to this team." ${name} grins into his pint.`));
  }
  if (tone === 'straight') {
    if (rng.chance(0.55)) {
      adjustForm(c, idx, 0.7);
      return spend(c, tr(`Klartext: „Du kannst mehr." ${name} nickt. Sonntag will er es allen zeigen.`, `Straight talk: "You can do better." ${name} nods. Sunday, he'll show everyone.`));
    }
    adjustForm(c, idx, -0.3);
    rec.grumpy = 2;
    return spend(c, tr(`Klartext: „Du kannst mehr." ${name} stellt das Glas ab und geht. Das war zu viel.`, `Straight talk: "You can do better." ${name} puts down his glass and leaves. That was too much.`));
  }
  return null;
}

export function setTactic(c, id) {
  if (!canAct(c) || !TACTICS[id]) return null;
  pubState(c).tactic = id;
  return spend(c, tr(`Auf dem Bierdeckel: „${TACTICS[id].name}". Alle nicken, keiner hat zugehört. Sonntag sehen wir es.`, `Sketched on the beer mat: "${TACTICS[id].name}". Everyone nods, nobody was listening. We'll see on Sunday.`));
}

// Der Wirt weiß alles: entweder ein neuer Name für die Gerüchteküche oder ein Tipp zum Gegner.
export function askWirt(c) {
  if (!canAct(c)) return null;
  const rng = createRng(seedOf(c, 71));
  const f = humanFixture(c);
  const me = humanClub(c).id;
  const opp = f ? clubById(c, f.home === me ? f.away : f.home) : null;
  if (opp && rng.chance(0.5)) {
    const tip = INTEL[rng.int(0, INTEL.length - 1)];
    pubState(c).intel = { club: opp.id, mods: tip.mods };
    return spend(c, tr(`${wirtName(c)} beugt sich über den Tresen: ${tip.text(opp.name)}`, `${wirtName(c)} leans over the bar: ${tip.text(opp.name)}`));
  }
  const rumor = addRumor(c, rng, tr(`${wirtName(c)} poliert ein Glas: „Da gibt's einen, {first}. Kickt bei keinem Verein. Frag doch mal."`, `${wirtName(c)} polishes a glass: "There's this lad, {first}. Not signed anywhere. Worth a word."`));
  if (rumor) return spend(c, tr(`${wirtName(c)} hat einen Tipp: ${playerOf(c, rumor.idx).name}. Steht jetzt bei den Transfers.`, `${wirtName(c)} has a tip: ${playerOf(c, rumor.idx).name}. Now listed in transfers.`));
  return spend(c, tr(`${wirtName(c)} weiß diese Woche auch nichts Neues. „Ruhige Woche."`, `${wirtName(c)} has nothing new this week. "Quiet week."`));
}

// Dart um die nächste Runde. score = Summe der drei Würfe (0–180), kommt aus dem Minispiel.
export function playDart(c, score) {
  if (!canAct(c)) return null;
  const rng = createRng(seedOf(c, 19));
  const heinz = rng.int(45, 140);
  pubState(c).dart = { you: score, heinz };
  if (score > heinz) {
    adjustMood(c, 0.05);
    return spend(c, tr(`Dart gegen Opa Heinz: ${score} zu ${heinz}. Heinz zahlt die Runde – und murmelt was von „früher".`, `Darts against old Heinz: ${score} to ${heinz}. Heinz buys the round – muttering something about "back in his day".`));
  }
  if (score === heinz) return spend(c, tr(`Dart gegen Opa Heinz: ${score} zu ${heinz}. Unentschieden, jeder zahlt sein Bier selbst.`, `Darts against old Heinz: ${score} to ${heinz}. A draw, everyone pays their own way.`));
  book(c, tr('Dart verloren: Runde für den Tisch', 'Lost at darts: round for the table'), -15);
  return spend(c, tr(`Dart gegen Opa Heinz: ${score} zu ${heinz}. Du zahlst die Runde (15 €). Heinz trifft mit 81 immer noch die Triple 20.`, `Darts against old Heinz: ${score} to ${heinz}. You buy the round (${euroFmt(15)}). At 81, Heinz still hits the triple 20.`));
}

// Wirkung am Spieltag: Bierdeckel-Taktik auf die eigenen Leute, Wirte-Tipp auf den Gegner.
export function applyPubToTeam(c, club, players) {
  const pub = c.week?.pub;
  if (!pub) return players;
  let mods = null;
  if (club.human && pub.tactic) mods = TACTICS[pub.tactic].mods;
  else if (!club.human && pub.intel?.club === club.id) mods = pub.intel.mods;
  if (!mods) return players;
  for (const p of players) for (const [k, v] of Object.entries(mods)) p.attrs[k] = Math.max(0.05, Math.min(0.98, p.attrs[k] + v));
  return players;
}
