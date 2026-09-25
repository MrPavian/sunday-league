import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, playerOf } from '../src/career/career.js';
import { resolveEvent } from '../src/career/events.js';
import { childrenGrowUp, coachAway, createCoachPlayer, CRISES, initCoach, PERSONAL_EVENTS, seasonPersonal, STYLES, trainingLocked, weeklyPersonal } from '../src/career/personal.js';
import { createRng } from '../src/core/rng.js';

describe('player-coach', () => {
  it('you are a solid hobby player in your own squad and always show up', () => {
    const c = createCareer({ seed: 31 });
    const me = playerOf(c, c.coach.idx);
    expect(me.tier).toBe('gut');
    expect(me.age).toBeGreaterThanOrEqual(30);
    expect(humanClub(c).squad).toContain(c.coach.idx);
    for (let r = 0; r < 4; r++) {
      if (!coachAway(c)) expect(c.week.availability[c.coach.idx]).toBe('yes');
      finishRound(c);
    }
    expect(initCoach(c)).toBe(c.coach); // nur einmal
  });

  it('busy weeks cost family patience and energy; empty posts wear you out', () => {
    const c = createCareer({ seed: 32 });
    const { patience, energy } = c.coach;
    c.week.training = { trialists: [], stations: [], invites: 0 };
    c.week.actions = 0;
    weeklyPersonal(c);
    expect(c.coach.patience).toBeLessThan(patience);
    expect(c.coach.energy).toBeLessThan(energy);
    const tired = c.coach.energy;
    c.staff = { cotrainer: { name: 'A' }, wirt: { name: 'B' }, platzwart: { name: 'C' } };
    c.week.training = null;
    weeklyPersonal(c);
    expect(c.coach.energy).toBeGreaterThanOrEqual(tired); // mit Helfern und ohne Training hältst du durch
  });

  it('an empty family tank means two weeks at home', () => {
    const c = createCareer({ seed: 33 });
    c.coach.patience = 0;
    finishRound(c);
    expect(c.week.event.id).toBe('familienkrise');
    expect(coachAway(c)).toBe(true);
    expect(trainingLocked(c)).toBe(true);
    expect(c.week.availability[c.coach.idx]).toBe('no');
    finishRound(c);
    expect(coachAway(c)).toBe(true);
    finishRound(c);
    expect(coachAway(c)).toBe(false);
    expect(c.coach.patience).toBeGreaterThan(35);
  });

  it('burnout works the same way; summer break recharges and titles bring offers', () => {
    const c = createCareer({ seed: 34 });
    c.coach.energy = 0;
    finishRound(c);
    expect(c.week.event.id).toBe('burnout');
    c.coach.patience = 40;
    c.coach.energy = 30;
    seasonPersonal(c, 1);
    expect(c.coach.patience).toBe(65);
    expect(c.coach.energy).toBe(50);
    expect(c.flags.offerFrom).toBeTruthy();
    expect(PERSONAL_EVENTS.angebot.needs(c, createRng(1))).toBeTruthy();
  });

  it('every personal event and crisis resolves with every option', () => {
    const all = { ...PERSONAL_EVENTS, ...CRISES };
    for (const [id, def] of Object.entries(all)) {
      for (let choice = 0; choice < def.options.length; choice++) {
        const c = createCareer({ seed: 40 + choice });
        c.round = 3;
        Object.assign(c.coach, { patience: 30, energy: 20, kids: 1, family: 'verheiratet, ein Kind' });
        c.coach.flags.bossFavor = true;
        c.flags.offerFrom = 'TuS Grünwald 1911 (Kreisliga A)';
        const ctx = def.needs ? def.needs(c, createRng(choice)) : {};
        expect(ctx, id).toBeTruthy();
        c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null };
        const res = resolveEvent(c, choice);
        expect(typeof res, `${id}/${choice}`).toBe('string');
        expect(c.coach.patience).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('create your own player-coach', () => {
  const input = {
    first: 'Norman',
    last: 'Kranz',
    age: 38,
    relation: 'verheiratet',
    profession: 'Elektriker',
    style: 'knipser',
    look: { skin: 0xe6b894, hair: 0x4a3222, bald: false, beard: true },
    children: [
      { name: 'Paul', age: 14, sex: 'm' },
      { name: 'Mia', age: 17, sex: 'w' },
    ],
  };

  it('builds exactly the player you describe and keeps him through save and load', async () => {
    const { saveCareer, loadCareer } = await import('../src/career/career.js');
    const c = createCareer({ seed: 61, coach: input });
    const me = playerOf(c, c.coach.idx);
    expect(me.name).toBe('Norman Kranz');
    expect(me.age).toBe(38);
    expect(me.profession).toBe('Elektriker');
    expect(me.position).toBe('fwd');
    expect(me.traits).toContain('hammer');
    expect(me.look.beard).toBe(true);
    expect(c.coach.family).toContain('Verheiratet');
    expect(humanClub(c).squad).toContain(c.coach.idx);

    const store = new Map();
    const storage = { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null };
    saveCareer(c, storage);
    createCareer({ seed: 99 }); // andere Karriere dazwischen
    const back = loadCareer(storage);
    expect(playerOf(back, back.coach.idx).name).toBe('Norman Kranz');
  });

  it('your son joins the youth team at 16, your daughter the women once there is a team', () => {
    const c = createCareer({ seed: 62, coach: input });
    const paul = c.coach.children.find((k) => k.name === 'Paul');
    expect(paul.idx).toBeNull();
    c.season = 3; // Paul ist jetzt 16
    const notes = childrenGrowUp(c);
    expect(paul.idx).not.toBeNull();
    expect(c.youth.prospects).toContain(paul.idx);
    expect(playerOf(c, paul.idx).name).toBe('Paul Kranz');
    expect(playerOf(c, paul.idx).age).toBe(16);
    expect(notes.join(' ')).toContain('A-Jugend');

    const mia = c.coach.children.find((k) => k.name === 'Mia');
    expect(mia.inFrauen).toBeFalsy();
    c.saga.frauen = { founded: 2, captain: 'Lena Kaya', strength: 0.4, seasons: [] };
    childrenGrowUp(c);
    expect(mia.inFrauen).toBe(true);
  });

  it('every style makes a sensible player of the right position', () => {
    for (const [id, st] of Object.entries(STYLES)) {
      const p = createCoachPlayer({ first: 'A', last: 'B', age: 30, style: id }, 5);
      expect(p.position).toBe(st.role);
      expect(p.rating).toBeGreaterThan(25);
      expect(p.rating).toBeLessThan(80);
    }
  });
});
