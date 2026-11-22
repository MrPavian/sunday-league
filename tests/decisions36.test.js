// Entscheidungsmomente im Liveticker (Gameplay 2.0, Punkt 36): Elfmeterschütze, Freistoß-Variante, Gelb-Rot droht.
import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { attackDir } from '../src/sim/players.js';
import { penaltySpot, startSetPiece } from '../src/sim/setpieces.js';
import { answer, checkDecision, createTouchline } from '../src/sim/touchline.js';

const DT = 1 / 60;

function ticker(seed = 8) {
  const m = createMatch({ seed, pitch: PITCHES.sportplatz, human: false, aiCoach: false });
  const tl = createTouchline(m, 0);
  while (m.phase !== 'play') stepMatch(m, undefined, DT);
  tl.asked.add('start');
  m.events.length = 0;
  return { m, tl };
}

// Bis die nächste Aktion des Schützen kommt (Schuss oder Pass), höchstens 6 s.
function firstAction(m, id) {
  for (let i = 0; i < 360; i++) {
    stepMatch(m, undefined, DT);
    const e = m.events.find((x) => (x.type === 'shot' || x.type === 'pass') && x.playerId === id);
    m.events.length = 0;
    if (e) return e;
  }
  return null;
}

describe('Entscheidungsmomente', () => {
  it('Elfmeter: Frage mit dem vorgesehenen Schützen zuerst; ein anderer gewählt, dann schießt der', () => {
    const { m, tl } = ticker();
    startSetPiece(m, { type: 'penalty', team: 0, spot: penaltySpot(m, 0) });
    const first = m.setPiece.takerId;
    const d = checkDecision(tl, m.events);
    expect(d?.id).toBe('penalty');
    expect(d.options.length).toBeGreaterThanOrEqual(2);
    expect(d.options[0].label).toContain(m.players.find((p) => p.id === first).name.split(' ').slice(-1)[0]);
    answer(tl, 1);
    const chosen = m.setPiece.takerId;
    expect(chosen).not.toBe(first);
    m.events.length = 0;
    const e = firstAction(m, chosen);
    expect(e?.type).toBe('shot');
  });

  it('Freistoß vor dem Tor: „direkt“ schießt, „Flanke“ flankt; die erste Antwort lässt den Schützen entscheiden', () => {
    for (const [choice, type] of [[1, 'shot'], [2, 'pass']]) {
      const { m, tl } = ticker(9);
      const s = attackDir(m, 0);
      startSetPiece(m, { type: 'freekick', team: 0, spot: { x: s * (m.pitch.halfLength - 16), z: 2 } });
      const d = checkDecision(tl, m.events);
      expect(d?.id).toBe('freekick');
      expect(d.options[0].apply).toBeUndefined(); // „soll selbst entscheiden“
      answer(tl, choice);
      m.events.length = 0;
      const e = firstAction(m, m.setPiece.takerId);
      expect(e?.type).toBe(type);
      if (type === 'pass') expect(e.lofted).toBeTruthy();
    }
  });

  it('Gelb: weiter (nichts ändert sich), vorsichtig (keine Grätsche mehr) oder runter (Wechsel)', () => {
    for (const choice of [0, 1, 2]) {
      const { m, tl } = ticker(10);
      const p = m.players.find((q) => q.team === 0 && q.role === 'def');
      p.yellow = 1;
      const d = checkDecision(tl, [{ type: 'card', color: 'yellow', playerId: p.id }]);
      expect(d?.id).toBe(`yellow:${p.id}`);
      expect(d.options.length).toBe(3);
      answer(tl, choice);
      if (choice === 0) expect(!!p.cautious || !m.players.includes(p)).toBe(false);
      if (choice === 1) expect(p.cautious).toBe(true);
      if (choice === 2) expect(m.players.includes(p)).toBe(false);
    }
  });

  it('„vorsichtig“ wirkt: kaum noch Fouls (gemessen 1,7 → 0,3 je Spiel), nicht mehr Karten', () => {
    const fouls = (caut) => {
      let n = 0;
      for (let i = 0; i < 6; i++) {
        const m = createMatch({ seed: 700 + i, pitch: PITCHES.sportplatz, human: false, aiCoach: false });
        while (m.phase !== 'ended') {
          if (caut) for (const p of m.players) if (p.team === 0) p.cautious = true;
          stepMatch(m, undefined, DT);
          for (const e of m.events) if (e.type === 'foul' && m.players.concat(m.sentOff ?? []).find((q) => q.id === e.playerId)?.team === 0) n++;
          m.events.length = 0;
        }
      }
      return n;
    };
    expect(fouls(true)).toBeLessThan(fouls(false) * 0.6);
  }, 240000);
});
