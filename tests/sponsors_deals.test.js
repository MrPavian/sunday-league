// Sponsoring-Ausbau: Sperrliste verjährt, Laufzeiten 1–3 Saisons, Ablehnen/Kündigen, Wünsche mit Wirkung,
// Branche für alle 60, neue Gespräche, alte Spielstände, Anzeige im Spiel (Bande/Arena).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCareer, migrateCareer, nextSeason, humanClub } from '../src/career/career.js';
import { createRng } from '../src/core/rng.js';
import { resolveEvent } from '../src/career/events.js';
import {
  acceptSponsor, arenaName, arenaOf, BAN_SEASONS, banSponsor, bandeSponsor, cancelCost, cancelSponsor, closeSponsors, declineOffer, fulfillWish, liveBans, makeOffers, paySponsors,
  SPONSOR_EVENTS, SPONSORS, sponsorResult, TERM_MUL, termChance, termWeekly, termWilling, venueExtras,
} from '../src/career/sponsors.js';
import { BRANCHEN, BRANCHE_WISHES, newWish, WISHES, wishCost } from '../src/career/sponsorwish.js';
import { bandBoards } from '../src/render/venues/lawn.js';
import { slotsFor } from '../src/career/sponsors.js';

const fake = { pick: (a) => a[0], int: (a) => a, chance: () => true, next: () => 0.5, range: (a) => a };
const fresh = (seed = 5) => createCareer({ seed });
const signAll = (c) => { for (let i = c.offers.length - 1; i >= 0; i--) acceptSponsor(c, i); };

describe('Sperrliste verjährt (Fehler: Pool schrumpfte über lange Karrieren)', () => {
  it('Einträge laufen nach BAN_SEASONS Saisonen ab', () => {
    const c = fresh();
    banSponsor(c, 'krume');
    expect(liveBans(c).map((b) => b.id)).toContain('krume');
    c.season += BAN_SEASONS - 1;
    expect(liveBans(c).map((b) => b.id)).toContain('krume');
    c.season += 1;
    expect(liveBans(c).map((b) => b.id)).not.toContain('krume');
  });

  it('alte Stände mit einer Liste aus IDs laden und verjähren ebenfalls', () => {
    const c = fresh();
    c.sponsorBans = ['krume', 'sultan'];
    expect(liveBans(c).every((b) => typeof b.until === 'number')).toBe(true);
    c.season += BAN_SEASONS;
    expect(liveBans(c)).toEqual([]);
  });

  it('über 40 Saisonen mit ständigen Kündigungen bleiben alle Plätze besetzbar', () => {
    const c = fresh(11);
    let maxBans = 0;
    for (let k = 0; k < 40; k++) {
      c.season += 1;
      c.round = 0;
      makeOffers(c, c.level);
      for (const slot of slotsFor(c.level)) expect(c.offers.some((o) => o.slot === slot), `Saison ${c.season} ${slot}`).toBe(true);
      signAll(c);
      expect(c.sponsors.length).toBe(slotsFor(c.level).length);
      while (c.sponsors.length) cancelSponsor(c, 0); // jede Kündigung sperrt den Sponsor
      c.offers = [];
      maxBans = Math.max(maxBans, liveBans(c).length);
    }
    // Ohne Verjährung wären es 40 × 3 = 120 Sperren bei nur 52 Betrieben der ersten Liga gewesen.
    expect(maxBans).toBeLessThanOrEqual(BAN_SEASONS * slotsFor(c.level).length);
  });

  it('sind alle gesperrt, dürfen sie trotzdem wieder fragen (Plätze bleiben nicht leer)', () => {
    const c = fresh(3);
    c.season += 1;
    c.round = 0;
    c.offers = [];
    c.sponsorBans = SPONSORS.map((s) => ({ id: s.id, until: c.season + 50 }));
    makeOffers(c, c.level);
    for (const slot of slotsFor(c.level)) expect(c.offers.some((o) => o.slot === slot)).toBe(true);
  });
});

