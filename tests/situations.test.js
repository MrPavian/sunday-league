import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createLog, laneOf, mirrorLane, thirdOf } from '../src/sim/matchlog.js';
import { detectSituations } from '../src/sim/situations.js';

const fresh = () => {
  const m = createMatch({ seed: 3, pitch: PITCHES.rasenplatz, human: false });
  m.time = 100;
  m.log = createLog();
  return m;
};
const poss = (team, extra) => ({ team, start: 90, end: 91, how: 'loose', startThird: 'mid', startLane: 'centre', passes: 2, maxAdv: 0.5, entryLane: null, box: false, shots: 0, ...extra });
const types = (m, team) => detectSituations(m, team).map((s) => s.type);

describe('match log zones', () => {
  it('left and right are seen in the direction of play', () => {
    const m = fresh();
    // Team 0 spielt nach +x: links ist -z. Team 1 spielt nach -x: dort ist links +z.
    expect(laneOf(m, 0, { x: 0, z: -m.pitch.halfWidth * 0.8 })).toBe('left');
    expect(laneOf(m, 1, { x: 0, z: -m.pitch.halfWidth * 0.8 })).toBe('right');
    expect(mirrorLane('left')).toBe('right');
    expect(thirdOf(0.6)).toBe('att');
  });

  it('logging never changes the match', () => {
    const a = createMatch({ seed: 9, pitch: PITCHES.parkplatz, human: false, duration: 60 });
    for (let i = 0; i < 3600 && a.phase !== 'ended'; i++) stepMatch(a, undefined, 1 / 60);
    expect(a.log.poss.length).toBeGreaterThan(5);
    expect(a.log.samples.length).toBeGreaterThan(20);
  });
});

describe('situation engine', () => {
  it('spots the opponent coming down one flank again and again', () => {
    const m = fresh();
    // Team 1 greift über seine linke Seite an = unsere rechte.
    for (let i = 0; i < 5; i++) m.log.poss.push(poss(1, { start: 80 + i, entryLane: 'left', box: i % 2 === 0 }));
    m.log.poss.push(poss(1, { start: 88, entryLane: 'centre' }));
    const s = detectSituations(m, 0).find((x) => x.type === 'OPP_FLANK');
    expect(s).toBeTruthy();
    expect(s.lane).toBe('right');
    expect(s.options.map((o) => `${o.group}:${o.value}`)).toEqual(['cover:right', 'side:left', 'shape:kompakt']);
    // Für den Gegner selbst ist das keine Gefahr.
    expect(types(m, 1)).not.toContain('OPP_FLANK');
  });

  it('balanced attacks from both sides are no situation', () => {
    const m = fresh();
    for (let i = 0; i < 6; i++) m.log.poss.push(poss(1, { start: 80 + i, entryLane: i % 2 ? 'left' : 'right' }));
    expect(types(m, 0)).not.toContain('OPP_FLANK');
  });

  it('notices when our attacks down one side keep creating chances', () => {
    const m = fresh();
    for (let i = 0; i < 3; i++) m.log.poss.push(poss(0, { start: 80 + i, entryLane: 'left', shots: 1 }));
    m.log.poss.push(poss(0, { start: 85, entryLane: 'right' }));
    const s = detectSituations(m, 0).find((x) => x.type === 'OUR_SIDE_WORKS');
    expect(s?.lane).toBe('left');
  });

  it('space behind a high line only counts with a quick striker', () => {
    const m = fresh();
    for (let i = 0; i < 20; i++) m.log.samples.push({ t: 80 + i, half: 1, poss: 0, line: [-0.6, -0.1], top: [0.5, 0.2], fwdGap: [0.2, 0.2], stamina: [0.8, 0.8] });
    const fwd = m.players.filter((p) => p.team === 0 && p.role === 'fwd');
    const defs = m.players.filter((p) => p.team === 1 && p.role === 'def');
    fwd.forEach((p) => (p.attrs = { ...p.attrs, pace: 0.9 }));
    defs.forEach((p) => (p.attrs = { ...p.attrs, pace: 0.4 }));
    expect(types(m, 0)).toContain('SPACE_BEHIND');
    fwd.forEach((p) => (p.attrs = { ...p.attrs, pace: 0.35 }));
    expect(types(m, 0)).not.toContain('SPACE_BEHIND');
  });

  it('pressing that tires the team is flagged – but only when we press', () => {
    const m = fresh();
    m.log.samples.push({ t: 99, half: 2, poss: 1, line: [-0.4, -0.4], top: [0, 0], fwdGap: [0.2, 0.2], stamina: [0.45, 0.8] });
    expect(types(m, 0)).not.toContain('PRESS_TIRING');
    m.plan[0].style = 'pressing';
    m.modsCache = null;
    expect(types(m, 0)).toContain('PRESS_TIRING');
  });

  it('old events outside the window are forgotten', () => {
    const m = fresh();
    for (let i = 0; i < 5; i++) m.log.poss.push(poss(1, { start: 1 + i, entryLane: 'left', box: true }));
    expect(types(m, 0)).not.toContain('OPP_FLANK');
  });

  it('a whole match produces a readable chronicle of situations', () => {
    const m = createMatch({ seed: 21, pitch: PITCHES.ascheplatz, human: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    expect(m.situationLog.length).toBeGreaterThan(0);
    for (const e of m.situationLog) expect(e.until).toBeGreaterThanOrEqual(e.from);
  });
});
