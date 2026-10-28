// Englische Woche (vom Nutzer gewünscht, 2026-10-28): Pokal unter der Woche, danach ein eigener Schritt „Weiter zum …“,
// höchstens ein Pokalspiel je Woche, soweit der Kalender Platz hat.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, humanFixture, seasonOver, simulateSync } from '../src/career/career.js';
import { fitnessOf, MATCH_COST } from '../src/career/fitness.js';
import { finishFirstLeg, prepareRelegationMatch, recordRelegationLeg, startRelegation } from '../src/career/relegation.js';
import { finishMidweek, humanTie, midweekGap, POKAL_KINDS, pokalDue, pokalEligible, pokalRounds, preparePokalMatch, recordPokalResult } from '../src/career/pokal.js';

describe('Englische Woche', () => {
  it('der überregionale Pokal meidet die Wochen der anderen Pokale – doppelt nur, wenn der Kalender voll ist', () => {
    for (const size of [6, 8]) {
      for (const [level, land, bund] of [[4, 0, 1], [5, 0, 1], [5, 1, 1]]) {
        const c = createCareer({ seed: 3, leagueSize: size });
        c.level = level;
        if (land) c.landQual = c.season;
        if (bund) c.bundQual = c.season;
        const n = c.fixtures.length;
        const mine = POKAL_KINDS.filter((k) => pokalEligible(c, k)).map((k) => pokalRounds(c, k));
        const all = mine.flat();
        const free = n - 2; // ohne erste Woche und Winterpause
        expect(all.length - new Set(all).size).toBe(Math.max(0, all.length - free));
        for (const r of all) expect(r).not.toBe(Math.floor(n / 2));
      }
    }
  });

  it('nach dem Pokalspiel: erst „Weiter“, dann das Ligaspiel; ein Teil der Fitness kommt bis Sonntag zurück', () => {
    const c = createCareer({ seed: 3 });
    c.level = 2;
    finishRound(c); // Saisonstart: Anmeldung zum Kreispokal
    let checked = false;
    while (!seasonOver(c) && !checked) {
      const k = pokalDue(c);
      if (!k) {
        finishRound(c);
        continue;
      }
      const p = preparePokalMatch(c, k, humanTie(c, k));
      simulateSync(p);
      const before = Object.fromEntries(humanClub(c).squad.map((i) => [i, fitnessOf(c, i)]));
      recordPokalResult(c, p);
      const mw = c.week.midweek;
      expect(mw).toBeTruthy();
      expect(mw.kind).toBe(k);
      expect(Object.keys(mw.cost).length).toBeGreaterThan(0);
      const tired = Object.entries(mw.cost).map(([i, d]) => [Number(i), d]).filter(([i]) => i in before); // eigener Kader (der Gegner erholt sich genauso)
      expect(tired.length).toBeGreaterThan(5);
      for (const [i, d] of tired) expect(before[i] - fitnessOf(c, i)).toBeCloseTo(d, 9);
      const after = Object.fromEntries(tired.map(([i]) => [i, fitnessOf(c, i)]));
      const chat = c.week.chat.length;
      finishMidweek(c);
      expect(c.week.midweek).toBeUndefined();
      expect(c.week.chat.length).toBe(chat + 1);
      // Mittwochabend bis Sonntagvormittag: mehr als 72 Stunden – ein normales Spiel ist bis dahin verdaut.
      expect(midweekGap(k, null)).toBeGreaterThan(72);
      for (const [i, d] of tired) expect(fitnessOf(c, i)).toBeCloseTo(Math.min(1, after[i] + Math.min(d, MATCH_COST)), 9);
      expect(humanFixture(c)).toBeTruthy(); // das Ligaspiel der Woche steht noch an
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it('Samstag auf Sonntag: nur ein Viertel der Erholung', () => {
    expect(midweekGap('bund', null)).toBeCloseTo(17, 6);
    expect(midweekGap('kreis', 'bund')).toBeCloseTo(66, 6);
  });

  it('Relegation: nach dem Hinspiel erst „Weiter zum Rückspiel“, dann das Rückspiel', () => {
    const c = createCareer({ seed: 5 });
    const me = humanClub(c).id;
    const top = c.clubs.find((x) => !x.human).id;
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) {
        const s = (id) => (id === top ? 5 : id === me ? 3 : 0);
        f.result = { home: s(f.home), away: s(f.away) };
      }
      finishRound(c);
    }
    startRelegation(c);
    const first = prepareRelegationMatch(c, { duration: 10 });
    simulateSync(first);
    recordRelegationLeg(c, first);
    expect(c.relegation.leg).toBe(1);
    expect(c.week.legDone).toBe(true);
    finishFirstLeg(c);
    expect(c.week.legDone).toBeUndefined();
    expect(c.week.relegation).toBe(true); // die Woche fürs Rückspiel bleibt
  });
});
