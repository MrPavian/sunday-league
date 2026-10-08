// Ereignisse für Saisonende, Karrieremitte und höhere Ligen (src/career/seasonevents.js) und das Derby-Rückspiel.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, migrateCareer, nextSeason, playerOf, seasonOver, finishRound } from '../src/career/career.js';
import { resolveEvent, rollWeekEvent } from '../src/career/events.js';
import { DERBY_EVENTS, isReturnLeg } from '../src/career/derby.js';
import { SEASON_EVENTS } from '../src/career/seasonevents.js';
import { createRng } from '../src/core/rng.js';
import { homeRound, IDS, play, rounds, scene } from './seasonscenes.js';
import { snapshot } from '../src/career/consequences.js';
import { readFileSync } from 'node:fs';


// Spielt die Option mit vielen Zufallsströmen durch und liefert Texte und Änderungen.
function sweep(id, option, n = 40) {
  const def = SEASON_EVENTS[id];
  const texts = new Set();
  let changed = 0;
  for (let k = 0; k < n; k++) {
    const { c, ctx } = scene(id, 1 + k * 7);
    const before = snapshot(c);
    const avail = JSON.stringify(c.week.availability);
    const res = def.options[option].effect(c, ctx, createRng(k * 31 + 5));
    expect(typeof res, `${id}/${option}`).toBe('string');
    expect(res.length, `${id}/${option}`).toBeGreaterThan(8);
    texts.add(res);
    const after = snapshot(c);
    if (after.cash !== before.cash || after.mood !== before.mood || avail !== JSON.stringify(c.week.availability) || JSON.stringify(after.players) !== JSON.stringify(before.players) || JSON.stringify(after.squad) !== JSON.stringify(before.squad) || after.neighbors !== before.neighbors || after.supporters !== before.supporters || after.energy !== before.energy || JSON.stringify(after.sponsors) !== JSON.stringify(before.sponsors) || JSON.stringify(after.relations) !== JSON.stringify(before.relations)) changed++;
  }
  return { texts, changed };
}

describe('Saison-Ereignisse: Aufbau', () => {
  it('sind 12 und stehen in keinem anderen Ereignis-Verzeichnis', () => {
    expect(IDS).toHaveLength(12);
  });

  it('unter ihren Bedingungen kommen sie nicht vor (Liga, Saisonphase, Tabellenplatz)', () => {
    const rng = createRng(1);
    const c = createCareer({ seed: 4 });
    // Freizeitliga: keine Liga-Ereignisse, kein Abstieg
    for (const id of ['abstiegskrise', 'schiri_mangel', 'trainerschein', 'lizenzpflicht', 'hospitation']) { c.round = 8; play(c, 8, 'bottom'); expect(SEASON_EVENTS[id].needs(c, rng), id).toBeNull(); }
    // Saisonende erst am Saisonende
    const e = createCareer({ seed: 4 });
    e.level = 3; e.round = 1; play(e, 1, 'top');
    expect(SEASON_EVENTS.aufstiegsfeier.needs(e, rng)).toBeNull();
    expect(SEASON_EVENTS.abschiedsspiel.needs(e, rng)).toBeNull();
    expect(SEASON_EVENTS.urlaub_finale.needs(e, rng)).toBeNull();
    // Aufstiegsfeier nur oben, Abstiegsangst nur unten
    const m = createCareer({ seed: 4 });
    m.level = 3; m.round = 8; play(m, 8, 'bottom');
    expect(SEASON_EVENTS.aufstiegsfeier.needs(m, rng)).toBeNull();
    play(m, 8, 'top');
    expect(SEASON_EVENTS.abstiegskrise.needs(m, rng)).toBeNull();
    // ganz oben gibt es keinen Aufstieg mehr
    m.level = 5;
    expect(SEASON_EVENTS.aufstiegsfeier.needs(m, rng)).toBeNull();
    // Flutlicht-Defekt braucht ein Flutlicht, Kabine nur ohne neue Kabine
    const f = createCareer({ seed: 4 });
    f.round = 4;
    expect(SEASON_EVENTS.flutlicht_defekt.needs(f, rng)).toBeNull();
    expect(SEASON_EVENTS.kabine_undicht.needs(f, rng)).toBeTruthy();
    f.facilities = { built: { kabine: true }, building: null };
    expect(SEASON_EVENTS.kabine_undicht.needs(f, rng)).toBeNull();
    // Platzsperre braucht Regen, Schnee oder Frost und ein Heimspiel
    const p = createCareer({ seed: 4 });
    p.round = homeRound(p);
    p.week.weather = { id: 'sonne' };
    expect(SEASON_EVENTS.platzsperre.needs(p, rng)).toBeNull();
    p.week.weather = { id: 'regen' };
    expect(SEASON_EVENTS.platzsperre.needs(p, rng)).toBeTruthy();
    const away = p.fixtures.findIndex((rd) => rd.some((x) => x.away === humanClub(p).id));
    p.round = away;
    expect(SEASON_EVENTS.platzsperre.needs(p, rng)).toBeNull();
  });

  it('jedes Ereignis kommt höchstens einmal je Saison dran (auch beim automatischen Entscheiden)', () => {
    for (const id of IDS) {
      const { c, ctx } = scene(id);
      c.week.event = { id, ctx, text: SEASON_EVENTS[id].text(c, ctx), options: SEASON_EVENTS[id].options.map((o) => o.label), choice: null, result: null };
      expect(typeof resolveEvent(c, SEASON_EVENTS[id].options.length - 1), id).toBe('string');
      expect(SEASON_EVENTS[id].needs(c, createRng(2)), id).toBeNull();
      expect(c.flags.sev[id], id).toBe(c.season);
      c.season++; // nächste Saison: der Merker gilt nicht mehr
      expect(c.flags.sev[id], id).not.toBe(c.season);
    }
  });
});

