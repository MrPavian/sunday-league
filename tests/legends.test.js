// Vereinslegenden (career/legends.js): Abschied nach vielen Spielen oder Toren, Tafel im Museum, Besuch beim Training.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { rolledEventIds } from '../src/career/events.js';
import { museum } from '../src/career/museum.js';
import { clubLegends, isLegend, LEGEND, LEGEND_EVENTS, pendingLegend } from '../src/career/legends.js';

const alumnus = (c, over = {}) => ({ idx: 9001, name: 'Kalle Brömmel', age: 38, apps: 120, goals: 12, season: c.season, role: null, ...over });

describe('Vereinslegenden', () => {
  it('Schwelle: viele Spiele oder viele Tore', () => {
    expect(isLegend({ apps: LEGEND.apps - 1, goals: LEGEND.goals - 1 })).toBe(false);
    expect(isLegend({ apps: LEGEND.apps, goals: 0 })).toBe(true);
    expect(isLegend({ apps: 10, goals: LEGEND.goals })).toBe(true);
  });

  it('Abschied: nur für frische Legenden, jede Ehrung trägt ihn einmal ins Museum ein', () => {
    for (const id of Object.keys(LEGEND_EVENTS)) expect(rolledEventIds()).toContain(id);
    const ev = LEGEND_EVENTS.legende_abschied;
    for (const [option, honour] of [[0, 'spiel'], [1, 'trikot'], [3, 'blumen']]) {
      const c = createCareer({ seed: 4 });
      expect(ev.needs(c)).toBe(null);
      c.alumni = [alumnus(c, { apps: 30, goals: 3, name: 'Kurzer Gast' }), alumnus(c)];
      const ctx = ev.needs(c);
      expect(ctx.name).toBe('Kalle Brömmel');
      expect(ev.text(c, ctx)).toContain('120');
      const cash = c.cash;
      const mood = c.mood ?? 0;
      expect(typeof ev.options[option].effect(c, ctx, createRng(1))).toBe('string');
      expect(clubLegends(c)).toHaveLength(1);
      expect(clubLegends(c)[0]).toMatchObject({ name: 'Kalle Brömmel', honour, apps: 120 });
      expect(c.cash - cash).toBe(option === 0 ? LEGEND.gate * (c.level ?? 1) : 0);
      if (option < 2) expect(c.mood).toBeGreaterThan(mood);
      expect(pendingLegend(c)).toBe(null);
      expect(ev.needs(c)).toBe(null);
      expect(museum(c).honoured[0].name).toBe('Kalle Brömmel');
    }
  });

  it('alte Fälle bleiben liegen: Wer vor mehr als einer Saison aufgehört hat, wird nicht nachträglich gefragt', () => {
    const c = createCareer({ seed: 4 });
    c.season = 5;
    c.alumni = [alumnus(c, { season: 2 })];
    expect(pendingLegend(c)).toBe(null);
  });

  it('Besuch: erst in einer späteren Saison, einmal je Saison; der Jüngste bekommt Form', () => {
    const c = createCareer({ seed: 4 });
    const ev = LEGEND_EVENTS.legende_besuch;
    c.legends = [{ idx: 9001, name: 'Kalle Brömmel', apps: 120, goals: 12, season: c.season, honour: 'spiel' }];
    expect(ev.needs(c, createRng(1))).toBe(null);
    c.season++;
    const ctx = ev.needs(c, createRng(1));
    expect(ctx.name).toBe('Kalle Brömmel');
    const squad = humanClub(c).squad.filter((i) => i !== c.coach?.idx);
    const young = [...squad].sort((a, b) => playerOf(c, a).age - playerOf(c, b).age)[0];
    const form = c.players[young]?.form ?? 0;
    expect(typeof ev.options[1].effect(c, ctx, createRng(1))).toBe('string');
    expect(c.players[young].form).toBeGreaterThan(form);
    c.eventLog.push({ id: 'legende_besuch', season: c.season, round: c.round });
    expect(ev.needs(c, createRng(1))).toBe(null);
  });
});
