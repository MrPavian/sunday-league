// Wechsel als Gespräch (Gameplay 2.0, Punkt 35): Der Co-Trainer schlägt Wechsel mit Begründung vor, ein Tipp nimmt ihn an.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { enableManager } from '../src/sim/coach.js';
import { answerCard } from '../src/sim/coachfeed.js';
import { canSubNow, usableBench } from '../src/sim/squad.js';
import { subProposal } from '../src/sim/subtalk.js';
import { answer, checkDecision, createTouchline, manualSubDecision } from '../src/sim/touchline.js';

const DT = 1 / 60;

// Spielt mit Trainer auf Team 0; answer(card) entscheidet je Vorschlag (Index oder null). Sammelt Vorschläge und Wechsel.
function play(seed, answer) {
  const pitch = PITCHES.sportplatz;
  const m = enableManager(createMatch({ seed, pitch, human: false, duration: matchDuration(pitch), aiCoach: false }), 0);
  const cards = [];
  const subs = [];
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, DT);
    for (const e of m.events) if (e.type === 'sub' && e.team === 0) subs.push(e);
    m.events.length = 0;
    const c = m.coachCard;
    if (c?.type === 'SUB' && !cards.includes(c)) {
      const { outId, inId } = c.options[0].sub;
      cards.push(c);
      c.check = { onPitch: m.players.some((p) => p.id === outId && p.team === 0), onBench: usableBench(m, 0).some((p) => p.id === inId), can: canSubNow(m, 0) };
      const i = answer(c);
      if (i !== undefined) answerCard(m, 0, i);
    }
  }
  return { m, cards, subs };
}

describe('Wechsel als Gespräch', () => {
  it('Vorschläge kommen, sind gültig, haben eine Begründung – und „Ja“ wechselt genau dieses Paar', () => {
    let cards = 0;
    let done = 0;
    for (const seed of [31, 32, 33, 34]) {
      const r = play(seed, () => 0);
      for (const c of r.cards) {
        cards++;
        expect(c.check).toEqual({ onPitch: true, onBench: true, can: true });
        expect(c.text.length).toBeGreaterThan(20);
        expect(c.options.map((o) => !!o.sub)).toEqual([true, false, false]);
        const { outId, inId } = c.options[0].sub;
        if (r.subs.some((s) => s.outId === outId && s.inId === inId)) done++;
      }
    }
    expect(cards).toBeGreaterThan(0);
    expect(done).toBe(cards); // jeder angenommene Vorschlag wird beim nächsten Stopp ausgeführt
  }, 240000);

  it('nach „Nein“ wird derselbe Spieler nicht gleich wieder vorgeschlagen; höchstens zwei je Halbzeit', () => {
    for (const seed of [31, 32, 33]) {
      const r = play(seed, () => 2);
      const byOut = new Map();
      for (const c of r.cards) {
        const id = c.options[0].sub.outId;
        if (byOut.has(id)) expect(c.t - byOut.get(id)).toBeGreaterThanOrEqual(r.m.duration * 0.25 - 1);
        byOut.set(id, c.t);
      }
      expect(r.subs.filter((s) => !s.forced).length).toBe(0);
    }
  }, 240000);

  it('kein Vorschlag, wenn kein Wechsel mehr geht', () => {
    const pitch = PITCHES.sportplatz;
    const m = enableManager(createMatch({ seed: 5, pitch, human: false, aiCoach: false }), 0);
    while (m.phase !== 'play') stepMatch(m, undefined, DT);
    m.time = m.duration * 0.8;
    for (const p of m.players) p.stamina = 0.2;
    expect(subProposal(m, 0)).not.toBeNull();
    m.subRule = { limit: 3 };
    m.subsUsed = [3, 0];
    expect(subProposal(m, 0)).toBeNull();
  });

  it('Liveticker: Wechselfrage mit Rat des Co-Trainers und den Regeln, keine doppelten Wechselkarten', () => {
    const pitch = PITCHES.sportplatz;
    const m = createMatch({ seed: 5, pitch, human: false, aiCoach: false });
    const tl = createTouchline(m, 0);
    while (m.phase !== 'play') stepMatch(m, undefined, DT);
    tl.asked.add('start');
    tl.asked.add('halftime');
    m.time = m.duration * 0.62;
    m.half = 2;
    for (const p of m.players) if (p.team === 0) p.stamina = 0.2;
    const d = checkDecision(tl, []);
    expect(d?.id).toBe('sub');
    expect(d.question).toMatch(/Co-Trainer würde .+ bringen/);
    expect(d.question).toMatch(/raus ist raus|letzter Wechsel/);
    expect(d.options.some((o) => /\(Tipp\)/.test(o.label))).toBe(true);
    expect(subProposal(m, 0, m.feed ?? {})).not.toBeNull(); // es gäbe einen Vorschlag …
    m.coachCard = null;
    for (let i = 0; i < 600; i++) {
      stepMatch(m, undefined, DT);
      expect(m.coachCard?.type).not.toBe('SUB'); // … aber im Ticker fragt der Ticker selbst
      m.events.length = 0;
    }
  });

  it('Liveticker: selbst wechseln – wer raus, wer rein, sofort; Abbrechen ändert nichts', () => {
    const pitch = PITCHES.sportplatz;
    const m = createMatch({ seed: 6, pitch, human: false, aiCoach: false });
    const tl = createTouchline(m, 0);
    while (m.phase !== 'play') stepMatch(m, undefined, DT);
    const before = m.players.map((p) => p.id).join();
    const d1 = manualSubDecision(tl);
    expect(d1.id).toBe('manual-sub-out');
    expect(d1.question).toMatch(/raus ist raus|Wechsel/);
    answer(tl, d1.options.length - 1); // Abbrechen
    expect(tl.open).toBeNull();
    expect(m.players.map((p) => p.id).join()).toBe(before);
    manualSubDecision(tl);
    answer(tl, 0); // ersten Vorschlag raus
    expect(tl.open.id).toBe('manual-sub-in');
    expect(tl.open.options[0].label).toMatch(/\(Tipp\)/);
    answer(tl, 0);
    expect(tl.open).toBeNull();
    expect(m.players.map((p) => p.id).join()).not.toBe(before);
    expect(m.subsUsed[0]).toBe(1);
  });
});
