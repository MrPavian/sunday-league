// AFS Phase 7: AFI-Kern – Befunde, Optionen, Rangfolge (src/intel/core.js).
import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, prepareMatch, recordResult, simulateSync } from '../src/career/career.js';
import { KEYS } from '../src/sim/analytics.js';
import { diagnose, EFFECTS, INTEL, options, rank } from '../src/intel/core.js';

// Vereinszeile wie seasonstats.js (xG in Hundertsteln), n Spiele mit diesen Mittelwerten je Spiel.
const club = (n, { pass = 50, passOk = 32, packing = 40, xg = 1.2, xgA = 1.2, att = 300, attA = 300 }) => ({
  n,
  s: KEYS.map((k) => ({ pass, passOk, packing, xg: Math.round(xg * 100) }[k] ?? 0) * n),
  third: [0, 0, att * n],
  attA: attA * n,
  xgA: Math.round(xgA * 100) * n,
});

const league = (clubs) => ({ an: { v: 1, keys: KEYS, clubs, history: [] }, clubs: Object.keys(clubs).map((id) => ({ id })) });

describe('AFI-Kern (AFS Phase 7)', () => {
  it('findet Probleme und Stärken als Stufe gegen den Liga-Schnitt, mit Belegen', () => {
    const c = league({ a: club(10, { xg: 0.6, att: 150, attA: 350 }), b: club(10, {}), c: club(10, { xg: 1.8 }), d: club(10, {}) });
    const f = diagnose(c, 'a');
    expect(f.map((x) => x.type).sort()).toEqual(['tilt:low', 'xg:low']);
    expect(f.every((x) => x.kind === 'problem' && Math.abs(x.z) >= 1.96 && x.evidence.n === 10 && x.evidence.src === 'MEASURED')).toBe(true);
    expect(diagnose(c, 'c').map((x) => [x.type, x.kind])).toContainEqual(['xg:high', 'strength']);
    expect(diagnose(c, 'b')).toEqual([]);
    expect(diagnose(c, 'a')).toEqual(f); // reproduzierbar
  });

  it('hält Mindest-n ein: vor 3 Spielen keine Befunde, Passquote erst ab 8', () => {
    const c = league({ a: club(2, { xg: 0.2 }), b: club(2, {}) });
    expect(diagnose(c, 'a')).toEqual([]);
    const d = league({ a: club(5, { passOk: 20 }), b: club(5, {}), e: club(5, {}) });
    expect(diagnose(d, 'a').some((x) => x.metric === 'passPct')).toBe(false);
    const e = league({ a: club(8, { passOk: 20 }), b: club(8, {}), g: club(8, {}) });
    expect(diagnose(e, 'a').some((x) => x.type === 'passPct:low')).toBe(true);
  });

  it('bietet nur gemessene Befehle an; xG-Probleme haben keine Option', () => {
    expect(options({ kind: 'problem', metric: 'xg' })).toEqual([]);
    expect(options({ kind: 'problem', metric: 'xgA' })).toEqual([]);
    expect(options({ kind: 'strength', metric: 'tilt' })).toEqual([]);
    expect(options({ kind: 'problem', metric: 'tilt' }).map((o) => o.key)).toEqual(['style:offensiv']);
    expect(options({ kind: 'problem', metric: 'packing' }).map((o) => o.key).sort()).toEqual(['build:direkt', 'style:mauern']);
  });

  it('ordnet nach Nutzen über alle Probleme, rechnet Nebenwirkungen ab und folgt der Philosophie', () => {
    const p = (metric) => ({ kind: 'problem', metric, type: `${metric}:low` });
    const both = [p('packing'), p('passPct')];
    const r = rank(both);
    expect(r.map((o) => o.key)).toEqual(['style:mauern', 'build:direkt', 'route:mitte']);
    expect(r[1].score).toBeCloseTo(EFFECTS['build:direkt'].packing + EFFECTS['build:direkt'].passPct, 9);
    expect(r[1].reason).toMatchObject({ helps: ['packing:low'], hurts: ['passPct:low'] });
    expect(rank(both, { philosophy: { avoid: ['build:direkt'] } }).map((o) => o.key)).not.toContain('build:direkt');
    const liked = rank(both, { philosophy: { like: ['route:mitte'] } });
    expect(liked.find((o) => o.key === 'route:mitte').score).toBeCloseTo(EFFECTS['route:mitte'].passPct * INTEL.like, 9);
    expect(rank(both, { current: { orders: { build: 'direkt' } } }).map((o) => o.key)).not.toContain('build:direkt');
    expect(rank([p('tilt')], { current: { style: 'offensiv' } })).toEqual([]);
    expect(rank([{ kind: 'strength', metric: 'tilt', type: 'tilt:high' }])).toEqual([]);
  });

  it('läuft auf einer echten Saison: jeder Befund mit Belegen, gleiche Eingabe gleiche Antwort', () => {
    const c = createCareer({ seed: 11 });
    for (let r = 0; r < 4; r++) {
      for (const f of currentFixtures(c)) {
        const p = prepareMatch(c, f, { duration: 40 });
        simulateSync(p);
        recordResult(c, f, p);
      }
      finishRound(c);
    }
    for (const cl of c.clubs) {
      const f = diagnose(c, cl.id);
      for (const x of f) expect(x.evidence.n).toBeGreaterThanOrEqual(3);
      expect(rank(f)).toEqual(rank(diagnose(JSON.parse(JSON.stringify(c)), cl.id)));
    }
  }, 300000);
});
