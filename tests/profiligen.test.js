// Profiligen (Konzept Profiligen, Nutzerentscheid 2026-11-05): Regionalliga bis 1. Liga, Verträge, Zulassung, Aufstiegsverzicht.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, playerOf, seasonOver, table } from '../src/career/career.js';
import { maxLevel, MAX_LEVEL, PRO_MAX_LEVEL } from '../src/career/clubs.js';
import { facilities } from '../src/career/facilities.js';
import { championWaives, cpuWaives, licenseNeeds, licensed, promotionBlock, setWaive, WAIVE_SHARE } from '../src/career/license.js';
import { CONTRACT, contractOf, extend, extendOffer, nextSeason as contractsNextSeason, payroll, perRound, salaryDemand, sign, transferFee } from '../src/career/contracts.js';
import { priceOf } from '../src/career/transfers.js';
import { trainingFee } from '../src/career/transferrules.js';
import { PRO_TARGET } from '../src/sim/niveau.js';
import { relegationNeeded } from '../src/career/relegation.js';

const me = (c) => humanClub(c);
const play = (c, mine = 2, theirs = 0) => {
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= f.home === me(c).id ? { home: mine, away: theirs } : f.away === me(c).id ? { home: theirs, away: mine } : { home: 1, away: 1 };
    finishRound(c);
  }
};
const top11 = (c, club) => {
  const r = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11);
  return r.reduce((s, x) => s + x, 0) / r.length;
};
const license = (c, ...ids) => {
  const f = facilities(c);
  for (const id of ids) f.built[id] = c.season;
  c.cash = 1e6;
};

describe('Profiligen: Stufen und alte Spielstände', () => {
  it('neue Karrieren reichen bis zur 1. Liga, alte bleiben bei der Oberliga', () => {
    const c = createCareer({ seed: 3 });
    expect(maxLevel(c)).toBe(PRO_MAX_LEVEL);
    expect(PRO_MAX_LEVEL).toBe(12);
    const old = createCareer({ seed: 3 });
    delete old.pro;
    expect(maxLevel(old)).toBe(MAX_LEVEL);
    expect(licenseNeeds(old, 9)).toEqual([]);
    expect(cpuWaives(old, 3, 'x')).toBe(false);
    expect(promotionBlock(old, 8)).toBeNull();
  });

  it('ohne Zulassung kein Aufstieg in die Regionalliga; mit Stadion, Flutlicht und Rücklage schon – die Gegner haben Regionalliga-Niveau', () => {
    const c = createCareer({ seed: 5 });
    c.level = 8;
    c.cash = 0;
    play(c);
    expect(licensed(c, 9)).toBe(false);
    nextSeason(c);
    expect(c.level).toBe(8);
    expect(c.history.at(-1).upBlock).toBe('license');
    play(c);
    license(c, 'stadion', 'flutlicht');
    expect(licensed(c, 9)).toBe(true);
    nextSeason(c);
    expect(c.level).toBe(9);
    const others = c.clubs.filter((x) => !x.human).map((x) => top11(c, x));
    const mean = others.reduce((s, x) => s + x, 0) / others.length;
    expect(Math.abs(mean - PRO_TARGET[9])).toBeLessThan(12);
  });
});

describe('Verträge', () => {
  const pro = () => {
    const c = createCareer({ seed: 7 });
    c.level = 8;
    play(c);
    license(c, 'stadion', 'flutlicht');
    nextSeason(c);
    expect(c.level).toBe(9);
    return c;
  };

  it('nach dem Aufstieg bekommt jeder Spieler einen Vertrag; die Gehälter gehen je Spieltag ab (Monat × 12 / 34)', () => {
    const c = pro();
    const squad = me(c).squad.filter((i) => i !== c.coach?.idx);
    for (const idx of squad) expect(contractOf(c, idx)).toBeTruthy();
    const pay = payroll(c);
    expect(pay.round).toBe(perRound(pay.monthly, 9));
    expect(pay.round).toBe(Math.round((pay.monthly * 12) / CONTRACT.rounds[9]));
    c.cash = 1e6;
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 1 };
    finishRound(c); // die Woche wird mit dem Spieltag abgerechnet
    // Abgerechnet wird der Kader zum Zahltag: Wer in der Woche abgeworben wurde (gegen Ablöse), bekommt kein Gehalt mehr.
    const now = payroll(c);
    expect(now.n).toBeGreaterThan(0);
    expect(c.ledger.some((e) => /Gehälter|Wages/.test(e.text) && e.amount === -now.round)).toBe(true);
  });

  it('Gehalt nach Stärke: Liga-Niveau verdient den Schnitt, eine Liga darüber das 6,5-Fache', () => {
    const c = pro();
    const idx = me(c).squad[1];
    const rating = playerOf(c, idx).rating;
    const want = CONTRACT.mean[9] * Math.max(CONTRACT.min, Math.min(CONTRACT.spread, CONTRACT.spread ** ((rating - PRO_TARGET[9]) / CONTRACT.span)));
    expect(Math.abs(salaryDemand(c, idx) - want)).toBeLessThanOrEqual(50);
  });

  it('auslaufende Verträge: verlängern mit Aufschlag, wer sauer ist, will nicht; sonst geht er ablösefrei', () => {
    const c = pro();
    // Kader über den Mindestkader (Spielerzahl + 3) auffüllen – sonst greift die Notverlängerung (Test unten).
    const extra = c.clubs.find((x) => !x.human).squad.splice(0, 10);
    me(c).squad.push(...extra);
    for (const idx of extra) sign(c, idx, 3);
    const [a, b] = me(c).squad.filter((i) => i !== c.coach?.idx);
    contractOf(c, a).until = c.season;
    contractOf(c, b).until = c.season;
    const o = extendOffer(c, a);
    expect(o.salary).toBeGreaterThanOrEqual(salaryDemand(c, a));
    expect(extend(c, a, 2)).toBe(true);
    expect(contractOf(c, a).until).toBe(c.season + 2);
    c.players[b].grumpy = 2;
    expect(extend(c, b, 1)).toBe(false);
    c.season++;
    contractsNextSeason(c);
    expect(me(c).squad).toContain(a);
    expect(me(c).squad).not.toContain(b);
  });

  it('Notverlängerung: Laufen zu viele Verträge aus, bleiben die Besten ein Jahr – der Kader fällt nie unter Spielerzahl + 3', () => {
    const c = pro();
    const squad = me(c).squad.filter((i) => i !== c.coach?.idx);
    for (const idx of squad) contractOf(c, idx).until = c.season;
    const before = me(c).squad.length;
    c.season++;
    contractsNextSeason(c);
    expect(me(c).squad.length).toBe(Math.min(before, 11 + 3));
    for (const idx of me(c).squad.filter((i) => i !== c.coach?.idx)) expect(contractOf(c, idx).until).toBe(c.season);
  });

  it('Spieler eines Profivereins kosten Ablöse statt Ausbildungsentschädigung', () => {
    const c = pro();
    const other = c.clubs.find((x) => !x.human);
    const idx = other.squad[0];
    expect(priceOf(c, idx, 'summer')).toBe(transferFee(c, idx, 9));
    expect(priceOf(c, idx, 'summer')).toBeGreaterThan(trainingFee(9, 9));
  });
});

