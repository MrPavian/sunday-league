// Lokale Ereignisse (src/career/localevents.js): 20 neue Entscheidungen für die dünnen Stellen, davon fünf Ketten.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCareer, finishRound, humanClub, migrateCareer, nextSeason, playerOf, seasonOver } from '../src/career/career.js';
import { EVENTS, resolveEvent, rollWeekEvent } from '../src/career/events.js';
import { LOCAL_EVENTS, chainDue } from '../src/career/localevents.js';
import { SEASON_EVENTS } from '../src/career/seasonevents.js';
import { LEAGUE_EVENTS } from '../src/career/leagueevents.js';
import { SPONSOR_EVENTS } from '../src/career/sponsors.js';
import { createRng } from '../src/core/rng.js';
import { spielberichtStreng } from '../src/career/spielbericht.js';
import { CHAINS, FOLLOW, IDS, awayRound, scene } from './localscenes.js';

const stateOf = (c) => JSON.stringify({ cash: c.cash, mood: c.mood, players: c.players, avail: c.week.availability, flags: c.flags, club: c.clubLife, rel: c.relations, coach: c.coach, squad: humanClub(c).squad });

// Spielt eine Option mit vielen Zufallsströmen durch.
function sweep(id, option, n = 40, opts = {}) {
  const def = LOCAL_EVENTS[id];
  const texts = new Set();
  let changed = 0;
  for (let k = 0; k < n; k++) {
    const { c, ctx } = scene(id, 1 + k * 7, opts);
    const before = stateOf(c);
    const res = def.options[option].effect(c, ctx, createRng(k * 31 + 5));
    expect(typeof res, `${id}/${option}`).toBe('string');
    expect(res.length, `${id}/${option}`).toBeGreaterThan(8);
    texts.add(res);
    if (stateOf(c) !== before) changed++;
  }
  return { texts, changed };
}

describe('Lokale Ereignisse: Aufbau', () => {
  it('sind 20 und stehen in keinem anderen Ereignis-Verzeichnis', () => {
    expect(IDS).toHaveLength(20);
    for (const reg of [EVENTS, SEASON_EVENTS, LEAGUE_EVENTS, SPONSOR_EVENTS]) for (const id of IDS) expect(reg[id], id).toBeUndefined();
    expect(FOLLOW.sort()).toEqual(Object.values(CHAINS).sort());
  });

  it('unter ihren Bedingungen kommen sie nicht vor', () => {
    const rng = createRng(1);
    const c = createCareer({ seed: 4 });
    c.round = 3;
    c.week.weather = { id: 'sonne' };
    expect(LOCAL_EVENTS.sturmwarnung.needs(c, rng), 'sturm braucht Wind').toBeNull();
    expect(LOCAL_EVENTS.schneeschippen.needs(c, rng), 'schnee braucht Schnee oder Frost').toBeNull();
    c.week.weather = { id: 'frost' };
    expect(LOCAL_EVENTS.waldlauf.needs(c, rng), 'Waldlauf nicht bei Frost').toBeNull();
    expect(LOCAL_EVENTS.kunstrasen_petition.needs(c, rng), 'Kunstrasen erst ab Liga 2').toBeNull();
    expect(LOCAL_EVENTS.schiri_neuling.needs(c, rng), 'Schiri-Neuling erst ab Liga 2').toBeNull();
    c.round = 9; // zu spät im Jahr für eine Kette
    for (const id of Object.keys(CHAINS)) expect(LOCAL_EVENTS[id].needs(c, rng), id).toBeNull();
    c.round = 3; // Heimspiel oder Auswärtsspiel
    const home = c.fixtures.findIndex((rd, i) => i >= 1 && rd.some((f) => f.home === humanClub(c).id));
    c.round = home;
    expect(LOCAL_EVENTS.fahrgemeinschaft_bruch.needs(c, rng), 'Fahrgemeinschaft nur auswärts').toBeNull();
    c.round = awayRound(c);
    expect(LOCAL_EVENTS.fahrgemeinschaft_bruch.needs(c, rng)).toBeTruthy();
  });

  it('jedes Ereignis kommt höchstens einmal je Saison dran (auch beim automatischen Entscheiden)', () => {
    for (const id of IDS.filter((x) => !FOLLOW.includes(x))) {
      const { c, ctx } = scene(id);
      c.week.event = { id, ctx, text: LOCAL_EVENTS[id].text(c, ctx), options: LOCAL_EVENTS[id].options.map((o) => o.label), choice: null, result: null };
      expect(typeof resolveEvent(c, LOCAL_EVENTS[id].options.length - 1), id).toBe('string');
      expect(LOCAL_EVENTS[id].needs(c, createRng(2)), id).toBeNull();
      expect(c.flags.lev[id], id).toBe(c.season);
      c.season++; // nächste Saison: der Merker gilt nicht mehr
      expect(c.flags.lev[id], id).not.toBe(c.season);
    }
  });
});

