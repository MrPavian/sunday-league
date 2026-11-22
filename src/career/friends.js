// Freundschaften und Grüppchen in der Kabine (Gameplay 2.0, Punkt 42). Kumpels spielen sich schon lieber an (sim/bonds.js) und
// stärken die Teamchemie (relations.js); hier kommt dazu:
//  - Grüppchen: drei oder mehr, die alle miteinander befreundet sind (Kumpel, Schulfreund, Schwager, Pate).
//  - Wer Freunde trennt, spürt es: Spielt einer, und sein Freund war da, saß aber 90 Minuten draußen, ist der Draußengebliebene
//    manchmal angefressen; wird ein Grüppchen auseinandergerissen, sinkt die Stimmung ein wenig. Vorher zeigt die Aufstellung,
//    wen sie trennt (ui/clubhouse/team.js).
// Spielwerte, keine Quelle; eigener Zufall je Spieltag (der Spielablauf bleibt gleich).
import { createRng } from '../core/rng.js';
import { tr } from '../core/i18n.js';
import { adjustMood } from './events.js';
import { humanClub } from './career.js';
import { relationOf, shortName } from './relations.js';

// sulk – so oft ist der draußen gebliebene Freund danach angefressen (eine Woche); split – Stimmung je auseinandergerissenem
// Grüppchen; cliqueMin – ab so vielen gilt es als Grüppchen.
const hashSeed = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x5bd1e995);

export const FRIENDS = { on: true, sulk: 0.2, split: -0.015, cliqueMin: 3 };
const CLOSE = new Set(['kumpel', 'schulfreunde', 'schwager', 'pate']);
export const isClose = (c, a, b) => CLOSE.has(relationOf(c, a, b));

// Grüppchen im Kader: größte Gruppen, in denen jeder mit jedem eng ist (gierig, je Spieler höchstens eins).
export function cliques(c, squad = humanClub(c).squad) {
  const used = new Set();
  const out = [];
  const list = [...squad].sort((a, b) => a - b);
  for (const a of list) {
    if (used.has(a)) continue;
    let group = [a];
    for (const b of list) if (b !== a && !used.has(b) && group.every((g) => isClose(c, g, b))) group.push(b);
    if (group.length >= FRIENDS.cliqueMin) {
      group = group.sort((x, y) => x - y);
      for (const g of group) used.add(g);
      out.push(group);
    }
  }
  return out;
}

// Wen trennt diese Auswahl? playing – wer spielt (Aufstellung bzw. wer Spielzeit hatte), avail – wer da war.
// Liefert { pairs: [{ in, out }], split: [Grüppchen, die teils spielen, teils draußen sind] }.
export function separations(c, playing, avail) {
  const inSet = new Set(playing);
  const outs = avail.filter((idx) => !inSet.has(idx));
  const pairs = [];
  for (const o of outs) {
    const mate = playing.find((i) => isClose(c, i, o));
    if (mate != null) pairs.push({ in: mate, out: o });
  }
  const split = cliques(c).filter((g) => g.some((i) => inSet.has(i)) && g.some((i) => outs.includes(i)));
  return { pairs, split };
}

// Nach dem eigenen Spiel (career.js recordResult): Folgen fürs Trennen. Liefert Sätze für die Chronik/Folgen.
export function afterMatchFriends(c, prepared) {
  if (!FRIENDS.on) return [];
  const m = prepared.match;
  const me = humanClub(c);
  const team = m.teams.findIndex((t) => t.name === me.name);
  if (team < 0) return [];
  const all = [...m.players, ...(m.bench?.flat() ?? []), ...(m.sentOff ?? [])].filter((p) => p.team === team && p.poolIndex != null);
  const played = [...new Set(all.filter((p) => (m.stats.players[p.id]?.seconds ?? 0) > 0).map((p) => p.poolIndex))];
  const avail = me.squad.filter((idx) => c.week?.availability?.[idx] === 'yes' && !(c.players[idx]?.injuryWeeks > 0));
  const { pairs, split } = separations(c, played, avail);
  const rng = createRng(hashSeed(c.seed, c.season, c.round ?? 0, 4242));
  const notes = [];
  const sulked = new Set();
  for (const { in: a, out: b } of pairs) {
    const rec = c.players[b];
    if (!rec || sulked.has(b) || !rng.chance(FRIENDS.sulk)) continue;
    sulked.add(b);
    rec.grumpy = Math.max(rec.grumpy ?? 0, 1);
    notes.push(tr(`${shortName(c, b)} ist angefressen: Sein Kumpel ${shortName(c, a)} durfte spielen, er saß draußen.`, `${shortName(c, b)} is sulking: his mate ${shortName(c, a)} got to play, he sat it out.`));
  }
  for (const g of split) {
    adjustMood(c, FRIENDS.split);
    notes.push(tr(`Das Grüppchen um ${g.map((i) => shortName(c, i)).join(', ')} wurde getrennt – in der Kabine ist es ruhiger als sonst.`, `The clique of ${g.map((i) => shortName(c, i)).join(', ')} was split up – the dressing room is quieter than usual.`));
  }
  if (notes.length) (c.pendingNews ??= []).push(...notes);
  return notes;
}
