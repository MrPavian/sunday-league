import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, playerOf, seasonOver } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { chronicleData, clubAge, SAGA_EVENTS } from '../src/career/sagas.js';
import { createRng } from '../src/core/rng.js';

// Ergebnisse auswürfeln statt simulieren – für die Tabelle reicht das.
const fillResults = (c) => {
  c.fixtures.slice(0, c.round).forEach((round, r) => round.forEach((f, i) => (f.result ??= { home: (r + i) % 3, away: (r * 2 + i) % 4 })));
};
const playSeason = (c) => {
  while (!seasonOver(c)) finishRound(c);
  fillResults(c);
  return nextSeason(c);
};
const force = (c, id, choice) => {
  const def = SAGA_EVENTS[id];
  const ctx = def.needs(c, createRng(1));
  expect(ctx, id).toBeTruthy();
  c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
  return resolveEvent(c, choice);
};

describe('long-term stories', () => {
  it('a lost fight for the pitch means a new home ground; a won one keeps it', () => {
    const c = createCareer({ seed: 51 });
    playSeason(c);
    c.round = 1;
    const home = humanClub(c).venue;
    force(c, 'platz_verkauf', 0);
    c.saga.platz.signatures = 10; // viel zu wenig
    c.round = c.fixtures.length;
    nextSeason(c);
    expect(humanClub(c).venue).not.toBe(home);
    expect(c.saga.chronicle.some((e) => e.text.includes('Abschied'))).toBe(true);

    const d = createCareer({ seed: 52 });
    playSeason(d);
    d.round = 1;
    // Auf- oder Abstieg kann den Platz ohnehin wechseln – entscheidend ist, dass keiner verloren ging.
    force(d, 'platz_verkauf', 0);
    d.saga.platz.signatures = 9999;
    d.round = d.fixtures.length;
    nextSeason(d);
    expect(Object.keys(d.saga.homeLost ?? {})).toHaveLength(0);
    expect(d.saga.chronicle.some((e) => e.text.includes('gerettet'))).toBe(true);
  });

  it('the jubilee comes with a festschrift built from the real history', () => {
    const c = createCareer({ seed: 53 });
    for (let s = 0; s < 3; s++) playSeason(c);
    expect(clubAge(c)).toBe(25);
    c.round = 2;
    const res = force(c, 'jubilaeum', 1);
    expect(res).toContain('Festschrift');
    const d = chronicleData(c);
    expect(d.festschrift.age).toBe(25);
    expect(d.seasons).toHaveLength(3);
    expect(d.topApps.length).toBeGreaterThan(0);
  });

  it('a fusion brings the best players over and a new club into the league', () => {
    const c = createCareer({ seed: 54 });
    playSeason(c);
    while (c.round < c.fixtures.length - 2) finishRound(c);
    fillResults(c);
    const res = force(c, 'fusion', 0);
    expect(res).toContain('Handschlag');
    const oldId = c.saga.fusion.club;
    const before = humanClub(c).squad.length;
    while (!seasonOver(c)) finishRound(c);
    const level = c.level;
    nextSeason(c);
    if (c.level === level) {
      expect(c.clubs.some((x) => x.id === oldId)).toBe(false);
      expect(c.clubs).toHaveLength(6);
      expect(humanClub(c).squad.length).toBeGreaterThanOrEqual(Math.min(before, 12) - 3); // Abgänge durch Karriereende möglich
      expect(c.saga.chronicle.some((e) => e.text.startsWith('Fusion'))).toBe(true);
    }
  });

  it('women\'s team, youth talent turning pro and the comeback', () => {
    const c = createCareer({ seed: 55 });
    playSeason(c);
    c.round = 2;
    force(c, 'frauen', 0);
    expect(c.saga.frauen.captain).toBeTruthy();
    playSeason(c); // Gründungssaison: noch kein Ligabetrieb
    expect(c.saga.frauen.seasons).toHaveLength(0);
    playSeason(c);
    expect(c.saga.frauen.seasons).toHaveLength(1);

    const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
    c.players[idx].fromYouth = true;
    c.saga.scoutTarget = idx;
    c.round = 1;
    const cash = c.cash;
    force(c, 'profi_scout', 0);
    expect(humanClub(c).squad).not.toContain(idx);
    expect(c.cash).toBe(cash + 250);
    const pro = c.saga.pros[0];
    c.season = pro.returnSeason;
    if (humanClub(c).squad.length >= 12) humanClub(c).squad.pop();
    force(c, 'profi_rueckkehr', 0);
    expect(humanClub(c).squad).toContain(idx);
    expect(playerOf(c, idx).traits).toContain('ex_profi');
  });
});
