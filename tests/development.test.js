// Entwicklung der eigenen Spieler (development.js): verborgene Typen, Liga-Deckel, Durchbruch, geplatzter Knoten.
import { describe, expect, it } from 'vitest';
import { createCareer, developPlayers, humanClub, migrateCareer, playerOf } from '../src/career/career.js';
import { DEV_TYPES, devProfile, environmentChanged, PEAK_AGE, seasonCurve, seasonGain } from '../src/career/development.js';

const BASE = createCareer({ seed: 7 });
const fresh = () => JSON.parse(JSON.stringify(BASE));

// Weg eines gedachten 18-Jährigen über 8 Saisons (ohne Zufall der Werte-Verteilung, ohne Tapetenwechsel).
function path(c, idx, position = 'mid', mul = 1.3) {
  c.players[idx] ??= {};
  let total = 0;
  for (let age = 18; age < 26; age++) total += seasonGain(c, idx, { age, position }, mul, false).gain;
  return total;
}

describe('Entwicklung je Spieler', () => {
  it('Typen kommen in den festgelegten Anteilen vor und hängen nur an Karriere und Spieler', () => {
    const c = fresh();
    const n = 4000;
    const count = {};
    for (let i = 0; i < n; i++) count[devProfile(c, i).type] = (count[devProfile(c, i).type] ?? 0) + 1;
    for (const [t, w] of DEV_TYPES) expect(count[t] / n, t).toBeCloseTo(w, 1);
    expect(devProfile(c, 123)).toEqual(devProfile(fresh(), 123));
  });

  it('Höhepunkt je Position: Stürmer früher als Abwehr, Torhüter am spätesten', () => {
    expect(PEAK_AGE.fwd).toBeLessThan(PEAK_AGE.def);
    expect(PEAK_AGE.gk).toBeGreaterThan(PEAK_AGE.def);
    const prof = { type: 'normal', peak: PEAK_AGE.fwd };
    expect(seasonCurve(prof, 26)).toBe(0); // nach dem Höhepunkt kein Zuwachs mehr
  });

  it('Freizeitliga: deutlich weniger Entwicklung als Bezirksliga – mit Ausreißern nach oben und unten', () => {
    const stats = (level) => {
      const c = fresh();
      c.level = level;
      const xs = Array.from({ length: 3000 }, (_, i) => path(c, i));
      const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
      return { mean, big: xs.filter((v) => v >= mean + 7).length / xs.length, stuck: xs.filter((v) => v <= 3).length / xs.length };
    };
    const low = stats(1);
    const high = stats(5);
    expect(low.mean).toBeLessThan(high.mean * 0.7);
    for (const s of [low, high]) {
      expect(s.big).toBeGreaterThan(0.03); // Durchbrüche gibt es in jeder Liga
      expect(s.big).toBeLessThan(0.15);
      expect(s.stuck).toBeGreaterThan(0.08); // und welche, die hängen bleiben
      expect(s.stuck).toBeLessThan(0.25);
    }
  });

  it('Durchbruch: genau im Alter des Durchbruchs ein großer Sprung', () => {
    const c = fresh();
    c.level = 5;
    const idx = Array.from({ length: 4000 }, (_, i) => i).find((i) => devProfile(c, i).type === 'durchbruch');
    c.players[idx] = {};
    const prof = devProfile(c, idx);
    const at = seasonGain(c, idx, { age: prof.breakAge, position: 'mid' }, 1, false);
    const before = seasonGain(c, idx, { age: prof.breakAge - 1, position: 'mid' }, 1, false);
    expect(at.event).toBe('durchbruch');
    expect(at.gain).toBeGreaterThan(before.gain + 8);
  });

  it('Tapetenwechsel: Neue im Verein, neuer Stil – manchmal platzt der Knoten, Stagnierer entwickeln sich danach normal', () => {
    const c = fresh();
    const club = humanClub(c);
    for (const idx of club.squad) expect(environmentChanged(c, idx, club)).toBe(false); // Gründungskader: nichts Neues
    developPlayers(c); // merkt Trainer und Stil
    club.tactic = { ...(club.tactic ?? {}), style: club.tactic?.style === 'konter' ? 'ballbesitz' : 'konter' };
    expect(environmentChanged(c, club.squad[0], club)).toBe(true);
    let knots = 0;
    let fixed = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      c.players[i] = { devSeen: 0 };
      const r = seasonGain(c, i, { age: 20, position: 'mid' }, 1, true);
      if (r.event === 'knoten') {
        knots++;
        if (r.prof.type === 'stagniert') fixed += c.players[i].devType === 'normal' ? 1 : 0;
      }
    }
    expect(knots / n).toBeGreaterThan(0.08);
    expect(knots / n).toBeLessThan(0.2);
    expect(fixed).toBeGreaterThan(0);
  });

  it('Vorbereitung: Durchbruch steht im Chat, alte Spielstände laden ohne Tapetenwechsel für den Kader', () => {
    const c = fresh();
    for (const idx of humanClub(c).squad) delete c.players[idx].devSeen; // Stand vor dem Update
    const m = migrateCareer(c);
    for (const idx of humanClub(m).squad) expect(m.players[idx].devSeen).toBe(0);
    const before = Object.fromEntries(humanClub(m).squad.map((i) => [i, playerOf(m, i).rating]));
    const rep = developPlayers(m);
    expect(rep.map((r) => r.idx)).toEqual(humanClub(m).squad);
    for (const r of rep) expect(r.before).toBe(before[r.idx]);
  });
});
