// Englischer Modus: Alle Texte, die das Spiel erzeugt, dürfen keine deutschen Sätze mehr enthalten.
// Die Sprache wird vor dem Laden der Module gesetzt, weil viele Tabellen beim Import entstehen.
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

// Häufige deutsche Wörter – klein geschrieben, damit Eigennamen („Zur Klaue", „Am Kanal") nicht stören.
const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && GERMAN.test(t.replace(/<[^>]+>/g, ' '));

let m;
beforeAll(async () => {
  m = {
    career: await import('../src/career/career.js'),
    events: await import('../src/career/events.js'),
    stories: await import('../src/career/stories.js'),
    personal: await import('../src/career/personal.js'),
    sagas: await import('../src/career/sagas.js'),
    social: await import('../src/career/social.js'),
    derby: await import('../src/career/derby.js'),
    injuries: await import('../src/career/injuries.js'),
    life: await import('../src/career/life.js'),
    academy: await import('../src/career/academy.js'),
    sponsors: await import('../src/career/sponsors.js'),
    i18n: await import('../src/core/i18n.js'),
  };
});

const coach = { first: 'Sam', last: 'Baker', age: 44, relation: 'verheiratet', profession: 'electrician', style: 'libero', children: [{ name: 'Max', age: 12, sex: 'm' }, { name: 'Lena', age: 17, sex: 'w' }] };
const fake = { pick: (a) => a[0], int: (a) => a, chance: () => true, next: () => 0.5, range: (a) => a };

describe('English mode', () => {
  it('is active', () => {
    expect(m.i18n.getLang()).toBe('en');
  });

  it('every event text, option and outcome is English', async () => {
    const regs = [m.events.EVENTS, m.stories.STORY_STARTS, m.personal.PERSONAL_EVENTS, m.sagas.SAGA_EVENTS, m.social.SOCIAL_EVENTS, m.derby.DERBY_EVENTS, m.injuries.INJURY_EVENTS, m.life.LIFE_EVENTS, m.academy.ACADEMY_EVENTS, m.sponsors.SPONSOR_EVENTS];
    const bad = [];
    let checked = 0;
    for (const reg of regs) {
      for (const [id, ev] of Object.entries(reg)) {
        for (let seed = 1; seed <= 4; seed++) {
          const c = m.career.createCareer({ seed: seed * 7, coach });
          m.sponsors.acceptSponsor(c, 0);
          c.sponsors[0].trait = 'ehrgeizig';
          c.round = 4;
          let ctx;
          try {
            ctx = ev.needs(c, fake);
          } catch {
            ctx = null;
          }
          if (!ctx) continue;
          const text = ev.text(c, ctx);
          if (german(text)) bad.push(`${id}: ${text}`);
          ev.options.forEach((o, i) => {
            if (german(o.label)) bad.push(`${id} option: ${o.label}`);
            const cc = m.career.createCareer({ seed: seed * 7, coach });
            m.sponsors.acceptSponsor(cc, 0);
            cc.sponsors[0].trait = 'ehrgeizig';
            cc.round = 4;
            const ctx2 = ev.needs(cc, fake);
            if (!ctx2) return;
            cc.week.event = { id, ctx: ctx2, text: ev.text(cc, ctx2), options: ev.options.map((x) => x.label), choice: null, result: null };
            const res = m.events.resolveEvent(cc, i);
            checked++;
            if (german(res)) bad.push(`${id} → ${res}`);
          });
        }
      }
    }
    if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP + '/events.txt', bad.join('\n'));
    expect(checked).toBeGreaterThan(100);
    expect(bad.slice(0, 40)).toEqual([]);
  });

  it('a few simulated seasons produce English chat, ledger and chronicle', async () => {
    const c = m.career.createCareer({ seed: 99, coach });
    const texts = [];
    for (let s = 0; s < 3; s++) {
      while (!m.career.seasonOver(c)) {
        for (const msg of c.week.chat) texts.push(msg.text);
        if (c.week.event) texts.push(c.week.event.text, ...c.week.event.options);
        for (const r of c.week.rumors ?? []) texts.push(r.source);
        for (const f of m.career.currentFixtures(c)) f.result = { home: 1, away: 0 };
        m.career.finishRound(c);
        if (c.week?.event?.result) texts.push(c.week.event.result);
      }
      m.career.nextSeason(c);
    }
    texts.push(...c.ledger.map((l) => l.text), ...(c.saga?.chronicle ?? []).map((x) => x.text));
    const bad = [...new Set(texts.filter(german))];
    if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP + '/season.txt', bad.join('\n'));
    expect(bad.slice(0, 40)).toEqual([]);
  });
});