describe('Lokale Ereignisse: Ausgänge wirken', () => {
  for (const id of IDS)
    it(`${id}: jede Antwort hat mehrere mögliche Ausgänge, und mindestens einer ändert etwas`, () => {
      const n = LOCAL_EVENTS[id].options.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
      for (let i = 0; i < n; i++) {
        const { texts, changed } = sweep(id, i);
        expect(texts.size, `${id}/${i} Ausgänge`).toBeGreaterThanOrEqual(2);
        expect(changed, `${id}/${i} Wirkung`).toBeGreaterThan(0);
      }
    });

  it('Zahlen: Aufschläge und Kosten wie in den Texten', () => {
    const deltas = (id, option, n = 40) => {
      const s = new Set();
      for (let k = 0; k < n; k++) {
        const { c, ctx } = scene(id, 1 + k * 3);
        const before = c.cash;
        LOCAL_EVENTS[id].options[option].effect(c, ctx, createRng(k * 7 + 1));
        s.add(Math.round(c.cash - before));
      }
      return [...s];
    };
    expect(deltas('fanclub_gruendung', 0).every((d) => d === -40)).toBe(true); // Schals 40 €
    expect(deltas('platzwart_ruhestand', 0).every((d) => d === -40)).toBe(true); // Festakt 40 €
    expect(deltas('wirt_kuendigt', 0).every((d) => d === -60)).toBe(true); // Pacht 60 €
    expect(deltas('schiri_neuling', 2).every((d) => d === -30)).toBe(true); // Strafe 30 €
    expect(deltas('sturmwarnung', 2).every((d) => d === -30 || d === 10)).toBe(true); // sichern 30 €, evtl. 40 € Glühwein
  });

  it('Leihe: drei Wochen weg, Rückkehr nach drei Wochen', () => {
    const { c, ctx } = scene('leihanfrage');
    c.week.availability[ctx.s] = 'yes';
    LOCAL_EVENTS.leihanfrage.options[0].effect(c, ctx, createRng(3));
    expect(c.week.availability[ctx.s]).toBe('no');
    expect(c.players[ctx.s].awayWeeks).toBe(3);
    expect(c.flags.chain.leihe_rueckkehr.due).toBe(c.round + 3);
  });

  it('Fanclub: Förderverein wächst, Fanbus wartet; Absage setzt keine Kette', () => {
    const a = scene('fanclub_gruendung');
    const s0 = a.c.clubLife?.supporters ?? 0;
    LOCAL_EVENTS.fanclub_gruendung.options[0].effect(a.c, a.ctx, createRng(1));
    expect(a.c.clubLife.supporters).toBeGreaterThan(s0);
    expect(a.c.flags.chain.fanclub_bus).toBeTruthy();
    expect(a.c.flags.fanclub).toBeTruthy();
    const b = scene('fanclub_gruendung');
    LOCAL_EVENTS.fanclub_gruendung.options[2].effect(b.c, b.ctx, createRng(1));
    expect(b.c.flags.chain?.fanclub_bus).toBeUndefined();
    expect(b.c.flags.fanclub).toBeUndefined();
  });
});

describe('Lokale Ereignisse: Ketten', () => {
  for (const [start, next] of Object.entries(CHAINS))
    it(`${start} → ${next}: Folge fällig in der richtigen Woche, nur in dieser Saison, endet mit der Entscheidung`, () => {
      const first = LOCAL_EVENTS[start];
      const { c, ctx } = scene(start, 5, { level: 3 });
      first.options[0].effect(c, ctx, createRng(2));
      const link = c.flags.chain[next];
      expect(link, 'Kette gesetzt').toBeTruthy();
      expect(link.due).toBeGreaterThan(c.round);
      const def = LOCAL_EVENTS[next];
      const rng = createRng(1);
      // Vor dem Termin: nichts. Zum Termin (Fanbus: auf einer Auswärtsrunde) und danach bis zum Ende der Frist: da.
      expect(def.needs(c, rng)).toBeNull();
      for (let r = link.due; r <= link.due + 4; r++) {
        c.round = next === 'fanclub_bus' ? awayRound(c) : r;
        if (next === 'fanclub_bus') link.due = c.round;
        if (!def.needs(c, rng)) continue;
        expect(chainDue(c)).toBe(true);
        c.week.event = null;
        const e = rollWeekEvent(c);
        expect(e?.id, `${next} kommt in der Woche`).toBe(next);
        const res = resolveEvent(c, 0);
        expect(typeof res).toBe('string');
        expect(c.flags.chain[next], 'Kette beendet').toBeUndefined();
        expect(def.needs(c, rng)).toBeNull();
        return;
      }
      throw new Error('Folge-Ereignis wurde nie fällig');
    });

  it('Folge-Ereignisse verfallen mit der Saison und nach der Frist', () => {
    for (const next of FOLLOW) {
      const { c } = scene(next);
      const rng = createRng(1);
      expect(LOCAL_EVENTS[next].needs(c, rng), next).toBeTruthy();
      c.season++;
      expect(LOCAL_EVENTS[next].needs(c, rng), next + ' nächste Saison').toBeNull();
      c.season--;
      c.flags.chain[next].due = c.round - 9;
      expect(LOCAL_EVENTS[next].needs(c, rng), next + ' Frist abgelaufen').toBeNull();
    }
  });

  it('Reportage und Wirt: Text und Ausgang hängen von der Vorgeschichte ab', () => {
    const tones = new Set();
    for (const tone of [1, 0, -1]) {
      const { c, ctx } = scene('reportage_erscheint', 1, { link: { tone } });
      tones.add(LOCAL_EVENTS.reportage_erscheint.text(c, ctx));
    }
    expect(tones.size).toBe(3);
    const hows = new Set();
    for (const how of ['bleibt', 'selbst', 'neu']) {
      const { c, ctx } = scene('wirt_neu', 1, { link: { how } });
      hows.add(LOCAL_EVENTS.wirt_neu.text(c, ctx));
    }
    expect(hows.size).toBe(3);
  });

  it('Leihe: ist der Spieler inzwischen weg, kommt die Rückkehr nicht', () => {
    const { c } = scene('leihe_rueckkehr');
    const club = humanClub(c);
    club.squad = club.squad.filter((i) => i !== c.flags.chain.leihe_rueckkehr.s);
    expect(LOCAL_EVENTS.leihe_rueckkehr.needs(c, createRng(1))).toBeNull();
  });
});

