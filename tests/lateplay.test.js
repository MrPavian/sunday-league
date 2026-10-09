import { afterAll, describe, expect, it } from 'vitest';
import { buildLineup, createCareer, finishRound, humanClub, loadCareer, migrateCareer, prepareMatch, saveCareer, startWeek } from '../src/career/career.js';
import { EVENTS, eventView, resolveEvent } from '../src/career/events.js';
import { SOCIAL_EVENTS } from '../src/career/social.js';
import { LIFE_EVENTS } from '../src/career/life.js';
import { SEASON_EVENTS } from '../src/career/seasonevents.js';
import { SPONSOR_EVENTS } from '../src/career/sponsors.js';
import { PERSONAL_EVENTS } from '../src/career/personal.js';
import { LATE, LATE_STRICT } from '../src/career/chat.js';
import { FINES } from '../src/career/finances.js';
import { matchdaySurprise } from '../src/career/matchday.js';
import { sitOut } from '../src/career/outcomes.js';
import { lateOr, spielberichtStreng } from '../src/career/spielbericht.js';
import { createRng } from '../src/core/rng.js';
import { getLang, setLang } from '../src/core/i18n.js';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

// Ab Kreisliga A (Stufe 4) gilt der elektronische Spielbericht: Wer zum Anpfiff nicht da ist, spielt nicht.
const SECOND_HALF = /zweiten? Halbzeit|2\. Halbzeit|ersten Halbzeit|second half|2nd half|first half|zur Halbzeit|in der Pause|arrive[sd]? at half-time/i;
const REGISTRIES = { ...EVENTS, ...SOCIAL_EVENTS, ...LIFE_EVENTS, ...SEASON_EVENTS, ...SPONSOR_EVENTS, ...PERSONAL_EVENTS };
const startLang = getLang();
afterAll(() => setLang(startLang));

const careerAt = (seed, level) => {
  const c = createCareer({ seed });
  c.level = level;
  startWeek(c);
  return c;
};
const states = (c) => Object.values(c.week.availability);

// Jede Option jedes Ereignisses, viele Seeds: liefert die Verfügbarkeiten und Texte danach.
function sweepEvents(level, seeds) {
  const out = { late: 0, texts: [], runs: 0 };
  for (const [id, def] of Object.entries(REGISTRIES)) {
    for (let choice = 0; choice < def.options.length; choice++) {
      for (let s = 1; s <= seeds; s++) {
        const c = careerAt(500 + s * 7, level);
        c.round = 5 + (s % 4);
        const ctx = def.needs?.(c, createRng(s));
        if (!ctx) continue;
        try {
          c.week.event = { id, ctx, text: def.text(c, ctx), options: def.options.map((o) => (typeof o.label === 'function' ? o.label(c) : o.label)), choice: null, result: null };
          const res = resolveEvent(c, choice);
          out.runs++;
          out.late += states(c).filter((x) => x === 'late').length;
          out.texts.push(`${id}/${choice}: ${res}`, ...c.week.event.options);
        } catch {
          // Ereignis passt zu diesem Stand nicht (Vorbedingung) – zählt nicht
        }
      }
    }
  }
  return out;
}

