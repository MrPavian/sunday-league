import { describe, expect, it } from 'vitest';
import { clubById, createCareer, finishRound, humanClub, MIN_SQUAD, nextSeason, playerOf, seasonOver, SQUAD_SHAPES, takenIndices } from '../src/career/career.js';
import { EVENTS, advanceArcs } from '../src/career/events.js';
import { STORY_STARTS } from '../src/career/stories.js';
import { CRISES, PERSONAL_EVENTS } from '../src/career/personal.js';
import { SAGA_EVENTS } from '../src/career/sagas.js';
import { SOCIAL_EVENTS } from '../src/career/social.js';
import { BANTER_EVENTS } from '../src/career/banter.js';
import { DERBY_EVENTS } from '../src/career/derby.js';
import { INJURY_EVENTS } from '../src/career/injuries.js';
import { LIFE_EVENTS } from '../src/career/life.js';
import { ACADEMY_EVENTS } from '../src/career/academy.js';
import { SPONSOR_EVENTS } from '../src/career/sponsors.js';
import { CLUBLIFE_EVENTS } from '../src/career/clublife.js';
import { compensation, COMPENSATION_PER_YEAR, POACH_EVENTS, PRO_CLUBS, proSeasonChance } from '../src/career/poaching.js';
import { placeFormers } from '../src/career/memory.js';

// Würfel, der immer „ja" sagt und den ersten Ausgang nimmt.
const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };

function benchCareer() {
  const c = createCareer({ seed: 5 });
  c.flags.derbyRival ??= c.clubs.find((x) => !x.human).id;
  const club = humanClub(c);
  // Drei Spieltage gespielt, einer kaum dabei.
  for (let r = 0; r < 3; r++) for (const f of c.fixtures[r]) f.result = { home: 1, away: 1 };
  const idx = club.squad.find((i) => !c.players[i].grumpy && playerOf(c, i).rating < 60);
  for (const i of club.squad) c.players[i].playShare = i === idx ? 0.5 : 3;
  return { c, club, idx };
}

describe('Ereignisse', () => {
  it('jeder Ereignis-Name kommt nur einmal vor (sonst wird das falsche Ereignis aufgelöst)', () => {
    const pools = { EVENTS, STORY_STARTS, PERSONAL_EVENTS, SAGA_EVENTS, SOCIAL_EVENTS, BANTER_EVENTS, DERBY_EVENTS, INJURY_EVENTS, LIFE_EVENTS, ACADEMY_EVENTS, SPONSOR_EVENTS, POACH_EVENTS, CLUBLIFE_EVENTS, CRISES };
    const seen = {};
    const dupes = [];
    for (const [pool, evs] of Object.entries(pools)) for (const id of Object.keys(evs)) (seen[id] ? dupes.push(`${id}: ${seen[id]} + ${pool}`) : (seen[id] = pool));
    expect(dupes).toEqual([]);
  });
});

