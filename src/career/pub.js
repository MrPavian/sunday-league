// Stammkneipe „Zum Anstoß": einmal pro Woche mit der Mannschaft am Tresen.
// Zwei Aktionen: eine Runde ausgeben, Einzelgespräche (dabei erfährt man die
// Geschichten der Leute), Taktik auf dem Bierdeckel, den Wirt ausfragen oder
// eine Runde Dart um die nächste Runde.
import { createRng } from '../core/rng.js';
import { DOSSIER, DOSSIER_ORDER, dossierFacts, dossierIndex, DREAM_SUPPORT, HEINZ, INTEL } from '../data/backstories.js';
import { originOf } from '../data/origins.js';
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
// Textvielfalt (ROADMAP 11.18 Punkt 9): mehrere Fassungen je Satz, gewählt über Saison, Spieltag und Anlass – ohne Zufallszahl,
// damit sich keine Wirkung verschiebt. Die Streuung (Knuth) macht aus benachbarten Spieltagen verschiedene Fassungen.
const say = (c, salt, list) => list[(Math.imul(seedOf(c, salt), 2654435761) >>> 0) % list.length];
export const wirtName = (c) => (c.staff?.wirt ? c.staff.wirt.name.split(' ')[0] : tr('Kalle', 'Kalle'));

export function pubState(c) {
  if (!c.week) return null;
  c.week.pub ??= { actions: PUB_ACTIONS, log: [], tactic: null, intel: null, heinz: HEINZ[(c.season * 11 + c.round * 5) % HEINZ.length] };
  return c.week.pub;
}

export const pubOpen = (c) => !!c.week && !c.week.cupWeek && !coachAway(c); // Turnierwoche nach der Saison (tournament.js cupWeek): Kneipe erst wieder in der neuen Saison

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
  const facts = dossierFacts(p, originOf(p.name.split(' ').slice(1).join(' ')));
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
  const text = DREAM_SUPPORT[dossierIndex(idx, 2, DREAM_SUPPORT.length)](name, playerOf(c, idx));
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
  return spend(c, say(c, 101, [
    tr(`Du gibst eine Runde aus (${euroFmt(cost)}). ${wirtName(c)} zapft, die Stimmung steigt.`, `You buy a round (${euroFmt(cost)}). ${wirtName(c)} pulls the pints, spirits rise.`),
    tr(`„Die Runde geht auf den Trainer!" (${euroFmt(cost)}) Am Tresen wird gejubelt wie nach einem Tor.`, `"This round's on the gaffer!" (${euroFmt(cost)}) The bar cheers as if we'd scored.`),
    tr(`Runde für alle (${euroFmt(cost)}). ${wirtName(c)} stellt die Gläser auf ein Tablett, irgendwer stimmt das Vereinslied an.`, `A round for everyone (${euroFmt(cost)}). ${wirtName(c)} lines the glasses up on a tray, someone starts the club song.`),
    tr(`Du zahlst die Runde (${euroFmt(cost)}). Sogar der Ersatztorwart bleibt noch auf eins.`, `You pay for the round (${euroFmt(cost)}). Even the reserve keeper stays for one more.`),
  ]));
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
    if (!next) return spend(c, say(c, 200 + (idx % 97), [
      tr(`${name} und du reden über alte Spiele. Mehr gibt es gerade nicht zu erzählen – aber es tut beiden gut.`, `${name} and you talk about old matches. There's not much left to tell right now – but it does you both good.`),
      tr(`${name} erzählt zum dritten Mal von seinem Tor gegen den Tabellenführer. Du hörst trotzdem zu.`, `${name} tells the story of his goal against the league leaders for the third time. You listen anyway.`),
      tr(`Ihr redet über Gott und die Welt, kaum über Fußball. ${name} wirkt danach gelöster.`, `You talk about everything except football. ${name} seems more relaxed afterwards.`),
    ]));
    rec.dossier = (rec.dossier ?? 0) + 1;
    if (next.kind === 'geheimnis') adjustMood(c, 0.02);
    return spend(c, tr(`Am Tresen mit ${name}: ${next.text}`, `At the bar with ${name}: ${next.text}`));
  }
  if (tone === 'cheer') {
    adjustForm(c, idx, 0.45);
    const wasGrumpy = rec.grumpy > 0;
    rec.grumpy = 0;
    if (!wasGrumpy) return spend(c, say(c, 300 + (idx % 97), [
      tr(`„Du bist wichtig für uns." ${name} grinst in sein Bier.`, `"You matter to this team." ${name} grins into his beer.`),
      tr(`„Sonntag brauche ich dich." ${name} richtet sich auf, als stünde er schon im Tunnel.`, `"I need you on Sunday." ${name} sits up straight as if already in the tunnel.`),
      tr(`Du stößt mit ${name} an: „Auf deine nächste Bude." Er lacht – und glaubt dran.`, `You clink glasses with ${name}: "To your next goal." He laughs – and believes it.`),
    ]));
    return spend(c, wasGrumpy ? tr(`Du klopfst ${name} auf die Schulter. Der Ärger ist verflogen.`, `You pat ${name} on the shoulder. The grudge is forgotten.`) : tr(`„Du bist wichtig für uns." ${name} grinst in sein Bier.`, `"You matter to this team." ${name} grins into his pint.`));
  }
  if (tone === 'straight') {
    if (rng.chance(0.55)) {
      adjustForm(c, idx, 0.7);
      return spend(c, say(c, 400 + (idx % 97), [
        tr(`Klartext: „Du kannst mehr." ${name} nickt. Sonntag will er es allen zeigen.`, `Straight talk: "You can do better." ${name} nods. Sunday, he'll show everyone.`),
        tr(`Klartext: „Das reicht so nicht." ${name} schluckt, dann: „Ich weiß." Er bestellt eine Apfelschorle.`, `Straight talk: "That's not good enough." ${name} swallows, then: "I know." He orders a soft drink.`),
        tr(`Klartext unter vier Augen. ${name} sagt lange nichts – und ist am Dienstag als Erster beim Training.`, `Straight talk, just the two of you. ${name} says nothing for a long time – and is first at training on Tuesday.`),
      ]));
    }
    adjustForm(c, idx, -0.3);
    rec.grumpy = 2;
    return spend(c, say(c, 500 + (idx % 97), [
      tr(`Klartext: „Du kannst mehr." ${name} stellt das Glas ab und geht. Das war zu viel.`, `Straight talk: "You can do better." ${name} puts down his glass and leaves. That was too much.`),
      tr(`Klartext: „Das reicht so nicht." ${name} wird laut, die halbe Kneipe dreht sich um. Das ging nach hinten los.`, `Straight talk: "That's not good enough." ${name} raises his voice, half the pub turns round. That backfired.`),
      tr(`${name} hört sich alles an, zahlt wortlos und geht. Morgen wird es frostig in der Kabine.`, `${name} hears you out, pays without a word and leaves. It'll be frosty in the dressing room tomorrow.`),
    ]));
  }
  return null;
}

