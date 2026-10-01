import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { ACADEMY_EVENTS, initAcademy, setYouthFocus, talentGuess, teamOfAge, weeklyAcademy } from '../src/career/academy.js';
import { initTeams } from '../src/career/youthteams.js';
import { looksStrength, missesTraining, persona, physEdge } from '../src/career/kidpersona.js';

const yes = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };

function career(seed = 3) {
  const c = createCareer({ seed });
  initAcademy(c);
  initTeams(c);
  c.coach.energy = 1e6;
  return c;
}
const kid = (over) => persona({ id: `t${Math.random()}`, name: 'Tim Test', age: 10, talent: 0.5, joy: 0.8, position: 'mid', ...over });

describe('Kinder sind verschieden: Entwicklung, Schule, Eltern', () => {
  it('etwa ein Fünftel Früh-, ein Fünftel Spätentwickler; fest je Kind, auch für alte Spielstände', () => {
    const n = { frueh: 0, normal: 0, spaet: 0 };
    let stress = 0;
    for (let i = 0; i < 1000; i++) {
      const k = persona({ id: `k1-${i}`, name: 'X', age: 9 });
      n[k.bloom]++;
      if (k.school === 'stress') stress++;
    }
    expect(n.frueh).toBeGreaterThan(150);
    expect(n.frueh).toBeLessThan(250);
    expect(n.spaet).toBeGreaterThan(150);
    expect(n.spaet).toBeLessThan(250);
    expect(stress).toBeGreaterThan(220);
    expect(stress).toBeLessThan(380);
    const legacy = { id: 'k1-42', name: 'Alt', age: 11, parent: 'ehrgeizig' };
    persona(legacy);
    expect(legacy.parent).toBe('ehrgeizig'); // bestehende Eltern bleiben
    expect(persona({ id: 'k1-42', name: 'Alt', age: 11 }).bloom).toBe(legacy.bloom);
  });

  it('Frühentwickler sehen mit 10 stärker aus, als sie sind – mit 15 ist der Vorsprung weg', () => {
    const early = kid({ bloom: 'frueh' });
    const late = kid({ bloom: 'spaet' });
    expect(looksStrength(early)).toBeGreaterThan(early.talent + 0.1);
    expect(looksStrength(late)).toBeLessThan(late.talent - 0.1);
    expect(physEdge({ ...early, age: 15 })).toBe(0);
    expect(physEdge({ ...late, age: 15 })).toBe(0);
  });

  it('ein schwacher Jugendleiter fällt auf Größe herein, ein guter kaum', () => {
    const c = career();
    // Abweichung der Sterne gegenüber gleich talentierten normal entwickelten Kindern.
    const bias = (q, bloom) => {
      c.youth.coach.quality = q;
      let s = 0;
      for (let i = 0; i < 200; i++) {
        const k = { id: `g${i}`, name: `Kind ${i}`, age: 10, bloom, talent: 0.3 + (i % 5) * 0.1 };
        s += talentGuess(c, k) / 5 - k.talent;
      }
      return s / 200 - (bloom === 'normal' ? 0 : bias(q, 'normal'));
    };
    // gemessen: früh +0,11 (schwach) / +0,06 (gut), spät −0,10 / 0,00
    expect(bias(0.2, 'frueh')).toBeGreaterThan(bias(0.9, 'frueh') + 0.03);
    expect(bias(0.2, 'spaet')).toBeLessThan(bias(0.9, 'spaet') - 0.05);
    expect(bias(0.2, 'frueh')).toBeGreaterThan(0.05);
  });

  it('Spätentwickler holen ab 13 schneller auf als Frühentwickler', () => {
    const c = career(4);
    c.youth.kids = [kid({ id: 'a', name: 'Anton A', age: 13, bloom: 'spaet', school: 'locker', parent: null }), kid({ id: 'b', name: 'Bernd B', age: 13, bloom: 'frueh', school: 'locker', parent: null })];
    setYouthFocus(c, 'technik');
    for (let w = 0; w < 10; w++) {
      c.round = w;
      for (const k of c.youth.kids) k.joy = 0.8;
      weeklyAcademy(c);
    }
    const [late, early] = c.youth.kids;
    expect(late.talent - 0.5).toBeGreaterThan((early.talent - 0.5) * 1.5);
  });

  it('Turnier-Schwerpunkt: Wer klein ist, sitzt draußen und verliert den Spaß (relativer Alterseffekt)', () => {
    const c = career(5);
    const team = (id) => Array.from({ length: 6 }, (_, i) => kid({ id: `${id}${i}`, name: `Kind ${id}${i}`, age: 11, talent: 0.55, bloom: i < 2 ? 'frueh' : i < 4 ? 'normal' : 'spaet', school: 'locker', parent: null }));
    c.youth.kids = team('x');
    setYouthFocus(c, 'turnier', 'D');
    for (let w = 0; w < 6; w++) weeklyAcademy(c);
    const joyOf = (b) => c.youth.kids.filter((k) => k.bloom === b).reduce((s, k) => s + k.joy, 0) / 2;
    expect(joyOf('frueh')).toBeGreaterThan(joyOf('spaet') + 0.3);
    expect(c.youth.kids.every((k) => teamOfAge(k.age).id === 'D')).toBe(true);
  });

  it('Schulstress: in manchen Wochen kein Training; Fußballverbot heißt gar kein Training', () => {
    const k = kid({ school: 'stress' });
    let missed = 0;
    for (let r = 0; r < 200; r++) if (missesTraining(k, r)) missed++;
    expect(missed).toBeGreaterThan(25);
    expect(missed).toBeLessThan(80);
    expect(missesTraining({ ...kid({ school: 'locker' }), banUntil: 5 }, 3)).toBe(true);
    expect(missesTraining({ ...kid({ school: 'locker' }), banUntil: 5 }, 5)).toBe(false);
  });
});

