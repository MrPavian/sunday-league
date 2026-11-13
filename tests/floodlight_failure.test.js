// Flutlicht fällt aus (career/clublife.js flutlicht_ausfall): nur mit Flutlicht, einmal je Saison; ein Elektriker im Kader hilft.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { CLUBLIFE_EVENTS } from '../src/career/clublife.js';

const ev = CLUBLIFE_EVENTS.flutlicht_ausfall;
const withLight = (seed = 5) => {
  const c = createCareer({ seed });
  c.facilities ??= {};
  c.facilities.built = { ...(c.facilities.built ?? {}), flutlicht: true };
  c.round = 3;
  return c;
};

describe('Flutlicht fällt aus', () => {
  it('ohne Flutlicht oder zu früh in der Saison: nicht', () => {
    const c = createCareer({ seed: 5 });
    c.round = 3;
    if (c.facilities?.built) delete c.facilities.built.flutlicht;
    expect(ev.needs(c)).toBe(null);
    const d = withLight();
    d.round = 1;
    expect(ev.needs(d)).toBe(null);
  });

  it('Elektriker rufen kostet 150 €, danach diese Saison nicht mehr', () => {
    const c = withLight();
    expect(ev.needs(c)).toEqual({});
    const cash = c.cash;
    expect(ev.text(c, {}).length).toBeGreaterThan(30);
    ev.options[0].effect(c, {}, createRng(1));
    expect(c.cash).toBe(cash - 150);
    expect(ev.needs(c)).toBe(null);
  });

  it('ein Elektriker im Kader repariert umsonst und hebt die Stimmung', () => {
    const c = createCareer({ seed: 5 });
    const idx = humanClub(c).squad.find((i) => i !== c.coach?.idx);
    playerOf(c, idx).profession = 'Elektriker';
    const cash = c.cash;
    const mood = c.mood ?? 0;
    const text = ev.options[1].effect(c, {}, createRng(1));
    expect(text).toContain(playerOf(c, idx).name.split(' ')[0]);
    expect(c.cash).toBe(cash);
    expect(c.mood).toBeGreaterThan(mood);
  });
});
