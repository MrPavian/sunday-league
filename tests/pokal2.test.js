// Verlängerung, Landespokal, überregionaler Pokal (Profi-Runde), Sponsorenprämien.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, playerOf, seasonOver, simulateSync, squadPicker, SQUAD_SHAPES } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { createRng } from '../src/core/rng.js';
import { BUND_ERST, BUND_NAME, BUND_PRIZE, BUND_PRIZE_WINNER, BUND_VENUES, PROFI_KLASSEN, PROFIS } from '../src/career/bundespokal.js';
import { BUND_EVENTS, bundVenueEvent } from '../src/career/bundevents.js';
import { homeUnit } from '../src/career/finances.js';
import { resolveEvent } from '../src/career/events.js';
import { migrateCareer, startWeek } from '../src/career/career.js';
import { museum } from '../src/career/museum.js';
import { afterHumanTie, bundChat, QUICK_BUND, humanTie, poisson, POKALE, pokalEligible, pokalOf, pokalRounds, pokalWhen, PRAEMIE, preparePokalMatch, QUICK, quickTie, recordPokalResult, roundName, roundTies, sponsorPraemie, startPokal, teamStrength, tieWinner } from '../src/career/pokal.js';
import { EXTRA_SHARE, MATCH, createMatch, extraTimeSeconds, matchDuration, stepMatch } from '../src/sim/match.js';
import { footballMinute } from '../src/sim/minute.js';
import { PITCHES } from '../src/sim/pitch.js';

const at = (level, seed = 5) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};
afterEach(() => {
  MATCH.pokalExtra = false;
});

// Das eigene Spiel der Runde gewinnen (oder verlieren), ohne es zu spielen.
const settle = (c, kind, win = true) => {
  const cup = pokalOf(c, kind);
  const me = humanClub(c).id;
  c.round = cup.rounds[cup.round];
  const tie = roundTies(cup).find((t) => t.home === me || t.away === me);
  const mine = tie.home === me;
  tie.result = win === mine ? { home: 2, away: 0 } : { home: 0, away: 2 };
  afterHumanTie(c, kind);
  return tie;
};

describe('Verlängerung: Länge', () => {
  it('ein Drittel der regulären Spielzeit, wie 2 × 15 bei 2 × 45 Minuten', () => {
    expect(EXTRA_SHARE).toBeCloseTo(1 / 3, 10);
    expect(extraTimeSeconds(90 * 60)).toBe(30 * 60); // 90 Spielminuten → 30 Minuten Verlängerung
    for (const p of Object.values(PITCHES)) {
      const d = matchDuration(p);
      const e = extraTimeSeconds(d);
      expect(Math.abs(e - d / 3)).toBeLessThanOrEqual(1.01); // auf ganze Sekunden gerundet
      expect(e % 2).toBe(0); // zwei gleich lange Hälften
    }
  });

  it('die Anzeige zählt die Verlängerung als Minute 91 bis 120', () => {
    const m = { duration: 300, extra: { total: 100 }, time: 0 };
    expect(footballMinute(m, 0)).toBe(1);
    expect(footballMinute(m, 299)).toBe(90);
    expect(footballMinute(m, 301)).toBe(91);
    expect(footballMinute(m, 399)).toBe(120);
    expect(footballMinute({ duration: 300, time: 0 }, 10_000)).toBe(90); // ohne Verlängerung nie über 90
  });
});

// Spielt ein K.-o.-Spiel bis zum Ende; das Ergebnis bleibt unentschieden (Test-Eingriff), damit Verlängerung und Elfmeterschießen laufen.
function drawnMatch({ extraTime, human }) {
  const m = createMatch({ seed: 4, pitch: PITCHES.hinterhof, duration: 120, human });
  m.knockout = true;
  m.extraTime = extraTime;
  const events = [];
  let guard = 0;
  while (m.phase !== 'ended' && m.phase !== 'shootout' && guard++ < 60 * 600) {
    if (m.time >= m.duration - 0.5 || m.extra) m.score = [1, 1];
    stepMatch(m, undefined, 1 / 60);
    events.push(...m.events.map((e) => e.type));
    m.events.length = 0;
  }
  return { m, events };
}

