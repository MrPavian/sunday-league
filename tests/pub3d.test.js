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

  it('hochkant: näher ran, Wischen schwenkt in Grenzen, focus fährt zur Person; quer der ganze Raum ohne Schwenk', () => {
    const c = createCareer({ seed: 5 });
    const cast = pubCast(c).map((idx) => ({ id: idx, look: playerOf(c, idx).look }));
    const v = new PubView({ club: humanClub(c), cast, seed: 1 });
    v.frameRect({ x: 0, y: 0, width: 360, height: 270 }, 360, 800);
    expect(v.zoomed).toBe(true);
    v.focus('wirt');
    for (let i = 0; i < 120; i++) v.update(1 / 60);
    expect(v.camera.position.x).toBeLessThan(-1);
    expect(Math.abs(v.screenOf('wirt', 360, 800).x - 180)).toBeLessThan(60); // der Wirt steht etwa in der Mitte
    v.drag(-10000); // weit nach links gewischt: am rechten Rand Schluss
    expect(v.camera.position.x).toBeCloseTo(v.maxPan, 5);
    v.drag(10000);
    expect(v.camera.position.x).toBeCloseTo(-v.maxPan, 5);
    const wide = new PubView({ club: humanClub(c), cast, seed: 1 });
    wide.frameRect({ x: 0, y: 0, width: 900, height: 300 }, 900, 600);
    expect(wide.zoomed).toBe(false);
    wide.drag(500);
    expect(wide.camera.position.x).toBe(0);
    v.dispose();
    wide.dispose();
  });
});
