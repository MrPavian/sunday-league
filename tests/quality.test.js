import { describe, expect, it } from 'vitest';
import { cameraViewHeight, computeRaster, createGovernor, DENSITY, detectPlatform, LADDER, pickInitialQuality, QUALITY } from '../src/render/quality.js';

describe('Pixelraster', () => {
  it('ist ganzzahlig in Gerätepixeln, auch bei DPR 2,625', () => {
    for (const [w, h, dpr, t] of [[915, 412, 2.625, 330], [1280, 720, 1, 384], [1920, 1080, 1, 384], [390, 844, 3, 330], [1366, 768, 1.25, 360]]) {
      const r = computeRaster(w, h, dpr, t);
      expect(Number.isInteger(r.pixelSize)).toBe(true);
      expect(r.canvasWidth).toBe(r.width * r.pixelSize);
      expect(r.canvasHeight).toBe(r.height * r.pixelSize);
      expect(r.canvasWidth).toBeLessThanOrEqual(Math.round(w * dpr));
      expect(r.canvasHeight).toBeLessThanOrEqual(Math.round(h * dpr));
      expect(Number.isInteger(r.left) && Number.isInteger(r.top)).toBe(true);
      expect(r.left * 2 + r.canvasWidth - r.devWidth).toBeLessThanOrEqual(1);
      expect(r.devWidth - r.canvasWidth).toBeLessThan(r.pixelSize);
    }
  });
  it('Handy 915×412 @2,625: 3 Gerätepixel je Pixel, 360 px hoch', () => {
    const r = computeRaster(915, 412, 2.625, QUALITY.ANDROID_MEDIUM.internalHeight);
    expect(r).toMatchObject({ pixelSize: 3, height: 360 });
  });
  it('PC 1280×720: wie bisher 640×360 bei Pixelgröße 2', () => {
    expect(computeRaster(1280, 720, 1, QUALITY.PC_HIGH.internalHeight)).toMatchObject({ pixelSize: 2, width: 640, height: 360 });
  });
});

describe('Pixeldichte', () => {
  it('zieht die Spielorte Richtung Referenz, ohne sie gleichzumachen', () => {
    expect(cameraViewHeight(DENSITY.reference)).toBe(DENSITY.reference);
    expect(cameraViewHeight(15)).toBeLessThan(15);
    expect(cameraViewHeight(15)).toBeGreaterThan(DENSITY.reference);
    expect(cameraViewHeight(11)).toBeGreaterThan(11);
  });
});

