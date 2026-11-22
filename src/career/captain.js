// Kapitän mit Gewicht (Gameplay 2.0, Punkt 41): ein fester Kapitän, den der Trainer bestimmt (sonst wählt er sich aus Erfahrung
// und Ruhe von selbst). Er trägt die Binde (sichtbar am linken Oberarm, render/player/model.js), spricht in Krisen für die
// Mannschaft, und wer ihm die Binde nimmt oder ihn auf die Bank setzt, bekommt es mit der Kabine zu tun.
// Spielwerte, keine Quelle; eigener Zufall je Spieltag (der Spielablauf bleibt gleich).
import { createRng } from '../core/rng.js';
import { tr } from '../core/i18n.js';
import { hasTrait } from '../data/traits.js';
import { profilesOf } from '../sim/profiles.js';
import { humanClub, playerOf } from './career.js';
import { adjustMood, mood } from './events.js';
import { shortName } from './relations.js';

// crisisLosses – so viele Niederlagen in Folge sind eine Krise; crisisMood – oder die Stimmung liegt darunter; talkGap – so viele
// Spieltage bis zur nächsten Ansprache; talkBase/talkLead – Stimmung durch die Ansprache (Grundwert + je Führungsstärke 0…1);
// benchGames – so oft hintereinander auf der Bank, dann wird getuschelt; benchMood/swapMood – Stimmung dabei.
export const CAPTAIN = { on: true, crisisLosses: 3, crisisMood: -0.15, talkGap: 4, talkBase: 0.01, talkLead: 0.05, benchGames: 2, benchMood: -0.02, swapMood: -0.02 };

const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x68e31da4);
const news = (c, text) => (c.pendingNews ??= []).push(text);

// Führungsstärke 0…1: Erfahrung (Alter, Spiele für den Verein), Anführer/Ex-Profi, Ruhepol – Meckerer ziehen ab.
export function leadership(c, idx) {
  const p = playerOf(c, idx);
  if (!p) return 0;
  const rec = c.players[idx] ?? {};
  const apps = (rec.total?.apps ?? 0) + (rec.apps ?? 0);
  let v = Math.min(1, Math.max(0, ((p.age ?? 25) - 20) / 14)) * 0.4 + Math.min(1, apps / 60) * 0.3;
  if (hasTrait(p, 'anfuehrer')) v += 0.3;
  if (hasTrait(p, 'ex_profi')) v += 0.2;
  if (profilesOf(p).includes('ruhepol')) v += 0.15;
  if (hasTrait(p, 'meckerer')) v -= 0.2;
  return Math.max(0, Math.min(1, v));
}

const byLead = (c, list) => [...list].sort((a, b) => leadership(c, b) - leadership(c, a) || a - b);

// Der Kapitän (Pool-Nummer). Ist keiner bestimmt oder ist er weg, wird der mit der größten Führungsstärke Kapitän.
export function captainOf(c) {
  const squad = humanClub(c).squad;
  if (c.captain != null && squad.includes(c.captain)) return c.captain;
  const pick = byLead(c, squad)[0] ?? null;
  if (pick != null && c.captain != null) news(c, tr(`Neuer Kapitän: ${shortName(c, pick)} trägt jetzt die Binde.`, `New captain: ${shortName(c, pick)} now wears the armband.`));
  c.captain = pick;
  return pick;
}

// Wer trägt heute die Binde? Der Kapitän, wenn er spielt – sonst der Führungsstärkste auf dem Platz. Gegner: der Älteste.
export function armbandFor(c, club, lineup) {
  if (!lineup.length) return null;
  if (!club.human) return [...lineup].sort((a, b) => (playerOf(c, b)?.age ?? 0) - (playerOf(c, a)?.age ?? 0) || a - b)[0];
  const cap = captainOf(c);
  return lineup.includes(cap) ? cap : byLead(c, lineup)[0];
}

// Trainer bestimmt den Kapitän. Der Alte ist angefressen, die Kabine redet.
export function setCaptain(c, idx) {
  const old = captainOf(c);
  if (idx === old || !humanClub(c).squad.includes(idx)) return false;
  c.captain = idx;
  if (old != null && humanClub(c).squad.includes(old)) {
    const rec = c.players[old];
    if (rec) rec.grumpy = Math.max(rec.grumpy ?? 0, 1);
    adjustMood(c, CAPTAIN.swapMood);
    news(c, tr(`${shortName(c, idx)} ist neuer Kapitän. ${shortName(c, old)} gibt die Binde ab und sagt dazu nichts – was mehr sagt als alles andere.`, `${shortName(c, idx)} is the new captain. ${shortName(c, old)} hands over the armband and says nothing, which says more than anything.`));
  }
  return true;
}

