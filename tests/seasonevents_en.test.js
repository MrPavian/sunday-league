// Saison-Ereignisse und Derby-Rückspiel: Im englischen Modus darf kein deutscher Satz mehr auftauchen,
// im deutschen Modus kein englischer (Gegenprobe in seasonevents.test.js liefert deutsche Texte).
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
    season: await import('../src/career/seasonevents.js'),
    derby: await import('../src/career/derby.js'),
    scenes: await import('./seasonscenes.js'),
    rng: await import('../src/core/rng.js'),
    i18n: await import('../src/core/i18n.js'),
  };
});

describe('Saison-Ereignisse auf Englisch', () => {
  it('Text, Antworten und jeder Ausgang sind englisch', () => {
    expect(m.i18n.getLang()).toBe('en');
    const bad = [];
    let checked = 0;
    for (const id of m.scenes.IDS) {
      const def = m.season.SEASON_EVENTS[id];
      for (let k = 0; k < 12; k++) {
        const { c, ctx } = m.scenes.scene(id, 1 + k * 5);
        const text = def.text(c, ctx);
        if (german(text)) bad.push(`${id}: ${text}`);
        def.options.forEach((o, i) => {
          if (german(o.label)) bad.push(`${id} option: ${o.label}`);
          const s = m.scenes.scene(id, 1 + k * 5);
          const res = def.options[i].effect(s.c, s.ctx, m.rng.createRng(k * 13 + i));
          checked++;
          if (german(res)) bad.push(`${id}/${i} → ${res}`);
        });
      }
    }
    expect(checked).toBeGreaterThan(300);
    expect(bad.slice(0, 20)).toEqual([]);
  }, 120000);

  it('Derby-Rückspiel: alle vier Hinspiel-Lagen und alle Antworten sind englisch', () => {
    const bad = [];
    for (const res of ['w', 'l', 'd', 'none']) {
      const c = m.career.createCareer({ seed: 7 });
      c.round = 6;
      const def = m.derby.DERBY_EVENTS.derby_rueckspiel;
      const ctx = { club: 'kanal', res, score: '2:1' };
      const text = def.text(c, ctx);
      if (german(text)) bad.push(text);
      def.options.forEach((o, i) => {
        if (german(o.label)) bad.push(o.label);
        for (let k = 0; k < 8; k++) {
          const d = m.career.createCareer({ seed: 7 + k });
          d.round = 6;
          const r = def.options[i].effect(d, ctx, m.rng.createRng(k * 3 + i));
          if (german(r)) bad.push(r);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});
