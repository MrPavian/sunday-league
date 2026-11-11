// Privatleben des Trainers (privat.js): eigenes Konto, Käufe mit Wirkung, Trainertypus, Familienereignisse.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, currentFixtures } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { coachRep } from '../src/career/natcoach.js';
import { auftreten, buy, buyLux, donate, EXPECT, GOODS, PAY, priceOf, privat, privatOn, PRIVAT_EVENTS, seasonIncome, seasonPrivat, setHeavy, setPartnerSex, takeTrip, TRIP, typus, upkeep, weeklyIncome, weeklyPrivat } from '../src/career/privat.js';

const coach = (extra = {}) => ({ first: 'Erika', last: 'Test', style: 'spielmacher', mode: 'coachOnly', relation: 'single', children: [], ...extra });
const make = (seed = 5, input = coach()) => createCareer({ seed, coach: input });
const run = (id, c, option, seed = 1) => {
  const ev = PRIVAT_EVENTS[id];
  const ctx = ev.needs(c);
  expect(ctx, `${id} nicht möglich`).not.toBe(null);
  ev.text(c, ctx);
  return ev.options[option].effect(c, ctx, createRng(seed));
};

describe('Privates Konto', () => {
  it('nur für selbst angelegte Trainer; alte Spielstände bleiben ohne', () => {
    const old = createCareer({ seed: 5 });
    expect(privatOn(old)).toBe(false);
    weeklyPrivat(old);
    expect(old.coach.privat).toBeUndefined();
    expect(privatOn(make())).toBe(true);
  });

  it('Einkommen je Liga: Beruf bis Oberliga, Verein ab Bezirksliga, eine Saison ergibt das Jahreseinkommen', () => {
    const c = make();
    expect(seasonIncome(c)).toBe(PAY.job);
    c.level = 5;
    expect(seasonIncome(c)).toBe(PAY.job + 3000);
    c.level = 9;
    expect(seasonIncome(c)).toBe(35000);
    c.level = 12;
    expect(seasonIncome(c)).toBe(1400000);
    const n = c.fixtures.length;
    for (let i = 0; i < n; i++) weeklyPrivat(c);
    expect(Math.abs(privat(c).wallet - 1400000)).toBeLessThan(n);
    expect(weeklyIncome(c)).toBe(Math.round(1400000 / n));
  });

  it('die Vereinskasse zahlt das Gehalt nicht zusätzlich', () => {
    const a = make(9);
    const b = createCareer({ seed: 9, coach: coach() });
    delete b.coach.relation; // ohne Privatleben
    for (const c of [a, b]) {
      for (const f of currentFixtures(c)) f.result = { home: 1, away: 1 };
      finishRound(c);
    }
    expect(a.cash).toBe(b.cash);
    expect(privat(a).wallet).toBe(weeklyIncome(a));
  });
});

describe('Kaufen und Wirkung', () => {
  it('kaufen nur mit Geld; beim Wechsel gibt es einen Teil zurück; Unterhalt je Saison', () => {
    const c = make();
    expect(buy(c, 'car', 1)).toBe(false);
    privat(c).wallet = 50000;
    expect(buy(c, 'car', 1)).toBe(true);
    expect(privat(c).wallet).toBe(42000);
    expect(priceOf(c, 'car', 2)).toEqual({ price: 35000, refund: 4000, net: 31000 });
    expect(buy(c, 'car', 2)).toBe(true);
    expect(privat(c).wallet).toBe(11000);
    expect(upkeep(c)).toBe(GOODS.car.tiers[2].upkeep);
    const before = privat(c).wallet;
    expect(seasonPrivat(c).cost).toBe(2500);
    expect(privat(c).wallet).toBe(before - 2500);
    expect(buy(c, 'car', 0)).toBe(true); // verkaufen bringt die Hälfte
    expect(privat(c).wallet).toBe(before - 2500 + 17500);
  });

  it('Auftreten: Protz im Amateurverein drückt die Stimmung, passend im Profifußball hebt den Ruf', () => {
    const c = make();
    privat(c).wallet = 5e6;
    buy(c, 'car', 4);
    expect(auftreten(c).kind).toBe('protz');
    c.mood = 0;
    c.round = 3;
    weeklyPrivat(c);
    expect(c.mood).toBeLessThan(0);
    expect(c.pendingNews.at(-1)).toMatch(/Kabine/);
    c.level = 12;
    c.pro = true;
    expect(auftreten(c).kind).toBe('schlicht'); // 4 von üblichen 10
    const low = coachRep(c);
    buy(c, 'home', 3);
    buy(c, 'wear', 3);
    expect(auftreten(c)).toMatchObject({ glanz: 10, expect: EXPECT(12), kind: 'passend' });
    expect(coachRep(c)).toBe(low + 3);
  });

  it('Zuhause und Auto helfen im Alltag; Fernreise einmal je Saison', () => {
    const c = make();
    privat(c).wallet = 1e6;
    buy(c, 'home', 1);
    buy(c, 'car', 1);
    c.coach.patience = 50;
    c.coach.energy = 50;
    c.round = 0;
    weeklyPrivat(c);
    expect(c.coach.patience).toBe(51);
    c.round = 1;
    weeklyPrivat(c);
    expect(c.coach.energy).toBe(51);
    expect(takeTrip(c)).toBe(true);
    expect(c.coach.patience).toBe(51 + TRIP.patience);
    expect(takeTrip(c)).toBe(false);
  });

  it('Trainertypus ergibt sich aus dem Verhalten', () => {
    const c = make();
    expect(typus(c)).toBe('boden');
    const p = privat(c);
    p.wallet = 10000;
    p.earned = 10000;
    expect(typus(c)).toBe('sparfuchs');
    const cash = c.cash;
    expect(donate(c)).toBe(1000);
    expect(c.cash).toBe(cash + 1000);
    donate(c);
    donate(c);
    expect(typus(c)).toBe('wohltaeter');
    const d = make(6);
    privat(d).wallet = 1e6;
    buyLux(d, 'boot');
    buyLux(d, 'uhr');
    expect(typus(d)).toBe('lebemann');
  });
});

