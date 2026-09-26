// Vereinsgedächtnis: Wer ist im Streit gegangen, wo spielt er jetzt, wer hat uns
// schon wie oft eingeschenkt? Daraus werden Vorberichte im Chat, Rückblenden im
// Ticker und Einträge in die Chronik – „ausgerechnet der".
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub, playerOf } from './career.js';
import { chronicle } from './sagas.js';

const surname = (c, idx) => playerOf(c, idx)?.name.split(' ').slice(-1)[0] ?? '?';
const firstName = (c, idx) => playerOf(c, idx)?.name.split(' ')[0] ?? '?';

// Abgang merken (vor dem Löschen des Datensatzes aufrufen).
export function rememberDeparture(c, idx) {
  c.formers ??= {};
  const rec = c.players[idx] ?? {};
  c.formers[idx] = { season: c.season, round: c.round, apps: (rec.total?.apps ?? 0) + (rec.apps ?? 0), goals: (rec.total?.goals ?? 0) + (rec.goals ?? 0), club: null, grumpy: (rec.grumpy ?? 0) > 0, name: playerOf(c, idx)?.name };
}

export function rememberNewClub(c, idx, clubId) {
  if (c.formers?.[idx]) c.formers[idx].club = clubId;
}

// Zugang von einem Gegner (etwa nach der Grilleinladung).
export function rememberArrival(c, idx) {
  const from = c.clubs.find((cl) => !cl.human && cl.squad.includes(idx));
  if (!from) return;
  c.joinedFrom ??= {};
  c.joinedFrom[idx] = { club: from.id, season: c.season };
}

// Saisonstart: Ehemalige ohne Verein kommen bei der Konkurrenz unter.
export function placeFormers(c) {
  const rng = createRng((c.seed * 131 + c.season * 17 + 3) >>> 0);
  const others = c.clubs.filter((cl) => !cl.human);
  for (const [k, f] of Object.entries(c.formers ?? {})) {
    const idx = Number(k);
    if (f.club && others.some((cl) => cl.id === f.club && cl.squad.includes(idx))) continue;
    if (c.clubs.some((cl) => cl.squad.includes(idx))) continue;
    if (!others.length || !rng.chance(0.45)) continue;
    const club = rng.pick(others);
    club.squad.push(idx);
    c.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    f.club = club.id;
  }
}

// Vor dem Anpfiff: Ehemalige, Angstgegner und eigene Ex-Gegner markieren.
export function tagStories(c, club, players) {
  const human = club.human;
  for (const p of players) {
    const idx = p.poolIndex;
    if (idx == null) continue;
    const story = {};
    if (!human && c.formers?.[idx]) story.former = true;
    if (!human && (c.nemesis?.[idx] ?? 0) >= 2) story.nemesis = c.nemesis[idx];
    if (human && c.joinedFrom?.[idx]) story.exClub = c.joinedFrom[idx].club;
    if (Object.keys(story).length) p.story = story;
  }
  return players;
}

// Nach dem Spiel: Tore gegen uns zählen, „ausgerechnet"-Momente in die Chronik.
export function memoryAfterMatch(c, prepared) {
  const m = prepared.match;
  const me = humanClub(c);
  const meTeam = m.teams.findIndex((t) => t.name === me.name);
  if (meTeam < 0) return [];
  const oppName = m.teams[1 - meTeam].name;
  const notes = [];
  c.nemesis ??= {};
  for (const g of m.stats.goals) {
    if (g.ownGoal) continue;
    const scorer = [...m.players, ...m.bench.flat(), ...(m.sentOff ?? [])].find((p) => p.id === g.scorerId);
    if (!scorer || scorer.poolIndex == null) continue;
    if (g.team !== meTeam) {
      c.nemesis[scorer.poolIndex] = (c.nemesis[scorer.poolIndex] ?? 0) + 1;
      if (scorer.story?.former) notes.push(tr(`Ausgerechnet ${scorer.name}: Der Ex trifft gegen seinen alten Verein.`, `Of all people, ${scorer.name}: the old boy scores against his former club.`));
      else if (c.nemesis[scorer.poolIndex] === 3) notes.push(tr(`${scorer.name} (${oppName}) hat uns jetzt drei Tore eingeschenkt. Ein echter Angstgegner.`, `${scorer.name} (${oppName}) has now put three past us. A proper bogeyman.`));
    } else if (scorer.story?.exClub) {
      notes.push(tr(`${scorer.name} trifft gegen seinen Ex-Verein. Die Grillwurst hat sich gelohnt.`, `${scorer.name} scores against his old club. That barbecue invite paid off.`));
    }
  }
  const unique = [...new Set(notes)];
  for (const n of unique) chronicle(c, n);
  return unique;
}

// Wochenbeginn: Vorbericht im Chat, wenn Geschichte im Spiel ist.
export function preMatchMemories(c, opponent, chat) {
  if (!opponent) return;
  const formers = opponent.squad.filter((idx) => c.formers?.[idx]);
  const nemesis = opponent.squad.filter((idx) => (c.nemesis?.[idx] ?? 0) >= 2).sort((a, b) => c.nemesis[b] - c.nemesis[a]);
  const ours = humanClub(c).squad.filter((idx) => c.joinedFrom?.[idx]?.club === opponent.id);
  const talker = humanClub(c).squad.find((idx) => c.week?.availability[idx] === 'yes' && c.coach?.idx !== idx);
  if (talker == null) return;
  if (formers.length) {
    const idx = formers[0];
    const f = c.formers[idx];
    chat.push({ from: talker, text: f.grumpy ? tr(`Wisst ihr, wer bei ${opponent.short} spielt? ${firstName(c, idx)}. Der ist damals im Streit gegangen. Dem zeigen wir's.`, `Guess who plays for ${opponent.short}? ${firstName(c, idx)}. Left us after a row. Let's show him.`) : tr(`Sonntag gibt's ein Wiedersehen: ${firstName(c, idx)} spielt jetzt bei ${opponent.short}. ${f.goals ? `${f.goals} Tore hat er für uns gemacht.` : 'Getroffen hat er bei uns nie.'}`, `A reunion on Sunday: ${firstName(c, idx)} plays for ${opponent.short} now. ${f.goals ? `He scored ${f.goals} for us.` : 'Never scored for us.'}`), time: 'Mi 19:12', memory: true });
  } else if (nemesis.length) {
    const idx = nemesis[0];
    chat.push({ from: talker, text: tr(`Achtung: ${surname(c, idx)} von ${opponent.short} hat uns schon ${c.nemesis[idx]} Dinger eingeschenkt. Einer klebt Sonntag an ihm.`, `Heads up: ${surname(c, idx)} from ${opponent.short} has put ${c.nemesis[idx]} past us. Someone stays glued to him on Sunday.`), time: 'Mi 19:12', memory: true });
  }
  if (ours.length) chat.push({ from: ours[0], text: tr(`Gegen meinen Ex-Verein. Ich bin heiß.`, `Against my old club. I'm fired up.`), time: 'Do 07:40', memory: true });
}
