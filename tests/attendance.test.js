// Zuschauer und Tribünen (src/career/attendance.js): Buchführung über die Heimspiele – Schnitt, Rekord, ausverkauft, draußen
// geblieben, entgangener Eintritt, Hinweis auf den nächsten Tribünenausbau, Saisonarchiv.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, humanFixture, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { gateStats, nextStand, recordGate } from '../src/career/attendance.js';
import { capacity, CAPACITY_BASE } from '../src/career/facilities.js';
import { entryFee } from '../src/career/finances.js';

describe('Zuschauer und Tribünen', () => {
  it('Schnitt, Rekord und Auslastung; ausverkauft mit Hinweis auf den nächsten Ausbau', () => {
    const c = createCareer({ seed: 41 });
    expect(capacity(c)).toBe(CAPACITY_BASE);
    recordGate(c, 100, 100, 'A');
    recordGate(c, 300, CAPACITY_BASE, 'B');
    const s = gateStats(c);
    expect(s.games).toBe(2);
    expect(s.avg).toBe(Math.round((100 + CAPACITY_BASE) / 2));
    expect(s.record).toMatchObject({ n: CAPACITY_BASE, opp: 'B' });
    expect(s.soldOut).toBe(1);
    expect(s.turnedAway).toBe(300 - CAPACITY_BASE);
    expect(s.lostEntry).toBe(0); // Freizeitliga: kein Eintritt
    expect(nextStand(c).id).toBe('stehstufen');
    expect(c.pendingNews.some((n) => n.includes('Ausverkauft') && n.includes('Stehstufen'))).toBe(true);
  });

  it('ab Bezirksliga zählt der entgangene Eintritt; das Stadion wird erst ab Landesliga vorgeschlagen', () => {
    const c = createCareer({ seed: 42 });
    c.level = 5;
    c.facilities = { built: { stehstufen: true, tribuene: true, sitzplaetze: true, tribdach: true } };
    expect(nextStand(c)).toBeNull();
    recordGate(c, 1100, 1000);
    expect(gateStats(c).lostEntry).toBe(Math.round(100 * entryFee(5)));
    c.level = 6;
    expect(nextStand(c).id).toBe('stadion');
  });

  it('neue Saison: die alte wandert ins Archiv', () => {
    const c = createCareer({ seed: 43 });
    recordGate(c, 50, 50);
    recordGate(c, 70, 70);
    c.season++;
    recordGate(c, 30, 30);
    const s = gateStats(c);
    expect(s.games).toBe(1);
    expect(s.seasons.at(-1)).toMatchObject({ games: 2, avg: 60, max: 70 });
    expect(s.record.n).toBe(70);
  });

  it('ein echtes Heimspiel wird mitgeschrieben', () => {
    const c = createCareer({ seed: 44 });
    let f = humanFixture(c);
    for (let r = 0; f.home !== humanClub(c).id && r < 5; r++) {
      c.round++;
      f = humanFixture(c);
    }
    expect(f.home).toBe(humanClub(c).id);
    const p = prepareMatch(c, f, { duration: 30 });
    simulateSync(p);
    recordResult(c, f, p);
    expect(gateStats(c).games).toBe(1);
    expect(gateStats(c).max).toBe(c.flags.fans.n);
  }, 60000);
});
