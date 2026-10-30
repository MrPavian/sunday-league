// Scouting (ROADMAP „Verein, Kader, Wirtschaft“: integriertes Scouting; Grundidee 3.1: „Scouting deckt Klasse und verborgene
// Eigenschaften erst nach und nach auf“). Wie gut man einen Spieler fremder Vereine kennt, in vier Stufen; der Transfermarkt zeigt
// die Stärke nur als Spanne und die Eigenschaften erst, wenn man ihn genauer gesehen hat.
//  - Stufe 1 bekommt man von selbst: Spieler der eigenen Liga (man spielt gegen sie), Gegner nach dem Spiel.
//  - „Spiel anschauen“ bei einem Verein (eine Aktion der Woche): alle seine Spieler eine Stufe weiter, die drei auffälligsten zwei.
//  - „Bolzplatz“ (eine Aktion): zwei Vereinslose für die Gerüchteküche, schon einmal gesehen.
// Hängt über hooks.js ein (finishRound); der Zustand liegt in c.scouting. Spannen und Stufen sind Spielwerte.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { addRumor, humanClub, playerOf } from './career.js';
import { coachAway } from './personal.js';

// ± Stärke je Stufe (Spielwert): unbekannt, gesehen, beobachtet (Eigenschaften sichtbar), gescoutet (genau).
export const SPREAD = [12, 7, 3, 0];
export const LEVEL_NAMES = () => [tr('unbekannt', 'unknown'), tr('gesehen', 'seen'), tr('beobachtet', 'watched'), tr('gescoutet', 'scouted')];
export const TRAITS_FROM = 2;
const STARS = 3; // beim Zuschauen fallen die besten drei besonders auf

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

export const sstate = (c) => (c.scouting ??= { known: {}, watched: {} });

// Kenntnis 0–3: eigener Kader genau, eigene Liga mindestens „gesehen“.
export function knowledge(c, idx) {
  if (humanClub(c).squad.includes(idx)) return 3;
  const k = c.scouting?.known?.[idx] ?? 0;
  const ownLeague = c.clubs.some((cl) => !cl.human && cl.squad.includes(idx));
  return Math.max(k, ownLeague ? 1 : 0);
}

// Geschätzte Stärke: Spanne um die echte Zahl, Lage fest je Spieler und Stufe (sonst verriete die Mitte die Zahl).
export function estimate(c, idx) {
  const p = playerOf(c, idx);
  const level = knowledge(c, idx);
  const s = SPREAD[level];
  if (!s) return { level, lo: p.rating, hi: p.rating, mid: p.rating, exact: true, traits: true };
  const u = 0.15 + ((hash(idx, level, c.seed ?? 0) % 1000) / 1000) * 0.7; // die echte Zahl liegt irgendwo im mittleren Teil
  const lo = Math.round(p.rating - u * 2 * s);
  return { level, lo, hi: lo + 2 * s, mid: lo + s, exact: false, traits: level >= TRAITS_FROM };
}
export const estimateText = (e) => (e.exact ? `${e.lo}` : `${e.lo}–${e.hi}`);

export function observe(c, idx, steps = 1, max = 3) {
  const s = sstate(c);
  const now = knowledge(c, idx);
  if (now >= max) return now;
  s.known[idx] = Math.min(max, now + steps);
  return s.known[idx];
}

// „Spiel anschauen“: einmal je Verein und Woche; kostet eine Aktion (wie das Beobachten auf der Gerüchteküche).
export const canWatch = (c, club) => !!c.week && c.week.actions > 0 && !coachAway(c) && sstate(c).watched[club.id] !== `${c.season}:${c.round}`;
export function watchClub(c, club) {
  if (!canWatch(c, club)) return null;
  c.week.actions--;
  sstate(c).watched[club.id] = `${c.season}:${c.round}`;
  const rng = createRng(hash(c.seed ?? 0, c.season, c.round, club.squad.length, 4401));
  // Wer auffällt: die Besten, mit etwas Zufall (ein schwacher Tag ist auch dabei).
  const ranked = [...club.squad].map((i) => ({ i, v: playerOf(c, i).rating + rng.range(-6, 6) })).sort((a, b) => b.v - a.v);
  for (const [n, { i }] of ranked.entries()) observe(c, i, n < STARS ? 2 : 1);
  const best = ranked[0] && playerOf(c, ranked[0].i);
  return tr(`Du schaust dir ${club.name} an.${best ? ` Am meisten fällt ${best.name} auf.` : ''}`, `You watch ${club.name}.${best ? ` ${best.name} stands out most.` : ''}`);
}

// „Bolzplatz“: zwei Vereinslose auf die Gerüchteküche (addRumor), einmal je Woche.
const SPOTS = () => tr(
  ['Auf dem Bolzplatz am Kanal kickt {first}, keiner kennt seinen Verein.', 'Am Schulhof spielt {first} mit den Jüngeren – und lässt alle stehen.', 'Im Park: {first}, Turnschuhe, Jeans, linker Fuß wie ein Uhrwerk.', 'Hinter der Turnhalle trifft {first} dreimal die Latte, mit Absicht.'],
  ['On the kickabout pitch by the canal, {first} is playing – nobody knows his club.', 'In the schoolyard {first} plays with the younger lads – and leaves them all standing.', 'In the park: {first}, trainers, jeans, a left foot like clockwork.', 'Behind the gym {first} hits the bar three times, on purpose.'],
);
export const canBolz = (c) => !!c.week && c.week.actions > 0 && !coachAway(c) && sstate(c).bolz !== `${c.season}:${c.round}`;
export function bolzplatz(c) {
  if (!canBolz(c)) return null;
  c.week.actions--;
  sstate(c).bolz = `${c.season}:${c.round}`;
  const rng = createRng(hash(c.seed ?? 0, c.season, c.round, 4402));
  const spots = SPOTS();
  const found = [];
  for (let k = 0; k < 2; k++) {
    const r = addRumor(c, rng, spots[(c.round + k) % spots.length]);
    if (r) {
      observe(c, r.idx, 1);
      found.push(playerOf(c, r.idx).name);
    }
  }
  return found.length ? tr(`Bolzplatz: ${found.join(' und ')} – beide stehen jetzt auf der Gerüchteküche.`, `Kickabout pitch: ${found.join(' and ')} – both are now on the rumour board.`) : tr('Auf dem Bolzplatz ist heute nichts los.', 'Nothing doing on the kickabout pitch today.');
}

// Nach dem Spieltag: Wer gegen uns gespielt hat, ist „gesehen“ (Stufe 1, mehr gibt es nur durch Zuschauen).
export function finishRound(c) {
  const done = c.fixtures?.[c.round - 1];
  const me = humanClub(c);
  const f = done?.find((x) => x.home === me.id || x.away === me.id);
  if (!f?.result) return;
  const opp = c.clubs.find((cl) => cl.id === (f.home === me.id ? f.away : f.home));
  for (const idx of opp?.squad ?? []) observe(c, idx, 1, 1);
}
