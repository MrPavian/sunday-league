import { describe, expect, it } from 'vitest';
import { applyPositionMalus, ADAPT_MATCHES, ADAPT_RELIEF, familiarity, oopFactors, oopInfo, oopText, posGrade, slotRating } from '../src/sim/position.js';
import { createMatch } from '../src/sim/match.js';
import { substitute } from '../src/sim/squad.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generatePlayer, generateTeam } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';
import { createCareer, currentLineup, finishRound, humanClub, loadCareer, playerOf, saveCareer } from '../src/career/career.js';
import { afterMatchPositions, deliverGrumbles, famAt, GRUMBLE_COOLDOWN, migratePositions, posFamOf } from '../src/career/positions.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};
const playerOfPos = (c, idx) => playerOf(c, idx).position;
const player = (position, seed = 5) => generatePlayer(createRng(seed), { role: position, tier: 'ok' });

describe('Positionsfremd: Stufen', () => {
  it('eigene Position, Nachbarn, weit weg, Tor', () => {
    expect(posGrade('def', 'def')).toBe('own');
    expect(posGrade('def', 'mid')).toBe('near');
    expect(posGrade('mid', 'def')).toBe('near');
    expect(posGrade('mid', 'fwd')).toBe('near');
    expect(posGrade('fwd', 'mid')).toBe('near');
    expect(posGrade('def', 'fwd')).toBe('far');
    expect(posGrade('fwd', 'def')).toBe('far');
    expect(posGrade('mid', 'gk')).toBe('gkIn');
    expect(posGrade('fwd', 'gk')).toBe('gkIn');
    expect(posGrade('gk', 'def')).toBe('gkOut');
    expect(posGrade('gk', 'fwd')).toBe('gkOut');
  });

  it('der Abzug wächst mit der Entfernung: nichts < nah < weit; Tor am härtesten', () => {
    const p = player('def');
    const own = slotRating(p, 'def');
    expect(own).toBe(p.rating);
    // gleiche Rolle, nur mit Abzug verglichen: Stärke auf Position mid mit und ohne Abzug
    const midNo = slotRating({ ...p, position: 'mid' }, 'mid');
    const midNear = slotRating(p, 'mid');
    expect(midNear).toBeLessThan(midNo);
    const fwdNo = slotRating({ ...p, position: 'fwd' }, 'fwd');
    const fwdFar = slotRating(p, 'fwd');
    expect(fwdNo - fwdFar).toBeGreaterThan(midNo - midNear);
    const f = (g) => oopFactors(g, 0);
    expect(f('near').skill).toBeGreaterThan(f('far').skill);
    expect(f('far').skill).toBeLessThan(0.85);
    expect(f('gkIn').keeping).toBeLessThanOrEqual(0.5);
    expect(f('gkOut').skill).toBeGreaterThan(f('far').skill); // Torwart im Feld: schwach, aber weniger als weit weg
  });

  it('Feldspieler im Tor hat deutlich weniger Torwartwert, Torwart im Feld weniger Fertigkeiten', () => {
    const f = player('fwd');
    const fe = { position: 'fwd', role: 'gk', attrs: f.attrs, traits: f.traits };
    applyPositionMalus(fe);
    expect(fe.attrs.keeping).toBeLessThan(f.attrs.keeping * 0.6);
    expect(fe.oop.grade).toBe('gkIn');
    const k = player('gk');
    const ke = { position: 'gk', role: 'mid', attrs: k.attrs, traits: k.traits };
    applyPositionMalus(ke);
    expect(ke.attrs.passing).toBeLessThan(k.attrs.passing);
    expect(ke.attrs.pace).toBe(k.attrs.pace); // Körperwerte bleiben
    expect(ke.attrs.stamina).toBe(k.attrs.stamina);
  });

  it('applyPositionMalus ist umkehrbar, idempotent und lässt geteilte Werte unberührt', () => {
    const p = player('def');
    const before = JSON.stringify(p.attrs);
    const e = { position: 'def', role: 'fwd', attrs: p.attrs, traits: p.traits };
    applyPositionMalus(e);
    const once = JSON.stringify(e.attrs);
    applyPositionMalus(e);
    expect(JSON.stringify(e.attrs)).toBe(once);
    expect(JSON.stringify(p.attrs)).toBe(before);
    e.role = 'def';
    applyPositionMalus(e);
    expect(JSON.stringify(e.attrs)).toBe(before);
    expect(e.oop).toBeNull();
  });

  it('Anzeige: positionsfremd 62 → 51 mit Gewöhnung', () => {
    const p = player('def');
    const info = oopInfo(p, 'fwd', 0.25);
    expect(info.from).toBe(p.rating);
    expect(info.to).toBeLessThan(info.from);
    expect(oopText(info)).toContain(`${info.from} → ${info.to}`);
    expect(oopText(info)).toContain('25 %');
    expect(oopInfo(p, 'def')).toBeNull();
  });
});

