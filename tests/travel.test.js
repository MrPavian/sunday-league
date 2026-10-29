// Fahrten mit echten Preisen je Person: Spieler zahlen ihren Teil, der Verein gibt einen Zuschuss (Nutzerentscheid
// 2026-10-29); Trainingslager je Liga: Baggersee/eigener Platz, ab Bezirksliga Sportschule, ab Oberliga Belek.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { joinRate, PER_PERSON, setTripShare, travelCost } from '../src/career/travel.js';
import { CLUBLIFE_EVENTS } from '../src/career/clublife.js';
import { createRng } from '../src/core/rng.js';

describe('Fahrtkosten', () => {
  it('Verein zahlt den Zuschuss für alle Mitfahrer; mehr Eigenanteil, weniger Mitfahrer', () => {
    const c = createCareer({ seed: 9 });
    setTripShare(c, 1);
    const full = travelCost(c, 'mallorca');
    expect(full.own).toBe(0);
    expect(full.people).toBe(full.players);
    expect(full.club).toBe(PER_PERSON.mallorca * full.players);
    setTripShare(c, 0);
    const none = travelCost(c, 'mallorca');
    expect(none.club).toBe(0);
    expect(none.people).toBeLessThan(full.people);
    expect(joinRate(5000)).toBe(0.4);
    setTripShare(c, 0.3); // nicht wählbar: bleibt
    expect(travelCost(c, 'harz').share).toBe(0);
  });
});

describe('Trainingslager je Liga', () => {
  const ev = CLUBLIFE_EVENTS.trainingslager;
  const label = (o, c) => (typeof o.label === 'function' ? o.label(c) : o.label);
  it('unten Baggersee, ab Bezirksliga Sportschule, ab Oberliga Belek – Verein zahlt nur den Zuschuss', () => {
    const c = createCareer({ seed: 11 });
    c.round = 0;
    expect(label(ev.options[0], c)).toMatch(/Baggersee|lake/);
    c.level = 5;
    expect(label(ev.options[0], c)).toMatch(/Sportschule|sports school/);
    c.level = 8;
    expect(label(ev.options[0], c)).toMatch(/Belek/);
    c.cash = 10000;
    const k = travelCost(c, 'belek');
    ev.options[0].effect(c, {}, createRng(1));
    expect(c.cash).toBe(10000 - k.club);
    const fitter = humanClub(c).squad.filter((i) => (c.players[i]?.delta?.stamina ?? 0) > 0).length;
    expect(fitter).toBe(k.people); // nur wer mitfährt, wird fitter
  });
});
