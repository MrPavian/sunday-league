// AFS Phase 6b: Spielintelligenz – Antizipation, Übersicht, Stellungsspiel (src/sim/mind.js).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createCareer, developPlayers, humanClub, importCareer, playerOf } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { createPlayerPool, generatePlayer, ratePlayer } from '../src/sim/generator.js';
import { deriveMind, ensureMind, MIND, MIND_KEYS, mindOf, mindWeak } from '../src/sim/mind.js';
import { liftedAt } from '../src/sim/niveau.js';
import { attrMax } from '../src/sim/skill.js';
import { ATTR_LABELS } from '../src/ui/attrLabels.js';

const DEFAULT_ON = MIND.on;
afterEach(() => { MIND.on = DEFAULT_ON; });

describe('Spielintelligenz: Werte und Herleitung', () => {
  const all = createPlayerPool({ seed: 1921 }).everyone();
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  it('every pool player has the three values in 0.08…0.92, centred near 0.5 with a spread of about 0.1', () => {
    for (const k of MIND_KEYS) {
      const v = all.map((p) => p.attrs[k]);
      for (const x of v) expect(x).toBeGreaterThanOrEqual(0.08);
      for (const x of v) expect(x).toBeLessThanOrEqual(0.92);
      const m = mean(v);
      const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
      expect(m).toBeGreaterThan(0.48); // gemessen 0,502 / 0,502 / 0,503
      expect(m).toBeLessThan(0.52);
      expect(sd).toBeGreaterThan(0.08); // gemessen 0,105
      expect(sd).toBeLessThan(0.13);
    }
  });

  it('related values and experience push the derived value: passers see more, veterans read better than teenagers', () => {
    const avg = (f, k) => mean(all.filter(f).map((p) => p.attrs[k]));
    expect(avg((p) => p.attrs.passing > 0.6, 'vision')).toBeGreaterThan(avg((p) => p.attrs.passing < 0.4, 'vision') + 0.05);
    expect(avg((p) => p.age >= 30, 'anticipation')).toBeGreaterThan(avg((p) => p.age <= 20, 'anticipation') + 0.03);
  });

  it('the derivation uses no game or pool rng: same player, same values; the rating ignores them', () => {
    const p = generatePlayer(createRng(77), { role: 'mid', tier: 'gut' });
    expect(deriveMind(p)).toEqual(deriveMind(JSON.parse(JSON.stringify(p))));
    const q = { ...p, attrs: { ...p.attrs, vision: 0.9, anticipation: 0.1 } };
    expect(ratePlayer(q)).toBe(ratePlayer(p));
  });

  it('values stay at most 0.98 and do not rise with the league level (effect is built around 0.5)', () => {
    for (const k of MIND_KEYS) expect(attrMax(k, 3)).toBe(0.98);
    const p = all.find((x) => x.position === 'mid');
    const up = liftedAt(p, 10);
    for (const k of MIND_KEYS) expect(up.attrs[k]).toBe(p.attrs[k]);
    expect(up.attrs.passing).toBeGreaterThan(p.attrs.passing);
  });

  it('the engine effect is off by default (user decision 2026-11-27: no measured advantage yet)', () => {
    expect(DEFAULT_ON).toBe(false);
  });

  it('error model: strong values (from 0.75) play error-free as before, weak ones up to full weakness; switch off: no errors', () => {
    const p = { attrs: { vision: 0.8 } };
    MIND.on = true;
    expect(mindOf(p, 'vision')).toBe(0.8);
    expect(mindOf(p, 'anticipation')).toBe(0.5);
    expect(mindWeak({ attrs: { vision: 1.4 } }, 'vision')).toBe(0);
    expect(mindWeak({ attrs: { vision: 0.75 } }, 'vision')).toBe(0);
    expect(mindWeak({ attrs: { vision: 0.1 } }, 'vision')).toBe(1);
    expect(mindWeak({ attrs: { vision: 0.45 } }, 'vision')).toBeCloseTo(0.5);
    MIND.on = false;
    expect(mindOf(p, 'vision')).toBe(0.5);
    expect(mindWeak({ attrs: { vision: 0.1 } }, 'vision')).toBe(0);
  });

  it('labels for the player card exist in German', () => {
    expect(MIND_KEYS.map((k) => ATTR_LABELS[k])).toEqual(['Antizipation', 'Übersicht', 'Stellungsspiel']);
  });
});

describe('Spielintelligenz: alte Spielstände und Entwicklung', () => {
  it('migration fills missing values deterministically and keeps existing ones', () => {
    const p = generatePlayer(createRng(91), { role: 'def', tier: 'stark' });
    const old = JSON.parse(JSON.stringify(p));
    for (const k of MIND_KEYS) delete old.attrs[k];
    expect(ensureMind(old)).toBe(true);
    for (const k of MIND_KEYS) expect(old.attrs[k]).toBe(p.attrs[k]);
    expect(ensureMind(old)).toBe(false);
  });

  it('the old e2e save loads; every squad player has the three values and a second load gives identical numbers', () => {
    const raw = readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8');
    const c1 = importCareer(raw);
    const c2 = importCareer(raw);
    for (const idx of humanClub(c1).squad) for (const k of MIND_KEYS) {
      const v = playerOf(c1, idx).attrs[k];
      expect(v).toBeGreaterThanOrEqual(0.05);
      expect(v).toBeLessThanOrEqual(0.98);
      expect(v).toBe(playerOf(c2, idx).attrs[k]);
    }
  });

  it('custom players of a save without the values get them on load', () => {
    const c = createCareer({ seed: 41, coach: { first: 'Max', last: 'Muster', age: 33, style: 'spielmacher', profession: 'Koch', relation: 'single', children: [] } });
    const idx = c.coach.idx;
    const fresh = MIND_KEYS.map((k) => c.custom[idx].attrs[k]);
    for (const v of fresh) expect(v).toBeGreaterThan(0);
    const stripped = JSON.parse(JSON.stringify(c));
    for (const p of Object.values(stripped.custom)) for (const k of MIND_KEYS) delete p.attrs[k];
    const back = importCareer(JSON.stringify(stripped));
    expect(MIND_KEYS.map((k) => playerOf(back, idx).attrs[k])).toEqual(fresh);
  });

  it('season development lets the values grow, never shrink, and leaves the old development untouched', () => {
    MIND.on = true;
    const c = createCareer({ seed: 5 });
    const club = humanClub(c);
    const before = Object.fromEntries(club.squad.map((idx) => [idx, playerOf(c, idx).attrs]));
    const off = JSON.parse(JSON.stringify(c));
    developPlayers(c);
    MIND.on = false;
    developPlayers(off);
    MIND.on = true;
    for (const idx of club.squad) {
      for (const k of MIND_KEYS) expect(c.players[idx].delta[k]).toBeGreaterThanOrEqual(0);
      for (const k of MIND_KEYS) expect(off.players[idx].delta[k]).toBeUndefined();
      // die alten Werte entwickeln sich genau wie ohne Schicht (eigener Zufallsstrom)
      for (const [k, v] of Object.entries(off.players[idx].delta)) expect(c.players[idx].delta[k]).toBe(v);
      expect(playerOf(c, idx).attrs.vision).toBeGreaterThanOrEqual(before[idx].vision);
    }
  });
});
