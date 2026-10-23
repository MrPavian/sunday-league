// Alte Herren (src/career/oldboys.js): Gründung, Kader, Termine, Ergebnisse, Übergänge, alte Spielstände, Speichern/Laden.
import { beforeAll, describe, expect, it } from 'vitest';
import { createCareer, finishRound, getPool, humanClub, migrateCareer, nextSeason, playerOf, startWeek, takenIndices } from '../src/career/career.js';
import { acceptOffer, AGE_MIN, candidates, declineOffer, found, foundCheck, FOUND_COST, moveFromFirst, nextGame, oh, ohTable, OH_ROUNDS, pendingGame, playDueSync, SIM, targetSize } from '../src/career/oldboys.js';
import * as oldboys from '../src/career/oldboys.js';
import { OLDBOYS_EVENTS } from '../src/career/oldboysevents.js';
import { FEATURES } from '../src/career/hooks.js';

beforeAll(() => {
  SIM.duration = 60; // kurze Spiele: die Logik zählt, nicht die Spielzeit
});

// Pool-Spieler ab 32, die in keinem Kader stehen.
const olds = (c, n, from = 0) => {
  const taken = takenIndices(c);
  const out = [];
  for (const p of getPool().everyone()) {
    if (p.age >= 33 && p.age <= 40 && !taken.has(p.poolIndex) && !out.includes(p.poolIndex) && out.length < n + from) out.push(p.poolIndex);
  }
  return out.slice(from);
};
const withAlumni = (seed = 3, n = 5) => {
  const c = createCareer({ seed });
  for (const idx of olds(c, n)) c.alumni.push({ idx, name: playerOf(c, idx).name, age: playerOf(c, idx).age, apps: 30, goals: 5, season: 1, role: 'Ehrenmitglied' });
  c.cash = 300;
  return c;
};
const clone = (c) => migrateCareer(JSON.parse(JSON.stringify(c)));

describe('Alte Herren: Gründung', () => {
  it('ohne Team: kein Zustand, Gründung braucht Geld und Ü32 im Umfeld', () => {
    const c = createCareer({ seed: 3 });
    expect(c.oldBoys).toBeUndefined();
    const chk = foundCheck(c);
    expect(chk.count).toBe(chk.cand.first.length + chk.cand.alumni.length + chk.cand.former.length);
    c.cash = 10;
    expect(found(c)).toBe(false);
    const d = withAlumni();
    d.cash = 10;
    expect(foundCheck(d).reasons.join()).toMatch(/Kasse/);
    expect(found(d)).toBe(false);
  });

  it('gründen: Kader aus Ehemaligen plus neue Gesichter, Kosten gebucht, niemand doppelt', () => {
    const c = withAlumni();
    const cash = c.cash;
    const alumni = c.alumni.map((a) => a.idx);
    expect(found(c)).toBe(true);
    const o = oh(c);
    expect(c.cash).toBe(cash - FOUND_COST);
    expect(o.squad.length).toBe(targetSize(c));
    expect(alumni.every((i) => o.squad.includes(i))).toBe(true);
    expect(o.squad.every((i) => playerOf(c, i).age >= AGE_MIN)).toBe(true);
    expect(o.squad.some((i) => playerOf(c, i).position === 'gk')).toBe(true);
    expect(new Set(o.squad).size).toBe(o.squad.length);
    const clubs = c.clubs.flatMap((x) => x.squad);
    expect(o.squad.some((i) => clubs.includes(i))).toBe(false);
    expect([...takenIndices(c)].filter((i) => o.squad.includes(i)).length).toBe(o.squad.length);
    expect(found(c)).toBe(false); // nur einmal
  });

  it('neue Gesichter sind ligagerecht schwach (nicht stärker als die Erste im Schnitt)', () => {
    const c = withAlumni(7);
    found(c);
    const o = oh(c);
    const news = o.squad.filter((i) => o.src[i] === 'new');
    expect(news.length).toBeGreaterThan(0);
    const avg = (l) => l.reduce((s, i) => s + playerOf(c, i).rating, 0) / l.length;
    expect(avg(news)).toBeLessThanOrEqual(avg(humanClub(c).squad) + 4);
  });
});

describe('Alte Herren: Termine und Ergebnisse', () => {
  const go = () => {
    const c = withAlumni();
    found(c);
    return c;
  };
  const toRound = (c, r) => {
    while (c.round < r) finishRound(c);
  };

  it('Ü32-Runde: sechs Mannschaften, fünf Termine alle zwei Wochen', () => {
    const c = go();
    const l = oh(c).league;
    expect(l.opps.length).toBe(5);
    expect(l.days.map((d) => d.round)).toEqual(OH_ROUNDS);
    expect(ohTable(c).length).toBe(6);
    expect(pendingGame(c)).toBe(null); // Spieltag 1 ist spielfrei
    expect(nextGame(c).round).toBe(1);
  });

  it('Spiel: Ergebnis, Tabelle, Bierkasse bei Heimspiel, Stimmung', () => {
    const c = go();
    toRound(c, 1); // finishRound spielt fällige Spiele nach, daher stehen wir vor dem Spiel
    const g = pendingGame(c);
    expect(g).toBeTruthy();
    const cash = c.cash;
    const mood = c.mood;
    expect(playDueSync(c, true)).toBe(1);
    expect(pendingGame(c)).toBe(null);
    const row = ohTable(c).find((r) => r.own);
    expect(row.played).toBe(1);
    expect(row.w + row.d + row.l).toBe(1);
    expect(oh(c).games.length).toBe(1);
    expect(c.mood).toBeGreaterThan(mood);
    expect(c.cash - cash).toBe(g.home ? oh(c).games[0].cash : 0);
    if (g.home) expect(c.cash).toBeGreaterThan(cash);
    // die anderen Partien des Tages sind mitgespielt
    expect(ohTable(c).reduce((s, r) => s + r.played, 0)).toBe(6);
  });

  it('der Wochenwechsel spielt unbeobachtete Spiele nach', () => {
    const c = go();
    toRound(c, 3); // Spieltage 1 (und 2 ohne Termin) wurden dabei nachgeholt
    expect(oh(c).games.length).toBe(1);
    expect(ohTable(c).find((r) => r.own).played).toBe(1);
  });

  it('Saisonende: Runde archiviert, Kader bleibt spielbar, neue Runde da', () => {
    const c = go();
    toRound(c, c.fixtures.length);
    expect(oh(c).games.length).toBe(OH_ROUNDS.length);
    const before = c.season;
    nextSeason(c);
    const o = oh(c);
    expect(c.season).toBe(before + 1);
    expect(o.history.length).toBe(1);
    expect(o.history[0].played).toBe(OH_ROUNDS.length);
    expect(o.league.season).toBe(c.season);
    expect(o.squad.length).toBeGreaterThanOrEqual(targetSize(c) - 4);
    expect(o.squad.every((i) => playerOf(c, i).age >= AGE_MIN)).toBe(true);
  });
});

