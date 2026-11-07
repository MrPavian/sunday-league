// Erfolge mit Augenzwinkern (ROADMAP 11.17 Punkt 12, Idee aus 8.4): kleine Meilensteine aus dem Spiel und der Karriere.
// Freigeschaltete Erfolge stehen in c.achievements ({ id: { season, year } }) und im Vereinsmuseum. Jeder neue kommt einmal
// ins Kreisblatt. Alle Schwellen sind Spielwerte. Kein Zufall: der Spielablauf und die Seeds bleiben unberührt.
import { tr } from '../core/i18n.js';
import { humanClub } from './career.js';
import { yearOf } from './sagas.js';

// kind: 'match' (nach einem eigenen Ligaspiel), 'season' (am Saisonende), 'career' (jede Woche geprüft)
export const ACHIEVEMENTS = [
  { id: 'ersterSieg', kind: 'match', name: () => tr('Der erste Dreier', 'First three points'), text: () => tr('Das erste Ligaspiel gewonnen.', 'Won your first league match.') },
  { id: 'zuNull', kind: 'match', name: () => tr('Die Null steht', 'Clean sheet'), text: () => tr('Ein Ligaspiel ohne Gegentor.', 'A league match without conceding.') },
  { id: 'dreierpack', kind: 'match', name: () => tr('Dreierpack', 'Hat-trick'), text: () => tr('Ein Spieler trifft dreimal in einem Spiel.', 'One player scores three in a match.') },
  { id: 'kantersieg', kind: 'match', name: () => tr('Kantersieg', 'Thrashing'), text: () => tr('Mit fünf Toren Unterschied gewonnen.', 'Won by five goals or more.') },
  { id: 'comeback', kind: 'match', name: () => tr('Totgesagte leben länger', 'Back from the dead'), text: () => tr('Nach zwei Toren Rückstand noch gewonnen.', 'Won after being two goals down.') },
  { id: 'keeperTor', kind: 'match', name: () => tr('Der Keeper trifft', 'Goalkeeper on the scoresheet'), text: () => tr('Der eigene Torwart schießt ein Tor.', 'Your own goalkeeper scores.') },
  { id: 'luftloch', kind: 'match', name: () => tr('Luftloch-König', 'King of air shots'), text: () => tr('Ein Spieler haut dreimal in einem Spiel am Ball vorbei.', 'One player misses the ball completely three times in a match.') },
  { id: 'asche', kind: 'match', name: () => tr('Asche im Knie ×3', 'Cinders in the knee ×3'), text: () => tr('Ein Spieler schürft sich auf Asche dreimal das Knie auf – und spielt weiter.', 'One player grazes his knee on cinders three times – and plays on.') },
  { id: 'auto', kind: 'match', name: () => tr('Ans Auto ×5', 'Off a car ×5'), text: () => tr('Fünfmal in einem Spiel ans Auto geschossen.', 'Hit a parked car five times in one match.') },
  { id: 'eigentor', kind: 'match', name: () => tr('Ins eigene Netz', 'Into our own net'), text: () => tr('Das erste Eigentor. Passiert den Besten.', 'The first own goal. Happens to the best.') },
  { id: 'dusche', kind: 'match', name: () => tr('Ab unter die Dusche', 'Early bath'), text: () => tr('Die erste Rote Karte für einen eigenen Spieler.', 'The first red card for one of your players.') },
  { id: 'meister', kind: 'season', name: () => tr('Meister!', 'Champions!'), text: () => tr('Eine Liga als Erster abgeschlossen.', 'Finished top of a league.') },
  { id: 'aufstieg', kind: 'season', name: () => tr('Aufstieg', 'Promotion'), text: () => tr('Eine Liga höher gestiegen.', 'Moved up a division.') },
  { id: 'ungeschlagen', kind: 'season', name: () => tr('Ungeschlagen', 'Invincibles'), text: () => tr('Eine ganze Ligasaison ohne Niederlage.', 'A whole league season without defeat.') },
  { id: 'laterne', kind: 'season', name: () => tr('Rote Laterne', 'Wooden spoon'), text: () => tr('Als Letzter ins Ziel. Die Stimmung stimmt trotzdem.', 'Finished bottom. The spirit is still right.') },
  { id: 'pokal', kind: 'career', name: () => tr('Pokalsieger', 'Cup winners'), text: () => tr('Einen Pokal gewonnen.', 'Won a cup.') },
  { id: 'profiluft', kind: 'career', name: () => tr('Profiluft', 'A taste of the pros'), text: () => tr('In der Regionalliga angekommen.', 'Reached the Regionalliga.') },
  { id: 'ganzOben', kind: 'career', name: () => tr('Ganz oben', 'The very top'), text: () => tr('In der 1. Liga angekommen.', 'Reached the 1. Liga.') },
  { id: 'treue', kind: 'career', name: () => tr('Zehn Jahre Treue', 'Ten years of loyalty'), text: () => tr('Zehn Spielzeiten an der Seitenlinie.', 'Ten seasons on the touchline.') },
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const PRO_LEVEL = 9; // Regionalliga (clubs.js LEAGUES)
const TOP_LEVEL = 12; // 1. Liga

// Freischalten; gibt true zurück, wenn der Erfolg neu ist. silent: ohne Meldung (alte Spielstände nachtragen).
function unlock(c, id, { silent = false } = {}) {
  const got = (c.achievements ??= {});
  if (got[id] || !BY_ID[id]) return false;
  got[id] = { season: c.season, year: yearOf(c) };
  if (!silent) {
    const a = BY_ID[id];
    (c.pendingNews ??= []).push(tr(`Erfolg freigeschaltet: ${a.name()} – ${a.text()}`, `Achievement unlocked: ${a.name()} – ${a.text()}`));
  }
  return true;
}

// Nach einem eigenen Ligaspiel (career.js recordResult). Die eigene Mannschaft ist im Spiel immer Team 0.
export function matchAchievements(c, m, players = m.players) {
  const [us, them] = m.score;
  const ours = players.filter((p) => p.team === 0); // inklusive Ausgewechselter
  const st = (p) => m.stats.players[p.id] ?? {};
  const out = [];
  const hit = (id) => unlock(c, id) && out.push(id);
  if (us > them) hit('ersterSieg');
  if (them === 0) hit('zuNull');
  if (us - them >= 5) hit('kantersieg');
  if (ours.some((p) => (st(p).goals ?? 0) >= 3)) hit('dreierpack');
  if (ours.some((p) => p.position === 'gk' && (st(p).goals ?? 0) > 0)) hit('keeperTor');
  if (ours.some((p) => (st(p).whiffs ?? 0) >= 3)) hit('luftloch');
  if (ours.some((p) => (st(p).ownGoals ?? 0) > 0)) hit('eigentor');
  if (ours.some((p) => (st(p).red ?? 0) > 0) || (m.stats.teams[0].red ?? 0) > 0) hit('dusche');
  if ((m.stats.teams[0].cars ?? 0) >= 5) hit('auto');
  if (m.pitch?.surface?.id === 'ash' && ours.some((p) => p.injury?.type === 'scrape' && p.injury.severity >= 3)) hit('asche');
  if (us > them) {
    let diff = 0;
    let low = 0;
    for (const g of m.stats.goals ?? []) {
      diff += g.team === 0 ? 1 : -1;
      low = Math.min(low, diff);
    }
    if (low <= -2) hit('comeback');
  }
  return out;
}

// Am Saisonende (career.js nextSeason), solange Tabelle und Aufstieg feststehen.
export function seasonAchievements(c, { pos, size, own, promoted }) {
  const out = [];
  const hit = (id) => unlock(c, id) && out.push(id);
  if (pos === 1) hit('meister');
  if (promoted) hit('aufstieg');
  if (own && own.l === 0 && own.w + own.d >= 5) hit('ungeschlagen');
  if (pos === size && size > 1) hit('laterne');
  return out;
}

// Jede Woche (finishRound) und beim Laden: Karriere-Erfolge. Alte Spielstände bekommen beim ersten Mal still nach, was
// sich aus Chronik und Liga ablesen lässt.
export function careerAchievements(c) {
  const silent = !c.achievementsSeeded; // neue Karrieren: nichts nachzutragen, alte: still aus der Chronik
  c.achievementsSeeded = true;
  c.achievements ??= {};
  const out = [];
  const hit = (id) => unlock(c, id, { silent }) && out.push(id);
  const me = humanClub(c).id;
  if (Object.values(c.pokale ?? {}).some((cup) => cup?.done && cup.winner === me)) hit('pokal');
  if ((c.level ?? 1) >= PRO_LEVEL) hit('profiluft');
  if ((c.level ?? 1) >= TOP_LEVEL) hit('ganzOben');
  if ((c.history ?? []).length >= 10) hit('treue');
  if (silent) {
    for (const h of c.history ?? []) {
      if (h.pos === 1) unlock(c, 'meister', { silent });
      if (h.promoted) unlock(c, 'aufstieg', { silent });
    }
  }
  return out;
}

// Für das Vereinsmuseum: alle Erfolge, freigeschaltete zuerst.
export function achievementList(c) {
  const got = c.achievements ?? {};
  const list = ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name(), text: a.text(), got: got[a.id] ?? null }));
  return { list: [...list.filter((a) => a.got), ...list.filter((a) => !a.got)], count: list.filter((a) => a.got).length, total: list.length };
}
