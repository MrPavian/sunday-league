// Ereignisse für Zweite, Frauen, Nationalteam und Fans (src/career/teamevents.js): nur wenn es den Bereich gibt, jede Antwort
// läuft durch und liefert einen Text, alle sind wöchentlich ziehbar.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, migrateCareer } from '../src/career/career.js';
import { registerReserve } from '../src/career/reserve.js';
import { women } from '../src/career/women.js';
import { rolledEventIds } from '../src/career/events.js';
import { TEAM_EVENTS } from '../src/career/teamevents.js';
import { createRng } from '../src/core/rng.js';

const clone = (c) => migrateCareer(JSON.parse(JSON.stringify(c)));
const RESERVE = ['zweite_empfehlung', 'zweite_personalnot', 'zweite_trainingszeit'];
const WOMEN = ['frauen_sponsor', 'frauen_platzzeit', 'frauen_auswahl'];
const NAT = ['nat_doppelamt', 'nat_absage', 'nat_trikot'];
const FANS = ['fan_choreo', 'fan_zaunfahne', 'fan_pyro'];

const withReserve = () => {
  const c = createCareer({ seed: 12 });
  c.level = 9;
  registerReserve(c);
  c.reserve.round = 5;
  for (const idx of humanClub(c).squad.slice(-4)) c.players[idx] = { ...(c.players[idx] ?? {}), apps2: 4 };
  return c;
};
const withWomen = () => {
  const c = createCareer({ seed: 5 });
  c.saga.frauen = { founded: 0, captain: 'Lena Kaya', strength: 0.35, seasons: [], ...{} };
  return clone(c);
};

function runAll(c, ids) {
  for (const id of ids) {
    const e = TEAM_EVENTS[id];
    const ctx = e.needs(c, createRng(3));
    expect(ctx, id).not.toBe(null);
    expect(typeof e.text(c, ctx)).toBe('string');
    e.options.forEach((o, i) => {
      const copy = clone(c);
      const out = o.effect(copy, ctx, createRng(10 + i));
      expect(typeof out, `${id} Antwort ${i}`).toBe('string');
      expect(out.length).toBeGreaterThan(10);
    });
  }
}

describe('Ereignisse Zweite und Frauen', () => {
  it('ohne Mannschaft kommen sie nicht', () => {
    const c = createCareer({ seed: 12 });
    for (const id of [...RESERVE, ...WOMEN]) expect(TEAM_EVENTS[id].needs(c, createRng(1)), id).toBe(null);
  });

  it('mit Zweiter: drei Ereignisse, jede Antwort läuft', () => runAll(withReserve(), RESERVE));

  it('mit Frauenteam: drei Ereignisse, jede Antwort läuft', () => {
    const c = withWomen();
    expect(women(c)?.league).toBeTruthy();
    runAll(c, WOMEN);
  });

  it('Nationalteam: nur als Nationaltrainer oder mit nominiertem Spieler (ab Stufe 9)', () => {
    const c = createCareer({ seed: 12 });
    c.level = 9;
    for (const id of NAT) expect(TEAM_EVENTS[id].needs(c, createRng(1)), id).toBe(null);
    c.natCoach = { nid: 'ger', since: 1 };
    c.natCups = [{ id: 'wm', done: false, own: { ger: [humanClub(c).squad[0]] } }];
    runAll(c, NAT);
    const after = clone(c);
    TEAM_EVENTS.nat_doppelamt.options[2].effect(after, { nid: 'ger' }, createRng(1));
    expect(after.natCoach).toBeUndefined();
  });

  it('Fans: ab der Liga, für die sie gedacht sind', () => {
    const low = createCareer({ seed: 12 });
    low.level = 2;
    for (const id of FANS) expect(TEAM_EVENTS[id].needs(low, createRng(1)), id).toBe(null);
    const c = createCareer({ seed: 12 });
    c.level = 6;
    runAll(c, FANS);
    c.level = 9;
    for (const id of FANS) expect(TEAM_EVENTS[id].needs(c, createRng(1)), id).toBe(null);
  });

  it('alle werden wöchentlich gezogen', () => {
    const ids = new Set(rolledEventIds());
    for (const id of Object.keys(TEAM_EVENTS)) expect(ids.has(id), id).toBe(true);
  });
});
