import { describe, expect, it } from 'vitest';
import { PITCHES } from '../src/sim/pitch.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { activeShouts, enableManager, shout } from '../src/sim/coach.js';
import { attackDir } from '../src/sim/players.js';

const DT = 1 / 60;

// Ein Spiel im Trainer-Modus; call(m) darf alle paar Sekunden reinrufen.
function play(seed, call, seconds = 90) {
  const m = enableManager(createMatch({ seed, pitch: PITCHES.rasenplatz, human: true, duration: seconds, aiCoach: false }));
  // Tiefe getrennt nach Ballbesitz: Aufrücken wirkt mit Ball, Hinten dicht gegen den Ball.
  const acc = { att: 0, attN: 0, def: 0, defN: 0 };
  for (let i = 0; i < seconds * 60 * 1.6 && m.phase !== 'ended'; i++) { // Unterbrechungen kosten Zeit
    const input = i === 60 && call ? { shout: call } : undefined; // einmal rufen, gilt dann
    stepMatch(m, input, DT);
    m.events.length = 0;
    if (m.phase === 'play' && i % 30 === 0) {
      const s = attackDir(m, 0);
      // Relativ zum Ball: Wie weit steht die Mannschaft vor (mit Ball) bzw. hinter ihm (gegen den Ball)?
      const k = m.lastTouchTeam === 0 ? 'att' : 'def';
      for (const p of m.players) if (p.team === 0 && p.role !== 'gk') (acc[k] += (p.pos.x - m.ball.pos.x) * s), acc[`${k}N`]++;
    }
  }
  return { m, att: acc.att / (acc.attN || 1), def: acc.def / (acc.defN || 1) };
}

describe('manager mode', () => {
  it('nobody is steered; the team plays on its own and the match ends', () => {
    const { m } = play(3, null);
    expect(m.phase).toBe('ended');
    expect(m.controlledId).toBe(null);
    expect(m.stats.teams[0].shots + m.stats.teams[1].shots).toBeGreaterThan(0);
  });

  it('shouts need a breather, stay on until called off again', () => {
    const m = enableManager(createMatch({ seed: 1, pitch: PITCHES.rasenplatz, human: true, duration: 60 }));
    m.time = 10;
    expect(shout(m, 'press')).toBe(true);
    expect(shout(m, 'back')).toBe(false); // zu schnell hintereinander
    expect(activeShouts(m)).toContain('press');
    m.time = 30;
    expect(activeShouts(m)).toContain('press'); // ein Befehl bleibt
    expect(shout(m, 'back')).toBe(true); // Gegenteil löst ihn ab
    expect(activeShouts(m)).toEqual(['back']);
    m.time = 35;
    shout(m, 'back');
    expect(activeShouts(m)).toEqual([]);
    expect(shout(m, 'nonsense')).toBe(false);
  });

  it('"Rückt auf!" means a higher team on the ball, "Hinten dicht!" a deeper one without it', async () => {
    const { anchor } = await import('../src/sim/ai.js');
    const height = (call, possession) => {
      const m = enableManager(createMatch({ seed: 11, pitch: PITCHES.rasenplatz, human: true, aiCoach: false }));
      m.time = 5;
      if (call) shout(m, call);
      const s = attackDir(m, 0);
      const ours = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
      return ours.reduce((sum, p) => sum + anchor(m, p, possession).x * s, 0) / ours.length;
    };
    expect(height('forward', true)).toBeGreaterThan(height(null, true) + 1);
    expect(height('back', false)).toBeLessThan(height(null, false) - 1);
  });
});

describe('live ticker with decisions', async () => {
  const { answer, checkDecision, createTouchline } = await import('../src/sim/touchline.js');

  function run(seed, pick) {
    const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 120 });
    const tl = createTouchline(m, 1); // die Gäste coachen
    const asked = [];
    const after = {}; // Einstellung direkt nach jeder Entscheidung
    for (let i = 0; i < 120 * 60 * 1.5 && m.phase !== 'ended'; i++) {
      stepMatch(m, undefined, DT);
      const d = checkDecision(tl, m.events);
      m.events.length = 0;
      if (d) {
        asked.push(d.id);
        answer(tl, pick(d));
        after[d.id] ??= m.mentality;
      }
    }
    return { m, asked, after };
  }

  it('asks at kick-off and half-time and applies the answer', () => {
    const { m, asked, after } = run(21, (d) => (d.id === 'start' ? 1 : 0));
    expect(asked[0]).toBe('start');
    expect(asked).toContain('halftime');
    expect(after.start).toBe('offensive'); // später darf sich die Einstellung je nach Spielstand ändern
    expect(m.phase).toBe('ended');
  });

  it('a substitution choice brings on the bench player', () => {
    let subbed = false;
    for (const seed of [31, 32, 33, 34, 35]) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 120 });
      const tl = createTouchline(m, 0);
      for (const p of m.players) if (p.team === 0 && p.role !== 'gk') p.stamina = 0.3;
      m.time = m.duration * 0.62; // 56. Minute
      m.half = 2;
      tl.asked.add('start');
      tl.asked.add('halftime');
      const d = checkDecision(tl, []);
      if (d?.id !== 'sub') continue;
      const incoming = m.bench[0][0];
      answer(tl, 1);
      expect(m.players).toContain(incoming);
      subbed = true;
      break;
    }
    expect(subbed).toBe(true);
  });
});

