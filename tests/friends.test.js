// Freundschaften und Grüppchen in der Kabine (Gameplay 2.0, Punkt 42).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { cliques, FRIENDS, separations } from '../src/career/friends.js';
import { setRelation } from '../src/career/relations.js';
import { FRIEND_HUG, mateCelebration } from '../src/render/reactions.js';

// Kader ohne Beziehungen, dann gezielt ein Grüppchen aus drei und ein Paar setzen.
function career() {
  const c = createCareer({ seed: 777 });
  const sq = humanClub(c).squad;
  for (let i = 0; i < sq.length; i++) for (let j = i + 1; j < sq.length; j++) setRelation(c, sq[i], sq[j], null);
  const [a, b, d, e, f] = sq;
  setRelation(c, a, b, 'kumpel');
  setRelation(c, a, d, 'schulfreunde');
  setRelation(c, b, d, 'schwager');
  setRelation(c, e, f, 'kumpel');
  return { c, sq, a, b, d, e, f };
}

describe('Freunde und Grüppchen', () => {
  it('Grüppchen: drei, die alle miteinander eng sind; ein Paar allein ist keins', () => {
    const { c, a, b, d } = career();
    expect(cliques(c)).toEqual([[a, b, d].sort((x, y) => x - y)]);
  });

  it('Trennen: Freund draußen, Kumpel spielt – und ein halbes Grüppchen auf dem Platz', () => {
    const { c, sq, a, b, d, e, f } = career();
    const rest = sq.slice(5);
    const avail = [a, b, d, e, f, ...rest];
    const together = separations(c, [a, b, d, e, f, ...rest.slice(0, 2)], avail);
    expect(together.split).toEqual([]);
    expect(together.pairs.some((p) => [a, b, d, e, f].includes(p.out))).toBe(false);
    const apart = separations(c, [a, e, ...rest.slice(0, 5)], avail);
    expect(apart.split.length).toBe(1);
    expect(apart.pairs).toContainEqual({ in: a, out: b });
    expect(apart.pairs).toContainEqual({ in: e, out: f });
  });

  it('Torjubel: Kumpel umarmt schon von weiter weg, Rivale jubelt nicht mit', () => {
    const rels = { '1-2': 'kumpel', '1-3': 'rivalen' };
    const sc = { id: 'a', team: 0, poolIndex: 1, pos: { x: 0, z: 0 } };
    const mate = { id: 'b', team: 0, poolIndex: 2, mood: 'celebrate', role: 'mid', pos: { x: 2, z: 0 }, vel: { x: 0, z: 0 } };
    const rival = { id: 'c', team: 0, poolIndex: 3, mood: 'celebrate', role: 'mid', pos: { x: 1, z: 0 }, vel: { x: 0, z: 0 } };
    const other = { id: 'd', team: 0, poolIndex: 4, mood: 'celebrate', role: 'mid', pos: { x: 2, z: 0 }, vel: { x: 0, z: 0 } };
    const match = { players: [sc, mate, rival, other], lastGoal: { scorerId: 'a' }, teams: [{ rels }] };
    expect(2).toBeLessThan(FRIEND_HUG);
    expect(mateCelebration(match, mate, 'jubel')).toBe('umarmen');
    expect(mateCelebration(match, other, 'jubel')).toBe('jubel'); // 2 m: ohne Freundschaft noch keine Umarmung
    expect(mateCelebration(match, rival, 'jubel')).toBeNull();
  });

  it('Werte sind gemäßigt (gemessen: angefressen in etwa jedem vierten Spiel)', () => {
    expect(FRIENDS.sulk).toBeLessThanOrEqual(0.3);
    expect(FRIENDS.split).toBeGreaterThan(-0.05);
  });
});
