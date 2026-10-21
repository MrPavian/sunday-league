import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { checkDecision, createTouchline } from '../src/sim/touchline.js';

// Schlussphase-Frage im Liveticker (Fehlerbericht: „Deckel drauf" bei 3:1): Die Bedingung wertet die eigene Seite
// richtig aus – Führung, Rückstand, Unentschieden, als Heim- wie als Gastmannschaft.
function finale(team, score) {
  const m = createMatch({ seed: 5, pitch: PITCHES.rasenplatz, human: false, duration: 120 });
  const tl = createTouchline(m, team);
  m.score = score; // [Heim, Gast] wie auf der Anzeigetafel
  m.time = m.duration * 0.9;
  m.half = 2;
  for (const id of ['start', 'halftime', 'sub1', 'sub2']) tl.asked.add(id);
  return checkDecision(tl, []);
}
const labels = (d) => d.options.map((o) => o.label).join(' | ');

describe('Liveticker: Schlussphase-Frage nach Spielstand', () => {
  it.each([
    ['Heim führt 3:1', 0, [3, 1]],
    ['Gast führt 3:1', 1, [1, 3]],
  ])('%s: Führungs-Frage mit „Deckel drauf"', (_, team, score) => {
    const d = finale(team, score);
    expect(d.id).toBe('finale');
    expect(d.question).toContain('über die Zeit');
    expect(labels(d)).toMatch(/Deckel/);
    expect(labels(d)).toMatch(/Bus parken/);
  });

  it.each([
    ['Heim liegt 1:3 hinten', 0, [1, 3]],
    ['Gast liegt 1:3 hinten', 1, [3, 1]],
    ['Unentschieden', 1, [2, 2]],
  ])('%s: „Alles oder nichts", kein „Deckel drauf"', (_, team, score) => {
    const d = finale(team, score);
    expect(d.question).toContain('Alles oder nichts');
    expect(labels(d)).not.toMatch(/Deckel/);
  });
});