describe('Verlängerung: Ablauf in der Engine', () => {
  it('Standard: unentschieden → keine Verlängerung, der Mensch geht direkt ins Elfmeterschießen', () => {
    expect(MATCH.pokalExtra).toBe(false);
    const { m, events } = drawnMatch({ extraTime: false, human: true });
    expect(m.phase).toBe('shootout');
    expect(m.extra).toBeUndefined();
    expect(events).not.toContain('extratime_start');
  });

  it('mit Verlängerung: Dauer = ein Drittel, Seitenwechsel zur Halbzeit der Verlängerung, danach Elfmeterschießen', () => {
    const { m, events } = drawnMatch({ extraTime: true, human: true });
    expect(events.filter((e) => e === 'extratime_start')).toHaveLength(1);
    expect(events.filter((e) => e === 'extratime_half')).toHaveLength(1);
    expect(events.indexOf('extratime_start')).toBeLessThan(events.indexOf('extratime_half'));
    expect(events).toContain('fulltime_draw');
    expect(m.extra.total).toBe(40); // 120 s → 40 s
    expect(m.extra.end).toBe(160);
    expect(m.time).toBeGreaterThanOrEqual(160); // die volle Verlängerung wurde gespielt
    expect(m.time).toBeLessThan(160.5);
    expect(m.phase).toBe('shootout');
  });

  it('Pausen: Erholung nur kurz vor der Verlängerung, keine zur Halbzeit der Verlängerung; Anstoß der Verlängerungs-Hälften wechselt', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.hinterhof, duration: 120, human: true });
    m.knockout = true;
    m.extraTime = true;
    const pauses = [];
    let was = null;
    let prev = new Map();
    let guard = 0;
    while (m.phase !== 'ended' && m.phase !== 'shootout' && guard++ < 60 * 600) {
      if (m.time >= m.duration - 0.5 || m.extra) m.score = [1, 1];
      stepMatch(m, undefined, 1 / 60);
      if (was === 'halftime' && m.phase === 'setpiece') pauses.push({ gain: Math.max(...m.players.filter((p) => prev.has(p.id)).map((p) => p.stamina - prev.get(p.id))), team: m.setPiece.team }); // größter Zuwachs: wer schon fit ist, wird gekappt
      if (m.phase === 'halftime') {
        if (was !== 'halftime') for (const p of m.players) p.stamina = 0.1; // Ausgangswert jeder Pause
        prev = new Map(m.players.map((p) => [p.id, p.stamina]));
      }
      was = m.phase;
      m.events.length = 0;
    }
    expect(pauses).toHaveLength(3); // Halbzeit, vor der Verlängerung, Halbzeit der Verlängerung
    const [half, before, mid] = pauses;
    expect(half.gain).toBeCloseTo(0.25, 5);
    expect(before.gain).toBeCloseTo(0.25 * EXTRA_SHARE, 5);
    expect(mid.gain).toBeCloseTo(0, 10); // nur Trinkpause
    expect(half.team).toBe(1); // 2. Halbzeit: das andere Team als beim Anstoß
    expect(mid.team).not.toBe(before.team); // 2. Hälfte der Verlängerung: das andere Team als in der 1.
  });

  it('Fitness nach Verlängerung: wer alles spielt, zahlt ein Drittel mehr; ohne Verlängerung unverändert', () => {
    const cost = (extra) => {
      const c = at(5, 3);
      const idx = humanClub(c).squad[0];
      c.players[idx].fitness = 1;
      const f0 = c.players[idx].fitness;
      const p = { match: { duration: 100, extra: extra ? {} : undefined, bench: [[], []], sentOff: [], players: [{ id: 'x', poolIndex: idx }], stats: { players: { x: { seconds: extra ? 100 * (1 + EXTRA_SHARE) : 100 } } }, score: [1, 0] }, tie: { result: null }, kind: 'kreis' };
      const cup = startPokal(c, 'kreis');
      p.tie = roundTies(cup)[0];
      recordPokalResult(c, p);
      return f0 - c.players[idx].fitness;
    };
    const plain = cost(false);
    expect(plain).toBeGreaterThan(0);
    expect(cost(true) / plain).toBeCloseTo(1 + EXTRA_SHARE, 5);
  });

  it('ohne Mensch (Liveticker): nach der Verlängerung ist Schluss, das Elfmeterschießen rechnet pokal.js', () => {
    const { m, events } = drawnMatch({ extraTime: true, human: false });
    expect(m.phase).toBe('ended');
    expect(events).toContain('extratime_start');
    expect(m.time).toBeGreaterThanOrEqual(m.extra.end);
  });

  it('Tor in der Verlängerung entscheidet: danach ist das Spiel nicht mehr unentschieden und endet ohne Elfmeterschießen', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.hinterhof, duration: 120, human: false });
    m.knockout = true;
    m.extraTime = true;
    let guard = 0;
    while (m.phase !== 'ended' && guard++ < 60 * 600) {
      if (m.time >= m.duration - 0.5 && !m.extra) m.score = [1, 1];
      if (m.extra?.stage === 2) m.score = [2, 1]; // Siegtor in der zweiten Hälfte der Verlängerung
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    expect(m.score).toEqual([2, 1]);
    expect(m.shootout).toBeUndefined();
  });

  it('Einstellung und Pokalspiel: preparePokalMatch übernimmt MATCH.pokalExtra', () => {
    const c = at(3, 21);
    finishRound(c);
    const tie = humanTie(c, 'kreis') ?? pokalOf(c, 'kreis').ties.find((t) => t.home === humanClub(c).id || t.away === humanClub(c).id);
    expect(preparePokalMatch(c, 'kreis', tie).match.extraTime).toBe(false);
    MATCH.pokalExtra = true;
    expect(preparePokalMatch(c, 'kreis', tie).match.extraTime).toBe(true);
  });

  it('echtes Pokalspiel (Liveticker-Weg): Ergebnis nach Verlängerung wird eingetragen, danach Elfmeterschießen', () => {
    MATCH.pokalExtra = true;
    const c = at(2, 8);
    const cup = startPokal(c, 'kreis');
    const me = humanClub(c).id;
    const tie = roundTies(cup).find((t) => t.home === me || t.away === me);
    c.round = cup.rounds[0];
    const p = preparePokalMatch(c, 'kreis', tie, { duration: 120 });
    const m = p.match;
    let guard = 0;
    while (m.phase !== 'ended' && guard++ < 60 * 600) {
      if ((m.time >= m.duration - 0.5 && !m.extra) || m.extra) m.score = [1, 1];
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    recordPokalResult(c, p);
    expect(tie.et).toBe(true);
    expect(tie.result.home).toBe(tie.result.away);
    expect(tie.pens).toBeTruthy();
    expect(tie.pens.home).not.toBe(tie.pens.away);
  });
});

describe('Verlängerung: schnelles Ergebnismodell der übrigen Spiele', () => {
  const sample = (extra, n = 4000) => {
    const c = at(3, 3);
    const cup = startPokal(c, 'kreis');
    const tie = cup.ties[0];
    const d = teamStrength(c, cup, tie.home, tie) - teamStrength(c, cup, tie.away, tie);
    const lh = QUICK.base * Math.exp(QUICK.perPoint * d + QUICK.home);
    const la = QUICK.base * Math.exp(-QUICK.perPoint * d);
    MATCH.pokalExtra = extra;
    const rng = createRng(99);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const t = { ...tie, result: null, pens: null, et: undefined };
      quickTie(c, cup, t, rng);
      rows.push(t);
    }
    return { rows, lh, la };
  };
  const pmf = (l, k) => {
    let p = Math.exp(-l);
    for (let i = 1; i <= k; i++) p *= l / i;
    return p;
  };
  const drawProb = (lh, la) => Array.from({ length: 16 }, (_, k) => pmf(lh, k) * pmf(la, k)).reduce((a, b) => a + b, 0);

  it('Standard: nie Verlängerung, wie bisher direkt Elfmeterschießen', () => {
    const { rows } = sample(false, 1500);
    expect(rows.some((t) => t.et)).toBe(false);
    expect(rows.filter((t) => t.pens).length).toBeGreaterThan(100);
    expect(rows.every((t) => !t.pens || t.result.home === t.result.away)).toBe(true);
  });

  it('mit Verlängerung: sie kommt genau nach den Remis der regulären Zeit; Tore der Verlängerung = Erwartung × ein Drittel', () => {
    const { rows, lh, la } = sample(true);
    const n = rows.length;
    const et = rows.filter((t) => t.et);
    const pDraw = drawProb(lh, la);
    // Anteil der Spiele mit Verlängerung = Remis-Wahrscheinlichkeit der regulären Zeit (Poisson), Standardfehler ≈ 0,007.
    expect(Math.abs(et.length / n - pDraw)).toBeLessThan(0.035);
    // Davon bleibt nur ein Teil unentschieden (Elfmeterschießen): P(kein Tor-Unterschied in der Verlängerung).
    const pStill = drawProb(lh * EXTRA_SHARE, la * EXTRA_SHARE);
    const stillDrawn = et.filter((t) => t.pens).length / et.length;
    expect(Math.abs(stillDrawn - pStill)).toBeLessThan(0.07);
    expect(stillDrawn).toBeLessThan(1); // die Verlängerung entscheidet tatsächlich Spiele
    expect(rows.every((t) => !t.pens || t.result.home === t.result.away)).toBe(true);
    expect(poisson).toBeTypeOf('function');
  });
});

