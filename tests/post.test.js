import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { emissiveToon, keepAlpha, LIGHT_CODE } from '../src/render/materials.js';
import { EDGE_CODE } from '../src/render/PlayerModel.js';
import { DECAL_CODE } from '../src/render/weather.js';
import { BLOOM } from '../src/render/PixelRenderer.js';
import { LADDER, QUALITY } from '../src/render/quality.js';

// Der Post-Shader liest Kennungen aus dem Alphakanal (8 Bit). Sie dürfen sich nicht überlappen.
const in8 = (v) => Math.round(v * 255) / 255;
const isCharacter = (a) => a < 0.9;
const noCover = (a) => a < 0.97;
const isLight = (a) => a >= 0.975 && a <= 0.995;

describe('Phase 7 – Post-Processing', () => {
  it('Kennungen im Alphakanal sind eindeutig (Figuren, Ball, Zuschauer/Decals, Lichter, Rest)', () => {
    for (const v of Object.values(EDGE_CODE)) expect(isCharacter(in8(v)) && !isLight(in8(v))).toBe(true);
    expect(isCharacter(in8(DECAL_CODE))).toBe(false);
    expect(noCover(in8(DECAL_CODE))).toBe(true);
    expect(isLight(in8(DECAL_CODE))).toBe(false);
    expect(isLight(in8(LIGHT_CODE))).toBe(true);
    expect(noCover(in8(LIGHT_CODE)) || isCharacter(in8(LIGHT_CODE))).toBe(false);
    expect(isLight(1)).toBe(false); // gewöhnliche Kulisse speist kein Bloom
  });

  it('nur Leuchtmaterialien tragen die Licht-Kennung; Transparenzen lassen den Alphakanal stehen', () => {
    const lamp = emissiveToon(0xfff2c8, 0xfff2c8, 1);
    expect(lamp.opacity).toBe(LIGHT_CODE);
    expect(lamp.blending).toBe(THREE.NoBlending);
    const drop = keepAlpha(new THREE.PointsMaterial({ transparent: true, opacity: 0.4 }));
    expect(drop.blending).toBe(THREE.CustomBlending);
    expect(drop.blendSrcAlpha).toBe(THREE.ZeroFactor);
    expect(drop.blendDstAlpha).toBe(THREE.OneFactor);
  });

  it('Bloom je Stufe: PC LOW und Android LOW ohne, Android nur reduziert, ULTRA mit zweitem Weichzeichner', () => {
    expect(QUALITY.PC_LOW.bloom).toBe(false);
    expect(QUALITY.PC_LOW.bloomLite).toBe(0);
    expect(QUALITY.ANDROID_LOW.bloom).toBe(false);
    expect(QUALITY.ANDROID_LOW.bloomLite).toBe(0);
    for (const id of ['PC_MEDIUM', 'ANDROID_MEDIUM', 'ANDROID_HIGH']) expect(QUALITY[id].bloomLite).toBeGreaterThan(0);
    for (const id of LADDER.android) expect(QUALITY[id].bloom).toBe(false); // nie volle Auflösung
    expect(QUALITY.PC_ULTRA.bloomBlur).toBe(2);
    expect(BLOOM.lite.res).toBeLessThan(BLOOM.full.res);
    expect(BLOOM.full.res).toBeLessThanOrEqual(0.5); // nie in voller interner Auflösung
    // Stärke ≈ 0,05–0,2 bei den Looks (bloom 0,15…0,8)
    expect(0.15 * BLOOM.intensity).toBeGreaterThanOrEqual(0.04);
    expect(0.6 * BLOOM.intensity).toBeLessThanOrEqual(0.2);
  });

  it('Vignette höchstens auf hohen Stufen, einfache Kanten auf den niedrigsten', () => {
    for (const id of ['PC_LOW', 'PC_MEDIUM', 'ANDROID_LOW', 'ANDROID_MEDIUM']) expect(QUALITY[id].vignette).toBe(false);
    expect(QUALITY.PC_LOW.edges).toBe(1);
    expect(QUALITY.ANDROID_LOW.edges).toBe(1);
    expect(QUALITY.PC_HIGH.edges).toBe(2);
  });
});