describe('build-up play', () => {
  it('carriers dribble towards goal and rarely pass back to their own keeper', () => {
    let fwd = 0;
    let back = 0;
    let passes = 0;
    let toKeeper = 0;
    for (const seed of [41, 42]) {
      const m = enableManager(createMatch({ seed, pitch: PITCHES.rasenplatz, human: true, duration: 120 }));
      for (let i = 0; i < 120 * 60 * 1.3 && m.phase !== 'ended'; i++) {
        stepMatch(m, undefined, DT);
        for (const e of m.events) {
          if (e.type !== 'pass') continue;
          passes++;
          if (m.players.find((q) => q.id === e.targetId)?.role === 'gk') toKeeper++;
        }
        m.events.length = 0;
        const c = m.players.find((p) => p.id === m.ball.lastTouch);
        if (m.phase !== 'play' || !c || c.role === 'gk' || m.ball.lastAction !== 'dribble') continue;
        if (Math.hypot(c.pos.x - m.ball.pos.x, c.pos.z - m.ball.pos.z) > 1.1) continue;
        const v = c.vel.x * attackDir(m, c.team);
        if (v > 0.5) fwd++;
        else if (v < -0.5) back++;
      }
    }
    expect(fwd / (fwd + back)).toBeGreaterThan(0.75);
    expect(toKeeper / passes).toBeLessThan(0.05);
  });
});

describe('tactics', async () => {
  const { SYSTEMS, STYLES, normalizeTactic, systemFormation, clubTactic } = await import('../src/sim/tactics.js');
  const { createCareer, currentLineup, humanClub, setClubTactic, teamForMatch } = await import('../src/career/career.js');

  it('every system fits its format and every style is complete', () => {
    for (const [format, systems] of Object.entries(SYSTEMS)) {
      for (const sys of Object.values(systems)) {
        expect(sys.formation.length).toBe(Number(format));
        expect(sys.formation.filter((e) => e.role === 'gk')).toHaveLength(1);
      }
    }
    const keys = Object.keys(STYLES.ausgewogen);
    for (const st of Object.values(STYLES)) for (const k of keys) expect(st[k], k).not.toBeUndefined();
    expect(normalizeTactic({ system: 'quatsch', style: 'quatsch' }, 5)).toEqual({ system: '2-1-1', style: 'ausgewogen' });
    expect(clubTactic('kanal', 7)).toEqual(clubTactic('kanal', 7));
  });

  it('the chosen system shapes the line-up and the match', () => {
    const c = createCareer({ seed: 77 });
    const { format } = currentLineup(c);
    const other = Object.keys(SYSTEMS[format])[1];
    setClubTactic(c, format, { system: other, style: 'konter' });
    const lu = currentLineup(c);
    expect(lu.tactic).toEqual({ system: other, style: 'konter', orders: {} });
    expect(lu.formation.map((e) => e.role)).toEqual(systemFormation(format, other).map((e) => e.role));
    const club = humanClub(c);
    const team = teamForMatch(c, club, format, c.week.availability, createRngLocal());
    const m = createMatch({ seed: 3, pitch: { ...PITCHES.hinterhof, format }, teams: [team, team], human: true, duration: 30 });
    expect(m.plan[0].style).toBe('konter');
    expect(m.players.filter((p) => p.team === 0).map((p) => p.role)).toEqual(systemFormation(format, other).map((e) => e.role));
  });
});

function createRngLocal() {
  let a = 7;
  return { next: () => ((a = (a * 16807) % 2147483647) / 2147483647), int: (lo, hi) => lo, chance: () => false, pick: (arr) => arr[0], range: (lo) => lo, gauss: () => 0 };
}

