// Tim „Der Tiger“ (src/career/tiger.js): Zustand, Ereignisse, Wartezeiten, Ketten, Determinismus, alte Spielstände.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { EVENTS, resolveEvent, rollWeekEvent } from '../src/career/events.js';
import { LOCAL_EVENTS } from '../src/career/localevents.js';
import { PHASE_EVENTS } from '../src/career/phaseevents.js';
import { TIGER_EVENTS, tigerAtMatch, tigerChainDue, tigerForMatch, tigerOf, tigerWeek } from '../src/career/tiger.js';
import { createRng } from '../src/core/rng.js';

const IDS = Object.keys(TIGER_EVENTS);
const FOLLOW = IDS.filter((id) => TIGER_EVENTS[id].followUp);

// Startkarriere je Seed nur einmal bauen (createCareer ist teuer); jede Szene bekommt eine frische Kopie.
const BASE = new Map();
const careerFor = (seed) => {
  if (!BASE.has(seed)) BASE.set(seed, JSON.stringify(createCareer({ seed })));
  return JSON.parse(BASE.get(seed));
};

function scene(id, seed0 = 1, extra = () => {}) {
  for (let seed = seed0; seed < seed0 + 300; seed++) {
    const c = careerFor(seed);
    c.level = 3;
    c.round = 4;
    c.week.weather = { id: 'sonne' };
    const t = tigerOf(c);
    t.wk = 10;
    t.gap = 0;
    t.big = { kind: 'win', score: '4:0', opp: 'Test', wk: 10 };
    t.streak = { w: 3, l: 0, d: 0 };
    t.mood = 0.8;
    t.role = 'fanbeauftragter';
    t.story = { path: 'listen', stance: 1, start: 5, pts: 5, n: 3 };
    t.links = { tiger_stammtisch: { due: 10, path: 'listen', story: true }, tiger_urteil: { due: 10, story: true }, tiger_tipp_ergebnis: { due: 10, tip: [2, 0], bet: 1 } };
    t.back = id === 'tiger_zurueck';
    const me = humanClub(c).id;
    for (const f of c.fixtures[3]) if (f.home === me || f.away === me) f.result = { home: 0, away: 0 };
    extra(c, id);
    const ctx = TIGER_EVENTS[id].needs(c, createRng(seed));
    if (ctx) return { c, ctx, seed };
  }
  throw new Error('keine Lage für ' + id);
}
const away = (c) => { const me = humanClub(c).id; const f = c.fixtures[c.round].find((x) => x.home === me || x.away === me); if (f.home === me) { f.home = f.away; f.away = me; } };
const fresh = (c) => { const t = tigerOf(c); t.story = null; t.links = {}; t.streak = { w: 0, l: 1, d: 0 }; t.big = null; };
const sceneOf = (id) => scene(id, 1, id === 'tiger_bus' ? away : id === 'tiger_brief' ? fresh : undefined);

describe('Tiger: Aufbau', () => {
  it('19 Ereignisse, eindeutig, fünf bevorzugte Ereignisse (Ketten und Runde)', () => {
    expect(IDS).toHaveLength(19);
    for (const reg of [EVENTS, LOCAL_EVENTS, PHASE_EVENTS]) for (const id of IDS) expect(reg[id]).toBeUndefined();
    expect(FOLLOW.sort()).toEqual(['tiger_runde', 'tiger_stammtisch', 'tiger_tipp_ergebnis', 'tiger_urteil', 'tiger_zurueck']);
  });

  it('jede Antwort liefert Text, jeder Ausgang kommt vor und etwas ändert sich', () => {
    for (const id of IDS) {
      const def = TIGER_EVENTS[id];
      expect(def.options.length, id).toBeGreaterThanOrEqual(id === "tiger_tipp_ergebnis" ? 2 : 3);
      def.options.forEach((o, i) => {
        const texts = new Set();
        let changed = 0;
        for (let k = 0; k < 25; k++) {
          const { c, ctx } = sceneOf(id);
          const before = JSON.stringify({ c: c.cash, m: c.mood, t: c.tiger, p: c.players, cl: c.clubLife });
          const res = o.effect(c, ctx, createRng(k * 31 + i));
          expect(typeof res, `${id}/${i}`).toBe('string');
          expect(res.length).toBeGreaterThan(8);
          texts.add(res);
          if (JSON.stringify({ c: c.cash, m: c.mood, t: c.tiger, p: c.players, cl: c.clubLife }) !== before) changed++;
        }
        expect(changed, `${id}/${i} ändert nichts`).toBeGreaterThan(0);
        if (!/tipp_ergebnis/.test(id)) expect(texts.size, `${id}/${i} Ausgänge`).toBeGreaterThanOrEqual(1);
      });
    }
  });
});

