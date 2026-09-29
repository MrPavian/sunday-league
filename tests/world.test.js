import { describe, expect, it } from 'vitest';
import { handLayers, lockScreen, phone, pixelSVG, playerCard, stamp } from '../src/ui/world.js';

// UI 3.0 Phase 1: Materialien der Vereinswelt – reine Präsentation, bedienbar ohne Animation.
describe('Vereinswelt-Bausteine', () => {
  it('Pixelbild: ein Rechteck je gesetztem Pixel, leere Zeichen bleiben leer', () => {
    const svg = pixelSVG(['k.', '.s'], { k: '#000', s: '#fff' });
    expect(svg.match(/<rect /g)).toHaveLength(2);
    expect(svg).toContain('viewBox="0 0 2 2"');
  });

  it('Hand übernimmt den Hautton des Trainers; Handy-Display ist echtes HTML', () => {
    const h = handLayers(0x8d5524);
    expect(h.back).toContain('#8d5524');
    expect(h.front).toContain('m-thumb');
    const p = phone('<button data-action="x">Hallo</button>', { lit: true });
    expect(p).toContain('class="m-phone lit"');
    expect(p).toContain('<button data-action="x">Hallo</button>');
    expect(p).toContain('role="group"');
  });

  it('Sperrbildschirm zeigt Uhrzeit und Benachrichtigungen, Texte maskiert', () => {
    const s = lockScreen({ time: 'Sa 18:40', notes: [{ from: '<b>Ede</b>', text: 'Bin da & pünktlich' }] });
    expect(s).toContain('18:40');
    expect(s).toContain('&lt;b&gt;Ede&lt;/b&gt;');
    expect(s).toContain('Bin da &amp; pünktlich');
    expect(s).toContain('data-action="phone-open"');
  });

  it('Spielerkarte: beide Seiten im DOM, genau eine für Screenreader sichtbar, Umdrehen per Knopf', () => {
    const front = playerCard({ id: 7, name: 'Schmidt', pos: 'Abwehr', rating: 72, attrs: [['Tempo', 61]] });
    expect(front).toMatch(/m-face front" aria-hidden="false"/);
    expect(front).toMatch(/m-face back" aria-hidden="true"/);
    expect(front).toContain('data-flip="7"');
    expect(front).toContain('aria-pressed="false"');
    const back = playerCard({ id: 7, name: 'Schmidt', pos: 'Abwehr', rating: 72, flipped: true });
    expect(back).toContain('m-card flipped');
    expect(back).toMatch(/m-face back" aria-hidden="false"/);
    expect(stamp('Aktiv')).toContain('m-stamp');
  });
});
