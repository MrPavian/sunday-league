// Phasen-Ereignisse im englischen Modus: kein deutscher Satz, kein Umlaut (Gegenprobe: phaseevents.test.js, deutsch).
import { beforeAll, describe, expect, it } from 'vitest';

const store = { 'sunday-league:lang': 'en' };
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

const GERMAN = /(^|[\s"„(])(und|der|die|das|nicht|ist|mit|eine?|auf|für|sich|noch|auch|wird|hat|sind|bei|nach|wie|schon|kommt|zum|zur|dem|den|von|im|ab|aber|oder|kein|keine|mehr|heute|diese|dieser|wieder|einen|einem|werden|kann|muss|gibt|geht)(?=[\s,.!?:;"“)]|$)/;
const german = (t) => typeof t === 'string' && (GERMAN.test(t.replace(/<[^>]+>/g, ' ')) || /[äöüß]/.test(t));

let m;
beforeAll(async () => {
  m = {
    events: await import('../src/career/events.js'),
    phase: await import('../src/career/phaseevents.js'),
    scenes: await import('./phasescenes.js'),
    rng: await import('../src/core/rng.js'),
    i18n: await import('../src/core/i18n.js'),
  };
});

const label = (o, c) => (typeof o.label === 'function' ? o.label(c) : o.label);

describe('Phasen-Ereignisse auf Englisch', () => {
  it('Text, Antworten und jeder Ausgang sind englisch (alle Varianten, Stufen 1, 2 und 4)', () => {
    expect(m.i18n.getLang()).toBe('en');
    const bad = [];
    let checked = 0;
    for (const id of m.scenes.IDS) {
      const def = m.phase.PHASE_EVENTS[id];
      const variants = id === 'jugendleiter_bilanz' ? [{ tone: 1 }, { tone: 0 }, { tone: -1 }] : [{}];
      const levels = m.scenes.LEVEL1.includes(id) ? [1] : [2, 4];
      for (const link of variants)
        for (const level of levels)
          for (let k = 0; k < 8; k++) {
            const { c, ctx } = m.scenes.scene(id, 1 + k * 5, { level, link });
            const text = def.text(c, ctx);
            if (german(text)) bad.push(`${id}: ${text}`);
            def.options.forEach((o, i) => {
              if (german(label(o, c))) bad.push(`${id} option: ${label(o, c)}`);
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
    expect(checked).toBeGreaterThan(900);
    expect(bad.slice(0, 20)).toEqual([]);
  }, 240000);

  it('Zwischenbilanz in allen drei Lagen und Saisonziel-Namen englisch', () => {
    const bad = [];
    for (const state of ['vorn', 'plan', 'hinten']) {
      const { c } = m.scenes.scene('ziel_zwischenbilanz');
      const t = m.phase.PHASE_EVENTS.ziel_zwischenbilanz.text(c, { pos: 3, state });
      if (german(t)) bad.push(t);
      for (const i of [0, 1, 2]) {
        const s = m.scenes.scene('ziel_zwischenbilanz');
        const res = m.phase.PHASE_EVENTS.ziel_zwischenbilanz.options[i].effect(s.c, { pos: 3, state }, m.rng.createRng(i + 1));
        if (german(res)) bad.push(res);
      }
    }
    for (const type of ['erhalt', 'obere', 'aufstieg']) {
      const { c } = m.scenes.scene('ziel_nachverhandeln');
      c.goal.type = type;
      const t = m.phase.PHASE_EVENTS.ziel_nachverhandeln.text(c, { type });
      if (german(t)) bad.push(t);
      for (const i of [0, 1, 2]) {
        const s = m.scenes.scene('ziel_nachverhandeln');
        s.c.goal.type = type;
        const res = m.phase.PHASE_EVENTS.ziel_nachverhandeln.options[i].effect(s.c, { type }, m.rng.createRng(i + 3));
        if (german(res)) bad.push(res);
      }
    }
    expect(bad).toEqual([]);
  });

  it('über resolveEvent: Ergebnis und Folgen-Chips englisch', () => {
    const bad = [];
    for (const id of m.scenes.IDS)
      for (let i = 0; i < m.phase.PHASE_EVENTS[id].options.length; i++) {
        const { c, ctx } = m.scenes.scene(id, 3);
        c.week.event = { id, ctx, text: m.phase.PHASE_EVENTS[id].text(c, ctx), options: m.phase.PHASE_EVENTS[id].options.map((o) => label(o, c)), choice: null, result: null };
        const res = m.events.resolveEvent(c, i);
        if (german(res)) bad.push(`${id}/${i}: ${res}`);
        for (const e of c.week.event.effects ?? []) if (german(e.text)) bad.push(`${id}/${i} chip: ${e.text}`);
      }
    expect(bad).toEqual([]);
  }, 120000);
});