describe('Positionsfremd: Gewöhnung', () => {
  it('voll nach ADAPT_MATCHES Spielen, der Abzug schrumpft Spiel für Spiel, ein Rest bleibt', () => {
    expect(familiarity(0)).toBe(0);
    expect(familiarity(ADAPT_MATCHES / 2)).toBeCloseTo(0.5);
    expect(familiarity(ADAPT_MATCHES)).toBe(1);
    expect(familiarity(99)).toBe(1);
    let last = 0;
    for (let n = 0; n <= ADAPT_MATCHES; n++) {
      const s = oopFactors('far', familiarity(n)).skill;
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    const full = oopFactors('far', 1).skill;
    expect(full).toBeLessThan(1);
    expect(1 - full).toBeCloseTo((1 - oopFactors('far', 0).skill) * (1 - ADAPT_RELIEF), 6);
    const p = player('def');
    expect(slotRating(p, 'fwd', 1)).toBeGreaterThan(slotRating(p, 'fwd', 0));
  });

  it('wirkt im Spiel über p.posFam, auch beim Einwechseln', () => {
    const pitch = PITCHES.sportplatz;
    const slots = systemFormation(pitch.format).map((f) => f.role);
    const rng = createRng(11);
    const teams = [0, 1].map((i) => ({ ...generateTeam(rng, TEAM_PRESETS[i], [...slots, 'def', 'mid', 'fwd']), tactic: { style: 'ausgewogen' } }));
    const d = slots.indexOf('def');
    const f = slots.indexOf('fwd');
    [teams[0].players[d], teams[0].players[f]] = [teams[0].players[f], teams[0].players[d]];
    teams[0].players[d].posFam = {}; // Stürmer in der Abwehr, nicht gewöhnt
    teams[0].players[f].posFam = { fwd: 1 }; // Abwehrspieler im Sturm – gewöhnt
    const m = createMatch({ seed: 3, pitch, teams, human: false, aiCoach: false });
    const strikerInDef = m.players.find((p) => p.team === 0 && p.id === `0-${d}`);
    const defInAtt = m.players.find((p) => p.team === 0 && p.id === `0-${f}`);
    expect(strikerInDef.oop.grade).toBe('far');
    expect(defInAtt.oop.fam).toBe(1);
    expect(defInAtt.oop.to).toBeGreaterThan(oopInfo({ ...defInAtt, attrs: defInAtt.baseAttrs }, 'fwd', 0).to);
    // Einwechsler: Bankspieler auf anderer Position bekommt beim Wechsel den Abzug, geht er raus, wieder die Originalwerte
    const bench = m.bench[1].find((b) => b.position === 'mid');
    const out = m.players.find((p) => p.team === 1 && p.role === 'fwd');
    const base = bench.attrs;
    substitute(m, out, bench);
    expect(bench.oop.grade).toBe('near');
    expect(bench.attrs.passing).toBeLessThan(base.passing);
    expect(bench.baseAttrs).toBe(base);
  });

  it('Aufstellung: Ein echter Torwart steht im Tor, ein Feldspieler im Tor ist deutlich schwächer', () => {
    const k = player('gk', 7);
    const f = player('fwd', 8);
    expect(slotRating(f, 'gk')).toBeLessThan(slotRating(k, 'gk') - 15);
    const c = createCareer({ seed: 21 });
    const { lineup, formation } = currentLineup(c);
    const keepers = humanClub(c).squad.filter((idx) => c.week.availability[idx] === 'yes' && c.players[idx] && lineup.includes(idx) === false);
    const gk = lineup[formation.findIndex((x) => x.role === 'gk')];
    const pool = humanClub(c).squad.filter((idx) => c.week.availability[idx] === 'yes').map((idx) => ({ idx, pos: playerOfPos(c, idx) }));
    if (pool.some((x) => x.pos === 'gk')) expect(playerOfPos(c, gk)).toBe('gk');
    expect(keepers).toBeDefined();
  });
});

describe('Positionsfremd: Karriere, Speicherstand, Murren', () => {
  const fakeMatch = (c, idx, position, role, share = 1) => ({
    players: [{ id: 'p1', poolIndex: idx, position, role }],
    bench: [[], []],
    sentOff: [],
    duration: 100,
    stats: { players: { p1: { seconds: 100 * share } } },
  });

  it('zählt Spiele je fremder Position, eigene Position und kurze Einsätze nicht', () => {
    const c = createCareer({ seed: 31 });
    const squad = humanClub(c).squad;
    const idx = squad[0];
    afterMatchPositions(c, fakeMatch(c, idx, 'def', 'def'), squad);
    expect(c.players[idx].posXp ?? {}).toEqual({});
    afterMatchPositions(c, fakeMatch(c, idx, 'def', 'fwd', 0.1), squad);
    expect(c.players[idx].posXp ?? {}).toEqual({});
    afterMatchPositions(c, fakeMatch(c, idx, 'def', 'fwd'), squad);
    afterMatchPositions(c, fakeMatch(c, idx, 'def', 'fwd'), squad);
    expect(c.players[idx].posXp).toEqual({ fwd: 2 });
    expect(famAt(c, idx, 'fwd')).toBeCloseTo(2 / ADAPT_MATCHES);
    expect(posFamOf(c, idx).fwd).toBeCloseTo(2 / ADAPT_MATCHES);
  });

  it('Speicherstand: Gewöhnung überlebt Speichern/Laden, alte Stände ohne Feld laden mit Standard', () => {
    const c = createCareer({ seed: 32 });
    const idx = humanClub(c).squad[1];
    afterMatchPositions(c, fakeMatch(c, idx, 'mid', 'def'), humanClub(c).squad);
    const st = memoryStorage();
    saveCareer(c, st);
    const back = loadCareer(st);
    expect(back.players[idx].posXp).toEqual({ def: 1 });
    expect(back).toEqual(c);
    // alter Stand: Felder fehlen
    const old = JSON.parse(JSON.stringify(c));
    for (const r of Object.values(old.players)) delete r.posXp;
    delete old.pendingGrumble;
    const st2 = memoryStorage();
    st2.setItem('sunday-league-career', JSON.stringify(old));
    const raw = JSON.parse(JSON.stringify(old));
    migratePositions(raw);
    expect(raw.pendingGrumble).toEqual([]);
    expect(famAt(raw, idx, 'def')).toBe(0);
    expect(posFamOf(raw, idx)).toEqual({});
    // kaputte Werte werden verworfen
    raw.players[idx].posXp = 'kaputt';
    migratePositions(raw);
    expect(famAt(raw, idx, 'def')).toBe(0);
  });

  it('Murren: weit weg und nicht gewöhnt kostet Stimmung und erzeugt eine Chat-Zeile; Cooldown, kein Spam', () => {
    const c = createCareer({ seed: 33 });
    const squad = humanClub(c).squad;
    const idx = squad[2];
    let said = 0;
    const mood0 = c.mood;
    // viele Spieltage hintereinander, immer dieselbe fremde Rolle
    const rounds = [];
    for (let r = 0; r < 12; r++) {
      c.round = r;
      c.players[idx].posXp = {}; // nie gewöhnt, um den Cooldown zu prüfen
      afterMatchPositions(c, fakeMatch(c, idx, 'fwd', 'def'), squad);
      if (c.pendingGrumble.length) {
        rounds.push(r);
        const chat = [];
        deliverGrumbles(c, chat);
        expect(chat).toHaveLength(1);
        expect(chat[0].from).toBe(idx);
        expect(chat[0].text.length).toBeGreaterThan(5);
        said++;
      }
      expect(c.pendingGrumble).toHaveLength(0);
    }
    expect(c.mood).toBeLessThan(mood0);
    expect(said).toBeGreaterThan(0);
    expect(said).toBeLessThanOrEqual(Math.ceil(12 / GRUMBLE_COOLDOWN));
    for (let i = 1; i < rounds.length; i++) expect(rounds[i] - rounds[i - 1]).toBeGreaterThanOrEqual(GRUMBLE_COOLDOWN);
  });

  it('kein Murren bei Nachbarposition, bei Gewöhnung, und höchstens eine Meldung pro Woche', () => {
    const c = createCareer({ seed: 34 });
    const squad = humanClub(c).squad;
    const mood0 = c.mood;
    for (let r = 0; r < 10; r++) {
      c.round = r;
      afterMatchPositions(c, fakeMatch(c, squad[0], 'def', 'mid'), squad); // nah
    }
    expect(c.pendingGrumble).toHaveLength(0);
    expect(c.mood).toBe(mood0);
    c.players[squad[1]].posXp = { fwd: ADAPT_MATCHES };
    afterMatchPositions(c, fakeMatch(c, squad[1], 'def', 'fwd'), squad);
    expect(c.pendingGrumble).toHaveLength(0);
    expect(c.mood).toBe(mood0);
    // zwei Murrer im selben Spiel: höchstens eine Meldung
    const m = fakeMatch(c, squad[3], 'fwd', 'def');
    m.players.push({ id: 'p2', poolIndex: squad[4], position: 'def', role: 'fwd' });
    m.stats.players.p2 = { seconds: 100 };
    for (let r = 20; r < 40; r++) {
      c.round = r;
      c.pendingGrumble = [];
      afterMatchPositions(c, m, squad);
      expect(c.pendingGrumble.length).toBeLessThanOrEqual(1);
    }
  });

  it('Murren ist deterministisch (gleicher Stand → gleiche Meldung) und kommt über finishRound in den Chat', () => {
    const run = () => {
      const c = createCareer({ seed: 35 });
      const squad = humanClub(c).squad;
      let first = null;
      for (let r = 0; r < 30 && !first; r++) {
        c.round = r;
        afterMatchPositions(c, fakeMatch(c, squad[2], 'fwd', 'def'), squad);
        if (c.pendingGrumble.length) first = { r, g: JSON.stringify(c.pendingGrumble) };
      }
      return first;
    };
    expect(run()).toEqual(run());
    expect(run()).not.toBeNull();
    const c = createCareer({ seed: 36 });
    const who = humanClub(c).squad[0];
    c.pendingGrumble = [{ idx: who, position: 'fwd', role: 'def', seed: 7 }];
    finishRound(c);
    expect(c.pendingGrumble).toEqual([]);
    expect(c.week.chat.some((msg) => msg.from === who && msg.time === 'Mo 08:20' && msg.text.length > 5)).toBe(true);
  });

});