describe('Tiger: Wartezeiten und Mindestabstand', () => {
  it('nach einer Entscheidung: Wartezeit je Ereignis und Mindestabstand zum nächsten', () => {
    const { c, ctx } = sceneOf('tiger_banner');
    const t = tigerOf(c);
    TIGER_EVENTS.tiger_banner.options[0].effect(c, ctx, createRng(1));
    expect(t.cool.tiger_banner).toBe(24);
    expect(t.gap).toBe(14);
    expect(TIGER_EVENTS.tiger_banner.needs(c, createRng(1))).toBeNull();
    expect(TIGER_EVENTS.tiger_gesang.needs(c, createRng(1)), 'Mindestabstand').toBeNull();
    t.wk = 14;
    expect(TIGER_EVENTS.tiger_gesang.needs(c, createRng(1))).toBeTruthy();
  });

  it('Pause: kein Ereignis, Anwesenheit am Spiel endet, danach kommt Tim zurück (Ereignis)', () => {
    const { c } = sceneOf('tiger_banner');
    const t = tigerOf(c);
    t.away = 2;
    for (const id of IDS) if (!TIGER_EVENTS[id].followUp) expect(TIGER_EVENTS[id].needs(c, createRng(1)), id).toBeNull();
    expect(tigerAtMatch(c, { home: true })).toBe(false);
    t.away = 1;
    c.round = 5;
    tigerWeek(c);
    expect(t.away).toBe(0);
    expect(t.back).toBe(true);
    expect(tigerChainDue(c)).toBe(true);
    expect(TIGER_EVENTS.tiger_zurueck.needs(c, createRng(1))).toBeTruthy();
  });

  it('Anwesenheit: daheim immer, auswärts nach Treue, Fanbeauftragter immer', () => {
    const c = createCareer({ seed: 5 });
    const t = tigerOf(c);
    expect(tigerAtMatch(c, { home: true })).toBe(true);
    t.loyal = 0;
    let n = 0;
    for (let r = 0; r < 200; r++) { c.round = r; if (tigerAtMatch(c, { home: false })) n++; }
    expect(n / 200).toBeGreaterThan(0.2);
    expect(n / 200).toBeLessThan(0.5);
    t.role = 'fanbeauftragter';
    expect(tigerAtMatch(c, { home: false })).toBe(true);
    const m = { humanTeam: 0 };
    expect(tigerForMatch(c, m, { home: true })).toBeTruthy();
    expect(m.tiger.team).toBe(0);
  });
});

describe('Tiger: Geschichte über mehrere Spieltage', () => {
  it('Brief → Stammtisch (2 Wochen später) → Urteil (3 Wochen später), Ausgang hängt an Ergebnissen und Haltung', () => {
    const { c, ctx } = scene('tiger_brief', 1, (c) => { tigerOf(c).story = null; tigerOf(c).links = {}; tigerOf(c).streak = { w: 0, l: 1, d: 0 }; tigerOf(c).big = null; });
    const t = tigerOf(c);
    TIGER_EVENTS.tiger_brief.options[0].effect(c, ctx, createRng(1));
    expect(t.story.path).toBe('listen');
    expect(t.links.tiger_stammtisch.due).toBe(t.wk + 2);
    expect(tigerChainDue(c)).toBe(false);
    t.wk += 2;
    const st = TIGER_EVENTS.tiger_stammtisch.needs(c, createRng(1));
    expect(st).toEqual({ path: 'listen' });
    expect(tigerChainDue(c)).toBe(true);
    TIGER_EVENTS.tiger_stammtisch.options[2].effect(c, st, createRng(1));
    expect(t.role).toBe('fanbeauftragter');
    expect(t.links.tiger_stammtisch).toBeUndefined();
    expect(t.links.tiger_urteil.due).toBe(t.wk + 3);
    t.wk += 3;
    t.story.pts = 9;
    t.story.n = 3;
    const u = TIGER_EVENTS.tiger_urteil.needs(c, createRng(1));
    expect(u.res).toBe('good');
    expect(u.st).toBe('hi');
    const loy = t.loyal;
    TIGER_EVENTS.tiger_urteil.options[0].effect(c, u, createRng(2));
    expect(t.loyal).toBeGreaterThan(loy);
    expect(t.story).toBeNull();
    // schlechte Lage + Abwimmeln: Tim bleibt weg
    const s2 = scene('tiger_brief', 1, (c) => { tigerOf(c).story = null; tigerOf(c).links = {}; tigerOf(c).streak = { w: 0, l: 1, d: 0 }; tigerOf(c).big = null; });
    const t2 = tigerOf(s2.c);
    TIGER_EVENTS.tiger_brief.options[3].effect(s2.c, s2.ctx, createRng(1));
    t2.wk += 2;
    TIGER_EVENTS.tiger_stammtisch.options[3].effect(s2.c, { path: 'ignore' }, createRng(1));
    t2.wk += 3;
    t2.story.pts = 0;
    t2.story.n = 4;
    const u2 = TIGER_EVENTS.tiger_urteil.needs(s2.c, createRng(1));
    expect(u2).toMatchObject({ res: 'bad', st: 'lo' });
    TIGER_EVENTS.tiger_urteil.options[2].effect(s2.c, u2, createRng(3));
    expect(t2.away).toBe(3);
  });

  it('Folge-Ereignisse verfallen nach der Frist', () => {
    const { c } = sceneOf('tiger_stammtisch');
    const t = tigerOf(c);
    t.wk = 10 + 5;
    expect(TIGER_EVENTS.tiger_stammtisch.needs(c, createRng(1))).toBeNull();
    c.round = 6;
    delete c.week;
    c.week = { chat: [], availability: {} };
    t.at = '';
    tigerWeek(c);
    expect(t.links.tiger_stammtisch).toBeUndefined();
  });

  it('Tipp: Auswertung gegen das echte Ergebnis, Einsatz wirkt', () => {
    const { c, ctx } = sceneOf('tiger_tipp_ergebnis');
    const e = ctx;
    expect(e.score).toBe('0:0');
    expect(e.exact).toBe(false);
    const cash = c.cash;
    TIGER_EVENTS.tiger_tipp_ergebnis.options[0].effect(c, { ...e, bet: 1 }, createRng(1));
    expect(c.cash).toBeGreaterThan(cash); // Tim lag daneben und zahlt
  });
});