describe('Aufstiegsverzicht', () => {
  it('der eigene Verein kann verzichten und bleibt in der Liga', () => {
    const c = createCareer({ seed: 9 });
    c.level = 4;
    play(c);
    setWaive(c, true);
    nextSeason(c);
    expect(c.level).toBe(4);
    expect(c.history.at(-1).upBlock).toBe('waived');
  });

  it('der Meister der 3. Liga braucht die Zulassung der 2. Liga (Arena, Rasenheizung, 1200 Lux); die besten vier spielen den überregionalen Pokal', () => {
    const c = createCareer({ seed: 11 });
    c.level = 10;
    play(c);
    nextSeason(c);
    expect(c.level).toBe(10);
    expect(c.history.at(-1).upBlock).toBe('license');
    expect(c.bundQual).toBe(c.season);
    const d = createCareer({ seed: 11 });
    d.level = 10;
    play(d);
    license(d, 'stadion', 'flutlicht', 'drittliga', 'flutlicht800', 'arena', 'rasenheizung', 'flutlicht1200');
    d.cash = 1e8;
    nextSeason(d);
    expect(d.level).toBe(11);
  });

  it('2. Liga und 1. Liga: ganz oben kein Aufstieg mehr, alle spielen den überregionalen Pokal', () => {
    const c = createCareer({ seed: 11 });
    c.level = 12;
    play(c);
    nextSeason(c);
    expect(c.level).toBe(12);
    expect(c.history.at(-1).upBlock).toBe('top');
    expect(c.bundQual).toBe(c.season);
    const z = createCareer({ seed: 12 });
    z.level = 11;
    play(z, 0, 0);
    nextSeason(z);
    expect(z.bundQual).toBe(z.season);
    expect(licenseNeeds(z, 12).map((x) => x.id)).toEqual(['stadion', 'rasen', 'flutlicht', 'geld']);
  });

  it('CPU-Meister verzichten unten öfter als oben, etwa im eingestellten Anteil', () => {
    const c = createCareer({ seed: 1 });
    const share = (level) => {
      let n = 0;
      for (let i = 0; i < 4000; i++) if (cpuWaives({ ...c, season: i }, level, `club${i % 7}`)) n++;
      return n / 4000;
    };
    expect(Math.abs(share(1) - WAIVE_SHARE[1])).toBeLessThan(0.03);
    expect(Math.abs(share(9) - WAIVE_SHARE[9])).toBeLessThan(0.03);
    expect(share(1)).toBeGreaterThan(share(9));
  });

  it('verzichtet der Meister der eigenen Liga, steigt der Zweite direkt auf – ohne Relegation', () => {
    let c;
    for (let seed = 1; seed < 400; seed++) {
      const x = createCareer({ seed });
      x.level = 3;
      const leader = x.clubs.find((k) => !k.human).id;
      for (const round of x.fixtures) for (const f of round) {
        const inv = (id) => f.home === id || f.away === id;
        f.result = inv(leader) ? (f.home === leader ? { home: 3, away: 0 } : { home: 0, away: 3 }) : inv(me(x).id) ? (f.home === me(x).id ? { home: 2, away: 0 } : { home: 0, away: 2 }) : { home: 1, away: 1 };
      }
      x.round = x.fixtures.length;
      if (championWaives(x, table(x))) {
        c = x;
        break;
      }
    }
    expect(c).toBeDefined();
    expect(relegationNeeded(c)).toBeNull();
    nextSeason(c);
    expect(c.level).toBe(4);
  });
});
