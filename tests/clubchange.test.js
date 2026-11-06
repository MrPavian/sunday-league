// Vereinswechsel im Sommer und ligaübergreifend (clubchange.js summerOffers, setSummerMove, moveTo; pressure.js lowerOffers).
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver, table } from '../src/career/career.js';
import { board } from '../src/career/pressure.js';
import { setSummerMove, startCash, summerMove, summerOffers, takeOver } from '../src/career/clubchange.js';
import { ensureLeagues } from '../src/career/pyramid.js';

const me = (c) => humanClub(c);
// Ganze Saison: Die Vereine in `order` gewinnen gegen alle hinter ihnen, sonst 1:1. Der eigene Verein steht an Stelle `myPos`.
function finishAt(c, myPos) {
  const cpu = c.clubs.filter((x) => !x.human).map((x) => x.id);
  const order = [...cpu.slice(0, myPos - 1), me(c).id, ...cpu.slice(myPos - 1)];
  const rank = Object.fromEntries(order.map((id, i) => [id, i]));
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= rank[f.home] < rank[f.away] ? { home: 2, away: 0 } : { home: 0, away: 2 };
    finishRound(c);
  }
}
const playOn = (c) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
    finishRound(c);
  }
};
const consistent = (c) => {
  expect(c.clubs.filter((x) => x.human)).toHaveLength(1);
  expect(new Set(c.clubs.map((x) => x.id)).size).toBe(c.clubs.length);
  for (const x of c.clubs) for (const idx of x.squad) expect(c.players[idx], `${x.id} ${idx}`).toBeTruthy();
  const own = ensureLeagues(c)[c.level].map((d) => d.id);
  expect(own).not.toContain(me(c).id);
};

describe('Anfragen im Sommer', () => {
  it('nur für die ersten drei, als Meister zwei; nichts mitten in der Saison', () => {
    const c = createCareer({ seed: 41 });
    expect(summerOffers(c)).toEqual([]);
    finishAt(c, 4);
    expect(table(c).findIndex((r) => r.club.human) + 1).toBe(4);
    expect(summerOffers(c)).toEqual([]);
    const d = createCareer({ seed: 41 });
    finishAt(d, 3);
    expect(summerOffers(d)).toHaveLength(1);
    expect(summerOffers(d)[0].level).toBe(2);
    const e = createCareer({ seed: 41 });
    finishAt(e, 1);
    expect(summerOffers(e)).toHaveLength(2);
    expect(summerOffers(e)).toEqual(summerOffers(e)); // fest, kein Zufall
  });

  it('Zusage gilt zur neuen Saison: neuer Verein in der Liga darüber, frischer Spielplan, alter Verein spielt als CPU weiter', () => {
    const c = createCareer({ seed: 41 });
    finishAt(c, 3);
    const offer = summerOffers(c)[0];
    const oldId = me(c).id;
    expect(setSummerMove(c, 'gibt-es-nicht')).toBe(false);
    expect(setSummerMove(c, offer.id)).toBe(true);
    expect(summerMove(c)).toMatchObject({ id: offer.id });
    setSummerMove(c, offer.id); // zweiter Tipp: doch bleiben
    expect(summerMove(c)).toBeNull();
    setSummerMove(c, offer.id);
    nextSeason(c);
    expect(me(c).id).toBe(offer.id);
    expect(c.level).toBeGreaterThanOrEqual(2); // dort, wo der Verein jetzt spielt (kann selbst aufgestiegen sein)
    expect(c.round).toBe(0);
    expect(c.summerMove).toBeUndefined();
    expect(c.cash).toBe(startCash(c.level));
    expect(c.pastClubs.at(-1)).toMatchObject({ id: oldId, reason: 'summer', to: 1 });
    expect(ensureLeagues(c)[1].map((d) => d.id)).toContain(oldId);
    expect(c.clubs.some((x) => x.id === oldId)).toBe(false);
    consistent(c);
    expect(c.fixtures.flat().every((f) => c.clubs.some((x) => x.id === f.home) && c.clubs.some((x) => x.id === f.away))).toBe(true);
    playOn(c);
    nextSeason(c);
    consistent(c);
  });

  it('ohne Zusage bleibt alles wie bisher', () => {
    const a = createCareer({ seed: 41 });
    const b = createCareer({ seed: 41 });
    finishAt(a, 3);
    finishAt(b, 3);
    setSummerMove(a, summerOffers(a)[0].id);
    setSummerMove(a, summerOffers(a)[0].id); // wieder abgesagt
    nextSeason(a);
    nextSeason(b);
    expect(me(a).id).toBe(me(b).id);
    expect(a.fixtures).toEqual(b.fixtures);
  });

  it('Meister mit Zusage: steigt der neue Verein mit auf, ist es ein Tausch in derselben Liga', () => {
    const c = createCareer({ seed: 41 });
    finishAt(c, 1);
    const offer = summerOffers(c)[0];
    setSummerMove(c, offer.id);
    nextSeason(c);
    expect(me(c).id).toBe(offer.id);
    consistent(c);
    playOn(c);
    nextSeason(c);
    consistent(c);
  });
});

describe('Entlassung im Sommer: auch ein Angebot von unten', () => {
  it('Angebot aus der Liga darunter, der Wechsel dorthin baut die Liga neu auf', () => {
    const c = createCareer({ seed: 41 });
    finishAt(c, 1);
    nextSeason(c);
    expect(c.level).toBe(2);
    finishAt(c, 3); // Mittelfeld, kein Auf- oder Abstieg
    board(c).trust = 0;
    nextSeason(c);
    const f = board(c).fired;
    expect(f).toBeTruthy();
    expect(f.away).toHaveLength(1);
    const lv = c.level;
    const target = f.away[0];
    expect(target.level).toBe(lv - 1);
    expect(takeOver(c, target.id)).toBe(true);
    expect(me(c).id).toBe(target.id);
    expect(c.level).toBe(lv - 1);
    expect(board(c).fired).toBeNull();
    consistent(c);
    playOn(c);
    nextSeason(c);
    consistent(c);
  });
});