describe('Landespokal und Qualifikationskette', () => {
  it('Landespokal: nur für den Bezirkspokalsieger der Vorsaison (ab Kreisliga A); Bundespokal nur für den Landespokalsieger', () => {
    const c = at(5, 4);
    expect(pokalEligible(c, 'land')).toBe(false);
    expect(pokalEligible(c, 'bund')).toBe(false);
    c.landQual = c.season;
    expect(pokalEligible(c, 'land')).toBe(true);
    c.level = 3;
    expect(pokalEligible(c, 'land')).toBe(false);
    c.bundQual = c.season;
    expect(pokalEligible(c, 'bund')).toBe(true);
    c.bundQual = c.season - 1; // Qualifikation der Vorsaison verfällt
    expect(pokalEligible(c, 'bund')).toBe(false);
  });

  it('Kreis → Bezirk → Land → überregionaler Pokal: jeder Sieg öffnet genau die nächste Stufe der Folgesaison', () => {
    const c = at(5, 12);
    const season0 = c.season;
    const chain = ['kreis', 'bezirk', 'land', 'bund'];
    for (let i = 0; i < chain.length; i++) {
      c.season = season0 + i;
      for (const later of chain.slice(i + 1)) if (later !== chain[i + 1]) expect(pokalEligible(c, later)).toBe(false);
      expect(pokalEligible(c, chain[i])).toBe(true);
      const cup = startPokal(c, chain[i]);
      expect(cup.kind).toBe(chain[i]);
      expect(cup.ties.flatMap((t) => [t.home, t.away])).toContain(humanClub(c).id);
      let guard = 0;
      while (!cup.done && guard++ < 8) settle(c, chain[i], true);
      expect(cup.done).toBe(true);
      expect(cup.winner === humanClub(c).id || chain[i] === 'bund').toBe(true);
      if (chain[i] === 'kreis') expect(c.pokalQual).toBe(c.season + 1);
      if (chain[i] === 'bezirk') expect(c.landQual).toBe(c.season + 1);
      if (chain[i] === 'land') expect(c.bundQual).toBe(c.season + 1);
    }
    expect(c.trophies.map((t) => t.name).join('|')).toMatch(/Kreispokal|District Cup/);
    expect(c.trophies.map((t) => t.name).join('|')).toMatch(/Landespokal|State Cup/);
  });

  it('wer das Landespokal-Finale verliert, kommt nicht in den überregionalen Pokal', () => {
    const c = at(5, 15);
    c.landQual = c.season;
    const cup = startPokal(c, 'land');
    settle(c, 'land', false);
    expect(cup.out).toBe(true);
    expect(c.bundQual).toBeUndefined();
  });

  it('Landespokal: 8 Vereine, jeder einmal, drei Runden, Gegner aus Landes- und Oberliga stärker als die Bezirksliga', () => {
    const c = at(4, 9);
    c.landQual = c.season;
    const cup = startPokal(c, 'land');
    const ids = cup.ties.flatMap((t) => [t.home, t.away]);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toContain(humanClub(c).id);
    expect(POKALE.land.size).toBe(8);
    expect(cup.rounds).toHaveLength(3);
    expect(roundName(cup, 2)).toMatch(/Finale|Final/);
    expect(cup.guests).toHaveLength(7);
    expect(Math.min(...cup.guests.map((g) => g.level))).toBe(6);
    expect(Math.max(...cup.guests.map((g) => g.level))).toBe(7);
    for (const t of cup.ties) expect(cup.levels[t.home]).toBeLessThanOrEqual(cup.levels[t.away]); // Heimrecht beim Klassentieferen
    // höhere Stärke: Schnitt der besten 11 der Gäste über dem eines Bezirksliga-Gegners (gleiche Stichprobe)
    const top = (club) => club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / 11;
    const landAvg = cup.guests.reduce((s, g) => s + top(g), 0) / cup.guests.length;
    const c2 = at(4, 9);
    const bz = startPokal(c2, 'kreis').guests.filter((g) => g.level === 5);
    expect(landAvg).toBeGreaterThan(bz.reduce((s, g) => s + top(g), 0) / bz.length);
  });

  it('Pokalwochen: alle vier Pokale liegen nie in der ersten Woche und nicht in der Winterpause; zwei Pokale nur, wenn die Saison keinen Platz mehr hat', () => {
    for (const size of [6, 8]) {
      const c = createCareer({ seed: 3, leagueSize: size });
      c.level = 5;
      const n = c.fixtures.length;
      const all = ['kreis', 'bezirk', 'land', 'bund'].map((k) => pokalRounds(c, k));
      expect(all.map((r) => r.length)).toEqual([4, 3, 3, 6]);
      for (const r of all.flat()) {
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThan(n);
        expect(r).not.toBe(Math.floor(n / 2));
      }
      for (const r of all) expect([...r].sort((x, y) => x - y)).toEqual(r);
      const free = n - 2; // Wochen ohne erste Woche und Winterpause
      const distinct = new Set(all.slice(0, 3).flat()).size;
      expect(distinct).toBe(Math.min(free, 10)); // belegt alle freien Wochen, bevor eine doppelt vergeben wird
      expect(new Set(all[3]).size).toBe(6); // der überregionale Pokal (samstags) vergibt jede seiner Wochen nur einmal
      expect(new Set([...all[0], ...all[1]]).size).toBe(7); // Kreis und Bezirk nie in derselben Woche (wie bisher)
    }
  });
});

