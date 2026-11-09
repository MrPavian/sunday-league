// Nationaltrainer im Nebenamt (natcoach.js): Ruf, Anfrage, Kader aus allen Spielern des Landes, Spiele an der Seitenlinie.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, seasonOver } from '../src/career/career.js';
import { NATIONS } from '../src/data/nations.js';
import { NAT, nationName, nextOwnMatch, prepareNatMatch, quickOwnMatch, recordNatMatch } from '../src/career/nationalteams.js';
import { acceptNatCoach, candidates, coachRep, coachSquad, declineNatCoach, NC, natCoachSeason, quitNatCoach, togglePick } from '../src/career/natcoach.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';
import { stepMatch } from '../src/sim/match.js';

const run = (cc, until = () => false) => {
  while (!seasonOver(cc) && !until(cc)) {
    for (const f of cc.fixtures[cc.round]) f.result ??= { home: 1, away: 1 };
    finishRound(cc);
  }
};
const pro = (level = 12) => {
  const c = createCareer({ seed: 9 });
  c.level = level;
  c.pro = true;
  return c;
};

describe('Nationaltrainer im Nebenamt', () => {
  it('Ruf nach Liga und Titeln; Anfragen nur ab Profiliga und nur von Ländern, für die der Ruf reicht', () => {
    const a = pro(12);
    const b = pro(9);
    expect(coachRep(a)).toBeGreaterThan(coachRep(b));
    a.history = [{ pos: 1 }, { pos: 1 }];
    expect(coachRep(a)).toBeGreaterThan(coachRep(pro(12)));
    const amateur = createCareer({ seed: 9 });
    amateur.level = 5;
    expect(natCoachSeason(amateur)).toBeNull();
    let offer = null;
    for (let s = 1; s <= 12 && !offer; s++) {
      a.season = s;
      offer = natCoachSeason(a);
    }
    expect(offer).toBeTruthy();
    expect(coachRep(a)).toBeGreaterThanOrEqual(NC.need[NATIONS[offer.nid].tier]);
    expect(declineNatCoach(a)).toBe(true);
    expect(a.natDeclined).toContain(offer.nid);
  });

  it('Kader aus allen Spielern des Landes: eigene Vereinsspieler und erfundene Kandidaten, 26 ausgewählt, frei änderbar', () => {
    const c = pro(12);
    c.natOffer = { nid: 'ger', season: c.season ?? 1, rep: 70 };
    expect(acceptNatCoach(c)).toBe(true);
    const idx = humanClub(c).squad[3];
    (c.natLock ??= {})[idx] = 'ger';
    const all = candidates(c, 'ger');
    expect(all.some((p) => p.own && p.poolIndex === idx)).toBe(true);
    expect(all.filter((p) => !p.own).length).toBe(Object.values(NC.pool).reduce((a, b) => a + b, 0));
    expect(new Set(all.map((p) => p.name)).size).toBe(all.length); // keine doppelten Namen
    const squad = coachSquad(c, 'ger');
    expect(squad).toHaveLength(NAT.squad);
    const out = squad.find((p) => p.position === 'fwd');
    expect(togglePick(c, out.poolIndex)).toBe(true);
    expect(coachSquad(c, 'ger')).toHaveLength(NAT.squad - 1);
    const extra = all.find((p) => !coachSquad(c, 'ger').some((q) => q.poolIndex === p.poolIndex) && p.poolIndex !== out.poolIndex);
    expect(togglePick(c, extra.poolIndex)).toBe(true);
    expect(togglePick(c, out.poolIndex)).toBe(false); // voll: höchstens 26
    expect(quitNatCoach(c)).toBe(true);
    expect(c.natCoach).toBeUndefined();
  });

  it('Länderspielpause: das eigene Land spielt an der Seitenlinie (Team 0, menschlich), Bilanz zählt', () => {
    const c = pro(12);
    c.natOffer = { nid: 'ger', season: 1, rep: 70 };
    acceptNatCoach(c);
    run(c, (x) => x.natQuali?.open != null);
    const next = nextOwnMatch(c);
    expect(next).toBeTruthy();
    expect([next.m.home, next.m.away]).toContain('ger');
    const prepared = prepareNatMatch(c, next, { duration: 60 });
    expect(prepared.coached).toBe(true);
    expect(prepared.match.humanTeam).toBe(0);
    expect(prepared.match.teams[0].name).toBe(nationName('ger'));
    expect(prepared.humanIsAway).toBe(next.m.away === 'ger');
    expect(prepared.match.manager ?? true).toBeTruthy();
    expect(prepared.match.subRule).toEqual({ limit: 5, reentry: false });
    // Das Spiel läuft mit menschlichem Team durch (Simulation ohne Eingaben).
    const sim = prepareNatMatch(c, next, { duration: 20 }).match;
    for (let i = 0; i < 20000 && sim.phase !== 'ended'; i++) stepMatch(sim, undefined, 1 / 20);
    expect(sim.phase).toBe('ended');
    // Ergebnis aus Sicht des eigenen Landes richtig eingetragen (auch auswärts).
    prepared.match.score = [2, 1];
    recordNatMatch(c, prepared);
    const r = next.m.result;
    expect(next.m.home === 'ger' ? [r.home, r.away] : [r.away, r.home]).toEqual([2, 1]);
    expect(c.natCoach.w).toBe(1);
    const house = new Clubhouse({ addEventListener() {} }, { onChange() {} });
    house.career = c;
    expect(house.hub()).toMatch(/natcoach-card/);
    while (nextOwnMatch(c)?.t.isQuali) quickOwnMatch(c);
    expect(c.natCoach.w + c.natCoach.d + c.natCoach.l).toBeGreaterThanOrEqual(2);
  }, 90000);
});