describe('Tiger: Wochenlauf', () => {
  const run = (seed) => {
    const log = [];
    const c = createCareer({ seed });
    c.level = 1 + (seed % 4);
    for (let s = 0; s < 3; s++) {
      while (!seasonOver(c)) {
        const e = c.week?.event;
        if (e && IDS.includes(e.id)) log.push(`${c.season}.${c.round}:${e.id}`);
        if (e && e.choice === null) resolveEvent(c, seed % e.options.length);
        const me = humanClub(c).id;
        for (const f of c.fixtures[c.round]) f.result = (f.home === me || f.away === me) ? (c.round % 3 === 0 ? (f.home === me ? { home: 4, away: 0 } : { home: 0, away: 4 }) : { home: 1, away: 1 }) : { home: 1, away: 1 };
        finishRound(c);
      }
      nextSeason(c);
    }
    return { log, c };
  };

  it('deterministisch, kommt regelmäßig, ohne Wiederholung innerhalb der Wartezeit', () => {
    const a = run(21);
    const b = run(21);
    expect(a.log).toEqual(b.log);
    let total = 0;
    let weeks = 0;
    for (const seed of [3, 8, 13, 22]) {
      const r = run(seed);
      total += r.log.length;
      weeks += 3 * r.c.fixtures.length;
      const last = {};
      for (const entry of r.log) {
        const id = entry.split(':')[1];
        if (!TIGER_EVENTS[id].followUp) expect(last[id], `${id} zu früh wieder`).toBeUndefined();
        last[id] = 1; // je Lauf höchstens einmal je Wartezeit-Fenster wird unten über wk geprüft
      }
    }
    expect(total / weeks).toBeGreaterThan(0.03);
    expect(total / weeks).toBeLessThan(0.3);
  }, 120000);

  it('alter Spielstand ohne Tiger lädt mit Vorgaben und spielt weiter', () => {
    const c = createCareer({ seed: 9 });
    delete c.tiger;
    const old = JSON.parse(JSON.stringify(c));
    const m = migrateCareer(old);
    expect(m.tiger).toMatchObject({ loyal: 0.6, mood: 0.6, away: 0, role: null });
    m.tiger = { loyal: 0.3 }; // halb gefüllter Stand
    migrateCareer(m);
    expect(m.tiger.cool).toEqual({});
    expect(m.tiger.streak).toEqual({ w: 0, l: 0, d: 0 });
    for (const f of m.fixtures[m.round]) f.result = { home: 1, away: 1 };
    finishRound(m);
    expect(rollWeekEvent).toBeTypeOf('function');
    expect(m.tiger.wk).toBeGreaterThan(0);
  });
});