describe('Überregionaler Pokal gegen einen Profiverein', () => {
  const bundCareer = (seed = 21, level = 5) => {
    const c = at(level, seed);
    c.bundQual = c.season;
    return c;
  };

  it('Name: erfunden, zentral als eine Konstante, kein DFB und kein anderer realer Wettbewerb', () => {
    expect(POKALE.bund.name).toBe(BUND_NAME);
    expect(BUND_NAME).not.toMatch(/dfb|uefa|fifa|champions|europa|fa cup|copa|coupe/i);
    expect(BUND_NAME).toMatch(/^(Bundespokal|National Cup)$/);
    // Quelltext beider Sprachen: kein realer Wettbewerbsname in den Pokaldaten.
    const src = readFileSync(new URL('../src/career/bundespokal.js', import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n'); // Quellenangaben in Kommentaren dürfen den echten Pokal nennen
    expect(src).not.toMatch(/DFB|UEFA|FIFA|Bundesliga|Champions League|Europa League|FA Cup/);
    // Der Name steht außerhalb der Datendatei nur als Konstante, nie als Text.
    const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.js') ? [join(d, f)] : []));
    for (const f of walk(new URL('../src', import.meta.url).pathname)) {
      if (f.endsWith('bundespokal.js')) continue;
      const code = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).map((l) => l.replace(/\s\/\/.*$/, '')).join('\n');
      expect(code, f).not.toMatch(/Bundespokal|National Cup/);
    }
  });

  it('Profis sind erfunden: keine bekannten Vereinsnamen, eigene Farben, Kader nur aus den oberen Klassen', () => {
    const names = JSON.stringify(PROFIS.map((p) => [p.name, p.short]));
    expect(names).not.toMatch(/Bayern|Dortmund|Schalke|Leverkusen|Hamburg|Werder|Gladbach|Stuttgart|Leipzig|Madrid|Barcelona|Juventus|Arsenal|Chelsea|Liverpool|Manchester/i);
    expect(PROFIS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(PROFIS.map((p) => p.id)).size).toBe(PROFIS.length);
    for (const k of Object.values(PROFI_KLASSEN)) expect(Object.keys(k.tiers).every((t) => ['gut', 'stark', 'dorfstar', 'superstar', 'legende'].includes(t))).toBe(true);
    // Der Zweitligist hat schwächere Klassen und bekommt dafür etwas mehr Aufschlag (gemessen auf 3–5 %): die Kader-Stärke bleibt Erst > Zweit.
    const top11 = (c, club) => club.squad.map((i) => playerOf(c, i).rating).sort((x, y) => y - x).slice(0, 11).reduce((t, x) => t + x, 0) / 11;
    const avg = {};
    const saved = BUND_ERST[0];
    for (const [klass, v] of [['zweit', 0], ['erst', 1]]) {
      BUND_ERST[0] = v;
      let sum = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const c = at(5, seed);
        c.bundQual = c.season;
        sum += top11(c, startPokal(c, 'bund').guests[0]);
      }
      avg[klass] = sum / 12;
    }
    BUND_ERST[0] = saved;
    expect(avg.erst).toBeGreaterThan(avg.zweit);
    expect(PROFIS.length).toBeGreaterThanOrEqual(6); // je Runde ein anderer Verein
  });

  it('Runde 1: Heimrecht des Amateurs, Großfeld 11 gegen 11, Samstag, sechs Runden angesetzt, erst eine Paarung', () => {
    for (const level of [3, 4, 5]) {
      const c = bundCareer(30 + level, level);
      const cup = startPokal(c, 'bund');
      expect(cup.ties).toHaveLength(1);
      expect(cup.rounds).toHaveLength(6);
      const me = humanClub(c).id;
      expect(cup.ties[0].home).toBe(me);
      expect([8, 9]).toContain(cup.levels[cup.ties[0].away]);
      c.round = cup.rounds[0];
      const p = preparePokalMatch(c, 'bund', cup.ties[0]);
      expect(p.pitch.id).toBe('grossfeld');
      expect(p.pitch.format).toBe(11);
      expect(p.match.players.filter((x) => x.team === 0)).toHaveLength(11);
      expect(p.match.players.filter((x) => x.team === 1)).toHaveLength(11);
      expect(p.match.midweek).toBe(false);
      expect(p.humanIsAway).toBe(false);
      expect(pokalWhen('bund')).toMatch(/Samstag|Saturday/);
      expect(roundName(cup)).toMatch(/1\. Runde|First round/);
    }
  });

  it('Profi-Stärke deutlich über allen Amateurteams (Stichprobe über viele Kader)', () => {
    const top = (c, club) => club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / 11;
    let minGap = Infinity;
    for (let seed = 1; seed <= 25; seed++) {
      const c = bundCareer(seed);
      const cup = startPokal(c, 'bund');
      const pro = top(c, cup.guests[0]);
      // stärkster Amateurkader: der beste Verein der Bezirksliga
      const amateurs = LEAGUES[5].clubs.map((d) => top(c, { squad: squadPicker(createRng(seed * 7 + d.id.length), new Set())(d.tiers, SQUAD_SHAPES.xxl) }));
      minGap = Math.min(minGap, pro - Math.max(...amateurs));
    }
    expect(minGap).toBeGreaterThan(5);
  });

  it('Zuschauer und Theke: deutlich mehr als bei einem normalen Heimspiel', () => {
    const c = bundCareer(40, 5);
    const cup = startPokal(c, 'bund');
    c.round = cup.rounds[0];
    const p = preparePokalMatch(c, 'bund', cup.ties[0]);
    expect(p.bund.venue).toBe('own');
    expect(p.match.crowd).toBeGreaterThan(400);
    const k = at(5, 40);
    const kc = startPokal(k, 'kreis');
    const kt = kc.ties.find((t) => t.home === humanClub(k).id || t.away === humanClub(k).id);
    k.round = kc.rounds[0];
    expect(p.match.crowd).toBeGreaterThan(preparePokalMatch(k, 'kreis', kt).match.crowd * 2);
    // Kasse: Getränkeverkauf-Buchung
    const cash = (prep, cc) => {
      const before = cc.ledger.length;
      simulateSync(prep);
      recordPokalResult(cc, prep);
      return cc.ledger.slice(before).filter((l) => /Getränke|Drinks/.test(l.text)).reduce((s, l) => s + l.amount, 0);
    };
    const bund = cash(p, c);
    const k2 = at(5, 40);
    const kc2 = startPokal(k2, 'kreis');
    const kt2 = kc2.ties.find((t) => t.home === humanClub(k2).id);
    let normal = 0;
    if (kt2) {
      k2.round = kc2.rounds[0];
      normal = cash(preparePokalMatch(k2, 'kreis', kt2), k2);
    }
    if (normal > 0) expect(bund).toBeGreaterThan(normal * 2);
    expect(bund).toBeGreaterThan(300);
  }, 120_000);

  it('Ausgang: Sieg = Sensation (Chronik, Museum, Kreisblatt, Prämie), knappe Niederlage = achtbar, hohe Niederlage nur Log', () => {
    const run = (gf, ga, seed) => {
      const c = bundCareer(seed, 5);
      c.sponsors = [{ id: 'krume', slot: 'trikot', name: 'Bäckerei Krume', weekly: 50, bonus: 300, rel: 50 }];
      const cup = startPokal(c, 'bund');
      c.round = cup.rounds[0];
      const tie = cup.ties[0];
      tie.result = { home: gf, away: ga };
      const cash0 = c.cash;
      afterHumanTie(c, 'bund');
      return { c, cup, tie, gained: c.cash - cash0 };
    };
    const win = run(2, 1, 50);
    const unit = homeUnit(5);
    expect(win.cup.done).toBe(false); // es geht weiter: Runde 2 ist ausgelost
    expect(win.cup.round).toBe(1);
    expect(win.cup.out).toBe(false);
    expect(win.gained).toBe(900 + unit * BUND_PRIZE[0]); // 3 × Bonus des Hauptsponsors plus Rundenprämie des Verbands
    expect(win.c.trophies.some((t) => t.kind === 'foto')).toBe(true); // Foto mit dem Profi-Star in der Vitrine
    expect(win.c.bundGames.at(-1)).toMatchObject({ won: true, gf: 2, ga: 1 });
    expect(win.c.pendingNews.join(' ')).toMatch(/Kreisblatt/);
    expect(win.c.saga.chronicle.some((e) => /SENSATION|SENSATION/.test(e.text))).toBe(true);
    expect(museum(win.c).records.some((r) => /Sensation|sensation/.test(r.label))).toBe(true);

    const close = run(0, 1, 51);
    expect(close.cup.out).toBe(true);
    expect(close.gained).toBe(unit * BUND_PRIZE[0]); // keine Sponsorprämie fürs Ausscheiden, die Rundenprämie des Verbands gibt es fürs Mitspielen
    expect(close.c.bundGames.at(-1)).toMatchObject({ won: false, close: true });
    expect(close.c.saga.chronicle.some((e) => /Achtbar|Honourable/.test(e.text))).toBe(true);
    expect(museum(close.c).records.some((r) => /achtbar|honourable/.test(r.label))).toBe(true);

    const heavy = run(0, 4, 52);
    expect(heavy.c.bundGames.at(-1)).toMatchObject({ won: false, close: false });
    expect(museum(heavy.c).records.some((r) => /achtbar|honourable|Sensation|sensation/.test(r.label))).toBe(false);
    expect(heavy.c.saga.chronicle.some((e) => /Achtbar|Honourable|SENSATION/.test(e.text))).toBe(false);
  });

  it('Chat und Presse: Auslosung im Kreisblatt, Vorfreude in der Gruppe, am Spieltag noch einmal', () => {
    const c = bundCareer(60, 5);
    const cup = startPokal(c, 'bund');
    const opp = cup.guests[0].name;
    c.round = 0;
    const first = [];
    bundChat(c, first);
    expect(first.some((m) => m.press && m.text.includes(opp))).toBe(true);
    expect(first.some((m) => m.from !== null)).toBe(true);
    c.round = cup.rounds[0];
    const day = [];
    bundChat(c, day);
    expect(day.some((m) => m.press && m.text.includes(opp))).toBe(true);
    c.round = cup.rounds[0] + 1; // nach dem Spieltag: nichts mehr
    const after = [];
    bundChat(c, after);
    expect(after).toHaveLength(0);
  });

  it('Engine: Profi gegen Amateur ist spielbar (Spiel läuft durch, Tore auf beiden Seiten möglich)', () => {
    const c = bundCareer(70, 5);
    const cup = startPokal(c, 'bund');
    c.round = cup.rounds[0];
    const p = preparePokalMatch(c, 'bund', cup.ties[0]);
    const m = simulateSync(p);
    expect(m.phase).toBe('ended');
    expect(m.score[0] + m.score[1]).toBeLessThan(15);
  }, 120_000);
});