describe('Abwerbeversuche anderer Vereine', () => {
  it('wer wenig spielt, bekommt ein Angebot – oft vom Derby-Rivalen', () => {
    const { c, idx } = benchCareer();
    const ctx = POACH_EVENTS.abwerbeversuch.needs(c, yes);
    expect(ctx).toBeTruthy();
    expect(ctx.why).toBe('bench');
    expect(ctx.s).toBe(idx);
    expect(clubById(c, ctx.club)).toBeTruthy();
    expect(POACH_EVENTS.abwerbeversuch.text(c, ctx)).toMatch(/Angebot|offer/);
  });

  it('ziehen lassen: Er spielt danach beim anderen Verein und bleibt als Ehemaliger in Erinnerung', () => {
    const { c, club, idx } = benchCareer();
    const ctx = POACH_EVENTS.abwerbeversuch.needs(c, yes);
    const letGo = POACH_EVENTS.abwerbeversuch.options[3].effect;
    letGo(c, ctx, yes);
    expect(club.squad).not.toContain(idx);
    expect(clubById(c, ctx.club).squad).toContain(idx);
    expect(c.formers[idx].club).toBe(ctx.club);
  });

  it('nach dem Sommer hat der Rivale wieder seine übliche Kadergröße – der Ehemalige bleibt', () => {
    const { c, idx } = benchCareer();
    const ctx = POACH_EVENTS.abwerbeversuch.needs(c, yes);
    POACH_EVENTS.abwerbeversuch.options[3].effect(c, ctx, yes);
    const rival = clubById(c, ctx.club);
    const usual = SQUAD_SHAPES.small.length;
    expect(rival.squad.length).toBe(usual + 1);
    while (!seasonOver(c)) finishRound(c);
    nextSeason(c);
    const after = c.clubs.find((x) => x.id === ctx.club);
    expect(after).toBeTruthy(); // gleiche Liga (kein Aufstieg in diesem Durchlauf)
    expect(after.squad.length).toBe(usual);
    expect(after.squad).toContain(idx);
  });

  it('Einsatz versprechen: Er bleibt – gebrochenes Versprechen macht ihn sauer', () => {
    const { c, club, idx } = benchCareer();
    const ctx = POACH_EVENTS.abwerbeversuch.needs(c, yes);
    POACH_EVENTS.abwerbeversuch.options[1].effect(c, ctx, yes);
    expect(club.squad).toContain(idx);
    expect(c.flags.promise).toEqual({ idx, round: c.round });
    // Nicht eingesetzt, Woche vorbei → Versprechen gebrochen.
    c.round++;
    advanceArcs(c);
    expect(c.players[idx].grumpy).toBe(3);
    // Im selben Jahr wird er nicht noch einmal umworben.
    expect(POACH_EVENTS.abwerbeversuch.needs(c, yes)?.s).not.toBe(idx);
  });
});

describe('Profivertrag (sehr selten)', () => {
  it('nur junge Ausnahmespieler kommen überhaupt in Frage', () => {
    expect(proSeasonChance({ age: 20, rating: 67 })).toBe(0);
    expect(proSeasonChance({ age: 22, rating: 80 })).toBe(0);
    expect(proSeasonChance({ age: 21, rating: 68 })).toBeCloseTo(0.1, 5);
    expect(proSeasonChance({ age: 18, rating: 90 })).toBeCloseTo(0.6, 5); // höchstens 50 %, ×1,2 bis 19
  });

  it('Ausbildungsentschädigung: 5.400 € je Ausbildungsjahr (12–21) beim Verein, mindestens eins', () => {
    const c = createCareer({ seed: 5 });
    const idx = humanClub(c).squad[0];
    const p = playerOf(c, idx);
    p.age = 20;
    c.players[idx].seasons = [{}, {}]; // dritte Saison bei uns: mit 18, 19, 20
    expect(compensation(c, idx)).toBe(3 * COMPENSATION_PER_YEAR);
    p.age = 25;
    c.players[idx].seasons = [];
    expect(compensation(c, idx)).toBe(COMPENSATION_PER_YEAR);
  });

  it('Wechsel zum Profiverein: auch bei knappem Kader, Geld in die Kasse, nie wieder Kreisliga', () => {
    const c = createCareer({ seed: 5 });
    const club = humanClub(c);
    while (club.squad.length > MIN_SQUAD) club.squad.pop();
    const idx = club.squad.find((i) => c.players[i] && !c.players[i].coach) ?? club.squad[0];
    const ctx = { s: idx, club: PRO_CLUBS[0], amount: 10800 };
    const cash = c.cash;
    POACH_EVENTS.profivertrag.options[2].effect(c, ctx, yes);
    expect(club.squad).not.toContain(idx);
    expect(c.cash).toBe(cash + 10800);
    expect(c.formers[idx].pro).toBe(PRO_CLUBS[0]);
    expect(takenIndices(c).has(idx)).toBe(true);
    placeFormers(c);
    expect(c.clubs.some((cl) => cl.squad.includes(idx))).toBe(false);
  });
});
