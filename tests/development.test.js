// Entwicklung der eigenen Spieler (development.js): verborgene Typen, Liga-Deckel, Durchbruch, geplatzter Knoten.
import { describe, expect, it } from 'vitest';
import { createCareer, developPlayers, humanClub, migrateCareer, playerOf } from '../src/career/career.js';
import { NIVEAU_TARGET } from '../src/sim/niveau.js';
import { aboveLeague, BRAKE, KID_PULL, brakeOf, DEV_TYPES, devProfile, eloScale, leagueGrowth, environmentChanged, PEAK_AGE, seasonCurve, seasonGain, TALENT_NORM, playerTalentGuess, talentOf, TALENTS } from '../src/career/development.js';

const BASE = createCareer({ seed: 7 });
const fresh = () => JSON.parse(JSON.stringify(BASE));

// Weg eines gedachten 18-Jährigen über 8 Saisons (ohne Zufall der Werte-Verteilung, ohne Tapetenwechsel).
function path(c, idx, position = 'mid', mul = 1.3) {
  c.players[idx] ??= {};
  let total = 0;
  for (let age = 18; age < 26; age++) total += seasonGain(c, idx, { age, position }, mul, false).gain;
  return total;
}

describe('Entwicklung je Spieler', () => {
  it('Typen kommen in den festgelegten Anteilen vor und hängen nur an Karriere und Spieler', () => {
    const c = fresh();
    const n = 4000;
    const count = {};
    for (let i = 0; i < n; i++) count[devProfile(c, i).type] = (count[devProfile(c, i).type] ?? 0) + 1;
    for (const [t, w] of DEV_TYPES) expect(count[t] / n, t).toBeCloseTo(w, 1);
    expect(devProfile(c, 123)).toEqual(devProfile(fresh(), 123));
  });

  it('Höhepunkt je Position: Stürmer früher als Abwehr, Torhüter am spätesten', () => {
    expect(PEAK_AGE.fwd).toBeLessThan(PEAK_AGE.def);
    expect(PEAK_AGE.gk).toBeGreaterThan(PEAK_AGE.def);
    const prof = { type: 'normal', peak: PEAK_AGE.fwd };
    expect(seasonCurve(prof, 26)).toBe(0); // nach dem Höhepunkt kein Zuwachs mehr
  });

  it('Freizeitliga: deutlich weniger Entwicklung als Bezirksliga – mit Ausreißern nach oben und unten', () => {
    const stats = (level) => {
      const c = fresh();
      c.level = level;
      const xs = Array.from({ length: 3000 }, (_, i) => path(c, i));
      const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
      return { mean, big: xs.filter((v) => v >= mean + 7).length / xs.length, stuck: xs.filter((v) => v <= 3).length / xs.length };
    };
    const low = stats(1);
    const high = stats(5);
    expect(low.mean).toBeLessThan(high.mean * 0.7);
    for (const s of [low, high]) {
      expect(s.big).toBeGreaterThan(0.03); // Durchbrüche gibt es in jeder Liga
      expect(s.big).toBeLessThan(0.15);
      expect(s.stuck).toBeGreaterThan(0.08); // und welche, die hängen bleiben
      expect(s.stuck).toBeLessThan(0.25);
    }
  });

  it('Durchbruch: genau im Alter des Durchbruchs ein großer Sprung', () => {
    const c = fresh();
    c.level = 5;
    const idx = Array.from({ length: 4000 }, (_, i) => i).find((i) => devProfile(c, i).type === 'durchbruch');
    c.players[idx] = {};
    const prof = devProfile(c, idx);
    const at = seasonGain(c, idx, { age: prof.breakAge, position: 'mid' }, 1, false);
    const before = seasonGain(c, idx, { age: prof.breakAge - 1, position: 'mid' }, 1, false);
    expect(at.event).toBe('durchbruch');
    expect(at.gain).toBeGreaterThan(before.gain + 8);
  });

  it('Tapetenwechsel: Neue im Verein, neuer Stil – manchmal platzt der Knoten, Stagnierer entwickeln sich danach normal', () => {
    const c = fresh();
    const club = humanClub(c);
    for (const idx of club.squad) expect(environmentChanged(c, idx, club)).toBe(false); // Gründungskader: nichts Neues
    developPlayers(c); // merkt Trainer und Stil
    club.tactic = { ...(club.tactic ?? {}), style: club.tactic?.style === 'konter' ? 'ballbesitz' : 'konter' };
    expect(environmentChanged(c, club.squad[0], club)).toBe(true);
    let knots = 0;
    let fixed = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      c.players[i] = { devSeen: 0 };
      const r = seasonGain(c, i, { age: 20, position: 'mid' }, 1, true);
      if (r.event === 'knoten') {
        knots++;
        if (r.prof.type === 'stagniert') fixed += c.players[i].devType === 'normal' ? 1 : 0;
      }
    }
    expect(knots / n).toBeGreaterThan(0.08);
    expect(knots / n).toBeLessThan(0.2);
    expect(fixed).toBeGreaterThan(0);
  });

  it('Vorbereitung: Durchbruch steht im Chat, alte Spielstände laden ohne Tapetenwechsel für den Kader', () => {
    const c = fresh();
    for (const idx of humanClub(c).squad) delete c.players[idx].devSeen; // Stand vor dem Update
    const m = migrateCareer(c);
    for (const idx of humanClub(m).squad) expect(m.players[idx].devSeen).toBe(0);
    const before = Object.fromEntries(humanClub(m).squad.map((i) => [i, playerOf(m, i).rating]));
    const rep = developPlayers(m);
    expect(rep.map((r) => r.idx)).toEqual(humanClub(m).squad);
    for (const r of rep) expect(r.before).toBe(before[r.idx]);
  });
});

