// Phasen-Ereignisse (src/career/phaseevents.js): 14 Entscheidungen für Training und Ehrenamt in Saisonmitte und -ende,
// Schiri in der untersten Liga und das Saisonziel; eine Kette (Jugendleiter).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, seasonOver } from '../src/career/career.js';
import { EVENTS, autoResolve, resolveEvent, rollWeekEvent } from '../src/career/events.js';
import { LOCAL_EVENTS } from '../src/career/localevents.js';
import { SEASON_EVENTS } from '../src/career/seasonevents.js';
import { LEAGUE_EVENTS } from '../src/career/leagueevents.js';
import { SPONSOR_EVENTS } from '../src/career/sponsors.js';
import { CLUBLIFE_EVENTS } from '../src/career/clublife.js';
import { PHASE_EVENTS, phaseChainDue } from '../src/career/phaseevents.js';
import { spielberichtStreng } from '../src/career/spielbericht.js';
import { targetPos } from '../src/career/board.js';
import { createRng } from '../src/core/rng.js';
import { CHAINS, FOLLOW, IDS, LEVEL1, scene } from './phasescenes.js';

const stateOf = (c) => JSON.stringify({ cash: c.cash, mood: c.mood, players: c.players, avail: c.week.availability, flags: c.flags, club: c.clubLife, rel: c.relations, coach: c.coach, goal: c.goal });

function sweep(id, option, n = 40) {
  const def = PHASE_EVENTS[id];
  const texts = new Set();
  let changed = 0;
  for (let k = 0; k < n; k++) {
    const { c, ctx } = scene(id, 1 + k * 7);
    const before = stateOf(c);
    const res = def.options[option].effect(c, ctx, createRng(k * 31 + 5));
    expect(typeof res, `${id}/${option}`).toBe('string');
    expect(res.length, `${id}/${option}`).toBeGreaterThan(8);
    texts.add(res);
    if (stateOf(c) !== before) changed++;
  }
  return { texts, changed };
}

