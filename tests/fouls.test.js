// Fouls, Vorteil, Notbremse, direkte Rote Karte, Schiri-Strenge, Festhalten und Sperren in der Karriere.
import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { createMatch, getPlayer, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { applyHold } from '../src/sim/holding.js';
import { callFoul, FOUL, isLastMan, settleAdvantage, stepAdvantage } from '../src/sim/fouls.js';
import { decideCard, REF_TRAITS } from '../src/sim/referee.js';
import { allPlayers } from '../src/sim/squad.js';
import { applyCards, banGames, isBanned, tickBans, resetYellows, YELLOW_LIMIT } from '../src/career/suspensions.js';
import { buildLineup, createCareer, finishRound, humanClub, humanFixture, loadCareer, prepareMatch, saveCareer, simulateSync, startWeek } from '../src/career/career.js';

const DT = 1 / 60;
const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

// Großfeld mit Schiri, alle Spieler weit weg am eigenen Tor; v (Team 0, greift nach +x an) hat den Ball, o (Team 1) steht hinter ihm.
function scene({ trait = 'souveraen', x = 5 } = {}) {
  const m = createMatch({ seed: 21, pitch: PITCHES.grossfeld, human: false, kickoff: false });
  m.noKnocks = true;
  m.referee.trait = trait;
  const s = attackDir(m, 0);
    let k = 0;
  for (const p of m.players) {
    p.pos.x = p.role === 'gk' ? (p.team === 0 ? -s : s) * 51 : -s * 44; // alle Feldspieler tief in der Hälfte von Team 0, beide Torhüter im Tor
    p.pos.z = -20 + (k++ % 10) * 4;
    p.vel.x = p.vel.z = 0;
  }
  const v = m.players.find((p) => p.team === 0 && p.role !== 'gk');
  const o = m.players.find((p) => p.team === 1 && p.role !== 'gk');
  Object.assign(v.pos, { x: x * s, z: 0 });
  v.vel.x = 5 * s;
  v.facing = { x: s, z: 0 };
  Object.assign(o.pos, { x: (x - 0.8) * s, z: 0.3 });
  o.facing = { x: s, z: 0 };
  Object.assign(m.ball.pos, { x: (x + 0.4) * s, y: 0.11, z: 0 });
  m.ball.holder = null;
  m.ball.lastTouch = v.id;
  m.lastTouchTeam = 0;
  Object.assign(m.referee.pos, { x: x * s, z: -3 });
  return { m, v, o, s };
}
const seeAll = (m) => {
  m.rng.chance = () => true; // der Schiri sieht alles, würfelt jede Chance durch
};
const types = (m) => m.events.map((e) => e.type);

describe('Vorteil', () => {
  it('der Schiri lässt laufen, solange das gefoulte Team klar im Vorteil ist, und zeigt die Karte beim nächsten Stopp', () => {
    const { m, v, o } = scene({ trait: 'laesst_laufen' });
    seeAll(m);
    const res = callFoul(m, o, v, { kind: 'shirt', sev: 0.2 });
    expect(res).toBe('advantage');
    expect(m.phase).toBe('play');
    expect(m.events.find((e) => e.type === 'advantage')).toMatchObject({ playerId: o.id, victimId: v.id, team: 0, kind: 'shirt' });
    expect(types(m)).not.toContain('foul');
    // Das gefoulte Team behält den Ball: der Vorteil tritt ein, die Karte wartet auf den nächsten Stopp.
    m.ball.holder = v.id;
    m.time += FOUL.advantageSecs + 0.1;
    expect(stepAdvantage(m)).toBe(false);
    expect(m.advantage).toBeNull();
    expect(m.events.find((e) => e.type === 'advantage_over')).toMatchObject({ ok: true });
    expect(types(m)).not.toContain('card');
    m.phase = 'setpiece'; // Stopp (Aus, Tor …)
    settleAdvantage(m);
    expect(m.events.find((e) => e.type === 'card')).toMatchObject({ color: 'yellow', playerId: o.id, late: true });
  });

  it('verliert das gefoulte Team den Ball gleich wieder, gibt es den Freistoß am Tatort samt Karte', () => {
    const { m, v, o } = scene({ trait: 'laesst_laufen' });
    seeAll(m);
    expect(callFoul(m, o, v, { kind: 'push', sev: 0.2 })).toBe('advantage');
    m.ball.holder = o.id; // Ballverlust
    m.lastTouchTeam = 1;
    m.time += 0.5;
    expect(stepAdvantage(m)).toBe(true);
    expect(m.phase).toBe('setpiece');
    expect(m.setPiece).toMatchObject({ type: 'freekick', team: 0 });
    expect(m.events.find((e) => e.type === 'advantage_over')).toMatchObject({ ok: false });
    expect(m.events.find((e) => e.type === 'card')).toMatchObject({ late: true });
  });

  it('ein Schuss des gefoulten Teams ist der genutzte Vorteil: kein Rückpfiff, auch wenn der Keeper den Ball hat', () => {
    const { m, v, o } = scene({ trait: 'laesst_laufen' });
    seeAll(m);
    callFoul(m, o, v, { kind: 'shirt', sev: 0.2 });
    m.stats.teams[0].shots++;
    m.time += 0.6;
    m.lastTouchTeam = 1;
    expect(stepAdvantage(m)).toBe(false);
    expect(m.events.find((e) => e.type === 'advantage_over')).toMatchObject({ ok: true });
    expect(m.phase).toBe('play');
  });

  it('kein Vorteil im Strafraum (dort gibt es den Elfmeter) und nicht ohne Schiri', () => {
    const a = scene({ trait: 'laesst_laufen', x: 48 });
    seeAll(a.m);
    const res = callFoul(a.m, a.o, a.v, { kind: 'shirt', sev: 0.2 });
    expect(res).toBe('stopped');
    expect(a.m.setPiece.type).toBe('penalty');
    expect(a.m.events.find((e) => e.type === 'foul').penalty).toBe(true);

    const b = scene({ trait: 'laesst_laufen' });
    b.m.referee = null;
    seeAll(b.m);
    expect(callFoul(b.m, b.o, b.v, { kind: 'shirt', sev: 0.2 })).toBe('stopped');
    expect(b.m.setPiece.type).toBe('freekick');
    expect(types(b.m)).not.toContain('card');
  });

  it('die Schiri-Persönlichkeit wirkt: Lässt-laufen gibt öfter Vorteil, Pingelig zeigt öfter Karten', () => {
    const share = (trait) => {
      let adv = 0;
      let all = 0;
      for (let seed = 1; seed <= 150; seed++) {
        const { m, v, o } = scene({ trait });
        m.rng = createRng(seed);
        m.referee.trait = trait;
        const res = callFoul(m, o, v, { kind: 'shirt', sev: 0.2 });
        if (res === 'none') continue;
        all++;
        if (res === 'advantage') adv++;
      }
      return adv / all;
    };
    expect(share('laesst_laufen')).toBeGreaterThan(share('souveraen'));
    expect(share('souveraen')).toBeGreaterThan(share('pingelig'));

    const yellows = (trait) => {
      const { m, o } = scene({ trait });
      m.rng = createRng(5);
      m.referee.trait = trait;
      let n = 0;
      for (let i = 0; i < 600; i++) if (decideCard(m, o, 0.2)?.color === 'yellow') n++;
      return n;
    };
    expect(yellows('pingelig')).toBeGreaterThan(yellows('souveraen'));
    expect(yellows('souveraen')).toBeGreaterThan(yellows('laesst_laufen'));
    expect(REF_TRAITS.pingelig.red).toBeGreaterThan(REF_TRAITS.laesst_laufen.red);
  });
});

describe('Notbremse und direkte Rote Karte', () => {
  it('Foul als letzter Mann gegen den Ballführenden auf dem Weg zum Tor: Rot, Platzverweis', () => {
    const { m, v, o } = scene({ x: 30 });
    seeAll(m);
    m.rng.next = () => 0; // der Schiri wertet es als klare Torchance
    expect(isLastMan(m, o, v)).toBe(true);
    const n = m.players.filter((p) => p.team === 1).length;
    m.ball.holder = v.id;
    expect(callFoul(m, o, v, { kind: 'shirt', sev: 0.2 })).toBe('stopped');
    expect(m.events.find((e) => e.type === 'foul')).toMatchObject({ dogso: true });
    expect(m.events.find((e) => e.type === 'card')).toMatchObject({ color: 'red', reason: 'dogso', playerId: o.id });
    expect(m.players.filter((p) => p.team === 1)).toHaveLength(n - 1);
    expect(m.sentOff).toContain(o);
    expect(m.stats.teams.length).toBe(2);
  });

  it('kein letzter Mann, wenn noch ein Verteidiger zwischen Ball und Tor steht oder der Gefoulte nicht aufs Tor läuft', () => {
    const { m, v, o, s } = scene({ x: 30 });
    m.ball.holder = v.id;
    const other = m.players.find((p) => p.team === 1 && p.role !== 'gk' && p !== o);
    Object.assign(other.pos, { x: 40 * s, z: 3 });
    expect(isLastMan(m, o, v)).toBe(false);
    Object.assign(other.pos, { x: -40 * s, z: 3 });
    expect(isLastMan(m, o, v)).toBe(true);
    v.vel.x = 0;
    expect(isLastMan(m, o, v)).toBe(false);
  });

  it('im Strafraum mit Versuch, den Ball zu spielen, wird die Notbremse nur Gelb – dazu Elfmeter', () => {
    const { m, v, o } = scene({ x: 49 });
    seeAll(m);
    m.rng.next = () => 0;
    m.ball.holder = v.id;
    callFoul(m, o, v, { kind: 'tackle', slide: true, attempt: true, sev: 0.12 });
    expect(m.setPiece.type).toBe('penalty');
    expect(m.events.find((e) => e.type === 'card')).toMatchObject({ color: 'yellow' });
  });

  it('grobes Foulspiel (Grätsche von hinten) kann direkt Rot geben, auch ohne Torchance', () => {
    const { m, v, o } = scene({ trait: 'pingelig' });
    seeAll(m);
    m.rng.next = () => 0; // der Wurf für „grob" fällt
    callFoul(m, o, v, { kind: 'tackle', slide: true, attempt: true, hard: true, sev: 0.35, serious: FOUL.seriousRed, noAdvantage: true });
    expect(m.events.find((e) => e.type === 'card')).toMatchObject({ color: 'red', reason: 'serious', playerId: o.id });
    expect(m.sentOff).toContain(o);
  });

  it('ohne Schiri gibt es keine Karte und keine Notbremse (die Spieler regeln es selbst)', () => {
    const { m, v, o } = scene({ x: 30 });
    m.referee = null;
    seeAll(m);
    m.ball.holder = v.id;
    expect(callFoul(m, o, v, { kind: 'shirt', sev: 0.2 })).toBe('stopped');
    expect(types(m)).not.toContain('card');
    expect(m.sentOff).toHaveLength(0);
  });
});

describe('Festhalten und der Fall „Schiri hat es nicht gesehen"', () => {
  const holdScene = () => {
    const m = createMatch({ seed: 6, pitch: PITCHES.rasenplatz, kickoff: false, human: true });
    m.noKnocks = true;
    const p = getPlayer(m, m.controlledId);
    const opp = m.players.find((q) => q.team === 1 && q.role !== 'gk');
    Object.assign(opp.pos, { x: p.pos.x + 0.6, z: p.pos.z });
    Object.assign(m.ball.pos, { x: p.pos.x - 8, z: p.pos.z });
    Object.assign(m.referee.pos, { x: p.pos.x, z: p.pos.z - 2 });
    p.holdingId = opp.id;
    p.holdTime = 0.5;
    return { m, p, opp };
  };

  it('gesehen: Foul-Ereignis (hold), Freistoß für den Gehaltenen', () => {
    const { m, p, opp } = holdScene();
    m.referee.trait = 'pingelig';
    m.rng.chance = (pr) => pr < 0.05 || pr > 0.5; // die Sekundenchance trifft, der Schiri sieht es, keine Karte
    expect(applyHold(m, p, true, DT)).toBe(true);
    expect(m.events.find((e) => e.type === 'foul')).toMatchObject({ kind: 'hold', playerId: p.id, victimId: opp.id });
    expect(m.phase).toBe('setpiece');
    expect(m.setPiece).toMatchObject({ type: 'freekick', team: 1 });
  });

  it('nicht gesehen: no_call, das Spiel läuft weiter, der Halter fängt neu an', () => {
    const { m, p, opp } = holdScene();
    Object.assign(m.referee.pos, { x: p.pos.x + 80, z: 0 }); // weit weg
    m.referee.trait = 'kurzsichtig';
    m.rng.chance = (pr) => pr < 0.05; // Sekundenchance trifft, Sicht (≥ 0,2) nicht
    expect(applyHold(m, p, true, DT)).toBe(false);
    expect(m.events.find((e) => e.type === 'no_call')).toMatchObject({ playerId: p.id, victimId: opp.id, kind: 'hold' });
    expect(m.phase).toBe('play');
    expect(p.holdTime).toBe(0);
  });

  it('Grätsche, die der Schiri nicht sieht: no_call mit Art, der Gefoulte beschwert sich, weiterspielen', () => {
    const { m, v, o } = scene();
    Object.assign(m.referee.pos, { x: -80, z: 0 });
    m.rng.chance = () => false;
    expect(callFoul(m, o, v, { kind: 'tackle', slide: true, sev: 0.3 })).toBe('none');
    expect(m.events.find((e) => e.type === 'no_call')).toMatchObject({ kind: 'tackle' });
    expect(m.phase).toBe('play');
  });
});

describe('Fouls im Spielgeschehen', () => {
  it('Zeitraffer-Lauf mit Schiri erzeugt Fouls verschiedener Art und bleibt konsistent (Mannschaft in Unterzahl, Phase gültig)', () => {
    const kinds = new Set();
    let cards = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const m = createMatch({ seed, pitch: PITCHES.rasenplatz, human: false, duration: 150 });
      m.noKnocks = true; // sentOff soll nur die Platzverweise enthalten
      let dismissed = 0;
      while (m.phase !== 'ended') {
        stepMatch(m, undefined, DT);
        for (const e of m.events) {
          if (e.type === 'foul') kinds.add(e.kind);
          if (e.type === 'card') cards++;
          if (e.type === 'card' && e.color !== 'yellow') dismissed++;
        }
        m.events.length = 0;
      }
      expect(m.sentOff).toHaveLength(dismissed); // jeder Platzverweis nimmt genau einen Spieler vom Feld
      expect(m.advantage).toBeFalsy();
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(cards).toBeGreaterThan(0);
  });
});

describe('Sperren in der Karriere', () => {
  const played = (seed = 3) => {
    const c = createCareer({ seed });
    const f = humanFixture(c);
    const prepared = prepareMatch(c, f, { duration: 20 });
    simulateSync(prepared);
    const squad = humanClub(c).squad;
    const p = allPlayers(prepared.match).find((q) => squad.includes(q.poolIndex) && q.poolIndex !== c.coach.idx);
    const st = prepared.match.stats.players[p.id] ?? (prepared.match.stats.players[p.id] = {});
    Object.assign(st, { seconds: 10, yellow: 0, red: 0 });
    return { c, prepared, p, st, idx: p.poolIndex };
  };

  it('Rot für grobes Foul: 2 Spiele, Notbremse und Gelb-Rot: 1 Spiel – abgesessen nach den Wochen', () => {
    for (const [kind, games] of [['serious', 2], ['dogso', 1], ['yellowred', 1]]) {
      const { c, prepared, st, idx } = played();
      Object.assign(st, { red: 1, redKind: kind });
      const out = applyCards(c, prepared);
      expect(out).toEqual([{ idx, games, reason: kind }]);
      expect(banGames(c, idx)).toBe(games);
      expect(c.pendingNews.length).toBe(1);
      tickBans(c); // dieselbe Woche: noch nichts abgesessen
      expect(banGames(c, idx)).toBe(games);
      c.round++;
      tickBans(c);
      expect(banGames(c, idx)).toBe(games - 1);
      c.round++;
      tickBans(c);
      expect(isBanned(c, idx)).toBe(false);
      expect(c.players[idx].ban).toBeNull();
    }
  });

  it('fünf Gelbe in der Liga geben eine Sperre und der Zähler beginnt neu; im Pokal zählen Gelbe nicht; Saisonende setzt zurück', () => {
    const { c, prepared, st, idx } = played();
    st.yellow = 1;
    for (let i = 1; i < YELLOW_LIMIT; i++) {
      applyCards(c, prepared);
      expect(isBanned(c, idx)).toBe(false);
      expect(c.players[idx].yellows).toBe(i);
    }
    applyCards(c, prepared, { league: false }); // Pokal: nicht gezählt
    expect(c.players[idx].yellows).toBe(YELLOW_LIMIT - 1);
    applyCards(c, prepared);
    expect(banGames(c, idx)).toBe(1);
    expect(c.players[idx].ban.reason).toBe('yellows');
    expect(c.players[idx].yellows).toBe(0);
    c.players[idx].yellows = 3;
    resetYellows(c);
    expect(c.players[idx].yellows).toBe(0);
  });

  it('ein Gesperrter fehlt im Wochenchat, steht nicht in der Aufstellung und kann auch per Ereignis nicht zurückgeholt werden', () => {
    const c = createCareer({ seed: 11 });
    const club = humanClub(c);
    const idx = club.squad.find((i) => i !== c.coach.idx);
    c.players[idx].ban = { games: 1, reason: 'serious', round: c.round - 1 };
    startWeek(c);
    expect(c.week.availability[idx]).toBe('no');
    expect(c.week.chat.find((msg) => msg.from === idx).text).toMatch(/Gesperrt|Suspended/);
    c.week.availability[idx] = 'yes'; // ein Ereignis holt ihn zurück …
    const { lineup, bench } = buildLineup(c, club, 7, c.week.availability, createRng(1), [idx]);
    expect(lineup).not.toContain(idx); // … gespielt wird trotzdem ohne ihn
    expect(bench).not.toContain(idx);
  });

  it('alte Spielstände ohne Sperrfelder laden und laufen weiter; die Sperre übersteht Speichern und Laden', () => {
    const c = createCareer({ seed: 12 });
    for (const rec of Object.values(c.players)) {
      delete rec.ban;
      delete rec.yellows;
    }
    startWeek(c);
    const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
    expect(isBanned(c, idx)).toBe(false);
    finishRound(c); // tickBans mit fehlenden Feldern wirft nicht
    c.players[idx].ban = { games: 2, reason: 'dogso', round: c.round };
    const storage = memoryStorage();
    saveCareer(c, storage);
    const back = loadCareer(storage);
    expect(banGames(back, idx)).toBe(2);
    expect(back.players[idx].ban.reason).toBe('dogso');
  });
});