describe('Lokale Ereignisse: Spielbericht (ab Stufe 4 kein „kommt später")', () => {
  const lateIds = ['sturmwarnung', 'spieler_vater', 'fahrgemeinschaft_bruch'];

  it('ab Stufe 4 steht nach keiner Antwort jemand auf „später", und kein Text verspricht die zweite Halbzeit', () => {
    let checked = 0;
    for (const level of [4, 5])
      for (const id of IDS) {
        for (let i = 0; i < LOCAL_EVENTS[id].options.length; i++)
          for (let k = 0; k < 16; k++) {
            const { c, ctx } = scene(id, 1 + k * 11, { level });
            expect(spielberichtStreng(c)).toBe(true);
            const res = LOCAL_EVENTS[id].options[i].effect(c, ctx, createRng(k * 17 + i));
            expect(Object.values(c.week.availability), `${id}/${i}`).not.toContain('late');
            if (lateIds.includes(id)) expect(res, `${id}/${i}`).not.toMatch(/zweiten Halbzeit|second half/);
            checked++;
          }
      }
    expect(checked).toBeGreaterThan(900);
  }, 120000);

  it('darunter gibt es das „kommt später" noch – und den passenden Text', () => {
    const seen = {};
    for (const id of lateIds)
      for (let i = 0; i < LOCAL_EVENTS[id].options.length; i++)
        for (let k = 0; k < 40; k++) {
          const { c, ctx } = scene(id, 1 + k * 5, { level: 2 });
          const res = LOCAL_EVENTS[id].options[i].effect(c, ctx, createRng(k * 3 + i));
          if (Object.values(c.week.availability).includes('late')) {
            seen[id] = true;
            expect(res).toMatch(/zweiten Halbzeit/);
          }
        }
    expect(Object.keys(seen).sort()).toEqual([...lateIds].sort());
  });
});

describe('Lokale Ereignisse: im Wochenlauf', () => {
  // Echte Saisonläufe mit festen Ergebnissen: Wie oft kommen die neuen Ereignisse, und folgen die Ketten?
  const run = () => {
    const counts = {};
    const started = {};
    let weeks = 0;
    for (let seed = 1; seed <= 14; seed++) {
      const c = createCareer({ seed: seed * 53 + 7 });
      c.level = 1 + (seed % 4);
      for (let s = 0; s < 3; s++) {
        while (!seasonOver(c)) {
          weeks++;
          const e = c.week?.event;
          if (e && LOCAL_EVENTS[e.id]) counts[e.id] = (counts[e.id] ?? 0) + 1;
          if (e && CHAINS[e.id]) started[e.id] = (started[e.id] ?? 0) + 1;
          if (e && e.choice === null) resolveEvent(c, seed % e.options.length);
          for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
          finishRound(c);
        }
        nextSeason(c);
      }
    }
    return { counts, started, weeks };
  };

  it('im Schnitt kommen sie vor, Folge-Ereignisse folgen ihren Starts, kein Fehler', () => {
    const { counts, started, weeks } = run();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(weeks).toBeGreaterThan(400);
    expect(total / weeks).toBeGreaterThan(0.05); // gemessen: siehe ROADMAP 11.5
    expect(total / weeks).toBeLessThan(0.3);
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(12);
    for (const [start, next] of Object.entries(CHAINS)) if (next !== 'fanclub_bus' && started[start] >= 4) expect(counts[next] ?? 0, `${start} → ${next}`).toBeGreaterThanOrEqual(Math.floor(started[start] * 0.5));
  }, 180000);
});

describe('Alte Spielstände', () => {
  it('ein gespeicherter Stand ohne die neuen Felder (lev, chain) lädt und spielt weiter, auch durchs Saisonende', () => {
    const raw = JSON.parse(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8'));
    expect(raw.flags.lev).toBeUndefined();
    expect(raw.flags.chain).toBeUndefined();
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
    expect(playerOf(c, humanClub(c).squad[0]).name).toBeTruthy();
  }, 120000);
});
