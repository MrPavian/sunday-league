import { describe, expect, it } from 'vitest';
import { argueRumor, askRumor, createCareer, finishRound, humanClub, poolPlayer, scoutRumor, talkRumor } from '../src/career/career.js';
import { argumentEffect, ARG_IDS, checkPromises, knownMotives, motivesOf } from '../src/career/recruiting.js';

const fresh = (seed = 3) => createCareer({ seed });

describe('Werben: Motive', () => {
  it('jeder Kandidat hat zwei feste, verschiedene Motive', () => {
    const c = fresh();
    for (const r of c.week.rumors) {
      const p = poolPlayer(r.idx);
      const m = motivesOf(p);
      expect(m).toHaveLength(2);
      expect(m[0]).not.toBe(m[1]);
      expect(motivesOf(p)).toEqual(m); // immer dieselben
    }
  });

  it('Ex-Profis wollen meist Ruhe, Schichtarbeiter passende Trainingszeiten', () => {
    let ruhe = 0;
    let training = 0;
    for (let i = 0; i < 200; i++) {
      if (motivesOf({ poolIndex: i, tier: 'legende', age: 36, rating: 70, traits: [] }).includes('ruhe')) ruhe++;
      if (motivesOf({ poolIndex: i, tier: 'ok', age: 30, rating: 40, traits: [], profession: 'Schichtarbeiter' }).includes('training')) training++;
    }
    expect(ruhe).toBeGreaterThan(120);
    expect(training).toBeGreaterThan(80);
  });

  it('Zuschauen deckt das erste Motiv auf, Rumfragen das zweite – beides kostet eine Aktion', () => {
    const c = fresh();
    const r = c.week.rumors[0];
    const p = poolPlayer(r.idx);
    expect(knownMotives(r, p)).toEqual([]);
    expect(scoutRumor(c, 0)).toBe(true);
    expect(knownMotives(r, p)).toEqual([motivesOf(p)[0]]);
    expect(askRumor(c, 0)).toBe(true);
    expect(knownMotives(r, p)).toEqual(motivesOf(p));
    expect(c.week.actions).toBe(0);
    expect(askRumor(c, 1)).toBe(false); // keine Aktion mehr
  });
});

describe('Werben: Gespräch', () => {
  it('passende Argumente wirken stark, unpassende kaum, manche schrecken ab', () => {
    const c = fresh();
    const r = c.week.rumors[0];
    const p = poolPlayer(r.idx);
    const m = motivesOf(p);
    const other = ARG_IDS.find((a) => !m.includes(a) && a !== 'kumpels');
    expect(argumentEffect(c, p, m[0], m, r.idx)).toBeGreaterThanOrEqual(22);
    expect(argumentEffect(c, p, other, m, r.idx)).toBeLessThan(10);
    const legend = { poolIndex: 1, tier: 'legende', age: 36, rating: 70, traits: [] };
    expect(argumentEffect(c, legend, 'geld', ['ruhe', 'spielzeit'], 1)).toBeLessThan(0);
    expect(argumentEffect(c, legend, 'erfolg', ['ruhe', 'spielzeit'], 1)).toBeLessThan(0);
  });

  it('Ansprechen kostet eine Aktion, nach zwei Argumenten entscheidet er – mit Treffern deutlich öfter ja', () => {
    let hitYes = 0;
    let missYes = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const hit of [true, false]) {
        const c = fresh(seed);
        const r = c.week.rumors[0];
        const m = motivesOf(poolPlayer(r.idx));
        expect(talkRumor(c, 0)).toBe(true);
        expect(c.week.actions).toBe(1);
        const args = hit ? m : ARG_IDS.filter((a) => !m.includes(a) && a !== 'kumpels' && a !== 'geld').slice(0, 2);
        expect(argueRumor(c, 0, args[0])).toBeNull(); // noch nicht fertig
        const res = argueRumor(c, 0, args[1]);
        expect(res).toBeTruthy();
        expect(['joined', 'declined']).toContain(r.status);
        if (res.joined) hit ? hitYes++ : missYes++;
        if (res.joined) expect(humanClub(c).squad).toContain(r.idx);
      }
    }
    expect(hitYes).toBeGreaterThan(missYes + 8);
  });

  it('Fahrgeld kostet 30 €', () => {
    const c = fresh();
    const cash = c.cash;
    talkRumor(c, 0);
    argueRumor(c, 0, 'geld');
    argueRumor(c, 0, 'spielzeit');
    expect(c.cash).toBe(cash - 30);
  });
});