describe('Spielbericht: kein „kommt zur 2. Halbzeit" ab Kreisliga A', () => {
  it('die Schwelle liegt bei Stufe 4', () => {
    expect([1, 2, 3, 4, 5].map((l) => spielberichtStreng(l))).toEqual([false, false, false, true, true]);
    expect(lateOr(3, 'später', 'nie')).toBe('später');
    expect(lateOr(4, 'später', 'nie')).toBe('nie');
  });

  it('Stufe 1–3: sitOut(late) bleibt late, der Wochen-Chat würfelt weiter Spätkommer', () => {
    for (const level of [1, 2, 3]) {
      const c = careerAt(11, level);
      const idx = humanClub(c).squad.find((i) => i !== c.coach.idx);
      sitOut(c, idx, 'late');
      expect(c.week.availability[idx]).toBe('late');
      let late = 0;
      for (let s = 1; s <= 40; s++) late += states(careerAt(900 + s, level)).filter((x) => x === 'late').length;
      expect(late, `Stufe ${level}`).toBeGreaterThan(0);
    }
  });

  it('Stufe 4–5: erzwungenes sitOut(late) wird zu no; über viele Wochen nie late', () => {
    for (const level of [4, 5]) {
      const c = careerAt(12, level);
      for (const idx of humanClub(c).squad) {
        sitOut(c, idx, 'late');
        expect(c.week.availability[idx]).not.toBe('late');
        expect(c.week.availability[idx]).toBe('no');
      }
      for (let s = 1; s <= 25; s++) {
        const d = createCareer({ seed: 1200 + s });
        d.level = level;
        for (let w = 0; w < 6; w++) {
          startWeek(d);
          expect(states(d)).not.toContain('late');
          for (const m of d.week.chat) expect(LATE.includes(m.text), `Stufe ${level}: ${m.text}`).toBe(false);
          finishRound(d);
        }
      }
    }
  });

  it('gleiche Zahl Ziehungen: Stufe 4 und Stufe 3 würfeln dieselben Absagen (nur late wird no)', () => {
    for (let s = 1; s <= 20; s++) {
      const a = careerAt(300 + s, 3);
      const b = careerAt(300 + s, 4);
      const sa = humanClub(a).squad;
      expect(humanClub(b).squad).toEqual(sa);
      for (const idx of sa) {
        const x = a.week.availability[idx];
        expect(b.week.availability[idx]).toBe(x === 'late' ? 'no' : x);
      }
    }
  });

  it('Stufe 4–5: alle Ereignisse und Optionen setzen nie late und sagen nichts von der 2. Halbzeit (DE+EN)', () => {
    for (const lang of ['de', 'en']) {
      setLang(lang);
      for (const level of [4, 5]) {
        const r = sweepEvents(level, 10);
        expect(r.runs, `${lang}/${level}`).toBeGreaterThan(100);
        expect(r.late).toBe(0);
        for (const t of r.texts) expect(SECOND_HALF.test(t), `${lang}/${level}: ${t}`).toBe(false);
      }
    }
    setLang('de');
  }, 240000);

  it('Stufe 1–3: dieselben Ereignisse dürfen Spätkommer erzeugen (Verhalten unverändert)', () => {
    let late = 0;
    for (const level of [1, 2, 3]) late += sweepEvents(level, 6).late;
    expect(late).toBeGreaterThan(0);
  }, 240000);

  it('Chat-Zusagen: mindestens 8 eigene Varianten je Sprache, ohne Halbzeit', () => {
    for (const lang of ['de', 'en']) {
      setLang(lang);
      expect(LATE_STRICT.length).toBeGreaterThanOrEqual(8);
      for (const t of LATE_STRICT) expect(SECOND_HALF.test(t), t).toBe(false);
    }
    setLang('de');
  });

  it('Strafenkatalog trägt den Spielbericht-Text', () => {
    const f = FINES.find((x) => x.id === 'late');
    expect(f.strict).toMatch(/Spielbericht/);
    expect(f.strict).not.toMatch(SECOND_HALF);
  });

  it('Trainer-Wunsch (personal): ab Stufe 4 kein 2.-Halbzeit-Angebot, er fehlt im Bericht', () => {
    const def = PERSONAL_EVENTS.familienwochenende;
    for (const level of [3, 4]) {
      const c = careerAt(31, level);
      const ctx = def.needs(c, createRng(1)) ?? {};
      c.week.availability[c.coach.idx] = 'yes';
      c.week.event = { id: 'familienwochenende', ctx, text: def.text(c, ctx), options: [], choice: null, result: null };
      const view = eventView(c, c.week.event);
      expect(view.options[1] === 'Nur zur 2. Halbzeit kommen', `Stufe ${level}`).toBe(level === 3);
      resolveEvent(c, 1);
      expect(c.week.availability[c.coach.idx]).toBe(level === 3 ? 'late' : 'no');
    }
  });

  it('alte Spielstände: late in Stufe ≥ 4 wird beim Laden zu no, Aufstellung ignoriert es', () => {
    const c = careerAt(77, 4);
    const [a, b] = humanClub(c).squad.filter((i) => i !== c.coach.idx);
    c.week.availability[a] = 'late';
    c.week.availability[b] = 'late';
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    saveCareer(c, storage, 'slot-test');
    const back = loadCareer(storage, 'slot-test');
    expect(back.week.availability[a]).toBe('no');
    expect(back.week.availability[b]).toBe('no');
    // Selbst ohne Migration: buildLineup stellt keinen Spätkommer mehr auf die Bank.
    const raw = careerAt(77, 4);
    const av = { ...raw.week.availability, [a]: 'late' };
    const { late, bench } = buildLineup(raw, humanClub(raw), 9, av, createRng(1));
    expect(late).toEqual([]);
    expect(bench).not.toContain(a);
    migrateCareer(raw);
  });
});