describe('team chat banter', async () => {
  const { createCareer, finishRound, humanClub } = await import('../src/career/career.js');
  const { weeklyBanter, BANTER_EVENTS } = await import('../src/career/banter.js');
  const { resolveEvent } = await import('../src/career/events.js');

  it('three no-shows in a row get called out and become a decision with visible effects', () => {
    const c = createCareer({ seed: 91 });
    const idx = humanClub(c).squad.find((i) => i !== c.coach?.idx);
    c.players[idx].noStreak = 2;
    c.week.availability[idx] = 'no';
    const said = weeklyBanter(c);
    expect(c.players[idx].noStreak).toBe(3);
    expect(c.week.chat.some((m) => m.banter)).toBe(true);
    if (said.some((s) => s.kind === 'streak' && s.to === idx)) {
      const ctx = BANTER_EVENTS.dauerabsager.needs(c);
      expect(ctx?.idx).toBe(idx);
      c.week.event = { id: 'dauerabsager', ctx, text: 'x', options: ['a', 'b', 'c'], choice: null, result: null };
      resolveEvent(c, 0);
      expect(Array.isArray(c.week.event.effects)).toBe(true);
    }
  });

  it('a season of weeks produces banter without breaking anything', () => {
    const c = createCareer({ seed: 92 });
    let lines = 0;
    for (let r = 0; r < 8; r++) {
      lines += c.week.chat.filter((m) => m.banter).length;
      finishRound(c);
    }
    expect(lines).toBeGreaterThan(4);
  });
});

describe('club memory', async () => {
  const { createCareer, humanClub, releasePlayer, teamForMatch, clubById } = await import('../src/career/career.js');
  const { memoryAfterMatch, placeFormers, preMatchMemories } = await import('../src/career/memory.js');

  it('a player who leaves turns up at a rival, is announced and flagged as the old boy', () => {
    const c = createCareer({ seed: 55 });
    const club = humanClub(c);
    const idx = club.squad.find((i) => i !== c.coach?.idx);
    expect(releasePlayer(c, idx)).toBe(true);
    expect(c.formers[idx]).toBeTruthy();
    for (let s = 0; s < 6 && !c.formers[idx].club; s++) {
      c.season++;
      placeFormers(c);
    }
    const rival = clubById(c, c.formers[idx].club);
    expect(rival.squad).toContain(idx);
    const chat = [];
    preMatchMemories(c, rival, chat);
    expect(chat.some((m) => m.memory)).toBe(true);
    const team = teamForMatch(c, rival, 5, Object.fromEntries(rival.squad.map((i) => [i, 'yes'])), { next: () => 0.5, int: (a) => a, chance: () => false, pick: (a) => a[0], range: (a) => a, gauss: () => 0 });
    const tagged = team.players.find((p) => p.poolIndex === idx);
    if (tagged) expect(tagged.story?.former).toBe(true);
  });
});

describe('bonds on the pitch', async () => {
  const { createCareer, humanClub, teamForMatch } = await import('../src/career/career.js');
  const { setRelation } = await import('../src/career/relations.js');
  const { bondOf } = await import('../src/sim/bonds.js');

  it('rivals and hot form travel into the match', () => {
    const c = createCareer({ seed: 66 });
    const club = humanClub(c);
    const [a, b] = club.squad.filter((i) => i !== c.coach?.idx);
    setRelation(c, a, b, 'rivalen');
    c.players[a].form = 0.5;
    const avail = Object.fromEntries(club.squad.map((i) => [i, 'yes']));
    const team = teamForMatch(c, club, 5, avail, { next: () => 0.5, int: (x) => x, chance: () => false, pick: (x) => x[0], range: (x) => x, gauss: () => 0 });
    expect(Object.values(team.rels)).toContain('rivalen');
    expect(team.players.find((p) => p.poolIndex === a)?.hot).toBe(true);
    const m = createMatch({ seed: 1, pitch: PITCHES.park, teams: [team, team], human: false, duration: 30 });
    const pa = [...m.players, ...m.bench.flat()].find((p) => p.team === 0 && p.poolIndex === a);
    const pb = [...m.players, ...m.bench.flat()].find((p) => p.team === 0 && p.poolIndex === b);
    if (pa && pb) expect(bondOf(m, pa, pb)).toBe('rivalen');
  });
});