describe('Phasen-Ereignisse: Aufbau', () => {
  it('sind 14, eindeutig benannt, eine Kette', () => {
    expect(IDS).toHaveLength(14);
    for (const reg of [EVENTS, SEASON_EVENTS, LEAGUE_EVENTS, SPONSOR_EVENTS, LOCAL_EVENTS, CLUBLIFE_EVENTS]) for (const id of IDS) expect(reg[id], id).toBeUndefined();
    expect(FOLLOW.sort()).toEqual(Object.values(CHAINS).sort());
  });

  it('Bedingungen: Phase, Stufe, Pokal, Saisonziel', () => {
    const rng = createRng(1);
    const at = (id, o) => scene(id, 1, o).c;
    // Phase
    {
      const c = at('flutlicht_dunkel', { round: 5 });
      c.round = 1;
      expect(PHASE_EVENTS.flutlicht_dunkel.needs(c, rng), 'Flutlicht nicht zum Saisonanfang').toBeNull();
      c.round = 8;
      expect(PHASE_EVENTS.flutlicht_dunkel.needs(c, rng), 'Flutlicht-Training zum Saisonende').toBeTruthy();
    }
    for (const id of ['platz_unter_wasser', 'fitness_app', 'platzwart_krank', 'dorf_schiri']) {
      const m = at(id);
      m.round = 8;
      expect(PHASE_EVENTS[id].needs(m, rng), `${id} nur zur Saisonmitte`).toBeNull();
      m.round = 1;
      expect(PHASE_EVENTS[id].needs(m, rng), `${id} nicht zum Saisonanfang`).toBeNull();
    }
    const kw = at('kassenwart_belege');
    kw.round = 5;
    expect(PHASE_EVENTS.kassenwart_belege.needs(kw, rng), 'Kassenwart-Belege vor der Prüfung am Saisonende').toBeNull();
    const start = at('selbst_pfeifen');
    start.round = 0;
    expect(PHASE_EVENTS.selbst_pfeifen.needs(start, rng), 'nicht in der allerersten Woche').toBeNull();
    const h = at('helfer_abschluss');
    h.round = 5;
    expect(PHASE_EVENTS.helfer_abschluss.needs(h, rng), 'Helfer erst zum Ende').toBeNull();
    const j = at('jugendleiter_ueberlastet');
    j.round = 8;
    expect(PHASE_EVENTS.jugendleiter_ueberlastet.needs(j, rng), 'Jugendleiter braucht Platz für die Folge').toBeNull();
    // Schiri nur in Stufe 1
    for (const id of LEVEL1) {
      const c = at(id);
      expect(PHASE_EVENTS[id].needs(c, rng), id).toBeTruthy();
      c.level = 2;
      expect(PHASE_EVENTS[id].needs(c, rng), `${id} erst recht nicht ab Stufe 2`).toBeNull();
    }
    // Elfmeter nur mit Pokal in Sicht
    const e = at('elfmeter_training');
    e.pokale.kreis.done = true;
    expect(PHASE_EVENTS.elfmeter_training.needs(e, rng)).toBeNull();
    e.pokale.kreis.done = false;
    e.pokale.kreis.rounds = [e.round + 9];
    expect(PHASE_EVENTS.elfmeter_training.needs(e, rng), 'Pokal zu weit weg').toBeNull();
    // Saisonziel: Anfang bzw. Mitte, nur mit Ziel
    const a = at('ziel_nachverhandeln');
    a.round = 5;
    expect(PHASE_EVENTS.ziel_nachverhandeln.needs(a, rng), 'Ziel verhandeln nur am Anfang').toBeNull();
    a.round = 1;
    a.goal = null;
    expect(PHASE_EVENTS.ziel_nachverhandeln.needs(a, rng), 'ohne Ziel (alter Stand)').toBeNull();
    const z = at('ziel_zwischenbilanz');
    z.round = 1;
    expect(PHASE_EVENTS.ziel_zwischenbilanz.needs(z, rng)).toBeNull();
    z.round = 5;
    z.goal = undefined;
    expect(PHASE_EVENTS.ziel_zwischenbilanz.needs(z, rng)).toBeNull();
  });

  it('höchstens einmal je Saison (auch beim automatischen Entscheiden am Spieltag)', () => {
    for (const id of IDS.filter((x) => !FOLLOW.includes(x))) {
      const { c, ctx } = scene(id);
      c.week.event = { id, ctx, text: PHASE_EVENTS[id].text(c, ctx), options: PHASE_EVENTS[id].options.map((o) => (typeof o.label === 'function' ? o.label(c) : o.label)), choice: null, result: null };
      autoResolve(c);
      expect(typeof c.week.event.result, id).toBe('string');
      expect(PHASE_EVENTS[id].needs(c, createRng(2)), id).toBeNull();
      expect(c.flags.lev[id], id).toBe(c.season);
      c.season++;
      expect(c.flags.lev[id], id).not.toBe(c.season);
    }
  });
});