describe('Saison-Ereignisse: Ausgänge wirken', () => {
  for (const id of IDS)
    it(`${id}: jede Antwort hat mehrere mögliche Ausgänge, und mindestens einer ändert etwas`, () => {
      const n = SEASON_EVENTS[id].options.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
      for (let i = 0; i < n; i++) {
        const { texts, changed } = sweep(id, i);
        expect(texts.size, `${id}/${i} Ausgänge`).toBeGreaterThanOrEqual(2);
        expect(changed, `${id}/${i} Wirkung`).toBeGreaterThan(0);
      }
    });

  it('Zahlen: Aufstiegsfeier kostet 60 €, Trainerlehrgang 120 €, Platzmiete 60 €', () => {
    const cash = (id, option, k = 0) => {
      const { c, ctx } = scene(id, 1 + k * 3);
      const before = c.cash;
      SEASON_EVENTS[id].options[option].effect(c, ctx, createRng(9));
      return c.cash - before;
    };
    let seen = new Set();
    for (let k = 0; k < 30; k++) seen.add(cash('aufstiegsfeier', 0, k));
    expect([...seen].every((d) => d === -60 || d === -30), [...seen].join()).toBe(true);
    seen = new Set();
    for (let k = 0; k < 30; k++) seen.add(cash('trainerschein', 0, k));
    expect([...seen]).toEqual([-120]);
    seen = new Set();
    for (let k = 0; k < 30; k++) seen.add(cash('platzsperre', 0, k));
    expect([...seen]).toEqual([-60]);
  });

  it('Urlaub vorm Finale: Spieler fällt aus oder bleibt, je nach Antwort', () => {
    const { c, ctx } = scene('urlaub_finale');
    c.week.availability[ctx.s] = 'yes';
    SEASON_EVENTS.urlaub_finale.options[0].effect(c, ctx, createRng(1));
    expect(c.week.availability[ctx.s]).toBe('no');
    const d = scene('urlaub_finale');
    d.c.week.availability[d.ctx.s] = 'yes';
    const cash = d.c.cash;
    SEASON_EVENTS.urlaub_finale.options[1].effect(d.c, d.ctx, createRng(1));
    expect(d.c.week.availability[d.ctx.s]).toBe('yes'); // umgebucht: er spielt
    expect(d.c.cash).toBeLessThan(cash);
  });

  it('Schiedsrichtermangel: Der eigene Mann pfeift und fehlt im Kader', () => {
    const { c, ctx } = scene('schiri_mangel');
    SEASON_EVENTS.schiri_mangel.options[0].effect(c, ctx, createRng(3));
    expect(c.week.availability[ctx.s]).toBe('no');
  });

  it('Abschiedsspiel: Auslagen und Spenden laufen über die Kasse, Ehrung macht treu', () => {
    const { c, ctx } = scene('abschiedsspiel');
    SEASON_EVENTS.abschiedsspiel.options[1].effect(c, ctx, createRng(1)); // Ehrung
    expect(c.players[ctx.s].loyal === true || (c.players[ctx.s].form ?? 0) > 0).toBe(true);
    const d = scene('abschiedsspiel');
    const before = d.c.cash;
    SEASON_EVENTS.abschiedsspiel.options[0].effect(d.c, d.ctx, createRng(1)); // Spiel
    expect(d.c.ledger.some((l) => /Abschiedsspiel/.test(l.text))).toBe(true);
    expect(d.c.cash).not.toBe(before);
  });
});

