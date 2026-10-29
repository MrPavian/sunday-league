// Trainer des Monats / der Saison im Kreisblatt (coachawards.js).
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver } from '../src/career/career.js';

const play = (c, score) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= score(f);
    finishRound(c);
  }
};

describe('Trainer des Monats', () => {
  it('alle vier Spieltage; wer alles gewinnt, ist Trainer des Monats, Name bleibt fest', () => {
    const c = createCareer({ seed: 61 });
    const me = humanClub(c).id;
    play(c, (f) => (f.home === me ? { home: 3, away: 0 } : f.away === me ? { home: 0, away: 3 } : { home: 1, away: 1 }));
    const months = (c.coachAwards ?? []).filter((a) => a.kind === 'month');
    expect(months.length).toBe(Math.floor(c.fixtures.length / 4));
    expect(months.every((a) => a.human)).toBe(true);
    expect(c.saga.chronicle.some((e) => /Trainer des Monats|Manager of the Month/.test(e.text))).toBe(true);
  });
  it('Trainer der Saison: wer mit dem schwächsten Kader vorn landet; CPU-Trainer haben feste Namen', () => {
    const c = createCareer({ seed: 62 });
    const me = humanClub(c).id;
    play(c, (f) => (f.home === me ? { home: 0, away: 2 } : f.away === me ? { home: 2, away: 0 } : { home: 2, away: 1 }));
    const names = { ...c.cpuCoaches };
    nextSeason(c);
    const season = c.coachAwards.find((a) => a.kind === 'season');
    expect(season).toBeTruthy();
    expect(season.human).toBe(false);
    expect(season.squadRank).toBeGreaterThanOrEqual(season.pos);
    for (const [id, n] of Object.entries(names)) expect(c.cpuCoaches[id]).toBe(n);
  });
});
