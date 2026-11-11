// Stadionsprecher (sim/announcer.js): Durchsagen aus den Spielereignissen, nur mit Lautsprecheranlage; ändert das Spiel nicht.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { ANNOUNCER, createAnnouncer, hasAnnouncer } from '../src/sim/announcer.js';

const STEP = 1 / 60;
const run = (seed, withPA) => {
  const m = createMatch({ seed, pitch: PITCHES.grossfeld, human: false, duration: 120 });
  m.crowd = 300;
  const pa = withPA ? createAnnouncer(m, seed) : null;
  const lines = [];
  let guard = 0;
  while (m.phase !== 'ended' && guard++ < 60 * 400) {
    stepMatch(m, {}, STEP);
    if (pa) lines.push(...pa.feed(m.events));
    m.events.length = 0;
  }
  return { m, lines };
};

describe('Stadionsprecher', () => {
  it('Anlage erst ab 60 Zuschauern und nicht auf Parkplatz, Park, Hinterhof', () => {
    const m = createMatch({ seed: 1, pitch: PITCHES.grossfeld, human: false, duration: 60 });
    m.crowd = ANNOUNCER.minCrowd - 1;
    expect(hasAnnouncer(m)).toBe(false);
    m.crowd = ANNOUNCER.minCrowd;
    expect(hasAnnouncer(m)).toBe(true);
    const p = createMatch({ seed: 1, pitch: PITCHES.parkplatz, human: false, duration: 60 });
    p.crowd = 500;
    expect(hasAnnouncer(p)).toBe(false);
  });

  it('Begrüßung, jedes Tor, Halbzeit, Zuschauerzahl einmal, Endstand – und das Spiel bleibt gleich', () => {
    const a = run(7, true);
    const b = run(7, false);
    expect(a.m.score).toEqual(b.m.score);
    const kinds = a.lines.map((l) => l.kind);
    expect(kinds[0]).toBe('welcome');
    expect(kinds.filter((k) => k === 'half')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'crowd')).toHaveLength(1);
    expect(kinds.at(-1)).toBe('end');
    expect(kinds.filter((k) => k === 'goal')).toHaveLength(a.m.score[0] + a.m.score[1]);
    expect(a.lines.find((l) => l.kind === 'crowd').text).toMatch(/300/);
    for (const l of a.lines.filter((x) => x.home)) {
      expect(l.call.length).toBeGreaterThan(0);
      expect(l.after).toContain(l.call);
    }
  });
});
