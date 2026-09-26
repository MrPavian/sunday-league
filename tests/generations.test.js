import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { fenceVoice, heirCandidates, heirIntake, heirMoments } from '../src/career/generations.js';

const always = { chance: () => true, pick: (l) => l[0], next: () => 0.1, int: (a) => a };

function withLegend(seed) {
  const c = createCareer({ seed });
  const idx = humanClub(c).squad.find((i) => i !== c.coach?.idx);
  const dad = playerOf(c, idx);
  humanClub(c).squad = humanClub(c).squad.filter((i) => i !== idx);
  c.alumni.push({ idx, name: dad.name, age: 36, apps: 80, goals: 25, season: 1, role: 'Platzwart' });
  c.season = 4;
  return { c, dad };
}

describe('generations', () => {
  it('a club legend sends his son to the U19s a few seasons later', () => {
    const { c, dad } = withLegend(7001);
    expect(heirCandidates(c)).toHaveLength(1);
    const note = heirIntake(c, always);
    expect(note).toContain(dad.name);
    const kid = c.heirs.kids[0];
    expect(c.youth.prospects).toContain(kid);
    const p = playerOf(c, kid);
    expect(p.name.split(' ').pop()).toBe(dad.name.split(' ').pop());
    expect(p.age).toBeGreaterThanOrEqual(16);
    expect(p.age).toBeLessThanOrEqual(17);
    expect(p.parentName).toBe(dad.name);
    // Jeder Vater nur einmal.
    expect(heirCandidates(c)).toHaveLength(0);
    expect(heirIntake(c, always)).toBeNull();
  });

  it('the junior’s first goal makes the Kreisblatt, once', () => {
    const { c } = withLegend(7002);
    heirIntake(c, always);
    const kid = c.heirs.kids[0];
    c.youth.prospects = c.youth.prospects.filter((x) => x !== kid);
    humanClub(c).squad.push(kid);
    expect(heirMoments(c)).toHaveLength(0);
    c.players[kid].goals = 1;
    expect(heirMoments(c)[0]).toContain('Wie der Vater');
    expect(heirMoments(c)).toHaveLength(0);
  });

  it('former players chip in from the fence', () => {
    const { c } = withLegend(7003);
    const chat = [];
    let msg = null;
    for (let r = 0; r < 20 && !msg; r++) {
      c.round = r;
      msg = fenceVoice(c, chat, [3, 0]);
    }
    expect(msg?.alum).toBe('Platzwart');
    expect(fenceVoice(c, [], null)).toBeNull();
  });
});
