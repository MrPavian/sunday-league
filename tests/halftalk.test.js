// Halbzeitansprache mit Wirkung (Gameplay 2.0, Punkt 37).
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { halftimeTalk, praiseCandidates, reaction, TALK } from '../src/sim/halftalk.js';
import { answer, checkDecision, createTouchline } from '../src/sim/touchline.js';
import { createCommentator } from '../src/sim/commentary.js';

const DT = 1 / 60;
const toHalf = (seed = 12) => {
  const m = createMatch({ seed, pitch: PITCHES.sportplatz, human: false, aiCoach: false });
  while (!m.events.some((e) => e.type === 'halftime')) {
    m.events.length = 0;
    stepMatch(m, undefined, DT);
  }
  return m;
};
// Spieler mit gewünschtem Profil künstlich herstellen.
const as = (p, prof) => {
  if (Object.getOwnPropertyDescriptor(p, '_profiles')) p._profiles = prof; // im Spiel schon gemerkt (profiles.js, beschreibbar)
  else Object.defineProperty(p, '_profiles', { value: prof, writable: true });
};

describe('Halbzeitansprache', () => {
  it('Reaktion je Persönlichkeit: Nervöse brauchen Ruhe, Kämpfer eine laute Ansage', () => {
    const m = toHalf();
    const [a, b, c] = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
    as(a, ['nervoes']);
    as(b, ['kaempfer']);
    as(c, ['teamplayer']);
    m.score = [1, 1];
    expect(reaction(m, 0, a, 'calm')).toBe(TALK.calmNervous);
    expect(reaction(m, 0, a, 'loud')).toBe(TALK.loudNervous);
    expect(reaction(m, 0, b, 'loud')).toBe(TALK.loudFighter);
    expect(reaction(m, 0, c, 'loud')).toBe(TALK.loudAll);
    m.score = [0, 1]; // hinten: ruhig ist dem Kämpfer zu lasch
    expect(reaction(m, 0, b, 'calm')).toBeLessThan(0);
    m.score = [2, 0]; // vorne: Gebrüll ist überflüssig
    expect(reaction(m, 0, c, 'loud')).toBeLessThan(0);
    expect(reaction(m, 0, c, 'praise', c.id)).toBeGreaterThan(0);
    expect(reaction(m, 0, b, 'praise', c.id)).toBe(0);
  });

  it('wirkt auf die Werte – einmal je Pause; der Kommentar sagt, wer wie reagiert', () => {
    const m = toHalf(13);
    const [p] = praiseCandidates(m, 0);
    const before = p.attrs.passing;
    const lines = halftimeTalk(m, 0, 'praise', p.id);
    expect(p.attrs.passing).toBeGreaterThan(before);
    expect(lines.length).toBeGreaterThan(0);
    expect(halftimeTalk(m, 0, 'loud')).toEqual([]); // nur einmal
    const com = createCommentator(m, 1);
    com.feed([]);
    while (m.phase !== 'play') stepMatch(m, undefined, DT);
    com.feed([]);
    expect(com.lines.map((l) => l.text).join(' ')).toContain(lines[0]);
  });

  it('Liveticker: nach der Ausrichtung kommt die Frage nach dem Ton; die erste Antwort sagt nichts', () => {
    const m = createMatch({ seed: 14, pitch: PITCHES.sportplatz, human: false, aiCoach: false });
    const tl = createTouchline(m, 0);
    tl.asked.add('start');
    while (!m.events.some((e) => e.type === 'halftime')) {
      m.events.length = 0;
      stepMatch(m, undefined, DT);
    }
    const d = checkDecision(tl, m.events);
    expect(d?.id).toBe('halftime');
    answer(tl, 0);
    expect(tl.open?.id).toBe('talk');
    expect(tl.open.options.length).toBeGreaterThanOrEqual(3);
    answer(tl, 0);
    expect(m.talk?.[0]).toBeFalsy();
    expect(tl.open).toBeNull();
  });
});