describe('Phasen-Ereignisse: Ausgänge wirken', () => {
  for (const id of IDS)
    it(`${id}: jede Antwort hat mehrere mögliche Ausgänge, und mindestens einer ändert etwas`, () => {
      const n = PHASE_EVENTS[id].options.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
      for (let i = 0; i < n; i++) {
        const { texts, changed } = sweep(id, i);
        expect(texts.size, `${id}/${i} Ausgänge`).toBeGreaterThanOrEqual(2);
        expect(changed, `${id}/${i} Wirkung`).toBeGreaterThan(0);
      }
    });

  it('Zahlen: Kosten wie in den Antworten', () => {
    const deltas = (id, option, n = 40) => {
      const s = new Set();
      for (let k = 0; k < n; k++) {
        const { c, ctx } = scene(id, 1 + k * 3);
        const before = c.cash;
        PHASE_EVENTS[id].options[option].effect(c, ctx, createRng(k * 7 + 1));
        s.add(Math.round(c.cash - before));
      }
      return [...s];
    };
    expect(deltas('platz_unter_wasser', 0).every((d) => d === -30)).toBe(true); // Turnhalle 30 €
    expect(deltas('platzwart_krank', 2).every((d) => d <= -50 && d >= -70)).toBe(true); // Lohnmäher 50 €, evtl. Reparatur 20 €
    expect(deltas('helfer_abschluss', 2).every((d) => d === -90)).toBe(true); // Catering 90 €
    expect(deltas('dorf_schiri', 0).every((d) => d === -10)).toBe(true); // Fahrtkosten 10 €
    expect(deltas('kreis_schiri', 0).every((d) => d === -15)).toBe(true); // Kaffee 15 €
    expect(deltas('jugendleiter_ueberlastet', 2).every((d) => d === -40)).toBe(true); // Aufwandsentschädigung 40 €
  });

  it('Selbst pfeifen: der Pfeifer fehlt im Kader dieser Woche, im Freizeitliga-Modus ohne „später"', () => {
    const { c, ctx } = scene('selbst_pfeifen');
    PHASE_EVENTS.selbst_pfeifen.options[0].effect(c, ctx, createRng(3));
    expect(c.week.availability[ctx.s]).toBe('no');
  });

  it('Saisonziel: Vorstand stuft um, das Ziel bleibt in sich stimmig, am Rand ändert sich nichts', () => {
    const up = scene('ziel_nachverhandeln');
    up.c.goal.type = 'erhalt';
    up.c.goal.target = targetPos(up.c, 'erhalt');
    let moved = 0;
    for (let k = 0; k < 20; k++) {
      const x = scene('ziel_nachverhandeln', 1 + k);
      x.c.goal.type = 'obere';
      x.c.goal.target = targetPos(x.c, 'obere');
      PHASE_EVENTS.ziel_nachverhandeln.options[0].effect(x.c, x.ctx, createRng(k));
      expect(x.c.goal.type).toBe('aufstieg');
      expect(x.c.goal.target).toBe(targetPos(x.c, 'aufstieg'));
      moved++;
      const y = scene('ziel_nachverhandeln', 1 + k);
      y.c.goal.type = 'obere';
      y.c.goal.target = targetPos(y.c, 'obere');
      PHASE_EVENTS.ziel_nachverhandeln.options[1].effect(y.c, y.ctx, createRng(k));
      expect(y.c.goal.type).toBe('erhalt');
      expect(y.c.goal.target).toBe(targetPos(y.c, 'erhalt'));
    }
    expect(moved).toBe(20);
    const top = scene('ziel_nachverhandeln'); // ist 'aufstieg': höher geht nicht
    top.c.goal.type = 'aufstieg';
    top.c.goal.target = 2;
    const res = PHASE_EVENTS.ziel_nachverhandeln.options[0].effect(top.c, top.ctx, createRng(1));
    expect(top.c.goal.type).toBe('aufstieg');
    expect(typeof res).toBe('string');
    const low = scene('ziel_nachverhandeln');
    low.c.goal.type = 'erhalt';
    low.c.goal.target = targetPos(low.c, 'erhalt');
    PHASE_EVENTS.ziel_nachverhandeln.options[1].effect(low.c, low.ctx, createRng(1));
    expect(low.c.goal.type).toBe('erhalt');
  });

  it('Zwischenbilanz: Text und Ziel hängen vom Tabellenplatz ab', () => {
    const states = new Set();
    const texts = new Set();
    for (let k = 0; k < 120 && states.size < 3; k++) {
      const { c, ctx } = scene('ziel_zwischenbilanz', 1 + k * 5);
      c.goal.target = [2, 5, 9][k % 3];
      const ctx2 = PHASE_EVENTS.ziel_zwischenbilanz.needs(c, createRng(1));
      states.add(ctx2.state);
      texts.add(PHASE_EVENTS.ziel_zwischenbilanz.text(c, ctx2));
      expect(['vorn', 'plan', 'hinten']).toContain(ctx.state);
    }
    expect(states.size).toBeGreaterThanOrEqual(2);
    expect(texts.size).toBe(states.size);
    // vorn: Ziel wird angehoben; hinten: gesenkt
    const v = scene('ziel_zwischenbilanz');
    v.c.goal.type = 'obere';
    v.c.goal.target = targetPos(v.c, 'obere');
    PHASE_EVENTS.ziel_zwischenbilanz.options[1].effect(v.c, { pos: 1, state: 'vorn' }, createRng(1));
    expect(v.c.goal.type).toBe('aufstieg');
    const h = scene('ziel_zwischenbilanz');
    h.c.goal.type = 'obere';
    h.c.goal.target = targetPos(h.c, 'obere');
    PHASE_EVENTS.ziel_zwischenbilanz.options[1].effect(h.c, { pos: 9, state: 'hinten' }, createRng(1));
    expect(h.c.goal.type).toBe('erhalt');
  });
});

