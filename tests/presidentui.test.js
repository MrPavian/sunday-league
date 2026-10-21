import { describe, expect, it } from 'vitest';
import { createCareer, nextSeason } from '../src/career/career.js';
import { stepDown } from '../src/career/legacy.js';
import { appointCoach, coachApplicants, fireCoach } from '../src/career/president.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';
import { CoachHire } from '../src/ui/CoachHire.js';
import { portraitSVG } from '../src/ui/portrait.js';

// Die Texte des Präsidiums, der lesenden Taktik/Aufstellung und der Bewerberauswahl (ohne Browser: nur das HTML).
const input = (mode) => ({ first: 'Erika', last: 'Test', age: 47, relation: 'single', profession: 'Koch', style: 'libero', children: [], mode });
function house(c) {
  const h = new Clubhouse({ addEventListener() {} }, { onChange() {} });
  h.career = c;
  return h;
}
function president(seed = 41) {
  const c = createCareer({ seed, coach: input('coachOnly') });
  c.round = c.fixtures.length;
  c.week = null;
  stepDown(c);
  appointCoach(c, coachApplicants(c)[1]);
  c.cash = 400;
  nextSeason(c);
  return c;
}

describe('Präsidium (Oberfläche)', () => {
  it('zeigt Trainer, Saisonziel-Wahl und Entlassen; nach der Entlassung „Neuen Trainer verpflichten"', () => {
    const c = president();
    const h = house(c);
    const html = h.tab_office();
    expect(html).toContain(c.hired.name);
    expect(html).toContain('data-action="fireCoach"');
    expect((html.match(/data-action="presidentGoal"/g) ?? []).length).toBe(3);
    expect(html).toContain('<svg class="portrait"');
    fireCoach(c);
    const vacant = h.tab_office();
    expect(vacant).toContain('data-action="hireCoach"');
    expect(vacant).not.toContain('data-action="fireCoach"');
  });

  it('Taktik und Aufstellung sind lesend, mit „Trainer: …" – ein Spielertrainer bedient sie weiter selbst', () => {
    const c = president();
    const h = house(c);
    const tactic = h.tab_tactic();
    expect(tactic).toContain('coach-note');
    expect(tactic).toContain(c.hired.name);
    expect(tactic).not.toContain('data-action="tacticSystem"');
    expect(tactic).not.toContain('data-action="tacticStyle"');
    const lineup = h.tab_lineup();
    expect(lineup).toContain(c.hired.name);
    expect(lineup).not.toContain('data-action="slotPick"');
    const own = createCareer({ seed: 42, coach: input('coachOnly') });
    const hh = house(own);
    expect(hh.tab_tactic()).toContain('data-action="tacticSystem"');
    expect(hh.tab_lineup()).toContain('data-action="slotPick"');
  });

  it('der nächste Spieltag: Präsident schaut von der Tribüne (Ticker, Ergebnis), Trainer steht an der Linie', () => {
    const c = president(43);
    const pres = house(c).nextMatch();
    expect(pres).toContain('data-action="onCoach"');
    expect(pres).toContain('data-action="onSimulate"');
    expect(pres).toContain('data-action="onQuickSim"');
    expect(pres).toMatch(/Tribüne|stand/);
    expect(pres).not.toMatch(/an der Seitenlinie|on the touchline/);
    const own = createCareer({ seed: 44, coach: input('coachOnly') });
    const mine = house(own).nextMatch();
    expect(mine).toMatch(/an der Seitenlinie|on the touchline/);
    expect(mine).not.toContain('onQuickSim');
  });

  it('die Nachfolge-Liste bietet „Trainer verpflichten – du wirst Präsident" als anderen Weg an', () => {
    const c = createCareer({ seed: 45, coach: input('coachOnly') });
    c.round = c.fixtures.length;
    c.week = null;
    stepDown(c);
    const html = house(c).legacyAside();
    expect(html).toContain('data-action="successor"');
    expect(html).toMatch(/Präsident|president/);
  });
});

describe('Bewerberauswahl (Oberfläche)', () => {
  it('drei Bewerber mit Gespräch; Unterschrift gibt den Bewerber mit dem verhandelten Gehalt zurück', () => {
    const c = createCareer({ seed: 46, coach: input('coachOnly') });
    c.round = c.fixtures.length;
    c.week = null;
    stepDown(c);
    const root = { innerHTML: '', hidden: true, scrollTop: 0, addEventListener() {} };
    const hire = new CoachHire(root);
    let done = null;
    hire.show(c, { onDone: (cand) => (done = cand) });
    expect((root.innerHTML.match(/class="cand"/g) ?? []).length).toBe(3);
    const click = (action, value) => hire.onClick({ target: { closest: () => ({ dataset: { action, value } }) } });
    click('talk', '1');
    expect(root.innerHTML).toContain('data-action="ask"');
    click('ask', 'money');
    expect(root.innerHTML).toContain('data-action="haggle"');
    click('haggle');
    expect(root.innerHTML).not.toContain('data-action="haggle"');
    const salary = hire.cands[1].salary;
    click('sign');
    expect(done.name).toBe(hire.cands[1].name);
    expect(done.salary).toBe(salary);
    expect(root.hidden).toBe(true);
  });

  it('Pixel-Porträt: Hautfarbe, Haare, Glatze und Bart ändern das Bild', () => {
    const a = portraitSVG({ skin: 0xe6b894, hair: 0x4a3222, bald: false, beard: false });
    expect(portraitSVG({ skin: 0x6b4128, hair: 0x4a3222 })).not.toBe(a);
    expect(portraitSVG({ skin: 0xe6b894, hair: 0x4a3222, bald: true })).not.toBe(a);
    expect(portraitSVG({ skin: 0xe6b894, hair: 0x4a3222, beard: true })).not.toBe(a);
    expect(a).toContain('viewBox');
  });
});
