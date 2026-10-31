// Rivalitäten (src/career/rivals.js): Punkte mit Gründen, ab RIVAL Derby-Charakter, Abkühlen im Sommer, Wechsel zum Gegner,
// verlorenes Titelrennen.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, humanFixture, prepareMatch, table } from '../src/career/career.js';
import { joinRival } from '../src/career/outcomes.js';
import { addRivalry, finishRound, isRival, nextSeason, RIVAL, rivalList, rivalPoints } from '../src/career/rivals.js';

const oppOf = (c) => {
  const f = humanFixture(c);
  return f.home === humanClub(c).id ? f.away : f.home;
};

describe('Rivalitäten', () => {
  it('Punkte sammeln sich mit Gründen; ab der Schwelle Kreisblatt-Meldung und Derby-Charakter im eigenen Spiel', () => {
    const c = createCareer({ seed: 31 });
    const opp = oppOf(c);
    expect(prepareMatch(c, humanFixture(c), { duration: 30 }).match.derby).toBe(false);
    addRivalry(c, opp, 2, 'Spitzenduell.');
    expect(isRival(c, opp)).toBe(false);
    addRivalry(c, opp, RIVAL - 2, 'Rudelbildung.');
    expect(isRival(c, opp)).toBe(true);
    expect((c.pendingNews ?? []).some((n) => n.includes('Rivalität'))).toBe(true);
    expect(rivalList(c)[0].reasons.map((r) => r.text)).toEqual(['Spitzenduell.', 'Rudelbildung.']);
    expect(prepareMatch(c, humanFixture(c), { duration: 30 }).match.derby).toBe(true);
    addRivalry(c, humanClub(c).id, 5, 'gegen uns selbst');
    expect(rivalList(c)).toHaveLength(1);
  });

  it('kühlt jeden Sommer ab und verschwindet ohne Nachschub', () => {
    const c = createCareer({ seed: 32 });
    const opp = oppOf(c);
    addRivalry(c, opp, 5, 'x');
    nextSeason(c);
    expect(rivalPoints(c, opp)).toBeCloseTo(4.2, 5);
    for (let k = 0; k < 20; k++) nextSeason(c);
    expect(rivalPoints(c, opp)).toBe(0);
  });

  it('Wechsel zum Gegner zählt', () => {
    const c = createCareer({ seed: 33 });
    const opp = oppOf(c);
    const idx = humanClub(c).squad.find((i) => i !== c.coach?.idx);
    expect(joinRival(c, idx, opp)).toBe(true);
    expect(rivalPoints(c, opp)).toBeGreaterThan(0);
    expect(rivalList(c)[0].reasons[0].text).toContain('gewechselt');
  });

  it('Titel knapp verpasst: der Meister wird zum Rivalen', () => {
    const c = createCareer({ seed: 34 });
    const me = humanClub(c).id;
    const champ = c.clubs.find((x) => !x.human).id;
    // Beide gewinnen alles gegen den Rest; im direkten Duell gewinnt der Meister einmal, einmal 1:1 – drei Punkte Abstand.
    let duels = 0;
    for (const round of c.fixtures)
      for (const f of round) {
        const win = (id) => (f.home === id ? { home: 1, away: 0 } : { home: 0, away: 1 });
        const duel = [f.home, f.away].includes(champ) && [f.home, f.away].includes(me);
        f.result = duel ? (duels++ === 0 ? win(champ) : { home: 1, away: 1 }) : f.home === champ || f.away === champ ? win(champ) : f.home === me || f.away === me ? win(me) : { home: 0, away: 0 };
      }
    c.round = c.fixtures.length;
    const rows = table(c);
    expect(rows[0].club.id).toBe(champ);
    expect(rows[1].club.human).toBe(true);
    expect(rows[0].pts - rows[1].pts).toBe(3);
    finishRound(c);
    expect(rivalPoints(c, champ)).toBeGreaterThan(0);
    finishRound(c); // nur einmal je Saison
    expect(rivalList(c).find((r) => r.id === champ).reasons.filter((r) => r.text.includes('Titel'))).toHaveLength(1);
  });
});