describe('Pokalsieg-Prämien des Hauptsponsors', () => {
  const sponsored = (seed = 7, level = 5) => {
    const c = at(level, seed);
    c.sponsors = [
      { id: 'krume', slot: 'bande', name: 'Bäckerei Krume', weekly: 20, bonus: 100, rel: 50 },
      { id: 'brenner', slot: 'trikot', name: 'Autohaus Brenner', weekly: 60, bonus: 300, rel: 50 },
    ];
    return c;
  };

  it('Höhe: Vielfaches des Saisonziel-Bonus des Trikotsponsors – Kreis ×1, Bezirk ×1,5, Land ×2, Einzug überregional ×3', () => {
    expect(PRAEMIE).toEqual({ kreis: 1, bezirk: 1.5, land: 2, bund: 3 });
    const c = sponsored();
    expect(sponsorPraemie(c, 'kreis')).toMatchObject({ amount: 300 });
    expect(sponsorPraemie(c, 'bezirk').amount).toBe(450);
    expect(sponsorPraemie(c, 'land').amount).toBe(600);
    expect(sponsorPraemie(c, 'bund').amount).toBe(900);
    expect(sponsorPraemie(c, 'bund').sponsor.id).toBe('brenner');
    c.sponsors = c.sponsors.filter((s) => s.slot !== 'trikot'); // kein Trikotsponsor: der zahlungskräftigste springt ein
    expect(sponsorPraemie(c, 'kreis').sponsor.id).toBe('krume');
    c.sponsors = [];
    expect(sponsorPraemie(c, 'kreis')).toBeNull();
  });

  it('Auszahlung bei Pokalsieg (Kreis/Bezirk/Land) mit Buchung und besserer Laune des Sponsors; nicht bei Niederlage', () => {
    for (const kind of ['kreis', 'bezirk', 'land']) {
      const c = sponsored(8);
      if (kind === 'bezirk') c.pokalQual = c.season;
      if (kind === 'land') c.landQual = c.season;
      const cup = startPokal(c, kind);
      const cash0 = c.cash;
      const rel0 = c.sponsors[1].rel;
      let guard = 0;
      while (!cup.done && guard++ < 8) settle(c, kind, true);
      expect(c.cash - cash0).toBe(Math.round(300 * PRAEMIE[kind]));
      expect(c.ledger.at(-1).text).toMatch(/Pokalprämie|Cup bonus/);
      expect(c.sponsors[1].rel).toBeGreaterThan(rel0);
    }
    const lost = sponsored(9);
    const cup = startPokal(lost, 'kreis');
    const cash0 = lost.cash;
    settle(lost, 'kreis', false);
    expect(cup.out).toBe(true);
    expect(lost.cash).toBe(cash0);
  });

  it('ohne Sponsor: Pokal und Qualifikation ja, Prämie nein (kein Absturz)', () => {
    const c = at(5, 10);
    c.sponsors = [];
    c.cash = 100;
    const cup = startPokal(c, 'bezirk');
    let guard = 0;
    while (!cup.done && guard++ < 6) settle(c, 'bezirk', true);
    expect(cup.winner).toBe(humanClub(c).id);
    expect(c.cash).toBe(100);
    expect(c.landQual).toBe(c.season + 1);
  });
});

