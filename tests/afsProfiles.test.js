// AFS Phase 5: Profile aus den Saisonsummen (src/intel/profiles.js) und ihre Erfassung (src/career/seasonstats.js).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { KEYS } from '../src/sim/analytics.js';
import { PKEYS, recordSeasonAnalytics } from '../src/career/seasonstats.js';
import { coachProfile, modeledProfiles, playerProfile, playerProfiles, PROFILE, teamProfile } from '../src/intel/profiles.js';

const row = (o) => PKEYS.map((k) => Math.round((o[k] ?? 0) * (k === 'xg' || k === 'xa' || k === 'share' ? 100 : 1)));

describe('Spielerprofile (AFS Phase 5)', () => {
  it('schrumpft zum Positionsmittel der Liga mit dem gemessenen k und ordnet als Perzentil', () => {
    const c = createCareer({ seed: 5 });
    const ids = c.clubs.flatMap((cl) => cl.squad);
    const byPos = {};
    for (const idx of ids) (byPos[playerOf(c, idx).position] ??= []).push(idx);
    const pos = Object.entries(byPos).sort((a, b) => b[1].length - a[1].length)[0][0];
    const [a, b, d] = byPos[pos];
    c.players[a].an = row({ pass: 40, xg: 2, duelWon: 3, duelLost: 1, share: 4 });
    c.players[b].an = row({ pass: 10, xg: 0, duelWon: 1, duelLost: 1, share: 4 });
    c.players[d].an = row({ pass: 30, share: 0.5 }); // kurz eingesetzt: stark zum Mittel gezogen
    const P = playerProfiles(c);
    const mu = 80 / 8.5;
    expect(P[a].mean.pass).toBeCloseTo(mu, 9);
    expect(P[a].values.pass.v).toBeCloseTo((40 + PROFILE.k.pass * mu) / (4 + PROFILE.k.pass), 9);
    expect(P[d].values.pass.raw).toBeCloseTo(60, 9);
    // roh 60 je Spiel nach einem halben Spiel: vom Abstand zum Mittel bleibt nur Anteil / (Anteil + k)
    expect((P[d].values.pass.v - mu) / (60 - mu)).toBeCloseTo(0.5 / (0.5 + PROFILE.k.pass), 9);
    expect(P[d].values.pass.pct).toBe(1);
    expect(P[a].values.pass.pct).toBe(0.5);
    expect(P[b].values.pass.pct).toBe(0);
    expect(P[a].src).toBe('ESTIMATED');
    expect(playerProfile(c, byPos[pos][3])).toBeNull(); // ohne Daten kein Profil
  });

  it('nimmt Zeilen aus älteren Ständen ohne Spielanteil nicht', () => {
    const c = createCareer({ seed: 5 });
    const idx = humanClub(c).squad[0];
    c.players[idx].an = KEYS.map(() => 1);
    expect(playerProfile(c, idx)).toBeNull();
  });
});

describe('Erfassung für Profile (AFS Phase 5)', () => {
  const fakeMatch = (players) => ({
    duration: 600,
    an: { players: Object.fromEntries(players.map((p) => [p.id, { ...Object.fromEntries(KEYS.map((k) => [k, 0])), pass: 5 }])), teams: [0, 1].map(() => ({ ...Object.fromEntries(KEYS.map((k) => [k, 1])), third: [10, 20, 30] })) },
    stats: { players: Object.fromEntries(players.map((p) => [p.id, { seconds: 300 }])) },
    decisions: [
      { team: 1, group: 'press', by: 'ai' },
      { team: 1, group: 'press', by: 'ai' },
      { team: 1, group: 'build', by: 'ai' },
      { team: 0, group: 'press', by: 'coach' },
    ],
    teams: [{ players }, { players: [] }],
  });

  it('zählt Spielanteil je Spieler und KI-Befehle je Verein; alte Zeilen bleiben ohne Spielanteil', () => {
    const c = createCareer({ seed: 5 });
    const h = humanClub(c);
    const other = c.clubs.find((x) => !x.human);
    const [p0, p1] = h.squad;
    c.players[p1].an = KEYS.map(() => 0); // Zeile aus einem älteren Stand
    const players = [p0, p1].map((idx, i) => ({ id: `p${i}`, poolIndex: idx, team: 0 }));
    const m = fakeMatch(players);
    Object.assign(m, { players, bench: [[], []] });
    recordSeasonAnalytics(c, { home: h.id, away: other.id }, { match: m, humanIsAway: false });
    expect(c.players[p0].an).toHaveLength(PKEYS.length);
    expect(c.players[p0].an.at(-1)).toBe(50); // halbes Spiel in Hundertsteln
    expect(c.players[p1].an).toHaveLength(KEYS.length);
    expect(c.an.clubs[other.id].dec).toEqual({ press: 2, build: 1 });
    expect(c.an.clubs[h.id].dec).toBeUndefined(); // Befehle des Menschen zählen nicht
    expect(coachProfile(c, other.id)).toMatchObject({ n: 1, perMatch: 3, top: 'press', src: 'MEASURED' });
    expect(coachProfile(c, h.id)).toBeNull(); // eigener Verein: kein Trainerprofil
    expect(teamProfile(c, h.id)).toMatchObject({ n: 1, src: 'MEASURED', tilt: 0.5 });
  });
});

describe('Werte-Profile anderer Ligen (AFS Phase 5, MODELED)', () => {
  it('ordnet die Vereine einer anderen Liga nach Stärke, ohne Spieldaten', () => {
    const c = createCareer({ seed: 5 });
    const P = Object.values(modeledProfiles(c, 2));
    expect(P.length).toBeGreaterThan(3);
    expect(P.every((p) => p.src === 'MODELED' && p.of === P.length && typeof p.coach === 'string')).toBe(true);
    expect(P.map((p) => p.rank).sort((x, y) => x - y)).toEqual(P.map((_, i) => i + 1));
    const top = P.find((p) => p.rank === 1);
    expect(P.every((p) => p.str <= top.str)).toBe(true);
  });
});
