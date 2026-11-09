// Supercup (europa.js startSuper/playSuper): Sieger des obersten oder zweiten Europapokals spielt zum Saisonstart gegen den Sieger
// des anderen Wettbewerbs – ein Spiel am Mittwoch der ersten Woche, neutral, ohne Verlängerung; Prämien laut UEFA-Rundschreiben 32/2025.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub } from '../src/career/career.js';
import { humanTie, pokalDue, POKALE, preparePokalMatch, recordPokalResult } from '../src/career/pokal.js';
import { advanceEuro, EURO_NAMES, EURO_PRIZES, euroOf, euroSeasonEnd, startSuper } from '../src/career/europa.js';

const qualified = (seed, from = 'eu1') => {
  const c = createCareer({ seed });
  c.level = 12;
  c.superQual = { season: c.season, from };
  c.round = 0;
  return c;
};
const cash = (c) => c.cash;

describe('Supercup', () => {
  it('erfundener Name, Prämien 4 Mio. € je Teilnehmer und 1 Mio. € für den Sieger', () => {
    expect(EURO_NAMES.esc).not.toMatch(/UEFA/);
    expect(POKALE.esc.name).toBe(EURO_NAMES.esc);
    expect(EURO_PRIZES.esc).toEqual({ start: 4000000, winner: 1000000 });
  });

  it('wer den obersten oder zweiten Wettbewerb gewinnt, ist dabei; der dritte nicht', () => {
    for (const [kind, yes] of [['eu1', true], ['eu2', true], ['eu3', false]]) {
      const c = createCareer({ seed: 5 });
      c.level = 12;
      c.pokale = { [kind]: { kind, euro: true, season: c.season, done: true, winner: humanClub(c).id, reached: 'win', field: [], earned: 0, cursor: 0, slots: [] } };
      euroSeasonEnd(c, { pos: 8, level: 12, rows: [] });
      expect(!!c.superQual).toBe(yes);
      if (yes) expect(c.superQual).toEqual({ season: c.season + 1, from: kind });
    }
  });

  it('Mittwoch der ersten Woche gegen den Sieger des anderen Wettbewerbs, neutral, direkt Elfmeterschießen', () => {
    const c = qualified(7, 'eu2');
    const before = cash(c);
    advanceEuro(c);
    const cup = c.pokale.esc;
    expect(cup).toMatchObject({ kind: 'esc', sc: true, season: c.season });
    expect(euroOf(c)).toBe(null); // zählt nicht als Europapokal-Teilnahme der Saison
    expect(cash(c) - before).toBe(4000000);
    expect(pokalDue(c)).toBe('esc');
    const tie = humanTie(c, 'esc');
    expect(tie).toMatchObject({ day: 'wed', neutral: true, stage: 'f' });
    const p = preparePokalMatch(c, 'esc', tie, { duration: 60 });
    expect(p.match.knockout).toBe(true);
    expect(p.match.extraTime).toBe(false);
    p.match.score = [1, 1];
    p.match.shootout = null;
    recordPokalResult(c, p);
    expect(cup.done).toBe(true);
    expect(tie.pens).toBeTruthy();
    expect(c.superQual).toBeUndefined();
    expect(c.superHistory).toHaveLength(1);
    const won = cup.winner === humanClub(c).id;
    expect(cup.earned).toBe(won ? 5000000 : 4000000); // dazu die Abrechnung des Spieltags (Theke, wie beim Endspiel)
    expect(c.week?.midweek?.note ?? '').toMatch(won ? /Sieger/ : /verloren/);
  });

  it('verpasst: in der zweiten Woche ohne uns ausgespielt', () => {
    const c = qualified(9);
    startSuper(c);
    c.round = 1;
    advanceEuro(c);
    expect(c.pokale.esc.done).toBe(true);
    expect(c.pokale.esc.ties[0].quick).toBe(true);
    expect(humanTie(c, 'esc')).toBe(null);
  });
});