describe('Familienereignisse', () => {
  it('kennenlernen (Frau oder Mann), zusammenziehen, heiraten, Kind', () => {
    for (const [opt, sex, label] of [[0, 'w', 'Deine Frau'], [1, 'm', 'Dein Mann']]) {
      const c = make(11);
      privat(c);
      c.round = 3;
      run('priv_kennenlernen', c, opt);
      expect(c.coach).toMatchObject({ relation: 'beziehung', partnerSex: sex });
      expect(c.coach.partnerName).toBeTruthy();
      expect(PRIVAT_EVENTS.priv_kennenlernen.needs(c)).toBe(null);
      c.round = 7;
      run('priv_zusammenziehen', c, 0);
      expect(c.coach.flags.together).toBe(true);
      expect(PRIVAT_EVENTS.priv_hochzeit.needs(c)).toBe(null); // erst in der nächsten Saison
      c.season = 2;
      privat(c).wallet = 1000;
      run('priv_hochzeit', c, 0);
      expect(c.coach.relation).toBe('verheiratet');
      expect(c.coach.partner).toBe(label);
      expect(privat(c).wallet).toBe(500);
      run('priv_nachwuchs', c, 0);
      expect(c.coach.children).toHaveLength(1);
      expect(c.coach.children[0].age + (c.season - 1)).toBe(0);
      expect(c.coach.awayWeeks).toBe(2);
      expect(c.coach.family).toMatch(/ein Kind|one child/);
    }
  });

  it('großes Fest nur mit Geld', () => {
    const c = make(12, coach({ relation: 'beziehung' }));
    privat(c);
    c.season = 2;
    expect(c.coach.partnerName).toBeTruthy(); // bestehende Beziehung bekommt einen Namen
    run('priv_hochzeit', c, 1);
    expect(c.coach.relation).toBe('beziehung');
  });

  it('Krise bis Trennung: nach einer Ehe geht die Hälfte des Kontos; abschaltbar', () => {
    const c = make(13, coach({ relation: 'verheiratet', children: [{ name: 'Mia', age: 4, sex: 'w' }] }));
    privat(c).wallet = 20000;
    c.coach.patience = 30;
    run('priv_krise', c, 2);
    expect(PRIVAT_EVENTS.priv_krise.needs(c)).toBe(null); // nicht gleich wieder
    c.round = 6;
    run('priv_krise', c, 2);
    expect(c.coach.krisen).toBe(2);
    c.coach.patience = 10;
    setHeavy(c, false);
    expect(PRIVAT_EVENTS.priv_trennung.needs(c)).toBe(null);
    expect(PRIVAT_EVENTS.priv_trauer.needs(c)).toBe(null);
    setHeavy(c, true);
    const text = run('priv_trennung', c, 1);
    expect(text).toMatch(/Scheidung|divorce/);
    expect(c.coach.relation).toBe('single');
    expect(privat(c).wallet).toBe(10000);
    expect(c.coach.children).toHaveLength(1);
    expect(c.coach.patience).toBe(60);
    c.round = 12;
    c.season = 2;
    expect(PRIVAT_EVENTS.priv_kennenlernen.needs(c)).not.toBe(null); // neue Partnerschaft möglich
  });

  it('Einschulung mit sechs; Partnerin/Partner umstellbar', () => {
    const c = make(14, coach({ relation: 'verheiratet', children: [{ name: 'Paul', age: 6, sex: 'm' }] }));
    privat(c);
    run('priv_einschulung', c, 0);
    expect(c.coach.noTraining).toBe(1);
    expect(PRIVAT_EVENTS.priv_einschulung.needs(c)).toBe(null);
    expect(setPartnerSex(c, 'm')).toBe(true);
    expect(c.coach.partner).toBe('Dein Mann');
  });
});
