import { describe, expect, it } from 'vitest';
import { animatePlayer, createPlayerModel, faceArt, FACE_PARTS, FACES } from '../src/render/PlayerModel.js';
import { createRng } from '../src/core/rng.js';
import { generatePlayer } from '../src/sim/generator.js';

const kit = { shirt: 0xc0392b, shorts: 0xffffff, socks: 0xc0392b };
const players = (n, seed = 4) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => generatePlayer(rng, { role: 'mf' }));
};

describe('Player 2.0 Polish – Gesichter, Frisuren, Reaktionen (nur Darstellung)', () => {
  it('Gesichter: 8 Ausdrücke à 8 × 8 passen in die Atlas-Kachel, jedes Gesicht ist 8 × 8', () => {
    expect(FACES).toEqual(['neutral', 'happy', 'angry', 'pain', 'sad', 'effort', 'surprised', 'exhausted']);
    expect(64 + Math.min(7, FACES.length) * 8).toBeLessThanOrEqual(120); // Kachel: Gesichter vor den Hilfspixeln
    expect(Math.ceil(FACES.length / 7) * 8).toBeLessThanOrEqual(16); // weitere Reihen passen in die Kachelhöhe
    for (const e of FACES) {
      const art = faceArt(e, { eyes: 'tall', brows: 'mono', nose: 'long', mouth: 'wide', beard: 'full' });
      expect(art).toHaveLength(8);
      for (const row of art) expect(row).toHaveLength(8);
    }
    // Ausdrücke unterscheiden sich wirklich
    const f = { eyes: 'dot', brows: 'thin', nose: 'dot', mouth: 'small', beard: 'none' };
    expect(new Set(FACES.map((e) => faceArt(e, f).join('|'))).size).toBe(FACES.length);
  });

  it('Aussehen ist fest je Spieler (kein Zufall pro Bild) und vielfältig', () => {
    const ps = players(60);
    const a = ps.map((p) => createPlayerModel(p.look, kit));
    const b = ps.map((p) => createPlayerModel(p.look, kit));
    a.forEach((m, i) => {
      expect(m.hairStyle).toBe(b[i].hairStyle);
      expect(m.features).toEqual(b[i].features);
      expect(Array.from(m.mesh.geometry.attributes.position.array)).toEqual(Array.from(b[i].mesh.geometry.attributes.position.array));
    });
    const styles = new Set(a.map((m) => m.hairStyle));
    for (const s of ['short', 'sidepart', 'spiky', 'long', 'curly', 'bald']) expect(styles, s).toContain(s);
    const combos = new Set(a.map((m) => `${m.hairStyle}|${m.features.eyes}|${m.features.brows}|${m.features.nose}|${m.features.mouth}|${m.features.beard}`));
    expect(combos.size).toBeGreaterThan(45); // 60 Spieler, kaum Doppelgänger
    for (const k of Object.keys(FACE_PARTS)) expect(new Set(a.map((m) => m.features[k])).size, k).toBeGreaterThan(1);
  });

  it('Glatze bekommt keine Haarhaube; Bart gibt es als Stoppeln, kurz, voll, Schnauzer', () => {
    const ps = players(200, 9);
    const ms = ps.map((p) => createPlayerModel(p.look, kit));
    for (const [m, p] of ms.map((m, i) => [m, ps[i]])) if (p.look.bald) expect(m.hairStyle).toBe('bald');
    const beards = new Set(ms.map((m) => m.features.beard));
    for (const b of ['none', 'stubble', 'short', 'full', 'moustache']) expect(beards, b).toContain(b);
  });

  it('Dreiecke bleiben im Rahmen (Low Poly)', () => {
    const tris = players(200, 11).map((p) => createPlayerModel(p.look, kit).mesh.geometry.attributes.position.count / 3);
    expect(Math.max(...tris)).toBeLessThanOrEqual(600);
  });

  it('neue Posen (Kontakt, Ducken, Kopfball-Vorbereitung, Ausholen) verändern die Pose und kehren zurück', () => {
    const m = createPlayerModel(players(1)[0].look, kit);
    const base = { speed: 0, dt: 0, kickAnim: 0, headAnim: 0, holding: null, state: 'normal' };
    const snap = () => [m.bones.spine.rotation.x, m.bones.hips.position.y, m.bones.upperLegR.rotation.x, m.bones.head.rotation.x].map((v) => +v.toFixed(4));
    animatePlayer(m, base);
    const idle = snap();
    for (const extra of [{ hit: { t: 0.5, side: 1 } }, { duck: 0.5 }, { headPrep: 0.8 }, { kickPrep: 1 }]) {
      animatePlayer(m, { ...base, ...extra });
      expect(snap(), JSON.stringify(extra)).not.toEqual(idle);
      animatePlayer(m, base);
      expect(snap()).toEqual(idle);
    }
  });
});
