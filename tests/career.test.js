import { describe, expect, it } from 'vitest';
import {
  buildLineup,
  createCareer,
  finishRound,
  humanClub,
  humanFixture,
  loadCareer,
  nudge,
  prepareMatch,
  recordResult,
  saveCareer,
  seasonOver,
  simulateSync,
  table,
} from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

describe('career', () => {
  const career = createCareer({ seed: 99 });

  it('builds six clubs with nine unique pool players each', () => {
    expect(career.clubs).toHaveLength(6);
    const all = career.clubs.flatMap((c) => c.squad);
    expect(new Set(all).size).toBe(54);
    for (const c of career.clubs) expect(c.squad).toHaveLength(9);
  });

  it('schedules a double round robin: everyone plays everyone home and away', () => {
    expect(career.fixtures).toHaveLength(10);
    const pairs = {};
    for (const round of career.fixtures) {
      expect(round).toHaveLength(3);
      const inRound = round.flatMap((f) => [f.home, f.away]);
      expect(new Set(inRound).size).toBe(6);
      for (const f of round) pairs[`${f.home}>${f.away}`] = (pairs[`${f.home}>${f.away}`] ?? 0) + 1;
    }
    expect(Object.keys(pairs)).toHaveLength(30);
    expect(Object.values(pairs).every((n) => n === 1)).toBe(true);
  });

  it('opens each week with a chat: announcement plus an answer from every player', () => {
    const w = career.week;
    expect(w.chat[0].from).toBeNull();
    expect(w.chat).toHaveLength(10);
    for (const idx of humanClub(career).squad) expect(['yes', 'no', 'late']).toContain(w.availability[idx]);
  });

  it('nudging only works on declines, three times per week', () => {
    const c = createCareer({ seed: 5 });
    const declined = Object.entries(c.week.availability).filter(([, s]) => s === 'no');
    const yes = Object.entries(c.week.availability).find(([, s]) => s === 'yes');
    if (yes) expect(nudge(c, Number(yes[0]))).toBeNull();
    for (const [idx] of declined.slice(0, 3)) expect(typeof nudge(c, Number(idx))).toBe('boolean');
    expect(c.week.nudges).toBe(Math.max(0, 3 - Math.min(3, declined.length)));
  });

  it('fills up with a helper when too few can play', () => {
    const club = humanClub(career);
    const availability = Object.fromEntries(club.squad.map((idx, i) => [idx, i < 3 ? 'yes' : 'no']));
    const { lineup, helpers } = buildLineup(career, club, 5, availability, createRng(1));
    expect(lineup).toHaveLength(5);
    expect(helpers).toHaveLength(2);
  });

  it('plays a whole season (short matches), fills the table and survives save/load', () => {
    const c = createCareer({ seed: 7 });
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) {
        const prepared = prepareMatch(c, f, { duration: 40 });
        simulateSync(prepared);
        recordResult(c, f, prepared);
      }
      finishRound(c);
    }
    const t = table(c);
    expect(t).toHaveLength(6);
    for (const row of t) expect(row.played).toBe(10);
    expect(t.reduce((s, r) => s + r.gf, 0)).toBe(t.reduce((s, r) => s + r.ga, 0));
    for (let i = 1; i < t.length; i++) expect(t[i - 1].pts).toBeGreaterThanOrEqual(t[i].pts);
    const apps = humanClub(c).squad.map((idx) => c.players[idx].apps);
    expect(Math.max(...apps)).toBeGreaterThan(3);

    const storage = memoryStorage();
    expect(saveCareer(c, storage)).toBe(true);
    expect(loadCareer(storage)).toEqual(c);
  });

  it('the human club is team 0 even when playing away', () => {
    const c = createCareer({ seed: 3 });
    let f = humanFixture(c);
    while (f.home === humanClub(c).id) {
      finishRound(c);
      f = humanFixture(c);
    }
    const prepared = prepareMatch(c, f, { human: true, duration: 30 });
    expect(prepared.humanIsAway).toBe(true);
    expect(prepared.match.teams[0].name).toBe(humanClub(c).name);
    simulateSync(prepared);
    const result = recordResult(c, f, prepared);
    expect(result.away).toBe(prepared.match.score[0]);
  });
});

describe('lineup', () => {
  it("uses the manager's picks and swaps when a player is moved", async () => {
    const { currentLineup, setLineupSlot, resetLineup } = await import('../src/career/career.js');
    const c = createCareer({ seed: 21 });
    const auto = currentLineup(c);
    const benchGuy = humanClub(c).squad.find((idx) => c.week.availability[idx] === 'yes' && !auto.lineup.includes(idx));
    const last = auto.lineup.length - 1;
    if (benchGuy !== undefined) {
      setLineupSlot(c, last, benchGuy);
      expect(currentLineup(c).lineup[last]).toBe(benchGuy);
    }
    const a = currentLineup(c).lineup[0];
    const b = currentLineup(c).lineup[1];
    setLineupSlot(c, 0, b);
    expect(currentLineup(c).lineup.slice(0, 2)).toEqual([b, a]);
    // Die gewählte Aufstellung landet auch im Match.
    const prepared = prepareMatch(c, humanFixture(c), { human: true, duration: 10 });
    const team0 = prepared.match.players.filter((p) => p.team === 0).map((p) => p.poolIndex);
    expect(team0).toEqual(currentLineup(c).lineup);
    resetLineup(c);
    expect(currentLineup(c).lineup).toEqual(auto.lineup);
  });
});