describe('Startelf ist vollzählig, Spätkommer kommen auf die Bank', () => {
  it('Karriere, alle Stufen: viele Seeds und Wochen – genug Spieler da heißt volle Startelf', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (let s = 1; s <= 12; s++) {
        const c = createCareer({ seed: 700 + s });
        c.level = level;
        for (let w = 0; w < 4; w++) {
          startWeek(c);
          const f = prepareMatch(c, c.fixtures[c.round].find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id), { human: true, duration: 5 });
          const m = f.match;
          const team = m.players.filter((p) => p.team === 0).length + (m.lateArrival ? 1 : 0);
          expect(team, `Stufe ${level} Seed ${s} Woche ${w}`).toBe(m.pitch.format);
          // Spätkommer (Stufe 1–3) beginnen nie, sondern stehen auf der Bank.
          for (const p of m.players.filter((q) => q.team === 0)) expect(p.late).not.toBe(true);
          finishRound(c);
        }
      }
    }
  });

  it('Stau-Überraschung mit Bank: einer rückt nach, niemand beginnt in Unterzahl', () => {
    let seen = 0;
    for (const level of [1, 2, 3, 4, 5]) {
      for (let seed = 1; seed <= 200 && seen < 400; seed++) {
        const m = createMatch({ seed, pitch: PITCHES.sportplatz, human: false, duration: 60 });
        const before = m.players.filter((p) => p.team === 0).length;
        const benchBefore = m.bench[0].length;
        const sur = matchdaySurprise(m, 0, createRng(seed), 1, 'stau', level);
        if (sur?.id !== 'stau') continue;
        seen++;
        expect(m.players.filter((p) => p.team === 0)).toHaveLength(before);
        expect(m.lateArrival).toBeFalsy();
        if (level < 4) expect(m.bench[0]).toHaveLength(benchBefore); // der Nachzügler wartet auf der Bank
        else {
          expect(m.bench[0]).toHaveLength(benchBefore - 1); // er fehlt im Bericht
          expect(sur.text).not.toMatch(SECOND_HALF);
        }
      }
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('Stau ohne Bank: Unterzahl nur bei Mangel – Stufe 1–3 wie bisher, ab Stufe 4 gibt es die Überraschung dort nicht', () => {
    for (const level of [3, 4]) {
      let stau = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const m = createMatch({ seed, pitch: PITCHES.sportplatz, human: false, duration: 60 });
        m.bench[0] = [];
        if (matchdaySurprise(m, 0, createRng(seed), 1, 'stau', level)?.id === 'stau') stau++;
      }
      expect(stau > 0).toBe(level === 3);
    }
  });
});

