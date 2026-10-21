import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { crewNeeded, FEST_ORDER, FEST_PARTS, festivalDue, festivalOf, festivalPlan, festivalPreview, festivalSkip, festivalToggle, holdFestival, partCost, volunteers } from '../src/career/festival.js';
import { clubLife } from '../src/career/clublife.js';

const endSeason = (c) => {
  while (!seasonOver(c)) finishRound(c);
  return c;
};
const season = (seed, plan = FEST_ORDER) => {
  const c = endSeason(createCareer({ seed }));
  festivalPlan(c, plan);
  return c;
};

describe('Vereinsfest', () => {
  it('is only due after the last matchday and only once per season', () => {
    const c = createCareer({ seed: 301 });
    festivalPlan(c, ['grill']);
    expect(festivalDue(c)).toBe(false);
    expect(holdFestival(c)).toBeNull(); // mitten in der Saison kein Fest
    endSeason(c);
    expect(festivalDue(c)).toBe(true);
    expect(holdFestival(c)).toBeTruthy();
    expect(festivalDue(c)).toBe(false);
    expect(holdFestival(c)).toBeNull();
    nextSeason(c);
    expect(festivalOf(c).status).toBe('none'); // neue Saison, neues Fest
    expect(c.festival.history).toHaveLength(1);
  });

  it('needs a plan; the plan keeps a fixed order and can be toggled', () => {
    const c = endSeason(createCareer({ seed: 302 }));
    expect(holdFestival(c)).toBeNull();
    festivalToggle(c, 'tombola');
    festivalToggle(c, 'grill');
    expect(festivalOf(c).plan).toEqual(['grill', 'tombola']);
    festivalToggle(c, 'grill');
    expect(festivalOf(c).plan).toEqual(['tombola']);
    festivalToggle(c, 'tombola');
    expect(festivalOf(c).status).toBe('none');
    expect(festivalToggle(c, 'gibtsnicht')).toBe(false);
    festivalSkip(c);
    expect(festivalPlan(c, ['grill'])).toBe(false);
    expect(holdFestival(c)).toBeNull();
  });

  it('is deterministic: same save and plan, same festival', () => {
    const a = holdFestival(season(303));
    const b = holdFestival(season(303));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const other = holdFestival(season(303, ['grill', 'torwand']));
    expect(other.lines).toHaveLength(2);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(a));
  });

  it('books costs and takings exactly as reported, and shows them in the ledger', () => {
    const c = season(304);
    const cash0 = c.cash;
    const preview = festivalPreview(c);
    expect(preview.cost).toBe(FEST_ORDER.reduce((s, id) => s + partCost(c, id), 0));
    const r = holdFestival(c);
    expect(r.cost).toBe(preview.cost);
    expect(r.lines.reduce((s, l) => s + l.income, 0)).toBe(r.income);
    expect(Math.round((c.cash - cash0) * 100) / 100).toBe(r.net);
    expect(c.ledger.some((l) => /Vereinsfest|club festival/i.test(l.text))).toBe(true);
    expect(r.visitors).toBeGreaterThan(0);
    expect(r.body.length).toBeGreaterThan(80);
    expect(r.headline).toBeTruthy();
  });

  it('has effects: mood, supporters\' club, newspaper chronicle', () => {
    const c = season(305);
    const mood0 = c.mood;
    const sup0 = clubLife(c).supporters;
    const r = holdFestival(c);
    expect(c.mood).toBeGreaterThan(mood0);
    expect(clubLife(c).supporters).toBe(sup0 + r.members);
    expect(r.members).toBeGreaterThanOrEqual(0);
    expect(r.members).toBeLessThanOrEqual(4);
    expect(c.saga.chronicle.at(-1).text).toMatch(/Vereinsfest|club festival/i);
  });

  it('missing volunteers cost income: stalls without a crew sell nothing', () => {
    const c = season(306);
    const need = crewNeeded(festivalOf(c).plan);
    expect(need).toBeGreaterThan(volunteers(c)); // volle Auswahl überfordert den Verein
    const r = holdFestival(c);
    expect(r.crewHave).toBeLessThan(r.crewNeed);
    expect(r.lines.some((l) => l.crew < 1)).toBe(true);
    expect(r.lines.some((l) => l.crew === 0 && l.income === 0)).toBe(true);
    expect(festivalPreview(c).short).toBeGreaterThan(0);
  });

  it('weather matters: rain closes the bouncy castle, sunshine beats rain on visitors', () => {
    const seen = {};
    for (let seed = 400; seed < 460 && Object.keys(seen).length < 2; seed++) {
      const c = season(seed, ['grill', 'huepfburg', 'kuchen']);
      const r = holdFestival(c);
      if (r.weather === 'regen' || r.weather === 'sonne') seen[r.weather] ??= r;
    }
    expect(seen.regen).toBeTruthy();
    expect(seen.sonne).toBeTruthy();
    expect(seen.regen.lines.find((l) => l.id === 'huepfburg').closed).toBe(true);
    expect(seen.regen.lines.find((l) => l.id === 'huepfburg').income).toBe(0);
    expect(seen.sonne.lines.find((l) => l.id === 'huepfburg').closed).toBe(false);
    expect(seen.sonne.visitors).toBeGreaterThan(seen.regen.visitors);
  });

  it('story events are drawn from the seed and reported in the paper', () => {
    const ids = new Set();
    for (let seed = 500; seed < 540; seed++) {
      const r = holdFestival(season(seed));
      for (const id of r.storyIds) ids.add(id);
      expect(r.stories).toHaveLength(r.storyIds.length);
      for (const t of r.stories) expect(r.body).toContain(t);
    }
    expect(ids.size).toBeGreaterThanOrEqual(4);
  });

  it('economy stays sane: a sensible plan on level 1 is a small plus or minus, never a windfall', () => {
    const nets = [];
    for (let seed = 600; seed < 640; seed++) nets.push(holdFestival(season(seed, ['grill', 'kuchen', 'torwand', 'huepfburg'])).net);
    const avg = nets.reduce((a, b) => a + b, 0) / nets.length;
    expect(avg).toBeGreaterThan(-60);
    expect(avg).toBeLessThan(120);
    expect(Math.max(...nets)).toBeLessThan(250);
  });

  it('the penalty king is a real squad player who gets a form boost', () => {
    const c = season(307, ['elfer', 'torwand']);
    const r = holdFestival(c);
    if (r.king) {
      expect(humanClub(c).squad).toContain(r.king.idx);
      expect(c.players[r.king.idx].form).toBeGreaterThan(0);
    }
  });

  it('survives save and load; old saves get empty festival fields', () => {
    const c = season(308);
    holdFestival(c);
    const loaded = migrateCareer(JSON.parse(JSON.stringify(c)));
    expect(festivalOf(loaded).status).toBe('done');
    expect(festivalOf(loaded).report.net).toBe(festivalOf(c).report.net);
    const old = createCareer({ seed: 309 });
    delete old.festival;
    delete old.cups;
    const m = migrateCareer(JSON.parse(JSON.stringify(old)));
    expect(m.festival).toEqual({ season: 0, status: 'none', plan: [], report: null, history: [] });
    expect(m.cups).toEqual({});
    expect(festivalOf(m).status).toBe('none');
  });

  it('parts have sane definitions', () => {
    for (const p of Object.values(FEST_PARTS)) {
      expect(p.cost).toBeGreaterThan(0);
      expect(p.crew).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
    }
  });
});
