// Automatische Sicherung der Spielstände (career.js saveCareer/restoreBackup, ROADMAP 11.18 Punkt 4).
import { describe, expect, it } from 'vitest';
import { createCareer, deleteCareer, finishRound, loadCareer, nextSeason, restoreBackup, saveCareer, seasonOver, slotSummaries } from '../src/career/career.js';

function storageOf(limit = Infinity) {
  const m = new Map();
  const size = () => [...m.values()].reduce((s, v) => s + v.length, 0);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      const old = m.get(k)?.length ?? 0;
      if (size() - old + v.length > limit) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    keys: () => [...m.keys()],
    size,
  };
}
const playSeason = (c) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
    finishRound(c);
  }
};

describe('Sicherung je Speicherplatz', () => {
  it('innerhalb einer Saison gibt es keine Sicherung; mit der neuen Saison wandert der alte Stand hinein', () => {
    const s = storageOf();
    const c = createCareer({ seed: 5 });
    saveCareer(c, s, 1);
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
    finishRound(c);
    saveCareer(c, s, 1);
    expect(slotSummaries(s)[0].backup).toBe(null);
    playSeason(c);
    saveCareer(c, s, 1);
    const endRound = c.round;
    nextSeason(c);
    saveCareer(c, s, 1);
    const sum = slotSummaries(s)[0];
    expect(sum.season).toBe(2);
    expect(sum.backup).toMatchObject({ season: 1 });
    // zurück zur Sicherung: Ende der ersten Saison
    expect(restoreBackup(s, 1)).toBe(true);
    const back = loadCareer(s, 1);
    expect(back.season).toBe(1);
    expect(back.round).toBe(endRound);
    expect(seasonOver(back)).toBe(true);
    // danach weiterspielen: die Sicherung bleibt die vom Saisonende, kein Doppel
    nextSeason(back);
    saveCareer(back, s, 1);
    expect(slotSummaries(s)[0].backup).toMatchObject({ season: 1 });
  });

  it('ein anderer Spielstand im selben Platz wirft die fremde Sicherung weg; Löschen räumt alles ab', () => {
    const s = storageOf();
    const c = createCareer({ seed: 5 });
    saveCareer(c, s, 2);
    playSeason(c);
    nextSeason(c);
    saveCareer(c, s, 2);
    expect(slotSummaries(s)[1].backup).not.toBe(null);
    saveCareer(createCareer({ seed: 9 }), s, 2);
    expect(slotSummaries(s)[1].backup).toBe(null);
    expect(restoreBackup(s, 2)).toBe(false);
    deleteCareer(s, 2);
    expect(s.keys().filter((k) => k.includes('career:2'))).toEqual([]);
    expect(slotSummaries(s)[0].empty).toBe(true); // Platz 1 unberührt und leer
  });

  it('voller Speicher: der Spielstand geht vor, die Sicherung fällt weg', () => {
    const c = createCareer({ seed: 5 });
    const one = JSON.stringify(c).length;
    const s = storageOf(Math.round(one * 1.6)); // Platz für einen Stand, nicht für zwei
    expect(saveCareer(c, s, 1)).toBe(true);
    playSeason(c);
    expect(saveCareer(c, s, 1)).toBe(true);
    nextSeason(c);
    expect(saveCareer(c, s, 1)).toBe(true);
    expect(loadCareer(s, 1).season).toBe(2);
    expect(slotSummaries(s)[0].backup).toBe(null);
  });

  it('alte Spielstände ohne Merkzettel laden wie bisher und bekommen ab dem nächsten Saisonwechsel eine Sicherung', () => {
    const s = storageOf();
    const c = createCareer({ seed: 7 });
    s.setItem('sunday-league:career', JSON.stringify(c)); // so lag ein Stand vor dieser Version im Speicher
    const old = loadCareer(s, 1);
    expect(old.season).toBe(1);
    playSeason(old);
    saveCareer(old, s, 1);
    nextSeason(old);
    saveCareer(old, s, 1);
    expect(slotSummaries(s)[0].backup).toMatchObject({ season: 1 });
  });
});
