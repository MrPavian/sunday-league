// Grafikqualität: eine zentrale Stelle für alles, was PC und Android unterscheidet –
// interne Auflösung, Schatten, AO, Glühen, Partikel. Die Stufen sind Startwerte und
// werden hier (und nur hier) angepasst.
//
// Grundregel fürs Pixelraster: Intern wird immer mit einer bewusst gewählten Höhe
// gerendert, jedes interne Pixel ist auf dem Bildschirm exakt `pixelSize` Geräte-
// pixel groß (ganzzahlig, auch bei DPR 2,625). Der Browser skaliert nie selbst.

// internalHeight – Zielhöhe des internen Bildes (Pixel); die echte Höhe ergibt sich aus
//                  der ganzzahligen Pixelgröße (1080 Gerätepixel: 330 → 3 → 360 px)
// shadowMap      – Kantenlänge der Schattenkarte
// shadowInterval – Schattenkarte nur jedes n-te Bild neu (1 = jedes Bild)
// ao             – Kontaktschatten-Abfragen im Post-Shader (0 | 8 | 16)
// bloom          – Glühen um helle Stellen (Pseudo-Bloom im Post-Shader)
// dither         – Bayer-Dithering an
// particles      – Größe des Partikel-Pools
// spectators     – Anteil der Zuschauer (für spätere Phasen, 0…1)
export const QUALITY = {
  PC_LOW: { platform: 'pc', internalHeight: 270, shadowMap: 1024, shadowInterval: 2, ao: 0, bloom: false, dither: true, particles: 150, spectators: 0.6 },
  PC_MEDIUM: { platform: 'pc', internalHeight: 360, shadowMap: 2048, shadowInterval: 1, ao: 8, bloom: false, dither: true, particles: 300, spectators: 1 },
  PC_HIGH: { platform: 'pc', internalHeight: 384, shadowMap: 2048, shadowInterval: 1, ao: 16, bloom: true, dither: true, particles: 400, spectators: 1 },
  PC_ULTRA: { platform: 'pc', internalHeight: 480, shadowMap: 4096, shadowInterval: 1, ao: 16, bloom: true, dither: true, particles: 600, spectators: 1 },
  ANDROID_LOW: { platform: 'android', internalHeight: 270, shadowMap: 1024, shadowInterval: 3, ao: 0, bloom: false, dither: true, particles: 120, spectators: 0.5 },
  ANDROID_MEDIUM: { platform: 'android', internalHeight: 330, shadowMap: 1024, shadowInterval: 2, ao: 8, bloom: false, dither: true, particles: 200, spectators: 0.75 },
  ANDROID_HIGH: { platform: 'android', internalHeight: 360, shadowMap: 2048, shadowInterval: 1, ao: 8, bloom: false, dither: true, particles: 250, spectators: 1 },
};
export const QUALITY_IDS = Object.keys(QUALITY);

// Aktive Stufe für Stellen, die beim Aufbau Größen brauchen (Schattenkarte, Partikel).
let active = 'PC_HIGH';
export const currentQuality = () => QUALITY[active];
export const currentQualityId = () => active;
export function setCurrentQuality(id) {
  if (QUALITY[id]) active = id;
}
// Reihenfolge je Plattform, von günstig nach teuer (für die automatische Anpassung).
export const LADDER = {
  pc: ['PC_LOW', 'PC_MEDIUM', 'PC_HIGH', 'PC_ULTRA'],
  android: ['ANDROID_LOW', 'ANDROID_MEDIUM', 'ANDROID_HIGH'],
};

// Pixeldichte: Wie viele Meter zeigt die Kamera senkrecht? Jeder Spielort hat eine
// eigene Wunschhöhe (kleiner Hinterhof eng, großer Rasen weit). Damit die Figuren
// überall ähnlich groß wirken, wird sie Richtung REFERENCE gezogen (blend 0 = wie
// der Spielort will, 1 = überall gleich). Die Pixeldichte folgt daraus:
// pxPerMeter = internalHeight / viewHeight (bei 360 px und 12,5 m ≈ 29 px/m, Figur ≈ 50 px).
export const DENSITY = { reference: 12.5, blend: 0.35 };

export function cameraViewHeight(venueViewHeight = DENSITY.reference) {
  return venueViewHeight + (DENSITY.reference - venueViewHeight) * DENSITY.blend;
}

