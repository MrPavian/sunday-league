// Werben um neue Spieler: kein Ein-Klick mehr, sondern ein Gespräch.
//
// Jeder Kandidat hat zwei Beweggründe (Motive) – fest, aus seiner Person abgeleitet: Beruf,
// Alter, Stufe. Zuschauen beim Kick deckt neben der Stärke das erste Motiv auf, Rumfragen
// (Kneipe, Kollegen) das zweite. Im Gespräch wählst du zwei Argumente: Wer das trifft, was
// ihm wichtig ist, hat ihn fast; wer daneben liegt, verschenkt Chancen – und manches schreckt
// ab (einem Ex-Profi den Aufstieg versprechen). Ein Einsatz-Versprechen wirkt stark, muss aber
// gehalten werden: Spielt er in den ersten zwei Spieltagen nicht, ist er sauer.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { hasFacility } from './facilities.js';
import { SHIFT_JOBS } from './chat.js';
import { adjustMood } from './events.js';
import { pastLink } from './relations.js';

export const MOTIVES = {
  spielzeit: { label: tr('will spielen', 'wants to play') },
  kumpels: { label: tr('will Leute um sich, die er kennt', 'wants people he knows around him') },
  erfolg: { label: tr('will gewinnen, am liebsten aufsteigen', 'wants to win, ideally go up') },
  gesellig: { label: tr('Grill, Theke, dritte Halbzeit', 'barbecue, bar, the third half') },
  training: { label: tr('Trainingszeiten müssen zur Arbeit passen', 'training times must fit around work') },
  geld: { label: tr('jeder Euro zählt', 'every euro counts') },
  ruhe: { label: tr('will keinen Rummel, nur kicken', 'wants no fuss, just to play') },
};

export const ARGUMENTS = {
  spielzeit: { label: tr('Einsatz versprechen', 'Promise him games'), hint: tr('Er spielt die nächsten zwei Sonntage – versprochen.', 'He plays the next two Sundays – promised.') },
  kumpels: { label: tr('Die Truppe', 'The lads'), hint: tr('Hier kennt jeder jeden.', 'Everyone knows everyone here.') },
  erfolg: { label: tr('Wir wollen nach oben', 'We are going up'), hint: tr('Tabelle, Ziele, Ehrgeiz.', 'League table, goals, ambition.') },
  gesellig: { label: tr('Grill & dritte Halbzeit', 'Barbecue & the third half'), hint: tr('Nach dem Spiel bleibt man.', 'After the game, people stay.') },
  training: { label: tr('Trainingszeiten', 'Training times'), hint: tr('Training nach Feierabend, Schicht kein Problem.', 'Training after work, shifts no problem.') },
  geld: { label: tr('Fahrgeld (30 €)', 'Petrol money (€30)'), hint: tr('Aus der Kasse, einmalig.', 'From the kitty, one-off.') },
  ruhe: { label: tr('Kein Rummel', 'No fuss'), hint: tr('Bei uns kickst du einfach.', 'With us you just play.') },
};
export const ARG_IDS = Object.keys(ARGUMENTS);
const TALK_ARGS = 2;

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Zwei Motive je Spieler, fest aus seiner Person (nicht aus dem Spielstand) – wer ihn kennt, weiß es.
export function motivesOf(p) {
  const w = {
    spielzeit: 3 + (p.rating >= 55 ? 1 : 0),
    kumpels: 2,
    erfolg: 2 + (p.age <= 24 ? 1 : 0) + (p.traits?.includes('ehrgeizig') ? 2 : 0),
    gesellig: 2 + (p.traits?.includes('teamchemie') ? 2 : 0),
    training: SHIFT_JOBS.includes(p.profession) ? 6 : 0.5,
    geld: 1.5 + (/Student|Azubi|Schüler/.test(p.profession ?? '') ? 2 : 0),
    ruhe: p.tier === 'legende' ? 8 : p.age >= 33 ? 1.5 : 0.3,
  };
  const rng = createRng(hashSeed(p.poolIndex ?? 0, 911));
  const out = [];
  while (out.length < 2) {
    const ids = Object.keys(w).filter((k) => !out.includes(k));
    let r = rng.next() * ids.reduce((s, k) => s + w[k], 0);
    out.push(ids.find((k) => (r -= w[k]) < 0) ?? ids[0]);
  }
  return out;
}

// Rumfragen: deckt das nächste Motiv auf (Kneipe, Arbeitskollegen). Kostet eine Aktion.
export function askAround(c, r, coachAway) {
  const w = c.week;
  if (!r || r.status !== 'open' || w.actions <= 0 || coachAway) return false;
  r.known ??= [];
  if (r.known.length >= 2) return false;
  w.actions--;
  r.known.push(r.known.length);
  return true;
}
// Zuschauen deckt zusätzlich zur Stärke das erste Motiv auf.
export const revealFirst = (r) => {
  r.known ??= [];
  if (!r.known.includes(0)) r.known.push(0);
};
export const knownMotives = (r, p) => (r.known ?? []).map((i) => motivesOf(p)[i]);

