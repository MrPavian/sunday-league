// Taktik im Spiel umschalten (switches.js, ROADMAP 11.17 #7).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, humanFixture, prepareMatch, setClubPlan, setClubTactic } from '../src/career/career.js';
import { addSwitch, deletePreset, matchTactic, presetsOf, removeSwitch, savePreset, setSwitch, switchesOf } from '../src/career/tacticpresets.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { minute90 } from '../src/sim/minute.js';
import { applyTactic, cancelSwitch, prepareSwitches, SWITCH_MAX } from '../src/sim/switches.js';

const DT = 1 / 30;
const runTo = (m, minute) => {
  while (m.phase !== 'ended' && (m.phase !== 'play' || minute90(m) < minute)) stepMatch(m, undefined, DT);
};
const mauern = { id: 1, name: 'Mauern', style: 'konter', system: null, orders: { press: 'tief', shape: 'kompakt' } };

describe('Taktik im Spiel umschalten', () => {
  it('Regeln im Vereinsheim: nur mit Vorlage, höchstens SWITCH_MAX, nur gültige Werte, Löschen der Vorlage nimmt die Regel mit', () => {
    const c = createCareer({ seed: 5 });
    expect(addSwitch(c)).toBe(false); // ohne Vorlage keine Regel
    setClubTactic(c, 5, { style: 'konter' });
    setClubPlan(c, 'press', 'tief');
    savePreset(c, 'Mauern');
    const id = presetsOf(c)[0].id;
    for (let i = 0; i < SWITCH_MAX; i++) expect(addSwitch(c)).toBe(true);
    expect(addSwitch(c)).toBe(false);
    expect(setSwitch(c, 0, 'minute', 80)).toBe(true);
    expect(setSwitch(c, 0, 'minute', 77)).toBe(false); // nicht in der Auswahl
    expect(setSwitch(c, 0, 'when', 'lead')).toBe(true);
    expect(setSwitch(c, 0, 'when', 'egal')).toBe(false);
    expect(setSwitch(c, 0, 'preset', 999)).toBe(false);
    expect(switchesOf(c)[0]).toEqual({ minute: 80, when: 'lead', preset: id });
    expect(removeSwitch(c, 1)).toBe(true);
    expect(deletePreset(c, id)).toBe(true);
    expect(switchesOf(c)).toHaveLength(0);
  });

  it('Vorlage fürs Spiel: System nur, wenn sie eins für diese Spielerzahl hat', () => {
    const c = createCareer({ seed: 6 });
    savePreset(c, 'Ohne System');
    const t = matchTactic(c, 11);
    expect(t.presets[0]).toMatchObject({ name: 'Ohne System', system: null });
    expect(matchTactic(createCareer({ seed: 7 }), 5)).toEqual({}); // ohne Vorlagen nichts zusätzlich
  });

  it('greift ab der Minute, nur bei passendem Spielstand, und nur einmal', () => {
    const m = createMatch({ seed: 9, human: false });
    m.switches[0] = prepareSwitches([{ ...mauern, minute: 70, when: 'lead' }]);
    runTo(m, 60);
    expect(m.plan[0].style).not.toBe('konter');
    m.score = [0, 1];
    runTo(m, 72);
    expect(m.switches[0][0].done).toBe(false); // Rückstand: keine Führung, nichts passiert
    m.score = [2, 1];
    stepMatch(m, undefined, DT);
    runTo(m, 73);
    expect(m.switches[0][0].done).toBe(true);
    expect(m.plan[0].style).toBe('konter');
    expect(m.orders[0]).toEqual({ press: 'tief', shape: 'kompakt' });
    expect(m.decisions.filter((d) => d.by === 'switch').length).toBeGreaterThan(0);
  });

  it('gestrichene Regel greift nicht; Vorlage per Tipp ersetzt alle Befehle', () => {
    const m = createMatch({ seed: 10, human: false });
    m.switches[0] = prepareSwitches([{ ...mauern, minute: 30, when: 'any' }]);
    expect(cancelSwitch(m, 0, 0)).toBe(true);
    runTo(m, 40);
    expect(m.plan[0].style).not.toBe('konter');
    applyTactic(m, 0, { style: 'pressing', system: null, orders: { tempo: 'schnell' } }, 'plan');
    expect(m.orders[0]).toEqual({ tempo: 'schnell' });
  });

  it('ohne Regeln läuft ein Spiel genau wie vorher (gleicher Spielstand mit leeren Regeln)', () => {
    const a = createMatch({ seed: 21, human: false, duration: 60 });
    const b = createMatch({ seed: 21, human: false, duration: 60 });
    b.switches = [[], []];
    runTo(a, 999);
    runTo(b, 999);
    expect(a.score).toEqual(b.score);
  });

  it('Karriere: Regeln kommen über die Aufstellung ins eigene Spiel', () => {
    const c = createCareer({ seed: 44 });
    savePreset(c, 'Mauern');
    addSwitch(c);
    const f = humanFixture(c);
    const p = prepareMatch(c, f, { duration: 30 });
    const ti = f.home === humanClub(c).id ? 0 : 1;
    expect(p.match.switches[ti]).toHaveLength(1);
    expect(p.match.switches[1 - ti]).toHaveLength(0);
    expect(p.match.presets[ti][0].name).toBe('Mauern');
  });
});