describe('Phasen-Ereignisse: Kette Jugendleiter', () => {
  it('jede Antwort startet die Folge; sie kommt in der richtigen Woche, nur in dieser Saison, und endet mit der Entscheidung', () => {
    for (let option = 0; option < 3; option++) {
      const { c, ctx } = scene('jugendleiter_ueberlastet', 5);
      PHASE_EVENTS.jugendleiter_ueberlastet.options[option].effect(c, ctx, createRng(2));
      const link = c.flags.chain.jugendleiter_bilanz;
      expect(link, `Kette gesetzt (Antwort ${option})`).toBeTruthy();
      expect(link.due).toBe(c.round + 2);
      expect([-1, 0, 1]).toContain(link.tone);
      const def = PHASE_EVENTS.jugendleiter_bilanz;
      const rng = createRng(1);
      expect(def.needs(c, rng), 'vor dem Termin nichts').toBeNull();
      expect(phaseChainDue(c)).toBe(false);
      c.round = link.due;
      expect(def.needs(c, rng)).toBeTruthy();
      expect(phaseChainDue(c)).toBe(true);
      c.week.event = null;
      const e = rollWeekEvent(c);
      expect(e?.id, 'Folge kommt in der Woche').toBe('jugendleiter_bilanz');
      expect(typeof resolveEvent(c, 0)).toBe('string');
      expect(c.flags.chain.jugendleiter_bilanz, 'Kette beendet').toBeUndefined();
      expect(def.needs(c, rng)).toBeNull();
    }
  });

  it('verfällt mit der Saison und nach der Frist; Text hängt von der Vorgeschichte ab', () => {
    const { c } = scene('jugendleiter_bilanz');
    const rng = createRng(1);
    expect(PHASE_EVENTS.jugendleiter_bilanz.needs(c, rng)).toBeTruthy();
    c.season++;
    expect(PHASE_EVENTS.jugendleiter_bilanz.needs(c, rng)).toBeNull();
    c.season--;
    c.flags.chain.jugendleiter_bilanz.due = c.round - 9;
    expect(PHASE_EVENTS.jugendleiter_bilanz.needs(c, rng)).toBeNull();
    const texts = new Set();
    for (const tone of [1, 0, -1]) {
      const s = scene('jugendleiter_bilanz', 1, { link: { tone } });
      texts.add(PHASE_EVENTS.jugendleiter_bilanz.text(s.c, s.ctx));
    }
    expect(texts.size).toBe(3);
  });
});

describe('Phasen-Ereignisse: Spielbericht und Sperren', () => {
  const lateIds = ['flutlicht_dunkel', 'helfer_abschluss'];

  it('ab Stufe 4 steht nach keiner Antwort jemand auf „später", und kein Text verspricht die zweite Halbzeit', () => {
    let checked = 0;
    for (const level of [4, 5])
      for (const id of IDS.filter((x) => !LEVEL1.includes(x)))
        for (let i = 0; i < PHASE_EVENTS[id].options.length; i++)
          for (let k = 0; k < 14; k++) {
            const { c, ctx } = scene(id, 1 + k * 11, { level });
            expect(spielberichtStreng(c)).toBe(true);
            const res = PHASE_EVENTS[id].options[i].effect(c, ctx, createRng(k * 17 + i));
            expect(Object.values(c.week.availability), `${id}/${i}`).not.toContain('late');
            if (lateIds.includes(id)) expect(res, `${id}/${i}`).not.toMatch(/zweiten Halbzeit|second half/);
            checked++;
          }
    expect(checked).toBeGreaterThan(400);
  }, 120000);

  it('in Stufe 1–3 gibt es das „kommt später" noch – mit dem passenden Text', () => {
    const seen = {};
    for (const id of lateIds)
      for (let i = 0; i < PHASE_EVENTS[id].options.length; i++)
        for (let k = 0; k < 60; k++) {
          const { c, ctx } = scene(id, 1 + k * 5, { level: 2 });
          const res = PHASE_EVENTS[id].options[i].effect(c, ctx, createRng(k * 3 + i));
          if (Object.values(c.week.availability).includes('late')) {
            seen[id] = true;
            expect(res).toMatch(/zweiten Halbzeit/);
          }
        }
    expect(Object.keys(seen).sort()).toEqual([...lateIds].sort());
  });

  it('Gesperrte werden nie gezogen: Verfügbarkeit, Verletzung, Laune und Sperre bleiben unberührt', () => {
    let runs = 0;
    for (const id of IDS)
      for (let i = 0; i < PHASE_EVENTS[id].options.length; i++)
        for (let k = 0; k < 10; k++) {
          const level = LEVEL1.includes(id) ? 1 : 2;
          const { c, ctx } = scene(id, 1 + k * 13, { level });
          const squad = humanClub(c).squad.filter((x) => x !== c.coach?.idx);
          const banned = squad.slice(0, squad.length - 4).filter((x) => x !== ctx.s);
          for (const b of banned) c.players[b].ban = { games: 2, reason: 'serious' };
          const touched = (b) => JSON.stringify([c.players[b].injuryWeeks, c.players[b].grumpy, c.players[b].awayWeeks, c.players[b].ban, c.week.availability[b]]); // Teamweite Form (team()) trifft alle, gezogen wird er nie
          const snap = banned.map(touched);
          PHASE_EVENTS[id].options[i].effect(c, ctx, createRng(k * 5 + i));
          banned.forEach((b, n) => expect(touched(b), `${id}/${i}: Gesperrter berührt`).toBe(snap[n]));
          runs++;
        }
    expect(runs).toBeGreaterThan(300);
  }, 120000);

  it('Kontext-Spieler (ctx.s) ist nie gesperrt und nie verletzt', () => {
    for (const id of ['fitness_app', 'selbst_pfeifen']) {
      const seen = new Set();
      for (let k = 0; k < 30; k++) {
        const c = scene(id, 1 + k * 17).c;
        const squad = humanClub(c).squad.filter((x) => x !== c.coach?.idx);
        for (const b of squad.slice(0, 5)) c.players[b].ban = { games: 1, reason: 'serious' };
        for (const b of squad.slice(5, 8)) c.players[b].injuryWeeks = 2;
        const ctx = PHASE_EVENTS[id].needs(c, createRng(k));
        if (!ctx) continue;
        seen.add(ctx.s);
        expect(c.players[ctx.s].ban?.games ?? 0, id).toBe(0);
        expect(c.players[ctx.s].injuryWeeks ?? 0, id).toBe(0);
      }
      expect(seen.size, id).toBeGreaterThan(1);
    }
  });
});

