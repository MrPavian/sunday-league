import { describe, expect, it } from 'vitest';
import { applyWeather, deepGround, HEAVY_DRAIN } from '../src/career/weather.js';
import { PITCHES } from '../src/sim/pitch.js';
import { SURFACES } from '../src/sim/surfaces.js';

const rain = (month) => ({ id: 'regen', month, temp: 8, leaves: false, windDir: 1 });

describe('Tiefer Platz (ROADMAP 11.17 Punkt 9)', () => {
  it('Regen im Herbst und Winter auf Rasen: Ball bremst stärker, Laufen kostet mehr', () => {
    const p = applyWeather(PITCHES.rasenplatz, rain(11));
    expect(p.surface.deep).toBe(true);
    expect(p.surface.rollDecel).toBeGreaterThan(PITCHES.rasenplatz.surface.rollDecel);
    expect(p.heavy).toBe(HEAVY_DRAIN);
  });
  it('Regen im Spätsommer: nur nass, der Ball rutscht schneller', () => {
    const p = applyWeather(PITCHES.rasenplatz, rain(9));
    expect(p.surface.deep).toBeUndefined();
    expect(p.surface.rollDecel).toBeLessThan(PITCHES.rasenplatz.surface.rollDecel);
    expect(p.heavy).toBe(1);
  });
  it('Kunstrasen und Asphalt werden nicht tief', () => {
    expect(deepGround(rain(11), SURFACES.artificial.id)).toBe(false);
    expect(deepGround(rain(11), SURFACES.asphalt.id)).toBe(false);
    expect(deepGround(rain(11), SURFACES.ash.id)).toBe(true);
    expect(deepGround({ ...rain(11), id: 'sonne' }, SURFACES.grass.id)).toBe(false);
  });
});
