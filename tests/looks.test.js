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

  it('Vielfalt: neue Frisuren, Bärte und Zubehör kommen vor, in gemessenen Anteilen, ohne die Figur zu sprengen', () => {
    const ps = players(500, 4);
    const ms = ps.map((p) => createPlayerModel(p.look, kit));
    const share = (f) => ms.filter(f).length / ms.length;
    // Gemessen über Seeds 4, 9, 21 (je 500): Spanne mit Luft nach beiden Seiten.
    for (const h of ['bun', 'undercut', 'afro', 'ponytail', 'mullet', 'coils']) {
      const s = share((m) => m.hairStyle === h);
      expect(s, h).toBeGreaterThan(0.01);
      expect(s, h).toBeLessThan(0.07);
    }
    for (const b of ['goatee', 'sideburns', 'handlebar']) {
      const s = share((m) => m.features.beard === b);
      expect(s, b).toBeGreaterThan(0.015);
      expect(s, b).toBeLessThan(0.08);
    }
    const spans = { socksDown: [0.15, 0.3], sweat: [0.07, 0.17], tapeFoot: [0.04, 0.14], tapeHand: [0.02, 0.1], specs: [0.015, 0.08] };
    for (const [k, [lo, hi]] of Object.entries(spans)) {
      const s = share((m) => m.extras[k]);
      expect(s, k).toBeGreaterThan(lo);
      expect(s, k).toBeLessThan(hi);
    }
    // Nicht jeder trägt Zubehör: höchstens etwa die Hälfte, mindestens ein Drittel.
    const any = share((m) => Object.values(m.extras).some(Boolean));
    expect(any).toBeGreaterThan(0.33);
    expect(any).toBeLessThan(0.55);
    // Weiter ein Mesh, ein Material; Dreiecke im Rahmen (vorher im Mittel 496, Obergrenze +15 %).
    for (const m of ms.slice(0, 40)) {
      expect(m.group.children).toHaveLength(1);
      expect(m.mesh.isSkinnedMesh).toBe(true);
    }
    const tris = ms.map((m) => m.mesh.geometry.attributes.position.count / 3);
    expect(tris.reduce((a, b) => a + b, 0) / tris.length).toBeLessThanOrEqual(496 * 1.15);
    for (const m of ms) expect(m.mesh.geometry.attributes.position.count / 3).toBeLessThanOrEqual(700);
  });

  it('neue Bärte sind gemalt: Ziegenbart am Kinn, Koteletten seitlich, breiter Schnauzer über der Lippe', () => {
    const f = { eyes: 'dot', brows: 'thin', nose: 'dot', mouth: 'small' };
    const none = faceArt('neutral', { ...f, beard: 'none' });
    const goatee = faceArt('neutral', { ...f, beard: 'goatee' });
    const side = faceArt('neutral', { ...f, beard: 'sideburns' });
    const wide = faceArt('neutral', { ...f, beard: 'handlebar' });
    const moustache = faceArt('neutral', { ...f, beard: 'moustache' });
    expect(goatee[7]).toContain('h');
    expect(goatee[4]).not.toContain('h');
    expect(side[3][0]).toBe('h');
    expect(side[3][7]).toBe('h');
    expect(wide[4].split('h').length - 1).toBeGreaterThan(moustache[4].split('h').length - 1);
    for (const a of [goatee, side, wide]) expect(a.join('')).not.toBe(none.join(''));
  });

  it('bisherige Merkmale bleiben: Bart der Bartträger ändert sich nur bei höchstens 40 %, Frisuren bei höchstens 30 %', () => {
    // Alte Frisur und alter Bart sind aus denselben Hash-Bits wie vorher; nur ein eigener Würfel überschreibt sie.
    const ps = players(500, 4);
    const ms = ps.map((p) => createPlayerModel(p.look, kit));
    const old = new Set(['short', 'sidepart', 'spiky', 'long', 'curly', 'mohawk', 'buzz', 'bald']);
    const keptHair = ms.filter((m) => old.has(m.hairStyle)).length / ms.length;
    expect(keptHair).toBeGreaterThan(0.7);
    const beardMs = ms.filter((_, i) => ps[i].look.beard);
    const keptBeard = beardMs.filter((m) => ['short', 'full', 'moustache'].includes(m.features.beard)).length / beardMs.length;
    expect(keptBeard).toBeGreaterThan(0.6);
  });

  it('Dreiecke-Obergrenze 700 gilt für alle Spieler und Torhüter, über 1000+ Looks aus mehreren Seeds', () => {
    let n = 0;
    let max = 0;
    for (const seed of [31, 32, 33, 34, 35, 36]) {
      for (const p of players(250, seed)) {
        for (const keeper of [false, true]) {
          const m = createPlayerModel(p.look, kit, { keeper });
          max = Math.max(max, m.mesh.geometry.attributes.position.count / 3);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(1000);
    expect(max).toBeLessThanOrEqual(700);
  });

  it('Schiedsrichter (edge neutral) trägt nie eine Sportbrille', () => {
    for (const p of players(300, 5)) expect(createPlayerModel(p.look, kit, { edge: 'neutral' }).extras.specs).toBe(false);
  });

  it('Dreiecke bleiben im Rahmen (Low Poly)', () => {
    const tris = players(200, 11).map((p) => createPlayerModel(p.look, kit).mesh.geometry.attributes.position.count / 3);
    expect(Math.max(...tris)).toBeLessThanOrEqual(700);
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
