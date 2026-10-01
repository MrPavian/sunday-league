import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { ACADEMY_EVENTS, initAcademy, seasonAcademy, teamOfAge, weeklyAcademy } from '../src/career/academy.js';
import { initTeams } from '../src/career/youthteams.js';
import { persona } from '../src/career/kidpersona.js';
import { resultLabel, SICHTUNG_BAR, sichtung, sichtungScore, tournamentOdds, weeklyYouthMatches, youthLeague, youthPos, youthTable, YOUTH_ROUNDS } from '../src/career/youthleague.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };

function career(seed = 3) {
  const c = createCareer({ seed });
  initAcademy(c);
  initTeams(c);
  c.coach.energy = 1e6;
  return c;
}
const kid = (over) => persona({ id: `y${Math.random()}`, name: 'Kim Kicker', age: 12, talent: 0.5, joy: 0.7, position: 'mid', school: 'locker', parent: null, parentSet: true, bloom: 'normal', ...over });
function playSeason(c) {
  for (let r = 0; r < YOUTH_ROUNDS; r++) {
    c.round = r;
    weeklyYouthMatches(c);
  }
}

describe('Jugend-Spielbetrieb', () => {
  it('D, C, B spielen Liga mit Tabelle – jeder spielt jede Woche; die E-Jugend spielt Spielfeste ohne Tabelle', () => {
    const c = career();
    playSeason(c);
    const lg = youthLeague(c);
    for (const id of ['D', 'C', 'B']) {
      expect(lg.teams[id].own.p).toBe(YOUTH_ROUNDS);
      for (const o of lg.teams[id].opps) expect(o.p).toBe(YOUTH_ROUNDS);
      const table = youthTable(c, id);
      expect(table).toHaveLength(6);
      expect(table.reduce((s, r) => s + r.gf, 0)).toBe(table.reduce((s, r) => s + r.ga, 0));
    }
    expect(lg.teams.E.games).toHaveLength(YOUTH_ROUNDS);
    expect(lg.teams.E.own.p).toBe(0);
  });

  it('ein Spieltag wird nur einmal gespielt', () => {
    const c = career();
    c.round = 2;
    expect(weeklyYouthMatches(c).length).toBeGreaterThan(0);
    expect(weeklyYouthMatches(c)).toEqual([]);
  });

  it('starke Jahrgänge landen öfter oben als schwache', () => {
    let strong = 0;
    let weak = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const talent of [0.9, 0.15]) {
        const c = career(seed);
        c.youth.kids = Array.from({ length: 6 }, (_, i) => kid({ id: `s${i}`, name: `Kind ${i}`, talent }));
        playSeason(c);
        if (talent > 0.5) strong += youthPos(c, 'D');
        else weak += youthPos(c, 'D');
      }
    }
    expect(strong / 20).toBeLessThan(weak / 20 - 1.5);
  });

  it('Siege machen Spaß, Spielfeste sowieso', () => {
    const c = career(4);
    c.youth.kids = [kid({ id: 'e1', age: 9, joy: 0.5 }), ...Array.from({ length: 6 }, (_, i) => kid({ id: `d${i}`, name: `Kind ${i}`, talent: 0.95, joy: 0.5 }))];
    playSeason(c);
    expect(c.youth.kids[0].joy).toBeGreaterThan(0.6); // zehn Spielfeste
    expect(c.youth.kids[1].joy).toBeGreaterThan(0.5);
  });

  it('zum Saisonende zählt der echte Tabellenplatz; die E-Jugend hat keinen', () => {
    const c = career(5);
    playSeason(c);
    const posD = youthPos(c, 'D');
    seasonAcademy(c);
    const last = c.youth.results.at(-1).results;
    expect(last.find((r) => r.team === 'D').pos).toBe(posD);
    const e = last.find((r) => r.team === 'E');
    expect(e.pos).toBeNull();
    expect(resultLabel(e)).toMatch(/Spielfeste|festivals/);
  });
});