// Niederlagen in Folge (eigene Ligaspiele dieser Saison bis jetzt).
function lossStreak(c, humanId) {
  let n = 0;
  for (let r = Math.min(c.round ?? 0, (c.fixtures?.length ?? 0) - 1); r >= 0; r--) {
    const f = c.fixtures[r]?.find((x) => (x.home === humanId || x.away === humanId) && x.result);
    if (!f) continue;
    const home = f.home === humanId;
    const gf = home ? f.result.home : f.result.away;
    const ga = home ? f.result.away : f.result.home;
    if (gf < ga) n++;
    else break;
  }
  return n;
}

// Nach dem eigenen Spiel (career.js recordResult): Bank-Gerede und Ansprache in der Krise. Liefert die Sätze.
export function afterMatchCaptain(c, prepared) {
  if (!CAPTAIN.on) return [];
  const me = humanClub(c);
  const cap = captainOf(c);
  if (cap == null) return [];
  const m = prepared.match;
  const team = m.teams.findIndex((t) => t.name === me.name);
  const out = [];
  const say = (t) => (out.push(t), news(c, t));
  // Kapitän da, aber nicht gespielt?
  const played = [...m.players, ...(m.bench?.flat() ?? []), ...(m.sentOff ?? [])].some((p) => p.team === team && p.poolIndex === cap && (m.stats.players[p.id]?.seconds ?? 0) > 0);
  const avail = c.week?.availability?.[cap] === 'yes' && !(c.players[cap]?.injuryWeeks > 0);
  c.captainBench = played || !avail ? 0 : (c.captainBench ?? 0) + 1;
  if (c.captainBench === CAPTAIN.benchGames) {
    adjustMood(c, CAPTAIN.benchMood);
    const rec = c.players[cap];
    if (rec) rec.grumpy = Math.max(rec.grumpy ?? 0, 1);
    say(tr(`Der Kapitän auf der Bank, zum ${CAPTAIN.benchGames}. Mal in Folge – in der Kabine wird getuschelt, ${shortName(c, cap)} zieht sich wortlos um.`, `The captain on the bench for the ${CAPTAIN.benchGames}nd game running – there is whispering in the dressing room, ${shortName(c, cap)} changes without a word.`));
  }
  // Krise: Ansprache, höchstens alle talkGap Spieltage.
  const streak = lossStreak(c, me.id);
  const crisis = streak >= CAPTAIN.crisisLosses || mood(c) < CAPTAIN.crisisMood;
  if (crisis && played && (c.round ?? 0) - (c.captainTalk ?? -99) >= CAPTAIN.talkGap) {
    c.captainTalk = c.round ?? 0;
    const lead = leadership(c, cap);
    adjustMood(c, CAPTAIN.talkBase + CAPTAIN.talkLead * lead);
    const rng = createRng(hashSeed(c.seed, c.season, c.round ?? 0, cap));
    const n = shortName(c, cap);
    const strong = [
      tr(`${n} bittet nach dem Spiel alle in den Kreis: „Wir sind nicht schlechter als die. Wir spielen nur so. Ab Dienstag wird gelaufen.“ Keiner widerspricht.`, `${n} calls everyone into a huddle after the game: "We are not worse than them. We are just playing like it. From Tuesday we run." Nobody argues.`),
      tr(`${n} steht in der Kabine auf: „Wer jetzt jammert, kann gleich zu Hause bleiben.“ Danach ist es still – und dann klatscht einer.`, `${n} stands up in the dressing room: "Anyone who moans now can stay at home." Silence – then someone claps.`),
      tr(`${n} lädt die Mannschaft auf ein Bier ein und redet über alles außer Fußball. Am Dienstag sind alle beim Training.`, `${n} takes the team for a beer and talks about everything except football. On Tuesday everyone is at training.`),
    ];
    const weak = [
      tr(`${n} versucht es mit einer Ansprache. Die Hälfte schaut aufs Handy.`, `${n} tries a team talk. Half of them look at their phones.`),
      tr(`${n} sagt nach dem Spiel: „Kopf hoch, Jungs.“ Mehr fällt ihm auch nicht ein.`, `${n} says after the game: "Heads up, lads." That is all he has got.`),
    ];
    say(rng.pick(lead >= 0.5 ? strong : weak));
  }
  return out;
}

// Nach dem Spieltag-Durcheinander (Überraschungen, Nachzügler): Trägt keiner auf dem Platz die Binde, bekommt sie der
// Führungsstärkste (eigene Mannschaft) bzw. der Älteste (Gegner) auf dem Platz. Die Binde auf der Bank wird abgenommen.
export function fixArmband(c, match) {
  const me = humanClub(c);
  for (const t of [0, 1]) {
    const on = match.players.filter((p) => p.team === t && p.poolIndex != null);
    for (const p of match.bench?.[t] ?? []) delete p.captain;
    if (on.some((p) => p.captain) || !on.length) continue;
    const human = match.teams[t]?.name === me.name;
    const pick = human ? byLead(c, on.map((p) => p.poolIndex))[0] : [...on].sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0]?.poolIndex;
    for (const p of on) if (p.poolIndex === pick) p.captain = true;
  }
}
