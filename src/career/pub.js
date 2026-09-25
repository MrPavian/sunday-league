// Stammkneipe „Zum Anstoß": einmal pro Woche mit der Mannschaft am Tresen.
// Zwei Aktionen: eine Runde ausgeben, Einzelgespräche (dabei erfährt man die
// Geschichten der Leute), Taktik auf dem Bierdeckel, den Wirt ausfragen oder
// eine Runde Dart um die nächste Runde.
import { createRng } from '../core/rng.js';
import { DOSSIER, DOSSIER_ORDER, HEINZ, INTEL } from '../data/backstories.js';
import { book } from './finances.js';
import { addRumor, clubById, humanClub, humanFixture, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { adjustPatience, coachAway, isCoach } from './personal.js';

export const PUB_NAME = 'Zum Anstoß';
export const PUB_ACTIONS = 2;
export const ROUND_PRICE = 2.5; // pro Nase

export const TACTICS = {
  pressing: { name: 'Hoch pressen', desc: 'Alle vorne drauf. Kostet Kraft.', mods: { pace: 0.03, tackling: 0.03, stamina: -0.05 } },
  beton: { name: 'Hinten dicht', desc: 'Erst mal kein Gegentor. Vorne passiert wenig.', mods: { tackling: 0.05, heading: 0.03, shooting: -0.04 } },
  kurzpass: { name: 'Kurzpass-Zauber', desc: 'Flach spielen, hoch gewinnen.', mods: { passing: 0.05, technique: 0.03, heading: -0.03 } },
  brechstange: { name: 'Lang und hoch', desc: 'Ball nach vorne, der Große macht das schon.', mods: { heading: 0.05, shooting: 0.03, passing: -0.04 } },
};

const seedOf = (c, extra) => (c.seed * 7919 + c.season * 613 + c.round * 37 + extra) >>> 0;
const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
export const wirtName = (c) => (c.staff?.wirt ? c.staff.wirt.name.split(' ')[0] : 'Kalle');

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
    const text = list[(idx * (i + 3) + i * 7) % list.length](facts);
    return { kind, text, known: i < known };
  });
}

export function buyRound(c) {
  if (!canAct(c)) return null;
  const n = humanClub(c).squad.length;
  const cost = Math.round(n * ROUND_PRICE);
  book(c, `Runde in der „${PUB_NAME}"`, -cost);
  adjustMood(c, 0.08);
  return spend(c, `Du gibst eine Runde aus (${cost} €). ${wirtName(c)} zapft, die Stimmung steigt.`);
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
    if (!next) return spend(c, `${name} und du reden über alte Spiele. Mehr gibt es gerade nicht zu erzählen – aber es tut beiden gut.`);
    rec.dossier = (rec.dossier ?? 0) + 1;
    if (next.kind === 'geheimnis') adjustMood(c, 0.02);
    return spend(c, `Am Tresen mit ${name}: ${next.text}`);
  }
  if (tone === 'cheer') {
    adjustForm(c, idx, 0.45);
    const wasGrumpy = rec.grumpy > 0;
    rec.grumpy = 0;
    return spend(c, wasGrumpy ? `Du klopfst ${name} auf die Schulter. Der Ärger ist verflogen.` : `„Du bist wichtig für uns." ${name} grinst in sein Bier.`);
  }
  if (tone === 'straight') {
    if (rng.chance(0.55)) {
      adjustForm(c, idx, 0.7);
      return spend(c, `Klartext: „Du kannst mehr." ${name} nickt. Sonntag will er es allen zeigen.`);
    }
    adjustForm(c, idx, -0.3);
    rec.grumpy = 2;
    return spend(c, `Klartext: „Du kannst mehr." ${name} stellt das Glas ab und geht. Das war zu viel.`);
  }
  return null;
}

export function setTactic(c, id) {
  if (!canAct(c) || !TACTICS[id]) return null;
  pubState(c).tactic = id;
  return spend(c, `Auf dem Bierdeckel: „${TACTICS[id].name}". Alle nicken, keiner hat zugehört. Sonntag sehen wir es.`);
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
    return spend(c, `${wirtName(c)} beugt sich über den Tresen: ${tip.text(opp.name)}`);
  }
  const rumor = addRumor(c, rng, `${wirtName(c)} poliert ein Glas: „Da gibt's einen, {first}. Kickt bei keinem Verein. Frag doch mal."`);
  if (rumor) return spend(c, `${wirtName(c)} hat einen Tipp: ${playerOf(c, rumor.idx).name}. Steht jetzt bei den Transfers.`);
  return spend(c, `${wirtName(c)} weiß diese Woche auch nichts Neues. „Ruhige Woche."`);
}

// Dart um die nächste Runde. score = Summe der drei Würfe (0–180), kommt aus dem Minispiel.
export function playDart(c, score) {
  if (!canAct(c)) return null;
  const rng = createRng(seedOf(c, 19));
  const heinz = rng.int(45, 140);
  pubState(c).dart = { you: score, heinz };
  if (score > heinz) {
    adjustMood(c, 0.05);
    return spend(c, `Dart gegen Opa Heinz: ${score} zu ${heinz}. Heinz zahlt die Runde – und murmelt was von „früher".`);
  }
  if (score === heinz) return spend(c, `Dart gegen Opa Heinz: ${score} zu ${heinz}. Unentschieden, jeder zahlt sein Bier selbst.`);
  book(c, 'Dart verloren: Runde für den Tisch', -15);
  return spend(c, `Dart gegen Opa Heinz: ${score} zu ${heinz}. Du zahlst die Runde (15 €). Heinz trifft mit 81 immer noch die Triple 20.`);
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
