// Textvielfalt an der Seitenlinie (sim/touchline.js vary): mehrere Fassungen, ohne den Zufall des Spiels zu benutzen.
import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { answer, checkDecision, createTouchline } from '../src/sim/touchline.js';

const ask = (seed, events, setup) => {
  const m = createMatch({ seed, pitch: PITCHES.rasenplatz });
  setup?.(m);
  const tl = createTouchline(m, 0);
  tl.asked.add('start');
  const rng0 = JSON.stringify(m.rng ?? null);
  const d = checkDecision(tl, events);
  expect(JSON.stringify(m.rng ?? null)).toBe(rng0); // der Spielzufall bleibt unberührt
  return { m, tl, d };
};

describe('Textvielfalt an der Seitenlinie', () => {
  it('Halbzeit: Frage passt zum Spielstand und hat mehrere Fassungen', () => {
    const seen = { lead: new Set(), trail: new Set() };
    for (let seed = 1; seed <= 40; seed++) {
      const lead = ask(seed, [{ type: 'halftime' }], (m) => (m.score = [2, 0])).d;
      const trail = ask(seed, [{ type: 'halftime' }], (m) => (m.score = [0, 1])).d;
      expect(lead.id).toBe('halftime');
      expect(lead.question).toContain('2:0');
      expect(trail.question).toContain('0:1');
      seen.lead.add(lead.question);
      seen.trail.add(trail.question);
    }
    expect(seen.lead.size).toBeGreaterThanOrEqual(2);
    expect(seen.trail.size).toBeGreaterThanOrEqual(2);
  });

  it('Gegentor: verschiedene Fragen und Antwortsätze, jeder Satz ist gefüllt', () => {
    const q = new Set();
    const lines = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      const { tl, d } = ask(seed, [{ type: 'goal', team: 1 }], (m) => ((m.score = [0, 1]), (m.time = 300 + seed * 7)));
      expect(d.id).toBe('conceded');
      q.add(d.question);
      const line = answer(tl, 0);
      expect(line.length).toBeGreaterThan(10);
      lines.add(line);
    }
    expect(q.size).toBeGreaterThanOrEqual(2);
    expect(lines.size).toBeGreaterThanOrEqual(2);
  });

  it('gleicher Startwert, gleiche Minute: gleicher Text (nachvollziehbar)', () => {
    const a = ask(5, [{ type: 'halftime' }]).d.question;
    const b = ask(5, [{ type: 'halftime' }]).d.question;
    expect(a).toBe(b);
  });
});