// Stärkemodell 3: Zuwachs in Spielstärke statt in Punkten (Konzept Spielerstärke 12.2 Schritt 6).
describe('Entwicklung in Spielstärke (Stärkemodell 3)', () => {
  it('bis zur Bezirksliga wie bisher, darüber mehr Punkte, alte Spielstände unverändert', () => {
    expect(eloScale({ strength: 1, level: 8 })).toBe(1);
    for (const level of [1, 2, 3, 4, 5]) expect(eloScale({ strength: 3, level })).toBe(1);
    const s = [6, 7, 8].map((level) => eloScale({ strength: 3, level }));
    expect(s[0]).toBeGreaterThan(1);
    expect(s[1]).toBeGreaterThan(s[0]);
    expect(s[2]).toBeCloseTo(0.05 / 0.0339, 2); // Oberliga: Wirkung je Punkt 0,033 statt 0,05
  });
  it('ein Oberliga-Spieler legt im neuen Modell entsprechend mehr Punkte zu', () => {
    const run = (strength) => {
      const c = fresh();
      c.strength = strength;
      c.level = 8;
      const idx = humanClub(c).squad[0];
      c.players[idx] ??= {};
      c.players[idx].ceil = 999; // Obergrenze hier nicht im Weg
      const p = { ...playerOf(c, idx), age: 18 };
      return seasonGain(c, idx, p, 1.3, false).gain;
    };
    const old = run(1);
    const c3 = { ...fresh(), strength: 3 };
    const tm = talentOf(c3, humanClub(c3).squad[0]).mul * TALENT_NORM;
    if (old > 0) expect(run(3) / old).toBeCloseTo(eloScale({ strength: 3, level: 8 }) * tm, 5);
  });
});

