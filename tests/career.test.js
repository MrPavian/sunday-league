import { describe, expect, it } from 'vitest';
import {
  buildLineup,
  createCareer,
  finishRound,
  humanClub,
  humanFixture,
  loadCareer,
  nudge,
  prepareMatch,
  recordResult,
  saveCareer,
  seasonOver,
  simulateSync,
  table,
} from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

describe('career', () => {
  const career = createCareer({ seed: 99 });

  it('builds six clubs with nine unique pool players each', () => {
    expect(career.clubs).toHaveLength(6);
    const all = career.clubs.flatMap((c) => c.squad);
    expect(new Set(all).size).toBe(55); // 6 × 9 + du als Spielertrainer
    for (const c of career.clubs) expect(c.squad).toHaveLength(c.human ? 10 : 9);
    expect(humanClub(career).squad).toContain(career.coach.idx);
  });

  it('schedules a double round robin: everyone plays everyone home and away', () => {
    expect(career.fixtures).toHaveLength(10);
    const pairs = {};
    for (const round of career.fixtures) {
      expect(round).toHaveLength(3);
      const inRound = round.flatMap((f) => [f.home, f.away]);
      expect(new Set(inRound).size).toBe(6);
      for (const f of round) pairs[`${f.home}>${f.away}`] = (pairs[`${f.home}>${f.away}`] ?? 0) + 1;
    }
    expect(Object.keys(pairs)).toHaveLength(30);
    expect(Object.values(pairs).every((n) => n === 1)).toBe(true);
  });

  it('opens each week with a chat: announcement plus an answer from every player', () => {
    const w = career.week;
    expect(w.chat[0].from).toBeNull();
    expect(w.chat).toHaveLength(10);
    for (const idx of humanClub(career).squad) expect(['yes', 'no', 'late']).toContain(w.availability[idx]);
  });

  it('nudging only works on declines, three times per week', () => {
    const c = createCareer({ seed: 5 });
    const declined = Object.entries(c.week.availability).filter(([, s]) => s === 'no');
    const yes = Object.entries(c.week.availability).find(([, s]) => s === 'yes');
    if (yes) expect(nudge(c, Number(yes[0]))).toBeNull();
    for (const [idx] of declined.slice(0, 3)) expect(typeof nudge(c, Number(idx))).toBe('boolean');
    expect(c.week.nudges).toBe(Math.max(0, 3 - Math.min(3, declined.length)));
  });

  it('fills up with a helper when too few can play', () => {
    const club = humanClub(career);
    const availability = Object.fromEntries(club.squad.map((idx, i) => [idx, i < 3 ? 'yes' : 'no']));
    const { lineup, helpers } = buildLineup(career, club, 5, availability, createRng(1));
    expect(lineup).toHaveLength(5);
    expect(helpers).toHaveLength(2);
  });

  it('plays a whole season (short matches), fills the table and survives save/load', () => {
    const c = createCareer({ seed: 7 });
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) {
        const prepared = prepareMatch(c, f, { duration: 40 });
        simulateSync(prepared);
        recordResult(c, f, prepared);
      }
      finishRound(c);
    }
    const t = table(c);
    expect(t).toHaveLength(6);
    for (const row of t) expect(row.played).toBe(10);
    expect(t.reduce((s, r) => s + r.gf, 0)).toBe(t.reduce((s, r) => s + r.ga, 0));
    for (let i = 1; i < t.length; i++) expect(t[i - 1].pts).toBeGreaterThanOrEqual(t[i].pts);
    const apps = humanClub(c).squad.map((idx) => c.players[idx].apps);
    expect(Math.max(...apps)).toBeGreaterThan(3);

    const storage = memoryStorage();
    expect(saveCareer(c, storage)).toBe(true);
    expect(loadCareer(storage)).toEqual(c);
  });

  it('the human club is team 0 even when playing away', () => {
    const c = createCareer({ seed: 3 });
    let f = humanFixture(c);
    while (f.home === humanClub(c).id) {
      finishRound(c);
      f = humanFixture(c);
    }
    const prepared = prepareMatch(c, f, { human: true, duration: 30 });
    expect(prepared.humanIsAway).toBe(true);
    expect(prepared.match.teams[0].name).toBe(humanClub(c).name);
    simulateSync(prepared);
    const result = recordResult(c, f, prepared);
    expect(result.away).toBe(prepared.match.score[0]);
  });
});

