import { describe, expect, it } from 'vitest';
import { applySimple, ORDERS, packLines, simpleActive, SIMPLE, SIMPLE_IDS } from '../src/sim/commands.js';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { trainerCard } from '../src/ui/world.js';

// UI 3.0 Phase 4: Trainerkarten zeigen nur, was das Befehlspaket wirklich setzt – und das
// Ausspielen geht über dieselbe Funktion wie früher der Knopf (applySimple).
describe('Trainerkarten', () => {
  it('jede Karte nennt genau die Befehle, die ihr Paket einschaltet', () => {
    for (const id of SIMPLE_IDS) {
      const on = Object.entries(SIMPLE[id].orders).filter(([, v]) => v);
      expect(packLines(id)).toEqual(on.map(([g, v]) => ORDERS[`${g}:${v}`].label));
      expect(packLines(id).length).toBeGreaterThan(0);
    }
    expect(packLines('gibtsnicht')).toEqual([]);
  });

  it('Karte ist ein Knopf mit Zustand; aktiv trägt den Stempel, Text wird maskiert', () => {
    const off = trainerCard({ action: 'simple', value: 'pressing', title: 'Pressing', lines: ['Hoch <b>'] });
    expect(off).toMatch(/^<button class="m-tcard"/);
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('Hoch &lt;b&gt;');
    expect(off).not.toContain('m-stamp');
    const on = trainerCard({ action: 'simple', value: 'pressing', title: 'Pressing', active: true, played: true });
    expect(on).toContain('class="m-tcard active m-play"');
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('m-stamp');
  });

  it('Ausspielen im Spiel: Paket aktiv, danach zeigt die Karte „aktiv"', () => {
    const m = createMatch({ seed: 3, pitch: PITCHES.ascheplatz, human: false });
    expect(simpleActive(m, 0, 'konter')).toBe(false);
    applySimple(m, 0, 'konter');
    expect(simpleActive(m, 0, 'konter')).toBe(true);
  });
});
