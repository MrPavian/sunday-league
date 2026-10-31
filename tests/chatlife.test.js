// Chat-Leben (src/career/chatlife.js): jede Woche Farbe aus dem Vereinsumfeld, dieselbe Nachricht frühestens nach GAP Wochen,
// jede Vorlage lässt sich mit echtem Spielstand füllen (keine Platzhalter, kein undefined).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { GAP, LIFE, startWeek } from '../src/career/chatlife.js';
import { addRivalry } from '../src/career/rivals.js';
import { createRng } from '../src/core/rng.js';

describe('Chat-Leben', () => {
  it('jede Woche mindestens eine, höchstens zwei; keine Wiederholung innerhalb von GAP Wochen', () => {
    const c = createCareer({ seed: 51 });
    const seen = [];
    for (let k = 0; k < 40; k++) {
      c.week.chat = [];
      c.round = k % 10;
      c.season = 1 + Math.floor(k / 10);
      startWeek(c);
      const life = c.week.chat.filter((m) => m.life);
      expect(life.length).toBeGreaterThanOrEqual(1);
      expect(life.length).toBeLessThanOrEqual(2);
      for (const m of life) seen.push({ id: m.life, week: k });
    }
    for (let i = 0; i < seen.length; i++)
      for (let j = i + 1; j < seen.length; j++) if (seen[i].id === seen[j].id) expect(seen[j].week - seen[i].week).toBeGreaterThanOrEqual(GAP);
    expect(new Set(seen.map((s) => s.id)).size).toBeGreaterThan(15);
  });

  it('alle Vorlagen füllen sich ohne Lücken (mit Sponsor, Rivale, Wetter, Flutlicht)', () => {
    const c = createCareer({ seed: 52 });
    c.sponsors = [{ id: 'krume', name: 'Bäckerei Krume', slot: 'trikot' }];
    const opp = c.clubs.find((x) => !x.human).id;
    addRivalry(c, opp, 5, 'Test.');
    c.facilities = { built: { flutlicht: true } };
    c.round = 3;
    const mate = humanClub(c).squad.find((i) => i !== c.coach?.idx);
    for (const e of LIFE) {
      const t = e.text(c, createRng(1), mate);
      expect(typeof t, e.id).toBe('string');
      expect(t, e.id).not.toMatch(/undefined|NaN|\{|\}/);
      expect(t.length, e.id).toBeGreaterThan(20);
    }
  });
});
