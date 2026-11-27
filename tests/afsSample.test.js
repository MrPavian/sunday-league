// AFS Phase 5b: Messspiele der Nachbarligen (src/intel/sample.js) und Spielerprofile daraus (intel/profiles.js).
import { afterEach, describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { closeSeasonAnalytics } from '../src/career/seasonstats.js';
import { ensureNeighbors, tstate } from '../src/career/transfers.js';
import { samplePlayerProfiles } from '../src/intel/profiles.js';
import { playSample, SAMPLE, sampleFixture, sampleStore } from '../src/intel/sample.js';

const DEFAULT_ON = SAMPLE.on;
afterEach(() => { SAMPLE.on = DEFAULT_ON; });

const fresh = (seed = 11) => {
  const c = createCareer({ seed });
  ensureNeighbors(c);
  return c;
};
const playRound = (c) => {
  for (const f of currentFixtures(c)) {
    const p = prepareMatch(c, f, { duration: 60 });
    simulateSync(p);
    recordResult(c, f, p);
  }
};

describe('Messspiele: wer spielt', () => {
  it('nur Nachbarn aus dem Transfermarkt, je Spieltag eine Liga im Wechsel; Schalter aus: keins', () => {
    const c = fresh();
    const nbs = tstate(c).neighbors;
    const levels = [...new Set(nbs.map((n) => n.level))].sort((a, b) => a - b);
    const seen = new Set();
    for (let r = 0; r < 12; r++) {
      c.round = r;
      const fx = sampleFixture(c);
      expect(fx.level).toBe(levels[r % levels.length]);
      expect(nbs).toContain(fx.home);
      expect(nbs).toContain(fx.away);
      expect(fx.home).not.toBe(fx.away);
      expect([fx.home.level, fx.away.level]).toEqual([fx.level, fx.level]);
      seen.add(`${fx.home.id}-${fx.away.id}`);
    }
    expect(seen.size).toBeGreaterThan(2); // Paarungen wechseln, Heim und Auswärts auch
    SAMPLE.on = false;
    expect(sampleFixture(c)).toBeNull();
  });
});

describe('Messspiele: zählen nirgends', () => {
  it('ändern den Spielstand nur in career.an.nb; höchstens eins je Spieltag; gleicher Seed, gleiche Daten', async () => {
    const c = fresh();
    playRound(c);
    const before = JSON.stringify(c);
    const p = await playSample(c, simulateSync, { duration: 60 });
    expect(p.sample).toBe(true);
    expect(await playSample(c, simulateSync, { duration: 60 })).toBeNull();
    const nb = c.an.nb;
    delete c.an.nb;
    expect(JSON.stringify(c)).toBe(before);
    expect(nb.s).toBe(c.season);
    expect(nb.n[p.fixture.home.id]).toBe(1);
    expect(nb.n[p.fixture.away.id]).toBe(1);
    const squads = new Set([...p.fixture.home.squad, ...p.fixture.away.squad]);
    expect(Object.keys(nb.p).length).toBeGreaterThan(0);
    for (const idx of Object.keys(nb.p)) expect(squads.has(Number(idx))).toBe(true);

    const d = fresh();
    playRound(d);
    await playSample(d, simulateSync, { duration: 60 });
    expect(d.an.nb).toEqual(nb);
  });

  it('der Spieltag selbst bleibt gleich: Ergebnisse mit und ohne Messspiel identisch', async () => {
    const run = async (on) => {
      SAMPLE.on = on;
      const c = fresh(23);
      for (let r = 0; r < 2; r++) {
        playRound(c);
        await playSample(c, simulateSync, { duration: 60 });
        finishRound(c);
      }
      return c.fixtures.flat().filter((f) => f.result).map((f) => `${f.home}-${f.away}:${f.result.home}:${f.result.away}`);
    };
    expect(await run(true)).toEqual(await run(false));
  });

  it('gelten eine Saison: Saisonende löscht sie, Daten einer alten Saison werden nicht gelesen', async () => {
    const c = fresh();
    playRound(c);
    await playSample(c, simulateSync, { duration: 60 });
    expect(sampleStore(c)).not.toBeNull();
    c.season++;
    expect(sampleStore(c)).toBeNull();
    c.season--;
    closeSeasonAnalytics(c, [], null);
    expect(c.an.nb).toBeUndefined();
  });
});

describe('Spielerprofile aus Messspielen', () => {
  it('nur Spieler der Nachbarn dieser Liga, Perzentil 0 … 1, Zahl der Messspiele des Vereins', async () => {
    const c = fresh();
    for (let r = 0; r < 3; r++) {
      c.round = r;
      await playSample(c, simulateSync, { duration: 60 });
    }
    const level = sampleFixture(c).level;
    const clubs = tstate(c).neighbors.filter((n) => n.level === level);
    const pf = samplePlayerProfiles(c, level);
    expect(Object.keys(pf).length).toBeGreaterThan(0);
    for (const [idx, p] of Object.entries(pf)) {
      const club = clubs.find((n) => n.squad.includes(Number(idx)));
      expect(club).toBeTruthy();
      expect(p.sample).toBe(c.an.nb.n[club.id] ?? 0);
      expect(p.level).toBe(level);
      expect(p.src).toBe('ESTIMATED');
      for (const v of Object.values(p.values)) if (v.pct != null) expect(v.pct).toBeGreaterThanOrEqual(0), expect(v.pct).toBeLessThanOrEqual(1);
    }
    expect(samplePlayerProfiles(c, 99)).toEqual({});
  });
});