describe('lineup', () => {
  it("uses the manager's picks and swaps when a player is moved", async () => {
    const { currentLineup, setLineupSlot, resetLineup } = await import('../src/career/career.js');
    const c = createCareer({ seed: 21 });
    const auto = currentLineup(c);
    const benchGuy = humanClub(c).squad.find((idx) => c.week.availability[idx] === 'yes' && !auto.lineup.includes(idx));
    const last = auto.lineup.length - 1;
    if (benchGuy !== undefined) {
      setLineupSlot(c, last, benchGuy);
      expect(currentLineup(c).lineup[last]).toBe(benchGuy);
    }
    const a = currentLineup(c).lineup[0];
    const b = currentLineup(c).lineup[1];
    setLineupSlot(c, 0, b);
    expect(currentLineup(c).lineup.slice(0, 2)).toEqual([b, a]);
    // Die gewählte Aufstellung landet auch im Match.
    const prepared = prepareMatch(c, humanFixture(c), { human: true, duration: 10 });
    const team0 = prepared.match.players.filter((p) => p.team === 0).map((p) => p.poolIndex);
    expect(team0).toEqual(currentLineup(c).lineup);
    resetLineup(c);
    expect(currentLineup(c).lineup).toEqual(auto.lineup);
  });
});

describe('transfers', () => {
  it('brings three rumors a week about players without a club', async () => {
    const { MAX_SQUAD } = await import('../src/career/career.js');
    const c = createCareer({ seed: 44 });
    const taken = new Set(c.clubs.flatMap((cl) => cl.squad));
    expect(c.week.rumors).toHaveLength(3);
    for (const r of c.week.rumors) {
      expect(taken.has(r.idx)).toBe(false);
      expect(r.source.length).toBeGreaterThan(20);
      expect(r.range[1]).toBeGreaterThan(r.range[0]);
    }
    expect(MAX_SQUAD).toBe(12);
  });

  it('scouting and recruiting cost actions; a signing joins squad, chat and lineup pool', async () => {
    const { scoutRumor, recruit } = await import('../src/career/career.js');
    let joined = null;
    for (let seed = 1; seed < 40 && !joined; seed++) {
      const c = createCareer({ seed });
      expect(scoutRumor(c, 0)).toBe(true);
      expect(scoutRumor(c, 0)).toBe(false); // schon beobachtet
      const res = recruit(c, 0);
      expect(['joined', 'declined']).toContain(res);
      expect(c.week.actions).toBe(0);
      expect(recruit(c, 1)).toBeNull(); // keine Aktion mehr übrig
      if (res === 'joined') joined = c;
    }
    expect(joined).not.toBeNull();
    const idx = joined.week.rumors[0].idx;
    expect(humanClub(joined).squad).toContain(idx);
    expect(joined.players[idx].apps).toBe(0);
    expect(joined.week.availability[idx]).toBe('yes');
  });

  it('respects the squad limits', async () => {
    const { recruit, releasePlayer, MIN_SQUAD, MAX_SQUAD } = await import('../src/career/career.js');
    const c = createCareer({ seed: 8 });
    const club = humanClub(c);
    while (club.squad.length < MAX_SQUAD) club.squad.push(100000 + club.squad.length);
    c.week.actions = 2;
    expect(recruit(c, 0)).toBe('full');
    const c2 = createCareer({ seed: 9 });
    const club2 = humanClub(c2);
    const others = () => club2.squad.filter((i) => i !== c2.coach.idx);
    expect(releasePlayer(c2, c2.coach.idx)).toBe(false); // dich selbst wirfst du nicht raus
    while (club2.squad.length > MIN_SQUAD) expect(releasePlayer(c2, others().at(-1))).toBe(true);
    expect(releasePlayer(c2, others()[0])).toBe(false);
  });

  it('ex-pros are shy of hype but like a good dressing room', async () => {
    const { recruitChance } = await import('../src/career/career.js');
    const c = createCareer({ seed: 12 });
    const legend = { idx: (await import('../src/career/career.js')).getPool().byTier('legende')[0].poolIndex, scouted: false };
    const club = humanClub(c);
    const { poolPlayer } = await import('../src/career/career.js');
    club.squad = club.squad.filter((idx) => !['teamchemie', 'anfuehrer'].some((t) => poolPlayer(idx).traits.includes(t)));
    const base = recruitChance(c, legend);
    const leader = (await import('../src/career/career.js')).getPool().everyone().find((p) => p.traits.includes('anfuehrer') && p.tier === 'ok');
    club.squad.push(leader.poolIndex);
    expect(recruitChance(c, legend)).toBeGreaterThan(base);
  });
});

