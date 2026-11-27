// AFS Phase 8: Matchplan der CPU vor dem Spiel (src/intel/matchplan.js).
import { afterEach, describe, expect, it } from 'vitest';
import { clubById, createCareer, currentFixtures, humanClub, prepareMatch, recordResult, setClubPlan, simulateSync } from '../src/career/career.js';
import { coachOf } from '../src/career/opponents.js';
import { PATTERNS, patternOf } from '../src/career/patterns.js';
import { matchPlan, PLAN, seenPattern } from '../src/intel/matchplan.js';
import { philosophyOf } from '../src/intel/philosophy.js';

const DEFAULT_ON = PLAN.on;
afterEach(() => { PLAN.on = DEFAULT_ON; });

const cpu = (c) => c.clubs.filter((x) => !x.human);

describe('Matchplan: was der CPU-Trainer erkennt und setzt', () => {
  it('nur das Gegenmittel gegen Pressing ist in der heutigen Engine belegt (Neumessung 2026-11-27, scripts/afs-plan.mjs)', () => {
    expect(Object.keys(PATTERNS).filter((k) => PATTERNS[k].counter)).toEqual(['pressing']);
    expect(PATTERNS.pressing.counter).toEqual({ group: 'build', value: 'direkt' });
  });

  it('erkennt die feste Handschrift eines CPU-Gegners, beim Menschen nur den Plan des letzten Spiels', () => {
    const c = createCareer({ seed: 11 });
    for (const x of cpu(c)) expect(seenPattern(c, x)).toBe(patternOf(x));
    const me = humanClub(c);
    expect(seenPattern(c, me)).toBeNull();
    c.seenPlan = { press: 'hoch' };
    expect(seenPattern(c, me)).toBe('pressing');
    c.seenPlan = { press: 'tief' };
    expect(seenPattern(c, me)).toBeNull(); // Mauern braucht tief UND kompakt
    c.seenPlan = { press: 'tief', shape: 'kompakt' };
    expect(seenPattern(c, me)).toBe('mauern');
  });

  it('setzt nur das gemessene Gegenmittel und nie eines, das seine Philosophie meidet', () => {
    const c = createCareer({ seed: 11 });
    let set = 0;
    for (let r = 0; r < 20; r++) {
      c.round = r;
      for (const a of cpu(c)) for (const b of c.clubs) {
        if (a === b) continue;
        const p = matchPlan(c, a, b);
        if (!p) continue;
        set++;
        const ctr = PATTERNS[seenPattern(c, b)].counter;
        expect([p.group, p.value]).toEqual([ctr.group, ctr.value]);
        expect(philosophyOf(coachOf(a).type).avoid).not.toContain(`${p.group}:${p.value}`);
      }
    }
    expect(set).toBeGreaterThan(0);
  });

  it('kein Zufallsstrom: gleiche Woche, gleiche Antwort; Schalter aus: nie ein Plan; Menschen planen selbst', () => {
    const c = createCareer({ seed: 23 });
    const [a, b] = cpu(c).filter((x) => patternOf(x));
    expect(matchPlan(c, a, b)).toEqual(matchPlan(JSON.parse(JSON.stringify(c)), a, b));
    expect(matchPlan(c, humanClub(c), a)).toBeNull();
    PLAN.on = false;
    for (const x of cpu(c)) for (const y of c.clubs) expect(matchPlan(c, x, y)).toBeNull();
  });

  it('Schwierigkeit (E7): gegen den Menschen plant die CPU auf „leicht“ seltener, auf „hart“ nicht seltener', () => {
    const c = createCareer({ seed: 37 });
    const me = humanClub(c);
    c.seenPlan = { press: 'hoch' };
    const count = (d) => {
      c.difficulty = d;
      let n = 0;
      for (let s = 0; s < 6; s++) for (let r = 0; r < 30; r++) {
        c.season = s; c.round = r;
        for (const x of cpu(c)) if (matchPlan(c, x, me)) n++;
      }
      return n;
    };
    const easy = count('leicht'), normal = count('normal'), hard = count('hart');
    expect(easy).toBeLessThan(normal);
    expect(hard).toBeGreaterThanOrEqual(normal);
  });
});

describe('Matchplan im Spiel', () => {
  it('der Plan steht ab Anpfiff in den Befehlen; Schalter aus: nur die Handschrift; das Spiel selbst würfelt gleich', () => {
    const c = createCareer({ seed: 11 });
    let checked = 0;
    for (let r = 0; r < 4; r++) for (const f of (c.round = r, currentFixtures(c) ?? [])) {
      const home = clubById(c, f.home), away = clubById(c, f.away);
      if (home.human || away.human) continue;
      PLAN.on = true;
      const on = prepareMatch(c, f, { duration: 120 });
      PLAN.on = false;
      const off = prepareMatch(c, f, { duration: 120 });
      expect(on.match.seed).toBe(off.match.seed);
      expect(off.match.orders[0]).toEqual(PATTERNS[patternOf(home)]?.orders ?? {});
      PLAN.on = true;
      const p = matchPlan(c, home, away);
      if (p) { expect(on.match.orders[0][p.group]).toBe(p.value); checked++; }
      else expect(on.match.orders[0]).toEqual(off.match.orders[0]);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('Fairness (E5): der Plan des Menschen für dieses Spiel bleibt verborgen, erst nach dem Spiel sieht ihn der nächste Gegner', () => {
    const c = createCareer({ seed: 11 });
    const me = humanClub(c);
    const f = currentFixtures(c).find((x) => x.home === me.id || x.away === me.id);
    setClubPlan(c, 'press', 'hoch');
    expect(seenPattern(c, me)).toBeNull();
    const p = prepareMatch(c, f, { duration: 60 });
    simulateSync(p);
    recordResult(c, f, p);
    expect(c.seenPlan).toEqual({ press: 'hoch' });
    expect(seenPattern(c, me)).toBe('pressing');
  });
});