describe('Überregionaler Pokal: mehrere Runden, Spielort, Einnahmen', () => {
  const bundCareer = (seed = 21) => {
    const c = at(5, seed);
    c.bundQual = c.season;
    c.sponsors = [{ id: 'brenner', slot: 'trikot', name: 'Autohaus Brenner', weekly: 60, bonus: 300, rel: 50 }];
    return c;
  };

  it('Rundenablauf: sechs Runden, jede gegen einen anderen Profi, Stärke nach Liga, Finalsieg = Pokal in der Vitrine', () => {
    const c = bundCareer(5);
    const cup = startPokal(c, 'bund');
    const cash0 = c.cash;
    const names = [];
    for (let r = 0; r < 6; r++) {
      expect(cup.round).toBe(r);
      const tie = settle(c, 'bund', true);
      names.push(tie.home === humanClub(c).id ? tie.away : tie.home);
      expect(roundName(cup, r)).toMatch([/1\. Runde|First round/, /2\. Runde|Second round/, /Achtelfinale|Round of 16/, /Viertelfinale|Quarter/, /Halbfinale|Semi/, /^(Finale|Final)$/][r]);
    }
    expect(new Set(names).size).toBe(6); // nie zweimal derselbe Verein
    expect(cup.done).toBe(true);
    expect(cup.winner).toBe(humanClub(c).id);
    expect(c.trophies.some((t) => /Bundespokal|National Cup/.test(t.name) && t.kind !== 'foto')).toBe(true);
    expect(c.trophies.filter((t) => t.kind === 'foto').length).toBeGreaterThanOrEqual(5);
    // Rundenprämien verdoppeln sich (1, 2, 4, 8, 16) und der Sieger bekommt 20,4 ×; dazu Sponsorprämien 3,1,1,1,1,3 × 300
    const unit = homeUnit(5);
    const prizes = BUND_PRIZE.slice(0, 5).reduce((a, b) => a + b, 0) + BUND_PRIZE_WINNER;
    expect(c.cash - cash0).toBeGreaterThanOrEqual(Math.round(unit * prizes) + 300 * 10 - 6);
    expect(BUND_PRIZE.slice(1, 5).every((p, i) => p === BUND_PRIZE[i] * 2)).toBe(true);
    const klassen = cup.guests.map((g) => g.klass);
    expect(klassen.every((k) => k === 'zweit' || k === 'erst')).toBe(true);
    expect(BUND_ERST.at(-1)).toBe(1); // das Finale spielt man nie gegen einen Zweitligisten
  });

  it('Ausscheiden beendet den Wettbewerb; die Gäste verlassen den Spielstand', () => {
    const c = bundCareer(6);
    const cup = startPokal(c, 'bund');
    settle(c, 'bund', true);
    const guests = cup.guests.flatMap((g) => g.squad);
    settle(c, 'bund', false);
    expect(cup.done).toBe(true);
    expect(cup.out).toBe(true);
    for (const idx of guests) if (!c.clubs.some((x) => x.squad.includes(idx))) expect(c.players[idx]).toBeUndefined();
  });

  it('Auslosung ab Runde 2: das Los kann das Auswärtsspiel im großen Stadion bringen, Runde 1 ist immer ein Heimspiel', () => {
    let away = 0;
    let total = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const c = bundCareer(seed);
      const cup = startPokal(c, 'bund');
      expect(cup.ties[0].home).toBe(humanClub(c).id);
      for (let r = 1; r < 5; r++) {
        settle(c, 'bund', true);
        const t = cup.ties.at(-1);
        total++;
        if (t.home !== humanClub(c).id) {
          away++;
          expect(t.venue).toBe('stadium');
          c.round = cup.rounds[cup.round];
          const p = preparePokalMatch(c, 'bund', t);
          expect(p.pitch.id).toBe('stadion');
          expect(p.humanIsAway).toBe(false); // ohne Mensch am Gamepad ist Team 0 trotzdem der Amateur
        }
      }
    }
    expect(away / total).toBeGreaterThan(0.2);
    expect(away / total).toBeLessThan(0.6);
  });

  it('Spielort-Ereignis: erscheint nur vor einem Heimspiel, bietet drei Orte, wirkt auf Kasse, Stimmung und Platz', () => {
    const results = {};
    for (const [choice, key] of [[0, 'stadium'], [1, 'stands'], [2, 'own']]) {
      const c = bundCareer(7);
      c.cash = 1000;
      const cup = startPokal(c, 'bund');
      c.round = cup.rounds[0];
      c.week = { chat: [], event: null, availability: {} };
      const ev = bundVenueEvent(c);
      expect(ev.id).toBe('bund_spielort');
      expect(ev.options).toHaveLength(3);
      expect(ev.text).toMatch(new RegExp(cup.guests[0].name.replace(/[()]/g, '.')));
      expect(BUND_EVENTS.bund_spielort.options).toHaveLength(3);
      const mood0 = c.mood ?? 0;
      resolveEvent(c, choice);
      expect(cup.ties[0].venue).toBe(key);
      results[key] = { cost: 1000 - c.cash, mood: (c.mood ?? 0) - mood0 };
      c.week.event = null;
      expect(bundVenueEvent(c)).toBeNull(); // nur einmal je Spiel
      c.round = cup.rounds[0];
      c.week.event = null;
      const p = preparePokalMatch(c, 'bund', cup.ties[0]);
      expect(p.pitch.id).toBe(BUND_VENUES[key].pitch === 'grossfeld' ? 'grossfeld' : BUND_VENUES[key].pitch);
      expect(p.bund.venue).toBe(key);
      expect(p.match.crowd).toBeLessThanOrEqual(BUND_VENUES[key].cap);
    }
    expect(results.own.cost).toBe(0);
    expect(results.stands.cost).toBeGreaterThanOrEqual(Math.round(homeUnit(5) * 0.6));
    expect(results.stadium.cost).toBeGreaterThanOrEqual(Math.round(homeUnit(5) * 0.8));
    expect(results.own.mood).toBeGreaterThan(results.stands.mood - 1e-9);
    expect(results.stadium.mood).toBeLessThan(0); // kein Heimgefühl
    expect(results.own.mood).toBeGreaterThan(0);
  });

  it('Spielort-Ereignis nach dem Spiel: weder Miete noch Stimmung, Ort bleibt; vor dem Anpfiff gilt „eigener Platz"', () => {
    // (1) Spiel schon gespielt, Ereignis noch offen → Auto-Auflösung beim Wochenwechsel bucht nichts mehr.
    const c = bundCareer(7);
    c.cash = 1000;
    const cup = startPokal(c, 'bund');
    c.round = cup.rounds[0];
    c.week = { chat: [], event: null, availability: {} };
    bundVenueEvent(c);
    cup.ties[0].result = { home: 1, away: 2 };
    const mood0 = c.mood ?? 0;
    const led0 = c.ledger.length;
    resolveEvent(c, 0); // Umzug ins Stadion
    expect(c.cash).toBe(1000);
    expect(c.ledger).toHaveLength(led0);
    expect(c.mood ?? 0).toBe(mood0);
    expect(cup.ties[0].venue).toBeNull();
    // (2) Anpfiff mit offenem Ereignis: automatisch „eigener Platz", Ereignis ist beantwortet.
    const d = bundCareer(7);
    const dcup = startPokal(d, 'bund');
    d.round = dcup.rounds[0];
    d.week = { chat: [], event: null, availability: {} };
    bundVenueEvent(d);
    expect(d.week.event.choice).toBeNull();
    const p = preparePokalMatch(d, 'bund', dcup.ties[0]);
    expect(d.week.event.choice).toBe(2);
    expect(dcup.ties[0].venue).toBe('own');
    expect(p.bund.venue).toBe('own');
  });

  it('Abrechnung = Anzeige: Zuschauerzahl der Buchung ist match.crowd; Tribüne/Stadion ohne zusätzliche Platzmiete, eigener Platz mit', () => {
    const net = {};
    for (const [choice, key] of [[0, 'stadium'], [1, 'stands'], [2, 'own']]) {
      const c = bundCareer(9);
      const cup = startPokal(c, 'bund');
      c.round = cup.rounds[0];
      c.week = { chat: [], event: null, availability: {} };
      bundVenueEvent(c);
      resolveEvent(c, choice);
      const n0 = c.ledger.length;
      const p = preparePokalMatch(c, 'bund', cup.ties[0], { duration: 60 });
      simulateSync(p);
      recordPokalResult(c, p);
      const rows = c.ledger.slice(n0);
      const sum = (re) => rows.filter((l) => re.test(l.text)).reduce((t, l) => t + l.amount, 0);
      const crowdRows = rows.filter((l) => /Getränke|Drinks|Eintrittsanteil|Gate share/.test(l.text));
      expect(crowdRows).toHaveLength(2);
      for (const l of crowdRows) expect(l.text).toContain(`(${p.match.crowd} `); // genau die angezeigte Zahl
      net[key] = { crowd: p.match.crowd, gate: sum(/Eintrittsanteil|Gate share/), theke: sum(/Getränke|Drinks/), pitchRent: sum(/Platzmiete|Pitch rent/), total: 0 };
    }
    expect(net.own.pitchRent).toBeLessThan(0);
    expect(net.stands.pitchRent).toBe(0);
    expect(net.stadium.pitchRent).toBe(0);
    expect(net.stadium.crowd).toBeGreaterThan(net.stands.crowd);
    expect(net.stands.crowd).toBeGreaterThan(net.own.crowd);
  }, 180_000);

  it('Chat: Tribünen-Meldung nur bei gemieteter Tribüne im Heimspiel, „Parkplatz voll" nicht auswärts', () => {
    const run = (setup, left) => {
      const c = bundCareer(12);
      const cup = startPokal(c, 'bund');
      setup(cup, humanClub(c).id);
      c.round = cup.rounds[0] - left;
      c.season = c.season;
      const chat = [];
      cup.drawn = cup.round;
      bundChat(c, chat);
      return chat.filter((x) => x.press).map((x) => x.text);
    };
    const hype = /Tieflader|low-loader|Bürgermeister|mayor|Reporter/;
    expect(run((cup) => { cup.ties[0].venue = 'stands'; }, 1).some((t) => hype.test(t))).toBe(true);
    expect(run((cup) => { cup.ties[0].venue = 'own'; }, 1)).toHaveLength(0);
    const away = (cup, me) => Object.assign(cup.ties[0], { home: cup.ties[0].away, away: me, venue: 'stadium' });
    expect(run(away, 1)).toHaveLength(0);
    expect(run(away, 0)).toHaveLength(0); // Spieltag auswärts: kein Parkplatz-Text
    expect(run((cup) => { cup.ties[0].venue = 'own'; }, 0)).toHaveLength(1);
  });

  it('Auswärtsspiel: kein Ereignis, großes Stadion', () => {
    const c = bundCareer(8);
    const cup = startPokal(c, 'bund');
    const me = humanClub(c).id;
    Object.assign(cup.ties[0], { home: cup.ties[0].away, away: me, venue: 'stadium' });
    c.round = cup.rounds[0];
    c.week = { chat: [], event: null, availability: {} };
    expect(bundVenueEvent(c)).toBeNull();
  });

  it('Einnahmen je Spielort: Stadion > Tribüne > eigener Platz (Eintrittsanteil + Theke − Miete); Stadion lässt Theke beim Betreiber', () => {
    const net = {};
    for (const [choice, key] of [[0, 'stadium'], [1, 'stands'], [2, 'own']]) {
      const c = bundCareer(9);
      const cup = startPokal(c, 'bund');
      c.round = cup.rounds[0];
      c.week = { chat: [], event: null, availability: {} };
      const n0 = c.ledger.length;
      bundVenueEvent(c);
      resolveEvent(c, choice);
      const p = preparePokalMatch(c, 'bund', cup.ties[0], { duration: 60 });
      simulateSync(p);
      recordPokalResult(c, p);
      const rows = c.ledger.slice(n0);
      const sum = (re) => rows.filter((l) => re.test(l.text)).reduce((t, l) => t + l.amount, 0);
      net[key] = { theke: sum(/Getränke|Drinks/), gate: sum(/Eintrittsanteil|Gate share/), rent: sum(/Stadionmiete|Stadium hire|Stahlrohrtribüne|Scaffold stand/) };
      net[key].total = net[key].theke + net[key].gate + net[key].rent;
    }
    expect(net.own.rent).toBe(0);
    expect(net.stands.rent).toBeLessThan(0);
    expect(net.stadium.rent).toBeLessThan(net.stands.rent);
    expect(net.stands.gate).toBeGreaterThan(net.own.gate);
    expect(net.stadium.gate).toBeGreaterThan(net.stands.gate);
    expect(net.stadium.theke).toBeLessThan(net.stands.theke); // Betreiber behält den Großteil
    expect(net.stands.total).toBeGreaterThan(net.own.total);
    expect(net.stadium.total).toBeGreaterThan(net.stands.total); // deutlich mehr Einnahmen im Stadion
    expect(net.own.total).toBeGreaterThan(500); // volle Hütte schon auf dem eigenen Platz
  }, 180_000);

  it('alte Spielstände: ohne Pokal-Felder laden, Woche starten, keine Bundespokal-Reste', () => {
    const c = at(4, 11);
    delete c.pokale;
    delete c.landQual;
    delete c.bundQual;
    delete c.bundGames;
    const loaded = migrateCareer(JSON.parse(JSON.stringify(c)));
    startWeek(loaded);
    expect(pokalOf(loaded, 'land')).toBeNull();
    expect(pokalOf(loaded, 'bund')).toBeNull();
    expect(museum(loaded).records).toBeTruthy();
    // Alter Stand mit laufendem Kreispokal (ohne neue Felder wie venue/klass) spielt weiter
    const d = at(3, 21);
    finishRound(d);
    const old = JSON.parse(JSON.stringify(d));
    const l2 = migrateCareer(old);
    expect(pokalOf(l2, 'kreis')).toBeTruthy();
    while (!seasonOver(l2)) finishRound(l2);
    expect(pokalOf(l2, 'kreis').done).toBe(true);
  });

  it('Eintrittsteilung und Prämienstaffel sind belegt (45 %/45 %/10 % und Verdopplung), Einheit = Durchschnitts-Heimspiel', () => {
    expect(homeUnit(5)).toBe(Math.round(140 * 4.7));
    expect(homeUnit(4)).toBe(Math.round(67.5 * 2.5));
    expect(homeUnit(5)).toBeGreaterThan(homeUnit(4));
    expect(BUND_PRIZE_WINNER).toBeGreaterThan(BUND_PRIZE[5]);
  });
});