describe('seasons', () => {
  const finishSeason = async (c, humanWins) => {
    const { currentFixtures } = await import('../src/career/career.js');
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) {
        const h = c.clubs.find((cl) => cl.id === f.home);
        const a = c.clubs.find((cl) => cl.id === f.away);
        if (h.human) f.result = humanWins ? { home: 3, away: 0 } : { home: 0, away: 5 };
        else if (a.human) f.result = humanWins ? { home: 0, away: 3 } : { home: 5, away: 0 };
        else f.result = { home: 1, away: 1 };
      }
      finishRound(c);
    }
  };

  it('the champion goes up to Kreisklasse C: 7v7, referee, own lawn, squad kept', async () => {
    const { nextSeason, leagueOf, maxSquad } = await import('../src/career/career.js');
    const c = createCareer({ seed: 61 });
    const squad = [...humanClub(c).squad];
    const firstIdx = squad[0];
    c.players[firstIdx].goals = 7;
    await finishSeason(c, true);
    const before = [...humanClub(c).squad]; // unter der Saison können Leute gehen – der Aufstieg behält den Kader
    const res = nextSeason(c);
    expect(res).toMatchObject({ pos: 1, promoted: true });
    expect(leagueOf(c).level).toBe(2);
    expect(c.league).toBe('Kreisklasse C Kanalbezirk');
    expect(c.season).toBe(2);
    expect(c.round).toBe(0);
    expect(humanClub(c).squad).toEqual(before.filter((i) => !res.retired.some((r) => r.idx === i)));
    expect(squad.length).toBeGreaterThan(0);
    expect(humanClub(c).venue).toBe('rasenplatz');
    if (c.players[firstIdx]) {
      expect(c.players[firstIdx].total.goals).toBe(7);
      expect(c.players[firstIdx].goals).toBe(0);
    }
    expect(maxSquad(c)).toBe(16);
    expect(c.history).toHaveLength(1);
    const ai = c.clubs.filter((cl) => !cl.human);
    expect(ai.map((cl) => cl.id)).toContain('eichenkamp');
    for (const cl of ai) expect(cl.squad).toHaveLength(13);
    const prepared = prepareMatch(c, humanFixture(c), { human: true, duration: 5 });
    expect(prepared.match.pitch.format).toBe(7);
    expect(prepared.match.referee).not.toBeNull();
    expect(prepared.match.players.filter((p) => p.team === 0)).toHaveLength(7);
  });

  it('last place in Kreisklasse C goes back down, mid-table stays', async () => {
    const { nextSeason, leagueOf } = await import('../src/career/career.js');
    const c = createCareer({ seed: 62 });
    await finishSeason(c, true);
    nextSeason(c);
    await finishSeason(c, false);
    expect(nextSeason(c)).toMatchObject({ relegated: true });
    expect(leagueOf(c).level).toBe(1);
    expect(humanClub(c).venue).toBe('hinterhof');
    const stay = createCareer({ seed: 63 });
    await finishSeason(stay, false);
    expect(nextSeason(stay)).toMatchObject({ promoted: false, relegated: false });
    expect(leagueOf(stay).level).toBe(1);
  });
});