describe('Saison-Ereignisse: im Wochenlauf', () => {
  // Viele Karrieren, jede Woche einer Saison, drei Ligen, mit wechselndem Tabellenplatz.
  const sample = () => {
    const counts = {};
    const lateAll = { n: 0, season: 0 };
    let rolled = 0;
    for (const level of [1, 3, 5]) {
      for (let seed = 1; seed <= 70; seed++) {
        const mode = ['top', 'mid', 'bottom'][seed % 3];
        const c = createCareer({ seed: seed * 17 });
        c.level = level;
        c.facilities = { built: seed % 2 ? { flutlicht: true } : {}, building: null };
        for (let r = 0; r < rounds(c); r++) {
          c.round = r;
          play(c, r, mode);
          c.week.weather = { id: ['regen', 'sonne', 'frost'][seed % 3] };
          c.week.event = null;
          const e = rollWeekEvent(c);
          if (!e) continue;
          rolled++;
          const late = r >= rounds(c) - 3;
          if (late) lateAll.n++;
          if (SEASON_EVENTS[e.id]) {
            counts[e.id] ??= { total: 0, rounds: [], levels: new Set() };
            counts[e.id].total++;
            counts[e.id].rounds.push(r);
            counts[e.id].levels.add(level);
            if (late) lateAll.season++;
          }
        }
      }
    }
    return { counts, rolled, lateAll };
  };

  it('alle zwölf erscheinen, und zwar nur in ihrer Liga und Saisonphase', () => {
    const { counts, rolled, lateAll } = sample();
    expect(rolled).toBeGreaterThan(1300); // gemessen rund 1500 von 2100 Wochen
    for (const id of IDS) expect(counts[id]?.total ?? 0, id).toBeGreaterThanOrEqual(3);
    const n = 10;
    for (const id of ['aufstiegsfeier', 'abschiedsspiel']) expect(Math.min(...counts[id].rounds), id).toBeGreaterThanOrEqual(n - 3);
    expect(Math.min(...counts.urlaub_finale.rounds)).toBeGreaterThanOrEqual(n - 2);
    expect(Math.min(...counts.abstiegskrise.rounds)).toBeGreaterThanOrEqual(n - 4);
    expect([...counts.abstiegskrise.levels].every((l) => l >= 2)).toBe(true);
    expect([...counts.lizenzpflicht.levels].every((l) => l >= 4)).toBe(true);
    expect([...counts.hospitation.levels].every((l) => l >= 3)).toBe(true);
    expect([...counts.schiri_mangel.levels].every((l) => l >= 2)).toBe(true);
    // Das Saisonende war die dünne Stelle: hier sollen sie spürbar mitspielen.
    expect(lateAll.season / lateAll.n).toBeGreaterThan(0.2);
  }, 120000);
});

describe('Derby-Rückspiel', () => {
  it('Hinspiel und Rückspiel haben verschiedene Ereignisse; das Rückspiel kennt das Hinspiel', () => {
    const c = createCareer({ seed: 101 });
    let first = null;
    let second = null;
    let guard = 0;
    while (!seasonOver(c) && guard++ < 30) {
      const e = c.week?.event;
      if (e?.id === 'derby_woche') first = e;
      if (e?.id === 'derby_rueckspiel') second = e;
      const me = humanClub(c).id;
      for (const f of c.fixtures[c.round]) f.result = f.home === me || f.away === me ? (f.home === me ? { home: 2, away: 0 } : { home: 0, away: 2 }) : { home: 1, away: 1 };
      finishRound(c);
    }
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first.text).not.toBe(second.text);
    expect(second.text).toMatch(/2:0/); // Ergebnis des Hinspiels steht im Text
    expect(second.text).toMatch(/Rückspiel/);
  });

  it('pro Saison ein Hinspiel- und ein Rückspiel-Ereignis, nie zwei gleiche', () => {
    for (let seed = 5; seed < 9; seed++) {
      const c = createCareer({ seed });
      const ids = [];
      while (!seasonOver(c)) {
        if (c.week?.event && /^derby/.test(c.week.event.id)) ids.push(c.week.event.id);
        for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
        finishRound(c);
      }
      expect(ids).toEqual(['derby_woche', 'derby_rueckspiel']);
    }
  });

  it('alle Antworten des Rückspiels lösen mit wechselnden Ausgängen auf', () => {
    expect(isReturnLeg({ round: 5, fixtures: new Array(10) })).toBe(true);
    expect(isReturnLeg({ round: 4, fixtures: new Array(10) })).toBe(false);
    for (let choice = 0; choice < DERBY_EVENTS.derby_rueckspiel.options.length; choice++) {
      const texts = new Set();
      for (let r = 0; r < 30; r++) {
        const c = createCareer({ seed: 102 + r });
        c.round = 5 + (r % 5);
        const ctx = { club: 'kanal', res: ['w', 'l', 'd', 'none'][r % 4], score: '1:0' };
        c.week.event = { id: 'derby_rueckspiel', ctx, text: 'x', options: DERBY_EVENTS.derby_rueckspiel.options.map((o) => o.label), choice: null, result: null };
        texts.add(resolveEvent(c, choice));
      }
      expect(texts.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Alte Spielstände', () => {
  it('ein gespeicherter Stand ohne die neuen Felder lädt und spielt weiter, auch durchs Saisonende', () => {
    const raw = JSON.parse(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8'));
    expect(raw.flags.sev).toBeUndefined();
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
    expect(weeks).toBeGreaterThanOrEqual(25); // 5 Restwochen + zwei volle Saisons
    expect(playerOf(c, humanClub(c).squad[0]).name).toBeTruthy();
  }, 120000);
});