// Ganzzahliges Raster aus Fenster (CSS-Pixel) und DPR: Gerätepixel → Pixelgröße →
// interne Auflösung. Das Canvas bekommt exakt width·pixelSize × height·pixelSize
// Gerätepixel; die CSS-Größe ist dieselbe Fläche geteilt durch den DPR.
export function computeRaster(cssWidth, cssHeight, dpr, targetHeight) {
  const devW = Math.max(1, Math.round(cssWidth * dpr));
  const devH = Math.max(1, Math.round(cssHeight * dpr));
  // Maßgeblich ist die kurze Seite: Im Hochformat wird sonst die Breite winzig.
  const pixelSize = Math.max(1, Math.round(Math.min(devW, devH) / targetHeight));
  const width = Math.max(1, Math.floor(devW / pixelSize));
  const height = Math.max(1, Math.floor(devH / pixelSize));
  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;
  // Mittig, aber auf ganze Gerätepixel versetzt – sonst würde der Browser doch interpolieren.
  const left = Math.floor((devW - canvasWidth) / 2);
  const top = Math.floor((devH - canvasHeight) / 2);
  return { pixelSize, width, height, canvasWidth, canvasHeight, cssWidth: canvasWidth / dpr, cssHeight: canvasHeight / dpr, cssLeft: left / dpr, cssTop: top / dpr };
}

// Plattform: Android (Capacitor-App oder Android-Browser) oder PC.
export function detectPlatform(env = globalThis) {
  const ua = env.navigator?.userAgent ?? '';
  if (env.Capacitor?.getPlatform?.() === 'android' || /Android/i.test(ua)) return 'android';
  return 'pc';
}

// GPU-Name, soweit der Browser ihn verrät (WEBGL_debug_renderer_info ist nicht überall da).
export function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}

// Startstufe: Plattform, Bildschirm und – falls bekannt – die GPU. Bewusst vorsichtig;
// die Messung im Spiel darf danach höchstens eine Stufe nach unten korrigieren.
export function pickInitialQuality({ platform, gpu = '', screenHeight = 1080, webgl2 = true }) {
  const g = gpu.toLowerCase();
  if (platform === 'android') {
    if (!webgl2 || /mali-(4|t6|t7)|adreno \(tm\) (3|4|50)|powervr/.test(g)) return 'ANDROID_LOW';
    if (/adreno \(tm\) (7|8)|mali-g(7|9|6[1-9]|7[1-9])|immortalis|xclipse/.test(g)) return 'ANDROID_HIGH';
    return 'ANDROID_MEDIUM';
  }
  if (!webgl2 || /swiftshader|llvmpipe|software|microsoft basic/.test(g)) return 'PC_LOW';
  if (/intel|uhd|iris|mali|adreno|apple m1\b/.test(g)) return 'PC_MEDIUM';
  if (screenHeight >= 1400 && /rtx|radeon rx|apple m[2-9]|geforce gtx 1[0-9]/.test(g)) return 'PC_ULTRA';
  return 'PC_HIGH';
}

// Automatische Anpassung mit Hysterese: nur nach unten, wenn es über längere Zeit
// deutlich ruckelt; wieder nach oben höchstens bis zur Startstufe und nur, wenn es
// lange deutlich flüssig lief. Mindestverweildauer und Abklingzeit verhindern
// ein Hin und Her.
export const GOVERNOR = { window: 4, down: 40, up: 57, downWindows: 2, upWindows: 4, minDwell: 20, cooldown: 30, maxChanges: 3 };

export function createGovernor(start, { platform, cfg = GOVERNOR, auto = true } = {}) {
  const ladder = LADDER[platform] ?? LADDER.pc;
  return {
    id: start,
    ceiling: start,
    auto,
    changes: 0,
    sinceChange: 0,
    windowT: 0,
    frames: 0,
    slow: 0,
    fast: 0,
    // dt: echte Frame-Zeit in Sekunden; active: nur im Spiel messen. Gibt die neue
    // Stufe zurück, wenn gewechselt werden soll, sonst null.
    sample(dt, active) {
      this.sinceChange += dt;
      if (!this.auto || !active || dt > 0.5) return null;
      this.windowT += dt;
      this.frames++;
      if (this.windowT < cfg.window) return null;
      const fps = this.frames / this.windowT;
      this.windowT = 0;
      this.frames = 0;
      this.slow = fps < cfg.down ? this.slow + 1 : 0;
      this.fast = fps > cfg.up ? this.fast + 1 : 0;
      this.lastFps = fps;
      if (this.changes >= cfg.maxChanges || this.sinceChange < Math.max(cfg.minDwell, cfg.cooldown)) return null;
      const i = ladder.indexOf(this.id);
      let next = null;
      if (this.slow >= cfg.downWindows && i > 0) next = ladder[i - 1];
      else if (this.fast >= cfg.upWindows && i < ladder.indexOf(this.ceiling)) next = ladder[i + 1];
      if (!next) return null;
      this.id = next;
      this.changes++;
      this.sinceChange = 0;
      this.slow = this.fast = 0;
      return next;
    },
  };
}