describe('club & kits', () => {
  it('kits can be ordered before the season only, and clashes switch the away kit', async () => {
    const { updateClub, kitEditable, colorDistance } = await import('../src/career/career.js');
    const c = createCareer({ seed: 70 });
    expect(kitEditable(c)).toBe(true);
    expect(updateClub(c, { name: 'Rot-Weiß Pfütze', short: 'rwp', kit: { shirt: 0xc8352f, pattern: 'streifen', second: 0xf2efe6 } })).toBe(true);
    const club = humanClub(c);
    expect(club.name).toBe('Rot-Weiß Pfütze');
    expect(club.short).toBe('RWP');
    expect(club.kit.pattern).toBe('streifen');
    expect(colorDistance(club.keeperKit.shirt, club.kit.shirt)).toBeGreaterThan(150);
    // Dynamo Döner spielt in Rot – bei einem Duell muss jemand ausweichen.
    let f = null;
    for (let r = 0; r < c.fixtures.length && !f; r++) f = c.fixtures[r].find((x) => [x.home, x.away].includes('doener') && [x.home, x.away].includes(club.id));
    c.round = c.fixtures.findIndex((round) => round.includes(f));
    const prepared = prepareMatch(c, f, { duration: 5 });
    const [a, b] = prepared.match.teams;
    expect(colorDistance(a.kit.shirt, b.kit.shirt)).toBeGreaterThan(110);
    c.round = 1;
    expect(updateClub(c, { name: 'Zu spät' })).toBe(false);
  });
});

describe('club finances', () => {
  it('starts with a cash box, sponsor offers before the season and a fines catalogue', async () => {
    const { FINES, START_CASH } = await import('../src/career/finances.js');
    const c = createCareer({ seed: 80 });
    expect(c.cash).toBe(START_CASH);
    expect(c.offers.length).toBe(4); // je 2 für Trikot und Bande
    expect(FINES.find((f) => f.id === 'whiff').amount).toBe(1);
  });

  it('fines come from what really happened in the match', async () => {
    const c = createCareer({ seed: 81 });
    const f = humanFixture(c);
    const prepared = prepareMatch(c, f, { human: true, duration: 5 });
    simulateSync(prepared);
    const me = prepared.match.players.find((p) => p.team === 0 && p.role !== 'gk');
    const st = prepared.match.stats.players[me.id];
    st.whiffs = 3;
    st.yellow = 1;
    const before = c.cash;
    recordResult(c, f, prepared);
    expect(c.fines[me.poolIndex]).toBeGreaterThanOrEqual(8); // 3 × 1 € + 5 €
    const fineEntry = c.ledger.find((e) => e.text.startsWith('Strafen eingesammelt'));
    expect(fineEntry.amount).toBeGreaterThanOrEqual(8);
    expect(c.cash).toBeGreaterThan(before); // plus Getränkeverkauf, falls Heimspiel
  });

  it('sponsors pay every week and a bonus when the goal is reached', async () => {
    const { acceptSponsor, closeSeasonFinances, weeklyFinances } = await import('../src/career/finances.js');
    const c = createCareer({ seed: 82 });
    expect(acceptSponsor(c, 0)).toBe(true); // Trikot
    expect(c.offers.every((o) => o.slot === 'bande')).toBe(true);
    expect(acceptSponsor(c, 0)).toBe(true); // Bande
    expect(acceptSponsor(c, 0)).toBe(false); // alles vergeben
    const [sponsor, second] = c.sponsors;
    const cash = c.cash;
    weeklyFinances(c);
    expect(c.cash).toBe(cash + humanClub(c).squad.length * 3 + sponsor.weekly + second.weekly);
    second.goal = { type: 'goals', n: 99, text: 'unerreichbar' };
    sponsor.goal = { type: 'wins', n: 1, text: 'mindestens 1 Sieg' };
    const beforeBonus = c.cash;
    closeSeasonFinances(c, { wins: 3, goals: 10, rank: 2, cards: 4 });
    expect(c.cash).toBe(beforeBonus + sponsor.bonus);
    expect(c.sponsors).toHaveLength(0);
  });

  it('the season trip costs money and lifts spirits next season', async () => {
    const { bookTrip, TRIP_COST } = await import('../src/career/finances.js');
    const { nextSeason, currentFixtures } = await import('../src/career/career.js');
    const c = createCareer({ seed: 83 });
    expect(bookTrip(c)).toBe(false); // zu wenig Geld
    c.cash = 400;
    expect(bookTrip(c)).toBe(true);
    expect(c.cash).toBe(400 - TRIP_COST);
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) f.result = { home: 1, away: 1 };
      finishRound(c);
    }
    nextSeason(c);
    expect(c.spirit).toBe(1);
    expect(c.tripBooked).toBe(false);
  });

  it('a new kit costs money', async () => {
    const { updateClub } = await import('../src/career/career.js');
    const c = createCareer({ seed: 84 });
    c.cash = 10;
    expect(updateClub(c, { kit: { shirt: 0x2e6b3a } })).toBe('nocash');
    c.cash = 100;
    expect(updateClub(c, { kit: { shirt: 0x2e6b3a } })).toBe(true);
    expect(c.cash).toBe(40);
    expect(updateClub(c, { name: 'Nur der Name' })).toBe(true);
    expect(c.cash).toBe(40);
  });
});