// Außenseiterchance gegen die Profis: gemessen mit scripts/bundespokal-calibrate.mjs, je 400 Spiele, beide Mannschaften von der
// KI. Kader „mittel" (Zugänge, wie sie ein Bezirksligist anwirbt): Zweitligist 4,8 %, Erstligist 3,5 %; Zielband 3–5 %.
describe('Außenseiterchance gegen Profis (gemessen)', () => {
  const MEASURED = { zweit: 0.048, erst: 0.035 };
  const TIERS = { ok: 0.14, gut: 0.33, stark: 0.3, dorfstar: 0.16, superstar: 0.06, legende: 0.01 };
  const setup = (seed, klass) => {
    BUND_ERST[0] = klass === 'erst' ? 1 : 0;
    const c = at(5, seed);
    c.bundQual = c.season;
    const me = humanClub(c);
    me.squad = squadPicker(createRng(77 + seed), new Set())(TIERS, SQUAD_SHAPES.xxl);
    for (const idx of me.squad) c.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
    return { c, cup: startPokal(c, 'bund') };
  };
  const erst0 = BUND_ERST[0];
  afterEach(() => {
    BUND_ERST[0] = erst0;
  });

  it('schnelles Modell (Spiele, die der Mensch auslässt): nah an der Engine-Messung, Zweitligist > Erstligist', () => {
    const rate = {};
    for (const klass of ['zweit', 'erst']) {
      const rng = createRng(11);
      let w = 0;
      let n = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const { c, cup } = setup(seed, klass);
        for (let k = 0; k < 120; k++) {
          const t = { ...cup.ties[0], result: null, pens: null };
          quickTie(c, cup, t, rng);
          n++;
          if (tieWinner(t) === humanClub(c).id) w++;
        }
      }
      rate[klass] = w / n; // n = 4800: Standardfehler ≈ 0,4 Prozentpunkte
    }
    expect(QUICK_BUND.perPoint).toBeGreaterThan(0.03); // steiler als gegen Amateure
    expect(rate.zweit).toBeGreaterThan(rate.erst);
    // Toleranz 2 Prozentpunkte: Standardfehler der Engine-Messung bei n = 400 ≈ 1 Punkt, des Schnellmodells (4800 Würfe) ≈ 0,3.
    for (const klass of ['zweit', 'erst']) expect(Math.abs(rate[klass] - MEASURED[klass])).toBeLessThan(0.02);
    for (const klass of ['zweit', 'erst']) expect(rate[klass]).toBeLessThan(0.06); // unter der Obergrenze des Zielbands (5 %) plus Messfehler
  });

  it('Engine: der Amateur gewinnt selten – Profis schießen deutlich mehr Tore (60 Spiele)', () => {
    const N = 60; // Obergrenze p0 + 4σ, σ = √(p0(1−p0)/N) ≈ 0,027 → 0,045 + 0,107 = 0,15 (höchstens 9 Siege)
    let win = 0;
    let gf = 0;
    let ga = 0;
    for (let i = 0; i < N; i++) {
      const { c, cup } = setup(200 + i, 'zweit');
      c.round = cup.rounds[0];
      const p = preparePokalMatch(c, 'bund', cup.ties[0]);
      const m = simulateSync(p);
      gf += m.score[0];
      ga += m.score[1];
      recordPokalResult(c, p);
      if (tieWinner(cup.ties[0]) === humanClub(c).id) win++;
    }
    const rate = win / N;
    const sigma = Math.sqrt((MEASURED.zweit * (1 - MEASURED.zweit)) / N);
    expect(rate).toBeLessThanOrEqual(MEASURED.zweit + 4 * sigma); // Band um den gemessenen Wert (≈ 0,30 oben)
    expect(ga).toBeGreaterThan(gf * 3); // gemessen: 4,4 : 0,7 Tore je Spiel
    expect(gf + ga).toBeGreaterThan(N); // das Spiel läuft, es fallen Tore
  }, 600_000);
});
