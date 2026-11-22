// Kapitän mit Gewicht (Gameplay 2.0, Punkt 41).
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, humanClub, prepareMatch } from '../src/career/career.js';
import { afterMatchCaptain, CAPTAIN, captainOf, leadership, setCaptain } from '../src/career/captain.js';
import { createPlayerModel } from '../src/render/PlayerModel.js';

const look = { skin: 0xe0b090, hair: 0x3a2a1a, height: 1.02, belly: 0.3, bald: false, beard: true };
const kit = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b, pattern: 'uni' };

// Ein Spiel, in dem nur der Kapitän steht (gespielt oder nicht).
const fake = (c, idx, seconds) => ({
  match: { teams: [{ name: humanClub(c).name }, { name: 'Gegner' }], players: [{ id: 'k', team: 0, poolIndex: idx }], bench: [[], []], stats: { players: { k: { seconds } } } },
});

describe('Kapitän', () => {
  it('ohne Wahl: der mit der größten Führungsstärke; fest, bis der Trainer wechselt', () => {
    const c = createCareer({ seed: 41 });
    const sq = humanClub(c).squad;
    const cap = captainOf(c);
    for (const idx of sq) {
      expect(leadership(c, idx)).toBeGreaterThanOrEqual(0);
      expect(leadership(c, idx)).toBeLessThanOrEqual(1);
      expect(leadership(c, idx)).toBeLessThanOrEqual(leadership(c, cap));
    }
    expect(captainOf(c)).toBe(cap);
  });

  it('Binde abnehmen: neuer Kapitän, der alte ist angefressen, die Stimmung sinkt', () => {
    const c = createCareer({ seed: 42 });
    const old = captainOf(c);
    const neu = humanClub(c).squad.find((i) => i !== old);
    const mood = c.mood ?? 0;
    expect(setCaptain(c, neu)).toBe(true);
    expect(captainOf(c)).toBe(neu);
    expect(c.players[old].grumpy).toBeGreaterThan(0);
    expect(c.mood).toBeCloseTo(mood + CAPTAIN.swapMood, 6);
    expect(c.pendingNews.at(-1)).toMatch(/Kapitän|captain/);
    expect(setCaptain(c, neu)).toBe(false); // schon Kapitän
  });

  it('Krise: Ansprache hebt die Stimmung, höchstens alle paar Spieltage; Bank: Gerede beim zweiten Mal', () => {
    const c = createCareer({ seed: 43 });
    const cap = captainOf(c);
    c.week = { availability: { [cap]: 'yes' } };
    c.mood = -0.5;
    c.round = 5;
    const lines = afterMatchCaptain(c, fake(c, cap, 300));
    expect(lines.length).toBe(1);
    expect(c.mood).toBeGreaterThan(-0.5 + CAPTAIN.talkBase - 1e-9);
    c.round = 6;
    expect(afterMatchCaptain(c, fake(c, cap, 300))).toEqual([]); // zu früh für die nächste
    c.mood = 0.2;
    expect(afterMatchCaptain(c, fake(c, cap, 0))).toEqual([]); // einmal draußen: noch nichts
    const bench = afterMatchCaptain(c, fake(c, cap, 0));
    expect(bench.length).toBe(1);
    expect(bench[0]).toMatch(/Bank|bench/);
    expect(c.players[cap].grumpy).toBeGreaterThan(0);
  });

  it('im Spiel: vor dem Anpfiff trägt je Mannschaft genau einer auf dem Platz die Binde – und man sieht sie', () => {
    const c = createCareer({ seed: 44 });
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    const m = prepareMatch(c, f, { duration: 240 }).match;
    for (const t of [0, 1]) expect(m.players.filter((p) => p.team === t && p.captain).length).toBe(1);
    expect(m.bench.flat().some((p) => p.captain)).toBe(false);
    const count = (o) => createPlayerModel(look, kit, o).mesh.geometry.attributes.position.count;
    expect(count({ captain: true })).toBeGreaterThan(count({}));
  });
});
