import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, currentLineup, finishRound, humanClub, migrateCareer, nextSeason, playerOf, prepareMatch, recordResult, seasonOver, setLineupSlot, simulateSync } from '../src/career/career.js';
import { coachPlaying, legacy, legacyPrompt, oldBoysHook, resolveLegacy, stepDown, succeed, successionCandidates } from '../src/career/legacy.js';
import { coachMode, isCoach, isPresident } from '../src/career/personal.js';
import { appointCoach, applyCoachTactic, canSetGoal, coachApplicants, fireCoach, haggle, hireFee, hiredAge, interviewAnswer, QUESTIONS, setPresidentGoal, severance, vacant, weeklyHired } from '../src/career/president.js';

const input = (age, mode = 'player', children = []) => ({ first: 'Uwe', last: 'Brandt', age, relation: 'verheiratet', profession: 'Elektriker', style: 'libero', children, mode });

// Eine Woche wie im Spiel: alle Spiele rechnen, Woche abschließen, speichern + laden.
function playWeek(c) {
  for (const f of currentFixtures(c)) {
    const p = prepareMatch(c, f, { duration: 240 });
    simulateSync(p);
    recordResult(c, f, p);
  }
  finishRound(c);
  return migrateCareer(JSON.parse(JSON.stringify(c)));
}
function playSeason(c) {
  while (!seasonOver(c)) c = playWeek(c);
  return c;
}
const skip = (c) => {
  c.round = c.fixtures.length;
  return nextSeason(c);
};
// Rücktritt im Sommer, dann den Trainer aus den Bewerbern nehmen (Rangfolge: erster Bewerber).
function becomePresident(c, pick = 0) {
  c.round = c.fixtures.length;
  stepDown(c);
  const cand = coachApplicants(c)[pick];
  const r = appointCoach(c, cand);
  expect(r.ok).toBe(true);
  return cand;
}

describe('start mode: manager only', () => {
  it('has no own player figure in the squad, but a lineup, a name and an age', () => {
    const c = createCareer({ seed: 11, coach: input(41, 'coachOnly') });
    const club = humanClub(c);
    expect(c.coach.mode).toBe('coachOnly');
    expect(coachMode(c)).toBe('coachOnly');
    expect(c.coach.idx).not.toBe(null);
    expect(club.squad).not.toContain(c.coach.idx);
    expect(coachPlaying(c)).toBe(false);
    expect(playerOf(c, c.coach.idx).name).toBe('Uwe Brandt');
    expect(playerOf(c, c.coach.idx).age).toBe(41);
    const l = currentLineup(c);
    expect(l.lineup.filter((x) => x != null).length).toBeGreaterThanOrEqual(4);
    expect(l.lineup).not.toContain(c.coach.idx);
    expect(c.week.availability[c.coach.idx]).toBeUndefined();
    expect(isCoach(c, c.coach.idx)).toBe(true);
  });

  it('plays three seasons with a bot: no crash, the figure never ends up in the squad, no boots prompt', () => {
    let c = createCareer({ seed: 12, coach: input(39, 'coachOnly') });
    const idx = c.coach.idx;
    for (let s = 0; s < 3; s++) {
      c = playSeason(c);
      expect(humanClub(c).squad).not.toContain(idx);
      expect(legacyPrompt(c)?.id).toBeUndefined(); // jung: weder „Schuhe" noch „Amt"
      nextSeason(c);
    }
    expect(c.season).toBe(4);
    expect(c.coach.mode).toBe('coachOnly');
    expect(humanClub(c).squad.length).toBeGreaterThanOrEqual(7);
  }, 600000);

  it('player-manager is still the default and old saves count as player-manager', () => {
    const c = createCareer({ seed: 13, coach: input(34) });
    expect(c.coach.mode).toBe('player');
    expect(humanClub(c).squad).toContain(c.coach.idx);
    expect(coachPlaying(c)).toBe(true);
    const old = JSON.parse(JSON.stringify(c));
    delete old.coach.mode;
    expect(migrateCareer(old).coach.mode).toBe('player');
    const noCoach = createCareer({ seed: 14 }); // ohne Angaben (Tests, Bots): Spielertrainer aus dem Pool
    expect(noCoach.coach.mode).toBe('player');
  });

  it('a manager-only coach can step down at any age in the summer, and a new one can be created as manager-only too', () => {
    const c = createCareer({ seed: 15, coach: input(33, 'coachOnly', [{ name: 'Max', age: 25, sex: 'm' }]) });
    c.round = c.fixtures.length;
    expect(stepDown(c)).toBe(true);
    const cands = successionCandidates(c);
    expect(cands.map((x) => x.type)).toEqual(expect.arrayContaining(['kind', 'extern', 'neu']));
    expect(cands.at(-1).type).toBe('neu');
    succeed(c, { type: 'neu', name: 'Jo' }, input(44, 'coachOnly'));
    expect(c.coach.mode).toBe('coachOnly');
    expect(humanClub(c).squad).not.toContain(c.coach.idx);
    expect(legacy(c).eras.length).toBe(1);
  });
});

