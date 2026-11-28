// Fehler B1 der Balancing-QA (docs/BALANCING-QA-04-ATTRIBUTES.md): Boni auf Spielwerte kappten Werte über 1 (Stärkemodell 3) auf 0,98.
import { afterEach, describe, expect, it } from 'vitest';
import { applyForm } from '../src/career/events.js';
import { applyJobPerks } from '../src/data/jobs.js';
import { BONUS_CAP, bonusAttr } from '../src/sim/skill.js';

afterEach(() => { BONUS_CAP.keepLift = true; });
const lifted = () => ({ profession: 'Rentner', attrs: { pace: 0.5, stamina: 0.6, technique: 1.3, passing: 1.25, shooting: 1.4, tackling: 0.9, heading: 1.5, keeping: 0.2, strength: 0.5 } });

describe('bonusAttr', () => {
  it('Werte bis 0,98 wie bisher, Werte darüber behalten ihren Aufschlag', () => {
    expect(bonusAttr(0.95, 1.02)).toBe(0.98);
    expect(bonusAttr(0.5, 0.01)).toBe(0.05);
    expect(bonusAttr(1.3, 1.35)).toBe(1.35);
    expect(bonusAttr(1.3, 1.2)).toBe(1.2);
  });
  it('Schalter aus: alter Deckel 0,98 für alle', () => {
    BONUS_CAP.keepLift = false;
    expect(bonusAttr(1.3, 1.35)).toBe(0.98);
  });
});

describe('Form und Berufe kappen Technik über 1 nicht mehr', () => {
  it('applyForm: Form hebt und senkt auch Werte über 1', () => {
    const up = applyForm(lifted(), { form: 0.5 }).attrs;
    expect(up.technique).toBeCloseTo(1.3 * 1.04, 10);
    expect(up.tackling).toBe(Math.min(0.98, 0.9 * 1.04)); // unter 1: wie bisher
    const down = applyForm(lifted(), { form: -0.5 }).attrs;
    expect(down.technique).toBeCloseTo(1.3 * 0.96, 10);
  });
  it('applyJobPerks: Mannschaftsbonus eines Mitspielers kappt die anderen nicht', () => {
    const team = [{ ...lifted(), profession: 'Bierbrauer' }, lifted()];
    const out = applyJobPerks(team);
    expect(out[1].attrs.technique).toBeCloseTo(1.31, 10);
    expect(out[1].attrs.passing).toBeCloseTo(1.265, 10);
    BONUS_CAP.keepLift = false;
    expect(applyJobPerks(team)[1].attrs.technique).toBe(0.98); // so war es vorher
  });
});