// Wirkung eines Arguments auf das Interesse (Prozentpunkte).
export function argumentEffect(c, p, arg, motives, idx) {
  const hit = motives.includes(arg);
  let v = hit ? 22 : 4;
  if (arg === 'kumpels') {
    const link = pastLink(c, idx);
    if (link?.kind === 'schulfreund') v += 10; // er kennt schon einen aus der Schule
    if (link?.kind === 'mobber') v -= 10;
  }
  if (arg === 'gesellig' && hasFacility(c, 'grill')) v += 6;
  if (arg === 'training' && hasFacility(c, 'flutlicht')) v += 6;
  // Was abschreckt:
  if (motives.includes('ruhe') && (arg === 'erfolg' || arg === 'gesellig')) v -= 15;
  if (arg === 'geld' && p.tier === 'legende') v -= 10; // ein Ex-Profi lässt sich nicht mit 30 € kaufen
  return v;
}

// Gespräch beginnen (kostet eine Aktion), Argumente wählen, nach dem zweiten entscheidet er.
export function startTalk(c, r, coachAway, full) {
  const w = c.week;
  if (!r || r.status !== 'open' || r.talk || w.actions <= 0 || coachAway || full) return false;
  w.actions--;
  r.talk = { args: [] };
  return true;
}

// Liefert null (noch nicht fertig) oder { joined, interest, reply }.
export function pickArgument(c, r, arg, { player, idx, baseChance, join }) {
  if (!r?.talk || r.status !== 'open' || !ARGUMENTS[arg] || r.talk.args.includes(arg)) return null;
  r.talk.args.push(arg);
  if (r.talk.args.length < TALK_ARGS) return null;
  const motives = motivesOf(player);
  // Ohne passende Argumente liegt er unter der alten Grundchance – mit beiden Treffern klar darüber.
  let interest = baseChance * 100 - 15;
  for (const a of r.talk.args) interest += argumentEffect(c, player, a, motives, idx);
  interest = Math.max(5, Math.min(95, interest));
  r.talk.interest = Math.round(interest);
  const rng = createRng(hashSeed(c.seed, c.season, c.round, idx, 17));
  const hits = r.talk.args.filter((a) => motives.includes(a));
  if (r.talk.args.includes('geld')) book(c, tr(`Fahrgeld ${player.name.split(' ')[0]}`, `Petrol money ${player.name.split(' ')[0]}`), -30);
  const joined = rng.chance(interest / 100) && join();
  r.status = joined ? 'joined' : 'declined';
  r.scouted = true;
  r.known = [0, 1]; // nach dem Gespräch weiß man, was ihm wichtig ist
  if (joined && r.talk.args.includes('spielzeit')) c.players[idx].promised = { from: c.round, until: c.round + 2 };
  r.reply = replyFor(hits, joined, motives);
  return { joined, interest: r.talk.interest, reply: r.reply };
}

function replyFor(hits, joined, motives) {
  const m = MOTIVES[motives[0]].label;
  if (joined && hits.length === 2) return tr('Genau das wollte ich hören. Wann ist Training?', 'That is exactly what I wanted to hear. When is training?');
  if (joined && hits.length === 1) return tr('Klingt gut. Ich bin dabei.', 'Sounds good. I am in.');
  if (joined) return tr('Na gut, ich probier\'s mal.', 'Fine, I will give it a go.');
  if (hits.length) return tr(`Fast. Aber am Ende passt es nicht – mir ist wichtig: ${m}.`, `Close. But in the end it does not fit – what matters to me: ${m}.`);
  return tr(`Ihr habt mir nicht zugehört. Mir ist wichtig: ${m}.`, `You did not listen. What matters to me: ${m}.`);
}

// Woche vorbei: Einsatz versprochen, aber nicht gespielt? Dann ist er sauer.
export function checkPromises(c, squad, say) {
  for (const idx of squad) {
    const rec = c.players[idx];
    const pr = rec?.promised;
    if (!pr || c.round < pr.until) continue; // läuft nach dem Wochenwechsel: zwei Spieltage vorbei?
    if ((rec.lastApp ?? -1) < pr.from) {
      rec.grumpy = 3;
      adjustMood(c, -0.05);
      say?.(idx, tr('Mir wurde was versprochen. Zwei Sonntage Bank. Super.', 'I was promised something. Two Sundays on the bench. Great.'));
    }
    delete rec.promised;
  }
}