describe('Laufzeit 1–3 Saisons', () => {
  it('längere Bindung zahlt weniger pro Woche', () => {
    const o = { weekly: 20 };
    expect(termWeekly(o, 1)).toBe(20);
    expect(termWeekly(o, 2)).toBeLessThan(20);
    expect(termWeekly(o, 3)).toBeLessThan(termWeekly(o, 2));
    expect(TERM_MUL[3]).toBeGreaterThan(0.75); // der Abschlag bleibt unter dem Aufschlag einer Verlängerung (bis +25 %)
  });

  it('der Sponsor kann die Bindung ablehnen – festgelegt, nicht neu würfelbar', () => {
    let refused = 0;
    let accepted = 0;
    for (let seed = 1; seed < 80; seed++) {
      const c = fresh(seed);
      const o = c.offers[0];
      const a = termWilling(c, o, 3, 0);
      expect(termWilling(c, o, 3, 0)).toBe(a);
      if (acceptSponsor(c, 0, 3)) accepted++;
      else {
        refused++;
        expect(c.offers[0].refused).toContain(3);
        expect(c.sponsors).toHaveLength(0);
        expect(c.sponsorNote).toBeTruthy();
      }
    }
    expect(refused).toBeGreaterThan(5);
    expect(accepted).toBeGreaterThan(5);
  });

  it('Eigenart und Zufriedenheit bestimmen den Bindungswillen', () => {
    const base = { rel: 50, trait: 'treu' };
    expect(termChance({ ...base, trait: 'knauserig' }, 3)).toBeLessThan(termChance(base, 3));
    expect(termChance({ ...base, rel: 90 }, 3)).toBeGreaterThan(termChance(base, 3));
    expect(termChance(base, 1)).toBe(1);
    expect(termChance(base, 3)).toBeLessThan(termChance(base, 2));
  });

  it('Vertrag über 3 Saisons: Wochenzahlung fest, läuft über Saisonwechsel, Ziel und Wunsch erneuern sich', () => {
    let c = null;
    for (let seed = 1; seed < 200 && !c; seed++) {
      const x = fresh(seed);
      if (acceptSponsor(x, 0, 3)) c = x;
    }
    expect(c).toBeTruthy();
    const s = c.sponsors[0];
    expect(s.term).toBe(3);
    expect(s.left).toBe(3);
    const weekly = s.weekly;
    s.rel = 40; // unzufrieden, aber gebunden: kein Renew-Angebot, kein Abgang
    c.round = c.fixtures.length;
    nextSeason(c);
    const kept = c.sponsors.find((x) => x.id === s.id);
    expect(kept).toBeTruthy();
    expect(kept.left).toBe(2);
    expect(kept.weekly).toBe(weekly);
    expect(kept.seasons).toBe(1);
    expect(kept.wish.done).toBe(false);
    expect(c.offers.some((o) => o.slot === kept.slot)).toBe(false); // Platz ist belegt
    expect(c.renewals.some((r) => r.id === s.id)).toBe(false);
  });

  it('gebundene Sponsoren kündigen nicht mitten in der Saison; ungebundene schon', () => {
    const c = fresh(7);
    acceptSponsor(c, 0);
    c.sponsors[0].left = 2;
    c.sponsors[0].rel = 0;
    paySponsors(c);
    expect(c.sponsors).toHaveLength(1);
    c.sponsors[0].left = 1;
    paySponsors(c);
    expect(c.sponsors).toHaveLength(0);
  });

  it('nach der letzten Saison des Vertrags gilt wieder die Verlängerungsregel', () => {
    const c = fresh(7);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.left = 1;
    s.rel = 95;
    s.wish.done = true;
    closeSponsors(c, { wins: 9, goals: 99, rank: 1, cards: 0 });
    expect(c.sponsors).toHaveLength(0);
    expect(c.renewals.some((r) => r.id === s.id)).toBe(true);
  });
});

describe('Angebot ablehnen und eigene Kündigung', () => {
  it('Ablehnen entfernt das Angebot und sperrt den Sponsor kurz', () => {
    const c = fresh(2);
    const n = c.offers.length;
    const id = c.offers[0].id;
    expect(declineOffer(c, 0)).toBe(true);
    expect(c.offers).toHaveLength(n - 1);
    expect(liveBans(c).map((b) => b.id)).toContain(id);
    c.season += 1;
    expect(liveBans(c).map((b) => b.id)).toContain(id);
    c.season += 1;
    expect(liveBans(c).map((b) => b.id)).not.toContain(id);
  });

  it('Kündigen kostet Vertragsstrafe, verstimmt die anderen und lässt vor der Saison einen Ersatz zu', () => {
    const c = fresh(4);
    acceptSponsor(c, 0);
    acceptSponsor(c, 0);
    expect(c.sponsors.length).toBe(2);
    const [a, b] = c.sponsors;
    a.left = 3;
    const penalty = cancelCost(c, a);
    expect(penalty).toBeGreaterThan(cancelCost(c, { ...a, left: 1 }));
    const cash = c.cash;
    const relB = b.rel;
    const offers = c.offers.length;
    expect(cancelSponsor(c, 0)).toBe(true);
    expect(c.cash).toBe(cash - penalty);
    expect(c.sponsors.map((s) => s.id)).not.toContain(a.id);
    expect(b.rel).toBe(relB - 6);
    expect(liveBans(c).map((x) => x.id)).toContain(a.id);
    expect(c.offers.length).toBe(offers + 1);
    expect(c.offers.some((o) => o.slot === a.slot && o.id !== a.id)).toBe(true);
  });

  it('mitten in der Saison kostet die Kündigung weniger Wochen als ganz zu Anfang', () => {
    const c = fresh(4);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    const early = cancelCost(c, s);
    c.round = Math.floor(c.fixtures.length / 2);
    expect(cancelCost(c, s)).toBeLessThan(early);
  });
});

