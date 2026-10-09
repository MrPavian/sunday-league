// Englischer Modus für den Sponsoring-Ausbau: neue Gespräche, Wünsche, Branchen und Vertragstexte enthalten keine deutschen Sätze.
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && GERMAN.test(t.replace(/<[^>]+>/g, ' '));
const NEW = ['sponsor_abend', 'sponsor_aufstellung', 'sponsor_namensrecht', 'sponsor_trikotsatz', 'sponsor_klausel', 'sponsor_skandal', 'sponsor_treue', 'sponsor_jugend'];

let m;
beforeAll(async () => {
  m = {
    career: await import('../src/career/career.js'),
    events: await import('../src/career/events.js'),
    sponsors: await import('../src/career/sponsors.js'),
    wish: await import('../src/career/sponsorwish.js'),
    rng: await import('../src/core/rng.js'),
    i18n: await import('../src/core/i18n.js'),
  };
});

describe('Sponsoring auf Englisch', () => {
  it('ist aktiv', () => expect(m.i18n.getLang()).toBe('en'));

  it('Branchen und Wünsche sind englisch', () => {
    for (const [k, v] of Object.entries(m.wish.BRANCHEN)) expect(german(v), k).toBe(false);
    for (const [k, w] of Object.entries(m.wish.WISHES)) {
      const label = typeof w.label === 'function' ? w.label(2) : w.label;
      expect(german(label), `${k}: ${label}`).toBe(false);
      if (w.act) expect(german(w.act), k).toBe(false);
    }
  });

  it('jedes neue Gespräch: Text, Antworten und alle Ausgänge sind englisch', () => {
    const bad = [];
    let checked = 0;
    for (const id of NEW) {
      const ev = m.sponsors.SPONSOR_EVENTS[id];
      ev.options.forEach((o, i) => {
        if (german(o.label)) bad.push(`${id} option: ${o.label}`);
        for (let seed = 1; seed <= 40; seed++) {
          const c = m.career.createCareer({ seed: seed * 5 + i });
          m.sponsors.acceptSponsor(c, 0);
          m.sponsors.acceptSponsor(c, 0);
          c.round = 5;
          c.sponsors[0].seasons = 2;
          const ctx = ev.needs(c, m.rng.createRng(seed));
          if (!ctx) continue;
          const text = ev.text(c, ctx);
          if (german(text)) bad.push(`${id}: ${text}`);
          c.week.event = { id, ctx, text, options: ev.options.map((x) => x.label), choice: null, result: null };
          const res = m.events.resolveEvent(c, i);
          checked++;
          if (german(res)) bad.push(`${id} -> ${res}`);
        }
      });
    }
    expect(checked).toBeGreaterThan(300);
    expect([...new Set(bad)]).toEqual([]);
  });

  it('Hinweise bei Laufzeit, Ablehnen, Kündigen und Wunsch sind englisch', () => {
    const notes = [];
    for (let seed = 1; seed < 60; seed++) {
      const c = m.career.createCareer({ seed });
      m.sponsors.acceptSponsor(c, 0, 3);
      notes.push(c.sponsorNote);
      if (c.sponsors.length) {
        c.sponsors[0].wish = { kind: 'foto', n: 0, count: 0, done: false };
        m.sponsors.fulfillWish(c, 0);
        notes.push(c.sponsorNote);
        m.sponsors.cancelSponsor(c, 0);
        notes.push(c.sponsorNote, c.saga.chronicle.at(-1)?.text);
      } else m.sponsors.declineOffer(c, 0), notes.push(c.sponsorNote);
      c.round = Math.floor(c.fixtures.length * 0.6);
      c.sponsors.push({ ...c.offers[0], wish: { kind: 'bus', n: 0, count: 0, done: false }, rel: 50, left: 1, term: 1 });
      m.sponsors.paySponsors(c);
      notes.push(c.week.chat.at(-1)?.text);
      notes.push(...m.sponsors.closeSponsors(c, { wins: 0, goals: 0, rank: 9, cards: 99 }));
    }
    const real = notes.filter(Boolean);
    expect(real.length).toBeGreaterThan(100);
    expect(real.filter(german)).toEqual([]);
  });
});