describe('Qualität', () => {
  it('Plattform und Startstufe', () => {
    expect(detectPlatform({ navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)' } })).toBe('android');
    expect(detectPlatform({ navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' } })).toBe('pc');
    expect(pickInitialQuality({ platform: 'pc', gpu: 'ANGLE (Google, SwiftShader)' })).toBe('PC_LOW');
    expect(pickInitialQuality({ platform: 'pc', gpu: 'NVIDIA GeForce RTX 3060' })).toBe('PC_HIGH');
    expect(pickInitialQuality({ platform: 'android', gpu: 'Mali-G57' })).toBe('ANDROID_MEDIUM');
    expect(pickInitialQuality({ platform: 'android', gpu: 'Adreno (TM) 740' })).toBe('ANDROID_HIGH');
    for (const id of Object.keys(QUALITY)) expect(LADDER[QUALITY[id].platform]).toContain(id);
  });
  it('Android ohne Bloom', () => {
    for (const id of LADDER.android) expect(QUALITY[id].bloom).toBe(false);
  });
});

describe('Automatik', () => {
  const run = (g, fps, seconds) => {
    const out = [];
    for (let t = 0; t < seconds; t += 1 / fps) {
      const r = g.sample(1 / fps, true);
      if (r) out.push(r);
    }
    return out;
  };
  it('geht bei dauerhaftem Ruckeln eine Stufe runter – nicht sofort', () => {
    const g = createGovernor('PC_HIGH', { platform: 'pc' });
    expect(run(g, 30, 25)).toEqual([]); // Mindestverweildauer
    expect(run(g, 30, 10)).toEqual(['PC_MEDIUM']);
  });
  it('schwankt nicht an der Grenze', () => {
    const g = createGovernor('PC_HIGH', { platform: 'pc' });
    const out = [];
    for (let i = 0; i < 60; i++) out.push(...run(g, i % 2 ? 38 : 58, 4));
    expect(out.length).toBeLessThanOrEqual(1);
  });
  it('steigt nie über die Startstufe und wechselt begrenzt oft', () => {
    const g = createGovernor('PC_MEDIUM', { platform: 'pc' });
    expect(run(g, 120, 300)).toEqual([]);
    const h = createGovernor('PC_ULTRA', { platform: 'pc' });
    const out = [];
    for (let i = 0; i < 20; i++) out.push(...run(h, 20, 40), ...run(h, 120, 60));
    expect(out.length).toBeLessThanOrEqual(3);
  });
  it('ohne Automatik kein Wechsel', () => {
    const g = createGovernor('PC_HIGH', { platform: 'pc', auto: false });
    expect(run(g, 10, 120)).toEqual([]);
  });
});

describe('Gemessene Gerätepixel', () => {
  it('haben Vorrang vor der Schätzung aus CSS × DPR', () => {
    const r = computeRaster(915, 412, 2.625, 330, { width: 2401, height: 1081 });
    expect(r).toMatchObject({ devWidth: 2401, devHeight: 1081, pixelSize: 3, width: 800, height: 360, left: 0, top: 0 });
  });
});

describe('Hochformat', () => {
  it('richtet die Pixelgröße nach der kurzen Seite', () => {
    const r = computeRaster(412, 915, 2.625, QUALITY.ANDROID_MEDIUM.internalHeight);
    expect(r.width).toBe(360);
    expect(r.pixelSize).toBe(3);
  });
});

describe('Stufen', () => {
  it('haben alle Pflichtwerte', () => {
    for (const [id, q] of Object.entries(QUALITY)) {
      for (const k of ['internalHeight', 'shadowMap', 'shadowHz', 'ao', 'bloom', 'dither', 'edges', 'particles', 'weather', 'spectators']) expect(q, `${id}.${k}`).toHaveProperty(k);
      expect([0, 8, 16]).toContain(q.ao);
      expect(q.weather).toBeGreaterThan(0);
      expect(q.weather).toBeLessThanOrEqual(1);
    }
  });
  it('Android schont: Schatten höchstens 30 Hz, höchstens 8 AO-Abfragen', () => {
    for (const id of LADDER.android) {
      expect(QUALITY[id].shadowHz).toBeLessThanOrEqual(30);
      expect(QUALITY[id].ao).toBeLessThanOrEqual(8);
    }
  });
  it('Raster je Stufe und Bildschirm bleibt ganzzahlig und bei ~30 px/m', () => {
    const screens = [[1920, 1080, 1], [2560, 1440, 1], [3840, 2160, 1], [1280, 720, 1], [915, 412, 2.625], [740, 360, 3], [412, 915, 2.625]];
    for (const [id, q] of Object.entries(QUALITY)) {
      for (const [w, h, dpr] of screens) {
        const r = computeRaster(w, h, dpr, q.internalHeight);
        expect(Number.isInteger(r.pixelSize)).toBe(true);
        const short = Math.min(r.width, r.height);
        expect(short, `${id} ${w}x${h}`).toBeGreaterThanOrEqual(q.internalHeight * 0.66);
        expect(short, `${id} ${w}x${h}`).toBeLessThanOrEqual(q.internalHeight * 1.5);
      }
    }
  });
});

describe('Pixel-Look bleibt', () => {
  it('ULTRA auf 720p rendert nicht mit 1×1-Pixeln', () => {
    const r = computeRaster(1280, 720, 1, QUALITY.PC_ULTRA.internalHeight);
    expect(r.pixelSize).toBeGreaterThanOrEqual(2);
    expect(r.height).toBeLessThanOrEqual(QUALITY.PC_ULTRA.internalHeight * 1.25);
  });
});
