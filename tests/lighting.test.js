import { describe, expect, it } from 'vitest';
import { FLOOD, LOOKS, MOODS, moodOf, pickTimeOfDay, resolveLighting, shadowBias, TIME_IDS, TIMES, VENUES } from '../src/render/lighting.js';

const venues = Object.keys(VENUES);
const moods = Object.keys(MOODS);

describe('Lichtpakete', () => {
  it('sind für jede Kombination vollständig und endlich', () => {
    for (const venue of venues) for (const mood of moods) for (const time of TIME_IDS) {
      const L = resolveLighting({ venue, mood, time });
      const nums = [L.sun.intensity, L.hemi.intensity, L.rim.intensity, L.shadow, L.wetness, L.emissive, ...L.sun.dir, ...L.post.tint, L.post.saturation, L.post.contrast, L.post.brightness];
      expect(nums.every(Number.isFinite), `${venue}/${mood}/${time}`).toBe(true);
      expect(L.shadow).toBeGreaterThanOrEqual(0);
      expect(L.shadow).toBeLessThanOrEqual(1);
      // Sonne immer von vorn (Kameraseite) und über dem Horizont: kein Gegenlicht.
      expect(L.sun.dir[1]).toBeGreaterThan(0.2);
      expect(L.sun.dir[2]).toBeGreaterThan(0);
    }
  });

  it('Palette bleibt: Farbkorrektur nur sparsam', () => {
    for (const venue of venues) for (const mood of moods) for (const time of TIME_IDS) {
      const { post } = resolveLighting({ venue, mood, time });
      for (const t of post.tint) {
        expect(t).toBeGreaterThan(0.78);
        expect(t).toBeLessThan(1.2);
      }
      expect(post.saturation).toBeGreaterThan(0.6);
      expect(post.saturation).toBeLessThan(1.35);
      expect(post.contrast).toBeGreaterThan(0.85);
      expect(post.contrast).toBeLessThan(1.25);
      expect(post.brightness).toBeGreaterThan(0.9);
      expect(post.brightness).toBeLessThan(1.1);
    }
  });

  it('Tageszeiten unterscheiden sich sichtbar', () => {
    const at = (time) => resolveLighting({ venue: 'rasenplatz', time });
    expect(at('AFTERNOON').sun.elevation).toBeLessThan(at('DAY').sun.elevation);
    expect(at('MORNING').sun.elevation).toBeLessThan(at('DAY').sun.elevation);
    expect(at('AFTERNOON').post.tint[2]).toBeLessThan(at('MORNING').post.tint[2]); // nachmittags wärmer
    expect(at('EVENING').flood).toBe(1);
    expect(at('EVENING').emissive).toBe(1);
    expect(at('DAY').flood).toBe(0);
    expect(at('DAY').emissive).toBe(0);
  });

  it('Wetter: Bewölkt/Regen/Nebel flacher, Regen nass, Frost mit flacher Sonne', () => {
    const at = (mood) => resolveLighting({ venue: 'parkplatz', mood, time: 'DAY' });
    const clear = at('CLEAR');
    for (const m of ['OVERCAST', 'RAIN', 'FOG']) {
      expect(at(m).sun.intensity).toBeLessThan(clear.sun.intensity);
      expect(at(m).shadow).toBeLessThan(clear.shadow);
    }
    expect(at('RAIN').wetness).toBeGreaterThan(0.5);
    expect(clear.wetness).toBe(0);
    expect(at('FROST').sun.elevation).toBeLessThan(clear.sun.elevation);
    expect(at('HEAT').sun.intensity).toBeGreaterThan(clear.sun.intensity);
    expect(at('FOG').post.fogAmount).toBeGreaterThan(clear.post.fogAmount);
  });

  it('Halle: immer INDOOR, kein Gegenlicht, weiche Schatten, Lampen an', () => {
    for (const mood of moods) for (const time of TIME_IDS) {
      const L = resolveLighting({ venue: 'halle', mood, time });
      expect(L.time).toBe('INDOOR');
      expect(L.rim.intensity).toBe(0);
      expect(L.shadow).toBeLessThan(0.6);
      expect(L.emissive).toBe(1);
      expect(L.wetness).toBe(0);
    }
  });

  it('Flutlicht: Spielfeld bleibt abends hell genug für die Spieler', () => {
    // Stadion: Grundlicht, die Lichtpools der Masten machen es voll hell.
    // Auf dem Feld ist es heller als in der Umgebung, aber nie zu dunkel für die Spieler:
    // Helligkeit = Nacht + (Flutlicht − Nacht) · Feldlicht.
    for (const venue of ['rasenplatz', 'ascheplatz', 'parkplatz', 'park', 'hinterhof']) {
      const { floodField } = resolveLighting({ venue, time: 'EVENING' });
      const worst = FLOOD.night.map((n, i) => n + (FLOOD.color[i] - n) * floodField);
      expect(Math.min(...worst), venue).toBeGreaterThan(0.6);
    }
  });

  it('reduzierte Farbkorrektur (grade) bewahrt den Wetter-Look', () => {
    const full = resolveLighting({ venue: 'rasenplatz', mood: 'RAIN', time: 'AFTERNOON' });
    const half = resolveLighting({ venue: 'rasenplatz', mood: 'RAIN', time: 'AFTERNOON', grade: 0 });
    expect(half.post.tint).toEqual(LOOKS.rain.tint);
    expect(full.post.tint).not.toEqual(half.post.tint);
  });
});

describe('Tageszeit und Stimmung eines Spiels', () => {
  it('fest je Seed, alle Tageszeiten kommen vor, Halle nie Abend', () => {
    const seen = new Set();
    for (let s = 1; s < 400; s++) {
      expect(pickTimeOfDay(s, 'rasenplatz')).toBe(pickTimeOfDay(s, 'rasenplatz'));
      seen.add(pickTimeOfDay(s, 'rasenplatz'));
      expect(pickTimeOfDay(s, 'halle')).toBe('INDOOR');
      expect(pickTimeOfDay(s, 'rasenplatz', 'HEAT')).not.toBe('EVENING');
    }
    for (const t of TIME_IDS) expect(seen.has(t)).toBe(true);
  });

  it('liest das Wetter nur aus', () => {
    const m = { weather: null, pitch: { heat: 1, wind: null } };
    expect(moodOf(m)).toBe('CLEAR');
    expect(moodOf({ ...m, weather: 'rain' })).toBe('RAIN');
    expect(moodOf({ ...m, pitch: { heat: 1.35 } })).toBe('HEAT');
    expect(moodOf({ ...m, pitch: { wind: { x: 3 } } })).toBe('OVERCAST');
    expect(Object.keys(TIMES)).toContain('INDOOR');
  });

  it('flache Sonne bekommt mehr Schattenversatz', () => {
    expect(shadowBias(20).normalBias).toBeGreaterThan(shadowBias(60).normalBias);
    expect(shadowBias(20).bias).toBeLessThan(shadowBias(60).bias);
  });
});
