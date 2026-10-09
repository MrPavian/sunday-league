import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { enableManager } from '../src/sim/coach.js';
import { setOrder } from '../src/sim/plan.js';
import { answerCard } from '../src/sim/coachfeed.js';
import { allPlayers, planSub, usableBench } from '../src/sim/squad.js';
import { matchdaySurprise } from '../src/career/matchday.js';
import { createRng } from '../src/core/rng.js';

// Einfrieren im 3D-Spiel (Trainermodus): Die Spieltags-Überraschung „Stau" nimmt einen Spieler aus
// m.players und bringt ihn bei 33 % der Spielzeit zurück. allPlayers() kannte ihn nicht, also baute
// MatchView kein Modell für ihn; bei seiner Ankunft warf view.sync in jedem Bild, und die
// requestAnimationFrame-Kette in main.js brach ab – Spieler, Ball und Uhr standen, die Menüs (DOM)
// liefen weiter. Im Browser reproduziert; hier die Bedingung, an der es hing.
function stauMatch(duration = 90) {
  for (let s = 1; s < 500; s++) {
    const m = createMatch({ seed: s, pitch: PITCHES.ascheplatz, human: true, duration, incidents: true });
    m.bench[0] = []; // ohne Ersatzmann kommt er später aufs Feld (mit Bank rückt einer nach)
    if (matchdaySurprise(m, 0, createRng(s), 1)?.id === 'stau') return m;
  }
  throw new Error('kein Stau-Seed');
}

describe('3D-Spiel friert nicht ein', () => {
  it('jeder, der im Spiel je auf den Platz kommt, steht schon beim Anpfiff in allPlayers (daraus baut MatchView die Modelle)', () => {
    const m = stauMatch();
    enableManager(m);
    const known = new Set(allPlayers(m).map((p) => p.id)); // = Modelle der 3D-Ansicht
    expect(known.has(m.lateArrival.player.id)).toBe(true);
    const late = m.lateArrival.player;
    let arrived = false;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      arrived ||= m.events.some((e) => e.type === 'late_arrival');
      m.events.length = 0;
      for (const p of m.players) expect(known.has(p.id)).toBe(true);
    }
    expect(arrived).toBe(true);
    expect(m.players).toContain(late);
    expect(allPlayers(m).filter((p) => p.id === late.id)).toHaveLength(1); // nach der Ankunft nicht doppelt
  }, 60_000);

  // Regression „Simulation läuft weiter": Trainermodus mit Befehlen, Karten, Wechseln, Vorfällen –
  // die Uhr bleibt nie länger stehen als eine echte Unterbrechung, und das Spiel endet.
  it('Simulation läuft weiter: Uhr steht nie länger als eine Unterbrechung, jedes Spiel endet', () => {
    const GROUPS = { build: ['halten', 'kurz', 'direkt'], route: ['aussen', 'mitte', 'tiefe', 'konter'], press: ['hoch', 'mittel', 'tief'], shape: ['aufruecken', 'kompakt'], risk: ['sicher', 'aggressiv'] };
    for (const [seed, pitch] of [[3, 'ascheplatz'], [11, 'halle'], [19, 'rasenplatz'], [27, 'parkplatz']]) {
      const m = createMatch({ seed, pitch: PITCHES[pitch], human: true, duration: 150, incidents: true });
      m.incidentPlan = { type: { ascheplatz: 'polizei', halle: 'polizei', rasenplatz: 'hund', parkplatz: 'polizei' }[pitch], at: 30 };
      m.knockout = seed === 27;
      enableManager(m);
      const r = createRng(seed).next;
      let steps = 0;
      let still = 0;
      let last = m.time;
      while (m.phase !== 'ended' && steps < 60 * 900) {
        let input;
        if (r() < 0.003) input = { shout: 1 + Math.floor(r() * 4) };
        if (m.coachCard && r() < 0.02) answerCard(m, 0, Math.floor(r() * m.coachCard.options.length));
        if (r() < 0.002) {
          const g = Object.keys(GROUPS)[Math.floor(r() * 5)];
          setOrder(m, 0, g, r() < 0.3 ? null : GROUPS[g][Math.floor(r() * GROUPS[g].length)]);
        }
        if (r() < 0.001) {
          const out = m.players.find((p) => p.team === 0 && p.role !== 'gk');
          const inn = usableBench(m, 0)[0];
          if (out && inn) planSub(m, 0, out.id, inn.id);
        }
        stepMatch(m, input, 1 / 60);
        m.events.length = 0;
        steps++;
        still = m.time === last ? still + 1 : 0;
        last = m.time;
        // Längste gewollte Pause: Vorfall (Hund bis 14 s) bzw. Elfmeterschießen läuft mit eigener Uhr.
        if (m.phase !== 'shootout') expect(still).toBeLessThan(60 * 20);
      }
      expect(m.phase).toBe('ended');
      expect(Number.isFinite(m.ball.pos.x + m.ball.pos.z)).toBe(true);
    }
  }, 120_000);
});
