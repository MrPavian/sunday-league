// Vorstand und Erfolgsdruck (pressure.js) und Vereinswechsel nach der Entlassung (clubchange.js).
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver, table } from '../src/career/career.js';
import { board, PRESSURE, TRUST, trustOf } from '../src/career/pressure.js';
import { startCash, takeOver } from '../src/career/clubchange.js';
import { ensureLeagues } from '../src/career/pyramid.js';

const me = (c) => humanClub(c);
// Ein Spieltag: eigenes Ergebnis wie angegeben, sonst 1:1.
const round = (c, mine, theirs) => {
  for (const f of c.fixtures[c.round]) f.result ??= f.home === me(c).id ? { home: mine, away: theirs } : f.away === me(c).id ? { home: theirs, away: mine } : { home: 1, away: 1 };
  finishRound(c);
};
const at = (level, seed = 21) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};

describe('Rückhalt', () => {
  it('alte Spielstände und die Freizeitliga kennen keinen Druck', () => {
    const old = at(9);
    delete old.pressure;
    delete old.board;
    round(old, 0, 5);
    expect(trustOf(old)).toBeNull();
    const c = at(1);
    const t = board(c).trust;
    for (let i = 0; i < 4; i++) round(c, 0, 5);
    expect(board(c).trust).toBe(t);
    expect(PRESSURE[1]).toBe(0);
  });

  it('Niederlagen kosten oben mehr Rückhalt als unten', () => {
    const lo = at(3);
    const hi = at(9);
    for (const c of [lo, hi]) for (let i = 0; i < 3; i++) round(c, 0, 2);
    expect(TRUST.start - board(hi).trust).toBeGreaterThan(2 * (TRUST.start - board(lo).trust));
  });

  it('unter 25 Ultimatum: vier Punkte aus drei Spielen retten den Job', () => {
    const c = at(9);
    board(c).trust = TRUST.ultimatum + 0.5;
    round(c, 0, 1);
    expect(board(c).ultimatum).toMatchObject({ left: TRUST.games, need: TRUST.need });
    round(c, 2, 0);
    round(c, 1, 1);
    expect(board(c).ultimatum).toBeNull();
    expect(board(c).trust).toBeGreaterThanOrEqual(TRUST.after);
    expect(board(c).fired).toBeNull();
  });

  it('Ultimatum verpasst: entlassen, Angebote aus der Liga; der neue Verein übernimmt Punkte und Spielplan', () => {
    const c = at(9);
    board(c).trust = TRUST.ultimatum - 1;
    round(c, 0, 1);
    for (let i = 0; i < TRUST.games; i++) round(c, 0, 1);
    const f = board(c).fired;
    expect(f?.reason).toBe('coach');
    expect(f.offers.length).toBeGreaterThan(0);
    const oldId = me(c).id;
    const target = f.offers[0];
    const pts = table(c).find((r) => r.club.id === target).pts;
    expect(takeOver(c, 'gibt-es-nicht')).toBe(false);
    expect(takeOver(c, target)).toBe(true);
    expect(me(c).id).toBe(target);
    expect(c.clubs.filter((x) => x.human)).toHaveLength(1);
    expect(table(c).find((r) => r.club.human).pts).toBe(pts);
    expect(c.cash).toBe(startCash(9));
    expect(c.pastClubs.at(-1).id).toBe(oldId);
    expect(board(c)).toMatchObject({ trust: TRUST.newClub, fired: null });
    // Die Liga kennt den alten Verein als CPU-Verein, den neuen nicht doppelt; die Saison läuft weiter.
    const ids = ensureLeagues(c)[9].map((d) => d.id);
    expect(ids).toContain(oldId);
    expect(ids).not.toContain(target);
    while (!seasonOver(c)) round(c, 1, 1);
    nextSeason(c);
    expect(new Set(c.clubs.map((x) => x.id)).size).toBe(c.clubs.length);
    expect(c.clubs.filter((x) => x.human)).toHaveLength(1);
  });
});

describe('Präsident: Misstrauensantrag der Mitglieder', () => {
  const president = () => {
    const c = at(9);
    c.coach.office = 'president';
    c.hired = { name: 'Testtrainer', salary: 0, happy: 50, since: 1 };
    return c;
  };
  it('knapp verloren: der Trainer muss gehen, man bleibt Präsident', () => {
    const c = president();
    board(c).trust = TRUST.ultimatum - 1;
    round(c, 0, 1);
    expect(c.hired).toBeNull();
    expect(c.coach.office).toBe('president');
    expect(board(c).fired).toBeNull();
    expect(board(c).trust).toBe(TRUST.after);
  });
  it('deutlich verloren oder der zweite Antrag binnen zwei Saisons: abgewählt, dann wieder Trainer bei einem neuen Verein', () => {
    const c = president();
    board(c).votes = [c.season];
    board(c).trust = TRUST.ultimatum - 1;
    round(c, 0, 1);
    expect(board(c).fired?.reason).toBe('president');
    expect(takeOver(c, board(c).fired.offers[0])).toBe(true);
    expect(c.coach.office).toBeUndefined();
  });
});
