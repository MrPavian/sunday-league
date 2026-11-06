// Hintergrundspiele im Web Worker (bgsim.js): Der Kern des Workers (Kopie des Spielstands vorbereiten und rechnen, danach der
// Reihe nach eintragen) ergibt Byte für Byte denselben Spielstand wie der bisherige Weg (nacheinander auf dem Haupt-Thread).
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, humanClub, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { plainMatch, simFixtures } from '../src/career/bgsim.js';

const others = (c) => currentFixtures(c).filter((f) => f.home !== humanClub(c).id && f.away !== humanClub(c).id);

describe('Hintergrundspiele parallel', () => {
  it('gleicher Spielstand wie nacheinander, über zwei Spieltage', () => {
    const a = createCareer({ seed: 23 });
    const b = createCareer({ seed: 23 });
    for (let r = 0; r < 2; r++) {
      for (const c of [a, b]) {
        const me = humanClub(c).id;
        for (const f of currentFixtures(c)) if (f.home === me || f.away === me) f.result = { home: 1, away: 1 };
      }
      for (const f of others(a)) {
        const p = prepareMatch(a, f, { duration: 60 });
        simulateSync(p);
        recordResult(a, f, p);
      }
      const all = currentFixtures(b);
      const list = others(b);
      const plains = simFixtures(structuredClone(b), list.map((f) => all.indexOf(f)), { duration: 60 }).map((m) => structuredClone(m));
      list.forEach((f, k) => {
        const p = prepareMatch(b, f, { duration: 60 });
        p.match = plains[k];
        recordResult(b, f, p);
      });
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      finishRound(a);
      finishRound(b);
    }
  });
  it('fertige Spiele lassen sich übergeben (keine Funktionen mehr)', () => {
    const c = createCareer({ seed: 4 });
    const p = prepareMatch(c, others(c)[0], { duration: 30 });
    simulateSync(p);
    expect(() => structuredClone(plainMatch(p.match))).not.toThrow();
  });
});
