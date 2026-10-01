import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { ACADEMY_EVENTS, initAcademy } from '../src/career/academy.js';
import { initTeams } from '../src/career/youthteams.js';
import { persona } from '../src/career/kidpersona.js';
import { ageBand, nlzClub, nlzCompensation, nlzTier, passesTrial, scoutsNotice, TRIAL_BAR, yearsAtClub } from '../src/career/nlz.js';
import { PRO_CLUBS } from '../src/career/poaching.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };
const no = { ...yes, chance: () => false };
const kid = (over) => persona({ id: `n${Math.random()}`, name: 'Nico Netz', age: 15, talent: 0.95, joy: 0.7, position: 'fwd', school: 'locker', parent: null, parentSet: true, bloom: 'normal', since: 1, ...over });
function career(seed = 3) {
  const c = createCareer({ seed });
  initAcademy(c);
  initTeams(c);
  c.coach.energy = 1e6;
  return c;
}
const BL = PRO_CLUBS.find((cl) => nlzTier(cl) === 'bl');
const BL2 = PRO_CLUBS.find((cl) => nlzTier(cl) === 'bl2');
const BL3 = PRO_CLUBS.find((cl) => nlzTier(cl) === 'bl3');

describe('Ausbildungsentschädigung nach DFB-Jugendordnung (ab 2024/25)', () => {
  it('B-Jugend: Bundesliga 5.000 € + 400 €, 2. Bundesliga 2.250 € + 200 €, 3. Liga 1.250 € + 100 € je Spieljahr', () => {
    const k = kid({ age: 15, since: 1 }); // seit Saison 1 bei uns, jetzt Saison 3: mit 13, 14, 15
    expect(yearsAtClub(k, 3)).toBe(3);
    expect(nlzCompensation(k, BL, 3)).toBe(5000 + 3 * 400);
    expect(nlzCompensation(k, BL2, 3)).toBe(2250 + 3 * 200);
    expect(nlzCompensation(k, BL3, 3)).toBe(1250 + 3 * 100);
  });

  it('C- und ältere D-Jugend: Bundesliga 3.000 € + 400 € je Spieljahr; andere Ligen holen so junge Spieler bei uns nicht', () => {
    const k = kid({ age: 13, since: 1 });
    expect(ageBand(13)).toBe('younger');
    expect(nlzCompensation(k, BL, 3)).toBe(3000 + 3 * 400);
    expect(nlzCompensation(k, BL2, 3)).toBeNull();
    for (let i = 0; i < 20; i++) expect(nlzTier(nlzClub(k, { next: () => i / 20 }))).toBe('bl');
  });

  it('gezählt wird ab der jüngeren D-Jugend, höchstens sechs Spieljahre, mindestens eins', () => {
    expect(yearsAtClub(kid({ age: 15, since: 1 }), 9)).toBe(5); // seit E-Jugend dabei: 11–15
    expect(yearsAtClub(kid({ age: 15, since: 9 }), 9)).toBe(1); // gerade erst gekommen
    expect(yearsAtClub({ age: 15 }, 4)).toBe(5); // alter Spielstand ohne „since": seit der E-Jugend
  });
});

describe('NLZ-Anfrage', () => {
  it('Scouts sehen Stützpunkt-Kinder und echte Auffälligkeiten – zwischen 12 und 15, jeder nur einmal', () => {
    expect(scoutsNotice(kid({ age: 13, talent: 0.6, stuetzpunkt: true }))).toBe(true);
    expect(scoutsNotice(kid({ age: 13, talent: 0.6 }))).toBe(false);
    expect(scoutsNotice(kid({ age: 11, talent: 0.99, stuetzpunkt: true }))).toBe(false);
    expect(scoutsNotice(kid({ age: 14, talent: 0.95, nlzSeen: true }))).toBe(false);
  });

  it('Probetraining: Es zählt echtes Talent – wer nur groß ist, fällt durch', () => {
    const early = kid({ age: 12, talent: TRIAL_BAR - 0.05, bloom: 'frueh' });
    expect(scoutsNotice(early)).toBe(true); // sieht stark aus …
    expect(passesTrial(early)).toBe(false); // … ist es aber (noch) nicht
    expect(passesTrial(kid({ talent: TRIAL_BAR }))).toBe(true);
  });

  it('bestanden: Wechsel, Entschädigung in die Kasse, Eintrag in Chronik und NLZ-Liste', () => {
    const c = career(4);
    c.youth.kids = [kid({ id: 'n1', name: 'Nico Netz', age: 15, since: c.season })];
    const ctx = ACADEMY_EVENTS.nlz_anfrage.needs(c, yes);
    expect(ctx.club).toBeTruthy();
    expect(ACADEMY_EVENTS.nlz_anfrage.text(c, ctx)).toMatch(/Ausbildungsentschädigung|training compensation/);
    const cash = c.cash;
    const text = ACADEMY_EVENTS.nlz_anfrage.options[0].effect(c, ctx, no); // „no": das Kind sagt nicht nein
    expect(text).toMatch(/Nico/);
    expect(c.youth.kids).toHaveLength(0);
    expect(c.cash).toBe(cash + ctx.amount);
    expect(c.youth.nlz[0]).toMatchObject({ name: 'Nico Netz', club: ctx.club, amount: ctx.amount });
  });

  it('durchgefallen: bleibt, keine Entschädigung; derselbe Verein fragt nicht noch einmal', () => {
    const c = career(5);
    c.youth.kids = [kid({ id: 'n2', name: 'Paul Groß', age: 12, talent: 0.7, bloom: 'frueh', stuetzpunkt: true })];
    const ctx = ACADEMY_EVENTS.nlz_anfrage.needs(c, yes);
    const cash = c.cash;
    ACADEMY_EVENTS.nlz_anfrage.options[1].effect(c, ctx, no);
    expect(c.youth.kids).toHaveLength(1);
    expect(c.cash).toBe(cash);
    expect(ACADEMY_EVENTS.nlz_anfrage.needs(c, yes)).toBeNull();
  });

  it('ohne Scouts in dieser Woche keine Anfrage', () => {
    const c = career(6);
    c.youth.kids = [kid({ id: 'n3', age: 14, stuetzpunkt: true })];
    expect(ACADEMY_EVENTS.nlz_anfrage.needs(c, no)).toBeNull();
  });
});