describe('Alte Herren: Übergänge', () => {
  it('Spieler der Ersten ab 32 wechseln freiwillig, jüngere und der Trainer nicht', () => {
    const c = withAlumni();
    found(c);
    const me = humanClub(c);
    const [old] = olds(c, 1);
    const young = me.squad.find((i) => playerOf(c, i).age < AGE_MIN && i !== c.coach?.idx);
    me.squad[me.squad.indexOf(young)] = old;
    c.players[old] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    expect(moveFromFirst(c, me.squad.find((i) => playerOf(c, i).age < AGE_MIN && i !== c.coach?.idx))).toBe(false);
    expect(moveFromFirst(c, c.coach.idx)).toBe(false);
    const n = me.squad.length;
    expect(moveFromFirst(c, old)).toBe(true);
    expect(me.squad.length).toBe(n - 1);
    expect(oh(c).squad).toContain(old);
    expect(oh(c).src[old]).toBe('first');
  });

  it('Angebot bei Karriereende: annehmen oder ablehnen', () => {
    const c = withAlumni();
    found(c);
    const [a, b] = olds(c, 2, 3);
    const retired = [a, b].map((idx) => ({ idx, name: playerOf(c, idx).name, age: playerOf(c, idx).age }));
    oldboys.nextSeason(c, { retired });
    expect(oh(c).offers.map((x) => x.idx)).toEqual([a, b]);
    expect(acceptOffer(c, a)).toBe(true);
    expect(oh(c).squad).toContain(a);
    declineOffer(c, b);
    expect(oh(c).offers.length).toBe(0);
    expect(oh(c).squad).not.toContain(b);
  });

  it('Spielertrainer mit coach.oldBoys spielt dort weiter (Team entsteht ohne Kosten)', () => {
    const c = createCareer({ seed: 11 });
    const cash = c.cash;
    const idx = c.coach.idx;
    humanClub(c).squad = humanClub(c).squad.filter((i) => i !== idx);
    c.coach.oldBoys = { since: 1 };
    startWeek(c);
    expect(oh(c)).toBeTruthy();
    expect(oh(c).squad).toContain(idx);
    expect(oh(c).src[idx]).toBe('coach');
    expect(c.cash).toBe(cash);
  });
});

describe('Alte Herren: alte Spielstände, Speichern/Laden', () => {
  it('Stand ohne Alte Herren lädt unverändert und bekommt keinen Zustand', () => {
    const c = createCareer({ seed: 5 });
    const json = JSON.stringify(c);
    const d = migrateCareer(JSON.parse(json));
    expect(d.oldBoys).toBeUndefined();
    expect(JSON.stringify(d)).toBe(json);
  });

  it('alter Stand mit Haken coach.oldBoys bekommt beim Laden sein Team', () => {
    const c = createCareer({ seed: 5 });
    humanClub(c).squad = humanClub(c).squad.filter((i) => i !== c.coach.idx);
    c.coach.oldBoys = { since: 1 };
    const d = clone(c);
    expect(oh(d).squad).toContain(d.coach.idx);
  });

  it('Läufe mit und ohne Speichern/Laden zwischen den Wochen sind identisch', () => {
    const a = withAlumni(9);
    found(a);
    let b = clone(a);
    for (let i = 0; i < 6; i++) {
      finishRound(a);
      finishRound(b);
      b = clone(b);
    }
    expect(JSON.stringify(b.oldBoys)).toBe(JSON.stringify(a.oldBoys));
    expect(b.cash).toBe(a.cash);
    expect(a.oldBoys.games.length).toBeGreaterThan(0);
  });

  it('ohne Mannschaft zieht kein Alte-Herren-Ereignis, mit Mannschaft schon', () => {
    const c = createCareer({ seed: 3 });
    const rng = { next: () => 0.3, pick: (l) => l[0] };
    for (const ev of Object.values(OLDBOYS_EVENTS)) expect(ev.needs(c, rng)).toBe(null);
    const d = withAlumni();
    found(d);
    expect(Object.values(OLDBOYS_EVENTS).filter((ev) => ev.needs(d, rng)).length).toBeGreaterThanOrEqual(4);
  });

  it('der Hook ist in hooks.js eingetragen', () => {
    expect(FEATURES).toContain(oldboys);
  });
});