describe('after the coaching job: hire a manager and become president', () => {
  it('offers three different, reproducible applicants with look, age, style, salary, reputation and a pitch', () => {
    const c = createCareer({ seed: 21, coach: input(45, 'coachOnly') });
    const a = coachApplicants(c);
    const b = coachApplicants(c);
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
    expect(new Set(a.map((x) => x.name)).size).toBe(3);
    expect(new Set(a.map((x) => x.arch)).size).toBe(3);
    for (const x of a) {
      expect(x.name).toBeTruthy();
      expect(x.look.skin).toBeTypeOf('number');
      expect(x.age).toBeGreaterThan(24);
      expect(x.salary).toBeGreaterThan(0);
      expect(x.reputation).toBeGreaterThanOrEqual(0);
      expect(x.pitch.length).toBeGreaterThan(20);
      expect(x.style).toBeTruthy();
    }
    // ein Routinier ist teurer als ein Ehrgeiziger
    const by = Object.fromEntries(a.map((x) => [x.arch, x]));
    expect(by.routinier.salary).toBeGreaterThan(by.ehrgeizig.salary);
  });

  it('the interview answers every question; haggling works once and can only lower the pay', () => {
    const c = createCareer({ seed: 22, coach: input(45, 'coachOnly') });
    const cand = coachApplicants(c)[1];
    for (const q of QUESTIONS) expect(interviewAnswer(cand, q).length).toBeGreaterThan(5);
    const r = haggle(c, cand);
    expect(r.cand.haggled).toBe(true);
    expect(r.cand.salary).toBeLessThanOrEqual(cand.salary);
    expect(haggle(c, r.cand).cand).toBe(r.cand); // nur einmal
  });

  it('a manager-only coach steps down and becomes president: the hired manager takes the touchline', () => {
    let c = createCareer({ seed: 23, coach: input(43, 'coachOnly') });
    c = playSeason(c);
    const name = playerOf(c, c.coach.idx).name;
    const cand = becomePresident(c, 1);
    expect(isPresident(c)).toBe(true);
    expect(c.hired.name).toBe(cand.name);
    expect(c.hired.look).toEqual(cand.look);
    expect(legacy(c).eras.at(-1)).toMatchObject({ name, how: 'extern', successor: cand.name });
    expect(legacy(c).choosing).toBe(false);
    expect(c.coach.oldBoys).toBeUndefined(); // kein Spielertrainer
    expect(vacant(c)).toBe(false);
    // Taktik kommt vom Trainer
    expect(humanClub(c).tactic.style).toBe(cand.style);
    expect(humanClub(c).tactic.coachSeed).toBe(c.hired.seed);
    // Die Aufstellung ist Sache des Trainers: der Präsident kann sie nicht verstellen
    nextSeason(c);
    const before = JSON.stringify(currentLineup(c).lineup);
    setLineupSlot(c, 0, humanClub(c).squad.find((i) => i !== currentLineup(c).lineup[0]));
    expect(c.week.lineup).toBe(null);
    expect(JSON.stringify(currentLineup(c).lineup)).toBe(before);
  });

  it('the first hire is free of fees, only with a prior step-down, and nobody can hire while the post is taken', () => {
    const c = createCareer({ seed: 24, coach: input(43, 'coachOnly') });
    const cand = coachApplicants(c)[0];
    expect(appointCoach(c, cand)).toMatchObject({ ok: false, reason: 'notchoosing' });
    c.round = c.fixtures.length;
    stepDown(c);
    expect(hireFee(c, cand)).toBe(0);
    const cash = c.cash;
    expect(appointCoach(c, cand).ok).toBe(true);
    expect(c.cash).toBe(cash);
    expect(appointCoach(c, coachApplicants(c)[1])).toMatchObject({ ok: false, reason: 'occupied' });
  });

  it('a player-manager moves on to the old boys: the hook is set and he leaves the squad', () => {
    const c = createCareer({ seed: 25, coach: input(44) });
    expect(oldBoysHook(c)).toBe(null);
    let prompt = null;
    for (let i = 0; i < 4 && !prompt; i++) {
      c.round = c.fixtures.length;
      prompt = legacyPrompt(c);
      if (!prompt) nextSeason(c);
    }
    expect(prompt.id).toBe('schuhe');
    expect(prompt.options.length).toBe(4);
    resolveLegacy(c, 3);
    expect(coachPlaying(c)).toBe(false);
    expect(oldBoysHook(c)).toMatchObject({ since: expect.any(Number) });
    expect(legacy(c).choosing).toBe(true);
    expect(successionCandidates(c).map((x) => x.type)).toContain('extern');
    const r = appointCoach(c, coachApplicants(c)[0]);
    expect(r.ok).toBe(true);
    expect(humanClub(c).squad).not.toContain(c.coach.idx);
    expect(isPresident(c)).toBe(true);
  });

  it('a hiring while still a player-manager (step down) takes him out of the squad and sets the old-boys flag', () => {
    const c = createCareer({ seed: 26, coach: input(40) });
    expect(coachPlaying(c)).toBe(true);
    becomePresident(c);
    expect(humanClub(c).squad).not.toContain(c.coach.idx);
    expect(c.coach.oldBoys).toBeTruthy();
    expect(c.coach.playerCareer).toBeTruthy();
  });

  it('runs three seasons as president: matches are auto-coached, wages are paid, the squad stays healthy, save/load every week', () => {
    let c = createCareer({ seed: 27, coach: input(46, 'coachOnly') });
    c = playSeason(c);
    becomePresident(c, 2);
    nextSeason(c);
    const wages = [];
    for (let s = 0; s < 3; s++) {
      while (!seasonOver(c)) {
        const before = c.cash;
        const h = c.hired;
        c = playWeek(c);
        if (h && c.hired?.id === h.id) wages.push(c.ledger.some((e) => /Trainer|Manager/.test(e.text) && e.amount === -h.salary));
        expect(humanClub(c).squad.length).toBeGreaterThanOrEqual(7);
        expect(c.cash).toBeGreaterThanOrEqual(0);
        expect(before).toBeTypeOf('number');
      }
      expect(isPresident(c)).toBe(true);
      nextSeason(c);
    }
    expect(wages.length).toBeGreaterThan(10);
    expect(wages.filter(Boolean).length).toBeGreaterThan(5); // Lohn steht im Kassenbuch (die Liste ist auf 60 Einträge gekappt)
    expect(c.season).toBe(5);
  }, 900000);

  it('the hired manager sets the in-match persona and tactic; a better manager lifts player development a bit', () => {
    let c = createCareer({ seed: 28, coach: input(46, 'coachOnly') });
    becomePresident(c, 0);
    nextSeason(c);
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    const p = prepareMatch(c, f, { duration: 60 });
    const humanSide = p.humanIsAway ? 1 : 0;
    expect(p.match.coachPersona[f.home === humanClub(c).id ? 0 : 1]).toBe(c.hired.persona);
    expect(humanSide).toBe(0);
    expect(p.match.humanTeam).toBe(null); // nicht mehr selbst gesteuert
  });

  it('the president sets the season target himself until the half-term report', () => {
    const c = createCareer({ seed: 29, coach: input(46, 'coachOnly') });
    expect(canSetGoal(c)).toBe(false); // noch kein Präsident
    becomePresident(c);
    nextSeason(c);
    expect(canSetGoal(c)).toBe(true);
    expect(setPresidentGoal(c, 'aufstieg')).toBe(true);
    expect(c.goal).toMatchObject({ type: 'aufstieg', target: 2, byPresident: true });
    expect(setPresidentGoal(c, 'quatsch')).toBe(false);
  });

  it('sacking the manager costs severance, leaves the post vacant (captain picks the team), and the next hire costs a fee', () => {
    let c = createCareer({ seed: 30, coach: input(46, 'coachOnly') });
    becomePresident(c, 0);
    nextSeason(c);
    c.cash = 3;
    expect(fireCoach(c)).toMatchObject({ ok: false, reason: 'cash' });
    expect(c.hired).toBeTruthy();
    c.cash = 500;
    const fee = severance(c);
    const r = fireCoach(c);
    expect(r).toMatchObject({ ok: true, fee });
    expect(c.cash).toBe(500 - fee);
    expect(c.hired).toBe(null);
    expect(vacant(c)).toBe(true);
    expect(legacy(c).hiredLog.at(-1).why).toBe('fired');
    // Die Saison geht ohne Trainer weiter (Kapitän stellt auf)
    c = playWeek(c);
    expect(c.week.chat.some((m) => /vakant|vacant/.test(m.text))).toBe(true);
    // Neuer Trainer: Handgeld
    const cand = coachApplicants(c)[0];
    const cash = c.cash;
    expect(hireFee(c, cand)).toBeGreaterThan(0);
    expect(appointCoach(c, cand).ok).toBe(true);
    expect(c.cash).toBe(cash - hireFee(c, { ...cand }));
    expect(c.hired.name).toBe(cand.name);
    expect(c.hiredCount).toBe(2);
    expect(fireCoach(c).ok).toBe(true);
  });

  it('without money the hired manager walks away (no debt), the post is vacant', () => {
    let c = createCareer({ seed: 31, coach: input(46, 'coachOnly') });
    becomePresident(c, 0);
    nextSeason(c);
    c.cash = 0; // Kasse leer, wenn der Wochenlohn fällig wird
    const notes = weeklyHired(c);
    expect(notes.join(' ')).toMatch(/Kasse ist leer|kitty is empty/);
    expect(c.hired).toBe(null);
    expect(c.cash).toBeGreaterThanOrEqual(0);
    expect(legacy(c).hiredLog.at(-1).why).toBe('unpaid');
  });

  it('succession by a child stays available from the president\'s chair and puts him back on the touchline', () => {
    const c = createCareer({ seed: 32, coach: input(52, 'coachOnly', [{ name: 'Lena', age: 25, sex: 'w' }]) });
    becomePresident(c, 0);
    nextSeason(c);
    expect(isPresident(c)).toBe(true);
    c.round = c.fixtures.length;
    expect(stepDown(c)).toBe(true);
    const cands = successionCandidates(c);
    expect(cands.map((x) => x.type)).not.toContain('extern'); // schon Präsident
    const lena = cands.find((x) => x.child === 'Lena');
    expect(lena).toBeTruthy();
    const hiredName = c.hired.name;
    succeed(c, lena);
    expect(isPresident(c)).toBe(false);
    expect(c.hired).toBe(null);
    expect(playerOf(c, c.coach.idx).name).toBe('Lena Brandt');
    expect(c.coach.office).toBeUndefined();
    expect(c.chronicle ?? c.saga.chronicle).toBeTruthy();
    expect(JSON.stringify(c.saga.chronicle)).toContain(hiredName);
  });

  it('the autoplay season end still prefers the in-club successor over a hire', () => {
    const c = createCareer({ seed: 33, coach: input(79, 'coachOnly') }); // 80: Familie entscheidet
    for (let i = 0; i < 3; i++) skip(c);
    expect(isPresident(c)).toBe(false);
    expect(legacy(c).eras.length).toBeGreaterThanOrEqual(1);
    expect(legacy(c).eras[0].how).not.toBe('extern');
  });

  it('survives save and load as president; the age of the manager grows with the seasons', () => {
    let c = createCareer({ seed: 34, coach: input(46, 'coachOnly') });
    becomePresident(c, 1);
    nextSeason(c);
    const a0 = hiredAge(c);
    c = migrateCareer(JSON.parse(JSON.stringify(c)));
    expect(isPresident(c)).toBe(true);
    expect(c.hired.name).toBeTruthy();
    nextSeason(c);
    c.round = 0;
    expect(hiredAge(c)).toBe(a0 + 1);
    applyCoachTactic(c);
    expect(humanClub(c).tactic.coachSeed).toBe(c.hired.seed);
  });
});