describe('matchday surprises', async () => {
  const { matchdaySurprise } = await import('../src/career/matchday.js');
  const { createRng } = await import('../src/core/rng.js');

  it('the man stuck in traffic joins after a third of the match', () => {
    let tested = false;
    for (let seed = 1; seed < 80 && !tested; seed++) {
      const m = createMatch({ seed: 4, pitch: PITCHES.rasenplatz, human: false, duration: 60 });
      matchdaySurprise(m, 0, createRng(seed), 1);
      if (m.surprise?.id !== 'stau') continue;
      const before = m.players.filter((p) => p.team === 0).length;
      while (m.time < 25 && m.phase !== 'ended') {
        stepMatch(m, undefined, DT);
        m.events.length = 0;
      }
      expect(m.players.filter((p) => p.team === 0).length).toBe(before + 1);
      tested = true;
    }
    expect(tested).toBe(true);
  });
});

describe('opponents with a face', async () => {
  const { createCareer, finishRound, humanFixture, prepareMatch, recordResult, simulateSync } = await import('../src/career/career.js');
  const { coachOf } = await import('../src/career/opponents.js');

  it('the rival coach speaks, meetings are remembered and news reaches the chat', () => {
    const c = createCareer({ seed: 70 });
    expect(c.week.chat.some((m) => m.press)).toBe(true);
    const opp = c.clubs.find((x) => !x.human);
    expect(coachOf(opp)).toEqual(coachOf(opp));
    let news = 0;
    for (let r = 0; r < 6; r++) {
      const f = humanFixture(c);
      const prepared = prepareMatch(c, f, { duration: 60 });
      simulateSync(prepared);
      recordResult(c, f, prepared);
      news += (c.pendingNews ?? []).length;
      finishRound(c);
    }
    expect(Object.values(c.meetings).flat().length).toBe(6);
    expect(news).toBeGreaterThan(0);
  });
});

describe('tactics meet conditions', async () => {
  const { styleFit, jobFits, applyFit } = await import('../src/sim/fit.js');
  it('bus parking suits a wet cinder pitch, short passing does not, and the postman loves pressing', () => {
    const wetAsh = { ...PITCHES.ascheplatz, surface: { ...PITCHES.ascheplatz.surface, wet: true } };
    expect(styleFit('mauern', wetAsh).score).toBe(1);
    expect(styleFit('kurzpass', wetAsh).score).toBe(-1);
    expect(styleFit('pressing', { ...PITCHES.park, heat: 1.35 }).score).toBe(-1);
    expect(jobFits('pressing', 'Postbote')).toBe(true);
    expect(jobFits('kurzpass', 'Postbote')).toBe(false);
    const team = { players: [{ profession: 'Postbote', attrs: { stamina: 0.5, tackling: 0.5, pace: 0.5 } }] };
    const out = applyFit(team, 'pressing', PITCHES.park);
    expect(out.players[0].attrs.stamina).toBeGreaterThan(0.5);
    expect(out.matches).toBe(1);
  });
});

describe('club museum', async () => {
  const { createCareer, humanClub, updateClub } = await import('../src/career/career.js');
  const { museum } = await import('../src/career/museum.js');
  it('collects titles, cups, records, legends and the kit archive', () => {
    const c = createCareer({ seed: 88 });
    c.history = [{ season: 1, league: 'Freizeitliga', pos: 1, promoted: true }];
    c.trophies = [{ name: 'Stadtmeisterschaft 2026', season: 1 }];
    c.meetings = { [c.clubs[1].id]: [{ season: 1, gf: 6, ga: 1 }, { season: 1, gf: 0, ga: 4 }] };
    c.cash = 500;
    updateClub(c, { kit: { shirt: 0xc8352f } });
    const mu = museum(c);
    expect(mu.trophies).toHaveLength(2);
    expect(mu.records.map((r) => r.text).join()).toContain('6:1');
    expect(mu.kits.length).toBe(2);
    expect(humanClub(c).kitHistory).toHaveLength(1);
  });
});

describe('season target', async () => {
  const { createCareer, finishRound, nextSeason } = await import('../src/career/career.js');
  it('the board sets a target, writes a half-term report and judges the season', () => {
    const c = createCareer({ seed: 99 });
    expect(c.goal?.season).toBe(1);
    expect(['aufstieg', 'obere', 'erhalt']).toContain(c.goal.type);
    for (let r = 0; r < c.fixtures.length; r++) finishRound(c);
    expect(c.goal.mid).toBe(true);
    const cash = c.cash;
    nextSeason(c);
    expect(c.goal.season).toBe(2);
    expect(c.saga.chronicle.some((e) => /Saisonziel|Season target/.test(e.text))).toBe(true);
    expect(typeof cash).toBe('number');
  });
});