describe('Werben: Versprechen', () => {
  it('Einsatz versprochen, zwei Spieltage nicht gespielt → er ist sauer; gespielt → alles gut', () => {
    for (const plays of [false, true]) {
      const c = fresh(5);
      const idx = humanClub(c).squad[0];
      c.players[idx].promised = { from: c.round, until: c.round + 2 };
      c.players[idx].grumpy = 0;
      if (plays) c.players[idx].lastApp = c.round;
      const chat = [];
      c.round += 2;
      checkPromises(c, humanClub(c).squad, (i, t) => chat.push(t));
      expect(c.players[idx].promised).toBeUndefined();
      expect(c.players[idx].grumpy).toBe(plays ? 0 : 3);
      expect(chat.length).toBe(plays ? 0 : 1);
    }
  });

  it('über finishRound: das Versprechen wird nach zwei Wochen abgerechnet', () => {
    const c = fresh(6);
    const idx = humanClub(c).squad[1];
    c.players[idx].promised = { from: c.round, until: c.round + 2 };
    finishRound(c);
    expect(c.players[idx].promised).toBeTruthy();
    finishRound(c);
    expect(c.players[idx].promised).toBeUndefined();
  });
});

describe('Werben über mehrere Wochen', () => {
  it('ein Gerücht hängt 2–4 Wochen am Brett – was man schon weiß, bleibt; danach kommt ein neues', () => {
    const c = fresh(8);
    const r0 = c.week.rumors[0];
    const life = r0.until - c.round;
    expect(life).toBeGreaterThanOrEqual(2);
    expect(life).toBeLessThanOrEqual(4);
    scoutRumor(c, 0);
    const idx = r0.idx;
    for (let w = 1; w < life; w++) {
      finishRound(c);
      const again = c.week.rumors.find((r) => r.idx === idx);
      expect(again).toBeTruthy();
      expect(again.scouted).toBe(true);
      expect(c.week.rumors).toHaveLength(3);
    }
    finishRound(c);
    expect(c.week.rumors.some((r) => r.idx === idx)).toBe(false);
    expect(c.week.rumors).toHaveLength(3);
  });

  it('nach Zu- oder Absage verschwindet das Gerücht in der nächsten Woche', () => {
    const c = fresh(9);
    const idx = c.week.rumors[0].idx;
    talkRumor(c, 0);
    argueRumor(c, 0, 'spielzeit');
    argueRumor(c, 0, 'kumpels');
    finishRound(c);
    expect(c.week.rumors.some((r) => r.idx === idx)).toBe(false);
  });

  it('zuschauen, rumfragen und reden über drei Wochen verteilt', () => {
    const c = fresh(10);
    const r = c.week.rumors.find((x) => x.until - c.round >= 3) ?? c.week.rumors[0];
    if (r.until - c.round < 3) r.until = c.round + 3;
    const idx = r.idx;
    const at = () => c.week.rumors.findIndex((x) => x.idx === idx);
    scoutRumor(c, at());
    finishRound(c);
    askRumor(c, at());
    finishRound(c);
    const now = c.week.rumors[at()];
    expect(knownMotives(now, poolPlayer(idx))).toEqual(motivesOf(poolPlayer(idx)));
    expect(talkRumor(c, at())).toBe(true);
  });
});
