// Taktik-Vorlagen (tacticpresets.js, vom Nutzer gewünscht 2026-11-05).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, setClubPlan, setClubTactic } from '../src/career/career.js';
import { applyPreset, deletePreset, PRESET_MAX, presetActive, presetsOf, savePreset } from '../src/career/tacticpresets.js';

describe('Taktik-Vorlagen', () => {
  it('speichern, wieder einstellen, gleicher Name überschreibt, löschen', () => {
    const c = createCareer({ seed: 3 });
    setClubTactic(c, 5, { style: 'konter' });
    setClubPlan(c, 'press', 'hoch');
    expect(savePreset(c, '  Auswärts   kontern ').ok).toBe(true);
    const p = presetsOf(c)[0];
    expect(p.name).toBe('Auswärts kontern');
    setClubTactic(c, 5, { style: 'ausgewogen' });
    setClubPlan(c, 'press', null);
    expect(presetActive(c, p)).toBe(false);
    expect(applyPreset(c, p.id)).toBe(true);
    expect(humanClub(c).tactic.style).toBe('konter');
    expect(humanClub(c).tactic.orders.press).toBe('hoch');
    expect(presetActive(c, p)).toBe(true);
    setClubTactic(c, 5, { style: 'ausgewogen' });
    expect(savePreset(c, 'auswärts KONTERN').ok).toBe(true);
    expect(presetsOf(c)).toHaveLength(1);
    expect(presetsOf(c)[0].style).toBe('ausgewogen');
    expect(deletePreset(c, p.id)).toBe(true);
    expect(presetsOf(c)).toHaveLength(0);
  });
  it('ohne Namen nichts, höchstens PRESET_MAX', () => {
    const c = createCareer({ seed: 4 });
    expect(savePreset(c, '   ').reason).toBe('name');
    for (let i = 0; i < PRESET_MAX; i++) expect(savePreset(c, `T${i}`).ok).toBe(true);
    expect(savePreset(c, 'eine zu viel').reason).toBe('full');
  });
});