export function setTactic(c, id) {
  if (!canAct(c) || !TACTICS[id]) return null;
  pubState(c).tactic = id;
  return spend(c, say(c, 600, [
    tr(`Auf dem Bierdeckel: „${TACTICS[id].name}". Alle nicken, keiner hat zugehört. Sonntag sehen wir es.`, `Sketched on the beer mat: "${TACTICS[id].name}". Everyone nods, nobody was listening. We'll see on Sunday.`),
    tr(`„${TACTICS[id].name}" – mit Salzstreuern und Bierdeckeln auf dem Tisch nachgestellt. Der Kapitän macht ein Foto.`, `"${TACTICS[id].name}" – acted out on the table with salt shakers and beer mats. The captain takes a photo.`),
    tr(`Du kritzelst „${TACTICS[id].name}" auf einen Bierdeckel. ${wirtName(c)} nagelt ihn hinter den Tresen.`, `You scribble "${TACTICS[id].name}" on a beer mat. ${wirtName(c)} pins it up behind the bar.`),
  ]));
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
  return spend(c, say(c, 700, [
    tr(`${wirtName(c)} weiß diese Woche auch nichts Neues. „Ruhige Woche."`, `${wirtName(c)} has nothing new this week. "Quiet week."`),
    tr(`${wirtName(c)} zuckt mit den Schultern: „Nix gehört. Und ich hör alles."`, `${wirtName(c)} shrugs: "Heard nothing. And I hear everything."`),
    tr(`${wirtName(c)} wischt den Tresen: „Frag nächste Woche wieder. Da ist Schützenfest, da wird geredet."`, `${wirtName(c)} wipes the bar: "Ask again next week. It's the village fair, people talk."`),
  ]));
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