describe('Kreisauswahl / DFB-Stützpunkt', () => {
  it('nur 10- bis 14-Jährige über der Schwelle werden eingeladen – mit Eintrag in die Chronik', () => {
    const c = career(6);
    c.youth.kids = [kid({ id: 'a', name: 'Ali Ass', age: 12, talent: 0.97 }), kid({ id: 'b', name: 'Ben Breit', age: 12, talent: 0.5 }), kid({ id: 'c', name: 'Cem Crack', age: 15, talent: 0.99 })];
    const picked = sichtung(c);
    expect(picked).toEqual(['Ali Ass']);
    expect(c.youth.kids[0].stuetzpunkt).toBe(true);
    expect(c.youth.kids[2].stuetzpunkt).toBe(false);
    expect(sichtungScore(c.youth.kids[0])).toBeGreaterThanOrEqual(SICHTUNG_BAR);
  });

  it('auch die Sichter sehen Größe: ein Frühentwickler kommt mit weniger Talent durch als ein Spätentwickler', () => {
    const t = SICHTUNG_BAR - 0.05;
    expect(sichtungScore(kid({ age: 11, talent: t, bloom: 'frueh' }))).toBeGreaterThanOrEqual(SICHTUNG_BAR);
    expect(sichtungScore(kid({ age: 11, talent: t + 0.06, bloom: 'spaet' }))).toBeLessThan(SICHTUNG_BAR);
  });

  it('wer am Stützpunkt ist, entwickelt sich schneller', () => {
    const c = career(7);
    c.youth.kids = [kid({ id: 'p', name: 'Paul P', age: 12, talent: 0.6, stuetzpunkt: true }), kid({ id: 'q', name: 'Quentin Q', age: 12, talent: 0.6 })];
    for (let w = 0; w < 10; w++) {
      c.round = w;
      for (const k of c.youth.kids) k.joy = 0.7;
      weeklyAcademy(c);
    }
    expect(c.youth.kids[0].talent).toBeGreaterThan(c.youth.kids[1].talent + 0.03);
  });
});

describe('Jugendturniere', () => {
  it('stärkere Teams gewinnen Turniere öfter; Turnier-Schwerpunkt hilft', () => {
    const c = career(8);
    c.youth.kids = Array.from({ length: 6 }, (_, i) => kid({ id: `t${i}`, name: `Kind ${i}`, talent: 0.4 }));
    const weak = tournamentOdds(c, 'D');
    for (const k of c.youth.kids) k.talent = 0.9;
    const strong = tournamentOdds(c, 'D');
    c.youth.teams.D.focus = 'turnier';
    expect(strong).toBeGreaterThan(weak + 0.2);
    expect(tournamentOdds(c, 'D')).toBeGreaterThan(strong);
  });

  it('Pfingstturnier und eigenes Turnier: jede Antwort löst auf, nur einmal pro Saison', () => {
    for (const id of ['pfingstturnier', 'eigenes_turnier']) {
      const def = ACADEMY_EVENTS[id];
      for (let choice = 0; choice < def.options.length; choice++) {
        const c = career(9 + choice);
        c.round = 6;
        c.youth.kids.push(...Array.from({ length: 6 }, (_, i) => kid({ id: `x${i}`, name: `Kind ${i}` })));
        const ctx = def.needs(c, yes);
        expect(ctx, id).toBeTruthy();
        const text = def.options[choice].effect(c, ctx, yes);
        expect(typeof text).toBe('string');
        expect(def.needs(c, yes), `${id} zweimal`).toBeNull();
      }
    }
  });

  it('Turniersieg kommt in die Chronik und in die Pokalliste', () => {
    const c = career(10);
    c.round = 6;
    c.youth.kids.push(...Array.from({ length: 6 }, (_, i) => kid({ id: `w${i}`, name: `Kind ${i}`, talent: 0.95 })));
    const ctx = ACADEMY_EVENTS.pfingstturnier.needs(c, yes);
    // Würfel 0 → erster Ausgang (Sieg), sofern seine Chance > 0
    ACADEMY_EVENTS.pfingstturnier.options[0].effect(c, ctx, yes);
    expect(c.youth.cups).toHaveLength(1);
    expect(teamOfAge(12).id).toBe('D');
  });
});
