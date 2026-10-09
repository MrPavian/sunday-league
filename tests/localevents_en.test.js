// Lokale Ereignisse im englischen Modus: kein deutscher Satz, kein Umlaut (Gegenprobe: localevents.test.js, deutsch).
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && (GERMAN.test(t.replace(/<[^>]+>/g, ' ')) || /[äöüß]/.test(t));

let m;
beforeAll(async () => {
  m = {
    career: await import('../src/career/career.js'),
    events: await import('../src/career/events.js'),
    local: await import('../src/career/localevents.js'),
    scenes: await import('./localscenes.js'),
    rng: await import('../src/core/rng.js'),
    i18n: await import('../src/core/i18n.js'),
  };
});

describe('Lokale Ereignisse auf Englisch', () => {
  it('Text, Antworten und jeder Ausgang sind englisch (alle Varianten der Ketten und der Spielbericht-Stufen)', () => {
    expect(m.i18n.getLang()).toBe('en');
    const bad = [];
    let checked = 0;
    for (const id of m.scenes.IDS) {
      const def = m.local.LOCAL_EVENTS[id];
      const variants = id === 'reportage_erscheint' ? [{ tone: 1 }, { tone: 0 }, { tone: -1 }] : id === 'wirt_neu' ? [{ how: 'bleibt' }, { how: 'selbst' }, { how: 'neu' }] : [{}];
      for (const link of variants)
        for (const level of [2, 4])
          for (let k = 0; k < 8; k++) {
            const { c, ctx } = m.scenes.scene(id, 1 + k * 5, { level, link });
            const text = def.text(c, ctx);
            if (german(text)) bad.push(`${id}: ${text}`);
            def.options.forEach((o, i) => {
              if (german(o.label)) bad.push(`${id} option: ${o.label}`);
              for (let r = 0; r < 3; r++) {
                const s = m.scenes.scene(id, 1 + k * 5, { level, link });
                const res = def.options[i].effect(s.c, s.ctx, m.rng.createRng(k * 13 + i * 3 + r));
                checked++;
                if (german(res)) bad.push(`${id}/${i} → ${res}`);
                for (const x of s.c.ledger) if (german(x.text)) bad.push(`${id}/${i} ledger: ${x.text}`);
              }
            });
          }
    }
    expect(checked).toBeGreaterThan(1500);
    expect(bad.slice(0, 20)).toEqual([]);
  }, 240000);

  it('über resolveEvent: Ergebnis und Folgen-Chips englisch', () => {
    const bad = [];
    for (const id of m.scenes.IDS)
      for (let i = 0; i < m.local.LOCAL_EVENTS[id].options.length; i++) {
        const { c, ctx } = m.scenes.scene(id, 3);
        c.week.event = { id, ctx, text: m.local.LOCAL_EVENTS[id].text(c, ctx), options: m.local.LOCAL_EVENTS[id].options.map((o) => o.label), choice: null, result: null };
        const res = m.events.resolveEvent(c, i);
        if (german(res)) bad.push(`${id}/${i}: ${res}`);
        for (const e of c.week.event.effects ?? []) if (german(e.text)) bad.push(`${id}/${i} chip: ${e.text}`);
      }
    expect(bad).toEqual([]);
  }, 120000);
});