describe('Ereignisse rund um die Kinder', () => {
  it('Spätzünder will aufhören → Bio-Banding macht ihm wieder Spaß', () => {
    const c = career(6);
    c.youth.kids = [kid({ id: 's1', name: 'Paul Klein', age: 11, bloom: 'spaet', joy: 0.5 })];
    const ctx = ACADEMY_EVENTS.spaetzuender.needs(c, yes);
    expect(ctx).toEqual({ k: 's1' });
    ACADEMY_EVENTS.spaetzuender.options[0].effect(c, ctx, yes);
    expect(c.youth.kids[0].joy).toBeCloseTo(0.7, 5);
  });

  it('Zeugnis: Akzeptieren bedeutet sechs Wochen Fußballverbot', () => {
    const c = career(7);
    c.youth.kids = [kid({ id: 'z1', name: 'Max Mathe', age: 12, school: 'stress' })];
    const ctx = ACADEMY_EVENTS.zeugnis.needs(c, yes);
    expect(ctx).toBeTruthy();
    ACADEMY_EVENTS.zeugnis.options[2].effect(c, ctx, yes);
    expect(c.youth.kids[0].banUntil).toBe(c.round + 6);
    expect(ACADEMY_EVENTS.zeugnis.needs(c, yes)).toBeNull(); // nicht zweimal
  });

  it('Keiner holt ab: Fahrgemeinschaft löst das Problem dauerhaft', () => {
    const c = career(8);
    c.youth.kids = [kid({ id: 'h1', name: 'Leon Allein', age: 10, parent: 'desinteressiert', parentSet: true })];
    const ctx = ACADEMY_EVENTS.keiner_holt_ab.needs(c, yes);
    ACADEMY_EVENTS.keiner_holt_ab.options[1].effect(c, ctx, yes);
    expect(c.youth.kids[0].parent).toBeNull();
    expect(persona(c.youth.kids[0]).parent).toBeNull(); // wird nicht neu gewürfelt
  });
});
