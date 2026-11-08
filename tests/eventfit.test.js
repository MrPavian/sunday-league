// Ereignisse passend zu Liga, Platz und Professionalität (eventfit.js), neue Profi-Ereignisse (proevents.js),
// Chat-Nachrichten nach Liga (chatlife.js LIFE_FIT) und Trikotvorlagen nach Farbzahl (kitPaint.js).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { FIT, fitsEvent } from '../src/career/eventfit.js';
import { PRO_EVENTS } from '../src/career/proevents.js';
import { LIFE, LIFE_FIT } from '../src/career/chatlife.js';
import { createRng } from '../src/core/rng.js';
import { patternColors, PATTERN_IDS, paintKit, THREE_COLOR } from '../src/render/kitPaint.js';
import { KIT_PATTERNS } from '../src/career/career.js';

const at = (level, venue) => {
  const c = createCareer({ seed: 5 });
  c.level = level;
  if (venue) humanClub(c).venue = venue;
  return c;
};

describe('Ereignisse passen zur Liga', () => {
  it('Dorf- und Amateurereignisse gibt es oben nicht, Berufsereignisse in der Regionalliga noch, in der 3. Liga nicht', () => {
    for (const id of ['arbeitseinsatz', 'tombola', 'ae_forderung', 'fahrgemeinschaft_bruch', 'platzwart_ruhestand']) {
      expect(fitsEvent(at(3), id)).toBe(true);
      expect(fitsEvent(at(10), id)).toBe(false);
    }
    expect(fitsEvent(at(9), 'job_stress')).toBe(true);
    expect(fitsEvent(at(10), 'job_stress')).toBe(false);
    expect(fitsEvent(at(10), 'streit')).toBe(true); // ohne Eintrag passt es überall
  });
  it('Platz-Ereignisse nicht in der Halle, der Nachbar vom Hinterhof nur auf kleinen Plätzen', () => {
    expect(fitsEvent(at(3, 'halle'), 'platzsperre')).toBe(false);
    expect(fitsEvent(at(3, 'rasenplatz'), 'platzsperre')).toBe(true);
    expect(fitsEvent(at(1, 'hinterhof'), 'nachbar')).toBe(true);
    expect(fitsEvent(at(1, 'rasenplatz'), 'nachbar')).toBe(false);
  });
  it('jede Regel gehört zu einem bestehenden Ereignis', async () => {
    const mods = await Promise.all(['events', 'stories', 'personal', 'sagas', 'life', 'academy', 'sponsors', 'poaching', 'leagueevents', 'seasonevents', 'localevents', 'phaseevents', 'clublife', 'teenlife'].map((m) => import(`../src/career/${m}.js`)));
    const ids = new Set(mods.flatMap((m) => Object.values(m).filter((v) => v && typeof v === 'object' && !Array.isArray(v)).flatMap((v) => Object.keys(v))));
    for (const id of Object.keys(FIT)) expect(ids.has(id), id).toBe(true);
  });
});

describe('Profi-Ereignisse', () => {
  it('erst ab der Oberliga; jede Antwort läuft ohne Fehler durch', () => {
    const low = at(3);
    for (const ev of Object.values(PRO_EVENTS)) expect(ev.needs(low, createRng(1))).toBeNull();
    let seen = 0;
    for (const [id, ev] of Object.entries(PRO_EVENTS)) {
      for (const level of [8, 9, 10]) {
        const c = at(level);
        c.round = 4;
        c.week.weather = { id: 'frost' };
        c.sponsors = [{ id: 'baeckerei', name: 'Bäckerei', rel: 50 }];
        for (const f of c.fixtures[3]) f.result = f.home === humanClub(c).id ? { home: 0, away: 2 } : { home: 2, away: 0 };
        const ctx = ev.needs(c, createRng(3));
        if (!ctx) continue;
        seen++;
        expect(typeof ev.text(c, ctx)).toBe('string');
        for (const o of ev.options) expect(typeof o.effect(c, ctx, createRng(4))).toBe('string');
      }
      expect(id).toBeTruthy();
    }
    expect(seen).toBeGreaterThanOrEqual(8);
  });
});

describe('Chat nach Liga', () => {
  it('Dorfkram nicht in der 3. Liga, Profi-Alltag nicht in der Kreisliga; alle Regeln gehören zu einer Nachricht', () => {
    const ids = new Set(LIFE.map((e) => e.id));
    for (const id of Object.keys(LIFE_FIT)) expect(ids.has(id), id).toBe(true);
    expect(LIFE_FIT.nachbar_hund(at(3))).toBe(true);
    expect(LIFE_FIT.nachbar_hund(at(10))).toBe(false);
    expect(LIFE_FIT.pro_gps(at(3))).toBe(false);
    expect(LIFE_FIT.pro_gps(at(10))).toBe(true);
    expect(LIFE.length).toBeGreaterThanOrEqual(55);
  });
});

describe('Trikotvorlagen nach Farbzahl', () => {
  it('je mindestens sechs Vorlagen mit einer, zwei und drei Farben; alle benannt und malbar', () => {
    const count = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const id of Object.keys(KIT_PATTERNS)) count[patternColors(id)]++;
    expect(count[1]).toBeGreaterThanOrEqual(6);
    expect(count[2]).toBeGreaterThanOrEqual(6);
    expect(count[3]).toBeGreaterThanOrEqual(6);
    for (const id of PATTERN_IDS) expect(KIT_PATTERNS[id], id).toBeTruthy();
    expect(THREE_COLOR.has('trikolore')).toBe(true);
  });
  it('einfarbige Vorlagen malen nur Schattierungen der Hauptfarbe – keine zweite Farbe', () => {
    const seen = new Set();
    const ctx = { set fillStyle(v) { seen.add(v); }, fillRect() {}, globalAlpha: 1 };
    paintKit(ctx, { shirt: 0xc8352f, second: 0x00ff00, third: 0x0000ff, pattern: 'tonstreifen' }, { faces: ['front'] });
    expect(seen.has('#00ff00')).toBe(false);
    expect(seen.has('#0000ff')).toBe(false);
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});