describe('Branchen und Wünsche', () => {
  it('alle 60 Sponsoren haben eine Branche mit Namen in beiden Sprachen, jede Branche hat passende Wünsche', () => {
    for (const s of SPONSORS) {
      expect(BRANCHEN[s.branche], s.id).toBeTruthy();
      expect(BRANCHE_WISHES[s.branche], s.id).toBeTruthy();
    }
    for (const [b, list] of Object.entries(BRANCHE_WISHES)) {
      expect(BRANCHEN[b]).toBeTruthy();
      for (const k of list) expect(WISHES[k], `${b}:${k}`).toBeTruthy();
    }
    // Mindestens fünf verschiedene Gegenleistungen kommen vor (Autogramme, Foto, Bus, Bratwurst, Jugendcamp …).
    const kinds = new Set();
    for (const s of SPONSORS) for (let season = 1; season <= 3; season++) kinds.add(newWish(s, season).kind);
    expect(kinds.size).toBeGreaterThanOrEqual(6);
  });

  it('ein Wunsch zum Selbsterfüllen kostet Wochenzahlung × Faktor und hebt Zufriedenheit und Stimmung', () => {
    const c = fresh(6);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.wish = { kind: 'camp', n: 0, count: 0, done: false };
    const cash = (c.cash = 1000);
    const rel = s.rel;
    const mood = c.mood ?? 0;
    expect(fulfillWish(c, 0)).toBe(true);
    expect(c.cash).toBe(cash - wishCost(s.wish, s.weekly));
    expect(wishCost(s.wish, s.weekly)).toBe(4 * s.weekly);
    expect(s.rel).toBeGreaterThan(rel);
    expect(c.mood).toBeGreaterThan(mood);
    expect(s.wish.done).toBe(true);
    expect(fulfillWish(c, 0)).toBe(false); // nur einmal je Saison
  });

  it('ohne Geld in der Kasse klappt ein teurer Wunsch nicht', () => {
    const c = fresh(6);
    acceptSponsor(c, 0);
    c.sponsors[0].wish = { kind: 'camp', n: 0, count: 0, done: false };
    c.cash = 0;
    expect(fulfillWish(c, 0)).toBe('nocash');
    expect(c.sponsors[0].wish.done).toBe(false);
  });

  it('Spiel-Wünsche zählen Heimsiege, Spiele ohne Gegentor und Spiele mit drei Toren', () => {
    const c = fresh(6);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.wish = { kind: 'heim', n: 2, count: 0, done: false };
    sponsorResult(c, 2, 0, false); // auswärts zählt nicht
    expect(s.wish.count).toBe(0);
    sponsorResult(c, 1, 0, true);
    expect(s.wish.count).toBe(1);
    const rel = s.rel;
    sponsorResult(c, 3, 1, true);
    expect(s.wish.done).toBe(true);
    expect(s.rel).toBeGreaterThan(rel);
    s.wish = { kind: 'nullzu', n: 1, count: 0, done: false };
    sponsorResult(c, 0, 0, false);
    expect(s.wish.done).toBe(true);
    s.wish = { kind: 'tore3', n: 2, count: 0, done: false };
    sponsorResult(c, 2, 0, true);
    expect(s.wish.count).toBe(0);
    sponsorResult(c, 3, 3, false);
    expect(s.wish.count).toBe(1);
  });

  it('ein ignorierter Wunsch senkt die Zufriedenheit: Erinnerung zur Saisonmitte, Abzug am Saisonende', () => {
    const c = fresh(6);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.wish = { kind: 'foto', n: 0, count: 0, done: false };
    s.rel = 60;
    c.round = Math.floor(c.fixtures.length * 0.6);
    paySponsors(c);
    expect(s.rel).toBe(57);
    expect(s.nagged).toBe(true);
    paySponsors(c);
    expect(s.rel).toBe(57); // nur einmal
    const notes = closeSponsors(c, { wins: 0, goals: 0, rank: 9, cards: 99 });
    expect(notes.length).toBeGreaterThan(0);
  });

  it('erfüllter Wunsch: kein Abzug am Saisonende; unerfüllter kostet mehr als der erfüllte', () => {
    const run = (done) => {
      const c = fresh(6);
      acceptSponsor(c, 0);
      const s = c.sponsors[0];
      s.left = 2; // bleibt erhalten, damit wir rel lesen können
      s.rel = 60;
      s.wish = { kind: 'foto', n: 0, count: 0, done };
      closeSponsors(c, { wins: 99, goals: 99, rank: 1, cards: 0 });
      return c.sponsors[0].rel;
    };
    expect(run(true) - run(false)).toBe(8);
  });
});