describe('open training', () => {
  it('costs a little, brings six strangers incl. a youngster, three stations max', async () => {
    const { startTraining, runStation, STATIONS, TRAINING_COST } = await import('../src/career/training.js');
    const { playerOf } = await import('../src/career/career.js');
    const c = createCareer({ seed: 90 });
    const cash = c.cash;
    expect(startTraining(c)).toBe(true);
    expect(startTraining(c)).toBe(false); // einmal pro Woche
    expect(c.cash).toBe(cash - TRAINING_COST);
    const tr = c.week.training;
    expect(tr.trialists).toHaveLength(6);
    const taken = new Set(c.clubs.flatMap((cl) => cl.squad));
    for (const t of tr.trialists) expect(taken.has(t.idx)).toBe(false);
    expect(tr.trialists.some((t) => playerOf(c, t.idx).age <= 20)).toBe(true);
    for (const id of ['sprint', 'shooting', 'passing']) expect(runStation(c, id)).toBe(true);
    expect(runStation(c, 'juggling')).toBe(false);
    for (const t of tr.trialists) expect(Object.keys(t.results)).toEqual(['sprint', 'shooting', 'passing']);
    // Schnellere Spieler laufen im Schnitt bessere Zeiten.
    const byPace = [...tr.trialists].sort((a, b) => playerOf(c, b.idx).attrs.pace - playerOf(c, a.idx).attrs.pace);
    expect(Number(byPace[0].results.sprint)).toBeLessThan(Number(byPace[byPace.length - 1].results.sprint) + 0.3);
    expect(STATIONS.sprint.better).toBe('low');
  });

  it('invites only after the stations, at most two, joining the squad on a yes', async () => {
    const { startTraining, runStation, inviteTrialist } = await import('../src/career/training.js');
    let joined = false;
    for (let seed = 1; seed < 30 && !joined; seed++) {
      const c = createCareer({ seed: 300 + seed });
      startTraining(c);
      expect(inviteTrialist(c, 0)).toBeNull(); // erst trainieren
      for (const id of ['sprint', 'cooper', 'duels']) runStation(c, id);
      const results = [inviteTrialist(c, 0), inviteTrialist(c, 1), inviteTrialist(c, 2)];
      expect(results[2]).toBeNull();
      if (results.includes('joined')) {
        const t = c.week.training.trialists[results.indexOf('joined')];
        expect(humanClub(c).squad).toContain(t.idx);
        joined = true;
      }
    }
    expect(joined).toBe(true);
  });
});

