// Bundespokal mit vollem Teilnehmerfeld (64, ROADMAP 11.9): alle Paarungen jeder Runde, der echte Sieger steht fest.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, simulateSync } from '../src/career/career.js';
import { fieldRound, humanTie, pokalClub, preparePokalMatch, recordPokalResult, startPokal } from '../src/career/pokal.js';
import { FIELD_AMATEURS, FIELD_PROS } from '../src/career/bundespokal.js';

const play = (seed, forceWin = false) => {
  const c = createCareer({ seed });
  c.level = 5;
  c.bundQual = c.season;
  const cup = startPokal(c, 'bund');
  let guard = 0;
  while (!cup.done && guard++ < 40) {
    const t = humanTie(c, 'bund');
    if (t) {
      const p = preparePokalMatch(c, 'bund', t, { duration: 20 });
      simulateSync(p);
      if (forceWin) p.match.score = p.match.teams[0].name === humanClub(c).name ? [3, 0] : [0, 3];
      recordPokalResult(c, p);
    } else {
      for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 0 };
      finishRound(c);
    }
  }
  return { c, cup };
};

describe('Bundespokal: volles Feld', () => {
  it('64 Vereine: 18 Erst-, 18 Zweitligisten, 27 Amateure und der eigene Verein, alle Namen verschieden', () => {
    const pros = FIELD_PROS();
    expect(pros.filter((p) => p.klass === 'erst')).toHaveLength(18);
    expect(pros.filter((p) => p.klass === 'zweit')).toHaveLength(18);
    expect(FIELD_AMATEURS()).toHaveLength(27);
    const all = [...pros, ...FIELD_AMATEURS()];
    expect(new Set(all.map((x) => x.name)).size).toBe(all.length);
    expect(new Set(all.map((x) => x.short)).size).toBe(all.length);
  });

  it('jede Runde halbiert das Feld; nach dem Ausscheiden wird zu Ende gespielt, der Sieger kommt aus dem Feld', () => {
    const { c, cup } = play(21);
    expect(cup.done).toBe(true);
    const rounds = new Set(cup.fieldTies.map((t) => t.round));
    expect(cup.fieldTies).toHaveLength(63 - cup.ties.length); // 63 Spiele im K.-o. mit 64; die eigenen stehen in cup.ties
    expect(rounds.size).toBe(6);
    expect(cup.alive).toHaveLength(1);
    expect(cup.winner).toBe(cup.alive[0]);
    if (cup.out) expect(cup.winner).not.toBe(humanClub(c).id);
    expect(pokalClub(c, cup, cup.winner)?.name).toBeTruthy();
    // Gegner im eigenen Spiel ist immer ein Profi aus dem Feld, der noch dabei war.
    for (const g of cup.guests) expect([...FIELD_PROS(), ...FIELD_AMATEURS()].some((p) => p.id === g.fieldId)).toBe(true);
  }, 120000);

  it('wer alles gewinnt, ist Sieger; in jeder Runde stehen alle Paarungen fest', () => {
    const { c, cup } = play(23, true);
    expect(cup.winner).toBe(humanClub(c).id);
    for (let r = 0; r < 6; r++) expect(fieldRound(cup, r)).toHaveLength([31, 15, 7, 3, 1, 0][r]);
  }, 120000);
});
