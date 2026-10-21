// Tim „Der Tiger“ im englischen Modus: kein deutscher Satz, kein Umlaut (Gegenprobe: tiger.test.js, deutsch).
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && (GERMAN.test(t.replace(/<[^>]+>/g, ' ')) || /[äöüß]/.test(t));

let m;
beforeAll(async () => {
  m = { career: await import('../src/career/career.js'), tiger: await import('../src/career/tiger.js'), rng: await import('../src/core/rng.js') };
});

describe('Tiger auf Englisch', () => {
  it('Text, Antworten und Ausgänge sind englisch', () => {
    const bad = [];
    let checked = 0;
    for (const [id, def] of Object.entries(m.tiger.TIGER_EVENTS)) {
      for (let k = 0; k < 6; k++) {
        const c = m.career.createCareer({ seed: 40 + k });
        c.level = 3;
        c.round = 4;
        const t = m.tiger.tigerOf(c);
        t.wk = 10;
        t.mood = 0.8;
        const ctxs = [{ kind: 'win', score: '4:0', opp: 'Test FC' }, { kind: 'derby', score: '3:0', opp: 'Test FC' }, { kind: 'cup', score: '2:1', opp: 'the favourites' }, { path: 'listen', age: 42, w: 3, opp: 'Test FC', tip: [2, 0], bet: 1, score: '0:0', exact: false, tendency: false, zero: true, res: 'good', st: 'hi', pts: 7, n: 3 }, { path: 'training', res: 'bad', st: 'lo', pts: 0, n: 3, age: 43, w: 2, tip: [3, 1], bet: 2, score: '3:1', exact: true, tendency: true }, { path: 'ignore', res: 'mid', st: 'mid', pts: 3, n: 3, age: 44, w: 4, tip: [2, 1], bet: 0, score: '1:2', exact: false, tendency: false }];
        for (const ctx of ctxs) {
          let text;
          try { text = def.text(c, ctx); } catch { continue; }
          if (german(text)) bad.push(`${id}: ${text}`);
          def.options.forEach((o, i) => {
            if (german(o.label)) bad.push(`${id} option: ${o.label}`);
            const s = m.career.createCareer({ seed: 40 + k });
            m.tiger.tigerOf(s).story = { path: 'listen', stance: 1, start: 1, pts: 3, n: 3 };
            const res = o.effect(s, ctx, m.rng.createRng(k * 7 + i));
            checked++;
            if (german(res)) bad.push(`${id}/${i} → ${res}`);
            for (const x of s.ledger) if (german(x.text)) bad.push(`${id}/${i} ledger: ${x.text}`);
          });
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(bad.slice(0, 20)).toEqual([]);
  }, 120000);
});