describe('Strafbank ist anwesend: im Spielbericht, nie fehlend', () => {
  // [Registry, Ereignis-ID, Option der Strafbank]
  const CASES = [
    [SOCIAL_EVENTS, 'rivalen_zoff', 1],
  ];
  const kater = Object.entries(EVENTS).find(([, d]) => d.options.some((o) => String(typeof o.label === 'function' ? o.label({ level: 1 }) : o.label).startsWith('Erste Halbzeit auf die Bank')));
  if (kater) CASES.push([{ [kater[0]]: kater[1] }, kater[0], kater[1].options.findIndex((o) => String(typeof o.label === 'function' ? o.label({ level: 1 }) : o.label).startsWith('Erste Halbzeit'))]);

  it('Stufe 4–5: Strafbank-Spieler sind bench (nicht no, nicht late), im Kader und auf der Bank; Stufe 3: late wie bisher', () => {
    expect(CASES.length).toBe(2);
    for (const [reg, id, choice] of CASES) {
      const def = reg[id];
      for (const level of [3, 4, 5]) {
        let benched = 0;
        for (let s = 1; s <= 25; s++) {
          const c = careerAt(2000 + s, level);
          const ctx = def.needs(c, createRng(s));
          if (!ctx) continue;
          const before = { ...c.week.availability };
          c.week.event = { id, ctx, text: def.text(c, ctx), options: [], choice: null, result: null };
          const res = resolveEvent(c, choice);
          expect(SECOND_HALF.test(level >= 4 ? res : ''), res).toBe(false);
          const changed = Object.keys(c.week.availability).filter((k) => c.week.availability[k] !== before[k] && before[k] === 'yes');
          for (const k of changed) {
            const v = c.week.availability[k];
            if (level >= 4) expect(['bench', 'no']).toContain(v);
            else expect(['late', 'no']).toContain(v);
            if (v !== (level >= 4 ? 'bench' : 'late')) continue;
            benched++;
            const club = humanClub(c);
            expect(club.squad).toContain(Number(k));
            const { lineup, bench } = buildLineup(c, club, 9, c.week.availability, createRng(3));
            expect(lineup).not.toContain(Number(k));
            expect(bench).toContain(Number(k));
          }
        }
        expect(benched, `${id} Stufe ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('Stufe 4: Strafbank-Spieler bekommt kein late-Flag und ist ab Anpfiff einwechselbar', () => {
    const c = careerAt(2100, 4);
    const club = humanClub(c);
    const idx = club.squad.find((i) => i !== c.coach.idx && c.week.availability[i] === 'yes');
    sitOut(c, idx, 'bench');
    expect(c.week.availability[idx]).toBe('bench');
    c.week.lineup = null;
    const f = c.fixtures[c.round].find((x) => x.home === club.id || x.away === club.id);
    const m = prepareMatch(c, f, { human: true, duration: 5 }).match;
    const mine = [...m.players, ...m.bench[0], ...(m.lateArrival ? [m.lateArrival.player] : [])].find((p) => p.poolIndex === idx);
    expect(mine).toBeTruthy();
    expect(m.players.includes(mine)).toBe(false);
    expect(m.bench[0].includes(mine)).toBe(true);
    expect(mine.late).not.toBe(true);
  });

  it('Label: Stufe ≥ 4 „auf die Bank setzen", nie „aus dem Spielbericht nehmen"', () => {
    for (const lang of ['de', 'en']) {
      setLang(lang);
      for (const level of [3, 4]) {
        const c = careerAt(2200, level);
        for (const reg of [SOCIAL_EVENTS.rivalen_zoff, kater?.[1]]) {
          for (const o of reg.options) {
            const l = typeof o.label === 'function' ? o.label(c) : o.label;
            expect(/Spielbericht|match report/.test(l), l).toBe(false);
          }
        }
      }
    }
    setLang('de');
  });
});