// Talent (Nutzerentscheid 2026-11-04): fest je Spieler, bestimmt Zuwachs und Obergrenze; Anzeige geschätzt.
describe('Talent', () => {
  it('nur im neuen Modell, Anteile wie festgelegt und unabhängig vom Entwicklungstyp', () => {
    expect(talentOf({ seed: 1, strength: 1, players: {} }, 5)).toBeNull();
    const n = {};
    const both = {};
    for (let seed = 1; seed <= 40; seed++)
      for (let idx = 0; idx < 250; idx++) {
        const c = { seed, strength: 3, players: {} };
        const t = talentOf(c, idx).id;
        n[t] = (n[t] ?? 0) + 1;
        if (devProfile(c, idx).type === 'frueh') both[t] = (both[t] ?? 0) + 1;
      }
    for (const t of TALENTS) {
      expect(n[t.id] / 10000).toBeCloseTo(t.share, 1);
      expect(both[t.id] / n[t.id]).toBeGreaterThan(0.1); // Frühentwickler (15 %) gibt es in jeder Talentstufe
      expect(both[t.id] / n[t.id]).toBeLessThan(0.2);
    }
  });
  it('Obergrenze: über ihr legt keiner mehr zu, Ausgereizte kaum', () => {
    const c = fresh();
    c.strength = 3;
    const idx = humanClub(c).squad.find((i) => talentOf(c, i).id === 'ausgereizt') ?? humanClub(c).squad[0];
    c.players[idx].ceil = playerOf(c, idx).rating;
    expect(seasonGain(c, idx, { ...playerOf(c, idx), age: 17 }, 1.3, false).gain).toBe(0);
  });
  it('die Schätzung wird mit Saisons im Verein und Co-Trainer sicherer', () => {
    const c = { seed: 3, strength: 3, season: 1, players: { 9: {} } };
    const a = playerTalentGuess(c, 9).sure;
    c.players[9] = { seasons: [{}, {}], apps: 8 };
    c.staff = { cotrainer: true };
    expect(playerTalentGuess(c, 9).sure).toBeGreaterThan(a);
    expect(playerTalentGuess(c, 9).text).toBeTruthy();
  });
});

// Zu tiefe Liga bremst (Konzept Spielerstärke 12.7, Nutzerentscheid „mittel“: ×0,8 je Liga, höchstens bis ×0,5).
describe('Bremse in zu tiefer Liga', () => {
  it('×0,8 je Liga über dem Niveau, nie unter ×0,5; altes Stärkemodell ohne Bremse', () => {
    expect(brakeOf(0)).toBe(1);
    expect(brakeOf(1)).toBeCloseTo(0.8, 10);
    expect(brakeOf(2)).toBeCloseTo(0.64, 10);
    expect(brakeOf(9)).toBe(BRAKE.floor);
    expect(aboveLeague({ strength: 1, level: 1 }, NIVEAU_TARGET[4])).toBe(0);
    expect(aboveLeague({ strength: 3, level: 1 }, NIVEAU_TARGET[2])).toBe(2);
    expect(aboveLeague({ strength: 3, level: 5 }, NIVEAU_TARGET[2])).toBe(0);
  });
  it('derselbe Spieler legt zwei Ligen zu tief nur 64 % zu', () => {
    const run = (level) => {
      const c = fresh();
      c.strength = 3;
      c.level = level;
      const idx = humanClub(c).squad[0];
      c.players[idx] ??= {};
      c.players[idx].ceil = 999; // Obergrenze hier nicht im Weg
      const p = { ...playerOf(c, idx), age: 18, rating: NIVEAU_TARGET[2] };
      return seasonGain(c, idx, p, 1.3, false).gain;
    };
    const fits = run(3);
    expect(fits).toBeGreaterThan(0);
    // Stufen 1–5 haben dieselbe Elo-Skala; der Ligafaktor (LEAGUE_GROWTH) kommt getrennt dazu.
    const c1 = { ...fresh(), level: 1 };
    const c3 = { ...fresh(), level: 3 };
    expect(run(1) / fits).toBeCloseTo(0.64 * (leagueGrowth(c1) / leagueGrowth(c3)), 5);
  });
});

// Eigene Jugend: Das Kindertalent ist nur eine Tendenz (Nutzerentscheid), Spätzünder und Abstürze bleiben.
describe('Kindertalent als Tendenz', () => {
  it('hohes Kindertalent macht große Talente wahrscheinlicher, aber nicht sicher', () => {
    const top = (kidTalent) => {
      const c = { seed: 11, strength: 3, players: {} };
      let n = 0;
      for (let idx = 0; idx < 2000; idx++) {
        c.players[idx] = { kidTalent };
        if (['ausnahme', 'gross'].includes(talentOf(c, idx).id)) n++;
      }
      return n / 2000;
    };
    expect(KID_PULL).toBe(0.6);
    const hi = top(0.9);
    const lo = top(0.2);
    expect(hi).toBeGreaterThan(0.35); // ohne Kindertalent: 20 %
    expect(hi).toBeLessThan(0.6); // keine Garantie
    expect(lo).toBeLessThan(0.05);
  });
});