describe('player development', () => {
  it('young players with minutes improve, veterans slow down, everyone ages', async () => {
    const { developPlayers, playerOf, getPool } = await import('../src/career/career.js');
    const c = createCareer({ seed: 95 });
    const pool = getPool();
    const young = pool.everyone().find((p) => p.age <= 19 && p.tier === 'gut' && !c.clubs.some((cl) => cl.squad.includes(p.poolIndex)));
    const old = pool.everyone().find((p) => p.age >= 36 && p.tier === 'gut' && !c.clubs.some((cl) => cl.squad.includes(p.poolIndex)));
    const club = humanClub(c);
    club.squad.push(young.poolIndex, old.poolIndex);
    c.players[young.poolIndex] = { apps: 8, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    c.players[old.poolIndex] = { apps: 8, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    const y0 = playerOf(c, young.poolIndex);
    const o0 = playerOf(c, old.poolIndex);
    developPlayers(c);
    c.season = 2;
    const y1 = playerOf(c, young.poolIndex);
    const o1 = playerOf(c, old.poolIndex);
    expect(y1.age).toBe(y0.age + 1);
    expect(y1.rating).toBeGreaterThan(y0.rating);
    expect(o1.attrs.pace).toBeLessThan(o0.attrs.pace);
    // Der Pool selbst bleibt unverändert.
    expect(pool.get(young.poolIndex).rating).toBe(y0.rating);
  });
});

describe('youth & retirement', () => {
  const endSeason = async (c) => {
    const { currentFixtures } = await import('../src/career/career.js');
    while (!seasonOver(c)) {
      for (const f of currentFixtures(c)) f.result = { home: 1, away: 1 };
      finishRound(c);
    }
  };

  it('starts with a youth coach and a first A-youth year group', async () => {
    const { playerOf } = await import('../src/career/career.js');
    const c = createCareer({ seed: 120 });
    expect(c.youth.coach.name).toBe('Heinz Brückner');
    expect(c.youth.prospects.length).toBeGreaterThanOrEqual(2);
    for (const idx of c.youth.prospects) {
      expect(playerOf(c, idx).age).toBeLessThanOrEqual(18);
      expect(humanClub(c).squad).not.toContain(idx);
    }
  });

  it('prospects grow in the youth team, can be promoted, and leave at 20', async () => {
    const { nextSeason, playerOf, maxSquad } = await import('../src/career/career.js');
    const { promoteProspect } = await import('../src/career/youth.js');
    const c = createCareer({ seed: 121 });
    const [a, b] = c.youth.prospects;
    const before = playerOf(c, a).rating;
    expect(promoteProspect(c, b, maxSquad(c))).toBe(true);
    expect(humanClub(c).squad).toContain(b);
    await endSeason(c);
    nextSeason(c);
    if (c.youth.prospects.includes(a)) expect(playerOf(c, a).rating).toBeGreaterThan(before);
    // Nach ein paar Jahren ist jeder aus der Jugend raus – hochgezogen oder weg.
    for (let s = 0; s < 3; s++) {
      await endSeason(c);
      nextSeason(c);
    }
    for (const idx of c.youth.prospects) expect(playerOf(c, idx).age).toBeLessThanOrEqual(19);
  });

  it('old players retire, get a farewell and take up an honorary post', async () => {
    const { nextSeason, getPool } = await import('../src/career/career.js');
    const c = createCareer({ seed: 122 });
    const club = humanClub(c);
    const veterans = getPool()
      .everyone()
      .filter((p) => p.age >= 41 && !c.clubs.some((cl) => cl.squad.includes(p.poolIndex)))
      .slice(0, 3);
    for (const v of veterans) {
      club.squad.push(v.poolIndex);
      c.players[v.poolIndex] = { apps: 5, goals: 1, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    }
    await endSeason(c);
    const res = nextSeason(c);
    expect(res.retired.length).toBeGreaterThanOrEqual(1);
    const r = res.retired[0];
    expect(club.squad).not.toContain(r.idx);
    expect(c.alumni.map((x) => x.idx)).toContain(r.idx);
    expect(c.staff.cotrainer?.idx).toBe(res.retired[0].idx);
    expect(c.ledger.some((e) => e.text.startsWith('Abschiedsparty'))).toBe(true);
    expect(c.week.chat.some((m) => m.text.startsWith('Abschied:'))).toBe(true);
  });

  it('the landlord sells more drinks', async () => {
    const { matchFinances } = await import('../src/career/finances.js');
    const c = createCareer({ seed: 123 });
    let f = humanFixture(c);
    while (f.home !== humanClub(c).id) {
      finishRound(c);
      f = humanFixture(c);
    }
    const prepared = prepareMatch(c, f, { human: true, duration: 5 });
    simulateSync(prepared);
    const drinks = () => c.ledger.filter((e) => e.text.startsWith('Getränkeverkauf')).at(-1).amount;
    matchFinances(c, f, prepared, 1);
    const normal = drinks();
    c.staff.wirt = { idx: 1, name: 'Uwe Wirt' };
    matchFinances(c, f, prepared, 1);
    expect(drinks()).toBeGreaterThan(normal);
  });
});
