// Aufstellung vor Turnierspielen (Nutzerhinweis 2026-11-09: vor Hallenspielen ließ sich nicht aufstellen): Wer beim Turnier dabei
// ist, steht beim Start fest; die eigene Aufstellung im Vereinsheim ist genau die, die im Spiel aufläuft.
import { describe, expect, it } from 'vitest';
import { createCareer, currentLineup, humanClub, setLineupSlot } from '../src/career/career.js';
import { cupAvailability, cupOf, humanCupMatch, prepareCupMatch, startTournament } from '../src/career/tournament.js';

describe('Aufstellung beim Turnier', () => {
  for (const kind of ['halle', 'stadt']) {
    it(`${kind}: die gewählte Fünf läuft auf, Absagen gelten fürs ganze Turnier`, () => {
      const c = createCareer({ seed: 21 });
      startTournament(c, kind);
      const av = cupAvailability(c, kind);
      expect(cupOf(c, kind).avail).toBeTruthy();
      expect(cupAvailability(c, kind)).toEqual(av); // gleich bei jedem Aufruf
      const { lineup, bench, format } = currentLineup(c);
      expect(format).toBe(5);
      // Einen Bankspieler, der dabei ist, auf Position 2 stellen.
      const sub = bench.find((idx) => av[idx] === 'yes');
      expect(sub).toBeDefined();
      setLineupSlot(c, 1, sub);
      const want = currentLineup(c).lineup;
      expect(want[1]).toBe(sub);
      expect(want).not.toEqual(lineup);
      const m = humanCupMatch(c, kind);
      const p = prepareCupMatch(c, m, { human: true, duration: 60 });
      const team = p.humanIsAway ? 1 : 0;
      const onPitch = p.match.players.filter((x) => x.team === team).map((x) => x.poolIndex);
      for (const idx of want.filter((x) => x != null)) expect(onPitch).toContain(idx);
      // Wer abgesagt hat, steht nicht im Kader des Spiels.
      const all = [...onPitch, ...p.match.bench[team].map((x) => x.poolIndex)];
      for (const [idx, v] of Object.entries(av)) if (v === 'no') expect(all).not.toContain(Number(idx));
      expect(humanClub(c).squad.length).toBeGreaterThan(5);
    });
  }
});
