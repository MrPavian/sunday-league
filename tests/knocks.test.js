import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { processSubs } from '../src/sim/squad.js';
import { createCareer, currentFixtures, humanClub, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';

const hurt = (p, kind = 'muskelfaser') => Object.assign(p, { knock: { kind, out: true }, mustLeave: true });

describe('injuries during the match', () => {
  it('an injured player is replaced at the next stoppage, by someone for his position', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.rasenplatz, human: false });
    const p = m.players.find((q) => q.team === 0 && q.role === 'def');
    hurt(p);
    processSubs(m);
    expect(m.players).not.toContain(p);
    expect(m.players.filter((q) => q.team === 0)).toHaveLength(7);
    expect(m.bench[0]).toContain(p);
    expect(p.usedUp).toBe(true); // wer verletzt raus ist, kommt nicht wieder
  });

  it('with nobody left on the bench, the team plays a man down', () => {
    const m = createMatch({ seed: 2, pitch: PITCHES.rasenplatz, human: false });
    m.bench[0].length = 0;
    const p = m.players.find((q) => q.team === 0 && q.role === 'mid');
    hurt(p);
    processSubs(m);
    expect(m.players.filter((q) => q.team === 0)).toHaveLength(6);
    expect(m.sentOff).toContain(p);
    expect(p.injuredOff).toBe(true);
  });

  it('if the keeper goes off without a replacement, an outfield player goes in goal', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false });
    m.bench[0].length = 0;
    const gk = m.players.find((q) => q.team === 0 && q.role === 'gk');
    hurt(gk, 'baender');
    processSubs(m);
    expect(m.players.filter((q) => q.team === 0 && q.role === 'gk')).toHaveLength(1);
    // Das Spiel läuft trotzdem weiter.
    for (let i = 0; i < 600; i++) stepMatch(m, undefined, 1 / 60);
    expect(m.players.filter((q) => q.team === 0)).toHaveLength(6);
  });

  it('the diagnosis after the match matches what happened on the pitch', () => {
    const c = createCareer({ seed: 4401 });
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    const prep = prepareMatch(c, f, { duration: 180 });
    prep.match.noKnocks = true;
    simulateSync(prep);
    const t = prep.match.teams.findIndex((x) => x.name === humanClub(c).name);
    const p = prep.match.players.find((q) => q.team === t && q.role !== 'gk');
    p.knock = { kind: 'muskelfaser', out: true };
    recordResult(c, f, prep);
    expect(c.players[p.poolIndex].injury.type).toBe('muskelfaser');
    expect(c.players[p.poolIndex].injuryWeeks).toBeGreaterThanOrEqual(2);
  });
});
