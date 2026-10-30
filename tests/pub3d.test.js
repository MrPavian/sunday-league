// Kneipe als 3D-Raum (ROADMAP 11.12): wer da ist (fest je Woche), Szene ohne Bildschirm baubar, Marker für jede Person.
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, playerOf } from '../src/career/career.js';
import { isCoach } from '../src/career/personal.js';
import { pubCast } from '../src/ui/clubhouse/pub.js';
import { PubView } from '../src/render/pub/PubView.js';

describe('Kneipe 3D', () => {
  it('Besetzung: bis zu sieben Mitspieler, ohne den Trainer, fest je Woche und wechselnd zwischen den Wochen', () => {
    const c = createCareer({ seed: 5 });
    const a = pubCast(c);
    expect(a.length).toBeLessThanOrEqual(7);
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((idx) => humanClub(c).squad.includes(idx) && !isCoach(c, idx))).toBe(true);
    expect(pubCast(c)).toEqual(a);
    c.round = 3;
    expect(pubCast(c)).not.toEqual(a);
  });

  it('Szene: Wirt, Opa Heinz und die Besetzung als Figuren; jeder Ansprechpartner hat einen Platz im Bild', () => {
    const c = createCareer({ seed: 5 });
    const cast = pubCast(c).map((idx) => ({ id: idx, look: playerOf(c, idx).look }));
    const v = new PubView({ club: humanClub(c), cast, titles: [2027, 2029], seed: 1 });
    expect(v.actors.map((a) => a.id)).toEqual(['wirt', 'heinz', ...cast.map((p) => `p${p.id}`)]);
    v.frameRect({ x: 0, y: 0, width: 800, height: 300 }, 800, 600);
    for (const id of ['wirt', 'heinz', 'dart', ...cast.map((p) => `p${p.id}`)]) {
      const at = v.screenOf(id, 800, 600);
      expect(at, id).not.toBeNull();
      expect(at.x).toBeGreaterThan(0);
      expect(at.x).toBeLessThan(800);
      expect(at.y).toBeGreaterThan(0);
      expect(at.y).toBeLessThan(300);
    }
    for (let i = 0; i < 400; i++) v.update(1 / 60); // trinken, reden, Darts: läuft ohne Fehler
    expect(v.darts.length).toBeGreaterThan(0);
    expect(v.darts.length).toBeLessThanOrEqual(3);
    expect(v.talker()).toBeTruthy();
    v.dispose();
  });
});