describe('Phasen-Ereignisse: im Wochenlauf', () => {
  it('kommen in den dünnen Phasen vor, die Kette folgt, kein Fehler, nicht auf Kosten einer Phase', () => {
    const counts = {};
    const byPhase = { 0: 0, 1: 0, 2: 0 };
    let weeks = 0;
    let started = 0;
    let followed = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const c = createCareer({ seed: seed * 71 + 5 });
      c.level = 1 + (seed % 3);
      for (let s = 0; s < 3; s++) {
        while (!seasonOver(c)) {
          weeks++;
          const e = c.week?.event;
          if (e && PHASE_EVENTS[e.id]) {
            counts[e.id] = (counts[e.id] ?? 0) + 1;
            byPhase[Math.min(2, Math.floor((c.round / c.fixtures.length) * 3))]++;
            if (e.id === 'jugendleiter_ueberlastet') started++;
            if (e.id === 'jugendleiter_bilanz') followed++;
          }
          if (e && e.choice === null) expect(typeof resolveEvent(c, seed % e.options.length)).toBe('string');
          for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
          finishRound(c);
        }
        nextSeason(c);
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total / weeks).toBeGreaterThan(0.02);
    expect(total / weeks).toBeLessThan(0.2);
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(7);
    expect(byPhase[1] + byPhase[2]).toBeGreaterThan(byPhase[0]);
    if (started >= 4) expect(followed).toBeGreaterThanOrEqual(Math.floor(started * 0.5));
  }, 240000);
});

describe('Alte Spielstände', () => {
  it('ein gespeicherter Stand ohne die neuen Felder lädt und spielt weiter, auch durchs Saisonende', () => {
    const raw = JSON.parse(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8'));
    expect(raw.flags.chain?.jugendleiter_bilanz).toBeUndefined();
    const c = migrateCareer(raw);
    let weeks = 0;
    let guard = 0;
    while (guard++ < 40) {
      if (seasonOver(c)) {
        nextSeason(c);
        if (c.season >= 4) break;
      }
      const e = c.week?.event;
      if (e && e.choice === null) expect(typeof resolveEvent(c, 0)).toBe('string');
      for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
      finishRound(c);
      weeks++;
    }
    expect(weeks).toBeGreaterThanOrEqual(25);
    // Auch ohne Saisonziel (sehr alter Stand) laufen die Bedingungen ohne Fehler durch
    const old = migrateCareer(JSON.parse(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8')));
    delete old.goal;
    for (const ev of Object.values(PHASE_EVENTS)) expect(() => ev.needs(old, createRng(1))).not.toThrow();
  }, 120000);
});