describe('neue Gespräche', () => {
  const NEW = ['sponsor_abend', 'sponsor_aufstellung', 'sponsor_namensrecht', 'sponsor_trikotsatz', 'sponsor_klausel', 'sponsor_skandal', 'sponsor_treue', 'sponsor_jugend'];

  it('es gibt mindestens sechs neue Ereignisse mit 2–3 Antworten', () => {
    for (const id of NEW) {
      expect(SPONSOR_EVENTS[id], id).toBeTruthy();
      expect(SPONSOR_EVENTS[id].options.length).toBeGreaterThanOrEqual(2);
      expect(SPONSOR_EVENTS[id].options.length).toBeLessThanOrEqual(3);
    }
  });

  it('jede Antwort löst sich mit echtem Zufall auf, schreibt Text und bewegt etwas', () => {
    for (const id of NEW) {
      const ev = SPONSOR_EVENTS[id];
      for (let o = 0; o < ev.options.length; o++) {
        const seen = new Set();
        let ran = 0;
        for (let seed = 1; seed <= 30; seed++) {
          const c = fresh(seed * 3 + o);
          acceptSponsor(c, 0);
          acceptSponsor(c, 0);
          c.round = 5;
          c.sponsors[0].seasons = 2;
          const ctx = ev.needs(c, createRng(seed));
          if (!ctx) continue;
          ran++;
          expect(ev.text(c, ctx).length).toBeGreaterThan(10);
          const before = JSON.stringify({ cash: c.cash, mood: c.mood, rel: c.sponsors.map((s) => s.rel), n: c.sponsors.length, arena: c.arena, ex: c.sponsors.map((s) => s.exclusive), left: c.sponsors.map((s) => s.left) });
          c.week.event = { id, ctx, text: ev.text(c, ctx), options: ev.options.map((x) => x.label), choice: null, result: null };
          const text = resolveEvent(c, o);
          expect(typeof text).toBe('string');
          seen.add(text);
          const after = JSON.stringify({ cash: c.cash, mood: c.mood, rel: c.sponsors.map((s) => s.rel), n: c.sponsors.length, arena: c.arena, ex: c.sponsors.map((s) => s.exclusive), left: c.sponsors.map((s) => s.left) });
          expect(after, `${id}/${o} ändert nichts`).not.toBe(before);
        }
        expect(ran, `${id}/${o} lief nie`).toBeGreaterThan(10);
        expect(seen.size, `${id}/${o} Ausgänge`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('Namensrecht: Arena erscheint im Namen, bringt Geld, verschwindet mit dem Sponsor', () => {
    const c = fresh(8);
    acceptSponsor(c, 0);
    c.round = 5;
    const s = c.sponsors[0];
    s.slot = 'trikot';
    const ev = SPONSOR_EVENTS.sponsor_namensrecht;
    const ctx = ev.needs(c, fake);
    expect(ctx.arena).toBe(arenaName(s.id));
    expect(ctx.arena).toMatch(/-Arena$/);
    const cash = c.cash;
    c.week.event = { id: 'sponsor_namensrecht', ctx, text: ev.text(c, ctx), options: [], choice: null, result: null };
    resolveEvent(c, 0); // verkaufen
    expect(c.arena.name).toBe(ctx.arena);
    expect(arenaOf(c)).toBe(ctx.arena);
    expect(c.cash).toBeGreaterThan(cash);
    expect(venueExtras(c).arena).toBe(ctx.arena);
    expect(ev.needs(c, fake)).toBeNull(); // nur einmal
    cancelSponsor(c, 0);
    expect(arenaOf(c)).toBeNull();
  });

  it('Konkurrenzklausel hält Betriebe derselben Branche aus den Angeboten', () => {
    const c = fresh(9);
    acceptSponsor(c, 0);
    const s = c.sponsors[0];
    s.exclusive = true;
    for (let k = 0; k < 15; k++) {
      c.season += 1;
      c.offers = [];
      c.sponsors = [s];
      makeOffers(c, 5);
      expect(c.offers.some((o) => o.branche === s.branche && o.id !== s.id)).toBe(false);
    }
  });

  it('Skandal: fristlos trennen kostet keine Strafe, sperrt aber den Sponsor', () => {
    const c = fresh(10);
    acceptSponsor(c, 0);
    c.round = 5;
    const s = c.sponsors[0];
    const ev = SPONSOR_EVENTS.sponsor_skandal;
    const ctx = ev.needs(c, fake);
    c.week.event = { id: 'sponsor_skandal', ctx, text: '', options: [], choice: null, result: null };
    resolveEvent(c, 2);
    expect(c.sponsors.find((x) => x.id === s.id)).toBeUndefined();
    expect(liveBans(c).map((b) => b.id)).toContain(s.id);
  });

  it('Treue-Jubiläum: Verlängerung erhöht die Restlaufzeit höchstens bis 3', () => {
    const c = fresh(10);
    acceptSponsor(c, 0);
    c.round = 5;
    const s = c.sponsors[0];
    s.seasons = 2;
    const ev = SPONSOR_EVENTS.sponsor_treue;
    for (let k = 0; k < 5; k++) {
      const ctx = ev.needs(c, fake);
      c.week.event = { id: 'sponsor_treue', ctx, text: '', options: [], choice: null, result: null };
      resolveEvent(c, 1);
      expect(s.left).toBeLessThanOrEqual(3);
    }
  });
});

describe('alte Spielstände', () => {
  it('Stand ohne Laufzeit, Wunsch und Sperrfristen lädt und spielt Saisonwechsel', () => {
    const c = fresh(12);
    acceptSponsor(c, 0);
    acceptSponsor(c, 0);
    for (const s of c.sponsors) {
      delete s.term;
      delete s.left;
      delete s.wish;
      delete s.branche;
    }
    c.sponsorBans = ['krume', 'sultan'];
    delete c.arena;
    const loaded = migrateCareer(JSON.parse(JSON.stringify(c)));
    for (const s of loaded.sponsors) {
      expect(s.term).toBe(1);
      expect(s.left).toBe(1);
      expect(s.wish.kind).toBeTruthy();
      expect(s.branche).toBeTruthy();
    }
    expect(loaded.sponsorBans.every((b) => b.id && b.until > loaded.season)).toBe(true);
    paySponsors(loaded);
    loaded.round = loaded.fixtures.length;
    nextSeason(loaded);
    expect(loaded.offers.length).toBeGreaterThan(0);
  });

  it('der gespeicherte Stand aus den Browser-Tests lädt unverändert nutzbar', () => {
    const save = JSON.parse(readFileSync(new URL('../scripts/e2e/fixtures/save-858e978.json', import.meta.url), 'utf8'));
    const loaded = migrateCareer(save);
    expect(Array.isArray(loaded.sponsors)).toBe(true);
    for (const s of loaded.sponsors) expect(s.wish).toBeTruthy();
    expect(Array.isArray(loaded.sponsorBans ?? [])).toBe(true);
    if (loaded.offers.length && loaded.round === 0) expect(acceptSponsor(loaded, 0)).toBe(true);
    expect(humanClub(loaded)).toBeTruthy();
  });
});

describe('Sichtbarkeit im Spiel', () => {
  it('der Bandenpartner ersetzt ein freies Bandenfeld, sonst bleibt alles wie bisher', () => {
    const base = bandBoards({});
    expect(base).toHaveLength(8);
    const c = fresh(14);
    const o = c.offers.findIndex((x) => x.slot === 'bande');
    expect(acceptSponsor(c, o)).toBe(true);
    const ex = venueExtras(c);
    expect(ex.bande.name).toBe(bandeSponsor(c).name);
    const boards = bandBoards({ sponsorAds: ex });
    expect(boards.filter((b, i) => b[0] !== base[i][0])).toHaveLength(1);
    expect(boards.some((b) => b[0] === ex.bande.name.toUpperCase())).toBe(true);
    expect(venueExtras(fresh(15))).toBeNull();
  });
});
